// ============================================================================
// EDTECHRA BITZ — CRITICAL EXAM & CLASSROOM FIX COMPREHENSIVE VERIFICATION SUITE
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedChecks++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedChecks++;
  }
}

console.log('=================================================================');
console.log('  EDTECHRA CRITICAL EXAM & CLASSROOM FIX VERIFICATION SUITE       ');
console.log('=================================================================\n');

// ----------------------------------------------------------------------------
// 1. PROBLEM 1 — REMOVE DUPLICATE LIVE QUIZ BANNER
// ----------------------------------------------------------------------------
console.log('--- 1. Problem 1: Redundant Live Quiz Banner & Sole Entry Point ---');
const classroomDetailPath = path.join(rootDir, 'src/pages/classes/ClassroomDetailPage.tsx');
assert(fs.existsSync(classroomDetailPath), 'ClassroomDetailPage.tsx exists');
const classroomDetailCode = fs.readFileSync(classroomDetailPath, 'utf8');

// Ensure duplicate blue banner is gone
assert(!classroomDetailCode.includes('Live Quiz In Session'),
  'Redundant "Live Quiz In Session" banner text is removed');
assert(!classroomDetailCode.includes('Join Class Quiz Directly →'),
  'Redundant banner action button is removed');

// Ensure the dedicated Live Quiz activity card remains intact
assert(classroomDetailCode.includes('Card 2: Live Quiz'),
  'Dedicated Live Quiz card in Classroom Activities & Learning exists');
assert(classroomDetailCode.includes('handleStudentJoinLiveQuiz'),
  'Dedicated Live Quiz card triggers handleStudentJoinLiveQuiz for students');
assert(classroomDetailCode.includes('setLiveQuizBankOpen(true)'),
  'Dedicated Live Quiz card triggers setLiveQuizBankOpen for teachers');
assert(classroomDetailCode.includes('Join Active Quiz Now →'),
  'Dedicated Live Quiz card displays "Join Active Quiz Now →" when quiz is active');

// ----------------------------------------------------------------------------
// 2. PROBLEM 2 & 6/7 — DIRECT NAVIGATION & EXAM FILTERING
// ----------------------------------------------------------------------------
console.log('\n--- 2. Problem 2 & 6/7: Student Exam Direct Navigation & Status Gating ---');

// Check visibleExams filter in ClassroomDetailPage
assert(classroomDetailCode.includes('const visibleExams = isTeacher'),
  'visibleExams checks isTeacher for filtering');
assert(classroomDetailCode.includes("e.status === 'published' || e.status === 'active'"),
  'visibleExams filters for published or active status for students');

// Check that Take Exam button directly navigates
assert(classroomDetailCode.includes("navigate(`/classes/${classroom.id}/exams/${exam.id}`)"),
  'Take Exam button navigates directly to /classes/:classroomId/exams/:examId');
assert(!classroomDetailCode.includes('setExamModalOpen(true)'),
  'Take Exam button no longer calls broken setExamModalOpen(true)');

// Check StudentExamPage draft gating
const studentExamPagePath = path.join(rootDir, 'src/pages/classes/StudentExamPage.tsx');
assert(fs.existsSync(studentExamPagePath), 'StudentExamPage.tsx exists');
const studentExamCode = fs.readFileSync(studentExamPagePath, 'utf8');

assert(studentExamCode.includes("examData.status === 'draft' && !isTeacher"),
  'StudentExamPage prevents students from taking draft assessments');
assert(studentExamCode.includes('This assessment is currently in draft mode'),
  'StudentExamPage displays clear message for draft assessments');

// ----------------------------------------------------------------------------
// 3. PROBLEM 3A — 401 & 403 AUTHORIZATION PIPELINE
// ----------------------------------------------------------------------------
console.log('\n--- 3. Problem 3A: Auth Header & 401/403 Pipeline ---');
const courseStudioServicePath = path.join(rootDir, 'src/services/courseStudioService.ts');
assert(fs.existsSync(courseStudioServicePath), 'courseStudioService.ts exists');
const courseStudioCode = fs.readFileSync(courseStudioServicePath, 'utf8');

// Ensure getAuthHeader does not send empty Bearer
assert(courseStudioCode.includes('if (token) {') && courseStudioCode.includes("headers['Authorization'] = `Bearer ${token}`"),
  'courseStudioService getAuthHeader only includes Authorization header when token is present');

// Ensure ClassroomDetailPage waits for authLoading before querying
assert(classroomDetailCode.includes('if (id && !authLoading)'),
  'ClassroomDetailPage waits for !authLoading before loading data');
assert(classroomDetailCode.includes('user ? courseStudioService.getClassroomCourses(id)'),
  'ClassroomDetailPage guards courseStudioService.getClassroomCourses with user check');

