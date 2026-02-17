import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachWeekOfInterval, eachDayOfInterval, isSameMonth } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useHours, useUpsertHours } from '@/hooks/useHours';
import { useUserAssignments, useAssignMember } from '@/hooks/useAssignments';
import { getDisciplineColor, getDisciplineColorRecord } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import HourCell from './HourCell';
import HourBlock, { BlockData } from './HourBlock';
import TimeSummaryTable from './TimeSummaryTable';
import AddProjectDialog from './AddProjectDialog';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Detect contiguous runs of non-zero hours for a project across days */
function detectBlocks(
  projectId: string,
  days: Date[],
  hoursMap: Record<string, { planned_hours: number; recorded_hours: number | null }>,
  mode: 'plan' | 'record'
): BlockData[] {
  const blocks: BlockData[] = [];
  let current: string[] | null = null;
  let currentDist: Record<string, number> = {};

  days.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = hoursMap[`${projectId}_${dateStr}`];
    const val = mode === 'plan' ? (entry?.planned_hours ?? 0) : (entry?.recorded_hours ?? 0);

    if (val > 0) {
      if (!current) {
        current = [dateStr];
        currentDist = { [dateStr]: val };
      } else {
        current.push(dateStr);
        currentDist[dateStr] = val;
      }
    } else {
      if (current && current.length >= 2) {
        blocks.push({ projectId, dates: current, distribution: currentDist });
      }
      current = null;
      currentDist = {};
    }
  });

  if (current && current.length >= 2) {
    blocks.push({ projectId, dates: current, distribution: currentDist });
  }

  return blocks;
}

