import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('\n======================================================');
console.log('🧪 RUNNING DARK-MODE INPUT CONTRAST VERIFICATION SUITE');
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

const ROOT_DIR = process.cwd();

// ----------------------------------------------------------------------------
// TEST 1: Fill in the Blank and Short Answer inputs in CourseContentRenderer
// ----------------------------------------------------------------------------
test('Fill in the Blank & Short Answer inputs define explicit dark:text-white and caret-white', () => {
  const rendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const content = fs.readFileSync(rendererPath, 'utf8');

  // Must have explicit light & dark text colors
  assert(content.includes('text-slate-900'), 'Input must have explicit light-mode text color');
  assert(content.includes('dark:text-white'), 'Input must have explicit dark-mode white text color (#FFFFFF)');
  assert(content.includes('dark:bg-[#182232]') || content.includes('dark:bg-stone-900'), 'Input must have dark theme surface');
  assert(content.includes('dark:caret-white'), 'Input must have white cursor/caret in dark mode');
  assert(content.includes('dark:placeholder:text-stone-400'), 'Input must have muted light gray placeholder');
  assert(content.includes('selection:bg-sky-500 selection:text-white'), 'Input must have readable text selection');
});

// ----------------------------------------------------------------------------
// TEST 2: Locked State High Contrast in Dark Mode
// ----------------------------------------------------------------------------
test('Locked answer states in dark mode maintain readable high contrast text', () => {
  const rendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const content = fs.readFileSync(rendererPath, 'utf8');

  assert(content.includes('dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-100'), 'Correct answer in dark mode must have readable text');
  assert(content.includes('dark:bg-rose-950/60 dark:border-rose-500 dark:text-rose-100'), 'Incorrect answer in dark mode must have readable text');
});

// ----------------------------------------------------------------------------
// TEST 3: CSS Global Dark-Mode & Autofill Contrast Fallbacks in index.css
// ----------------------------------------------------------------------------
test('index.css enforces pure white typed text and browser autofill overrides for dark mode', () => {
  const cssPath = path.join(ROOT_DIR, 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  assert(cssContent.includes('.dark input'), 'CSS must include dark input rules');
  assert(cssContent.includes('color: #ffffff !important;'), 'CSS must enforce white color for dark inputs');
  assert(cssContent.includes('caret-color: #ffffff !important;'), 'CSS must enforce white caret for dark inputs');
  assert(cssContent.includes('-webkit-text-fill-color: #ffffff !important;'), 'CSS must prevent Chrome autofill from making text dark');
  assert(cssContent.includes('rgba(255, 255, 255, 0.55)'), 'CSS must style placeholders in dark mode');
});

// ----------------------------------------------------------------------------
// TEST 4: Multiple Choice & True/False Dark Contrast
// ----------------------------------------------------------------------------
test('Multiple Choice & True/False options have high contrast typography in dark mode', () => {
  const rendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const content = fs.readFileSync(rendererPath, 'utf8');

  assert(content.includes('text-slate-800 dark:text-slate-100'), 'Options must have light text on dark cards');
  assert(content.includes('dark:bg-stone-900'), 'Cards must have dark mode backgrounds');
  assert(content.includes('dark:border-stone-800'), 'Cards must have dark mode borders');
});

// ----------------------------------------------------------------------------
// TEST 5: Ordering Question Contrast in Dark Mode
// ----------------------------------------------------------------------------
test('DraggableOrderingQuestion sentence blocks have high contrast text in dark mode', () => {
  const orderingPath = path.join(ROOT_DIR, 'src/components/course-studio/DraggableOrderingQuestion.tsx');
  const content = fs.readFileSync(orderingPath, 'utf8');

  assert(content.includes('dark:bg-stone-900'), 'Ordering cards must have dark mode background');
  assert(content.includes('text-slate-800 dark:text-slate-100'), 'Sentence text must be light in dark mode');
  assert(content.includes('dark:bg-stone-800 text-slate-700 dark:text-slate-300'), 'Badges must be readable in dark mode');
});

console.log('\n======================================================');
console.log(`🎯 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
