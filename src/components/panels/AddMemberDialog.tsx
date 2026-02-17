import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  name: string;
  discipline_id: string | null;
}

interface Discipline {
  id: string;
  name: string;
}

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (userId: string, hours: number) => void;
  availableUsers: User[];
  disciplines?: Discipline[];
  anchorEl?: HTMLElement | null;
}

const AddMemberDialog = ({ open, onClose, onConfirm, availableUsers, disciplines, anchorEl }: AddMemberDialogProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const updatePos = useCallback(() => {
    if (!open || !anchorEl) { setPos(null); return; }
    const rect = anchorEl.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.right + 4 });
  }, [open, anchorEl]);

  useEffect(() => {
    updatePos();
    if (!open || !anchorEl) return;
    let raf: number;
    const tick = () => {
      updatePos();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [updatePos]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dialogRef.current && !dialogRef.current.contains(target)) {
        // Don't close if clicking inside a Radix portal (e.g. Select dropdown)
        const radixPortal = (target as Element).closest?.('[data-radix-popper-content-wrapper], [role="listbox"], [role="option"]');
        if (radixPortal) return;
        handleDiscard();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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

  if (!open) return null;

  // Group users by discipline
  const grouped = (() => {
    if (!disciplines || disciplines.length === 0) {
      return [{ discipline: null, users: availableUsers }];
    }
    const discMap = new Map<string, { discipline: Discipline; users: User[] }>();
    const ungrouped: User[] = [];
    disciplines.forEach(d => discMap.set(d.id, { discipline: d, users: [] }));
    availableUsers.forEach(u => {
      if (u.discipline_id && discMap.has(u.discipline_id)) {
        discMap.get(u.discipline_id)!.users.push(u);
      } else {
        ungrouped.push(u);
      }
    });
    const groups: { discipline: Discipline | null; users: User[] }[] = [];
    discMap.forEach(g => { if (g.users.length > 0) groups.push(g); });
    if (ungrouped.length > 0) groups.push({ discipline: null, users: ungrouped });
    return groups;
  })();

  return (
    <div
      ref={dialogRef}
      className="fixed z-[100] w-52 p-3 space-y-2 rounded-md border bg-popover text-popover-foreground shadow-md"
      style={pos ? { top: pos.top, left: pos.left } : { position: 'absolute', top: 0, left: '100%', marginLeft: 4 }}
    >
      <p className="text-xs font-semibold">Add Member Hours</p>
      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Member</label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent className="z-[110]">
            {grouped.map((g, gi) => (
              <SelectGroup key={g.discipline?.id ?? `ungrouped-${gi}`}>
                {g.discipline && <SelectLabel className="text-[10px] text-muted-foreground">{g.discipline.name}</SelectLabel>}
                {g.users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectGroup>
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
    </div>
  );
};

export default AddMemberDialog;
