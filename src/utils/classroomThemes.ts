// ============================================================================
// EDTECHRA-BITZ: Classroom Themes & Color Palette System
// Controlled color presets for customizable classroom branding.
// Ensures premium typography, accessible contrast, and consistent styling.
// ============================================================================

export interface ClassroomThemeConfig {
  id: string;
  name: string;
  hex: string;
  bgClass: string;
  borderClass: string;
  badgeBg: string;
  badgeText: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  gradient: string;
}

export const CLASSROOM_THEMES: ClassroomThemeConfig[] = [
  {
    id: 'theme-blue',
    name: 'Blue Focus',
    hex: '#0284c7',
    bgClass: 'bg-sky-600',
    borderClass: 'border-sky-300',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    accentBg: 'bg-sky-50/80',
    accentBorder: 'border-sky-200',
    accentText: 'text-[#0284c7]',
    gradient: 'from-sky-600 to-blue-800'
  },
  {
    id: 'theme-indigo',
    name: 'Indigo Deep',
    hex: '#4f46e5',
    bgClass: 'bg-indigo-600',
    borderClass: 'border-indigo-300',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    accentBg: 'bg-indigo-50/80',
    accentBorder: 'border-indigo-200',
    accentText: 'text-indigo-600',
    gradient: 'from-indigo-600 to-indigo-900'
  },
  {
    id: 'theme-purple',
    name: 'Purple Studio',
    hex: '#7c3aed',
    bgClass: 'bg-purple-600',
    borderClass: 'border-purple-300',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    accentBg: 'bg-purple-50/80',
    accentBorder: 'border-purple-200',
    accentText: 'text-purple-600',
    gradient: 'from-purple-600 to-indigo-900'
  },
  {
    id: 'theme-green',
    name: 'Emerald Growth',
    hex: '#059669',
    bgClass: 'bg-emerald-600',
    borderClass: 'border-emerald-300',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    accentBg: 'bg-emerald-50/80',
    accentBorder: 'border-emerald-200',
    accentText: 'text-emerald-600',
    gradient: 'from-emerald-600 to-teal-800'
  },
  {
    id: 'theme-teal',
    name: 'Teal Discovery',
    hex: '#0d9488',
    bgClass: 'bg-teal-600',
    borderClass: 'border-teal-300',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    accentBg: 'bg-teal-50/80',
    accentBorder: 'border-teal-200',
    accentText: 'text-teal-600',
    gradient: 'from-teal-600 to-emerald-800'
  },
  {
    id: 'theme-cyan',
    name: 'Cyan Sky',
    hex: '#0891b2',
    bgClass: 'bg-cyan-600',
    borderClass: 'border-cyan-300',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    accentBg: 'bg-cyan-50/80',
    accentBorder: 'border-cyan-200',
    accentText: 'text-cyan-700',
    gradient: 'from-cyan-600 to-blue-800'
  },
  {
    id: 'theme-amber',
    name: 'Amber Workshop',
    hex: '#d97706',
    bgClass: 'bg-amber-600',
    borderClass: 'border-amber-300',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    accentBg: 'bg-amber-50/80',
    accentBorder: 'border-amber-200',
    accentText: 'text-amber-700',
    gradient: 'from-amber-600 to-amber-800'
  },
  {
    id: 'theme-orange',
    name: 'Orange Spark',
    hex: '#ea580c',
    bgClass: 'bg-orange-600',
    borderClass: 'border-orange-300',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    accentBg: 'bg-orange-50/80',
    accentBorder: 'border-orange-200',
    accentText: 'text-orange-600',
    gradient: 'from-orange-600 to-amber-800'
  },
  {
    id: 'theme-rose',
    name: 'Rose Creative',
    hex: '#e11d48',
    bgClass: 'bg-rose-600',
    borderClass: 'border-rose-300',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    accentBg: 'bg-rose-50/80',
    accentBorder: 'border-rose-200',
    accentText: 'text-rose-600',
    gradient: 'from-rose-600 to-red-800'
  },
  {
    id: 'theme-slate',
    name: 'Slate Executive',
    hex: '#475569',
    bgClass: 'bg-slate-600',
    borderClass: 'border-slate-300',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    accentBg: 'bg-slate-100/80',
    accentBorder: 'border-slate-200',
    accentText: 'text-slate-700',
    gradient: 'from-slate-700 to-stone-900'
  }
];

export const DEFAULT_CLASSROOM_THEME = CLASSROOM_THEMES[0];

/**
 * Resolves a classroom theme configuration by ID, name, or hex fallback.
 */
export function getClassroomTheme(themeIdOrName?: string | null): ClassroomThemeConfig {
  if (!themeIdOrName) return DEFAULT_CLASSROOM_THEME;
  const clean = themeIdOrName.trim().toLowerCase();

  const found = CLASSROOM_THEMES.find(
    (t) =>
      t.id.toLowerCase() === clean ||
      t.name.toLowerCase() === clean ||
      t.hex.toLowerCase() === clean
  );

  return found || DEFAULT_CLASSROOM_THEME;
}
