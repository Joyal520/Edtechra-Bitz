// ============================================================================
// EXAM 2.0 INTEGRATION TEST SUITE
// Verifies:
// 1. AI Exam generation & schema normalization
// 2. Deterministic & hybrid auto-grading engine
// 3. Statistical score analytics calculation
// 4. Cloudflare R2 direct PDF report upload & presigned download URL
// 5. Supabase lightweight metadata persistence
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  generateExam,
  validateGenerationPayload,
  gradeExamAttempt,
  processScoreAnalysisAndUploadToR2,
  buildFallbackExam,
  normalizeExam
} from '../server/exam2Service.mjs';

import {
  buildExamSourceObjectKey,
  buildExamAttachmentObjectKey,
  buildExamSubmissionObjectKey,
  buildExamReportObjectKey,
  buildPresignedDownloadUrl
} from '../server/r2Service.mjs';

import { getR2Config } from '../server/r2Config.mjs';

console.log('=================================================================');
console.log('  EDTECHRA DIGITAL CLASSROOM: EXAM 2.0 INTEGRATION VERIFICATION  ');
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
  console.log('\n--- 1. Testing R2 Key Hierarchy Builders ---');
  const sourceKey = buildExamSourceObjectKey({ examId: 'exam_demo123', filename: 'biology_notes.pdf' });
  assert(sourceKey.startsWith('exams/exam_demo123/source/') && sourceKey.endsWith('.pdf'), `Source key format: ${sourceKey}`);

  const subKey = buildExamSubmissionObjectKey({ examId: 'exam_demo123', studentId: 'student_456', filename: 'ans.pdf' });
  assert(subKey.startsWith('submissions/exam_demo123/student_456/') && subKey.endsWith('.pdf'), `Submission key format: ${subKey}`);

  const reportKey = buildExamReportObjectKey({ examId: 'exam_demo123', classOrStudentId: 'class_grade8' });
  assert(reportKey.startsWith('reports/exam_demo123/class_grade8_') && reportKey.endsWith('.pdf'), `Report key format: ${reportKey}`);

  console.log('\n--- 2. Testing AI Exam Payload Validation & Fallback Generator ---');
  const testPayload = {
    content: 'Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of sugar.',
    examType: 'Unit Test',
    difficulty: 'Mixed',
    duration: { value: 60, unit: 'Minutes' },
    gradingMode: 'Hybrid Grading',
    requiredTotal: 50,
    sections: [
      {
        type: 'Multiple Choice Questions (MCQ)',
        count: 3,
        marks: 10,
        difficulty: 'Easy',
        instruction: 'Choose the correct answer.'
      },
      {
        type: 'True or False Questions',
        count: 2,
        marks: 10,
        difficulty: 'Easy',
        instruction: 'Mark true or false.'
      }
    ]
  };

  const validationError = validateGenerationPayload(testPayload);
  assert(validationError === '', 'Payload validation passes for balanced sections (3x10 + 2x10 = 50 marks)');

  const generated = await generateExam({
    payload: testPayload,
    openaiApiKey: process.env.OPENAI_API_KEY
  });

  assert(Boolean(generated?.metadata?.examId), `Exam generated with ID: ${generated.metadata?.examId}`);
  assert(generated.metadata?.totalMarks === 50, `Total marks equals 50: got ${generated.metadata?.totalMarks}`);
  assert(generated.sections?.length === 2, `Sections count is 2: got ${generated.sections?.length}`);
  assert(generated.sections[0].questions?.length === 3, `Section 1 has 3 questions`);
  assert(generated.sections[1].questions?.length === 2, `Section 2 has 2 questions`);

  console.log('\n--- 3. Testing Deterministic & Hybrid Grading Engine ---');
  const q1 = generated.sections[0].questions[0];
  const q2 = generated.sections[0].questions[1];
  const q3 = generated.sections[1].questions[0];

  const answers = {
    [q1.questionId]: q1.correctAnswer,
    [q2.questionId]: 'INCORRECT_CHOICE_VALUE',
    [q3.questionId]: q3.correctAnswer
  };

  const grading = gradeExamAttempt(generated, answers);
  const expectedCorrectScore = Number(q1.marks || 10) + Number(q3.marks || 10);
  assert(grading.totalScore >= expectedCorrectScore, `Grading score accurately calculates score: got ${grading.totalScore} / ${grading.maxScore}`);
  assert(grading.percentage > 0, `Grading percentage computed: got ${grading.percentage}%`);
  assert(Boolean(grading.grade), `Assigned letter grade: ${grading.grade}`);
  assert(grading.breakdown?.length === 5, `Breakdown contains all 5 question items`);

  console.log('\n--- 4. Testing Score Analytics & Cloudflare R2 PDF Report Upload ---');
  const mockStudents = [
    { student_id: 'S01', name: 'Nethmi Silva', score: 48, time_taken_minutes: 36, answers: {} },
    { student_id: 'S02', name: 'Ayaan Perera', score: 42, time_taken_minutes: 42, answers: {} },
    { student_id: 'S03', name: 'Sofia Khan', score: 38, time_taken_minutes: 45, answers: {} },
    { student_id: 'S04', name: 'John Doe', score: 25, time_taken_minutes: 50, answers: {} },
    { student_id: 'S05', name: 'Jane Smith', score: 46, time_taken_minutes: 38, answers: {} }
  ];

  const analysisRes = await processScoreAnalysisAndUploadToR2({
    examId: generated.metadata.examId,
    classroomId: 'test_class_101',
    examName: 'Photosynthesis Mid-Term Assessment',
    totalMarks: 50,
    students: mockStudents,
    questions: generated.sections.flatMap(s => s.questions)
  });

  assert(Boolean(analysisRes.analytics), 'Score analytics computed successfully');
  assert(analysisRes.summary.total_students === 5, `Total students analyzed: ${analysisRes.summary.total_students}`);
  assert(analysisRes.summary.average_score > 0, `Class average score: ${analysisRes.summary.average_score} / 50`);
  assert(analysisRes.storage_provider === 'cloudflare_r2', 'Storage provider confirmed as cloudflare_r2');
  assert(analysisRes.report_r2_key.startsWith('reports/'), `Report R2 key created: ${analysisRes.report_r2_key}`);

  console.log('\n--- 5. Testing Cloudflare R2 Presigned Download URL ---');
  const downloadInfo = buildPresignedDownloadUrl({
    objectKey: analysisRes.report_r2_key,
    expiresInSeconds: 3600
  });

  assert(downloadInfo.downloadUrl.includes('X-Amz-Signature='), 'Secure AWS SigV4 presigned download URL generated successfully');
  assert(downloadInfo.objectKey === analysisRes.report_r2_key, 'Presigned URL matches R2 object key');

  console.log('\n=================================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED     `);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
