// ============================================================================
// EDTECHRA RESPONSE STUDIO SCHEMA, PROMPT GENERATOR & DETERMINISTIC VALIDATOR
// Supports: Polls, Surveys, and Feedback Forms
// ============================================================================

import { CanonicalAssessmentV2, CanonicalQuestion, ResponseSubType } from '../shared/ExamSchema';
import { getThemePreset } from '../shared/themePresets';

export type ResponseQuestionType =
  | 'single_choice'
  | 'multiple_selection'
  | 'yes_no'
  | 'rating'
  | 'ranking'
  | 'likert'
  | 'short_answer'
  | 'long_text';

export interface ResponseStudioQuestion {
  id: string;
  type: ResponseQuestionType;
  question: string;
  options?: string[];
  scale?: number;
  required: boolean;
}

export interface ResponseStudioPayload {
  type: ResponseSubType;
  title: string;
  description: string;
  anonymous: boolean;
  questions: ResponseStudioQuestion[];
}

export type PollTypeOption =
  | 'Single Choice Poll'
  | 'Multiple Selection Poll'
  | 'Yes / No Poll'
  | 'Rating Poll (1 to 5)'
  | 'Opinion Ranking Poll';

export type FeedbackStyleOption =
  | 'Lesson Feedback'
  | 'Teacher / Teaching Feedback'
  | 'Course / Module Feedback'
  | 'Difficulty / Understanding Check'
  | 'Open Reflections';

export interface ResponseStudioConfig {
  responseType: ResponseSubType;
  title: string;
  topic: string;
  language: string;
  targetAudience: 'entire_class' | 'selected_students';
  selectedStudentIds: string[];
  isAnonymous: boolean;
  deadline: string;
  trackResponses: boolean;

  // Poll-specific
  pollType: PollTypeOption;
  pollQuestionCount: number;
  allowSeeResults: boolean;
  allowChangeResponse: boolean;

  // Survey-specific
  surveyQuestionCount: number;
  questionSelectionMode: 'auto' | 'manual';
  selectedQuestionTypes: ResponseQuestionType[];
  requiredQuestions: boolean;
  oneResponsePerStudent: boolean;

  // Feedback-specific
  feedbackStyle: FeedbackStyleOption;
  feedbackQuestionCount: number;

  // Optional teacher notes
  additionalInstructions: string;
}

export const DEFAULT_RESPONSE_STUDIO_CONFIG: ResponseStudioConfig = {
  responseType: 'poll',
  title: '',
  topic: '',
  language: 'English',
  targetAudience: 'entire_class',
  selectedStudentIds: [],
  isAnonymous: false,
  deadline: '',
  trackResponses: true,

  pollType: 'Single Choice Poll',
  pollQuestionCount: 1,
  allowSeeResults: true,
  allowChangeResponse: false,

  surveyQuestionCount: 5,
  questionSelectionMode: 'auto',
  selectedQuestionTypes: ['single_choice', 'rating', 'short_answer'],
  requiredQuestions: true,
  oneResponsePerStudent: true,

  feedbackStyle: 'Lesson Feedback',
  feedbackQuestionCount: 5,

  additionalInstructions: '',
};

export const SURVEY_QUESTION_TYPE_OPTIONS: Array<{
  type: ResponseQuestionType;
  label: string;
  description: string;
}> = [
  { type: 'single_choice', label: 'Multiple Choice', description: 'Select one option from a list' },
  { type: 'multiple_selection', label: 'Checkbox (Multiple Selection)', description: 'Select one or more options' },
  { type: 'rating', label: 'Rating Scale (1–5)', description: 'Star or numeric rating scale' },
  { type: 'likert', label: 'Likert Scale (Strongly Disagree → Strongly Agree)', description: '5-point agreement scale' },
  { type: 'short_answer', label: 'Short Answer', description: 'Brief single-line text response' },
  { type: 'long_text', label: 'Long Text', description: 'Detailed multi-line reflection or comment' },
];

export const LIKERT_DEFAULT_OPTIONS = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
];

export const YES_NO_DEFAULT_OPTIONS = ['Yes', 'No'];

