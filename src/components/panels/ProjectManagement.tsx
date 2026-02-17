import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachWeekOfInterval, eachDayOfInterval } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useUsers } from '@/hooks/useUsers';
import { useAllHours } from '@/hooks/useAllHours';
import { useAllTasks, useToggleTask } from '@/hooks/useTasks';
import { getDisciplineColor } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Users, ClipboardList } from 'lucide-react';

const ProjectManagement = () => {
  const { mode } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

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
  const { data: allTasks } = useAllTasks(dateRange);
  const toggleTask = useToggleTask();

  const hoursMap = useMemo(() => {
    const map: Record<string, { planned_hours: number; recorded_hours: number | null }> = {};
    allHours?.forEach((h) => {
      map[`${h.user_id}_${h.project_id}_${h.date}`] = { planned_hours: h.planned_hours, recorded_hours: h.recorded_hours };
    });
    return map;
  }, [allHours]);

  // Tasks grouped by project
  const tasksByProject = useMemo(() => {
    const map: Record<string, typeof allTasks> = {};
    allTasks?.forEach((t) => {
      if (!map[t.project_id]) map[t.project_id] = [];
      map[t.project_id]!.push(t);
    });
    return map;
  }, [allTasks]);

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Get project hours aggregated across all users
  const getProjectHours = (projectId: string) => {
    let planned = 0;
    let recorded = 0;
    weeks.forEach((ws) => {
      const days = eachDayOfInterval({ start: ws, end: endOfWeek(ws, { weekStartsOn: 1 }) });
      users?.forEach((u) => {
        days.forEach((day) => {
          const key = `${u.id}_${projectId}_${format(day, 'yyyy-MM-dd')}`;
          const entry = hoursMap[key];
          if (entry) {
            planned += entry.planned_hours;
            recorded += entry.recorded_hours ?? 0;
          }
        });
      });
    });
    return { planned, recorded };
  };

  // Get user hours for a project in a specific week
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

  // Get users that have any hours on a project
  const getProjectUsers = (projectId: string) => {
    if (!users) return [];
    return users.filter((u) => {
      return weeks.some((ws) => {
        const { planned, recorded } = getUserProjectWeekHours(u.id, projectId, ws);
        return planned > 0 || recorded > 0;
      });
    });
  };

  // Group projects by discipline
  const groupedProjects = useMemo(() => {
    if (!projects || !disciplines) return [];
    return disciplines.filter(d => d.name !== 'Leave').map((d) => ({
      discipline: d,
      projects: projects.filter((p) => p.discipline_id === d.id),
    })).filter((g) => g.projects.length > 0);
  }, [projects, disciplines]);

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
          {mode === 'plan' ? 'Planning view' : 'Recording view — comparing against plan'}
        </span>
      </div>

      {/* Project cards by discipline */}
      {groupedProjects.map((group) => {
        const colors = getDisciplineColor(group.discipline.id);

        return (
          <div key={group.discipline.id} className="space-y-2">
            {/* Discipline label */}
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.bg }} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.discipline.name}
              </span>
            </div>

            {/* Project cards */}
            {group.projects.map((project) => {
              const isExpanded = expandedProjects.has(project.id);
              const { planned, recorded } = getProjectHours(project.id);
              const projectUsers = getProjectUsers(project.id);
              const projectTasks = tasksByProject[project.id] ?? [];
              const completedTasks = projectTasks.filter((t) => t.is_completed);
              const diff = recorded - planned;

              return (
                <div key={project.id} className="border rounded-lg overflow-hidden bg-card">
                  {/* Project header */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    style={{ borderLeft: `4px solid ${colors.bg}` }}
                    onClick={() => toggleProject(project.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{project.name}</div>
                      <div className="text-xs text-muted-foreground">{project.job_number}</div>
                    </div>

                    {/* Hours summary */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Planned</div>
                        <div className="font-semibold tabular-nums">{planned}h</div>
                      </div>
                      {mode === 'record' && (
                        <>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Recorded</div>
                            <div className="font-semibold tabular-nums">{recorded}h</div>
                          </div>
                          <div className={`text-right ${diff > 0 ? 'text-destructive' : diff < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                            <div className="text-xs">Diff</div>
                            <div className="font-semibold tabular-nums">
                              {diff !== 0 ? `${diff > 0 ? '+' : ''}${diff}h` : '—'}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Team & task count badges */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{projectUsers.length}</span>
                      {projectTasks.length > 0 && (
                        <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{completedTasks.length}/{projectTasks.length}</span>
                      )}
                    </div>

                    {planned > 0 && mode === 'record' && (
                      <div className="w-20">
                        <Progress value={Math.min(100, (recorded / planned) * 100)} className="h-1.5" />
                      </div>
                    )}

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {/* Expanded: team allocation + tasks */}
                  {isExpanded && (
                    <div className="border-t">
                      {/* Team allocation weekly table */}
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/20 border-b flex items-center gap-1">
                        <Users className="h-3 w-3" /> Team Allocation
                      </div>
                      <div
                        className="grid text-xs font-medium border-b bg-muted/40"
                        style={{ gridTemplateColumns: `140px repeat(${weeks.length}, 1fr) 80px` }}
                      >
                        <div className="px-3 py-1 border-r">Member</div>
                        {weeks.map((ws) => (
                          <div key={ws.toISOString()} className="px-1 py-1 text-center border-r">
                            W/C {format(ws, 'MMM d')}
                          </div>
                        ))}
                        <div className="px-1 py-1 text-center">Total</div>
                      </div>

                      {projectUsers.map((user) => {
                        let userTotal = 0;
                        return (
                          <div
                            key={user.id}
                            className="grid text-sm border-b last:border-b-0"
                            style={{ gridTemplateColumns: `140px repeat(${weeks.length}, 1fr) 80px` }}
                          >
                            <div className="px-3 py-1 border-r truncate text-xs font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getDisciplineColor(user.discipline_id).bg }} />
                              {user.name}
                            </div>
                            {weeks.map((ws) => {
                              const { planned: wp, recorded: wr } = getUserProjectWeekHours(user.id, project.id, ws);
                              const val = mode === 'plan' ? wp : wr;
                              userTotal += val;
                              const wDiff = mode === 'record' && wp > 0 ? wr - wp : null;
                              return (
                                <div key={ws.toISOString()} className="px-1 py-1 text-center border-r tabular-nums text-xs">
                                  {val > 0 ? val : ''}
                                  {wDiff !== null && wDiff !== 0 && (
                                    <span className={`ml-0.5 text-[9px] ${wDiff > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                      {wDiff > 0 ? '+' : ''}{wDiff}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            <div className="px-1 py-1 text-center tabular-nums text-xs font-semibold">
                              {userTotal > 0 ? `${userTotal}h` : '—'}
                            </div>
                          </div>
                        );
                      })}

                      {/* Project total row */}
                      <div
                        className="grid text-xs font-semibold bg-muted/30 border-t"
                        style={{ gridTemplateColumns: `140px repeat(${weeks.length}, 1fr) 80px` }}
                      >
                        <div className="px-3 py-1 border-r">Project Total</div>
                        {weeks.map((ws) => {
                          let weekTotal = 0;
                          projectUsers.forEach((u) => {
                            const { planned: wp, recorded: wr } = getUserProjectWeekHours(u.id, project.id, ws);
                            weekTotal += mode === 'plan' ? wp : wr;
                          });
                          return (
                            <div key={ws.toISOString()} className="px-1 py-1 text-center border-r tabular-nums">
                              {weekTotal > 0 ? weekTotal : '—'}
                            </div>
                          );
                        })}
                        <div className="px-1 py-1 text-center tabular-nums font-bold">
                          {mode === 'plan' ? planned : recorded}h
                        </div>
                      </div>

                      {/* Tasks section */}
                      {projectTasks.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/20 border-t border-b flex items-center gap-1">
                            <ClipboardList className="h-3 w-3" /> Tasks ({completedTasks.length}/{projectTasks.length} completed)
                          </div>
                          <div className="px-3 py-2 space-y-1">
                            {projectTasks.map((task) => {
                              const taskUser = users?.find((u) => u.id === task.user_id);
                              return (
                                <div key={task.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={task.is_completed}
                                    onCheckedChange={(checked) => {
                                      toggleTask.mutate({ id: task.id, is_completed: !!checked });
                                    }}
                                  />
                                  <span className={task.is_completed ? 'line-through text-muted-foreground' : ''}>
                                    {task.description}
                                  </span>
                                  {taskUser && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {taskUser.name}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default ProjectManagement;
