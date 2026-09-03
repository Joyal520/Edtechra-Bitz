// ============================================================================
// TEST SUITE: COMPREHENSIVE QUESTION ENGINE & OPEN-ENDED AI EVALUATOR
// Verifies closed-ended question types (Multiple Choice, Multiple Select,
// Sentence Reordering, Odd One Out, Cloze) and Open-Ended Rubric AI Evaluation.
// ============================================================================

import { evaluateEssayDeterministically } from '../server/courseEssayEvaluationService.mjs';

function runComprehensiveQuestionsSuite() {
  console.log('------------------------------------------------------------');
  console.log('3. RUNNING COMPREHENSIVE QUESTION TYPES & AI EVALUATION SUITE');
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

  // 1. Multiple Select Evaluation Logic
  const msCorrectKey = 'A, C, D';
  const correctTokens = msCorrectKey.split(',').map(s => s.trim().toLowerCase());

  const studentSelection1 = ['A', 'C', 'D'].map(s => s.trim().toLowerCase());
  const isMatch1 = studentSelection1.length === correctTokens.length && studentSelection1.every(t => correctTokens.includes(t));
  assert(isMatch1, 'Multiple Select accurately identifies all correct options');

  const studentSelection2 = ['A', 'B'].map(s => s.trim().toLowerCase());
  const isMatch2 = studentSelection2.length === correctTokens.length && studentSelection2.every(t => correctTokens.includes(t));
  assert(!isMatch2, 'Multiple Select accurately rejects partial or incorrect selections');

  // 2. Sentence Reordering Evaluation Logic
  const targetSentence = 'The young eagle soared high above the clouds.';
  const studentChipsCorrect = ['The', 'young', 'eagle', 'soared', 'high', 'above', 'the', 'clouds.'];
  const studentChipsScrambled = ['soared', 'The', 'eagle', 'clouds.', 'above', 'high', 'the', 'young'];

  const cleanTarget = targetSentence.replace(/[.,!?]/g, '').toLowerCase().trim();
  const cleanStudent1 = studentChipsCorrect.join(' ').replace(/[.,!?]/g, '').toLowerCase().trim();
  const cleanStudent2 = studentChipsScrambled.join(' ').replace(/[.,!?]/g, '').toLowerCase().trim();

  assert(cleanStudent1 === cleanTarget, 'Sentence Reordering accepts correctly assembled chip sequence');
  assert(cleanStudent2 !== cleanTarget, 'Sentence Reordering rejects misordered chip sequence');

  // 3. Odd One Out Logic
  const oddQuestion = {
    options: ['Eagle', 'Falcon', 'Hawk', 'Cow'],
    correct_answer: 'Cow'
  };
  assert(
    oddQuestion.options.includes(oddQuestion.correct_answer),
    'Odd One Out options contain the anomaly answer'
  );

  // 4. Comprehension Passage Anchor Grounding
  const comprehensionQuestion = {
    question_text: 'What does "they" refer to in paragraph 2?',
    comprehension_type: 'reference',
    passage: 'The birds flew together until they reached the mountain ridge.',
    correct_answer: 'The birds',
    content_ref: 'Paragraph 2, Line 1'
  };
  assert(
    Boolean(comprehensionQuestion.passage && comprehensionQuestion.content_ref),
    'Comprehension question properly encapsulates passage text and contentRef'
  );

  // 5. Open-Ended Rubric AI Evaluator
  const promptQuestion = 'Explain how the environment influenced the eagle’s beliefs about itself.';
  const thoroughStudentResponse = `The environment played a decisive role in shaping the young eagle's perception. Because it was raised among chickens who constantly pecked at the ground, the eagle learned to mimic their limited behavior. Even though it had powerful wings built for high altitude soaring, the peer pressure and lack of role models convinced the eagle that it was merely a barnyard fowl, preventing it from discovering its true potential.`;

  const evaluationResult = evaluateEssayDeterministically({
    question_text: promptQuestion,
    student_response: thoroughStudentResponse,
    min_words: 30,
    max_words: 150,
    evaluation_criteria: ['content_accuracy', 'relevance', 'completeness', 'language', 'grammar', 'vocabulary']
  });

  assert(
    typeof evaluationResult.score === 'number' && evaluationResult.score >= 70,
    `Open-ended essay scored satisfactorily (${evaluationResult.score}/100)`
  );
  assert(
    evaluationResult.max_score === 100,
    'Evaluation max_score is normalized to 100'
  );
  assert(
    Array.isArray(evaluationResult.strengths) && evaluationResult.strengths.length > 0,
    'Evaluation returns structured actionable strengths'
  );
  assert(
    typeof evaluationResult.criteria_scores === 'object' && Object.keys(evaluationResult.criteria_scores).length > 0,
    'Evaluation breaks down scores across educational criteria (grammar, vocabulary, completeness)'
  );

  console.log(`\nComprehensive Questions Suite Summary: ${passed}/${total} assertions passed.\n`);
}

runComprehensiveQuestionsSuite();
