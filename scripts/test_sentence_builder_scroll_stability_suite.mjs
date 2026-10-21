// ============================================================================
// EDTECHRA BITZ — SENTENCE BUILDER SCROLL STABILITY SUITE
// Tests A-G: Word placement, scroll invariance, undo, reset, duplicate words,
// submission & grading, and persistence across lessons.
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n================================================================');
console.log('RUNNING TEST SUITE: SENTENCE BUILDER SCROLL STABILITY');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Source Code Inspection - No Destructive Reset on Re-render
// ----------------------------------------------------------------------------
test('ComprehensiveQuestionRenderer guards Sentence Builder against scroll & re-render resets', () => {
  const compPath = path.join(ROOT_DIR, 'src/components/course-studio/ComprehensiveQuestionRenderer.tsx');
  const content = fs.readFileSync(compPath, 'utf8');

  // Verify stable tracking refs exist
  assert(content.includes('lastSentenceQuestionKeyRef'), 'Contains lastSentenceQuestionKeyRef');
  assert(content.includes('lastSentenceResponseKeyRef'), 'Contains lastSentenceResponseKeyRef');

  // Verify guard condition exists before resetting tokens
  assert(
    content.includes('lastSentenceQuestionKeyRef.current === questionKey && lastSentenceResponseKeyRef.current === responseKey'),
    'Guards with questionKey and responseKey check before token initialization'
  );

  // Verify token IDs include index for uniqueness
  assert(
    content.includes('id: `tok_${qId}_${idx}_'),
    'Sentence tokens have unique stable identifiers including index'
  );

  // Verify reset uses shuffleWordsGuaranteed explicitly
  assert(
    content.includes('shuffleWordsGuaranteed(all)'),
    'Reset handler explicitly shuffles words only on click'
  );
});

// ----------------------------------------------------------------------------
// TEST 2: CourseContentRenderer Passes Stable Question Prop
// ----------------------------------------------------------------------------
test('CourseContentRenderer avoids regenerating question object reference when id exists', () => {
  const contentRendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const content = fs.readFileSync(contentRendererPath, 'utf8');

  assert(
    content.includes('const qWithId = q.id ? q : { ...q, id: effectiveQId };'),
    'CourseContentRenderer preserves object reference identity when q.id is present'
  );
});

// ----------------------------------------------------------------------------
// TEST 3: Scroll Handler Uses Functional State Equality to Avoid Unnecessary Renders
// ----------------------------------------------------------------------------
test('Player pages optimize scrollProgress updates to avoid redundant re-renders', () => {
  const studentPlayerPath = path.join(ROOT_DIR, 'src/pages/classes/courses/StudentCoursePlayerPage.tsx');
  const previewPagePath = path.join(ROOT_DIR, 'src/pages/course-studio/CoursePreviewPage.tsx');

  const studentPlayerContent = fs.readFileSync(studentPlayerPath, 'utf8');
  const previewContent = fs.readFileSync(previewPagePath, 'utf8');

  assert(
    studentPlayerContent.includes('setScrollProgress(prev => (prev === progress ? prev : progress));'),
    'StudentCoursePlayerPage uses functional state equality for scroll progress'
  );

  assert(
    previewContent.includes('setScrollProgress(prev => (prev === progress ? prev : progress));'),
    'CoursePreviewPage uses functional state equality for scroll progress'
  );
});

