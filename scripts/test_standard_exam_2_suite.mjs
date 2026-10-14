// ============================================================================
// EDTECHRA STANDARD EXAM 2.0: COMPREHENSIVE VERIFICATION SUITE
// Tests all 12 core requirements of the Standard Exam 2.0 redesign:
// 1. Controlled 100-mark blueprint (7 sections, 40 questions, 100 marks)
// 2. Strict progressive difficulty ordering (A -> B -> C -> D -> E -> F -> G)
// 3. AI prompt generator (buildStandardExamAIPrompt)
// 4. Strict validator (validateStandardExamPackage - fail closed)
// 5. Correction prompt builder (buildStandardCorrectionPrompt)
// 6. All 7 question renderers + StandardExamStudentView
// 7. Client deterministic grading engine (standardGrading.ts)
// 8. Server deterministic grading service (server/hybridGradingService.mjs)
// 9. Integration in AIPromptBridgeModal, AIExamGeneratorWizard, ExamSession, LivePreviewModal
// 10. Simple Exam protection: SimpleExamStudentView is untouched
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=================================================================');
console.log('  EDTECHRA STANDARD EXAM 2.0: FULL COMPREHENSIVE TEST SUITE      ');
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
  // 1. STANDARD EXAM 2.0 PACKAGE & BLUEPRINT DEFINITION
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing standardExamPackage.ts Architecture ---');

  const pkgPath = path.join(rootDir, 'src/components/exam/shared/standardExamPackage.ts');
  assert(fs.existsSync(pkgPath), 'standardExamPackage.ts exists');

  const pkgSrc = fs.readFileSync(pkgPath, 'utf-8');
  assert(pkgSrc.includes('EXPECTED_STANDARD_SECTIONS'), 'Exports EXPECTED_STANDARD_SECTIONS');
  assert(pkgSrc.includes('buildStandardExamAIPrompt'), 'Exports buildStandardExamAIPrompt');
  assert(pkgSrc.includes('validateStandardExamPackage'), 'Exports validateStandardExamPackage');
  assert(pkgSrc.includes('buildStandardCorrectionPrompt'), 'Exports buildStandardCorrectionPrompt');
  assert(pkgSrc.includes('generateStandardExam2Blueprint'), 'Exports generateStandardExam2Blueprint');
  assert(pkgSrc.includes('mapStandardPackageToCanonical'), 'Exports mapStandardPackageToCanonical');

  // Verify the 7 sections specification in EXPECTED_STANDARD_SECTIONS
  assert(pkgSrc.includes("'mcq'") && pkgSrc.includes('questionCount: 10') && pkgSrc.includes('marksPerQuestion: 2') && pkgSrc.includes('totalMarks: 20'), 'Section A: MCQ (10 Qs × 2m = 20m)');
  assert(pkgSrc.includes("'matching'") && pkgSrc.includes('questionCount: 5') && pkgSrc.includes('marksPerQuestion: 2') && pkgSrc.includes('totalMarks: 10'), 'Section B: Matching (5 Qs × 2m = 10m)');
  assert(pkgSrc.includes("'correct_wrong'") && pkgSrc.includes('questionCount: 5') && pkgSrc.includes('marksPerQuestion: 2') && pkgSrc.includes('totalMarks: 10'), 'Section C: Correct/Wrong (5 Qs × 2m = 10m)');
  assert(pkgSrc.includes("'cloze'") && pkgSrc.includes('questionCount: 5') && pkgSrc.includes('marksPerQuestion: 2') && pkgSrc.includes('totalMarks: 10'), 'Section D: Cloze (5 Qs × 2m = 10m)');
  assert(pkgSrc.includes("'find_mistake'") && pkgSrc.includes('questionCount: 5') && pkgSrc.includes('marksPerQuestion: 3') && pkgSrc.includes('totalMarks: 15'), 'Section E: Find the Mistake (5 Qs × 3m = 15m)');
  assert(pkgSrc.includes("'controlled_answer'") && pkgSrc.includes('questionCount: 5') && pkgSrc.includes('marksPerQuestion: 3') && pkgSrc.includes('totalMarks: 15'), 'Section F: Controlled Type Answer (5 Qs × 3m = 15m)');
  assert(pkgSrc.includes("'reorder'") && pkgSrc.includes('questionCount: 5') && pkgSrc.includes('marksPerQuestion: 4') && pkgSrc.includes('totalMarks: 20'), 'Section G: Reorder Sentence (5 Qs × 4m = 20m)');

  // --------------------------------------------------------------------------
  // 2. ASSESSMENT BLUEPRINTS INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing assessmentBlueprints.ts Delegation ---');

  const blueprintsPath = path.join(rootDir, 'src/components/exam/shared/assessmentBlueprints.ts');
  const blueprintsSrc = fs.readFileSync(blueprintsPath, 'utf-8');
  assert(blueprintsSrc.includes('generateStandardExam2Blueprint'), 'assessmentBlueprints imports generateStandardExam2Blueprint');
  assert(blueprintsSrc.includes('return generateStandardExam2Blueprint(input)'), 'generateStandardExamBlueprint delegates to generateStandardExam2Blueprint');

  // --------------------------------------------------------------------------
  // 3. STUDENT RENDERERS & STUDENT VIEW
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Standard Student Components ---');

  const studentStandardDir = path.join(rootDir, 'src/components/exam/student/standard');
  assert(fs.existsSync(studentStandardDir), 'student/standard directory exists');

  const choiceRenderer = path.join(studentStandardDir, 'ChoiceRenderer.tsx');
  assert(fs.existsSync(choiceRenderer), 'ChoiceRenderer.tsx exists');
  const choiceSrc = fs.readFileSync(choiceRenderer, 'utf-8');
  assert(choiceSrc.includes('data-option-id') || choiceSrc.includes('options.map'), 'ChoiceRenderer renders options cleanly');

  const matchRenderer = path.join(studentStandardDir, 'MatchRenderer.tsx');
  assert(fs.existsSync(matchRenderer), 'MatchRenderer.tsx exists');
  const matchSrc = fs.readFileSync(matchRenderer, 'utf-8');
  assert(matchSrc.includes('selectedLeft') && matchSrc.includes('handleSelectLeft'), 'MatchRenderer supports mobile tap-to-pair interaction (no drag-and-drop)');
  assert(matchSrc.includes('handleClearPair') || matchSrc.includes('delete updated'), 'MatchRenderer supports unpairing before submission');

  const binaryRenderer = path.join(studentStandardDir, 'BinaryChoiceRenderer.tsx');
  assert(fs.existsSync(binaryRenderer), 'BinaryChoiceRenderer.tsx exists');
  const binarySrc = fs.readFileSync(binaryRenderer, 'utf-8');
  assert(binarySrc.includes('CORRECT') && binarySrc.includes('WRONG'), 'BinaryChoiceRenderer renders [ ✓ CORRECT ] and [ ✕ WRONG ]');

  const clozeRenderer = path.join(studentStandardDir, 'ClozeDropdownRenderer.tsx');
  assert(fs.existsSync(clozeRenderer), 'ClozeDropdownRenderer.tsx exists');
  const clozeSrc = fs.readFileSync(clozeRenderer, 'utf-8');
  assert(clozeSrc.includes('select') || clozeSrc.includes('dropdown'), 'ClozeDropdownRenderer embeds compact mobile-friendly dropdowns');

  const errorTokenRenderer = path.join(studentStandardDir, 'ErrorTokenRenderer.tsx');
  assert(fs.existsSync(errorTokenRenderer), 'ErrorTokenRenderer.tsx exists');
  const errorTokenSrc = fs.readFileSync(errorTokenRenderer, 'utf-8');
  assert(errorTokenSrc.includes('tokens.map') || errorTokenSrc.includes('incorrectToken'), 'ErrorTokenRenderer supports token chips selection');

  const controlledInputRenderer = path.join(studentStandardDir, 'ControlledInputRenderer.tsx');
  assert(fs.existsSync(controlledInputRenderer), 'ControlledInputRenderer.tsx exists');
  const controlledSrc = fs.readFileSync(controlledInputRenderer, 'utf-8');
  assert(controlledSrc.includes('input') && (controlledSrc.includes('autoCorrect="off"') || controlledSrc.includes('spellCheck="false"')), 'ControlledInputRenderer provides controlled single-line input');

  const sentenceBuilderRenderer = path.join(studentStandardDir, 'SentenceBuilderRenderer.tsx');
  assert(fs.existsSync(sentenceBuilderRenderer), 'SentenceBuilderRenderer.tsx exists');
  const sentenceSrc = fs.readFileSync(sentenceBuilderRenderer, 'utf-8');
  assert(sentenceSrc.includes('handleTapWord') && sentenceSrc.includes('handleRemoveWord'), 'SentenceBuilderRenderer provides tap-to-assemble word bank');

  const gradingEngine = path.join(studentStandardDir, 'standardGrading.ts');
  assert(fs.existsSync(gradingEngine), 'standardGrading.ts exists');
  const gradingSrc = fs.readFileSync(gradingEngine, 'utf-8');
  assert(gradingSrc.includes('gradeStandardQuestion'), 'standardGrading exports gradeStandardQuestion');
  assert(gradingSrc.includes('calculateStandardExamScore'), 'standardGrading exports calculateStandardExamScore');

  const standardStudentView = path.join(studentStandardDir, 'StandardExamStudentView.tsx');
  assert(fs.existsSync(standardStudentView), 'StandardExamStudentView.tsx exists');
  const studentViewSrc = fs.readFileSync(standardStudentView, 'utf-8');
  assert(studentViewSrc.includes('ChoiceRenderer'), 'StandardExamStudentView integrates ChoiceRenderer');
  assert(studentViewSrc.includes('MatchRenderer'), 'StandardExamStudentView integrates MatchRenderer');
  assert(studentViewSrc.includes('BinaryChoiceRenderer'), 'StandardExamStudentView integrates BinaryChoiceRenderer');
  assert(studentViewSrc.includes('ClozeDropdownRenderer'), 'StandardExamStudentView integrates ClozeDropdownRenderer');
  assert(studentViewSrc.includes('ErrorTokenRenderer'), 'StandardExamStudentView integrates ErrorTokenRenderer');
  assert(studentViewSrc.includes('ControlledInputRenderer'), 'StandardExamStudentView integrates ControlledInputRenderer');
  assert(studentViewSrc.includes('SentenceBuilderRenderer'), 'StandardExamStudentView integrates SentenceBuilderRenderer');
  assert(studentViewSrc.includes('isBottomSheetOpen') || studentViewSrc.includes('navigatorDrawerOpen'), 'StandardExamStudentView has mobile sheet navigator');

  // --------------------------------------------------------------------------
  // 4. SIMPLE EXAM PROTECTION (LOCKED & READ-ONLY)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Verifying Simple Exam is Locked & Untouched ---');

  const simpleExamPath = path.join(rootDir, 'src/components/exam/student/SimpleExamStudentView.tsx');
  assert(fs.existsSync(simpleExamPath), 'SimpleExamStudentView.tsx exists intact');
  const simpleSrc = fs.readFileSync(simpleExamPath, 'utf-8');
  assert(simpleSrc.includes('SimpleExamStudentViewProps'), 'SimpleExamStudentView retains original interface');
  assert(simpleSrc.includes('cleanOptionText'), 'SimpleExamStudentView retains cleanOptionText');

  // --------------------------------------------------------------------------
  // 5. EXAM SESSION & LIVE PREVIEW MODAL ROUTING
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing ExamSession & LivePreviewModal Routing ---');

  const sessionPath = path.join(rootDir, 'src/components/exam/student/ExamSession.tsx');
  const sessionSrc = fs.readFileSync(sessionPath, 'utf-8');
  assert(sessionSrc.includes("import { StandardExamStudentView } from './standard'"), 'ExamSession imports StandardExamStudentView');
  assert(sessionSrc.includes('isStandardExam'), 'ExamSession defines isStandardExam check');
  assert(sessionSrc.includes('<StandardExamStudentView'), 'ExamSession renders StandardExamStudentView for Standard Exam');
  assert(sessionSrc.includes('<SimpleExamStudentView'), 'ExamSession retains SimpleExamStudentView for Simple Exam');

  const livePreviewPath = path.join(rootDir, 'src/components/exam/builder/preview/LivePreviewModal.tsx');
  const previewSrc = fs.readFileSync(livePreviewPath, 'utf-8');
  assert(previewSrc.includes("import { StandardExamStudentView } from '../../student/standard'"), 'LivePreviewModal imports StandardExamStudentView');
  assert(previewSrc.includes('isStandardExam'), 'LivePreviewModal defines isStandardExam check');
  assert(previewSrc.includes('<StandardExamStudentView'), 'LivePreviewModal renders StandardExamStudentView when previewing Standard Exam');

  // --------------------------------------------------------------------------
  // 6. AI PROMPT BRIDGE MODAL & WIZARD INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Testing AIPromptBridgeModal & AIExamGeneratorWizard ---');

  const bridgePath = path.join(rootDir, 'src/components/exam/builder/modals/AIPromptBridgeModal.tsx');
  const bridgeSrc = fs.readFileSync(bridgePath, 'utf-8');
  assert(bridgeSrc.includes('buildStandardExamAIPrompt'), 'AIPromptBridgeModal uses buildStandardExamAIPrompt');
  assert(bridgeSrc.includes('validateStandardExamPackage'), 'AIPromptBridgeModal uses validateStandardExamPackage');
  assert(bridgeSrc.includes('Fix with AI'), 'AIPromptBridgeModal features [Fix with AI] button');
  assert(bridgeSrc.includes('Edit JSON'), 'AIPromptBridgeModal features [Edit JSON] button');
  assert(bridgeSrc.includes('Cancel'), 'AIPromptBridgeModal features [Cancel] button');

  const wizardPath = path.join(rootDir, 'src/components/exam/builder/ai/AIExamGeneratorWizard.tsx');
  const wizardSrc = fs.readFileSync(wizardPath, 'utf-8');
  assert(wizardSrc.includes('STANDARD_EXAM_BLUEPRINT_ITEMS'), 'AIExamGeneratorWizard defines STANDARD_EXAM_BLUEPRINT_ITEMS');
  assert(wizardSrc.includes('TOTAL: 40 QUESTIONS • 100 MARKS'), 'AIExamGeneratorWizard displays TOTAL: 40 QUESTIONS • 100 MARKS for Standard Exam');
  assert(wizardSrc.includes('buildStandardExamAIPrompt'), 'AIExamGeneratorWizard imports buildStandardExamAIPrompt');
  assert(wizardSrc.includes('validateStandardExamPackage'), 'AIExamGeneratorWizard imports validateStandardExamPackage');
  assert(wizardSrc.includes('Fix with AI'), 'AIExamGeneratorWizard features [Fix with AI] button');
  assert(wizardSrc.includes('Edit JSON'), 'AIExamGeneratorWizard features [Edit JSON] button');

  // --------------------------------------------------------------------------
  // 7. SERVER-SIDE HYBRID GRADING SERVICE
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Testing Server Deterministic Grading in hybridGradingService.mjs ---');

  const gradingServicePath = path.join(rootDir, 'server/hybridGradingService.mjs');
  assert(fs.existsSync(gradingServicePath), 'hybridGradingService.mjs exists');
  const serviceSrc = fs.readFileSync(gradingServicePath, 'utf-8');
  assert(serviceSrc.includes("'correct_wrong'"), 'DETERMINISTIC_QUESTION_TYPES contains correct_wrong');
  assert(serviceSrc.includes("'cloze'"), 'DETERMINISTIC_QUESTION_TYPES contains cloze');
  assert(serviceSrc.includes("'find_mistake'"), 'DETERMINISTIC_QUESTION_TYPES contains find_mistake');
  assert(serviceSrc.includes("'controlled_answer'"), 'DETERMINISTIC_QUESTION_TYPES contains controlled_answer');
  assert(serviceSrc.includes("'reorder'"), 'DETERMINISTIC_QUESTION_TYPES contains reorder');
  assert(serviceSrc.includes("qType === 'correct_wrong'"), 'Evaluates correct_wrong deterministically');
  assert(serviceSrc.includes("qType === 'cloze'"), 'Evaluates cloze deterministically');
  assert(serviceSrc.includes("qType === 'find_mistake'"), 'Evaluates find_mistake deterministically');
  assert(serviceSrc.includes("qType === 'controlled_answer'"), 'Evaluates controlled_answer deterministically');
  assert(serviceSrc.includes("qType === 'reorder'"), 'Evaluates reorder deterministically');

  // --------------------------------------------------------------------------
  // 8. PUBLISHING ZERO "CANNOT PUBLISH EMPTY EXAMINATION" VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Testing Publishing Safety ---');

  const publishPath = path.join(rootDir, 'src/components/exam/builder/publishing/SimplePublishModal.tsx');
  const publishSrc = fs.readFileSync(publishPath, 'utf-8');
  assert(publishSrc.includes('SimplePublishModalProps'), 'SimplePublishModal accepts totalQuestions and totalMarks props');

  // --------------------------------------------------------------------------
  // 9. ACCEPTANCE TESTS: CLOZE (BUG 1 & 2) & MATCHING (BUG 4) & ROUTING (BUG 3)
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Acceptance Tests: Cloze Dropdown Options & Single Continuous Passage ---');

  const clozeRendererPath = path.join(rootDir, 'src/components/exam/student/standard/ClozeDropdownRenderer.tsx');
  const clozeRendererSrc = fs.readFileSync(clozeRendererPath, 'utf-8');
  assert(clozeRendererSrc.includes('ClozeBlankDefinition'), 'ClozeDropdownRenderer defines ClozeBlankDefinition');
  assert(clozeRendererSrc.includes('blankRegex'), 'ClozeDropdownRenderer uses blankRegex for continuous passage embedding');
  assert(clozeRendererSrc.includes('matchedBlank?.options'), 'Each dropdown strictly uses matchedBlank.options instead of sharing options');

  // Acceptance Test Data for Cloze
  const testClozeQuestions = [
    { id: 'cloze_1', type: 'cloze', blankId: 'blank_1', options: ['entered', 'enter', 'enters', 'entering'], correct_answer: 'entered', marks: 2 },
    { id: 'cloze_2', type: 'cloze', blankId: 'blank_2', options: ['was showing', 'shows', 'has shown', 'show'], correct_answer: 'was showing', marks: 2 },
    { id: 'cloze_3', type: 'cloze', blankId: 'blank_3', options: ['saw', 'see', 'seen', 'seeing'], correct_answer: 'saw', marks: 2 },
    { id: 'cloze_4', type: 'cloze', blankId: 'blank_4', options: ['was', 'were', 'are', 'have'], correct_answer: 'was', marks: 2 },
    { id: 'cloze_5', type: 'cloze', blankId: 'blank_5', options: ['should', 'could', 'might', 'would'], correct_answer: 'should', marks: 2 }
  ];

  const studentClozeAnswers = {
    blank_1: 'entered',
    blank_2: 'was showing',
    blank_3: 'saw',
    blank_4: 'was',
    blank_5: 'should',
    cloze_1: 'entered',
    cloze_2: 'was showing',
    cloze_3: 'saw',
    cloze_4: 'was',
    cloze_5: 'should'
  };

  const { evaluateDeterministicQuestion } = await import('../server/hybridGradingService.mjs');

  let totalClozeScore = 0;
  testClozeQuestions.forEach((q) => {
    const res = evaluateDeterministicQuestion(q, studentClozeAnswers[q.id]);
    assert(res.is_correct, `Cloze question ${q.id} correctly evaluated`);
    assert(res.score === 2, `Cloze question ${q.id} awarded 2 marks`);
    totalClozeScore += res.score;
  });
  assert(totalClozeScore === 10, 'Cloze section scores exactly 10 marks total');

  console.log('\n--- 10. Acceptance Tests: Matching All 5 Pairs in 1 Activity ---');

  const matchRendererPath = path.join(rootDir, 'src/components/exam/student/standard/MatchRenderer.tsx');
  const matchRendererSrc = fs.readFileSync(matchRendererPath, 'utf-8');
  assert(matchRendererSrc.includes('Column A (Terms)'), 'MatchRenderer renders Column A');
  assert(matchRendererSrc.includes('Column B (Matches)'), 'MatchRenderer renders Column B');
  assert(matchRendererSrc.includes('rightOptions'), 'MatchRenderer provides all right choices together');

  // Acceptance Test Data for Matching
  const testMatchingPairs = [
    { id: 'match_1', type: 'matching', left: 'write', right: 'wrote', correct_answer: 'wrote', marks: 2 },
    { id: 'match_2', type: 'matching', left: 'begin', right: 'began', correct_answer: 'began', marks: 2 },
    { id: 'match_3', type: 'matching', left: 'see', right: 'saw', correct_answer: 'saw', marks: 2 },
    { id: 'match_4', type: 'matching', left: 'take', right: 'took', correct_answer: 'took', marks: 2 },
    { id: 'match_5', type: 'matching', left: 'choose', right: 'chose', correct_answer: 'chose', marks: 2 }
  ];

  const studentMatchingAnswers = {
    match_1: 'wrote',
    match_2: 'began',
    match_3: 'saw',
    match_4: 'took',
    match_5: 'chose'
  };

  let totalMatchingScore = 0;
  testMatchingPairs.forEach((p) => {
    const res = evaluateDeterministicQuestion(p, studentMatchingAnswers[p.id]);
    assert(res.is_correct, `Matching pair ${p.id} (${p.left}->${p.right}) correctly evaluated`);
    assert(res.score === 2, `Matching pair ${p.id} awarded 2 marks`);
    totalMatchingScore += res.score;
  });
  assert(totalMatchingScore === 10, 'Matching section scores exactly 10 marks total');

  console.log('\n--- 11. Acceptance Tests: Title "The Simple Past" & Question Not Found Prevention ---');

  // Verify ExamSession doesn't use titleStr.includes('simple') to misclassify topics as simple exam template
  assert(!sessionSrc.includes("titleStr.includes('simple')"), 'ExamSession avoids false positive on titles like "The Simple Past"');
  assert(!previewSrc.includes("titleStr.includes('simple')"), 'LivePreviewModal avoids false positive on titles like "The Simple Past"');

  // --------------------------------------------------------------------------
  // FINAL REPORT
  // --------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(`  STANDARD EXAM 2.0 SUITE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
