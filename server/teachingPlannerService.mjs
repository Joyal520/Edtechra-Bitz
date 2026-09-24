// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: AI TEACHING PLANNER SERVICE (PHASE 2A)
// Multi-Source Classroom Evidence Grounding, Strict Structured JSON Schema,
// Gemini (Primary) / OpenAI (Fallback) / Offline Deterministic Synthesis Engine,
// Single-Day Regeneration, and Plan Storage Lifecycle (Draft -> Approved).
// ============================================================================

import crypto from 'crypto';
import {
  computeClassroomMetrics,
  cleanAndParseJson
} from './teachingIntelligenceService.mjs';
import { aiRouter } from './ai/aiRouter.mjs';
import { AI_TASK_TYPES } from './ai/taskTypes.mjs';

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest'
];

// In-memory fallback store in case Supabase migration has not been applied yet
const memoryPlansCache = new Map();

/**
 * Normalizes and validates the structured AI teaching plan.
 * Guarantees required fields, duration integrity, non-empty daily plans,
 * and valid activity arrays.
 */
export function validateAndNormalizePlan(rawPlan, input = {}, metricsSummary = {}) {
  const fallbackTopic = input.topic || 'Classroom Learning Focus';
  const fallbackDays = Math.max(1, Math.min(30, parseInt(input.duration_days, 10) || 5));
  const fallbackMinutes = Math.max(15, Math.min(180, parseInt(input.lesson_duration_minutes, 10) || 45));

  if (!rawPlan || typeof rawPlan !== 'object') {
    return synthesizeDeterministicPlan(input, metricsSummary);
  }

  const topic = String(rawPlan.topic || fallbackTopic).trim();
  const title = String(rawPlan.title || `${topic} — Comprehensive Teaching Plan`).trim();
  const learning_goal = String(rawPlan.learning_goal || input.learning_goal || `Students will master foundational and applied concepts in ${topic}.`).trim();

  // Learning Objectives
  const learning_objectives = Array.isArray(rawPlan.learning_objectives) && rawPlan.learning_objectives.length > 0
    ? rawPlan.learning_objectives.map(o => String(o).trim()).filter(Boolean)
    : [
        `Identify and explain core concepts of ${topic}`,
        `Apply ${topic} principles in guided and independent exercises`,
        `Demonstrate competency through formative assessments`
      ];

  // Class Profile
  const rawProfile = rawPlan.class_profile || {};
  const hasEvidence = metricsSummary.class_summary?.total_students > 0 &&
    ((metricsSummary.topic_performance && metricsSummary.topic_performance.length > 0) ||
     (metricsSummary.top_weaknesses && metricsSummary.top_weaknesses.length > 0));

  const class_profile = {
    evidence_summary: String(
      rawProfile.evidence_summary ||
      (hasEvidence
        ? `Based on ${metricsSummary.class_summary.total_students} students with an average performance of ${metricsSummary.class_summary.overall_score || 0}%.`
        : 'Initial diagnostic phase: based primarily on curriculum standards and teacher-supplied goals as assessment data is developing.')
    ).trim(),
    strengths: Array.isArray(rawProfile.strengths) && rawProfile.strengths.length > 0
      ? rawProfile.strengths.map(s => String(s).trim()).filter(Boolean)
      : (metricsSummary.top_strengths || ['Foundational vocabulary comprehension', 'Active engagement in lesson activities']),
    weaknesses: Array.isArray(rawProfile.weaknesses) && rawProfile.weaknesses.length > 0
      ? rawProfile.weaknesses.map(w => String(w).trim()).filter(Boolean)
      : (metricsSummary.top_weaknesses || ['Application accuracy in timed exercises', 'Complex multi-step problem solving']),
    considerations: Array.isArray(rawProfile.considerations) && rawProfile.considerations.length > 0
      ? rawProfile.considerations.map(c => String(c).trim()).filter(Boolean)
      : [
          'Allow 5-10 minutes of guided check-ins before independent tasks',
          'Use paired collaboration to support students needing reinforcement'
        ],
    data_sufficiency: hasEvidence ? 'comprehensive' : 'initial_diagnostic'
  };

  // Daily Plan Normalization
  let daily_plan = Array.isArray(rawPlan.daily_plan) ? rawPlan.daily_plan : [];
  const duration_days = fallbackDays;

  // Guarantee day count matches requested duration
  if (daily_plan.length !== duration_days) {
    const adjustedDays = [];
    for (let d = 1; d <= duration_days; d++) {
      const existing = daily_plan.find(p => Number(p.day) === d) || daily_plan[d - 1];
      if (existing) {
        adjustedDays.push({
          day: d,
          title: String(existing.title || `Day ${d}: ${topic} Progression`).trim(),
          objectives: Array.isArray(existing.objectives) && existing.objectives.length > 0
            ? existing.objectives.map(o => String(o).trim()).filter(Boolean)
            : [`Develop key competencies for Day ${d}`],
          lesson_focus: String(existing.lesson_focus || `Instruction and guided practice for Day ${d}`).trim(),
          activities: normalizeActivities(existing.activities, fallbackMinutes),
          assessment: String(existing.assessment || 'Formative exit ticket check').trim(),
          homework: String(existing.homework || 'Review lesson notes and complete 3 practice problems').trim()
        });
      } else {
        adjustedDays.push(buildDefaultDayPlan(d, topic, fallbackMinutes));
      }
    }
    daily_plan = adjustedDays;
  } else {
    daily_plan = daily_plan.map((dayObj, idx) => ({
      day: idx + 1,
      title: String(dayObj.title || `Day ${idx + 1}: ${topic} Focus`).trim(),
      objectives: Array.isArray(dayObj.objectives) && dayObj.objectives.length > 0
        ? dayObj.objectives.map(o => String(o).trim()).filter(Boolean)
        : [`Master Day ${idx + 1} core objectives`],
      lesson_focus: String(dayObj.lesson_focus || `Focus for Day ${idx + 1}`).trim(),
      activities: normalizeActivities(dayObj.activities, fallbackMinutes),
      assessment: String(dayObj.assessment || 'Quick formative check').trim(),
      homework: String(dayObj.homework || 'Short reflection or practice sheet').trim()
    }));
  }

  // Differentiation
  const rawDiff = rawPlan.differentiation || {};
  const attentionCount = (metricsSummary.students_needing_attention || []).length;
  const differentiation = {
    support_students: Array.isArray(rawDiff.support_students) && rawDiff.support_students.length > 0
      ? rawDiff.support_students.map(s => String(s).trim()).filter(Boolean)
      : (attentionCount > 0 ? [`${attentionCount} students identified in classroom intelligence`] : ['Learners requiring additional scaffolding']),
    support_strategy: String(
      rawDiff.support_strategy ||
      'Provide visual reference anchors, simplified sentence frames, and paired peer scaffolding during guided practice.'
    ).trim(),
    advanced_students: Array.isArray(rawDiff.advanced_students) && rawDiff.advanced_students.length > 0
      ? rawDiff.advanced_students.map(s => String(s).trim()).filter(Boolean)
      : ['High-mastery students who complete early'],
    extension_strategy: String(
      rawDiff.extension_strategy ||
      'Assign creative application challenges, open-ended problem exploration, or peer-mentorship roles.'
    ).trim()
  };

  // Recommended Future Actions (Phase 2B compatibility - recommendations ONLY)
  let recommended_actions = Array.isArray(rawPlan.recommended_actions) && rawPlan.recommended_actions.length > 0
    ? rawPlan.recommended_actions.map(act => ({
        type: ['diagnostic_exam', 'revision_quiz', 'practice_task', 'resource_reading', 'writing_challenge'].includes(act.type)
          ? act.type
          : 'practice_task',
        title: String(act.title || 'Reinforcement Task').trim(),
        reason: String(act.reason || 'Evidence-grounded consolidation').trim(),
        priority: ['high', 'medium', 'low'].includes(act.priority) ? act.priority : 'medium'
      }))
    : [
        {
          type: 'revision_quiz',
          title: `Diagnostic Quiz: ${topic}`,
          reason: 'Verify foundational prerequisite understanding before introducing new material.',
          priority: 'high'
        },
        {
          type: 'practice_task',
          title: `Guided Practice: ${topic} Application`,
          reason: 'Reinforce target structures with differentiated prompt scaffolding.',
          priority: 'medium'
        }
      ];

  // Success Criteria
  const success_criteria = Array.isArray(rawPlan.success_criteria) && rawPlan.success_criteria.length > 0
    ? rawPlan.success_criteria.map(c => String(c).trim()).filter(Boolean)
    : [
        '80%+ of students correctly complete formative exit tickets',
        'Students articulate key principles in their own words',
        'Struggling students demonstrate measurable confidence on guided tasks'
      ];

  return {
    title,
    topic,
    learning_goal,
    learning_objectives,
    class_profile,
    duration_days,
    lesson_duration_minutes: fallbackMinutes,
    daily_plan,
    differentiation,
    recommended_actions,
    success_criteria
  };
}

