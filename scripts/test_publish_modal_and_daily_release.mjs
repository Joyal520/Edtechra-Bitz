// ============================================================================
// VERIFICATION TEST SUITE:
// 1. Publish Modal Layout & Scroll Boundaries (Deliverable 1)
// 2. One Lesson Per Day Authoritative Backend Locking & Bypass Prevention (Deliverable 2)
// 3. Uniform Banner Aspect Ratio & Course Studio Cards (Deliverable 3)
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { completeCourseLessonAndAwardPoints } from '../server/courseStudioService.mjs';

console.log('===================================================================');
console.log('  EDTECHRA COURSE STUDIO: 3-DELIVERABLE VERIFICATION SUITE         ');
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
// PART 1: DELIVERABLE 1 - PUBLISH COURSE MODAL CHECKS
// -----------------------------------------------------------------------------
console.log('--- DELIVERABLE 1: Publish Course Modal Layout & Viewport Sizing ---');

const modalCode = fs.readFileSync(
  path.resolve('src/components/course-studio/CoursePublishModal.tsx'),
  'utf-8'
);

it('Modal uses widened max-width constraint (max-w-[1100px])', () => {
  assert(modalCode.includes('max-w-[1100px]'), 'Expected max-w-[1100px] in modal shell');
});

it('Modal uses strict max-height constraint (max-h-[88dvh] / h-[88dvh])', () => {
  assert(modalCode.includes('max-h-[88dvh]'), 'Expected max-h-[88dvh] in modal shell');
});

it('Modal shell is organized as flex column to contain header, scrollable body & footer', () => {
  assert(modalCode.includes('flex flex-col overflow-hidden'), 'Expected flex flex-col in modal shell');
});

it('Modal header is persistent and non-scrolling (shrink-0)', () => {
  assert(modalCode.includes('shrink-0') && modalCode.includes('bg-[#0a213c]'), 'Expected persistent shrink-0 header');
});

it('Modal body has independent scroll container (flex-1 min-h-0 overflow-y-auto)', () => {
  assert(modalCode.includes('flex-1 min-h-0 overflow-y-auto'), 'Expected flex-1 min-h-0 overflow-y-auto on body');
});

it('Modal footer is persistent and non-scrolling (shrink-0)', () => {
  assert(modalCode.includes('shrink-0') && modalCode.includes('border-t border-stone-200'), 'Expected persistent shrink-0 footer');
});

it('Page background scroll is locked when modal is open', () => {
  assert(modalCode.includes("document.body.style.overflow = 'hidden'"), 'Expected body scroll lock');
  assert(modalCode.includes("document.body.style.overflow = originalOverflow"), 'Expected body scroll cleanup');
});

