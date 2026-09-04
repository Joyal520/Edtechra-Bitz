// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: QUESTION SCHEMA, PROMPT BUILDER & VALIDATOR
// Implements EdTechra Question JSON Schema v1.0, Prompt Construction,
// Strict Untrusted JSON Validation, and Course Question Import Engine.
// Supports 8 Question Types: Multiple Choice, True/False, Fill in the Blank,
// Matching, Sentence Builder, Ordering, Short Answer, Cloze Passage, and Essay.
// ============================================================================

import {
  CourseQuestion,
  DifficultyLevel,
  QuestionType,
  ClozeBlank,
  WhType
} from '@/types/courseStudio';
import {
  normalizeQuestionOptions,
  resolveCorrectOption
} from '@/utils/questionGrading';

export interface QuestionPlanItem {
  id: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  instructions?: string;
  points: number; // Marks per question (or marks per activity for Ordering / Cloze)
  
  // Generic question count (MCQ, TF, Fill in Blank, Matching, Short Answer, Essay, WH)
  count: number;
  
  // WH Question specific
  wh_type?: WhType;
  cefr_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  ai_evaluated?: boolean;
  expected_answer?: string;
  acceptable_answers?: string[];
  passage?: string;

  // Cloze Passage specific: Number of blanks in the single passage
  blankCount?: number;
  
  // Ordering specific: Number of activities & sentence items per activity
  activityCount?: number;
  itemsPerActivity?: number;
  
  // Essay options
  image_url?: string;
  min_words?: number;
  max_words?: number;
  evaluation_criteria?: string[];
}

export interface QuestionPlan {
  items: QuestionPlanItem[];
  cefr_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  video_transcript?: string;
  image_description?: string;
  teacher_instructions?: string;
}

export interface QuestionCategoryDefinition {
  id: string;
  code: string; // 'A', 'B', 'C', 'D', 'E', 'F', 'G'
  name: string;
  description: string;
  types: QuestionType[];
}

export const IMPLEMENTED_QUESTION_TYPES: Set<QuestionType> = new Set([
  'multiple_choice',
  'true_false',
  'fill_blank',
  'cloze_passage',
  'matching',
  'ordering',
  'sentence_builder',
  'short_answer',
  'wh_question',
  'comprehension',
  'essay'
]);

export function isQuestionTypeImplemented(type: QuestionType): boolean {
  return IMPLEMENTED_QUESTION_TYPES.has(type);
}