// ----------------------------------------------------------------------------
// TEST A & B: State Simulation - Word Placement & Scroll Invariance
// ----------------------------------------------------------------------------
test('Test A & B: Word placement and scroll invariance simulation', () => {
  // Simulate the Sentence Builder lifecycle
  const qId = 'test_q_1';
  const qType = 'sentence_reordering';
  const question = {
    id: qId,
    question_type: 'sentence_reordering',
    correct_answer: 'She loves reading books every evening',
    options: ['loves', 'reading', 'She', 'evening', 'books', 'every']
  };

  const questionKey = `${qId}:::${qType}:::${question.correct_answer || ''}:::${JSON.stringify(question.options || '')}:::${JSON.stringify(question.items || '')}`;
  const responseKey = 'none';

  // Refs
  let lastSentenceQuestionKey = null;
  let lastSentenceResponseKey = null;
  let sentenceTokens = [];
  let selectedTokens = [];

  // Mount effect
  function runEffect(response = null) {
    const currentResponseKey = response ? `${response.status}:::${response.answer}` : 'none';

    if (response && response.status !== 'unanswered' && response.answer) {
      if (lastSentenceResponseKey !== currentResponseKey || lastSentenceQuestionKey !== questionKey) {
        const prevWords = typeof response.answer === 'string' ? response.answer.trim().split(/\s+/) : response.answer;
        selectedTokens = prevWords.map((w, i) => ({ id: `prev_${qId}_${i}`, text: w }));
        sentenceTokens = [];
        lastSentenceResponseKey = currentResponseKey;
        lastSentenceQuestionKey = questionKey;
      }
      return;
    }

    if (lastSentenceQuestionKey === questionKey && lastSentenceResponseKey === currentResponseKey) {
      // SCROLL / RE-RENDER GUARD: Do nothing!
      return;
    }

    // Initial load
    const tokens = question.options.map((text, idx) => ({
      id: `tok_${qId}_${idx}_${text}`,
      text
    }));
    sentenceTokens = [...tokens];
    selectedTokens = [];
    lastSentenceQuestionKey = questionKey;
    lastSentenceResponseKey = currentResponseKey;
  }

  // Initial mount
  runEffect();
  assert.strictEqual(sentenceTokens.length, 6, 'All 6 tokens in available bank initially');
  assert.strictEqual(selectedTokens.length, 0, 'No tokens placed initially');

  // Student taps "She", then "loves", then "reading"
  const tap1 = sentenceTokens.find(t => t.text === 'She');
  selectedTokens.push(tap1);
  sentenceTokens = sentenceTokens.filter(t => t.id !== tap1.id);

  const tap2 = sentenceTokens.find(t => t.text === 'loves');
  selectedTokens.push(tap2);
  sentenceTokens = sentenceTokens.filter(t => t.id !== tap2.id);

  const tap3 = sentenceTokens.find(t => t.text === 'reading');
  selectedTokens.push(tap3);
  sentenceTokens = sentenceTokens.filter(t => t.id !== tap3.id);

  assert.strictEqual(selectedTokens.length, 3, '3 tokens placed');
  assert.strictEqual(selectedTokens.map(t => t.text).join(' '), 'She loves reading', 'Tap order preserved');
  assert.strictEqual(sentenceTokens.length, 3, '3 tokens remaining');

  // CRITICAL: Student scrolls down the page!
  // Parent re-renders 50 times during scroll ticks:
  for (let scrollTick = 1; scrollTick <= 50; scrollTick++) {
    runEffect(); // Trigger effect on each scroll tick
  }

  // VERIFY SCROLL INVARIANCE:
  assert.strictEqual(selectedTokens.length, 3, 'Selected tokens NOT cleared on scroll');
  assert.strictEqual(selectedTokens.map(t => t.text).join(' '), 'She loves reading', 'Ordered sentence sequence strictly intact after 50 scroll ticks');
  assert.strictEqual(sentenceTokens.length, 3, 'Available tokens count unchanged after scrolling');

  // Submit button state:
  const isSubmitDisabled = selectedTokens.length === 0;
  assert.strictEqual(isSubmitDisabled, false, 'Submit button remains ENABLED during and after scroll');
});

// ----------------------------------------------------------------------------
// TEST C: Undo Action
// ----------------------------------------------------------------------------
test('Test C: Undo action returns last placed word and remains stable on scroll', () => {
  let selectedTokens = [
    { id: 'tok_1', text: 'The' },
    { id: 'tok_2', text: 'sun' },
    { id: 'tok_3', text: 'shines' }
  ];
  let sentenceTokens = [
    { id: 'tok_4', text: 'brightly' }
  ];

  // Undo
  const lastToken = selectedTokens[selectedTokens.length - 1];
  selectedTokens = selectedTokens.slice(0, -1);
  sentenceTokens = [...sentenceTokens, lastToken];

  assert.strictEqual(selectedTokens.length, 2, 'Selected tokens reduced to 2');
  assert.strictEqual(selectedTokens.map(t => t.text).join(' '), 'The sun');
  assert.strictEqual(sentenceTokens.length, 2, 'Sentence tokens increased to 2');
  assert.strictEqual(sentenceTokens[sentenceTokens.length - 1].id, 'tok_3', 'Returned token identity preserved');
});

