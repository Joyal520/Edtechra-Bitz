// ============================================================================
// EDTECHRA-BITZ: Centralized Knowledge Bitz Categories & Subtopics Configuration
// 10 Main Categories — User-facing feed exposes ONLY the 10 broad categories.
// Subtopics are used for admin content creation and internal categorization.
// ============================================================================

export interface BitzSubtopic {
  id: string;
  name: string;
  description?: string;
}

export interface BitzCategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  bgGradient: string;
  description: string;
  subtopics: BitzSubtopic[];
}

/**
 * The ONLY 10 user-facing main categories.
 * Subtopics are used internally for admin content creation & filtering.
 */
export const BITZ_CATEGORIES: BitzCategoryItem[] = [
  {
    id: 'science_nature',
    name: 'Science & Nature',
    slug: 'science-nature',
    icon: 'Atom',
    color: '#059669',
    bgGradient: 'from-emerald-600 to-teal-700',
    description: 'Explore the wonders of physics, biology, chemistry, and the natural world.',
    subtopics: [
      { id: 'general_science', name: 'General Science' },
      { id: 'biology', name: 'Biology & Life Sciences' },
      { id: 'physics', name: 'Physics' },
      { id: 'chemistry', name: 'Chemistry' },
      { id: 'space', name: 'Space & Astronomy' },
      { id: 'environment', name: 'Environment & Ecology' },
      { id: 'animals', name: 'Animals & Wildlife' }
    ]
  },
  {
    id: 'people_psychology',
    name: 'People & Psychology',
    slug: 'people-psychology',
    icon: 'Brain',
    color: '#db2777',
    bgGradient: 'from-pink-600 to-rose-700',
    description: 'Understand the human mind, behaviour, emotions, and social dynamics.',
    subtopics: [
      { id: 'psychology', name: 'Psychology' },
      { id: 'sociology', name: 'Sociology & Society' },
      { id: 'philosophy', name: 'Philosophy & Ethics' },
      { id: 'human_behaviour', name: 'Human Behaviour' }
    ]
  },
  {
    id: 'history_culture',
    name: 'History & Culture',
    slug: 'history-culture',
    icon: 'Landmark',
    color: '#7c3aed',
    bgGradient: 'from-violet-600 to-purple-800',
    description: 'Journey through time — from ancient civilizations to legendary myths and unsolved mysteries.',
    subtopics: [
      { id: 'world_history', name: 'World History', description: 'The fall of empires, important historical events, famous historical people.' },
      { id: 'ancient_civilizations', name: 'Ancient Civilizations', description: 'Ancient Egypt, Maya, Roman, Greek, Indus Valley, and more.' },
      { id: 'myths_legends', name: 'Myths & Legends', description: 'King Arthur, Atlantis, legendary creatures, and famous myths.' },
      { id: 'mysteries_unsolved', name: 'Mysteries & Unsolved', description: 'Bermuda Triangle, Voynich Manuscript, unexplained discoveries.' },
      { id: 'culture_traditions', name: 'Culture & Traditions', description: 'Festivals, traditional customs, food traditions, and social traditions.' }
    ]
  },
  {
    id: 'technology_ai',
    name: 'Technology & AI',
    slug: 'technology-ai',
    icon: 'Cpu',
    color: '#2563eb',
    bgGradient: 'from-blue-600 to-indigo-700',
    description: 'Discover how technology, AI, coding, and innovation shape our future.',
    subtopics: [
      { id: 'artificial_intelligence', name: 'Artificial Intelligence' },
      { id: 'general_technology', name: 'Technology & Gadgets' },
      { id: 'programming', name: 'Programming & Coding' },
      { id: 'cybersecurity', name: 'Cybersecurity' },
      { id: 'robotics', name: 'Engineering & Robotics' },
      { id: 'innovation', name: 'Future & Innovation' }
    ]
  },
  {
    id: 'business_economics',
    name: 'Business & Economics',
    slug: 'business-economics',
    icon: 'TrendingUp',
    color: '#d97706',
    bgGradient: 'from-amber-600 to-yellow-700',
    description: 'Learn about money, markets, entrepreneurship, and global economics.',
    subtopics: [
      { id: 'business', name: 'Business & Entrepreneurship' },
      { id: 'economics', name: 'Economics & Finance' },
      { id: 'productivity', name: 'Productivity & Management' }
    ]
  },
  {
    id: 'health_body',
    name: 'Health & Human Body',
    slug: 'health-body',
    icon: 'HeartPulse',
    color: '#e11d48',
    bgGradient: 'from-rose-600 to-red-700',
    description: 'Understand human anatomy, nutrition, medicine, and wellness.',
    subtopics: [
      { id: 'anatomy', name: 'Human Anatomy' },
      { id: 'nutrition', name: 'Nutrition & Diet' },
      { id: 'medicine', name: 'Medicine & Health' },
      { id: 'wellness', name: 'Mental & Physical Wellness' }
    ]
  },
  {
    id: 'world_geography',
    name: 'World & Geography',
    slug: 'world-geography',
    icon: 'Globe',
    color: '#0284c7',
    bgGradient: 'from-sky-600 to-blue-700',
    description: 'Travel the world through facts about countries, oceans, mountains, and climates.',
    subtopics: [
      { id: 'geography', name: 'Earth & Geography' },
      { id: 'countries', name: 'Countries & Cultures' },
      { id: 'travel', name: 'Travel & Places' },
      { id: 'oceans', name: 'Oceans & Climate' }
    ]
  },
  {
    id: 'arts_entertainment',
    name: 'Arts, Books & Entertainment',
    slug: 'arts-entertainment',
    icon: 'Palette',
    color: '#9333ea',
    bgGradient: 'from-purple-600 to-indigo-600',
    description: 'Dive into art, literature, cinema, music, and the creative world.',
    subtopics: [
      { id: 'art', name: 'Art & Design' },
      { id: 'literature', name: 'Literature & Books' },
      { id: 'entertainment', name: 'Movies & Entertainment' },
      { id: 'music', name: 'Music' },
      { id: 'food_culture', name: 'Food & Culture' }
    ]
  },
  {
    id: 'sports_games',
    name: 'Sports & Games',
    slug: 'sports-games',
    icon: 'Trophy',
    color: '#ea580c',
    bgGradient: 'from-orange-600 to-amber-600',
    description: 'Explore the world of sports, games, competition, and athletics.',
    subtopics: [
      { id: 'sports', name: 'Sports' },
      { id: 'olympics', name: 'Olympics & World Records' },
      { id: 'board_games', name: 'Games & Puzzles' }
    ]
  },
  {
    id: 'life_skills_english',
    name: 'Life Skills & English',
    slug: 'life-skills-english',
    icon: 'BookOpen',
    color: '#026fc3',
    bgGradient: 'from-blue-600 to-indigo-700',
    description: 'Practical life skills, vocabulary, idioms, and English language mastery.',
    subtopics: [
      { id: 'english_vocabulary', name: 'English Vocabulary & Idioms' },
      { id: 'life_skills', name: 'Life Skills' },
      { id: 'education', name: 'Education & Learning' },
      { id: 'communication', name: 'Languages & Communication' }
    ]
  }
];

