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

// ============================================================================
// ROBUST JSON PARSER & DIAGNOSTICS FOR AI OUTPUT
// ============================================================================

export interface BitzJsonParseErrorDetails {
  type: 'empty' | 'syntax' | 'trailing_content' | 'multiple_documents' | 'invalid_structure' | 'no_records';
  message: string;
  snippet?: string;
  position?: number;
  lineNumber?: number;
  columnNumber?: number;
  trailingText?: string;
  suggestedAction?: string;
}

export interface BitzJsonParseResult {
  success: boolean;
  records: any[];
  error: string | null;
  errorDetails?: BitzJsonParseErrorDetails;
  warning: string | null;
  hasTrailingContent: boolean;
  trailingText?: string;
  isMultipleDocuments: boolean;
  cleanedJson: string;
}

/**
 * Helper to locate the exact end index of the first balanced JSON array or object.
 * Handles strings, escaped quotes, and nested arrays/objects.
 */
function findJsonDocumentEnd(text: string, startIndex: number): number {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '[' || char === '{') {
      stack.push(char);
    } else if (char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        stack.pop();
        if (stack.length === 0) {
          return i;
        }
      }
    } else if (char === '}') {
      if (stack.length > 0 && stack[stack.length - 1] === '{') {
        stack.pop();
        if (stack.length === 0) {
          return i;
        }
      }
    }
  }

  return -1;
}

/**
 * Defensive parser for AI-generated Knowledge Bitz JSON.
 *
 * Capabilities:
 * 1. Strips UTF-8 BOM and invisible zero-width characters.
 * 2. Detects and strips markdown code fences (```json ... ```).
 * 3. Extracts first top-level JSON array/object cleanly.
 * 4. Detects trailing content (e.g. conversational explanations or second JSON arrays)
 *    and provides structured diagnostics instead of silently ignoring or crashing.
 * 5. Formats clear syntax error messages with line/column/snippet.
 */
