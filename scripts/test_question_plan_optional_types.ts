import assert from 'assert';
import {
  validateAiQuestionJson,
  buildAiQuestionPrompt,
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
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

const makeMcq = (i: number) => ({
  question: `What happened in chapter #${i}?`,
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correct_answer: 'Option A',
  explanation: `Explanation for #${i}`,
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

const makeSingleOrderingActivity = (sentenceCount: number) => ({
  question: 'Arrange the story events in chronological order.',
  items: Array.from({ length: sentenceCount }, (_, idx) => `Event sentence #${idx + 1}`),
  explanation: 'Chronological sequence of story events.',
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
// TEST 1: Plan with MCQ 5, True/False 3, Ordering 5 (Total 9 activities)
// ----------------------------------------------------------------------------
test('TEST 1: JSON containing exactly MCQ 5, True/False 3, Ordering 5 validates successfully (9 activities)', () => {
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
      { type: 'ordering', questions: [makeSingleOrderingActivity(5)] }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
  assert.strictEqual(res.summary.totalQuestions, 9);
  assert.strictEqual(res.summary.byType.multiple_choice, 5);
  assert.strictEqual(res.summary.byType.true_false, 3);
  assert.strictEqual(res.summary.byType.ordering, 1);
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
      { type: 'ordering', questions: [makeSingleOrderingActivity(5)] }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
  assert.strictEqual(res.summary.totalQuestions, 6);
  assert.strictEqual(res.summary.byType.multiple_choice, 5);
  assert.strictEqual(res.summary.byType.ordering, 1);
});

// ----------------------------------------------------------------------------
// TEST 3: Single type (Ordering 5 sentences)
// ----------------------------------------------------------------------------
test('TEST 3: Single type (Ordering 5) validates with only 1 question set', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Ordering only lesson' },
    question_sets: [
      { type: 'ordering', questions: [makeSingleOrderingActivity(5)] }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, true, `Validation should pass: ${res.errors.join(', ')}`);
  assert.strictEqual(res.summary.totalQuestions, 1);
  assert.strictEqual(res.summary.byType.ordering, 1);
});

// ----------------------------------------------------------------------------
// TEST 4: Count mismatch detection
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
      { type: 'ordering', questions: [makeSingleOrderingActivity(4)] } // only 4 sentences instead of 5
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation must fail on count mismatch');
  assert(res.errors.some(e => e.includes('Ordering requires 5 sentences')), 'Must report exact Ordering count mismatch');
});

// ----------------------------------------------------------------------------
// TEST 5: Present but empty question set (questions: []) is rejected
// ----------------------------------------------------------------------------
test('TEST 5: Present but empty question set (questions: []) is rejected as empty set', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3,4,5].map(makeMcq) },
      { type: 'fill_blank', questions: [] }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation must reject empty question set');
  assert(res.errors.some(e => e.includes('Fill in the Blank question set is empty')), 'Must report empty set error');
});

// ----------------------------------------------------------------------------
// TEST 6: Unexpected unrequested question type
// ----------------------------------------------------------------------------
test('TEST 6: Unexpected unrequested question type is rejected with clear error', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3,4,5].map(makeMcq) },
      { type: 'short_answer', questions: [{ question: 'What is courage?', correct_answer: 'Facing fear' }] }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation must reject unrequested question types');
  assert(res.errors.some(e => e.includes('Unexpected question type: short_answer')), 'Must report unexpected type');
});

// ----------------------------------------------------------------------------
// TEST 7: Duplicate question set protection
// ----------------------------------------------------------------------------
test('TEST 7: Duplicate question type in JSON is rejected', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' }
    ]
  };

  const json = JSON.stringify({
    schema_version: '1.0',
    lesson: { title: 'Lesson 1' },
    question_sets: [
      { type: 'multiple_choice', questions: [1,2,3].map(makeMcq) },
      { type: 'multiple_choice', questions: [4,5].map(makeMcq) }
    ]
  });

  const res = validateAiQuestionJson(json, plan);
  assert.strictEqual(res.isValid, false, 'Validation must reject duplicate types');
  assert(res.errors.some(e => e.includes('Duplicate question type: multiple_choice')), 'Must report duplicate type');
});

// ----------------------------------------------------------------------------
// TEST 8: Dynamic AI Prompt includes ONLY requested question types
// ----------------------------------------------------------------------------
test('TEST 8: Dynamic AI Prompt includes ONLY requested question types in instructions and JSON template', () => {
  const plan: QuestionPlan = {
    items: [
      { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium' },
      { id: '2', type: 'ordering', count: 5, difficulty: 'medium' }
    ]
  };

  const prompt = buildAiQuestionPrompt({
    courseTitle: 'Born for the Sky Course',
    unitTitle: 'Unit 1',
    episodeTitle: 'Lesson 1',
    lessonText: 'The young eagle jumped from the cliff and learned to soar into the bright sky.',
    plan
  });

  assert(prompt.includes('Multiple Choice — 5 questions'), 'Must list MCQ requirement');
  assert(prompt.includes('Ordering — ONE activity containing 5 sentence blocks'), 'Must list Ordering requirement');
  assert(!prompt.includes('Fill in the Blank'), 'Must NOT list Fill in the Blank when not selected');
  assert(!prompt.includes('Matching Pairs'), 'Must NOT list Matching Pairs when not selected');
  assert(!prompt.includes('Short Answer'), 'Must NOT list Short Answer when not selected');

  assert(prompt.includes('"multiple_choice"'), 'JSON template must include multiple_choice');
  assert(prompt.includes('"ordering"'), 'JSON template must include ordering');
  assert(!prompt.includes('"fill_blank"'), 'JSON template must NOT include fill_blank');
  assert(!prompt.includes('"matching"'), 'JSON template must NOT include matching');
  assert(!prompt.includes('"short_answer"'), 'JSON template must NOT include short_answer');
});

console.log('\n======================================================');
console.log(`🎯 OPTIONAL TYPES TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
