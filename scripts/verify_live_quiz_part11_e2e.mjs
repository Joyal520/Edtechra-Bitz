// ============================================================================
// PART 11: MANDATORY END-TO-END LIVE QUIZ SIMULATION & VERIFICATION SUITE
// Executes against the live Supabase database + local Express/AI server (port 3000)
// ============================================================================

import assert from 'assert';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  validateQuizBatch,
  areQuestionsSemanticallyDuplicate,
  OBJECT_PRONOUNS_SET
} from '../server/quizQualityValidator.mjs';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const API_BASE = `http://localhost:${process.env.PORT || 3000}`;

const adminSb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

console.log('============================================================================');
console.log(' STARTING PART 11: MANDATORY END-TO-END LIVE QUIZ SIMULATION (TESTS 1-10)');
console.log('============================================================================\n');

const createdUserIds = [];
let createdQuizIds = [];
let createdSessionId = null;

async function createTempAuthenticatedClient(fullName, role = 'student') {
  const email = `sim_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@edtechra.test`;
  const password = 'SimPassword123!';

  const { data: created, error: createErr } = await adminSb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role }
  });
  if (createErr) throw createErr;

  const userId = created.user.id;
  createdUserIds.push(userId);

  await adminSb.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    role
  });

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
    email,
    password
  });
  if (signInErr) throw signInErr;

  return {
    userId,
    email,
    fullName,
    accessToken: signInData.session.access_token,
    client: userClient
  };
}

