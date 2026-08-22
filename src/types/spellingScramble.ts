// ============================================================================
// EDTECHRA-BITZ: Spelling Scramble Activity Types
// ============================================================================

export type SpellingDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface LetterTile {
  id: string; // Unique tile ID (e.g. "letter-0", "letter-1") to support repeated letters
  letter: string; // Single uppercase letter
  originalIndex: number;
}

export interface SpellingScramble {
  id: string;
  word: string; // Target uppercase word (e.g. "ELEPHANT")
  scrambled_letters: string[]; // Array of scrambled uppercase letters
  clue: string; // Text clue (e.g. "A very large animal with a long trunk.")
  category: string;
  difficulty: SpellingDifficulty;
  xp: number; // Easy: 10, Medium: 15, Hard: 20
  timer_seconds: number; // Derived strictly from difficulty: Easy: 30, Medium: 45, Hard: 60
  r2_content_key?: string | null;
  is_published: boolean;
  created_by?: string | null;
  import_batch_id?: string | null;
  created_at: string;
  updated_at: string;
  // User session state
  has_completed?: boolean;
}

export interface RawSpellingScrambleInput {
  word: string;
  scrambled_letters?: string[];
  scrambledLetters?: string[];
  letters?: string[];
  clue: string;
  category?: string;
  difficulty?: SpellingDifficulty | string;
  xp?: number;
  is_published?: boolean;
}

export interface SpellingScrambleAttemptResult {
  is_correct: boolean;
  correct_word: string;
  clue: string;
  xp_awarded: number;
  already_completed: boolean;
  time_taken_seconds?: number;
}

export interface SpellingScrambleValidationErrorItem {
  index?: number;
  word: string;
  errors: string[];
}

export interface SpellingScrambleValidationResult {
  valid: RawSpellingScrambleInput[];
  invalid: SpellingScrambleValidationErrorItem[];
  totalDetected: number;
}

export interface SpellingScrambleAdminStats {
  totalScrambles: number;
  publishedScrambles: number;
  draftScrambles: number;
  totalCompletions: number;
  totalXpAwarded: number;
}