export function mapPollTypeToQuestionType(pollType: PollTypeOption): ResponseQuestionType {
  switch (pollType) {
    case 'Single Choice Poll':
      return 'single_choice';
    case 'Multiple Selection Poll':
      return 'multiple_selection';
    case 'Yes / No Poll':
      return 'yes_no';
    case 'Rating Poll (1 to 5)':
      return 'rating';
    case 'Opinion Ranking Poll':
      return 'ranking';
    default:
      return 'single_choice';
  }
}

/**
 * Part 6: Deterministic AI Prompt Generator
 */
export function generateResponseStudioPrompt(config: ResponseStudioConfig): string {
  const { responseType, title, topic, language, isAnonymous, additionalInstructions } = config;
  const cleanTitle = title.trim() || `Classroom ${responseType.charAt(0).toUpperCase() + responseType.slice(1)}`;
  const cleanTopic = topic.trim() || 'General classroom learning and student experience';

  let typeSpecificInstructions = '';

  if (responseType === 'poll') {
    const mappedType = mapPollTypeToQuestionType(config.pollType);
    typeSpecificInstructions = [
      `- Response Type: "poll"`,
      `- Poll Style: ${config.pollType} (use question type "${mappedType}")`,
      `- Number of Questions: ${config.pollQuestionCount}`,
      mappedType === 'yes_no'
        ? `- Options: Use ["Yes", "No"] for yes_no questions.`
        : mappedType === 'rating'
        ? `- Rating Scale: Set "scale": 5 (1 to 5).`
        : `- Provide 3 to 5 clear, concise options in the "options" array for each question.`,
      `- All questions should have "required": true.`,
    ].join('\n');
  } else if (responseType === 'survey') {
    const allowedTypes =
      config.questionSelectionMode === 'manual' && config.selectedQuestionTypes.length > 0
        ? config.selectedQuestionTypes.join(', ')
        : 'single_choice, multiple_selection, rating, likert, short_answer, long_text (choose the best mix automatically)';
    typeSpecificInstructions = [
      `- Response Type: "survey"`,
      `- Number of Questions: ${config.surveyQuestionCount}`,
      `- Question Types to Use: ${allowedTypes}`,
      `- Required Questions: Set "required": ${config.requiredQuestions ? 'true' : 'false'} on questions.`,
      `- For "single_choice" and "multiple_selection", include an "options" array with at least 3 clear choices.`,
      `- For "likert", include "options": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"].`,
      `- For "rating", include "scale": 5.`,
    ].join('\n');
  } else {
    typeSpecificInstructions = [
      `- Response Type: "feedback"`,
      `- Feedback Style: ${config.feedbackStyle}`,
      `- Number of Questions: ${config.feedbackQuestionCount}`,
      `- Recommended Question Mix: Combine "rating" (scale: 5), "single_choice" or "likert", and 1–2 open reflection questions ("short_answer" or "long_text") tailored to ${config.feedbackStyle}.`,
      `- Set "required": true for core rating/choice questions.`,
    ].join('\n');
  }

  const extraNotes = additionalInstructions.trim()
    ? `\nAdditional Teacher Instructions:\n${additionalInstructions.trim()}\n`
    : '';

  return `You are an expert educational designer creating a classroom ${responseType.toUpperCase()} for students in EdTechra.

Configuration Details:
- Title: "${cleanTitle}"
- Topic / Purpose: "${cleanTopic}"
- Language: ${language || 'English'}
- Anonymous Mode: ${isAnonymous ? 'true' : 'false'}
${typeSpecificInstructions}
${extraNotes}
Required JSON Schema:
{
  "type": "${responseType}",
  "title": "${cleanTitle}",
  "description": "Brief, welcoming instructions for students in ${language || 'English'}",
  "anonymous": ${isAnonymous ? 'true' : 'false'},
  "questions": [
    {
      "id": "q1",
      "type": "single_choice | multiple_selection | yes_no | rating | ranking | likert | short_answer | long_text",
      "question": "Question text in ${language || 'English'}",
      "options": ["Option 1", "Option 2", "Option 3"],
      "scale": 5,
      "required": true
    }
  ]
}

Rules for Question Objects:
1. "id" must be unique for every question ("q1", "q2", "q3", etc.).
2. "type" MUST be one of: "single_choice", "multiple_selection", "yes_no", "rating", "ranking", "likert", "short_answer", "long_text".
3. Include "options" (array of at least 2 strings) for "single_choice", "multiple_selection", "yes_no", "ranking", and "likert".
4. Include "scale": 5 for "rating" questions.
5. Write all titles, descriptions, questions, and options in ${language || 'English'}.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.
Do not include extra text.`;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  payload?: ResponseStudioPayload;
}

