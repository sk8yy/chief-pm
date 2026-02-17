import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete all related data first (order matters for FK constraints)
      await supabase.from('tasks').delete().eq('workspace_id', id);
      await supabase.from('stickers').delete().eq('workspace_id', id);
      await supabase.from('deadlines').delete().eq('workspace_id', id);
      await supabase.from('hours').delete().eq('workspace_id', id);
      await supabase.from('assignments').delete().eq('workspace_id', id);
      await supabase.from('projects').delete().eq('workspace_id', id);
      await supabase.from('app_users').delete().eq('workspace_id', id);
      await supabase.from('disciplines').delete().eq('workspace_id', id);
      const { error } = await supabase.from('workspaces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}
