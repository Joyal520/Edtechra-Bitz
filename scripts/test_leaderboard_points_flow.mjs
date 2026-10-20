// ============================================================================
// EDTECHRA BITZ — LEADERBOARD POINTS & LESSON COMPLETION VERIFICATION SUITE
// Tests all cases A–H:
// A. New student completes a lesson -> points added (+10).
// B. Existing student already has leaderboard points (135) -> +10 = 145.
// C. Student refreshes completion page -> no duplicate points.
// D. Student opens the completed lesson again -> no duplicate points.
// E. Student clicks completion/continue multiple times -> no duplicate points.
// F. Two requests arrive almost simultaneously -> reward granted only once.
// G. Student completes another lesson -> only the new lesson reward is added.
// H. Existing leaderboard ranking changes correctly & preserves existing sources.
// ============================================================================

import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  buildLessonRewardKey,
  completeCourseLessonAndAwardPoints,
  backfillMissingCourseLessonPoints
} from '../server/courseStudioService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('===================================================================');
console.log('  EDTECHRA BITZ: COURSE LESSON -> LEADERBOARD POINTS TEST SUITE    ');
console.log('===================================================================');

let passed = 0;
let failed = 0;

function check(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${label}`);
    failed++;
  }
}

/**
 * Deterministic in-memory mock of Supabase tables to test all atomic edge cases,
 * race conditions, ranking recalculations, and multi-source point preservation
 * without polluting production student scores.
 */
function createMockSupabase(initialState = {}) {
  const db = {
    classrooms: initialState.classrooms || [
      { id: 'class-1', teacher_id: 'teacher-1' }
    ],
    profiles: initialState.profiles || [
      { id: 'teacher-1', full_name: 'Teacher One', email: 'teacher@edtechra.com', role: 'teacher' },
      { id: 'student-new', full_name: 'New Learner', email: 'newlearner@gmail.com', role: 'student' },
      { id: 'student-joy', full_name: 'Joy', email: 'j52905349@gmail.com', role: 'student' },
      { id: 'student-rival', full_name: 'Rival Student', email: 'rival@gmail.com', role: 'student' }
    ],
    classroom_members: initialState.classroom_members || [
      { classroom_id: 'class-1', profile_id: 'teacher-1', role: 'teacher', status: 'active', display_name: null },
      { classroom_id: 'class-1', profile_id: 'student-new', role: 'student', status: 'active', display_name: null },
      { classroom_id: 'class-1', profile_id: 'student-joy', role: 'student', status: 'active', display_name: 'Joy' },
      { classroom_id: 'class-1', profile_id: 'student-rival', role: 'student', status: 'active', display_name: 'Rival Student' }
    ],
    course_classroom_assignments: initialState.course_classroom_assignments || [
      { id: 'assign-1', course_id: 'course-1', classroom_id: 'class-1', status: 'active' }
    ],
    course_episodes: initialState.course_episodes || [
      { id: 'ep-1', course_id: 'course-1', unit_id: 'unit-1', title: 'Lesson 1: Introduction', position: 1, order_index: 0 },
      { id: 'ep-2', course_id: 'course-1', unit_id: 'unit-1', title: 'Lesson 2: Deep Dive', position: 2, order_index: 1 },
      { id: 'ep-3', course_id: 'course-1', unit_id: 'unit-1', title: 'Lesson 3: Mastery', position: 3, order_index: 2 }
    ],
    course_enrollments: initialState.course_enrollments || [],
    course_episode_progress: initialState.course_episode_progress || [],
    classroom_points: initialState.classroom_points || [
      // Joy starts with 135 points from existing sources (OCR activity + Task assignment)
      {
        id: 'pt-joy-1',
        classroom_id: 'class-1',
        student_id: 'student-joy',
        points: 65,
        reason: 'AI OCR: Paragraph Writing',
        source_type: 'activity',
        source_id: 'ocr-eval-1',
        created_at: '2026-10-01T10:00:00.000Z'
      },
      {
        id: 'pt-joy-2',
        classroom_id: 'class-1',
        student_id: 'student-joy',
        points: 70,
        reason: 'Completed task: My pet dog',
        source_type: 'assignment',
        source_id: 'task-sub-1',
        created_at: '2026-10-02T10:00:00.000Z'
      },
      // Rival starts with 140 points from Live Quiz + Exam (currently Rank #1 above Joy's 135)
      {
        id: 'pt-rival-1',
        classroom_id: 'class-1',
        student_id: 'student-rival',
        points: 90,
        reason: 'Live Quiz (Rank #1)',
        source_type: 'live_quiz',
        source_id: 'quiz-res-1',
        created_at: '2026-10-01T12:00:00.000Z'
      },
      {
        id: 'pt-rival-2',
        classroom_id: 'class-1',
        student_id: 'student-rival',
        points: 50,
        reason: 'Exam: Grammar Assessment',
        source_type: 'exam',
        source_id: 'exam-1',
        created_at: '2026-10-02T12:00:00.000Z'
      }
    ],
    course_learning_events: initialState.course_learning_events || [],
    ai_classroom_insights: []
  };

  let idCounter = 1;

  function makeQuery(tableName) {
    let filters = [];
    let inFilters = [];
    let orderSpecs = [];
    let limitCount = null;
    let op = 'select';
    let payloadData = null;
    let conflictCols = null;

    const applyFilters = (rows) => {
      return rows.filter(r => {
        for (const [col, val] of filters) {
          if (r[col] !== val) return false;
        }
        for (const [col, vals] of inFilters) {
          if (!vals.includes(r[col])) return false;
        }
        return true;
      });
    };

    const execute = async () => {
      // Simulate realistic network/database latency (5ms) to test concurrent race conditions
      await new Promise(r => setTimeout(r, 5));
      const table = db[tableName] || [];

      if (op === 'select') {
        let matched = [...applyFilters(table)];
        for (const { col, ascending } of orderSpecs) {
          matched.sort((a, b) => {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
            return 0;
          });
        }
        if (limitCount !== null) {
          matched = matched.slice(0, limitCount);
        }
        return { data: matched, error: null };
      }

      if (op === 'insert') {
        const items = Array.isArray(payloadData) ? payloadData : [payloadData];
        const inserted = items.map(item => {
          const row = {
            id: item.id || `${tableName}-${idCounter++}`,
            created_at: item.created_at || new Date().toISOString(),
            ...item
          };
          table.push(row);
          return row;
        });
        return { data: Array.isArray(payloadData) ? inserted : inserted[0], error: null };
      }

      if (op === 'upsert') {
        const items = Array.isArray(payloadData) ? payloadData : [payloadData];
        const cols = (conflictCols || 'id').split(',').map(s => s.trim());
        const upserted = items.map(item => {
          const existingIdx = table.findIndex(r => cols.every(c => r[c] === item[c]));
          if (existingIdx >= 0) {
            table[existingIdx] = { ...table[existingIdx], ...item };
            return table[existingIdx];
          } else {
            const row = {
              id: item.id || `${tableName}-${idCounter++}`,
              created_at: item.created_at || new Date().toISOString(),
              ...item
            };
            table.push(row);
            return row;
          }
        });
        return { data: Array.isArray(payloadData) ? upserted : upserted[0], error: null };
      }

      if (op === 'update') {
        const matched = applyFilters(table);
        matched.forEach(r => Object.assign(r, payloadData));
        return { data: matched[0] || null, error: null };
      }

      if (op === 'delete') {
        const toDelete = new Set(applyFilters(table));
        db[tableName] = table.filter(r => !toDelete.has(r));
        return { data: null, error: null };
      }

      return { data: null, error: null };
    };

    const builder = {
      select() { return builder; },
      insert(data) { op = 'insert'; payloadData = data; return builder; },
      upsert(data, opts) { op = 'upsert'; payloadData = data; conflictCols = opts?.onConflict; return builder; },
      update(data) { op = 'update'; payloadData = data; return builder; },
      delete() { op = 'delete'; return builder; },
      eq(col, val) { filters.push([col, val]); return builder; },
      in(col, vals) { inFilters.push([col, vals]); return builder; },
      order(col, opts = {}) { orderSpecs.push({ col, ascending: opts.ascending !== false }); return builder; },
      limit(n) { limitCount = n; return builder; },
      async maybeSingle() {
        const res = await execute();
        const row = Array.isArray(res.data) ? (res.data[0] || null) : res.data;
        return { data: row, error: res.error };
      },
      async single() {
        const res = await execute();
        const row = Array.isArray(res.data) ? (res.data[0] || null) : res.data;
        return { data: row, error: res.error };
      },
      then(onFulfilled, onRejected) {
        return execute().then(onFulfilled, onRejected);
      }
    };

    return builder;
  }

  return {
    db,
    from(tableName) {
      return makeQuery(tableName);
    }
  };
}

function computeMockLeaderboard(mockSb, classroomId) {
  const members = mockSb.db.classroom_members.filter(
    m => m.classroom_id === classroomId && m.status === 'active' && m.role === 'student'
  );
  const pointsRows = mockSb.db.classroom_points.filter(p => p.classroom_id === classroomId);
  const pointsMap = {};
  for (const p of pointsRows) {
    pointsMap[p.student_id] = (pointsMap[p.student_id] || 0) + Number(p.points || 0);
  }
  const entries = members.map(m => {
    const prof = mockSb.db.profiles.find(p => p.id === m.profile_id);
    return {
      student_id: m.profile_id,
      name: prof?.full_name || m.display_name || 'Student',
      points: pointsMap[m.profile_id] || 0,
      rank: 0
    };
  });
  entries.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

async function runTests() {
  const mockSb = createMockSupabase();

  // --------------------------------------------------------------------------
  // CASE A: New student completes a lesson -> points added
  // --------------------------------------------------------------------------
  console.log('\n--- Case A: New student completes a lesson ---');
  const resA = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-new',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-1',
    score: 100,
    max_score: 100,
    time_spent_seconds: 300
  });

  check(resA.success === true, 'Lesson completion succeeds for new student');
  check(resA.already_awarded === false, 'First completion has already_awarded = false');
  check(resA.previous_points === 0, `New student had 0 previous points: ${resA.previous_points}`);
  check(resA.points_awarded === 10, `New student awarded +10 Bitz points: ${resA.points_awarded}`);
  check(resA.total_classroom_points === 10, `New student leaderboard total is 10: ${resA.total_classroom_points}`);
  check(
    resA.reward_transaction?.reward_type === 'lesson_completion' &&
    resA.reward_transaction?.user_id === 'student-new' &&
    resA.reward_transaction?.course_id === 'course-1' &&
    resA.reward_transaction?.unit_id === 'unit-1' &&
    resA.reward_transaction?.lesson_id === 'ep-1' &&
    resA.reward_transaction?.points === 10 &&
    resA.reward_transaction?.reward_key === buildLessonRewardKey({
      user_id: 'student-new',
      course_id: 'course-1',
      unit_id: 'unit-1',
      lesson_id: 'ep-1'
    }),
    'Reward transaction record contains user_id, course_id, unit_id, lesson_id, points, reward_type="lesson_completion", and unique reward_key'
  );

  // --------------------------------------------------------------------------
  // CASE B: Existing student already has leaderboard points (Joy: 135 pts -> 145 pts)
  // --------------------------------------------------------------------------
  console.log('\n--- Case B: Existing student (Joy — 135 pts) completes Lesson 1 (+10 pts -> 145 pts) ---');
  const leaderboardBeforeB = computeMockLeaderboard(mockSb, 'class-1');
  const joyBefore = leaderboardBeforeB.find(e => e.student_id === 'student-joy');
  check(joyBefore?.points === 135 && joyBefore?.rank === 2, `Before lesson: Joy has 135 pts at Rank #2 (behind Rival with 140 pts)`);

  const resB = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-joy',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-1',
    score: 100,
    max_score: 100,
    time_spent_seconds: 600
  });

  check(resB.previous_points === 135, `Joy previous points = 135: ${resB.previous_points}`);
  check(resB.points_awarded === 10, `Joy lesson reward = +10: ${resB.points_awarded}`);
  check(resB.total_classroom_points === 145, `Joy new leaderboard total = 145 (135 + 10): ${resB.total_classroom_points}`);

  // --------------------------------------------------------------------------
  // CASE C: Student refreshes completion page -> no duplicate points
  // --------------------------------------------------------------------------
  console.log('\n--- Case C: Student refreshes completion page -> no duplicate points ---');
  const resC = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-joy',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-1',
    score: 100,
    max_score: 100
  });

  check(resC.already_awarded === true, 'Refresh triggers already_awarded = true');
  check(resC.points_awarded === 0, `Refresh awards 0 points: ${resC.points_awarded}`);
  check(resC.total_classroom_points === 145, `Joy total remains 145 after refresh: ${resC.total_classroom_points}`);

  // --------------------------------------------------------------------------
  // CASE D: Student opens the completed lesson again -> no duplicate points
  // --------------------------------------------------------------------------
  console.log('\n--- Case D: Student opens completed lesson again -> no duplicate points ---');
  const resD = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-joy',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-1',
    score: 100,
    max_score: 100
  });

  check(resD.already_awarded === true && resD.points_awarded === 0, 'Reopening completed lesson awards 0 additional points');
  check(resD.total_classroom_points === 145, `Joy total remains 145: ${resD.total_classroom_points}`);

  // --------------------------------------------------------------------------
  // CASE E: Student clicks completion/continue multiple times -> no duplicate points
  // --------------------------------------------------------------------------
  console.log('\n--- Case E: Student clicks completion/continue 5 times -> no duplicate points ---');
  for (let click = 1; click <= 5; click++) {
    const clickRes = await completeCourseLessonAndAwardPoints(mockSb, {
      student_id: 'student-joy',
      course_id: 'course-1',
      classroom_id: 'class-1',
      episode_id: 'ep-1'
    });
    assert.strictEqual(clickRes.points_awarded, 0);
    assert.strictEqual(clickRes.total_classroom_points, 145);
  }
  check(true, '5 repeated clicks on Complete/Continue awarded 0 duplicate points (total stays 145)');

  // --------------------------------------------------------------------------
  // CASE F: Simultaneous requests (Race Condition) -> reward granted ONLY ONCE
  // --------------------------------------------------------------------------
  console.log('\n--- Case F: Simultaneous requests for Lesson 2 -> reward granted strictly once ---');
  const concurrentResults = await Promise.all([
    completeCourseLessonAndAwardPoints(mockSb, {
      student_id: 'student-joy',
      course_id: 'course-1',
      classroom_id: 'class-1',
      episode_id: 'ep-2',
      score: 90,
      max_score: 100
    }),
    completeCourseLessonAndAwardPoints(mockSb, {
      student_id: 'student-joy',
      course_id: 'course-1',
      classroom_id: 'class-1',
      episode_id: 'ep-2',
      score: 90,
      max_score: 100
    }),
    completeCourseLessonAndAwardPoints(mockSb, {
      student_id: 'student-joy',
      course_id: 'course-1',
      classroom_id: 'class-1',
      episode_id: 'ep-2',
      score: 90,
      max_score: 100
    })
  ]);

  const awardedCount = concurrentResults.filter(r => r.points_awarded > 0 && !r.already_awarded).length;
  const skippedCount = concurrentResults.filter(r => r.points_awarded === 0 && r.already_awarded).length;
  check(awardedCount === 1, `Out of 3 simultaneous requests, exactly 1 granted points: ${awardedCount}`);
  check(skippedCount === 2, `Out of 3 simultaneous requests, 2 were blocked as already_awarded: ${skippedCount}`);
  check(
    concurrentResults[2].total_classroom_points === 155,
    `Joy total after concurrent Lesson 2 requests is 155 (145 + 10): ${concurrentResults[2].total_classroom_points}`
  );

  // --------------------------------------------------------------------------
  // CASE G: Student completes another lesson (Lesson 3) -> only new lesson reward added
  // --------------------------------------------------------------------------
  console.log('\n--- Case G: Student completes another lesson (Lesson 3) -> +10 added (155 -> 165) ---');
  const resG = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-joy',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-3',
    score: 100,
    max_score: 100
  });
  check(resG.already_awarded === false && resG.points_awarded === 10, 'Lesson 3 awards +10 points');
  check(resG.total_classroom_points === 165, `Joy total after Lesson 3 is 165 (155 + 10): ${resG.total_classroom_points}`);

  // --------------------------------------------------------------------------
  // CASE H: Existing leaderboard ranking recalculates & existing sources preserved
  // --------------------------------------------------------------------------
  console.log('\n--- Case H: Leaderboard ranking recalculation & existing sources check ---');
  const leaderboardAfter = computeMockLeaderboard(mockSb, 'class-1');
  const joyAfter = leaderboardAfter.find(e => e.student_id === 'student-joy');
  const rivalAfter = leaderboardAfter.find(e => e.student_id === 'student-rival');
  const newLearnerAfter = leaderboardAfter.find(e => e.student_id === 'student-new');

  check(joyAfter?.rank === 1 && joyAfter?.points === 165, `Joy moved from Rank #2 (135 pts) to Rank #1 (165 pts)`);
  check(rivalAfter?.rank === 2 && rivalAfter?.points === 140, `Rival moved to Rank #2 with existing 140 pts (Live Quiz + Exam intact)`);
  check(newLearnerAfter?.rank === 3 && newLearnerAfter?.points === 10, `New Learner is Rank #3 with 10 pts`);

  // Verify Live DB Backfill for any unrewarded completed lessons in Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    console.log('\n--- Live DB Sync: Checking & backfilling any unrewarded completed lessons ---');
    const liveSb = createClient(supabaseUrl, supabaseKey);
    const firstPass = await backfillMissingCourseLessonPoints(liveSb);
    const secondPass = await backfillMissingCourseLessonPoints(liveSb);
    check(typeof firstPass.backfilledCount === 'number', `First pass backfilled ${firstPass.backfilledCount} unrewarded student lesson(s)`);
    check(secondPass.backfilledCount === 0, `Second pass backfilled 0 lessons (strictly idempotent): ${secondPass.backfilledCount}`);
  }

  console.log('\n===================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unexpected test runner error:', err);
  process.exit(1);
});