const VALID_RESPONSE_TYPES: ResponseSubType[] = ['poll', 'survey', 'feedback'];
const VALID_QUESTION_TYPES: ResponseQuestionType[] = [
  'single_choice',
  'multiple_selection',
  'yes_no',
  'rating',
  'ranking',
  'likert',
  'short_answer',
  'long_text',
];

function normalizeQuestionType(rawType: string): ResponseQuestionType | null {
  const t = String(rawType || '').trim().toLowerCase();
  if ((VALID_QUESTION_TYPES as string[]).includes(t)) {
    return t as ResponseQuestionType;
  }
  if (t === 'multiple_choice' || t === 'radio' || t === 'dropdown') return 'single_choice';
  if (t === 'checkboxes' || t === 'multiple_select' || t === 'checkbox') return 'multiple_selection';
  if (t === 'true_false' || t === 'boolean') return 'yes_no';
  if (t === 'linear_scale' || t === 'scale' || t === 'star_rating') return 'rating';
  if (t === 'reorder' || t === 'rank') return 'ranking';
  if (t === 'paragraph' || t === 'essay' || t === 'textarea' || t === 'open_text') return 'long_text';
  if (t === 'text' || t === 'short_text') return 'short_answer';
  return null;
}

/**
 * Part 7 & Part 19: Deterministic Strict JSON Validator
 */
