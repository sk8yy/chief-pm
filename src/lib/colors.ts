// Dynamic discipline color system - derives variants from stored hex color

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 50];
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export interface DisciplineColorSet {
  bg: string;
  text: string;
  border: string;
  bgMuted: string;
  bgLight: string;
}

function deriveColors(hex: string): DisciplineColorSet {
  const [h, s, l] = hexToHsl(hex);
  return {
    bg: `hsl(${h}, ${Math.min(s, 80)}%, ${Math.max(l, 45)}%)`,
    text: `hsl(${h}, ${Math.min(s, 80)}%, 15%)`,
    border: `hsl(${h}, ${Math.min(s, 80)}%, ${Math.max(l - 10, 35)}%)`,
    bgMuted: `hsl(${h}, ${Math.min(s / 2, 40)}%, 32%)`,
    bgLight: `hsl(${h}, ${Math.min(s, 70)}%, 94%)`,
  };
}

const FALLBACK: DisciplineColorSet = {
  bg: 'hsl(0, 0%, 85%)',
  text: 'hsl(0, 0%, 20%)',
  border: 'hsl(0, 0%, 70%)',
  bgMuted: 'hsl(0, 0%, 35%)',
  bgLight: 'hsl(0, 0%, 97%)',
};

// Runtime cache: discipline ID -> color set
const idCache = new Map<string, DisciplineColorSet>();
const hexCache = new Map<string, DisciplineColorSet>();

/** Register a discipline's color so getDisciplineColor(id) works without passing hex each time */
export function registerDisciplineColor(disciplineId: string, colorHex: string) {
  if (!idCache.has(disciplineId)) {
    const colors = getOrDeriveFromHex(colorHex);
    idCache.set(disciplineId, colors);
  }
}

function getOrDeriveFromHex(hex: string): DisciplineColorSet {
  if (hexCache.has(hex)) return hexCache.get(hex)!;
  const colors = deriveColors(hex);
  hexCache.set(hex, colors);
  return colors;
}

export function getDisciplineColor(disciplineId: string | null, colorHex?: string): DisciplineColorSet {
  if (!disciplineId && !colorHex) return FALLBACK;
  if (colorHex) {
    const colors = getOrDeriveFromHex(colorHex);
    if (disciplineId) idCache.set(disciplineId, colors);
    return colors;
  }
  if (disciplineId && idCache.has(disciplineId)) return idCache.get(disciplineId)!;
  return FALLBACK;
}

export function getDisciplineColorRecord(disciplineId: string | null, colorHex?: string): DisciplineColorSet {
  const c = getDisciplineColor(disciplineId, colorHex);
  return { ...c, bg: c.bgMuted };
}

// Preset hue palette for new disciplines
export const HUE_PALETTE = [122, 14, 36, 262, 207, 174, 340, 45, 230, 85];
