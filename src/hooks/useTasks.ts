import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskRow {
  id: string;
  user_id: string;
  project_id: string;
  week_start: string;
  description: string;
  is_planned: boolean;
  is_completed: boolean;
  start_date: string | null;
  end_date: string | null;
}

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
      return data as TaskRow[];
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
      return data as TaskRow[];
    },
  });
}

export function useProjectTasks(projectId?: string) {
  return useQuery({
    queryKey: ['project_tasks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId!);
      if (error) throw error;
      return data as TaskRow[];
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
      start_date?: string | null;
      end_date?: string | null;
    }) => {
      if (params.id) {
        const { error } = await supabase.from('tasks').update({
          description: params.description,
          is_planned: params.is_planned,
          is_completed: params.is_completed,
          start_date: params.start_date,
          end_date: params.end_date,
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
          start_date: params.start_date ?? null,
          end_date: params.end_date ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
      qc.invalidateQueries({ queryKey: ['project_tasks'] });
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      project_id: string;
      week_start: string;
      description: string;
      start_date?: string | null;
      end_date?: string | null;
    }) => {
      const { data, error } = await supabase.from('tasks').insert({
        user_id: params.user_id,
        project_id: params.project_id,
        week_start: params.week_start,
        description: params.description,
        is_planned: true,
        is_completed: false,
        start_date: params.start_date ?? null,
        end_date: params.end_date ?? null,
      }).select().single();
      if (error) throw error;
      return data as TaskRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
      qc.invalidateQueries({ queryKey: ['project_tasks'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
      qc.invalidateQueries({ queryKey: ['project_tasks'] });
    },
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase.from('tasks').update({ is_completed }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
      qc.invalidateQueries({ queryKey: ['project_tasks'] });
    },
  });
}

export function useUpdateTaskDates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, start_date, end_date }: { id: string; start_date: string | null; end_date: string | null }) => {
      const { error } = await supabase.from('tasks').update({ start_date, end_date }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['all_tasks'] });
      qc.invalidateQueries({ queryKey: ['project_tasks'] });
    },
  });
}
