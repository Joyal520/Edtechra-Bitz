// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: QUESTION SCHEMA, PROMPT BUILDER & VALIDATOR
// Implements EdTechra Question JSON Schema v1.0, Prompt Construction,
// Strict Untrusted JSON Validation, and Course Question Import Engine.
// ============================================================================

import { CourseQuestion, DifficultyLevel, QuestionType } from '@/types/courseStudio';

export interface QuestionPlanItem {
  id: string;
  type: QuestionType;
  count: number;
  difficulty: DifficultyLevel;
  instructions?: string;
}

export interface QuestionPlan {
  items: QuestionPlanItem[];
  video_transcript?: string;
  image_description?: string;
  teacher_instructions?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalQuestions: number;
    byType: Record<string, number>;
  };
  parsedData?: any;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  matching: 'Matching',
  sentence_builder: 'Sentence Builder',
  ordering: 'Ordering',
  short_answer: 'Short Answer'
};

const TYPE_EXAMPLE_TEMPLATES: Record<QuestionType, any> = {
  multiple_choice: {
    type: 'multiple_choice',
    questions: [
      {
        question: 'Clear question text based on the lesson',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: 'Option B',
        explanation: 'Why Option B is correct based on the lesson.',
        difficulty: 'medium',
        points: 10
      }
    ]
  },
  true_false: {
    type: 'true_false',
    questions: [
      {
        statement: 'Factual statement from the source text',
        correct_answer: true,
        explanation: 'Why this statement is true based on the lesson.',
        difficulty: 'medium',
        points: 10
      }
    ]
  },
  fill_blank: {
    type: 'fill_blank',
    questions: [
      {
        sentence: 'The young eagle flew high in the ______.',
        correct_answer: 'sky',
        explanation: 'The text states the eagle flew in the sky.',
        difficulty: 'medium',
        points: 10
      }
    ]
  },
  matching: {
    type: 'matching',
    questions: [
      {
        question: 'Match each character with their description',
        pairs: [
          { left: 'Eagle', right: 'Flew high in the sky' },
          { left: 'Chicken', right: 'Stayed on the ground' }
        ],
        explanation: 'Based on the story events.',
        difficulty: 'medium',
        points: 10
      }
    ]
  },
  ordering: {
    type: 'ordering',
    questions: [
      {
        question: 'Arrange the story events in the correct chronological order',
        items: [
          'The egg rolled away from the eagle\'s nest.',
          'The egg reached a farm.',
          'A chicken put the egg in her nest.',
          'The eggs opened and the chicks came out.',
          'The young bird flew higher and higher.'
        ],
        explanation: 'The egg first rolled from the nest, was incubated on the farm, hatched, and eventually learned to fly.',
        difficulty: 'medium',
        points: 10
      }
    ]
  },
  short_answer: {
    type: 'short_answer',
    questions: [
      {
        question: 'What lesson did the story teach?',
        correct_answer: 'Courage to try and reach for the sky',
        acceptable_answers: ['courage', 'trying', 'believing in yourself'],
        explanation: 'The story emphasizes believing in your potential.',
        difficulty: 'medium',
        points: 10
      }
    ]
  },
  sentence_builder: {
    type: 'sentence_builder',
    questions: [
      {
        question: 'Assemble the sentence in correct order',
        words: ['The', 'young', 'bird', 'flew', 'high'],
        correct_sentence: 'The young bird flew high',
        explanation: 'Correct grammatical structure.',
        difficulty: 'medium',
        points: 10
      }
    ]
  }
};

/**
 * Builds the EdTechra AI Question Prompt (v1.0) for external AI tools (ChatGPT, Claude, Gemini).
 */
