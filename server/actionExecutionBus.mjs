// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ACTION EXECUTION BUS (PHASE 2B)
// Safe, idempotent, observable automation bus converting AI teaching plans
// into trusted classroom actions (exams, resources, announcements, live quizzes).
// ============================================================================

import { aiRouter, AI_TASK_TYPES } from './ai/aiRouter.mjs';

// In-memory fallback cache when running in isolated tests or without Supabase connection
const memoryActionStore = new Map();

/**
 * Normalizes strings for robust idempotency keys
 */
export function buildIdempotencyKey(planId, actionType, target = '', executionVersion = 1) {
  const normPlan = planId ? String(planId).trim() : 'adhoc';
  const normType = String(actionType).trim().toLowerCase();
  const normTarget = String(target || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 40);
  return `${normPlan}__${normType}__${normTarget}__v${executionVersion}`;
}

/**
 * Generates a clean 6-digit PIN for multiplayer live quiz sessions
 */
function generateQuizPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * AI Call wrapper delegating to Central AI Router (Gemini + GPT-5 Nano)
 */
async function callLLMStructured({
  prompt,
  systemPrompt = '',
  taskType = AI_TASK_TYPES.COMPLEX_STRUCTURED_JSON,
  fallbackFactory = null,
  validateQuestions = false,
  questionValidationOptions = {}
}) {
  try {
    const res = await aiRouter.executeTask({
      taskType,
      prompt,
      systemPrompt,
      fallbackFactory,
      validateQuestions,
      questionValidationOptions
    });
    return res.data;
  } catch (err) {
    if (fallbackFactory) {
      console.warn('[ActionExecutionBus] Model execution failed, using fallback factory:', err.message);
      return fallbackFactory();
    }
    throw err;
  }
}

/**
 * Creates or finds an AI action in public.ai_actions with strict idempotency
 */
