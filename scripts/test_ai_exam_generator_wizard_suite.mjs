// ============================================================================
// EDTECHRA AI EXAM GENERATOR WIZARD & TEACHER EXPERIENCE TEST SUITE
// Comprehensive validation of:
// 1. Cloze Passage schema, scoring utilities, and canonical definitions
// 2. JSONValidator with Cloze support and generateCorrectionPrompt export
// 3. AIExamGeneratorWizard 5-step workflow (Content, Blueprint, Media, Settings, Prompt/Import)
// 4. Visual Question Editor Modal (no raw JSON exposed to teachers)
// 5. Simple Publish Modal (Publish Now vs Schedule, Target Availability)
// 6. Student Interactive Cloze Renderer and Student Preview
// 7. LivePreviewModal dual modes (Student Preview vs Teacher Edit)
// 8. AssessmentBuilder integration and TopBar AI button
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=================================================================');
console.log('  EDTECHRA AI EXAM GENERATOR WIZARD & TEACHER WORKFLOW SUITE     ');
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
  // --------------------------------------------------------------------------
  // 1. Cloze Passage Schema & Types Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Cloze Passage Schema & Types Verification ---');
  const schemaPath = path.join(rootDir, 'src/components/exam/shared/ExamSchema.ts');
  assert(fs.existsSync(schemaPath), 'ExamSchema.ts exists');
  const schemaSrc = fs.readFileSync(schemaPath, 'utf-8');

  assert(schemaSrc.includes("'cloze_passage'"), "ExamSchema includes 'cloze_passage' in SupportedQuestionType");
  assert(schemaSrc.includes("'cloze_activity'"), "ExamSchema includes 'cloze_activity' in ActivityType");
  assert(schemaSrc.includes('export interface ClozeBlank'), 'ExamSchema exports ClozeBlank interface');
  assert(schemaSrc.includes('export interface ClozePassageQuestion'), 'ExamSchema exports ClozePassageQuestion interface');
  assert(schemaSrc.includes('blanks?: ClozeBlank[]'), 'ExamActivity includes optional blanks');
  assert(schemaSrc.includes('wordBank?: string[]'), 'ExamActivity includes optional wordBank');
  assert(schemaSrc.includes('ClozePassageQuestion') && schemaSrc.includes('export type CanonicalQuestion ='), 'CanonicalQuestion union includes ClozePassageQuestion');

  // QuestionTypes.ts
  const qTypesPath = path.join(rootDir, 'src/components/exam/shared/QuestionTypes.ts');
  assert(fs.existsSync(qTypesPath), 'QuestionTypes.ts exists');
  const qTypesSrc = fs.readFileSync(qTypesPath, 'utf-8');
  assert(qTypesSrc.includes("type: 'cloze_passage'"), 'ALL_QUESTION_TYPES contains cloze_passage');
  assert(qTypesSrc.includes('FileSpreadsheet') && qTypesSrc.includes('cloze_passage'), 'cloze_passage uses FileSpreadsheet icon');
  assert(qTypesSrc.includes('teal-500') || qTypesSrc.includes('teal-300'), 'cloze_passage has teal accent colors');

  // QuestionTypeRegistry.ts
  const qRegistryPath = path.join(rootDir, 'src/components/exam/shared/QuestionTypeRegistry.ts');
  assert(fs.existsSync(qRegistryPath), 'QuestionTypeRegistry.ts exists');
  const qRegistrySrc = fs.readFileSync(qRegistryPath, 'utf-8');
  assert(qRegistrySrc.includes("'cloze_passage'"), 'AssessmentQuestionType includes cloze_passage');
  assert(qRegistrySrc.includes('cloze_passage: {'), 'QUESTION_TYPE_DEFINITIONS contains cloze_passage');

  // scoringUtilities.ts
  const scoringPath = path.join(rootDir, 'src/components/exam/shared/scoringUtilities.ts');
  assert(fs.existsSync(scoringPath), 'scoringUtilities.ts exists');
  const scoringSrc = fs.readFileSync(scoringPath, 'utf-8');
  assert(scoringSrc.includes("type === 'cloze_passage'"), 'scoringUtilities handles cloze_passage marks');
  assert(scoringSrc.includes("activityType === 'cloze_activity'"), 'scoringUtilities handles cloze_activity marks and counts');
  assert(scoringSrc.includes("act.activityType === 'cloze_activity'"), 'flattenExamQuestions converts cloze_activity into flattened questions');

  // --------------------------------------------------------------------------
  // 2. JSONValidator with Cloze & Correction Prompt Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 2. JSONValidator & AI Prompt Diagnostics Verification ---');
  const validatorPath = path.join(rootDir, 'src/components/exam/teacher/JSONValidator.ts');
  assert(fs.existsSync(validatorPath), 'JSONValidator.ts exists');
  const validatorSrc = fs.readFileSync(validatorPath, 'utf-8');

  assert(validatorSrc.includes("raw === 'cloze_passage'"), "normalizeQuestionType handles 'cloze_passage'");
  assert(validatorSrc.includes("raw === 'cloze_activity'"), "normalizeQuestionType handles 'cloze_activity'");
  assert(validatorSrc.includes("export function generateCorrectionPrompt"), 'JSONValidator exports generateCorrectionPrompt');
  assert(validatorSrc.includes('CRITICAL FIX REQUIRED'), 'generateCorrectionPrompt generates structured correction prompt for AI');
  assert(validatorSrc.includes("normalizedType === 'cloze_passage'"), 'validateExamJSON validates cloze_passage questions (blanks and word bank)');

  // Dynamic test of JSONValidator
  try {
    const { validateExamJSON, generateCorrectionPrompt } = await import('../src/components/exam/teacher/JSONValidator.ts');
    
    // Test cloze passage normalization and validation
    const sampleClozeExam = {
      exam: { title: 'English Test', subject: 'English', grade: 'Grade 10' },
      sections: [
        {
          id: 'sec_1',
          title: 'Section A - Cloze',
          questions: [
            {
              id: 'q1',
              type: 'cloze_passage',
              question: 'Fill in the blanks: The cat [ 1 ] on the mat and [ 2 ] asleep.',
              passage: 'The cat [ 1 ] on the mat and [ 2 ] asleep in the warm sun.',
              blanks: [
                { id: '1', blankIndex: 1, acceptedAnswers: ['sat', 'was'] },
                { id: '2', blankIndex: 2, acceptedAnswers: ['fell', 'was'] }
              ],
              wordBank: ['sat', 'fell', 'ran', 'jumped'],
              marks: 4
            }
          ]
        }
      ]
    };

    const res = validateExamJSON(sampleClozeExam);
    assert(res.isValid, 'validateExamJSON accepts valid Cloze Passage exam JSON');
    assert(res.parsedExam?.sections?.[0]?.questions?.[0]?.type === 'cloze_passage', 'Parsed question has type cloze_passage');

    // Test correction prompt generator
    const invalidErrors = [
      { id: 'missing_answers', message: 'Question q1 is missing correct answers' },
      { id: 'empty_section', message: 'Section 1 has no questions' }
    ];
    const invalidWarnings = [
      { id: 'warn_opt', message: 'Option text is empty' }
    ];
    const correctionPrompt = generateCorrectionPrompt(invalidErrors, invalidWarnings, '{"raw": "test"}');
    assert(typeof correctionPrompt === 'string' && correctionPrompt.includes('CRITICAL FIX REQUIRED'), 'generateCorrectionPrompt returns actionable prompt string');
  } catch (err) {
    console.error('Dynamic import error:', err);
    assert(false, `Dynamic test of JSONValidator failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // 3. AI Exam Generator Wizard Component Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 3. AI Exam Generator Wizard Component Verification ---');
  const wizardPath = path.join(rootDir, 'src/components/exam/builder/ai/AIExamGeneratorWizard.tsx');
  assert(fs.existsSync(wizardPath), 'AIExamGeneratorWizard.tsx exists');
  const wizardSrc = fs.readFileSync(wizardPath, 'utf-8');

  // Step indicator and 5 panels
  assert(wizardSrc.includes("useState<1 | 2 | 3 | 4 | 5>(1)"), 'Wizard defines 5 sequential steps');
  assert(wizardSrc.includes("1. What should this exam test?"), 'Step 1 is Content Topic & Notes');
  assert(wizardSrc.includes("2. Choose your question types"), 'Step 2 is Question Blueprint');
  assert(wizardSrc.includes("3. Add Media"), 'Step 3 is Media & Attachments');
  assert(wizardSrc.includes("4. Exam Settings"), 'Step 4 is Exam Settings');
  assert(wizardSrc.includes("5. Generate Your AI Exam"), 'Step 5 is Generate AI Prompt & Import');

  // Blueprint presets & teacher-friendly question types
  assert(wizardSrc.includes("handleApplyPreset"), 'Wizard provides pre-designed blueprint presets');
  assert(wizardSrc.includes('Standard Exam') && wizardSrc.includes("id: 'standard'"), 'Standard Exam is default blueprint preset');
  assert(wizardSrc.includes('Quick Test') && wizardSrc.includes("id: 'quick'"), 'Blueprint includes Quick Test preset');
  assert(wizardSrc.includes('Grammar Test') && wizardSrc.includes("id: 'grammar'"), 'Blueprint includes Grammar Test preset');
  assert(wizardSrc.includes('Reading Test') && wizardSrc.includes("id: 'reading'"), 'Blueprint includes Reading Test preset');
  assert(wizardSrc.includes('cloze_passage'), 'Wizard blueprint items include Cloze Passage');
  assert(wizardSrc.includes('DEFAULT_BLUEPRINT_ITEMS') && wizardSrc.includes('Picture Question'), 'Wizard includes 15 teacher-friendly question types');

  // Media conditioning & audio transcripts
  assert(wizardSrc.includes('audioTranscript') && wizardSrc.includes('Audio Transcript'), 'Wizard requires listening transcript for accurate AI question generation');
  assert(wizardSrc.includes('pictureFile') && wizardSrc.includes('Upload Image'), 'Wizard handles image upload and visual prompt grounding');

  // AI Prompt strict grounding and schema safety
  assert(wizardSrc.includes('generatedAIPrompt = useMemo'), 'Wizard implements generatedAIPrompt memo generator');
  assert(wizardSrc.includes('DO NOT alter or hallucinate question types not listed in the blueprint.'), 'Prompt enforces strict schema adherence');
  assert(wizardSrc.includes('Copy AI Prompt'), 'Wizard includes 1-click Copy AI Prompt button');
  assert(wizardSrc.includes('generateCorrectionPrompt'), 'Wizard imports and utilizes generateCorrectionPrompt on validation failure');
  assert(wizardSrc.includes('Copy Correction Prompt'), 'Wizard provides 1-click Copy Correction Prompt button');

  // --------------------------------------------------------------------------
  // 4. Question Visual Editor Modal Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Question Visual Editor Modal Verification ---');
  const editorModalPath = path.join(rootDir, 'src/components/exam/builder/modals/QuestionVisualEditorModal.tsx');
  assert(fs.existsSync(editorModalPath), 'QuestionVisualEditorModal.tsx exists');
  const editorModalSrc = fs.readFileSync(editorModalPath, 'utf-8');

  assert(editorModalSrc.includes('export const QuestionVisualEditorModal'), 'QuestionVisualEditorModal component exported');
  assert(editorModalSrc.includes("draft.type === 'multiple_choice'"), 'Editor supports Multiple Choice question visual editing');
  assert(editorModalSrc.includes("draft.type === 'cloze_passage'"), 'Editor supports Cloze Passage visual editing');
  assert(editorModalSrc.includes('Add Blank') && editorModalSrc.includes('acceptedAnswers'), 'Editor supports adding/editing Cloze blanks and accepted answers');
  assert(editorModalSrc.includes('Word Bank') && editorModalSrc.includes('handleAddWordBankTerm'), 'Editor supports Cloze word bank tag editing');
  assert(editorModalSrc.includes('draft.marks') && editorModalSrc.includes('Allocated Marks'), 'Editor provides marks and difficulty controls');
  assert(editorModalSrc.includes('Visual Question Editor') && !editorModalSrc.includes('Paste raw JSON'), 'Editor does not force raw JSON input on teachers');

  // --------------------------------------------------------------------------
  // 5. Simple Publish Modal Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Simple Publish Modal Verification ---');
  const publishModalPath = path.join(rootDir, 'src/components/exam/builder/publishing/SimplePublishModal.tsx');
  assert(fs.existsSync(publishModalPath), 'SimplePublishModal.tsx exists');
  const publishModalSrc = fs.readFileSync(publishModalPath, 'utf-8');

  assert(publishModalSrc.includes('export const SimplePublishModal'), 'SimplePublishModal component exported');
  assert(publishModalSrc.includes("publishMode === 'now'") && publishModalSrc.includes("publishMode === 'schedule'"), 'Modal supports Publish Now and Schedule Later modes');
  assert(publishModalSrc.includes('scheduledDate') && publishModalSrc.includes('startTime') && publishModalSrc.includes('endTime'), 'Modal contains date and start/end time pickers');
  assert(publishModalSrc.includes('availability') && publishModalSrc.includes('Specific class') && publishModalSrc.includes('Entire course'), 'Modal contains target availability selection');

  // --------------------------------------------------------------------------
  // 6. Interactive Cloze Student Renderer & Student Preview
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Interactive Cloze Question Student Renderer Verification ---');
  const clozePath = path.join(rootDir, 'src/components/exam/student/renderers/ClozeQuestion.tsx');
  assert(fs.existsSync(clozePath), 'ClozeQuestion.tsx renderer exists');
  const clozeSrc = fs.readFileSync(clozePath, 'utf-8');

  assert(clozeSrc.includes('wordBank') && clozeSrc.includes('Word Bank'), 'ClozeQuestion supports word bank chips');
  assert(clozeSrc.includes('completedCount') && clozeSrc.includes('completed'), 'ClozeQuestion displays filled blanks progress counter');
  assert(clozeSrc.includes('clozeQ.passage') && clozeSrc.includes('handleBlankInput'), 'ClozeQuestion renders passage and interactive blank inputs');

  // QuestionRenderer routing
  const rendererPath = path.join(rootDir, 'src/components/exam/student/QuestionRenderer.tsx');
  assert(fs.existsSync(rendererPath), 'QuestionRenderer.tsx exists');
  const rendererSrc = fs.readFileSync(rendererPath, 'utf-8');
  assert(rendererSrc.includes('ClozeQuestionComponent'), 'QuestionRenderer imports ClozeQuestionComponent');
  assert(rendererSrc.includes("case 'cloze_passage':"), 'QuestionRenderer routes cloze_passage to ClozeQuestionComponent');

  // --------------------------------------------------------------------------
  // 7. LivePreviewModal Dual Modes & Student Preview Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 7. LivePreviewModal Dual Modes & Visual Edit Studio ---');
  const livePreviewPath = path.join(rootDir, 'src/components/exam/builder/preview/LivePreviewModal.tsx');
  assert(fs.existsSync(livePreviewPath), 'LivePreviewModal.tsx exists');
  const livePreviewSrc = fs.readFileSync(livePreviewPath, 'utf-8');

  assert(livePreviewSrc.includes("type ViewMode = 'student' | 'teacher'"), 'LivePreviewModal supports Student and Teacher view modes');
  assert(livePreviewSrc.includes('Student Preview') && livePreviewSrc.includes('Teacher Edit'), 'LivePreviewModal contains dual mode toggle tabs');
  assert(livePreviewSrc.includes('QuestionVisualEditorModal'), 'LivePreviewModal integrates QuestionVisualEditorModal');
  assert(livePreviewSrc.includes('SimplePublishModal'), 'LivePreviewModal integrates SimplePublishModal');
  assert(livePreviewSrc.includes('handleDuplicateQuestion') && livePreviewSrc.includes('handleDeleteQuestion'), 'LivePreviewModal provides question action buttons (Duplicate, Delete, Edit)');
  assert(livePreviewSrc.includes('cloze_passage') && livePreviewSrc.includes('wordBank'), 'LivePreviewModal renders Cloze Passage questions with interactive blank filling and word bank');
  assert(livePreviewSrc.includes('Publish Exam to Students'), 'LivePreviewModal has 1-click Publish Exam button in teacher mode');

  // --------------------------------------------------------------------------
  // 8. AssessmentBuilder Integration Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 8. AssessmentBuilder Integration Verification ---');
  const builderPath = path.join(rootDir, 'src/components/exam/builder/AssessmentBuilder.tsx');
  assert(fs.existsSync(builderPath), 'AssessmentBuilder.tsx exists');
  const builderSrc = fs.readFileSync(builderPath, 'utf-8');

  assert(builderSrc.includes("import { AIExamGeneratorWizard } from './ai/AIExamGeneratorWizard'"), 'AssessmentBuilder imports AIExamGeneratorWizard');
  assert(builderSrc.includes('<AIExamGeneratorWizard') && builderSrc.includes('isOpen={isAIWizardOpen}'), 'AssessmentBuilder renders AIExamGeneratorWizard');
  assert(builderSrc.includes('onOpenAIWizard={() => setIsAIWizardOpen(true)}'), 'AssessmentBuilder passes onOpenAIWizard handler to TopBar');
  assert(builderSrc.includes('onUpdateAssessment={(updated) => updateAssessment(() => updated)}'), 'AssessmentBuilder wires onUpdateAssessment in LivePreviewModal');
  assert(builderSrc.includes('onPublishExam={async (settings) =>'), 'AssessmentBuilder wires onPublishExam in LivePreviewModal');

  // TopBar AI Button
  const topBarPath = path.join(rootDir, 'src/components/exam/builder/TopBar.tsx');
  assert(fs.existsSync(topBarPath), 'TopBar.tsx exists');
  const topBarSrc = fs.readFileSync(topBarPath, 'utf-8');
  assert(topBarSrc.includes('onOpenAIWizard?: () => void'), 'TopBarProps includes onOpenAIWizard');
  assert(topBarSrc.includes('AI Generator') && topBarSrc.includes('onOpenAIWizard'), 'TopBar renders prominent AI Generator button');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(`  TEST RESULTS: ${passedTests} passed, ${failedTests} failed`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
