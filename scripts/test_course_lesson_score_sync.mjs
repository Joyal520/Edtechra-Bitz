// ============================================================================
// EDTECHRA-BITZ: Course Studio Score -> Classroom Leaderboard Sync Tests
// Runs the REAL completeCourseLessonAndAwardPoints engine against an in-memory
// Supabase-compatible mock (with the classroom_points unique idempotency index
// and async interleaving to exercise concurrency).
//
// Usage: node scripts/test_course_lesson_score_sync.mjs
// ============================================================================

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  completeCourseLessonAndAwardPoints,
  backfillMissingCourseLessonPoints,
  computeLessonScoreFromAttempts,
  clampQuestionPoints
} from '../server/courseStudioService.mjs';

// ---------------------------------------------------------------------------
// Minimal in-memory Supabase mock
// ---------------------------------------------------------------------------
const UNIQUE_KEYS = {
  classroom_points: [['classroom_id', 'student_id', 'source_type', 'source_id']],
  course_episode_progress: [['enrollment_id', 'episode_id']],
  course_enrollments: [['classroom_assignment_id', 'student_id']],
  classroom_members: [['classroom_id', 'profile_id']]
};

const tick = () => new Promise(r => setImmediate(r));

class Query {
  constructor(db, table) {
    this.db = db; this.table = table; this.filters = []; this.op = 'select';
    this.payload = null; this.returning = false; this.singleMode = null;
    this.orders = []; this.limitN = null; this.onConflict = null;
  }
  select() { if (this.op === 'select') this.op = 'select'; else this.returning = true; return this; }
  insert(p) { this.op = 'insert'; this.payload = p; return this; }
  upsert(p, opts = {}) { this.op = 'upsert'; this.payload = p; this.onConflict = opts.onConflict; return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.filters.push(r => String(r[c]) === String(v)); return this; }
  neq(c, v) { this.filters.push(r => String(r[c]) !== String(v)); return this; }
  lt(c, v) { this.filters.push(r => Number(r[c]) < Number(v)); return this; }
  in(c, vs) { const s = new Set(vs.map(String)); this.filters.push(r => s.has(String(r[c]))); return this; }
  order(c, { ascending = true } = {}) { this.orders.push([c, ascending]); return this; }
  limit(n) { this.limitN = n; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }
  single() { this.singleMode = 'single'; return this; }
  then(res, rej) { return this.exec().then(res, rej); }

  rows() { return (this.db.tables[this.table] ||= []); }
  match(r) { return this.filters.every(f => f(r)); }
  violates(row, ignoreId = null) {
    for (const cols of UNIQUE_KEYS[this.table] || []) {
      if (cols.some(c => row[c] === null || row[c] === undefined)) continue;
      const clash = this.rows().find(r => r.id !== ignoreId && cols.every(c => String(r[c]) === String(row[c])));
      if (clash) return clash;
    }
    return null;
  }
  finish(data) {
    if (this.singleMode) {
      if (data.length === 0) return this.singleMode === 'maybe' ? { data: null, error: null } : { data: null, error: { message: 'No rows' } };
      if (data.length > 1) return { data: null, error: { message: 'Multiple rows' } };
      return { data: { ...data[0] }, error: null };
    }
    return { data: data.map(r => ({ ...r })), error: null };
  }
  async exec() {
    await tick(); // allow interleaving with concurrent requests
    const all = this.rows();
    if (this.op === 'select') {
      let out = all.filter(r => this.match(r));
      for (const [c, asc] of [...this.orders].reverse()) {
        out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      }
      if (this.limitN != null) out = out.slice(0, this.limitN);
      return this.finish(out);
    }
    if (this.op === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = [];
      for (const item of items) {
        const row = { id: randomUUID(), created_at: new Date(Date.now() + this.db.seq++).toISOString(), ...item };
        if (this.violates(row)) return { data: null, error: { code: '23505', message: `duplicate key value violates unique constraint on ${this.table}` } };
        all.push(row); inserted.push(row);
      }
      return this.returning || this.singleMode ? this.finish(inserted) : { data: null, error: null };
    }
    if (this.op === 'upsert') {
      const row = { ...this.payload };
      const cols = (this.onConflict || '').split(',').map(s => s.trim()).filter(Boolean);
      const existing = cols.length ? all.find(r => cols.every(c => String(r[c]) === String(row[c]))) : null;
      let result;
      if (existing) { Object.assign(existing, row); result = existing; }
      else { result = { id: randomUUID(), created_at: new Date().toISOString(), ...row }; all.push(result); }
      return this.returning || this.singleMode ? this.finish([result]) : { data: null, error: null };
    }
    if (this.op === 'update') {
      const hit = all.filter(r => this.match(r)); // single atomic step (no await between filter & write)
      hit.forEach(r => Object.assign(r, this.payload));
      return this.returning || this.singleMode ? this.finish(hit) : { data: null, error: null };
    }
    if (this.op === 'delete') {
      const keep = all.filter(r => !this.match(r));
      this.db.tables[this.table] = keep;
      return { data: null, error: null };
    }
  }
}

