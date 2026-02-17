import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachWeekOfInterval, eachDayOfInterval, isSameMonth, parseISO } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useHours, useUpsertHours } from '@/hooks/useHours';
import { useUserAssignments, useAssignMember } from '@/hooks/useAssignments';
import { useAllDeadlines, useAddDeadline } from '@/hooks/useDeadlines';
import { getCategoryMeta, DEADLINE_CATEGORIES, autoCategorize, DeadlineCategory } from '@/lib/deadlineCategories';
import { useAllTasks, useToggleTask } from '@/hooks/useTasks';
import TaskList from './TaskList';
import { getDisciplineColor, getDisciplineColorRecord } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Plus, Target, UserPlus } from 'lucide-react';
import HourCell from './HourCell';
import HourBlock, { BlockData } from './HourBlock';
import TimeSummaryTable from './TimeSummaryTable';
import AddProjectDialog from './AddProjectDialog';
import AddUserDialog from './AddUserDialog';

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
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddDeadline, setShowAddDeadline] = useState(false);
  const [deadlineName, setDeadlineName] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineProjectId, setDeadlineProjectId] = useState('');
  const [deadlineCategory, setDeadlineCategory] = useState<DeadlineCategory>('due');
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
  const { data: allDeadlines } = useAllDeadlines(dateRange);
  const { data: allTasks } = useAllTasks(dateRange);
  const toggleTask = useToggleTask();
  const addDeadlineMut = useAddDeadline();

  // Map deadlines by date string for quick lookup
  const deadlinesByDate = useMemo(() => {
    const map: Record<string, Array<{ name: string; projectName: string; category: string; projectId: string | null }>> = {};
    allDeadlines?.forEach((d: any) => {
      if (!map[d.date]) map[d.date] = [];
      map[d.date].push({ name: d.name, projectName: d.projects?.name ?? 'Unknown', category: (d as any).category ?? 'due', projectId: d.project_id });
    });
    return map;
  }, [allDeadlines]);

  // Map deadlines by project+date for cell-level indicators
  const deadlinesByProjectDate = useMemo(() => {
    const map: Record<string, Array<{ name: string; category: string }>> = {};
    allDeadlines?.forEach((d: any) => {
      const key = `${d.project_id}_${d.date}`;
      if (!map[key]) map[key] = [];
      map[key].push({ name: d.name, category: (d as any).category ?? 'due' });
    });
    return map;
  }, [allDeadlines]);

  const handleAddDeadline = useCallback(() => {
    if (!deadlineName.trim() || !deadlineDate || !deadlineProjectId || !currentUserId) return;
    addDeadlineMut.mutate({
      name: deadlineName.trim(),
      date: deadlineDate,
      project_id: deadlineProjectId,
      created_by: currentUserId,
      category: deadlineCategory,
    });
    setDeadlineName('');
    setDeadlineDate('');
    setDeadlineProjectId('');
    setDeadlineCategory('due');
    setShowAddDeadline(false);
  }, [deadlineName, deadlineDate, deadlineProjectId, deadlineCategory, currentUserId, addDeadlineMut]);

  // Build set of assigned project IDs across all visible weeks
  // Include projects from both assignments AND hours data (hours may exist without assignments)
  const assignedProjectIds = useMemo(() => {
    const ids = new Set<string>();
    userAssignments?.forEach((a) => ids.add(a.project_id));
    // Also include any project that has hours for this user
    hours?.forEach((h) => ids.add(h.project_id));
    return ids;
  }, [userAssignments, hours]);

  // Per-week assignment map: weekStart -> Set<projectId>
  // Derive from both assignments and hours data
  const weekAssignmentMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    userAssignments?.forEach((a) => {
      if (!map[a.week_start]) map[a.week_start] = new Set();
      map[a.week_start].add(a.project_id);
    });
    // Also derive from hours: if a user has hours on a project in a week, treat it as assigned
    hours?.forEach((h) => {
      const ws = format(startOfWeek(new Date(h.date + 'T00:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!map[ws]) map[ws] = new Set();
      map[ws].add(h.project_id);
    });
    return map;
  }, [userAssignments, hours]);

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
    <TooltipProvider>
    <div className="p-4 space-y-4">
      {/* Month navigation + Add Project + Add Deadline buttons */}
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
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddUser(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Add User
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddDeadline(!showAddDeadline)}>
            <Target className="h-3.5 w-3.5 mr-1" /> Add Deadline
          </Button>
        </div>
      </div>

      {/* Add Deadline form */}
      {showAddDeadline && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-card">
          <Input
            placeholder="Deadline name"
            value={deadlineName}
            onChange={(e) => {
              setDeadlineName(e.target.value);
              setDeadlineCategory(autoCategorize(e.target.value));
            }}
            className="h-8 text-xs flex-1 max-w-[200px]"
          />
          <Input
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            className="h-8 text-xs w-[140px]"
          />
          <Select value={deadlineProjectId} onValueChange={setDeadlineProjectId}>
            <SelectTrigger className="h-8 text-xs w-[180px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deadlineCategory} onValueChange={(v) => setDeadlineCategory(v as DeadlineCategory)}>
            <SelectTrigger className="h-8 text-xs w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {DEADLINE_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleAddDeadline} disabled={!deadlineName || !deadlineDate || !deadlineProjectId}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAddDeadline(false)}>
            Cancel
          </Button>
        </div>
      )}

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

        // Show all assigned projects in every week (not just per-week filtering)
        const weekGroupedProjects = groupedProjects;

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
              <div className="px-2 py-1.5 border-r flex items-center justify-between">
                <span>Week of {format(weekStart, 'MMM d')}</span>
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => setShowAddProject(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {days.map((day, dayIdx) => (
                <div
                  key={day.toISOString()}
                  className={`px-1 py-1.5 text-center border-r ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/50' : ''}`}
                >
                  <div>{DAYS[dayIdx]}</div>
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
                    <div className="col-span-7 relative" data-block-grid>
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
                            onResizeDrag={(direction, newCol) => {
                              if (direction === 'start') {
                                // Expand or shrink from start: add hours to newCol if before current start
                                const targetCol = Math.min(newCol, endCol);
                                for (let c = targetCol; c <= endCol; c++) {
                                  const dateStr = format(days[c], 'yyyy-MM-dd');
                                  const key = `${project.id}_${dateStr}`;
                                  const entry = hoursMap[key];
                                  const val = mode === 'plan' ? (entry?.planned_hours ?? 0) : (entry?.recorded_hours ?? 0);
                                  if (val === 0) handleHourChange(project.id, dateStr, 1);
                                }
                                // Zero out days before targetCol that were in the old block
                                for (let c = 0; c < targetCol; c++) {
                                  const dateStr = format(days[c], 'yyyy-MM-dd');
                                  if (block.dates.includes(dateStr)) {
                                    handleHourChange(project.id, dateStr, 0);
                                  }
                                }
                              } else {
                                const targetCol = Math.max(newCol, startCol);
                                for (let c = startCol; c <= targetCol; c++) {
                                  const dateStr = format(days[c], 'yyyy-MM-dd');
                                  const key = `${project.id}_${dateStr}`;
                                  const entry = hoursMap[key];
                                  const val = mode === 'plan' ? (entry?.planned_hours ?? 0) : (entry?.recorded_hours ?? 0);
                                  if (val === 0) handleHourChange(project.id, dateStr, 1);
                                }
                                // Zero out days after targetCol that were in the old block
                                for (let c = targetCol + 1; c <= 6; c++) {
                                  const dateStr = format(days[c], 'yyyy-MM-dd');
                                  if (block.dates.includes(dateStr)) {
                                    handleHourChange(project.id, dateStr, 0);
                                  }
                                }
                              }
                            }}
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

                      {/* Deadline red dots in project day cells */}
                      {days.map((day, dayIdx) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dls = deadlinesByProjectDate[`${project.id}_${dateStr}`];
                        if (!dls || dls.length === 0) return null;
                        return (
                          <Tooltip key={`dl-${dayIdx}`}>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute z-20 cursor-help"
                                style={{
                                  left: `${((dayIdx + 0.5) / 7) * 100}%`,
                                  transform: 'translateX(-50%)',
                                  top: '2px',
                                }}
                              >
                                <div className="w-2 h-2 rounded-sm bg-destructive" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px]">
                              {dls.map((dl, i) => {
                                const cat = getCategoryMeta(dl.category);
                                return (
                                  <div key={i} className="text-xs">
                                    <span className="font-medium">{dl.name}</span>
                                    <span className="text-muted-foreground ml-1">({cat.label})</span>
                                  </div>
                                );
                              })}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
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

            {/* Tasks for this week */}
            {(() => {
              // Show tasks for this user that overlap this week (based on start_date/end_date or week_start fallback)
              const toLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
              const wsStart = toLocal(weekStartStr);
              const wsEnd = endOfWeek(wsStart, { weekStartsOn: 1 });
              const weekTasks = allTasks?.filter(t => {
                if (t.user_id !== currentUserId) return false;
                // If task has start_date/end_date, check overlap with this week
                if (t.start_date || t.end_date) {
                  const tStart = t.start_date ? toLocal(t.start_date) : toLocal(t.end_date!);
                  const tEnd = t.end_date ? toLocal(t.end_date) : tStart;
                  return tStart <= wsEnd && tEnd >= wsStart;
                }
                // Fallback: match by week_start
                return t.week_start === weekStartStr;
              }) ?? [];
              if (weekTasks.length === 0) return null;
              return (
                <div className="px-3 py-2 border-t">
                  <TaskList
                    tasks={weekTasks}
                    onToggle={(id, is_completed) => toggleTask.mutate({ id, is_completed })}
                    title="Tasks"
                    compact
                    showProject
                    projects={projects?.map(p => ({ id: p.id, name: p.name })) ?? []}
                    showDates
                  />
                </div>
              );
            })()}
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

      {/* Add User Dialog */}
      <AddUserDialog
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        disciplines={disciplines ?? []}
      />
    </div>
    </TooltipProvider>
  );
};

export default PersonalSchedule;
