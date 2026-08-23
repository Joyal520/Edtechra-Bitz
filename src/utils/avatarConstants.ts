// ============================================================================
// EDTECHRA-BITZ: Default Avatar Presets (Expanded Diverse Library)
// Professional, friendly, modern avatars for students, teachers, and learners
// ============================================================================

export type AvatarCategory = 'all' | 'students' | 'educators' | 'creative' | 'bots' | 'photo';

export interface AvatarPreset {
  id: string;
  label: string;
  category: 'cartoon' | 'photo'; // Backward compatibility
  group: 'students' | 'educators' | 'creative' | 'bots' | 'photo';
  gender?: 'male' | 'female' | 'neutral';
  emoji: string;
  bgColor: string;
  url: string;
}

export const AVATAR_CATEGORY_TABS: { id: AvatarCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'students', label: 'Students', icon: '🎒' },
  { id: 'educators', label: 'Educators', icon: '🎓' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'bots', label: 'Bots & AI', icon: '🤖' },
  { id: 'photo', label: 'Portraits', icon: '📸' }
];

export const DEFAULT_AVATARS: AvatarPreset[] = [
  // =========================================================================
  // 1. STUDENTS & YOUNG LEARNERS (Diverse hairstyles, clothing, accessories)
  // =========================================================================
  {
    id: 'student-felix',
    label: 'Felix',
    category: 'cartoon',
    group: 'students',
    gender: 'male',
    emoji: '🎒',
    bgColor: 'from-amber-400 to-orange-500',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix'
  },
  {
    id: 'student-zoe',
    label: 'Zoe',
    category: 'cartoon',
    group: 'students',
    gender: 'female',
    emoji: '📚',
    bgColor: 'from-blue-500 to-indigo-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe'
  },
  {
    id: 'student-leo',
    label: 'Leo',
    category: 'cartoon',
    group: 'students',
    gender: 'male',
    emoji: '🧭',
    bgColor: 'from-emerald-500 to-teal-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Leo'
  },
  {
    id: 'student-maya',
    label: 'Maya',
    category: 'cartoon',
    group: 'students',
    gender: 'female',
    emoji: '🌟',
    bgColor: 'from-pink-500 to-rose-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Maya'
  },
  {
    id: 'student-ethan',
    label: 'Ethan',
    category: 'cartoon',
    group: 'students',
    gender: 'male',
    emoji: '🎧',
    bgColor: 'from-cyan-500 to-blue-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Ethan'
  },
  {
    id: 'student-aria',
    label: 'Aria',
    category: 'cartoon',
    group: 'students',
    gender: 'female',
    emoji: '💡',
    bgColor: 'from-purple-400 to-pink-500',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Aria'
  },
  {
    id: 'student-marcus',
    label: 'Marcus',
    category: 'cartoon',
    group: 'students',
    gender: 'male',
    emoji: '🚀',
    bgColor: 'from-teal-500 to-emerald-700',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Marcus'
  },
  {
    id: 'student-zara',
    label: 'Zara',
    category: 'cartoon',
    group: 'students',
    gender: 'female',
    emoji: '✨',
    bgColor: 'from-amber-400 to-yellow-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Zara'
  },
  {
    id: 'student-lucas',
    label: 'Lucas',
    category: 'cartoon',
    group: 'students',
    gender: 'male',
    emoji: '🔭',
    bgColor: 'from-indigo-400 to-sky-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Lucas'
  },
  {
    id: 'student-amara',
    label: 'Amara',
    category: 'cartoon',
    group: 'students',
    gender: 'female',
    emoji: '🌺',
    bgColor: 'from-rose-400 to-purple-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Amara'
  },
  {
    id: 'student-kai',
    label: 'Kai',
    category: 'cartoon',
    group: 'students',
    gender: 'male',
    emoji: '⚡',
    bgColor: 'from-sky-400 to-teal-500',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Kai'
  },
  {
    id: 'student-elena',
    label: 'Elena',
    category: 'cartoon',
    group: 'students',
    gender: 'female',
    emoji: '📖',
    bgColor: 'from-violet-400 to-purple-600',
    url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Elena'
  },

  // =========================================================================
  // 2. EDUCATORS, TEACHERS & SCHOLARS (Professional, friendly, modern attire)
  // =========================================================================
  {
    id: 'educator-prof-alex',
    label: 'Prof. Alex',
    category: 'cartoon',
    group: 'educators',
    gender: 'male',
    emoji: '🎓',
    bgColor: 'from-slate-700 to-blue-900',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=ProfAlex'
  },
  {
    id: 'educator-dr-sarah',
    label: 'Dr. Sarah',
    category: 'cartoon',
    group: 'educators',
    gender: 'female',
    emoji: '🔬',
    bgColor: 'from-teal-600 to-emerald-800',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=DrSarah'
  },
  {
    id: 'educator-teacher-grace',
    label: 'Grace (Teacher)',
    category: 'cartoon',
    group: 'educators',
    gender: 'female',
    emoji: '📐',
    bgColor: 'from-purple-600 to-indigo-800',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=TeacherGrace'
  },
  {
    id: 'educator-mentor-david',
    label: 'David (Mentor)',
    category: 'cartoon',
    group: 'educators',
    gender: 'male',
    emoji: '💼',
    bgColor: 'from-amber-600 to-orange-800',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=MentorDavid'
  },
  {
    id: 'educator-coach-sam',
    label: 'Coach Sam',
    category: 'cartoon',
    group: 'educators',
    gender: 'male',
    emoji: '🏆',
    bgColor: 'from-blue-600 to-cyan-800',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CoachSam'
  },
  {
    id: 'educator-scholar-maya',
    label: 'Scholar Maya',
    category: 'cartoon',
    group: 'educators',
    gender: 'female',
    emoji: '🧠',
    bgColor: 'from-rose-600 to-pink-800',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=ScholarMaya'
  },
  {
    id: 'educator-tutor-james',
    label: 'James (Instructor)',
    category: 'cartoon',
    group: 'educators',
    gender: 'male',
    emoji: '📜',
    bgColor: 'from-emerald-600 to-teal-800',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=InstructorJames'
  },
  {
    id: 'educator-tutor-elena',
    label: 'Elena (Tutor)',
    category: 'cartoon',
    group: 'educators',
    gender: 'female',
    emoji: '🌍',
    bgColor: 'from-indigo-600 to-violet-800',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=TutorElena'
  },

  // =========================================================================
  // 3. CREATIVE & ARTISTIC EXPRESSIONS (Soft anime, character illustrations)
  // =========================================================================
  {
    id: 'creative-sophia',
    label: 'Sophia',
    category: 'cartoon',
    group: 'creative',
    gender: 'female',
    emoji: '🌸',
    bgColor: 'from-purple-400 to-pink-500',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Sophia'
  },
  {
    id: 'creative-oliver',
    label: 'Oliver',
    category: 'cartoon',
    group: 'creative',
    gender: 'male',
    emoji: '✨',
    bgColor: 'from-cyan-400 to-blue-500',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Oliver'
  },
  {
    id: 'creative-caleb',
    label: 'Caleb',
    category: 'cartoon',
    group: 'creative',
    gender: 'male',
    emoji: '🎸',
    bgColor: 'from-amber-500 to-orange-600',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Caleb'
  },
  {
    id: 'creative-hana',
    label: 'Hana',
    category: 'cartoon',
    group: 'creative',
    gender: 'female',
    emoji: '🎨',
    bgColor: 'from-pink-400 to-rose-500',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Hana'
  },
  {
    id: 'creative-mateo',
    label: 'Mateo',
    category: 'cartoon',
    group: 'creative',
    gender: 'male',
    emoji: '📷',
    bgColor: 'from-emerald-400 to-teal-600',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Mateo'
  },
  {
    id: 'creative-rin',
    label: 'Rin',
    category: 'cartoon',
    group: 'creative',
    gender: 'female',
    emoji: '💫',
    bgColor: 'from-sky-400 to-indigo-500',
    url: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Rin'
  },
  {
    id: 'creative-max',
    label: 'Max',
    category: 'cartoon',
    group: 'creative',
    gender: 'male',
    emoji: '😎',
    bgColor: 'from-yellow-400 to-amber-500',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Max'
  },
  {
    id: 'creative-chloe',
    label: 'Chloe',
    category: 'cartoon',
    group: 'creative',
    gender: 'female',
    emoji: '💡',
    bgColor: 'from-teal-400 to-emerald-600',
    url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Chloe'
  },

  // =========================================================================
  // 4. TECH, AI LEARNING BOTS & FUN MASCOTS
  // =========================================================================
  {
    id: 'bot-bitz',
    label: 'Bitz Bot',
    category: 'cartoon',
    group: 'bots',
    gender: 'neutral',
    emoji: '🤖',
    bgColor: 'from-blue-500 to-cyan-500',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=BitzBot'
  },
  {
    id: 'bot-sparky',
    label: 'Sparky',
    category: 'cartoon',
    group: 'bots',
    gender: 'neutral',
    emoji: '⚡',
    bgColor: 'from-indigo-500 to-purple-600',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Sparky'
  },
  {
    id: 'bot-gizmo',
    label: 'Gizmo',
    category: 'cartoon',
    group: 'bots',
    gender: 'neutral',
    emoji: '⚙️',
    bgColor: 'from-sky-400 to-blue-600',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Gizmo'
  },
  {
    id: 'bot-byte',
    label: 'Byte',
    category: 'cartoon',
    group: 'bots',
    gender: 'neutral',
    emoji: '💾',
    bgColor: 'from-emerald-500 to-teal-600',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Byte'
  },
  {
    id: 'bot-quantum',
    label: 'Quantum',
    category: 'cartoon',
    group: 'bots',
    gender: 'neutral',
    emoji: '🔮',
    bgColor: 'from-purple-500 to-pink-600',
    url: 'https://api.dicebear.com/9.x/bottts/svg?seed=Quantum'
  },
  {
    id: 'bot-champion-star',
    label: 'Champion Star',
    category: 'cartoon',
    group: 'bots',
    gender: 'neutral',
    emoji: '🌟',
    bgColor: 'from-amber-300 to-yellow-500',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Champion'
  },
  {
    id: 'bot-scholar-smile',
    label: 'Happy Genius',
    category: 'cartoon',
    group: 'bots',
    gender: 'neutral',
    emoji: '😄',
    bgColor: 'from-emerald-300 to-teal-500',
    url: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=Scholar'
  },

  // =========================================================================
  // 5. HIGH-QUALITY REALISTIC PORTRAITS (Diverse ages, genders, styles)
  // =========================================================================
  {
    id: 'photo-scholar-1',
    label: 'Scholar Clara',
    category: 'photo',
    group: 'photo',
    gender: 'female',
    emoji: '🎓',
    bgColor: 'from-blue-600 to-indigo-700',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-explorer-1',
    label: 'Explorer Aaron',
    category: 'photo',
    group: 'photo',
    gender: 'male',
    emoji: '🚀',
    bgColor: 'from-amber-500 to-orange-600',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-genius-1',
    label: 'Genius Naomi',
    category: 'photo',
    group: 'photo',
    gender: 'female',
    emoji: '💡',
    bgColor: 'from-emerald-500 to-teal-700',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-curious-1',
    label: 'Curious Daniel',
    category: 'photo',
    group: 'photo',
    gender: 'male',
    emoji: '🔬',
    bgColor: 'from-purple-600 to-pink-600',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-creative-1',
    label: 'Creative Lina',
    category: 'photo',
    group: 'photo',
    gender: 'female',
    emoji: '🎨',
    bgColor: 'from-rose-500 to-red-600',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-champion-1',
    label: 'Champion Malik',
    category: 'photo',
    group: 'photo',
    gender: 'male',
    emoji: '🏆',
    bgColor: 'from-cyan-500 to-blue-600',
    url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-innovator-1',
    label: 'Innovator Priya',
    category: 'photo',
    group: 'photo',
    gender: 'female',
    emoji: '💻',
    bgColor: 'from-teal-500 to-cyan-700',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'photo-leader-1',
    label: 'Leader Eric',
    category: 'photo',
    group: 'photo',
    gender: 'male',
    emoji: '👔',
    bgColor: 'from-slate-600 to-slate-800',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  }
];
