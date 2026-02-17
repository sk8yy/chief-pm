import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useHours(userId: string | null, dateRange: { start: string; end: string }) {
  return useQuery({
    queryKey: ['hours', userId, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('hours')
        .select('*')
        .eq('user_id', userId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpsertHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      project_id: string;
      date: string;
      planned_hours?: number;
      recorded_hours?: number | null;
    }) => {
      // Check if entry exists
      const { data: existing } = await supabase
        .from('hours')
        .select('id')
        .eq('user_id', params.user_id)
        .eq('project_id', params.project_id)
        .eq('date', params.date)
        .maybeSingle();

      if (existing) {
        const updateData: Record<string, unknown> = {};
        if (params.planned_hours !== undefined) updateData.planned_hours = params.planned_hours;
        if (params.recorded_hours !== undefined) updateData.recorded_hours = params.recorded_hours;
        const { error } = await supabase.from('hours').update(updateData).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hours').insert({
          user_id: params.user_id,
          project_id: params.project_id,
          date: params.date,
          planned_hours: params.planned_hours ?? 0,
          recorded_hours: params.recorded_hours ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hours'] });
    },
  });
}
