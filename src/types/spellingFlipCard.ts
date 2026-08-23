// ============================================================================
// EDTECHRA-BITZ: Spelling Flip Card Types
// Memory-based spelling challenge where word is shown, flips/disappears,
// and student recalls & types the spelling from memory.
// ============================================================================

export type SpellingFlipLevel = 'easy' | 'intermediate' | 'hard';

export interface SpellingFlipCardItem {
  id: string;
  word: string; // Uppercase target word, e.g. "HOUSE", "ELEPHANT", "ENVIRONMENT"
  level: SpellingFlipLevel; // 'easy' (3-5 letters) | 'intermediate' (6-8 letters) | 'hard' (9-12 letters)
  category?: string; // Optional topic, e.g. "Animals", "Science", "Everyday"
  memorize_seconds: number; // Easy: 30s, Intermediate: 20s, Hard: 10s
  xp: number; // Easy: 10, Intermediate: 15, Hard: 20
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // User state
  has_completed?: boolean;
}

export interface RawSpellingFlipInput {
  word: string;
  level: SpellingFlipLevel | string;
  category?: string;
  is_published?: boolean;
  memorize_seconds?: number;
  xp?: number;
}

export interface SpellingFlipValidationErrorItem {
  index?: number;
  word: string;
  level?: string;
  errors: string[];
}

export interface SpellingFlipValidationResult {
  valid: RawSpellingFlipInput[];
  invalid: SpellingFlipValidationErrorItem[];
  totalDetected: number;
}

export interface SpellingFlipAdminStats {
  totalCards: number;
  publishedCards: number;
  draftCards: number;
  totalCompletions: number;
  totalXpAwarded: number;
}

export interface SpellingFlipAttemptResult {
  is_correct: boolean;
  correct_word: string;
  xp_awarded: number;
  already_completed: boolean;
  level: SpellingFlipLevel;
  time_taken_seconds?: number;
}