export async function createAction(serverSupabase, {
  planId = null,
  classroomId,
  teacherId,
  actionType,
  title,
  description = '',
  reason = '',
  priority = 'medium',
  payload = {},
  requiresApproval = true,
  scheduledFor = null,
  idempotencyKey = null
}) {
  if (!classroomId || !teacherId || !actionType || !title) {
    throw new Error('Missing required action fields (classroomId, teacherId, actionType, title).');
  }

  const finalKey = idempotencyKey || buildIdempotencyKey(planId, actionType, title, 1);

  if (serverSupabase) {
    try {
      // 1. Check existing row with same idempotency key
      const { data: existing, error: findError } = await serverSupabase
        .from('ai_actions')
        .select('*')
        .eq('idempotency_key', finalKey)
        .maybeSingle();

      if (existing && !findError) {
        return { action: existing, isDuplicate: true };
      }

      // 2. Insert new action
      const newActionRow = {
        teaching_plan_id: planId || null,
        classroom_id: classroomId,
        teacher_id: teacherId,
        action_type: actionType,
        title: title.trim(),
        description: description.trim(),
        reason: reason.trim(),
        priority,
        payload,
        status: 'pending',
        requires_approval: Boolean(requiresApproval),
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        idempotency_key: finalKey,
        attempt_count: 0,
        max_attempts: 3
      };

      const { data: inserted, error: insertError } = await serverSupabase
        .from('ai_actions')
        .insert(newActionRow)
        .select()
        .single();

      if (insertError) {
        // Handle race condition on unique index
        if (insertError.code === '23505') {
          const { data: raceRow } = await serverSupabase
            .from('ai_actions')
            .select('*')
            .eq('idempotency_key', finalKey)
            .single();
          return { action: raceRow, isDuplicate: true };
        }
        throw insertError;
      }

      return { action: inserted, isDuplicate: false };
    } catch (err) {
      console.warn('[ActionExecutionBus] Supabase action creation failed, using memory store fallback:', err.message);
    }
  }

  // Memory fallback for tests or when table is not available
  for (const stored of memoryActionStore.values()) {
    if (stored.idempotency_key === finalKey) {
      return { action: stored, isDuplicate: true };
    }
  }

  const mockAction = {
    id: `act_${Math.random().toString(36).slice(2, 11)}`,
    teaching_plan_id: planId || null,
    classroom_id: classroomId,
    teacher_id: teacherId,
    action_type: actionType,
    title: title.trim(),
    description: description.trim(),
    reason: reason.trim(),
    priority,
    payload,
    status: 'pending',
    requires_approval: Boolean(requiresApproval),
    scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
    idempotency_key: finalKey,
    attempt_count: 0,
    max_attempts: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  memoryActionStore.set(mockAction.id, mockAction);
  return { action: mockAction, isDuplicate: false };
}

/**
 * Converts teaching plan recommendations into actionable records
 */
export async function createActionsFromPlan(serverSupabase, { plan, classroomId, teacherId }) {
  if (!plan) throw new Error('Teaching plan is required to create actions.');

  const planId = plan.id;
  const topic = plan.topic || plan.title || 'Classroom Topic';
  const planJson = plan.plan_json || {};
  const interventions = planJson.recommended_interventions || [];

  const createdActions = [];

  // 1. Create actions from recommended interventions
  for (const [idx, item] of interventions.entries()) {
    const rawType = (item.type || '').toLowerCase();
    let actionType = 'create_learning_resource';
    let requiresApproval = true;

    if (rawType.includes('exam') || rawType.includes('diagnostic')) {
      actionType = 'create_diagnostic_exam';
      requiresApproval = true;
    } else if (rawType.includes('live_quiz') || rawType.includes('quiz')) {
      actionType = 'create_live_quiz';
      requiresApproval = true;
    } else if (rawType.includes('schedule')) {
      actionType = 'schedule_live_quiz';
      requiresApproval = true;
    } else if (rawType.includes('announcement') || rawType.includes('message')) {
      actionType = 'post_announcement';
      requiresApproval = true;
    } else {
      actionType = 'create_learning_resource';
      // Draft learning resource notes can be auto-prepared safely
      requiresApproval = false;
    }

    const title = item.title || `${topic}: ${item.type || 'Intervention'}`;
    const key = buildIdempotencyKey(planId, actionType, `${title}_${idx}`, 1);

    const payload = {
      topic,
      target_students: item.target_students || 'all',
      details: item.details || item.description || '',
      plan_duration_days: plan.duration_days,
      learning_goal: plan.learning_goal || '',
      created_from_intervention_index: idx
    };

    const res = await createAction(serverSupabase, {
      planId,
      classroomId: classroomId || plan.classroom_id,
      teacherId: teacherId || plan.teacher_id,
      actionType,
      title,
      description: item.details || item.description || `Intervention for ${topic}`,
      reason: item.pedagogical_reason || planJson.classroom_data_summary?.strengths_summary || 'Targeted intervention based on classroom performance metrics.',
      priority: item.priority || 'medium',
      payload,
      requiresApproval,
      idempotencyKey: key
    });

    createdActions.push(res.action);
  }

  // 2. If no interventions were defined, generate standard diagnostic & resource actions
  if (createdActions.length === 0) {
    const diagAction = await createAction(serverSupabase, {
      planId,
      classroomId: classroomId || plan.classroom_id,
      teacherId: teacherId || plan.teacher_id,
      actionType: 'create_diagnostic_exam',
      title: `${topic} — Baseline Diagnostic Exam`,
      description: `Baseline diagnostic assessment to evaluate student readiness on ${topic}.`,
      reason: `Evaluates foundational mastery before starting the ${plan.duration_days || 5}-day teaching unit.`,
      priority: 'high',
      payload: { topic, question_count: 5, target_students: 'all' },
      requiresApproval: true,
      idempotencyKey: buildIdempotencyKey(planId, 'create_diagnostic_exam', 'baseline_diagnostic', 1)
    });
    createdActions.push(diagAction.action);

    const resourceAction = await createAction(serverSupabase, {
      planId,
      classroomId: classroomId || plan.classroom_id,
      teacherId: teacherId || plan.teacher_id,
      actionType: 'create_learning_resource',
      title: `${topic} — Comprehensive Study Notes`,
      description: `Core concepts, definitions, and worked examples for ${topic}.`,
      reason: `Provides self-paced reference materials for students during the unit.`,
      priority: 'medium',
      payload: { topic, resource_type: 'notes' },
      requiresApproval: false,
      idempotencyKey: buildIdempotencyKey(planId, 'create_learning_resource', 'study_notes', 1)
    });
    createdActions.push(resourceAction.action);
  }

  return createdActions;
}

/**
 * Action Handler 1: create_diagnostic_exam
 * Creates an entry in public.classroom_exams with generated questions
 */
export async function executeDiagnosticExam({ serverSupabase, action, serverOpenAI }) {
  const topic = action.payload?.topic || action.title || 'Diagnostic Assessment';
  const questionCount = Math.min(Math.max(Number(action.payload?.question_count) || 5, 3), 10);

  const fallbackQuestions = () => [
    {
      id: `q_diag_1`,
      title: `What is the core definition and foundational principle of ${topic}?`,
      type: 'multiple_choice',
      marks: 2,
      duration_minutes: 2,
      options: [
        'A foundational model explaining fundamental concepts and behavior',
        'An unrelated secondary concept',
        'A deprecated legacy assumption',
        'A purely decorative terminology'
      ],
      correct_answer: 0,
      explanation: `Core foundational principle directly applicable to ${topic}.`
    },
    {
      id: `q_diag_2`,
      title: `Which of the following scenarios best demonstrates a practical application of ${topic}?`,
      type: 'multiple_choice',
      marks: 2,
      duration_minutes: 2,
      options: [
        'Real-world implementation solving target domain problems',
        'Ignoring prerequisites completely',
        'Disabling all analytical tracking',
        'Relying solely on arbitrary guesses'
      ],
      correct_answer: 0,
      explanation: `Direct scenario application testing comprehension of ${topic}.`
    },
    {
      id: `q_diag_3`,
      title: `What is a common error or misconception students encounter when working with ${topic}?`,
      type: 'multiple_choice',
      marks: 2,
      duration_minutes: 2,
      options: [
        'Confusing core principles with superficial assumptions',
        'Reviewing instructions carefully',
        'Checking boundary edge cases',
        'Verifying baseline requirements'
      ],
      correct_answer: 0,
      explanation: `Identifies student misconception patterns on ${topic}.`
    },
    {
      id: `q_diag_4`,
      title: `When evaluating solutions in ${topic}, which metric is most critical?`,
      type: 'multiple_choice',
      marks: 2,
      duration_minutes: 2,
      options: [
        'Accuracy, consistency, and alignment with defined criteria',
        'Arbitrary random output',
        'Unverified speed without correctness',
        'Total omission of proof'
      ],
      correct_answer: 0,
      explanation: `Essential criteria for evaluating work in ${topic}.`
    },
    {
      id: `q_diag_5`,
      title: `Explain how key concepts in ${topic} connect to advanced subsequent units.`,
      type: 'short_answer',
      marks: 2,
      duration_minutes: 3,
      options: [],
      correct_answer: 'Synthesizes foundational rules to prepare for advanced multi-step application.',
      explanation: `Tests higher-order synthesis and transfer readiness.`
    }
  ].slice(0, questionCount);

  let generatedQuestions = fallbackQuestions();

  try {
    const prompt = `Generate a rigorous, classroom-ready diagnostic assessment for:
Topic: "${topic}"
Target Grade/Level: "${action.payload?.class_level || 'General Classroom'}"
Question Count: ${questionCount}

Return a valid JSON object matching this schema:
{
  "title": "${action.title}",
  "instructions": "Answer all diagnostic questions. This assessment helps identify strengths and topics requiring extra practice.",
  "questions": [
    {
      "id": "q1",
      "title": "Clear question text",
      "type": "multiple_choice",
      "marks": 2,
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Why Option A is correct"
    }
  ]
}`;

    const systemPrompt = "You are an expert pedagogical assessment designer. Output ONLY valid JSON.";
    const result = await callLLMStructured({
      prompt,
      systemPrompt,
      taskType: AI_TASK_TYPES.DIAGNOSTIC_GENERATION,
      validateQuestions: true,
      questionValidationOptions: { expectedCount: questionCount, enforceFourChoices: false },
      fallbackFactory: fallbackQuestions
    });

    if (Array.isArray(result?.questions) && result.questions.length > 0) {
      generatedQuestions = result.questions.map((q, idx) => ({
        id: `q_${idx + 1}`,
        title: q.title || `Question ${idx + 1}`,
        type: q.type || 'multiple_choice',
        marks: Number(q.marks) || 2,
        duration_minutes: 2,
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Correct Option', 'Incorrect 1', 'Incorrect 2', 'Incorrect 3'],
        correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : 0,
        explanation: q.explanation || 'Pedagogical explanation.'
      }));
    }
  } catch (genErr) {
    console.warn('[executeDiagnosticExam] Using deterministic fallback questions:', genErr.message);
  }

  const totalMarks = generatedQuestions.reduce((acc, q) => acc + (q.marks || 2), 0);
  const durationMinutes = Math.max(generatedQuestions.length * 3, 15);

  const examRow = {
    classroom_id: action.classroom_id,
    teacher_id: action.teacher_id,
    created_by: action.teacher_id,
    title: action.title,
    description: action.description || `Diagnostic evaluation on ${topic}`,
    instructions: 'Please answer all questions carefully. This diagnostic assessment helps personalize classroom teaching.',
    assessment_type: 'exam',
    duration_minutes: durationMinutes,
    total_marks: totalMarks,
    pass_marks: Math.round(totalMarks * 0.6),
    questions: generatedQuestions,
    questions_json: [
      {
        id: 'sec_diagnostic',
        title: 'Diagnostic Knowledge Check',
        description: 'Foundational concept validation',
        questions: generatedQuestions
      }
    ],
    theme_config: {},
    brand_kit: {},
    branching_logic: {},
    survey_settings: {},
    status: 'draft' // Safe draft state for teacher inspection
  };

  if (serverSupabase) {
    const { data: savedExam, error: examError } = await serverSupabase
      .from('classroom_exams')
      .insert(examRow)
      .select('id, title, status, total_marks, created_at')
      .single();

    if (examError) throw examError;
    return {
      exam_id: savedExam.id,
      title: savedExam.title,
      question_count: generatedQuestions.length,
      total_marks: savedExam.total_marks,
      status: savedExam.status,
      created_at: savedExam.created_at
    };
  }

  return {
    exam_id: `exam_${Math.random().toString(36).slice(2, 10)}`,
    title: action.title,
    question_count: generatedQuestions.length,
    total_marks: totalMarks,
    status: 'draft',
    created_at: new Date().toISOString()
  };
}

/**
 * Action Handler 2: create_learning_resource
 * Synthesizes comprehensive study notes and saves to content_buckets & bucket_items
 */
export async function executeLearningResource({ serverSupabase, action, serverOpenAI }) {
  const topic = action.payload?.topic || action.title || 'Learning Resource';
  const notesTitle = action.title || `${topic} — Study Guide`;

  const fallbackNotes = () => ({
    title: notesTitle,
    summary: `Structured reference guide and key concepts for ${topic}.`,
    content: `# ${notesTitle}\n\n## 1. Key Objectives\n- Master foundational principles of ${topic}.\n- Understand core mechanisms and real-world applications.\n- Avoid frequent analytical mistakes.\n\n## 2. Core Concepts & Definitions\n- **Primary Definition**: The systematic methodology governing ${topic}.\n- **Key Mechanism**: Step-by-step workflow for problem resolution.\n\n## 3. Worked Example\n\`\`\`\nStep 1: Identify given parameters.\nStep 2: Apply foundational formula/rule.\nStep 3: Verify boundary conditions.\nResult: Valid solution achieved.\n\`\`\`\n\n## 4. Practice Checklist\n- [ ] Review definition and terminology\n- [ ] Complete worked exercises\n- [ ] Compare results with answer criteria\n`
  });

  let notesData = fallbackNotes();

  try {
    const prompt = `Create a rich, structured learning resource/study guide in Markdown format:
Topic: "${topic}"
Target Goal: "${action.payload?.learning_goal || 'Comprehensive concept mastery'}"
Context: "${action.description || ''}"

Return a valid JSON object:
{
  "title": "${notesTitle}",
  "summary": "2 sentence executive summary of this resource",
  "content": "# Full markdown formatted text..."
}`;

    const systemPrompt = "You are a master curriculum specialist. Output ONLY valid JSON.";
    const result = await callLLMStructured({
      prompt,
      systemPrompt,
      taskType: AI_TASK_TYPES.COMPLEX_ACTIVITY_GENERATION,
      fallbackFactory: fallbackNotes
    });

    if (result?.content) {
      notesData = {
        title: result.title || notesTitle,
        summary: result.summary || `Study material for ${topic}`,
        content: result.content
      };
    }
  } catch (genErr) {
    console.warn('[executeLearningResource] Using deterministic fallback notes:', genErr.message);
  }

  if (serverSupabase) {
    // 1. Resolve or create content bucket for classroom
    let targetBucketId = null;
    const { data: buckets } = await serverSupabase
      .from('content_buckets')
      .select('id')
      .eq('classroom_id', action.classroom_id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (buckets && buckets.length > 0) {
      targetBucketId = buckets[0].id;
    } else {
      const { data: newBucket, error: bucketError } = await serverSupabase
        .from('content_buckets')
        .insert({
          classroom_id: action.classroom_id,
          title: 'Classroom Resources',
          description: 'AI-generated study materials, guides, and reference documents.',
          created_by: action.teacher_id
        })
        .select('id')
        .single();

      if (bucketError) throw bucketError;
      targetBucketId = newBucket.id;
    }

    // 2. Insert bucket item
    const { data: item, error: itemError } = await serverSupabase
      .from('bucket_items')
      .insert({
        bucket_id: targetBucketId,
        classroom_id: action.classroom_id,
        title: notesData.title,
        item_type: 'document',
        content_url: null,
        notes: notesData.content,
        sort_order: 0
      })
      .select('id, bucket_id, title, item_type, created_at')
      .single();

    if (itemError) {
      // Fallback without 'notes' column if schema differs
      const { data: itemAlt, error: altErr } = await serverSupabase
        .from('bucket_items')
        .insert({
          bucket_id: targetBucketId,
          classroom_id: action.classroom_id,
          title: notesData.title,
          item_type: 'document',
          sort_order: 0
        })
        .select('id, bucket_id, title, item_type, created_at')
        .single();
      
      if (altErr) throw altErr;
      return {
        bucket_id: targetBucketId,
        item_id: itemAlt.id,
        title: itemAlt.title,
        summary: notesData.summary
      };
    }

    return {
      bucket_id: targetBucketId,
      item_id: item.id,
      title: item.title,
      summary: notesData.summary
    };
  }

  return {
    bucket_id: `bkt_${Math.random().toString(36).slice(2, 10)}`,
    item_id: `itm_${Math.random().toString(36).slice(2, 10)}`,
    title: notesData.title,
    summary: notesData.summary
  };
}

/**
 * Action Handler 3: post_announcement
 * Inserts a verified announcement message into classroom_messages
 */
export async function executeAnnouncement({ serverSupabase, action }) {
  const topic = action.payload?.topic || action.title;
  let messageBody = action.payload?.message || action.description;

  if (!messageBody || messageBody.length < 15) {
    messageBody = `📢 **Classroom Update: ${topic}**\n\nHello class! We are beginning a focused unit on **${topic}**. Please check your classroom resources for study materials and prepare for upcoming interactive activities. Let's make great progress together!`;
  }

  if (serverSupabase) {
    const { data: message, error } = await serverSupabase
      .from('classroom_messages')
      .insert({
        classroom_id: action.classroom_id,
        teacher_id: action.teacher_id,
        message: messageBody.trim(),
        is_pinned: Boolean(action.payload?.is_pinned ?? true)
      })
      .select('id, classroom_id, message, is_pinned, created_at')
      .single();

    if (error) throw error;
    return {
      message_id: message.id,
      classroom_id: message.classroom_id,
      message_snippet: message.message.slice(0, 80) + '...',
      is_pinned: message.is_pinned,
      created_at: message.created_at
    };
  }

  return {
    message_id: `msg_${Math.random().toString(36).slice(2, 10)}`,
    classroom_id: action.classroom_id,
    message_snippet: messageBody.slice(0, 80) + '...',
    is_pinned: true,
    created_at: new Date().toISOString()
  };
}

/**
 * Action Handler 4: create_live_quiz
 * Generates and saves a fast-paced multiplayer quiz adhering strictly to Live Quiz constraints
 */
export async function executeLiveQuiz({ serverSupabase, action, serverOpenAI }) {
  const topic = action.payload?.topic || action.title || 'Interactive Quiz';
  const baseTitle = `${topic} — Live Speed Quiz`;

  const fallbackQuestions = () => [
    {
      question_index: 0,
      question_text: `What is the primary definition of ${topic}?`,
      options: ['Core principle', 'Secondary factor', 'Outdated method', 'Random noise'],
      correct_index: 0,
      duration_sec: 20,
      explanation: `Accurately captures the fundamental definition of ${topic}.`
    },
    {
      question_index: 1,
      question_text: `Which element is essential for ${topic}?`,
      options: ['Valid data', 'Unchecked bias', 'Manual delay', 'Total guess'],
      correct_index: 0,
      duration_sec: 20,
      explanation: `Valid data is essential for accurate execution.`
    },
    {
      question_index: 2,
      question_text: `What is the expected outcome when applying ${topic}?`,
      options: ['Consistent growth', 'Random error', 'System failure', 'Uncertain delay'],
      correct_index: 0,
      duration_sec: 20,
      explanation: `Applying the concept results in consistent growth.`
    },
    {
      question_index: 3,
      question_text: `How does ${topic} benefit classroom learning?`,
      options: ['Boosts mastery', 'Wastes time', 'Lowers focus', 'Hides mistakes'],
      correct_index: 0,
      duration_sec: 20,
      explanation: `Targeted interactive practice directly accelerates student mastery.`
    },
    {
      question_index: 4,
      question_text: `What should students review if they struggle with ${topic}?`,
      options: ['Core foundations', 'Skipped lessons', 'Unrelated topics', 'Ignore errors'],
      correct_index: 0,
      duration_sec: 20,
      explanation: `Reviewing core foundations rebuilds understanding quickly.`
    }
  ];

  let questions = fallbackQuestions();

  try {
    const prompt = `Create a fast-paced interactive live quiz for students:
Topic: "${topic}"
Question Count: 5

STRICT RULES:
1. Every question must have EXACTLY 4 options.
2. Each option MUST be concise: 1 to 3 words only.
3. Exactly ONE option is correct ("correct_index": 0, 1, 2, or 3).
4. duration_sec must be 20.

Return valid JSON:
{
  "title": "${baseTitle}",
  "questions": [
    {
      "question_index": 0,
      "question_text": "Short prompt?",
      "options": ["Word One", "Word Two", "Word Three", "Word Four"],
      "correct_index": 0,
      "duration_sec": 20,
      "explanation": "Brief rationale"
    }
  ]
}`;

    const systemPrompt = "You are an elite live classroom quiz game designer. Adhere strictly to 4 options, 1-3 words per option. Output ONLY JSON.";
    const result = await callLLMStructured({
      prompt,
      systemPrompt,
      taskType: AI_TASK_TYPES.QUIZ_GENERATION,
      validateQuestions: true,
      questionValidationOptions: { expectedCount: 5, enforceFourChoices: true, enforceConciseOptions: true },
      fallbackFactory: fallbackQuestions
    });

    if (Array.isArray(result?.questions) && result.questions.length >= 3) {
      questions = result.questions.slice(0, 7).map((q, idx) => {
        // Enforce exactly 4 options with short length
        let opts = Array.isArray(q.options) ? q.options.map(o => String(o).trim().split(/\s+/).slice(0, 3).join(' ')) : [];
        while (opts.length < 4) opts.push(`Option ${opts.length + 1}`);
        opts = opts.slice(0, 4);

        return {
          question_index: idx,
          question_text: q.question_text || `Question ${idx + 1}`,
          options: opts,
          correct_index: typeof q.correct_index === 'number' && q.correct_index >= 0 && q.correct_index < 4 ? q.correct_index : 0,
          duration_sec: 20,
          explanation: q.explanation || 'Accurate answer.'
        };
      });
    }
  } catch (genErr) {
    console.warn('[executeLiveQuiz] Using deterministic fallback quiz:', genErr.message);
  }

  if (serverSupabase) {
    // Generate unique title to avoid unique index violation (idx_live_quizzes_owner_norm_title)
    const timestampSuffix = new Date().toISOString().slice(5, 16).replace('T', ' ');
    const uniqueTitle = `${baseTitle} (${timestampSuffix})`;

    const { data: quiz, error: quizError } = await serverSupabase
      .from('live_quizzes')
      .insert({
        classroom_id: action.classroom_id,
        title: uniqueTitle,
        description: action.description || `Speed revision quiz on ${topic}`,
        category: 'Classroom Revision',
        difficulty: 'Medium',
        created_by: action.teacher_id,
        is_public: false,
        visibility: 'classroom',
        timer_enabled: true,
        timer_seconds: 20
      })
      .select('id, title, category, created_at')
      .single();

    if (quizError) throw quizError;

    // Insert questions
    const questionRows = questions.map(q => ({
      quiz_id: quiz.id,
      question_index: q.question_index,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      duration_sec: 20,
      explanation: q.explanation
    }));

    const { error: qError } = await serverSupabase
      .from('live_quiz_questions')
      .insert(questionRows);

    if (qError) throw qError;

    return {
      quiz_id: quiz.id,
      title: quiz.title,
      question_count: questions.length,
      created_at: quiz.created_at
    };
  }

  return {
    quiz_id: `quiz_${Math.random().toString(36).slice(2, 10)}`,
    title: baseTitle,
    question_count: questions.length,
    created_at: new Date().toISOString()
  };
}

/**
 * Action Handler 5: schedule_live_quiz
 * Prepares quiz and sets up a session in live_quiz_sessions for scheduled kickoff
 */
export async function executeScheduleLiveQuiz({ serverSupabase, action, serverOpenAI }) {
  let quizId = action.payload?.quiz_id;

  // If no quizId was provided, generate the quiz first
  if (!quizId) {
    const quizResult = await executeLiveQuiz({ serverSupabase, action, serverOpenAI });
    quizId = quizResult.quiz_id;
  }

  const pin = generateQuizPin();
  const scheduledTime = action.scheduled_for || new Date().toISOString();

  if (serverSupabase) {
    const { data: session, error: sessError } = await serverSupabase
      .from('live_quiz_sessions')
      .insert({
        classroom_id: action.classroom_id,
        teacher_id: action.teacher_id,
        quiz_id: quizId,
        pin,
        status: 'lobby',
        current_question_index: 0,
        question_duration_sec: 20,
        started_at: scheduledTime
      })
      .select('id, pin, status, started_at, quiz_id')
      .single();

    if (sessError) throw sessError;

    return {
      session_id: session.id,
      quiz_id: session.quiz_id,
      pin: session.pin,
      status: session.status,
      scheduled_for: session.started_at
    };
  }

  return {
    session_id: `sess_${Math.random().toString(36).slice(2, 10)}`,
    quiz_id: quizId,
    pin,
    status: 'lobby',
    scheduled_for: scheduledTime
  };
}

/**
 * Central State Machine Executor for AI Action
 */
export async function executeAction(serverSupabase, actionId, { forceImmediate = false, serverOpenAI = null } = {}) {
  let action = null;

  // 1. Fetch action
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('ai_actions')
        .select('*')
        .eq('id', actionId)
        .single();
      if (error) throw error;
      action = data;
    } catch (fetchErr) {
      console.warn('[executeAction] Failed fetching from Supabase, checking memory store:', fetchErr.message);
    }
  }

  if (!action) {
    action = memoryActionStore.get(actionId);
  }

  if (!action) {
    throw new Error(`Action not found: ${actionId}`);
  }

  // 2. State & Idempotency Guards
  if (action.status === 'completed') {
    return {
      success: true,
      alreadyCompleted: true,
      action,
      result: action.result_payload
    };
  }

  if (action.status === 'running') {
    throw new Error(`Action ${actionId} is already running.`);
  }

  if (action.status === 'cancelled') {
    throw new Error(`Cannot execute cancelled action ${actionId}.`);
  }

  if (action.status === 'pending' && action.requires_approval && !forceImmediate) {
    throw new Error(`Action requires teacher approval before execution.`);
  }

  // 3. Mark state as running
  const nextAttempt = (action.attempt_count || 0) + 1;
  const runningUpdates = {
    status: 'running',
    attempt_count: nextAttempt,
    updated_at: new Date().toISOString()
  };

  if (serverSupabase) {
    try {
      await serverSupabase
        .from('ai_actions')
        .update(runningUpdates)
        .eq('id', actionId);
    } catch (err) {
      console.warn('[executeAction] Status update running warning:', err.message);
    }
  }
  action = { ...action, ...runningUpdates };
  memoryActionStore.set(actionId, action);

  // 4. Dispatch to action handler
  try {
    let result = null;

    switch (action.action_type) {
      case 'create_diagnostic_exam':
        result = await executeDiagnosticExam({ serverSupabase, action, serverOpenAI });
        break;
      case 'create_learning_resource':
        result = await executeLearningResource({ serverSupabase, action, serverOpenAI });
        break;
      case 'post_announcement':
        result = await executeAnnouncement({ serverSupabase, action });
        break;
      case 'create_live_quiz':
        result = await executeLiveQuiz({ serverSupabase, action, serverOpenAI });
        break;
      case 'schedule_live_quiz':
        result = await executeScheduleLiveQuiz({ serverSupabase, action, serverOpenAI });
        break;
      default:
        throw new Error(`Unsupported action type: ${action.action_type}`);
    }

    // 5. Mark completed
    const completedUpdates = {
      status: 'completed',
      result_payload: result,
      last_error: null,
      executed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('ai_actions')
          .update(completedUpdates)
          .eq('id', actionId);
      } catch (err) {
        console.warn('[executeAction] Status update completed warning:', err.message);
      }
    }

    action = { ...action, ...completedUpdates };
    memoryActionStore.set(actionId, action);

    return {
      success: true,
      action,
      result
    };
  } catch (executionError) {
    console.error(`[executeAction] Execution failed for ${actionId}:`, executionError);

    const isMaxAttempts = nextAttempt >= (action.max_attempts || 3);
    const failedUpdates = {
      status: isMaxAttempts ? 'failed' : 'approved', // Allow retry if under max attempts
      last_error: executionError.message || 'Execution error',
      updated_at: new Date().toISOString()
    };

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('ai_actions')
          .update(failedUpdates)
          .eq('id', actionId);
      } catch (err) {
        console.warn('[executeAction] Status update failed warning:', err.message);
      }
    }

    action = { ...action, ...failedUpdates };
    memoryActionStore.set(actionId, action);

    throw executionError;
  }
}

