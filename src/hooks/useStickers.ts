import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { sandboxToast } from '@/lib/sandbox';

export function useStickers(filters?: { userId?: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['stickers', filters, workspaceId],
    queryFn: async () => {
      let q = supabase.from('stickers').select('*, projects(*, disciplines(*))').order('created_at', { ascending: false });
      if (filters?.userId) q = q.eq('user_id', filters.userId);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSticker() {
  const qc = useQueryClient();
  const { workspaceId, isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (params: { content: string; user_id: string }) => {
      if (isSandbox) { sandboxToast(); return null as any; }
      const { data, error } = await supabase.from('stickers').insert({
        content: params.content,
        user_id: params.user_id,
        workspace_id: workspaceId!,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['stickers'] }); },
  });
}

export function useUpdateSticker() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (params: { id: string; content?: string; project_id?: string | null }) => {
      if (isSandbox) { sandboxToast(); return; }
      const { id, ...updates } = params;
      const { error } = await supabase.from('stickers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['stickers'] }); },
  });
}

export function useDeleteSticker() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isSandbox) { sandboxToast(); return; }
      const { error } = await supabase.from('stickers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['stickers'] }); },
  });
}
