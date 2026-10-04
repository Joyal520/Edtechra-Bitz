// ============================================================================
// EDTECHRA-BITZ: Quiz Cover Asset Helper & Theme Styling
// ============================================================================

export const DEFAULT_QUIZ_COVER = '/images/quiz/default-quiz-cover.jpg';

/**
 * Extracts embedded cover URL from quiz description if present (e.g. [cover:https://...])
 */
export function extractCoverFromDescription(desc?: string | null): string | null {
  if (!desc) return null;
  const match = desc.match(/\[cover:\s*(https?:\/\/[^\s\]]+|data:[^\s\]]+|\/[^\s\]]+)\s*\]/i);
  return match ? match[1].trim() : null;
}

/**
 * Strips the [cover:...] token from quiz description for clean UI presentation
 */
export function cleanDescription(desc?: string | null): string {
  if (!desc) return '';
  return desc.replace(/\s*\[cover:\s*(https?:\/\/[^\s\]]+|data:[^\s\]]+|\/[^\s\]]+)\s*\]/gi, '').trim();
}

/**
 * Encodes cover image URL into quiz description for durable storage in tables without a cover_image column
 */
export function encodeDescriptionWithCover(desc?: string | null, coverUrl?: string | null): string {
  const clean = cleanDescription(desc);
  if (!coverUrl || !coverUrl.trim()) return clean;
  return clean ? `${clean}\n[cover:${coverUrl.trim()}]` : `[cover:${coverUrl.trim()}]`;
}

/**
 * Resolves the cover image for any quiz or session.
 * 1. Uploaded quiz cover image (cover_image, cover_image_url, image_url)
 * 2. Embedded cover URL in description ([cover:...])
 * 3. Valid existing quiz image URL
 * 4. Default EdTechra image fallback
 */
export function getQuizCover(quiz?: {
  cover_image?: string | null;
  cover_image_url?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  description?: string | null;
} | null): string {
  if (!quiz) return DEFAULT_QUIZ_COVER;
  const embedded = extractCoverFromDescription(quiz.description);
  const custom = quiz.cover_image || quiz.cover_image_url || embedded || quiz.image_url || quiz.thumbnail_url;
  if (custom && typeof custom === 'string' && custom.trim().length > 0) {
    const trimmed = custom.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
      return trimmed;
    }
    // Prefix relative path if missing leading slash
    return `/${trimmed}`;
  }
  return DEFAULT_QUIZ_COVER;
}

/**
 * Subject badge color palette matching the reference design:
 * - Grammar: purple
 * - Science: cyan/sky
 * - ICT: emerald
 * - AI: violet
 * - Reading: amber
 * - Vocabulary: indigo
 */
export function getQuizCategoryBadgeStyle(category: string = ''): {
  bg: string;
  text: string;
  border: string;
} {
  const norm = (category || '').toLowerCase().trim();
  switch (norm) {
    case 'grammar':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200/80'
      };
    case 'science':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200/80'
      };
    case 'vocabulary':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200/80'
      };
    case 'ict':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200/80'
      };
    case 'ai':
      return {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        border: 'border-violet-200/80'
      };
    case 'reading':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200/80'
      };
    case 'math':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200/80'
      };
    default:
      return {
        bg: 'bg-blue-50',
        text: 'text-[#026fc3]',
        border: 'border-blue-200/80'
      };
  }
}