function normalizeActivities(activities, totalLessonMinutes) {
  if (!Array.isArray(activities) || activities.length === 0) {
    const warmUp = Math.round(totalLessonMinutes * 0.2);
    const direct = Math.round(totalLessonMinutes * 0.35);
    const guided = Math.round(totalLessonMinutes * 0.3);
    const wrapUp = Math.max(5, totalLessonMinutes - (warmUp + direct + guided));

    return [
      {
        name: 'Warm-up & Activation',
        duration_minutes: warmUp,
        description: 'Activate prior knowledge with a quick interactive hook and inquiry prompt.',
        grouping: 'whole_class'
      },
      {
        name: 'Concept Exploration & Modeling',
        duration_minutes: direct,
        description: 'Direct teacher modeling with concrete examples, visual anchors, and think-alouds.',
        grouping: 'whole_class'
      },
      {
        name: 'Collaborative Guided Practice',
        duration_minutes: guided,
        description: 'Paired problem-solving exercises with differentiated support cards.',
        grouping: 'pairs'
      },
      {
        name: 'Exit Ticket & Reflection',
        duration_minutes: wrapUp,
        description: 'Individual reflection check to assess immediate concept grasp.',
        grouping: 'individual'
      }
    ];
  }

  return activities.map(act => ({
    name: String(act.name || 'Learning Activity').trim(),
    duration_minutes: Math.max(5, Math.min(120, parseInt(act.duration_minutes, 10) || 15)),
    description: String(act.description || 'Interactive student activity.').trim(),
    grouping: ['whole_class', 'pairs', 'individual', 'small_group'].includes(act.grouping)
      ? act.grouping
      : 'whole_class'
  }));
}

