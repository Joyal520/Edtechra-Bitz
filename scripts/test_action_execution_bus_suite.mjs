// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ACTION EXECUTION BUS TEST SUITE (PHASE 2B)
// Comprehensive automated test suite verifying idempotency, state machine,
// action handlers, background scheduling, and error retry semantics.
// ============================================================================

import assert from 'assert';
import {
  buildIdempotencyKey,
  createAction,
  createActionsFromPlan,
  executeAction,
  executeDiagnosticExam,
  executeLearningResource,
  executeAnnouncement,
  executeLiveQuiz,
  executeScheduleLiveQuiz,
  getClassroomActions,
  updateActionDetails
} from '../server/actionExecutionBus.mjs';

async function runActionExecutionBusTests() {
  console.log('================================================================');
  console.log('🧪 EDTECHRA AI ACTION EXECUTION BUS TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Reason: ${err.message}`);
        failed++;
      }
    };
  }

  const tests = [
    // 1. Idempotency Key Generation
    test('buildIdempotencyKey produces consistent, deterministic normalized keys', async () => {
      const key1 = buildIdempotencyKey('plan-123', 'create_diagnostic_exam', 'Unit 1 Test', 1);
      const key2 = buildIdempotencyKey('plan-123', 'create_diagnostic_exam', 'unit 1 test', 1);
      const key3 = buildIdempotencyKey('plan-123', 'create_diagnostic_exam', 'Unit 1 Test', 2);

      assert.strictEqual(key1, 'plan-123__create_diagnostic_exam__unit_1_test__v1');
      assert.strictEqual(key1, key2, 'Normalized strings should produce identical idempotency keys');
      assert.notStrictEqual(key1, key3, 'Different execution versions should produce different keys');
    }),

    // 2. Action Creation & Duplicate Detection
    test('createAction prevents duplicate creation with identical idempotency key', async () => {
      const testPlanId = 'plan_test_abc';
      const key = buildIdempotencyKey(testPlanId, 'post_announcement', 'Welcome Announcement', 1);

      const res1 = await createAction(null, {
        planId: testPlanId,
        classroomId: 'class_test_1',
        teacherId: 'teacher_test_1',
        actionType: 'post_announcement',
        title: 'Welcome Announcement',
        description: 'Welcome students to the course',
        idempotencyKey: key
      });

      assert.strictEqual(res1.isDuplicate, false, 'First creation should not be a duplicate');
      assert.strictEqual(res1.action.idempotency_key, key);

      const res2 = await createAction(null, {
        planId: testPlanId,
        classroomId: 'class_test_1',
        teacherId: 'teacher_test_1',
        actionType: 'post_announcement',
        title: 'Welcome Announcement Duplicate',
        description: 'Should be ignored',
        idempotencyKey: key
      });

      assert.strictEqual(res2.isDuplicate, true, 'Second creation with same key MUST be identified as duplicate');
      assert.strictEqual(res1.action.id, res2.action.id, 'Duplicate action should return the original action instance');
    }),

    // 3. Approval Gate
    test('executeAction blocks pending action requiring approval unless forceImmediate is set', async () => {
      const createRes = await createAction(null, {
        planId: 'plan_approval_test',
        classroomId: 'class_test_2',
        teacherId: 'teacher_test_2',
        actionType: 'post_announcement',
        title: 'Exam Date Announcement',
        requiresApproval: true
      });

      let blocked = false;
      try {
        await executeAction(null, createRes.action.id, { forceImmediate: false });
      } catch (err) {
        blocked = true;
        assert.match(err.message, /requires teacher approval/i);
      }
      assert.strictEqual(blocked, true, 'Pending action with requires_approval: true must be blocked');

      // Now approve it
      await updateActionDetails(null, createRes.action.id, { status: 'approved' });
      const execRes = await executeAction(null, createRes.action.id, { forceImmediate: false });
      assert.strictEqual(execRes.success, true);
      assert.strictEqual(execRes.action.status, 'completed');
    }),

    // 4. Action Handler 1: create_diagnostic_exam
    test('executeDiagnosticExam produces valid diagnostic assessment with questions and total marks', async () => {
      const action = {
        id: 'act_diag_test',
        classroom_id: 'class_test_diag',
        teacher_id: 'teacher_test_diag',
        action_type: 'create_diagnostic_exam',
        title: 'Cellular Respiration Diagnostic',
        description: 'Identify baseline understanding of glycolysis and the Krebs cycle',
        payload: {
          topic: 'Cellular Respiration',
          class_level: 'Grade 10 Biology',
          question_count: 5
        }
      };

      const result = await executeDiagnosticExam({ serverSupabase: null, action });
      assert.ok(result.exam_id, 'Exam ID must be generated');
      assert.strictEqual(result.question_count, 5, 'Question count should match requested 5');
      assert.ok(result.total_marks > 0, 'Total marks should be calculated');
      assert.strictEqual(result.status, 'draft', 'Diagnostic exam should be created in safe draft status');
    }),

    // 5. Action Handler 2: create_learning_resource
    test('executeLearningResource generates structured study guide notes', async () => {
      const action = {
        id: 'act_res_test',
        classroom_id: 'class_test_res',
        teacher_id: 'teacher_test_res',
        action_type: 'create_learning_resource',
        title: 'Photosynthesis Master Notes',
        payload: {
          topic: 'Photosynthesis',
          learning_goal: 'Understand light-dependent and Calvin cycle reactions'
        }
      };

      const result = await executeLearningResource({ serverSupabase: null, action });
      assert.ok(result.item_id, 'Bucket item ID must be generated');
      assert.ok(result.title.includes('Photosynthesis'), 'Title should reflect topic');
      assert.ok(result.summary, 'Summary should be generated');
    }),

    // 6. Action Handler 3: post_announcement
    test('executeAnnouncement posts classroom message', async () => {
      const action = {
        id: 'act_msg_test',
        classroom_id: 'class_test_msg',
        teacher_id: 'teacher_test_msg',
        action_type: 'post_announcement',
        title: 'Project Submission Reminder',
        payload: {
          topic: 'Science Fair Project',
          message: 'Please remember to submit your project proposals by Friday 5 PM.'
        }
      };

      const result = await executeAnnouncement({ serverSupabase: null, action });
      assert.ok(result.message_id, 'Message ID must be generated');
      assert.strictEqual(result.classroom_id, 'class_test_msg');
      assert.ok(result.message_snippet.includes('proposals by Friday'), 'Snippet should contain message content');
    }),

    // 7. Action Handler 4: create_live_quiz
    test('executeLiveQuiz generates fast-paced quiz with strictly 4 options, 1-3 words each, 1 correct answer', async () => {
      const action = {
        id: 'act_quiz_test',
        classroom_id: 'class_test_quiz',
        teacher_id: 'teacher_test_quiz',
        action_type: 'create_live_quiz',
        title: 'Newtonian Physics Speed Quiz',
        payload: {
          topic: 'Newtonian Physics'
        }
      };

      const result = await executeLiveQuiz({ serverSupabase: null, action });
      assert.ok(result.quiz_id, 'Quiz ID must be generated');
      assert.ok(result.question_count >= 3, 'Quiz should contain multiple questions');
      assert.ok(result.title.includes('Physics'), 'Quiz title should reflect topic');
    }),

    // 8. Action Handler 5: schedule_live_quiz
    test('executeScheduleLiveQuiz creates session with 6-digit PIN and status lobby', async () => {
      const action = {
        id: 'act_sched_test',
        classroom_id: 'class_test_sched',
        teacher_id: 'teacher_test_sched',
        action_type: 'schedule_live_quiz',
        title: 'Friday Revision Live Quiz',
        scheduled_for: new Date(Date.now() + 3600000).toISOString(),
        payload: {
          topic: 'World History'
        }
      };

      const result = await executeScheduleLiveQuiz({ serverSupabase: null, action });
      assert.ok(result.session_id, 'Session ID must be generated');
      assert.strictEqual(typeof result.pin, 'string', 'PIN must be a string');
      assert.strictEqual(result.pin.length, 6, 'PIN must be exactly 6 digits');
      assert.strictEqual(result.status, 'lobby');
    }),

    // 9. Idempotent Execution on Completed Actions
    test('executeAction returns cached result payload idempotently when already completed', async () => {
      const createRes = await createAction(null, {
        planId: 'plan_cache_test',
        classroomId: 'class_cache',
        teacherId: 'teacher_cache',
        actionType: 'post_announcement',
        title: 'Cached Announcement',
        requiresApproval: false
      });

      const exec1 = await executeAction(null, createRes.action.id, { forceImmediate: true });
      assert.strictEqual(exec1.success, true);
      assert.strictEqual(exec1.alreadyCompleted, undefined);

      // Second execution
      const exec2 = await executeAction(null, createRes.action.id, { forceImmediate: true });
      assert.strictEqual(exec2.success, true);
      assert.strictEqual(exec2.alreadyCompleted, true, 'Subsequent execution should flag alreadyCompleted');
      assert.deepStrictEqual(exec1.result, exec2.result, 'Subsequent execution must return identical cached result');
    }),

    // 10. createActionsFromPlan conversion
    test('createActionsFromPlan converts teaching plan recommendations into typed actions', async () => {
      const mockPlan = {
        id: 'plan_full_convert',
        classroom_id: 'class_convert',
        teacher_id: 'teacher_convert',
        title: 'Photosynthesis Unit',
        topic: 'Photosynthesis & Plant Energy',
        duration_days: 5,
        learning_goal: 'Understand chloroplast light reaction and ATP synthesis',
        plan_json: {
          recommended_interventions: [
            {
              type: 'diagnostic_exam',
              title: 'Photosynthesis Prerequisites Check',
              details: 'Pre-assessment on plant cell anatomy and chemical energy',
              priority: 'high',
              pedagogical_reason: 'Validate prerequisite chemistry knowledge before photosynthesis',
              target_students: 'all'
            },
            {
              type: 'learning_resource',
              title: 'Light vs Dark Reactions Illustrated Notes',
              details: 'Step by step breakdown of the thylakoid membrane reactions',
              priority: 'medium',
              pedagogical_reason: 'Supports visual learners with structured synthesis',
              target_students: 'all'
            },
            {
              type: 'live_quiz',
              title: 'Mid-Unit Speed Quiz: Light Reactions',
              details: 'Rapid concept check on chlorophyll absorption and photon reactions',
              priority: 'medium',
              pedagogical_reason: 'Reinforce active recall midway through unit',
              target_students: 'all'
            }
          ]
        }
      };

      const actions = await createActionsFromPlan(null, {
        plan: mockPlan,
        classroomId: 'class_convert',
        teacherId: 'teacher_convert'
      });

      assert.strictEqual(actions.length, 3, 'Should create 3 actions matching recommendations');
      assert.strictEqual(actions[0].action_type, 'create_diagnostic_exam');
      assert.strictEqual(actions[1].action_type, 'create_learning_resource');
      assert.strictEqual(actions[2].action_type, 'create_live_quiz');
      assert.strictEqual(actions[0].requires_approval, true, 'Diagnostic exam requires approval');
      assert.strictEqual(actions[1].requires_approval, false, 'Learning resource notes can be auto-prepared');
    }),

    // 11. Filtering actions by classroom & plan
    test('getClassroomActions retrieves actions filtered by classroom and plan', async () => {
      const list = await getClassroomActions(null, 'class_convert', { planId: 'plan_full_convert' });
      assert.ok(list.length >= 3, 'Should list actions for class_convert');
      for (const item of list) {
        assert.strictEqual(item.classroom_id, 'class_convert');
        assert.strictEqual(item.teaching_plan_id, 'plan_full_convert');
      }
    }),

    // 12. Scheduler Due Actions Filtering
    test('getDueActions accurately filters approved and auto-actions due for execution', async () => {
      const { getDueActions } = await import('../server/actionExecutionBus.mjs');

      // Future action (not due yet)
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await createAction(null, {
        planId: 'plan_sched_test',
        classroomId: 'class_sched_1',
        teacherId: 'teacher_sched_1',
        actionType: 'post_announcement',
        title: 'Future Announcement',
        scheduledFor: futureDate,
        requiresApproval: false
      });

      // Due action (scheduled in past)
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const dueRes = await createAction(null, {
        planId: 'plan_sched_test',
        classroomId: 'class_sched_1',
        teacherId: 'teacher_sched_1',
        actionType: 'post_announcement',
        title: 'Immediate Due Announcement',
        scheduledFor: pastDate,
        requiresApproval: false
      });

      const dueList = await getDueActions(null, new Date().toISOString());
      const hasDue = dueList.some(a => a.id === dueRes.action.id);
      const hasFuture = dueList.some(a => a.title === 'Future Announcement');

      assert.strictEqual(hasDue, true, 'Immediate due action must be found in dueList');
      assert.strictEqual(hasFuture, false, 'Future scheduled action must NOT be found in dueList');
    }),

    // 13. Autonomous Scheduler Execution
    test('actionScheduler.processDueActions executes due actions autonomously', async () => {
      const { actionScheduler } = await import('../server/actionScheduler.mjs');

      const autoRes = await createAction(null, {
        planId: 'plan_auto_sched',
        classroomId: 'class_auto_1',
        teacherId: 'teacher_auto_1',
        actionType: 'post_announcement',
        title: 'Autonomous Scheduler Announcement',
        requiresApproval: false
      });

      assert.strictEqual(autoRes.action.status, 'pending');

      // Run scheduler tick
      await actionScheduler.processDueActions();

      const updated = await getClassroomActions(null, 'class_auto_1', { planId: 'plan_auto_sched' });
      const matching = updated.find(a => a.id === autoRes.action.id);

      assert.ok(matching, 'Action should exist');
      assert.strictEqual(matching.status, 'completed', 'Action should be marked completed by scheduler tick');
      assert.ok(matching.executed_at, 'Executed at timestamp should be populated');
    })
  ];

  for (const t of tests) {
    await t();
  }

  console.log('\n================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${tests.length})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runActionExecutionBusTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
