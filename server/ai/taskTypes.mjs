// ============================================================================
// EDTECHRA AI TASK TYPES & CENTRAL ROUTING SPECIFICATION
// Two-Tier Architecture: Gemini (Tier 1: Free/High-Volume) & GPT-5 Nano (Tier 2: Reasoning)
// ============================================================================

export const AI_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai'
};

export const AI_TASK_TYPES = {
  // --- TIER 1: SIMPLE / HIGH-VOLUME TASKS (Rerouted to Gemini) ---
  SIMPLE_CHAT: 'simple_chat',
  TEACHER_CHAT: 'teacher_chat',
  GRAMMAR_EXPLANATION: 'grammar_explanation',
  VOCABULARY: 'vocabulary',
  SUMMARY: 'summary',
  SIMPLE_FEEDBACK: 'simple_feedback',
  SIMPLE_ANNOUNCEMENT: 'simple_announcement',
  ANNOUNCEMENT_GENERATION: 'simple_announcement',
  SIMPLE_RESOURCE_DESCRIPTION: 'simple_resource_description',
  ROUTINE_QUESTION: 'routine_question',
  BASIC_REWRITE: 'basic_rewrite',
  BASIC_CLASSIFICATION: 'basic_classification',
  SIMPLE_TEXT_TRANSFORMATION: 'simple_text_transformation',
  BASIC_QUIZ_LOW_COMPLEXITY: 'basic_quiz_low_complexity',

  // --- TIER 2: COMPLEX / HIGH-VALUE EDUCATIONAL TASKS (Rerouted to GPT-5 Nano) ---
  EXAM_GENERATION: 'exam_generation',
  DIAGNOSTIC_GENERATION: 'diagnostic_generation',
  MID_TERM_EXAM_GENERATION: 'mid_term_exam_generation',
  FINAL_EXAM_GENERATION: 'final_exam_generation',
  QUIZ_GENERATION: 'quiz_generation',
  COMPLEX_ACTIVITY_GENERATION: 'complex_activity_generation',
  SENTENCE_REORDERING: 'sentence_reordering',
  READING_COMPREHENSION: 'reading_comprehension',
  MULTI_STEP_GRAMMAR: 'multi_step_grammar',
  WORKSHEET_GENERATION: 'worksheet_generation',
  STRUCTURED_EDUCATIONAL_ACTIVITY: 'structured_educational_activity',
  CLASS_ANALYSIS: 'class_analysis',
  STUDENT_ANALYSIS: 'student_analysis',
  DIAGNOSTIC_ANALYSIS: 'diagnostic_analysis',
  EXAM_ANALYSIS: 'exam_analysis',
  PERSONALIZED_PLAN: 'personalized_plan',
  TEACHING_PLAN: 'teaching_plan',
  TEACHING_PLAN_DAY: 'teaching_plan_day',
  TEACHING_RECOVERY_PLAN: 'teaching_recovery_plan',
  DIFFERENTIATED_PLAN: 'differentiated_plan',
  CURRICULUM_SEQUENCE: 'curriculum_sequence',
  ACTION_PROPOSAL: 'action_proposal',
  COMPLEX_STRUCTURED_JSON: 'complex_structured_json'
};

// Set of tasks designated for OpenAI GPT-5 Nano
const OPENAI_GPT5_NANO_TASKS = new Set([
  AI_TASK_TYPES.EXAM_GENERATION,
  AI_TASK_TYPES.DIAGNOSTIC_GENERATION,
  AI_TASK_TYPES.MID_TERM_EXAM_GENERATION,
  AI_TASK_TYPES.FINAL_EXAM_GENERATION,
  AI_TASK_TYPES.QUIZ_GENERATION,
  AI_TASK_TYPES.COMPLEX_ACTIVITY_GENERATION,
  AI_TASK_TYPES.SENTENCE_REORDERING,
  AI_TASK_TYPES.READING_COMPREHENSION,
  AI_TASK_TYPES.MULTI_STEP_GRAMMAR,
  AI_TASK_TYPES.WORKSHEET_GENERATION,
  AI_TASK_TYPES.STRUCTURED_EDUCATIONAL_ACTIVITY,
  AI_TASK_TYPES.CLASS_ANALYSIS,
  AI_TASK_TYPES.STUDENT_ANALYSIS,
  AI_TASK_TYPES.DIAGNOSTIC_ANALYSIS,
  AI_TASK_TYPES.EXAM_ANALYSIS,
  AI_TASK_TYPES.PERSONALIZED_PLAN,
  AI_TASK_TYPES.TEACHING_PLAN,
  AI_TASK_TYPES.TEACHING_PLAN_DAY,
  AI_TASK_TYPES.TEACHING_RECOVERY_PLAN,
  AI_TASK_TYPES.DIFFERENTIATED_PLAN,
  AI_TASK_TYPES.CURRICULUM_SEQUENCE,
  AI_TASK_TYPES.ACTION_PROPOSAL,
  AI_TASK_TYPES.COMPLEX_STRUCTURED_JSON
]);

