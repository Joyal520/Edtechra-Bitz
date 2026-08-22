// ============================================================================
// EDTECHRA-BITZ: Spelling Scramble Batch Validation Utility
// ============================================================================

import {
  RawSpellingScrambleInput,
  SpellingScrambleValidationErrorItem,
  SpellingScrambleValidationResult,
  SpellingDifficulty
} from '@/types/spellingScramble';
import { SPELLING_SCRAMBLE_CONFIG } from './quizConfig';
import { sanitizeJsonInput } from './quizValidation';

/**
 * Helper to produce a deterministic or pseudo-random scramble of a word
 */
export function generateScrambledLetters(word: string): string[] {
  const letters = word.toUpperCase().split('');
  if (letters.length <= 1) return letters;

  // Shuffle letters until it does not equal the original word (up to 10 attempts)
  let shuffled = [...letters];
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.join('') !== word.toUpperCase()) break;
  }
  return shuffled;
}

/**
 * Validates a single Spelling Scramble item
 */
export function validateSingleSpellingScramble(
  item: any,
  seenWords: Set<string>
): { valid: boolean; errors: string[]; scramble?: RawSpellingScrambleInput } {
  const errors: string[] = [];

  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['Item is not a valid JSON object.'] };
  }

  // 1. Word validation
  const rawWord = typeof item.word === 'string' ? item.word.trim().toUpperCase() : '';
  if (!rawWord) {
    errors.push('Word is missing or empty.');
  } else if (!/^[A-Z]+$/.test(rawWord)) {
    errors.push(`Word "${rawWord}" contains invalid characters. Must contain only letters A-Z.`);
  } else if (rawWord.length < 3) {
    errors.push(`Word "${rawWord}" is too short (${rawWord.length} letters). Minimum is 3 letters.`);
  } else if (rawWord.length > 16) {
    errors.push(`Word "${rawWord}" is too long (${rawWord.length} letters). Maximum is 16 letters.`);
  } else if (seenWords.has(rawWord)) {
    errors.push(`Duplicate word "${rawWord}" detected in this batch.`);
  } else {
    seenWords.add(rawWord);
  }

  // 2. Scrambled Letters validation
  let scrambledLetters: string[] = [];
  const rawLetters = item.scrambledLetters ?? item.scrambled_letters ?? item.letters;

  if (Array.isArray(rawLetters) && rawLetters.length > 0) {
    scrambledLetters = rawLetters.map((l: any) => String(l ?? '').trim().toUpperCase()).filter(Boolean);
  } else if (typeof rawLetters === 'string' && rawLetters.trim().length > 0) {
    scrambledLetters = rawLetters.trim().toUpperCase().split('');
  } else if (rawWord) {
    // If missing from JSON, auto-generate scramble from the valid word
    scrambledLetters = generateScrambledLetters(rawWord);
  }

  if (rawWord) {
    if (scrambledLetters.length !== rawWord.length) {
      errors.push(
        `scrambledLetters count (${scrambledLetters.length}) does not match word length (${rawWord.length}).`
      );
    } else {
      // Check multiset equality (same characters and quantities)
      const sortedWord = rawWord.split('').sort().join('');
      const sortedScramble = [...scrambledLetters].sort().join('');
      if (sortedWord !== sortedScramble) {
        errors.push(
          `scrambledLetters [${scrambledLetters.join(', ')}] does not contain the exact letters of word "${rawWord}".`
        );
      }
    }
  }

  // 3. Clue validation
  const clue = typeof item.clue === 'string' ? item.clue.trim() : '';
  if (!clue) {
    errors.push('Clue is missing or empty.');
  }

  // 4. Category validation
  const category = typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Vocabulary';

  // 5. Difficulty validation (Easy, Medium, Hard)
  let difficulty: SpellingDifficulty = 'Easy';
  if (typeof item.difficulty === 'string') {
    const rawDiff = item.difficulty.trim().toLowerCase();
    if (rawDiff === 'medium') difficulty = 'Medium';
    else if (rawDiff === 'hard') difficulty = 'Hard';
    else difficulty = 'Easy';
  } else if (rawWord) {
    // Auto-infer if omitted based on word length
    if (rawWord.length <= 5) difficulty = 'Easy';
    else if (rawWord.length <= 8) difficulty = 'Medium';
    else difficulty = 'Hard';
  }

  // 6. XP (derived from difficulty if not provided or non-positive)
  const defaultXP = SPELLING_SCRAMBLE_CONFIG.DIFFICULTY_XP[difficulty];
  let xp = typeof item.xp === 'number' && item.xp > 0 ? item.xp : defaultXP;

  const is_published = item.is_published !== undefined ? Boolean(item.is_published) : true;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    scramble: {
      word: rawWord,
      scrambled_letters: scrambledLetters,
      clue,
      category,
      difficulty,
      xp,
      is_published
    }
  };
}

/**
 * Validates a complete batch payload of Spelling Scrambles
 */
export function validateSpellingScrambleBatch(
  rawInput: string | unknown
): SpellingScrambleValidationResult {
  let parsed: any;

  if (typeof rawInput === 'string') {
    const cleaned = sanitizeJsonInput(rawInput);
    if (!cleaned) {
      return {
        valid: [],
        invalid: [{ index: 0, word: 'Input', errors: ['Pasted content is empty.'] }],
        totalDetected: 0
      };
    }

    try {
      parsed = JSON.parse(cleaned);
    } catch (err: any) {
      return {
        valid: [],
        invalid: [
          {
            index: 0,
            word: 'JSON Syntax',
            errors: [`JSON Parse Error: ${err.message || 'Invalid JSON syntax'}`]
          }
        ],
        totalDetected: 0
      };
    }
  } else {
    parsed = rawInput;
  }

  let scrambleList: any[] = [];
  if (Array.isArray(parsed)) {
    scrambleList = parsed;
  } else if (parsed && Array.isArray(parsed.spellingScrambles)) {
    scrambleList = parsed.spellingScrambles;
  } else if (parsed && Array.isArray(parsed.spelling_scrambles)) {
    scrambleList = parsed.spelling_scrambles;
  } else if (parsed && Array.isArray(parsed.items)) {
    scrambleList = parsed.items;
  } else if (parsed && typeof parsed === 'object') {
    scrambleList = [parsed];
  } else {
    return {
      valid: [],
      invalid: [
        {
          index: 0,
          word: 'Root Format',
          errors: [
            'Expected a JSON object with a "spellingScrambles" array, e.g. { "spellingScrambles": [...] } or direct array [...]'
          ]
        }
      ],
      totalDetected: 0
    };
  }

  const valid: RawSpellingScrambleInput[] = [];
  const invalid: SpellingScrambleValidationErrorItem[] = [];
  const seenWords = new Set<string>();

  scrambleList.forEach((item, index) => {
    const result = validateSingleSpellingScramble(item, seenWords);
    const wordLabel = item?.word ? String(item.word).trim().toUpperCase() : `Item #${index + 1}`;

    if (result.valid && result.scramble) {
      valid.push(result.scramble);
    } else {
      invalid.push({
        index: index + 1,
        word: wordLabel,
        errors: result.errors
      });
    }
  });

  return {
    valid,
    invalid,
    totalDetected: scrambleList.length
  };
}
