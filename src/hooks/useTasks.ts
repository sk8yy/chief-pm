import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { sandboxToast } from '@/lib/sandbox';

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

const TASK_KEYS = ['tasks', 'all_tasks', 'project_tasks'] as const;
function invalidateTasks(qc: ReturnType<typeof useQueryClient>) {
  TASK_KEYS.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}

export function useTasks(filters?: { userId?: string; projectId?: string; weekStart?: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['tasks', filters, workspaceId],
    queryFn: async () => {
      let q = supabase.from('tasks').select('*');
      if (filters?.userId) q = q.eq('user_id', filters.userId);
      if (filters?.projectId) q = q.eq('project_id', filters.projectId);
      if (filters?.weekStart) q = q.eq('week_start', filters.weekStart);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as TaskRow[];
    },
  });
}

export function useAllTasks(dateRange?: { start: string; end: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['all_tasks', dateRange?.start, dateRange?.end, workspaceId],
    queryFn: async () => {
      let q = supabase.from('tasks').select('*');
      if (dateRange) {
        q = q.gte('week_start', dateRange.start).lte('week_start', dateRange.end);
      }
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as TaskRow[];
    },
  });
}

export function useProjectTasks(projectId?: string) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['project_tasks', projectId, workspaceId],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase.from('tasks').select('*').eq('project_id', projectId!);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as TaskRow[];
    },
  });
}

export function useUpsertTask() {
  const qc = useQueryClient();
  const { workspaceId, isSandbox } = useAppContext();
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
      if (isSandbox) { sandboxToast(); return; }
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
          workspace_id: workspaceId!,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { if (!isSandbox) invalidateTasks(qc); },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { workspaceId, isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (params: {
      user_id: string;
      project_id: string;
      week_start: string;
      description: string;
      start_date?: string | null;
      end_date?: string | null;
    }) => {
      if (isSandbox) { sandboxToast(); return null as any; }
      const { data, error } = await supabase.from('tasks').insert({
        user_id: params.user_id,
        project_id: params.project_id,
        week_start: params.week_start,
        description: params.description,
        is_planned: true,
        is_completed: false,
        start_date: params.start_date ?? null,
        end_date: params.end_date ?? null,
        workspace_id: workspaceId!,
      } as any).select().single();
      if (error) throw error;
      return data as TaskRow;
    },
    onSuccess: () => { if (!isSandbox) invalidateTasks(qc); },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isSandbox) { sandboxToast(); return; }
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) invalidateTasks(qc); },
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      if (isSandbox) { sandboxToast(); return; }
      const { error } = await supabase.from('tasks').update({ is_completed }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) invalidateTasks(qc); },
  });
}

export function useUpdateTaskDates() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async ({ id, start_date, end_date }: { id: string; start_date: string | null; end_date: string | null }) => {
      if (isSandbox) { sandboxToast(); return; }
      const { error } = await supabase.from('tasks').update({ start_date, end_date }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { if (!isSandbox) invalidateTasks(qc); },
  });
}
