// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: LIGHT PREMIUM GRADIENT THEME PRESETS
// Editorial, high-contrast, light gradient reading palettes built around the
// signature EdTechra Blue brand identity.
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
  badgeBg: string;
  isDark?: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'edtechra-sky',
    name: 'EdTechra Sky',
    description: 'Signature soft sky blue to pure white',
    bgGradient: 'bg-gradient-to-b from-[#e8f3ff] via-[#f7faff] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #e8f3ff 0%, #f7faff 60%, #ffffff 100%)',
    text: 'text-[#0f172a]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-sky-200/70',
    headerBg: 'bg-[#e8f3ff]/95 backdrop-blur-md',
    accent: '#026fc3',
    badgeBg: 'bg-[#026fc3]/10 text-[#026fc3]'
  },
  {
    id: 'morning-mist',
    name: 'Morning Mist',
    description: 'Soft ivory to pale whisper blue',
    bgGradient: 'bg-gradient-to-b from-[#eaf5ff] via-[#f4f8fc] to-[#fffdf8]',
    previewCss: 'linear-gradient(135deg, #eaf5ff 0%, #f4f8fc 60%, #fffdf8 100%)',
    text: 'text-[#1e293b]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-slate-200/80',
    headerBg: 'bg-[#eaf5ff]/95 backdrop-blur-md',
    accent: '#026fc3',
    badgeBg: 'bg-sky-500/10 text-[#026fc3]'
  },
  {
    id: 'pearl-blue',
    name: 'Pearl Blue',
    description: 'Luminous pearl to crystalline white',
    bgGradient: 'bg-gradient-to-b from-[#f3f8ff] via-[#f8fbff] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #f3f8ff 0%, #f8fbff 50%, #ffffff 100%)',
    text: 'text-[#0f172a]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-sky-100/90',
    headerBg: 'bg-[#f3f8ff]/95 backdrop-blur-md',
    accent: '#026fc3',
    badgeBg: 'bg-sky-500/10 text-[#026fc3]'
  },
  {
    id: 'soft-blue-mist',
    name: 'Soft Blue Mist',
    description: 'Gentle airy cyan to pure white',
    bgGradient: 'bg-gradient-to-b from-[#eef6ff] via-[#f8fbff] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #eef6ff 0%, #f8fbff 60%, #ffffff 100%)',
    text: 'text-[#0f172a]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-sky-200/70',
    headerBg: 'bg-[#eef6ff]/95 backdrop-blur-md',
    accent: '#0284c7',
    badgeBg: 'bg-sky-500/10 text-[#0284c7]'
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    description: 'Pale sea-salt to fresh soft cyan',
    bgGradient: 'bg-gradient-to-b from-[#edf8fa] via-[#f2f9fd] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #edf8fa 0%, #f2f9fd 60%, #ffffff 100%)',
    text: 'text-[#132330]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-cyan-200/60',
    headerBg: 'bg-[#edf8fa]/95 backdrop-blur-md',
    accent: '#0284c7',
    badgeBg: 'bg-cyan-500/10 text-[#0284c7]'
  },
  {
    id: 'lavender-dawn',
    name: 'Lavender Dawn',
    description: 'Soft blue to delicate lilac dawn',
    bgGradient: 'bg-gradient-to-b from-[#f0f4ff] via-[#f5f2fb] to-[#faf8ff]',
    previewCss: 'linear-gradient(135deg, #f0f4ff 0%, #f5f2fb 60%, #faf8ff 100%)',
    text: 'text-[#1e1b2e]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-indigo-100/90',
    headerBg: 'bg-[#f0f4ff]/95 backdrop-blur-md',
    accent: '#6366f1',
    badgeBg: 'bg-indigo-500/10 text-[#6366f1]'
  },
  {
    id: 'sage-mist',
    name: 'Sage Mist',
    description: 'Clean alabaster to pale herbal sage',
    bgGradient: 'bg-gradient-to-b from-[#edf7f2] via-[#f6faf7] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #edf7f2 0%, #f6faf7 60%, #ffffff 100%)',
    text: 'text-[#14261c]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-emerald-100/90',
    headerBg: 'bg-[#edf7f2]/95 backdrop-blur-md',
    accent: '#059669',
    badgeBg: 'bg-emerald-500/10 text-[#059669]'
  },
  {
    id: 'warm-ivory',
    name: 'Warm Ivory',
    description: 'Refined parchment ivory to warm linen',
    bgGradient: 'bg-gradient-to-b from-[#fdfbf7] via-[#fcf8f0] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #fdfbf7 0%, #fcf8f0 60%, #ffffff 100%)',
    text: 'text-[#29221b]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-amber-100/90',
    headerBg: 'bg-[#fdfbf7]/95 backdrop-blur-md',
    accent: '#d97706',
    badgeBg: 'bg-amber-500/10 text-[#d97706]'
  },
  {
    id: 'rose-cloud',
    name: 'Rose Cloud',
    description: 'Soft ivory to delicate blush rose',
    bgGradient: 'bg-gradient-to-b from-[#fdf2f4] via-[#fcf6f7] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #fdf2f4 0%, #fcf6f7 60%, #ffffff 100%)',
    text: 'text-[#2a171d]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-rose-100/90',
    headerBg: 'bg-[#fdf2f4]/95 backdrop-blur-md',
    accent: '#e11d48',
    badgeBg: 'bg-rose-500/10 text-[#e11d48]'
  },
  {
    id: 'arctic-light',
    name: 'Arctic Light',
    description: 'Crystalline white to frosty glacier mist',
    bgGradient: 'bg-gradient-to-b from-[#f0f7ff] via-[#f8fbff] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #f0f7ff 0%, #f8fbff 60%, #ffffff 100%)',
    text: 'text-[#0f172a]',
    cardBg: 'bg-white/98',
    cardBorder: 'border-sky-200/80',
    headerBg: 'bg-[#f0f7ff]/95 backdrop-blur-md',
    accent: '#026fc3',
    badgeBg: 'bg-sky-500/10 text-[#026fc3]'
  },
  {
    id: 'night-dark',
    name: 'Midnight Navy',
    description: 'Deep sophisticated blue-black with high contrast',
    bgGradient: 'bg-gradient-to-b from-[#090e17] via-[#0d1522] to-[#131f32]',
    previewCss: 'linear-gradient(135deg, #090e17 0%, #0d1522 50%, #131f32 100%)',
    text: 'text-[#e2e8f0]',
    cardBg: 'bg-[#111b2b]/95',
    cardBorder: 'border-slate-700/70',
    headerBg: 'bg-[#090e17]/95 backdrop-blur-md',
    accent: '#38bdf8',
    badgeBg: 'bg-[#38bdf8]/15 text-[#38bdf8]',
    isDark: true
  }
];

export const DEFAULT_THEME_ID = 'edtechra-sky';

export function getThemePreset(id?: string): ThemePreset {
  if (!id) return THEME_PRESETS[0];
  return THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
}
