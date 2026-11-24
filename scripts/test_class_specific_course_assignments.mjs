// ============================================================================
// VERIFICATION SUITE: CLASS-SPECIFIC COURSE ASSIGNMENT ARCHITECTURE
// Tests independent per-class settings, non-clobbering edits, pre-migration
// fallback, backend completion enforcement, dailyReleaseEngine batching,
// and UI/endpoint structural invariants.
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';
import {
  resolveClassAssignmentConfig,
  upsertClassAssignmentSafe,
  completeCourseLessonAndAwardPoints
} from '../server/courseStudioService.mjs';

dotenv.config({ path: '.env.local' });

console.log('===================================================================');
console.log('  EDTECHRA: CLASS-SPECIFIC COURSE ASSIGNMENTS VERIFICATION SUITE   ');
console.log('===================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}:`, err.message);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}:`, err.message);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// In-Memory Stateful Mock Supabase supporting multiple classrooms & pre-migration mode
// -----------------------------------------------------------------------------
function createMultiClassMockSupabase(options = {}) {
  const simulateMissingColumns = Boolean(options.simulateMissingColumns);

  const store = {
    course: options.course || {
      id: 'course-born-sky',
      title: 'Born for the Sky',
      teacher_id: 'teacher-1',
      status: 'published',
      daily_release_enabled: true, // Intentionally true globally to prove class overrides win
      daily_release_interval_days: 3,
      course_start_date: '2026-01-01',
      course_timezone: 'Asia/Colombo'
    },
    classrooms: {
      'class-a': { id: 'class-a', title: 'Class A', teacher_id: 'teacher-1' },
      'class-b': { id: 'class-b', title: 'Class B', teacher_id: 'teacher-1' },
      'class-c': { id: 'class-c', title: 'Class C', teacher_id: 'teacher-1' }
    },
    profiles: {
      'student-1': { id: 'student-1', full_name: 'Student One', role: 'student' }
    },
    episodes: {
      'ep-1': { id: 'ep-1', title: 'Lesson 1', unit_id: 'unit-1', course_id: 'course-born-sky', position: 1, order_index: 0 },
      'ep-2': { id: 'ep-2', title: 'Lesson 2', unit_id: 'unit-1', course_id: 'course-born-sky', position: 2, order_index: 1 },
      'ep-3': { id: 'ep-3', title: 'Lesson 3', unit_id: 'unit-1', course_id: 'course-born-sky', position: 3, order_index: 2 },
      'ep-4': { id: 'ep-4', title: 'Lesson 4', unit_id: 'unit-1', course_id: 'course-born-sky', position: 4, order_index: 3 }
    },
    questions: options.questions || [],
    assignments: [...(options.assignments || [])],
    enrollments: [...(options.enrollments || [])],
    progress: [...(options.progress || [])],
    points: [...(options.points || [])],
    attempts: [],
    learning_events: [],
    members: []
  };

  let idSeq = 1;
  const nextId = (prefix) => `${prefix}-${idSeq++}`;

  const client = {
    store,
    from(table) {
      return {
        select(_cols) {
          const filters = { eq: {}, neq: {} };
          const chain = {
            eq(col, val) {
              filters.eq[col] = val;
              return chain;
            },
            neq(col, val) {
              filters.neq[col] = val;
              return chain;
            },
            order() { return chain; },
            limit() { return chain; },
            async maybeSingle() {
              if (table === 'courses') return { data: store.course };
              if (table === 'classrooms') return { data: store.classrooms[filters.eq.id] || null };
              if (table === 'profiles') return { data: store.profiles[filters.eq.id] || null };
              if (table === 'course_episodes') return { data: store.episodes[filters.eq.id] || null };
              if (table === 'course_classroom_assignments') {
                const match = store.assignments.find(a =>
                  (!filters.eq.course_id || a.course_id === filters.eq.course_id) &&
                  (!filters.eq.classroom_id || a.classroom_id === filters.eq.classroom_id) &&
                  (!filters.eq.id || a.id === filters.eq.id)
                );
                return { data: match || null };
              }
              if (table === 'course_enrollments') {
                const match = store.enrollments.find(e =>
                  (!filters.eq.classroom_assignment_id || e.classroom_assignment_id === filters.eq.classroom_assignment_id) &&
                  (!filters.eq.course_id || e.course_id === filters.eq.course_id) &&
                  (!filters.eq.classroom_id || e.classroom_id === filters.eq.classroom_id) &&
                  (!filters.eq.student_id || e.student_id === filters.eq.student_id)
                );
                return { data: match || null };
              }
              if (table === 'course_episode_progress') {
                const match = store.progress.find(p =>
                  (!filters.eq.enrollment_id || p.enrollment_id === filters.eq.enrollment_id) &&
                  (!filters.eq.episode_id || p.episode_id === filters.eq.episode_id)
                );
                return { data: match || null };
              }
              return { data: null };
            },
            async single() {
              return this.maybeSingle();
            },
            then(resolve) {
              if (table === 'course_episodes') {
                return resolve({ data: Object.values(store.episodes) });
              }
              if (table === 'course_classroom_assignments') {
                const list = store.assignments.filter(a =>
                  (!filters.eq.course_id || a.course_id === filters.eq.course_id) &&
                  (!filters.eq.classroom_id || a.classroom_id === filters.eq.classroom_id)
                );
                return resolve({ data: list });
              }
              if (table === 'course_episode_progress') {
                const list = store.progress.filter(p => {
                  if (filters.eq.enrollment_id && p.enrollment_id !== filters.eq.enrollment_id) return false;
                  if (filters.eq.status && p.status !== filters.eq.status) return false;
                  if (filters.neq.episode_id && p.episode_id === filters.neq.episode_id) return false;
                  return true;
                });
                return resolve({ data: list });
              }
              if (table === 'course_questions') {
                const list = store.questions.filter(q =>
                  (!filters.eq.episode_id || q.episode_id === filters.eq.episode_id)
                );
                return resolve({ data: list });
              }
              if (table === 'course_question_attempts') {
                const list = store.attempts.filter(a =>
                  (!filters.eq.enrollment_id || a.enrollment_id === filters.eq.enrollment_id) &&
                  (!filters.eq.episode_id || a.episode_id === filters.eq.episode_id)
                );
                return resolve({ data: list });
              }
              if (table === 'classroom_points') {
                const list = store.points.filter(p =>
                  (!filters.eq.classroom_id || p.classroom_id === filters.eq.classroom_id) &&
                  (!filters.eq.student_id || p.student_id === filters.eq.student_id) &&
                  (!filters.eq.source_type || p.source_type === filters.eq.source_type) &&
                  (!filters.eq.source_id || p.source_id === filters.eq.source_id)
                );
                return resolve({ data: list });
              }
              return resolve({ data: [] });
            }
          };
          return chain;
        },
        upsert(record, _opts) {
          const executeUpsert = () => {
            if (table === 'course_classroom_assignments') {
              if (simulateMissingColumns && ('daily_unlock_enabled' in record || 'unlock_configuration' in record)) {
                return {
                  data: null,
                  error: { message: "Could not find the 'daily_unlock_enabled' column of 'course_classroom_assignments' in the schema cache" }
                };
              }
              const idx = store.assignments.findIndex(
                a => a.course_id === record.course_id && a.classroom_id === record.classroom_id
              );
              const existing = idx >= 0 ? store.assignments[idx] : null;
              const nextRow = {
                id: existing?.id || nextId('assign'),
                created_at: existing?.created_at || new Date().toISOString(),
                ...existing,
                ...record
              };
              if (idx >= 0) store.assignments[idx] = nextRow;
              else store.assignments.push(nextRow);
              return { data: nextRow, error: null };
            }
            if (table === 'course_enrollments') {
              const idx = store.enrollments.findIndex(
                e => e.classroom_assignment_id === record.classroom_assignment_id && e.student_id === record.student_id
              );
              const row = { id: idx >= 0 ? store.enrollments[idx].id : nextId('enroll'), ...record };
              if (idx >= 0) store.enrollments[idx] = { ...store.enrollments[idx], ...row };
              else store.enrollments.push(row);
              return { data: row, error: null };
            }
            if (table === 'course_episode_progress') {
              const idx = store.progress.findIndex(
                p => p.enrollment_id === record.enrollment_id && p.episode_id === record.episode_id
              );
              const row = { id: idx >= 0 ? store.progress[idx].id : nextId('prog'), ...record };
              if (idx >= 0) store.progress[idx] = { ...store.progress[idx], ...row };
              else store.progress.push(row);
              return { data: row, error: null };
            }
            if (table === 'classroom_members') {
              store.members.push(record);
              return { data: record, error: null };
            }
            return { data: record, error: null };
          };
          return {
            select() {
              return {
                async single() {
                  return executeUpsert();
                },
                async maybeSingle() {
                  return executeUpsert();
                }
              };
            },
            then(resolve) {
              return resolve(executeUpsert());
            }
          };
        },
        update(record) {
          return {
            eq(col, val) {
              const targetUpdate = () => {
                if (table === 'course_enrollments') {
                  const idx = store.enrollments.findIndex(e => e[col] === val);
                  if (idx >= 0) {
                    store.enrollments[idx] = { ...store.enrollments[idx], ...record };
                    return { data: store.enrollments[idx] };
                  }
                }
                return { data: record };
              };
              return {
                select() {
                  return {
                    async single() {
                      return targetUpdate();
                    }
                  };
                }
              };
            }
          };
        },
        insert(record) {
          const doInsert = () => {
            if (table === 'classroom_points') {
              const row = { id: nextId('pt'), ...record };
              store.points.push(row);
              return { data: row, error: null };
            }
            if (table === 'course_learning_events') {
              const row = { id: nextId('evt'), ...record };
              store.learning_events.push(row);
              return { data: row, error: null };
            }
            return { data: record, error: null };
          };
          return {
            select() {
              return {
                async single() { return doInsert(); },
                async maybeSingle() { return doInsert(); }
              };
            },
            async single() { return doInsert(); },
            then(resolve) { return resolve(doInsert()); }
          };
        }
      };
    }
  };
  return client;
}

// -----------------------------------------------------------------------------
// SCENARIO 1 & 2: Multi-Class Assignment Independence & Non-Clobbering Edits
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 1 & 2: Multi-Class Independence (Class A, Class B, Class C) ---');

const mockSb = createMultiClassMockSupabase();
const courseRow = mockSb.store.course;

let assignA;
let assignB;
let assignC;

await itAsync('Assigns Born for the Sky independently to Class A, Class B, and Class C', async () => {
  const resA = await upsertClassAssignmentSafe(mockSb, {
    courseId: courseRow.id,
    classroomId: 'class-a',
    teacherId: 'teacher-1',
    config: {
      available_from: '2026-11-27',
      due_date: '2026-12-10',
      daily_unlock_enabled: true,
      unlock_frequency_days: 1,
      unlock_lessons_per_release: 1,
      unlock_start_date: '2026-11-27'
    },
    courseRow
  });
  assert.strictEqual(resA.error, null);
  assignA = resA.assignment;

  const resB = await upsertClassAssignmentSafe(mockSb, {
    courseId: courseRow.id,
    classroomId: 'class-b',
    teacherId: 'teacher-1',
    config: {
      available_from: '2026-12-01',
      due_date: '2026-12-20',
      daily_unlock_enabled: false
    },
    courseRow
  });
  assert.strictEqual(resB.error, null);
  assignB = resB.assignment;

  const resC = await upsertClassAssignmentSafe(mockSb, {
    courseId: courseRow.id,
    classroomId: 'class-c',
    teacherId: 'teacher-1',
    config: {
      available_from: '2026-12-05',
      due_date: '2026-12-15',
      daily_unlock_enabled: true,
      unlock_frequency_days: 7,
      unlock_lessons_per_release: 2,
      unlock_start_date: '2026-12-05'
    },
    courseRow
  });
  assert.strictEqual(resC.error, null);
  assignC = resC.assignment;

  const cfgA = resolveClassAssignmentConfig(assignA, courseRow);
  const cfgB = resolveClassAssignmentConfig(assignB, courseRow);
  const cfgC = resolveClassAssignmentConfig(assignC, courseRow);

  assert.strictEqual(cfgA.available_from, '2026-11-27T00:00:00.000Z');
  assert.strictEqual(cfgA.due_date, '2026-12-10T00:00:00.000Z');
  assert.strictEqual(cfgA.daily_release_enabled, true);
  assert.strictEqual(cfgA.daily_release_interval_days, 1);
  assert.strictEqual(cfgA.unlock_lessons_per_release, 1);

  // Critical: courseRow.daily_release_enabled === true MUST NOT override Class B's false!
  assert.strictEqual(cfgB.available_from, '2026-12-01T00:00:00.000Z');
  assert.strictEqual(cfgB.due_date, '2026-12-20T00:00:00.000Z');
  assert.strictEqual(cfgB.daily_release_enabled, false);

  assert.strictEqual(cfgC.available_from, '2026-12-05T00:00:00.000Z');
  assert.strictEqual(cfgC.due_date, '2026-12-15T00:00:00.000Z');
  assert.strictEqual(cfgC.daily_release_enabled, true);
  assert.strictEqual(cfgC.daily_release_interval_days, 7);
  assert.strictEqual(cfgC.unlock_lessons_per_release, 2);
});

await itAsync('Editing Class A leaves Class B and Class C completely unchanged', async () => {
  const snapshotB = JSON.stringify(mockSb.store.assignments.find(a => a.classroom_id === 'class-b'));
  const snapshotC = JSON.stringify(mockSb.store.assignments.find(a => a.classroom_id === 'class-c'));

  const updatedResA = await upsertClassAssignmentSafe(mockSb, {
    courseId: courseRow.id,
    classroomId: 'class-a',
    teacherId: 'teacher-1',
    existingAssignment: assignA,
    config: {
      available_from: '2026-11-29',
      due_date: '2026-12-14',
      daily_unlock_enabled: true,
      unlock_frequency_days: 2,
      unlock_lessons_per_release: 1,
      unlock_start_date: '2026-11-29',
      settings: { award_points: false }
    },
    courseRow
  });
  assert.strictEqual(updatedResA.error, null);
  const cfgUpdatedA = resolveClassAssignmentConfig(updatedResA.assignment, courseRow);
  assert.strictEqual(cfgUpdatedA.available_from, '2026-11-29T00:00:00.000Z');
  assert.strictEqual(cfgUpdatedA.due_date, '2026-12-14T00:00:00.000Z');
  assert.strictEqual(cfgUpdatedA.daily_release_interval_days, 2);
  assert.strictEqual(cfgUpdatedA.award_points, false);

  const afterB = JSON.stringify(mockSb.store.assignments.find(a => a.classroom_id === 'class-b'));
  const afterC = JSON.stringify(mockSb.store.assignments.find(a => a.classroom_id === 'class-c'));
  assert.strictEqual(afterB, snapshotB, 'Class B must remain 100% unchanged after Class A edit');
  assert.strictEqual(afterC, snapshotC, 'Class C must remain 100% unchanged after Class A edit');
});

// -----------------------------------------------------------------------------
// SCENARIO 3: Pre-Migration Schema-Cache Fallback
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 3: Pre-Migration Schema Fallback ---');

await itAsync('Falls back cleanly when new SQL columns are not migrated yet and resolves exact class config', async () => {
  const preMigSb = createMultiClassMockSupabase({ simulateMissingColumns: true });
  const { assignment: rowB, error } = await upsertClassAssignmentSafe(preMigSb, {
    courseId: courseRow.id,
    classroomId: 'class-b',
    teacherId: 'teacher-1',
    config: {
      available_from: '2026-12-01',
      due_date: '2026-12-20',
      daily_unlock_enabled: false
    },
    courseRow
  });
  assert.strictEqual(error, null);
  assert(rowB, 'Expected row saved via settings JSONB fallback');
  assert.strictEqual('daily_unlock_enabled' in rowB, false);

  const resolvedB = resolveClassAssignmentConfig(rowB, courseRow);
  assert.strictEqual(resolvedB.daily_release_enabled, false, 'Class B false must beat courseRow true');
  assert.strictEqual(resolvedB.available_from, '2026-12-01T00:00:00.000Z');
  assert.strictEqual(resolvedB.due_date, '2026-12-20T00:00:00.000Z');

  const { assignment: rowC } = await upsertClassAssignmentSafe(preMigSb, {
    courseId: courseRow.id,
    classroomId: 'class-c',
    teacherId: 'teacher-1',
    config: {
      available_from: '2026-12-05',
      due_date: '2026-12-15',
      daily_unlock_enabled: true,
      unlock_frequency_days: 7,
      unlock_lessons_per_release: 2,
      unlock_start_date: '2026-12-05'
    },
    courseRow
  });
  const resolvedC = resolveClassAssignmentConfig(rowC, courseRow);
  assert.strictEqual(resolvedC.daily_release_enabled, true);
  assert.strictEqual(resolvedC.daily_release_interval_days, 7);
  assert.strictEqual(resolvedC.unlock_lessons_per_release, 2);
});

// -----------------------------------------------------------------------------
// SCENARIO 4: Student Completion & Backend Enforcement per Class
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 4: Backend Student Enforcement per Class ---');

const todayYmd = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Colombo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

const tomorrowYmd = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

await itAsync('Class A (Daily Unlock ON, 1/day): allows Lesson 1 today, blocks Lesson 2 today (403)', async () => {
  const sbA = createMultiClassMockSupabase({
    questions: [
      { id: 'q-1', episode_id: 'ep-1', course_id: 'course-born-sky', points: 10 },
      { id: 'q-2', episode_id: 'ep-2', course_id: 'course-born-sky', points: 10 }
    ]
  });
  await upsertClassAssignmentSafe(sbA, {
    courseId: 'course-born-sky',
    classroomId: 'class-a',
    teacherId: 'teacher-1',
    config: {
      available_from: todayYmd,
      daily_unlock_enabled: true,
      unlock_frequency_days: 1,
      unlock_lessons_per_release: 1,
      unlock_start_date: todayYmd
    },
    courseRow: sbA.store.course
  });

  const res1 = await completeCourseLessonAndAwardPoints(sbA, {
    student_id: 'student-1',
    course_id: 'course-born-sky',
    classroom_id: 'class-a',
    episode_id: 'ep-1',
    question_attempts: [{ question_id: 'q-1', is_correct: true, points_awarded: 10 }]
  });
  assert.strictEqual(res1.success, true);

  let err2 = null;
  try {
    await completeCourseLessonAndAwardPoints(sbA, {
      student_id: 'student-1',
      course_id: 'course-born-sky',
      classroom_id: 'class-a',
      episode_id: 'ep-2',
      question_attempts: [{ question_id: 'q-2', is_correct: true, points_awarded: 10 }]
    });
  } catch (e) {
    err2 = e;
  }
  assert(err2 && err2.statusCode === 403 && err2.dailyReleaseLocked === true, 'Lesson 2 in Class A must be 403 locked today');
});

await itAsync('Class B (Daily Unlock OFF even when course.daily_release_enabled=true): allows Lesson 1 & Lesson 2 same day', async () => {
  const sbB = createMultiClassMockSupabase({
    questions: [
      { id: 'q-1', episode_id: 'ep-1', course_id: 'course-born-sky', points: 10 },
      { id: 'q-2', episode_id: 'ep-2', course_id: 'course-born-sky', points: 10 }
    ]
  });
  await upsertClassAssignmentSafe(sbB, {
    courseId: 'course-born-sky',
    classroomId: 'class-b',
    teacherId: 'teacher-1',
    config: {
      available_from: todayYmd,
      daily_unlock_enabled: false
    },
    courseRow: sbB.store.course
  });

  const r1 = await completeCourseLessonAndAwardPoints(sbB, {
    student_id: 'student-1',
    course_id: 'course-born-sky',
    classroom_id: 'class-b',
    episode_id: 'ep-1',
    question_attempts: [{ question_id: 'q-1', is_correct: true, points_awarded: 10 }]
  });
  const r2 = await completeCourseLessonAndAwardPoints(sbB, {
    student_id: 'student-1',
    course_id: 'course-born-sky',
    classroom_id: 'class-b',
    episode_id: 'ep-2',
    question_attempts: [{ question_id: 'q-2', is_correct: true, points_awarded: 10 }]
  });
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r2.success, true);
});