const PersonalSchedule = () => {
  const { currentUserId, mode } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddProject, setShowAddProject] = useState(false);
  const { data: projects } = useProjects();
  const { data: disciplines } = useDisciplines();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const weeks = useMemo(() => {
    return eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
  }, [monthStart.getTime(), monthEnd.getTime()]);

  const dateRange = useMemo(() => ({
    start: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }), [monthStart.getTime(), monthEnd.getTime()]);

  const { data: hours } = useHours(currentUserId, dateRange);
  const upsertHours = useUpsertHours();
  const { data: userAssignments } = useUserAssignments(currentUserId, dateRange);
  const assignMember = useAssignMember();

  // Build set of assigned project IDs across all visible weeks
  const assignedProjectIds = useMemo(() => {
    const ids = new Set<string>();
    userAssignments?.forEach((a) => ids.add(a.project_id));
    return ids;
  }, [userAssignments]);

  // Per-week assignment map: weekStart -> Set<projectId>
  const weekAssignmentMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    userAssignments?.forEach((a) => {
      if (!map[a.week_start]) map[a.week_start] = new Set();
      map[a.week_start].add(a.project_id);
    });
    return map;
  }, [userAssignments]);

  // Drag state for creating new blocks
  const [dragState, setDragState] = useState<{
    projectId: string;
    dayIndices: Set<number>;
    weekKey: string;
  } | null>(null);
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  // Track newly created blocks waiting for total input
  const [newBlock, setNewBlock] = useState<{
    projectId: string;
    dayIndices: number[];
    weekKey: string;
  } | null>(null);

  // Finalize drag into a newBlock on mouseup
  useEffect(() => {
    const handleUp = () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      setDragState(null);
      if (ds.dayIndices.size >= 2) {
        const sorted = Array.from(ds.dayIndices).sort((a, b) => a - b);
        setNewBlock({
          projectId: ds.projectId,
          dayIndices: sorted,
          weekKey: ds.weekKey,
        });
      }
    };
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, []);

  // Filter projects to only those assigned to this user in the current month
  const groupedProjects = useMemo(() => {
    if (!projects || !disciplines) return [];
    const assignedIds = assignedProjectIds;
    const filteredProjects = projects.filter((p) => assignedIds.has(p.id));
    return disciplines.map((d) => ({
      discipline: d,
      projects: filteredProjects.filter((p) => p.discipline_id === d.id),
    })).filter((g) => g.projects.length > 0);
  }, [projects, disciplines, assignedProjectIds]);

  const hoursMap = useMemo(() => {
    const map: Record<string, { planned_hours: number; recorded_hours: number | null }> = {};
    hours?.forEach((h) => {
      map[`${h.project_id}_${h.date}`] = { planned_hours: h.planned_hours, recorded_hours: h.recorded_hours };
    });
    return map;
  }, [hours]);

  const handleHourChange = useCallback((projectId: string, date: string, value: number) => {
    if (!currentUserId) return;
    const field = mode === 'plan' ? 'planned_hours' : 'recorded_hours';
    upsertHours.mutate({
      user_id: currentUserId,
      project_id: projectId,
      date,
      [field]: value,
    });
  }, [currentUserId, mode, upsertHours]);

  const handleBlockDistribution = useCallback((projectId: string, distribution: Record<string, number>) => {
    Object.entries(distribution).forEach(([date, val]) => {
      handleHourChange(projectId, date, val);
    });
    setNewBlock(null);
  }, [handleHourChange]);

  const handleBlockDelete = useCallback((projectId: string, dates: string[]) => {
    dates.forEach((date) => handleHourChange(projectId, date, 0));
    setNewBlock(null);
  }, [handleHourChange]);

  const startDrag = useCallback((projectId: string, dayIndex: number, weekKey: string) => {
    setDragState({ projectId, dayIndices: new Set([dayIndex]), weekKey });
  }, []);

  const enterDrag = useCallback((projectId: string, dayIndex: number) => {
    setDragState((prev) => {
      if (!prev || prev.projectId !== projectId) return prev;
      const next = new Set(prev.dayIndices);
      next.add(dayIndex);
      return { ...prev, dayIndices: next };
    });
  }, []);

  // Self-assign projects
  const handleAddProjects = useCallback((projectIds: string[]) => {
    if (!currentUserId) return;
    const weekStarts = weeks.map((ws) => format(ws, 'yyyy-MM-dd'));
    projectIds.forEach((pid) => {
      assignMember.mutate({
        user_id: currentUserId,
        project_id: pid,
        week_starts: weekStarts,
      });
    });
    setShowAddProject(false);
  }, [currentUserId, weeks, assignMember]);

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Please select a user from the header to view their schedule.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Month navigation + Add Project button */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold min-w-[160px] text-center">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setShowAddProject(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
        </Button>
      </div>

      {/* No projects message */}
      {groupedProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg bg-card">
          <p className="text-sm mb-2">No projects assigned for this month.</p>
          <Button variant="outline" size="sm" onClick={() => setShowAddProject(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
          </Button>
        </div>
      )}

      {/* Weekly grids */}
      {weeks.map((weekStart) => {
        const weekKey = weekStart.toISOString();
        const days = eachDayOfInterval({
          start: weekStart,
          end: endOfWeek(weekStart, { weekStartsOn: 1 }),
        });

        // Get projects assigned for this specific week
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekAssigned = weekAssignmentMap[weekStartStr] ?? new Set();

        // Filter grouped projects to only those assigned this week
        const weekGroupedProjects = groupedProjects.map(g => ({
          ...g,
          projects: g.projects.filter(p => weekAssigned.has(p.id)),
        })).filter(g => g.projects.length > 0);

        // Resolve newBlock dates if this is the target week
        let resolvedNewBlock: { projectId: string; dates: string[] } | null = null;
        if (newBlock && newBlock.weekKey === weekKey) {
          const minI = newBlock.dayIndices[0];
          const maxI = newBlock.dayIndices[newBlock.dayIndices.length - 1];
          const dates: string[] = [];
          for (let i = minI; i <= maxI; i++) {
            dates.push(format(days[i], 'yyyy-MM-dd'));
          }
          resolvedNewBlock = { projectId: newBlock.projectId, dates };
        }

        let weekTotal = 0;
        weekGroupedProjects.forEach((g) =>
          g.projects.forEach((p) =>
            days.forEach((day) => {
              const key = `${p.id}_${format(day, 'yyyy-MM-dd')}`;
              const entry = hoursMap[key];
              if (entry) {
                weekTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
              }
            })
          )
        );
        const ot = Math.max(0, weekTotal - 40);

        if (weekGroupedProjects.length === 0) return null;

        return (
          <div key={weekKey} className="border rounded-lg overflow-hidden bg-card">
            {/* Header row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)_80px] text-xs font-medium border-b bg-muted/50">
              <div className="px-2 py-1.5 border-r">
                Week of {format(weekStart, 'MMM d')}
              </div>
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`px-1 py-1.5 text-center border-r ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/50' : ''}`}
                >
                  <div>{DAYS[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                  <div>{format(day, 'd')}</div>
                </div>
              ))}
              <div className="px-1 py-1.5 text-center">Weekly Total</div>
            </div>

            {/* Project rows */}
            {weekGroupedProjects.map((group) => {
              const colors = mode === 'record'
                ? getDisciplineColorRecord(group.discipline.id)
                : getDisciplineColor(group.discipline.id);

              return group.projects.map((project) => {
                // Detect blocks from existing data
                const existingBlocks = detectBlocks(project.id, days, hoursMap, mode);
                
                // Check if there's a new block for this project in this week
                const isNewBlockHere = resolvedNewBlock && resolvedNewBlock.projectId === project.id;
                
                // Set of dates covered by blocks
                const coveredDates = new Set<string>();
                existingBlocks.forEach((b) => b.dates.forEach((d) => coveredDates.add(d)));

                // Row total
                let rowTotal = 0;
                days.forEach((day) => {
                  const key = `${project.id}_${format(day, 'yyyy-MM-dd')}`;
                  const entry = hoursMap[key];
                  if (entry) {
                    rowTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
                  }
                });

                // Drag highlight indices for this project
                const dragIndices = dragState?.projectId === project.id && dragState.weekKey === weekKey
                  ? dragState.dayIndices : null;

                return (
                  <div
                    key={project.id}
                    className="grid grid-cols-[180px_repeat(7,1fr)_80px] text-sm border-b last:border-b-0"
                    style={{ borderLeft: `3px solid ${colors.border}` }}
                  >
                    <div
                      className="px-2 py-1 border-r truncate font-medium flex items-center gap-1"
                      style={{ backgroundColor: `${colors.bg}20` }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: colors.bg }}
                      />
                      <span className="truncate">{project.name}</span>
                    </div>

                    {/* 7 day cells + block overlays in a relative container */}
                    <div className="col-span-7 relative">
                      <div className="grid grid-cols-7">
                        {days.map((day, dayIdx) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const key = `${project.id}_${dateStr}`;
                          const entry = hoursMap[key];
                          const currentVal = mode === 'plan'
                            ? (entry?.planned_hours ?? 0)
                            : (entry?.recorded_hours ?? 0);
                          const plannedVal = entry?.planned_hours ?? 0;
                          const isCovered = coveredDates.has(dateStr);

                          return (
                            <HourCell
                              key={dateStr}
                              value={currentVal}
                              plannedValue={plannedVal}
                              mode={mode}
                              color={colors.bg}
                              dimmed={!isSameMonth(day, currentMonth)}
                              onChange={(v) => handleHourChange(project.id, dateStr, v)}
                              coveredByBlock={isCovered}
                              isDragHighlighted={dragIndices?.has(dayIdx) ?? false}
                              onDragStart={() => startDrag(project.id, dayIdx, weekKey)}
                              onDragEnter={() => enterDrag(project.id, dayIdx)}
                            />
                          );
                        })}
                      </div>

                      {/* Render existing blocks */}
                      {existingBlocks.map((block, idx) => {
                        const startCol = days.findIndex((d) => format(d, 'yyyy-MM-dd') === block.dates[0]);
                        const endCol = days.findIndex((d) => format(d, 'yyyy-MM-dd') === block.dates[block.dates.length - 1]);
                        return (
                          <HourBlock
                            key={`block-${idx}`}
                            block={block}
                            color={colors.bg}
                            borderColor={colors.border}
                            startCol={startCol}
                            endCol={endCol}
                            onDistributionChange={(dist) => handleBlockDistribution(project.id, dist)}
                            onDelete={() => handleBlockDelete(project.id, block.dates)}
                          />
                        );
                      })}

                      {/* Render new block from drag */}
                      {isNewBlockHere && resolvedNewBlock && (
                        <HourBlock
                          block={{
                            projectId: project.id,
                            dates: resolvedNewBlock.dates,
                            distribution: Object.fromEntries(resolvedNewBlock.dates.map((d) => [d, 0])),
                          }}
                          color={colors.bg}
                          borderColor={colors.border}
                          startCol={days.findIndex((d) => format(d, 'yyyy-MM-dd') === resolvedNewBlock!.dates[0])}
                          endCol={days.findIndex((d) => format(d, 'yyyy-MM-dd') === resolvedNewBlock!.dates[resolvedNewBlock!.dates.length - 1])}
                          isNew
                          onDistributionChange={(dist) => {
                            handleBlockDistribution(project.id, dist);
                          }}
                          onDelete={() => {
                            if (resolvedNewBlock) handleBlockDelete(project.id, resolvedNewBlock.dates);
                          }}
                        />
                      )}

                      {/* Render drag preview */}
                      {dragIndices && dragIndices.size >= 2 && dragState?.projectId === project.id && (
                        (() => {
                          const sorted = Array.from(dragIndices).sort((a, b) => a - b);
                          const sCol = sorted[0];
                          const eCol = sorted[sorted.length - 1];
                          const leftPct = (sCol / 7) * 100;
                          const widthPct = ((eCol - sCol + 1) / 7) * 100;
                          return (
                            <div
                              className="absolute top-0 bottom-0 z-5 flex items-center justify-center pointer-events-none"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                padding: '2px',
                              }}
                            >
                              <div
                                className="w-full h-[28px] rounded-md border-2 border-dashed opacity-60"
                                style={{
                                  backgroundColor: `${colors.bg}20`,
                                  borderColor: colors.border,
                                }}
                              />
                            </div>
                          );
                        })()
                      )}
                    </div>

                    <div className="px-1 py-1 text-center font-medium border-l tabular-nums">
                      {rowTotal > 0 ? rowTotal : ''}
                    </div>
                  </div>
                );
              });
            })}

            {/* Normal Hours row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)_80px] text-xs font-semibold bg-muted/30 border-t">
              <div className="px-2 py-1 border-r">Normal Hours</div>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                let dayTotal = 0;
                weekGroupedProjects.forEach((g) =>
                  g.projects.forEach((p) => {
                    const entry = hoursMap[`${p.id}_${dateStr}`];
                    if (entry) dayTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
                  })
                );
                const normalHours = Math.min(dayTotal, 8);
                return (
                  <div key={dateStr} className="px-1 py-1 text-center border-r tabular-nums">
                    {normalHours > 0 ? normalHours : ''}
                  </div>
                );
              })}
              <div className="px-1 py-1 text-center tabular-nums">
                <div>{weekTotal > 0 ? weekTotal : 0}h</div>
                {ot > 0 && <div className="text-destructive">+{ot} OT</div>}
              </div>
            </div>

            {/* OT Hours row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)_80px] text-xs font-semibold bg-muted/30 border-t">
              <div className="px-2 py-1 border-r">OT Hours</div>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                let dayTotal = 0;
                weekGroupedProjects.forEach((g) =>
                  g.projects.forEach((p) => {
                    const entry = hoursMap[`${p.id}_${dateStr}`];
                    if (entry) dayTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
                  })
                );
                const dailyOt = Math.max(0, dayTotal - 8);
                return (
                  <div key={dateStr} className={`px-1 py-1 text-center border-r tabular-nums ${dailyOt > 0 ? 'text-destructive' : ''}`}>
                    {dailyOt > 0 ? dailyOt : ''}
                  </div>
                );
              })}
              <div className="px-1 py-1 text-center tabular-nums">
                {(() => {
                  const weeklyDailyOt = days.reduce((sum, day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    let dayTotal = 0;
                    weekGroupedProjects.forEach((g) =>
                      g.projects.forEach((p) => {
                        const entry = hoursMap[`${p.id}_${dateStr}`];
                        if (entry) dayTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
                      })
                    );
                    return sum + Math.max(0, dayTotal - 8);
                  }, 0);
                  return weeklyDailyOt > 0 ? <span className="text-destructive">+{weeklyDailyOt} OT</span> : '';
                })()}
              </div>
            </div>
          </div>
        );
      })}

      {/* Monthly Summary */}
      <TimeSummaryTable
        groupedProjects={groupedProjects}
        hoursMap={hoursMap}
        weeks={weeks}
        mode={mode}
        currentMonth={currentMonth}
      />

      {/* Add Project Dialog */}
      {showAddProject && projects && disciplines && (
        <AddProjectDialog
          open={showAddProject}
          onClose={() => setShowAddProject(false)}
          onConfirm={handleAddProjects}
          projects={projects}
          disciplines={disciplines}
          assignedProjectIds={assignedProjectIds}
        />
      )}
    </div>
  );
};

export default PersonalSchedule;
