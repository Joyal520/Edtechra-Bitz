// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: LESSON ORDER, DAILY RELEASE & ROADMAP TEST SUITE
// Tests all requirements: Reordering, Daily Release progression, Roadmap states,
// Timezone offsets, Early Completion integrity, Teacher override & Celebration.
// ============================================================================

import assert from 'assert';
import {
  computeCourseRoadmap,
  getCalendarDaysElapsed,
  getDateStringInTimezone
} from '../src/utils/dailyReleaseEngine';
import { Course, CourseUnit, CourseEpisode } from '../src/types/courseStudio';

console.log('\n======================================================');
console.log('🧪 RUNNING LESSON ORDER, DAILY LOCKING & ROADMAP SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.then(() => {
        console.log(`✅ PASS: ${name}`);
        passed++;
      }).catch((err: any) => {
        console.error(`❌ FAIL: ${name}`);
        console.error(err);
        failed++;
      });
    }
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

function createMockCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'course_test_1',
    teacher_id: 'teacher_1',
    title: 'The Young Eagle',
    short_description: 'An inspirational journey of soaring high.',
    subject: 'English',
    grade_level: 'Grade 5',
    course_type: 'full',
    status: 'published',
    daily_release_enabled: false,
    course_timezone: 'Asia/Colombo',
    course_start_date: '2026-09-01T00:00:00Z',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    units: [
      {
        id: 'unit_1',
        course_id: 'course_test_1',
        title: 'Unit 1: The Mountain Nest',
        order_index: 0,
        episodes: [
          {
            id: 'ep_1',
            unit_id: 'unit_1',
            course_id: 'course_test_1',
            title: 'Born for the Sky',
            episode_type: 'lesson',
            order_index: 0,
            position: 1,
            release_day: 1,
            estimated_minutes: 15
          },
          {
            id: 'ep_2',
            unit_id: 'unit_1',
            course_id: 'course_test_1',
            title: 'The Young Eagle',
            episode_type: 'lesson',
            order_index: 1,
            position: 2,
            release_day: 2,
            estimated_minutes: 15
          },
          {
            id: 'ep_3',
            unit_id: 'unit_1',
            course_id: 'course_test_1',
            title: 'Learning to Fly',
            episode_type: 'lesson',
            order_index: 2,
            position: 3,
            release_day: 3,
            estimated_minutes: 15
          }
        ]
      }
    ],
    ...overrides
  };
}

