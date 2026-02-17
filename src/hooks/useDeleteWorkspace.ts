import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { sandboxToast } from '@/lib/sandbox';

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  const { isSandbox } = useAppContext();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isSandbox) { sandboxToast(); return; }
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
    onSuccess: () => { if (!isSandbox) qc.invalidateQueries({ queryKey: ['workspaces'] }); },
  });
}
