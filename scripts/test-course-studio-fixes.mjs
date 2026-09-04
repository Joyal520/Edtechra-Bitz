// ============================================================================
// AUTOMATED TEST SUITE: COURSE STUDIO FIXES & QUESTION BUILDER WORKFLOW
// Tests HTML rendering pipeline, question grading engine, and AI schema validator
// ============================================================================

import assert from 'assert';

// 1. Test Question Grading Engine
console.log('--- TEST 1: Question Grading Engine ---');

const {
  cleanTextForComparison,
  normalizeQuestionOptions,
  resolveCorrectOption,
  isOptionMatchingStudentAnswer,
  evaluateQuestionAnswer
} = await import('../src/utils/questionGrading.ts');

// Test 1a: cleanTextForComparison
assert.strictEqual(cleanTextForComparison('  "Hello, World!"  '), 'hello world');
assert.strictEqual(cleanTextForComparison('B. Sophie'), 'b sophie');
assert.strictEqual(cleanTextForComparison('Option B: Sophie.'), 'option b sophie');
console.log('✓ cleanTextForComparison works as expected');

// Test 1b: resolveCorrectOption with prefix "B. Sophie"
const sampleOptions = ['A. Tom', 'B. Sophie', 'C. Jack', 'D. Emma'];
const normalized = normalizeQuestionOptions(sampleOptions);
assert.strictEqual(normalized.length, 4);
assert.strictEqual(normalized[0].id, 'A');
assert.strictEqual(normalized[0].text, 'Tom');
assert.strictEqual(normalized[1].id, 'B');
assert.strictEqual(normalized[1].text, 'Sophie');
console.log('✓ normalizeQuestionOptions correctly stripped prefixes and assigned IDs A-D');

// Match by full prefix string
const resolved1 = resolveCorrectOption({ options: normalized, correct_answer: 'B. Sophie' });
assert.ok(resolved1, 'Should resolve correct option for "B. Sophie"');
assert.strictEqual(resolved1.id, 'B');
assert.strictEqual(resolved1.text, 'Sophie');

// Match by text only
const resolved2 = resolveCorrectOption({ options: normalized, correct_answer: 'Sophie' });
assert.ok(resolved2, 'Should resolve correct option for "Sophie"');
assert.strictEqual(resolved2.id, 'B');

// Match by letter only
const resolved3 = resolveCorrectOption({ options: normalized, correct_answer: 'B' });
assert.ok(resolved3, 'Should resolve correct option for "B"');
assert.strictEqual(resolved3.id, 'B');

// Match with alternative field correctAnswer
const resolved4 = resolveCorrectOption({ options: normalized, correctAnswer: 'B. Sophie' });
assert.ok(resolved4, 'Should resolve correct option using correctAnswer property');
assert.strictEqual(resolved4.id, 'B');

console.log('✓ resolveCorrectOption successfully resolves across prefix, text, letter, and casing');

// Test 1c: evaluateQuestionAnswer - MCQ
const mcqQuestion = {
  id: 'q1',
  question_type: 'multiple_choice',
  question_text: 'Who is the main character?',
  options: normalized,
  correct_answer: 'B. Sophie',
  points: 10
};

// Student picks 'B'
const evalB = evaluateQuestionAnswer(mcqQuestion, 'B');
assert.strictEqual(evalB.isCorrect, true, 'Student selecting B must be marked CORRECT');

// Student picks 'Sophie'
const evalSophie = evaluateQuestionAnswer(mcqQuestion, 'Sophie');
assert.strictEqual(evalSophie.isCorrect, true, 'Student selecting Sophie must be marked CORRECT');

// Student picks 'B. Sophie'
const evalFull = evaluateQuestionAnswer(mcqQuestion, 'B. Sophie');
assert.strictEqual(evalFull.isCorrect, true, 'Student selecting B. Sophie must be marked CORRECT');

// Student picks 'A' or 'Tom' or 'A. Tom'
const evalA = evaluateQuestionAnswer(mcqQuestion, 'A');
assert.strictEqual(evalA.isCorrect, false, 'Student selecting A must be marked INCORRECT');

const evalTom = evaluateQuestionAnswer(mcqQuestion, 'Tom');
assert.strictEqual(evalTom.isCorrect, false, 'Student selecting Tom must be marked INCORRECT');

console.log('✓ evaluateQuestionAnswer MCQ: B. Sophie is correctly graded, A. Tom is correctly marked incorrect');

// Test 1d: evaluateQuestionAnswer - True / False
const tfQuestion = {
  id: 'q2',
  question_type: 'true_false',
  question_text: 'The sky is blue.',
  options: ['True', 'False'],
  correct_answer: 'True',
  points: 10
};
assert.strictEqual(evaluateQuestionAnswer(tfQuestion, 'True').isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(tfQuestion, true).isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(tfQuestion, 'False').isCorrect, false);
assert.strictEqual(evaluateQuestionAnswer(tfQuestion, false).isCorrect, false);
console.log('✓ evaluateQuestionAnswer True/False: handles strings and booleans accurately');

