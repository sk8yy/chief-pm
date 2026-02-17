import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTasks(filters?: { userId?: string; projectId?: string; weekStart?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let q = supabase.from('tasks').select('*');
      if (filters?.userId) q = q.eq('user_id', filters.userId);
      if (filters?.projectId) q = q.eq('project_id', filters.projectId);
      if (filters?.weekStart) q = q.eq('week_start', filters.weekStart);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAllTasks(dateRange?: { start: string; end: string }) {
  return useQuery({
    queryKey: ['all_tasks', dateRange?.start, dateRange?.end],
    queryFn: async () => {
      let q = supabase.from('tasks').select('*');
      if (dateRange) {
        q = q.gte('week_start', dateRange.start).lte('week_start', dateRange.end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id?: string;
      user_id: string;
      project_id: string;
      week_start: string;
      description: string;
      is_planned?: boolean;
      is_completed?: boolean;
    }) => {
      if (params.id) {
        const { error } = await supabase.from('tasks').update({
          description: params.description,
          is_planned: params.is_planned,
          is_completed: params.is_completed,
        }).eq('id', params.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').insert({
          user_id: params.user_id,
          project_id: params.project_id,
          week_start: params.week_start,
          description: params.description,
          is_planned: params.is_planned ?? true,
          is_completed: params.is_completed ?? false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase.from('tasks').update({ is_completed }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
