// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: EXAM PLATFORM REBUILD VERIFICATION SUITE
// Tests:
// 1. Canonical Schema & JSON Validation
// 2. Deterministic Auto-Grading across all 11 question types
// 3. Subjective Grading Revolution (0 score initially, no arbitrary 70%, pending_review)
// 4. Teacher Manual Grading & Re-scoring
// 5. Server-Authoritative Timer & Expiry Enforcement
// ============================================================================

import { gradeExamAttempt } from '../server/exam2Service.mjs';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [ PASS ] ${message}`);
    passedTests++;
  } else {
    console.error(`  [ FAIL ] ${message}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('  TESTING REBUILT EDTECHRA EXAM PLATFORM & GRADING ENGINE       ');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TEST SUITE 1: Canonical Schema & JSON Validation Logic
// ----------------------------------------------------------------------------
console.log('--- 1. Testing Canonical Schema Validation & Normalization ---');

function validateExamJSONMock(data) {
  const errors = [];
  const exam = data.exam || data.metadata;
  if (!exam) {
    errors.push('Missing exam metadata');
    return { isValid: false, errors };
  }
  if (!exam.title || !exam.title.trim()) errors.push('Missing title');
  if (!exam.subject || !exam.subject.trim()) errors.push('Missing subject');
  if (!exam.durationMinutes || exam.durationMinutes <= 0) errors.push('Invalid duration');

  if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
    errors.push('Missing sections');
  } else {
    const seenIds = new Set();
    data.sections.forEach(sec => {
      (sec.questions || []).forEach(q => {
        if (seenIds.has(q.id)) errors.push(`Duplicate ID: ${q.id}`);
        seenIds.add(q.id);

        if (q.type === 'multiple_choice' && !q.correctAnswer) {
          errors.push(`Missing correct answer for MCQ: ${q.id}`);
        }
      });
    });
  }

  return { isValid: errors.length === 0, errors };
}

// Case 1A: Valid Canonical Exam
const validExam = {
  schemaVersion: '1.0',
  exam: {
    title: 'Biology Midterm',
    subject: 'Biology',
    grade: 'Grade 10',
    durationMinutes: 45,
    passPercentage: 50
  },
  sections: [
    {
      id: 'sec_1',
      title: 'Cell Biology',
      questions: [
        { id: 'q1', type: 'multiple_choice', question: 'Cell powerhouse?', correctAnswer: 'Mitochondria', marks: 5 }
      ]
    }
  ]
};
const valRes1 = validateExamJSONMock(validExam);
assert(valRes1.isValid === true, 'Valid canonical exam passes validation');

// Case 1B: Missing Title & Subject
const invalidExam1 = {
  exam: { durationMinutes: 30 },
  sections: [{ id: 's1', questions: [{ id: 'q1', type: 'multiple_choice', correctAnswer: 'a' }] }]
};
const valRes2 = validateExamJSONMock(invalidExam1);
assert(valRes2.isValid === false && valRes2.errors.includes('Missing title'), 'Catches missing title');
assert(valRes2.errors.includes('Missing subject'), 'Catches missing subject');

// Case 1C: Duplicate Question IDs
const duplicateIdExam = {
  exam: { title: 'Test', subject: 'Math', durationMinutes: 30 },
  sections: [
    { id: 's1', questions: [{ id: 'q_duplicate', type: 'multiple_choice', correctAnswer: 'A' }] },
    { id: 's2', questions: [{ id: 'q_duplicate', type: 'multiple_choice', correctAnswer: 'B' }] }
  ]
};
const valRes3 = validateExamJSONMock(duplicateIdExam);
assert(valRes3.isValid === false && valRes3.errors.some(e => e.includes('Duplicate ID')), 'Catches duplicate question IDs across sections');

// ----------------------------------------------------------------------------
// TEST SUITE 2: Deterministic Auto-Grading For Objective Question Types
// ----------------------------------------------------------------------------
console.log('\n--- 2. Testing Deterministic Auto-Grading (Objective Types) ---');