try {
  // 0. Create 1 Teacher + 5 Students (with real Supabase Auth + RLS sessions)
  console.log('--- [Setup] Provisioning 1 Teacher & 5 Authenticated Student Sessions ---');
  const teacher = await createTempAuthenticatedClient('Ms. Clara Vance (Host)', 'teacher');
  const students = await Promise.all([
    createTempAuthenticatedClient('Aarav Sharma (Student 1)', 'student'),
    createTempAuthenticatedClient('Maya Lin (Student 2)', 'student'),
    createTempAuthenticatedClient('Liam OConnor (Student 3)', 'student'),
    createTempAuthenticatedClient('Sofia Rossi (Student 4)', 'student'),
    createTempAuthenticatedClient('Noah Kim (Student 5)', 'student')
  ]);
  console.log(`✓ Provisioned Teacher (${teacher.fullName}) and 5 Students with active RLS JWTs.\n`);

  // Get a valid classroom_id for the simulation
  const { data: classrooms } = await adminSb.from('classrooms').select('id, teacher_id').limit(1);
  const classroomId = classrooms?.[0]?.id || null;

  // ============================================================================
  // TEST 1: TEACHER WORKFLOW & AI QUIZ GENERATION QUALITY VALIDATION
  // ============================================================================
  console.log('--- [Test 1] Teacher AI Quiz Builder + Quiz Quality Validation Layer ---');

  async function callAiGenerate(payload) {
    const res = await fetch(`${API_BASE}/api/live-quiz/ai-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacher.accessToken}`
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    assert.strictEqual(res.status, 200, `AI generate HTTP status must be 200 (got ${res.status}: ${json.error})`);
    assert.strictEqual(json.success, true, 'AI generate response must have success=true');
    return json;
  }

  // 1A. Easy Object Pronouns Quiz (10 questions)
  const easyObjRes = await callAiGenerate({
    category: 'English Grammar',
    topic: 'Object Pronouns',
    difficulty: 'Easy',
    questionCount: 10,
    timePerQuestion: 20,
    generateCover: true
  });
  const easyQuiz = easyObjRes.quiz;
  assert.strictEqual(easyQuiz.questions.length, 10, 'Easy Object Pronouns quiz must have 10 questions');
  assert.strictEqual(easyObjRes.validationReport.passed, true, 'Validation report must pass');
  assert.strictEqual(easyObjRes.validationReport.topicRelevance, '10/10');
  assert.strictEqual(easyObjRes.validationReport.duplicateQuestions, 0);
  assert.strictEqual(easyObjRes.validationReport.validAnswerOptions, '10/10');
  assert.strictEqual(easyObjRes.validationReport.correctAnswersIdentified, '10/10');
  assert.strictEqual(easyObjRes.validationReport.difficultyCompliance, '10/10');
  assert.ok(easyQuiz.coverImageUrl, 'AI Quiz Builder must automatically generate a 16:9 cover image URL');

  // Verify every single question in Easy Object Pronouns tests object pronouns
  for (let i = 0; i < easyQuiz.questions.length; i++) {
    const q = easyQuiz.questions[i];
    const combined = `${q.question} ${q.options.join(' ')}`.toLowerCase();
    const hasObjPronoun = Array.from(OBJECT_PRONOUNS_SET).some((p) =>
      new RegExp(`\\b${p}\\b`, 'i').test(combined)
    );
    assert.ok(hasObjPronoun, `Question ${i + 1} must assess object pronouns: "${q.question}"`);
    assert.strictEqual(q.options.length, 4, `Question ${i + 1} must have 4 options`);
    assert.ok(q.question.includes(':'), `Question ${i + 1} must include instruction prefix with colon`);
  }
  console.log(`✓ 1A. Easy Object Pronouns (10 Qs): Validation=${JSON.stringify(easyObjRes.validationReport)}`);
  console.log(`      Sample Easy Q1: "${easyQuiz.questions[0].question}" -> [${easyQuiz.questions[0].options.join(', ')}]`);

  // 1B. Medium Object Pronouns Quiz (5 questions)
  const medObjRes = await callAiGenerate({
    category: 'English Grammar',
    topic: 'Object Pronouns',
    difficulty: 'Medium',
    questionCount: 5,
    timePerQuestion: 20,
    generateCover: false
  });
  assert.strictEqual(medObjRes.quiz.questions.length, 5);
  assert.strictEqual(medObjRes.validationReport.topicRelevance, '5/5');
  assert.strictEqual(medObjRes.validationReport.duplicateQuestions, 0);
  console.log(`✓ 1B. Medium Object Pronouns (5 Qs): Validation=${medObjRes.validationReport.topicRelevance}, Duplicates=0`);
  console.log(`      Sample Medium Q1: "${medObjRes.quiz.questions[0].question}"`);

  // 1C. Hard Object Pronouns Quiz (5 questions)
  const hardObjRes = await callAiGenerate({
    category: 'English Grammar',
    topic: 'Object Pronouns',
    difficulty: 'Hard',
    questionCount: 5,
    timePerQuestion: 20,
    generateCover: false
  });
  assert.strictEqual(hardObjRes.quiz.questions.length, 5);
  assert.strictEqual(hardObjRes.validationReport.topicRelevance, '5/5');
  assert.strictEqual(hardObjRes.validationReport.duplicateQuestions, 0);
  console.log(`✓ 1C. Hard Object Pronouns (5 Qs): Validation=${hardObjRes.validationReport.topicRelevance}, Duplicates=0`);
  console.log(`      Sample Hard Q1: "${hardObjRes.quiz.questions[0].question}"`);

  // 1D. Structural Clone Rejection Test ("John loves Mary", "John likes Mary", "John helps Mary")
  const cloneBatch = validateQuizBatch(
    [
      {
        question: 'Choose the correct pronoun: John loves Mary.',
        options: ['her', 'she', 'him', 'he'],
        correctIndex: 0,
        explanation: 'Her replaces Mary.'
      },
      {
        question: 'Choose the correct pronoun: John likes Mary.',
        options: ['her', 'she', 'him', 'he'],
        correctIndex: 0,
        explanation: 'Her replaces Mary.'
      },
      {
        question: 'Choose the correct pronoun: John helps Mary.',
        options: ['her', 'she', 'him', 'he'],
        correctIndex: 0,
        explanation: 'Her replaces Mary.'
      }
    ],
    { subject: 'English Grammar', topic: 'Object Pronouns', difficulty: 'Easy', expectedCount: 3 }
  );
  assert.strictEqual(cloneBatch.passed, false, 'Validator must reject structural clones ("John loves/likes/helps Mary")');
  assert.strictEqual(cloneBatch.report.duplicateQuestions, 2, 'Validator must flag 2 structural duplicates');
  console.log('✓ 1D. Structural Clone Detection verified: "John loves/likes/helps Mary" rejected with 2 duplicates flagged.');

  // 1E. Generate 20 Distinct Questions Test
  const twentyRes = await callAiGenerate({
    category: 'English Grammar',
    topic: 'Object Pronouns',
    difficulty: 'Easy',
    questionCount: 20,
    timePerQuestion: 20,
    generateCover: false
  });
  assert.strictEqual(twentyRes.quiz.questions.length, 20, 'Must generate 20 distinct questions');
  assert.strictEqual(twentyRes.validationReport.duplicateQuestions, 0, '20-question batch must have 0 duplicates');
  console.log(`✓ 1E. Generate 20 Questions Test: 20/20 distinct questions generated (0 duplicates).`);

  // 1F. Generate Same Topic Again -> Fresh Questions
  const repeatTopicRes = await callAiGenerate({
    category: 'English Grammar',
    topic: 'Object Pronouns',
    difficulty: 'Medium',
    questionCount: 5,
    timePerQuestion: 20,
    generateCover: false
  });
  const firstBatchQuestions = new Set(medObjRes.quiz.questions.map((q) => q.question.toLowerCase().trim()));
  const overlapCount = repeatTopicRes.quiz.questions.filter((q) =>
    firstBatchQuestions.has(q.question.toLowerCase().trim())
  ).length;
  assert.strictEqual(overlapCount, 0, 'Generating the same topic again must produce fresh questions');
  console.log('✓ 1F. Generate Same Topic Again Test: 100% fresh questions produced (0 overlap with previous Medium batch).');

  // 1G. Generate Another Topic -> Questions Match New Topic
  const newTopicRes = await callAiGenerate({
    category: 'English Grammar',
    topic: 'Present Perfect Tense',
    difficulty: 'Medium',
    questionCount: 5,
    timePerQuestion: 20,
    generateCover: false
  });
  assert.strictEqual(newTopicRes.quiz.questions.length, 5);
  assert.strictEqual(newTopicRes.validationReport.topicRelevance, '5/5');
  console.log(`✓ 1G. Another Topic ("Present Perfect Tense"): 5/5 topic-relevant questions generated.`);

  // 1H. Single-Question Regeneration + Save AI Quiz & Manual Quiz to Supabase
  const regenQRes = await fetch(`${API_BASE}/api/live-quiz/ai-regenerate-question`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacher.accessToken}`
    },
    body: JSON.stringify({
      category: 'English Grammar',
      topic: 'Object Pronouns',
      difficulty: 'Medium',
      currentQuestion: medObjRes.quiz.questions[0].question,
      questionIndex: 0,
      existingQuestions: medObjRes.quiz.questions.map((q) => q.question),
      timePerQuestion: 20,
      pointsPerQuestion: 20
    })
  });
  const regenQJson = await regenQRes.json();
  assert.strictEqual(regenQJson.success, true, 'Single-question regeneration must succeed');
  assert.notStrictEqual(
    regenQJson.question.question.toLowerCase().trim(),
    medObjRes.quiz.questions[0].question.toLowerCase().trim(),
    'Regenerated question must differ from replaced question'
  );
  console.log(`✓ 1H. Single-question regeneration succeeded: "${regenQJson.question.question}"`);

  // Save the 5-question Medium Object Pronouns quiz to Supabase
  const quizQuestionsToPlay = [regenQJson.question, ...medObjRes.quiz.questions.slice(1, 5)];
  const { data: savedAiQuiz, error: saveAiErr } = await adminSb
    .from('live_quizzes')
    .insert({
      classroom_id: classroomId,
      title: `Object Pronouns Live Sim ${Date.now()}`,
      description: medObjRes.quiz.description,
      category: 'English Grammar',
      topic: 'Object Pronouns',
      difficulty: 'Medium',
      visibility: 'private',
      is_public: false,
      timer_enabled: true,
      timer_seconds: 20,
      points_per_question: 20,
      track_quiz: true,
      cover_image: easyQuiz.coverImageUrl,
      created_by: teacher.userId
    })
    .select()
    .single();
  if (saveAiErr) throw saveAiErr;
  createdQuizIds.push(savedAiQuiz.id);

  const qRows = quizQuestionsToPlay.map((q, idx) => ({
    quiz_id: savedAiQuiz.id,
    question_index: idx,
    question_text: q.question,
    options: q.options,
    correct_index: q.correctIndex,
    duration_sec: 20,
    explanation: q.explanation,
    hint: q.hint || '',
    question_type: q.questionType || 'multiple_choice',
    points: 20
  }));
  const { error: qInsertErr } = await adminSb.from('live_quiz_questions').insert(qRows);
  if (qInsertErr) throw qInsertErr;

  // Also save a Manual Quiz to verify Manual Quiz Creator workflow
  const { data: savedManualQuiz, error: saveManErr } = await adminSb
    .from('live_quizzes')
    .insert({
      classroom_id: classroomId,
      title: `Manual Object Pronouns Check ${Date.now()}`,
      description: 'Teacher-authored manual quiz',
      category: 'English Grammar',
      topic: 'Object Pronouns',
      difficulty: 'Easy',
      visibility: 'private',
      is_public: false,
      timer_enabled: true,
      timer_seconds: 20,
      points_per_question: 100,
      track_quiz: true,
      created_by: teacher.userId
    })
    .select()
    .single();
  if (saveManErr) throw saveManErr;
  createdQuizIds.push(savedManualQuiz.id);
  console.log(`✓ Saved AI Quiz (${savedAiQuiz.id}) and Manual Quiz (${savedManualQuiz.id}) in Supabase.\n`);

  // ============================================================================
  // TEST 2: STUDENT JOIN SIMULATION (5 STUDENTS JOINING LIVE SESSION)
  // ============================================================================
  console.log('--- [Test 2] Student Join Simulation (5 Separate Authenticated Students) ---');
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const nowMs = Date.now();
  const { data: liveSession, error: sessErr } = await adminSb
    .from('live_quiz_sessions')
    .insert({
      classroom_id: classroomId,
      quiz_id: savedAiQuiz.id,
      teacher_id: teacher.userId,
      pin,
      status: 'in_progress',
      current_question_index: 0,
      started_at: new Date(nowMs).toISOString(),
      question_start_ms: nowMs,
      question_duration_sec: 20
    })
    .select()
    .single();
  if (sessErr) throw sessErr;
  createdSessionId = liveSession.id;

  // Each of the 5 students joins using their own RLS-authenticated Supabase client
  for (const st of students) {
    const { error: joinErr } = await st.client.from('live_quiz_participants').upsert(
      {
        session_id: liveSession.id,
        student_id: st.userId,
        display_name: st.fullName,
        score: 0,
        last_earned_points: 0
      },
      { onConflict: 'session_id,student_id' }
    );
    assert.strictEqual(joinErr, null, `Student ${st.fullName} must join cleanly via RLS`);
  }

  // Verify initial host state via teacher client
  const { data: initHostState, error: initStateErr } = await teacher.client.rpc('get_live_quiz_state', {
    p_session_id: liveSession.id
  });
  assert.strictEqual(initStateErr, null, 'get_live_quiz_state must succeed without error');
  assert.strictEqual(initHostState.eligible_count, 5, 'Host must see 5 joined students');
  assert.strictEqual(initHostState.answered_count, 0, 'Initial answered count must be 0');
  assert.strictEqual(initHostState.correct_index, null, 'correct_index must be NULL while question is active');
  console.log(`✓ All 5 students joined session (PIN ${pin}). Host counter: Answered ${initHostState.answered_count} / ${initHostState.eligible_count}.\n`);

  // ============================================================================
  // TEST 3, 4 & 5: LIVE ANSWER SUBMISSION, SPEED BONUS & HOST COUNTER SYNC
  // ============================================================================
  console.log('--- [Tests 3, 4 & 5] Live Answer Submission, Speed Bonus & Real-Time Host Counter ---');

  for (let qIdx = 0; qIdx < 5; qIdx++) {
    const qRow = qRows[qIdx];
    const correctOpt = qRow.correct_index;
    const wrongOpt = (correctOpt + 1) % 4;
    const secondWrongOpt = (correctOpt + 2) % 4;

    // Set controlled question_start_ms so we can test exact response times (1.5s, 6s, 11s, etc.)
    const qStartBaseMs = Date.now() - 1200;
    await adminSb
      .from('live_quiz_sessions')
      .update({
        status: 'in_progress',
        current_question_index: qIdx,
        question_start_ms: qStartBaseMs,
        question_duration_sec: 20,
        correct_answer_index: null
      })
      .eq('id', liveSession.id);

    // Student 1: Fast Correct (~1.2s elapsed -> high speed bonus)
    const { data: s1Res, error: s1Err } = await students[0].client.rpc('submit_live_quiz_answer', {
      p_session_id: liveSession.id,
      p_question_index: qIdx,
      p_selected_option_index: correctOpt,
      p_allow_change: false
    });
    assert.strictEqual(s1Err, null, `Student 1 Q${qIdx + 1} submit must not error`);
    assert.strictEqual(s1Res.ok, true);
    assert.strictEqual(s1Res.is_correct, true);
    assert.strictEqual(s1Res.base_points, 20, 'Base points for 5-Q quiz must be 20');
    assert.ok(s1Res.speed_bonus >= 8 && s1Res.speed_bonus <= 10, `Fast student speed bonus should be 8..10 (got ${s1Res.speed_bonus})`);
    assert.strictEqual(s1Res.points_awarded, s1Res.base_points + s1Res.speed_bonus);
    assert.strictEqual(s1Res.correct_index, null, 'submit_live_quiz_answer must NOT expose correct_index while question is open');
    assert.strictEqual(s1Res.answered_count, 1, 'Answered count must be 1 after Student 1 submits');

    // Simulate 5 seconds later for Student 2 (Medium Speed Correct: ~6.2s elapsed)
    await adminSb
      .from('live_quiz_sessions')
      .update({ question_start_ms: Date.now() - 6200 })
      .eq('id', liveSession.id);

    const { data: s2Res, error: s2Err } = await students[1].client.rpc('submit_live_quiz_answer', {
      p_session_id: liveSession.id,
      p_question_index: qIdx,
      p_selected_option_index: correctOpt,
      p_allow_change: false
    });
    assert.strictEqual(s2Err, null);
    assert.strictEqual(s2Res.ok, true);
    assert.strictEqual(s2Res.is_correct, true);
    assert.ok(
      s2Res.points_awarded < s1Res.points_awarded,
      `Slower correct student (${s2Res.points_awarded}) must earn fewer points than faster correct student (${s1Res.points_awarded})`
    );
    assert.strictEqual(s2Res.answered_count, 2, 'Answered count must be 2 after Student 2 submits');

    // Simulate 12 seconds elapsed for Student 3 (Slower speed; correct on Q0, Q1, Q2; wrong on Q3, Q4)
    await adminSb
      .from('live_quiz_sessions')
      .update({ question_start_ms: Date.now() - 12000 })
      .eq('id', liveSession.id);

    if (qIdx === 0) {
      // On Q1, Student 3 first picks wrongOpt, then changes answer to correctOpt (tests answer change!)
      const { data: s3First } = await students[2].client.rpc('submit_live_quiz_answer', {
        p_session_id: liveSession.id,
        p_question_index: qIdx,
        p_selected_option_index: wrongOpt,
        p_allow_change: false
      });
      assert.strictEqual(s3First.answered_count, 3, 'Answered count becomes 3');

      const { data: s3Changed } = await students[2].client.rpc('submit_live_quiz_answer', {
        p_session_id: liveSession.id,
        p_question_index: qIdx,
        p_selected_option_index: correctOpt,
        p_allow_change: true
      });
      assert.strictEqual(s3Changed.ok, true);
      assert.strictEqual(s3Changed.code, 'CHANGED');
      assert.strictEqual(s3Changed.is_correct, true);
      assert.strictEqual(s3Changed.answered_count, 3, 'Changing answer must NOT inflate answered_count beyond 3');
    } else {
      const s3Choice = qIdx < 3 ? correctOpt : wrongOpt;
      const { data: s3Res } = await students[2].client.rpc('submit_live_quiz_answer', {
        p_session_id: liveSession.id,
        p_question_index: qIdx,
        p_selected_option_index: s3Choice,
        p_allow_change: false
      });
      assert.strictEqual(s3Res.ok, true);
      assert.strictEqual(s3Res.answered_count, 3);
    }

    // Student 4: Correct only on Q0 (at 15s elapsed), wrong on Q1..Q4. Also tests duplicate submission guard on Q0!
    await adminSb
      .from('live_quiz_sessions')
      .update({ question_start_ms: Date.now() - 15000 })
      .eq('id', liveSession.id);

    const s4Choice = qIdx === 0 ? correctOpt : wrongOpt;
    const { data: s4Res } = await students[3].client.rpc('submit_live_quiz_answer', {
      p_session_id: liveSession.id,
      p_question_index: qIdx,
      p_selected_option_index: s4Choice,
      p_allow_change: false
    });
    assert.strictEqual(s4Res.ok, true);
    assert.strictEqual(s4Res.answered_count, 4);

    if (qIdx === 0) {
      // Accidental double submit by Student 4
      const { data: s4Dup } = await students[3].client.rpc('submit_live_quiz_answer', {
        p_session_id: liveSession.id,
        p_question_index: qIdx,
        p_selected_option_index: s4Choice,
        p_allow_change: false
      });
      assert.strictEqual(s4Dup.ok, true);
      assert.strictEqual(s4Dup.code, 'DUPLICATE');
      assert.strictEqual(s4Dup.duplicate, true);
      assert.strictEqual(s4Dup.current_score, s4Res.current_score, 'Duplicate submit must NOT add points twice');
      assert.strictEqual(s4Dup.answered_count, 4, 'Duplicate submit must NOT increment answered_count');
    }

    // Student 5: Submits incorrect answers on all 5 questions (0 points)
    const { data: s5Res } = await students[4].client.rpc('submit_live_quiz_answer', {
      p_session_id: liveSession.id,
      p_question_index: qIdx,
      p_selected_option_index: secondWrongOpt,
      p_allow_change: false
    });
    assert.strictEqual(s5Res.ok, true);
    assert.strictEqual(s5Res.is_correct, false);
    assert.strictEqual(s5Res.points_awarded, 0, 'Incorrect answer must award 0 points');
    assert.strictEqual(s5Res.answered_count, 5, 'All 5 students have now answered');
    assert.strictEqual(s5Res.all_answered, true, 'all_answered flag must be true when 5/5 answered');

    // Host checks live state when 5/5 have answered
    const { data: hostStateAt5 } = await teacher.client.rpc('get_live_quiz_state', {
      p_session_id: liveSession.id
    });
    assert.strictEqual(hostStateAt5.answered_count, 5, `Host must see 5/5 answered on Q${qIdx + 1}`);
    assert.strictEqual(hostStateAt5.eligible_count, 5);

    console.log(
      `✓ Q${qIdx + 1}: 5/5 students answered | S1=${s1Res.points_awarded}pts (+${s1Res.speed_bonus} bonus), S2=${s2Res.points_awarded}pts (+${s2Res.speed_bonus} bonus), S5=0pts | Host Counter: ${hostStateAt5.answered_count}/${hostStateAt5.eligible_count}`
    );

    // Host advances to next question (or finishes after Q5) via advance_live_quiz_question
    const { data: advRes, error: advErr } = await teacher.client.rpc('advance_live_quiz_question', {
      p_session_id: liveSession.id,
      p_expected_index: qIdx
    });
    assert.strictEqual(advErr, null, `advance_live_quiz_question must succeed on Q${qIdx + 1}`);
    assert.strictEqual(advRes.advanced, true, `Question ${qIdx + 1} must advance cleanly`);

    if (qIdx < 4) {
      const { data: nextState } = await teacher.client.rpc('get_live_quiz_state', {
        p_session_id: liveSession.id
      });
      assert.strictEqual(nextState.current_question_index, qIdx + 1);
      assert.strictEqual(nextState.answered_count, 0, `Host counter must reset to 0/5 on Q${qIdx + 2}`);
    } else {
      assert.strictEqual(advRes.finished, true, 'Advancing past Q5 must mark quiz finished');
    }
  }
  console.log('✓ All 5 questions completed with real-time counter resets and speed bonus grading.\n');

  // ============================================================================
  // TEST 7 & 10: FINAL LEADERBOARD & SUPABASE DATA / RLS VERIFICATION
  // ============================================================================
  console.log('--- [Tests 7 & 10] Final Leaderboard & Supabase Database Verification ---');

  const { data: finalLeaderboard, error: finErr } = await teacher.client.rpc(
    'finish_and_award_live_quiz',
    { p_session_id: liveSession.id }
  );
  assert.strictEqual(finErr, null, 'finish_and_award_live_quiz must succeed without error');
  assert.ok(Array.isArray(finalLeaderboard), 'Leaderboard must be an array');
  assert.strictEqual(finalLeaderboard.length, 5, 'All 5 students (including 0-point student) must appear on final leaderboard');

  console.log('Final Leaderboard Rankings:');
  for (const row of finalLeaderboard) {
    console.log(
      `  Rank #${row.final_rank}: ${row.student?.full_name} — ${row.score} pts (${row.correct_count}/${row.total_questions} correct, ${row.accuracy_percentage}%, avg ${row.avg_response_time_ms}ms)`
    );
  }

  // Verify exact expected rank order: Student 1 (1st) > Student 2 (2nd) > Student 3 (3rd) > Student 4 (4th) > Student 5 (5th, 0 pts)
  assert.strictEqual(finalLeaderboard[0].student_id, students[0].userId, '1st place must be fastest all-correct Student 1');
  assert.strictEqual(finalLeaderboard[1].student_id, students[1].userId, '2nd place must be medium-speed all-correct Student 2');
  assert.strictEqual(finalLeaderboard[2].student_id, students[2].userId, '3rd place must be Student 3 (3/5 correct)');
  assert.strictEqual(finalLeaderboard[3].student_id, students[3].userId, '4th place must be Student 4 (1/5 correct)');
  assert.strictEqual(finalLeaderboard[4].student_id, students[4].userId, '5th place must be Student 5 (0/5 correct, 0 pts)');
  assert.strictEqual(finalLeaderboard[4].score, 0, '5th place student must have 0 points');

  // Verify RLS: Student 1 and Teacher can both read all 5 rows from live_quiz_results directly (simulating page refresh)
  const { data: studentRefreshResults, error: sRefErr } = await students[0].client
    .from('live_quiz_results')
    .select('*')
    .eq('session_id', liveSession.id)
    .order('final_rank', { ascending: true });
  assert.strictEqual(sRefErr, null);
  assert.strictEqual(
    studentRefreshResults.length,
    5,
    'Student refreshing final podium must see all 5 participants via RLS'
  );

  // Verify total answer records in live_quiz_answers = exactly 25 (5 students x 5 questions, zero duplicates)
  const { count: answerRowCount } = await adminSb
    .from('live_quiz_answers')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', liveSession.id);
  assert.strictEqual(answerRowCount, 25, `live_quiz_answers must have exactly 25 rows (got ${answerRowCount})`);

  console.log('✓ Final Leaderboard, Refresh Consistency, Unique Answer Constraints (25 rows), and RLS Policies verified!\n');

  console.log('============================================================================');
  console.log(' ALL BACKEND, AI VALIDATION LAYER, AND 5-STUDENT SIMULATION TESTS PASSED!');
  console.log('============================================================================');
} finally {
  // Clean up simulation test users & test rows so production DB stays spotless
  try {
    if (createdSessionId) {
      await adminSb.from('live_quiz_sessions').delete().eq('id', createdSessionId);
    }
    if (createdQuizIds.length > 0) {
      await adminSb.from('live_quizzes').delete().in('id', createdQuizIds);
    }
    for (const uid of createdUserIds) {
      try {
        await adminSb.auth.admin.deleteUser(uid);
      } catch {}
      try {
        await adminSb.from('profiles').delete().eq('id', uid);
      } catch {}
    }
  } catch {}
}
