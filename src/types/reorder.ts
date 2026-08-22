// ============================================================================
// EDTECHRA-BITZ: Sentence Reorder Interactive Activity Types
// ============================================================================

export interface WordTile {
  id: string; // Unique tile identifier to distinguish repeated words (e.g. "tile-0", "tile-1")
  word: string; // Original word text as stored in JSON
  originalIndex: number;
}

export interface ReorderActivity {
  id: string;
  sentence: string; // Complete correct target sentence (e.g. "She goes to school.")
  scrambled_words: string[]; // Shuffled word array (3 to 6 words)
  correct_order: string[]; // Expected ordered array of words
  category: string;
  level: string; // 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  xp: number; // default 10
  hint?: string | null;
  explanation?: string | null;
  r2_content_key?: string | null;
  is_published: boolean;
  created_by?: string | null;
  import_batch_id?: string | null;
  created_at: string;
  updated_at: string;
  // Computed / user session state
  has_completed?: boolean;
  user_order?: string[] | null;
}

export interface RawReorderInput {
  sentence: string;
  scrambled_words?: string[];
  correct_order?: string[];
  words?: string[];
  correctOrder?: string[];
  category?: string;
  level?: string;
  xp?: number;
  hint?: string;
  explanation?: string;
  is_published?: boolean;
}

export interface ReorderAttemptResult {
  is_correct: boolean;
  correct_sentence: string;
  explanation?: string;
  xp_awarded: number;
  already_completed: boolean;
}

export interface ReorderValidationErrorItem {
  index?: number;
  field: string;
  message: string;
}

export interface ReorderValidationResult {
  valid: boolean;
  isBulk: boolean;
  activity: RawReorderInput | null;
  activities: RawReorderInput[];
  errors: ReorderValidationErrorItem[];
  totalDetected: number;
  validCount: number;
}

export interface ReorderAdminStats {
  totalActivities: number;
  publishedActivities: number;
  draftActivities: number;
  totalCompletions: number;
  totalXpAwarded: number;
}