it('Classrooms selection uses responsive 3-column layout on wider screens', () => {
  assert(modalCode.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'), 'Expected multi-column classroom grid');
});

// -----------------------------------------------------------------------------
// PART 2: DELIVERABLE 2 - ONE LESSON PER DAY LOCKING & PERSISTENCE
// -----------------------------------------------------------------------------
console.log('\n--- DELIVERABLE 2: "One Lesson Per Day" Locking & Persistence ---');

it('Modal contains LEARNING PACE & ACCESS section with "Unlock One Lesson Per Day" toggle', () => {
  assert(modalCode.includes('Learning Pace & Access'), 'Expected Learning Pace section');
  assert(modalCode.includes('Unlock One Lesson Per Day'), 'Expected toggle title');
  assert(modalCode.includes('dailyReleaseEnabled'), 'Expected dailyReleaseEnabled state in modal');
});

it('Modal passes daily_release_enabled to publishAndAssignCourse', () => {
  assert(modalCode.includes('daily_release_enabled: dailyReleaseEnabled'), 'Expected daily_release_enabled in payload');
});

// Mock database client to test authoritative backend enforcement of daily locking
function createMockSupabase(initialState = {}) {
  const store = {
    course: initialState.course || {
      id: 'course-1',
      daily_release_enabled: true,
      course_timezone: 'Asia/Colombo'
    },
    classroom: { id: 'class-1', teacher_id: 'teacher-1' },
    student: { id: 'student-joy', full_name: 'Joy', role: 'student' },
    enrollment: {
      id: 'enroll-1',
      course_id: 'course-1',
      classroom_id: 'class-1',
      student_id: 'student-joy',
      progress_percent: 0,
      total_episodes_count: 5
    },
    episodes: {
      'ep-1': { id: 'ep-1', title: 'Lesson 1', unit_id: 'u-1', course_id: 'course-1', position: 1 },
      'ep-2': { id: 'ep-2', title: 'Lesson 2', unit_id: 'u-1', course_id: 'course-1', position: 2 }
    },
    progress: [...(initialState.progress || [])],
    points: [...(initialState.points || [])],
    learning_events: []
  };

  return {
    from(table) {
      return {
        select(cols) {
          const filter = { table, eqFilters: {} };
          const chain = {
            eq(col, val) {
              filter.eqFilters[col] = String(val);
              return chain;
            },
            neq(col, val) {
              filter.neqCol = col;
              filter.neqVal = String(val);
              return chain;
            },
            order() { return chain; },
            limit() { return chain; },
            async maybeSingle() {
              if (table === 'courses') return { data: store.course };
              if (table === 'classrooms') return { data: store.classroom };
              if (table === 'profiles') return { data: store.student };
              if (table === 'course_episodes') {
                const ep = store.episodes[filter.eqFilters.id];
                return { data: ep || null };
              }
              if (table === 'course_enrollments') return { data: store.enrollment };
              if (table === 'course_episode_progress') {
                const found = store.progress.find(p =>
                  p.enrollment_id === filter.eqFilters.enrollment_id &&
                  p.episode_id === filter.eqFilters.episode_id
                );
                return { data: found || null };
              }
              return { data: null };
            },
            async single() {
              return this.maybeSingle();
            },
            then(resolve) {
              if (table === 'course_episode_progress') {
                let list = store.progress.filter(p => {
                  if (filter.eqFilters.enrollment_id && p.enrollment_id !== filter.eqFilters.enrollment_id) return false;
                  if (filter.eqFilters.status && p.status !== filter.eqFilters.status) return false;
                  if (filter.neqCol && p[filter.neqCol] === filter.neqVal) return false;
                  return true;
                });
                return resolve({ data: list });
              }
              if (table === 'classroom_points') {
                let pts = store.points.filter(p => {
                  if (filter.eqFilters.classroom_id && p.classroom_id !== filter.eqFilters.classroom_id) return false;
                  if (filter.eqFilters.student_id && p.student_id !== filter.eqFilters.student_id) return false;
                  if (filter.eqFilters.source_id && p.source_id !== filter.eqFilters.source_id) return false;
                  return true;
                });
                return resolve({ data: pts });
              }
              if (table === 'course_learning_events') {
                return resolve({ data: store.learning_events });
              }
              return resolve({ data: [] });
            }
          };
          return chain;
        },
        upsert(record) {
          return {
            async select() {
              return {
                async single() {
                  if (table === 'course_episode_progress') {
                    const idx = store.progress.findIndex(p => p.enrollment_id === record.enrollment_id && p.episode_id === record.episode_id);
                    if (idx >= 0) {
                      store.progress[idx] = { ...store.progress[idx], ...record };
                    } else {
                      store.progress.push({ id: `prog-${Date.now()}`, ...record });
                    }
                    return { data: record };
                  }
                  return { data: record };
                }
              };
            }
          };
        },
        update(record) {
          return {
            eq(col, val) {
              return {
                select() {
                  return {
                    async single() {
                      if (table === 'course_enrollments') {
                        store.enrollment = { ...store.enrollment, ...record };
                        return { data: store.enrollment };
                      }
                      return { data: record };
                    }
                  };
                },
                async single() {
                  if (table === 'course_enrollments') {
                    store.enrollment = { ...store.enrollment, ...record };
                    return { data: store.enrollment };
                  }
                  return { data: record };
                }
              };
            }
          };
        },
        insert(record) {
          return {
            select() {
              return {
                async single() {
                  if (table === 'classroom_points') {
                    const row = { id: `pt-${Date.now()}`, ...record };
                    store.points.push(row);
                    return { data: row };
                  }
                  if (table === 'course_learning_events') {
                    const row = { id: `evt-${Date.now()}`, ...record };
                    store.learning_events.push(row);
                    return { data: row };
                  }
                  return { data: record };
                }
              };
            },
            async single() {
              if (table === 'classroom_points') {
                const row = { id: `pt-${Date.now()}`, ...record };
                store.points.push(row);
                return { data: row };
              }
              if (table === 'course_learning_events') {
                const row = { id: `evt-${Date.now()}`, ...record };
                store.learning_events.push(row);
                return { data: row };
              }
              return { data: record };
            }
          };
        }
      };
    }
  };
}

await itAsync('When daily_release_enabled is ON, completing the first lesson succeeds', async () => {
  const mockSb = createMockSupabase({
    course: { id: 'course-1', daily_release_enabled: true, course_timezone: 'Asia/Colombo' },
    progress: [],
    points: []
  });

  const res = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-joy',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-1',
    score: 100,
    max_score: 100
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.points_awarded, 10);
  assert.strictEqual(res.total_classroom_points, 10);
});

