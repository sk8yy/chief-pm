// Discipline color mapping keyed by discipline ID
const DISCIPLINE_COLORS: Record<string, { bg: string; text: string; border: string; bgMuted: string; bgLight: string }> = {
  'a1000000-0000-0000-0000-000000000001': { bg: 'hsl(122, 39%, 49%)', text: 'hsl(122, 39%, 15%)', border: 'hsl(122, 39%, 40%)', bgMuted: 'hsl(122, 20%, 30%)', bgLight: 'hsl(122, 40%, 94%)' },
  'a1000000-0000-0000-0000-000000000002': { bg: 'hsl(14, 100%, 63%)', text: 'hsl(14, 100%, 20%)', border: 'hsl(14, 100%, 50%)', bgMuted: 'hsl(14, 40%, 35%)', bgLight: 'hsl(14, 80%, 94%)' },
  'a1000000-0000-0000-0000-000000000003': { bg: 'hsl(36, 100%, 50%)', text: 'hsl(36, 100%, 18%)', border: 'hsl(36, 100%, 40%)', bgMuted: 'hsl(36, 40%, 32%)', bgLight: 'hsl(36, 80%, 94%)' },
  'a1000000-0000-0000-0000-000000000004': { bg: 'hsl(262, 47%, 55%)', text: 'hsl(262, 47%, 18%)', border: 'hsl(262, 47%, 42%)', bgMuted: 'hsl(262, 25%, 32%)', bgLight: 'hsl(262, 40%, 94%)' },
  'a1000000-0000-0000-0000-000000000005': { bg: 'hsl(207, 89%, 61%)', text: 'hsl(207, 89%, 18%)', border: 'hsl(207, 89%, 48%)', bgMuted: 'hsl(207, 35%, 32%)', bgLight: 'hsl(207, 60%, 94%)' },
};

const FALLBACK = { bg: 'hsl(0, 0%, 85%)', text: 'hsl(0, 0%, 20%)', border: 'hsl(0, 0%, 70%)', bgMuted: 'hsl(0, 0%, 35%)', bgLight: 'hsl(0, 0%, 97%)' };

export function getDisciplineColor(disciplineId: string | null) {
  if (!disciplineId) return FALLBACK;
  return DISCIPLINE_COLORS[disciplineId] ?? FALLBACK;
}

export function getDisciplineColorRecord(disciplineId: string | null) {
  const c = getDisciplineColor(disciplineId);
  return { ...c, bg: c.bgMuted };
}
