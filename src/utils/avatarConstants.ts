// ============================================================================
// EDTECHRA-BITZ: Default Avatar Presets (Cartoon & Photo Libraries)
// ============================================================================

export interface AvatarPreset {
  id: string;
  label: string;
  category: 'cartoon' | 'photo';
  emoji: string;
  bgColor: string;
  url: string;
}

export const DEFAULT_AVATARS: AvatarPreset[] = [
  // --- CARTOON & ILLUSTRATED AVATARS (Free Open-Source DiceBear Library) ---
  {
    id: 'cartoon-adventurer-1',
    label: 'Hero Felix',
    category: 'cartoon',
    emoji: '🦸',
    bgColor: 'from-amber-400 to-orange-500',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix'
  },
  {
    id: 'cartoon-adventurer-2',
    label: 'Scholar Zoe',
    category: 'cartoon',
    emoji: '🎓',
    bgColor: 'from-blue-500 to-indigo-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe'
  },
  {
    id: 'cartoon-adventurer-3',
    label: 'Explorer Leo',
    category: 'cartoon',
    emoji: '🧭',
    bgColor: 'from-emerald-500 to-teal-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo'
  },
  {
    id: 'cartoon-adventurer-4',
    label: 'Creative Maya',
    category: 'cartoon',
    emoji: '🎨',
    bgColor: 'from-pink-500 to-rose-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Maya'
  },
  {
    id: 'cartoon-lorelei-1',
    label: 'Gentle Sophia',
    category: 'cartoon',
    emoji: '🌸',
    bgColor: 'from-purple-400 to-pink-500',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Sophia'
  },
  {
    id: 'cartoon-lorelei-2',
    label: 'Bright Oliver',
    category: 'cartoon',
    emoji: '✨',
    bgColor: 'from-cyan-400 to-blue-500',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Oliver'
  },
  {
    id: 'cartoon-avataaars-1',
    label: 'Cool Max',
    category: 'cartoon',
    emoji: '😎',
    bgColor: 'from-yellow-400 to-amber-500',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Max'
  },
  {
    id: 'cartoon-avataaars-2',
    label: 'Smart Chloe',
    category: 'cartoon',
    emoji: '💡',
    bgColor: 'from-teal-400 to-emerald-600',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chloe'
  },
  {
    id: 'cartoon-bottts-1',
    label: 'Bot Sparky',
    category: 'cartoon',
    emoji: '🤖',
    bgColor: 'from-indigo-500 to-purple-600',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Sparky'
  },
  {
    id: 'cartoon-bottts-2',
    label: 'Bot Gizmo',
    category: 'cartoon',
    emoji: '⚡',
    bgColor: 'from-sky-400 to-blue-600',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Gizmo'
  },
  {
    id: 'cartoon-emoji-1',
    label: 'Star Winner',
    category: 'cartoon',
    emoji: '🌟',
    bgColor: 'from-amber-300 to-yellow-500',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Champion'
  },
  {
    id: 'cartoon-emoji-2',
    label: 'Happy Genius',
    category: 'cartoon',
    emoji: '😄',
    bgColor: 'from-emerald-300 to-teal-500',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Scholar'
  },

  // --- PHOTO PORTRAITS ---
  {
    id: 'photo-scholar',
    label: 'Scholar',
    category: 'photo',
    emoji: '🎓',
    bgColor: 'from-blue-600 to-indigo-700',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-explorer',
    label: 'Explorer',
    category: 'photo',
    emoji: '🚀',
    bgColor: 'from-amber-500 to-orange-600',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-genius',
    label: 'Genius',
    category: 'photo',
    emoji: '💡',
    bgColor: 'from-emerald-500 to-teal-700',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-curious',
    label: 'Curious',
    category: 'photo',
    emoji: '🔬',
    bgColor: 'from-purple-600 to-pink-600',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-creative',
    label: 'Creative',
    category: 'photo',
    emoji: '🎨',
    bgColor: 'from-rose-500 to-red-600',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-champion',
    label: 'Champion',
    category: 'photo',
    emoji: '🏆',
    bgColor: 'from-cyan-500 to-blue-600',
    url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80'
  }
];