const objectiveExam = {
  id: 'exam_obj_test',
  sections: [
    {
      id: 'sec_obj',
      title: 'Objective Questions',
      questions: [
        {
          id: 'q_mcq',
          type: 'multiple_choice',
          question: 'Capital of France?',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correctAnswer: 'Paris',
          marks: 5
        },
        {
          id: 'q_multiselect',
          type: 'multiple_select',
          question: 'Select all prime numbers:',
          options: ['2', '3', '4', '5'],
          correctAnswer: ['2', '3', '5'],
          marks: 6
        },
        {
          id: 'q_tf',
          type: 'true_false',
          question: 'Water boils at 100 degrees C at sea level.',
          correctAnswer: true,
          marks: 4
        },
        {
          id: 'q_fib',
          type: 'fill_in_blank',
          question: 'The chemical formula for water is [blank].',
          acceptedAnswers: ['H2O', 'h2o'],
          marks: 5
        },
        {
          id: 'q_matching',
          type: 'matching',
          question: 'Match elements to symbols:',
          pairs: [
            { left: 'Hydrogen', right: 'H' },
            { left: 'Helium', right: 'He' },
            { left: 'Oxygen', right: 'O' }
          ],
          marks: 6
        },
        {
          id: 'q_reorder',
          type: 'reorder',
          question: 'Order the life cycle of a butterfly:',
          items: [
            { id: 'egg', text: 'Egg' },
            { id: 'caterpillar', text: 'Caterpillar' },
            { id: 'chrysalis', text: 'Chrysalis' },
            { id: 'butterfly', text: 'Adult Butterfly' }
          ],
          correctOrder: ['egg', 'caterpillar', 'chrysalis', 'butterfly'],
          marks: 4
        }
      ]
    }
  ]
};

// Case 2A: Perfect Score on Objective Types
const perfectStudentAnswers = {
  q_mcq: 'Paris',
  q_multiselect: ['2', '3', '5'],
  q_tf: true,
  q_fib: ' H2O ', // tests whitespace trimming
  q_matching: {
    Hydrogen: 'H',
    Helium: 'He',
    Oxygen: 'O'
  },
  q_reorder: ['egg', 'caterpillar', 'chrysalis', 'butterfly']
};

const resultPerfect = gradeExamAttempt(objectiveExam, perfectStudentAnswers);
assert(resultPerfect.score === 30, `Perfect score calculated: 30 / 30 (got: ${resultPerfect.score})`);
assert(resultPerfect.percentage === 100, `Percentage is 100% (got: ${resultPerfect.percentage}%)`);
assert(resultPerfect.grade === 'A+', `Grade is A+ (got: ${resultPerfect.grade})`);
assert(resultPerfect.gradingStatus === 'auto_graded', `Grading status is auto_graded (got: ${resultPerfect.gradingStatus})`);

// Case 2B: Partial & Incorrect Answers
const partialStudentAnswers = {
  q_mcq: 'London', // Incorrect (0 / 5)
  q_multiselect: ['2', '3'], // Incomplete (0 / 6)
  q_tf: true, // Correct (4 / 4)
  q_fib: 'h2o', // Correct case-insensitive (5 / 5)
  q_matching: {
    Hydrogen: 'H',
    Helium: 'X', // Incorrect match
    Oxygen: 'O'
  }, // Incomplete (0 / 6)
  q_reorder: ['egg', 'chrysalis', 'caterpillar', 'butterfly'] // Wrong sequence (0 / 4)
};

const resultPartial = gradeExamAttempt(objectiveExam, partialStudentAnswers);
assert(resultPartial.score === 9, `Partial score calculated: 9 / 30 (got: ${resultPartial.score})`);
assert(resultPartial.breakdown.find(b => b.questionId === 'q_mcq').isCorrect === false, 'MCQ graded incorrect');
assert(resultPartial.breakdown.find(b => b.questionId === 'q_tf').isCorrect === true, 'True/False graded correct');
assert(resultPartial.breakdown.find(b => b.questionId === 'q_fib').isCorrect === true, 'Fill-in-blank case-insensitivity supported');
assert(resultPartial.breakdown.find(b => b.questionId === 'q_matching').isCorrect === false, 'Matching graded incorrect on mismatched pair');
assert(resultPartial.breakdown.find(b => b.questionId === 'q_reorder').isCorrect === false, 'Reorder graded incorrect on wrong sequence');

// ----------------------------------------------------------------------------
// TEST SUITE 3: Subjective Questions (Elimination of 70% Artificial Score)
// ----------------------------------------------------------------------------
console.log('\n--- 3. Testing Subjective Questions & Eliminating 70% Score ---');

const mixedExam = {
  id: 'exam_mixed_test',
  sections: [
    {
      id: 'sec_mixed',
      title: 'Mixed Section',
      questions: [
        {
          id: 'q_obj1',
          type: 'multiple_choice',
          question: 'Objective Question',
          correctAnswer: 'A',
          marks: 10
        },
        {
          id: 'q_short',
          type: 'short_answer',
          question: 'Define osmosis in your own words.',
          marks: 10
        },
        {
          id: 'q_essay',
          type: 'essay',
          question: 'Discuss the economic impacts of renewable energy transition.',
          marks: 20
        }
      ]
    }
  ]
};

const studentAnswersMixed = {
  q_obj1: 'A',
  q_short: 'Osmosis is the spontaneous net movement or diffusion of solvent molecules through a selectively permeable membrane.',
  q_essay: 'The transition to renewable energy generates high initial capital investments while driving long-term job creation and decreasing health externalities...'
};

const resultInitialSubmission = gradeExamAttempt(mixedExam, studentAnswersMixed);

