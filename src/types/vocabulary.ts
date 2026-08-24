// ============================================================================
// EDTECHRA-BITZ: Unified Vocabulary Content System Types
// Supports 4 Content Types: 'word', 'collocation', 'phrasal_verb', 'idiom'
// ============================================================================

export type VocabularyContentType = 'word' | 'collocation' | 'phrasal_verb' | 'idiom';

export type VocabularyStatus =
  | 'draft'
  | 'pending_validation'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'rejected'
  | 'archived';

export type VocabularyValidationStatus =
  | 'pending'
  | 'gemini_validated'
  | 'fallback_validated'
  | 'manually_approved'
  | 'rejected';

export type ValidationProvider = 'gemini' | 'local_fallback' | 'manual';

export interface VocabularyItem {
  id: string;
  content_type: VocabularyContentType;
  title: string;
  word?: string; // Backward compatibility alias
  word_normalized?: string;
  meaning: string;
  definition?: string | null;
  example: string;
  level?: string | null; // e.g. A1, A2, B1, B2, C1, C2
  pronunciation?: string | null;
  phonetic?: string | null;
  part_of_speech?: string | null;
  category?: string | null;
  image_url?: string | null;
  status: VocabularyStatus;
  validation_status: VocabularyValidationStatus;
  validation_provider: ValidationProvider;
  validation_message?: string | null;
  validation_score?: number | null;
  validation_warnings?: string[] | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  import_batch_id?: string | null;
  r2_content_key?: string | null;
  likes_count: number;
  // Interactive session states
  is_liked_by_me?: boolean;
  is_saved_by_me?: boolean;
}

export interface RawVocabularyInput {
  type?: VocabularyContentType | string;
  content_type?: VocabularyContentType | string;
  title?: string;
  word?: string;
  meaning?: string;
  definition?: string;
  example?: string;
  level?: string;
  pronunciation?: string;
  phonetic?: string;
  partOfSpeech?: string;
  part_of_speech?: string;
  category?: string;
  image_url?: string;
  status?: VocabularyStatus;
  scheduled_at?: string;
}

export interface VocabularyValidationErrorItem {
  index: number;
  title: string;
  type: 'invalid' | 'duplicate_in_batch' | 'already_exists';
  error: string;
  contentType?: VocabularyContentType;
  details?: string;
  rawInput?: RawVocabularyInput;
}

export interface VocabularyValidationReportItem {
  index: number;
  title: string;
  contentType: VocabularyContentType;
  status: 'valid' | 'warning' | 'duplicate_in_batch' | 'already_exists' | 'invalid';
  validationProvider: ValidationProvider;
  validationStatus: VocabularyValidationStatus;
  score?: number;
  message?: string;
  warnings?: string[];
  raw: RawVocabularyInput;
}

export interface VocabularyValidationResult {
  totalDetected: number;
  validCount: number;
  warningCount: number;
  inBatchDuplicateCount: number;
  existingCount: number;
  invalidCount: number;
  geminiValidatedCount: number;
  fallbackValidatedCount: number;
  isGeminiAvailable: boolean;
  fallbackNotice?: string;
  valid: RawVocabularyInput[];
  invalid: VocabularyValidationErrorItem[];
  duplicates: VocabularyValidationErrorItem[];
  existing: VocabularyValidationErrorItem[];
  allReport: VocabularyValidationReportItem[];
}

export interface VocabularyAdminStats {
  totalVocabulary: number;
  wordsCount: number;
  collocationsCount: number;
  phrasalVerbsCount: number;
  idiomsCount: number;
  publishedCount: number;
  scheduledCount: number;
  draftCount: number;
  pendingValidationCount: number;
  totalLikes: number;
  totalSaves: number;
}

export interface VocabularyImportBatchResult {
  success: boolean;
  batchId: string;
  totalSubmitted: number;
  importedCount: number;
  failedCount: number;
  duplicateCount: number;
  validationProvider: ValidationProvider;
  imported: VocabularyItem[];
  failed: VocabularyValidationErrorItem[];
}

export interface VocabularyPublishingQueueItem {
  id: string;
  content_type: VocabularyContentType;
  title: string;
  meaning: string;
  example: string;
  image_url?: string | null;
  status: VocabularyStatus;
  scheduled_at?: string | null;
  published_at?: string | null;
  validation_provider: ValidationProvider;
  validation_status: VocabularyValidationStatus;
  created_at: string;
}

export interface VocabularyImportHistoryItem {
  id: string;
  created_at: string;
  created_by?: string | null;
  file_name?: string | null;
  content_type: string;
  total_records: number;
  successful_count: number;
  rejected_count: number;
  duplicate_count: number;
  gemini_validated_count: number;
  fallback_validated_count: number;
  status: string;
  details?: any;
}

export interface GeminiStatusInfo {
  isConfigured: boolean;
  isConnected: boolean;
  provider: string;
  maskedApiKey?: string;
  status: 'connected' | 'unavailable' | 'unconfigured';
  message?: string;
  lastChecked?: string;
}
