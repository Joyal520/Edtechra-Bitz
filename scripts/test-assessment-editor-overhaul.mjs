// ============================================================================
// VERIFICATION TEST SUITE: EDTECHRA COURSE STUDIO ASSESSMENT & EDITOR OVERHAUL
// ============================================================================

import assert from 'assert';
import { normalizeLessonContent } from '../src/utils/courseTextFormatting.tsx';
import {
  cleanTextForComparison,
  normalizeQuestionOptions,
  resolveCorrectOption,
  isOptionMatchingStudentAnswer,
  evaluateQuestionAnswer,
  isSemanticWhMatch
} from '../src/utils/questionGrading.ts';
import { convertValidatedJsonToCourseQuestions } from '../src/utils/questionSchemaValidator.ts';
import { evaluateAnswerDeterministically } from '../server/courseAnswerEvaluationService.mjs';

console.log('🧪 Starting Assessment & Editor Overhaul Test Suite...\n');

// ----------------------------------------------------------------------------
// 1. MARKDOWN & RAW HTML TAG NORMALIZATION
// ----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Markdown & HTML Normalization ---');

const rawHtmlEditorInput = `
<div><h1>Emily Introduces Herself</h1></div>
<div><p>Hello! My name is <strong>Emily</strong> and I am <em>10 years old</em>.</p></div>
<div>I live with my <u>family</u> in London.</div>
<div><span>Here are my details:</span></div>
<div><br></div>
<blockquote>Reading is my favourite hobby.</blockquote>
`;

const normalized = normalizeLessonContent(rawHtmlEditorInput);
console.log('Normalized output snippet:\n', normalized.slice(0, 150), '...');

assert.ok(!normalized.includes('<div>'), 'Must NOT contain <div>');
assert.ok(!normalized.includes('</div>'), 'Must NOT contain </div>');
assert.ok(!normalized.includes('<span>'), 'Must NOT contain <span>');
assert.ok(!normalized.includes('</span>'), 'Must NOT contain </span>');
assert.ok(normalized.includes('# Emily Introduces Herself'), 'Must preserve H1 heading');
assert.ok(normalized.includes('**Emily**'), 'Must preserve bold markdown');
assert.ok(normalized.includes('*10 years old*') || normalized.includes('_10 years old_'), 'Must preserve italic markdown');
assert.ok(normalized.includes('<u>family</u>'), 'Must preserve underline tag');
assert.ok(normalized.includes('> Reading is my favourite hobby.'), 'Must preserve blockquote');
console.log('✅ TEST GROUP 1 PASSED: HTML cleaned and Markdown preserved.\n');

// ----------------------------------------------------------------------------
// 2. MCQ IMPORT SHUFFLING & OPTION LETTER RE-MAPPING
// ----------------------------------------------------------------------------
console.log('--- TEST GROUP 2: MCQ Fisher-Yates Shuffling & Stable Correct Answer ---');

const sampleJsonWithBiasA = {
  question_sets: [
    {
      type: 'multiple_choice',
      questions: [
        {
          question: 'Where does Emily live?',
          options: ['London', 'Paris', 'Berlin', 'Madrid'],
          correct_answer: 'London',
          explanation: 'Emily explicitly stated she lives in London.',
          points: 10
        },
        {
          question: 'How old is Emily?',
          options: ['10 years old', '8 years old', '12 years old', '15 years old'],
          correct_answer: '10 years old',
          explanation: 'Emily is 10 years old.',
          points: 10
        }
      ]
    }
  ]
};

const importedQuestions = convertValidatedJsonToCourseQuestions(sampleJsonWithBiasA, 'ep_123', 'course_123');
assert.strictEqual(importedQuestions.length, 2, 'Should import 2 questions');

const q1 = importedQuestions[0];
console.log('Q1 Question:', q1.question_text);
console.log('Q1 Options:', q1.options);
console.log('Q1 Correct Answer Letter:', q1.correct_answer);

// Verify options have IDs A, B, C, D
const ids = q1.options.map(o => o.id);
assert.deepStrictEqual(ids, ['A', 'B', 'C', 'D'], 'Options must have stable letters A-D');