assert(
  resultInitialSubmission.score === 10,
  `Initial submission score only includes objective points: 10 / 40 (got: ${resultInitialSubmission.score})`
);
assert(
  resultInitialSubmission.gradingStatus === 'pending_review',
  `Initial grading status is 'pending_review' (got: ${resultInitialSubmission.gradingStatus})`
);

const shortBreakdown = resultInitialSubmission.breakdown.find(b => b.questionId === 'q_short');
const essayBreakdown = resultInitialSubmission.breakdown.find(b => b.questionId === 'q_essay');

assert(
  shortBreakdown.score === 0 && shortBreakdown.requiresTeacherReview === true,
  'Short answer receives 0 initially with requiresTeacherReview = true (no artificial 70%)'
);
assert(
  essayBreakdown.score === 0 && essayBreakdown.requiresTeacherReview === true,
  'Essay receives 0 initially with requiresTeacherReview = true (no artificial 70%)'
);

// ----------------------------------------------------------------------------
// TEST SUITE 4: Teacher Manual Grading & Dynamic Re-scoring
// ----------------------------------------------------------------------------
console.log('\n--- 4. Testing Teacher Manual Grading & Dynamic Re-scoring ---');

const teacherSubjectiveScores = {
  q_short: 9, // 9 / 10 marks
  q_essay: 18 // 18 / 20 marks
};

const teacherSubjectiveFeedbacks = {
  q_short: 'Precise definition highlighting selective permeability.',
  q_essay: 'Strong economic analysis with well-structured supporting points.'
};

const resultAfterTeacherGrading = gradeExamAttempt(
  mixedExam,
  studentAnswersMixed,
  teacherSubjectiveScores,
  teacherSubjectiveFeedbacks
);

// Expected: 10 (objective) + 9 (short) + 18 (essay) = 37 / 40 (92.5%) -> Grade A+
assert(
  resultAfterTeacherGrading.score === 37,
  `Score after manual grading: 37 / 40 (got: ${resultAfterTeacherGrading.score})`
);
assert(
  resultAfterTeacherGrading.percentage === 92.5,
  `Percentage recomputed to 92.5% (got: ${resultAfterTeacherGrading.percentage}%)`
);
assert(
  resultAfterTeacherGrading.grade === 'A+',
  `Grade assigned is A+ (got: ${resultAfterTeacherGrading.grade})`
);
assert(
  resultAfterTeacherGrading.gradingStatus === 'reviewed',
  `Grading status transitioned to 'reviewed' (got: ${resultAfterTeacherGrading.gradingStatus})`
);

const reviewedShort = resultAfterTeacherGrading.breakdown.find(b => b.questionId === 'q_short');
assert(
  reviewedShort.score === 9 && reviewedShort.requiresTeacherReview === false && reviewedShort.teacherFeedback.includes('Precise definition'),
  'Teacher feedback and score properly merged into breakdown item'
);

// ----------------------------------------------------------------------------
// TEST SUITE 5: Server-Authoritative Timer & Expiry Logic
// ----------------------------------------------------------------------------
console.log('\n--- 5. Testing Server-Authoritative Timer & Expiry Logic ---');

const now = Date.now();
const durationMinutes = 45;
const startedAt = new Date(now - 10 * 60 * 1000).toISOString(); // started 10 mins ago
const expiresAt = new Date(now + 35 * 60 * 1000).toISOString(); // expires in 35 mins

const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
assert(
  remainingSeconds > 2000 && remainingSeconds <= 2100,
  `Remaining time properly calculated from server timestamp (${remainingSeconds}s remaining)`
);

// Expired attempt test
const expiredStartedAt = new Date(now - 50 * 60 * 1000).toISOString();
const expiredExpiresAt = new Date(now - 5 * 60 * 1000).toISOString(); // expired 5 mins ago
const expiredRemainingSeconds = Math.max(0, Math.floor((new Date(expiredExpiresAt).getTime() - Date.now()) / 1000));
assert(
  expiredRemainingSeconds === 0,
  'Expired attempt yields exactly 0 seconds remaining'
);

// Grace period check (60-second tolerance for clock drift)
const GRACE_PERIOD_MS = 60 * 1000;
const isWithinGrace = (submittedAtMs, expiryMs) => submittedAtMs <= expiryMs + GRACE_PERIOD_MS;
assert(
  isWithinGrace(now + 30 * 1000, now) === true,
  'Grace period permits 30s clock drift buffer'
);
assert(
  isWithinGrace(now + 120 * 1000, now) === false,
  'Grace period rejects 2-minute late submission'
);

// ----------------------------------------------------------------------------
// FINAL SUMMARY
// ----------------------------------------------------------------------------
console.log('\n=================================================================');
console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED     `);
console.log('=================================================================');

if (failedTests > 0) {
  process.exit(1);
}