export function buildAiQuestionPrompt(params: {
  courseTitle: string;
  unitTitle: string;
  episodeTitle: string;
  lessonText: string;
  videoTranscript?: string;
  imageDescription?: string;
  plan: QuestionPlan;
}): string {
  const {
    courseTitle,
    unitTitle,
    episodeTitle,
    lessonText,
    videoTranscript,
    imageDescription,
    plan
  } = params;

  let prompt = `You are an educational assessment generator for EdTechra Course Studio.\n`;
  prompt += `Create high-quality practice questions based ONLY on the source material provided below.\n`;
  prompt += `Do not introduce external facts or unsupported assumptions.\n\n`;

  prompt += `============================================================\n`;
  prompt += `COURSE METADATA\n`;
  prompt += `============================================================\n`;
  prompt += `Course: ${courseTitle}\n`;
  prompt += `Unit: ${unitTitle}\n`;
  prompt += `Lesson: ${episodeTitle}\n\n`;

  prompt += `============================================================\n`;
  prompt += `SOURCE MATERIAL\n`;
  prompt += `============================================================\n`;
  prompt += `LESSON TEXT:\n"""\n${lessonText.trim() || '(No lesson text provided)'}\n"""\n\n`;

  if (videoTranscript && videoTranscript.trim()) {
    prompt += `VIDEO TRANSCRIPT:\n"""\n${videoTranscript.trim()}\n"""\n\n`;
  }

  if (imageDescription && imageDescription.trim()) {
    prompt += `IMAGE DESCRIPTION:\n"""\n${imageDescription.trim()}\n"""\n\n`;
  }

  prompt += `============================================================\n`;
  prompt += `REQUIRED QUESTION SETS (GENERATE EXACTLY THESE):\n`;
  prompt += `============================================================\n`;

  plan.items.forEach((item, index) => {
    const label = QUESTION_TYPE_LABELS[item.type] || item.type;
    if (item.type === 'ordering') {
      prompt += `${index + 1}. Ordering — ONE activity containing ${item.count} sentence blocks — Difficulty: ${item.difficulty.toUpperCase()}`;
    } else {
      prompt += `${index + 1}. ${label} — ${item.count} question${item.count > 1 ? 's' : ''} — Difficulty: ${item.difficulty.toUpperCase()}`;
    }
    if (item.instructions?.trim()) {
      prompt += ` (Instructions: ${item.instructions.trim()})`;
    }
    prompt += `\n`;
  });

  if (plan.teacher_instructions?.trim()) {
    prompt += `\nTEACHER INSTRUCTIONS:\n${plan.teacher_instructions.trim()}\n`;
  }

  prompt += `\n============================================================\n`;
  prompt += `OUTPUT FORMAT INSTRUCTIONS\n`;
  prompt += `============================================================\n`;
  prompt += `1. Generate ONLY the requested question types listed above. Do NOT include unused question types or empty question sets.\n`;
  prompt += `2. Return ONLY valid JSON adhering strictly to EdTechra Question JSON Schema v1.0.\n`;
  prompt += `3. Do not include markdown code block backticks if possible, or wrap inside standard \`\`\`json block.\n`;
  prompt += `4. For Ordering: Create ONE ordering activity containing exactly the requested sentence count in the "items" array.\n`;
  prompt += `5. Provide a clear educational explanation for every question.\n\n`;

  // Dynamically build example schema with ONLY the selected question types
  const exampleQuestionSets = plan.items.map(item => {
    if (item.type === 'ordering') {
      return {
        type: 'ordering',
        questions: [
          {
            question: 'Arrange the story events in chronological order',
            items: [
              "The egg rolled away from the eagle's nest.",
              "The egg reached a farm.",
              "A chicken put the egg in her nest.",
              "The eggs opened and the chicks came out.",
              "The young bird flew higher and higher."
            ],
            explanation: 'The egg rolled away, hatched on the farm, and eventually learned to soar.',
            difficulty: item.difficulty || 'medium',
            points: 10
          }
        ]
      };
    }
    return TYPE_EXAMPLE_TEMPLATES[item.type] || TYPE_EXAMPLE_TEMPLATES.multiple_choice;
  });

  const exampleJson = {
    schema_version: '1.0',
    lesson: {
      title: episodeTitle
    },
    question_sets: exampleQuestionSets
  };

  prompt += `USE THIS EXACT JSON SCHEMA (CONTAINING ONLY YOUR REQUESTED QUESTION TYPES):\n`;
  prompt += `${JSON.stringify(exampleJson, null, 2)}\n`;

  return prompt;
}

/**
 * Validates untrusted pasted AI JSON against the Question Plan and Schema v1.0.
 */
