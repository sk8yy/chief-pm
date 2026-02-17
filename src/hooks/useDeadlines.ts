import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { sandboxToast } from '@/lib/sandbox';

export function useProjectDeadlines(projectId: string | undefined) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['deadlines', projectId, workspaceId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase
        .from('deadlines')
        .select('*')
        .eq('project_id', projectId!)
        .order('date');
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllDeadlines(dateRange: { start: string; end: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['deadlines', 'all', dateRange.start, dateRange.end, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from('deadlines')
        .select('*, projects(name, discipline_id)')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date');
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAddDeadline() {
  const qc = useQueryClient();
  const { workspaceId, isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (params: { name: string; date: string; project_id: string; created_by: string; category?: string }) => {
      if (isSandbox) { sandboxToast(); return; }
      const { error } = await supabase.from('deadlines').insert({
        name: params.name,
        date: params.date,
        project_id: params.project_id,
        created_by: params.created_by,
        type: 'project',
        category: params.category ?? 'due',
        workspace_id: workspaceId!,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['deadlines'] }); },
  });
}

export function useDeleteDeadline() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isSandbox) { sandboxToast(); return; }
      const { error } = await supabase.from('deadlines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['deadlines'] }); },
  });
}

export function useUpdateDeadlineCategory() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      if (isSandbox) { sandboxToast(); return; }
      const { error } = await supabase.from('deadlines').update({ category } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['deadlines'] }); },
  });
}