export function parseKnowledgeBitzJSON(rawText: string): BitzJsonParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      records: [],
      error: 'Please paste the JSON response.',
      errorDetails: {
        type: 'empty',
        message: 'Input is empty.'
      },
      warning: null,
      hasTrailingContent: false,
      isMultipleDocuments: false,
      cleanedJson: ''
    };
  }

  // 1. Strip UTF-8 BOM and invisible characters
  let text = rawText
    .replace(/^[\uFEFF\u200B\u200C\u200D\u00A0]+/, '')
    .replace(/[\u200B\u200C\u200D]/g, '')
    .trim();

  // 2. Extract content from markdown fences if entire text or top is wrapped
  let hadMarkdownFences = false;
  if (text.startsWith('```')) {
    hadMarkdownFences = true;
    text = text.replace(/^```(?:json)?\s*/i, '');
    // If ending with ```, strip it
    text = text.replace(/\s*```\s*$/i, '');
    text = text.trim();
  } else {
    // Check if there is an embedded code block somewhere
    const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
    if (codeBlockMatch && codeBlockMatch[1]) {
      // Check if there is trailing content after this codeblock
      const afterCodeBlock = text.substring(codeBlockMatch.index + codeBlockMatch[0].length).trim();
      text = codeBlockMatch[1].trim();
      hadMarkdownFences = true;
      if (afterCodeBlock) {
        text = text + '\n' + afterCodeBlock;
      }
    }
  }

  // 3. Find opening bracket for array [ or object {
  const firstArrayIdx = text.indexOf('[');
  const firstObjectIdx = text.indexOf('{');

  let startIndex = -1;
  if (firstArrayIdx !== -1 && (firstObjectIdx === -1 || firstArrayIdx < firstObjectIdx)) {
    startIndex = firstArrayIdx;
  } else if (firstObjectIdx !== -1) {
    startIndex = firstObjectIdx;
  }

  if (startIndex === -1) {
    return {
      success: false,
      records: [],
      error: 'No JSON array or object found in the pasted text. Ensure the response starts with [ or { "bitz": [ ... ] }.',
      errorDetails: {
        type: 'invalid_structure',
        message: 'Could not find an opening bracket "[" or "{" in the provided text.'
      },
      warning: null,
      hasTrailingContent: false,
      isMultipleDocuments: false,
      cleanedJson: text
    };
  }

  // 4. Locate the exact boundary of the first JSON document
  const endIndex = findJsonDocumentEnd(text, startIndex);

  let firstDocumentRaw = '';
  let trailingRaw = '';

  if (endIndex === -1) {
    // Unbalanced brackets or truncated document
    firstDocumentRaw = text.substring(startIndex).trim();
    trailingRaw = '';
  } else {
    firstDocumentRaw = text.substring(startIndex, endIndex + 1).trim();
    trailingRaw = text.substring(endIndex + 1).trim();
  }

  // Clean trailing markdown fence closing if present
  if (trailingRaw.startsWith('```')) {
    trailingRaw = trailingRaw.replace(/^```\s*/i, '').trim();
  }

  const hasTrailingContent = trailingRaw.length > 0;
  let isMultipleDocuments = false;

  if (hasTrailingContent) {
    const nextBracket = trailingRaw.search(/\[|\{/);
    if (nextBracket !== -1 && nextBracket < 20) {
      isMultipleDocuments = true;
    }
  }

  // 5. Attempt JSON.parse on the first document
  let parsed: any;
  try {
    parsed = JSON.parse(firstDocumentRaw);
  } catch (err: any) {
    const errMsg = err?.message || 'Syntax error';
    let line = 1;
    let col = 1;
    let snippet = '';

    const matchPos = errMsg.match(/position\s+(\d+)/i);
    if (matchPos && matchPos[1]) {
      const pos = parseInt(matchPos[1], 10);
      const linesBefore = firstDocumentRaw.substring(0, pos).split('\n');
      line = linesBefore.length;
      col = (linesBefore[linesBefore.length - 1] || '').length + 1;
      const startSnip = Math.max(0, pos - 35);
      const endSnip = Math.min(firstDocumentRaw.length, pos + 35);
      snippet = firstDocumentRaw.substring(startSnip, endSnip);
    }

    return {
      success: false,
      records: [],
      error: `Invalid JSON syntax: ${errMsg}${line > 1 ? ` (line ${line}, col ${col})` : ''}`,
      errorDetails: {
        type: 'syntax',
        message: errMsg,
        position: matchPos && matchPos[1] ? parseInt(matchPos[1], 10) : undefined,
        lineNumber: line,
        columnNumber: col,
        snippet: snippet ? `...${snippet}...` : undefined,
        suggestedAction: 'Check for unescaped quotes, trailing commas, or missing brackets.'
      },
      warning: null,
      hasTrailingContent,
      trailingText: hasTrailingContent ? trailingRaw : undefined,
      isMultipleDocuments,
      cleanedJson: firstDocumentRaw
    };
  }

  // 6. Extract records array
  let rawRecords: any[] = [];
  if (Array.isArray(parsed)) {
    rawRecords = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.bitz)) {
      rawRecords = parsed.bitz;
    } else if (Array.isArray(parsed.facts)) {
      rawRecords = parsed.facts;
    } else if (parsed.title && (parsed.reading_text || parsed.short_fact)) {
      rawRecords = [parsed];
    } else {
      return {
        success: false,
        records: [],
        error: 'JSON must contain an array of Knowledge Bitz records (e.g. [ ... ] or { "bitz": [ ... ] }).',
        errorDetails: {
          type: 'invalid_structure',
          message: 'Parsed JSON is an object, but does not contain a "bitz" or "facts" array.'
        },
        warning: null,
        hasTrailingContent,
        trailingText: hasTrailingContent ? trailingRaw : undefined,
        isMultipleDocuments,
        cleanedJson: firstDocumentRaw
      };
    }
  }

  if (rawRecords.length === 0) {
    return {
      success: false,
      records: [],
      error: 'The JSON array is empty. Please paste at least one Knowledge Bitz record.',
      errorDetails: {
        type: 'no_records',
        message: 'Received 0 records.'
      },
      warning: null,
      hasTrailingContent,
      trailingText: hasTrailingContent ? trailingRaw : undefined,
      isMultipleDocuments,
      cleanedJson: firstDocumentRaw
    };
  }

  // 7. Check if trailing content was present
  if (hasTrailingContent) {
    const errorMsg = isMultipleDocuments
      ? 'Multiple JSON documents detected. Found extra JSON content after the first JSON array. Please paste only a single JSON array.'
      : 'Extra content found after the JSON array. Please paste only the JSON response.';

    return {
      success: false,
      records: rawRecords,
      error: errorMsg,
      errorDetails: {
        type: isMultipleDocuments ? 'multiple_documents' : 'trailing_content',
        message: errorMsg,
        trailingText: trailingRaw.length > 300 ? trailingRaw.substring(0, 300) + '...' : trailingRaw,
        suggestedAction: 'Click "Auto-Strip Extra Content" to proceed with the valid array, or remove trailing text manually.'
      },
      warning: null,
      hasTrailingContent: true,
      trailingText: trailingRaw,
      isMultipleDocuments,
      cleanedJson: firstDocumentRaw
    };
  }

  return {
    success: true,
    records: rawRecords,
    error: null,
    warning: hadMarkdownFences ? 'Markdown code fences were automatically removed.' : null,
    hasTrailingContent: false,
    isMultipleDocuments: false,
    cleanedJson: firstDocumentRaw
  };
}

