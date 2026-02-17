import { useMemo } from 'react';
import { format, eachDayOfInterval, endOfWeek } from 'date-fns';
import { getDisciplineColor } from '@/lib/colors';
import type { ModeType } from '@/contexts/AppContext';

interface TimeSummaryTableProps {
  groupedProjects: {
    discipline: { id: string; name: string; color: string; sort_order: number };
    projects: { id: string; name: string; job_number: string; discipline_id: string | null }[];
  }[];
  hoursMap: Record<string, { planned_hours: number; recorded_hours: number | null }>;
  weeks: Date[];
  mode: ModeType;
  currentMonth: Date;
}

const TimeSummaryTable = ({ groupedProjects, hoursMap, weeks, mode, currentMonth }: TimeSummaryTableProps) => {
  const summary = useMemo(() => {
    const rows: { projectName: string; jobNumber: string; disciplineId: string | null; normalHours: number; otHours: number }[] = [];

    // First calculate weekly totals to determine OT per week
    const weeklyTotals = weeks.map((weekStart) => {
      const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
      let total = 0;
      const projectHours: Record<string, number> = {};

      groupedProjects.forEach((g) =>
        g.projects.forEach((p) => {
          let projWeekTotal = 0;
          days.forEach((day) => {
            const entry = hoursMap[`${p.id}_${format(day, 'yyyy-MM-dd')}`];
            if (entry) projWeekTotal += mode === 'plan' ? entry.planned_hours : (entry.recorded_hours ?? 0);
          });
          projectHours[p.id] = projWeekTotal;
          total += projWeekTotal;
        })
      );

      return { total, projectHours };
    });

    // Aggregate per project across weeks
    const projectTotals: Record<string, { normal: number; ot: number }> = {};
    weeklyTotals.forEach(({ total, projectHours }) => {
      const ot = Math.max(0, total - 40);
      Object.entries(projectHours).forEach(([pid, hrs]) => {
        if (!projectTotals[pid]) projectTotals[pid] = { normal: 0, ot: 0 };
        if (total > 40 && hrs > 0) {
          // Distribute OT proportionally
          const proportion = hrs / total;
          const projectOt = ot * proportion;
          projectTotals[pid].normal += hrs - projectOt;
          projectTotals[pid].ot += projectOt;
        } else {
          projectTotals[pid].normal += hrs;
        }
      });
    });

    groupedProjects.forEach((g) =>
      g.projects.forEach((p) => {
        const t = projectTotals[p.id];
        if (t && (t.normal > 0 || t.ot > 0)) {
          rows.push({
            projectName: p.name,
            jobNumber: p.job_number,
            disciplineId: p.discipline_id,
            normalHours: Math.round(t.normal * 10) / 10,
            otHours: Math.round(t.ot * 10) / 10,
          });
        }
      })
    );

    return rows;
  }, [groupedProjects, hoursMap, weeks, mode]);

  if (summary.length === 0) return null;

  const totalNormal = summary.reduce((s, r) => s + r.normalHours, 0);
  const totalOt = summary.reduce((s, r) => s + r.otHours, 0);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="px-3 py-2 font-semibold text-sm bg-muted/50 border-b">
        Time Booking Summary — {format(currentMonth, 'MMMM yyyy')}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-3 py-1.5 font-medium">Project</th>
            <th className="text-left px-3 py-1.5 font-medium">Job No.</th>
            <th className="text-right px-3 py-1.5 font-medium">Normal Hours</th>
            <th className="text-right px-3 py-1.5 font-medium">OT Hours</th>
            <th className="text-right px-3 py-1.5 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => {
            const colors = getDisciplineColor(row.disciplineId);
            return (
              <tr key={row.projectName} className="border-b last:border-b-0">
                <td className="px-3 py-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors.bg }} />
                  {row.projectName}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{row.jobNumber}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{row.normalHours}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{row.otHours > 0 ? row.otHours : '—'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                  {Math.round((row.normalHours + row.otHours) * 10) / 10}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/30 font-semibold">
            <td className="px-3 py-1.5" colSpan={2}>Total</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{Math.round(totalNormal * 10) / 10}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{totalOt > 0 ? Math.round(totalOt * 10) / 10 : '—'}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{Math.round((totalNormal + totalOt) * 10) / 10}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TimeSummaryTable;
