// ============================================================================
// VERIFICATION SCRIPT 2: WH QUESTIONS & AI ANSWER EVALUATION SERVICE
// ============================================================================

import assert from 'node:assert/strict';
import { evaluateStudentAnswer } from '../server/courseAnswerEvaluationService.mjs';

console.log('🧪 Starting WH Questions & Semantic Evaluation Test Suite...\n');

async function runTests() {
  // Test 1: Full correct answer
  console.log('--- TEST 1: Ideal Answer ---');
  const res1 = await evaluateStudentAnswer({
    question_text: 'Where is Emily from?',
    student_answer: 'Emily is from London.',
    expected_answer: 'Emily is from London.',
    acceptable_answers: ['London', 'She is from London', 'She lives in London'],
    passage: 'Emily lives in London with her family.',
    max_score: 10,
    cefr_level: 'A1',
    wh_type: 'where'
  });

  console.log('Result 1 (Ideal):', res1);
  assert.equal(res1.correct, true, 'Ideal answer should be correct');
  assert.equal(res1.score, 10, 'Ideal answer should get 10 points');
  console.log('✅ TEST 1 PASSED: Ideal answer scored 10/10\n');

  // Test 2: Semantic comprehension with minor grammar error (A1 leniency)
  // Student writes "She from London." (missing 'is').
  // For A1 comprehension, understanding that she is from London is 100% demonstrated.
  console.log('--- TEST 2: Semantic Comprehension with Grammar Leniency ("She from London.") ---');
  const res2 = await evaluateStudentAnswer({
    question_text: 'Where is Emily from?',
    student_answer: 'She from London.',
    expected_answer: 'Emily is from London.',
    acceptable_answers: ['London', 'She is from London', 'She lives in London'],
    passage: 'Emily lives in London with her family.',
    max_score: 10,
    cefr_level: 'A1',
    wh_type: 'where'
  });

  console.log('Result 2 (A1 Lenient):', res2);
  assert.equal(res2.correct, true, 'Comprehension should be marked correct');
  assert.ok(res2.score >= 7, `Score should be at least 7/10 for substantially correct understanding (got ${res2.score})`);
  console.log('Language Feedback provided:', res2.languageFeedback);
  console.log('✅ TEST 2 PASSED: Semantic comprehension credited, coaching advice returned\n');

  // Test 3: Short answer ("London")
  console.log('--- TEST 3: Short Answer ("London") ---');
  const res3 = await evaluateStudentAnswer({
    question_text: 'Where is Emily from?',
    student_answer: 'London',
    expected_answer: 'Emily is from London.',
    acceptable_answers: ['London', 'She is from London', 'She lives in London'],
    passage: 'Emily lives in London with her family.',
    max_score: 10,
    cefr_level: 'A1',
    wh_type: 'where'
  });

  console.log('Result 3 ("London"):', res3);
  assert.equal(res3.correct, true, 'One-word key factual answer should be correct');
  assert.ok(res3.score >= 8, `Score should be at least 8/10 (got ${res3.score})`);
  console.log('✅ TEST 3 PASSED: Short answer credited\n');

  // Test 4: Completely wrong answer ("She lives in Paris.")
  console.log('--- TEST 4: Factually Incorrect Answer ("She lives in Paris.") ---');
  const res4 = await evaluateStudentAnswer({
    question_text: 'Where is Emily from?',
    student_answer: 'She lives in Paris.',
    expected_answer: 'Emily is from London.',
    acceptable_answers: ['London', 'She is from London', 'She lives in London'],
    passage: 'Emily lives in London with her family.',
    max_score: 10,
    cefr_level: 'A1',
    wh_type: 'where'
  });

  console.log('Result 4 (Wrong):', res4);
  assert.equal(res4.correct, false, 'Wrong location should be marked incorrect');
  assert.equal(res4.score, 0, 'Wrong answer should receive 0 points');
  assert.match(res4.feedback, /London/i, 'Feedback should mention London');
  console.log('✅ TEST 4 PASSED: Incorrect answer rejected accurately\n');

  console.log('🎉 ALL WH & AI ANSWER EVALUATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
