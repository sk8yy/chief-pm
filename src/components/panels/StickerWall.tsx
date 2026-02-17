import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useStickers, useCreateSticker, useUpdateSticker, useDeleteSticker } from '@/hooks/useStickers';
import { useUsers } from '@/hooks/useUsers';
import { useProjects } from '@/hooks/useProjects';
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
import { Plus, Trash2, ArrowLeft, ZoomIn, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

type MatchResult = {
  matched_project_id: string | null;
  confidence: string;
  reason: string;
};

/* ───────── component ───────── */
const StickerWall: React.FC = () => {
  const { currentUserId } = useAppContext();

  /* data */
  const [showAll, setShowAll] = useState(false);
  const filters = useMemo(() => (showAll ? undefined : { userId: currentUserId ?? undefined }), [showAll, currentUserId]);
  const { data: stickers } = useStickers(filters);
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const createSticker = useCreateSticker();
  const updateSticker = useUpdateSticker();
  const deleteSticker = useDeleteSticker();

  /* zoom */
  const [columns, setColumns] = useState(4);

  /* creating */
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');

  /* editing */
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [editContent, setEditContent] = useState('');

  /* deleting */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* AI match */
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchStickerId, setMatchStickerId] = useState<string | null>(null);

  /* ───── handlers ───── */
  const requestAIMatch = async (stickerId: string, content: string) => {
    if (!projects?.length) return;
    setIsMatching(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-project`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            stickerContent: content,
            projects: projects.map((p) => ({ id: p.id, name: p.name, job_number: p.job_number })),
          }),
        }
      );
      if (!resp.ok) {
        if (resp.status === 429) { toast.error('AI rate limit reached, try again later.'); return; }
        if (resp.status === 402) { toast.error('AI credits exhausted.'); return; }
        throw new Error('AI match failed');
      }
      const data: MatchResult = await resp.json();
      if (data.matched_project_id && data.confidence !== 'low') {
        setMatchResult(data);
        setMatchStickerId(stickerId);
      }
    } catch (e) {
      console.error('AI match error:', e);
    } finally {
      setIsMatching(false);
    }
  };

  const handleCreate = async () => {
    if (!currentUserId || !newContent.trim()) return;
    const result = await createSticker.mutateAsync({ content: newContent.trim(), user_id: currentUserId });
    const content = newContent.trim();
    setNewContent('');
    setIsCreating(false);
    // fire AI match in background
    requestAIMatch(result.id, content);
  };

  const handleAcceptMatch = async () => {
    if (!matchStickerId || !matchResult?.matched_project_id) return;
    await updateSticker.mutateAsync({ id: matchStickerId, project_id: matchResult.matched_project_id });
    toast.success('Sticker linked to project!');
    setMatchResult(null);
    setMatchStickerId(null);
  };

  const handleRejectMatch = () => {
    setMatchResult(null);
    setMatchStickerId(null);
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
      return { backgroundColor: c.bgMuted, color: '#ffffff', borderColor: c.border };
    }
    return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' };
  };

  const dialogBg = (s: Sticker | null) => {
    if (s?.projects?.discipline_id) {
      const c = getDisciplineColor(s.projects.discipline_id);
      return { backgroundColor: c.bg, color: c.text, borderColor: c.border };
    }
    return {};
  };

  const matchedProject = matchResult?.matched_project_id
    ? projects?.find((p) => p.id === matchResult.matched_project_id)
    : null;

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
            <Slider min={1} max={8} step={1} value={[columns]} onValueChange={([v]) => setColumns(v)} />
            <span className="text-xs text-muted-foreground w-4 text-right">{columns}</span>
          </div>
        </div>
      </div>

      {/* AI matching indicator */}
      {isMatching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Matching sticker to a project…</span>
        </div>
      )}

      {/* creating state */}
      {isCreating ? (
        <div className="flex justify-center">
          <div className="border rounded-lg p-6 bg-card space-y-4 w-full max-w-md aspect-[3/4] flex flex-col">
            <Textarea
              autoFocus
              placeholder="Type your note here..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="flex-1 text-base resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setIsCreating(false); setNewContent(''); }}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newContent.trim() || createSticker.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={stickers?.length ? '' : 'flex items-center justify-center min-h-[300px]'}>
          <Button onClick={() => setIsCreating(true)} variant={stickers?.length ? 'outline' : 'default'} size={stickers?.length ? 'sm' : 'lg'}>
            <Plus className="h-4 w-4 mr-1" /> Add Sticker
          </Button>
        </div>
      )}

      {/* tile grid */}
      {(stickers?.length ?? 0) > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {(stickers as Sticker[])?.map((s) => (
            <div
              key={s.id}
              className="relative rounded-lg border p-3 cursor-pointer transition-shadow hover:shadow-md group overflow-hidden"
              style={stickerBg(s)}
              onDoubleClick={() => { setEditingSticker(s); setEditContent(s.content); }}
            >
              <button
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10"
                onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <p className="text-xs whitespace-pre-wrap line-clamp-6">{s.content}</p>

              {s.projects && (
                <span className="mt-2 inline-block text-[10px] font-medium opacity-70">{s.projects.name}</span>
              )}

              {showAll && (
                <span className="block text-[9px] opacity-50 mt-1">
                  {users?.find((u) => u.id === s.user_id)?.name ?? 'Unknown'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI match confirmation dialog */}
      <Dialog open={!!matchResult} onOpenChange={(open) => { if (!open) handleRejectMatch(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Project Match Found
            </DialogTitle>
            <DialogDescription>
              AI detected a link to an existing project.
            </DialogDescription>
          </DialogHeader>
          {matchedProject && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{matchedProject.name}</p>
              <p className="text-xs text-muted-foreground">{matchResult?.reason}</p>
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                {matchResult?.confidence} confidence
              </span>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={handleRejectMatch}>Skip</Button>
            <Button onClick={handleAcceptMatch} disabled={updateSticker.isPending}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Link to Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* edit dialog */}
      <Dialog open={!!editingSticker} onOpenChange={(open) => { if (!open) setEditingSticker(null); }}>
        <DialogContent className="sm:max-w-lg" style={dialogBg(editingSticker)}>
          <DialogHeader>
            <DialogTitle>Edit Sticker</DialogTitle>
            <DialogDescription className={editingSticker?.projects?.discipline_id ? 'opacity-70' : ''}>
              Edit your note. Changes save when you press Return.
            </DialogDescription>
          </DialogHeader>
          <Textarea autoFocus value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[160px] bg-white/20 border-current/20" />
          {editingSticker?.projects && (
            <p className="text-xs opacity-70">Project: {editingSticker.projects.name}</p>
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