export function validateResponseStudioJson(
  rawInput: string,
  expectedType?: ResponseSubType
): ValidationResult {
  const errors: string[] = [];

  if (!rawInput || !rawInput.trim()) {
    return {
      valid: false,
      errors: ['Please paste the AI-generated JSON result before validating.'],
    };
  }

  // 1. Strip markdown code fences if present
  let cleaned = rawInput.trim();
  cleaned = cleaned.replace(/^```(?:json|javascript|ts)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    return {
      valid: false,
      errors: [`Invalid JSON format: ${err?.message || 'Unable to parse JSON. Check for missing commas or quotes.'}`],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: ['Root JSON value must be an object containing "type", "title", and "questions".'],
    };
  }

  // 2. Validate type
  const rawType = String(parsed.type || expectedType || '').trim().toLowerCase() as ResponseSubType;
  if (!VALID_RESPONSE_TYPES.includes(rawType)) {
    errors.push(`Invalid or missing "type": expected one of "poll", "survey", or "feedback" (received "${parsed.type || ''}").`);
  }

  // 3. Validate title
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  if (!title) {
    errors.push('Missing or empty "title": the response form must have a non-empty title string.');
  }

  // 4. Validate questions array
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    errors.push('Missing or empty "questions" array: at least 1 question is required.');
  }

  const validatedQuestions: ResponseStudioQuestion[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(parsed.questions)) {
    parsed.questions.forEach((q: any, index: number) => {
      const qLabel = `Question #${index + 1}`;
      if (!q || typeof q !== 'object') {
        errors.push(`${qLabel}: Must be a valid question object.`);
        return;
      }

      // Unique ID check
      let qId = typeof q.id === 'string' && q.id.trim() ? q.id.trim() : `q${index + 1}`;
      if (seenIds.has(qId)) {
        errors.push(`${qLabel}: Duplicate question id "${qId}". Each question must have a unique id.`);
        qId = `${qId}_${index + 1}`;
      }
      seenIds.add(qId);

      // Question type check
      const normalizedType = normalizeQuestionType(q.type);
      if (!normalizedType) {
        errors.push(
          `${qLabel} ("${qId}"): Unsupported question type "${q.type}". Must be one of: ${VALID_QUESTION_TYPES.join(', ')}.`
        );
        return;
      }

      // Question text check
      const questionText = typeof q.question === 'string' ? q.question.trim() : '';
      if (!questionText) {
        errors.push(`${qLabel} ("${qId}"): Question text ("question") is missing or empty.`);
      }

      let options: string[] | undefined = undefined;
      let scale: number | undefined = undefined;

      if (
        normalizedType === 'single_choice' ||
        normalizedType === 'multiple_selection' ||
        normalizedType === 'ranking'
      ) {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          errors.push(
            `${qLabel} ("${qId}"): Question type "${normalizedType}" requires an "options" array with at least 2 options.`
          );
        } else {
          const cleanOpts = q.options
            .map((opt: any) => (typeof opt === 'string' ? opt.trim() : typeof opt?.text === 'string' ? opt.text.trim() : String(opt || '').trim()))
            .filter(Boolean);
          if (cleanOpts.length < 2) {
            errors.push(
              `${qLabel} ("${qId}"): Question type "${normalizedType}" must have at least 2 non-empty option strings.`
            );
          }
          options = cleanOpts;
        }
      } else if (normalizedType === 'yes_no') {
        if (Array.isArray(q.options) && q.options.length >= 2) {
          options = q.options.map((o: any) => (typeof o === 'string' ? o.trim() : String(o?.text || o || '').trim())).filter(Boolean);
        } else {
          options = [...YES_NO_DEFAULT_OPTIONS];
        }
      } else if (normalizedType === 'likert') {
        if (Array.isArray(q.options) && q.options.length >= 2) {
          options = q.options.map((o: any) => (typeof o === 'string' ? o.trim() : String(o?.text || o || '').trim())).filter(Boolean);
        } else {
          options = [...LIKERT_DEFAULT_OPTIONS];
        }
      } else if (normalizedType === 'rating') {
        const rawScale = q.scale !== undefined ? Number(q.scale) : 5;
        if (Number.isNaN(rawScale) || rawScale < 3 || rawScale > 10) {
          errors.push(
            `${qLabel} ("${qId}"): "rating" question scale must be a number between 3 and 10 (received ${q.scale}).`
          );
        } else {
          scale = Math.round(rawScale);
        }
      }

      validatedQuestions.push({
        id: qId,
        type: normalizedType,
        question: questionText,
        ...(options ? { options } : {}),
        ...(scale ? { scale } : {}),
        required: typeof q.required === 'boolean' ? q.required : true,
      });
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    payload: {
      type: rawType,
      title,
      description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
      anonymous: Boolean(parsed.anonymous),
      questions: validatedQuestions,
    },
  };
}

/**
 * Convert ResponseStudioPayload + ResponseStudioConfig to CanonicalAssessmentV2 for DB persistence
 */
