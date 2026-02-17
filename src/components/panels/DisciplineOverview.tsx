import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachWeekOfInterval, eachDayOfInterval } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { useProjects } from '@/hooks/useProjects';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useUsers } from '@/hooks/useUsers';
import { useAllHours } from '@/hooks/useAllHours';
import { useAllAssignments, useAssignMember, useUnassignMember } from '@/hooks/useAssignments';
import { useAllDeadlines } from '@/hooks/useDeadlines';
import { useAllTasks, useToggleTask } from '@/hooks/useTasks';
import { getDisciplineColor, getDisciplineColorRecord } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Trash2, Users, FolderKanban, Pencil, X, Check, ClipboardPaste } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import MemberSticker from './MemberSticker';
import AddMemberDialog from './AddMemberDialog';
import CreateProjectDialog from './CreateProjectDialog';
import TaskList from './TaskList';

const DisciplineOverview = () => {
  const { mode } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDisciplines, setExpandedDisciplines] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, 'projects' | 'people'>>({});

  // Create project dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogDisciplineId, setCreateDialogDisciplineId] = useState<string | null>(null);

  // Add person form state
  const [addingPersonTo, setAddingPersonTo] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState('');

  // Edit person state
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [editPersonName, setEditPersonName] = useState('');

  const queryClient = useQueryClient();

  // Clipboard for copy/paste stickers
  const [clipboard, setClipboard] = useState<{ userId: string; hours: number } | null>(null);
  // Add member dialog state
  const [addDialogTarget, setAddDialogTarget] = useState<{ projectId: string; weekStart: Date; anchorEl: HTMLElement | null } | null>(null);
  // Hover state for week cells
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
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
  const { data: allAssignments } = useAllAssignments(dateRange);
  const { data: allDeadlines } = useAllDeadlines(dateRange);
  const { data: allTasks } = useAllTasks(dateRange);
  const toggleTask = useToggleTask();
  const assignMemberMut = useAssignMember();
  const unassignMemberMut = useUnassignMember();

  // Map deadlines by week start for quick lookup
  const deadlinesByWeek = useMemo(() => {
    const map: Record<string, Array<{ name: string; date: string; projectName: string }>> = {};
    allDeadlines?.forEach((d: any) => {
      // Find which week this deadline falls in
      const deadlineDate = new Date(d.date + 'T00:00:00');
      const ws = startOfWeek(deadlineDate, { weekStartsOn: 1 });
      const wsKey = ws.toISOString();
      if (!map[wsKey]) map[wsKey] = [];
      map[wsKey].push({ name: d.name, date: d.date, projectName: d.projects?.name ?? 'Unknown' });
    });
    return map;
  }, [allDeadlines]);
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

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getTab = (discId: string) => activeTab[discId] ?? 'projects';

  const disciplineGroups = useMemo(() => {
    if (!disciplines || !users || !projects) return [];
    return disciplines.filter(d => d.name !== 'Leave').map((d) => {
      const discUsers = users.filter((u) => u.discipline_id === d.id);
      const discProjects = projects.filter((p) => p.discipline_id === d.id);
      return { discipline: d, users: discUsers, projects: discProjects };
    }).filter((g) => g.users.length > 0 || g.projects.length > 0);
  }, [disciplines, users, projects]);

  // Project weekly hours (all users combined)
  const getProjectWeekHours = (projectId: string, weekStart: Date) => {
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    let total = 0;
    users?.forEach((u) => {
      days.forEach((day) => {
        const key = `${u.id}_${projectId}_${format(day, 'yyyy-MM-dd')}`;
        const entry = hoursMap[key];
        if (entry) total += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
      });
    });
    return total;
  };

  const getProjectMonthTotal = (projectId: string) => {
    return weeks.reduce((sum, ws) => sum + getProjectWeekHours(projectId, ws), 0);
  };

  // User hours on a specific project in a week
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

  const getDisciplineProjectsTotal = (discProjects: typeof projects extends (infer U)[] | undefined ? U[] : never[]) => {
    return discProjects.reduce((sum, p) => sum + getProjectMonthTotal(p.id), 0);
  };

  const openCreateDialog = (disciplineId: string) => {
    setCreateDialogDisciplineId(disciplineId);
    setCreateDialogOpen(true);
  };

  const deleteProject = async (projectId: string) => {
    await supabase.from('projects').delete().eq('id', projectId);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const addPerson = async (disciplineId: string) => {
    if (!newPersonName.trim()) return;
    await supabase.from('app_users').insert({
      name: newPersonName.trim(),
      discipline_id: disciplineId,
    });
    setNewPersonName('');
    setAddingPersonTo(null);
    queryClient.invalidateQueries({ queryKey: ['app_users'] });
  };

  const deletePerson = async (userId: string) => {
    await supabase.from('app_users').delete().eq('id', userId);
    queryClient.invalidateQueries({ queryKey: ['app_users'] });
  };

  const updatePerson = async (userId: string) => {
    if (!editPersonName.trim()) return;
    await supabase.from('app_users').update({ name: editPersonName.trim() }).eq('id', userId);
    setEditingPerson(null);
    queryClient.invalidateQueries({ queryKey: ['app_users'] });
  };

  const movePersonDiscipline = async (userId: string, newDisciplineId: string) => {
    await supabase.from('app_users').update({ discipline_id: newDisciplineId }).eq('id', userId);
    queryClient.invalidateQueries({ queryKey: ['app_users'] });
  };

  // Sticker: add/paste member hours for a project week (distribute evenly across 7 days)
  const upsertStickerHours = useCallback(async (userId: string, projectId: string, weekStart: Date, totalHours: number) => {
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    const field = mode === 'plan' ? 'planned_hours' : 'recorded_hours';
    const perDay = Math.floor(totalHours / 7);
    const remainder = totalHours - perDay * 7;
    const rows = days.map((day, i) => ({
      user_id: userId,
      project_id: projectId,
      date: format(day, 'yyyy-MM-dd'),
      [field]: perDay + (i < remainder ? 1 : 0),
    }));
    for (const row of rows) {
      const { data: existing } = await supabase
        .from('hours')
        .select('id, planned_hours, recorded_hours')
        .eq('user_id', row.user_id)
        .eq('project_id', row.project_id)
        .eq('date', row.date)
        .maybeSingle();
      if (existing) {
        await supabase.from('hours').update({ [field]: row[field] }).eq('id', existing.id);
      } else {
        await supabase.from('hours').insert({
          user_id: row.user_id,
          project_id: row.project_id,
          date: row.date,
          planned_hours: field === 'planned_hours' ? (row[field] as number) : 0,
          recorded_hours: field === 'recorded_hours' ? (row[field] as number) : null,
        });
      }
    }
    // Also create assignment record
    assignMemberMut.mutate({
      user_id: userId,
      project_id: projectId,
      week_starts: [format(weekStart, 'yyyy-MM-dd')],
    });
    queryClient.invalidateQueries({ queryKey: ['all_hours'] });
    queryClient.invalidateQueries({ queryKey: ['hours'] });
  }, [mode, queryClient, assignMemberMut]);

  const deleteStickerHours = useCallback(async (userId: string, projectId: string, weekStart: Date) => {
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    const field = mode === 'plan' ? 'planned_hours' : 'recorded_hours';
    for (const day of days) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const { data: existing } = await supabase
        .from('hours')
        .select('id')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('date', dateStr)
        .maybeSingle();
      if (existing) {
        await supabase.from('hours').update({ [field]: field === 'planned_hours' ? 0 : null }).eq('id', existing.id);
      }
    }
    // Also remove assignment record
    unassignMemberMut.mutate({
      user_id: userId,
      project_id: projectId,
      week_starts: [format(weekStart, 'yyyy-MM-dd')],
    });
    queryClient.invalidateQueries({ queryKey: ['all_hours'] });
    queryClient.invalidateQueries({ queryKey: ['hours'] });
  }, [mode, queryClient, unassignMemberMut]);

  // Get per-user hours for a project+week (for stickers)
  const getProjectWeekStickers = useCallback((projectId: string, weekStart: Date) => {
    if (!users) return [];
    const stickers: { userId: string; userName: string; disciplineId: string | null; hours: number }[] = [];
    users.forEach((u) => {
      const { planned, recorded } = getUserProjectWeekHours(u.id, projectId, weekStart);
      const val = mode === 'plan' ? planned : recorded;
      if (val > 0) {
        stickers.push({ userId: u.id, userName: u.name, disciplineId: u.discipline_id, hours: val });
      }
    });
    return stickers;
  }, [users, hoursMap, mode]);
  return (
    <TooltipProvider>
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
        const discTotal = getDisciplineProjectsTotal(group.projects);
        const tab = getTab(group.discipline.id);

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
                  {group.projects.length} project{group.projects.length !== 1 ? 's' : ''} · {group.users.length} member{group.users.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right mr-4">
                <div className="text-sm font-semibold tabular-nums">{discTotal}h</div>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t">
                {/* Tab bar */}
                <div className="flex border-b bg-muted/20">
                  <button
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'projects' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab(prev => ({ ...prev, [group.discipline.id]: 'projects' })); }}
                  >
                    <FolderKanban className="h-3.5 w-3.5" /> Projects
                  </button>
                  <button
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === 'people' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    onClick={(e) => { e.stopPropagation(); setActiveTab(prev => ({ ...prev, [group.discipline.id]: 'people' })); }}
                  >
                    <Users className="h-3.5 w-3.5" /> People ({group.users.length})
                  </button>
                </div>

                {/* Projects tab */}
                {tab === 'projects' && (
                  <div>
                    {/* Week header */}
                    <div className="grid text-xs font-medium border-b bg-muted/50"
                      style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px 40px` }}
                    >
                      <div className="px-3 py-1.5 border-r">Project</div>
                      {weeks.map((ws) => {
                        const weekDeadlines = deadlinesByWeek[ws.toISOString()];
                        return (
                          <div key={ws.toISOString()} className="px-1 py-1.5 text-center border-r">
                            <span className="inline-flex items-center gap-0.5">
                              W/C {format(ws, 'MMM d')}
                              {weekDeadlines && weekDeadlines.length > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="w-2 h-2 rounded-full bg-destructive inline-block shrink-0 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px]">
                                    {weekDeadlines.map((dl, i) => (
                                      <div key={i} className="text-xs">
                                        <span className="font-medium">{dl.name}</span>
                                        <span className="text-muted-foreground ml-1">({dl.projectName} · {format(new Date(dl.date + 'T00:00:00'), 'MMM d')})</span>
                                      </div>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                          </div>
                        );
                      })}
                      <div className="px-1 py-1.5 text-center border-r">Total</div>
                      <div className="px-1 py-1.5 text-center"></div>
                    </div>

                    {/* Project rows */}
                    {group.projects.map((project) => {
                      const monthTotal = getProjectMonthTotal(project.id);
                      const projectExpanded = expandedProjects.has(project.id);
                      const projectUsers = users?.filter(u => {
                        return weeks.some(ws => {
                          const { planned, recorded } = getUserProjectWeekHours(u.id, project.id, ws);
                          return planned > 0 || recorded > 0;
                        });
                      }) ?? [];

                      return (
                        <div key={project.id}>
                          <div
                            className="grid text-sm border-b last:border-b-0"
                            style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px 40px` }}
                          >
                            <div
                              className="px-3 py-1.5 border-r font-medium flex items-center gap-1.5 cursor-pointer hover:bg-muted/20"
                              onClick={() => toggleProject(project.id)}
                            >
                              {projectExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              <span className="truncate">{project.name}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{project.job_number}</span>
                            </div>
                            {weeks.map((ws) => {
                              const cellKey = `${project.id}_${ws.toISOString()}`;
                              const stickers = getProjectWeekStickers(project.id, ws);
                              const isHovered = hoveredCell === cellKey;
                              const weekHrs = getProjectWeekHours(project.id, ws);

                              return (
                                <div
                                  key={ws.toISOString()}
                                  className="px-1 py-1 border-r min-h-[52px] relative group flex flex-col items-center justify-center gap-1"
                                  data-week-cell
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                >
                                  {/* Stickers */}
                                  {stickers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 justify-center items-center">
                                      {stickers.map((s) => (
                                        <MemberSticker
                                          key={s.userId}
                                          userName={s.userName}
                                          hours={s.hours}
                                          disciplineId={s.disciplineId}
                                          onDelete={() => deleteStickerHours(s.userId, project.id, ws)}
                                          onCopy={() => setClipboard({ userId: s.userId, hours: s.hours })}
                                          onEditHours={(newHours) => upsertStickerHours(s.userId, project.id, ws, newHours)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Hover buttons: Add + Paste */}
                                  {isHovered && (
                                    <div className="flex gap-1 justify-center">
                                      <button
                                        className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const cell = (e.currentTarget as HTMLElement).closest('[data-week-cell]') as HTMLElement;
                                          setAddDialogTarget({ projectId: project.id, weekStart: ws, anchorEl: cell });
                                        }}
                                      >
                                        <Plus className="h-2.5 w-2.5" /> Add
                                      </button>
                                      {clipboard && (
                                        <button
                                          className="flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            upsertStickerHours(clipboard.userId, project.id, ws, clipboard.hours);
                                          }}
                                        >
                                          <ClipboardPaste className="h-2.5 w-2.5" /> Paste
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Add member popover anchored to this cell */}
                                  {addDialogTarget?.projectId === project.id && addDialogTarget?.weekStart.getTime() === ws.getTime() && (
                                    <AddMemberDialog
                                      open={true}
                                      onClose={() => setAddDialogTarget(null)}
                                      onConfirm={(userId, hrs) => {
                                        upsertStickerHours(userId, project.id, ws, hrs);
                                        setAddDialogTarget(null);
                                      }}
                                      availableUsers={users ?? []}
                                      disciplines={disciplines ?? []}
                                      anchorEl={addDialogTarget?.anchorEl}
                                    />
                                  )}
                                </div>
                              );
                            })}
                            <div className="px-1 py-1.5 text-center font-semibold tabular-nums border-r">
                              {monthTotal > 0 ? `${monthTotal}h` : '—'}
                            </div>
                            <div className="flex items-center justify-center">
                              <button
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                                title="Delete project"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded: user breakdown (detailed) */}
                          {projectExpanded && projectUsers.length > 0 && (
                            <div className="bg-muted/10">
                              {projectUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className="grid text-xs border-b last:border-b-0"
                                  style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px 40px` }}
                                >
                                  <div className="px-3 py-1 border-r pl-9 flex items-center gap-1.5 text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getDisciplineColor(user.discipline_id).bg }} />
                                    <span className="truncate">{user.name}</span>
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
                                  <div className="px-1 py-1 text-center tabular-nums font-medium border-r">
                                    {(() => {
                                      let t = 0;
                                      weeks.forEach((ws) => {
                                        const { planned, recorded } = getUserProjectWeekHours(user.id, project.id, ws);
                                        t += mode === 'plan' ? planned : recorded;
                                      });
                                      return t > 0 ? t : '';
                                    })()}
                                  </div>
                                  <div />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Discipline totals row */}
                    <div
                      className="grid text-xs font-semibold bg-muted/30 border-t"
                      style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr) 80px 40px` }}
                    >
                      <div className="px-3 py-1.5 border-r">Discipline Total</div>
                      {weeks.map((ws) => {
                        let weekTotal = 0;
                        group.projects.forEach((p) => { weekTotal += getProjectWeekHours(p.id, ws); });
                        return (
                          <div key={ws.toISOString()} className="px-1 py-1.5 text-center border-r tabular-nums">
                            {weekTotal > 0 ? weekTotal : '—'}
                          </div>
                        );
                      })}
                      <div className="px-1 py-1.5 text-center tabular-nums font-bold border-r">{discTotal}h</div>
                      <div />
                    </div>

                    {/* Tasks for this discipline */}
                    {(() => {
                      const discProjectIds = new Set(group.projects.map(p => p.id));
                      const discTasks = allTasks?.filter(t => discProjectIds.has(t.project_id)) ?? [];
                      if (discTasks.length === 0) return null;
                      return (
                        <div className="px-4 py-2 border-t">
                          <TaskList
                            tasks={discTasks}
                            onToggle={(id, is_completed) => toggleTask.mutate({ id, is_completed })}
                            title="Tasks"
                            compact
                            showAssignees
                            users={users ?? []}
                            showProject
                            projects={projects?.map(p => ({ id: p.id, name: p.name })) ?? []}
                          />
                        </div>
                      );
                    })()}

                    {/* Add project button */}
                    <button
                      className="w-full px-3 py-2 border-t text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 flex items-center gap-1.5 transition-colors"
                      onClick={() => openCreateDialog(group.discipline.id)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add project
                    </button>
                  </div>
                )}

                {/* People tab */}
                {tab === 'people' && (
                  <div>
                    {group.users.map((user) => {
                      const isEditing = editingPerson === user.id;
                      return (
                        <div key={user.id} className="flex items-center gap-2 px-4 py-2 border-b last:border-b-0 text-sm">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.bg }} />
                          {isEditing ? (
                            <>
                              <Input
                                value={editPersonName}
                                onChange={(e) => setEditPersonName(e.target.value)}
                                className="h-7 text-xs flex-1"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') updatePerson(user.id); if (e.key === 'Escape') setEditingPerson(null); }}
                              />
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => updatePerson(user.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingPerson(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1">{user.name}</span>
                              <Select
                                value={user.discipline_id ?? ''}
                                onValueChange={(val) => movePersonDiscipline(user.id, val)}
                              >
                                <SelectTrigger className="h-7 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {disciplines?.filter(d => d.name !== 'Leave').map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => { setEditingPerson(user.id); setEditPersonName(user.name); }}
                                title="Edit name"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => deletePerson(user.id)}
                                title="Remove person"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add person form */}
                    {addingPersonTo === group.discipline.id ? (
                      <div className="px-4 py-2 border-t flex items-center gap-2">
                        <Input
                          placeholder="Person name"
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          className="h-7 text-xs flex-1"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && addPerson(group.discipline.id)}
                        />
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => addPerson(group.discipline.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAddingPersonTo(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="w-full px-4 py-2 border-t text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 flex items-center gap-1.5 transition-colors"
                        onClick={() => setAddingPersonTo(group.discipline.id)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add person
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}


      {/* Clipboard indicator */}
      {clipboard && (
        <div className="fixed bottom-4 right-4 bg-secondary text-secondary-foreground text-xs rounded-md px-3 py-1.5 shadow-lg flex items-center gap-2 z-50">
          <ClipboardPaste className="h-3.5 w-3.5" />
          Copied: {users?.find(u => u.id === clipboard.userId)?.name} · {clipboard.hours}h
          <button onClick={() => setClipboard(null)} className="ml-1 hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        disciplines={disciplines ?? []}
        users={users ?? []}
        defaultDisciplineId={createDialogDisciplineId}
      />
    </div>
    </TooltipProvider>
  );
};

export default DisciplineOverview;
