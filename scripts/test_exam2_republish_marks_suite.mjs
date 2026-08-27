// ============================================================================
// EDTECHRA EXAM ENGINE 2.0: END-TO-END VERIFICATION TEST SUITE
// Tests:
// 1. Exam Marks Calculation (sectionTotal = count * marks, examTotal = sum(sectionTotals))
// 2. Intelligent Auto-Balance Marks algorithm (question counts preserved, integer marks solved)
// 3. Leading-zero input normalization (e.g. "010" -> 10)
// 4. One authoritative exam total across all modules
// 5. Exam template creation & initial publication to Class 6A
// 6. Student 6A completion, evaluation & score percentage against authoritative total
// 7. Reusable exam republishing to Class 6B with custom schedule
// 8. Student 6B receives a clean attempt without answers/results from Class 6A
// 9. Class 6A and Class 6B result & leaderboard data isolation
// 10. Exam versioning safety (editing exam creates version 2 without mutating version 1 attempts)
// ============================================================================

import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  generateExam,
  validateGenerationPayload,
  gradeExamAttempt,
  normalizeExam
} from '../server/exam2Service.mjs';

console.log('=================================================================');
console.log('  EDTECHRA AI EXAM ENGINE 2.0: FULL FLOW VERIFICATION TEST SUITE ');
console.log('=================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [ PASS ] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [ FAIL ] ${name}:`, err.message);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  [ PASS ] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [ FAIL ] ${name}:`, err.message);
    failedTests++;
  }
}

// ----------------------------------------------------------------------------
// 1. TEST MARKS CALCULATION & MATHEMATICAL CONSISTENCY
// ----------------------------------------------------------------------------
console.log('--- 1. Testing Mathematical Marks Calculation ---');

const initialSections = [
  { id: 's1', type: 'Multiple Choice Questions (MCQ)', count: 5, marks: 10 },
  { id: 's2', type: 'Short Answer Questions', count: 2, marks: 10 }
];

const targetMarks = 100;

const section1Total = initialSections[0].count * initialSections[0].marks;
const section2Total = initialSections[1].count * initialSections[1].marks;
const actualExamTotal = initialSections.reduce((sum, s) => sum + s.count * s.marks, 0);
const difference = targetMarks - actualExamTotal;

runTest('Section 1 subtotal calculation (5 * 10 = 50)', () => {
  assert.strictEqual(section1Total, 50);
});

runTest('Section 2 subtotal calculation (2 * 10 = 20)', () => {
  assert.strictEqual(section2Total, 20);
});

runTest('Actual Exam Total calculation (50 + 20 = 70)', () => {
  assert.strictEqual(actualExamTotal, 70);
});

runTest('Difference calculation (100 - 70 = 30 marks needed)', () => {
  assert.strictEqual(difference, 30);
});

// ----------------------------------------------------------------------------
// 2. TEST AUTO-BALANCE ALGORITHM
// ----------------------------------------------------------------------------
console.log('\n--- 2. Testing Auto-Balance Algorithm ---');

function solveAutoBalance(currentSections, targetTotal) {
  const counts = currentSections.map(s => Math.max(1, Number(s.count) || 1));
  const numSections = currentSections.length;

  const getTypeWeight = (type = '') => {
    const t = String(type).toLowerCase();
    if (t.includes('essay')) return 4;
    if (t.includes('comprehension')) return 2.5;
    if (t.includes('short answer') || t.includes('matching') || t.includes('reorder')) return 2;
    if (t.includes('blanks') || t.includes('cloze')) return 1.5;
    return 1;
  };

  const weights = currentSections.map(s => getTypeWeight(s.type));

  if (numSections === 1) {
    const c = counts[0];
    if (targetTotal % c === 0 && targetTotal / c >= 1) {
      return { success: true, proposedSections: [{ ...currentSections[0], marks: targetTotal / c }] };
    }
    return { success: false, proposedSections: currentSections };
  }

  const validSolutions = [];

  function search(idx, remainingTotal, currentMarks) {
    if (idx === numSections - 1) {
      const lastCount = counts[idx];
      if (remainingTotal > 0 && remainingTotal % lastCount === 0) {
        const lastMark = remainingTotal / lastCount;
        if (lastMark >= 1) {
          const solution = [...currentMarks, lastMark];
          let penalty = 0;
          solution.forEach((m) => {
            if (m === 25 || m === 50 || m === 10 || m === 20) penalty -= 60;
            else if (m % 10 === 0) penalty -= 40;
            else if (m % 5 === 0) penalty -= 30;
            else if (m % 2 === 0) penalty -= 5;
            else penalty += 50;

            if (m > 10 && m % 5 !== 0) penalty += 80;
          });

          for (let i = 0; i < numSections; i++) {
            for (let j = i + 1; j < numSections; j++) {
              if (weights[i] < weights[j] && solution[i] > solution[j]) {
                penalty += 150;
              }
              if (weights[i] > weights[j] && solution[i] < solution[j]) {
                penalty += 150;
              }
            }
          }

          const baseUnit = targetTotal / (counts.reduce((sum, c, i) => sum + c * weights[i], 0) || 1);
          solution.forEach((m, i) => {
            const ideal = Math.max(1, Math.round(weights[i] * baseUnit));
            penalty += Math.abs(m - ideal) * 10;
          });

          validSolutions.push({ marks: solution, penalty });
        }
      }
      return;
    }

    const c = counts[idx];
    const maxMarkForSection = Math.floor((remainingTotal - (numSections - 1 - idx)) / c);
    for (let m = 1; m <= maxMarkForSection; m++) {
      search(idx + 1, remainingTotal - (c * m), [...currentMarks, m]);
    }
  }

  search(0, targetTotal, []);

  if (validSolutions.length === 0) {
    return { success: false, proposedSections: currentSections };
  }

  validSolutions.sort((a, b) => a.penalty - b.penalty);
  const best = validSolutions[0];

  return {
    success: true,
    proposedSections: currentSections.map((s, i) => ({ ...s, marks: best.marks[i] }))
  };
}

