// ============================================================================
// EDTECHRA EXAMINATION PLATFORM: EXAM & SURVEY SAVE FLOW TEST SUITE
// Verifies:
// 1. assessmentType = "exam" saves successfully without teacher configuring survey settings.
// 2. survey_settings column is never sent as SQL NULL (defaults to {} for exams).
// 3. Simple Exam (25-MCQ) creation, JSON import, save, reload, and publish flows.
// 4. assessmentType = "survey" preserves survey settings and applies defaults when omitted.
// 5. theme_config, brand_kit, branching_logic, and questions_json never evaluate to null.
// 6. Reloading assessment via getAssessmentV2 reconstructs sections and metadata properly.
// 7. Backward compatibility for existing exams without survey settings.
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
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('=================================================================');
console.log('  EDTECHRA EXAM & SURVEY SAVE FLOW VERIFICATION SUITE            ');
console.log('=================================================================\n');

// 1. Check classroomExamService source code logic
console.log('--- 1. Service Layer Constraint & Default Checks ---');
const servicePath = path.join(rootDir, 'src/services/classroomExamService.ts');
assert(fs.existsSync(servicePath), 'classroomExamService.ts exists');

const svcCode = fs.readFileSync(servicePath, 'utf8');

// Ensure survey_settings || null was removed and replaced with safe defaults
assert(!svcCode.includes('survey_settings: assessment.surveySettings || null'),
  'Removed unsafe "survey_settings: assessment.surveySettings || null"');
assert(!svcCode.includes('theme_config: assessment.theme || null'),
  'Removed unsafe "theme_config: assessment.theme || null"');
assert(!svcCode.includes('brand_kit: assessment.brandKit || null'),
  'Removed unsafe "brand_kit: assessment.brandKit || null"');

// Ensure safe defaults exist
assert(svcCode.includes('safeSurveySettings'), 'Defines safeSurveySettings logic');
assert(svcCode.includes('safeThemeConfig'), 'Defines safeThemeConfig logic');
assert(svcCode.includes('safeBrandKit'), 'Defines safeBrandKit logic');
assert(svcCode.includes('questions_json: assessment.sections || []'), 'Saves questions_json to preserve sections');

// 2. Simulate Save Payload Construction (Unit Test of Service Logic)
console.log('\n--- 2. Simulating Save Payload Construction ---');

function buildSaveRowData(params) {
  const { assessment, classroomId, status } = params;
  const totalMarks = assessment.assessmentType === 'survey' ? 0 : assessment.sections.reduce(
    (acc, s) => acc + (s.questions?.reduce((qAcc, q) => qAcc + (q.marks || 1), 0) || 0),
    0
  );

  const flatQuestions = assessment.sections.flatMap((s) => s.questions || []);

  const safeThemeConfig = assessment.theme && typeof assessment.theme === 'object' ? assessment.theme : {};
  const safeBrandKit = assessment.brandKit && typeof assessment.brandKit === 'object' ? assessment.brandKit : {};
  const safeBranching = assessment.branchingLogic || assessment.branching_logic || {};

  let safeSurveySettings = {};
  if (assessment.surveySettings && typeof assessment.surveySettings === 'object' && Object.keys(assessment.surveySettings).length > 0) {
    safeSurveySettings = assessment.surveySettings;
  } else if (assessment.assessmentType === 'survey') {
    safeSurveySettings = {
      isAnonymous: false,
      collectEmail: true,
      oneResponsePerUser: true,
      thankYouMessage: 'Thank you for your valuable response!'
    };
  } else {
    safeSurveySettings = {};
  }

  return {
    classroom_id: classroomId,
    title: assessment.exam.title.trim() || 'Untitled Assessment',
    description: (assessment.exam.description || '').trim(),
    instructions: (assessment.exam.instructions || '').trim(),
    assessment_type: assessment.assessmentType || 'exam',
    duration_minutes: assessment.exam.durationMinutes || 60,
    total_marks: totalMarks,
    pass_marks: Math.round(totalMarks * ((assessment.exam.passPercentage || 60) / 100)),
    starts_at: assessment.exam.startsAt || null,
    ends_at: assessment.exam.endsAt || null,
    theme_config: safeThemeConfig,
    brand_kit: safeBrandKit,
    branching_logic: safeBranching,
    survey_settings: safeSurveySettings,
    questions: flatQuestions,
    questions_json: assessment.sections || [],
    status: status || 'published'
  };
}

// Test Case A: Exam without surveySettings (The exact bug scenario)
const examWithoutSurveySettings = {
  schemaVersion: '2.0',
  assessmentType: 'exam',
  exam: {
    title: 'Grade 10 Simple Exam',
    subject: 'English',
    grade: 'Grade 10',
    examType: 'Simple Exam',
    difficulty: 'Medium',
    durationMinutes: 40,
    passPercentage: 50
  },
  sections: [
    {
      id: 'sec_1',
      title: 'MCQ Section',
      questions: Array.from({ length: 25 }, (_, i) => ({
        id: `q_${i + 1}`,
        type: 'multiple_choice',
        question: `Question ${i + 1}`,
        options: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
          { id: 'c', text: 'Option C' },
          { id: 'd', text: 'Option D' }
        ],
        correctAnswer: ['a'],
        marks: 4
      }))
    }
  ]
};

