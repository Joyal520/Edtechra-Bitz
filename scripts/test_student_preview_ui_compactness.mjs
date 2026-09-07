// ============================================================================
// EDTECHRA STUDENT EXAM PREVIEW UI COMPACTNESS & ERGONOMICS TEST SUITE
// Verifies:
// 1. Removal of excessive empty space and fixed min-heights (no min-h-[480px])
// 2. Centered 1400px workspace layout with ~70/30 split (lg:col-span-8/4 or 9/3)
// 3. Question card design with natural content-driven auto-height
// 4. Compact modern MCQ choices with letter badges and 40-48px inputs
// 5. Reading comprehension: line-height 1.6, comfortable reading width, no max-h-[70vh]
// 6. Picture description questions: heading -> picture (max-w 700-800px) -> instruction -> textarea (180-240px) with live word counter
// 7. Writing questions: textarea (220-280px) with live word counter
// 8. Listening questions: compact audio card with transcript hidden by default
// 9. Right sidebar: timer, progress, answered/marked/remaining chips, compact navigator grid, scratchpad, submit button
// 10. Top section navigation: sticky, horizontal scroll, active section highlight
// 11. Compact header: max-w-[1400px], authoritative countdown, autosave status
// 12. CSS auto-height rules: .question-card, .question-content, .answer-area
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=================================================================');
console.log('  EDTECHRA STUDENT EXAM PREVIEW UI: COMPACTNESS & ERGONOMICS    ');
console.log('=================================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runSuite() {
  console.log('\n--- 1. CSS Rules Verification (Requirement 12) ---');
  const cssPath = path.join(rootDir, 'src/index.css');
  assert(fs.existsSync(cssPath), 'index.css exists');
  const cssSource = fs.readFileSync(cssPath, 'utf-8');
  assert(cssSource.includes('.question-card') && cssSource.includes('height: auto'), '.question-card has height: auto');
  assert(cssSource.includes('.question-content') && cssSource.includes('min-height: 0'), '.question-content has min-height: 0');
  assert(cssSource.includes('.answer-area') && cssSource.includes('height: auto'), '.answer-area has height: auto');

  console.log('\n--- 2. LivePreviewModal UI Verification (Requirements 1, 2, 6, 7, 8, 9, 10) ---');
  const previewPath = path.join(rootDir, 'src/components/exam/builder/preview/LivePreviewModal.tsx');
  assert(fs.existsSync(previewPath), 'LivePreviewModal.tsx exists');
  const previewSource = fs.readFileSync(previewPath, 'utf-8');

  // No excessive empty space or fixed 480px min-height
  assert(!previewSource.includes('min-h-[480px]'), 'LivePreviewModal does NOT contain min-h-[480px]');
  assert(previewSource.includes('max-w-[1400px]'), 'Desktop device uses max-w-[1400px]');
  assert(previewSource.includes('lg:grid-cols-12'), 'Main workspace uses 12-column grid layout');
  assert(previewSource.includes('lg:col-span-8') || previewSource.includes('xl:col-span-9'), 'Question area occupies 70-75% width');
  assert(previewSource.includes('lg:col-span-4') || previewSource.includes('xl:col-span-3'), 'Right sidebar occupies 25-30% width');
  assert(previewSource.includes('question-card'), 'Applies .question-card class for auto-height');
  assert(previewSource.includes('question-content'), 'Applies .question-content class');
  assert(previewSource.includes('answer-area'), 'Applies .answer-area class');

  // Picture Description
  assert(previewSource.includes('isPictureTask'), 'Detects picture task activities');
  assert(previewSource.includes('max-w-[760px]'), 'Picture container limited to ~700-800px max width');
  assert(previewSource.includes('Write your description here...'), 'Picture description has clear placeholder');
  assert(previewSource.includes('words •') || previewSource.includes('getWordCount'), 'Includes live word count calculation');
  assert(previewSource.includes('min-h-[180px]') && previewSource.includes('max-h-[240px]'), 'Picture description textarea initial height is 180-240px');

  // Reading Comprehension
  assert(previewSource.includes('leading-[1.6]'), 'Reading passage uses 1.6 line height');
  assert(previewSource.includes('max-w-[72ch]'), 'Reading passage uses comfortable reading width (around 65-75ch)');

  // Listening Questions
  assert(previewSource.includes('audio controls'), 'Renders HTML5 audio player');
  assert(previewSource.includes('Hide Transcript') || previewSource.includes('Show Transcript'), 'Audio transcript collapsible / hidden by default');

  // Right Sidebar
  assert(previewSource.includes('Time Remaining'), 'Sidebar has Time Remaining card');
  assert(previewSource.includes('Question Navigator'), 'Sidebar has Question Navigator');
  assert(previewSource.includes('Answered') && previewSource.includes('Review') && previewSource.includes('Remaining'), 'Sidebar has status summary chips');
  assert(previewSource.includes('Scratchpad') || previewSource.includes('showNotepad'), 'Sidebar has scratchpad/notes toggle');
  assert(previewSource.includes('Submit Exam'), 'Sidebar has Submit Exam button');

  console.log('\n--- 3. Student ExamSession & Layout Verification (Requirements 1, 2, 9, 10, 11) ---');
  const sessionPath = path.join(rootDir, 'src/components/exam/student/ExamSession.tsx');
  const sessionSource = fs.readFileSync(sessionPath, 'utf-8');

  assert(sessionSource.includes('max-w-[1400px]'), 'ExamSession uses max-w-[1400px] desktop width');
  assert(sessionSource.includes('lg:grid-cols-12'), 'ExamSession workspace uses 12-column grid');
  assert(sessionSource.includes('lg:col-span-8') || sessionSource.includes('xl:col-span-9'), 'ExamSession question area is 70-75% width');
  assert(sessionSource.includes('lg:col-span-4') || sessionSource.includes('xl:col-span-3'), 'ExamSession sidebar is 25-30% width');
  assert(sessionSource.includes('sticky top-[57px]'), 'Section navigation bar is sticky below header');

  const headerPath = path.join(rootDir, 'src/components/exam/student/ExamHeader.tsx');
  const headerSource = fs.readFileSync(headerPath, 'utf-8');
  assert(headerSource.includes('max-w-[1400px]'), 'ExamHeader uses max-w-[1400px]');
  assert(headerSource.includes('Question') && headerSource.includes('Complete'), 'ExamHeader displays progress');

  console.log('\n--- 4. Question Renderers Verification (Requirements 3, 4, 5, 6, 7, 8) ---');
  const qRendererPath = path.join(rootDir, 'src/components/exam/student/QuestionRenderer.tsx');
  const qRendererSource = fs.readFileSync(qRendererPath, 'utf-8');
  assert(qRendererSource.includes('question-card') && qRendererSource.includes('question-content'), 'QuestionRenderer applies question-card and question-content classes');
  assert(qRendererSource.includes('isPictureTask'), 'QuestionRenderer explicitly handles picture description activities');
  assert(qRendererSource.includes('max-w-[760px]'), 'QuestionRenderer picture container sized to max-w-[760px]');
  assert(qRendererSource.includes('min-h-[180px]') && qRendererSource.includes('max-h-[240px]'), 'QuestionRenderer picture description textarea is 180-240px');

  // Reading renderer
  const readingPath = path.join(rootDir, 'src/components/exam/student/renderers/ReadingQuestion.tsx');
  const readingSource = fs.readFileSync(readingPath, 'utf-8');
  assert(!readingSource.includes('max-h-[70vh]'), 'ReadingQuestion does NOT use max-h-[70vh]');
  assert(readingSource.includes('leading-[1.6]'), 'ReadingQuestion uses line-height 1.6');
  assert(readingSource.includes('max-w-[72ch]'), 'ReadingQuestion uses comfortable 72ch width');

  // Image renderer
  const imagePath = path.join(rootDir, 'src/components/exam/student/renderers/ImageQuestion.tsx');
  const imageSource = fs.readFileSync(imagePath, 'utf-8');
  assert(!imageSource.includes('max-h-80 flex flex-col'), 'ImageQuestion removes giant floating image box');
  assert(imageSource.includes('max-w-[760px]'), 'ImageQuestion limits width to max-w-[760px]');
  assert(imageSource.includes('min-h-[180px]') && imageSource.includes('max-h-[240px]'), 'ImageQuestion textarea has 180-240px initial height');

  // Essay renderer
  const essayPath = path.join(rootDir, 'src/components/exam/student/renderers/EssayQuestion.tsx');
  const essaySource = fs.readFileSync(essayPath, 'utf-8');
  assert(essaySource.includes('min-h-[220px]') && essaySource.includes('max-h-[280px]'), 'EssayQuestion textarea initial height is 220-280px');
  assert(essaySource.includes('answer-area'), 'EssayQuestion applies answer-area class');
  assert(essaySource.includes('Words') && essaySource.includes('wordCount'), 'EssayQuestion displays live word count');

  // Audio renderer
  const audioPath = path.join(rootDir, 'src/components/exam/student/renderers/AudioQuestion.tsx');
  const audioSource = fs.readFileSync(audioPath, 'utf-8');
  assert(audioSource.includes('showTranscript'), 'AudioQuestion supports collapsible transcript hidden by default');
  assert(audioSource.includes('answer-area'), 'AudioQuestion questions sit immediately below audio card');

  // MCQ renderer
  const mcqPath = path.join(rootDir, 'src/components/exam/student/renderers/MCQQuestion.tsx');
  const mcqSource = fs.readFileSync(mcqPath, 'utf-8');
  assert(mcqSource.includes('answer-area'), 'MCQQuestion applies answer-area class');
  assert(mcqSource.includes('p-3 sm:p-3.5') || mcqSource.includes('rounded-xl'), 'MCQQuestion uses compact padding');

  // Fill in blank & Short answer
  const fillPath = path.join(rootDir, 'src/components/exam/student/renderers/FillBlankQuestion.tsx');
  const fillSource = fs.readFileSync(fillPath, 'utf-8');
  assert(fillSource.includes('h-11 sm:h-12'), 'FillBlankQuestion uses comfortable 44-48px input height');
  assert(fillSource.includes('answer-area'), 'FillBlankQuestion uses answer-area class');

  const shortPath = path.join(rootDir, 'src/components/exam/student/renderers/ShortAnswerQuestion.tsx');
  const shortSource = fs.readFileSync(shortPath, 'utf-8');
  assert(shortSource.includes('rows={3}') && shortSource.includes('min-h-[80px]'), 'ShortAnswerQuestion uses compact 3-row textarea');

  // Question Navigator
  const navPath = path.join(rootDir, 'src/components/exam/student/QuestionNavigator.tsx');
  const navSource = fs.readFileSync(navPath, 'utf-8');
  assert(navSource.includes('showScratchpad'), 'QuestionNavigator includes scratchpad toggle and textarea');
  assert(navSource.includes('onSubmitExam'), 'QuestionNavigator supports Submit Exam button');
  assert(navSource.includes('Time Left') || navSource.includes('formatTime'), 'QuestionNavigator supports countdown timer');

  console.log('\n=================================================================');
  console.log(`  COMPACTNESS TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
