import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUsers() {
  return useQuery({
    queryKey: ['app_users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_users').select('*, disciplines(*)').order('name');
      if (error) throw error;
      return data;
    },
  });
}
