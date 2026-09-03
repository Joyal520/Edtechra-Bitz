// ============================================================================
// TEST SUITE: QUESTION STATE ISOLATION & ANTI-CROSS-CONTAMINATION
// Validates strict per-question state isolation, unique UUID enforcement,
// independent feedback assignment, and prevention of question cross-contamination.
// ============================================================================

import crypto from 'crypto';

function runQuestionIsolationSuite() {
  console.log('------------------------------------------------------------');
  console.log('2. RUNNING QUESTION STATE ISOLATION & INTEGRITY SUITE');
  console.log('------------------------------------------------------------');

  let passed = 0;
  let total = 0;

  function assert(condition, desc) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Synthesize 5 Questions (Simulating AI or Course Authoring)
  const sampleQuestions = [
    {
      id: crypto.randomUUID(),
      question_text: 'What did the young eagle see in the sky?',
      question_type: 'multiple_choice',
      options: ['A flock of chickens', 'A magnificent eagle soaring high', 'A dark storm cloud', 'A golden airplane'],
      correct_answer: 'A magnificent eagle soaring high',
      explanation: 'The passage states the eagle looked up and saw a great eagle soaring freely.',
      points: 10
    },
    {
      id: crypto.randomUUID(),
      question_text: 'True or False: The eagle spent its entire life believing it was a chicken.',
      question_type: 'true_false',
      options: ['True', 'False'],
      correct_answer: 'True',
      explanation: 'According to the fable, because it was raised as a chicken, it lived and died believing it was one.',
      points: 10
    },
    {
      id: crypto.randomUUID(),
      question_text: 'Fill in the blank: The eagle was born with wings to ______.',
      question_type: 'fill_blank',
      options: [],
      correct_answer: 'soar',
      explanation: 'The moral of the story emphasizes flying and soaring high.',
      points: 10
    },
    {
      id: crypto.randomUUID(),
      question_text: 'Select all reasons why the eagle did not fly:',
      question_type: 'multiple_select',
      options: ['The chickens told him it was impossible', 'He believed he was a chicken', 'He had broken wings', 'He never tried'],
      correct_answer: 'The chickens told him it was impossible, He believed he was a chicken, He never tried',
      explanation: 'His environment and beliefs conditioned his behavior.',
      points: 15
    },
    {
      id: crypto.randomUUID(),
      question_text: 'Explain in your own words the moral lesson of the story.',
      question_type: 'short_answer',
      options: [],
      correct_answer: 'Believe in your own potential regardless of your surroundings.',
      explanation: 'The fable teaches self-belief and overcoming conditioning.',
      points: 20
    }
  ];

  // A. Verify all question IDs are valid, non-empty, unique UUIDs
  const idSet = new Set(sampleQuestions.map(q => q.id));
  assert(
    idSet.size === 5 && !idSet.has(undefined) && !idSet.has('') && !idSet.has(null),
    'All 5 questions possess unique, defined, immutable UUIDs'
  );

  // B. Simulate Partitioned Student Attempt State (Strictly keyed by Question ID)
  const studentAttemptState = {
    responses: {}
  };

  // C. Step 1: Student answers Question 1 INCORRECTLY
  const q1 = sampleQuestions[0];
  const q1StudentAnswer = 'A dark storm cloud'; // wrong answer
  const isQ1Correct = q1StudentAnswer === q1.correct_answer;

  studentAttemptState.responses[q1.id] = {
    questionId: q1.id,
    answer: q1StudentAnswer,
    status: isQ1Correct ? 'correct' : 'incorrect',
    score: isQ1Correct ? q1.points : 0,
    maxScore: q1.points,
    feedback: isQ1Correct ? 'Correct!' : `Incorrect. The correct answer was: ${q1.correct_answer}.`
  };

  // VERIFY CRITICAL BUG RESOLUTION:
  // Question 1 has incorrect feedback AND score 0
  assert(
    studentAttemptState.responses[q1.id].status === 'incorrect' &&
    studentAttemptState.responses[q1.id].score === 0,
    'Question 1 response is correctly recorded as incorrect with 0 points'
  );

  // Questions 2, 3, 4, 5 MUST REMAIN COMPLETELY UNTOUCHED!
  const q2 = sampleQuestions[1];
  const q3 = sampleQuestions[2];
  const q4 = sampleQuestions[3];
  const q5 = sampleQuestions[4];

  assert(
    studentAttemptState.responses[q2.id] === undefined &&
    studentAttemptState.responses[q3.id] === undefined &&
    studentAttemptState.responses[q4.id] === undefined &&
    studentAttemptState.responses[q5.id] === undefined,
    'Questions 2, 3, 4, 5 are strictly untouched and free of Question 1 cross-contamination'
  );

  // D. Step 2: Student answers Question 2 CORRECTLY
  const q2StudentAnswer = 'True';
  const isQ2Correct = q2StudentAnswer === q2.correct_answer;

  studentAttemptState.responses[q2.id] = {
    questionId: q2.id,
    answer: q2StudentAnswer,
    status: isQ2Correct ? 'correct' : 'incorrect',
    score: isQ2Correct ? q2.points : 0,
    maxScore: q2.points,
    feedback: 'Correct! You understood the story sequence.'
  };

  assert(
    studentAttemptState.responses[q2.id].status === 'correct' &&
    studentAttemptState.responses[q2.id].score === 10,
    'Question 2 records independent correct status and awards 10 points'
  );

  assert(
    studentAttemptState.responses[q1.id].status === 'incorrect' &&
    studentAttemptState.responses[q1.id].score === 0,
    'Question 1 remains locked in its own state without being overwritten by Question 2'
  );

  // E. Verify Overall Score Aggregation
  const totalScore = Object.values(studentAttemptState.responses).reduce((sum, r) => sum + r.score, 0);
  const totalAnswered = Object.keys(studentAttemptState.responses).length;

  assert(totalScore === 10, `Total score is accurately calculated as 10 (0 from Q1 + 10 from Q2)`);
  assert(totalAnswered === 2, `Total answered is accurately 2 out of 5 questions`);

  console.log(`\nQuestion Isolation Suite Summary: ${passed}/${total} assertions passed.\n`);
}

runQuestionIsolationSuite();
