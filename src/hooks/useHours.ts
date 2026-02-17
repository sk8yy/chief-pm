import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { sandboxToast } from '@/lib/sandbox';

export function useHours(userId: string | null, dateRange: { start: string; end: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['hours', userId, dateRange.start, dateRange.end, workspaceId],
    queryFn: async () => {
      if (!userId) return [];
      let q = supabase
        .from('hours')
        .select('*')
        .eq('user_id', userId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpsertHours() {
  const qc = useQueryClient();
  const { workspaceId, isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      project_id: string;
      date: string;
      planned_hours?: number;
      recorded_hours?: number | null;
    }) => {
      if (isSandbox) { sandboxToast(); return; }
      const { data: existing } = await supabase
        .from('hours')
        .select('id, planned_hours, recorded_hours')
        .eq('user_id', params.user_id)
        .eq('project_id', params.project_id)
        .eq('date', params.date)
        .maybeSingle();

      if (existing) {
        const updateData: Record<string, unknown> = {};
        if (params.planned_hours !== undefined) {
          updateData.planned_hours = params.planned_hours;
          if (existing.recorded_hours === null) {
            updateData.recorded_hours = params.planned_hours;
          }
        }
        if (params.recorded_hours !== undefined) updateData.recorded_hours = params.recorded_hours;
        const { error } = await supabase.from('hours').update(updateData).eq('id', existing.id);
        if (error) throw error;
      } else {
        const plannedVal = params.planned_hours ?? 0;
        const { error } = await supabase.from('hours').insert({
          user_id: params.user_id,
          project_id: params.project_id,
          date: params.date,
          planned_hours: plannedVal,
          recorded_hours: params.recorded_hours !== undefined ? params.recorded_hours : (plannedVal > 0 ? plannedVal : null),
          workspace_id: workspaceId!,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (!isSandbox) qc.invalidateQueries({ queryKey: ['hours'] });
    },
  });
}
