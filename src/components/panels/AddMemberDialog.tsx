import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  anchorRef?: React.RefObject<HTMLElement>;
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
    <Popover open={open} onOpenChange={(o) => !o && handleDiscard()}>
      <PopoverTrigger asChild>
        <span className="hidden" />
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 space-y-2"
        side="right"
        align="start"
        sideOffset={4}
      >
        <p className="text-xs font-semibold">Add Member Hours</p>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Member</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select..." />
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
          <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Hours</label>
          <Input
            type="number"
            min={1}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 8"
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </div>
        <div className="flex gap-1.5 justify-end pt-1">
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={handleDiscard}>
            Discard
          </Button>
          <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleConfirm} disabled={!selectedUserId || !hours || Number(hours) <= 0}>
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AddMemberDialog;
