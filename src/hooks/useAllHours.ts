import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';

/** Fetch all hours across all users for a date range (for team/PM views) */
export function useAllHours(dateRange: { start: string; end: string }) {
  const { workspaceId } = useAppContext();
  return useQuery({
    queryKey: ['all_hours', dateRange.start, dateRange.end, workspaceId],
    queryFn: async () => {
      let q = supabase
        .from('hours')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      const { data, error } = await q;
      if (error) throw error;
      
      // Auto-sync: if recorded_hours is null, use planned_hours as default
      // This ensures existing Plan Mode data appears in Record Mode
      return data?.map((hour) => ({
        ...hour,
        recorded_hours: hour.recorded_hours ?? hour.planned_hours,
      }));
    },
  });
}
