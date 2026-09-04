// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: SINGLE SOURCE OF TRUTH QUESTION GRADING ENGINE
// Provides stable option IDs, backward-compatible answer resolution, and
// precise grading across Multiple Choice, True/False, Fill in Blank,
// Sentence Reordering, Odd One Out, and WH Comprehension questions.
// Resolves option IDs, texts, prefixes ("B. Sophie"), casing, and whitespace.
// ============================================================================

import { CourseQuestion } from '@/types/courseStudio';

export interface NormalizedOption {
  id: string;   // Stable ID: 'A', 'B', 'C', 'D', etc.
  text: string; // Clean option text
}

export interface ResolvedCorrectOption {
  id: string;        // Stable option ID (e.g. 'B')
  text: string;      // Option text (e.g. 'Sophie')
  display: string;   // Clean human display (e.g. 'B) Sophie' or 'Sophie')
  index: number;     // 0-indexed position
}

export interface EvaluationResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback: string;
  languageFeedback?: string | null;
  correctOption?: ResolvedCorrectOption | null;
}

/**
 * Cleans punctuation and whitespace for fuzzy, punctuation-insensitive string comparisons.
 */
export function cleanTextForComparison(text: any): string {
  if (text == null) return '';
  return String(text)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes question options into an array of { id, text } objects.
 * Supports:
 * - string[]: ['Tom', 'Sophie', 'Sarah', 'Anna'] -> [{ id: 'A', text: 'Tom' }, ...]
 * - string[] with prefixes: ['A. Tom', 'B. Sophie'] -> [{ id: 'A', text: 'Tom' }, ...]
 * - { id?, text? }[]: [{ id: 'B', text: 'Sophie' }]
 * - object mapping: { A: 'Tom', B: 'Sophie' }
 */
export function normalizeQuestionOptions(rawOptions: any): NormalizedOption[] {
  if (!rawOptions) return [];

  let optionsArray: any[] = [];
  if (Array.isArray(rawOptions)) {
    optionsArray = rawOptions;
  } else if (typeof rawOptions === 'object' && rawOptions !== null) {
    if (Array.isArray(rawOptions.options)) {
      optionsArray = rawOptions.options;
    } else {
      // Key-value pairs like { A: 'Tom', B: 'Sophie' }
      optionsArray = Object.entries(rawOptions).map(([key, val]) => {
        if (typeof val === 'string') return { id: key, text: val };
        if (typeof val === 'object' && val !== null) return { id: key, ...(val as any) };
        return { id: key, text: String(val) };
      });
    }
  }

  return optionsArray.map((opt, index) => {
    const defaultLetter = String.fromCharCode(65 + index); // 'A', 'B', 'C'...

    if (typeof opt === 'string') {
      const trimmed = opt.trim();
      // Check if string starts with "A) " or "A. " or "A - " or "A: "
      const prefixMatch = trimmed.match(/^([A-Z0-9])[\.\)\:\-]\s*(.*)$/i);
      if (prefixMatch) {
        return {
          id: prefixMatch[1].toUpperCase(),
          text: prefixMatch[2].trim() || trimmed
        };
      }
      return {
        id: defaultLetter,
        text: trimmed
      };
    }

    if (typeof opt === 'object' && opt !== null) {
      let id = String(opt.id || opt.key || defaultLetter).trim().toUpperCase();
      let text = String(opt.text || opt.label || opt.value || '').trim();

      // If text itself has an embedded prefix like "B. Sophie", extract clean text and id
      const textPrefixMatch = text.match(/^([A-Z0-9])[\.\)\:\-]\s*(.*)$/i);
      if (textPrefixMatch) {
        if (!opt.id) id = textPrefixMatch[1].toUpperCase();
        text = textPrefixMatch[2].trim() || text;
      }

      return { id, text };
    }

    return {
      id: defaultLetter,
      text: String(opt).trim()
    };
  });
}

/**
 * Extracts the raw correct answer string/value from a question object,
 * handling all possible field naming conventions.
 */
export function getRawCorrectAnswer(question: any): any {
  if (!question) return '';
  if (question.correct_answer !== undefined && question.correct_answer !== null) return question.correct_answer;
  if (question.correctAnswer !== undefined && question.correctAnswer !== null) return question.correctAnswer;
  if (question.correct_option !== undefined && question.correct_option !== null) return question.correct_option;
  if (question.correctOption !== undefined && question.correctOption !== null) return question.correctOption;
  if (question.expected_answer !== undefined && question.expected_answer !== null) return question.expected_answer;
  if (question.expectedAnswer !== undefined && question.expectedAnswer !== null) return question.expectedAnswer;
  if (question.answer !== undefined && question.answer !== null) return question.answer;
  return '';
}

