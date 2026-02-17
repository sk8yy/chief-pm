import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  name: string;
  discipline_id: string | null;
}

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (userId: string, hours: number) => void;
  availableUsers: User[];
}

const AddMemberDialog = ({ open, onClose, onConfirm, availableUsers }: AddMemberDialogProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [hours, setHours] = useState<string>('');

  const handleConfirm = () => {
    if (!selectedUserId || !hours || Number(hours) <= 0) return;
    onConfirm(selectedUserId, Number(hours));
    setSelectedUserId('');
    setHours('');
  };

  const handleDiscard = () => {
    setSelectedUserId('');
    setHours('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleDiscard()}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Member Hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Member</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select member..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Hours</label>
            <Input
              type="number"
              min={1}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 8"
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleDiscard}>
            Discard
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selectedUserId || !hours || Number(hours) <= 0}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