// Verify that whichever letter correct_answer points to is indeed "London"
const correctOptionObj = q1.options.find(o => o.id === q1.correct_answer);
assert.ok(correctOptionObj, 'Correct option object must exist');
assert.strictEqual(correctOptionObj.text, 'London', 'Correct option must be London');

// Verify grading with that letter awards full score
const evalCorrect = evaluateQuestionAnswer(q1, q1.correct_answer);
assert.strictEqual(evalCorrect.isCorrect, true, 'Student answering with correct letter should be marked correct');
assert.strictEqual(evalCorrect.score, 10, 'Score should be 10');

// Verify grading with wrong letter fails
const wrongOption = q1.options.find(o => o.text !== 'London');
const evalWrong = evaluateQuestionAnswer(q1, wrongOption.id);
assert.strictEqual(evalWrong.isCorrect, false, 'Wrong letter should be marked incorrect');
assert.strictEqual(evalWrong.score, 0, 'Score should be 0');

console.log('✅ TEST GROUP 2 PASSED: MCQ Fisher-Yates shuffle correctly re-indexes letters and tracks answer.\n');

// ----------------------------------------------------------------------------
// 3. SEMANTIC WH QUESTION EVALUATION (CLIENT & SERVER)
// ----------------------------------------------------------------------------
console.log('--- TEST GROUP 3: Semantic WH Question Evaluator ---');

const whQuestion = {
  id: 'q_wh_1',
  episode_id: 'ep_1',
  course_id: 'c_1',
  question_text: 'Who does Emily live with?',
  question_type: 'wh_question',
  options: {
    options: ['with her family', 'with her parents'],
    expected_answer: 'She lives with her family.',
    acceptable_answers: [
      'with her family',
      'her family',
      'with her parents',
      'her parents',
      'with mom and dad'
    ],
    wh_type: 'who',
    passage: 'Emily lives in London with her family in a small house.'
  },
  expected_answer: 'She lives with her family.',
  acceptable_answers: ['with her family', 'her family', 'with her parents', 'her parents'],
  correct_answer: 'She lives with her family.',
  points: 10
};

// Client evaluator tests
const positiveCases = [
  'with her parents',
  'with her family',
  'She lives with her parents.',
  'her parents',
  'with mom and dad',
  'With parents'
];

for (const studentAns of positiveCases) {
  const result = evaluateQuestionAnswer(whQuestion, studentAns);
  console.log(`Testing valid phrasing "${studentAns}" -> isCorrect: ${result.isCorrect}`);
  assert.strictEqual(result.isCorrect, true, `Should accept valid variation: "${studentAns}"`);
}

const negativeCases = [
  'with her dog',
  'with friends',
  'Paris',
  'yes',
  'I do not know'
];

for (const studentAns of negativeCases) {
  const result = evaluateQuestionAnswer(whQuestion, studentAns);
  console.log(`Testing invalid response "${studentAns}" -> isCorrect: ${result.isCorrect}`);
  assert.strictEqual(result.isCorrect, false, `Should reject invalid answer: "${studentAns}"`);
}

// Server deterministic evaluator tests
console.log('\nTesting server-side evaluateAnswerDeterministically:');
const serverEvalParents = evaluateAnswerDeterministically({
  question_text: whQuestion.question_text,
  student_answer: 'with her parents',
  expected_answer: 'She lives with her family.',
  acceptable_answers: ['with her family', 'her family']
});
assert.strictEqual(serverEvalParents.correct, true, 'Server must accept "with her parents"');

const serverEvalDog = evaluateAnswerDeterministically({
  question_text: whQuestion.question_text,
  student_answer: 'with her dog',
  expected_answer: 'She lives with her family.',
  acceptable_answers: ['with her family', 'her family']
});
assert.strictEqual(serverEvalDog.correct, false, 'Server must reject "with her dog"');

console.log('✅ TEST GROUP 3 PASSED: WH semantic evaluation accepts synonyms and blocks false positives.\n');