await itAsync('When daily_release_enabled is ON, attempting a second lesson on the same calendar day is BLOCKED authoritatively (403)', async () => {
  const mockSb = createMockSupabase({
    course: { id: 'course-1', daily_release_enabled: true, course_timezone: 'Asia/Colombo' },
    progress: [
      {
        id: 'prog-1',
        enrollment_id: 'enroll-1',
        episode_id: 'ep-1',
        status: 'completed',
        completed_at: new Date().toISOString()
      }
    ],
    points: [
      { id: 'pt-1', classroom_id: 'class-1', student_id: 'student-joy', points: 10, source_type: 'activity', source_id: 'ep-1' }
    ]
  });

  let blocked = false;
  let errorMsg = '';
  try {
    await completeCourseLessonAndAwardPoints(mockSb, {
      student_id: 'student-joy',
      course_id: 'course-1',
      classroom_id: 'class-1',
      episode_id: 'ep-2',
      score: 100,
      max_score: 100
    });
  } catch (err) {
    blocked = true;
    errorMsg = err.message;
    assert.strictEqual(err.statusCode, 403);
    assert.strictEqual(err.dailyReleaseLocked, true);
  }

  assert.strictEqual(blocked, true, 'Expected second lesson on same day to be blocked by daily release lock');
  assert(errorMsg.includes('One Lesson Per Day is active'), `Expected daily lock error message, got: ${errorMsg}`);
});

await itAsync('When daily_release_enabled is ON, reviewing/re-submitting an already completed lesson does NOT get blocked', async () => {
  const mockSb = createMockSupabase({
    course: { id: 'course-1', daily_release_enabled: true, course_timezone: 'Asia/Colombo' },
    progress: [
      {
        id: 'prog-1',
        enrollment_id: 'enroll-1',
        episode_id: 'ep-1',
        status: 'completed',
        completed_at: new Date().toISOString()
      }
    ],
    points: [
      { id: 'pt-1', classroom_id: 'class-1', student_id: 'student-joy', points: 10, source_type: 'activity', source_id: 'ep-1' }
    ]
  });

  // Re-submitting Lesson 1 (reviewing)
  const res = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-joy',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-1',
    score: 100,
    max_score: 100
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.already_awarded, true);
  assert.strictEqual(res.points_awarded, 0);
});