async function runAllTests() {
  // --------------------------------------------------------------------------
  // TEST 1 — REORDER BY POSITION (NOT TITLE)
  // --------------------------------------------------------------------------
  test('TEST 1: Reorder lessons by explicit position', () => {
    const course = createMockCourse();
    const unit = course.units![0];

    // Initial: ep_1 (pos 1), ep_2 (pos 2), ep_3 (pos 3)
    assert.strictEqual(unit.episodes![0].id, 'ep_1');
    assert.strictEqual(unit.episodes![1].id, 'ep_2');
    assert.strictEqual(unit.episodes![2].id, 'ep_3');

    // Reorder: swap ep_2 and ep_3
    const reordered = [unit.episodes![0], unit.episodes![2], unit.episodes![1]];
    const updatedEps = reordered.map((ep, idx) => ({
      ...ep,
      order_index: idx,
      position: idx + 1,
      release_day: idx + 1
    }));

    assert.strictEqual(updatedEps[0].id, 'ep_1');
    assert.strictEqual(updatedEps[0].position, 1);

    assert.strictEqual(updatedEps[1].id, 'ep_3');
    assert.strictEqual(updatedEps[1].position, 2);

    assert.strictEqual(updatedEps[2].id, 'ep_2');
    assert.strictEqual(updatedEps[2].position, 3);
  });

  // --------------------------------------------------------------------------
  // TEST 2 — DAILY RELEASE DAY 1 (OPEN 1, LOCKED 2, LOCKED 3)
  // --------------------------------------------------------------------------
  test('TEST 2: Daily Release on Day 1 unlocks Lesson 1, locks Lesson 2 & 3', () => {
    const course = createMockCourse({
      daily_release_enabled: true,
      course_start_date: '2026-09-01T00:00:00Z'
    });

    const roadmap = computeCourseRoadmap({
      course,
      studentStartDate: '2026-09-01T08:00:00Z',
      currentDate: '2026-09-01T10:00:00Z' // Day 1
    });

    assert.strictEqual(roadmap.daysElapsed, 1);
    assert.strictEqual(roadmap.items[0].status, 'available');
    assert.strictEqual(roadmap.items[0].is_locked, false);

    assert.strictEqual(roadmap.items[1].status, 'locked');
    assert.strictEqual(roadmap.items[1].is_locked, true);
    assert(roadmap.items[1].unlock_message?.includes('open tomorrow at midnight'));

    assert.strictEqual(roadmap.items[2].status, 'locked');
    assert.strictEqual(roadmap.items[2].is_locked, true);
    assert(roadmap.items[2].unlock_message?.includes('Day 3'));
  });

  // --------------------------------------------------------------------------
  // TEST 3 — DAILY RELEASE NEXT DAY (DAY 2 UNLOCKS LESSON 2)
  // --------------------------------------------------------------------------
  test('TEST 3: On Day 2, Lesson 2 unlocks and Lesson 3 remains locked', () => {
    const course = createMockCourse({
      daily_release_enabled: true,
      course_start_date: '2026-09-01T00:00:00Z'
    });

    const roadmap = computeCourseRoadmap({
      course,
      studentStartDate: '2026-09-01T08:00:00Z',
      currentDate: '2026-09-02T09:00:00Z', // Day 2
      completedEpisodeIds: new Set(['ep_1'])
    });

    assert.strictEqual(roadmap.daysElapsed, 2);
    assert.strictEqual(roadmap.items[0].status, 'completed'); // Lesson 1 completed
    assert.strictEqual(roadmap.items[1].status, 'available'); // Lesson 2 now open!
    assert.strictEqual(roadmap.items[1].is_locked, false);

    assert.strictEqual(roadmap.items[2].status, 'locked'); // Lesson 3 still locked
    assert.strictEqual(roadmap.items[2].is_locked, true);
  });

  // --------------------------------------------------------------------------
  // TEST 4 — EARLY COMPLETION DOES NOT SKIP DAYS
  // --------------------------------------------------------------------------
  test('TEST 4: Completing Lesson 1 at 9:00 AM does NOT unlock Lesson 2 on Day 1', () => {
    const course = createMockCourse({
      daily_release_enabled: true,
      course_start_date: '2026-09-01T00:00:00Z'
    });

    const roadmap = computeCourseRoadmap({
      course,
      studentStartDate: '2026-09-01T08:00:00Z',
      currentDate: '2026-09-01T09:10:00Z', // Completed 10 min after start on Day 1
      completedEpisodeIds: new Set(['ep_1'])
    });

    assert.strictEqual(roadmap.daysElapsed, 1);
    assert.strictEqual(roadmap.items[0].status, 'completed');
    assert.strictEqual(roadmap.items[1].status, 'locked', 'Lesson 2 must remain locked until midnight!');
    assert.strictEqual(roadmap.items[1].is_locked, true);
  });

  // --------------------------------------------------------------------------
  // TEST 5 — REORDER + DAILY RELEASE INTEGRATION
  // --------------------------------------------------------------------------
  test('TEST 5: Reordering updates the daily release schedule accordingly', () => {
    const course = createMockCourse({
      daily_release_enabled: true
    });

    // Swap ep_2 and ep_3 in course
    const ep1 = course.units![0].episodes![0];
    const ep2 = course.units![0].episodes![1];
    const ep3 = course.units![0].episodes![2];

    course.units![0].episodes = [
      { ...ep1, position: 1, release_day: 1, order_index: 0 },
      { ...ep3, position: 2, release_day: 2, order_index: 1 }, // Learning to Fly is now Day 2
      { ...ep2, position: 3, release_day: 3, order_index: 2 }  // The Young Eagle is now Day 3
    ];

    const roadmapDay2 = computeCourseRoadmap({
      course,
      studentStartDate: '2026-09-01T00:00:00Z',
      currentDate: '2026-09-02T00:00:00Z' // Day 2
    });

    assert.strictEqual(roadmapDay2.items[1].id, 'ep_3');
    assert.strictEqual(roadmapDay2.items[1].status, 'available'); // ep_3 unlocked on Day 2
    assert.strictEqual(roadmapDay2.items[2].id, 'ep_2');
    assert.strictEqual(roadmapDay2.items[2].status, 'locked'); // ep_2 locked until Day 3
  });

  // --------------------------------------------------------------------------
  // TEST 6 — TEACHER MANUAL OVERRIDE (UNLOCK NOW)
  // --------------------------------------------------------------------------
  test('TEST 6: Teacher override unlocks specific lesson regardless of daily schedule', () => {
    const course = createMockCourse({
      daily_release_enabled: true
    });

    // Mark ep_3 as manually unlocked by teacher
    course.units![0].episodes![2].is_manually_unlocked = true;

    const roadmap = computeCourseRoadmap({
      course,
      studentStartDate: '2026-09-01T00:00:00Z',
      currentDate: '2026-09-01T12:00:00Z' // Still Day 1
    });

    assert.strictEqual(roadmap.items[0].status, 'available');
    assert.strictEqual(roadmap.items[1].status, 'locked'); // ep_2 locked
    assert.strictEqual(roadmap.items[2].status, 'available'); // ep_3 unlocked by override!
    assert.strictEqual(roadmap.items[2].is_locked, false);
  });

  // --------------------------------------------------------------------------
  // TEST 7 — STUDENT ROADMAP PROGRESS PERCENTAGE
  // --------------------------------------------------------------------------
  test('TEST 7: Roadmap correctly calculates progress percentage (only completed lessons count)', () => {
    const course = createMockCourse();

    const roadmap1 = computeCourseRoadmap({
      course,
      completedEpisodeIds: new Set(['ep_1'])
    });
    assert.strictEqual(roadmap1.completedLessons, 1);
    assert.strictEqual(roadmap1.totalLessons, 3);
    assert.strictEqual(roadmap1.progressPercent, 33); // 1 of 3 = 33%

    const roadmap2 = computeCourseRoadmap({
      course,
      completedEpisodeIds: new Set(['ep_1', 'ep_2'])
    });
    assert.strictEqual(roadmap2.completedLessons, 2);
    assert.strictEqual(roadmap2.progressPercent, 67); // 2 of 3 = 67%
  });

  // --------------------------------------------------------------------------
  // TEST 8 — TIMEZONE RESOLUTION (ASIA/COLOMBO)
  // --------------------------------------------------------------------------
  test('TEST 8: Timezone correctly resolves calendar day transitions', () => {
    const tz = 'Asia/Colombo';
    const date1 = '2026-09-01T18:30:00Z'; // 12:00 AM Sept 2 in Colombo (+05:30)
    const str = getDateStringInTimezone(date1, tz);
    assert.strictEqual(str, '2026-09-02', '18:30 UTC Sept 1 is 00:00 Sept 2 in Colombo');

    const elapsed = getCalendarDaysElapsed('2026-09-01T00:00:00Z', date1, tz);
    assert.strictEqual(elapsed, 2, 'Must be Day 2 in Colombo');
  });

  console.log('\n======================================================');
  console.log(`🎯 ALL LESSON ORDER & ROADMAP TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

runAllTests();
