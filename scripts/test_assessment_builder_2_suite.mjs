// ============================================================================
// EDTECHRA ASSESSMENT & SURVEY BUILDER 2.0: VERIFICATION SUITE
// Automated test script validating schemas, components, routes, and backend APIs
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('  EDTECHRA ASSESSMENT BUILDER 2.0 AUTOMATED VERIFICATION SUITE  ');
console.log('================================================================\n');

// 1. Database Migration File Verification
console.log('1. Verifying Database Migration...');
const migrationPath = path.join(rootDir, 'supabase/migrations/20260921000000_exam_survey_builder_2.sql');
assert(fs.existsSync(migrationPath), 'Migration file exists: 20260921000000_exam_survey_builder_2.sql');

if (fs.existsSync(migrationPath)) {
  const migSql = fs.readFileSync(migrationPath, 'utf8');
  assert(migSql.includes('assessment_type'), 'Migration adds assessment_type column to classroom_exams');
  assert(migSql.includes('theme_config'), 'Migration adds theme_config JSONB column to classroom_exams');
  assert(migSql.includes('brand_kit'), 'Migration adds brand_kit JSONB column to classroom_exams');
  assert(migSql.includes('survey_settings'), 'Migration adds survey_settings JSONB column to classroom_exams');
  assert(migSql.includes('is_survey_response'), 'Migration adds is_survey_response column to classroom_exam_results');
  assert(migSql.includes('assessment_question_bank'), 'Migration creates assessment_question_bank table');
}

// 2. Canonical v2.0 Schema & Question Types
console.log('\n2. Verifying Canonical Schema & Question Types...');
const schemaPath = path.join(rootDir, 'src/components/exam/shared/ExamSchema.ts');
const registryPath = path.join(rootDir, 'src/components/exam/shared/QuestionTypeRegistry.ts');
const themePresetsPath = path.join(rootDir, 'src/components/exam/shared/themePresets.ts');

assert(fs.existsSync(schemaPath), 'ExamSchema.ts exists');
assert(fs.existsSync(registryPath), 'QuestionTypeRegistry.ts exists');
assert(fs.existsSync(themePresetsPath), 'themePresets.ts exists');

if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  assert(schemaContent.includes("AssessmentType = 'exam' | 'survey'"), 'Schema supports dual AssessmentType (exam | survey)');
  assert(schemaContent.includes('BrandKitConfig'), 'BrandKitConfig interface is declared in schema');
  assert(schemaContent.includes('SurveySettings'), 'SurveySettings interface is declared in schema');
  assert(schemaContent.includes('CanonicalAssessmentV2'), 'CanonicalAssessmentV2 interface is declared in schema');
  assert(schemaContent.includes('CanonicalExamV2'), 'CanonicalExamV2 backward compatibility alias is exported');
}

if (fs.existsSync(registryPath)) {
  const regContent = fs.readFileSync(registryPath, 'utf8');
  assert(regContent.includes('multiple_choice'), 'Registry includes multiple_choice');
  assert(regContent.includes('checkboxes'), 'Registry includes checkboxes');
  assert(regContent.includes('dropdown'), 'Registry includes dropdown');
  assert(regContent.includes('short_answer'), 'Registry includes short_answer');
  assert(regContent.includes('paragraph'), 'Registry includes paragraph');
  assert(regContent.includes('linear_scale'), 'Registry includes linear_scale');
  assert(regContent.includes('grid_choice'), 'Registry includes grid_choice');
  assert(regContent.includes('grid_checkbox'), 'Registry includes grid_checkbox');
  assert(regContent.includes('file_upload'), 'Registry includes file_upload');
  assert(regContent.includes('true_false'), 'Registry includes true_false');
  assert(regContent.includes('fill_in_blank'), 'Registry includes fill_in_blank');
  assert(regContent.includes('matching'), 'Registry includes matching');
  assert(regContent.includes('reorder'), 'Registry includes reorder');
  assert(regContent.includes('reading_comprehension'), 'Registry includes reading_comprehension');
  assert(regContent.includes('image_question'), 'Registry includes image_question');
  assert(regContent.includes('coding_question'), 'Registry includes coding_question');
  assert(regContent.includes('sentence_builder'), 'Registry includes sentence_builder');
}

if (fs.existsSync(themePresetsPath)) {
  const themeContent = fs.readFileSync(themePresetsPath, 'utf8');
  assert(themeContent.includes('modern_academy'), 'Theme preset modern_academy exists');
  assert(themeContent.includes('future_tech'), 'Theme preset future_tech exists');
  assert(themeContent.includes('kids_explorer'), 'Theme preset kids_explorer exists');
  assert(themeContent.includes('science_lab'), 'Theme preset science_lab exists');
  assert(themeContent.includes('nature_classroom'), 'Theme preset nature_classroom exists');
}