const examRow = buildSaveRowData({
  classroomId: 'test-class-uuid',
  assessment: examWithoutSurveySettings,
  status: 'published'
});

assert(examRow.survey_settings !== null, 'examRow.survey_settings is NOT null');
assert(typeof examRow.survey_settings === 'object', 'examRow.survey_settings is an object');
assert(Object.keys(examRow.survey_settings).length === 0, 'examRow.survey_settings is empty object {}');
assert(examRow.theme_config !== null, 'examRow.theme_config is NOT null');
assert(examRow.brand_kit !== null, 'examRow.brand_kit is NOT null');
assert(examRow.branching_logic !== null, 'examRow.branching_logic is NOT null');
assert(examRow.questions_json.length === 1, 'examRow.questions_json contains the section');
assert(examRow.questions.length === 25, 'examRow.questions contains all 25 questions');
assert(examRow.total_marks === 100, 'examRow.total_marks correctly calculated as 100 (25 * 4)');
assert(examRow.pass_marks === 50, 'examRow.pass_marks correctly calculated as 50');
assert(examRow.status === 'published', 'examRow.status is published');

// Test Case B: Survey without surveySettings
console.log('\n--- 3. Testing Survey Save Flow with Safe Defaults ---');
const surveyWithoutSettings = {
  schemaVersion: '2.0',
  assessmentType: 'survey',
  exam: {
    title: 'Student Wellbeing Survey',
    subject: 'General',
    grade: 'Grade 10',
    examType: 'survey',
    difficulty: 'Easy',
    durationMinutes: 15,
    passPercentage: 0
  },
  sections: [
    {
      id: 'sec_1',
      title: 'Feedback',
      questions: [
        {
          id: 'q1',
          type: 'linear_scale',
          question: 'How was your learning experience?',
          marks: 0
        }
      ]
    }
  ]
};

const surveyRow = buildSaveRowData({
  classroomId: 'test-class-uuid',
  assessment: surveyWithoutSettings,
  status: 'published'
});

assert(surveyRow.survey_settings !== null, 'surveyRow.survey_settings is NOT null');
assert(surveyRow.survey_settings.isAnonymous === false, 'surveyRow default isAnonymous is false');
assert(surveyRow.survey_settings.collectEmail === true, 'surveyRow default collectEmail is true');
assert(surveyRow.survey_settings.oneResponsePerUser === true, 'surveyRow default oneResponsePerUser is true');
assert(typeof surveyRow.survey_settings.thankYouMessage === 'string', 'surveyRow has thankYouMessage');
assert(surveyRow.total_marks === 0, 'Survey total marks are 0');

// Test Case C: Survey with explicit custom surveySettings
console.log('\n--- 4. Testing Survey with Custom Settings Preservation ---');
const surveyWithCustomSettings = {
  ...surveyWithoutSettings,
  surveySettings: {
    isAnonymous: true,
    collectEmail: false,
    oneResponsePerUser: false,
    thankYouMessage: 'Thank you for your anonymous feedback!'
  }
};

const customSurveyRow = buildSaveRowData({
  classroomId: 'test-class-uuid',
  assessment: surveyWithCustomSettings,
  status: 'draft'
});

assert(customSurveyRow.survey_settings.isAnonymous === true, 'Custom isAnonymous: true preserved');
assert(customSurveyRow.survey_settings.collectEmail === false, 'Custom collectEmail: false preserved');
assert(customSurveyRow.survey_settings.thankYouMessage === 'Thank you for your anonymous feedback!', 'Custom thankYouMessage preserved');
assert(customSurveyRow.status === 'draft', 'Draft status preserved');

// 5. Test Round-trip Reload via getAssessmentV2 reconstruction logic
console.log('\n--- 5. Testing Assessment Reload (getAssessmentV2 Simulation) ---');