export const QUESTION_CATEGORIES: QuestionCategoryDefinition[] = [
  {
    id: 'category_a',
    code: 'A',
    name: 'Multiple Choice & Selection',
    description: 'Single-choice and multi-select objective questions with distractors',
    types: ['multiple_choice', 'multiple_select']
  },
  {
    id: 'category_b',
    code: 'B',
    name: 'True / False & Binary',
    description: 'Fact verification, binary true/false and yes/no judgment',
    types: ['true_false', 'yes_no']
  },
  {
    id: 'category_c',
    code: 'C',
    name: 'Fill in the Blank & Cloze',
    description: 'Single blank, multi-blank, and embedded cloze reading passages',
    types: ['fill_blank', 'multiple_fill_blanks', 'cloze_passage']
  },
  {
    id: 'category_d',
    code: 'D',
    name: 'Matching & Association',
    description: 'Direct pairs, category classification, and associative concept matching',
    types: ['matching', 'matching_pairs', 'drag_drop_matching', 'categorisation']
  },
  {
    id: 'category_e',
    code: 'E',
    name: 'Ordering & Sequencing',
    description: 'Chronological timeline, sentence rebuilding, and word reordering',
    types: ['ordering', 'sentence_builder', 'sentence_reordering', 'word_ordering', 'story_sequence']
  },
  {
    id: 'category_f',
    code: 'F',
    name: 'Identification & Odd One Out',
    description: 'Odd item elimination, visual identification, and inline dropdowns',
    types: ['odd_one_out', 'image_selection', 'dropdown_selection', 'drag_to_complete']
  },
  {
    id: 'category_g',
    code: 'G',
    name: 'Comprehension & WH Questions',
    description: 'Text-anchored WH comprehension, literal inference, and short answers',
    types: ['wh_question', 'comprehension', 'short_answer']
  },
  {
    id: 'category_h',
    code: 'H',
    name: 'Production & Open-Ended',
    description: 'Essay writing, speaking assessment, grammar correction, and word choice',
    types: ['essay', 'speaking', 'grammar_correction', 'word_choice']
  }
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalQuestions: number;
    totalActivities: number;
    totalMarks: number;
    byType: Record<string, number>;
  };
  parsedData?: any;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  multiple_select: 'Multiple Select',
  true_false: 'True / False',
  yes_no: 'Yes / No',
  fill_blank: 'Fill in the Blank',
  multiple_fill_blanks: 'Multiple Fill in the Blanks',
  matching: 'Matching',
  matching_pairs: 'Matching Pairs',
  sentence_builder: 'Sentence Builder',
  sentence_reordering: 'Sentence Reordering',
  word_ordering: 'Word Ordering',
  ordering: 'Ordering Sequence',
  story_sequence: 'Story Sequence',
  image_selection: 'Image Selection',
  dropdown_selection: 'Dropdown Selection',
  drag_to_complete: 'Drag to Complete',
  drag_drop_matching: 'Drag & Drop Matching',
  categorisation: 'Categorisation',
  odd_one_out: 'Odd One Out',
  short_answer: 'Short Answer',
  cloze_passage: 'Cloze Passage',
  essay: 'Essay / Descriptive Response',
  comprehension: 'Comprehension Question',
  wh_question: 'WH Question (Comprehension)',
  speaking: 'Speaking Response',
  word_choice: 'Word Choice',
  grammar_correction: 'Grammar Correction'
};

/**
 * Returns the semantic activity count for a QuestionPlanItem.
 * Cloze Passage is always 1 activity.
 * Ordering has `activityCount` activities (default 1).
 * Other question types have `count` questions.
 */
export function getPlanItemActivityCount(item: QuestionPlanItem): number {
  if (item.type === 'cloze_passage') return 1;
  if (item.type === 'ordering') return item.activityCount || 1;
  return item.count || 1;
}

/**
 * Returns the calculated total marks for a QuestionPlanItem.
 * Cloze: marks per activity (1 activity = points).
 * Ordering: activityCount * marks per activity.
 * Others: count * marks per question.
 */
export function getPlanItemTotalMarks(item: QuestionPlanItem): number {
  const points = typeof item.points === 'number' ? item.points : (item.type === 'essay' || item.type === 'cloze_passage' ? 20 : 10);
  if (item.type === 'cloze_passage') {
    return points;
  }
  if (item.type === 'ordering') {
    return (item.activityCount || 1) * points;
  }
  return (item.count || 1) * points;
}

