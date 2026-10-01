// ============================================================================
// VERIFICATION TEST SUITE: CIRCULAR JSON FIX & 25-QUESTION EXAM FLOW
// Tests:
// 1. MouseEvent / PointerEvent with circular Window reference passed into submission
// 2. Sanitization removes circular structures and extracts valid answers
// 3. Complete 25-question exam flow: Q1 -> Q25, answer capture, scoring, idempotency
// 4. Boundary safety: Question 25 is last question, no Question 26
// ============================================================================

import assert from 'assert';
import { gradeExamAttempt } from '../server/exam2Service.mjs';
import {
  sanitizeAnswersForPayload,
  sanitizeExamForPayload,
  isBrowserEvent,
  safeJsonStringify
} from '../src/utils/examPayloadSanitizer.ts';

console.log('\n================================================================');
console.log('   VERIFYING CIRCULAR JSON FIX & 25-QUESTION SUBMISSION FLOW     ');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log('  [ PASS ] ' + name);
    passedTests++;
  } catch (err) {
    console.error('  [ FAIL ] ' + name + ':', err.message);
    failedTests++;
  }
}

// -------------------------------------------------------------------------
// TEST 1: Replicate the Exact Circular Window Structure
// -------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Circular Browser Window Serialization Bug ---');

// Create a circular mock Window object
const mockWindow = {};
mockWindow.window = mockWindow;
mockWindow.self = mockWindow;
mockWindow.document = { defaultView: mockWindow };

// Create a simulated React SyntheticEvent / PointerEvent
const mockPointerEvent = {
  nativeEvent: { type: 'click' },
  type: 'click',
  bubbles: true,
  cancelable: true,
  view: mockWindow,
  target: { tagName: 'BUTTON', value: '' },
  currentTarget: { tagName: 'BUTTON' }
};

runTest('Confirm raw Event object with Window throws circular JSON error without sanitizer', () => {
  let threwExpected = false;
  try {
    JSON.stringify({ answers: mockPointerEvent });
  } catch (err) {
    threwExpected = err.message.includes('circular');
  }
  assert.strictEqual(threwExpected, true, 'JSON.stringify should throw on raw event with Window');
});

runTest('isBrowserEvent correctly identifies PointerEvent and MouseEvent', () => {
  assert.strictEqual(isBrowserEvent(mockPointerEvent), true);
  assert.strictEqual(isBrowserEvent({}), false);
  assert.strictEqual(isBrowserEvent('answer string'), false);
  assert.strictEqual(isBrowserEvent({ q1: 'A', q2: 'B' }), false);
});

runTest('sanitizeAnswersForPayload discards circular Event passed as answers', () => {
  const result = sanitizeAnswersForPayload(mockPointerEvent);
  assert.deepStrictEqual(result, {});
  // Verify it stringifies cleanly
  const json = JSON.stringify({ answers: result });
  assert.strictEqual(json, '{"answers":{}}');
});

runTest('sanitizeAnswersForPayload cleans answers if an event was stored inside an answer key', () => {
  const dirtyAnswers = {
    q1: 'Option A',
    q2: 'Option B',
    q3: mockPointerEvent, // corrupted entry
    q4: 42,
    q5: true,
    q6: ['opt1', 'opt2'],
    q7: { sub1: 'ans1', sub2: 'ans2' }
  };

  const sanitized = sanitizeAnswersForPayload(dirtyAnswers);
  assert.strictEqual(sanitized.q1, 'Option A');
  assert.strictEqual(sanitized.q2, 'Option B');
  assert.strictEqual(sanitized.q3, undefined, 'Corrupted event answer should be removed');
  assert.strictEqual(sanitized.q4, 42);
  assert.strictEqual(sanitized.q5, true);
  assert.deepStrictEqual(sanitized.q6, ['opt1', 'opt2']);
  assert.deepStrictEqual(sanitized.q7, { sub1: 'ans1', sub2: 'ans2' });

  // Verify full payload stringification works without any circular error
  const payload = {
    examId: 'test_exam',
    classroomId: 'test_class',
    answers: sanitized
  };
  const jsonStr = JSON.stringify(payload);
  assert.ok(jsonStr.length > 0);
  assert.ok(!jsonStr.includes('nativeEvent'));
});

// -------------------------------------------------------------------------
// TEST 2: Real 25-Question Exam Simulation
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Full 25-Question Exam Workflow ---');

// Generate 25 real canonical exam questions across sections
const questions25 = [];
for (let i = 1; i <= 25; i++) {
  questions25.push({
    id: `q_${i}`,
    questionId: `q_${i}`,
    type: i <= 15 ? 'multiple_choice' : i <= 20 ? 'true_false' : 'short_answer',
    questionType: i <= 15 ? 'Multiple Choice Questions (MCQ)' : i <= 20 ? 'True or False Questions' : 'Short Answer Questions',
    question: `Question ${i}: What is the correct response for item ${i}?`,
    questionText: `Question ${i}: What is the correct response for item ${i}?`,
    marks: 4,
    correctAnswer: i <= 15 ? 'B' : i <= 20 ? 'true' : 'Sample answer',
    options: i <= 15 ? [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
      { id: 'C', text: 'Option C' },
      { id: 'D', text: 'Option D' }
    ] : undefined
  });
}

