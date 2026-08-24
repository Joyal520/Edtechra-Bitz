// ============================================================================
// EDTECHRA-BITZ: Word of the Day JSON Validator (Backward Compatible Bridge)
// Delegates directly to unified vocabulary validation engine
// ============================================================================

import {
  normalizeVocabularyTitle,
  validateVocabularyJSON,
  MAX_IMPORT_VOCABULARY_LIMIT
} from './vocabularyValidation';
import { WordValidationResult } from '@/types/wordOfTheDay';

export const MAX_IMPORT_WORDS_LIMIT = MAX_IMPORT_VOCABULARY_LIMIT;

export function normalizeWord(word?: string | null): string {
  return normalizeVocabularyTitle(word);
}

export function validateWordJSON(
  input: string | any,
  existingWordsSet?: Set<string>
): {
  success: boolean;
  error?: string;
  result?: WordValidationResult;
} {
  return validateVocabularyJSON(input, 'word', existingWordsSet);
}
