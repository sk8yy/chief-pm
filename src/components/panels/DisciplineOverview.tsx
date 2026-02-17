import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachWeekOfInterval, eachDayOfInterval } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useUsers } from '@/hooks/useUsers';
import { useAllHours } from '@/hooks/useAllHours';
import { getDisciplineColor, getDisciplineColorRecord } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DisciplineOverview = () => {
  const { mode } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const { data: projects } = useProjects();
  const { data: disciplines } = useDisciplines();
  const { data: users } = useUsers();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const weeks = useMemo(() => {
    return eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
  }, [monthStart.getTime(), monthEnd.getTime()]);

  const dateRange = useMemo(() => ({
    start: format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }), [monthStart.getTime(), monthEnd.getTime()]);

  const { data: allHours } = useAllHours(dateRange);

  // Build hours lookup: userId_projectId_date -> { planned, recorded }
  const hoursMap = useMemo(() => {
    const map: Record<string, { planned_hours: number; recorded_hours: number | null }> = {};
    allHours?.forEach((h) => {
      map[`${h.user_id}_${h.project_id}_${h.date}`] = { planned_hours: h.planned_hours, recorded_hours: h.recorded_hours };
    });
    return map;
  }, [allHours]);

  const toggleDiscipline = (id: string) => {
    setExpandedDisciplines((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleUser = (id: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group users by discipline
  const disciplineGroups = useMemo(() => {
    if (!disciplines || !users || !projects) return [];
    return disciplines.filter(d => d.name !== 'Leave').map((d) => {
      const discUsers = users.filter((u) => u.discipline_id === d.id);
      const discProjects = projects.filter((p) => p.discipline_id === d.id);
      return { discipline: d, users: discUsers, projects: discProjects };
    }).filter((g) => g.users.length > 0);
  }, [disciplines, users, projects]);

  // Calculate total hours for a user across all their projects in a week
  const getUserWeekHours = (userId: string, weekStart: Date) => {
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    let total = 0;
    projects?.forEach((p) => {
      days.forEach((day) => {
        const key = `${userId}_${p.id}_${format(day, 'yyyy-MM-dd')}`;
        const entry = hoursMap[key];
        if (entry) total += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
      });
    });
    return total;
  };

  // Calculate per-project hours for a user in a week
  const getUserProjectWeekHours = (userId: string, projectId: string, weekStart: Date) => {
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    let planned = 0;
    let recorded = 0;
    days.forEach((day) => {
      const key = `${userId}_${projectId}_${format(day, 'yyyy-MM-dd')}`;
      const entry = hoursMap[key];
      if (entry) {
        planned += entry.planned_hours;
        recorded += entry.recorded_hours ?? 0;
      }
    });
    return { planned, recorded };
  };

  // Monthly total for a user
  const getUserMonthTotal = (userId: string) => {
    let total = 0;
    weeks.forEach((ws) => { total += getUserWeekHours(userId, ws); });
    return total;
  };

  // Discipline monthly total
  const getDisciplineMonthTotal = (discUsers: typeof users extends (infer U)[] | undefined ? U[] : never[]) => {
    return discUsers.reduce((sum, u) => sum + getUserMonthTotal(u.id), 0);
  };

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
        <span className="text-xs text-muted-foreground ml-2">
          {mode === 'plan' ? 'Planned hours' : 'Recorded hours'}
        </span>
      </div>

      {/* Discipline cards */}
      {disciplineGroups.map((group) => {
        const colors = mode === 'record'
          ? getDisciplineColorRecord(group.discipline.id)
          : getDisciplineColor(group.discipline.id);
        const isExpanded = expandedDisciplines.has(group.discipline.id);
        const discTotal = getDisciplineMonthTotal(group.users);
        const expectedHours = group.users.length * weeks.length * 40; // 40h per user per week

        return (
          <div key={group.discipline.id} className="border rounded-lg overflow-hidden bg-card">
            {/* Discipline header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              style={{ borderLeft: `4px solid ${colors.bg}` }}
              onClick={() => toggleDiscipline(group.discipline.id)}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors.bg }} />
              <div className="flex-1">
                <div className="font-semibold text-sm">{group.discipline.name}</div>
                <div className="text-xs text-muted-foreground">
                  {group.users.length} member{group.users.length !== 1 ? 's' : ''} · {group.projects.length} project{group.projects.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right mr-4">
                <div className="text-sm font-semibold tabular-nums">{discTotal}h</div>
                <div className="text-[10px] text-muted-foreground">{expectedHours}h capacity</div>
              </div>
              <div className="w-24 mr-2">
                <Progress value={Math.min(100, (discTotal / Math.max(1, expectedHours)) * 100)} className="h-1.5" />
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {/* Expanded: weekly table per user */}
            {isExpanded && (
              <div className="border-t">
                {/* Week header row */}
                <div className="grid text-xs font-medium border-b bg-muted/50"
                  style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px` }}
                >
                  <div className="px-3 py-1.5 border-r">Team Member</div>
                  {weeks.map((ws) => (
                    <div key={ws.toISOString()} className="px-1 py-1.5 text-center border-r">
                      W/C {format(ws, 'MMM d')}
                    </div>
                  ))}
                  <div className="px-1 py-1.5 text-center">Month Total</div>
                </div>

                {/* User rows */}
                {group.users.map((user) => {
                  const userExpanded = expandedUsers.has(user.id);
                  const monthTotal = getUserMonthTotal(user.id);

                  return (
                    <div key={user.id}>
                      {/* User summary row */}
                      <button
                        className="w-full grid text-sm border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                        style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px` }}
                        onClick={() => toggleUser(user.id)}
                      >
                        <div className="px-3 py-1.5 border-r text-left font-medium flex items-center gap-1.5">
                          {userExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {user.name}
                        </div>
                        {weeks.map((ws) => {
                          const weekHrs = getUserWeekHours(user.id, ws);
                          const isOver = weekHrs > 40;
                          return (
                            <div key={ws.toISOString()} className={`px-1 py-1.5 text-center border-r tabular-nums ${isOver ? 'text-destructive font-semibold' : ''}`}>
                              {weekHrs > 0 ? weekHrs : <span className="text-muted-foreground/40">—</span>}
                              {isOver && <span className="text-[10px] ml-0.5">+{weekHrs - 40}OT</span>}
                            </div>
                          );
                        })}
                        <div className="px-1 py-1.5 text-center font-semibold tabular-nums">
                          {monthTotal > 0 ? `${monthTotal}h` : '—'}
                        </div>
                      </button>

                      {/* User expanded: project breakdown */}
                      {userExpanded && projects && (
                        <div className="bg-muted/10">
                          {projects.filter((p) => {
                            // Show projects where this user has any hours
                            return weeks.some((ws) => {
                              const { planned, recorded } = getUserProjectWeekHours(user.id, p.id, ws);
                              return planned > 0 || recorded > 0;
                            });
                          }).map((project) => {
                            const projColors = getDisciplineColor(project.discipline_id);
                            return (
                              <div
                                key={project.id}
                                className="grid text-xs border-b last:border-b-0"
                                style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px` }}
                              >
                                <div className="px-3 py-1 border-r pl-9 flex items-center gap-1.5 text-muted-foreground">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: projColors.bg }} />
                                  <span className="truncate">{project.name}</span>
                                </div>
                                {weeks.map((ws) => {
                                  const { planned, recorded } = getUserProjectWeekHours(user.id, project.id, ws);
                                  const val = mode === 'plan' ? planned : recorded;
                                  const diff = mode === 'record' && planned > 0 ? recorded - planned : null;
                                  return (
                                    <div key={ws.toISOString()} className="px-1 py-1 text-center border-r tabular-nums">
                                      {val > 0 ? val : ''}
                                      {diff !== null && diff !== 0 && (
                                        <span className={`ml-0.5 text-[9px] ${diff > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                          {diff > 0 ? '+' : ''}{diff}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                                <div className="px-1 py-1 text-center tabular-nums font-medium">
                                  {(() => {
                                    let t = 0;
                                    weeks.forEach((ws) => {
                                      const { planned, recorded } = getUserProjectWeekHours(user.id, project.id, ws);
                                      t += mode === 'plan' ? planned : recorded;
                                    });
                                    return t > 0 ? t : '';
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Discipline totals row */}
                <div
                  className="grid text-xs font-semibold bg-muted/30 border-t"
                  style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px` }}
                >
                  <div className="px-3 py-1.5 border-r">Discipline Total</div>
                  {weeks.map((ws) => {
                    let weekTotal = 0;
                    group.users.forEach((u) => { weekTotal += getUserWeekHours(u.id, ws); });
                    return (
                      <div key={ws.toISOString()} className="px-1 py-1.5 text-center border-r tabular-nums">
                        {weekTotal > 0 ? weekTotal : '—'}
                      </div>
                    );
                  })}
                  <div className="px-1 py-1.5 text-center tabular-nums font-bold">{discTotal}h</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DisciplineOverview;
