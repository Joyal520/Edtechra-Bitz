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
  },
  {
    id: 'personal_growth',
    name: 'Personal Growth',
    slug: 'personal-growth',
    icon: 'Sprout',
    color: '#0d9488',
    bgGradient: 'from-teal-600 to-emerald-700',
    description: 'Develop a positive mindset, master productivity, build habits, and boost communication skills.',
    subtopics: [
      { id: 'mindset_habits', name: 'Mindset & Habits' },
      { id: 'motivation', name: 'Motivation' },
      { id: 'communication_growth', name: 'Communication' },
      { id: 'confidence', name: 'Confidence' },
      { id: 'learning_study', name: 'Learning & Study' },
      { id: 'productivity_growth', name: 'Productivity' },
      { id: 'emotional_skills', name: 'Emotional Skills' },
      { id: 'life_skills_growth', name: 'Life Skills' }
    ]
  },
  {
    id: 'mysteries_legends',
    name: 'Mysteries & Legends',
    slug: 'mysteries-legends',
    icon: 'HelpCircle',
    color: '#6366f1',
    bgGradient: 'from-indigo-600 to-purple-800',
    description: 'Explore ancient enigmas, mythical creatures, strange phenomena, and unsolved historical secrets.',
    subtopics: [
      { id: 'ancient_mysteries', name: 'Ancient Mysteries' },
      { id: 'legends_folklore', name: 'Legends & Folklore' },
      { id: 'unsolved_mysteries', name: 'Unsolved Mysteries' },
      { id: 'strange_places', name: 'Strange Places' },
      { id: 'lost_civilizations', name: 'Lost Civilizations' },
      { id: 'historical_mysteries', name: 'Historical Mysteries' },
      { id: 'mythical_creatures', name: 'Mythical Creatures' },
      { id: 'mysterious_events', name: 'Mysterious Events' }
    ]
  }
];

// ============================================================================
// Flat lookups — used across the app
// ============================================================================

/** All master category IDs */
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

/** Get category by ID or name with safe fallback */
export function getCategoryById(id?: string | null): BitzCategoryItem {
  if (!id) return BITZ_CATEGORIES[0];
  const clean = String(id).trim();
  if (BITZ_CATEGORY_MAP[clean]) return BITZ_CATEGORY_MAP[clean];

  // Match by category name or slug (case-insensitive)
  const lower = clean.toLowerCase();
  const match = BITZ_CATEGORIES.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      c.slug.toLowerCase() === lower ||
      c.id.toLowerCase() === lower
  );
  if (match) return match;

  // Check legacy map
  const mappedId = LEGACY_TOPIC_TO_CATEGORY_MAP[lower];
  if (mappedId && BITZ_CATEGORY_MAP[mappedId]) return BITZ_CATEGORY_MAP[mappedId];

  return {
    id: clean,
    name: clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[-_]/g, ' '),
    slug: clean.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    icon: 'Sparkles',
    color: '#026fc3',
    bgGradient: 'from-blue-600 to-indigo-700',
    description: '',
    subtopics: []
  };
}

/** Get subtopics for a given category ID or category name */
export function getSubtopicsForCategory(categoryIdOrName: string): BitzSubtopic[] {
  const cat = getCategoryById(categoryIdOrName);
  return cat?.subtopics || [];
}

