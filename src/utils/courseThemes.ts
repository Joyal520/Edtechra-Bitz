// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: THEME PRESETS & VISUAL IDENTITY
// Editorial, high-contrast reading palettes built around the signature
// EdTechra rich blue / electric-blue brand identity.
// Primary / Default theme: Midnight Navy.
// Typography is decoupled from themes and remains invariant across switching.
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
  // Hex definitions for WCAG contrast calculation
  bgHex: string;
  cardBgHex: string;
  textHex: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'midnight-navy',
    name: 'Midnight Navy',
    description: 'Deep navy & electric blue (Primary Default)',
    bgGradient: 'bg-gradient-to-b from-[#090e17] via-[#0d1522] to-[#131f32]',
    previewCss: 'linear-gradient(135deg, #090e17 0%, #0d1522 50%, #131f32 100%)',
    text: 'text-[#f8fafc]',
    cardBg: 'bg-[#111b2b]/95',
    cardBorder: 'border-slate-700/70',
    headerBg: 'bg-[#090e17]/95 backdrop-blur-md',
    accent: '#38bdf8',
    badgeBg: 'bg-[#38bdf8]/15 text-[#38bdf8]',
    isDark: true,
    bgHex: '#090e17',
    cardBgHex: '#111b2b',
    textHex: '#f8fafc'
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Rich blue with vibrant cyan highlights',
    bgGradient: 'bg-gradient-to-b from-[#0a192f] via-[#0f2b48] to-[#163b60]',
    previewCss: 'linear-gradient(135deg, #0a192f 0%, #0f2b48 50%, #163b60 100%)',
    text: 'text-[#f0f9ff]',
    cardBg: 'bg-[#0f243d]/95',
    cardBorder: 'border-[#234e78]',
    headerBg: 'bg-[#0a192f]/95 backdrop-blur-md',
    accent: '#38bdf8',
    badgeBg: 'bg-sky-500/15 text-[#38bdf8]',
    isDark: true,
    bgHex: '#0a192f',
    cardBgHex: '#0f243d',
    textHex: '#f0f9ff'
  },
  {
    id: 'morning-mist',
    name: 'Morning Mist',
    description: 'Soft airy whisper blue with deep navy text',
    bgGradient: 'bg-gradient-to-b from-[#eaf5ff] via-[#f4f8fc] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #eaf5ff 0%, #f4f8fc 60%, #ffffff 100%)',
    text: 'text-[#0f172a]',
    cardBg: 'bg-white/95',
    cardBorder: 'border-slate-200/80',
    headerBg: 'bg-[#eaf5ff]/95 backdrop-blur-md',
    accent: '#026fc3',
    badgeBg: 'bg-sky-500/10 text-[#026fc3]',
    isDark: false,
    bgHex: '#eaf5ff',
    cardBgHex: '#ffffff',
    textHex: '#0f172a'
  },
  {
    id: 'aurora-blue',
    name: 'Aurora Blue',
    description: 'Navy with subtle royal indigo depth',
    bgGradient: 'bg-gradient-to-b from-[#0b112c] via-[#10193d] to-[#1a1e4a]',
    previewCss: 'linear-gradient(135deg, #0b112c 0%, #10193d 50%, #1a1e4a 100%)',
    text: 'text-[#f8fafc]',
    cardBg: 'bg-[#131c42]/95',
    cardBorder: 'border-[#2d3b75]',
    headerBg: 'bg-[#0b112c]/95 backdrop-blur-md',
    accent: '#60a5fa',
    badgeBg: 'bg-blue-500/15 text-[#60a5fa]',
    isDark: true,
    bgHex: '#0b112c',
    cardBgHex: '#131c42',
    textHex: '#f8fafc'
  },
  {
    id: 'cloud-light',
    name: 'Cloud Light',
    description: 'Clean pure white with soft blue accent',
    bgGradient: 'bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#ffffff]',
    previewCss: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #ffffff 100%)',
    text: 'text-[#0f172a]',
    cardBg: 'bg-white/98',
    cardBorder: 'border-slate-200/80',
    headerBg: 'bg-[#f8fafc]/95 backdrop-blur-md',
    accent: '#026fc3',
    badgeBg: 'bg-[#026fc3]/10 text-[#026fc3]',
    isDark: false,
    bgHex: '#f8fafc',
    cardBgHex: '#ffffff',
    textHex: '#0f172a'
  }
];

export const DEFAULT_THEME_ID = 'midnight-navy';

export function getThemePreset(id?: string): ThemePreset {
  if (!id) return THEME_PRESETS[0];
  // Backward compatibility aliases
  if (id === 'night-dark') return THEME_PRESETS[0];
  if (id === 'edtechra-sky') return THEME_PRESETS[4];
  return THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
}

import { isDarkBackground } from './contrastValidator';

/**
 * Checks contrast and returns guaranteed readable text color for the active theme surface
 */
export function getThemeReadableTextColor(themeId?: string, isCardSurface = true): string {
  const theme = getThemePreset(themeId);
  const surfaceHex = isCardSurface ? theme.cardBgHex : theme.bgHex;
  return isDarkBackground(surfaceHex) ? '#f8fafc' : '#0f172a';
}
