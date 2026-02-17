import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, eachWeekOfInterval, differenceInDays, isBefore, isAfter, parseISO } from 'date-fns';
import { TaskRow, useCreateTask, useDeleteTask, useToggleTask, useUpdateTaskDates } from '@/hooks/useTasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Minus, X, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const TASK_COLORS = [
  'hsl(207, 70%, 55%)',
  'hsl(122, 40%, 50%)',
  'hsl(36, 90%, 55%)',
  'hsl(262, 50%, 55%)',
  'hsl(14, 80%, 55%)',
  'hsl(180, 50%, 45%)',
  'hsl(330, 60%, 55%)',
  'hsl(50, 70%, 50%)',
];

interface User {
  id: string;
  name: string;
}

interface Props {
  tasks: TaskRow[];
  projectId: string;
  projectName: string;
  users: User[];
  onToggle: (id: string, is_completed: boolean) => void;
}

const TaskGantt: React.FC<Props> = ({ tasks, projectId, projectName, users, onToggle }) => {
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const updateDates = useUpdateTaskDates();
  const queryClient = useQueryClient();

  const [extraWeeks, setExtraWeeks] = useState(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [newDesc, setNewDesc] = useState('');
  const [newUserIds, setNewUserIds] = useState<string[]>([]);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const [dragTask, setDragTask] = useState<{ taskId: string; startCol: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [needsDrag, setNeedsDrag] = useState<string | null>(null);

  const { weeks, allDays, weekStart: calStart } = useMemo(() => {
    const today = new Date();
    let earliest = startOfWeek(today, { weekStartsOn: 1 });
    let latest = endOfWeek(today, { weekStartsOn: 1 });

    tasks.forEach(t => {
      if (t.start_date) {
        const sd = parseISO(t.start_date);
        if (isBefore(sd, earliest)) earliest = startOfWeek(sd, { weekStartsOn: 1 });
      }
      if (t.end_date) {
        const ed = parseISO(t.end_date);
        if (isAfter(ed, latest)) latest = endOfWeek(ed, { weekStartsOn: 1 });
      }
    });

    latest = endOfWeek(addWeeks(latest, Math.max(0, extraWeeks)), { weekStartsOn: 1 });
    const minEnd = endOfWeek(addWeeks(earliest, 3), { weekStartsOn: 1 });
    if (isBefore(latest, minEnd)) latest = minEnd;

    const weeks = eachWeekOfInterval({ start: earliest, end: latest }, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: earliest, end: endOfWeek(latest, { weekStartsOn: 1 }) });

    return { weeks, allDays, weekStart: earliest };
  }, [tasks, extraWeeks]);

  const totalDays = allDays.length;

  const getTaskColor = useCallback((index: number) => TASK_COLORS[index % TASK_COLORS.length], []);

  const getDateCol = useCallback((dateStr: string) => {
    return differenceInDays(parseISO(dateStr), calStart);
  }, [calStart]);

  // Group tasks by description+project to show multiple persons
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { tasks: TaskRow[]; userIds: string[] }> = {};
    tasks.forEach(t => {
      const key = `${t.description.toLowerCase().trim()}_${t.project_id}`;
      if (!groups[key]) groups[key] = { tasks: [], userIds: [] };
      groups[key].tasks.push(t);
      if (!groups[key].userIds.includes(t.user_id)) groups[key].userIds.push(t.user_id);
    });
    return Object.values(groups).sort((a, b) => {
      const aHas = a.tasks[0].start_date || a.tasks[0].end_date ? 0 : 1;
      const bHas = b.tasks[0].start_date || b.tasks[0].end_date ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return (a.tasks[0].start_date ?? '').localeCompare(b.tasks[0].start_date ?? '');
    });
  }, [tasks]);

  // Auto-create/update sticker when tasks are added from Panel 3
  const autoCreateSticker = useCallback(async (description: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const stickerTitle = `${projectName} _New Tasks _${today}`;

    // Check if a sticker for this project+date already exists
    const { data: existing } = await supabase
      .from('stickers')
      .select('id, content')
      .eq('project_id', projectId)
      .like('content', `${projectName} _New Tasks _${today}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      // Append to existing sticker
      const sticker = existing[0];
      const newContent = `${sticker.content}\n- ${description}`;
      await supabase.from('stickers').update({ content: newContent }).eq('id', sticker.id);
    } else {
      // Create new sticker - need a user_id; use first assigned user or first user
      const userId = users[0]?.id;
      if (!userId) return;
      await supabase.from('stickers').insert({
        content: `${stickerTitle}\n- ${description}`,
        user_id: userId,
        project_id: projectId,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['stickers'] });
  }, [projectId, projectName, users, queryClient]);

  const handleAddTask = async () => {
    if (!newDesc.trim() || newUserIds.length === 0) {
      toast.error('Please enter description and select at least one person.');
      return;
    }

    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    let firstResult: TaskRow | null = null;
    for (const uid of newUserIds) {
      const result = await createTask.mutateAsync({
        user_id: uid,
        project_id: projectId,
        week_start: weekStart,
        description: newDesc.trim(),
        start_date: newStartDate || null,
        end_date: newEndDate || null,
      });
      if (!firstResult) firstResult = result;
    }

    if (!newStartDate && !newEndDate && firstResult) {
      setNeedsDrag(firstResult.id);
      toast.info('Drag on the calendar to set the task dates.');
    }

    // Auto-create sticker
    await autoCreateSticker(newDesc.trim());

    setNewDesc('');
    setNewUserIds([]);
    setNewStartDate('');
    setNewEndDate('');
    setShowAddDialog(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    await deleteTask.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleDragStart = (taskId: string, dayIdx: number) => {
    setDragTask({ taskId, startCol: dayIdx });
    setDragEnd(dayIdx);
  };

  const handleDragMove = (dayIdx: number) => {
    if (dragTask) setDragEnd(dayIdx);
  };

  const handleDragEnd = async () => {
    if (!dragTask || dragEnd === null) return;
    const startIdx = Math.min(dragTask.startCol, dragEnd);
    const endIdx = Math.max(dragTask.startCol, dragEnd);
    const startDate = format(allDays[startIdx], 'yyyy-MM-dd');
    const endDate = format(allDays[endIdx], 'yyyy-MM-dd');

    await updateDates.mutateAsync({
      id: dragTask.taskId,
      start_date: startDate,
      end_date: endDate,
    });

    setDragTask(null);
    setDragEnd(null);
    setNeedsDrag(null);
  };

  useEffect(() => {
    const up = () => { if (dragTask) handleDragEnd(); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [dragTask, dragEnd]);

  const toggleUserSelection = (uid: string) => {
    setNewUserIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Task Calendar</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setExtraWeeks(w => Math.max(0, w - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setExtraWeeks(w => w + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button size="sm" className="h-7 text-xs ml-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add Task
          </Button>
        </div>
      </div>

      {needsDrag && (
        <div className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded">
          Drag across the calendar below to set dates for the new task.
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <div className="min-w-[700px]">
          {/* Week headers */}
          <div className="flex border-b bg-muted/40">
            <div className="w-[200px] shrink-0 px-2 py-1 text-xs font-medium border-r">Task / Assigned</div>
            <div className="flex-1 flex">
              {weeks.map((ws) => (
                <div key={ws.toISOString()} className="text-[10px] text-center font-medium border-r py-1" style={{ width: `${(7 / totalDays) * 100}%` }}>
                  W/C {format(ws, 'MMM d')}
                </div>
              ))}
            </div>
            <div className="w-[36px] shrink-0" />
          </div>

          {/* Day headers */}
          <div className="flex border-b bg-muted/20">
            <div className="w-[200px] shrink-0 border-r" />
            <div className="flex-1 flex">
              {allDays.map((day, i) => (
                <div key={i} className="text-[8px] text-center text-muted-foreground border-r py-0.5" style={{ width: `${(1 / totalDays) * 100}%` }}>
                  {format(day, 'd')}
                </div>
              ))}
            </div>
            <div className="w-[36px] shrink-0" />
          </div>

          {/* Task rows (grouped) */}
          {groupedTasks.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6">
              No tasks yet. Click "Add Task" to create one.
            </div>
          )}

          {groupedTasks.map((group, groupIdx) => {
            const primaryTask = group.tasks[0];
            const color = getTaskColor(groupIdx);
            const hasStart = !!primaryTask.start_date;
            const hasEnd = !!primaryTask.end_date;
            const hasDates = hasStart || hasEnd;

            let blockStart = 0;
            let blockEnd = 0;
            if (hasDates) {
              blockStart = hasStart ? Math.max(0, getDateCol(primaryTask.start_date!)) : 0;
              blockEnd = hasEnd ? Math.min(totalDays - 1, getDateCol(primaryTask.end_date!)) : blockStart;
            }

            const isDragging = dragTask?.taskId === primaryTask.id;
            let dragStartCol = 0;
            let dragEndCol = 0;
            if (isDragging && dragEnd !== null) {
              dragStartCol = Math.min(dragTask!.startCol, dragEnd);
              dragEndCol = Math.max(dragTask!.startCol, dragEnd);
            }

            const allCompleted = group.tasks.every(t => t.is_completed);
            const userNames = group.userIds.map(uid => users.find(u => u.id === uid)?.name ?? '').filter(Boolean);

            return (
              <div key={primaryTask.id} className="flex border-b last:border-b-0 group/row">
                <div className="w-[200px] shrink-0 px-2 py-1.5 border-r flex flex-col justify-center gap-0.5">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className={`truncate ${allCompleted ? 'line-through text-muted-foreground/60' : ''}`} title={primaryTask.description}>
                      {primaryTask.description}
                    </span>
                  </div>
                  {userNames.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 ml-3">
                      {userNames.map((name, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0 rounded-full bg-muted text-muted-foreground">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className="flex-1 relative min-h-[32px] flex items-center"
                  onMouseDown={(e) => {
                    if (needsDrag === primaryTask.id || !hasDates) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const dayIdx = Math.floor((x / rect.width) * totalDays);
                      handleDragStart(primaryTask.id, dayIdx);
                    }
                  }}
                  onMouseMove={(e) => {
                    if (dragTask) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const dayIdx = Math.max(0, Math.min(totalDays - 1, Math.floor((x / rect.width) * totalDays)));
                      handleDragMove(dayIdx);
                    }
                  }}
                >
                  <div className="absolute inset-0 flex pointer-events-none">
                    {allDays.map((_, i) => (
                      <div key={i} className="border-r border-muted/30" style={{ width: `${(1 / totalDays) * 100}%` }} />
                    ))}
                  </div>

                  {hasDates && (
                    <div
                      className="absolute top-1 bottom-1 rounded-md flex items-center justify-center text-[9px] text-white font-medium px-1 truncate"
                      style={{
                        left: `${(blockStart / totalDays) * 100}%`,
                        width: `${((blockEnd - blockStart + 1) / totalDays) * 100}%`,
                        backgroundColor: color,
                        opacity: allCompleted ? 0.5 : 1,
                      }}
                    >
                      <span className="truncate">{primaryTask.description}</span>
                    </div>
                  )}

                  {isDragging && (
                    <div
                      className="absolute top-1 bottom-1 rounded-md border-2 border-dashed"
                      style={{
                        left: `${(dragStartCol / totalDays) * 100}%`,
                        width: `${((dragEndCol - dragStartCol + 1) / totalDays) * 100}%`,
                        backgroundColor: `${color}30`,
                        borderColor: color,
                      }}
                    />
                  )}

                  {!hasDates && !isDragging && needsDrag !== primaryTask.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] text-muted-foreground italic">No dates set – drag to define</span>
                    </div>
                  )}
                </div>

                <div className="w-[36px] shrink-0 flex items-center justify-center gap-0.5">
                  <Checkbox
                    checked={allCompleted}
                    onCheckedChange={(checked) => {
                      group.tasks.forEach(t => onToggle(t.id, !!checked));
                    }}
                    className="h-3.5 w-3.5"
                  />
                  <button
                    onClick={() => setDeleteConfirmId(primaryTask.id)}
                    className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Task Dialog - supports multiple person selection */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a new task for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Description *</label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Task description" className="h-9 text-sm" autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Assign to * (select one or more)</label>
              <div className="border rounded-md p-2 space-y-1 max-h-32 overflow-y-auto">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={newUserIds.includes(u.id)}
                      onChange={() => toggleUserSelection(u.id)}
                      className="rounded"
                    />
                    {u.name}
                  </label>
                ))}
              </div>
              {newUserIds.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{newUserIds.length} person(s) selected</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Start Date (optional)</label>
                <Input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">End Date (optional)</label>
                <Input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            {!newStartDate && !newEndDate && (
              <p className="text-[10px] text-muted-foreground">
                If dates aren't set, you'll be prompted to drag on the calendar to define them.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Discard</Button>
            <Button onClick={handleAddTask} disabled={createTask.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the task from all panels. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskGantt;
