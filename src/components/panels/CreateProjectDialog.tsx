import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAssignMember } from '@/hooks/useAssignments';
import { format, startOfWeek } from 'date-fns';

interface Discipline {
  id: string;
  name: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  discipline_id: string | null;
}

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  disciplines: Discipline[];
  users: User[];
  /** Pre-select a discipline when creating from a discipline group */
  defaultDisciplineId?: string | null;
  /** Called with the new project id after successful creation */
  onCreated?: (projectId: string) => void;
}

const CreateProjectDialog = ({ open, onClose, disciplines, users, defaultDisciplineId, onCreated }: CreateProjectDialogProps) => {
  const [name, setName] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [disciplineId, setDisciplineId] = useState<string>(defaultDisciplineId ?? '');
  const [managerId, setManagerId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const dialogRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const assignMemberMut = useAssignMember();

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setName('');
      setJobNumber('');
      setDisciplineId(defaultDisciplineId ?? '');
      setManagerId('');
      setStartDate('');
      setEndDate('');
      setSelectedMembers(new Set());
    }
  }, [open, defaultDisciplineId]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    const { data, error } = await supabase.from('projects').insert({
      name: name.trim(),
      job_number: jobNumber.trim() || 'xxxxxx-xx',
      discipline_id: disciplineId || null,
      manager_id: managerId || null,
      start_date: startDate || null,
      end_date: endDate || null,
    }).select('id').single();

    if (error || !data) return;

    // Assign selected members for the current week
    if (selectedMembers.size > 0) {
      const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      for (const userId of selectedMembers) {
        assignMemberMut.mutate({
          user_id: userId,
          project_id: data.id,
          week_starts: [currentWeekStart],
        });
      }
    }

    qc.invalidateQueries({ queryKey: ['projects'] });
    onCreated?.(data.id);
    onClose();
  };

  // Group users by discipline for the member selector
  const groupedUsers = disciplines
    .map(d => ({
      discipline: d,
      members: users.filter(u => u.discipline_id === d.id),
    }))
    .filter(g => g.members.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={dialogRef} className="bg-card border rounded-lg shadow-lg w-[440px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">Create New Project</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {/* Project Name */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Project Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter project name" />
            </div>

            {/* Job Number */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Job Number</label>
              <Input value={jobNumber} onChange={e => setJobNumber(e.target.value)} placeholder="xxxxxx-xx" />
            </div>

            {/* Discipline */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Discipline</label>
              <Select value={disciplineId} onValueChange={setDisciplineId}>
                <SelectTrigger><SelectValue placeholder="Select discipline..." /></SelectTrigger>
                <SelectContent>
                  {disciplines.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Manager */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Project Manager</label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger><SelectValue placeholder="Select manager..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Start Date</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">End Date</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Member Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-muted-foreground">Assign Members (optional)</label>
              <div className="border rounded-md max-h-[160px] overflow-y-auto">
                {groupedUsers.map(g => (
                  <div key={g.discipline.id}>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/30 flex items-center gap-1.5 sticky top-0">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.discipline.color }} />
                      {g.discipline.name}
                    </div>
                    {g.members.map(u => {
                      const checked = selectedMembers.has(u.id);
                      return (
                        <button
                          key={u.id}
                          className={`w-full text-left text-xs px-3 py-1.5 flex items-center gap-2 transition-colors ${checked ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'}`}
                          onClick={() => toggleMember(u.id)}
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-border'}`}>
                            {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim()} onClick={handleCreate}>
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectDialog;