await itAsync('Class C (future available_from): blocks access with 403 availableFromLocked', async () => {
  const sbFuture = createMultiClassMockSupabase();
  await upsertClassAssignmentSafe(sbFuture, {
    courseId: 'course-born-sky',
    classroomId: 'class-c',
    teacherId: 'teacher-1',
    config: {
      available_from: tomorrowYmd,
      daily_unlock_enabled: false
    },
    courseRow: sbFuture.store.course
  });

  let caught = null;
  try {
    await completeCourseLessonAndAwardPoints(sbFuture, {
      student_id: 'student-1',
      course_id: 'course-born-sky',
      classroom_id: 'class-c',
      episode_id: 'ep-1'
    });
  } catch (e) {
    caught = e;
  }
  assert(caught && caught.statusCode === 403 && caught.availableFromLocked === true, 'Must reject completions before available_from');
});

await itAsync('Class C (2 lessons per week): unlocks Lessons 1 & 2 on day 0, blocks Lesson 3 (403)', async () => {
  const sbC = createMultiClassMockSupabase();
  await upsertClassAssignmentSafe(sbC, {
    courseId: 'course-born-sky',
    classroomId: 'class-c',
    teacherId: 'teacher-1',
    config: {
      available_from: todayYmd,
      daily_unlock_enabled: true,
      unlock_frequency_days: 7,
      unlock_lessons_per_release: 2,
      unlock_start_date: todayYmd
    },
    courseRow: sbC.store.course
  });

  const c1 = await completeCourseLessonAndAwardPoints(sbC, {
    student_id: 'student-1',
    course_id: 'course-born-sky',
    classroom_id: 'class-c',
    episode_id: 'ep-1'
  });
  const c2 = await completeCourseLessonAndAwardPoints(sbC, {
    student_id: 'student-1',
    course_id: 'course-born-sky',
    classroom_id: 'class-c',
    episode_id: 'ep-2'
  });
  assert.strictEqual(c1.success, true);
  assert.strictEqual(c2.success, true);

  let err3 = null;
  try {
    await completeCourseLessonAndAwardPoints(sbC, {
      student_id: 'student-1',
      course_id: 'course-born-sky',
      classroom_id: 'class-c',
      episode_id: 'ep-3'
    });
  } catch (e) {
    err3 = e;
  }
  assert(err3 && err3.statusCode === 403 && err3.dailyReleaseLocked === true, 'Lesson 3 in 2/week schedule must lock until next batch/week');
});