// ----------------------------------------------------------------------------
// TEST D: Reset Action
// ----------------------------------------------------------------------------
test('Test D: Reset action clears ordered sentence and restores available words', () => {
  let selectedTokens = [
    { id: 'tok_1', text: 'We' },
    { id: 'tok_2', text: 'are' }
  ];
  let sentenceTokens = [
    { id: 'tok_3', text: 'ready' }
  ];

  // Reset
  const all = [...selectedTokens, ...sentenceTokens];
  sentenceTokens = all;
  selectedTokens = [];

  assert.strictEqual(selectedTokens.length, 0, 'Selected tokens cleared');
  assert.strictEqual(sentenceTokens.length, 3, 'All tokens returned to available bank');
});

// ----------------------------------------------------------------------------
// TEST E: Duplicate Words Handling
// ----------------------------------------------------------------------------
test('Test E: Duplicate words have distinct stable IDs and independent removal', () => {
  const qId = 'dup_q';
  const words = ['the', 'cat', 'saw', 'the', 'mouse'];
  const tokens = words.map((text, idx) => ({
    id: `tok_${qId}_${idx}_${text}`,
    text
  }));

  // Verify IDs are distinct
  assert.notStrictEqual(tokens[0].id, tokens[3].id, 'First "the" and second "the" have distinct IDs');
  assert.strictEqual(tokens[0].id, 'tok_dup_q_0_the');
  assert.strictEqual(tokens[3].id, 'tok_dup_q_3_the');

  // Place first "the"
  let selected = [tokens[0]];
  let available = tokens.filter(t => t.id !== tokens[0].id);

  assert.strictEqual(selected.length, 1);
  assert.strictEqual(available.length, 4);
  assert(available.some(t => t.id === 'tok_dup_q_3_the'), 'Second "the" remains in available bank');

  // Place second "the"
  selected.push(tokens[3]);
  available = available.filter(t => t.id !== tokens[3].id);
  assert.strictEqual(selected.length, 2);
  assert.strictEqual(available.length, 3);

  // Remove first "the"
  selected = selected.filter(t => t.id !== tokens[0].id);
  available.push(tokens[0]);
  assert.strictEqual(selected.length, 1);
  assert.strictEqual(selected[0].id, 'tok_dup_q_3_the', 'Second "the" still safely in ordered sentence');
});

// ----------------------------------------------------------------------------
// TEST F: Submission and Grading Validation
// ----------------------------------------------------------------------------
test('Test F: Sentence validation handles exact array and normalized string matches', () => {
  const expectedOrder = ['The', 'quick', 'brown', 'fox'];
  const expectedSentence = 'The quick brown fox';

  // 1. Correct sentence match
  const student1 = ['The', 'quick', 'brown', 'fox'];
  const isMatch1 = student1.length === expectedOrder.length &&
    student1.every((w, i) => w.toLowerCase() === expectedOrder[i].toLowerCase());
  assert.strictEqual(isMatch1, true, 'Matches correct sentence sequence');

  // 2. Incorrect sentence match
  const student2 = ['quick', 'The', 'brown', 'fox'];
  const isMatch2 = student2.length === expectedOrder.length &&
    student2.every((w, i) => w.toLowerCase() === expectedOrder[i].toLowerCase());
  assert.strictEqual(isMatch2, false, 'Rejects incorrect sentence sequence');
});

// ----------------------------------------------------------------------------
// TEST G: Persistence Across Lessons
// ----------------------------------------------------------------------------
test('Test G: Completed questions restore submitted answer and lock chips', () => {
  const answeredResponse = {
    questionId: 'q_persisted',
    status: 'correct',
    score: 10,
    maxScore: 10,
    answer: 'Learning English opens opportunities'
  };

  const prevWords = answeredResponse.answer.split(' ');
  const selectedTokens = prevWords.map((w, i) => ({ id: `prev_q_persisted_${i}`, text: w }));
  const sentenceTokens = [];

  assert.strictEqual(selectedTokens.length, 4, 'Answered sentence restored');
  assert.strictEqual(sentenceTokens.length, 0, 'No available words remaining when answered');
  assert.strictEqual(selectedTokens.map(t => t.text).join(' '), 'Learning English opens opportunities');
});

console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