function buildDefaultDayPlan(dayNumber, topic, lessonMinutes) {
  return {
    day: dayNumber,
    title: `Day ${dayNumber}: Deepening ${topic}`,
    objectives: [
      `Consolidate foundational concepts of ${topic}`,
      `Apply analytical skills in structured activities`
    ],
    lesson_focus: `Structured learning and differentiated application for Day ${dayNumber}.`,
    activities: normalizeActivities([], lessonMinutes),
    assessment: `Day ${dayNumber} Formative Checkpoint`,
    homework: `Complete Day ${dayNumber} practice sheet (10-15 minutes).`
  };
}

/**
 * Deterministic offline/fallback planner when AI service is unavailable.
 */
export function synthesizeDeterministicPlan(input = {}, metricsSummary = {}) {
  const topic = input.topic || 'Classroom Curriculum Focus';
  const durationDays = Math.max(1, Math.min(30, parseInt(input.duration_days, 10) || 5));
  const lessonMinutes = Math.max(15, Math.min(180, parseInt(input.lesson_duration_minutes, 10) || 45));
  const learningGoal = input.learning_goal || `Students will understand, apply, and demonstrate mastery of ${topic}.`;

  const daily_plan = [];
  for (let d = 1; d <= durationDays; d++) {
    daily_plan.push(buildDefaultDayPlan(d, topic, lessonMinutes));
  }

  const attentionCases = metricsSummary.students_needing_attention || [];

  return {
    title: `${topic} — ${durationDays}-Day Mastery Plan`,
    topic,
    learning_goal: learningGoal,
    learning_objectives: [
      `Understand fundamental definitions and principles of ${topic}`,
      `Analyze practical examples and identify error patterns`,
      `Demonstrate mastery through differentiated individual assignments`
    ],
    class_profile: {
      evidence_summary: metricsSummary.class_summary?.total_students > 0
        ? `Synthesized using classroom intelligence across ${metricsSummary.class_summary.total_students} students.`
        : 'Initial diagnostic baseline: based on topic curriculum standards.',
      strengths: metricsSummary.top_strengths || ['Class engagement and participation', 'Concept recall'],
      weaknesses: metricsSummary.top_weaknesses || ['Independent application under time constraints', 'Detailed reasoning'],
      considerations: [
        'Incorporate multi-modal explanations (visual, textual, and verbal)',
        'Allocate time for guided scaffolding before independent work'
      ],
      data_sufficiency: metricsSummary.class_summary?.total_students > 0 ? 'comprehensive' : 'initial_diagnostic'
    },
    duration_days: durationDays,
    lesson_duration_minutes: lessonMinutes,
    daily_plan,
    differentiation: {
      support_students: attentionCases.length > 0 ? [`${attentionCases.length} students identified in classroom analytics`] : ['Struggling learners requiring guidance'],
      support_strategy: 'Provide targeted step-by-step scaffolds, sentence stems, and check-ins every 10 minutes.',
      advanced_students: ['Advanced learners working ahead of schedule'],
      extension_strategy: 'Offer extension problem-solving tasks and student-led peer explanations.'
    },
    recommended_actions: [
      {
        type: 'diagnostic_exam',
        title: `Baseline Diagnostic: ${topic}`,
        reason: 'Identify individual gaps before progressing to complex topics.',
        priority: 'high'
      },
      {
        type: 'revision_quiz',
        title: `Mid-Point Check Quiz: ${topic}`,
        reason: 'Measure retention and adapt second half of teaching plan.',
        priority: 'medium'
      }
    ],
    success_criteria: [
      'Minimum 80% average on formative checkpoints',
      'All students complete differentiated exit tasks successfully',
      'Positive confidence indicators from student self-assessments'
    ]
  };
}

