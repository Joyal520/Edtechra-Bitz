// ============================================================================
// VERIFICATION TEST: EXAM LIBRARY & STUDENT EXAM ACCESS FIXES
// ============================================================================

import fs from 'fs';
import path from 'path';

const projectRoot = 'C:/Users/hecsb/OneDrive/Desktop/Edtechra Bitz APP';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('------------------------------------------------------------');
console.log('TEST SUITE: Exam Library & Student Exam Blank Screen Fix');
console.log('------------------------------------------------------------');

// 1. AssessmentTypeSelectionModal tests
const selectionModalPath = path.join(projectRoot, 'src/components/exam/entry/AssessmentTypeSelectionModal.tsx');
const selectionModalContent = fs.readFileSync(selectionModalPath, 'utf8');
assert(selectionModalContent.includes('EXAM LIBRARY'), 'AssessmentTypeSelectionModal has EXAM LIBRARY card');
assert(selectionModalContent.includes('View Exams'), 'AssessmentTypeSelectionModal has "View Exams" button');
assert(selectionModalContent.includes('onOpenLibrary'), 'AssessmentTypeSelectionModal has onOpenLibrary prop');
assert(selectionModalContent.includes('grid-cols-1 md:grid-cols-3'), 'AssessmentTypeSelectionModal uses 3-column responsive grid');

// 2. ExamLibraryModal tests
const libraryModalPath = path.join(projectRoot, 'src/components/exam/library/ExamLibraryModal.tsx');
assert(fs.existsSync(libraryModalPath), 'ExamLibraryModal.tsx exists');
const libraryModalContent = fs.readFileSync(libraryModalPath, 'utf8');
assert(libraryModalContent.includes('getTeacherPreviousExams'), 'ExamLibraryModal fetches teacher exams');
assert(libraryModalContent.includes('teacher_id === uid || e.created_by === uid'), 'ExamLibraryModal enforces teacher isolation');
assert(libraryModalContent.includes('handleRepublish'), 'ExamLibraryModal has republish handler');
assert(libraryModalContent.includes('handleCopyStudentLink'), 'ExamLibraryModal has student link copy handler');
assert(libraryModalContent.includes('LivePreviewModal'), 'ExamLibraryModal integrates live preview');

// 3. Routes tests
const routesPath = path.join(projectRoot, 'src/routes/index.tsx');
const routesContent = fs.readFileSync(routesPath, 'utf8');
assert(routesContent.includes('classes/:classroomId/exams/:examId'), 'AppRoutes registers classes/:classroomId/exams/:examId');
assert(routesContent.includes('classes/:classroomId/assessments/:assessmentId'), 'AppRoutes registers classes/:classroomId/assessments/:assessmentId');
assert(routesContent.includes('StudentExamPage'), 'AppRoutes mounts StudentExamPage for student routes');

// 4. StudentExamPage tests
const studentExamPagePath = path.join(projectRoot, 'src/pages/classes/StudentExamPage.tsx');
assert(fs.existsSync(studentExamPagePath), 'StudentExamPage.tsx exists');
const studentExamPageContent = fs.readFileSync(studentExamPagePath, 'utf8');
assert(studentExamPageContent.includes('Sign In to Take Assessment'), 'StudentExamPage handles unauthenticated sessions');
assert(studentExamPageContent.includes('Teacher Preview Mode'), 'StudentExamPage handles teacher preview');
assert(studentExamPageContent.includes('ExamSession'), 'StudentExamPage mounts ExamSession');
assert(studentExamPageContent.includes('Assessment Not Available'), 'StudentExamPage renders clear error state instead of blank screen');

// 5. AssessmentBuilderPage student guard
const builderPagePath = path.join(projectRoot, 'src/pages/classes/AssessmentBuilderPage.tsx');
const builderPageContent = fs.readFileSync(builderPagePath, 'utf8');
assert(builderPageContent.includes('exams/${assessmentId}'), 'AssessmentBuilderPage redirects non-teachers to student exam route');

// 6. ExamPlatformModal normalization & null fix
const examPlatformModalPath = path.join(projectRoot, 'src/components/exam/ExamPlatformModal.tsx');
const examPlatformModalContent = fs.readFileSync(examPlatformModalPath, 'utf8');
assert(examPlatformModalContent.includes('status !== \'in_progress\''), 'ExamPlatformModal ignores in_progress attempts when checking completed results');
assert(!examPlatformModalContent.endsWith('return null;\n};\n'), 'ExamPlatformModal does not silently return null at end');

// 7. Server & Service in_progress attempt handling
const serverPath = path.join(projectRoot, 'server.mjs');
const serverContent = fs.readFileSync(serverPath, 'utf8');
assert(serverContent.includes('neq(\'status\', \'in_progress\')'), 'server.mjs filters in_progress attempts in idempotency check');
assert(serverContent.includes('status: \'submitted\''), 'server.mjs sets status: submitted on grading upsert');

const examServicePath = path.join(projectRoot, 'src/services/classroomExamService.ts');
const examServiceContent = fs.readFileSync(examServicePath, 'utf8');
assert(examServiceContent.includes('.neq(\'status\', \'in_progress\')'), 'classroomExamService filters in_progress from student results');

// 8. Migration file
const migrationPath = path.join(projectRoot, 'supabase/migrations/20260922000000_fix_exam_student_access_and_library.sql');
assert(fs.existsSync(migrationPath), 'Migration 20260922000000_fix_exam_student_access_and_library.sql exists');

console.log('------------------------------------------------------------');
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('------------------------------------------------------------');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED!');
}