/**
 * Resolves the canonical correct option for a question.
 * Checks option ID, option text, cleaned text, prefix formats ("B. Sophie"),
 * and valid numeric indexes. NEVER silently falls back to Option 0.
 */
export function resolveCorrectOption(question: {
  options?: any;
  correct_answer?: any;
  correctAnswer?: any;
  [key: string]: any;
}): ResolvedCorrectOption | null {
  const normalized = normalizeQuestionOptions(question.options);
  if (normalized.length === 0) return null;

  const rawVal = getRawCorrectAnswer(question);
  if (rawVal === undefined || rawVal === null) return null;

  // Handle boolean true/false
  let rawCorrect = '';
  if (typeof rawVal === 'boolean') {
    rawCorrect = rawVal ? 'True' : 'False';
  } else if (typeof rawVal === 'object' && rawVal !== null) {
    rawCorrect = String(rawVal.id || rawVal.text || rawVal.value || '');
  } else {
    rawCorrect = String(rawVal).trim();
  }

  if (!rawCorrect) return null;

  const rawLower = rawCorrect.toLowerCase();
  const rawClean = cleanTextForComparison(rawCorrect);

  // 1. Direct match by option ID (e.g. 'B' === 'B')
  for (let idx = 0; idx < normalized.length; idx++) {
    const opt = normalized[idx];
    if (opt.id.toLowerCase() === rawLower) {
      return {
        id: opt.id,
        text: opt.text,
        display: `${opt.id}) ${opt.text}`,
        index: idx
      };
    }
  }

  // 2. Direct match by exact option text (e.g. 'Sophie' === 'Sophie')
  for (let idx = 0; idx < normalized.length; idx++) {
    const opt = normalized[idx];
    if (opt.text.toLowerCase() === rawLower) {
      return {
        id: opt.id,
        text: opt.text,
        display: `${opt.id}) ${opt.text}`,
        index: idx
      };
    }
  }

  // 3. Match by cleaned option text (ignoring trailing dots, quotes, whitespace)
  if (rawClean) {
    for (let idx = 0; idx < normalized.length; idx++) {
      const opt = normalized[idx];
      if (cleanTextForComparison(opt.text) === rawClean) {
        return {
          id: opt.id,
          text: opt.text,
          display: `${opt.id}) ${opt.text}`,
          index: idx
        };
      }
    }
  }

  // 4. Match prefix format: 'B) Sophie' or 'B. Sophie' or 'B: Sophie' or 'B - Sophie'
  const prefixMatch = rawCorrect.match(/^([a-z0-9])[\.\)\:\-]\s*(.*)$/i);
  if (prefixMatch) {
    const letter = prefixMatch[1].toUpperCase();
    const textPart = prefixMatch[2].trim();
    const cleanPart = cleanTextForComparison(textPart);

    // 4a. Match both letter ID and text part
    const bothMatch = normalized.find(
      (o, idx) => (o.id === letter || idx === letter.charCodeAt(0) - 65) && cleanTextForComparison(o.text) === cleanPart
    );
    if (bothMatch) {
      const foundIdx = normalized.indexOf(bothMatch);
      return { id: bothMatch.id, text: bothMatch.text, display: `${bothMatch.id}) ${bothMatch.text}`, index: foundIdx };
    }

    // 4b. Match letter ID
    const idMatch = normalized.find((o, idx) => o.id === letter || idx === letter.charCodeAt(0) - 65);
    if (idMatch) {
      const foundIdx = normalized.indexOf(idMatch);
      return { id: idMatch.id, text: idMatch.text, display: `${idMatch.id}) ${idMatch.text}`, index: foundIdx };
    }

    // 4c. Match text part
    if (cleanPart) {
      const textMatch = normalized.find(o => cleanTextForComparison(o.text) === cleanPart);
      if (textMatch) {
        const foundIdx = normalized.indexOf(textMatch);
        return { id: textMatch.id, text: textMatch.text, display: `${textMatch.id}) ${textMatch.text}`, index: foundIdx };
      }
    }
  }

  // 5. Match 'Option A', 'Option B', 'Choice A'
  const optionWordMatch = rawLower.match(/^(?:option|choice)\s+([a-z0-9])$/i);
  if (optionWordMatch) {
    const letter = optionWordMatch[1].toUpperCase();
    const foundIdx = normalized.findIndex((o, idx) => o.id === letter || idx === letter.charCodeAt(0) - 65);
    if (foundIdx !== -1) {
      const opt = normalized[foundIdx];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: foundIdx };
    }
  }

  // 6. Match numeric index: '0' (0-based) or '1' (1-based or 0-based)
  if (/^\d+$/.test(rawCorrect)) {
    const num = parseInt(rawCorrect, 10);
    // If num is 1..length, it's 1-based (e.g. 1 -> A, 2 -> B)
    if (num >= 1 && num <= normalized.length) {
      const opt = normalized[num - 1];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: num - 1 };
    }
    // If num is 0, it's 0-based index 0
    if (num === 0 && normalized.length > 0) {
      const opt = normalized[0];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: 0 };
    }
  }

  // DO NOT silently default to Option 0! Return null if unresolved.
  return null;
}