/**
 * Builds the compact classroom metrics evidence to supply to Gemini.
 */
function buildEvidenceSnapshot(metricsSummary) {
  if (!metricsSummary) return { has_evidence: false };

  const totalStudents = metricsSummary.class_summary?.total_students || 0;
  const avgScore = metricsSummary.class_summary?.overall_score ?? null;
  const weakTopics = (metricsSummary.topic_performance || []).filter(t => t.score < 65 || t.change < 0);
  const strongTopics = (metricsSummary.topic_performance || []).filter(t => t.score >= 75);
  const attentionStudents = (metricsSummary.students_needing_attention || []).map(s => ({
    name: s.name || s.student_name || 'Student',
    score: s.average_score || s.score,
    weak_topic: s.weak_topic || s.main_weakness || 'General'
  }));

  return {
    has_evidence: totalStudents > 0,
    total_students: totalStudents,
    average_score: avgScore,
    score_trend_points: metricsSummary.class_summary?.score_change || 0,
    top_strengths: metricsSummary.top_strengths || strongTopics.map(t => t.topic),
    top_weaknesses: metricsSummary.top_weaknesses || weakTopics.map(t => t.topic),
    weak_topics: weakTopics,
    strong_topics: strongTopics,
    students_needing_support: attentionStudents,
    writing_insights: metricsSummary.writing_intelligence?.criteria_mastery || []
  };
}

/**
 * Primary Generator: Calls Gemini (or fallbacks) to create an evidence-grounded Teaching Plan.
 */
