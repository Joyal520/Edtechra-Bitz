// ============================================================================
// EDTECHRA-BITZ: Centralized Knowledge Bitz Topics & Categories Configuration
// Standardized source of truth for Explore Feed, Topic Selector, and Admin
// ============================================================================

export interface BitzTopicItem {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon identifier
  color: string;
  bgGradient: string;
  description?: string;
  categoryGroup: string;
}

export interface BitzCategoryGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  topics: BitzTopicItem[];
}

export const BITZ_CATEGORY_GROUPS: BitzCategoryGroup[] = [
  {
    id: 'science_nature',
    name: 'Science & Nature',
    icon: 'Atom',
    color: '#059669',
    topics: [
      { id: 'science', name: 'Science', slug: 'science', icon: 'Sparkles', color: '#059669', bgGradient: 'from-emerald-600 to-teal-700', categoryGroup: 'Science & Nature' },
      { id: 'biology', name: 'Biology', slug: 'biology', icon: 'Dna', color: '#10b981', bgGradient: 'from-emerald-500 to-green-600', categoryGroup: 'Science & Nature' },
      { id: 'physics', name: 'Physics', slug: 'physics', icon: 'Zap', color: '#3b82f6', bgGradient: 'from-blue-600 to-cyan-600', categoryGroup: 'Science & Nature' },
      { id: 'chemistry', name: 'Chemistry', slug: 'chemistry', icon: 'FlaskConical', color: '#8b5cf6', bgGradient: 'from-purple-600 to-indigo-600', categoryGroup: 'Science & Nature' },
      { id: 'space', name: 'Space & Astronomy', slug: 'space', icon: 'Orbit', color: '#6366f1', bgGradient: 'from-indigo-600 to-purple-800', categoryGroup: 'Science & Nature' },
      { id: 'nature', name: 'Environment & Nature', slug: 'nature', icon: 'Trees', color: '#059669', bgGradient: 'from-teal-600 to-emerald-700', categoryGroup: 'Science & Nature' },
      { id: 'wildlife', name: 'Animals & Wildlife', slug: 'wildlife', icon: 'Bug', color: '#d97706', bgGradient: 'from-amber-600 to-orange-700', categoryGroup: 'Science & Nature' },
      { id: 'geography', name: 'Earth & Geography', slug: 'geography', icon: 'Globe', color: '#0284c7', bgGradient: 'from-sky-600 to-blue-700', categoryGroup: 'Science & Nature' }
    ]
  },
  {
    id: 'people_society',
    name: 'People & Society',
    icon: 'Users',
    color: '#7c3aed',
    topics: [
      { id: 'psychology', name: 'Psychology', slug: 'psychology', icon: 'Brain', color: '#db2777', bgGradient: 'from-pink-600 to-rose-700', categoryGroup: 'People & Society' },
      { id: 'sociology', name: 'Sociology', slug: 'sociology', icon: 'UserCheck', color: '#9333ea', bgGradient: 'from-purple-600 to-fuchsia-700', categoryGroup: 'People & Society' },
      { id: 'history', name: 'History', slug: 'history', icon: 'Landmark', color: '#7c3aed', bgGradient: 'from-violet-600 to-purple-800', categoryGroup: 'People & Society' },
      { id: 'culture', name: 'Culture & Society', slug: 'culture', icon: 'Smile', color: '#c026d3', bgGradient: 'from-fuchsia-600 to-pink-600', categoryGroup: 'People & Society' },
      { id: 'languages', name: 'Languages & Communication', slug: 'languages', icon: 'MessageSquare', color: '#0284c7', bgGradient: 'from-sky-600 to-indigo-600', categoryGroup: 'People & Society' },
      { id: 'civics', name: 'Politics & Civics', slug: 'civics', icon: 'Scale', color: '#475569', bgGradient: 'from-slate-600 to-slate-800', categoryGroup: 'People & Society' },
      { id: 'philosophy', name: 'Philosophy', slug: 'philosophy', icon: 'Compass', color: '#b45309', bgGradient: 'from-amber-700 to-yellow-800', categoryGroup: 'People & Society' }
    ]
  },
  {
    id: 'technology_future',
    name: 'Technology & Future',
    icon: 'Cpu',
    color: '#2563eb',
    topics: [
      { id: 'ai', name: 'Artificial Intelligence', slug: 'ai', icon: 'Sparkles', color: '#2563eb', bgGradient: 'from-blue-600 to-indigo-700', categoryGroup: 'Technology & Future' },
      { id: 'tech', name: 'Technology', slug: 'tech', icon: 'Laptop', color: '#0284c7', bgGradient: 'from-sky-600 to-cyan-700', categoryGroup: 'Technology & Future' },
      { id: 'coding', name: 'Programming & Coding', slug: 'coding', icon: 'Code', color: '#059669', bgGradient: 'from-emerald-600 to-teal-700', categoryGroup: 'Technology & Future' },
      { id: 'innovation', name: 'Future & Innovation', slug: 'innovation', icon: 'Rocket', color: '#7c3aed', bgGradient: 'from-purple-600 to-indigo-600', categoryGroup: 'Technology & Future' },
      { id: 'cybersecurity', name: 'Cybersecurity', slug: 'cybersecurity', icon: 'Shield', color: '#dc2626', bgGradient: 'from-rose-600 to-red-700', categoryGroup: 'Technology & Future' },
      { id: 'robotics', name: 'Engineering & Robotics', slug: 'robotics', icon: 'Bot', color: '#ea580c', bgGradient: 'from-orange-600 to-amber-700', categoryGroup: 'Technology & Future' }
    ]
  },
  {
    id: 'life_career',
    name: 'Life & Career',
    icon: 'Briefcase',
    color: '#d97706',
    topics: [
      { id: 'business', name: 'Business & Entrepreneurship', slug: 'business', icon: 'TrendingUp', color: '#d97706', bgGradient: 'from-amber-600 to-yellow-700', categoryGroup: 'Life & Career' },
      { id: 'economics', name: 'Economics & Money', slug: 'economics', icon: 'Coins', color: '#16a34a', bgGradient: 'from-green-600 to-emerald-700', categoryGroup: 'Life & Career' },
      { id: 'productivity', name: 'Productivity', slug: 'productivity', icon: 'CheckCircle2', color: '#0284c7', bgGradient: 'from-sky-600 to-blue-700', categoryGroup: 'Life & Career' },
      { id: 'life-skills', name: 'Life Skills', slug: 'life-skills', icon: 'Heart', color: '#e11d48', bgGradient: 'from-rose-600 to-pink-600', categoryGroup: 'Life & Career' },
      { id: 'learning', name: 'Education & Learning', slug: 'learning', icon: 'GraduationCap', color: '#4f46e5', bgGradient: 'from-indigo-600 to-blue-700', categoryGroup: 'Life & Career' }
    ]
  },
  {
    id: 'culture_fun',
    name: 'Culture & Fun',
    icon: 'Film',
    color: '#db2777',
    topics: [
      { id: 'sports', name: 'Sports', slug: 'sports', icon: 'Trophy', color: '#ea580c', bgGradient: 'from-orange-600 to-amber-600', categoryGroup: 'Culture & Fun' },
      { id: 'entertainment', name: 'Movies & Entertainment', slug: 'entertainment', icon: 'Clapperboard', color: '#e11d48', bgGradient: 'from-rose-600 to-pink-600', categoryGroup: 'Culture & Fun' },
      { id: 'art', name: 'Art & Design', slug: 'art', icon: 'Palette', color: '#9333ea', bgGradient: 'from-purple-600 to-indigo-600', categoryGroup: 'Culture & Fun' },
      { id: 'literature', name: 'Literature & Books', slug: 'literature', icon: 'BookOpen', color: '#b45309', bgGradient: 'from-amber-700 to-orange-800', categoryGroup: 'Culture & Fun' },
      { id: 'food', name: 'Food & Culture', slug: 'food', icon: 'Utensils', color: '#16a34a', bgGradient: 'from-green-600 to-teal-700', categoryGroup: 'Culture & Fun' },
      { id: 'travel', name: 'Travel & Places', slug: 'travel', icon: 'MapPin', color: '#0284c7', bgGradient: 'from-sky-600 to-cyan-700', categoryGroup: 'Culture & Fun' },
      { id: 'weird-facts', name: 'Weird Facts & Mysteries', slug: 'weird-facts', icon: 'HelpCircle', color: '#db2777', bgGradient: 'from-pink-600 to-rose-700', categoryGroup: 'Culture & Fun' }
    ]
  },
  {
    id: 'english_learning',
    name: 'English',
    icon: 'BookA',
    color: '#026fc3',
    topics: [
      { id: 'english', name: 'English Vocabulary & Idioms', slug: 'english', icon: 'BookA', color: '#026fc3', bgGradient: 'from-blue-600 to-indigo-700', categoryGroup: 'English' }
    ]
  }
];

// Flat array of all topics
export const ALL_BITZ_TOPICS: BitzTopicItem[] = BITZ_CATEGORY_GROUPS.flatMap((g) => g.topics);

// All valid topic IDs
export const ALL_BITZ_TOPIC_IDS: string[] = ALL_BITZ_TOPICS.map((t) => t.id);

// Map lookup by topic ID
export const BITZ_TOPIC_MAP: Record<string, BitzTopicItem> = ALL_BITZ_TOPICS.reduce((acc, topic) => {
  acc[topic.id] = topic;
  return acc;
}, {} as Record<string, BitzTopicItem>);

export function getTopicById(id?: string | null): BitzTopicItem {
  if (!id) return ALL_BITZ_TOPICS[0];
  return BITZ_TOPIC_MAP[id] || {
    id: id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
    slug: id,
    icon: 'Sparkles',
    color: '#026fc3',
    bgGradient: 'from-blue-600 to-indigo-700',
    categoryGroup: 'General'
  };
}
