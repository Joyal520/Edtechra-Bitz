// ============================================================================
// EDTECHRA STANDARD EXAM WORKFLOW & BLUEPRINT TEST SUITE
// Verifies:
// 1. Content-first assessment blueprint generation (Standard Exam & O/L Style Exam)
// 2. Keyword extraction from lesson notes
// 3. High-level Adjust Exam controller transformations (more grammar, add listening, etc.)
// 4. AI Prompt Bridge generation & JSON normalization/import validation
// 5. Light theme & contrast compliance for teacher studio & student exam experience
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=================================================================');
console.log('  EDTECHRA ASSESSMENT BUILDER: STANDARD EXAM ARCHITECTURE TESTS  ');
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
  console.log('\n--- 1. Testing Assessment Blueprint Source Code & Architecture ---');

  const blueprintsPath = path.join(rootDir, 'src/components/exam/shared/assessmentBlueprints.ts');
  assert(fs.existsSync(blueprintsPath), 'assessmentBlueprints.ts exists');

  const blueprintsSource = fs.readFileSync(blueprintsPath, 'utf-8');
  assert(blueprintsSource.includes('export function generateStandardExamBlueprint'), 'Exports generateStandardExamBlueprint');
  assert(blueprintsSource.includes('export function generateOLStyleBlueprint'), 'Exports generateOLStyleBlueprint');
  assert(blueprintsSource.includes('export function adjustExamBlueprint'), 'Exports adjustExamBlueprint');
  assert(blueprintsSource.includes('export function extractKeywordsFromNotes'), 'Exports extractKeywordsFromNotes');

  // Verify keyword extraction logic
  assert(blueprintsSource.includes('stopwords') || blueprintsSource.includes('STOPWORDS'), 'Implements stopword filtering for keyword extraction');

  console.log('\n--- 2. Testing 3 Creation Modes Entry Architecture ---');

  const creationModalPath = path.join(rootDir, 'src/components/exam/builder/modals/CreationModeModal.tsx');
  assert(fs.existsSync(creationModalPath), 'CreationModeModal.tsx exists');

  const creationModalSource = fs.readFileSync(creationModalPath, 'utf-8');
  assert(creationModalSource.includes('STANDARD EXAM') || creationModalSource.includes('Standard Exam'), 'Features STANDARD EXAM');
  assert(creationModalSource.includes('O/L STYLE EXAM') || creationModalSource.includes('O/L Style Exam'), 'Features O/L STYLE EXAM');
  assert(creationModalSource.includes('CUSTOM EXAM') || creationModalSource.includes('Custom Exam'), 'Features CUSTOM EXAM');
  assert(creationModalSource.includes('RECOMMENDED DEFAULT') || creationModalSource.includes('Recommended Default') || creationModalSource.includes('Recommended'), 'Standard Exam marked as Recommended Default');

  console.log('\n--- 3. Testing Standard Exam Workflow Modal ---');

  const standardModalPath = path.join(rootDir, 'src/components/exam/builder/modals/StandardExamModal.tsx');
  assert(fs.existsSync(standardModalPath), 'StandardExamModal.tsx exists');

  const standardModalSource = fs.readFileSync(standardModalPath, 'utf-8');
  assert(standardModalSource.includes('lessonNotes') || standardModalSource.includes('Lesson Notes'), 'Accepts lesson notes input');
  assert(standardModalSource.includes('Generate Standard Exam'), 'Includes "Generate Standard Exam" action button');
  assert(standardModalSource.includes('AI Prompt Bridge') || standardModalSource.includes('onOpenAIPromptBridge'), 'Supports AI Prompt Bridge transition');

  console.log('\n--- 4. Testing O/L Style Exam Workflow Modal ---');

  const olModalPath = path.join(rootDir, 'src/components/exam/builder/modals/OLStyleExamModal.tsx');
  assert(fs.existsSync(olModalPath), 'OLStyleExamModal.tsx exists');

  const olModalSource = fs.readFileSync(olModalPath, 'utf-8');
  assert(olModalSource.includes('O/L Practice Examination') || olModalSource.includes('O/L Style Exam'), 'Supports O/L simulation');
  assert(olModalSource.includes('Generate O/L Exam') || olModalSource.includes('onGenerateOLExam'), 'Has Generate O/L Exam action');

  console.log('\n--- 5. Testing Adjust Exam Controller Architecture ---');

  const adjustModalPath = path.join(rootDir, 'src/components/exam/builder/modals/AdjustExamModal.tsx');
  assert(fs.existsSync(adjustModalPath), 'AdjustExamModal.tsx exists');

  const adjustModalSource = fs.readFileSync(adjustModalPath, 'utf-8');
  assert(adjustModalSource.includes('moreGrammar'), 'Includes moreGrammar option');
  assert(adjustModalSource.includes('moreVocabulary'), 'Includes moreVocabulary option');
  assert(adjustModalSource.includes('moreReading'), 'Includes moreReading option');
  assert(adjustModalSource.includes('addListening'), 'Includes addListening option');
  assert(adjustModalSource.includes('addVideo'), 'Includes addVideo option');
  assert(adjustModalSource.includes('addPictureDescription'), 'Includes addPictureDescription option');
  assert(adjustModalSource.includes('addWriting'), 'Includes addWriting option');
  assert(adjustModalSource.includes('makeEasier'), 'Includes makeEasier option');
  assert(adjustModalSource.includes('makeChallenging'), 'Includes makeChallenging option');
  assert(adjustModalSource.includes('Update Exam') || adjustModalSource.includes('onApplyAdjustments'), 'Includes Update Exam handler');

  console.log('\n--- 6. Testing AI Prompt Bridge & JSON Importer ---');

  const promptBridgePath = path.join(rootDir, 'src/components/exam/builder/modals/AIPromptBridgeModal.tsx');
  assert(fs.existsSync(promptBridgePath), 'AIPromptBridgeModal.tsx exists');

  const promptBridgeSource = fs.readFileSync(promptBridgePath, 'utf-8');
  assert(promptBridgeSource.includes('ChatGPT') || promptBridgeSource.includes('Gemini') || promptBridgeSource.includes('Claude'), 'Mentions supported LLMs');
  assert(promptBridgeSource.includes('Copy Prompt') || promptBridgeSource.includes('Copy Complete Prompt'), 'Has 1-click Copy Prompt button');
  assert(promptBridgeSource.includes('validateExamJSON'), 'Integrates JSON validator');
  assert(promptBridgeSource.includes('Import Into Live Exam'), 'Includes 1-click import into live cards');

  // Verify JSON validator accepts activities and new question types
  const validatorPath = path.join(rootDir, 'src/components/exam/teacher/JSONValidator.ts');
  assert(fs.existsSync(validatorPath), 'JSONValidator.ts exists');
  const validatorSource = fs.readFileSync(validatorPath, 'utf-8');
  assert(validatorSource.includes('sentence_builder'), 'Normalizes sentence_builder');
  assert(validatorSource.includes('sentence_completion'), 'Normalizes sentence_completion');
  assert(validatorSource.includes('rawSecActivities'), 'Validates section activities alongside questions');

  console.log('\n--- 7. Testing Exam Studio Outline Tree & Contextual Inspector ---');

  const leftSidebarPath = path.join(rootDir, 'src/components/exam/builder/LeftSidebar.tsx');
  const leftSidebarSource = fs.readFileSync(leftSidebarPath, 'utf-8');
  assert(leftSidebarSource.includes('Exam Instructions') || leftSidebarSource.includes('Instructions'), 'Exam Outline Tree has explicit Instructions node');
  assert(leftSidebarSource.includes('Add Section'), 'Exam Outline Tree has Add Section button');

  const rightPanelPath = path.join(rootDir, 'src/components/exam/builder/RightPropertyPanel.tsx');
  const rightPanelSource = fs.readFileSync(rightPanelPath, 'utf-8');
  assert(rightPanelSource.includes('listening_activity') || rightPanelSource.includes('Listening Activity'), 'Contextual inspector supports Listening Activity');
  assert(rightPanelSource.includes('picture_description_activity') || rightPanelSource.includes('Picture Description'), 'Contextual inspector supports Picture Description Activity');
  assert(rightPanelSource.includes('video_activity') || rightPanelSource.includes('Video Activity'), 'Contextual inspector supports Video Activity');

  const topBarPath = path.join(rootDir, 'src/components/exam/builder/TopBar.tsx');
  const topBarSource = fs.readFileSync(topBarPath, 'utf-8');
  assert(topBarSource.includes('onOpenAdjustExam'), 'TopBar has onOpenAdjustExam trigger');
  assert(topBarSource.includes('onOpenCreationMode'), 'TopBar has onOpenCreationMode trigger');

  console.log('\n--- 8. Testing Student Exam High-Contrast Light Theme & UX ---');

  const cssPath = path.join(rootDir, 'src/index.css');
  const cssSource = fs.readFileSync(cssPath, 'utf-8');
  assert(cssSource.includes('.edtechra-student-exam') || cssSource.includes('[data-student-exam="true"]'), 'index.css defines .edtechra-student-exam rules');
  assert(cssSource.includes('--theme-text-primary: #0f172a !important') || cssSource.includes('color: #0f172a !important'), 'Enforces dark navy #0f172a text in light theme');
  assert(cssSource.includes('color-scheme: light !important'), 'Enforces color-scheme: light !important');

  const sessionPath = path.join(rootDir, 'src/components/exam/student/ExamSession.tsx');
  const sessionSource = fs.readFileSync(sessionPath, 'utf-8');
  assert(sessionSource.includes('data-student-exam="true"'), 'ExamSession has data-student-exam="true" attribute');
  assert(sessionSource.includes('sectionsList') || sessionSource.includes('Exam Sections'), 'ExamSession features Section Navigation strip');
  assert(sessionSource.includes('Clear Answer') || sessionSource.includes('handleClearCurrentAnswer'), 'ExamSession features Clear Answer button');

  const headerPath = path.join(rootDir, 'src/components/exam/student/ExamHeader.tsx');
  const headerSource = fs.readFileSync(headerPath, 'utf-8');
  assert(!headerSource.includes('bg-[#091124]'), 'ExamHeader does not use dark #091124 background');
  assert(headerSource.includes('bg-white') || headerSource.includes('bg-slate-50'), 'ExamHeader uses clean light background');
  assert(headerSource.includes('text-slate-900') || headerSource.includes('text-slate-800'), 'ExamHeader uses high-contrast dark text');

  const navPath = path.join(rootDir, 'src/components/exam/student/QuestionNavigator.tsx');
  const navSource = fs.readFileSync(navPath, 'utf-8');
  assert(!navPath.includes('bg-[#0b142c]') && !navSource.includes('bg-[#0b142c]'), 'QuestionNavigator does not use dark #0b142c background');
  assert(navSource.includes('bg-white'), 'QuestionNavigator uses white card');

  const rendererPath = path.join(rootDir, 'src/components/exam/student/QuestionRenderer.tsx');
  const rendererSource = fs.readFileSync(rendererPath, 'utf-8');
  assert(!rendererSource.includes('bg-[#0f1b3d]'), 'QuestionRenderer does not use dark #0f1b3d background');
  assert(rendererSource.includes('bg-white'), 'QuestionRenderer coreCard uses white background');
  assert(rendererSource.includes('text-slate-900'), 'QuestionRenderer prompt uses text-slate-900');

  console.log('\n=================================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