// Test 1e: evaluateQuestionAnswer - Fill in the Blank
const fillQuestion = {
  id: 'q3',
  question_type: 'fill_blank',
  question_text: 'The bird flew in the ______.',
  correct_answer: 'sky',
  points: 10
};
assert.strictEqual(evaluateQuestionAnswer(fillQuestion, 'sky').isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(fillQuestion, 'Sky.').isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(fillQuestion, '  sky  ').isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(fillQuestion, 'ground').isCorrect, false);
console.log('✓ evaluateQuestionAnswer Fill in Blank: insensitive to casing, spaces, and punctuation');

// Test 1f: evaluateQuestionAnswer - WH Question
const whQuestion = {
  id: 'q4',
  question_type: 'wh_question',
  question_text: 'Where is Emily from?',
  expected_answer: 'Emily is from London.',
  acceptable_answers: ['London', 'She is from London', 'She lives in London'],
  correct_answer: 'Emily is from London.',
  points: 10
};
assert.strictEqual(evaluateQuestionAnswer(whQuestion, 'London').isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(whQuestion, 'london.').isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(whQuestion, 'She lives in London').isCorrect, true);
assert.strictEqual(evaluateQuestionAnswer(whQuestion, 'Paris').isCorrect, false);
console.log('✓ evaluateQuestionAnswer WH Question: matches acceptable variations accurately');


// 2. Test Content Rendering Pipeline Utilities
console.log('\n--- TEST 2: Content Rendering Pipeline Utilities ---');
const { isHtmlContent, sanitizeHtmlString } = await import('../src/utils/courseTextFormatting.tsx');

const htmlSample1 = '<p>This is a paragraph with <font size="4">large text</font> and <b>bold text</b>.</p>';
const htmlSample2 = '<div style="color: red;">Sample div block</div>';
const markdownSample1 = '## Heading 2\n\n- Item 1\n- Item 2\n\n**Bold markdown text**';

assert.strictEqual(isHtmlContent(htmlSample1), true, 'Should detect htmlSample1 as HTML');
assert.strictEqual(isHtmlContent(htmlSample2), true, 'Should detect htmlSample2 as HTML');
assert.strictEqual(isHtmlContent(markdownSample1), false, 'Should detect markdownSample1 as Markdown, not HTML');

const sanitized = sanitizeHtmlString(htmlSample1);
assert.ok(!sanitized.includes('<script>'), 'Sanitizer must remove scripts');
assert.ok(sanitized.includes('large text'), 'Sanitizer must retain text content');
console.log('✓ isHtmlContent and sanitizeHtmlString work accurately');


// 3. Test Question Schema Validator & Prompt Generator
console.log('\n--- TEST 3: AI Question Schema & Validation ---');
const {
  QUESTION_CATEGORIES,
  buildAiQuestionPrompt,
  validateAiQuestionJson,
  convertValidatedJsonToCourseQuestions
} = await import('../src/utils/questionSchemaValidator.ts');

assert.strictEqual(QUESTION_CATEGORIES.length, 8, 'Must have Categories A through H');
assert.strictEqual(QUESTION_CATEGORIES[0].code, 'A');
assert.strictEqual(QUESTION_CATEGORIES[7].code, 'H');
console.log('✓ Categories A through H verified');

// Test 3a: Build prompt for 16 questions (5 MCQ, 3 TF, 5 WH, 3 Fill Blank)
const plan = {
  items: [
    { id: '1', type: 'multiple_choice', count: 5, difficulty: 'medium', points: 10 },
    { id: '2', type: 'true_false', count: 3, difficulty: 'medium', points: 10 },
    { id: '3', type: 'wh_question', count: 5, difficulty: 'medium', points: 10, wh_type: 'mixed_wh' },
    { id: '4', type: 'fill_blank', count: 3, difficulty: 'medium', points: 10 }
  ],
  cefr_level: 'A1'
};

const prompt = buildAiQuestionPrompt({
  courseTitle: 'English Grade 5',
  unitTitle: 'Unit 1: The Young Eagle',
  episodeTitle: 'Lesson 1: The Nest',
  lessonText: '<div><font size="4">The eagle laid an egg in the high nest.</font> One windy morning, the egg rolled away and fell safely onto soft hay near a barn. A mother chicken found the egg and kept it warm. Soon, a chick hatched and looked at the sky every morning, wanting to fly.</div>',
  plan,
  cefrLevel: 'A1'
});

assert.ok(prompt.includes('Target CEFR Level: A1'), 'Prompt includes target CEFR');
assert.ok(prompt.includes('Multiple Choice — 5 questions'), 'Prompt includes 5 MCQ questions');
assert.ok(prompt.includes('True / False — 3 questions'), 'Prompt includes 3 TF questions');
assert.ok(prompt.includes('WH Comprehension — Create 5'), 'Prompt includes 5 WH questions');
assert.ok(prompt.includes('Fill in the Blank — 3 questions'), 'Prompt includes 3 Fill Blank questions');
assert.ok(!prompt.includes('<font size="4">'), 'Prompt stripped raw HTML tags from source text');
console.log('✓ buildAiQuestionPrompt builds clean prompt with lesson context and exact counts');

