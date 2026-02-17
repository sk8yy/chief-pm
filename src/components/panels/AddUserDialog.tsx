import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/contexts/AppContext';

interface Discipline {
  id: string;
  name: string;
  color: string;
}

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  disciplines: Discipline[];
}

const AddUserDialog = ({ open, onClose, disciplines }: AddUserDialogProps) => {
  const { workspaceId } = useAppContext();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [disciplineId, setDisciplineId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim() || !disciplineId || !workspaceId) return;
    setIsSubmitting(true);
    try {
      await supabase.from('app_users').insert({
        name: name.trim(),
        discipline_id: disciplineId,
        workspace_id: workspaceId,
      } as any);
      qc.invalidateQueries({ queryKey: ['app_users'] });
      setName('');
      setDisciplineId('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setName('');
    setDisciplineId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDiscard(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Enter a name and select the group they belong to.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Group / Discipline</label>
            <Select value={disciplineId} onValueChange={setDisciplineId}>
              <SelectTrigger>
                <SelectValue placeholder="Select group..." />
              </SelectTrigger>
              <SelectContent>
                {disciplines.filter(d => d.name !== 'Leave').map((d) => (
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleDiscard}>Discard</Button>
          <Button onClick={handleConfirm} disabled={!name.trim() || !disciplineId || isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
