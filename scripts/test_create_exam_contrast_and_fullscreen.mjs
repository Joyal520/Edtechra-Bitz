import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modalFilePath = path.join(__dirname, '../src/components/classes/ClassroomExamModal.tsx');
const detailFilePath = path.join(__dirname, '../src/pages/classes/ClassroomDetailPage.tsx');

console.log('Testing Create Exam Full-Screen & Dark-Blue High-Contrast Theme...');

const modalContent = fs.readFileSync(modalFilePath, 'utf-8');
const detailContent = fs.readFileSync(detailFilePath, 'utf-8');

let errors = [];

// Check 1: Full-Screen Viewport coverage
if (!modalContent.includes('fixed inset-0 z-50 w-screen h-screen flex flex-col bg-[#0b132b] text-white overflow-hidden')) {
  errors.push('Modal outer container does not have required full-screen classes (fixed inset-0 z-50 w-screen h-screen bg-[#0b132b]).');
} else {
  console.log('✔ Full-screen viewport container verified.');
}

// Check 2: ClassroomDetailPage passes initialTab
if (!detailContent.includes("initialTab={selectedExam ? 'results' : 'creator'}")) {
  errors.push('ClassroomDetailPage does not pass initialTab prop based on selectedExam.');
} else {
  console.log('✔ ClassroomDetailPage initialTab routing verified.');
}

// Check 3: Dark blue background tokens present
const requiredTokens = ['#0b132b', '#0e1738', '#131f42', '#162044', '#0d1733', '#D7E3F4'];
for (const token of requiredTokens) {
  if (!modalContent.includes(token)) {
    errors.push(`Expected theme token ${token} was not found in ClassroomExamModal.tsx.`);
  } else {
    console.log(`✔ Found theme token ${token}`);
  }
}

// Check 4: Ensure no remaining low-contrast card backgrounds
const rawWhiteCards = modalContent.match(/className=["'][^"']*?\bbg-white\b(?!(\/\d+))/g);
if (rawWhiteCards && rawWhiteCards.length > 0) {
  errors.push(`Found raw bg-white card/container background: ${rawWhiteCards.join(', ')}`);
} else {
  console.log('✔ No raw bg-white card or container backgrounds found.');
}

// Check 5: Form inputs have sunken dark blue background (#0d1733) and white text
const inputBgMatches = (modalContent.match(/bg-\[#0d1733\]/g) || []).length;
if (inputBgMatches < 10) {
  errors.push(`Expected multiple inputs with bg-[#0d1733], found only ${inputBgMatches}.`);
} else {
  console.log(`✔ Verified ${inputBgMatches} input/well elements using deep navy bg-[#0d1733].`);
}

// Check 6: Rose/red trash/delete button visibility
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
  console.log('\n✅ All Create Exam Full-Screen & Theme contrast tests PASSED successfully!');
  process.exit(0);
}
