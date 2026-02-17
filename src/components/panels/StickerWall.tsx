import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useStickers, useCreateSticker, useUpdateSticker, useDeleteSticker } from '@/hooks/useStickers';
import { useUsers } from '@/hooks/useUsers';
import { getDisciplineColor } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, ArrowLeft, ZoomIn } from 'lucide-react';

/* ───────── types ───────── */
type Sticker = {
  id: string;
  content: string;
  project_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  projects: {
    id: string;
    name: string;
    discipline_id: string | null;
    disciplines: { id: string; name: string; color: string } | null;
  } | null;
};

/* ───────── component ───────── */
const StickerWall: React.FC = () => {
  const { currentUserId } = useAppContext();

  /* data */
  const [showAll, setShowAll] = useState(false);
  const filters = useMemo(() => (showAll ? undefined : { userId: currentUserId ?? undefined }), [showAll, currentUserId]);
  const { data: stickers } = useStickers(filters);
  const { data: users } = useUsers();
  const createSticker = useCreateSticker();
  const updateSticker = useUpdateSticker();
  const deleteSticker = useDeleteSticker();

  /* zoom */
  const [columns, setColumns] = useState(4); // 1-8

  /* creating */
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');

  /* editing */
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [editContent, setEditContent] = useState('');

  /* deleting */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ───── handlers ───── */
  const handleCreate = async () => {
    if (!currentUserId || !newContent.trim()) return;
    await createSticker.mutateAsync({ content: newContent.trim(), user_id: currentUserId });
    setNewContent('');
    setIsCreating(false);
  };

  const handleSaveEdit = async () => {
    if (!editingSticker) return;
    await updateSticker.mutateAsync({ id: editingSticker.id, content: editContent });
    setEditingSticker(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteSticker.mutateAsync(deletingId);
    setDeletingId(null);
    setEditingSticker(null);
  };

  const stickerBg = (s: Sticker) => {
    if (s.projects?.discipline_id) {
      const c = getDisciplineColor(s.projects.discipline_id);
      return { backgroundColor: c.bg, color: c.text, borderColor: c.border };
    }
    return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' };
  };

  /* ───── render ───── */
  return (
    <div className="p-4 space-y-4">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">Sticker Wall</h2>

        <div className="flex items-center gap-4 flex-wrap">
          {/* my / all toggle */}
          <div className="flex items-center gap-2 text-sm">
            <span className={!showAll ? 'font-semibold text-foreground' : 'text-muted-foreground'}>My</span>
            <Switch checked={showAll} onCheckedChange={setShowAll} />
            <span className={showAll ? 'font-semibold text-foreground' : 'text-muted-foreground'}>All</span>
          </div>

          {/* zoom slider */}
          <div className="flex items-center gap-2 w-40">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Slider
              min={1}
              max={8}
              step={1}
              value={[columns]}
              onValueChange={([v]) => setColumns(v)}
            />
            <span className="text-xs text-muted-foreground w-4 text-right">{columns}</span>
          </div>
        </div>
      </div>

      {/* creating state */}
      {isCreating ? (
        <div className="border rounded-lg p-4 bg-card space-y-3 max-w-lg">
          <Textarea
            autoFocus
            placeholder="Type your note here..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="min-h-[120px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!newContent.trim() || createSticker.isPending}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsCreating(false); setNewContent(''); }}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* add button – centered when no stickers */
        <div className={stickers?.length ? '' : 'flex items-center justify-center min-h-[300px]'}>
          <Button onClick={() => setIsCreating(true)} variant={stickers?.length ? 'outline' : 'default'} size={stickers?.length ? 'sm' : 'lg'}>
            <Plus className="h-4 w-4 mr-1" /> Add Sticker
          </Button>
        </div>
      )}

      {/* tile grid */}
      {(stickers?.length ?? 0) > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {(stickers as Sticker[])?.map((s) => (
            <div
              key={s.id}
              className="relative rounded-lg border p-3 cursor-pointer transition-shadow hover:shadow-md group overflow-hidden"
              style={stickerBg(s)}
              onDoubleClick={() => {
                setEditingSticker(s);
                setEditContent(s.content);
              }}
            >
              {/* delete btn */}
              <button
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10"
                onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* content preview */}
              <p className="text-xs whitespace-pre-wrap line-clamp-6">{s.content}</p>

              {/* project badge */}
              {s.projects && (
                <span className="mt-2 inline-block text-[10px] font-medium opacity-70">
                  {s.projects.name}
                </span>
              )}

              {/* author if showing all */}
              {showAll && (
                <span className="block text-[9px] opacity-50 mt-1">
                  {users?.find((u) => u.id === s.user_id)?.name ?? 'Unknown'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* edit dialog */}
      <Dialog open={!!editingSticker} onOpenChange={(open) => { if (!open) setEditingSticker(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Sticker</DialogTitle>
            <DialogDescription>Edit your note. Changes save when you press Return.</DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[160px]"
          />
          {editingSticker?.projects && (
            <p className="text-xs text-muted-foreground">
              Project: {editingSticker.projects.name}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingSticker(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateSticker.isPending}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sticker?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StickerWall;