export function buildCanonicalFromResponseStudio(
  payload: ResponseStudioPayload,
  config: ResponseStudioConfig
): CanonicalAssessmentV2 {
  const canonicalQuestions: CanonicalQuestion[] = payload.questions.map((q, idx) => {
    const qId = q.id || `q${idx + 1}`;
    const base = {
      id: qId,
      question: q.question,
      difficulty: 'medium' as const,
      marks: 0,
      required: q.required,
    };

    const optionObjects = (q.options || []).map((optText, optIdx) => ({
      id: `${qId}_opt_${optIdx + 1}`,
      text: optText,
    }));

    return {
      ...base,
      type: q.type as any,
      options: optionObjects,
      scale: q.scale || (q.type === 'rating' ? 5 : undefined),
      scaleMin: 1,
      scaleMax: q.scale || 5,
      correctAnswer: [],
    } as any;
  });

  const isOneResponse =
    payload.type === 'poll' ? true : payload.type === 'survey' ? config.oneResponsePerStudent : true;

  return {
    schemaVersion: '2.0',
    // Keep 'survey' for DB constraint compatibility on classroom_exams.assessment_type
    assessmentType: 'survey',
    exam: {
      title: payload.title || config.title || `Classroom ${payload.type.toUpperCase()}`,
      subject: config.topic || 'General',
      grade: 'All Grades',
      level: 'General',
      examType: payload.type, // 'poll' | 'survey' | 'feedback'
      difficulty: 'Mixed',
      topic: config.topic || payload.description || '',
      totalMarks: 0,
      description: payload.description || config.topic || '',
      instructions: payload.description || '',
      durationMinutes: 0,
      passPercentage: 0,
      maxAttempts: config.allowChangeResponse ? 99 : 1,
      scorePolicy: 'latest',
      randomizeQuestions: false,
      randomizeOptions: false,
      allowLateSubmission: true,
      showMarksImmediately: false,
      showCorrectAnswers: false,
      startsAt: null,
      endsAt: config.deadline ? new Date(config.deadline).toISOString() : null,
    },
    theme: getThemePreset('corporate_slate_survey'),
    brandKit: {
      enabled: false,
      institutionName: '',
      logoUrl: '',
      primaryColor: '#0d9488',
      secondaryColor: '#0f766e',
      watermark: false,
      footerText: 'Powered by EdTechra Response Studio',
    },
    surveySettings: {
      isAnonymous: payload.anonymous ?? config.isAnonymous,
      collectEmail: false,
      oneResponsePerUser: isOneResponse,
      thankYouMessage:
        payload.type === 'poll'
          ? 'Thank you for voting in this poll!'
          : payload.type === 'feedback'
          ? 'Thank you for sharing your feedback!'
          : 'Thank you for completing this survey!',
      confirmationBadgeText: `${payload.type.toUpperCase()} SUBMITTED`,
      responseType: payload.type,
      pollType: config.pollType,
      feedbackStyle: config.feedbackStyle,
      language: config.language,
      targetAudience: config.targetAudience,
      selectedStudentIds: config.selectedStudentIds,
      allowSeeResults: config.allowSeeResults,
      allowChangeResponse: config.allowChangeResponse,
      trackResponses: config.trackResponses,
      deadline: config.deadline || null,
      requiredQuestions: config.requiredQuestions,
      questionSelectionMode: config.questionSelectionMode,
      selectedQuestionTypes: config.selectedQuestionTypes,
      additionalInstructions: config.additionalInstructions,
      topic: config.topic,
    },
    sections: [
      {
        id: 'sec_response_1',
        title: payload.title || 'Questions',
        description: payload.description || '',
        questions: canonicalQuestions,
      },
    ],
  };
}

/**
 * Extract ResponseStudioPayload & ResponseStudioConfig from an existing CanonicalAssessmentV2 or DB row
 */