function createDb(seed) {
  const db = { tables: structuredClone(seed), seq: 0 };
  db.from = table => new Query(db, table);
  return db;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const IDS = {
  student: randomUUID(), student2: randomUUID(), teacher: randomUUID(),
  classroom: randomUUID(), course: randomUUID(), unit: randomUUID(), assignment: randomUUID(),
  ep1: randomUUID(), ep2: randomUUID(), ep50: randomUUID()
};

function makeQuestions(episodeId, count, points) {
  return Array.from({ length: count }, (_, i) => ({
    id: randomUUID(), episode_id: episodeId, course_id: IDS.course,
    question_text: `Question ${i + 1}`, points, order_index: i
  }));
}

const Q = {
  ep1: makeQuestions(IDS.ep1, 10, 10),   // max 100
  ep2: makeQuestions(IDS.ep2, 10, 10),   // max 100
  ep50: makeQuestions(IDS.ep50, 5, 10)   // max 50
};

function baseSeed({ existingPoints = [] } = {}) {
  return {
    profiles: [
      { id: IDS.student, full_name: 'Student One', role: 'student' },
      { id: IDS.student2, full_name: 'Student Two', role: 'student' },
      { id: IDS.teacher, full_name: 'Teacher', role: 'teacher' }
    ],
    classrooms: [{ id: IDS.classroom, teacher_id: IDS.teacher }],
    courses: [{ id: IDS.course, teacher_id: IDS.teacher, daily_release_enabled: false }],
    course_units: [{ id: IDS.unit, course_id: IDS.course }],
    course_episodes: [
      { id: IDS.ep1, title: 'Lesson 1', unit_id: IDS.unit, course_id: IDS.course, position: 1 },
      { id: IDS.ep2, title: 'Lesson 2', unit_id: IDS.unit, course_id: IDS.course, position: 2 },
      { id: IDS.ep50, title: 'Lesson 50pt', unit_id: IDS.unit, course_id: IDS.course, position: 3 }
    ],
    course_questions: [...Q.ep1, ...Q.ep2, ...Q.ep50],
    course_classroom_assignments: [{ id: IDS.assignment, course_id: IDS.course, classroom_id: IDS.classroom, status: 'active' }],
    course_enrollments: [],
    course_episode_progress: [],
    course_question_attempts: [],
    course_learning_events: [],
    classroom_members: [],
    ai_classroom_insights: [],
    classroom_points: existingPoints.map(p => ({ id: randomUUID(), created_at: new Date(0).toISOString(), ...p }))
  };
}

async function ensureEnrollment(db, studentId) {
  let e = db.tables.course_enrollments.find(r => r.student_id === studentId);
  if (!e) {
    e = { id: randomUUID(), course_id: IDS.course, classroom_id: IDS.classroom, classroom_assignment_id: IDS.assignment,
      student_id: studentId, status: 'in_progress', total_episodes_count: 3, created_at: new Date().toISOString() };
    db.tables.course_enrollments.push(e);
  }
  return e;
}

let answerClock = Date.now();
/** Simulates a student answering every question of a lesson: first `correct` right, rest wrong. */
async function answerLesson(db, studentId, epKey, correct, { reportedPoints = null, answerCount = null } = {}) {
  const enr = await ensureEnrollment(db, studentId);
  const qs = Q[epKey];
  const n = answerCount ?? qs.length;
  for (let i = 0; i < n; i++) {
    const isCorrect = i < correct;
    db.tables.course_question_attempts.push({
      id: randomUUID(), enrollment_id: enr.id, student_id: studentId, course_id: IDS.course, classroom_id: IDS.classroom,
      episode_id: qs[i].episode_id, question_id: qs[i].id, student_answer: isCorrect ? 'right' : 'wrong',
      is_correct: isCorrect,
      // Server-side /attempt endpoint stores the clamped value:
      points_awarded: clampQuestionPoints(qs[i], isCorrect, reportedPoints ?? qs[i].points),
      answered_at: new Date(answerClock++).toISOString()
    });
  }
}

/** Simulates a retry: previous attempts for the lesson are replaced with a new attempt set. */
async function retryLesson(db, studentId, epKey, correct) {
  const epId = Q[epKey][0].episode_id;
  db.tables.course_question_attempts = db.tables.course_question_attempts.filter(a => !(a.student_id === studentId && a.episode_id === epId));
  await answerLesson(db, studentId, epKey, correct);
}

const complete = (db, studentId, epKey, extra = {}) => completeCourseLessonAndAwardPoints(db, {
  student_id: studentId, course_id: IDS.course, classroom_id: IDS.classroom, episode_id: Q[epKey][0].episode_id, ...extra
});

const totalFor = (db, studentId) => db.tables.classroom_points
  .filter(r => r.classroom_id === IDS.classroom && r.student_id === studentId)
  .reduce((s, r) => s + Number(r.points || 0), 0);

const lessonRows = (db, studentId, epKey) => db.tables.classroom_points
  .filter(r => r.student_id === studentId && r.source_type === 'activity' && r.source_id === Q[epKey][0].episode_id);

const rankingOf = db => {
  const totals = {};
  db.tables.classroom_points.filter(r => r.classroom_id === IDS.classroom)
    .forEach(r => { totals[r.student_id] = (totals[r.student_id] || 0) + Number(r.points || 0); });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([id, pts], i) => ({ id, pts, rank: i + 1 }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS  ${name}`); }
  catch (err) { results.push({ name, ok: false, err }); console.log(`FAIL  ${name}\n      ${err.message}`); }
}

await test('TEST A - 100/100 credits +100', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 10);
  const r = await complete(db, IDS.student, 'ep1');
  assert.equal(r.earned_score, 100); assert.equal(r.max_score, 100);
  assert.equal(r.points_awarded, 100); assert.equal(totalFor(db, IDS.student), 100);
});

await test('TEST B - 70/100 credits +70 (not fixed 10)', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 7);
  const r = await complete(db, IDS.student, 'ep1');
  assert.equal(r.earned_score, 70); assert.equal(r.points_awarded, 70);
  assert.notEqual(r.points_awarded, 10);
  assert.equal(totalFor(db, IDS.student), 70);
  assert.equal(r.completion_bonus_points, 0);
});

await test('TEST C - 60/100 credits +60', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 6);
  const r = await complete(db, IDS.student, 'ep1');
  assert.equal(r.points_awarded, 60); assert.equal(totalFor(db, IDS.student), 60);
});

await test('TEST D - existing 135 + 70/100 = 205', async () => {
  const db = createDb(baseSeed({ existingPoints: [{ classroom_id: IDS.classroom, student_id: IDS.student, points: 135, reason: 'Live quiz', source_type: 'quiz', source_id: randomUUID() }] }));
  await answerLesson(db, IDS.student, 'ep1', 7);
  const r = await complete(db, IDS.student, 'ep1');
  assert.equal(r.previous_points, 135); assert.equal(r.total_classroom_points, 205);
  assert.equal(totalFor(db, IDS.student), 205);
});

await test('TEST E - duplicate completion requests (sequential + concurrent) credit once', async () => {
  const db = createDb(baseSeed({ existingPoints: [{ classroom_id: IDS.classroom, student_id: IDS.student, points: 135, reason: 'Live quiz', source_type: 'quiz', source_id: randomUUID() }] }));
  await answerLesson(db, IDS.student, 'ep1', 7);
  const concurrent = await Promise.all([complete(db, IDS.student, 'ep1'), complete(db, IDS.student, 'ep1'), complete(db, IDS.student, 'ep1')]);
  const again = await complete(db, IDS.student, 'ep1');
  const totalAwarded = concurrent.reduce((s, r) => s + r.points_awarded, 0) + again.points_awarded;
  assert.equal(totalAwarded, 70);
  assert.equal(again.points_awarded, 0); assert.equal(again.already_awarded, true);
  assert.equal(lessonRows(db, IDS.student, 'ep1').length, 1);
  assert.equal(totalFor(db, IDS.student), 205);
  const rewardEvents = db.tables.course_learning_events.filter(e => e.event_type === 'lesson_completion_reward');
  assert.equal(rewardEvents.length, 1);
});

await test('TEST F - refresh / reopen / backfill does not increase score', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 7);
  await complete(db, IDS.student, 'ep1');
  await backfillMissingCourseLessonPoints(db, IDS.classroom); // runs on every GET student progress
  await backfillMissingCourseLessonPoints(db, IDS.classroom);
  const reopen = await complete(db, IDS.student, 'ep1');
  assert.equal(reopen.points_awarded, 0);
  assert.equal(totalFor(db, IDS.student), 70);
});

await test('TEST G - retry 40 -> 70 credits +30 (lesson total 70, not 110)', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 4);
  const r1 = await complete(db, IDS.student, 'ep1');
  assert.equal(r1.points_awarded, 40);
  await retryLesson(db, IDS.student, 'ep1', 7);
  const r2 = await complete(db, IDS.student, 'ep1');
  assert.equal(r2.points_awarded, 30); assert.equal(r2.credited_lesson_points, 70);
  assert.equal(r2.credit_action, 'improved_score');
  assert.equal(lessonRows(db, IDS.student, 'ep1').length, 1);
  assert.equal(totalFor(db, IDS.student), 70);
});

await test('TEST H - retry 70 -> 60 credits +0 (stays 70)', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 7);
  await complete(db, IDS.student, 'ep1');
  await retryLesson(db, IDS.student, 'ep1', 6);
  const r = await complete(db, IDS.student, 'ep1');
  assert.equal(r.points_awarded, 0); assert.equal(r.credited_lesson_points, 70);
  assert.equal(totalFor(db, IDS.student), 70);
});

await test('TEST I - Lesson 1 (70) + Lesson 2 (60) = 130, separate records', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 7);
  await answerLesson(db, IDS.student, 'ep2', 6);
  await complete(db, IDS.student, 'ep1');
  await complete(db, IDS.student, 'ep2');
  assert.equal(lessonRows(db, IDS.student, 'ep1').length, 1);
  assert.equal(lessonRows(db, IDS.student, 'ep2').length, 1);
  assert.equal(lessonRows(db, IDS.student, 'ep1')[0].points, 70);
  assert.equal(lessonRows(db, IDS.student, 'ep2')[0].points, 60);
  assert.equal(totalFor(db, IDS.student), 130);
});

await test('TEST J - simultaneous lesson (+70) and quiz (+20) on 135 -> 225', async () => {
  const db = createDb(baseSeed({ existingPoints: [{ classroom_id: IDS.classroom, student_id: IDS.student, points: 135, reason: 'Earlier', source_type: 'quiz', source_id: randomUUID() }] }));
  await answerLesson(db, IDS.student, 'ep1', 7);
  const quizAward = db.from('classroom_points').insert({ classroom_id: IDS.classroom, student_id: IDS.student, points: 20, reason: 'Live Quiz', source_type: 'quiz', source_id: randomUUID() });
  await Promise.all([complete(db, IDS.student, 'ep1'), quizAward]);
  assert.equal(totalFor(db, IDS.student), 225);
});

await test('TEST K - ranking recalculated; other students untouched', async () => {
  const db = createDb(baseSeed({ existingPoints: [
    { classroom_id: IDS.classroom, student_id: IDS.student, points: 135, reason: 'Quiz', source_type: 'quiz', source_id: randomUUID() },
    { classroom_id: IDS.classroom, student_id: IDS.student2, points: 150, reason: 'Exam', source_type: 'exam', source_id: randomUUID() }
  ] }));
  assert.equal(rankingOf(db)[0].id, IDS.student2);
  await answerLesson(db, IDS.student, 'ep1', 7);
  await complete(db, IDS.student, 'ep1');
  const ranking = rankingOf(db);
  assert.equal(ranking[0].id, IDS.student); assert.equal(ranking[0].pts, 205);
  assert.equal(ranking[1].id, IDS.student2); assert.equal(ranking[1].pts, 150);
});

await test('TEST L - teacher preview awards nothing', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.teacher, 'ep1', 10);
  const r = await complete(db, IDS.teacher, 'ep1');
  assert.equal(r.is_preview, true); assert.equal(r.points_awarded, 0);
  assert.equal(db.tables.classroom_points.length, 0);
  assert.equal(db.tables.course_episode_progress.length, 0);
});

await test('EXTRA - 35/50 lesson credits 35 (actual max, not percentage)', async () => {
  const db = createDb(baseSeed());
  // 35 of 50: 3 full questions + one partial-credit 5 pts
  await answerLesson(db, IDS.student, 'ep50', 3, { answerCount: 3 });
  const enr = db.tables.course_enrollments[0];
  db.tables.course_question_attempts.push({ id: randomUUID(), enrollment_id: enr.id, student_id: IDS.student, episode_id: IDS.ep50, question_id: Q.ep50[3].id, is_correct: true, points_awarded: 5, answered_at: new Date(answerClock++).toISOString() });
  const r = await complete(db, IDS.student, 'ep50');
  assert.equal(r.max_score, 50); assert.equal(r.earned_score, 35); assert.equal(r.points_awarded, 35);
});

await test('EXTRA - client-submitted score/max_score are ignored', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 7);
  const r = await complete(db, IDS.student, 'ep1', { score: 9999, max_score: 1, lesson_points: 500 });
  assert.equal(r.points_awarded, 70); assert.equal(totalFor(db, IDS.student), 70);
});

await test('EXTRA - inflated per-question points clamped; unanswered earn 0', async () => {
  const db = createDb(baseSeed());
  // Only 5 of 10 answered, client claims 999 points each
  await answerLesson(db, IDS.student, 'ep1', 5, { reportedPoints: 999, answerCount: 5 });
  const r = await complete(db, IDS.student, 'ep1');
  assert.equal(r.earned_score, 50); assert.equal(r.answered_questions, 5); assert.equal(r.points_awarded, 50);
  // Even if a raw DB row were inflated, the engine clamps to the question's value
  const s = computeLessonScoreFromAttempts(Q.ep1, [{ question_id: Q.ep1[0].id, is_correct: true, points_awarded: 999 }]);
  assert.equal(s.earnedScore, 10); assert.equal(s.maxScore, 100);
});

await test('EXTRA - legacy fixed-10 row is re-synced to earned score (+60, never reduced)', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 7);
  const enr = db.tables.course_enrollments[0];
  db.tables.course_episode_progress.push({ id: randomUUID(), enrollment_id: enr.id, student_id: IDS.student, course_id: IDS.course, classroom_id: IDS.classroom, episode_id: IDS.ep1, status: 'completed', score: 70, max_score: 100, completed_at: new Date().toISOString() });
  db.tables.classroom_points.push({ id: randomUUID(), classroom_id: IDS.classroom, student_id: IDS.student, points: 10, reason: 'Completed Lesson: Lesson 1', source_type: 'activity', source_id: IDS.ep1, created_at: new Date(0).toISOString() });
  await backfillMissingCourseLessonPoints(db, IDS.classroom);
  assert.equal(lessonRows(db, IDS.student, 'ep1').length, 1);
  assert.equal(lessonRows(db, IDS.student, 'ep1')[0].points, 70);
  assert.equal(totalFor(db, IDS.student), 70);
});

await test('EXTRA - 0/100 completes lesson but credits 0 (no fixed completion reward)', async () => {
  const db = createDb(baseSeed());
  await answerLesson(db, IDS.student, 'ep1', 0);
  const r = await complete(db, IDS.student, 'ep1');
  assert.equal(r.points_awarded, 0); assert.equal(r.already_awarded, false);
  assert.equal(db.tables.course_episode_progress[0].status, 'completed');
  assert.equal(totalFor(db, IDS.student), 0);
});

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests passed`);
process.exit(failed.length ? 1 : 0);