export async function generateTeachingPlan({
  serverSupabase,
  classroomId,
  teacherId,
  input = {},
  serverOpenAI,
  geminiApiKey,
  openaiApiKey
}) {
  if (!classroomId) {
    throw new Error('Classroom ID is required.');
  }
  if (!input.topic || typeof input.topic !== 'string' || !input.topic.trim()) {
    throw new Error('Teaching topic is required.');
  }

  // 1. Gather deterministic classroom metrics (0 AI tokens)
  const metricsSummary = await computeClassroomMetrics(serverSupabase, classroomId);
  const evidenceSnapshot = buildEvidenceSnapshot(metricsSummary);

  const durationDays = Math.max(1, Math.min(30, parseInt(input.duration_days, 10) || 5));
  const lessonMinutes = Math.max(15, Math.min(180, parseInt(input.lesson_duration_minutes, 10) || 45));
  const level = input.level || metricsSummary.classroom?.grade || 'General';

  // 2. Prepare System Prompt & JSON Specification
  const systemPrompt = `You are EdTechra's Master Pedagogical AI Lesson & Curriculum Planner.
Analyze the provided classroom performance metrics and the teacher's requested topic to create an actionable, evidence-grounded Teaching Plan.

CRITICAL PEDAGOGICAL RULES:
1. Ground the plan strictly in the classroom evidence.
   - If class evidence shows students struggle with a specific area (e.g. grammar, vocabulary, problem-solving), allocate more guided instruction and scaffolding to that area.
   - If students have already mastered related topics, spend less time introducing basics and move quickly to application.
2. ZERO DATA / LOW DATA RULE:
   - If "has_evidence" is false or assessment data is minimal, DO NOT invent fake student weaknesses.
   - Clearly state in "class_profile.evidence_summary" that this plan is tailored to the teacher's topic and grade curriculum standards, and that initial lessons will be used for diagnostic observation.
3. STRICT JSON SCHEMA:
   Return ONLY a valid JSON object with:
   {
     "title": "string (engaging, professional)",
     "topic": "${input.topic.trim()}",
     "learning_goal": "string (clear outcome)",
     "learning_objectives": ["string (3-5 measurable objectives)"],
     "class_profile": {
       "evidence_summary": "string (summary of real class metrics or diagnostic notice)",
       "strengths": ["string (2-3 real class strengths)"],
       "weaknesses": ["string (2-3 real focus areas)"],
       "considerations": ["string (practical teaching tips)"],
       "data_sufficiency": "comprehensive | moderate | initial_diagnostic"
     },
     "duration_days": ${durationDays},
     "lesson_duration_minutes": ${lessonMinutes},
     "daily_plan": [
       {
         "day": 1,
         "title": "string",
         "objectives": ["string"],
         "lesson_focus": "string",
         "activities": [
           {
             "name": "string",
             "duration_minutes": number,
             "description": "string",
             "grouping": "whole_class | pairs | individual | small_group"
           }
         ],
         "assessment": "string",
         "homework": "string"
       }
     ],
     "differentiation": {
       "support_students": ["string (names or identified count)"],
       "support_strategy": "string (specific scaffolding)",
       "advanced_students": ["string (extension targets)"],
       "extension_strategy": "string (creative or analytical extension)"
     },
     "recommended_actions": [
       {
         "type": "diagnostic_exam | revision_quiz | practice_task | resource_reading | writing_challenge",
         "title": "string",
         "reason": "string (why recommended based on evidence)",
         "priority": "high | medium | low"
       }
     ],
     "success_criteria": ["string (3-4 measurable criteria)"]
   }
4. EXACT DURATION:
   The "daily_plan" array MUST contain EXACTLY ${durationDays} daily plans (day 1 to day ${durationDays}).
5. DO NOT execute quizzes or exams; only RECOMMEND them in "recommended_actions".`;

  const userPrompt = `TEACHER REQUEST:
- Topic: ${input.topic}
- Learning Goal: ${input.learning_goal || 'Comprehensive concept mastery and applied fluency'}
- Target Level/Grade: ${level}
- Duration: ${durationDays} days
- Lesson Duration: ${lessonMinutes} minutes per lesson
- Teacher Notes/Special Instructions: ${input.teacher_notes || 'None provided'}
- Additional Learning Content/Resource Text: ${input.content ? input.content.slice(0, 3000) : 'None provided'}

REAL CLASSROOM METRICS EVIDENCE:
${JSON.stringify(evidenceSnapshot, null, 2)}`;

  // Delegate to Central AI Router (Primary: OpenAI GPT-5 nano -> Fallback: Gemini -> Fallback: Local Pedagogy Synthesizer)
  let parsedPlan = null;
  let providerUsed = 'deterministic_engine';
  let modelUsed = 'local-pedagogy-synthesizer';

  try {
    const aiResult = await aiRouter.executeTask({
      taskType: AI_TASK_TYPES.TEACHING_PLAN,
      systemPrompt,
      userPrompt,
      classroomId,
      temperature: 0.3
    });

    if (aiResult.success && aiResult.parsed && typeof aiResult.parsed === 'object') {
      console.log(`[TeachingPlanner] Generated successfully via ${aiResult.provider} (${aiResult.model})`);
      parsedPlan = aiResult.parsed;
      providerUsed = aiResult.provider;
      modelUsed = aiResult.model;
    }
  } catch (err) {
    console.warn('[TeachingPlanner] AI generation notice:', err.message);
  }

  if (parsedPlan) {
    const validated = validateAndNormalizePlan(parsedPlan, input, metricsSummary);
    return {
      success: true,
      plan: validated,
      classroom_snapshot: evidenceSnapshot,
      ai_provider: providerUsed,
      model: modelUsed
    };
  }

  // --- Step C: Deterministic Local Synthesis Engine ---
  console.log('[TeachingPlanner] Using deterministic pedagogical synthesis engine.');
  const deterministicPlan = synthesizeDeterministicPlan(input, metricsSummary);
  return {
    success: true,
    plan: deterministicPlan,
    classroom_snapshot: evidenceSnapshot,
    ai_provider: 'deterministic_engine',
    model: 'local-pedagogy-synthesizer'
  };
}

