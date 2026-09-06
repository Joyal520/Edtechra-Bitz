// ============================================================================
// EDTECHRA CANVA-STYLE ASSESSMENT THEME PRESETS
// 10 Curated Visual Design Systems for Exams and Surveys
// ============================================================================

export interface AssessmentThemeConfig {
  presetId: string;
  name: string;
  category: 'academic' | 'modern' | 'playful' | 'creative' | 'dark';
  description: string;
  background: string;
  canvasBg: string;
  pageBg?: string;
  primaryColor: string;
  primaryHover: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  subtextColor: string;
  cardBg: string;
  cardBorder: string;
  cardStyle: 'elevated' | 'flat' | 'glass' | 'outlined';
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
  typography: 'sans' | 'serif' | 'mono' | 'display';
  fontFamily?: string;
  coverImageUrl?: string;
  bannerGradient: string;
  badgeStyle: string;
}

export const THEME_PRESETS: Record<string, AssessmentThemeConfig> = {
  edtechra_light: {
    presetId: 'edtechra_light',
    name: 'EdTechra Light (Default)',
    category: 'modern',
    description: 'Clean light background, pure white cards, indigo accents, and dark navy typography.',
    background: '#f8fafc',
    canvasBg: '#f8fafc',
    pageBg: '#f8fafc',
    primaryColor: '#4f46e5',
    primaryHover: '#4338ca',
    secondaryColor: '#0284c7',
    accentColor: '#10b981',
    textColor: '#0f172a',
    subtextColor: '#64748b',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardStyle: 'elevated',
    borderRadius: 'lg',
    typography: 'sans',
    bannerGradient: 'from-indigo-600 via-blue-600 to-indigo-700',
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  modern_academy: {
    presetId: 'modern_academy',
    name: 'Modern Academy',
    category: 'academic',
    description: 'Crisp deep navy, regal gold accents, and authoritative academic typography.',
    background: '#070f26',
    canvasBg: '#09132e',
    primaryColor: '#4f46e5',
    primaryHover: '#4338ca',
    secondaryColor: '#f59e0b',
    accentColor: '#38bdf8',
    textColor: '#f8fafc',
    subtextColor: '#94a3b8',
    cardBg: '#0f1b3d',
    cardBorder: 'rgba(99, 102, 241, 0.3)',
    cardStyle: 'elevated',
    borderRadius: 'lg',
    typography: 'sans',
    bannerGradient: 'from-indigo-950 via-blue-950 to-slate-950',
    badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  future_tech: {
    presetId: 'future_tech',
    name: 'Future Tech',
    category: 'modern',
    description: 'Cyberpunk dark mode with neon cyan highlights, electric purple, and high-tech borders.',
    background: '#030712',
    canvasBg: '#080f1d',
    primaryColor: '#06b6d4',
    primaryHover: '#0891b2',
    secondaryColor: '#a855f7',
    accentColor: '#10b981',
    textColor: '#f0fdf4',
    subtextColor: '#64748b',
    cardBg: '#0b1329',
    cardBorder: 'rgba(6, 182, 212, 0.4)',
    cardStyle: 'glass',
    borderRadius: 'md',
    typography: 'mono',
    bannerGradient: 'from-cyan-950 via-slate-950 to-purple-950',
    badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  kids_explorer: {
    presetId: 'kids_explorer',
    name: 'Kids Explorer',
    category: 'playful',
    description: 'Warm sunny yellow, joyful teal, rounded pill cards, and friendly typography.',
    background: '#131e33',
    canvasBg: '#182642',
    primaryColor: '#eab308',
    primaryHover: '#ca8a04',
    secondaryColor: '#06b6d4',
    accentColor: '#f97316',
    textColor: '#ffffff',
    subtextColor: '#cbd5e1',
    cardBg: '#1e3054',
    cardBorder: 'rgba(234, 179, 8, 0.4)',
    cardStyle: 'elevated',
    borderRadius: 'full',
    typography: 'display',
    bannerGradient: 'from-amber-900/60 via-yellow-950/70 to-teal-950/70',
    badgeStyle: 'bg-amber-500/25 text-amber-200 border-amber-400/50'
  },
  english_adventure: {
    presetId: 'english_adventure',
    name: 'English Adventure',
    category: 'creative',
    description: 'Warm parchment tones, classic crimson, forest green, and literary serif accents.',
    background: '#161311',
    canvasBg: '#211c18',
    primaryColor: '#e11d48',
    primaryHover: '#be123c',
    secondaryColor: '#15803d',
    accentColor: '#d97706',
    textColor: '#fef2f2',
    subtextColor: '#d6d3d1',
    cardBg: '#2b231d',
    cardBorder: 'rgba(225, 29, 72, 0.35)',
    cardStyle: 'elevated',
    borderRadius: 'lg',
    typography: 'serif',
    bannerGradient: 'from-rose-950/80 via-stone-900 to-amber-950/80',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  science_lab: {
    presetId: 'science_lab',
    name: 'Science Lab',
    category: 'academic',
    description: 'Emerald green chemistry, beaker cyan, structured grid surfaces, and high contrast.',
    background: '#051b14',
    canvasBg: '#09261c',
    primaryColor: '#10b981',
    primaryHover: '#059669',
    secondaryColor: '#0ea5e9',
    accentColor: '#84cc16',
    textColor: '#f0fdf4',
    subtextColor: '#94a3b8',
    cardBg: '#0d3628',
    cardBorder: 'rgba(16, 185, 129, 0.4)',
    cardStyle: 'flat',
    borderRadius: 'md',
    typography: 'sans',
    bannerGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  minimal_pro: {
    presetId: 'minimal_pro',
    name: 'Minimal Pro',
    category: 'modern',
    description: 'Monochrome slate, high whitespace, Swiss clarity, and refined thin borders.',
    background: '#090d16',
    canvasBg: '#0f1422',
    primaryColor: '#6366f1',
    primaryHover: '#4f46e5',
    secondaryColor: '#94a3b8',
    accentColor: '#e2e8f0',
    textColor: '#ffffff',
    subtextColor: '#94a3b8',
    cardBg: '#141b2d',
    cardBorder: 'rgba(148, 163, 184, 0.2)',
    cardStyle: 'outlined',
    borderRadius: 'sm',
    typography: 'sans',
    bannerGradient: 'from-slate-950 via-gray-950 to-slate-900',
    badgeStyle: 'bg-slate-800 text-slate-200 border-slate-700'
  },
  color_pop: {
    presetId: 'color_pop',
    name: 'Color Pop',
    category: 'playful',
    description: 'Energetic vibrant violet and coral accents, neo-brutalist cards, and high engagement.',
    background: '#15092a',
    canvasBg: '#1f0d3d',
    primaryColor: '#ec4899',
    primaryHover: '#db2777',
    secondaryColor: '#8b5cf6',
    accentColor: '#f43f5e',
    textColor: '#fdf2f8',
    subtextColor: '#e9d5ff',
    cardBg: '#2c1254',
    cardBorder: 'rgba(236, 72, 153, 0.45)',
    cardStyle: 'elevated',
    borderRadius: 'lg',
    typography: 'sans',
    bannerGradient: 'from-pink-950 via-purple-950 to-violet-950',
    badgeStyle: 'bg-pink-500/20 text-pink-300 border-pink-500/40'
  },
  nature_classroom: {
    presetId: 'nature_classroom',
    name: 'Nature Classroom',
    category: 'creative',
    description: 'Earthy sage green, warm botanical sand, tranquil atmosphere, and gentle cards.',
    background: '#0d1814',
    canvasBg: '#14241e',
    primaryColor: '#14b8a6',
    primaryHover: '#0d9488',
    secondaryColor: '#84cc16',
    accentColor: '#eab308',
    textColor: '#f0fdf4',
    subtextColor: '#a7f3d0',
    cardBg: '#1b322a',
    cardBorder: 'rgba(20, 184, 166, 0.35)',
    cardStyle: 'elevated',
    borderRadius: 'lg',
    typography: 'sans',
    bannerGradient: 'from-teal-950 via-emerald-950 to-stone-950',
    badgeStyle: 'bg-teal-500/20 text-teal-300 border-teal-500/40'
  },
  dark_premium: {
    presetId: 'dark_premium',
    name: 'Dark Premium',
    category: 'dark',
    description: 'Obsidian glass luxury, rich golden champagne accents, and sleek subdued gradients.',
    background: '#020408',
    canvasBg: '#060b14',
    primaryColor: '#f59e0b',
    primaryHover: '#d97706',
    secondaryColor: '#fbbf24',
    accentColor: '#60a5fa',
    textColor: '#ffffff',
    subtextColor: '#94a3b8',
    cardBg: '#0c1424',
    cardBorder: 'rgba(245, 158, 11, 0.3)',
    cardStyle: 'glass',
    borderRadius: 'md',
    typography: 'sans',
    bannerGradient: 'from-amber-950/60 via-slate-950 to-black',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  exam_classic: {
    presetId: 'exam_classic',
    name: 'Exam Classic',
    category: 'academic',
    description: 'Traditional standard examination palette with balanced contrast and familiar layout.',
    background: '#070e1f',
    canvasBg: '#091124',
    primaryColor: '#3b82f6',
    primaryHover: '#2563eb',
    secondaryColor: '#6366f1',
    accentColor: '#10b981',
    textColor: '#f8fafc',
    subtextColor: '#94a3b8',
    cardBg: '#0f1b3d',
    cardBorder: 'rgba(59, 130, 246, 0.3)',
    cardStyle: 'elevated',
    borderRadius: 'md',
    typography: 'sans',
    bannerGradient: 'from-blue-950 via-indigo-950 to-slate-950',
    badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  }
};

export const DEFAULT_THEME_PRESET = THEME_PRESETS.modern_academy;
