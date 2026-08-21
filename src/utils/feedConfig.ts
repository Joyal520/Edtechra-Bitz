// ============================================================================
// EDTECHRA-BITZ: Feed Configuration & Category-Aware Shorts Rotation
// ============================================================================

import type { YouTubeShort } from '@/types';

export const FEED_CONFIG = {
  // Shorts insertion & category rotation rules
  SHORT_CATEGORY_COOLDOWN: 2,
  SHORT_FEED_INTERVAL_MIN: 4,
  SHORT_FEED_INTERVAL_MAX: 6,

  // Standard educational categories
  SHORT_CATEGORIES: [
    'General',
    'Science',
    'Technology',
    'AI',
    'History',
    'Math',
    'English',
    'Space',
    'Nature',
    'Psychology',
    'Life Skills',
    'Geography',
    'Mysteries'
  ] as const
} as const;

export interface CategoryRotationResult {
  selectedShort: YouTubeShort | null;
  updatedRecentCategories: string[];
}

/**
 * Normalizes category name for robust comparison
 */
export function normalizeCategory(category?: string | null): string {
  if (!category || typeof category !== 'string') return 'General';
  const trimmed = category.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Selects the next eligible YouTube Short following Category-First Fair Rotation
 * and Category Cooldown rules.
 *
 * @param publishedShorts Pool of published shorts available for the feed
 * @param shownShortIds Set of video/short IDs already displayed in the current feed session
 * @param recentCategories Array of recently displayed categories in chronological order
 * @param cooldown Number of distinct non-matching category shorts required before a category repeats (default: 2)
 */
export function selectNextRotatedShort(
  publishedShorts: YouTubeShort[],
  shownShortIds: Set<string>,
  recentCategories: string[],
  cooldown: number = FEED_CONFIG.SHORT_CATEGORY_COOLDOWN
): CategoryRotationResult {
  if (!publishedShorts || publishedShorts.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  // 1. Filter out shorts that have already been shown in this session (Duplicate Prevention)
  const unshownShorts = publishedShorts.filter(
    (s) => s.is_published && !shownShortIds.has(s.id) && !shownShortIds.has(s.youtube_video_id)
  );

  // If all shorts have been shown, return null (prevent duplicate shorts)
  if (unshownShorts.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  // 2. Group unshown shorts by category
  const categoryMap = new Map<string, YouTubeShort[]>();
  for (const short of unshownShorts) {
    const cat = normalizeCategory(short.category);
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat)!.push(short);
  }

  const availableCategories = Array.from(categoryMap.keys());
  if (availableCategories.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  // 3. Determine categories on cooldown (the last N categories in recent history)
  const effectiveCooldown = Math.max(1, cooldown);
  const cooldownWindow = recentCategories.slice(-effectiveCooldown).map(normalizeCategory);
  const cooldownSet = new Set(cooldownWindow);

  // 4. Eligible categories: categories with available unshown shorts NOT on cooldown
  const eligibleCategories = availableCategories.filter((cat) => !cooldownSet.has(cat));

  let chosenCategory: string;

  if (eligibleCategories.length > 0) {
    // Select category first among eligible categories (Random / Equal-weight distribution)
    const randomIndex = Math.floor(Math.random() * eligibleCategories.length);
    chosenCategory = eligibleCategories[randomIndex];
  } else {
    // EDGE CASE: If all available categories are in cooldown (e.g. only 1 or 2 categories exist)
    // Relax cooldown: pick the least recently shown category
    let leastRecentCat = availableCategories[0];
    let minRecentIndex = Infinity;

    for (const cat of availableCategories) {
      // Find the last index of this category in recentCategories
      const lastIndex = recentCategories.map(normalizeCategory).lastIndexOf(cat);
      if (lastIndex === -1) {
        leastRecentCat = cat;
        break;
      }
      if (lastIndex < minRecentIndex) {
        minRecentIndex = lastIndex;
        leastRecentCat = cat;
      }
    }

    chosenCategory = leastRecentCat;
  }

  // 5. Select a Short inside the chosen category
  const shortsInCat = categoryMap.get(chosenCategory) || [];
  if (shortsInCat.length === 0) {
    return { selectedShort: null, updatedRecentCategories: recentCategories };
  }

  // Pick random short among available shorts in this category
  const shortIndex = Math.floor(Math.random() * shortsInCat.length);
  const selectedShort = shortsInCat[shortIndex];

  // 6. Update recent categories history (keep sliding window up to 20 items)
  const updatedRecentCategories = [...recentCategories, chosenCategory].slice(-20);

  return {
    selectedShort,
    updatedRecentCategories
  };
}