/**
 * Regenerate or refine a single specific day of an existing Teaching Plan.
 */
export async function regenerateTeachingPlanDay({
  currentPlan,
  dayNumber,
  teacherInstructions = '',
  serverOpenAI,
  geminiApiKey,
  openaiApiKey
}) {
  if (!currentPlan || !Array.isArray(currentPlan.daily_plan)) {
    throw new Error('A valid current plan is required for day regeneration.');
  }

  const targetDay = currentPlan.daily_plan.find(p => Number(p.day) === Number(dayNumber));
  if (!targetDay) {
    throw new Error(`Day ${dayNumber} not found in current teaching plan.`);
  }

  const prompt = `You are EdTechra's Pedagogical Lesson Refiner.
Regenerate Day ${dayNumber} of the teaching plan for topic "${currentPlan.topic}".

CURRENT DAY PLAN:
${JSON.stringify(targetDay, null, 2)}

TEACHER INSTRUCTIONS FOR THIS DAY:
"${teacherInstructions || 'Make the activities more interactive, engaging, and practical.'}"

LESSON DURATION: ${currentPlan.lesson_duration_minutes || 45} minutes.

Return ONLY a JSON object for Day ${dayNumber} with:
{
  "day": ${dayNumber},
  "title": "string",
  "objectives": ["string"],
  "lesson_focus": "string",
  "activities": [
    {
      "name": "string",
      "duration_minutes": number,
      "description": "string",
      "grouping": "whole_class | pairs | individual | small_group"
    }
  ],
  "assessment": "string",
  "homework": "string"
}`;

  let newDay = null;

  try {
    const aiResult = await aiRouter.executeTask({
      taskType: AI_TASK_TYPES.TEACHING_PLAN_DAY,
      systemPrompt: 'You are EdTechra\'s Pedagogical Lesson Refiner. Return ONLY a valid JSON object matching the requested schema.',
      userPrompt: prompt,
      classroomId: currentPlan.classroom_id,
      temperature: 0.4
    });

    if (aiResult.success && aiResult.parsed && typeof aiResult.parsed === 'object') {
      newDay = aiResult.parsed;
    }
  } catch (err) {
    console.warn('[TeachingPlanner] Day regeneration AI notice:', err.message);
  }

  // Fallback if AI not available
  if (!newDay) {
    newDay = {
      ...targetDay,
      title: `${targetDay.title} (Refined)`,
      lesson_focus: teacherInstructions
        ? `Refined focus: ${teacherInstructions}`
        : targetDay.lesson_focus,
      activities: targetDay.activities.map(a => ({
        ...a,
        description: `${a.description} (Adapted with active checks)`
      }))
    };
  }

  // Merge into current plan
  const updatedDailyPlan = currentPlan.daily_plan.map(d =>
    Number(d.day) === Number(dayNumber) ? { ...d, ...newDay, day: Number(dayNumber) } : d
  );

  return {
    ...currentPlan,
    daily_plan: updatedDailyPlan
  };
}