const TYPE_EXAMPLE_TEMPLATES: Partial<Record<QuestionType, any>> = {
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
  },
  cloze_passage: {
    type: 'cloze_passage',
    questions: [
      {
        question: 'Complete the passage using the correct words.',
        passage: 'The young bird looked at the sky every morning. He wanted to fly.',
        blanks: [
          {
            id: 'blank_1',
            answer: 'sky',
            options: ['sky', 'ground', 'farm', 'nest']
          },
          {
            id: 'blank_2',
            answer: 'fly',
            options: ['fly', 'walk', 'sleep', 'run']
          }
        ],
        explanation: 'The passage states that the young bird looked at the sky and wanted to fly.',
        difficulty: 'medium',
        points: 20
      }
    ]
  },
  essay: {
    type: 'essay',
    questions: [
      {
        question: 'Describe this image in 80–100 words.',
        image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
        answer_length: {
          min_words: 80,
          max_words: 100
        },
        evaluation_criteria: [
          'content_accuracy',
          'relevance',
          'completeness',
          'language',
          'grammar',
          'vocabulary'
        ],
        explanation: 'Provide a clear descriptive response grounded in the lesson visual and themes.',
        difficulty: 'medium',
        points: 20
      }
    ]
  },
  wh_question: {
    type: 'wh_question',
    questions: [
      {
        question: 'Who does Emily live with?',
        wh_type: 'who',
        expected_answer: 'She lives with her family.',
        acceptable_answers: [
          'with her family',
          'her family',
          'with her parents',
          'her parents',
          'She lives with her parents',
          'with mom and dad',
          'with her mother and father'
        ],
        passage: 'Emily lives in London with her family in a small house near a green park.',
        explanation: 'The passage explicitly states that Emily lives with her family.',
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
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}): string {
  const {
    courseTitle,
    unitTitle,
    episodeTitle,
    lessonText,
    videoTranscript,
    imageDescription,
    plan,
    cefrLevel: directCefr
  } = params;

  const targetCefr = directCefr || plan.cefr_level || 'A1';
  // Strip HTML tags so the external AI gets pure, clean text without markdown or HTML corruption
  const cleanLessonText = (lessonText || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  let prompt = `You are an educational assessment generator for EdTechra Course Studio.\n`;
  prompt += `Target CEFR Level: ${targetCefr}. Align question complexity, grammar structures, and vocabulary strictly to ${targetCefr} language learners.\n`;
  prompt += `Create high-quality practice questions based ONLY on the source material provided below.\n`;
  prompt += `Do not introduce external facts or unsupported assumptions.\n\n`;

  prompt += `============================================================\n`;
  prompt += `COURSE METADATA\n`;
  prompt += `============================================================\n`;
  prompt += `Course: ${courseTitle}\n`;
  prompt += `Unit: ${unitTitle}\n`;
  prompt += `Lesson: ${episodeTitle}\n`;
  prompt += `Target CEFR Level: ${targetCefr}\n\n`;

  prompt += `============================================================\n`;
  prompt += `SOURCE MATERIAL\n`;
  prompt += `============================================================\n`;
  prompt += `LESSON TEXT:\n"""\n${cleanLessonText || '(No lesson text provided)'}\n"""\n\n`;

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
    const points = typeof item.points === 'number' ? item.points : (item.type === 'essay' || item.type === 'cloze_passage' ? 20 : 10);

    if (item.type === 'ordering') {
      const actCount = item.activityCount || 1;
      const sentCount = item.itemsPerActivity || item.count || 5;
      prompt += `${index + 1}. Ordering — Create exactly ${actCount} Ordering activit${actCount > 1 ? 'ies' : 'y'}, each containing exactly ${sentCount} sentence blocks. Points: ${points} per activity — Difficulty: ${item.difficulty.toUpperCase()}`;
    } else if (item.type === 'cloze_passage') {
      const blankCount = item.blankCount || item.count || 10;
      prompt += `${index + 1}. Cloze Passage — Create exactly ONE Cloze Passage question containing exactly ${blankCount} blanks. Each blank must have exactly four answer options with one correct answer. Points: ${points} (for the entire passage activity) — Difficulty: ${item.difficulty.toUpperCase()}`;
    } else if (item.type === 'essay') {
      const count = item.count || 1;
      prompt += `${index + 1}. Essay / Descriptive Response — ${count} question${count > 1 ? 's' : ''} (Expected words: ${item.min_words || 80}–${item.max_words || 100} words, Points: ${points} per question) — Difficulty: ${item.difficulty.toUpperCase()}`;
    } else if (item.type === 'wh_question') {
      const count = item.count || 1;
      const whType = item.wh_type || 'mixed_wh';
      const whDesc = whType === 'mixed_wh'
        ? 'balanced variety of WH questions (Who, What, Where, When, Why, How)'
        : `${whType.toUpperCase()} questions`;
      prompt += `${index + 1}. WH Comprehension — Create ${count} ${whDesc} strictly anchored to the reading passage. Each question MUST provide "question", "wh_type", "expected_answer", "acceptable_answers" (array of 5–8 alternate valid phrasings and common synonyms), "passage" (exact excerpt), and "explanation". Points: ${points} per question — Difficulty: ${item.difficulty.toUpperCase()}`;
    } else {
      const count = item.count || 1;
      prompt += `${index + 1}. ${label} — ${count} question${count > 1 ? 's' : ''} (Points: ${points} per question) — Difficulty: ${item.difficulty.toUpperCase()}`;
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
  prompt += `4. For Multiple Choice: Balance the position of the correct answer evenly across options A, B, C, and D. Do NOT always place the correct answer as option A or the first choice.\n`;
  prompt += `5. For Ordering: Generate the exact number of activities requested, with each activity containing the exact requested number of sentence blocks in the "items" array.\n`;
  prompt += `6. For Cloze Passage: Generate EXACTLY ONE question containing a complete passage and a "blanks" array with the EXACT requested number of blanks. Every blank MUST have an "id", "answer", and exactly 4 "options" (1 correct, 3 plausible distractors).\n`;
  prompt += `7. For Essay / Descriptive Response: Include "question", optional "image_url", "answer_length" (min_words, max_words), and "evaluation_criteria".\n`;
  prompt += `8. For WH Comprehension: Include "question", "wh_type", "expected_answer", "acceptable_answers" (5–8 natural variations and synonyms), "passage" (exact quote from text), and "explanation".\n`;
  prompt += `9. Include "points" for every question matching the teacher's selected marks.\n`;
  prompt += `10. Provide a clear educational explanation for every question.\n\n`;

  // Dynamically build example schema with ONLY the selected question types
  const exampleQuestionSets = plan.items.map(item => {
    const points = typeof item.points === 'number' ? item.points : (item.type === 'essay' || item.type === 'cloze_passage' ? 20 : 10);

    if (item.type === 'ordering') {
      const actCount = item.activityCount || 1;
      const sentCount = item.itemsPerActivity || item.count || 5;
      const defaultItems = [
        "The egg rolled away from the eagle's nest.",
        "The egg reached a farm.",
        "A chicken put the egg in her nest.",
        "The eggs opened and the chicks came out.",
        "The young bird flew higher and higher.",
        "He looked down at the farm below.",
        "He soared toward the mountain peak.",
        "He found his family among the clouds."
      ];
      const items = defaultItems.slice(0, Math.max(2, sentCount));

      const questions = [];
      for (let a = 0; a < actCount; a++) {
        questions.push({
          question: `Arrange the story events in chronological order${actCount > 1 ? ` (Part ${a + 1})` : ''}`,
          items: items,
          explanation: 'The egg rolled away, hatched on the farm, and eventually learned to soar.',
          difficulty: item.difficulty || 'medium',
          points: points
        });
      }

      return {
        type: 'ordering',
        questions
      };
    }

    if (item.type === 'cloze_passage') {
      const blankCount = item.blankCount || item.count || 10;
      const sampleBlanks = [];
      for (let b = 1; b <= blankCount; b++) {
        sampleBlanks.push({
          id: `blank_${b}`,
          answer: `word_${b}`,
          options: [`word_${b}`, `distractor_${b}a`, `distractor_${b}b`, `distractor_${b}c`]
        });
      }

      return {
        type: 'cloze_passage',
        questions: [
          {
            question: 'Complete the passage using the correct words.',
            passage: `The young bird looked at the sky every morning. (Passage with ${blankCount} blanks)...`,
            blanks: sampleBlanks,
            explanation: 'Based on contextual clues in the lesson.',
            difficulty: item.difficulty || 'medium',
            points: points
          }
        ]
      };
    }

    if (item.type === 'essay') {
      return {
        type: 'essay',
        questions: [
          {
            question: 'Describe this image in 80–100 words.',
            image_url: item.image_url || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
            answer_length: {
              min_words: item.min_words || 80,
              max_words: item.max_words || 100
            },
            evaluation_criteria: item.evaluation_criteria || [
              'content_accuracy',
              'relevance',
              'completeness',
              'language',
              'grammar',
              'vocabulary'
            ],
            explanation: 'Provide a clear descriptive response grounded in the lesson visual and themes.',
            difficulty: item.difficulty || 'medium',
            points: points
          }
        ]
      };
    }

    if (item.type === 'wh_question') {
      const whType = item.wh_type === 'mixed_wh' ? 'where' : (item.wh_type || 'where');
      return {
        type: 'wh_question',
        questions: [
          {
            question: 'Where is Emily from?',
            wh_type: whType,
            expected_answer: 'Emily is from London.',
            acceptable_answers: ['London', 'She is from London', 'She lives in London'],
            passage: 'Emily lives in London with her family.',
            explanation: 'The passage mentions that Emily lives in London.',
            difficulty: item.difficulty || 'medium',
            points: points
          }
        ]
      };
    }

    const template = TYPE_EXAMPLE_TEMPLATES[item.type] || TYPE_EXAMPLE_TEMPLATES.multiple_choice;
    const cloned = JSON.parse(JSON.stringify(template));
    if (cloned.questions?.[0]) {
      cloned.questions[0].points = points;
      cloned.questions[0].difficulty = item.difficulty || 'medium';
    }
    return cloned;
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
  let totalActivities = 0;
  let totalMarks = 0;

  if (!jsonString || !jsonString.trim()) {
    return {
      isValid: false,
      errors: ['Please paste JSON generated by your AI tool.'],
      warnings: [],
      summary: { totalQuestions: 0, totalActivities: 0, totalMarks: 0, byType: {} }
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
    // Extract line and column numbers from error message or character position
    let lineInfo = '';
    const posMatch = err.message.match(/position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const linesUpToPos = cleanString.substring(0, pos).split('\n');
      const lineNum = linesUpToPos.length;
      const colNum = linesUpToPos[linesUpToPos.length - 1].length + 1;
      lineInfo = ` at line ${lineNum}, column ${colNum}`;
    } else {
      const lineMatch = err.message.match(/line (\d+)/i);
      if (lineMatch) {
        lineInfo = ` at line ${lineMatch[1]}`;
      }
    }
    return {
      isValid: false,
      errors: [`Invalid JSON syntax${lineInfo}: ${err.message}`],
      warnings: [],
      summary: { totalQuestions: 0, totalActivities: 0, totalMarks: 0, byType: {} }
    };
  }

  // Support flexible top-level structures:
  // 1. Array of questions: [ { type: '...', ... } ]
  // 2. Object with "questions" array: { questions: [ { type: '...', ... } ] }
  // 3. Object with "question_sets" array: { question_sets: [ { type: '...', questions: [...] } ] }
  if (Array.isArray(parsed)) {
    const setsMap = new Map<string, any[]>();
    for (const q of parsed) {
      if (q && typeof q === 'object') {
        const t = q.type || q.question_type || 'multiple_choice';
        if (!setsMap.has(t)) setsMap.set(t, []);
        setsMap.get(t)!.push(q);
      }
    }
    parsed = {
      schema_version: '1.0',
      question_sets: Array.from(setsMap.entries()).map(([type, questions]) => ({ type, questions }))
    };
  } else if (typeof parsed === 'object' && parsed !== null) {
    if (!Array.isArray(parsed.question_sets) && Array.isArray(parsed.questions)) {
      const setsMap = new Map<string, any[]>();
      for (const q of parsed.questions) {
        if (q && typeof q === 'object') {
          const t = q.type || q.question_type || 'multiple_choice';
          if (!setsMap.has(t)) setsMap.set(t, []);
          setsMap.get(t)!.push(q);
        }
      }
      parsed.question_sets = Array.from(setsMap.entries()).map(([type, questions]) => ({ type, questions }));
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      isValid: false,
      errors: ['Root JSON must be an object with "question_sets" or "questions" array.'],
      warnings: [],
      summary: { totalQuestions: 0, totalActivities: 0, totalMarks: 0, byType: {} }
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
      summary: { totalQuestions: 0, totalActivities: 0, totalMarks: 0, byType: {} }
    };
  }

  const validTypes: QuestionType[] = [
    'multiple_choice',
    'multiple_select',
    'true_false',
    'yes_no',
    'fill_blank',
    'multiple_fill_blanks',
    'matching',
    'matching_pairs',
    'sentence_builder',
    'sentence_reordering',
    'word_ordering',
    'ordering',
    'story_sequence',
    'image_selection',
    'dropdown_selection',
    'drag_to_complete',
    'drag_drop_matching',
    'categorisation',
    'odd_one_out',
    'short_answer',
    'cloze_passage',
    'essay',
    'wh_question',
    'comprehension',
    'speaking',
    'grammar_correction',
    'word_choice'
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
    totalActivities += (typeKey === 'cloze_passage' ? 1 : qSet.questions.length);

    // 4. Content validation per question
    qSet.questions.forEach((q: any, qIdx: number) => {
      const qNum = `${label} #${qIdx + 1}`;
      const pts = typeof q.points === 'number' ? q.points : (typeKey === 'essay' || typeKey === 'cloze_passage' ? 20 : 10);
      totalMarks += pts;

      // Flexible field normalization for untrusted AI JSON
      const promptCandidate = q.question || q.questionText || q.prompt || q.statement || q.sentence || '';
      if (!q.question && promptCandidate) q.question = promptCandidate;

      const correctCandidate = q.correct_answer !== undefined ? q.correct_answer : (q.correctAnswer !== undefined ? q.correctAnswer : (q.answer !== undefined ? q.answer : q.expected_answer));
      if (q.correct_answer === undefined && correctCandidate !== undefined) q.correct_answer = correctCandidate;

      const optionsCandidate = q.options || q.choices || q.pairs || q.items;
      if (!q.options && optionsCandidate) q.options = optionsCandidate;

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
      } else if (typeKey === 'true_false' || typeKey === 'yes_no') {
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
      } else if (typeKey === 'wh_question' || typeKey === 'comprehension') {
        if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
          errors.push(`${qNum}: Missing "question" prompt.`);
        }
        const hasExpected = q.expected_answer || q.correct_answer || q.answer;
        const hasAcceptable = Array.isArray(q.acceptable_answers) && q.acceptable_answers.length > 0;
        if (!hasExpected && !hasAcceptable) {
          errors.push(`${qNum}: Missing "expected_answer" or "correct_answer".`);
        }
      } else if (typeKey === 'cloze_passage') {
        const passage = q.passage || q.question_text || q.text;
        if (!passage || typeof passage !== 'string' || !passage.trim()) {
          errors.push(`${qNum}: Missing "passage" text.`);
        }
        if (!Array.isArray(q.blanks) || q.blanks.length === 0) {
          errors.push(`${qNum}: Cloze passage requires a "blanks" array with at least 1 blank.`);
        } else {
          q.blanks.forEach((b: any, bIdx: number) => {
            if (!b.id) b.id = `blank_${bIdx + 1}`;
            if (!b.answer || typeof b.answer !== 'string' || !b.answer.trim()) {
              errors.push(`${qNum} Blank #${bIdx + 1}: Missing "answer".`);
            }
            if (!Array.isArray(b.options) || b.options.length !== 4) {
              errors.push(`${qNum} Blank #${bIdx + 1}: Must contain exactly 4 options in "options".`);
            } else if (b.answer) {
              const matchCount = b.options.filter((opt: any) => String(opt).trim().toLowerCase() === String(b.answer).trim().toLowerCase()).length;
              if (matchCount === 0) {
                errors.push(`${qNum} Blank #${bIdx + 1}: "options" must include the correct answer "${b.answer}".`);
              } else if (matchCount > 1) {
                errors.push(`${qNum} Blank #${bIdx + 1}: "options" contains multiple instances of the answer "${b.answer}". Exactly 1 required.`);
              }
            }
          });
        }
      } else if (typeKey === 'essay') {
        if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
          errors.push(`${qNum}: Missing "question" prompt.`);
        }
        if (q.evaluation_criteria && !Array.isArray(q.evaluation_criteria)) {
          errors.push(`${qNum}: "evaluation_criteria" must be an array of criteria strings.`);
        }
      }
    });
  });

  // 5. Strict Verification against Question Plan if provided
  if (plan && plan.items.length > 0) {
    plan.items.forEach(planItem => {
      const label = QUESTION_TYPE_LABELS[planItem.type] || planItem.type;
      const qSet = parsed.question_sets.find((s: any) => s.type === planItem.type);

      if (!seenTypes.has(planItem.type) || !qSet || !Array.isArray(qSet.questions) || qSet.questions.length === 0) {
        errors.push(`Missing required question set: ${label}.`);
        return;
      }

      if (planItem.type === 'cloze_passage') {
        const expectedBlanks = planItem.blankCount || planItem.count || 10;
        if (qSet.questions.length !== 1) {
          errors.push(`Cloze Passage must contain exactly 1 passage activity.`);
        } else {
          const actualBlanks = qSet.questions[0]?.blanks?.length || 0;
          if (actualBlanks !== expectedBlanks) {
            errors.push(`Cloze Passage must contain exactly ${expectedBlanks} blanks. The generated JSON contains ${actualBlanks}.`);
          }
        }
      } else if (planItem.type === 'ordering') {
        const expectedActivities = planItem.activityCount || 1;
        const expectedItems = planItem.itemsPerActivity || planItem.count || 5;

        if (qSet.questions.length !== expectedActivities) {
          errors.push(`Ordering should contain ${expectedActivities} ordering activit${expectedActivities > 1 ? 'ies' : 'y'} (JSON contains ${qSet.questions.length}).`);
        } else {
          qSet.questions.forEach((q: any, idx: number) => {
            const actualItemCount = q?.items?.length || 0;
            if (actualItemCount !== expectedItems) {
              errors.push(`Ordering activity #${idx + 1} requires ${expectedItems} sentences, but JSON contains ${actualItemCount}. (Expected: ${expectedItems})`);
            }
          });
        }
      } else {
        const expectedCount = planItem.count || 1;
        const actualCount = qSet.questions.length;
        if (actualCount !== expectedCount) {
          errors.push(`${label} requires ${expectedCount} question${expectedCount > 1 ? 's' : ''}, but JSON contains ${actualCount}. (Expected: ${expectedCount})`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalQuestions,
      totalActivities,
      totalMarks,
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
      let optionsList: any = [];
      let correctAnswerStr = String(q.correct_answer ?? '');
      let passageText: string | undefined = undefined;
      let blanksList: ClozeBlank[] | undefined = undefined;
      let imageUrl: string | undefined = undefined;
      let minWords: number | undefined = undefined;
      let maxWords: number | undefined = undefined;
      let criteriaList: string[] | undefined = undefined;
      const points = typeof q.points === 'number' ? q.points : (qType === 'essay' || qType === 'cloze_passage' ? 20 : 10);

      if (qType === 'multiple_choice') {
        const rawOptions = q.options || q.choices || [];
        const normalized = normalizeQuestionOptions(rawOptions);
        const resolved = resolveCorrectOption({
          options: normalized,
          correct_answer: q.correct_answer ?? q.correctAnswer ?? q.answer
        });

        // Fisher-Yates shuffle options to eliminate Option A / index 0 bias
        if (normalized.length > 1) {
          const shuffled = [...normalized];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          // Re-assign stable letter IDs 'A', 'B', 'C', 'D' based on shuffled positions
          const reindexed = shuffled.map((opt, idx) => ({
            id: String.fromCharCode(65 + idx),
            text: opt.text
          }));

          // Re-map correct_answer to point to the new ID of the correct option
          if (resolved) {
            const newCorrectOpt = reindexed.find(opt => opt.text === resolved.text);
            if (newCorrectOpt) {
              correctAnswerStr = newCorrectOpt.id;
            } else {
              correctAnswerStr = resolved.id;
            }
          } else {
            correctAnswerStr = String(q.correct_answer ?? 'A');
          }

          optionsList = reindexed;
        } else {
          optionsList = normalized;
          correctAnswerStr = resolved ? resolved.id : String(q.correct_answer ?? '');
        }
      } else if (qType === 'true_false' || qType === 'yes_no') {
        optionsList = qType === 'true_false' ? ['True', 'False'] : ['Yes', 'No'];
        const isTrue = q.correct_answer === true || String(q.correct_answer).toLowerCase() === 'true' || String(q.correct_answer).toLowerCase() === 'yes';
        correctAnswerStr = qType === 'true_false' ? (isTrue ? 'True' : 'False') : (isTrue ? 'Yes' : 'No');
      } else if (qType === 'multiple_select') {
        optionsList = Array.isArray(q.options) ? q.options : [];
        correctAnswerStr = Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : String(q.correct_answer ?? '');
      } else if (qType === 'wh_question' || (qType === 'comprehension' && (!q.options || q.options.length === 0))) {
        const whType = (q.wh_type || 'what').toLowerCase();
        const expectedAns = String(q.expected_answer || q.correct_answer || q.answer || '').trim();
        const acceptableAns = Array.isArray(q.acceptable_answers)
          ? q.acceptable_answers.map((a: any) => String(a).trim())
          : (expectedAns ? [expectedAns] : []);
        passageText = q.passage || q.context || undefined;
        optionsList = {
          options: acceptableAns,
          acceptable_answers: acceptableAns,
          expected_answer: expectedAns,
          wh_type: whType,
          passage: passageText
        };
        correctAnswerStr = expectedAns;

        result.push({
          id: `q_${Date.now()}_${orderIndex}`,
          episode_id: episodeId,
          course_id: courseId,
          question_text: qText,
          question_type: 'wh_question',
          options: optionsList,
          correct_answer: expectedAns,
          expected_answer: expectedAns,
          acceptable_answers: acceptableAns,
          wh_type: whType as WhType,
          passage: passageText,
          explanation: q.explanation || '',
          skill: q.skill || 'Reading Comprehension',
          concept: q.concept || 'WH Question',
          difficulty: (q.difficulty as DifficultyLevel) || 'medium',
          points: points,
          order_index: orderIndex++,
          evaluation: {
            method: 'ai_semantic',
            ai_evaluated: true,
            criteria: ['comprehension', 'accuracy', 'key_details'],
            maxScore: points
          }
        });
        return;
      } else if (qType === 'fill_blank') {
        optionsList = [];
      } else if (qType === 'matching') {
        if (Array.isArray(q.pairs)) {
          optionsList = q.pairs.map((p: any) => `${p.left || ''} -> ${p.right || ''}`);
        }
      } else if (qType === 'ordering') {
        optionsList = Array.isArray(q.items) ? q.items : [];
      } else if (qType === 'short_answer') {
        if (Array.isArray(q.acceptable_answers)) {
          optionsList = q.acceptable_answers;
        }
      } else if (qType === 'cloze_passage') {
        passageText = q.passage || '';
        blanksList = Array.isArray(q.blanks) ? q.blanks : [];
        optionsList = {
          passage: passageText,
          blanks: blanksList
        };
        correctAnswerStr = (blanksList || []).map(b => b.answer).join(', ') || 'All blanks completed';
      } else if (qType === 'essay') {
        imageUrl = q.image_url || undefined;
        minWords = q.answer_length?.min_words || q.min_words || 80;
        maxWords = q.answer_length?.max_words || q.max_words || 100;
        criteriaList = Array.isArray(q.evaluation_criteria)
          ? q.evaluation_criteria
          : ['content_accuracy', 'relevance', 'completeness', 'language', 'grammar', 'vocabulary'];
        optionsList = {
          image_url: imageUrl,
          min_words: minWords,
          max_words: maxWords,
          evaluation_criteria: criteriaList
        };
        correctAnswerStr = 'AI Evaluated';
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
        skill: q.skill || (qType === 'essay' ? 'Descriptive Writing' : qType === 'cloze_passage' ? 'Context Clues' : 'Comprehension'),
        concept: q.concept || 'General',
        difficulty: (q.difficulty as DifficultyLevel) || 'medium',
        points: points,
        order_index: orderIndex++,
        passage: passageText,
        blanks: blanksList,
        image_url: imageUrl,
        min_words: minWords,
        max_words: maxWords,
        evaluation_criteria: criteriaList
      });
    });
  });

  return result;
}
