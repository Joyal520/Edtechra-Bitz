// ============================================================================
// EDTECHRA-BITZ: Word of the Day Types
// ============================================================================

export type WordStatus = 'draft' | 'published' | 'archived';

export interface WordOfTheDay {
  id: string;
  word: string;
  word_normalized: string;
  pronunciation?: string | null;
  part_of_speech?: string | null;
  meaning: string;
  example: string;
  image_url?: string | null;
  status: WordStatus;
  likes_count: number;
  published_at: string;
  created_by?: string | null;
  import_batch_id?: string | null;
  r2_content_key?: string | null;
  created_at: string;
  updated_at: string;
  // Interactive computed / session states
  is_liked_by_me?: boolean;
  is_saved_by_me?: boolean;
}

export interface RawWordInput {
  word: string;
  pronunciation?: string;
  partOfSpeech?: string;
  part_of_speech?: string;
  meaning: string;
  example: string;
  status?: WordStatus;
}

export interface WordValidationErrorItem {
  index: number;
  word: string;
  error: string;
  type: 'invalid' | 'duplicate_in_batch' | 'already_exists';
  details?: string;
}

export interface WordValidationReportItem {
  index: number;
  raw: RawWordInput;
  status: 'valid' | 'duplicate_in_batch' | 'already_exists' | 'invalid';
  message?: string;
}

export interface WordValidationResult {
  totalDetected: number;
  validCount: number;
  inBatchDuplicateCount: number;
  existingCount: number;
  invalidCount: number;
  valid: RawWordInput[];
  invalid: WordValidationErrorItem[];
  duplicates: WordValidationErrorItem[];
  existing: WordValidationErrorItem[];
  allReport: WordValidationReportItem[];
}

export interface WordAdminStats {
  totalWords: number;
  publishedWords: number;
  draftWords: number;
  archivedWords: number;
  totalLikes: number;
  totalSaves: number;
}

export interface WordImportBatchResult {
  success: boolean;
  batchId: string;
  totalSubmitted: number;
  importedCount: number;
  failedCount: number;
  imported: WordOfTheDay[];
  failed: WordValidationErrorItem[];
}
