// ============================================================================
// EDTECHRA-BITZ: Quiz Batch Validation Utility
// ============================================================================

import { RawQuizInput, QuizValidationErrorItem, QuizValidationResult } from '@/types';
import { QUIZ_CONFIG } from './quizConfig';

/**
 * Strips Markdown code blocks if ChatGPT wrapped the response in ```json ... ```
 */
export function sanitizeJsonInput(input: string): string {
  let cleaned = input.trim();
  // Remove starting ```json or ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '');
  }
  // Remove trailing ```
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```\s*$/i, '');
  }
  return cleaned.trim();
}

/**
 * Validates a single quiz object and returns a list of error messages (empty if valid)
 */
export function validateSingleQuiz(item: any, seenQuestions: Set<string>): { valid: boolean; errors: string[]; quiz?: RawQuizInput } {
  const errors: string[] = [];

  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['Item is not a valid JSON object.'] };
  }

  // 1. Question validation
  const question = typeof item.question === 'string' ? item.question.trim() : '';
  if (!question) {
    errors.push('Question is missing or empty.');
  } else {
    const normalizedQ = question.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenQuestions.has(normalizedQ)) {
      errors.push('Duplicate question detected in this batch.');
    } else {
      seenQuestions.add(normalizedQ);
    }
  }

  // 2. Options validation
  const options = Array.isArray(item.options) ? item.options.map((opt: any) => String(opt ?? '').trim()) : [];
  if (!Array.isArray(item.options)) {
    errors.push('Options must be an array.');
  } else if (options.length !== 4) {
    errors.push(`Options must have exactly 4 items (found ${options.length}).`);
  } else {
    // Check for empty options
    const emptyCount = options.filter((opt: string) => opt.length === 0).length;
    if (emptyCount > 0) {
      errors.push('All 4 options must be non-empty strings.');
    }

    // Check for uniqueness
    const uniqueOptions = new Set(options.map((opt: string) => opt.toLowerCase()));
    if (uniqueOptions.size < options.length) {
      errors.push('Options must all be unique (duplicates detected).');
    }
  }

  // 3. Correct Answer validation
  const rawCorrect = item.correctAnswer ?? item.correct_answer;
  const correctAnswer = typeof rawCorrect === 'string' ? rawCorrect.trim() : String(rawCorrect ?? '').trim();
  if (!correctAnswer) {
    errors.push('correctAnswer is missing or empty.');
  } else if (options.length === 4) {
    const match = options.find((opt: string) => opt.trim() === correctAnswer);
    if (!match) {
      errors.push(`correctAnswer "${correctAnswer}" does not match any of the 4 options: [${options.join(', ')}].`);
    }
  }

  // 4. Explanation validation
  const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
  if (!explanation) {
    errors.push('Explanation is missing or empty.');
  }

  // 5. Category validation
  const rawCategory = typeof item.category === 'string' ? item.category.trim() : '';
  const category = rawCategory || 'General';

  // 6. Difficulty validation
  let difficulty = typeof item.difficulty === 'string' ? item.difficulty.trim() : 'Easy';
  const matchedDiff = QUIZ_CONFIG.VALID_DIFFICULTIES.find(
    (d) => d.toLowerCase() === difficulty.toLowerCase()
  );
  difficulty = matchedDiff || 'Easy';

  // 7. XP validation
  let xp = typeof item.xp === 'number' ? item.xp : parseInt(item.xp, 10);
  if (isNaN(xp) || xp <= 0) {
    xp = QUIZ_CONFIG.DEFAULT_XP;
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    quiz: {
      question,
      options,
      correctAnswer,
      explanation,
      category,
      difficulty,
      xp
    }
  };
}

/**
 * Validates a complete JSON input payload (string or object)
 */
export function validateQuizBatch(rawInput: string | unknown): QuizValidationResult {
  let parsed: any;

  if (typeof rawInput === 'string') {
    const cleaned = sanitizeJsonInput(rawInput);
    if (!cleaned) {
      return {
        valid: [],
        invalid: [{ index: 0, question: 'Input', errors: ['Pasted content is empty.'] }],
        totalDetected: 0
      };
    }

    try {
      parsed = JSON.parse(cleaned);
    } catch (err: any) {
      return {
        valid: [],
        invalid: [{ index: 0, question: 'JSON Syntax', errors: [`JSON Parse Error: ${err.message || 'Invalid JSON syntax'}`] }],
        totalDetected: 0
      };
    }
  } else {
    parsed = rawInput;
  }

  let quizList: any[] = [];
  if (Array.isArray(parsed)) {
    quizList = parsed;
  } else if (parsed && Array.isArray(parsed.quizzes)) {
    quizList = parsed.quizzes;
  } else if (parsed && Array.isArray(parsed.items)) {
    quizList = parsed.items;
  } else if (parsed && typeof parsed === 'object') {
    // Single quiz object wrapped
    quizList = [parsed];
  } else {
    return {
      valid: [],
      invalid: [{ index: 0, question: 'Root Format', errors: ['Expected a JSON object with a "quizzes" array, e.g. { "quizzes": [...] }'] }],
      totalDetected: 0
    };
  }

  const valid: RawQuizInput[] = [];
  const invalid: QuizValidationErrorItem[] = [];
  const seenQuestions = new Set<string>();

  quizList.forEach((item, index) => {
    const result = validateSingleQuiz(item, seenQuestions);
    const questionLabel = item?.question ? String(item.question).substring(0, 60) : `Quiz #${index + 1}`;

    if (result.valid && result.quiz) {
      valid.push(result.quiz);
    } else {
      invalid.push({
        index: index + 1,
        question: questionLabel,
        errors: result.errors
      });
    }
  });

  return {
    valid,
    invalid,
    totalDetected: quizList.length
  };
}
