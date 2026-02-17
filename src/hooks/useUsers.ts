import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';

export function useUsers() {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['app_users', workspaceId],
    queryFn: async () => {
      let q = supabase.from('app_users').select('*, disciplines(*)').order('name');
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
