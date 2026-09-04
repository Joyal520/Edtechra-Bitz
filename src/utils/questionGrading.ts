// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: SINGLE SOURCE OF TRUTH QUESTION GRADING ENGINE
// Provides stable option IDs, backward-compatible answer resolution, and
// precise grading across Multiple Choice, True/False, Fill in Blank,
// Sentence Reordering, Odd One Out, and WH Comprehension questions.
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
 * Normalizes question options into an array of { id, text } objects.
 * Supports:
 * - string[]: ['Tom', 'Sophie', 'Sarah', 'Anna'] -> [{ id: 'A', text: 'Tom' }, ...]
 * - { id?, text? }[]: [{ id: 'B', text: 'Sophie' }]
 * - string with prefix: ['A) Tom', 'B. Sophie'] -> [{ id: 'A', text: 'Tom' }, ...]
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
      // Check if string starts with "A) " or "A. " or "A - "
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
      const id = String(opt.id || opt.key || defaultLetter).trim().toUpperCase();
      const text = String(opt.text || opt.label || opt.value || '').trim();
      return { id, text };
    }

    return {
      id: defaultLetter,
      text: String(opt).trim()
    };
  });
}

/**
 * Resolves the canonical correct option for a question.
 * Compares against:
 * 1. Option ID (e.g. 'B')
 * 2. Option Text (e.g. 'Sophie')
 * 3. Prefix format (e.g. 'B) Sophie', 'Option B')
 * 4. Numeric index (0-based or 1-based)
 */
export function resolveCorrectOption(question: {
  options?: any;
  correct_answer?: any;
}): ResolvedCorrectOption | null {
  const normalized = normalizeQuestionOptions(question.options);
  if (normalized.length === 0) return null;

  const rawCorrect = String(question.correct_answer ?? '').trim();
  if (!rawCorrect) return null;

  const rawLower = rawCorrect.toLowerCase();

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

  // 2. Direct match by option text (e.g. 'Sophie' === 'Sophie')
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

  // 3. Match 'Option A', 'Option B'
  const optionWordMatch = rawLower.match(/^option\s+([a-z0-9])$/i);
  if (optionWordMatch) {
    const letter = optionWordMatch[1].toUpperCase();
    const foundIdx = normalized.findIndex(o => o.id === letter);
    if (foundIdx !== -1) {
      const opt = normalized[foundIdx];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: foundIdx };
    }
  }

  // 4. Match 'B) Sophie' or 'B. Sophie' or 'B: Sophie'
  const prefixMatch = rawCorrect.match(/^([a-z0-9])[\.\)\:\-]\s*(.*)$/i);
  if (prefixMatch) {
    const letter = prefixMatch[1].toUpperCase();
    const textPart = prefixMatch[2].trim().toLowerCase();
    const foundIdx = normalized.findIndex(o => o.id === letter || (textPart && o.text.toLowerCase() === textPart));
    if (foundIdx !== -1) {
      const opt = normalized[foundIdx];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: foundIdx };
    }
  }

  // 5. Match numeric index: '0' (0-based) or '1' (1-based vs 0-based)
  const num = parseInt(rawCorrect, 10);
  if (!isNaN(num)) {
    // Try 0-based
    if (num >= 0 && num < normalized.length) {
      const opt = normalized[num];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: num };
    }
    // Try 1-based
    if (num >= 1 && num <= normalized.length) {
      const opt = normalized[num - 1];
      return { id: opt.id, text: opt.text, display: `${opt.id}) ${opt.text}`, index: num - 1 };
    }
  }

  // Fallback: If no match found but options exist, default to first option
  return {
    id: normalized[0].id,
    text: normalized[0].text,
    display: `${normalized[0].id}) ${normalized[0].text}`,
    index: 0
  };
}

/**
 * Checks whether a student's answer matches the target option.
 */
export function isOptionMatchingStudentAnswer(
  option: NormalizedOption,
  studentAnswer: any
): boolean {
  if (studentAnswer == null) return false;

  if (typeof studentAnswer === 'object') {
    if (studentAnswer.id && String(studentAnswer.id).trim().toUpperCase() === option.id) return true;
    if (studentAnswer.text && String(studentAnswer.text).trim().toLowerCase() === option.text.toLowerCase()) return true;
  }

  const ansStr = String(studentAnswer).trim();
  if (!ansStr) return false;

  // Match option ID directly ('B' === 'B')
  if (ansStr.toUpperCase() === option.id) return true;

  // Match option text ('Sophie' === 'Sophie')
  if (ansStr.toLowerCase() === option.text.toLowerCase()) return true;

  // Match 'B) Sophie'
  const prefixMatch = ansStr.match(/^([a-z0-9])[\.\)\:\-]\s*(.*)$/i);
  if (prefixMatch) {
    if (prefixMatch[1].toUpperCase() === option.id) return true;
    if (prefixMatch[2].trim().toLowerCase() === option.text.toLowerCase()) return true;
  }

  return false;
}

/**
 * Cleans punctuation and whitespace for string comparisons.
 */
