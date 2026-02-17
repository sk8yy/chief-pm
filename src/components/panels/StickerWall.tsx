import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useStickers, useCreateSticker, useUpdateSticker, useDeleteSticker } from '@/hooks/useStickers';
import { useUsers } from '@/hooks/useUsers';
import { useProjects } from '@/hooks/useProjects';
import { getDisciplineColor } from '@/lib/colors';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useAllTasks } from '@/hooks/useTasks';
import CreateProjectDialog from '@/components/panels/CreateProjectDialog';
import ExtractionConfirmDialog, { ExtractedDeadline, ExtractedTask } from '@/components/panels/ExtractionConfirmDialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, ArrowLeft, ZoomIn, Sparkles, Loader2, HelpCircle, CheckSquare, X, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek } from 'date-fns';

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
  const { data: disciplines } = useDisciplines();
  const { data: allTasks } = useAllTasks();
  const createSticker = useCreateSticker();
  const updateSticker = useUpdateSticker();
  const deleteSticker = useDeleteSticker();

  const completedTaskDescriptions = useMemo(() => {
    const set = new Set<string>();
    allTasks?.forEach(t => {
      if (t.is_completed) set.add(t.description.toLowerCase().trim());
    });
    return set;
  }, [allTasks]);

  /* zoom */
  const [columns, setColumns] = useState(4);

  /* creating */
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');

  /* editing */
  const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editProjectId, setEditProjectId] = useState<string | null>(null);

  /* deleting */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* create project dialog */
  const [showCreateProject, setShowCreateProject] = useState(false);

  /* AI match (single sticker) */
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchStickerId, setMatchStickerId] = useState<string | null>(null);
  const [noMatchStickerId, setNoMatchStickerId] = useState<string | null>(null);

  /* ── multi-select & AI analysis ── */
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedDeadlines, setExtractedDeadlines] = useState<ExtractedDeadline[]>([]);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [showExtraction, setShowExtraction] = useState(false);
  const [isSavingExtraction, setIsSavingExtraction] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  /* ── AI analysis handler ── */
  const handleAnalyze = async () => {
    if (!selectedIds.size || !stickers) return;
    setIsAnalyzing(true);
    try {
      const selectedStickers = (stickers as Sticker[])
        .filter(s => selectedIds.has(s.id))
        .map((s, i) => ({
          index: i + 1,
          content: s.content,
          project_name: s.projects?.name || null,
          created_at: s.created_at,
        }));

      // Pass existing tasks so AI can identify duplicates
      const existingTasks = allTasks ?? [];
      const existingTasksSummary = existingTasks.map(t => ({
        description: t.description,
        project_id: t.project_id,
        start_date: t.start_date,
        end_date: t.end_date,
      }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-stickers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            stickers: selectedStickers,
            projects: projects?.map(p => ({ id: p.id, name: p.name, job_number: p.job_number })) ?? [],
            users: users?.map(u => ({ id: u.id, name: u.name })) ?? [],
            existing_tasks: existingTasksSummary,
          }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error('AI rate limit reached, try again later.'); return; }
        if (resp.status === 402) { toast.error('AI credits exhausted.'); return; }
        throw new Error('AI analysis failed');
      }

      const data = await resp.json();
      const rawTasks: ExtractedTask[] = data.tasks || [];

      // Apply default start_date from sticker created_at if not specified
      const tasksWithDefaults = rawTasks.map(t => {
        const stickerIdx = t.source_sticker_index - 1;
        const sticker = selectedStickers[stickerIdx];
        const defaultStart = sticker?.created_at ? format(new Date(sticker.created_at), 'yyyy-MM-dd') : null;
        return {
          ...t,
          start_date: t.start_date || defaultStart,
          end_date: t.end_date || null,
        };
      });

      // Combine AI-side detection with local matching for robust dedup
      const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
      const markedTasks = tasksWithDefaults.map(t => {
        // First check AI's own detection
        if ((t as any).is_existing) {
          if ((t as any).has_new_dates) {
            // Find the matching existing task to get its ID
            const match = existingTasks.find(et =>
              normalize(et.description) === normalize(t.description) && et.project_id === t.project_id
            ) || existingTasks.find(et =>
              normalize(et.description).includes(normalize(t.description)) ||
              normalize(t.description).includes(normalize(et.description))
            );
            return { ...t, status: 'updated' as const, _existingId: match?.id };
          }
          return { ...t, status: 'already_added' as const };
        }

        // Fallback: local fuzzy matching
        const descNorm = normalize(t.description);
        const match = existingTasks.find(et => {
          const etNorm = normalize(et.description);
          // Exact match or substring containment (both directions)
          const descMatch = etNorm === descNorm ||
            (descNorm.length > 10 && (etNorm.includes(descNorm) || descNorm.includes(etNorm)));
          // Project match (either same project or task has no project)
          const projMatch = !t.project_id || et.project_id === t.project_id;
          return descMatch && projMatch;
        });

        if (match) {
          const hasNewStart = t.start_date && !match.start_date;
          const hasNewEnd = t.end_date && !match.end_date;
          if (hasNewStart || hasNewEnd) {
            return { ...t, status: 'updated' as const, _existingId: match.id };
          }
          return { ...t, status: 'already_added' as const };
        }
        return t;
      });

      setExtractedDeadlines(data.deadlines || []);
      setExtractedTasks(markedTasks);
      setShowExtraction(true);
    } catch (e) {
      console.error('AI analysis error:', e);
      toast.error('Failed to analyze stickers.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ── save extracted items ── */
  const handleConfirmExtraction = async (deadlines: ExtractedDeadline[], tasks: ExtractedTask[]) => {
    const effectiveUserId = currentUserId || users?.[0]?.id;
    if (!effectiveUserId) {
      toast.error('No users available.');
      return;
    }
    setIsSavingExtraction(true);
    try {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Insert deadlines
      if (deadlines.length > 0) {
        const rows = deadlines
          .filter(d => d.name && d.date && d.project_id)
          .map(d => ({
            name: d.name,
            date: d.date,
            project_id: d.project_id!,
            created_by: effectiveUserId,
            type: 'project' as const,
            visible_to: d.visible_to?.length ? d.visible_to : null,
            category: d.category ?? 'due',
          }));
        if (rows.length) {
          const { error } = await supabase.from('deadlines').insert(rows as any);
          if (error) throw error;
        }
      }

      // Handle tasks
      const seen = new Set<string>();
      let insertCount = 0;
      let updateCount = 0;

      for (const t of tasks) {
        if (!t.description || !t.project_id) continue;
        const key = `${t.description.toLowerCase().trim()}_${t.project_id}_${t.user_id || effectiveUserId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (t.status === 'already_added') continue;

        if (t.status === 'updated' && (t as any)._existingId) {
          // Update existing task with new dates
          const { error } = await supabase.from('tasks').update({
            start_date: t.start_date || null,
            end_date: t.end_date || null,
          }).eq('id', (t as any)._existingId);
          if (error) throw error;
          updateCount++;
        } else {
          // Insert new task
          const { error } = await supabase.from('tasks').insert({
            description: t.description,
            project_id: t.project_id!,
            user_id: t.user_id || effectiveUserId,
            week_start: weekStart,
            is_planned: true,
            is_completed: false,
            start_date: t.start_date || null,
            end_date: t.end_date || null,
          });
          if (error) throw error;
          insertCount++;
        }
      }

      const parts: string[] = [];
      if (deadlines.length) parts.push(`${deadlines.length} deadline(s)`);
      if (insertCount) parts.push(`${insertCount} new task(s)`);
      if (updateCount) parts.push(`${updateCount} updated task(s)`);
      toast.success(`Saved ${parts.join(' and ')}.`);
      setShowExtraction(false);
      exitSelectMode();
    } catch (e) {
      console.error('Save extraction error:', e);
      toast.error('Failed to save extracted items.');
    } finally {
      setIsSavingExtraction(false);
    }
  };

  /* ───── existing handlers ───── */
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
      } else {
        setNoMatchStickerId(stickerId);
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
    requestAIMatch(result.id, content);
  };

  const handleAcceptMatch = async () => {
    if (!matchStickerId || !matchResult?.matched_project_id) return;
    await updateSticker.mutateAsync({ id: matchStickerId, project_id: matchResult.matched_project_id });
    toast.success('Sticker linked to project!');
    setMatchResult(null);
    setMatchStickerId(null);
  };

  const handleRejectMatch = () => { setMatchResult(null); setMatchStickerId(null); };

  const handleSaveEdit = async () => {
    if (!editingSticker) return;
    await updateSticker.mutateAsync({ id: editingSticker.id, content: editContent, project_id: editProjectId });
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
      return { backgroundColor: c.bgLight, color: c.text, borderColor: c.border };
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
          {!selectMode ? (
            <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} disabled={!stickers?.length}>
              <CheckSquare className="h-3.5 w-3.5 mr-1" /> Select
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Button size="sm" onClick={handleAnalyze} disabled={selectedIds.size === 0 || isAnalyzing}>
                {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
                Analyze
              </Button>
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className={!showAll ? 'font-semibold text-foreground' : 'text-muted-foreground'}>My</span>
            <Switch checked={showAll} onCheckedChange={setShowAll} />
            <span className={showAll ? 'font-semibold text-foreground' : 'text-muted-foreground'}>All</span>
          </div>

          <div className="flex items-center gap-2 w-40">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Slider min={1} max={8} step={1} value={[columns]} onValueChange={([v]) => setColumns(v)} />
            <span className="text-xs text-muted-foreground w-4 text-right">{columns}</span>
          </div>
        </div>
      </div>

      {isMatching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Matching sticker to a project…</span>
        </div>
      )}

      {isCreating ? (
        <div className="flex justify-center">
          <div className="border rounded-lg p-6 bg-card space-y-4 w-full max-w-md aspect-[3/4] flex flex-col">
            <Textarea autoFocus placeholder="Type your note here..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="flex-1 text-base resize-none" />
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

      {(stickers?.length ?? 0) > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {(stickers as Sticker[])?.map((s) => {
            const isSelected = selectedIds.has(s.id);
            return (
              <div
                key={s.id}
                className={`relative rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md group overflow-hidden aspect-[4/3] flex flex-col ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={stickerBg(s)}
                onClick={selectMode ? () => toggleSelect(s.id) : undefined}
                onDoubleClick={!selectMode ? () => { setEditingSticker(s); setEditContent(s.content); setEditProjectId(s.project_id); } : undefined}
              >
                {selectMode && (
                  <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border-2 flex items-center justify-center z-10 ${
                    isSelected ? 'bg-primary border-primary' : 'border-white/60 bg-black/20'
                  }`}>
                    {isSelected && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                  </div>
                )}

                {!selectMode && (
                  <button
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 z-10"
                    onClick={(e) => { e.stopPropagation(); setDeletingId(s.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <div className="flex-1 text-sm whitespace-pre-wrap overflow-hidden leading-snug">
                  {s.content.split('\n').map((line, lineIdx) => {
                    const isCompleted = completedTaskDescriptions.has(line.toLowerCase().trim());
                    return (
                      <span key={lineIdx}>
                        {lineIdx > 0 && '\n'}
                        <span className={isCompleted ? 'line-through text-muted-foreground/60' : ''}>
                          {line}
                        </span>
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-end justify-between gap-1 mt-1 shrink-0">
                  {s.projects && (
                    <span className="text-[10px] font-medium opacity-70 truncate">{s.projects.name}</span>
                  )}
                  {showAll && (
                    <span className="text-[9px] opacity-50 whitespace-nowrap">
                      {users?.find((u) => u.id === s.user_id)?.name ?? 'Unknown'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI match confirmation dialog */}
      <Dialog open={!!matchResult} onOpenChange={(open) => { if (!open) handleRejectMatch(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Project Match Found
            </DialogTitle>
            <DialogDescription>AI detected a link to an existing project.</DialogDescription>
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
      <Dialog open={!!editingSticker && !showCreateProject} onOpenChange={(open) => { if (!open) setEditingSticker(null); }}>
        <DialogContent className="sm:max-w-lg" style={dialogBg(editingSticker)}>
          <DialogHeader>
            <DialogTitle>Edit Sticker</DialogTitle>
            <DialogDescription className={editingSticker?.projects?.discipline_id ? 'opacity-70' : ''}>
              Edit your note. Changes save when you press Return.
            </DialogDescription>
          </DialogHeader>
          <Textarea autoFocus value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[160px] bg-white/20 border-current/20" />
          <div className="space-y-1">
            <label className="text-xs font-medium opacity-70">Project</label>
            <Select
              value={editProjectId ?? '__none__'}
              onValueChange={(v) => {
                if (v === '__new__') { setShowCreateProject(true); return; }
                setEditProjectId(v === '__none__' ? null : v);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100]">
                <SelectItem value="__none__">No project</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
                <SelectItem value="__new__" className="text-primary font-medium">
                  <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> New Project</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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

      {/* no-match prompt dialog */}
      <Dialog open={!!noMatchStickerId && !showCreateProject} onOpenChange={(open) => { if (!open) setNoMatchStickerId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-muted-foreground" /> No Match Found
            </DialogTitle>
            <DialogDescription>Couldn't find a matching project. Would you like to create a new one?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoMatchStickerId(null)}>Skip</Button>
            <Button onClick={() => setShowCreateProject(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* create project dialog */}
      <CreateProjectDialog
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        disciplines={disciplines ?? []}
        users={users ?? []}
        onCreated={async (projectId) => {
          const stickerToLink = noMatchStickerId;
          if (stickerToLink) {
            await updateSticker.mutateAsync({ id: stickerToLink, project_id: projectId });
            toast.success('Sticker linked to new project!');
            setNoMatchStickerId(null);
          }
        }}
      />

      {/* extraction confirmation dialog */}
      <ExtractionConfirmDialog
        open={showExtraction}
        onClose={() => setShowExtraction(false)}
        deadlines={extractedDeadlines}
        tasks={extractedTasks}
        projects={projects?.map(p => ({ id: p.id, name: p.name })) ?? []}
        users={users?.map(u => ({ id: u.id, name: u.name })) ?? []}
        onConfirm={handleConfirmExtraction}
        isSaving={isSavingExtraction}
      />
    </div>
  );
};

export default StickerWall;
