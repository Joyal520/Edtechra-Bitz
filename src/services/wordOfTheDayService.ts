// ============================================================================
// EDTECHRA-BITZ: Word of the Day API Service (Backward Compatible Bridge)
// Delegates directly to unified VocabularyService
// ============================================================================

import { vocabularyService } from './vocabularyService';

export { vocabularyService };
export const wordOfTheDayService = vocabularyService;
