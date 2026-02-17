import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Fetch assignments for a specific user across a date range of weeks */
export function useUserAssignments(userId: string | null, dateRange: { start: string; end: string }) {
  return useQuery({
    queryKey: ['assignments', 'user', userId, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .gte('week_start', dateRange.start)
        .lte('week_start', dateRange.end);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/** Fetch all assignments for a project across a date range */
export function useProjectAssignments(projectId: string | undefined, dateRange: { start: string; end: string }) {
  return useQuery({
    queryKey: ['assignments', 'project', projectId, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('project_id', projectId)
        .gte('week_start', dateRange.start)
        .lte('week_start', dateRange.end);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
}

/** Fetch all assignments across all users/projects for a date range */
export function useAllAssignments(dateRange: { start: string; end: string }) {
  return useQuery({
    queryKey: ['assignments', 'all', dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .gte('week_start', dateRange.start)
        .lte('week_start', dateRange.end);
      if (error) throw error;
      return data;
    },
  });
}

/** Assign a user to a project for specific weeks */
export function useAssignMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { user_id: string; project_id: string; week_starts: string[] }) => {
      const rows = params.week_starts.map((ws) => ({
        user_id: params.user_id,
        project_id: params.project_id,
        week_start: ws,
      }));
      const { error } = await supabase.from('assignments').upsert(rows, {
        onConflict: 'user_id,project_id,week_start',
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

/** Unassign a user from a project for specific weeks */
export function useUnassignMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { user_id: string; project_id: string; week_starts: string[] }) => {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}
