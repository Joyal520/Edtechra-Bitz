// ============================================================================
// EDTECHRA-BITZ: Canonical Content Validator
// Shared between frontend wizard and server-side import.
// Deterministic validation — no AI calls.
// ============================================================================

import { BITZ_CATEGORY_MAP, isValidSubtopicForCategory } from './bitzTopicsConfig';

const VALID_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_CATEGORIES = Object.keys(BITZ_CATEGORY_MAP);

// ============================================================================
// WORD COUNT — Robust implementation
// ============================================================================

/**
 * Count words in a text string.
 * Handles: punctuation, quotation marks, apostrophes, hyphens, whitespace, numbers.
 * Hyphenated words (e.g. "well-known") count as ONE word.
 * Contractions (e.g. "don't") count as ONE word.
 * Numbers (e.g. "1,000" or "3.14") count as ONE word.
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  // Split on whitespace boundaries, filter out empty strings and pure punctuation tokens
  const tokens = trimmed.split(/\s+/).filter((token) => {
    // Remove tokens that are ONLY punctuation (no alphanumeric content)
    return /[a-zA-Z0-9]/.test(token);
  });
  return tokens.length;
}

// ============================================================================
// FIELD VALIDATORS
// ============================================================================

export interface ValidationIssue {
  type: 'error' | 'warning';
  field: string;
  message: string;
}

/**
 * Validate short_fact: must be 20–30 words.
 */
export function validateShortFact(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!text || typeof text !== 'string' || text.trim().length < 5) {
    issues.push({ type: 'error', field: 'short_fact', message: 'Short fact is missing or too short.' });
    return issues;
  }
  const wc = countWords(text);
  if (wc < 20) {
    issues.push({ type: 'error', field: 'short_fact', message: `Short fact has ${wc} words. Required: 20–30 words.` });
  } else if (wc > 30) {
    issues.push({ type: 'error', field: 'short_fact', message: `Short fact has ${wc} words. Required: 20–30 words.` });
  }
  return issues;
}

/**
 * Validate reading: must be EXACTLY 100 words.
 */
export function validateReading(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    issues.push({ type: 'error', field: 'reading_text', message: 'Reading text is missing.' });
    return issues;
  }
  const wc = countWords(text);
  if (wc !== 100) {
    issues.push({
      type: wc >= 95 && wc <= 105 ? 'warning' : 'error',
      field: 'reading_text',
      message: `Reading word count: ${wc}. Required: exactly 100 words.`
    });
  }
  return issues;
}

/**
 * Validate quiz array: must be exactly 5 quizzes.
 * Each quiz: question, 4 options, 1 correct_answer matching an option, 2 XP.
 */
export function validateQuizArray(quiz: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!quiz) {
    issues.push({ type: 'error', field: 'quiz', message: 'Quiz is missing.' });
    return issues;
  }

  // Support both array and single object (backward compat)
  const quizArr = Array.isArray(quiz) ? quiz : [quiz];

  if (quizArr.length !== 5) {
    issues.push({
      type: 'error',
      field: 'quiz',
      message: `Quiz count: ${quizArr.length}. Required: exactly 5 quiz questions.`
    });
  }

  quizArr.forEach((q, i) => {
    const prefix = `quiz[${i}]`;

    if (!q || typeof q !== 'object') {
      issues.push({ type: 'error', field: prefix, message: `Question ${i + 1} is not a valid object.` });
      return;
    }

    // Question text
    if (!q.question || typeof q.question !== 'string' || q.question.trim().length < 5) {
      issues.push({ type: 'error', field: `${prefix}.question`, message: `Question ${i + 1}: question text is missing or too short.` });
    }

    // Options
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      issues.push({ type: 'error', field: `${prefix}.options`, message: `Question ${i + 1}: must have exactly 4 options. Found: ${Array.isArray(q.options) ? q.options.length : 0}.` });
    } else {
      // Check for empty options
      q.options.forEach((opt: any, j: number) => {
        if (!opt || typeof opt !== 'string' || opt.trim().length === 0) {
          issues.push({ type: 'error', field: `${prefix}.options[${j}]`, message: `Question ${i + 1}, Option ${j + 1}: is empty.` });
        }
      });

      // Check for duplicate options
      const uniqueOpts = new Set(q.options.map((o: string) => (o || '').trim().toLowerCase()));
      if (uniqueOpts.size < q.options.length) {
        issues.push({ type: 'warning', field: `${prefix}.options`, message: `Question ${i + 1}: has duplicate options.` });
      }
    }

    // Correct answer
    const correctAns = q.correct_answer || q.correctAnswer;
    if (!correctAns || typeof correctAns !== 'string' || correctAns.trim().length === 0) {
      issues.push({ type: 'error', field: `${prefix}.correct_answer`, message: `Question ${i + 1}: correct_answer is missing.` });
    } else if (Array.isArray(q.options) && q.options.length === 4) {
      const matchesOption = q.options.some((opt: string) => (opt || '').trim() === correctAns.trim());
      if (!matchesOption) {
        issues.push({ type: 'error', field: `${prefix}.correct_answer`, message: `Question ${i + 1}: correct_answer does not match any of the 4 options.` });
      }
    }

    // XP value
    const xp = q.xp ?? q.xpReward ?? 2;
    if (xp !== 2) {
      issues.push({ type: 'warning', field: `${prefix}.xp`, message: `Question ${i + 1}: XP is ${xp}, expected 2. Will be normalized.` });
    }
  });

  return issues;
}

