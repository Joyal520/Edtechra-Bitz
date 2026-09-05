import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modalFilePath = path.join(__dirname, '../src/components/classes/ClassroomExamModal.tsx');
const detailFilePath = path.join(__dirname, '../src/pages/classes/ClassroomDetailPage.tsx');
const indexCssPath = path.join(__dirname, '../src/index.css');

console.log('Testing Create Exam Full-Screen, Scrollbar & High-Contrast Theme...');

const modalContent = fs.readFileSync(modalFilePath, 'utf-8');
const detailContent = fs.readFileSync(detailFilePath, 'utf-8');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');

let errors = [];

// Check 1: Full-Screen Viewport coverage without 100vw scrollbar overflow
if (!modalContent.includes('fixed inset-0 z-50 w-full h-full flex flex-col bg-[#0b132b] text-white overflow-hidden')) {
  errors.push('Modal outer container does not have required full-screen classes (fixed inset-0 z-50 w-full h-full bg-[#0b132b]).');
} else {
  console.log('✔ Full-screen viewport container verified.');
}

// Check 2: Main scrollable body has min-h-0 and custom scrollbar
if (!modalContent.includes('flex-1 min-h-0 overflow-y-auto p-6 pb-24 space-y-6 bg-[#0b132b] text-white exam-engine-scrollbar')) {
  errors.push('Main scrollable container missing min-h-0, pb-24, or exam-engine-scrollbar class.');
} else {
  console.log('✔ Main scrollable container with min-h-0 & exam-engine-scrollbar verified.');
}

// Check 3: Background body scroll lock
if (!modalContent.includes("document.body.style.overflow = 'hidden'")) {
  errors.push('Background body scroll lock missing in ClassroomExamModal.');
} else {
  console.log('✔ Background body scroll lock verified.');
}

// Check 4: CSS scrollbar rules in index.css
if (!indexCssContent.includes('.exam-engine-scrollbar') || !indexCssContent.includes('scrollbar-color: #4f46e5 #0d1733')) {
  errors.push('Missing .exam-engine-scrollbar styles in index.css.');
} else {
  console.log('✔ High-contrast custom scrollbar styles in index.css verified.');
}

// Check 5: ClassroomDetailPage passes initialTab
if (!detailContent.includes("initialTab={selectedExam ? 'results' : 'creator'}")) {
  errors.push('ClassroomDetailPage does not pass initialTab prop based on selectedExam.');
} else {
  console.log('✔ ClassroomDetailPage initialTab routing verified.');
}

// Check 6: Dark blue background tokens present
const requiredTokens = ['#0b132b', '#0e1738', '#131f42', '#162044', '#0d1733', '#D7E3F4'];
for (const token of requiredTokens) {
  if (!modalContent.includes(token)) {
    errors.push(`Expected theme token ${token} was not found in ClassroomExamModal.tsx.`);
  } else {
    console.log(`✔ Found theme token ${token}`);
  }
}

// Check 7: Ensure no remaining low-contrast card backgrounds
const rawWhiteCards = modalContent.match(/className=["'][^"']*?\bbg-white\b(?!(\/\d+))/g);
if (rawWhiteCards && rawWhiteCards.length > 0) {
  errors.push(`Found raw bg-white card/container background: ${rawWhiteCards.join(', ')}`);
} else {
  console.log('✔ No raw bg-white card or container backgrounds found.');
}

// Check 8: Form inputs have sunken dark blue background (#0d1733) and white text
const inputBgMatches = (modalContent.match(/bg-\[#0d1733\]/g) || []).length;
if (inputBgMatches < 10) {
  errors.push(`Expected multiple inputs with bg-[#0d1733], found only ${inputBgMatches}.`);
} else {
  console.log(`✔ Verified ${inputBgMatches} input/well elements using deep navy bg-[#0d1733].`);
}

// Check 9: Rose/red trash/delete button visibility
if (!modalContent.includes('text-rose-400 hover:text-rose-300')) {
  errors.push('Delete/trash icons do not use high-visibility text-rose-400 hover:text-rose-300.');
} else {
  console.log('✔ High-contrast delete/trash icons verified.');
}

if (errors.length > 0) {
  console.error('\n❌ Verification failed with errors:');
  errors.forEach(e => console.error(`- ${e}`));
  process.exit(1);
} else {
  console.log('\n✅ All Create Exam Full-Screen, Scrollbar & Theme contrast tests PASSED successfully!');
  process.exit(0);
}