/**
 * Checks whether a student's answer matches the target option.
 * Handles:
 * - Option ID ('B' === 'B')
 * - Option text ('Sophie' === 'Sophie')
 * - Punctuation & whitespace stripped ('sophie' === 'sophie.')
 * - Full string with prefix ('B. Sophie' matches option B)
 * - Object shapes ({ id: 'B' }, { text: 'Sophie' }, { value: 'B' })
 */
export function isOptionMatchingStudentAnswer(
  option: NormalizedOption,
  studentAnswer: any
): boolean {
  if (studentAnswer == null || !option) return false;

  // Handle object answers
  if (typeof studentAnswer === 'object') {
    const sId = studentAnswer.id || studentAnswer.key || studentAnswer.value || studentAnswer.selected;
    if (sId && String(sId).trim().toUpperCase() === option.id.toUpperCase()) return true;

    const sText = studentAnswer.text || studentAnswer.label || studentAnswer.answer;
    if (sText && cleanTextForComparison(sText) === cleanTextForComparison(option.text)) return true;
  }

  const ansStr = String(studentAnswer).trim();
  if (!ansStr) return false;

  const ansUpper = ansStr.toUpperCase();
  const ansClean = cleanTextForComparison(ansStr);
  const optClean = cleanTextForComparison(option.text);

  // 1. Direct match by Option ID ('B' === 'B')
  if (ansUpper === option.id.toUpperCase()) return true;

  // 2. Direct match by Option Text ('Sophie' === 'Sophie')
  if (ansClean === optClean && optClean.length > 0) return true;

  // 3. Match 'B) Sophie' or 'B. Sophie' or 'B - Sophie'
  const prefixMatch = ansStr.match(/^([a-z0-9])[\.\)\:\-]\s*(.*)$/i);
  if (prefixMatch) {
    const letter = prefixMatch[1].toUpperCase();
    const textPartClean = cleanTextForComparison(prefixMatch[2]);
    if (letter === option.id.toUpperCase()) return true;
    if (textPartClean && textPartClean === optClean) return true;
  }

  // 4. Match 'Option B'
  const optWordMatch = ansStr.match(/^(?:option|choice)\s+([a-z0-9])$/i);
  if (optWordMatch && optWordMatch[1].toUpperCase() === option.id.toUpperCase()) {
    return true;
  }

  // 5. Match combined "B Sophie" or "B. Sophie" without separator
  if (ansClean === cleanTextForComparison(`${option.id} ${option.text}`)) {
    return true;
  }

  return false;
}

// ============================================================================
// SEMANTIC WH & READING COMPREHENSION EVALUATION ENGINE
// ============================================================================

const SEMANTIC_STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'has', 'have', 'had', 'in', 'at', 'on', 'to', 'for',
  'of', 'with', 'by', 'from', 'she', 'he', 'it', 'they', 'her', 'his', 'my',
  'their', 'its', 'and', 'or', 'that', 'this', 'there', 'here', 'as', 'so'
]);

