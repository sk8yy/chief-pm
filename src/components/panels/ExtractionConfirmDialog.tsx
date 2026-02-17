import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Calendar, ListTodo, Loader2 } from 'lucide-react';

export type ExtractedDeadline = {
  name: string;
  date: string;
  project_id: string | null;
  project_name?: string;
  source_sticker_index: number;
};

export type ExtractedTask = {
  description: string;
  project_id: string | null;
  project_name?: string;
  user_id: string | null;
  assigned_person_name?: string;
  source_sticker_index: number;
};

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  deadlines: ExtractedDeadline[];
  tasks: ExtractedTask[];
  projects: Project[];
  users: User[];
  onConfirm: (deadlines: ExtractedDeadline[], tasks: ExtractedTask[]) => void;
  isSaving: boolean;
}

const ExtractionConfirmDialog: React.FC<Props> = ({
  open, onClose, deadlines: initDeadlines, tasks: initTasks, projects, users, onConfirm, isSaving,
}) => {
  const [deadlines, setDeadlines] = useState<ExtractedDeadline[]>(initDeadlines);
  const [tasks, setTasks] = useState<ExtractedTask[]>(initTasks);

  // Sync when props change
  React.useEffect(() => {
    setDeadlines(initDeadlines);
    setTasks(initTasks);
  }, [initDeadlines, initTasks]);

  if (!open) return null;

  const updateDeadline = (i: number, patch: Partial<ExtractedDeadline>) => {
    setDeadlines(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  };

  const removeDeadline = (i: number) => {
    setDeadlines(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateTask = (i: number, patch: Partial<ExtractedTask>) => {
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  };

  const removeTask = (i: number) => {
    setTasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const hasItems = deadlines.length > 0 || tasks.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-card border rounded-lg shadow-lg w-[560px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">AI Extraction Results</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review and edit the extracted items before saving.
          </p>
        </div>

        <ScrollArea className="flex-1 min-h-0 p-4">
          <div className="space-y-4">
            {/* Deadlines */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-destructive" />
                <span className="text-xs font-semibold uppercase tracking-wide">Deadlines ({deadlines.length})</span>
              </div>
              {deadlines.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No deadlines extracted.</p>
              )}
              <div className="space-y-2">
                {deadlines.map((d, i) => (
                  <div key={i} className="border rounded-md p-2 space-y-1.5 bg-muted/20">
                    <div className="flex items-start gap-2">
                      <Input
                        value={d.name}
                        onChange={e => updateDeadline(i, { name: e.target.value })}
                        className="flex-1 h-8 text-xs"
                        placeholder="Deadline name"
                      />
                      <Input
                        type="date"
                        value={d.date}
                        onChange={e => updateDeadline(i, { date: e.target.value })}
                        className="w-36 h-8 text-xs"
                      />
                      <button onClick={() => removeDeadline(i)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Select
                      value={d.project_id ?? '__none__'}
                      onValueChange={v => updateDeadline(i, {
                        project_id: v === '__none__' ? null : v,
                        project_name: v === '__none__' ? '' : projects.find(p => p.id === v)?.name,
                      })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Link to project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No project</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] text-muted-foreground">From sticker #{d.source_sticker_index}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListTodo className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">Tasks ({tasks.length})</span>
              </div>
              {tasks.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No tasks extracted.</p>
              )}
              <div className="space-y-2">
                {tasks.map((t, i) => (
                  <div key={i} className="border rounded-md p-2 space-y-1.5 bg-muted/20">
                    <div className="flex items-start gap-2">
                      <Input
                        value={t.description}
                        onChange={e => updateTask(i, { description: e.target.value })}
                        className="flex-1 h-8 text-xs"
                        placeholder="Task description"
                      />
                      <button onClick={() => removeTask(i)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={t.project_id ?? '__none__'}
                        onValueChange={v => updateTask(i, {
                          project_id: v === '__none__' ? null : v,
                          project_name: v === '__none__' ? '' : projects.find(p => p.id === v)?.name,
                        })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Project..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No project</SelectItem>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={t.user_id ?? '__none__'}
                        onValueChange={v => updateTask(i, {
                          user_id: v === '__none__' ? null : v,
                          assigned_person_name: v === '__none__' ? '' : users.find(u => u.id === v)?.name,
                        })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-[10px] text-muted-foreground">From sticker #{t.source_sticker_index}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            size="sm"
            disabled={!hasItems || isSaving}
            onClick={() => onConfirm(deadlines, tasks)}
          >
            {isSaving ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving...</> : `Save ${deadlines.length + tasks.length} items`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExtractionConfirmDialog;