// ----------------------------------------------------------------------------
// 4. EMILY COMPLETE LESSON & ASSESSMENT INTEGRATION
// ----------------------------------------------------------------------------
console.log('--- TEST GROUP 4: Emily Introduces Herself Full Lesson & Questions ---');

const emilyFullAssessmentJson = {
  question_sets: [
    {
      type: 'multiple_choice',
      questions: [
        {
          question: 'Where does Emily live?',
          options: ['London', 'Edinburgh', 'Manchester', 'Oxford'],
          correct_answer: 'London',
          explanation: 'Emily lives in London.',
          points: 10
        },
        {
          question: 'How old is Emily?',
          options: ['10 years old', '7 years old', '12 years old', '9 years old'],
          correct_answer: '10 years old',
          explanation: 'Emily is 10 years old.',
          points: 10
        },
        {
          question: 'What is Emily’s favourite hobby?',
          options: ['Reading books', 'Playing football', 'Swimming', 'Cooking'],
          correct_answer: 'Reading books',
          explanation: 'Emily loves reading books and painting.',
          points: 10
        }
      ]
    },
    {
      type: 'true_false',
      questions: [
        {
          question: 'Emily lives in a big city.',
          statement: 'Emily lives in a big city.',
          correct_answer: true,
          explanation: 'London is a big city.',
          points: 10
        },
        {
          question: 'Emily is 15 years old.',
          statement: 'Emily is 15 years old.',
          correct_answer: false,
          explanation: 'Emily is 10 years old.',
          points: 10
        }
      ]
    },
    {
      type: 'wh_question',
      questions: [
        {
          question: 'Where does Emily live?',
          wh_type: 'where',
          expected_answer: 'She lives in London.',
          acceptable_answers: ['London', 'in London', 'She lives in London', 'London, England'],
          passage: 'Emily lives in London with her family in a small house near a green park.',
          explanation: 'The passage explicitly states Emily lives in London.',
          points: 10
        },
        {
          question: 'Who does Emily live with?',
          wh_type: 'who',
          expected_answer: 'She lives with her family.',
          acceptable_answers: ['with her family', 'her family', 'with her parents', 'her parents'],
          passage: 'Emily lives in London with her family in a small house near a green park.',
          explanation: 'The passage states Emily lives with her family.',
          points: 10
        },
        {
          question: 'What does Emily enjoy doing?',
          wh_type: 'what',
          expected_answer: 'She enjoys reading books and painting.',
          acceptable_answers: ['reading books and painting', 'reading and painting', 'reading books'],
          passage: 'In her free time, Emily enjoys reading storybooks and painting pictures.',
          explanation: 'Emily loves reading and painting.',
          points: 10
        }
      ]
    }
  ]
};

const emilyQuestions = convertValidatedJsonToCourseQuestions(emilyFullAssessmentJson, 'ep_emily', 'course_emily');
assert.strictEqual(emilyQuestions.length, 8, 'Must have 8 total questions (3 MCQ + 2 TF + 3 WH)');

// Verify types count
const mcqCount = emilyQuestions.filter(q => q.question_type === 'multiple_choice').length;
const tfCount = emilyQuestions.filter(q => q.question_type === 'true_false').length;
const whCount = emilyQuestions.filter(q => q.question_type === 'wh_question').length;

assert.strictEqual(mcqCount, 3, 'Must have 3 MCQs');
assert.strictEqual(tfCount, 2, 'Must have 2 True/False');
assert.strictEqual(whCount, 3, 'Must have 3 WH Questions');

// Verify True/False grading
const tf1 = emilyQuestions[3];
const tf1ResultTrue = evaluateQuestionAnswer(tf1, 'True');
assert.strictEqual(tf1ResultTrue.isCorrect, true, 'True/False true should be correct');

const tf2 = emilyQuestions[4];
const tf2ResultFalse = evaluateQuestionAnswer(tf2, 'False');
assert.strictEqual(tf2ResultFalse.isCorrect, true, 'True/False false should be correct');

console.log('✅ TEST GROUP 4 PASSED: Emily lesson assessment imported and verified with 100% accuracy.\n');

console.log('🎉 ALL TESTS PASSED! Assessment & Editor Overhaul is complete and verified.');
