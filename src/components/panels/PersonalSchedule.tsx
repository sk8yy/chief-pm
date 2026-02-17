import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachWeekOfInterval, eachDayOfInterval, isSameMonth } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useHours, useUpsertHours } from '@/hooks/useHours';
import { getDisciplineColor, getDisciplineColorRecord } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HourCell from './HourCell';
import TimeSummaryTable from './TimeSummaryTable';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PersonalSchedule = () => {
  const { currentUserId, mode } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: projects } = useProjects();
  const { data: disciplines } = useDisciplines();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get all weeks that overlap with this month
  const weeks = useMemo(() => {
    return eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
  }, [monthStart.getTime(), monthEnd.getTime()]);

  const dateRange = useMemo(() => ({
    start: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }), [monthStart.getTime(), monthEnd.getTime()]);

  const { data: hours } = useHours(currentUserId, dateRange);
  const upsertHours = useUpsertHours();

  // Group projects by discipline
  const groupedProjects = useMemo(() => {
    if (!projects || !disciplines) return [];
    return disciplines.map((d) => ({
      discipline: d,
      projects: projects.filter((p) => p.discipline_id === d.id),
    })).filter((g) => g.projects.length > 0);
  }, [projects, disciplines]);

  // Build hours lookup: `${projectId}_${date}` -> hours entry
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

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Please select a user from the header to view their schedule.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Month navigation */}
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
      </div>

      {/* Weekly grids */}
      {weeks.map((weekStart) => {
        const days = eachDayOfInterval({
          start: weekStart,
          end: endOfWeek(weekStart, { weekStartsOn: 1 }),
        });

        // Calculate weekly totals
        let weekTotal = 0;
        groupedProjects.forEach((g) =>
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

        return (
          <div key={weekStart.toISOString()} className="border rounded-lg overflow-hidden bg-card">
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
              <div className="px-1 py-1.5 text-center">Total</div>
            </div>

            {/* Project rows grouped by discipline */}
            {groupedProjects.map((group) => {
              const colors = mode === 'record'
                ? getDisciplineColorRecord(group.discipline.id)
                : getDisciplineColor(group.discipline.id);

              return group.projects.map((project) => {
                // Row total for this project
                let rowTotal = 0;
                days.forEach((day) => {
                  const key = `${project.id}_${format(day, 'yyyy-MM-dd')}`;
                  const entry = hoursMap[key];
                  if (entry) {
                    rowTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
                  }
                });

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
                    {days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const key = `${project.id}_${dateStr}`;
                      const entry = hoursMap[key];
                      const currentVal = mode === 'plan'
                        ? (entry?.planned_hours ?? 0)
                        : (entry?.recorded_hours ?? 0);
                      const plannedVal = entry?.planned_hours ?? 0;

                      return (
                        <HourCell
                          key={dateStr}
                          value={currentVal}
                          plannedValue={plannedVal}
                          mode={mode}
                          color={colors.bg}
                          dimmed={!isSameMonth(day, currentMonth)}
                          onChange={(v) => handleHourChange(project.id, dateStr, v)}
                        />
                      );
                    })}
                    <div className="px-1 py-1 text-center font-medium border-l tabular-nums">
                      {rowTotal > 0 ? rowTotal : ''}
                    </div>
                  </div>
                );
              });
            })}

            {/* Week summary row */}
            <div className="grid grid-cols-[180px_repeat(7,1fr)_80px] text-xs font-semibold bg-muted/30 border-t">
              <div className="px-2 py-1 border-r">Weekly Total</div>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                let dayTotal = 0;
                groupedProjects.forEach((g) =>
                  g.projects.forEach((p) => {
                    const entry = hoursMap[`${p.id}_${dateStr}`];
                    if (entry) dayTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
                  })
                );
                return (
                  <div key={dateStr} className="px-1 py-1 text-center border-r tabular-nums">
                    {dayTotal > 0 ? dayTotal : ''}
                  </div>
                );
              })}
              <div className="px-1 py-1 text-center tabular-nums">
                <div>{weekTotal > 0 ? weekTotal : 0}h</div>
                {ot > 0 && <div className="text-destructive">+{ot} OT</div>}
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
    </div>
  );
};

export default PersonalSchedule;
