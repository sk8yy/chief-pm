import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('*').order('created_at');
      if (error) throw error;
      return data as Workspace[];
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('workspaces').insert({ name }).select().single();
      if (error) throw error;
      return data as Workspace;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('workspaces').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}