await itAsync('Archived assignment rejects completion with 403 and award_points=false skips leaderboard points', async () => {
  const sbArch = createMultiClassMockSupabase({
    assignments: [
      { id: 'assign-arch', course_id: 'course-born-sky', classroom_id: 'class-a', status: 'archived', settings: {} }
    ]
  });
  let archErr = null;
  try {
    await completeCourseLessonAndAwardPoints(sbArch, {
      student_id: 'student-1',
      course_id: 'course-born-sky',
      classroom_id: 'class-a',
      episode_id: 'ep-1'
    });
  } catch (e) {
    archErr = e;
  }
  assert(archErr && archErr.statusCode === 403);

  const sbNoPts = createMultiClassMockSupabase({
    questions: [{ id: 'q-1', episode_id: 'ep-1', course_id: 'course-born-sky', points: 10 }]
  });
  await upsertClassAssignmentSafe(sbNoPts, {
    courseId: 'course-born-sky',
    classroomId: 'class-b',
    teacherId: 'teacher-1',
    config: {
      available_from: todayYmd,
      daily_unlock_enabled: false,
      settings: { award_points: false }
    },
    courseRow: sbNoPts.store.course
  });
  const noPtsRes = await completeCourseLessonAndAwardPoints(sbNoPts, {
    student_id: 'student-1',
    course_id: 'course-born-sky',
    classroom_id: 'class-b',
    episode_id: 'ep-1',
    question_attempts: [{ question_id: 'q-1', is_correct: true, points_awarded: 10 }]
  });
  assert.strictEqual(noPtsRes.points_awarded, 0);
  assert.strictEqual(sbNoPts.store.points.length, 0);
});

