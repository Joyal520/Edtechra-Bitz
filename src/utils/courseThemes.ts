// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: 10 LIGHT PREMIUM GRADIENT THEME PRESETS
// Editorial, Apple Books & Kindle inspired subtle light gradients with
// high contrast reading typography, soft paper textures, and visual preview cards.
// ============================================================================

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  // Background gradient class / style
  bgGradient: string;
  // CSS gradient string for visual preview badge
  previewCss: string;
  text: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  accent: string;
  isDark?: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'morning-mist',
    name: 'Morning Mist',
    description: 'Soft ivory to pale sky blue',
    bgGradient: 'bg-gradient-to-b from-[#fcfbf9] via-[#f7f9fc] to-[#f0f4f8]',
    previewCss: 'linear-gradient(to bottom, #fcfbf9, #f7f9fc, #f0f4f8)',
    text: 'text-[#1c1917]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-stone-200/90',
    headerBg: 'bg-[#fcfbf9]/95 backdrop-blur-md',
    accent: '#026fc3'
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Soft blue to gentle lavender',
    bgGradient: 'bg-gradient-to-b from-[#f4f7fc] via-[#f5f2fb] to-[#f5f0fb]',
    previewCss: 'linear-gradient(to bottom, #f4f7fc, #f5f2fb, #f5f0fb)',
    text: 'text-[#1c1924]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-indigo-100/90',
    headerBg: 'bg-[#f4f7fc]/95 backdrop-blur-md',
    accent: '#5046e5'
  },
  {
    id: 'peach-cloud',
    name: 'Peach Cloud',
    description: 'Warm cream to soft peach',
    bgGradient: 'bg-gradient-to-b from-[#fdfbf7] via-[#fdf6f0] to-[#fef2eb]',
    previewCss: 'linear-gradient(to bottom, #fdfbf7, #fdf6f0, #fef2eb)',
    text: 'text-[#2a1d18]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-orange-100/90',
    headerBg: 'bg-[#fdfbf7]/95 backdrop-blur-md',
    accent: '#d9531e'
  },
  {
    id: 'sage-garden',
    name: 'Sage Garden',
    description: 'Ivory to pale serene sage',
    bgGradient: 'bg-gradient-to-b from-[#fcfbf7] via-[#f5f8f5] to-[#f0f5f0]',
    previewCss: 'linear-gradient(to bottom, #fcfbf7, #f5f8f5, #f0f5f0)',
    text: 'text-[#1c241c]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-emerald-100/90',
    headerBg: 'bg-[#fcfbf7]/95 backdrop-blur-md',
    accent: '#059669'
  },
  {
    id: 'lavender-paper',
    name: 'Lavender Paper',
    description: 'Ivory to soft delicate lavender',
    bgGradient: 'bg-gradient-to-b from-[#faf8fc] via-[#f6f2fa] to-[#f3ecf8]',
    previewCss: 'linear-gradient(to bottom, #faf8fc, #f6f2fa, #f3ecf8)',
    text: 'text-[#201828]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-purple-100/90',
    headerBg: 'bg-[#faf8fc]/95 backdrop-blur-md',
    accent: '#7c3aed'
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Pale cyan to clear soft blue',
    bgGradient: 'bg-gradient-to-b from-[#f2fafb] via-[#f0f7fb] to-[#eef4fc]',
    previewCss: 'linear-gradient(to bottom, #f2fafb, #f0f7fb, #eef4fc)',
    text: 'text-[#14202c]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-sky-100/90',
    headerBg: 'bg-[#f2fafb]/95 backdrop-blur-md',
    accent: '#0284c7'
  },
  {
    id: 'sunset-cream',
    name: 'Sunset Cream',
    description: 'Warm cream to muted peach',
    bgGradient: 'bg-gradient-to-b from-[#fcf9f2] via-[#fef5ee] to-[#fdf1ea]',
    previewCss: 'linear-gradient(to bottom, #fcf9f2, #fef5ee, #fdf1ea)',
    text: 'text-[#2a221a]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-amber-100/90',
    headerBg: 'bg-[#fcf9f2]/95 backdrop-blur-md',
    accent: '#c2410c'
  },
  {
    id: 'rose-paper',
    name: 'Rose Paper',
    description: 'Ivory to very pale rose',
    bgGradient: 'bg-gradient-to-b from-[#fcf8f8] via-[#fbf2f4] to-[#fcedef]',
    previewCss: 'linear-gradient(to bottom, #fcf8f8, #fbf2f4, #fcedef)',
    text: 'text-[#28181c]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-rose-100/90',
    headerBg: 'bg-[#fcf8f8]/95 backdrop-blur-md',
    accent: '#e11d48'
  },
  {
    id: 'sky-glass',
    name: 'Sky Glass',
    description: 'Pure white to crystalline pale blue',
    bgGradient: 'bg-gradient-to-b from-[#ffffff] via-[#f7faff] to-[#f0f6fc]',
    previewCss: 'linear-gradient(to bottom, #ffffff, #f7faff, #f0f6fc)',
    text: 'text-[#161c24]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-slate-200/90',
    headerBg: 'bg-white/95 backdrop-blur-md',
    accent: '#026fc3'
  },
  {
    id: 'sand-sage',
    name: 'Sand & Sage',
    description: 'Warm ivory to muted pale sage',
    bgGradient: 'bg-gradient-to-b from-[#fbf9f4] via-[#f5f6ee] to-[#eef4ee]',
    previewCss: 'linear-gradient(to bottom, #fbf9f4, #f5f6ee, #eef4ee)',
    text: 'text-[#22261e]',
    cardBg: 'bg-white/90',
    cardBorder: 'border-stone-200/90',
    headerBg: 'bg-[#fbf9f4]/95 backdrop-blur-md',
    accent: '#16a34a'
  },
  {
    id: 'night-dark',
    name: 'Night Dark',
    description: 'Sophisticated deep midnight',
    bgGradient: 'bg-[#101722]',
    previewCss: '#101722',
    text: 'text-[#e2e8f0]',
    cardBg: 'bg-[#182232]',
    cardBorder: 'border-slate-800',
    headerBg: 'bg-[#0e141e]/95 backdrop-blur-md',
    accent: '#38bdf8',
    isDark: true
  }
];

export const DEFAULT_THEME_ID = 'morning-mist';

export function getThemePreset(id?: string): ThemePreset {
  if (!id) return THEME_PRESETS[0];
  return THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
}
