// ============================================================================
// EDTECHRA-BITZ: Canonical Content Validator
// Shared between frontend wizard and server-side import.
// Deterministic validation — no AI calls.
// ============================================================================

import { BITZ_CATEGORY_MAP, isValidSubtopicForCategory } from './bitzTopicsConfig.ts';

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
 * Validate short_fact: target is 20–30 words.
 */
export function validateShortFact(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    issues.push({ type: 'error', field: 'short_fact', message: 'Short fact is missing or empty.' });
    return issues;
  }
  const wc = countWords(text);
  if (wc < 18 || wc > 35) {
    issues.push({
      type: 'error',
      field: 'short_fact',
      message: `Short fact has ${wc} words. Required: approximately 20–30 words.`
    });
  } else if (wc < 20 || wc > 30) {
    issues.push({
      type: 'warning',
      field: 'short_fact',
      message: `Short fact has ${wc} words. Target is 20–30 words.`
    });
  }
  return issues;
}

/**
 * Validate reading: target is 90–110 words (~100 words).
 */
export function validateReading(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    issues.push({ type: 'error', field: 'reading_text', message: 'Reading text (reading_text) is missing or empty (received 0 words).' });
    return issues;
  }
  const wc = countWords(text);
  if (wc < 80 || wc > 125) {
    issues.push({
      type: 'error',
      field: 'reading_text',
      message: `Reading word count: ${wc} words. Required: approximately 100 words (90–110 words target).`
    });
  } else if (wc < 90 || wc > 110) {
    issues.push({
      type: 'warning',
      field: 'reading_text',
      message: `Reading word count: ${wc} words. Target is 90–110 words.`
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
      type: quizArr.length >= 1 ? 'warning' : 'error',
      field: 'quiz',
      message: `Quiz count: ${quizArr.length}/5. Required: exactly 5 quiz questions.`
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
    const options = q.options || q.choices;
    if (!Array.isArray(options) || options.length !== 4) {
      issues.push({ type: 'error', field: `${prefix}.options`, message: `Question ${i + 1}: must have exactly 4 options. Found: ${Array.isArray(options) ? options.length : 0}.` });
    } else {
      // Check for empty options
      options.forEach((opt: any, j: number) => {
        if (!opt || typeof opt !== 'string' || opt.trim().length === 0) {
          issues.push({ type: 'error', field: `${prefix}.options[${j}]`, message: `Question ${i + 1}, Option ${j + 1}: is empty.` });
        }
      });

      // Check for duplicate options
      const uniqueOpts = new Set(options.map((o: string) => (o || '').trim().toLowerCase()));
      if (uniqueOpts.size < options.length) {
        issues.push({ type: 'warning', field: `${prefix}.options`, message: `Question ${i + 1}: has duplicate options.` });
      }
    }

    // Correct answer
    const correctAns = q.correct_answer || q.correctAnswer || q.answer;
    if (!correctAns || typeof correctAns !== 'string' || correctAns.trim().length === 0) {
      issues.push({ type: 'error', field: `${prefix}.correct_answer`, message: `Question ${i + 1}: correct_answer is missing.` });
    } else if (Array.isArray(options) && options.length === 4) {
      const matchesOption = options.some((opt: string) => (opt || '').trim() === correctAns.trim());
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

export interface BitzValidationMetrics {
  title: string;
  category: string;
  subtopic: string;
  cefrLevel: string;
  shortFactWords: number;
  readingWords: number;
  quizCount: number;
  totalXp: number;
}

export interface ValidatedBitzRecord {
  original: any;
  canonical: any;
  status: 'valid' | 'warning' | 'error';
  issues: ValidationIssue[];
  metrics: BitzValidationMetrics;
}

/**
 * Validate a single Knowledge Bitz record and normalize it into canonical form.
 */
export function validateBitzRecord(record: any, index: number): ValidatedBitzRecord {
  const issues: ValidationIssue[] = [];

  // 1. Title
  const title = String(record.title || '').trim();
  if (!title || title.length < 5) {
    issues.push({ type: 'error', field: 'title', message: `Fact #${index + 1}: Title is missing or less than 5 characters.` });
  }

  // 2. Short fact (20-30 words)
  const shortFact = String(record.short_fact || record.shortFact || record.summary || record.fact || '').trim();
  issues.push(...validateShortFact(shortFact).map((i) => ({ ...i, message: `Fact #${index + 1}: ${i.message}` })));

  // 3. Reading text (approximately 100 words: 90–110 target)
  const readingText = String(record.reading_text || record.reading || record.reading_content || record.content || '').trim();
  issues.push(...validateReading(readingText).map((i) => ({ ...i, message: `Fact #${index + 1}: ${i.message}` })));

  // 4. Category validation
  const rawCat = record.category || record.category_id || record.categoryGroup || '';
  let resolvedCategory = String(rawCat).trim();
  if (!resolvedCategory) {
    issues.push({ type: 'error', field: 'category', message: `Fact #${index + 1}: Category is missing.` });
    resolvedCategory = 'Science & Nature';
  } else if (!VALID_CATEGORIES.includes(resolvedCategory) && !BITZ_CATEGORY_MAP[resolvedCategory]) {
    const matchByName = Object.values(BITZ_CATEGORY_MAP).find(
      (c) => c.name.toLowerCase() === resolvedCategory.toLowerCase()
    );
    if (matchByName) {
      resolvedCategory = matchByName.name;
    } else {
      issues.push({ type: 'warning', field: 'category', message: `Fact #${index + 1}: Category '${resolvedCategory}' is not one of the 10 main categories. Will use 'Science & Nature'.` });
    }
  } else if (BITZ_CATEGORY_MAP[resolvedCategory]) {
    resolvedCategory = BITZ_CATEGORY_MAP[resolvedCategory].name;
  }

  // 5. Subtopic validation
  const subtopic = String(record.subtopic || record.sub_topic || '').trim();
  if (!subtopic) {
    issues.push({ type: 'warning', field: 'subtopic', message: `Fact #${index + 1}: Subtopic is missing. Will use 'General'.` });
  } else if (resolvedCategory && !isValidSubtopicForCategory(resolvedCategory, subtopic)) {
    // Info/warning for non-standard subtopic
  }

  // 6. CEFR level
  const rawCefr = String(record.cefr_level || record.level || record.cefrLevel || 'B1').toUpperCase().trim();
  const cefrLevel = VALID_CEFR_LEVELS.includes(rawCefr) ? rawCefr : 'B1';
  if (!record.cefr_level && !record.level && !record.cefrLevel) {
    issues.push({ type: 'warning', field: 'cefr_level', message: `Fact #${index + 1}: CEFR level missing. Defaulting to B1.` });
  } else if (!VALID_CEFR_LEVELS.includes(rawCefr)) {
    issues.push({ type: 'error', field: 'cefr_level', message: `Fact #${index + 1}: CEFR level '${rawCefr}' is invalid. Must be one of: ${VALID_CEFR_LEVELS.join(', ')}.` });
  }

  // 7. Quiz validation (5 questions, 4 options, 2 XP each = 10 XP)
  const rawQuiz = record.quiz;
  issues.push(...validateQuizArray(rawQuiz).map((i) => ({ ...i, message: `Fact #${index + 1}: ${i.message}` })));

  // Normalize quiz array
  let normalizedQuiz = null;
  if (Array.isArray(rawQuiz)) {
    normalizedQuiz = rawQuiz.map((q: any) => ({
      question: String(q?.question || '').trim(),
      options: (q?.options || q?.choices || []).map((o: any) => String(o || '').trim()),
      correct_answer: String(q?.correct_answer || q?.correctAnswer || q?.answer || (q?.options || [])[0] || '').trim(),
      explanation: String(q?.explanation || 'Verified answer.').trim(),
      xp: 2
    }));
  } else if (rawQuiz && typeof rawQuiz === 'object' && rawQuiz.question) {
    normalizedQuiz = [{
      question: String(rawQuiz.question).trim(),
      options: (rawQuiz.options || rawQuiz.choices || []).map((o: any) => String(o || '').trim()),
      correct_answer: String(rawQuiz.correct_answer || rawQuiz.correctAnswer || rawQuiz.answer || (rawQuiz.options || [])[0] || '').trim(),
      explanation: String(rawQuiz.explanation || 'Verified answer.').trim(),
      xp: 2
    }];
  }

  const shortFactWords = countWords(shortFact);
  const readingWords = countWords(readingText);
  const quizCount = normalizedQuiz ? normalizedQuiz.length : 0;
  const totalXp = quizCount * 2;

  // Build canonical record
  const canonical = {
    title,
    short_fact: shortFact,
    reading_text: readingText,
    category: resolvedCategory,
    sub_topic: subtopic || 'General',
    difficulty: ['Easy', 'Medium', 'Hard'].includes(record.difficulty) ? record.difficulty : 'Easy',
    cefr_level: cefrLevel,
    source_citation: record.source_citation || record.sourceCitation || record.source || null,
    quiz: normalizedQuiz,
    xp_value: 10,
    status: 'draft'
  };

  const hasErrors = issues.some((i) => i.type === 'error');
  const hasWarnings = issues.some((i) => i.type === 'warning');
  const status: 'valid' | 'warning' | 'error' = hasErrors ? 'error' : hasWarnings ? 'warning' : 'valid';

  return {
    original: record,
    canonical,
    status,
    issues,
    metrics: {
      title: title || 'Untitled Record',
      category: resolvedCategory,
      subtopic: subtopic || 'General',
      cefrLevel,
      shortFactWords,
      readingWords,
      quizCount,
      totalXp
    }
  };
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
    const titleKey = result.canonical.title.toLowerCase();
    if (titleKey && seenTitles.has(titleKey)) {
      result.issues.push({
        type: 'error',
        field: 'title',
        message: `Fact #${i + 1}: Duplicate title '${result.canonical.title}' found within this batch.`
      });
      result.status = 'error';
    }
    if (titleKey) seenTitles.add(titleKey);

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
