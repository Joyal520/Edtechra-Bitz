// ============================================================================
// EDTECHRA-BITZ: Vocabulary Content System JSON Validator & Duplicate Detector
// Local Deterministic Fallback Validator with Type-Specific Linguistic Checks
// ============================================================================

import {
  VocabularyContentType,
  RawVocabularyInput,
  VocabularyValidationErrorItem,
  VocabularyValidationReportItem,
  VocabularyValidationResult
} from '@/types/vocabulary';

export const MAX_IMPORT_VOCABULARY_LIMIT = 1000;

export const VALID_VOCABULARY_TYPES: VocabularyContentType[] = [
  'word',
  'collocation',
  'phrasal_verb',
  'idiom'
];

const PHRASAL_VERB_PARTICLES = new Set([
  'about', 'across', 'ahead', 'along', 'apart', 'around', 'aside', 'away',
  'back', 'by', 'down', 'forward', 'in', 'into', 'off', 'on', 'onto',
  'out', 'over', 'past', 'round', 'through', 'to', 'together', 'under',
  'up', 'upon', 'with'
]);

/**
 * Normalizes a vocabulary title/word for case-insensitive duplicate comparison.
 * e.g., "  Make a Decision  " -> "make a decision"
 */
export function normalizeVocabularyTitle(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Maps and normalizes raw input content type to valid VocabularyContentType
 */
export function resolveContentType(rawType?: string | null, fallbackType: VocabularyContentType = 'word'): VocabularyContentType {
  if (!rawType || typeof rawType !== 'string') return fallbackType;
  const clean = rawType.trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (clean === 'word' || clean === 'words') return 'word';
  if (clean === 'collocation' || clean === 'collocations') return 'collocation';
  if (clean === 'phrasal_verb' || clean === 'phrasal_verbs' || clean === 'phrasalverb' || clean === 'phrasalverbs') return 'phrasal_verb';
  if (clean === 'idiom' || clean === 'idioms') return 'idiom';
  return fallbackType;
}

/**
 * Validates a JSON string or parsed object against the Vocabulary Content System schema.
 * Executes deterministic local validation, duplicate detection, and syntactic checks.
 *
 * @param input Raw JSON string or JS object/array
 * @param defaultType Fallback content type if not specified in JSON
 * @param existingTitlesSet Optional Set of normalized titles already in DB
 */
export function validateVocabularyJSON(
  input: string | any,
  defaultType: VocabularyContentType = 'word',
  existingTitlesSet?: Set<string>
): {
  success: boolean;
  error?: string;
  result?: VocabularyValidationResult;
} {
  let parsed: any;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return { success: false, error: 'Please provide JSON containing vocabulary records.' };
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

  // Extract array of vocabulary items
  let rawList: any[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.vocabulary)) rawList = parsed.vocabulary;
    else if (Array.isArray(parsed.words)) rawList = parsed.words;
    else if (Array.isArray(parsed.items)) rawList = parsed.items;
    else if (Array.isArray(parsed.data)) rawList = parsed.data;
    else {
      return {
        success: false,
        error: 'JSON must be an array of entries or an object containing a "vocabulary" or "words" array.'
      };
    }
  } else {
    return {
      success: false,
      error: 'JSON must be an array of entries or an object with an array property.'
    };
  }

  const totalDetected = rawList.length;

  if (totalDetected === 0) {
    return { success: false, error: 'No vocabulary records found in the provided JSON payload.' };
  }

  if (totalDetected > MAX_IMPORT_VOCABULARY_LIMIT) {
    return {
      success: false,
      error: `Maximum ${MAX_IMPORT_VOCABULARY_LIMIT.toLocaleString()} records per import. You provided ${totalDetected.toLocaleString()}. Please reduce the batch size.`
    };
  }

  const valid: RawVocabularyInput[] = [];
  const invalid: VocabularyValidationErrorItem[] = [];
  const duplicates: VocabularyValidationErrorItem[] = [];
  const existing: VocabularyValidationErrorItem[] = [];
  const allReport: VocabularyValidationReportItem[] = [];

  const seenInBatchNormalized = new Set<string>();
  const normalizedExistingDB = existingTitlesSet || new Set<string>();

  for (let i = 0; i < rawList.length; i++) {
    const index = i + 1;
    const raw = rawList[i];

    if (!raw || typeof raw !== 'object') {
      const errItem: VocabularyValidationErrorItem = {
        index,
        title: `Record #${index}`,
        error: 'Record must be a valid JSON object.',
        type: 'invalid'
      };
      invalid.push(errItem);
      allReport.push({
        index,
        title: `Record #${index}`,
        contentType: defaultType,
        status: 'invalid',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: 'Record must be a JSON object.',
        raw: { title: `Record #${index}`, meaning: '', example: '' }
      });
      continue;
    }

    const contentType = resolveContentType(raw.type || raw.content_type, defaultType);
    const titleStr = typeof (raw.title || raw.word) === 'string' ? (raw.title || raw.word).trim() : '';
    const meaningStr = typeof (raw.meaning || raw.definition) === 'string' ? (raw.meaning || raw.definition).trim() : '';
    const exampleStr = typeof raw.example === 'string' ? raw.example.trim() : '';
    const levelStr = typeof raw.level === 'string' ? raw.level.trim().toUpperCase() : undefined;
    const pronunciationStr = typeof (raw.pronunciation || raw.phonetic) === 'string'
      ? (raw.pronunciation || raw.phonetic).trim()
      : undefined;
    const partOfSpeechStr = typeof (raw.partOfSpeech || raw.part_of_speech) === 'string'
      ? (raw.partOfSpeech || raw.part_of_speech).trim()
      : undefined;
    const categoryStr = typeof raw.category === 'string' ? raw.category.trim() : undefined;
    const statusVal = raw.status && ['draft', 'approved', 'scheduled', 'published', 'archived'].includes(raw.status)
      ? raw.status
      : 'published';

    const currentRawInput: RawVocabularyInput = {
      content_type: contentType,
      type: contentType,
      title: titleStr,
      word: titleStr,
      meaning: meaningStr,
      definition: meaningStr,
      example: exampleStr,
      level: levelStr,
      pronunciation: pronunciationStr,
      phonetic: pronunciationStr,
      partOfSpeech: partOfSpeechStr,
      category: categoryStr,
      status: statusVal
    };

    // 1. Required fields check
    const missingFields: string[] = [];
    if (!titleStr) missingFields.push('title/word');
    if (!meaningStr) missingFields.push('meaning/definition');
    if (!exampleStr) missingFields.push('example');

    if (missingFields.length > 0) {
      const msg = `Missing required field(s): ${missingFields.join(', ')}.`;
      const errItem: VocabularyValidationErrorItem = {
        index,
        title: titleStr || `Record #${index}`,
        contentType,
        error: msg,
        type: 'invalid',
        rawInput: currentRawInput
      };
      invalid.push(errItem);
      allReport.push({
        index,
        title: titleStr || `Record #${index}`,
        contentType,
        status: 'invalid',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: msg,
        raw: currentRawInput
      });
      continue;
    }

    // 2. Syntactic sanity checks
    const warnings: string[] = [];

    // Check title length
    if (titleStr.length < 2) {
      const msg = 'Title is too short (minimum 2 characters).';
      invalid.push({ index, title: titleStr, contentType, error: msg, type: 'invalid', rawInput: currentRawInput });
      allReport.push({ index, title: titleStr, contentType, status: 'invalid', validationProvider: 'local_fallback', validationStatus: 'rejected', message: msg, raw: currentRawInput });
      continue;
    }

    // Check meaning vs example equality
    if (meaningStr.toLowerCase() === exampleStr.toLowerCase()) {
      warnings.push('Example sentence is identical to the meaning.');
    }

    // Type-specific basic deterministic checks
    const wordsInTitle = titleStr.split(/\s+/).filter(Boolean);
    if (contentType === 'phrasal_verb') {
      const hasParticle = wordsInTitle.slice(1).some((w: string) => PHRASAL_VERB_PARTICLES.has(w.toLowerCase()));
      if (wordsInTitle.length < 2) {
        warnings.push('Phrasal verb typically consists of a verb + particle (e.g. "give up").');
      } else if (!hasParticle) {
        warnings.push('Phrasal verb does not appear to contain a recognized particle.');
      }
    } else if (contentType === 'idiom') {
      if (wordsInTitle.length < 2) {
        warnings.push('Idioms are typically multi-word expressions (e.g. "break the ice").');
      }
    } else if (contentType === 'collocation') {
      if (wordsInTitle.length < 2) {
        warnings.push('Collocations typically consist of word combinations (e.g. "make a decision").');
      }
    }

    const norm = normalizeVocabularyTitle(titleStr);

    // 3. Check in-batch duplicate
    if (seenInBatchNormalized.has(norm)) {
      const msg = `Duplicate entry "${titleStr}" detected within this import batch.`;
      const dupItem: VocabularyValidationErrorItem = {
        index,
        title: titleStr,
        contentType,
        error: msg,
        type: 'duplicate_in_batch',
        rawInput: currentRawInput
      };
      duplicates.push(dupItem);
      allReport.push({
        index,
        title: titleStr,
        contentType,
        status: 'duplicate_in_batch',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: msg,
        raw: currentRawInput
      });
      continue;
    }

    // 4. Check database existing duplicate
    if (normalizedExistingDB.has(norm)) {
      const msg = `"${titleStr}" already exists in the EdTechra database.`;
      const existItem: VocabularyValidationErrorItem = {
        index,
        title: titleStr,
        contentType,
        error: msg,
        type: 'already_exists',
        rawInput: currentRawInput
      };
      existing.push(existItem);
      allReport.push({
        index,
        title: titleStr,
        contentType,
        status: 'already_exists',
        validationProvider: 'local_fallback',
        validationStatus: 'rejected',
        message: msg,
        raw: currentRawInput
      });
      continue;
    }

    // 5. Valid record
    seenInBatchNormalized.add(norm);
    valid.push(currentRawInput);
    allReport.push({
      index,
      title: titleStr,
      contentType,
      status: warnings.length > 0 ? 'warning' : 'valid',
      validationProvider: 'local_fallback',
      validationStatus: 'fallback_validated',
      warnings: warnings.length > 0 ? warnings : undefined,
      message: warnings.length > 0 ? warnings.join(' ') : 'Passed basic local schema validation.',
      raw: currentRawInput
    });
  }

  const result: VocabularyValidationResult = {
    totalDetected,
    validCount: valid.length,
    warningCount: allReport.filter(r => r.status === 'warning').length,
    inBatchDuplicateCount: duplicates.length,
    existingCount: existing.length,
    invalidCount: invalid.length,
    geminiValidatedCount: 0,
    fallbackValidatedCount: valid.length,
    isGeminiAvailable: false,
    fallbackNotice: 'Basic local validation used. Content has not been linguistically verified by AI.',
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