/**
 * Central routing function: returns 'gemini' or 'openai' based on task type.
 * Never routes randomly; never routes based only on single keywords.
 *
 * @param {string} taskType - One of AI_TASK_TYPES
 * @returns {'gemini' | 'openai'}
 */
export function getAIProvider(taskType) {
  if (!taskType) {
    return 'gemini'; // Default to inexpensive provider
  }

  const normType = String(taskType).trim().toLowerCase();

  for (const nanoTask of OPENAI_GPT5_NANO_TASKS) {
    if (normType === nanoTask.toLowerCase()) {
      return 'openai';
    }
  }

  return 'gemini';
}

/**
 * Returns the preferred model for the given provider and task type.
 *
 * @param {'gemini' | 'openai'} provider
 * @param {string} [taskType]
 * @returns {string}
 */
export function getPreferredModel(provider, taskType = '') {
  if (provider === 'openai') {
    return process.env.OPENAI_MODEL || 'gpt-5-nano';
  }

  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

/**
 * Inspects request intent and classifies into a canonical AI_TASK_TYPE.
 * Used when a taskType is not explicitly supplied by legacy callers.
 *
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} [params.systemPrompt]
 * @param {object} [params.schema]
 * @returns {string} One of AI_TASK_TYPES
 */
export function classifyTask({ prompt = '', systemPrompt = '', schema = null }) {
  const combined = `${systemPrompt} ${prompt}`.toLowerCase();

  // Complex assessments & structured generation
  if (schema || combined.includes('diagnostic assessment') || combined.includes('diagnostic exam')) {
    return AI_TASK_TYPES.DIAGNOSTIC_GENERATION;
  }
  if (combined.includes('final exam') || combined.includes('mid-term exam')) {
    return AI_TASK_TYPES.EXAM_GENERATION;
  }
  if (combined.includes('sentence reordering') || combined.includes('reorder the sentence')) {
    return AI_TASK_TYPES.SENTENCE_REORDERING;
  }
  if (combined.includes('reading comprehension') || combined.includes('passage comprehension')) {
    return AI_TASK_TYPES.READING_COMPREHENSION;
  }
  if (combined.includes('teaching plan') || combined.includes('lesson plan') || combined.includes('daily_plan')) {
    return AI_TASK_TYPES.TEACHING_PLAN;
  }
  if (combined.includes('classroom performance metrics') || combined.includes('teaching intelligence')) {
    return AI_TASK_TYPES.CLASS_ANALYSIS;
  }
  if (combined.includes('student weakness') || combined.includes('student diagnostic')) {
    return AI_TASK_TYPES.STUDENT_ANALYSIS;
  }
  if (combined.includes('action proposal') || combined.includes('create action')) {
    return AI_TASK_TYPES.ACTION_PROPOSAL;
  }

  // Simple / high-volume tasks
  if (combined.includes('announcement') || combined.includes('classroom update')) {
    return AI_TASK_TYPES.SIMPLE_ANNOUNCEMENT;
  }
  if (combined.includes('vocabulary') || combined.includes('word definition')) {
    return AI_TASK_TYPES.VOCABULARY;
  }
  if (combined.includes('explain grammar') || combined.includes('grammar rule')) {
    return AI_TASK_TYPES.GRAMMAR_EXPLANATION;
  }
  if (combined.includes('teacher chat') || combined.includes('assistant chat')) {
    return AI_TASK_TYPES.SIMPLE_CHAT;
  }

  return AI_TASK_TYPES.SIMPLE_CHAT;
}
