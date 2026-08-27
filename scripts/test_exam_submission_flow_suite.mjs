// ==========================================================================
// TEST SUITE: Exam Submission -> Results -> Leaderboard -> Teacher Visibility Flow
// ==========================================================================

import assert from 'assert';
import { gradeExamAttempt } from '../server/exam2Service.mjs';

console.log('\n================================================================');
console.log('  TESTING EXAM 2.0 SUBMISSION, IDEMPOTENCY & LEADERBOARD FLOW   ');
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

// 1. Testing Normal Submission & Scoring
console.log('--- 1. Testing Normal Submission & Scoring ---');

const sampleExam = {
  id: 'exam_bio_101',
  title: 'Cell Biology Unit Exam',
  classroom_id: 'class_grade9_bio',
  duration_minutes: 45,
  total_marks: 50,
  pass_marks: 20,
  sections: [
    {
      id: 'sec_1',
      title: 'Multiple Choice Questions',
      questions: [
        {
          questionId: 'q1',
          questionType: 'Multiple Choice Questions (MCF)',
          questionText: 'What is the powerhouse of the cell?',
          correctAnswer: 'Mitochondria',
          marks: 10
        },
        {
          questionId: 'q2',
          questionType: 'Multiple Choice Questions (MCQ',
          questionText: 'What is the basic unit of life?',
          correctAnswer: 'Cell',
          marks: 10
        }
      ]
    },
    {
      id: 'sec_2',
      title: 'True or False Questions',
      questions: [
        {
          questionId: 'q3',
          questionType: 'True or False Questions',
          questionText: 'Plant cells have cell walls.',
          correctAnswer: 'True',
          marks: 15
        },
        {
          questionId: 'q4',
          questionType: 'True or False Questions',
          questionText: 'Mitochondria contain no DNA.',
          correctAnswer: 'False',
          marks: 15
        }
      ]
    }
  ]
};

const studentAnswers = {
  q1: 'Mitochondria',
  q2: 'Cell',
  q3: 'True',
  q4: 'True'
};


const grading = gradeExamAttempt(sampleExam, studentAnswers);

runTest('Total score matches sum of correct items (35 / 50)', () => {
  assert.strictEqual(grading.totalScore, 35);
  assert.strictEqual(grading.maxScore, 50);
});

runTest('Percentage is accurately computed (70%/', () => {
  assert.strictEqual(grading.percentage, 70);
});

runTest('Grade assigned appropriately (Grade B)', () => {
  assert.strictEqual(grading.grade, 'B');
  assert.strictEqual(grading.passed, true);
});

runTest('Breakdown contains detailed per-question answers and flags', () => {
  assert.strictEqual(grading.breakdown.length, 4);
  assert.strictEqual(grading.breakdown[0].isCorrect, true);
  assert.strictEqual(grading.breakdown[3].isCorrect, false);
});

// 2. Testing Result Normalization
console.log('\n--- 2. Testing Result Normalization ---');


function normalizeResult(r) {
  if (!r) return null;
  const score = Number(r.score ?? r.totalScore ?? 0);
  const totalMarks = Number(r.total_marks ?? r.maxScore ?? 100);
  const percentage = Number(r.percentage ?? (totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(1)) : 0));
  const grade = r.grade || (percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'Needs Support');
  const passed = r.passed !== undefined ? Boolean(r.passed) : score >= Math.round(totalMarks * 0.4);

  return {
    ...r,
    id: r.id || r.savedRecordId || 'res_123',
    score,
    totalScore: score,
    total_marks: totalMarks,
    maxScore: totalMarks,
    percentage,
    grade,
    passed,
    feedback: r.feedback || (passed ? 'Great job on passing the exam!' : 'Review the topics and try again.'),
    breakdown: r.breakdown || r.breakdown_json || [],
    answers: r.answers || {}
  };
}


assert.ok(true);

const dbRow = {
  id: 'uuid_db_row_001',
  exam_id: 'exam_bio_101',
  classroom_id: 'class_grade9_bio',
  student_id: 'student_alex',
  score: 35,
  total_marks: 50,
  percentage: 70,
  passed: true,
  answers: studentAnswers,
  feedback: 'Great job on passing the exam!'
};

const normalizedDb = normalizeResult(dbRow);

runTest('Normalizes Supabase DB row (score -> totalScore & total_marks -> maxScore)', () => {
  assert.strictEqual(normalizedDb.totalScore, 35);
  assert.strictEqual(normalizedDb.score, 35);
  assert.strictEqual(normalizedDb.maxScore, 50);
  assert.strictEqual(normalizedDb.total_marks, 50);
  assert.strictEqual(normalizedDb.percentage, 70);
  assert.strictEqual(normalizedDb.grade, 'B');
});


const apiShape = {
  savedRecordId: 'uuid_api_row_002',
  totalScore: 45,
  maxScore: 50,
  percentage: 90,
  grade: 'A+',
  passed: true,
  breakdown: grading.breakdown
};

const normalizedApi = normalizeResult(apiShape);