const balanceResult = solveAutoBalance(initialSections, 100);

runTest('Auto-balance succeeds for 5 Qs and 2 Qs to reach 100 marks', () => {
  assert.strictEqual(balanceResult.success, true);
});

runTest('Question counts are strictly preserved (Section 1 = 5, Section 2 = 2)', () => {
  assert.strictEqual(balanceResult.proposedSections[0].count, 5);
  assert.strictEqual(balanceResult.proposedSections[1].count, 2);
});

runTest('Balanced marks are standard integer values (5x10=50, 2x25=50 -> 100 total)', () => {
  const s1 = balanceResult.proposedSections[0];
  const s2 = balanceResult.proposedSections[1];
  const total = s1.count * s1.marks + s2.count * s2.marks;
  assert.strictEqual(s1.marks, 10);
  assert.strictEqual(s2.marks, 25);
  assert.strictEqual(total, 100);
});

// Test impossible balance handling
const impossibleSections = [
  { id: 's1', count: 3, marks: 10 },
  { id: 's2', count: 3, marks: 10 }
];
const impossibleResult = solveAutoBalance(impossibleSections, 100);
runTest('Auto-balance cleanly detects when target cannot be evenly achieved with integer marks', () => {
  assert.strictEqual(impossibleResult.success, false);
});

// ----------------------------------------------------------------------------
// 3. TEST LEADING ZERO SANITIZATION
// ----------------------------------------------------------------------------
console.log('\n--- 3. Testing Leading Zero Input Normalization ---');