export function extractResponseStudioFromCanonical(
  assessment: CanonicalAssessmentV2,
  fallbackType?: ResponseSubType
): { config: ResponseStudioConfig; payload: ResponseStudioPayload } {
  const settings = assessment.surveySettings || ({} as any);
  const rawExamType = String(assessment.exam?.examType || '').toLowerCase();
  const detectedType: ResponseSubType =
    settings.responseType ||
    (rawExamType === 'poll' || rawExamType === 'survey' || rawExamType === 'feedback'
      ? (rawExamType as ResponseSubType)
      : fallbackType || 'survey');

  const allQuestions = (assessment.sections || []).flatMap((sec) => sec.questions || []);

  const questions: ResponseStudioQuestion[] = allQuestions.map((q: any, idx: number) => {
    const normalizedType = normalizeQuestionType(q.type) || 'single_choice';
    let options: string[] | undefined;

    if (Array.isArray(q.options) && q.options.length > 0) {
      options = q.options
        .map((o: any) => (typeof o === 'string' ? o : o?.text || String(o || '')))
        .filter(Boolean);
    } else if (Array.isArray(q.items) && q.items.length > 0) {
      options = q.items
        .map((o: any) => (typeof o === 'string' ? o : o?.text || String(o || '')))
        .filter(Boolean);
    } else if (normalizedType === 'yes_no') {
      options = [...YES_NO_DEFAULT_OPTIONS];
    } else if (normalizedType === 'likert') {
      options = [...LIKERT_DEFAULT_OPTIONS];
    }

    const scale =
      normalizedType === 'rating'
        ? Number(q.scale || q.scaleMax || 5)
        : undefined;

    return {
      id: q.id || `q${idx + 1}`,
      type: normalizedType,
      question: q.question || '',
      ...(options ? { options } : {}),
      ...(scale ? { scale } : {}),
      required: typeof q.required === 'boolean' ? q.required : true,
    };
  });

  const config: ResponseStudioConfig = {
    ...DEFAULT_RESPONSE_STUDIO_CONFIG,
    responseType: detectedType,
    title: assessment.exam?.title || '',
    topic: settings.topic || assessment.exam?.topic || assessment.exam?.description || '',
    language: settings.language || 'English',
    targetAudience: settings.targetAudience || 'entire_class',
    selectedStudentIds: Array.isArray(settings.selectedStudentIds) ? settings.selectedStudentIds : [],
    isAnonymous: Boolean(settings.isAnonymous),
    deadline: settings.deadline || (assessment.exam?.endsAt ? assessment.exam.endsAt.slice(0, 16) : ''),
    trackResponses: settings.trackResponses !== undefined ? Boolean(settings.trackResponses) : true,
    pollType: (settings.pollType as PollTypeOption) || 'Single Choice Poll',
    pollQuestionCount: detectedType === 'poll' ? Math.max(1, Math.min(5, questions.length || 1)) : 1,
    allowSeeResults: settings.allowSeeResults !== undefined ? Boolean(settings.allowSeeResults) : true,
    allowChangeResponse: Boolean(settings.allowChangeResponse),
    surveyQuestionCount: detectedType === 'survey' ? (questions.length || 5) : 5,
    questionSelectionMode: settings.questionSelectionMode || 'auto',
    selectedQuestionTypes: Array.isArray(settings.selectedQuestionTypes)
      ? (settings.selectedQuestionTypes as ResponseQuestionType[])
      : ['single_choice', 'rating', 'short_answer'],
    requiredQuestions: settings.requiredQuestions !== undefined ? Boolean(settings.requiredQuestions) : true,
    oneResponsePerStudent:
      settings.oneResponsePerUser !== undefined ? Boolean(settings.oneResponsePerUser) : true,
    feedbackStyle: (settings.feedbackStyle as FeedbackStyleOption) || 'Lesson Feedback',
    feedbackQuestionCount: detectedType === 'feedback' ? (questions.length || 5) : 5,
    additionalInstructions: settings.additionalInstructions || '',
  };

  const payload: ResponseStudioPayload = {
    type: detectedType,
    title: assessment.exam?.title || '',
    description: assessment.exam?.description || assessment.exam?.instructions || '',
    anonymous: Boolean(settings.isAnonymous),
    questions,
  };

  return { config, payload };
}

/**
 * Helper to detect if any exam/assessment object is a Response Studio item (Poll, Survey, or Feedback)
 */
export function isResponseAssessment(examOrAssessment: any): boolean {
  if (!examOrAssessment) return false;
  const aType = String(examOrAssessment.assessment_type || examOrAssessment.assessmentType || '').toLowerCase();
  if (aType === 'survey' || aType === 'response' || aType === 'poll' || aType === 'feedback') {
    return true;
  }
  const eType = String(
    examOrAssessment.exam_type ||
      examOrAssessment.exam?.examType ||
      examOrAssessment.survey_settings?.responseType ||
      examOrAssessment.surveySettings?.responseType ||
      ''
  ).toLowerCase();
  return eType === 'poll' || eType === 'survey' || eType === 'feedback';
}

/**
 * Helper to get the specific subtype ('poll' | 'survey' | 'feedback') from an exam/assessment record
 */
export function getResponseSubType(examOrAssessment: any): ResponseSubType {
  if (!examOrAssessment) return 'survey';
  const rType = String(
    examOrAssessment.survey_settings?.responseType ||
      examOrAssessment.surveySettings?.responseType ||
      examOrAssessment.exam?.examType ||
      examOrAssessment.exam_type ||
      examOrAssessment.assessmentType ||
      examOrAssessment.assessment_type ||
      ''
  ).toLowerCase();
  if (rType === 'poll') return 'poll';
  if (rType === 'feedback') return 'feedback';
  return 'survey';
}