/**
 * Fetches classroom actions with optional filters
 */
export async function getClassroomActions(serverSupabase, classroomId, { planId = null, status = null } = {}) {
  if (serverSupabase) {
    try {
      let query = serverSupabase
        .from('ai_actions')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });

      if (planId) {
        query = query.eq('teaching_plan_id', planId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (err) {
      console.warn('[getClassroomActions] Supabase query error, checking memory store:', err.message);
    }
  }

  // Fallback to memory store
  const results = [];
  for (const act of memoryActionStore.values()) {
    if (act.classroom_id === classroomId) {
      if (planId && act.teaching_plan_id !== planId) continue;
      if (status && act.status !== status) continue;
      results.push(act);
    }
  }
  return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Updates action details (editing title, description, schedule, or approval)
 */
export async function updateActionDetails(serverSupabase, actionId, updates = {}) {
  const allowed = ['title', 'description', 'payload', 'scheduled_for', 'requires_approval', 'priority', 'status'];
  const safeUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      safeUpdates[key] = updates[key];
    }
  }
  safeUpdates.updated_at = new Date().toISOString();

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('ai_actions')
        .update(safeUpdates)
        .eq('id', actionId)
        .select()
        .single();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[updateActionDetails] Supabase error:', err.message);
    }
  }

  const existing = memoryActionStore.get(actionId);
  if (existing) {
    const updated = { ...existing, ...safeUpdates };
    memoryActionStore.set(actionId, updated);
    return updated;
  }

  throw new Error(`Action not found: ${actionId}`);
}

