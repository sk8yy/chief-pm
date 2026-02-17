export const DEADLINE_CATEGORIES = [
  { value: 'internal_meeting', label: 'Internal Meeting', short: 'INT', color: 'hsl(210 80% 55%)' },
  { value: 'external_meeting', label: 'External Meeting', short: 'EXT', color: 'hsl(280 70% 55%)' },
  { value: 'submission', label: 'Submission', short: 'SUB', color: 'hsl(25 90% 55%)' },
  { value: 'due', label: 'Due', short: 'DUE', color: 'hsl(0 80% 55%)' },
] as const;

export type DeadlineCategory = typeof DEADLINE_CATEGORIES[number]['value'];

export function getCategoryMeta(category: string) {
  return DEADLINE_CATEGORIES.find(c => c.value === category) ?? DEADLINE_CATEGORIES[3];
}

/** Auto-categorize a deadline name into a category */
export function autoCategorize(name: string): DeadlineCategory {
  const lower = name.toLowerCase();
  if (/internal|team meeting|standup|sync|huddle|retro/.test(lower)) return 'internal_meeting';
  if (/external|client meeting|client call|presentation|vendor|stakeholder/.test(lower)) return 'external_meeting';
  if (/submit|submission|deliver|hand\s?over|handover|send out/.test(lower)) return 'submission';
  return 'due';
}
