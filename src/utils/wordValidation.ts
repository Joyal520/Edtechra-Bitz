// ============================================================================
// EDTECHRA-BITZ: Word of the Day JSON Validator & Duplicate Detector
// ============================================================================

import {
  RawWordInput,
  WordValidationErrorItem,
  WordValidationReportItem,
  WordValidationResult
} from '@/types/wordOfTheDay';

export const MAX_IMPORT_WORDS_LIMIT = 1000;

/**
 * Normalizes a word string for robust, case-insensitive duplicate comparison.
 * e.g., "  Meticulous  " -> "meticulous"
 */
export function normalizeWord(word?: string | null): string {
  if (!word || typeof word !== 'string') return '';
  return word.trim().toLowerCase();
}

/**
 * Validates a JSON string or parsed object against the Word of the Day schema.
 * Detects syntax errors, missing fields, batch size limits (<= 1000),
 * in-batch duplicates, and existing database records.
 *
 * @param input Raw JSON string or JS object/array
 * @param existingWordsSet Optional Set of normalized words already existing in DB
 */
export function validateWordJSON(
  input: string | any,
  existingWordsSet?: Set<string>
): {
  success: boolean;
  error?: string;
  result?: WordValidationResult;
} {
  let parsed: any;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return { success: false, error: 'Please paste JSON containing Word of the Day records.' };
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch (err: any) {
      return {
        success: false,
        error: `Invalid JSON format: ${err.message || 'Syntax error'}. Please check for trailing commas or missing quotes.`
      };
    }
  } else {
    parsed = input;
  }

  // Extract array of words
  let rawList: any[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.words)) {
    rawList = parsed.words;
  } else {
    return {
      success: false,
      error: 'JSON must be an array of words or an object with a "words" array property.'
    };
  }

  const totalDetected = rawList.length;

  if (totalDetected === 0) {
    return { success: false, error: 'No words found in the provided JSON array.' };
  }

  // Strict check: Maximum 1,000 words per import. Never silently truncate.
  if (totalDetected > MAX_IMPORT_WORDS_LIMIT) {
    return {
      success: false,
      error: `Maximum ${MAX_IMPORT_WORDS_LIMIT.toLocaleString()} words per import. You provided ${totalDetected.toLocaleString()} words. Please reduce the batch size.`
    };
  }

  const valid: RawWordInput[] = [];
  const invalid: WordValidationErrorItem[] = [];
  const duplicates: WordValidationErrorItem[] = [];
  const existing: WordValidationErrorItem[] = [];
  const allReport: WordValidationReportItem[] = [];

  const seenInBatchNormalized = new Set<string>();
  const normalizedExistingDB = existingWordsSet || new Set<string>();

  for (let i = 0; i < rawList.length; i++) {
    const index = i + 1;
    const raw = rawList[i];

    if (!raw || typeof raw !== 'object') {
      const errItem: WordValidationErrorItem = {
        index,
        word: `Record #${index}`,
        error: 'Record must be a JSON object.',
        type: 'invalid'
      };
      invalid.push(errItem);
      allReport.push({
        index,
        raw: { word: `Record #${index}`, meaning: '', example: '' },
        status: 'invalid',
        message: 'Record must be a JSON object.'
      });
      continue;
    }

    const wordStr = typeof raw.word === 'string' ? raw.word.trim() : '';
    const meaningStr = typeof raw.meaning === 'string' ? raw.meaning.trim() : '';
    const exampleStr = typeof raw.example === 'string' ? raw.example.trim() : '';
    const pronunciationStr = typeof raw.pronunciation === 'string' ? raw.pronunciation.trim() : undefined;
    const partOfSpeechStr = typeof (raw.partOfSpeech || raw.part_of_speech) === 'string'
      ? (raw.partOfSpeech || raw.part_of_speech).trim()
      : undefined;
    const statusVal = raw.status && ['draft', 'published', 'archived'].includes(raw.status)
      ? raw.status
      : undefined;

    const currentRawInput: RawWordInput = {
      word: wordStr,
      meaning: meaningStr,
      example: exampleStr,
      pronunciation: pronunciationStr,
      partOfSpeech: partOfSpeechStr,
      status: statusVal
    };

    // Check required fields
    const missingFields: string[] = [];
    if (!wordStr) missingFields.push('word');
    if (!meaningStr) missingFields.push('meaning');
    if (!exampleStr) missingFields.push('example');

    if (missingFields.length > 0) {
      const msg = `Missing required field(s): ${missingFields.join(', ')}.`;
      const errItem: WordValidationErrorItem = {
        index,
        word: wordStr || `Record #${index}`,
        error: msg,
        type: 'invalid'
      };
      invalid.push(errItem);
      allReport.push({
        index,
        raw: currentRawInput,
        status: 'invalid',
        message: msg
      });
      continue;
    }

    const norm = normalizeWord(wordStr);

    // Check in-batch duplicate
    if (seenInBatchNormalized.has(norm)) {
      const msg = `Duplicate word "${wordStr}" detected within this import batch.`;
      const dupItem: WordValidationErrorItem = {
        index,
        word: wordStr,
        error: msg,
        type: 'duplicate_in_batch'
      };
      duplicates.push(dupItem);
      allReport.push({
        index,
        raw: currentRawInput,
        status: 'duplicate_in_batch',
        message: msg
      });
      continue;
    }

    // Check database existing duplicate
    if (normalizedExistingDB.has(norm)) {
      const msg = `Word "${wordStr}" already exists in the EdTechra database.`;
      const existItem: WordValidationErrorItem = {
        index,
        word: wordStr,
        error: msg,
        type: 'already_exists'
      };
      existing.push(existItem);
      allReport.push({
        index,
        raw: currentRawInput,
        status: 'already_exists',
        message: msg
      });
      continue;
    }

    // Valid record
    seenInBatchNormalized.add(norm);
    valid.push(currentRawInput);
    allReport.push({
      index,
      raw: currentRawInput,
      status: 'valid'
    });
  }

  const result: WordValidationResult = {
    totalDetected,
    validCount: valid.length,
    inBatchDuplicateCount: duplicates.length,
    existingCount: existing.length,
    invalidCount: invalid.length,
    valid,
    invalid,
    duplicates,
    existing,
    allReport
  };

  return {
    success: true,
    result
  };
}