const PHRASE_SYNONYMS: Array<[RegExp, string]> = [
  [/\b(mom\s+and\s+dad|mother\s+and\s+father|mom\s+&\s+dad|mum\s+and\s+dad)\b/gi, 'family'],
  [/\b(parents|parent|relatives)\b/gi, 'family'],
  [/\b(mother|father|mom|dad|mum)\b/gi, 'family'],
  [/\b(likes\s+to|loves\s+to|enjoys\s+to|is\s+fond\s+of)\b/gi, 'like'],
  [/\b(likes|loves|love|enjoy|enjoys)\b/gi, 'like'],
  [/\b(pupil|pupils|learner|learners|schoolboy|schoolgirl)\b/gi, 'student'],
  [/\b(home|flat|apartment|residence)\b/gi, 'house'],
  [/\b(resides|reside|lives|stay|stays)\b/gi, 'live'],
  [/\b(kind|nice|helpful|warm|friendly)\b/gi, 'friendly'],
  [/\b(large|huge)\b/gi, 'big'],
  [/\b(little|tiny)\b/gi, 'small'],
  [/\b(starts|begin|begins|start)\b/gi, 'start'],
  [/\b(finishes|finish|ends|end|completes|complete)\b/gi, 'end'],
  [/\b(rapid|fast)\b/gi, 'quick'],
  [/\b(correct|accurate)\b/gi, 'right'],
  [/\b(talk|speaks|talks|speak)\b/gi, 'speak'],
  [/\btown\b/gi, 'city'],
  [/\b(child|children|kids)\b/gi, 'kid']
];

function lightStemWord(word: string): string {
  let w = word.toLowerCase();
  if (w.endsWith('ing') && w.length > 5) {
    w = w.slice(0, -3);
  } else if (w.endsWith('ed') && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith('es') && w.length > 4) {
    w = w.slice(0, -2);
  } else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    w = w.slice(0, -1);
  }
  return w;
}

function canonicalizeText(text: string): string {
  let s = cleanTextForComparison(text);
  for (const [pattern, replacement] of PHRASE_SYNONYMS) {
    s = s.replace(pattern, replacement);
  }
  return s.replace(/\s+/g, ' ').trim();
}

function extractKeyTokens(canonicalText: string): string[] {
  const words = canonicalText.split(' ').filter(Boolean);
  const keyWords = words
    .filter(w => !SEMANTIC_STOP_WORDS.has(w) && w.length > 1)
    .map(lightStemWord);
  return Array.from(new Set(keyWords));
}

/**
 * Checks whether a student's answer semantically matches an expected WH or comprehension answer.
 * Handles synonyms (parents <-> family, home <-> house, likes <-> enjoys),
 * beginner grammar omissions ("She from London"), and token-set overlaps.
 */
