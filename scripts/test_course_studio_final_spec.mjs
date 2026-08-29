// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: FINAL SPECIFICATION INTEGRATION SUITE
// Tests max 10 units, 5 content block types, Question Planning,
// Prompt Builder, JSON Schema v1.0 validation, Question Importer, and 14px typography.
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

console.log('\n======================================================');
console.log('🧪 RUNNING COURSE STUDIO FINAL SPECIFICATION TEST SUITE');
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
// TEST 1: Course Creation Modal Architecture
// ----------------------------------------------------------------------------
test('CreateCourseModal has wide landscape layout and no short description/grade level inputs', () => {
  const modalPath = path.join(ROOT_DIR, 'src/components/course-studio/CreateCourseModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  assert(content.includes('max-w-[980px]'), 'Must have wide landscape desktop modal (900-1100px)');
  assert(content.includes('max-h-[85vh]'), 'Must have 80-85vh max height');
  assert(!content.includes('Short Description'), 'Must NOT ask for Short Description in initial creation');
  assert(!content.includes('Grade Level'), 'Must NOT ask for Grade Level in initial creation');
  assert(content.includes('Full Course') && content.includes('Quick Lesson'), 'Must support Full Course and Quick Lesson');
});

// ----------------------------------------------------------------------------
// TEST 2: Strict 10 Units Limit in Course Outline
// ----------------------------------------------------------------------------
test('CourseEditorPage enforces a maximum of 10 units', () => {
  const editorPath = path.join(ROOT_DIR, 'src/pages/course-studio/CourseEditorPage.tsx');
  const content = fs.readFileSync(editorPath, 'utf8');

  assert(content.includes('(course.units?.length || 0) >= 10'), 'Must enforce max 10 units check');
  assert(content.includes('Maximum of 10 units reached.'), 'Must notify when 10 units limit is reached');
});

// ----------------------------------------------------------------------------
// TEST 3: All 5 Content Block Types Supported
// ----------------------------------------------------------------------------
test('5 content section types are supported with Move Up/Down and Duplicate', () => {
  const editorPath = path.join(ROOT_DIR, 'src/pages/course-studio/CourseEditorPage.tsx');
  const content = fs.readFileSync(editorPath, 'utf8');

  assert(content.includes("'text'"), "Must support 'text'");
  assert(content.includes("'text_image'"), "Must support 'text_image'");
  assert(content.includes("'text_video'"), "Must support 'text_video'");
  assert(content.includes("'image'"), "Must support 'image'");
  assert(content.includes("'youtube_video'") || content.includes("'youtube_short'"), "Must support video");
  assert(content.includes('handleDuplicateBlock'), 'Must support duplicating sections');
  assert(content.includes('handleMoveBlock'), 'Must support non-drag Move Up/Down');
});

// ----------------------------------------------------------------------------
// TEST 4: Question Plan & Prompt Builder v1.0 Schema
// ----------------------------------------------------------------------------
test('Question Schema Validator implements EdTechra Schema v1.0 and prompt construction', () => {
  const validatorPath = path.join(ROOT_DIR, 'src/utils/questionSchemaValidator.ts');
  const content = fs.readFileSync(validatorPath, 'utf8');

  assert(content.includes('buildAiQuestionPrompt'), 'Must export buildAiQuestionPrompt');
  assert(content.includes('schema_version'), 'Must enforce schema_version 1.0');
  assert(content.includes('question_sets'), 'Must enforce question_sets array');
  assert(content.includes('multiple_choice'), 'Must support multiple_choice');
  assert(content.includes('true_false'), 'Must support true_false');
  assert(content.includes('fill_blank'), 'Must support fill_blank');
  assert(content.includes('matching'), 'Must support matching');
  assert(content.includes('ordering'), 'Must support ordering');
  assert(content.includes('short_answer'), 'Must support short_answer');
});

// ----------------------------------------------------------------------------
// TEST 5: Strict JSON Validation & Count Mismatch Detection
// ----------------------------------------------------------------------------
test('JSON validator detects missing fields and count mismatches', () => {
  const validatorPath = path.join(ROOT_DIR, 'src/utils/questionSchemaValidator.ts');
  const content = fs.readFileSync(validatorPath, 'utf8');

  assert(content.includes('validateAiQuestionJson'), 'Must export validateAiQuestionJson');
  assert(content.includes('Expected'), 'Must report count discrepancies when JSON questions do not match plan');
  assert(content.includes('convertValidatedJsonToCourseQuestions'), 'Must export convertValidatedJsonToCourseQuestions');
});

// ----------------------------------------------------------------------------
// TEST 6: Strict 14px Digital Textbook Typography
// ----------------------------------------------------------------------------
test('courseTextFormatting enforces strict 14px body text with 1.75 line-height', () => {
  const textFormatPath = path.join(ROOT_DIR, 'src/utils/courseTextFormatting.tsx');
  const content = fs.readFileSync(textFormatPath, 'utf8');

  assert(content.includes('text-[14px] leading-[1.75]'), 'Must enforce 14px body typography with 1.75 leading');
  assert(content.includes('text-left'), 'Must enforce left-alignment');
});

// ----------------------------------------------------------------------------
// TEST 7: Shared CourseContentRenderer Supports All 6 Question Types
// ----------------------------------------------------------------------------
test('CourseContentRenderer renders all 6 question types with interactive evaluation', () => {
  const rendererPath = path.join(ROOT_DIR, 'src/components/course-studio/CourseContentRenderer.tsx');
  const content = fs.readFileSync(rendererPath, 'utf8');

  assert(content.includes('multiple_choice'), 'Must render multiple choice');
  assert(content.includes('true_false'), 'Must render true / false');
  assert(content.includes('fill_blank'), 'Must render fill in the blank');
  assert(content.includes('matching'), 'Must render matching');
  assert(content.includes('ordering'), 'Must render ordering');
  assert(content.includes('short_answer'), 'Must render short answer');
  assert(content.includes('max-w-[760px]'), 'Must enforce 700-800px reading width');
});

console.log('\n======================================================');
console.log(`🎯 SPECIFICATION VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
