import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDisciplines() {
  return useQuery({
    queryKey: ['disciplines'],
    queryFn: async () => {
      const { data, error } = await supabase.from('disciplines').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}
