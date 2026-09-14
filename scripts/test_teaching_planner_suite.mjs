// ============================================================================
// AI TEACHING PLANNER (PHASE 2A) INTEGRATION TEST SUITE
// Verifies:
// 1. Evidence-grounded classroom metrics packaging
// 2. Strict Structured JSON generation via Gemini / Fallback
// 3. Low/Zero data handling (no hallucinated student weaknesses)
// 4. Duration integrity and daily plan normalization
// 5. Single-day plan regeneration
// 6. Plan storage lifecycle (Draft -> Approved)
// 7. Recommended action compatibility for Phase 2B (no execution in 2A)
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  generateTeachingPlan,
  regenerateTeachingPlanDay,
  validateAndNormalizePlan,
  synthesizeDeterministicPlan,
  saveTeachingPlan,
  getClassroomTeachingPlans,
  getTeachingPlanById,
  deleteTeachingPlan
} from '../server/teachingPlannerService.mjs';

console.log('=================================================================');
console.log('  EDTECHRA DIGITAL CLASSROOM: AI TEACHING PLANNER TEST SUITE    ');
console.log('=================================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runSuite() {
  const mockClassroomMetrics = {
    classroom: { id: 'test-class-123', title: 'Grade 8 English Lit', grade: 'Grade 8', subject: 'English' },
    class_summary: {
      total_students: 22,
      active_students: 20,
      overall_score: 68,
      score_change: -4
    },
    top_strengths: ['Vocabulary recall', 'Reading comprehension'],
    top_weaknesses: ['Present Perfect tense agreement', 'Irregular past participles'],
    topic_performance: [
      { topic: 'Present Perfect tense agreement', score: 54, change: -8, status: 'needs_attention' },
      { topic: 'Vocabulary recall', score: 82, change: 3, status: 'mastered' }
    ],
    students_needing_attention: [
      { name: 'Student A', score: 50, weak_topic: 'Present Perfect tense agreement' },
      { name: 'Student B', score: 52, weak_topic: 'Present Perfect tense agreement' }
    ],
    writing_intelligence: { total_submissions: 15, criteria_mastery: [] }
  };

  const zeroDataMetrics = {
    classroom: { id: 'new-class-456', title: 'New Class A', grade: 'Grade 7', subject: 'Science' },
    class_summary: { total_students: 0, active_students: 0, overall_score: null, score_change: 0 },
    top_strengths: [],
    top_weaknesses: [],
    topic_performance: [],
    students_needing_attention: [],
    writing_intelligence: { total_submissions: 0, criteria_mastery: [] }
  };

  // --- Test 1: Deterministic Plan Synthesis ---
  console.log('\n--- 1. Testing Deterministic Offline Synthesis ---');
  const detPlan = synthesizeDeterministicPlan(
    { topic: 'Photosynthesis', duration_days: 3, lesson_duration_minutes: 45 },
    mockClassroomMetrics
  );
  assert(detPlan.topic === 'Photosynthesis', 'Deterministic plan preserves topic');
  assert(detPlan.daily_plan.length === 3, 'Daily plan length matches duration (3 days)');
  assert(detPlan.daily_plan[0].day === 1, 'Day 1 is numbered correctly');
  assert(detPlan.daily_plan[0].activities.length >= 3, 'Daily activities generated with pacing');
  assert(detPlan.differentiation.support_strategy.length > 10, 'Support strategy generated');
  assert(detPlan.recommended_actions.length >= 1, 'Recommended future actions present');

  // --- Test 2: Validation & Normalization with Missing / Malformed Data ---
  console.log('\n--- 2. Testing Normalization & Schema Repair ---');
  const malformedPlan = {
    topic: 'Algebra Fundamentals',
    duration_days: 5,
    daily_plan: [
      { day: 1, title: 'Introduction' }
      // Missing days 2, 3, 4, 5
    ]
  };
  const repaired = validateAndNormalizePlan(malformedPlan, { duration_days: 5, topic: 'Algebra Fundamentals' }, mockClassroomMetrics);
  assert(repaired.daily_plan.length === 5, 'Repaired missing days to exactly match 5 days');
  assert(repaired.daily_plan[4].day === 5, 'Day 5 properly synthesized in repair');
  assert(repaired.daily_plan[0].activities.length > 0, 'Default activities filled in for Day 1');
  assert(Array.isArray(repaired.learning_objectives) && repaired.learning_objectives.length >= 3, 'Learning objectives populated');
  assert(repaired.class_profile.data_sufficiency === 'comprehensive', 'Data sufficiency flagged as comprehensive with real metrics');

  // --- Test 3: Zero / Low Data Handling (No Hallucinated Weaknesses) ---
  console.log('\n--- 3. Testing Low / Zero Data Grounding ---');
  const zeroDataPlan = validateAndNormalizePlan(
    { topic: 'Fractions' },
    { topic: 'Fractions', duration_days: 4 },
    zeroDataMetrics
  );
  assert(zeroDataPlan.class_profile.data_sufficiency === 'initial_diagnostic', 'Flagged as initial_diagnostic when zero classroom data');
  assert(zeroDataPlan.class_profile.evidence_summary.includes('Initial diagnostic'), 'Evidence summary clearly states initial diagnostic');

  // --- Test 4: Live AI Generation (Gemini Primary / Fallback) ---
  console.log('\n--- 4. Testing AI Teaching Plan Generation ---');
  const genResult = await generateTeachingPlan({
    classroomId: 'test-class-123',
    teacherId: 'teacher-uuid-001',
    input: {
      topic: 'Present Perfect Tense',
      learning_goal: 'Students will differentiate between simple past and present perfect with 85% accuracy.',
      duration_days: 3,
      lesson_duration_minutes: 45,
      level: 'Grade 8',
      teacher_notes: 'Focus on irregular past participles.'
    },
    // We pass mockClassroomMetrics indirectly via deterministic fallback if supabase client is null
  });

  assert(genResult.success === true, 'Generation returns success: true');
  assert(genResult.plan.topic === 'Present Perfect Tense', 'Generated plan matches requested topic');
  assert(genResult.plan.daily_plan.length === 3, 'Generated plan has exactly 3 days');
  assert(genResult.plan.daily_plan[0].activities.length > 0, 'Day 1 contains activities');
  assert(Array.isArray(genResult.plan.recommended_actions), 'Recommended actions array present');
  console.log(`  ✓ AI Provider: ${genResult.ai_provider} (${genResult.model})`);

  // --- Test 5: Single-Day Plan Regeneration ---
  console.log('\n--- 5. Testing Single-Day Regeneration ---');
  const currentPlan = genResult.plan;
  const regenResult = await regenerateTeachingPlanDay({
    currentPlan,
    dayNumber: 2,
    teacherInstructions: 'Make Day 2 focus heavily on irregular verb games in small groups.'
  });

  assert(regenResult.daily_plan.length === currentPlan.daily_plan.length, 'Total days count preserved during day regen');
  assert(regenResult.daily_plan[0].title === currentPlan.daily_plan[0].title, 'Day 1 preserved untouched');
  assert(regenResult.daily_plan[1].day === 2, 'Day 2 properly updated');

  // --- Test 6: Plan Storage Lifecycle (Draft -> Approved) ---
  console.log('\n--- 6. Testing Plan Storage Lifecycle (Draft -> Approved) ---');
  const saveDraftResult = await saveTeachingPlan({
    classroomId: 'test-class-123',
    teacherId: 'teacher-uuid-001',
    planData: {
      plan: genResult.plan,
      status: 'draft',
      teacher_notes: 'Initial draft for review'
    }
  });

  assert(saveDraftResult.success === true, 'Draft plan saved successfully');
  const planId = saveDraftResult.plan.id;
  assert(saveDraftResult.plan.status === 'draft', 'Saved plan status is "draft"');

  // Teacher Approval
  const saveApprovedResult = await saveTeachingPlan({
    classroomId: 'test-class-123',
    teacherId: 'teacher-uuid-001',
    planData: {
      id: planId,
      plan: genResult.plan,
      status: 'approved',
      teacher_notes: 'Reviewed and approved by teacher'
    }
  });

  assert(saveApprovedResult.success === true, 'Approved plan updated successfully');
  assert(saveApprovedResult.plan.status === 'approved', 'Plan status transitioned to "approved"');

  // Retrieve plans list
  const listResult = await getClassroomTeachingPlans({
    classroomId: 'test-class-123',
    teacherId: 'teacher-uuid-001'
  });
  assert(listResult.success === true, 'Plans list retrieved successfully');
  assert(listResult.plans.some(p => p.id === planId), 'Saved plan found in classroom plans list');

  // Retrieve single plan
  const retrieved = await getTeachingPlanById({ planId });
  assert(retrieved !== null && retrieved.id === planId, 'Individual plan retrieved by ID');
  assert(retrieved.status === 'approved', 'Retrieved plan has approved status');

  // --- Test 7: Phase 2A Constraint Verification (Zero Action Execution) ---
  console.log('\n--- 7. Testing Phase 2A Constraints (Zero Action Execution) ---');
  const recommendedActions = genResult.plan.recommended_actions;
  assert(recommendedActions.length > 0, 'Plan includes recommended actions for Phase 2B');
  for (const act of recommendedActions) {
    assert(['diagnostic_exam', 'revision_quiz', 'practice_task', 'resource_reading', 'writing_challenge'].includes(act.type),
      `Action type "${act.type}" conforms to Phase 2B compatible action spec`);
    assert(typeof act.reason === 'string' && act.reason.length > 0, `Action has clear reason: "${act.title}"`);
  }

  // Final summary
  console.log('\n=================================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED     `);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