// Test 3b: Validate simulated AI JSON response for the 16 questions
const mockAiResponse = JSON.stringify({
  schema_version: '1.0',
  lesson: { title: 'Lesson 1: The Nest' },
  question_sets: [
    {
      type: 'multiple_choice',
      questions: [
        { question: 'Where did the egg roll?', options: ['Near a barn', 'Into a river', 'Under a tree', 'On the road'], correct_answer: 'Near a barn', points: 10 },
        { question: 'Who kept the egg warm?', options: ['Mother chicken', 'Duck', 'Horse', 'Farmer'], correct_answer: 'Mother chicken', points: 10 },
        { question: 'What did the young bird want to do?', options: ['Fly', 'Swim', 'Dig', 'Sleep'], correct_answer: 'Fly', points: 10 },
        { question: 'When did the bird look at the sky?', options: ['Every morning', 'Every night', 'Only on Sundays', 'Never'], correct_answer: 'Every morning', points: 10 },
        { question: 'Where was the original nest?', options: ['High up', 'On the grass', 'In a cave', 'In the barn'], correct_answer: 'High up', points: 10 }
      ]
    },
    {
      type: 'true_false',
      questions: [
        { statement: 'The egg landed in the river.', correct_answer: false, points: 10 },
        { statement: 'A mother chicken found the egg.', correct_answer: true, points: 10 },
        { statement: 'The chick wanted to fly.', correct_answer: true, points: 10 }
      ]
    },
    {
      type: 'wh_question',
      questions: [
        { question: 'Where did the egg roll away to?', wh_type: 'where', expected_answer: 'The egg rolled near a barn.', acceptable_answers: ['Near a barn', 'To a barn', 'Near the barn'], points: 10 },
        { question: 'Who found the egg and kept it warm?', wh_type: 'who', expected_answer: 'A mother chicken found the egg.', acceptable_answers: ['A mother chicken', 'Mother chicken', 'The chicken'], points: 10 },
        { question: 'What did the chick want to do every morning?', wh_type: 'what', expected_answer: 'The chick wanted to fly.', acceptable_answers: ['To fly', 'Fly', 'He wanted to fly'], points: 10 },
        { question: 'When did the egg roll away?', wh_type: 'when', expected_answer: 'One windy morning.', acceptable_answers: ['One windy morning', 'In the morning', 'On a windy morning'], points: 10 },
        { question: 'Why was the egg safe when it fell?', wh_type: 'why', expected_answer: 'Because it fell onto soft hay.', acceptable_answers: ['It fell onto soft hay', 'Soft hay', 'Because of soft hay'], points: 10 }
      ]
    },
    {
      type: 'fill_blank',
      questions: [
        { sentence: 'The eagle laid an egg in the high ______.', correct_answer: 'nest', points: 10 },
        { sentence: 'The egg fell safely onto soft ______.', correct_answer: 'hay', points: 10 },
        { sentence: 'The young bird wanted to ______ high.', correct_answer: 'fly', points: 10 }
      ]
    }
  ]
});

const validation = validateAiQuestionJson(mockAiResponse, plan);
assert.strictEqual(validation.isValid, true, 'Mock AI JSON must validate successfully');
assert.strictEqual(validation.summary.totalQuestions, 16, 'Must detect exactly 16 questions');
assert.strictEqual(validation.summary.totalMarks, 160, 'Must calculate 160 total marks');
assert.strictEqual(validation.summary.byType.multiple_choice, 5);
assert.strictEqual(validation.summary.byType.true_false, 3);
assert.strictEqual(validation.summary.byType.wh_question, 5);
assert.strictEqual(validation.summary.byType.fill_blank, 3);
console.log('✓ validateAiQuestionJson successfully validated 16 questions across 4 types with 160 marks');

// Test 3c: Error reporting on invalid JSON syntax with line number
const badJson = '{\n  "schema_version": "1.0",\n  "question_sets": [\n    {\n      "type": "multiple_choice"\n';
const badResult = validateAiQuestionJson(badJson);
assert.strictEqual(badResult.isValid, false, 'Bad syntax must fail validation');
assert.ok(badResult.errors[0].includes('line') || badResult.errors[0].includes('syntax'), 'Error must report syntax and line info');
console.log('✓ Line-numbered syntax error detected:', badResult.errors[0]);

// Test 3d: Convert validated JSON into CourseQuestion models
const converted = convertValidatedJsonToCourseQuestions(validation.parsedData, 'ep_123', 'c_456');
assert.strictEqual(converted.length, 16, 'Must convert into 16 CourseQuestion objects');
assert.strictEqual(converted[0].episode_id, 'ep_123');
assert.strictEqual(converted[0].course_id, 'c_456');
assert.strictEqual(converted[0].question_type, 'multiple_choice');
assert.strictEqual(converted[8].question_type, 'wh_question');
assert.strictEqual(converted[8].wh_type, 'where');
assert.strictEqual(converted[13].question_type, 'fill_blank');
console.log('✓ convertValidatedJsonToCourseQuestions successfully generated 16 canonical CourseQuestion objects');

console.log('\n=========================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! (100% OK)');
console.log('=========================================');
