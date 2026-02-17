import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { registerDisciplineColor } from '@/lib/colors';

export function useDisciplines() {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['disciplines', workspaceId],
    queryFn: async () => {
      let q = supabase.from('disciplines').select('*').order('sort_order');
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      // Register colors so getDisciplineColor(id) works everywhere
      data?.forEach(d => registerDisciplineColor(d.id, d.color));
      return data;
    },
  });
}
