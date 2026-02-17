import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/contexts/AppContext';
import { registerDisciplineColor } from '@/lib/colors';

const HUE_PALETTE = [122, 14, 36, 262, 207, 174, 340, 45, 230, 85];

function hueToHex(hue: number): string {
  const s = 0.6, l = 0.5;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface AddDisciplineDialogProps {
  open: boolean;
  onClose: () => void;
  existingCount: number;
}

const AddDisciplineDialog = ({ open, onClose, existingCount }: AddDisciplineDialogProps) => {
  const { workspaceId, isSandbox } = useAppContext();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const color = hueToHex(HUE_PALETTE[existingCount % HUE_PALETTE.length]);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim() || !workspaceId) return;
    if (isSandbox) { const { sandboxToast } = await import('@/lib/sandbox'); sandboxToast(); onClose(); return; }
    setSaving(true);
    const { data, error } = await supabase.from('disciplines').insert({
      name: name.trim(),
      color,
      sort_order: existingCount,
      workspace_id: workspaceId,
    } as any).select('id').single();
    setSaving(false);
    if (error) { console.error(error); return; }
    if (data) registerDisciplineColor(data.id, color);
    qc.invalidateQueries({ queryKey: ['disciplines'] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-card border rounded-lg shadow-lg w-[380px] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold">Add Group / Discipline / Category</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Architecture, Engineering..."
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-assigned color:</span>
            <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: color }} />
          </div>
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || saving} onClick={handleCreate}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddDisciplineDialog;
