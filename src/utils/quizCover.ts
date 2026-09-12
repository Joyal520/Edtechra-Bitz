// ============================================================================
// EDTECHRA-BITZ: Quiz Cover Asset Helper & Theme Styling
// ============================================================================

export const DEFAULT_QUIZ_COVER = '/images/quiz/default-quiz-cover.jpg';

/**
 * Resolves the cover image for any quiz or session.
 * Always falls back cleanly to the official EdTechra layered papercut cover.
 */
export function getQuizCover(quiz?: {
  cover_image?: string | null;
  cover_image_url?: string | null;
} | null): string {
  if (!quiz) return DEFAULT_QUIZ_COVER;
  const custom = quiz.cover_image || quiz.cover_image_url;
  if (custom && typeof custom === 'string' && custom.trim().length > 0) {
    return custom.trim();
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