// ============================================================================
// Flat lookups — used across the app
// ============================================================================

/** All 10 main category IDs */
export const ALL_BITZ_CATEGORY_IDS: string[] = BITZ_CATEGORIES.map((c) => c.id);

/** Flat array of all subtopics across all categories */
export const ALL_BITZ_SUBTOPICS: { categoryId: string; subtopicId: string; subtopicName: string }[] =
  BITZ_CATEGORIES.flatMap((cat) =>
    cat.subtopics.map((st) => ({
      categoryId: cat.id,
      subtopicId: st.id,
      subtopicName: st.name
    }))
  );

/** Map: category ID → BitzCategoryItem */
export const BITZ_CATEGORY_MAP: Record<string, BitzCategoryItem> = Object.fromEntries(
  BITZ_CATEGORIES.map((c) => [c.id, c])
);

/** Map: subtopic ID → parent category ID */
export const SUBTOPIC_TO_CATEGORY_MAP: Record<string, string> = Object.fromEntries(
  ALL_BITZ_SUBTOPICS.map((st) => [st.subtopicId, st.categoryId])
);

/** Get category by ID with safe fallback */
export function getCategoryById(id?: string | null): BitzCategoryItem {
  if (!id) return BITZ_CATEGORIES[0];
  return BITZ_CATEGORY_MAP[id] || {
    id: id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, ' '),
    slug: id,
    icon: 'Sparkles',
    color: '#026fc3',
    bgGradient: 'from-blue-600 to-indigo-700',
    description: '',
    subtopics: []
  };
}

