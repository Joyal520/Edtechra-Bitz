// ============================================================================
// EDTECHRA-BITZ: Word of the Day Types (Backward Compatible Bridge)
// Re-exports and extends from unified Vocabulary Content System types
// ============================================================================

import {
  VocabularyStatus,
  VocabularyItem,
  RawVocabularyInput,
  VocabularyValidationErrorItem,
  VocabularyValidationReportItem,
  VocabularyValidationResult,
  VocabularyImportBatchResult
} from './vocabulary';

export * from './vocabulary';

export type WordStatus = VocabularyStatus;
export type WordOfTheDay = VocabularyItem;
export type RawWordInput = RawVocabularyInput;
export type WordValidationErrorItem = VocabularyValidationErrorItem;
export type WordValidationReportItem = VocabularyValidationReportItem;
export type WordValidationResult = VocabularyValidationResult;
export type WordAdminStats = {
  totalWords: number;
  publishedWords: number;
  draftWords: number;
  archivedWords: number;
  totalLikes: number;
  totalSaves: number;
};
export type WordImportBatchResult = VocabularyImportBatchResult;
