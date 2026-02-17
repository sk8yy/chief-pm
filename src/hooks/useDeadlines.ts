import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProjectDeadlines(projectId: string | undefined) {
  return useQuery({
    queryKey: ['deadlines', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .eq('project_id', projectId!)
        .order('date');
      if (error) throw error;
      return data;
    },
  });
}

export function useAddDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; date: string; project_id: string; created_by: string }) => {
      const { error } = await supabase.from('deadlines').insert({
        name: params.name,
        date: params.date,
        project_id: params.project_id,
        created_by: params.created_by,
        type: 'project',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deadlines'] }),
  });
}

export function useDeleteDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deadlines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deadlines'] }),
  });
}