/**
 * Finds all due actions (approved or auto-executable with schedule <= now)
 */
export async function getDueActions(serverSupabase, nowIso = new Date().toISOString()) {
  if (serverSupabase) {
    try {
      const dueActions = [];
      // 1. Approved actions
      const { data: approvedActions } = await serverSupabase
        .from('ai_actions')
        .select('*')
        .eq('status', 'approved')
        .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
        .lt('attempt_count', 3)
        .limit(10);

      if (Array.isArray(approvedActions)) {
        dueActions.push(...approvedActions);
      }

      // 2. Auto-executable pending actions
      const { data: autoActions } = await serverSupabase
        .from('ai_actions')
        .select('*')
        .eq('status', 'pending')
        .eq('requires_approval', false)
        .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
        .lt('attempt_count', 3)
        .limit(10);

      if (Array.isArray(autoActions)) {
        dueActions.push(...autoActions);
      }

      if (dueActions.length > 0) return dueActions;
    } catch (err) {
      console.warn('[getDueActions] Supabase query warning, falling back to memory store:', err.message);
    }
  }

  // Memory fallback
  const due = [];
  const nowDate = new Date(nowIso);

  for (const act of memoryActionStore.values()) {
    if (act.attempt_count >= (act.max_attempts || 3)) continue;
    const isScheduledDue = !act.scheduled_for || new Date(act.scheduled_for) <= nowDate;

    if (act.status === 'approved' && isScheduledDue) {
      due.push(act);
    } else if (act.status === 'pending' && !act.requires_approval && isScheduledDue) {
      due.push(act);
    }
  }

  return due;
}

