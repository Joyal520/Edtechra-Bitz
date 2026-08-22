// ============================================================================
// EDTECHRA-BITZ: Default Avatar Presets
// ============================================================================

export interface AvatarPreset {
  id: string;
  label: string;
  emoji: string;
  bgColor: string;
  url: string;
}

export const DEFAULT_AVATARS: AvatarPreset[] = [
  {
    id: 'avatar-scholar',
    label: 'Scholar',
    emoji: '🎓',
    bgColor: 'from-blue-600 to-indigo-700',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'avatar-explorer',
    label: 'Explorer',
    emoji: '🚀',
    bgColor: 'from-amber-500 to-orange-600',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'avatar-genius',
    label: 'Genius',
    emoji: '💡',
    bgColor: 'from-emerald-500 to-teal-700',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'avatar-curious',
    label: 'Curious Mind',
    emoji: '🔬',
    bgColor: 'from-purple-600 to-pink-600',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'avatar-creative',
    label: 'Creative',
    emoji: '🎨',
    bgColor: 'from-rose-500 to-red-600',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'avatar-champion',
    label: 'Champion',
    emoji: '🏆',
    bgColor: 'from-cyan-500 to-blue-600',
    url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80'
  }
];