await itAsync('When daily_release_enabled is OFF, multiple lessons can be completed on the same day without restriction', async () => {
  const mockSb = createMockSupabase({
    course: { id: 'course-1', daily_release_enabled: false, course_timezone: 'Asia/Colombo' },
    progress: [
      {
        id: 'prog-1',
        enrollment_id: 'enroll-1',
        episode_id: 'ep-1',
        status: 'completed',
        completed_at: new Date().toISOString()
      }
    ],
    points: [
      { id: 'pt-1', classroom_id: 'class-1', student_id: 'student-joy', points: 10, source_type: 'activity', source_id: 'ep-1' }
    ]
  });

  const res = await completeCourseLessonAndAwardPoints(mockSb, {
    student_id: 'student-joy',
    course_id: 'course-1',
    classroom_id: 'class-1',
    episode_id: 'ep-2',
    score: 100,
    max_score: 100
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.points_awarded, 10);
});

// -----------------------------------------------------------------------------
// PART 3: DELIVERABLE 3 - COURSE STUDIO COURSE CARDS & ASPECT RATIO
// -----------------------------------------------------------------------------
console.log('\n--- DELIVERABLE 3: Course Studio Course Cards & Aspect Ratio ---');

const dashboardCode = fs.readFileSync(
  path.resolve('src/pages/course-studio/CourseStudioDashboardPage.tsx'),
  'utf-8'
);

const coverCode = fs.readFileSync(
  path.resolve('src/utils/courseCover.tsx'),
  'utf-8'
);

const classesPageCode = fs.readFileSync(
  path.resolve('src/pages/classes/ClassesPage.tsx'),
  'utf-8'
);

it('CourseCoverImage supports uniform "banner" aspect ratio (aspect-[2.35/1])', () => {
  assert(coverCode.includes("ratioClass = 'aspect-[2.35/1]'"), 'Expected aspect-[2.35/1] in CourseCoverImage');
  assert(coverCode.includes("aspectRatio?: '16:9' | '1:1' | 'banner'"), 'Expected banner in aspectRatio prop type');
});

it('CourseStudioDashboardPage enforces aspect-[2.35/1] banner crop on cover container', () => {
  assert(dashboardCode.includes('aspect-[2.35/1]'), 'Expected aspect-[2.35/1] on cover container');
  assert(dashboardCode.includes('aspectRatio="banner"'), 'Expected aspectRatio="banner" passed to CourseCoverImage');
});

it('Course cards feature white pill subject badge on top-left of cover', () => {
  assert(dashboardCode.includes('bg-white/95 text-slate-800 text-[11px] font-bold shadow-xs border border-white/40'), 'Expected white pill badge on top-left');
});

it('Course cards feature status badge (PUBLISHED / DRAFT) on top-right of cover', () => {
  assert(dashboardCode.includes('PUBLISHED') && dashboardCode.includes('bg-emerald-100/90 text-emerald-800'), 'Expected PUBLISHED badge');
  assert(dashboardCode.includes('DRAFT') && dashboardCode.includes('bg-slate-200/90 text-slate-700'), 'Expected DRAFT badge');
});

it('Course cards feature title, description, metadata row (classes • units), and "Manage ->" button matching reference design', () => {
  assert(dashboardCode.includes('{course.title}'), 'Expected title');
  assert(dashboardCode.includes('{assignedCount} classes • {course.units_count ?? 1} units'), 'Expected metadata row');
  assert(dashboardCode.includes('<span>Manage</span>'), 'Expected Manage link');
  assert(dashboardCode.includes('<ArrowRight className="w-3 h-3" />'), 'Expected arrow next to Manage');
});

it('Classes landing page removed duplicate course cards and features promotional hero', () => {
  assert(!classesPageCode.includes('studioCourses.slice(0, 3).map'), 'Expected duplicate course cards to be removed from ClassesPage');
  assert(classesPageCode.includes('Create a Digital Course'), 'Expected promotional hero heading');
  assert(classesPageCode.includes('for Your Class'), 'Expected colorful emphasis on Your Class');
});

console.log('\n===================================================================');
console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('===================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