export function isSemanticWhMatch(
  studentAnswer: string,
  expectedAnswer: string,
  acceptableAnswers: string[] = []
): boolean {
  const student = String(studentAnswer || '').trim();
  if (!student) return false;

  const allAcceptable = [
    expectedAnswer,
    ...acceptableAnswers
  ].filter(s => Boolean(s && String(s).trim()));

  const cleanStudent = cleanTextForComparison(student);
  if (!cleanStudent) return false;

  // 1. Direct exact or substring match against any acceptable answer
  for (const candidate of allAcceptable) {
    const cleanCand = cleanTextForComparison(candidate);
    if (!cleanCand) continue;
    if (cleanStudent === cleanCand) return true;
    if (cleanStudent.includes(cleanCand)) return true;
    if (cleanCand.includes(cleanStudent) && cleanStudent.length > 3) return true;
  }

  // 2. Canonicalized synonym match (e.g. "with her parents" -> "with her family")
  const canStudent = canonicalizeText(student);
  for (const candidate of allAcceptable) {
    const canCand = canonicalizeText(candidate);
    if (!canCand) continue;
    if (canStudent === canCand) return true;
    if (canStudent.includes(canCand)) return true;
    if (canCand.includes(canStudent) && canStudent.length > 3) return true;
  }

  // 3. Token-set key concept overlap
  const studentTokens = extractKeyTokens(canStudent);
  if (studentTokens.length === 0) return false;

  for (const candidate of allAcceptable) {
    const canCand = canonicalizeText(candidate);
    const candTokens = extractKeyTokens(canCand);
    if (candTokens.length === 0) continue;

    const matchedTokens = candTokens.filter(ct =>
      studentTokens.some(st => st === ct || (ct.length > 3 && (st.includes(ct) || ct.includes(st))))
    );

    // Single key token (e.g. "London" or "family"): must match exactly
    if (candTokens.length === 1 && matchedTokens.length === 1) {
      return true;
    }

    // Two key tokens (e.g. "read books"): both must match
    if (candTokens.length === 2 && matchedTokens.length >= 2) {
      return true;
    }

    // Three or more key tokens: allow 80% recall (e.g. 2 of 3)
    if (candTokens.length >= 3 && matchedTokens.length >= candTokens.length - 1) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates a student answer deterministically.
 */
export function evaluateQuestionAnswer(
  question: CourseQuestion,
  studentAnswer: any
): EvaluationResult {
  const maxScore = typeof question.points === 'number' ? question.points : 10;
  const qType = (question.question_type || 'multiple_choice').toLowerCase();
  const explanation = question.explanation || '';
  const rawCorrect = getRawCorrectAnswer(question);

  // 1. MULTIPLE CHOICE
  if (qType === 'multiple_choice') {
    const resolved = resolveCorrectOption(question);

    // If resolved via option mapper
    if (resolved) {
      const matched = isOptionMatchingStudentAnswer(resolved, studentAnswer);
      const feedback = matched
        ? (explanation ? `Correct! ${explanation}` : 'Correct answer!')
        : `The correct answer is: ${resolved.display}. ${explanation}`.trim();

      return {
        isCorrect: matched,
        score: matched ? maxScore : 0,
        maxScore,
        feedback,
        correctOption: resolved
      };
    }

    // Direct fallback if options resolution was not possible but rawCorrect exists
    const cleanStudent = cleanTextForComparison(studentAnswer);
    const cleanExpected = cleanTextForComparison(rawCorrect);
    const matchedFallback = Boolean(cleanStudent && cleanExpected && cleanStudent === cleanExpected);

    return {
      isCorrect: matchedFallback,
      score: matchedFallback ? maxScore : 0,
      maxScore,
      feedback: matchedFallback
        ? (explanation ? `Correct! ${explanation}` : 'Correct!')
        : `The correct answer is: ${rawCorrect}. ${explanation}`.trim(),
      correctOption: null
    };
  }

  // 2. TRUE / FALSE & YES / NO
  if (qType === 'true_false' || qType === 'yes_no') {
    const isTrueValue = (val: any) => {
      if (val === true) return true;
      if (val === false) return false;
      const str = String(val ?? '').trim().toLowerCase();
      return str === 'true' || str === 'yes' || str === 't' || str === 'y' || str === '1';
    };

    const isFalseValue = (val: any) => {
      if (val === false) return true;
      if (val === true) return false;
      const str = String(val ?? '').trim().toLowerCase();
      return str === 'false' || str === 'no' || str === 'f' || str === 'n' || str === '0';
    };

    const correctIsTrue = isTrueValue(rawCorrect);
    const studentIsTrue = isTrueValue(studentAnswer);

    const isCorrect = (correctIsTrue && studentIsTrue) || (isFalseValue(rawCorrect) && isFalseValue(studentAnswer));
    const expectedLabel = qType === 'true_false' ? (correctIsTrue ? 'True' : 'False') : (correctIsTrue ? 'Yes' : 'No');

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? (explanation ? `Correct! ${explanation}` : 'Correct!')
        : `The correct answer is: ${expectedLabel}. ${explanation}`.trim()
    };
  }

  // 3. MULTIPLE SELECT
  if (qType === 'multiple_select') {
    const correctTokens = Array.isArray(rawCorrect)
      ? rawCorrect.map(cleanTextForComparison)
      : String(rawCorrect || '')
          .split(',')
          .map(s => cleanTextForComparison(s))
          .filter(Boolean);

    const studentTokens = Array.isArray(studentAnswer)
      ? studentAnswer.map(s => cleanTextForComparison(String(s)))
      : String(studentAnswer || '')
          .split(',')
          .map(s => cleanTextForComparison(s))
          .filter(Boolean);

    const isCorrect =
      correctTokens.length > 0 &&
      correctTokens.length === studentTokens.length &&
      studentTokens.every(st => correctTokens.includes(st));

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? 'All correct options selected!'
        : `Correct options: ${Array.isArray(rawCorrect) ? rawCorrect.join(', ') : rawCorrect}. ${explanation}`.trim()
    };
  }

  // 4. FILL IN THE BLANK
  if (qType === 'fill_blank') {
    const cleanStudent = cleanTextForComparison(studentAnswer);
    const cleanExpected = cleanTextForComparison(rawCorrect);

    const acceptable = Array.isArray(question.options)
      ? question.options.map(opt => cleanTextForComparison(typeof opt === 'string' ? opt : (opt as any)?.text || ''))
      : [];

    const extraAcceptable = Array.isArray((question as any).acceptable_answers)
      ? (question as any).acceptable_answers.map(cleanTextForComparison)
      : Array.isArray((question as any).acceptableAnswers)
      ? (question as any).acceptableAnswers.map(cleanTextForComparison)
      : [];

    const isCorrect =
      Boolean(cleanStudent) &&
      (cleanStudent === cleanExpected ||
        acceptable.includes(cleanStudent) ||
        extraAcceptable.includes(cleanStudent));

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? (explanation ? `Correct! ${explanation}` : 'Correct!')
        : `Expected: "${rawCorrect}". ${explanation}`.trim()
    };
  }

  // 5. SENTENCE REORDERING / WORD ORDERING
  if (qType === 'sentence_reordering' || qType === 'word_ordering' || qType === 'sentence_builder') {
    const cleanStudent = cleanTextForComparison(
      Array.isArray(studentAnswer) ? studentAnswer.join(' ') : String(studentAnswer || '')
    );
    const cleanExpected = cleanTextForComparison(rawCorrect);

    const isCorrect = Boolean(cleanStudent) && cleanStudent === cleanExpected;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? (explanation ? `Perfect! ${explanation}` : 'Perfect sentence sequence!')
        : `Correct order: "${rawCorrect}". ${explanation}`.trim()
    };
  }

  // 6. ODD ONE OUT
  if (qType === 'odd_one_out') {
    const cleanStudent = cleanTextForComparison(studentAnswer);
    const cleanExpected = cleanTextForComparison(rawCorrect);

    const isCorrect = Boolean(cleanStudent) && cleanStudent === cleanExpected;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? (explanation ? `Spot on! ${explanation}` : 'Spot on! That is the odd one out.')
        : `The odd one out is: ${rawCorrect}. ${explanation}`.trim()
    };
  }

  // 7. WH QUESTION & READING COMPREHENSION (SEMANTIC EVALUATOR)
  if (qType === 'wh_question' || qType === 'comprehension' || qType === 'short_answer') {
    const studentStr = String(studentAnswer || '').trim();
    const expectedAns =
      rawCorrect ||
      (question as any).expected_answer ||
      (question as any).expectedAnswer ||
      (typeof question.options === 'object' && (question.options as any)?.expected_answer) ||
      '';

    const whOptions = (typeof question.options === 'object' && question.options !== null && !Array.isArray(question.options))
      ? (question.options as any)
      : {};

    const rawCandidates: any[] = [
      expectedAns,
      whOptions.expected_answer,
      whOptions.expectedAnswer,
      ...(Array.isArray((question as any).acceptable_answers) ? (question as any).acceptable_answers : []),
      ...(Array.isArray((question as any).acceptableAnswers) ? (question as any).acceptableAnswers : []),
      ...(Array.isArray(whOptions.acceptable_answers) ? whOptions.acceptable_answers : []),
      ...(Array.isArray(whOptions.acceptableAnswers) ? whOptions.acceptableAnswers : []),
      ...(Array.isArray(question.options) ? question.options : (Array.isArray(whOptions.options) ? whOptions.options : []))
    ];

    const acceptableList: string[] = rawCandidates
      .map(c => typeof c === 'string' ? c : (c?.text || ''))
      .filter(s => Boolean(s && String(s).trim()));

    const isCorrect = isSemanticWhMatch(studentStr, expectedAns, acceptableList);

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? `Correct! ${explanation || (expectedAns ? `Identified: ${expectedAns}` : 'Accurately answered.')}`.trim()
        : `Expected: "${expectedAns}". ${explanation}`.trim(),
      languageFeedback: null
    };
  }

  // Default fallback
  const isDefaultMatch = cleanTextForComparison(studentAnswer) === cleanTextForComparison(rawCorrect);
  return {
    isCorrect: isDefaultMatch,
    score: isDefaultMatch ? maxScore : 0,
    maxScore,
    feedback: isDefaultMatch ? 'Correct!' : `The correct answer is: ${rawCorrect}. ${explanation}`.trim()
  };
}

