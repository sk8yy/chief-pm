import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { sandboxToast } from '@/lib/sandbox';

export function useUserAssignments(userId: string | null, dateRange: { start: string; end: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['assignments', 'user', userId, dateRange.start, dateRange.end, workspaceId],
    queryFn: async () => {
      if (!userId) return [];
      let q = supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .gte('week_start', dateRange.start)
        .lte('week_start', dateRange.end);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useProjectAssignments(projectId: string | undefined, dateRange: { start: string; end: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['assignments', 'project', projectId, dateRange.start, dateRange.end, workspaceId],
    queryFn: async () => {
      if (!projectId) return [];
      let q = supabase
        .from('assignments')
        .select('*')
        .eq('project_id', projectId)
        .gte('week_start', dateRange.start)
        .lte('week_start', dateRange.end);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

export function useAllAssignments(dateRange: { start: string; end: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['assignments', 'all', dateRange.start, dateRange.end, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from('assignments')
        .select('*')
        .gte('week_start', dateRange.start)
        .lte('week_start', dateRange.end);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAssignMember() {
  const qc = useQueryClient();
  const { workspaceId, isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (params: { user_id: string; project_id: string; week_starts: string[] }) => {
      if (isSandbox) { sandboxToast(); return; }
      const rows = params.week_starts.map((ws) => ({
        user_id: params.user_id,
        project_id: params.project_id,
        week_start: ws,
        workspace_id: workspaceId!,
      }));
      const { error } = await supabase.from('assignments').upsert(rows as any, {
        onConflict: 'user_id,project_id,week_start',
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['assignments'] }); },
  });
}

export function useUnassignMember() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (params: { user_id: string; project_id: string; week_starts: string[] }) => {
      if (isSandbox) { sandboxToast(); return; }
      for (const ws of params.week_starts) {
        const { error } = await supabase
          .from('assignments')
          .delete()
          .eq('user_id', params.user_id)
          .eq('project_id', params.project_id)
          .eq('week_start', ws);
        if (error) throw error;
      }
    },
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['assignments'] }); },
  });
}