/** Validate that a subtopic belongs to its claimed category (checks ID and Name, case-insensitive) */
export function isValidSubtopicForCategory(categoryIdOrName: string, subtopicIdOrName: string): boolean {
  const cat = getCategoryById(categoryIdOrName);
  if (!cat) return false;
  const clean = String(subtopicIdOrName || '').trim().toLowerCase();
  return cat.subtopics.some(
    (st) => st.id.toLowerCase() === clean || st.name.toLowerCase() === clean
  );
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
  languages: 'life_skills_english',
  // Personal Growth
  'personal-growth': 'personal_growth',
  personal_growth: 'personal_growth',
  'personal growth': 'personal_growth',
  growth: 'personal_growth',
  mindset: 'personal_growth',
  habits: 'personal_growth',
  motivation: 'personal_growth',
  confidence: 'personal_growth',
  // Mysteries & Legends
  'mysteries-legends': 'mysteries_legends',
  mysteries_legends: 'mysteries_legends',
  'mysteries & legends': 'mysteries_legends',
  'mysteries and legends': 'mysteries_legends',
  mysteries: 'mysteries_legends',
  legends: 'mysteries_legends',
  folklore: 'mysteries_legends',
  myths: 'mysteries_legends',
  unsolved: 'mysteries_legends'
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

/**
 * Authoritatively resolves any Knowledge Bitz item or category string to one of the 12 canonical category IDs.
 * Returns null if the item cannot be reliably mapped to any canonical category.
 *
 * Evaluation order:
 * 1. Matches bitz.category against canonical names, IDs, or slugs (exact, case-insensitive).
 * 2. Checks LEGACY_TOPIC_TO_CATEGORY_MAP for bitz.category.
 * 3. Checks ALL_BITZ_SUBTOPICS for bitz.category or bitz.sub_topic.
 * 4. Checks bitz.topic_id ONLY if category was not provided or didn't match.
 * (Never uses substring includes("") which causes false-positive cross-category matches).
 */
export function resolveBitzCanonicalCategory(
  itemOrCategory: { category?: string | null; topic_id?: string | null; sub_topic?: string | null } | string | null | undefined
): string | null {
  if (!itemOrCategory) return null;

  let rawCat = '';
  let rawSub = '';
  let rawTopic = '';

  if (typeof itemOrCategory === 'string') {
    rawCat = itemOrCategory.trim();
  } else {
    rawCat = (itemOrCategory.category || '').trim();
    rawSub = (itemOrCategory.sub_topic || '').trim();
    rawTopic = (itemOrCategory.topic_id || '').trim();
  }

  // 1. Check direct category match
  if (rawCat) {
    const catLower = rawCat.toLowerCase();
    const catMatch = BITZ_CATEGORIES.find(
      (c) =>
        c.name.toLowerCase() === catLower ||
        c.id.toLowerCase() === catLower ||
        c.slug.toLowerCase() === catLower
    );
    if (catMatch) return catMatch.id;

    if (LEGACY_TOPIC_TO_CATEGORY_MAP[catLower]) {
      return LEGACY_TOPIC_TO_CATEGORY_MAP[catLower];
    }
  }

  // 2. Check subtopic match
  if (rawSub) {
    const subLower = rawSub.toLowerCase();
    const subMatch = ALL_BITZ_SUBTOPICS.find(
      (st) =>
        st.subtopicId.toLowerCase() === subLower ||
        st.subtopicName.toLowerCase() === subLower
    );
    if (subMatch) return subMatch.categoryId;
  }

  // Also check if rawCat was a subtopic name
  if (rawCat) {
    const catLower = rawCat.toLowerCase();
    const subMatch = ALL_BITZ_SUBTOPICS.find(
      (st) =>
        st.subtopicId.toLowerCase() === catLower ||
        st.subtopicName.toLowerCase() === catLower
    );
    if (subMatch) return subMatch.categoryId;
  }

  // 3. Check topic_id if category was not specified or did not match
  if (rawTopic) {
    const topicLower = rawTopic.toLowerCase();
    const topicMatch = BITZ_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === topicLower ||
        c.slug.toLowerCase() === topicLower ||
        c.name.toLowerCase() === topicLower
    );
    if (topicMatch) return topicMatch.id;

    if (LEGACY_TOPIC_TO_CATEGORY_MAP[topicLower]) {
      return LEGACY_TOPIC_TO_CATEGORY_MAP[topicLower];
    }
  }

  return null;
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
