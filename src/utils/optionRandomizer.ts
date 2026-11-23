// ============================================================================
// UNIVERSAL PER-STUDENT ANSWER CHOICE RANDOMIZER
// Deterministically shuffles answer choices per (studentId, questionId, nonce)
// while keeping question order, question numbering, and canonical answer IDs
// 100% invariant.
// ============================================================================

const SHUFFLEABLE_QUESTION_TYPES = new Set([
  'multiple_choice',
  'multiple_select',
  'image_selection',
  'image_based',
  'odd_one_out',
  'word_choice',
  'wh_question',
  'comprehension',
  'grammar_correction'
]);

/**
 * Returns true only for question types whose answer choices are unordered
 * and safe to shuffle. Never shuffles ordering, matching, true/false, or text types.
 */
export function shouldShuffleQuestionOptions(questionType?: string): boolean {
  if (!questionType) return false;
  return SHUFFLEABLE_QUESTION_TYPES.has(String(questionType).trim().toLowerCase());
}

/**
 * 32-bit FNV-1a string hash for deterministic seeding.
 */
function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 seeded PRNG returning floats in [0, 1).
 */
function createSeededRng(seedStr: string): () => number {
  let state = fnv1aHash(seedStr) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffles an array of options for a specific student and question.
 * - Preserves all original items without mutation.
 * - Produces the exact same order across page refreshes for the same (studentId, questionId, attemptNonce).
 * - Produces different arrangements across different studentIds.
 */
export function shuffleOptionsForStudent<T>(
  options: readonly T[],
  studentId: string | null | undefined,
  questionId: string,
  attemptNonce = 0
): T[] {
  if (!Array.isArray(options) || options.length <= 1) {
    return Array.isArray(options) ? [...options] : [];
  }

  const effectiveStudent = (studentId && String(studentId).trim()) || 'anonymous_student';
  const seed = `${effectiveStudent}::${questionId}::${attemptNonce}`;
  const rng = createSeededRng(seed);

  const copy = [...options];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
