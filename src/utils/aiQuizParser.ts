// ============================================================================
// EDTECHRA-BITZ: AI Quiz Parser, Validator & Option Shuffler
// ============================================================================

import { LiveQuizDifficulty, LiveQuizQuestion } from '@/types/liveQuiz';

export interface RawAiQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export interface RawAiQuizPayload {
  quiz_title?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  questions: RawAiQuestion[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  parsedQuiz?: {
    title: string;
    description: string;
    category: string;
    difficulty: LiveQuizDifficulty;
    questions: LiveQuizQuestion[];
    originalQuestions: RawAiQuestion[];
  };
  stats?: {
    totalQuestions: number;
    optionsPerQuestion: number;
    correctAnswersVerified: boolean;
  };
}

/**
 * Builds a strict, machine-readable JSON prompt for ChatGPT/Gemini/Claude.
 */
export function generateAiQuizPrompt(params: {
  topic?: string;
  content?: string;
  questionCount: number;
  difficulty: string;
  category?: string;
}): string {
  const { topic, content, questionCount, difficulty, category } = params;

  let topicOrContentSection = '';
  if (topic && content) {
    topicOrContentSection = `TOPIC: ${topic}\n\nLEARNING MATERIAL:\n"""\n${content}\n"""`;
  } else if (content) {
    topicOrContentSection = `LEARNING MATERIAL:\n"""\n${content}\n"""`;
  } else {
    topicOrContentSection = `TOPIC: ${topic || 'General Knowledge'}`;
  }

  return `You are an expert educational assessment creator for EdTechra Digital Classroom.

Generate a ${questionCount}-question multiple choice quiz on the following material:

${topicOrContentSection}

TARGET DIFFICULTY: ${difficulty}
CATEGORY: ${category || 'General'}

=============================================================================
CRITICAL QUESTION REQUIREMENTS
=============================================================================
1. Generate EXACTLY ${questionCount} questions.
2. Every question must be multiple choice.
3. Every question must have EXACTLY 4 options in an array.
4. Only ONE option can be correct.
5. All 4 options must be plausible, distinct, and non-empty.
6. Do NOT create duplicate options within any question.
7. Do NOT create two options that could reasonably both be considered correct.
8. Questions must be strictly based on the supplied topic/learning material.
9. Do not use "All of the above" or "None of the above".
10. Include a short educational explanation for why the correct answer is right.
11. The "correct_answer" field MUST EXACTLY match one of the 4 strings in the "options" array character-for-character.

=============================================================================
STRICT MACHINE-READABLE OUTPUT FORMAT
=============================================================================
You MUST return ONLY valid raw JSON.
Do NOT write any introduction, greetings, Markdown code fences (\`\`\`json), explanations before the JSON, or conclusion text.

JSON Schema:
{
  "quiz_title": "${topic || 'Custom AI Quiz'}",
  "description": "Practice and test your understanding of ${topic || 'the topic'}.",
  "questions": [
    {
      "question": "Clear and unambiguous question prompt?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correct_answer": "Option A text",
      "explanation": "Brief explanation of why this answer is correct."
    }
  ]
}`;
}

/**
 * Robust JSON extraction & cleanup that safely strips markdown fences,
 * leading/trailing explanations, or accidental conversational wrappers.
 */
export function extractJsonFromText(rawText: string): string {
  let cleaned = String(rawText || '').trim();

  // 1. Strip markdown code fences (```json ... ``` or ``` ...)
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
    cleaned = cleaned.trim();
  }

  // 2. If there are multiple fences in the text, extract inner content
  const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(rawText);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 3. If there is still preamble/postamble, find outermost { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

/**
 * Shuffles an array in-place using Fisher-Yates algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Validates and converts AI JSON into playable EdTechra LiveQuizQuestions
 * with automatic, independent option shuffling per question.
 */
export function validateAndParseAiQuiz(
  rawInput: string,
  expectedQuestionCount?: number,
  fallbackCategory = 'General',
  fallbackDifficulty: LiveQuizDifficulty = 'Medium'
): ValidationResult {
  const errors: string[] = [];

  if (!rawInput || !rawInput.trim()) {
    return {
      isValid: false,
      errors: ['Please paste the AI-generated quiz JSON.']
    };
  }

  // 1. Extract JSON string
  const jsonStr = extractJsonFromText(rawInput);
  let parsed: any;

  try {
    parsed = JSON.parse(jsonStr);
  } catch (err: any) {
    return {
      isValid: false,
      errors: [
        'Invalid JSON format. Please ensure you copied the complete AI response.',
        `Parser detail: ${err.message}`
      ]
    };
  }

  // Support array of questions directly or { questions: [...] } object
  let questionsArray: any[] = [];
  let title = 'Custom AI Quiz';
  let description = 'Interactive AI generated classroom quiz.';
  let category = fallbackCategory;
  let difficulty = fallbackDifficulty;

  if (Array.isArray(parsed)) {
    questionsArray = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.questions)) {
      questionsArray = parsed.questions;
    } else {
      errors.push('JSON root must contain a "questions" array.');
    }

    if (typeof parsed.quiz_title === 'string' && parsed.quiz_title.trim()) {
      title = parsed.quiz_title.trim();
    } else if (typeof parsed.title === 'string' && parsed.title.trim()) {
      title = parsed.title.trim();
    }

    if (typeof parsed.description === 'string' && parsed.description.trim()) {
      description = parsed.description.trim();
    }

    if (typeof parsed.category === 'string' && parsed.category.trim()) {
      category = parsed.category.trim();
    }

    if (typeof parsed.difficulty === 'string') {
      const diffNorm = parsed.difficulty.trim().toLowerCase();
      if (diffNorm.includes('easy')) difficulty = 'Easy';
      else if (diffNorm.includes('hard')) difficulty = 'Hard';
      else difficulty = 'Medium';
    }
  } else {
    return {
      isValid: false,
      errors: ['JSON must be an object with a "questions" array.']
    };
  }

