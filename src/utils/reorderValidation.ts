// ============================================================================
// EDTECHRA-BITZ: Sentence Reorder JSON Validation Utility
// ============================================================================

import {
  RawReorderInput,
  ReorderValidationResult,
  ReorderValidationErrorItem
} from '@/types/reorder';

/**
 * Unbiased Fisher–Yates shuffle algorithm for sentence words.
 * Guarantees a genuine random permutation that differs from the target order where possible.
 * Punctuation remains attached to its word (e.g. "seven.").
 */
export function shuffleSentenceWords(words: string[]): string[] {
  if (!Array.isArray(words) || words.length <= 1) {
    return Array.isArray(words) ? [...words] : [];
  }

  const result = [...words];
  const n = result.length;

  // Perform Fisher–Yates shuffle with up to 10 attempts to guarantee a different order
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }

    // Check if the result differs from the original target order
    const isIdentical = result.every((w, idx) => w === words[idx]);
    if (!isIdentical) {
      return result;
    }
  }

  // Fallback: Swap first two distinct words to guarantee an order difference
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      if (result[i] !== result[j]) {
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
        return result;
      }
    }
  }

  return result;
}

/**
 * Validates a single sentence reorder object.
 * Enforces strict 3 to 6 word limits.
 */
export function validateSingleReorder(
  item: any,
  index: number = 0
): { valid: boolean; activity: RawReorderInput | null; errors: ReorderValidationErrorItem[] } {
  const errors: ReorderValidationErrorItem[] = [];

  if (!item || typeof item !== 'object') {
    errors.push({ index, field: 'root', message: 'Activity must be a JSON object.' });
    return { valid: false, activity: null, errors };
  }

  // 1. Sentence
  let sentence = typeof item.sentence === 'string' ? item.sentence.trim() : '';
  
  // 2. Correct Order Words
  let correctOrder: string[] = [];
  if (Array.isArray(item.correct_order) && item.correct_order.length > 0) {
    correctOrder = item.correct_order.map((w: any) => String(w).trim()).filter(Boolean);
  } else if (Array.isArray(item.correctOrder) && item.correctOrder.length > 0) {
    correctOrder = item.correctOrder.map((w: any) => String(w).trim()).filter(Boolean);
  } else if (Array.isArray(item.words) && item.words.length > 0) {
    correctOrder = item.words.map((w: any) => String(w).trim()).filter(Boolean);
  } else if (sentence) {
    correctOrder = sentence.split(/\s+/).filter(Boolean);
  }

  if (!sentence && correctOrder.length > 0) {
    sentence = correctOrder.join(' ');
  }

  if (!sentence) {
    errors.push({ index, field: 'sentence', message: 'Sentence or words list is required.' });
  }

  // 3. Strict Word Limits (3 to 6 words)
  if (correctOrder.length < 3) {
    errors.push({
      index,
      field: 'words',
      message: `Sentence "${sentence}" contains only ${correctOrder.length} words. Minimum is 3 words.`
    });
  } else if (correctOrder.length > 6) {
    errors.push({
      index,
      field: 'words',
      message: `Sentence "${sentence}" contains ${correctOrder.length} words. Maximum allowed is 6 words.`
    });
  }

  // 4. Scrambled Words (Fisher–Yates shuffle if not provided or matches correct order)
  let scrambledWords: string[] = [];
  if (Array.isArray(item.scrambled_words) && item.scrambled_words.length > 0) {
    scrambledWords = item.scrambled_words.map((w: any) => String(w).trim()).filter(Boolean);
  } else if (Array.isArray(item.words) && item.words.length > 0 && !Array.isArray(item.correct_order)) {
    // If only `words` was provided, shuffle them
    scrambledWords = shuffleSentenceWords(correctOrder);
  } else {
    scrambledWords = shuffleSentenceWords(correctOrder);
  }

  // Ensure scrambled order has exact same length as correct order
  if (scrambledWords.length !== correctOrder.length) {
    scrambledWords = shuffleSentenceWords(correctOrder);
  }

  // If scrambled words accidentally match correct order, reshuffle
  if (
    scrambledWords.length === correctOrder.length &&
    scrambledWords.every((w, idx) => w === correctOrder[idx])
  ) {
    scrambledWords = shuffleSentenceWords(correctOrder);
  }

  // 5. Category & Level & XP
  const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Grammar';
  const level = typeof item.level === 'string' && item.level.trim() ? item.level.trim() : 'A1';
  const xp = Number(item.xp) > 0 ? Number(item.xp) : 10;
  const hint = item.hint ? String(item.hint).trim() : undefined;
  const explanation = item.explanation ? String(item.explanation).trim() : undefined;
  const is_published = item.is_published !== undefined ? Boolean(item.is_published) : true;

  if (errors.length > 0) {
    return { valid: false, activity: null, errors };
  }

  const validated: RawReorderInput = {
    sentence,
    correct_order: correctOrder,
    scrambled_words: scrambledWords,
    category,
    level,
    xp,
    hint,
    explanation,
    is_published
  };

  return { valid: true, activity: validated, errors: [] };
}

/**
 * Validates a batch or single JSON string containing sentence reorder activity/activities.
 */
export function validateReorderJSON(jsonString: string): ReorderValidationResult {
  if (!jsonString || !jsonString.trim()) {
    return {
      valid: false,
      isBulk: false,
      activity: null,
      activities: [],
      errors: [{ field: 'json', message: 'Input JSON is empty.' }],
      totalDetected: 0,
      validCount: 0
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return {
      valid: false,
      isBulk: false,
      activity: null,
      activities: [],
      errors: [{ field: 'json', message: `Invalid JSON syntax: ${err.message}` }],
      totalDetected: 0,
      validCount: 0
    };
  }

  // Handle { activities: [...] } or direct array [...]
  const isArray = Array.isArray(parsed);
  const isWrappedArray = !isArray && parsed && Array.isArray(parsed.activities);
  const isBulk = isArray || isWrappedArray;

  const rawList: any[] = isArray ? parsed : isWrappedArray ? parsed.activities : [parsed];
  const allErrors: ReorderValidationErrorItem[] = [];
  const validActivities: RawReorderInput[] = [];

  rawList.forEach((item, idx) => {
    const res = validateSingleReorder(item, idx + 1);
    if (res.valid && res.activity) {
      validActivities.push(res.activity);
    } else {
      allErrors.push(...res.errors);
    }
  });

  return {
    valid: allErrors.length === 0 && validActivities.length > 0,
    isBulk,
    activity: !isBulk && validActivities.length === 1 ? validActivities[0] : null,
    activities: validActivities,
    errors: allErrors,
    totalDetected: rawList.length,
    validCount: validActivities.length
  };
}
