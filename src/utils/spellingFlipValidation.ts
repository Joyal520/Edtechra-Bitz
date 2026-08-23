// ============================================================================
// EDTECHRA-BITZ: Spelling Flip Card Batch Validation Utility
// Validates word length, levels, CSV/JSON structures, and memorization timers.
// ============================================================================

import {
  RawSpellingFlipInput,
  SpellingFlipLevel,
  SpellingFlipValidationResult,
  SpellingFlipValidationErrorItem
} from '@/types/spellingFlipCard';

export const SPELLING_FLIP_RULES = {
  easy: { min: 3, max: 5, memorizeSeconds: 30, xp: 10, label: 'Easy (Grades 3–5)' },
  intermediate: { min: 6, max: 8, memorizeSeconds: 20, xp: 15, label: 'Intermediate (Grades 6–8)' },
  hard: { min: 9, max: 20, memorizeSeconds: 10, xp: 20, label: 'Hard (Grades 9–12)' }
};

export function normalizeSpellingLevel(levelStr?: string): SpellingFlipLevel | null {
  if (!levelStr) return null;
  const l = String(levelStr).trim().toLowerCase();
  if (l === 'easy' || l.includes('grade 3') || l.includes('grade 4') || l.includes('grade 5') || l.includes('3-5')) {
    return 'easy';
  }
  if (l === 'intermediate' || l === 'medium' || l.includes('grade 6') || l.includes('grade 7') || l.includes('grade 8') || l.includes('6-8')) {
    return 'intermediate';
  }
  if (l === 'hard' || l === 'advanced' || l.includes('grade 9') || l.includes('grade 10') || l.includes('grade 11') || l.includes('grade 12') || l.includes('9-12') || l.includes('9-20')) {
    return 'hard';
  }
  return null;
}

/**
 * Validates a single spelling flip card entry
 */
export function validateSpellingFlipEntry(
  raw: any,
  _index?: number
): { valid: boolean; entry?: RawSpellingFlipInput; errors: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Entry is empty or malformed.'] };
  }

  const rawWord = typeof raw.word === 'string' ? raw.word.trim() : '';
  if (!rawWord) {
    errors.push('Word is required.');
  }

  // Clean word: only alphabetic characters allowed
  const cleanWord = rawWord.toUpperCase().replace(/[^A-Z]/g, '');
  if (rawWord && cleanWord !== rawWord.toUpperCase()) {
    errors.push(`Word "${rawWord}" contains invalid characters (letters only).`);
  }

  const level = normalizeSpellingLevel(raw.level);
  if (!level) {
    errors.push(`Invalid level "${raw.level}". Must be Easy (3-5), Intermediate (6-8), or Hard (9-20).`);
  }

  if (cleanWord && level) {
    const rules = SPELLING_FLIP_RULES[level];
    const len = cleanWord.length;
    if (len < rules.min || len > rules.max) {
      errors.push(
        `Word "${cleanWord}" has ${len} letters, but level "${rules.label}" requires between ${rules.min} and ${rules.max} letters.`
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const rules = SPELLING_FLIP_RULES[level!];

  return {
    valid: true,
    entry: {
      word: cleanWord,
      level: level!,
      category: typeof raw.category === 'string' ? raw.category.trim() : 'General',
      memorize_seconds: rules.memorizeSeconds,
      xp: rules.xp,
      is_published: raw.is_published !== false
    },
    errors: []
  };
}

/**
 * Parses CSV lines (e.g. word,level,category) or JSON into validated entries
 */
export function parseSpellingFlipInput(rawInput: string): { items: any[]; parseError?: string } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { items: [], parseError: 'Input is empty. Please paste CSV or JSON.' };
  }

  // 1. Try JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      let list: any[] = [];
      if (Array.isArray(parsed)) list = parsed;
      else if (parsed.spellingFlipCards && Array.isArray(parsed.spellingFlipCards)) list = parsed.spellingFlipCards;
      else if (parsed.words && Array.isArray(parsed.words)) list = parsed.words;
      else if (parsed.cards && Array.isArray(parsed.cards)) list = parsed.cards;
      else {
        return { items: [], parseError: 'JSON must be an array of objects or contain a "words" or "spellingFlipCards" array.' };
      }
      return { items: list };
    } catch (err: any) {
      return { items: [], parseError: `Invalid JSON syntax: ${err.message}` };
    }
  }

  // 2. Try CSV Parsing
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { items: [], parseError: 'No lines found in CSV.' };
  }

  const items: any[] = [];
  let startIndex = 0;

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('word') && (firstLine.includes('level') || firstLine.includes('grade'))) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma
    const parts = line.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      items.push({
        word: parts[0],
        level: parts[1],
        category: parts[2] || 'General'
      });
    } else if (parts.length === 1 && parts[0]) {
      // Missing level
      items.push({
        word: parts[0],
        level: '',
        category: 'General'
      });
    }
  }

  return { items };
}

/**
 * Validates a batch of Spelling Flip Card entries (from CSV or JSON)
 */
export function validateSpellingFlipBatch(rawInput: string): SpellingFlipValidationResult {
  const { items, parseError } = parseSpellingFlipInput(rawInput);
  if (parseError) {
    return {
      valid: [],
      invalid: [{ word: 'Payload Error', errors: [parseError] }],
      totalDetected: 0
    };
  }

  const valid: RawSpellingFlipInput[] = [];
  const invalid: SpellingFlipValidationErrorItem[] = [];
  const seenWords = new Set<string>();

  items.forEach((item, idx) => {
    const index = idx + 1;
    const result = validateSpellingFlipEntry(item, index);
    const rawWord = item?.word || `Row #${index}`;

    if (!result.valid || !result.entry) {
      invalid.push({
        index,
        word: String(rawWord),
        level: item?.level,
        errors: result.errors
      });
      return;
    }

    const norm = result.entry.word.toUpperCase();
    if (seenWords.has(norm)) {
      invalid.push({
        index,
        word: norm,
        level: result.entry.level,
        errors: [`Duplicate word "${norm}" in batch.`]
      });
      return;
    }

    seenWords.add(norm);
    valid.push(result.entry);
  });

  return {
    valid,
    invalid,
    totalDetected: items.length
  };
}