  if (questionsArray.length === 0) {
    errors.push('No questions found in the imported JSON.');
    return { isValid: false, errors };
  }

  // Validate question count if specified
  if (expectedQuestionCount && questionsArray.length !== expectedQuestionCount) {
    if (questionsArray.length < 1) {
      errors.push(`Expected ${expectedQuestionCount} questions, but found ${questionsArray.length}.`);
    }
  }

  const liveQuestions: LiveQuizQuestion[] = [];
  const rawQuestions: RawAiQuestion[] = [];

  // Validate each question
  questionsArray.forEach((qObj: any, index: number) => {
    const qNum = index + 1;

    if (!qObj || typeof qObj !== 'object') {
      errors.push(`Question ${qNum} is not a valid object.`);
      return;
    }

    // 1. Question prompt
    const questionText = typeof qObj.question === 'string' ? qObj.question.trim() : '';
    if (!questionText) {
      errors.push(`Question ${qNum} is missing question text.`);
    }

    // 2. Options array (must be exactly 4)
    const optionsRaw = qObj.options;
    if (!Array.isArray(optionsRaw)) {
      errors.push(`Question ${qNum} does not contain an "options" array.`);
      return;
    }

    if (optionsRaw.length !== 4) {
      errors.push(`Question ${qNum} must have exactly 4 options (found ${optionsRaw.length}).`);
      return;
    }

    const cleanOptions = optionsRaw.map((opt) => String(opt ?? '').trim());
    if (cleanOptions.some((opt) => opt.length === 0)) {
      errors.push(`Question ${qNum} has empty option fields.`);
    }

    // Check for duplicate options
    const uniqueOptions = new Set(cleanOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size < 4) {
      errors.push(`Question ${qNum} contains duplicate options.`);
    }

    // 3. Correct answer matching
    const rawCorrect = qObj.correct_answer ?? qObj.correctAnswer ?? qObj.answer;
    const correctAnswer = typeof rawCorrect === 'string' ? rawCorrect.trim() : String(rawCorrect ?? '').trim();

    if (!correctAnswer) {
      errors.push(`Question ${qNum} does not contain a "correct_answer".`);
      return;
    }

    // Match correct answer to one of the 4 options
    let matchedOptionIndex = cleanOptions.findIndex((opt) => opt === correctAnswer);

    // Fallback: case-insensitive match if exact case differed slightly
    if (matchedOptionIndex === -1) {
      matchedOptionIndex = cleanOptions.findIndex((opt) => opt.toLowerCase() === correctAnswer.toLowerCase());
    }

    // Fallback: check if the AI output "A", "B", "C", "D" or "Option 1"
    if (matchedOptionIndex === -1) {
      const letterMatch = /^[A-D]$/i.exec(correctAnswer);
      if (letterMatch) {
        const letterIdx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
        if (letterIdx >= 0 && letterIdx < 4) {
          matchedOptionIndex = letterIdx;
        }
      }
    }

    if (matchedOptionIndex === -1) {
      errors.push(
        `Question ${qNum} has a correct answer ("${correctAnswer}") that does not match any of its 4 options.`
      );
      return;
    }

    const matchedCorrectText = cleanOptions[matchedOptionIndex];
    const explanation = typeof qObj.explanation === 'string' ? qObj.explanation.trim() : '';

    rawQuestions.push({
      question: questionText,
      options: cleanOptions,
      correct_answer: matchedCorrectText,
      explanation
    });

    // =========================================================================
    // AUTOMATIC ANSWER SHUFFLING (London = correct, travels safely with option)
    // =========================================================================
    const shuffledOptions = shuffleArray(cleanOptions);
    const newCorrectIndex = shuffledOptions.indexOf(matchedCorrectText);

    liveQuestions.push({
      id: `q_${Date.now()}_${index + 1}_${Math.random().toString(36).substring(2, 7)}`,
      question: questionText,
      options: shuffledOptions,
      correctIndex: newCorrectIndex,
      durationSec: 20,
      explanation
    });
  });

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  return {
    isValid: true,
    errors: [],
    parsedQuiz: {
      title,
      description,
      category,
      difficulty,
      questions: liveQuestions,
      originalQuestions: rawQuestions
    },
    stats: {
      totalQuestions: liveQuestions.length,
      optionsPerQuestion: 4,
      correctAnswersVerified: true
    }
  };
}