// ============================================================================
// FULL RECORD VALIDATOR
// ============================================================================

export interface ValidatedBitzRecord {
  original: any;
  status: 'valid' | 'warning' | 'error';
  issues: ValidationIssue[];
}

/**
 * Validate a single Knowledge Bitz record.
 */
export function validateBitzRecord(record: any, index: number): ValidatedBitzRecord {
  const issues: ValidationIssue[] = [];

  // Title
  if (!record.title || typeof record.title !== 'string' || record.title.trim().length < 5) {
    issues.push({ type: 'error', field: 'title', message: `Fact #${index + 1}: Title is missing or less than 5 characters.` });
  }

  // Short fact (20-30 words)
  issues.push(...validateShortFact(record.short_fact).map((i) => ({ ...i, message: `Fact #${index + 1}: ${i.message}` })));

  // Reading text (exactly 100 words)
  const readingText = record.reading_text || record.reading;
  issues.push(...validateReading(readingText).map((i) => ({ ...i, message: `Fact #${index + 1}: ${i.message}` })));

  // Category validation
  const categoryId = record.category_id || record.category;
  if (!categoryId) {
    issues.push({ type: 'error', field: 'category', message: `Fact #${index + 1}: Category is missing.` });
  } else if (!VALID_CATEGORIES.includes(categoryId) && !BITZ_CATEGORY_MAP[categoryId]) {
    // Allow category names too (for AI-generated content)
    const matchByName = Object.values(BITZ_CATEGORY_MAP).find(
      (c) => c.name.toLowerCase() === String(categoryId).toLowerCase()
    );
    if (!matchByName) {
      issues.push({ type: 'warning', field: 'category', message: `Fact #${index + 1}: Category '${categoryId}' is not one of the 10 main categories.` });
    }
  }

  // Subtopic validation
  const subtopic = record.subtopic || record.sub_topic;
  if (!subtopic) {
    issues.push({ type: 'warning', field: 'subtopic', message: `Fact #${index + 1}: Subtopic is missing. Will use 'General'.` });
  } else if (categoryId && !isValidSubtopicForCategory(categoryId, subtopic)) {
    // Subtopic generated by AI is acceptable as custom tag
  }

  // CEFR level
  const cefr = record.cefr_level || record.level;
  if (!cefr || !VALID_CEFR_LEVELS.includes(cefr)) {
    issues.push({ type: 'error', field: 'cefr_level', message: `Fact #${index + 1}: CEFR level '${cefr || 'missing'}' is invalid. Must be one of: ${VALID_CEFR_LEVELS.join(', ')}.` });
  }

  // Quiz validation (5 questions, 4 options, 2 XP)
  issues.push(...validateQuizArray(record.quiz).map((i) => ({ ...i, message: `Fact #${index + 1}: ${i.message}` })));

  // Determine overall status
  const hasErrors = issues.some((i) => i.type === 'error');
  const hasWarnings = issues.some((i) => i.type === 'warning');
  const status: 'valid' | 'warning' | 'error' = hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid';

  return { original: record, status, issues };
}

/**
 * Validate an entire batch of Knowledge Bitz records.
 * Also checks for duplicate titles within the batch.
 */
export function validateBitzBatch(records: any[]): {
  results: ValidatedBitzRecord[];
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    importable: number;
  };
} {
  const results: ValidatedBitzRecord[] = [];
  const seenTitles = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const result = validateBitzRecord(records[i], i);

    // Check for duplicate titles within batch
    const title = (records[i].title || '').trim().toLowerCase();
    if (title && seenTitles.has(title)) {
      result.issues.push({
        type: 'error',
        field: 'title',
        message: `Fact #${i + 1}: Duplicate title '${records[i].title}' found within this batch.`
      });
      if (result.status !== 'error') result.status = 'error';
    }
    if (title) seenTitles.add(title);

    results.push(result);
  }

  const valid = results.filter((r) => r.status === 'valid').length;
  const warnings = results.filter((r) => r.status === 'warning').length;
  const errors = results.filter((r) => r.status === 'error').length;

  return {
    results,
    summary: {
      total: records.length,
      valid,
      warnings,
      errors,
      importable: valid + warnings
    }
  };
}