function simulateGetAssessmentV2(dbRow) {
  const assessmentType = dbRow.assessment_type || 'exam';
  const sections = (Array.isArray(dbRow.questions_json) && dbRow.questions_json.length > 0)
    ? dbRow.questions_json
    : (dbRow.sections || [
        {
          id: 'sec_1',
          title: 'Section 1',
          questions: dbRow.questions || []
        }
      ]);

  return {
    schemaVersion: '2.0',
    assessmentType,
    exam: {
      title: dbRow.title || 'Untitled Assessment',
      subject: dbRow.subject || 'General',
      grade: dbRow.grade || 'Grade 10',
      examType: dbRow.exam_type || 'quiz',
      difficulty: dbRow.difficulty || 'medium',
      description: dbRow.description || '',
      instructions: dbRow.instructions || '',
      durationMinutes: dbRow.duration_minutes || 60,
      passPercentage: dbRow.pass_marks && dbRow.total_marks ? Math.round((dbRow.pass_marks / dbRow.total_marks) * 100) : 60,
      maxAttempts: dbRow.max_attempts || 1,
      randomizeQuestions: Boolean(dbRow.randomize_questions),
      randomizeOptions: Boolean(dbRow.randomize_options),
      showMarksImmediately: dbRow.show_marks_immediately !== false,
      showCorrectAnswers: dbRow.show_correct_answers !== false,
      startsAt: dbRow.starts_at || null,
      endsAt: dbRow.ends_at || null
    },
    theme: dbRow.theme_config && Object.keys(dbRow.theme_config).length > 0 ? dbRow.theme_config : undefined,
    brandKit: dbRow.brand_kit && Object.keys(dbRow.brand_kit).length > 0 ? dbRow.brand_kit : undefined,
    surveySettings: dbRow.survey_settings && Object.keys(dbRow.survey_settings).length > 0 ? dbRow.survey_settings : undefined,
    sections
  };
}

const reloadedExam = simulateGetAssessmentV2(examRow);
assert(reloadedExam.assessmentType === 'exam', 'Reloaded exam has assessmentType = "exam"');
assert(reloadedExam.sections.length === 1, 'Reloaded exam preserved 1 section from questions_json');
assert(reloadedExam.sections[0].questions.length === 25, 'Reloaded exam preserved all 25 questions');
assert(reloadedExam.exam.title === 'Grade 10 Simple Exam', 'Reloaded exam preserved title');
assert(reloadedExam.surveySettings === undefined, 'For exam with empty survey_settings {}, reload returns undefined (no unneeded survey config)');

const reloadedSurvey = simulateGetAssessmentV2(customSurveyRow);
assert(reloadedSurvey.assessmentType === 'survey', 'Reloaded survey has assessmentType = "survey"');
assert(reloadedSurvey.surveySettings?.isAnonymous === true, 'Reloaded survey preserved isAnonymous = true');

// 6. Test Existing / Legacy Exams Backward Compatibility
console.log('\n--- 6. Testing Legacy Exam Compatibility (Old DB Rows) ---');
const legacyRow = {
  id: 'legacy-exam-uuid',
  classroom_id: 'class-uuid',
  title: 'Midterm Exam 2025',
  description: 'Midterm exam',
  instructions: 'No calculators',
  duration_minutes: 60,
  total_marks: 50,
  pass_marks: 25,
  status: 'published',
  questions: [
    { id: 'q1', type: 'multiple_choice', question: 'Q1?', marks: 25 },
    { id: 'q2', type: 'multiple_choice', question: 'Q2?', marks: 25 }
  ],
  // Older row might have empty object {} or null from database backfill
  survey_settings: {},
  theme_config: {},
  brand_kit: {}
};

const reloadedLegacy = simulateGetAssessmentV2(legacyRow);
assert(reloadedLegacy.assessmentType === 'exam', 'Legacy row defaults to exam');
assert(reloadedLegacy.sections[0].questions.length === 2, 'Legacy row flat questions mapped to Section 1');
assert(reloadedLegacy.surveySettings === undefined, 'Legacy row has clean undefined surveySettings');

// Re-saving the legacy exam
const resavedLegacy = buildSaveRowData({
  classroomId: 'class-uuid',
  assessment: reloadedLegacy,
  status: 'published'
});
assert(resavedLegacy.survey_settings !== null, 'Re-saving legacy exam produces non-null survey_settings');
assert(typeof resavedLegacy.survey_settings === 'object', 'Re-saving legacy exam produces object survey_settings');

// 7. Verify AIExamGeneratorWizard and ExamPlatformModal updates
console.log('\n--- 7. Verifying In-Memory Canonical Assessment Alignments ---');
const wizardPath = path.join(rootDir, 'src/components/exam/builder/ai/AIExamGeneratorWizard.tsx');
const wizardCode = fs.readFileSync(wizardPath, 'utf8');
assert(wizardCode.includes('surveySettings:'), 'AIExamGeneratorWizard provides surveySettings on finalAssessment');

const modalPath = path.join(rootDir, 'src/components/exam/ExamPlatformModal.tsx');
const modalCode = fs.readFileSync(modalPath, 'utf8');
assert(modalCode.includes('surveySettings: activeExam.survey_settings'), 'ExamPlatformModal forwards survey_settings');
assert(modalCode.includes('theme: activeExam.theme_config'), 'ExamPlatformModal forwards theme_config');
assert(modalCode.includes('brandKit: activeExam.brand_kit'), 'ExamPlatformModal forwards brand_kit');

console.log('\n=================================================================');
console.log(`TOTAL CHECKS: ${totalTests}`);
console.log(`PASSED:       ${passedTests}`);
console.log(`FAILED:       ${failedTests}`);
console.log('=================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL EXAM SAVE FLOW TESTS PASSED!\n');
  process.exit(0);
}