/**
 * Save Teaching Plan to database (or fallback cache).
 * Supports status: 'draft' | 'approved' | 'archived'.
 */
export async function saveTeachingPlan({
  serverSupabase,
  classroomId,
  teacherId,
  planData
}) {
  if (!classroomId) throw new Error('Classroom ID is required.');
  if (!teacherId) throw new Error('Teacher ID is required.');
  if (!planData || !planData.plan) throw new Error('Plan data is required.');

  const planId = planData.id || crypto.randomUUID();
  const status = ['draft', 'approved', 'archived'].includes(planData.status)
    ? planData.status
    : 'draft';

  const record = {
    id: planId,
    classroom_id: classroomId,
    teacher_id: teacherId,
    title: planData.plan.title || `${planData.plan.topic || 'Classroom'} Teaching Plan`,
    topic: planData.plan.topic || 'Classroom Focus',
    learning_goal: planData.plan.learning_goal || '',
    duration_days: planData.plan.duration_days || 5,
    lesson_duration_minutes: planData.plan.lesson_duration_minutes || 45,
    teacher_notes: planData.teacher_notes || '',
    plan_json: planData.plan,
    classroom_snapshot: planData.classroom_snapshot || {},
    status,
    created_at: planData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Try Supabase insertion/upsertion
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('ai_teaching_plans')
        .upsert(record)
        .select()
        .single();

      if (!error && data) {
        return { success: true, plan: data, storage: 'supabase' };
      }
      if (error) {
        console.warn('[TeachingPlanner] Supabase save notice:', error.message);
      }
    } catch (dbErr) {
      console.warn('[TeachingPlanner] Supabase upsert notice:', dbErr.message);
    }
  }

  // 2. Memory / Local fallback store
  memoryPlansCache.set(planId, record);
  return { success: true, plan: record, storage: 'memory_fallback' };
}

/**
 * List saved Teaching Plans for a classroom.
 */
export async function getClassroomTeachingPlans({ serverSupabase, classroomId, teacherId }) {
  if (!classroomId) return { success: true, plans: [] };

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('ai_teaching_plans')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return { success: true, plans: data };
      }
    } catch (err) {
      console.warn('[TeachingPlanner] List plans notice:', err.message);
    }
  }

  // Fallback
  const cached = Array.from(memoryPlansCache.values())
    .filter(p => p.classroom_id === classroomId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return { success: true, plans: cached };
}

/**
 * Retrieve an individual Teaching Plan by ID.
 */
export async function getTeachingPlanById({ serverSupabase, planId }) {
  if (!planId) return null;

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('ai_teaching_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      if (!error && data) return data;
    } catch (err) {
      console.warn('[TeachingPlanner] Get plan notice:', err.message);
    }
  }

  return memoryPlansCache.get(planId) || null;
}

/**
 * Delete or Archive Teaching Plan.
 */
export async function deleteTeachingPlan({ serverSupabase, planId, teacherId }) {
  if (!planId) return { success: false, error: 'Plan ID required' };

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase
        .from('ai_teaching_plans')
        .delete()
        .eq('id', planId);

      if (!error) return { success: true };
    } catch (err) {
      console.warn('[TeachingPlanner] Delete plan notice:', err.message);
    }
  }

  memoryPlansCache.delete(planId);
  return { success: true };
}
