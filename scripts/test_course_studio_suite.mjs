// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO AUTOMATED INTEGRATION TEST SUITE
// Tests AI lesson builder, question generator, concept mastery calculation,
// cross-classroom analytics aggregation, and student learning telemetry.
// ============================================================================

import assert from 'assert';
import path from 'path';
import { pathToFileURL } from 'url';

const servicePath = pathToFileURL('c:/Users/hecsb/OneDrive/Desktop/Edtechra Bitz APP/server/courseStudioService.mjs').href;
const {
  buildLessonFromMaterial,
  generateCourseQuestionsWithAI,
  calculateConceptMastery,
  compileCrossClassroomAnalytics
} = await import(servicePath);

async function runCourseStudioSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING EDTECHRA COURSE STUDIO INTEGRATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log('✅ PASS: ' + name);
      passed++;
    } catch (err) {
      console.error('❌ FAIL: ' + name);
      console.error(err);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Deterministic Concept Mastery Engine
  // --------------------------------------------------------------------------
  test('calculateConceptMastery computes accuracy, points and mastery statuses', () => {
    const rawAttempts = [
      {
        id: 'att-1',
        concept: 'Subject-Verb Agreement',
        skill: 'Grammar',
        is_correct: true,
        points_awarded: 10,
        difficulty: 'medium'
      },
      {
        id: 'att-2',
        concept: 'Subject-Verb Agreement',
        skill: 'Grammar',
        is_correct: true,
        points_awarded: 10,
        difficulty: 'medium'
      },
      {
        id: 'att-3',
        concept: 'Subject-Verb Agreement',
        skill: 'Grammar',
        is_correct: false,
        points_awarded: 0,
        difficulty: 'medium'
      },
      {
        id: 'att-4',
        concept: 'Past Tense Irregular Verbs',
        skill: 'Grammar',
        is_correct: false,
        points_awarded: 0,
        difficulty: 'hard'
      },
      {
        id: 'att-5',
        concept: 'Past Tense Irregular Verbs',
        skill: 'Grammar',
        is_correct: false,
        points_awarded: 0,
        difficulty: 'hard'
      }
    ];

    const result = calculateConceptMastery(rawAttempts);
    assert.strictEqual(result.length, 2, 'Should aggregate into 2 distinct concepts');

    const sva = result.find(c => c.concept === 'Subject-Verb Agreement');
    assert.ok(sva, 'Subject-Verb Agreement concept should exist');
    assert.strictEqual(sva.total_attempts, 3);
    assert.strictEqual(sva.correct_attempts, 2);
    assert.strictEqual(Math.round(sva.accuracy_percentage), 67);
    assert.strictEqual(sva.status, 'good');

    const pt = result.find(c => c.concept === 'Past Tense Irregular Verbs');
    assert.ok(pt, 'Past Tense concept should exist');
    assert.strictEqual(pt.total_attempts, 2);
    assert.strictEqual(pt.correct_attempts, 0);
    assert.strictEqual(pt.accuracy_percentage, 0);
    assert.strictEqual(pt.status, 'at_risk');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Cross-Classroom Course Analytics Aggregator
  // --------------------------------------------------------------------------
  test('compileCrossClassroomAnalytics aggregates across multi-classroom deliveries', async () => {
    const mockCourse = {
      id: 'course-123',
      title: 'Mastering English Grammar',
      subject: 'English',
      grade_level: 'Grade 7'
    };

    const mockAssignments = [
      {
        id: 'asg-1',
        course_id: 'course-123',
        classroom_id: 'class-a',
        classroom: { id: 'class-a', title: 'Grade 7-A English', grade: 'Grade 7' }
      },
      {
        id: 'asg-2',
        course_id: 'course-123',
        classroom_id: 'class-b',
        classroom: { id: 'class-b', title: 'Grade 7-B English', grade: 'Grade 7' }
      }
    ];

    const mockEnrollments = [
      {
        id: 'enr-1',
        course_id: 'course-123',
        classroom_id: 'class-a',
        student_id: 'stu-1',
        status: 'completed',
        progress_percent: 100,
        mastery_percent: 85,
        accuracy_percent: 90,
        student: { id: 'stu-1', full_name: 'Alice Johnson', email: 'alice@school.edu' }
      },
      {
        id: 'enr-2',
        course_id: 'course-123',
        classroom_id: 'class-a',
        student_id: 'stu-2',
        status: 'in_progress',
        progress_percent: 50,
        mastery_percent: 60,
        accuracy_percent: 70,
        student: { id: 'stu-2', full_name: 'Bob Smith', email: 'bob@school.edu' }
      },
      {
        id: 'enr-3',
        course_id: 'course-123',
        classroom_id: 'class-b',
        student_id: 'stu-3',
        status: 'in_progress',
        progress_percent: 40,
        mastery_percent: 40,
        accuracy_percent: 50,
        student: { id: 'stu-3', full_name: 'Charlie Brown', email: 'charlie@school.edu' }
      }
    ];

    const mockAttempts = [
      {
        id: 'att-1',
        course_id: 'course-123',
        student_id: 'stu-1',
        concept: 'Pronoun Antecedent',
        skill: 'Grammar',
        is_correct: true,
        points_awarded: 10
      },
      {
        id: 'att-2',
        course_id: 'course-123',
        student_id: 'stu-2',
        concept: 'Pronoun Antecedent',
        skill: 'Grammar',
        is_correct: true,
        points_awarded: 10
      },
      {
        id: 'att-3',
        course_id: 'course-123',
        student_id: 'stu-3',
        concept: 'Tense Consistency',
        skill: 'Grammar',
        is_correct: false,
        points_awarded: 0
      }
    ];

    const analytics = await compileCrossClassroomAnalytics({
      course: mockCourse,
      assignments: mockAssignments,
      enrollments: mockEnrollments,
      attempts: mockAttempts
    });

    assert.strictEqual(analytics.overview.total_assigned_classrooms, 2);
    assert.strictEqual(analytics.overview.total_enrolled_students, 3);
    assert.strictEqual(analytics.overview.active_students_count, 3);
    assert.strictEqual(Math.round(analytics.overview.average_progress_percent), 63);
    assert.strictEqual(Math.round(analytics.overview.overall_completion_rate), 33);

    assert.strictEqual(analytics.classroom_performance.length, 2);
    const classA = analytics.classroom_performance.find(c => c.classroom_id === 'class-a');
    assert.strictEqual(classA.enrolled_students, 2);
    assert.strictEqual(Math.round(classA.average_progress_percent), 75);
    assert.strictEqual(Math.round(classA.completion_rate_percent), 50);

    assert.strictEqual(analytics.student_performance.length, 3);
    assert.ok(analytics.ai_insights.summary.length > 0);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Fallback AI Lesson Generation
  // --------------------------------------------------------------------------
  try {
    const lessonResult = await buildLessonFromMaterial({
      raw_material: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. Key stages include light-dependent reactions and the Calvin cycle.',
      course_title: 'Biology 101',
      unit_title: 'Unit 2: Cellular Energetics',
      subject: 'Science',
      grade_level: 'Grade 9'
    });

    test('buildLessonFromMaterial parses material into structured blocks and questions', () => {
      assert.ok(lessonResult.title, 'Lesson must have a title');
      assert.ok(Array.isArray(lessonResult.blocks), 'Lesson blocks must be an array');
      assert.ok(lessonResult.blocks.length >= 2, 'Should generate at least 2 structured blocks');
      assert.ok(Array.isArray(lessonResult.suggested_questions), 'Suggested questions must be an array');
      assert.ok(lessonResult.suggested_questions.length >= 1, 'Should generate practice questions');

      const q = lessonResult.suggested_questions[0];
      assert.ok(q.question_text, 'Question text required');
      assert.ok(Array.isArray(q.options), 'Question options required');
      assert.ok(q.correct_answer, 'Question correct_answer required');
      assert.ok(q.explanation, 'Question explanation required');
    });
  } catch (err) {
    console.error('buildLessonFromMaterial error:', err);
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Fallback AI Question Generation
  // --------------------------------------------------------------------------
  try {
    const qResult = await generateCourseQuestionsWithAI({
      content_text: 'The solar system consists of the Sun and eight planets orbiting around it: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.',
      question_count: 3,
      difficulty: 'medium',
      subject: 'Astronomy',
      target_grade: 'Grade 6'
    });

    test('generateCourseQuestionsWithAI generates multiple choice questions with concepts', () => {
      assert.ok(Array.isArray(qResult.questions), 'Questions must be an array');
      assert.strictEqual(qResult.questions.length, 3, 'Must generate requested 3 questions');

      qResult.questions.forEach(q => {
        assert.ok(q.question_text, 'Question text present');
        assert.strictEqual(q.options.length, 4, 'Multiple choice options count 4');
        assert.ok(q.options.includes(q.correct_answer), 'Correct answer must be among options');
        assert.ok(q.concept, 'Concept metadata present');
        assert.ok(q.explanation, 'Explanation present');
      });
    });
  } catch (err) {
    console.error('generateCourseQuestionsWithAI error:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log('🎯 TEST SUITE COMPLETE: ' + passed + ' PASSED, ' + failed + ' FAILED');
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCourseStudioSuite();