// -----------------------------------------------------------------------------
// SCENARIO 5: Client Daily Release Engine Multi-Class & Batching Tests
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 5: dailyReleaseEngine.ts Roadmap Verification ---');

let engineMod = null;
try {
  const esbuild = await import('esbuild');
  const tmpEngineFile = path.resolve('node_modules/.cache/test_daily_release_engine.mjs');
  fs.mkdirSync(path.dirname(tmpEngineFile), { recursive: true });
  await esbuild.build({
    entryPoints: [path.resolve('src/utils/dailyReleaseEngine.ts')],
    outfile: tmpEngineFile,
    bundle: false,
    format: 'esm',
    platform: 'neutral'
  });
  engineMod = await import(`${pathToFileURL(tmpEngineFile).href}?v=${Date.now()}`);
} catch (compileErr) {
  console.warn('  ! Could not load esbuild for TypeScript test:', compileErr.message);
}

if (engineMod?.computeCourseRoadmap) {
  const baseCourse = {
    id: 'course-born-sky',
    title: 'Born for the Sky',
    course_timezone: 'Asia/Colombo',
    units: [
      {
        id: 'u-1',
        title: 'Unit 1',
        episodes: [
          { id: 'ep-1', title: 'L1', position: 1, order_index: 0 },
          { id: 'ep-2', title: 'L2', position: 2, order_index: 1 },
          { id: 'ep-3', title: 'L3', position: 3, order_index: 2 },
          { id: 'ep-4', title: 'L4', position: 4, order_index: 3 }
        ]
      }
    ]
  };

  it('Roadmap locks all lessons cleanly before class availableFrom (Nov 26 for Nov 27 open)', () => {
    const rm = engineMod.computeCourseRoadmap({
      course: { ...baseCourse, daily_release_enabled: true, course_start_date: '2026-11-27' },
      availableFrom: '2026-11-27',
      currentDate: '2026-11-26T10:00:00Z',
      isTeacher: false
    });
    assert.strictEqual(rm.isBeforeAvailableFrom, true);
    assert(rm.items.every(it => it.is_locked && it.unlock_message.includes('Available from')));
  });

  it('Roadmap supports Class C 2-lessons-per-week batch unlocking on Dec 5 -> L1 & L2 open, L3 & L4 locked', () => {
    const rm = engineMod.computeCourseRoadmap({
      course: { ...baseCourse, daily_release_enabled: true, daily_release_interval_days: 7, course_start_date: '2026-12-05' },
      availableFrom: '2026-12-05',
      unlockLessonsPerRelease: 2,
      currentDate: '2026-12-05T10:00:00Z'
    });
    assert.strictEqual(rm.items[0].is_locked, false);
    assert.strictEqual(rm.items[1].is_locked, false);
    assert.strictEqual(rm.items[2].is_locked, true);
    assert.strictEqual(rm.items[3].is_locked, true);
  });

  it('Roadmap Class B (Daily Unlock Disabled) leaves all 4 lessons immediately available', () => {
    const rm = engineMod.computeCourseRoadmap({
      course: { ...baseCourse, daily_release_enabled: false },
      availableFrom: '2026-12-01',
      currentDate: '2026-12-01T10:00:00Z'
    });
    assert(rm.items.every(it => !it.is_locked && it.status === 'available'));
  });
}

