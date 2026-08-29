// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: OPTIONAL QUESTION TYPES & JSON IMPORTER TESTS
// Verifies dynamic prompt generation, optional question types, exact plan counts,
// empty set detection, duplicate type protection, and unexpected type guards.
// ============================================================================

import assert from 'assert';
import {
  buildAiQuestionPrompt,
  validateAiQuestionJson,
  convertValidatedJsonToCourseQuestions,
  QuestionPlan
} from '../src/utils/questionSchemaValidator';

console.log('\n======================================================');
console.log('🧪 RUNNING AI QUESTION PLAN OPTIONAL TYPES TEST SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
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

// Mock helpers
const makeMcq = (i: number) => ({
  question: `What is concept #${i}?`,
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correct_answer: 'Option B',
  explanation: `Explanation for concept #${i}`,
  difficulty: 'medium',
  points: 10
});

const makeTf = (i: number) => ({
  statement: `Statement #${i} is accurate.`,
  correct_answer: true,
  explanation: `Explanation for #${i}`,
  difficulty: 'medium',
  points: 10
});

const makeOrd = (i: number) => ({
  question: `Order story events #${i}`,
  items: ['Event 1', 'Event 2', 'Event 3', 'Event 4', 'Event 5'],
  explanation: `Chronological flow for #${i}`,
  difficulty: 'medium',
  points: 10
});

const makeFill = (i: number) => ({
  sentence: `The eagle flew in the ______ #${i}.`,
  correct_answer: 'sky',
  explanation: `Explanation #${i}`,
  difficulty: 'medium',
  points: 10
});

// ----------------------------------------------------------------------------
// TEST 1: Plan with MCQ 5, True/False 3, Ordering 5 (Total 13)
// ----------------------------------------------------------------------------
test('TEST 1: JSON containing exactly MCQ 5, True/False 3, Ordering 5 validates successfully (13 questions)', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'true_false', count: 3, difficulty: 'medium' },
      { id: '3', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Born for the Sky' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3,4,5].map(makeMcq) },
      { type: 'true_false', questions: [1,2,3].map(makeTf) },
      { type: 'ordering', questions: [1,2,3,4,5].map(makeOrd) }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
  assert.strictEqual(res.summary.totalQuestions, 13);
  assert.strictEqual(res.summary.byType.multiple_choice, 5);
  assert.strictEqual(res.summary.byType.true_false, 3);
  assert.strictEqual(res.summary.byType.ordering, 5);
});

// ----------------------------------------------------------------------------
// TEST 2: Plan with MCQ 5, Ordering 5 (Only 2 types requested)
// ----------------------------------------------------------------------------
test('TEST 2: Plan with only MCQ 5 and Ordering 5 validates with no complaints about missing types', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3,4,5].map(makeMcq) },
      { type: 'ordering', questions: [1,2,3,4,5].map(makeOrd) }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
  assert.strictEqual(res.summary.totalQuestions, 10);
});

// ----------------------------------------------------------------------------
// TEST 3: Plan with single type: Ordering 5
// ----------------------------------------------------------------------------
test('TEST 3: Single type (Ordering 5) validates with only 1 question set', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'ordering', questions: [1,2,3,4,5].map(makeOrd) }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
  assert.strictEqual(res.summary.totalQuestions, 5);
});

// ----------------------------------------------------------------------------
// TEST 4: Count mismatch detection (Requested 5 Ordering, received 4)
// ----------------------------------------------------------------------------
test('TEST 4: Count mismatch (MCQ 5, TF 3, Ordering 4 vs expected 5) reports specific count error', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'true_false', count: 3, difficulty: 'medium' },
      { id: '3', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3,4,5].map(makeMcq) },
      { type: 'true_false', questions: [1,2,3].map(makeTf) },
      { type: 'ordering', questions: [1,2,3,4].map(makeOrd) } // 4 instead of 5
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation should fail for count mismatch');
  assert(res.errors.some(e => e.includes('Ordering requires 5 questions, but JSON contains 4')), 'Must report exact Ordering count mismatch');
});

// ----------------------------------------------------------------------------
// TEST 5: Empty question set rule
// ----------------------------------------------------------------------------
test('TEST 5: Present but empty question set (questions: []) is rejected as empty set', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'true_false', count: 3, difficulty: 'medium' },
      { id: '3', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3,4,5].map(makeMcq) },
      { type: 'true_false', questions: [1,2,3].map(makeTf) },
      { type: 'fill_blank', questions: [] }, // empty
      { type: 'ordering', questions: [1,2,3,4,5].map(makeOrd) }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation should fail for empty question set');
  assert(res.errors.some(e => e.includes('Fill in the Blank question set is empty')), 'Must report empty question set');
});

// ----------------------------------------------------------------------------
// TEST 6: Unexpected question type guard
// ----------------------------------------------------------------------------
test('TEST 6: Unexpected unrequested question type is rejected with clear error', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'true_false', count: 3, difficulty: 'medium' },
      { id: '3', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3,4,5].map(makeMcq) },
      { type: 'true_false', questions: [1,2,3].map(makeTf) },
      { type: 'ordering', questions: [1,2,3,4,5].map(makeOrd) },
      { type: 'fill_blank', questions: [1,2].map(makeFill) } // extra unrequested
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation should fail for unexpected question type');
  assert(res.errors.some(e => e.includes('Unexpected question type: fill_blank')), 'Must report unexpected question type');
});

// ----------------------------------------------------------------------------
// TEST 7: Duplicate question type protection
// ----------------------------------------------------------------------------
test('TEST 7: Duplicate question type in JSON is rejected', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3].map(makeMcq) },
      { type: 'multiple_choice', questions: [4,5].map(makeMcq) }, // duplicate
      { type: 'ordering', questions: [1,2,3,4,5].map(makeOrd) }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation should fail for duplicate type');
  assert(res.errors.some(e => e.includes('Duplicate question type: multiple_choice')), 'Must report duplicate type');
});

// ----------------------------------------------------------------------------
// TEST 8: Dynamic AI Prompt Builder contains ONLY selected types
// ----------------------------------------------------------------------------
test('TEST 8: Dynamic AI Prompt includes ONLY requested question types in instructions and JSON template', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'true_false', count: 3, difficulty: 'medium' },
      { id: '3', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const prompt = buildAiQuestionPrompt({
    courseTitle: 'Eagle Wings',
    unitTitle: 'Unit 1',
    episodeTitle: 'Lesson 1',
    lessonText: 'Story text here',
    plan
  });

  assert(prompt.includes('Multiple Choice — 5 questions'), 'Must list MCQ requirement');
  assert(prompt.includes('True / False — 3 questions'), 'Must list TF requirement');
  assert(prompt.includes('Ordering — 5 questions'), 'Must list Ordering requirement');
  assert(prompt.includes('"type": "multiple_choice"'), 'Template must include MCQ');
  assert(prompt.includes('"type": "true_false"'), 'Template must include TF');
  assert(prompt.includes('"type": "ordering"'), 'Template must include Ordering');
  assert(!prompt.includes('"type": "fill_blank"'), 'Template must NOT include unrequested fill_blank');
  assert(!prompt.includes('"type": "matching"'), 'Template must NOT include unrequested matching');
  assert(!prompt.includes('"type": "short_answer"'), 'Template must NOT include unrequested short_answer');
});

console.log('\n======================================================');
console.log(`🎯 OPTIONAL TYPES TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
