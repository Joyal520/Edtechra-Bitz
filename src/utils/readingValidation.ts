// ============================================================================
// EDTECHRA-BITZ: One-Minute Reading JSON Validation Utility
// ============================================================================

import { RawReadingInput, ReadingValidationResult, ReadingValidationErrorItem } from '@/types';

/**
 * Validates a single reading object
 */
export function validateSingleReading(item: any, _index: number = 0): { valid: boolean; reading: RawReadingInput | null; errors: ReadingValidationErrorItem[] } {
  const errors: ReadingValidationErrorItem[] = [];

  if (!item || typeof item !== 'object') {
    errors.push({ field: 'root', message: 'Reading must be a JSON object.' });
    return { valid: false, reading: null, errors };
  }

  // 1. Title
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) {
    errors.push({ field: 'title', message: 'Reading title is required.' });
  }

  // 2. Paragraphs
  const paragraphsRaw = Array.isArray(item.paragraphs) ? item.paragraphs : [];
  if (paragraphsRaw.length === 0) {
    errors.push({ field: 'paragraphs', message: 'At least one paragraph is required.' });
  }

  const cleanParagraphs = paragraphsRaw.map((p: any, pIdx: number) => {
    if (typeof p === 'string') {
      return { id: pIdx + 1, text: p.trim() };
    }
    if (p && typeof p.text === 'string') {
      return { id: typeof p.id === 'number' ? p.id : pIdx + 1, text: p.text.trim() };
    }
    return { id: pIdx + 1, text: '' };
  }).filter((p: { text: string }) => p.text.length > 0);

  if (paragraphsRaw.length > 0 && cleanParagraphs.length === 0) {
    errors.push({ field: 'paragraphs', message: 'Paragraphs must contain non-empty text strings.' });
  }

  // 3. Category & Level
  const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General';
  const level = typeof item.level === 'string' && item.level.trim() ? item.level.trim() : 'A2';
  const readingTime = Number(item.reading_time) > 0 ? Number(item.reading_time) : 1;

  // 4. Vocabulary (optional)
  const cleanVocabulary = Array.isArray(item.vocabulary) ? item.vocabulary.map((v: any) => ({
    word: String(v?.word || '').trim(),
    pronunciation: v?.pronunciation ? String(v.pronunciation).trim() : undefined,
    part_of_speech: v?.part_of_speech ? String(v.part_of_speech).trim() : undefined,
    definition: String(v?.definition || '').trim(),
    example: v?.example ? String(v.example).trim() : undefined
  })).filter((v: { word: string; definition: string }) => v.word && v.definition) : [];

  // 5. Comprehension Questions (optional)
  const cleanQuestions = Array.isArray(item.questions) ? item.questions.map((q: any, qIdx: number) => {
    const qText = String(q?.question || '').trim();
    const opts = Array.isArray(q?.options) ? q.options.map((o: any) => String(o).trim()).filter(Boolean) : [];
    const correct = String(q?.correct_answer || q?.correctAnswer || opts[0] || '').trim();
    const explanation = String(q?.explanation || '').trim();

    return {
      id: typeof q?.id === 'number' ? q.id : qIdx + 1,
      question: qText,
      options: opts,
      correct_answer: correct,
      explanation
    };
  }).filter((q: { question: string; options: string[] }) => q.question && q.options.length >= 2) : [];

  if (errors.length > 0) {
    return { valid: false, reading: null, errors };
  }

  const validatedReading: RawReadingInput = {
    type: 'reading',
    title,
    subtitle: item.subtitle ? String(item.subtitle).trim() : undefined,
    category,
    level,
    reading_time: readingTime,
    paragraphs: cleanParagraphs,
    vocabulary: cleanVocabulary,
    questions: cleanQuestions,
    cover_image_url: item.cover_image_url || null,
    cover_image_object_key: item.cover_image_object_key || null,
    is_published: item.is_published !== undefined ? Boolean(item.is_published) : true
  };

  return { valid: true, reading: validatedReading, errors: [] };
}

/**
 * Validates a batch or single JSON string containing reading(s)
 */
export function validateReadingJSON(jsonString: string): ReadingValidationResult {
  if (!jsonString || !jsonString.trim()) {
    return {
      valid: false,
      reading: null,
      errors: [{ field: 'root', message: 'Input JSON cannot be empty.' }]
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch (err: any) {
    return {
      valid: false,
      reading: null,
      errors: [{ field: 'syntax', message: `Invalid JSON syntax: ${err.message}` }]
    };
  }

  // Handle single object or array
  const targetObj = Array.isArray(parsed) ? parsed[0] : parsed;
  const result = validateSingleReading(targetObj, 0);

  return {
    valid: result.valid,
    reading: result.reading,
    errors: result.errors
  };
}