runTest('Normalizes API response shape (totalScore -> score & maxScore -> total_marks)', () => {
  assert.strictEqual(normalizedApi.totalScore, 45);
  assert.strictEqual(normalizedApi.score, 45);
  assert.strictEqual(normalizedApi.maxScore, 50);
  assert.strictEqual(normalizedApi.total_marks, 50);
  assert.strictEqual(normalizedApi.percentage, 90);
  assert.strictEqual(normalizedApi.grade, 'A+');
});

// 3. Testing Idempotency & Duplicate Submission Prevention
console.log('\n--- 3. Testing Idempotency & Duplicate Submission Prevention ---');

const dbExamResults = new Map();
const dbClassroomPoints = [];

function submitStudentExamMock({ examId, classroomId, studentId, examData, answers }) {
  const existingKey = examId + '_' + studentId;
  if (dbExamResults.has(existingKey)) {
    const existing = dbExamResults.get(existingKey);
    return {
      ...existing,
      alreadySubmitted: true
    };
  }

  const result = gradeExamAttempt(examData, answers);
  const record = {
    id: 'res_' + Date.now(),
    exam_id: examId,
    classroom_id: classroomId,
    student_id: studentId,
    score: result.totalScore,
    total_marks: result.maxScore,
    percentage: result.percentage,
    grade: result.grade,
    passed: result.passed,
    answers,
    breakdown: result.breakdown,
    feedback: result.feedback,
    submitted_at: new Date().toISOString()
  };

  dbExamResults.set(existingKey, record);

  const existingPoint = dbClassroomPoints.find(
    p => p.classroom_id === classroomId && p.student_id === studentId && p.source_type === 'exam' && p.source_id === examId
  );
  if (!existingPoint && result.totalScore > 0) {
    dbClassroomPoints.push({
      id: 'pt_' + Date.now(),
      classroom_id: classroomId,
      student_id: studentId,
      points: result.totalScore,
      source_type: 'exam',
      source_id: examId
    });
  }

  return { ...record, alreadySubmitted: false };
}

const firstAttempt = submitStudentExamMock({
  examId: 'exam_bio_101',
  classroomId: 'class_grade9_bio',
  studentId: 'student_123',
  examData: sampleExam,
  answers: studentAnswers
});

runTest('First submission creates record and awards points', () => {
  assert.strictEqual(firstAttempt.alreadySubmitted, false);
  assert.strictEqual(firstAttempt.score, 35);
  assert.strictEqual(dbExamResults.size, 1);
  assert.strictEqual(dbClassroomPoints.length, 1);
  assert.strictEqual(dbClassroomPoints[0].points, 35);
});


const secondAttempt = submitStudentExamMock({
  examId: 'exam_bio_101',
  classroomId: 'class_grade9_bio',
  studentId: 'student_123',
  examData: sampleExam,
  answers: studentAnswers
});

runTest('Second submission returns existing record without creating duplicate attempt', () => {
  assert.strictEqual(secondAttempt.alreadySubmitted, true);
  assert.strictEqual(secondAttempt.score, 35);
  assert.strictEqual(dbExamResults.size, 1);
});

runTest('Second submission does NOT award duplicate points/XP', () => {
  assert.strictEqual(dbClassroomPoints.length, 1);
});

// 4. Testing Refresh Resilience & Teacher Visibility
console.log('\n--- 4. Testing Refresh Resilience & Teacher Visibility ---');


function openExamForStudentMock(exam, studentId) {
  const existingKey = exam.id + '_' + studentId;
  const existing = dbExamResults.get(existingKey) || null;
  const normalized = existing ? normalizeResult(existing) : null;

  return {
    ...exam,
    latest_result: normalized,
    can_start: !normalized
  };
}

const studentViewOnRefresh = openExamForStudentMock(sampleExam, 'student_123');

runTest('On page refresh, exam recognizes existing result and prevents fresh exam start', () => {
  assert.ok(studentViewOnRefresh.latest_result);
  assert.strictEqual(studentViewOnRefresh.latest_result.score, 35);
  assert.strictEqual(studentViewOnRefresh.latest_result.totalScore, 35);
  assert.strictEqual(studentViewOnRefresh.can_start, false);
});


function getTeacherClassroomExamResults(examId) {
  const list = [];
  for (const [resKey, res] of dbExamResults.entries()) {
    if (res.exam_id === examId) {
      list.push(res);
    }
  }
  return list;
}


const teacherResults = getTeacherClassroomExamResults('exam_bio_101');

runTest('Teacher results list accurately contains student score and status', () => {
  assert.strictEqual(teacherResults.length, 1);
  assert.strictEqual(teacherResults[0].student_id, 'student_123');
  assert.strictEqual(teacherResults[0].score, 35);
  assert.strictEqual(teacherResults[0].percentage, 70);
  assert.strictEqual(teacherResults[0].passed, true);
});

console.log('\n=================================================================');
console.log('  TEST RESULTS: ' + passedTests + ' PASSED, ' + failedTests + ' FAILED     ');
console.log('=================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
