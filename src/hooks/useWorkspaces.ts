import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  owner_id: string | null;
}

export function useWorkspaces(profileId?: string | null) {
  return useQuery({
    queryKey: ['workspaces', profileId],
    queryFn: async () => {
      const { data, error } = await supabase.from('workspaces').select('*').order('created_at');
      if (error) throw error;
      const all = data as Workspace[];
      if (!profileId) return all;
      // Show user's own workspaces + shared sample workspace
      const SAMPLE_ID = '00000000-0000-0000-0000-000000000001';
      return all.filter(w => w.owner_id === profileId || w.owner_id === null || w.id === SAMPLE_ID);
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, ownerId }: { name: string; ownerId?: string | null }) => {
      const insert: any = { name };
      if (ownerId) insert.owner_id = ownerId;
      const { data, error } = await supabase.from('workspaces').insert(insert).select().single();
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
