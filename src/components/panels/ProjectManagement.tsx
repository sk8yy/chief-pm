import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachWeekOfInterval, eachDayOfInterval } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { useProjects, useUpdateProject } from '@/hooks/useProjects';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useUsers } from '@/hooks/useUsers';
import { useAllHours } from '@/hooks/useAllHours';
import { useProjectDeadlines, useAddDeadline, useDeleteDeadline } from '@/hooks/useDeadlines';
import { useProjectAssignments, useAssignMember, useUnassignMember } from '@/hooks/useAssignments';
import { getDisciplineColor } from '@/lib/colors';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Info, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CreateProjectDialog from './CreateProjectDialog';

const ProjectManagement = () => {
  const { mode } = useAppContext();
  const qc = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newDeadlineName, setNewDeadlineName] = useState('');
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: projects } = useProjects();
  const { data: disciplines } = useDisciplines();
  const { data: users } = useUsers();
  const updateProject = useUpdateProject();

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  // Auto-select first project
  if (projects?.length && !selectedProjectId) {
    setSelectedProjectId(projects[0].id);
  }

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
  const { data: deadlines } = useProjectDeadlines(selectedProjectId || undefined);
  const { data: projectAssignments } = useProjectAssignments(selectedProjectId || undefined, dateRange);
  const assignMemberMut = useAssignMember();
  const unassignMemberMut = useUnassignMember();
  const addDeadline = useAddDeadline();
  const deleteDeadline = useDeleteDeadline();

  // Build hours map for selected project
  const hoursMap = useMemo(() => {
    const map: Record<string, { planned_hours: number; recorded_hours: number | null }> = {};
    allHours?.filter((h) => h.project_id === selectedProjectId).forEach((h) => {
      map[`${h.user_id}_${h.date}`] = { planned_hours: h.planned_hours, recorded_hours: h.recorded_hours };
    });
    return map;
  }, [allHours, selectedProjectId]);

  // Users who have hours on this project
  const projectMembers = useMemo(() => {
    if (!users || !allHours) return [];
    const memberIds = new Set(
      allHours.filter((h) => h.project_id === selectedProjectId).map((h) => h.user_id)
    );
    return users.filter((u) => memberIds.has(u.id));
  }, [users, allHours, selectedProjectId]);

  // Users not yet on this project
  const availableUsers = useMemo(() => {
    if (!users) return [];
    const memberIds = new Set(projectMembers.map((m) => m.id));
    return users.filter((u) => !memberIds.has(u.id));
  }, [users, projectMembers]);

  const getUserWeekHours = (userId: string, weekStart: Date) => {
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    let planned = 0;
    let recorded = 0;
    days.forEach((day) => {
      const key = `${userId}_${format(day, 'yyyy-MM-dd')}`;
      const entry = hoursMap[key];
      if (entry) {
        planned += entry.planned_hours;
        recorded += entry.recorded_hours ?? 0;
      }
    });
    return { planned, recorded };
  };

  // Upsert weekly hours — distributes total evenly across 7 days
  const handleWeekHoursChange = useCallback(async (userId: string, weekStart: Date, total: number, field: 'planned_hours' | 'recorded_hours') => {
    if (!selectedProjectId) return;
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
    const perDay = Math.floor(total / 7);
    const remainder = total - perDay * 7;
    const rows = days.map((day, i) => {
      const val = perDay + (i < remainder ? 1 : 0);
      return {
        user_id: userId,
        project_id: selectedProjectId,
        date: format(day, 'yyyy-MM-dd'),
        planned_hours: field === 'planned_hours' ? val : undefined,
        recorded_hours: field === 'recorded_hours' ? val : undefined,
      };
    });
    // Upsert each day individually so we only update the target field
    for (const row of rows) {
      const updatePayload: Record<string, number> = {};
      if (row.planned_hours !== undefined) updatePayload.planned_hours = row.planned_hours;
      if (row.recorded_hours !== undefined) updatePayload.recorded_hours = row.recorded_hours;

      await supabase.from('hours').upsert({
        user_id: row.user_id,
        project_id: row.project_id,
        date: row.date,
        ...updatePayload,
      }, { onConflict: 'user_id,project_id,date' });
    }
    qc.invalidateQueries({ queryKey: ['all_hours'] });
  }, [selectedProjectId, qc]);

  // Add member
  const handleAddMember = async (userId: string) => {
    if (!selectedProjectId) return;
    // Insert zero-hour entries for each day in the current week range
    const rows = weeks.flatMap((ws) => {
      const days = eachDayOfInterval({ start: ws, end: endOfWeek(ws, { weekStartsOn: 1 }) });
      return days.map((day) => ({
        user_id: userId,
        project_id: selectedProjectId,
        date: format(day, 'yyyy-MM-dd'),
        planned_hours: 0,
      }));
    });
    await supabase.from('hours').upsert(rows, { onConflict: 'user_id,project_id,date', ignoreDuplicates: true });
    // Also create assignment records for all visible weeks
    const weekStarts = weeks.map((ws) => format(ws, 'yyyy-MM-dd'));
    assignMemberMut.mutate({
      user_id: userId,
      project_id: selectedProjectId,
      week_starts: weekStarts,
    });
    qc.invalidateQueries({ queryKey: ['all_hours'] });
  };

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    if (!selectedProjectId) return;
    await supabase.from('hours').delete().eq('user_id', userId).eq('project_id', selectedProjectId).gte('date', dateRange.start).lte('date', dateRange.end);
    // Also remove assignment records
    const weekStarts = weeks.map((ws) => format(ws, 'yyyy-MM-dd'));
    unassignMemberMut.mutate({
      user_id: userId,
      project_id: selectedProjectId,
      week_starts: weekStarts,
    });
    qc.invalidateQueries({ queryKey: ['all_hours'] });
  };

  // Handle adding deadline
  const handleAddDeadline = () => {
    if (!newDeadlineName || !newDeadlineDate || !selectedProjectId || !users?.length) return;
    addDeadline.mutate({
      name: newDeadlineName,
      date: newDeadlineDate,
      project_id: selectedProjectId,
      created_by: users[0].id,
    });
    setNewDeadlineName('');
    setNewDeadlineDate('');
  };

  // Group projects by discipline for selector
  const groupedProjects = useMemo(() => {
    if (!projects || !disciplines) return [];
    return disciplines.map((d) => ({
      discipline: d,
      projects: projects.filter((p) => p.discipline_id === d.id),
    })).filter((g) => g.projects.length > 0);
  }, [projects, disciplines]);

  // Chart data
  const chartData = useMemo(() => {
    return projectMembers.flatMap((member) =>
      weeks.map((ws) => {
        const { planned, recorded } = getUserWeekHours(member.id, ws);
        return {
          name: `${member.name} - W/C ${format(ws, 'MMM d')}`,
          Planned: planned,
          Actual: recorded,
        };
      })
    ).filter((d) => d.Planned > 0 || d.Actual > 0);
  }, [projectMembers, weeks, hoursMap]);

  const handleFieldUpdate = (field: string, value: string | null) => {
    if (!selectedProject) return;
    updateProject.mutate({ id: selectedProject.id, [field]: value || null });
  };

  if (!projects?.length) {
    return <div className="p-8 text-center text-muted-foreground">No projects found.</div>;
  }

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* Top Bar: Project Selector + Month Nav */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select project..." />
          </SelectTrigger>
          <SelectContent>
            {groupedProjects.map((g) => (
              <SelectGroup key={g.discipline.id}>
                <SelectLabel>{g.discipline.name}</SelectLabel>
                {g.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.job_number})
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Project
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedProject && (
        <>
          {/* Section 1: Project Info */}
          <section className="border rounded-lg bg-card">
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" /> Project Info
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Project Name</label>
                <Input
                  defaultValue={selectedProject.name}
                  onBlur={(e) => handleFieldUpdate('name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Job Number</label>
                <Input
                  defaultValue={selectedProject.job_number}
                  onBlur={(e) => handleFieldUpdate('job_number', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Discipline</label>
                <Select
                  value={selectedProject.discipline_id ?? ''}
                  onValueChange={(v) => handleFieldUpdate('discipline_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {disciplines?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Project Manager</label>
                <Select
                  value={selectedProject.manager_id ?? ''}
                  onValueChange={(v) => handleFieldUpdate('manager_id', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  defaultValue={(selectedProject as any).start_date ?? ''}
                  onBlur={(e) => handleFieldUpdate('start_date', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  defaultValue={(selectedProject as any).end_date ?? ''}
                  onBlur={(e) => handleFieldUpdate('end_date', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Hour Management */}
          <section className="border rounded-lg bg-card">
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4" /> Hour Management
              <div className="ml-auto">
                {availableUsers.length > 0 && (
                  <Select onValueChange={(v) => handleAddMember(v)}>
                    <SelectTrigger className="h-7 text-xs w-[160px]">
                      <Plus className="h-3 w-3 mr-1" /> Add Member
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Hours grid */}
            <div className="overflow-x-auto">
              <div
                className="grid text-xs font-medium border-b bg-muted/40 min-w-[600px]"
                style={{ gridTemplateColumns: `160px repeat(${weeks.length}, 1fr) 80px` }}
              >
                <div className="px-3 py-1.5 border-r">Member</div>
                {weeks.map((ws) => (
                  <div key={ws.toISOString()} className="px-1 py-1.5 text-center border-r">
                    W/C {format(ws, 'MMM d')}
                  </div>
                ))}
                <div className="px-1 py-1.5 text-center">Total</div>
              </div>

              {projectMembers.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No members yet. Add a member above.
                </div>
              )}

              {projectMembers.map((user) => {
                let userPlannedTotal = 0;
                let userRecordedTotal = 0;
                return (
                  <div
                    key={user.id}
                    className="grid text-sm border-b last:border-b-0 min-w-[600px]"
                    style={{ gridTemplateColumns: `160px repeat(${weeks.length}, 1fr) 80px` }}
                  >
                    <div className="px-3 py-1 border-r truncate text-xs font-medium flex items-center gap-1">
                      <button
                        onClick={() => handleRemoveMember(user.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getDisciplineColor(user.discipline_id).bg }} />
                      {user.name}
                    </div>
                    {weeks.map((ws) => {
                      const { planned, recorded } = getUserWeekHours(user.id, ws);
                      userPlannedTotal += planned;
                      userRecordedTotal += recorded;
                      return (
                        <div key={ws.toISOString()} className="px-0.5 py-0.5 text-center border-r tabular-nums text-xs flex flex-col gap-0.5 justify-center">
                          {mode === 'plan' ? (
                            <input
                              key={`plan-${planned}`}
                              type="number"
                              min={0}
                              defaultValue={planned || ''}
                              placeholder="0"
                              className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-ring focus:outline-none rounded px-1 py-0.5 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              onBlur={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                if (val !== planned) handleWeekHoursChange(user.id, ws, val, 'planned_hours');
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            />
                          ) : (
                            <>
                              <input
                                key={`rp-${planned}`}
                                type="number"
                                min={0}
                                defaultValue={planned || ''}
                                placeholder="P"
                                title="Planned"
                                className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-ring focus:outline-none rounded px-1 py-0 text-[10px] text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  if (val !== planned) handleWeekHoursChange(user.id, ws, val, 'planned_hours');
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              />
                              <input
                                key={`ra-${recorded}`}
                                type="number"
                                min={0}
                                defaultValue={recorded || ''}
                                placeholder="A"
                                title="Actual"
                                className="w-full text-center bg-transparent border border-transparent hover:border-border focus:border-ring focus:outline-none rounded px-1 py-0 text-[10px] font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  if (val !== recorded) handleWeekHoursChange(user.id, ws, val, 'recorded_hours');
                                }}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                    <div className="px-1 py-1 text-center tabular-nums text-xs font-semibold">
                      {mode === 'plan'
                        ? (userPlannedTotal > 0 ? `${userPlannedTotal}h` : '—')
                        : (userRecordedTotal > 0 ? `${userRecordedTotal}h` : '—')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart visualization */}
            {chartData.length > 0 && mode === 'record' && (
              <div className="px-4 py-4 border-t">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Planned vs Actual Hours</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Planned" fill="hsl(var(--primary))" />
                    <Bar dataKey="Actual" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Section 3: Deadlines */}
          <section className="border rounded-lg bg-card">
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" /> Deadlines
            </div>
            <div className="p-4 space-y-2">
              {deadlines?.map((d) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => deleteDeadline.mutate(d.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground ml-auto">{format(new Date(d.date), 'dd MMM yyyy')}</span>
                </div>
              ))}
              {(!deadlines || deadlines.length === 0) && (
                <div className="text-xs text-muted-foreground">No deadlines yet.</div>
              )}

              {/* Add deadline inline form */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Input
                  placeholder="Deadline name"
                  value={newDeadlineName}
                  onChange={(e) => setNewDeadlineName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="date"
                  value={newDeadlineDate}
                  onChange={(e) => setNewDeadlineDate(e.target.value)}
                  className="h-8 text-sm w-[160px]"
                />
                <Button size="sm" variant="outline" onClick={handleAddDeadline} disabled={!newDeadlineName || !newDeadlineDate}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        disciplines={disciplines ?? []}
        users={users ?? []}
      />
    </div>
  );
};

export default ProjectManagement;