// -----------------------------------------------------------------------------
// SCENARIO 6: Static & Architectural Regression Invariants
// -----------------------------------------------------------------------------
console.log('\n--- SCENARIO 6: Codebase Architectural Invariants ---');

const serverCode = fs.readFileSync(path.resolve('server.mjs'), 'utf-8');
const publishModalCode = fs.readFileSync(path.resolve('src/components/course-studio/CoursePublishModal.tsx'), 'utf-8');
const quickAssignModalCode = fs.readFileSync(path.resolve('src/components/classes/AssignCourseToClassModal.tsx'), 'utf-8');
const migrationSql = fs.readFileSync(path.resolve('supabase/migrations/20261124000000_class_specific_course_assignments.sql'), 'utf-8');

it('PUT /api/course-studio/courses/:id no longer loops or overwrites course_classroom_assignments', () => {
  const putStart = serverCode.indexOf("app.put('/api/course-studio/courses/:id'");
  const putEnd = serverCode.indexOf("app.delete('/api/course-studio/courses/:id'", putStart);
  const putBlock = serverCode.slice(putStart, putEnd);
  assert(!putBlock.includes(".from('course_classroom_assignments')"), 'Global sync loop must stay removed from PUT /courses/:id');
});

it('server.mjs exposes per-class PUT & DELETE assignment endpoints and ignoreDuplicates enrollment upserts', () => {
  assert(serverCode.includes("app.put('/api/course-studio/courses/:id/assignments/:classroomId'"));
  assert(serverCode.includes("app.delete('/api/course-studio/courses/:id/assignments/:classroomId'"));
  assert(serverCode.includes("ignoreDuplicates: true"));
});

it('CoursePublishModal sends class_assignments independently and never calls updateCourse', () => {
  assert(publishModalCode.includes('class_assignments'));
  assert(publishModalCode.includes("Apply this class's settings to all selected classes"));
  assert(!publishModalCode.includes('courseStudioService.updateCourse('));
});

it('AssignCourseToClassModal uses single-class upsertClassAssignment / removeClassAssignment', () => {
  assert(quickAssignModalCode.includes('courseStudioService.upsertClassAssignment('));
  assert(quickAssignModalCode.includes('courseStudioService.removeClassAssignment('));
  assert(!quickAssignModalCode.includes('courseStudioService.publishAndAssignCourse('));
});

it('SQL migration uses empty JSON default so backfill populates unlock_configuration accurately', () => {
  assert(migrationSql.includes("unlock_configuration JSONB NOT NULL DEFAULT '{}'::jsonb"));
  assert(migrationSql.includes('daily_unlock_enabled BOOLEAN NOT NULL DEFAULT false'));
});

console.log('\n===================================================================');
console.log(`  RESULT: ${passed} passed, ${failed} failed`);
console.log('===================================================================');

if (failed > 0) process.exit(1);