// 3. UI Components Tree
console.log('\n3. Verifying Assessment Builder Component Tree...');
const components = [
  'src/components/exam/entry/AssessmentTypeSelectionModal.tsx',
  'src/components/exam/builder/AssessmentBuilder.tsx',
  'src/components/exam/builder/TopBar.tsx',
  'src/components/exam/builder/LeftSidebar.tsx',
  'src/components/exam/builder/RightPropertyPanel.tsx',
  'src/components/exam/builder/canvas/AssessmentCanvas.tsx',
  'src/components/exam/builder/canvas/CanvasHeaderCard.tsx',
  'src/components/exam/builder/canvas/CanvasSectionCard.tsx',
  'src/components/exam/builder/canvas/CanvasQuestionCard.tsx',
  'src/components/exam/builder/canvas/AddQuestionInlineButton.tsx',
  'src/components/exam/builder/design/ThemeEditor.tsx',
  'src/components/exam/builder/design/BrandKitEditor.tsx',
  'src/components/exam/builder/design/AutoDesignModal.tsx',
  'src/components/exam/builder/ai/InCanvasAIAssistant.tsx',
  'src/components/exam/builder/ai/AIPromptBridge.tsx',
  'src/components/exam/builder/ai/JSONImportModal.tsx',
  'src/components/exam/builder/question-bank/QuestionBankModal.tsx',
  'src/components/exam/builder/settings/AssessmentSettingsDrawer.tsx',
  'src/components/exam/builder/publishing/PublishValidationModal.tsx',
  'src/components/exam/builder/preview/LivePreviewModal.tsx',
  'src/components/exam/results/SurveyResultsDashboard.tsx',
  'src/pages/classes/AssessmentBuilderPage.tsx'
];

components.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  assert(fs.existsSync(fullPath), `Component exists: ${relPath}`);
});

// 4. Routing Integration
console.log('\n4. Verifying Routing & ClassroomDetailPage Integration...');
const routesPath = path.join(rootDir, 'src/routes/index.tsx');
const classroomDetailPath = path.join(rootDir, 'src/pages/classes/ClassroomDetailPage.tsx');

if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  assert(routesContent.includes('AssessmentBuilderPage'), 'routes/index.tsx imports AssessmentBuilderPage');
  assert(routesContent.includes('classes/:classroomId/assessments/builder'), 'Route registered: /classes/:classroomId/assessments/builder');
  assert(routesContent.includes('classes/:classroomId/assessments/builder/:assessmentId'), 'Route registered: /classes/:classroomId/assessments/builder/:assessmentId');
}

if (fs.existsSync(classroomDetailPath)) {
  const cdContent = fs.readFileSync(classroomDetailPath, 'utf8');
  assert(cdContent.includes('AssessmentTypeSelectionModal'), 'ClassroomDetailPage imports AssessmentTypeSelectionModal');
  assert(cdContent.includes('assessments/builder'), 'ClassroomDetailPage routes to assessment builder');
  assert(cdContent.includes('Assessments & Surveys Studio'), 'ClassroomDetailPage has Assessments & Surveys Studio header');
}

// 5. Backend Server & Service Layer
console.log('\n5. Verifying Backend Server & Service Layer...');
const serverPath = path.join(rootDir, 'server.mjs');
const servicePath = path.join(rootDir, 'src/services/classroomExamService.ts');

if (fs.existsSync(serverPath)) {
  const srvContent = fs.readFileSync(serverPath, 'utf8');
  assert(srvContent.includes('submit-survey-response'), 'server.mjs handles submit-survey-response action');
  assert(srvContent.includes('get-survey-results'), 'server.mjs handles get-survey-results action');
  assert(srvContent.includes('/api/assessments/surveys/submit'), 'server.mjs exposes /api/assessments/surveys/submit');
  assert(srvContent.includes('/api/assessments/surveys/:id/results'), 'server.mjs exposes /api/assessments/surveys/:id/results');
}

if (fs.existsSync(servicePath)) {
  const svcContent = fs.readFileSync(servicePath, 'utf8');
  assert(svcContent.includes('saveAssessmentV2'), 'classroomExamService exports saveAssessmentV2');
  assert(svcContent.includes('getAssessmentV2'), 'classroomExamService exports getAssessmentV2');
}

// Final Summary
console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED:       ${passedTests}`);
console.log(`FAILED:       ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
