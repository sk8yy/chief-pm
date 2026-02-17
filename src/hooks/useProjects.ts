import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';

export function useProjects() {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      let q = supabase.from('projects').select('*, disciplines(*)').order('sort_order');
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      job_number?: string;
      discipline_id?: string | null;
      manager_id?: string | null;
      start_date?: string | null;
      end_date?: string | null;
    }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('projects').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