export function validateAiQuestionJson(jsonString: string, plan?: QuestionPlan): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byType: Record<string, number> = {};
  let totalQuestions = 0;

  if (!jsonString || !jsonString.trim()) {
    return {
      isValid: false,
      errors: ['Please paste JSON generated by your AI tool.'],
      warnings: [],
      summary: { totalQuestions: 0, byType: {} }
    };
  }

  // Clean JSON string (strip ```json and ``` if present)
  let cleanString = jsonString.trim();
  if (cleanString.startsWith('```json')) {
    cleanString = cleanString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanString.startsWith('```')) {
    cleanString = cleanString.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanString);
  } catch (err: any) {
    return {
      isValid: false,
      errors: [`Invalid JSON syntax: ${err.message}`],
      warnings: [],
      summary: { totalQuestions: 0, byType: {} }
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      errors: ['Root JSON must be an object with "question_sets" array.'],
      warnings: [],
      summary: { totalQuestions: 0, byType: {} }
    };
  }

  // Schema version check (soft warning if missing)
  if (!parsed.schema_version) {
    warnings.push('Missing "schema_version" (recommended: "1.0").');
  }

  if (!Array.isArray(parsed.question_sets) || parsed.question_sets.length === 0) {
    errors.push('Missing or empty "question_sets" array in JSON.');
    return {
      isValid: false,
      errors,
      warnings,
      summary: { totalQuestions: 0, byType: {} }
    };
  }

  const validTypes: QuestionType[] = [
    'multiple_choice',
    'true_false',
    'fill_blank',
    'matching',
    'sentence_builder',
    'ordering',
    'short_answer'
  ];

  const planTypes = (plan?.items || []).map(item => item.type);
  const seenTypes = new Set<string>();

  parsed.question_sets.forEach((qSet: any, setIdx: number) => {
    if (!qSet.type || !validTypes.includes(qSet.type)) {
      errors.push(`Question set #${setIdx + 1} has unsupported type "${qSet.type || 'unknown'}".`);
      return;
    }

    const typeKey = qSet.type as QuestionType;
    const label = QUESTION_TYPE_LABELS[typeKey] || typeKey;

    // 1. Duplicate Type Protection
    if (seenTypes.has(typeKey)) {
      errors.push(`Duplicate question type: ${typeKey}`);
      return;
    }
    seenTypes.add(typeKey);

    // 2. Empty Question Set Rule:
    // If a set is present with "questions": [], it is INVALID.
    if (!Array.isArray(qSet.questions) || qSet.questions.length === 0) {
      errors.push(`${label} question set is empty.`);
      return;
    }

    // 3. Unexpected Type Protection (if plan provided):
    if (plan && plan.items.length > 0 && !planTypes.includes(typeKey)) {
      errors.push(`Unexpected question type: ${typeKey}`);
      return;
    }

    byType[typeKey] = (byType[typeKey] || 0) + qSet.questions.length;
    totalQuestions += qSet.questions.length;

    // 4. Content validation per question
    qSet.questions.forEach((q: any, qIdx: number) => {
      const qNum = `${label} #${qIdx + 1}`;

      if (typeKey === 'multiple_choice') {
        if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
          errors.push(`${qNum}: Missing "question" text.`);
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push(`${qNum}: Multiple choice requires at least 2 options in "options".`);
        }
        if (q.correct_answer === undefined || q.correct_answer === null || String(q.correct_answer).trim() === '') {
          errors.push(`${qNum}: Missing "correct_answer".`);
        }
      } else if (typeKey === 'true_false') {
        const text = q.statement || q.question;
        if (!text || typeof text !== 'string' || !text.trim()) {
          errors.push(`${qNum}: Missing "statement" or "question" text.`);
        }
        if (q.correct_answer === undefined || q.correct_answer === null) {
          errors.push(`${qNum}: Missing "correct_answer" (must be true or false).`);
        }
      } else if (typeKey === 'fill_blank') {
        const text = q.sentence || q.question;
        if (!text || typeof text !== 'string' || !text.trim()) {
          errors.push(`${qNum}: Missing "sentence" or "question" text.`);
        }
        if (!q.correct_answer || String(q.correct_answer).trim() === '') {
          errors.push(`${qNum}: Missing "correct_answer" for blank.`);
        }
      } else if (typeKey === 'matching') {
        if (!q.question) q.question = 'Match the items';
        if (!Array.isArray(q.pairs) && !Array.isArray(q.options)) {
          errors.push(`${qNum}: Matching question requires "pairs" array with left/right items.`);
        }
      } else if (typeKey === 'ordering') {
        if (!q.question) q.question = 'Arrange the story events in the correct order';
        if (!Array.isArray(q.items) || q.items.length < 2) {
          errors.push(`${qNum}: Ordering question requires "items" array with at least 2 sentence blocks.`);
        }
      } else if (typeKey === 'short_answer') {
        if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
          errors.push(`${qNum}: Missing "question" text.`);
        }
        if (!q.correct_answer && (!Array.isArray(q.acceptable_answers) || q.acceptable_answers.length === 0)) {
          errors.push(`${qNum}: Missing "correct_answer" or "acceptable_answers".`);
        }
      }
    });
  });

  // 5. Verify against Question Plan if provided
  if (plan && plan.items.length > 0) {
    plan.items.forEach(planItem => {
      const actualCount = byType[planItem.type] || 0;
      const label = QUESTION_TYPE_LABELS[planItem.type] || planItem.type;

      if (!seenTypes.has(planItem.type) || actualCount === 0) {
        errors.push(`Missing required question set: ${label} (Expected ${planItem.count} question${planItem.count > 1 ? 's' : ''}).`);
      } else if (planItem.type === 'ordering') {
        // For ordering, planItem.count is the number of sentences in the single ordering activity
        const ordQuestions = parsed.question_sets.find((s: any) => s.type === 'ordering')?.questions || [];
        if (ordQuestions.length !== 1) {
          errors.push(`Ordering should contain 1 ordering activity (with ${planItem.count} sentences).`);
        } else {
          const itemCount = ordQuestions[0]?.items?.length || 0;
          if (itemCount !== planItem.count) {
            errors.push(`Ordering requires ${planItem.count} sentences, but JSON contains ${itemCount}. (Expected: ${planItem.count})`);
          }
        }
      } else if (actualCount !== planItem.count) {
        errors.push(`${label} requires ${planItem.count} questions, but JSON contains ${actualCount}. (Expected: ${planItem.count})`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalQuestions,
      byType
    },
    parsedData: parsed
  };
}

/**
 * Converts validated EdTechra JSON into CourseQuestion models.
 */
export function convertValidatedJsonToCourseQuestions(
  validatedJson: any,
  episodeId: string,
  courseId: string
): CourseQuestion[] {
  if (!validatedJson || !Array.isArray(validatedJson.question_sets)) return [];

  const result: CourseQuestion[] = [];
  let orderIndex = 0;

  validatedJson.question_sets.forEach((qSet: any) => {
    const qType: QuestionType = qSet.type;

    (qSet.questions || []).forEach((q: any) => {
      let qText = q.question || q.statement || q.sentence || '';
      let optionsList: string[] = [];
      let correctAnswerStr = String(q.correct_answer ?? '');

      if (qType === 'multiple_choice') {
        optionsList = Array.isArray(q.options)
          ? q.options.map((opt: any) => (typeof opt === 'string' ? opt : opt.text || ''))
          : [];
      } else if (qType === 'true_false') {
        optionsList = ['True', 'False'];
        const isTrue = q.correct_answer === true || String(q.correct_answer).toLowerCase() === 'true';
        correctAnswerStr = isTrue ? 'True' : 'False';
      } else if (qType === 'fill_blank') {
        optionsList = [];
      } else if (qType === 'matching') {
        // Encode pairs in options for transport
        if (Array.isArray(q.pairs)) {
          optionsList = q.pairs.map((p: any) => `${p.left || ''} -> ${p.right || ''}`);
        }
      } else if (qType === 'ordering') {
        optionsList = Array.isArray(q.items) ? q.items : [];
      } else if (qType === 'short_answer') {
        if (Array.isArray(q.acceptable_answers)) {
          optionsList = q.acceptable_answers;
        }
      }

      result.push({
        id: `q_${Date.now()}_${orderIndex}`,
        episode_id: episodeId,
        course_id: courseId,
        question_text: qText,
        question_type: qType,
        options: optionsList,
        correct_answer: correctAnswerStr,
        explanation: q.explanation || '',
        skill: q.skill || 'Comprehension',
        concept: q.concept || 'General',
        difficulty: (q.difficulty as DifficultyLevel) || 'medium',
        points: q.points || 10,
        order_index: orderIndex++
      });
    });
  });

  return result;
}
