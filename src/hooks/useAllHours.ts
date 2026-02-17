import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Fetch all hours across all users for a date range (for team/PM views) */
export function useAllHours(dateRange: { start: string; end: string }) {
  return useQuery({
    queryKey: ['all_hours', dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hours')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
      if (error) throw error;
      return data;
    },
  });
}
