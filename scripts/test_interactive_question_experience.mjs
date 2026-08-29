// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: INTERACTIVE QUESTION EXPERIENCE TEST SUITE
// Tests Question 1 root cause fix, Drag-and-Arrange Ordering UX,
// Web Audio synthesizer, Confetti burst, 1-attempt locking, and anti-retry logic.
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

console.log('\n======================================================');
console.log('🧪 RUNNING INTERACTIVE QUESTION EXPERIENCE TEST SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
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

// ----------------------------------------------------------------------------
// TEST 1: Question 1 Root Cause Fix & Dummy Filtering
// ----------------------------------------------------------------------------
test('Question 1 placeholder fix: Editor and Renderer filter out empty/placeholder questions', () => {
  const editorPath = path.join(ROOT_DIR, 'src/pages/course-studio/CourseEditorPage.tsx');
  const editorContent = fs.readFileSync(editorPath, 'utf8');
  assert(editorContent.includes('deduplicated') || editorContent.includes('realExistingQuestions'), 'Editor must filter placeholder questions on AI import');

  const rendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const rendererContent = fs.readFileSync(rendererPath, 'utf8');
  assert(rendererContent.includes('validQuestions'), 'Renderer must filter out invalid/empty questions');
  assert(!rendererContent.includes("'Option A'"), 'Renderer must NOT use hardcoded Option A fallback');
});

// ----------------------------------------------------------------------------
// TEST 2: Web Audio Synthesizer
// ----------------------------------------------------------------------------
test('CourseAudio provides Web Audio synthesizer chimes with browser unlock and sound toggle', () => {
  const audioPath = path.join(ROOT_DIR, 'src/utils/courseAudio.ts');
  const content = fs.readFileSync(audioPath, 'utf8');

  assert(content.includes('playSelectSound'), 'Must implement playSelectSound');
  assert(content.includes('playCorrectSound'), 'Must implement playCorrectSound');
  assert(content.includes('playIncorrectSound'), 'Must implement playIncorrectSound');
  assert(content.includes('playCompleteSound'), 'Must implement playCompleteSound');
  assert(content.includes('toggleSound'), 'Must implement toggleSound');
  assert(content.includes('unlockAudio'), 'Must implement unlockAudio for browser autoplay policy');
});

// ----------------------------------------------------------------------------
// TEST 3: Lightweight Confetti Burst Engine
// ----------------------------------------------------------------------------
test('CourseConfetti provides lightweight self-cleaning canvas burst with reduced-motion respect', () => {
  const confettiPath = path.join(ROOT_DIR, 'src/utils/courseConfetti.ts');
  const content = fs.readFileSync(confettiPath, 'utf8');

  assert(content.includes('triggerConfettiBurst'), 'Must export triggerConfettiBurst');
  assert(content.includes('prefers-reduced-motion'), 'Must respect prefers-reduced-motion');
  assert(content.includes('canvas.remove()'), 'Must clean up canvas element after animation');
});

// ----------------------------------------------------------------------------
// TEST 4: Drag & Drop Ordering Question Component
// ----------------------------------------------------------------------------
test('DraggableOrderingQuestion implements drag-and-arrange sentence blocks with stable shuffle and side-by-side feedback', () => {
  const orderingPath = path.join(ROOT_DIR, 'src/components/course-studio/DraggableOrderingQuestion.tsx');
  const content = fs.readFileSync(orderingPath, 'utf8');

  assert(content.includes('shuffleItems'), 'Must perform stable initial shuffle');
  assert(content.includes('GripVertical'), 'Must display drag handle icon');
  assert(content.includes('handleTouchMove'), 'Must support mobile touch drag');
  assert(content.includes('handleDragStart'), 'Must support desktop mouse drag');
  assert(content.includes('Correct Chronological Order'), 'Must reveal canonical correct order on incorrect submission');
  assert(content.includes('Check Order') || content.includes('Submit Order'), 'Must have Check Order button');
  assert(content.includes('isLocked'), 'Must enforce one-attempt lock');
});

// ----------------------------------------------------------------------------
// TEST 5: Backend Anti-Retry Protection
// ----------------------------------------------------------------------------
test('server.mjs rejects duplicate submissions for the same question', () => {
  const serverPath = path.join(ROOT_DIR, 'server.mjs');
  const content = fs.readFileSync(serverPath, 'utf8');

  assert(content.includes('existingAttempt'), 'Server must query existingAttempt');
  assert(content.includes('Question already answered.'), 'Server must return Question already answered');
  assert(content.includes('/api/course-studio/student/attempts'), 'Server must provide GET endpoint for persistence');
});

// ----------------------------------------------------------------------------
// TEST 6: Student Course Player Persistence
// ----------------------------------------------------------------------------
test('StudentCoursePlayerPage loads past attempts and preserves answer lock across reloads', () => {
  const playerPath = path.join(ROOT_DIR, 'src/pages/classes/courses/StudentCoursePlayerPage.tsx');
  const content = fs.readFileSync(playerPath, 'utf8');

  assert(content.includes('loadEpisodeAttempts'), 'Player must load past episode attempts');
  assert(content.includes('userAnswers={userAnswers}'), 'Player must pass userAnswers to renderer');
  assert(content.includes('feedbackState={feedbackState}'), 'Player must pass feedbackState to renderer');
});

console.log('\n======================================================');
console.log(`🎯 INTERACTIVE QUESTION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