/** Get subtopics for a given category ID */
export function getSubtopicsForCategory(categoryId: string): BitzSubtopic[] {
  const cat = BITZ_CATEGORY_MAP[categoryId];
  return cat?.subtopics || [];
}

/** Validate that a subtopic belongs to its claimed category */
export function isValidSubtopicForCategory(categoryId: string, subtopicId: string): boolean {
  const cat = BITZ_CATEGORY_MAP[categoryId];
  if (!cat) return false;
  return cat.subtopics.some((st) => st.id === subtopicId);
}

// ============================================================================
// BACKWARD COMPATIBILITY — Map old topic_id values → new category IDs
// Old system had 28 subtopics stored as topic_id; map them to the 10 categories.
// ============================================================================

export const LEGACY_TOPIC_TO_CATEGORY_MAP: Record<string, string> = {
  // Science & Nature
  science: 'science_nature',
  biology: 'science_nature',
  physics: 'science_nature',
  chemistry: 'science_nature',
  space: 'science_nature',
  nature: 'science_nature',
  wildlife: 'science_nature',
  // People & Psychology
  psychology: 'people_psychology',
  sociology: 'people_psychology',
  philosophy: 'people_psychology',
  // History & Culture
  history: 'history_culture',
  culture: 'history_culture',
  civics: 'history_culture',
  // Technology & AI
  ai: 'technology_ai',
  tech: 'technology_ai',
  coding: 'technology_ai',
  innovation: 'technology_ai',
  cybersecurity: 'technology_ai',
  robotics: 'technology_ai',
  // Business & Economics
  business: 'business_economics',
  economics: 'business_economics',
  productivity: 'business_economics',
  // World & Geography
  geography: 'world_geography',
  travel: 'world_geography',
  // Arts, Books & Entertainment
  entertainment: 'arts_entertainment',
  art: 'arts_entertainment',
  literature: 'arts_entertainment',
  food: 'arts_entertainment',
  // Sports & Games
  sports: 'sports_games',
  'weird-facts': 'arts_entertainment',
  // Life Skills & English
  'life-skills': 'life_skills_english',
  learning: 'life_skills_english',
  english: 'life_skills_english',
  languages: 'life_skills_english'
};

/**
 * Resolve any topic_id or category value to a valid main category ID.
 * Works for both new category IDs and legacy topic_id strings.
 */
export function resolveCategoryId(value?: string | null): string {
  if (!value) return 'science_nature';
  // Already a valid new category ID
  if (BITZ_CATEGORY_MAP[value]) return value;
  // Legacy topic_id → new category
  if (LEGACY_TOPIC_TO_CATEGORY_MAP[value]) return LEGACY_TOPIC_TO_CATEGORY_MAP[value];
  // Try matching by category name
  const match = BITZ_CATEGORIES.find(
    (c) => c.name.toLowerCase() === value.toLowerCase() || c.slug === value
  );
  if (match) return match.id;
  return 'science_nature';
}

// ============================================================================
// BACKWARD COMPAT EXPORTS — Keep old names working for existing imports
// These are used by existing components that import these symbols.
// ============================================================================

/** @deprecated Use BITZ_CATEGORIES instead */
export const BITZ_CATEGORY_GROUPS = BITZ_CATEGORIES;

/** @deprecated Use BITZ_CATEGORIES instead */
export const ALL_BITZ_TOPICS = BITZ_CATEGORIES;

/** @deprecated Use ALL_BITZ_CATEGORY_IDS instead */
export const ALL_BITZ_TOPIC_IDS = ALL_BITZ_CATEGORY_IDS;

/** @deprecated Use getCategoryById instead */
export function getTopicById(id?: string | null): BitzCategoryItem {
  if (!id) return BITZ_CATEGORIES[0];
  // Check new category IDs first
  if (BITZ_CATEGORY_MAP[id]) return BITZ_CATEGORY_MAP[id];
  // Check legacy topic_id → new category
  const mappedId = LEGACY_TOPIC_TO_CATEGORY_MAP[id];
  if (mappedId && BITZ_CATEGORY_MAP[mappedId]) return BITZ_CATEGORY_MAP[mappedId];
  // Fallback
  return {
    id: id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]/g, ' '),
    slug: id,
    icon: 'Sparkles',
    color: '#026fc3',
    bgGradient: 'from-blue-600 to-indigo-700',
    description: '',
    subtopics: []
  };
}

/** @deprecated Use BITZ_CATEGORY_MAP instead */
export const BITZ_TOPIC_MAP = BITZ_CATEGORY_MAP;
