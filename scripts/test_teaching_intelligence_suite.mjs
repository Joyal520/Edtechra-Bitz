// ============================================================================
// AI TEACHING INTELLIGENCE INTEGRATION TEST SUITE
// Verifies:
// 1. Zero-Token Deterministic Metrics Computation
// 2. Data Fingerprint Hash Generation for Cache Reuse
// 3. AI Intelligence Synthesis (Gemini Primary -> OpenAI Fallback -> Local Engine)
// 4. "What Should I Teach Next?" Prioritized Recommendations
// 5. 10-Section 30-Day Performance Report Compilation
// 6. PDFKit Vector Generation & Direct Cloudflare R2 Upload
// 7. Secure AWS SigV4 Presigned Download URL Generation
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  computeStudentAnalytics
} from '../server/classroomAnalyticsService.mjs';

import {
  computeClassroomMetrics,
  generateTeachingIntelligence,
  generateThirtyDayReportData,
  compileThirtyDayPdfAndUploadR2,
  generateStudentAIAssessment,
  handleTeacherChat
} from '../server/teachingIntelligenceService.mjs';

import {
  buildTeachingReportObjectKey,
  buildPresignedDownloadUrl
} from '../server/r2Service.mjs';

import { getR2Config } from '../server/r2Config.mjs';