export function cleanTextForComparison(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

  // 1. MULTIPLE CHOICE
  if (qType === 'multiple_choice') {
    const resolved = resolveCorrectOption(question);
    if (!resolved) {
      return {
        isCorrect: false,
        score: 0,
        maxScore,
        feedback: 'No correct answer specified for this question.',
        correctOption: null
      };
    }

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

  // 2. TRUE / FALSE & YES / NO
  if (qType === 'true_false' || qType === 'yes_no') {
    const rawCorrect = String(question.correct_answer ?? '').trim().toLowerCase();
    const rawStudent = String(studentAnswer ?? '').trim().toLowerCase();

    const isTrueFormat = rawCorrect === 'true' || rawCorrect === 'yes' || rawCorrect === 't' || rawCorrect === 'y';
    const isStudentTrue = rawStudent === 'true' || rawStudent === 'yes' || rawStudent === 't' || rawStudent === 'y';

    const isCorrect = isTrueFormat === isStudentTrue;
    const expectedLabel = qType === 'true_false' ? (isTrueFormat ? 'True' : 'False') : (isTrueFormat ? 'Yes' : 'No');

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
    const correctTokens = String(question.correct_answer || '')
      .split(',')
      .map(s => cleanTextForComparison(s))
      .filter(Boolean);

    const studentTokens = Array.isArray(studentAnswer)
      ? studentAnswer.map(s => cleanTextForComparison(String(s)))
      : String(studentAnswer || '').split(',').map(s => cleanTextForComparison(s));

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
        : `Correct options: ${question.correct_answer}. ${explanation}`.trim()
    };
  }

  // 4. FILL IN THE BLANK
  if (qType === 'fill_blank') {
    const cleanStudent = cleanTextForComparison(String(studentAnswer || ''));
    const cleanExpected = cleanTextForComparison(String(question.correct_answer || ''));
    const acceptable = Array.isArray(question.options)
      ? question.options.map(opt => cleanTextForComparison(typeof opt === 'string' ? opt : (opt as any)?.text || ''))
      : [];

    const isCorrect = cleanStudent === cleanExpected || (acceptable.length > 0 && acceptable.includes(cleanStudent));

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? (explanation ? `Correct! ${explanation}` : 'Correct!')
        : `Expected: "${question.correct_answer}". ${explanation}`.trim()
    };
  }

  // 5. SENTENCE REORDERING / WORD ORDERING
  if (qType === 'sentence_reordering' || qType === 'word_ordering' || qType === 'sentence_builder') {
    const cleanStudent = cleanTextForComparison(
      Array.isArray(studentAnswer) ? studentAnswer.join(' ') : String(studentAnswer || '')
    );
    const cleanExpected = cleanTextForComparison(String(question.correct_answer || ''));

    const isCorrect = cleanStudent === cleanExpected;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? (explanation ? `Perfect! ${explanation}` : 'Perfect sentence sequence!')
        : `Correct order: "${question.correct_answer}". ${explanation}`.trim()
    };
  }

  // 6. ODD ONE OUT
  if (qType === 'odd_one_out') {
    const cleanStudent = cleanTextForComparison(String(studentAnswer || ''));
    const cleanExpected = cleanTextForComparison(String(question.correct_answer || ''));

    const isCorrect = cleanStudent === cleanExpected;

    return {
      isCorrect,
      score: isCorrect ? maxScore : 0,
      maxScore,
      feedback: isCorrect
        ? (explanation ? `Spot on! ${explanation}` : 'Spot on! That is the odd one out.')
        : `The odd one out is: ${question.correct_answer}. ${explanation}`.trim()
    };
  }

  // 7. WH QUESTION (Deterministic Fast-Check fallback before/without AI)
  if (qType === 'wh_question' || qType === 'comprehension') {
    const studentStr = String(studentAnswer || '').trim();
    const cleanStudent = cleanTextForComparison(studentStr);
    const cleanExpected = cleanTextForComparison(String(question.correct_answer || (question as any).expected_answer || ''));

    const acceptableList: string[] = [
      cleanExpected,
      ...(Array.isArray((question as any).acceptable_answers) ? (question as any).acceptable_answers.map(cleanTextForComparison) : []),
      ...(Array.isArray(question.options) ? question.options.map((opt: any) => cleanTextForComparison(typeof opt === 'string' ? opt : opt?.text || '')) : [])
    ].filter(Boolean);

    // Exact match or matches any acceptable answer
    const exactMatch = acceptableList.some(acc => cleanStudent === acc);
    // Substring match: e.g. "Her best friend is Sophie" contains "Sophie"
    const containsExpected = cleanExpected.length > 2 && cleanStudent.includes(cleanExpected);

    if (exactMatch || containsExpected) {
      return {
        isCorrect: true,
        score: maxScore,
        maxScore,
        feedback: `Correct! ${explanation || 'Accurately answered based on the lesson.'}`.trim(),
        languageFeedback: null
      };
    }

    return {
      isCorrect: false,
      score: 0,
      maxScore,
      feedback: `Expected: "${question.correct_answer || (question as any).expected_answer || ''}". ${explanation}`.trim(),
      languageFeedback: null
    };
  }

  // Default fallback
  const isDefaultMatch = cleanTextForComparison(String(studentAnswer || '')) === cleanTextForComparison(String(question.correct_answer || ''));
  return {
    isCorrect: isDefaultMatch,
    score: isDefaultMatch ? maxScore : 0,
    maxScore,
    feedback: isDefaultMatch ? 'Correct!' : `The correct answer is: ${question.correct_answer}. ${explanation}`.trim()
  };
}
