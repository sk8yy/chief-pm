import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

const HUE_PALETTE = [122, 14, 36, 262, 207, 174, 340, 45, 230, 85];

function hueToHex(hue: number): string {
  // Convert HSL(hue, 60%, 50%) to hex
  const s = 0.6, l = 0.5;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const SetupDisciplines = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const addCategory = () => {
    if (!newName.trim()) return;
    const hue = HUE_PALETTE[categories.length % HUE_PALETTE.length];
    setCategories([...categories, { name: newName.trim(), color: hueToHex(hue) }]);
    setNewName('');
  };

  const removeCategory = (idx: number) => {
    // Reassign colors after removal
    const updated = categories.filter((_, i) => i !== idx).map((c, i) => ({
      ...c,
      color: hueToHex(HUE_PALETTE[i % HUE_PALETTE.length]),
    }));
    setCategories(updated);
  };

  const handleContinue = async () => {
    if (categories.length === 0 || !workspaceId) return;
    setSaving(true);
    const rows = categories.map((c, i) => ({
      name: c.name,
      color: c.color,
      sort_order: i,
      workspace_id: workspaceId,
    }));
    const { error } = await supabase.from('disciplines').insert(rows as any);
    if (error) {
      console.error(error);
      setSaving(false);
      return;
    }
    navigate(`/workspace/${workspaceId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-2">
        Define your Disciplines / Groups / Project Categories...
      </h1>
      <p className="text-muted-foreground mb-8 text-center">Add the main categories for your project workspace</p>

      <div className="w-full max-w-md space-y-3 mb-6">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="flex-1 font-medium text-foreground">{cat.name}</span>
            <Button size="sm" variant="ghost" onClick={() => removeCategory(idx)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 w-full max-w-md mb-8">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          placeholder="Category name..."
          className="flex-1"
        />
        <Button onClick={addCategory} size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Button
        onClick={handleContinue}
        disabled={categories.length === 0 || saving}
        className="px-8"
      >
        {saving ? 'Saving...' : 'Continue'}
      </Button>
    </div>
  );
};

export default SetupDisciplines;