const canonicalExam25 = {
  id: 'exam_25_questions',
  classroom_id: 'class_grade10',
  title: 'Comprehensive English & Science 25-Question Assessment',
  duration_minutes: 45,
  total_marks: 100,
  pass_marks: 40,
  sections: [
    {
      id: 'sec_mcq',
      title: 'Section A: Multiple Choice',
      questions: questions25.slice(0, 15)
    },
    {
      id: 'sec_tf',
      title: 'Section B: True or False',
      questions: questions25.slice(15, 20)
    },
    {
      id: 'sec_sa',
      title: 'Section C: Short Answer',
      questions: questions25.slice(20, 25)
    }
  ]
};

// Simulate student answering Question 1 through Question 25
const simulatedStudentAnswers = {};
for (let i = 1; i <= 25; i++) {
  simulatedStudentAnswers[`q_${i}`] = i <= 15 ? 'B' : i <= 20 ? 'true' : 'Sample answer';
}

runTest('Confirm exactly 25 questions exist in exam', () => {
  const totalQuestions = canonicalExam25.sections.reduce((acc, s) => acc + s.questions.length, 0);
  assert.strictEqual(totalQuestions, 25);
});

runTest('Confirm final Question 25 answer is present in answers dictionary', () => {
  assert.strictEqual(simulatedStudentAnswers['q_25'], 'Sample answer');
  assert.strictEqual(Object.keys(simulatedStudentAnswers).length, 25);
});

runTest('Confirm Question 26 does NOT exist (boundary safety)', () => {
  assert.strictEqual(simulatedStudentAnswers['q_26'], undefined);
  const q26 = canonicalExam25.sections.flatMap(s => s.questions).find(q => q.id === 'q_26');
  assert.strictEqual(q26, undefined);
});

runTest('Submit Exam payload construction with clean data', () => {
  const sanitizedAnswers = sanitizeAnswersForPayload(simulatedStudentAnswers);
  const sanitizedExam = sanitizeExamForPayload(canonicalExam25);

  const payload = {
    examId: canonicalExam25.id,
    classroomId: canonicalExam25.classroom_id,
    exam: sanitizedExam,
    answers: sanitizedAnswers
  };

  // Must serialize cleanly with standard JSON.stringify
  const serialized = JSON.stringify(payload);
  assert.ok(serialized.length > 0);

  const parsed = JSON.parse(serialized);
  assert.strictEqual(parsed.examId, 'exam_25_questions');
  assert.strictEqual(Object.keys(parsed.answers).length, 25);
  assert.strictEqual(parsed.answers['q_25'], 'Sample answer');
});

runTest('Grade attempt calculation for 25 questions', () => {
  const grading = gradeExamAttempt(canonicalExam25, simulatedStudentAnswers);
  assert.strictEqual(grading.breakdown.length, 25);
  assert.strictEqual(grading.maxScore, 100);
  assert.strictEqual(grading.totalScore, 80); // 20 objective questions (80 marks) + 5 subjective (pending review)
  assert.strictEqual(grading.percentage, 80);
  assert.strictEqual(grading.passed, true);
  assert.strictEqual(grading.grade, 'A');
});

// -------------------------------------------------------------------------
// TEST 3: Defensive performSubmission Guard Replay
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Defensive performSubmission Guard ---');

runTest('performSubmission guard rejects event and falls back to answersRef.current', () => {
  // Simulate the performSubmission logic from ExamSession.tsx:
  const answersRefCurrent = { ...simulatedStudentAnswers };
  const answersState = { ...simulatedStudentAnswers };

  // When Submit button was clicked previously, overrideAnswers received mockPointerEvent:
  const overrideAnswers = mockPointerEvent;

  // The new defensive logic:
  const safeOverride = overrideAnswers && typeof overrideAnswers === 'object' && !('nativeEvent' in overrideAnswers) && !('target' in overrideAnswers && 'type' in overrideAnswers)
    ? overrideAnswers
    : undefined;

  const finalAnswersToSubmit = safeOverride || answersRefCurrent || answersState;

  // Verify safeOverride rejected the event
  assert.strictEqual(safeOverride, undefined);
  // Verify finalAnswersToSubmit used answersRefCurrent
  assert.strictEqual(finalAnswersToSubmit, answersRefCurrent);
  assert.strictEqual(Object.keys(finalAnswersToSubmit).length, 25);
  assert.strictEqual(finalAnswersToSubmit['q_25'], 'Sample answer');

  // Verify that finalAnswersToSubmit serializes without any circular error
  const finalJson = JSON.stringify({
    examId: 'exam_25_questions',
    answers: finalAnswersToSubmit
  });
  assert.ok(finalJson.includes('"q_25":"Sample answer"'));
});

// -------------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  RESULTS: ${passedTests} passed, ${failedTests} failed`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}
