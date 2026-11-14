import type { LuminaPuzzleDefinition, LuminaWordItem } from '@/types/gameLibrary';

export const LUMINA_MAX_WORDS_PER_PUZZLE = 5;
export const LUMINA_MIN_WORD_LENGTH = 2;
export const LUMINA_MAX_WORD_LENGTH = 8;
export const LUMINA_MAX_WHEEL_LETTERS = 8;

export interface LuminaValidationResult {
  validWords: LuminaWordItem[];
  tooShortWords: string[];
  tooLongWords: { original: string; clean: string; length: number }[];
  duplicateWords: string[];
}

/**
 * Clean and validate Lumina Words entries without silently truncating long words.
 */
export function validateLuminaWords(items: LuminaWordItem[]): LuminaValidationResult {
  const validWords: LuminaWordItem[] = [];
  const tooShortWords: string[] = [];
  const tooLongWords: { original: string; clean: string; length: number }[] = [];
  const duplicateWords: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const raw = (item.word || '').trim();
    if (!raw) continue;
    const clean = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const clue = (item.clue || '').trim();

    if (clean.length > LUMINA_MAX_WORD_LENGTH) {
      tooLongWords.push({ original: raw, clean, length: clean.length });
      continue;
    }

    if (clean.length < LUMINA_MIN_WORD_LENGTH) {
      tooShortWords.push(raw);
      continue;
    }

    if (seen.has(clean)) {
      duplicateWords.push(clean);
      continue;
    }

    seen.add(clean);
    validWords.push({ word: clean, clue });
  }

  return { validWords, tooShortWords, tooLongWords, duplicateWords };
}

/**
 * Computes the minimal letter multiset needed to solve every word in a group,
 * preserving repeated-letter requirements (e.g. BOOK -> B,O,O,K) with no extra duplicates.
 */
export function computeWheelLettersForWords(words: LuminaWordItem[]): string[] {
  const maxFreq: Record<string, number> = {};
  for (const entry of words) {
    const freq: Record<string, number> = {};
    for (const ch of entry.word) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
    for (const ch of Object.keys(freq)) {
      maxFreq[ch] = Math.max(maxFreq[ch] || 0, freq[ch]);
    }
  }

  const letters: string[] = [];
  for (const ch of Object.keys(maxFreq).sort()) {
    for (let i = 0; i < maxFreq[ch]; i++) {
      letters.push(ch);
    }
  }
  return letters;
}

/**
 * Groups validated words (<= 8 chars each) into independent playable puzzles:
 * - Maximum 5 words per puzzle
 * - Maximum 8 selectable wheel tiles per puzzle
 * - All words in each puzzle guaranteed solvable from its wheel
 */
export function generateLuminaPuzzles(words: LuminaWordItem[]): LuminaPuzzleDefinition[] {
  const cleanWords = words
    .map((w) => ({
      word: (w.word || '').replace(/[^a-zA-Z]/g, '').toUpperCase(),
      clue: (w.clue || '').trim()
    }))
    .filter(
      (w) => w.word.length >= LUMINA_MIN_WORD_LENGTH && w.word.length <= LUMINA_MAX_WORD_LENGTH
    );

  if (cleanWords.length === 0) return [];

  // 1. Try preserving exact sequential groups of up to 5 words first
  const sequentialChunks: LuminaWordItem[][] = [];
  let allSequentialValid = true;
  for (let i = 0; i < cleanWords.length; i += LUMINA_MAX_WORDS_PER_PUZZLE) {
    const chunk = cleanWords.slice(i, i + LUMINA_MAX_WORDS_PER_PUZZLE);
    if (computeWheelLettersForWords(chunk).length > LUMINA_MAX_WHEEL_LETTERS) {
      allSequentialValid = false;
      break;
    }
    sequentialChunks.push(chunk);
  }

  if (allSequentialValid) {
    return sequentialChunks.map((group, idx) => ({
      puzzleNumber: idx + 1,
      letters: computeWheelLettersForWords(group),
      words: group
    }));
  }

  // 2. Otherwise reorganize into smallest set of compatible puzzles (<=5 words, <=8 wheel tiles)
  const bins: LuminaWordItem[][] = [];

  for (const item of cleanWords) {
    let bestBinIdx = -1;
    let bestNewSize = Infinity;
    let bestDelta = Infinity;

    for (let i = 0; i < bins.length; i++) {
      const bin = bins[i];
      if (bin.length >= LUMINA_MAX_WORDS_PER_PUZZLE) continue;
      const curSize = computeWheelLettersForWords(bin).length;
      const nextSize = computeWheelLettersForWords([...bin, item]).length;
      if (nextSize <= LUMINA_MAX_WHEEL_LETTERS) {
        const delta = nextSize - curSize;
        if (delta < bestDelta || (delta === bestDelta && nextSize < bestNewSize)) {
          bestDelta = delta;
          bestNewSize = nextSize;
          bestBinIdx = i;
        }
      }
    }

    if (bestBinIdx !== -1) {
      bins[bestBinIdx].push(item);
    } else {
      bins.push([item]);
    }
  }

  return bins.map((group, idx) => ({
    puzzleNumber: idx + 1,
    letters: computeWheelLettersForWords(group),
    words: group
  }));
}