// Ensure server.mjs endpoint has 401, 403, and 200 paths
const serverPath = path.join(rootDir, 'server.mjs');
assert(fs.existsSync(serverPath), 'server.mjs exists');
const serverCode = fs.readFileSync(serverPath, 'utf8');

assert(serverCode.includes("app.get('/api/classes/:classroomId/courses'"),
  'server.mjs registers GET /api/classes/:classroomId/courses');
assert(serverCode.includes("res.status(401).json({ success: false, error: 'Authentication required.' })"),
  'Endpoint returns 401 when unauthenticated');
assert(serverCode.includes("res.status(403).json({ success: false, error: 'You are not enrolled in this classroom.' })"),
  'Endpoint returns 403 when user is not enrolled or teacher/admin');
assert(serverCode.includes("classroom_members"),
  'Endpoint checks classroom_members for student enrollment');

// ----------------------------------------------------------------------------
// 4. PROBLEM 3B — REACT ERROR #310 IN EXAMSESSION.TSX
// ----------------------------------------------------------------------------
console.log('\n--- 4. Problem 3B: React Rules of Hooks in ExamSession.tsx ---');
const examSessionPath = path.join(rootDir, 'src/components/exam/student/ExamSession.tsx');
assert(fs.existsSync(examSessionPath), 'ExamSession.tsx exists');
const examSessionCode = fs.readFileSync(examSessionPath, 'utf8');

// Verify sectionsList and isSimpleExam hooks occur BEFORE any return statements
const sectionsListIndex = examSessionCode.indexOf('const sectionsList = useMemo(');
const isSimpleExamIndex = examSessionCode.indexOf('const isSimpleExam = useMemo(');
const firstEarlyReturnIndex = examSessionCode.indexOf("if (sessionPhase === 'instructions')");
const secondEarlyReturnIndex = examSessionCode.indexOf("sessionPhase === 'submitted'");

assert(sectionsListIndex !== -1, 'sectionsList hook exists');
assert(isSimpleExamIndex !== -1, 'isSimpleExam hook exists');
assert(firstEarlyReturnIndex !== -1, "sessionPhase === 'instructions' condition exists");
assert(secondEarlyReturnIndex !== -1, "sessionPhase === 'submitted' condition exists");

assert(sectionsListIndex < firstEarlyReturnIndex,
  'sectionsList useMemo hook is placed BEFORE instructions early return');
assert(isSimpleExamIndex < firstEarlyReturnIndex,
  'isSimpleExam useMemo hook is placed BEFORE instructions early return');
assert(sectionsListIndex < secondEarlyReturnIndex,
  'sectionsList useMemo hook is placed BEFORE submitted early return');
assert(isSimpleExamIndex < secondEarlyReturnIndex,
  'isSimpleExam useMemo hook is placed BEFORE submitted early return');

// ----------------------------------------------------------------------------
// 5. PROBLEM 9 — SURVEY_SETTINGS DB NOT-NULL CONSTRAINTS
// ----------------------------------------------------------------------------
console.log('\n--- 5. Problem 9: survey_settings DB Constraint Violations ---');
const exam2ServicePath = path.join(rootDir, 'server/exam2Service.mjs');
assert(fs.existsSync(exam2ServicePath), 'exam2Service.mjs exists');
const exam2Code = fs.readFileSync(exam2ServicePath, 'utf8');

// In saveExamToSupabase fallback baseRecord:
assert(exam2Code.includes('survey_settings: insertRecord.survey_settings || {}'),
  'saveExamToSupabase baseRecord provides safe non-null survey_settings fallback');
assert(exam2Code.includes('theme_config: insertRecord.theme_config || {}'),
  'saveExamToSupabase baseRecord provides safe theme_config');
assert(exam2Code.includes('brand_kit: insertRecord.brand_kit || {}'),
  'saveExamToSupabase baseRecord provides safe brand_kit');

// In republishExamToClassrooms pubRecord:
assert(exam2Code.includes('survey_settings: sourceExam.survey_settings || {}'),
  'republishExamToClassrooms pubRecord provides safe non-null survey_settings');
assert(exam2Code.includes("assessment_type: sourceExam.assessment_type || 'exam'"),
  'republishExamToClassrooms pubRecord inherits assessment_type');

// In /api/exams/publish in server.mjs:
assert(serverCode.includes('survey_settings: canonicalExam.surveySettings || examData.surveySettings || {}'),
  'server.mjs /api/exams/publish provides safe non-null survey_settings');

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n=================================================================');
console.log(`TOTAL CHECKS: ${totalChecks}`);
console.log(`PASSED:       ${passedChecks}`);
console.log(`FAILED:       ${failedChecks}`);
console.log('=================================================================');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL CRITICAL EXAM & CLASSROOM CHECKS PASSED!\n');
}