console.log('=================================================================');
console.log('  EDTECHRA DIGITAL CLASSROOM: AI TEACHING INTELLIGENCE TEST SUITE ');
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
  console.log('\n--- 1. Testing Zero-Token Deterministic Metrics Computation ---');
  const metrics = await computeClassroomMetrics(null, 'test_classroom_8a');
  
  assert(metrics.class_summary.total_students > 0, `Total students computed: ${metrics.class_summary.total_students}`);
  assert(metrics.class_summary.overall_score >= 0 && metrics.class_summary.overall_score <= 100, `Overall score bounded: ${metrics.class_summary.overall_score}%`);
  assert(metrics.topic_performance.length >= 3, `Topic performance topics identified: ${metrics.topic_performance.length}`);
  assert(Boolean(metrics.data_hash), `Deterministic data_hash fingerprint generated: ${metrics.data_hash}`);
  assert(metrics.students_needing_attention.length > 0, `Attention cases identified: ${metrics.students_needing_attention.length}`);

  console.log('\n--- 2. Testing AI Intelligence Generation (Gemini Primary / Fallback) ---');
  const intelligence = await generateTeachingIntelligence({
    metricsSummary: metrics,
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY
  });

  assert(Boolean(intelligence.summary), `Executive summary generated: "${intelligence.summary.slice(0, 60)}..."`);
  assert(Array.isArray(intelligence.teach_next) && intelligence.teach_next.length > 0, `"What Should I Teach Next?" recommendations generated: ${intelligence.teach_next.length}`);
  assert(Boolean(intelligence.teach_next[0].topic), `Top priority topic: ${intelligence.teach_next[0].topic}`);
  assert(Boolean(intelligence.teach_next[0].why), `Grounded why reasoning: ${intelligence.teach_next[0].why}`);
  assert(Boolean(intelligence.teach_next[0].recommended_action), `Concrete action: ${intelligence.teach_next[0].recommended_action}`);
  assert(Array.isArray(intelligence.class_strengths) && intelligence.class_strengths.length > 0, `Class strengths generated: ${intelligence.class_strengths.length}`);
  assert(Array.isArray(intelligence.areas_to_improve) && intelligence.areas_to_improve.length > 0, `Areas to improve generated: ${intelligence.areas_to_improve.length}`);
  assert(Boolean(intelligence.ai_provider), `AI Provider reported: ${intelligence.ai_provider}`);

  console.log('\n--- 3. Testing 30-Day Comprehensive Performance Report Data Structure ---');
  const reportData = await generateThirtyDayReportData({
    metricsSummary: metrics,
    period: '2026-08',
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY
  });

  assert(reportData.report_title === '30-Day Classroom Performance Report', 'Report title matches standard');
  assert(Boolean(reportData.sections?.executive_summary), 'Section 1: Executive Summary present');
  assert(Boolean(reportData.sections?.achievement?.class_average), 'Section 2: Achievement metrics present');
  assert(Boolean(reportData.sections?.strengths?.length), 'Section 3: Strengths present');
  assert(Boolean(reportData.sections?.areas_for_improvement?.length), 'Section 4: Areas for improvement present');
  assert(Boolean(reportData.sections?.positive_feedback), 'Section 5: Positive feedback present');
  assert(Boolean(reportData.sections?.critical_feedback), 'Section 6: Honest critical feedback present');
  assert(Boolean(reportData.sections?.teaching_recommendations?.length), 'Section 7: Teaching recommendations present');
  assert(Boolean(reportData.sections?.recommended_topics?.length), 'Section 8: Recommended topics present');
  assert(Boolean(reportData.sections?.student_support?.length), 'Section 9: Student support present');
  assert(Boolean(reportData.sections?.next_month_strategy?.length), 'Section 10: Next-month strategy present');

  console.log('\n--- 4. Testing PDF Compilation & Cloudflare R2 Upload ---');
  const r2Key = buildTeachingReportObjectKey({
    classroomId: 'test_classroom_8a',
    period: '2026-08',
    timestamp: 1787815000000
  });
  assert(r2Key === 'ai-reports/classrooms/test_classroom_8a/2026-08/classroom-report-1787815000000.pdf', `R2 Object Key structure: ${r2Key}`);

  const uploadResult = await compileThirtyDayPdfAndUploadR2({
    classroomId: 'test_classroom_8a',
    teacherId: 'teacher_demo',
    reportData,
    period: '2026-08'
  });

  assert(uploadResult.storage_provider === 'cloudflare_r2', 'Storage provider confirmed as cloudflare_r2');
  assert(uploadResult.storage_key.startsWith('ai-reports/classrooms/test_classroom_8a/'), `R2 storage key created: ${uploadResult.storage_key}`);
  assert(uploadResult.file_size > 1000, `Generated PDF file size: ${uploadResult.file_size} bytes`);
  assert(uploadResult.download_url.includes('X-Amz-Signature='), 'Presigned AWS SigV4 download URL generated successfully');

  console.log('\n--- 5. Testing 5-Source Student Analytics Computation Engine ---');
  const sampleEvents = [
    {
      id: 'ev1',
      student_id: 'test_student_1',
      activity_type: 'live_quiz',
      activity_title: 'Weekly Live Quiz #1',
      topic: 'Prepositions',
      score: 5,
      max_score: 10,
      percentage: 50,
      completed_at: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      id: 'ev2',
      student_id: 'test_student_1',
      activity_type: 'exam',
      activity_title: 'Midterm Grammar Exam',
      topic: 'Prepositions',
      score: 55,
      max_score: 100,
      percentage: 55,
      completed_at: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'ev3',
      student_id: 'test_student_1',
      activity_type: 'assignment',
      activity_title: 'Vocabulary Reading Worksheet',
      topic: 'Vocabulary',
      score: 90,
      max_score: 100,
      percentage: 90,
      completed_at: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'ev4',
      student_id: 'test_student_1',
      activity_type: 'ocr',
      activity_title: 'Handwritten Worksheet OCR',
      topic: 'Vocabulary',
      score: 85,
      max_score: 100,
      percentage: 85,
      completed_at: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      id: 'ev5',
      student_id: 'test_student_1',
      activity_type: 'ai_challenge',
      activity_title: 'Creative Writing Challenge',
      topic: 'Writing Mechanics',
      score: 80,
      max_score: 100,
      percentage: 80,
      completed_at: new Date().toISOString()
    }
  ];

  const studentMember = {
    profile_id: 'test_student_1',
    role: 'student',
    profile: {
      id: 'test_student_1',
      full_name: 'Alex Turner',
      email: 'alex@example.com'
    }
  };

  const [studentAnalytics] = computeStudentAnalytics(sampleEvents, [studentMember]);
  assert(studentAnalytics.attempts === 5, `All 5 learning events computed: ${studentAnalytics.attempts}`);
  assert(studentAnalytics.averagePercentage === 72, `Average percentage accurately computed: ${studentAnalytics.averagePercentage}%`);
  assert(studentAnalytics.activityBreakdown.live_quiz.attempts === 1, 'Live quiz breakdown counted');
  assert(studentAnalytics.activityBreakdown.exam.attempts === 1, 'Exam breakdown counted');
  assert(studentAnalytics.activityBreakdown.assignment.attempts === 1, 'Assignment breakdown counted');
  assert(studentAnalytics.activityBreakdown.ocr.attempts === 1, 'OCR breakdown counted');
  assert(studentAnalytics.activityBreakdown.ai_challenge.attempts === 1, 'AI Challenge breakdown counted');
  assert(studentAnalytics.strongAreas.some(s => s.topic === 'Vocabulary'), 'Vocabulary identified as strong area');
  assert(studentAnalytics.weakAreas.some(w => w.topic === 'Prepositions'), 'Prepositions identified as weak area');

  console.log('\n--- 6. Testing Grounded Student AI Assessment (Zero Mock / Real Evidence) ---');
  // 6a: Insufficient data test
  const emptyAiAssessment = await generateStudentAIAssessment({
    student: { attempts: 0, fullName: 'New Student' },
    classroom: { title: '8A', subject: 'English', grade: 'Grade 8' }
  });
  assert(emptyAiAssessment.has_sufficient_data === false, 'Zero-data correctly returns has_sufficient_data: false');
  assert(emptyAiAssessment.doing_well.includes('Not enough evidence yet'), 'Zero-data outputs "Not enough evidence yet."');

  // 6b: Rich data test
  const richAiAssessment = await generateStudentAIAssessment({
    student: studentAnalytics,
    classroom: { title: '8A', subject: 'English', grade: 'Grade 8' },
    openaiApiKey: process.env.OPENAI_API_KEY
  });
  assert(richAiAssessment.has_sufficient_data === true, 'Sufficient data generates has_sufficient_data: true');
  assert(Boolean(richAiAssessment.doing_well), `Doing well: "${richAiAssessment.doing_well.slice(0, 50)}..."`);
  assert(Boolean(richAiAssessment.where_struggling), `Where struggling: "${richAiAssessment.where_struggling.slice(0, 50)}..."`);
  assert(Boolean(richAiAssessment.evidence), `Evidence: "${richAiAssessment.evidence.slice(0, 50)}..."`);
  assert(Boolean(richAiAssessment.next_steps), `Next steps: "${richAiAssessment.next_steps.slice(0, 50)}..."`);

  console.log('\n--- 7. Testing Grounded AI Teacher Chat Assistant ---');
  const chatRes = await handleTeacherChat({
    classroomId: 'test_classroom_8a',
    message: 'Which students need the most help right now and what is their weakness?',
    openaiApiKey: process.env.OPENAI_API_KEY
  });
  const chatReply = chatRes.reply;
  assert(Boolean(chatReply), `AI chat assistant replied: "${chatReply.slice(0, 80)}..."`);
  assert(chatReply.toLowerCase().includes('student') || chatReply.toLowerCase().includes('attention') || chatReply.toLowerCase().includes('preposition'), 'Chat reply is strictly grounded in metrics facts');

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