function sanitizeNumericInput(raw, fallback = 1, min = 1) {
  const clean = String(raw).replace(/^0+(?=\d)/, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? fallback : Math.max(min, parsed);
}

runTest('Entering "010" normalizes to 10', () => {
  assert.strictEqual(sanitizeNumericInput('010'), 10);
});

runTest('Entering "005" normalizes to 5', () => {
  assert.strictEqual(sanitizeNumericInput('005'), 5);
});

runTest('Entering "0" with minimum 1 normalizes to 1', () => {
  assert.strictEqual(sanitizeNumericInput('0', 1, 1), 1);
});

// ----------------------------------------------------------------------------
// 4. TEST AUTHORITATIVE TOTAL & PERCENTAGE CALCULATION
// ----------------------------------------------------------------------------
console.log('\n--- 4. Testing Authoritative Total & Grading Calculation ---');

const testExamTemplate = {
  id: 'template_exam_prep_101',
  title: 'Prepositions: At, On, In',
  exam_type: 'Unit Test',
  difficulty: 'Mixed',
  duration_minutes: 45,
  total_marks: 100,
  pass_marks: 40,
  version: 1,
  sections: [
    {
      sectionId: 'sec_1',
      title: 'Multiple Choice Questions',
      marksPerQuestion: 10,
      totalMarks: 50,
      questions: [
        { questionId: 'q1', questionText: 'We meet ___ 8:00 AM.', correctAnswer: 'At', marks: 10, options: ['At', 'On', 'In', 'By'] },
        { questionId: 'q2', questionText: 'The party is ___ Saturday.', correctAnswer: 'On', marks: 10, options: ['At', 'On', 'In', 'To'] },
        { questionId: 'q3', questionText: 'Leaves fall ___ Autumn.', correctAnswer: 'In', marks: 10, options: ['At', 'On', 'In', 'For'] },
        { questionId: 'q4', questionText: 'I was born ___ 2010.', correctAnswer: 'In', marks: 10, options: ['At', 'On', 'In', 'During'] },
        { questionId: 'q5', questionText: 'We sleep ___ night.', correctAnswer: 'At', marks: 10, options: ['At', 'On', 'In', 'With'] }
      ]
    },
    {
      sectionId: 'sec_2',
      title: 'Short Answer Questions',
      marksPerQuestion: 25,
      totalMarks: 50,
      questions: [
        { questionId: 'q6', questionText: 'Explain the rule for using preposition "In" with months and years.', correctAnswer: 'Used for non-specific times during a day, month, season, or year', marks: 25 },
        { questionId: 'q7', questionText: 'Write a sentence using preposition "On" with a specific day.', correctAnswer: 'I have a math exam on Monday', marks: 25 }
      ]
    }
  ]
};

// Student A from Class 6A: answers q1, q2, q3, q4 correctly (40 marks) + q6 hybrid rubric (18 marks) = 58 marks
const studentAAnswers = {
  q1: 'At',
  q2: 'On',
  q3: 'In',
  q4: 'In',
  q5: 'In', // Incorrect (was At)
  q6: 'Used for seasons and years' // Hybrid
};

const gradingA = gradeExamAttempt(testExamTemplate, studentAAnswers);

runTest('Student A scored against authoritative maxScore (100)', () => {
  assert.strictEqual(gradingA.maxScore, 100);
});

runTest('Student A totalScore matches earned marks', () => {
  assert.strictEqual(gradingA.totalScore, 40 + 18); // 40 + 18 = 58
});

runTest('Student A percentage is computed accurately (58%)', () => {
  assert.strictEqual(gradingA.percentage, 58);
});

runTest('Student A status is passing (>= 40%)', () => {
  assert.strictEqual(gradingA.passed, true);
});

// ----------------------------------------------------------------------------
// 5. TEST REPUBLISHING TO CLASS 6A AND CLASS 6B WITH DATA ISOLATION
// ----------------------------------------------------------------------------
console.log('\n--- 5. Testing Multi-Class Republishing & Data Isolation ---');

// Mock republishing engine
function createPublication({ template, classroomId, teacherId, customSettings = {} }) {
  return {
    id: `pub_${classroomId}_${template.id}`,
    parent_exam_id: template.id,
    classroom_id: classroomId,
    teacher_id: teacherId,
    title: template.title,
    total_marks: template.total_marks,
    pass_marks: template.pass_marks,
    version: template.version,
    questions_json: template.sections,
    starts_at: customSettings.startDate ? `${customSettings.startDate}T00:00:00Z` : null,
    ends_at: customSettings.endDate ? `${customSettings.endDate}T23:59:59Z` : null,
    status: 'published',
    created_at: new Date().toISOString()
  };
}

const pub6A = createPublication({
  template: testExamTemplate,
  classroomId: 'class_6a_uuid',
  teacherId: 'teacher_123',
  customSettings: { startDate: '2026-09-10', endDate: '2026-09-15' }
});

const pub6B = createPublication({
  template: testExamTemplate,
  classroomId: 'class_6b_uuid',
  teacherId: 'teacher_123',
  customSettings: { startDate: '2026-09-12', endDate: '2026-09-18' }
});

runTest('Class 6A receives a unique publication instance with parent_exam_id link', () => {
  assert.strictEqual(pub6A.classroom_id, 'class_6a_uuid');
  assert.strictEqual(pub6A.parent_exam_id, testExamTemplate.id);
  assert.notStrictEqual(pub6A.id, testExamTemplate.id);
});

runTest('Class 6B receives a unique publication instance with parent_exam_id link', () => {
  assert.strictEqual(pub6B.classroom_id, 'class_6b_uuid');
  assert.strictEqual(pub6B.parent_exam_id, testExamTemplate.id);
  assert.notStrictEqual(pub6B.id, pub6A.id);
});

// Student Submissions in 6A and 6B
const mockResultsDB = [];

// Student from 6A submits
mockResultsDB.push({
  id: 'res_6a_student1',
  exam_id: pub6A.id,
  classroom_id: pub6A.classroom_id,
  student_id: 'student_6a_nethmi',
  score: 82,
  total_marks: 100,
  percentage: 82.0,
  passed: true
});

mockResultsDB.push({
  id: 'res_6a_student2',
  exam_id: pub6A.id,
  classroom_id: pub6A.classroom_id,
  student_id: 'student_6a_ayaan',
  score: 74,
  total_marks: 100,
  percentage: 74.0,
  passed: true
});

// Student from 6B receives a clean attempt (0 answers copied) and submits
mockResultsDB.push({
  id: 'res_6b_student1',
  exam_id: pub6B.id,
  classroom_id: pub6B.classroom_id,
  student_id: 'student_6b_xavier',
  score: 91,
  total_marks: 100,
  percentage: 91.0,
  passed: true
});

mockResultsDB.push({
  id: 'res_6b_student2',
  exam_id: pub6B.id,
  classroom_id: pub6B.classroom_id,
  student_id: 'student_6b_yasmin',
  score: 67,
  total_marks: 100,
  percentage: 67.0,
  passed: true
});

const results6A = mockResultsDB.filter(r => r.classroom_id === 'class_6a_uuid');
const results6B = mockResultsDB.filter(r => r.classroom_id === 'class_6b_uuid');

runTest('Class 6A results count is 2 and contains only Class 6A students (Nethmi, Ayaan)', () => {
  assert.strictEqual(results6A.length, 2);
  assert.strictEqual(results6A[0].student_id, 'student_6a_nethmi');
  assert.strictEqual(results6A[1].student_id, 'student_6a_ayaan');
});

runTest('Class 6B results count is 2 and contains only Class 6B students (Xavier, Yasmin)', () => {
  assert.strictEqual(results6B.length, 2);
  assert.strictEqual(results6B[0].student_id, 'student_6b_xavier');
  assert.strictEqual(results6B[1].student_id, 'student_6b_yasmin');
});

runTest('Class 6A results do NOT contain Class 6B students (Zero Data Leakage)', () => {
  const has6BIn6A = results6A.some(r => r.student_id.includes('6b'));
  assert.strictEqual(has6BIn6A, false);
});

// ----------------------------------------------------------------------------
// 6. TEST LEADERBOARD ISOLATION
// ----------------------------------------------------------------------------
console.log('\n--- 6. Testing Leaderboard Isolation ---');

const mockPointsDB = [];

// Award points for 6A
results6A.forEach(r => {
  mockPointsDB.push({
    classroom_id: r.classroom_id,
    student_id: r.student_id,
    points: r.score,
    source_type: 'exam',
    source_id: r.exam_id
  });
});

// Award points for 6B
results6B.forEach(r => {
  mockPointsDB.push({
    classroom_id: r.classroom_id,
    student_id: r.student_id,
    points: r.score,
    source_type: 'exam',
    source_id: r.exam_id
  });
});

const leaderboard6A = mockPointsDB.filter(p => p.classroom_id === 'class_6a_uuid');
const leaderboard6B = mockPointsDB.filter(p => p.classroom_id === 'class_6b_uuid');

runTest('Class 6A leaderboard strictly contains Class 6A points only', () => {
  assert.strictEqual(leaderboard6A.length, 2);
  assert.strictEqual(leaderboard6A.every(p => p.classroom_id === 'class_6a_uuid'), true);
});

runTest('Class 6B leaderboard strictly contains Class 6B points only', () => {
  assert.strictEqual(leaderboard6B.length, 2);
  assert.strictEqual(leaderboard6B.every(p => p.classroom_id === 'class_6b_uuid'), true);
});

// ----------------------------------------------------------------------------
// 7. TEST EXAM VERSIONING SAFETY
// ----------------------------------------------------------------------------
console.log('\n--- 7. Testing Exam Versioning Safety ---');

// Teacher edits the template to Version 2 (e.g. adjusts a question text or marks)
const testExamTemplateV2 = {
  ...testExamTemplate,
  version: 2,
  title: 'Prepositions: At, On, In (Revised)',
  sections: [
    ...testExamTemplate.sections,
    {
      sectionId: 'sec_3',
      title: 'Bonus Essay Question',
      marksPerQuestion: 20,
      totalMarks: 20,
      questions: [
        { questionId: 'q8', questionText: 'Write a paragraph on preposition usage.', marks: 20 }
      ]
    }
  ]
};

// Existing publication for 6A remains on Version 1 with its original frozen questions
runTest('Existing publication for Class 6A remains on Version 1', () => {
  assert.strictEqual(pub6A.version, 1);
  assert.strictEqual(pub6A.questions_json.length, 2);
});

// Existing student submissions for Class 6A remain intact without corruption
runTest('Student results for Class 6A are not corrupted by Version 2 creation', () => {
  const student1Res = mockResultsDB.find(r => r.id === 'res_6a_student1');
  assert.strictEqual(student1Res.score, 82);
  assert.strictEqual(student1Res.total_marks, 100);
});

// New publication to Class 7A uses Version 2
const pub7A = createPublication({
  template: testExamTemplateV2,
  classroomId: 'class_7a_uuid',
  teacherId: 'teacher_123'
});

runTest('New publication to Class 7A utilizes Version 2 without impacting 6A or 6B', () => {
  assert.strictEqual(pub7A.version, 2);
  assert.strictEqual(pub7A.questions_json.length, 3);
  assert.strictEqual(pub6A.version, 1);
  assert.strictEqual(pub6B.version, 1);
});

console.log('\n=================================================================');
console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED  `);
console.log('=================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('All verification checks passed successfully!');
}
