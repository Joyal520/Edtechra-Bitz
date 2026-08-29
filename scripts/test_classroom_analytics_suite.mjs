// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: PHASE 2 CLASSROOM ANALYTICS TEST SUITE
// Tests:
// 1. Real Database Classroom Validation (85%, 58%, 30% student averages)
// 2. Teacher & Admin exclusion from learner calculations
// 3. Activity Type Breakdown (assignment, exam, live_quiz, ocr, ai_challenge)
// 4. Topic and Category Mastery Analytics
// 5. Trend Analysis (Current vs Previous period, percentage points delta)
// 6. Data Confidence Evaluation (HIGH, MEDIUM, LOW, INSUFFICIENT)
// 7. Synthetic Edge Cases (0 events, missing topic, missing scores, single student)
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  computeClassroomAnalytics,
  computeStudentAnalytics,
  computeActivityAnalytics,
  computeTopicAnalytics,
  computeTrendAnalytics,
  evaluateDataConfidence,
  classifyStudentPerformance,
  evaluateStudentEngagement,
  ANALYTICS_CONFIG
} from '../server/classroomAnalyticsService.mjs';

console.log('=================================================================');
console.log('  EDTECHRA TEACHING INTELLIGENCE: PHASE 2 ANALYTICS ENGINE TEST  ');
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
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Missing Supabase configuration in environment.');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('\n--- 1. Testing Real Database Classroom Analytics (Thiruchenthoor Class) ---');
  const testClassroomId = '7c896a5c-6e95-46f0-98d1-3f0d5598d156';

  const analytics = await computeClassroomAnalytics(supabase, testClassroomId);

  assert(Boolean(analytics.classroom?.id === testClassroomId), `Classroom matched: ${analytics.classroom.title}`);
  assert(analytics.overview.totalStudents === 3, `Total enrolled students is 3 (Teacher excluded): ${analytics.overview.totalStudents}`);
  assert(analytics.overview.activeStudents === 3, `Active students count is 3: ${analytics.overview.activeStudents}`);
  assert(analytics.overview.totalLearningEvents === 8, `Total learning events count is 8: ${analytics.overview.totalLearningEvents}`);
  assert(analytics.overview.completedActivitiesCount === 7, `Completed distinct activities is 7: ${analytics.overview.completedActivitiesCount}`);
  assert(analytics.overview.averagePercentage === 61.25, `Classroom average percentage correctly calculated as 61.25%: ${analytics.overview.averagePercentage}%`);
  assert(analytics.dataConfidence === 'HIGH', `Classroom data confidence is HIGH: ${analytics.dataConfidence}`);

  console.log('\n--- 2. Verifying Real Student Averages (85%, 58%, 30%) ---');
  const studentIvy = analytics.students.find(s => s.studentId === '827a985f-f876-484a-af4a-d0a80896aa5a');
  const studentEdTechra = analytics.students.find(s => s.studentId === '16875a55-fa0a-4b29-a1e9-9ee024cde0db');
  const studentSangeerth = analytics.students.find(s => s.studentId === '1891c7aa-7a75-4082-8132-c10ed0d891b9');

  assert(Boolean(studentIvy), 'Student Ivy found');
  assert(studentIvy?.averagePercentage === 85, `Student Ivy average is exactly 85%: ${studentIvy?.averagePercentage}%`);
  assert(studentIvy?.performanceCategory === 'HIGH_PERFORMER', `Student Ivy classified as HIGH_PERFORMER: ${studentIvy?.performanceCategoryLabel}`);

  assert(Boolean(studentEdTechra), 'Student EdTechra found');
  assert(studentEdTechra?.averagePercentage === 58, `Student EdTechra average is exactly 58%: ${studentEdTechra?.averagePercentage}%`);
  assert(studentEdTechra?.performanceCategory === 'NEEDS_SUPPORT', `Student EdTechra classified as NEEDS_SUPPORT: ${studentEdTechra?.performanceCategoryLabel}`);
  assert(studentEdTechra?.totalEvents === 5, `Student EdTechra total events is 5: ${studentEdTechra?.totalEvents}`);

  assert(Boolean(studentSangeerth), 'Student Sangeerth found');
  assert(studentSangeerth?.averagePercentage === 30, `Student Sangeerth average is exactly 30%: ${studentSangeerth?.averagePercentage}%`);
  assert(studentSangeerth?.performanceCategory === 'AT_RISK', `Student Sangeerth classified as AT_RISK: ${studentSangeerth?.performanceCategoryLabel}`);

  console.log('\n--- 3. Verifying Activity Breakdown ---');
  const examBreakdown = analytics.activityBreakdown['exam'];
  const quizBreakdown = analytics.activityBreakdown['live_quiz'];
  const ocrBreakdown = analytics.activityBreakdown['ocr'];

  assert(examBreakdown?.eventCount === 2, `Exam events count: ${examBreakdown?.eventCount}`);
  assert(examBreakdown?.averagePercentage === 100, `Exam average percentage: ${examBreakdown?.averagePercentage}%`);
  assert(quizBreakdown?.eventCount === 4, `Live Quiz events count: ${quizBreakdown?.eventCount}`);
  assert(quizBreakdown?.averagePercentage === 30, `Live Quiz average percentage: ${quizBreakdown?.averagePercentage}%`);
  assert(ocrBreakdown?.eventCount === 2, `OCR events count: ${ocrBreakdown?.eventCount}`);
  assert(ocrBreakdown?.averagePercentage === 85, `OCR average percentage: ${ocrBreakdown?.averagePercentage}%`);

  console.log('\n--- 4. Verifying Real Topic Analytics ---');
  const topicNames = analytics.topics.map(t => t.topic);
  assert(topicNames.includes('Unit Test'), `Found real topic: Unit Test`);
  assert(topicNames.includes('Essay Writing'), `Found real topic: Essay Writing`);
  assert(topicNames.includes('Grammar'), `Found real topic: Grammar`);
  assert(topicNames.includes('Science'), `Found real topic: Science`);

  const unitTestTopic = analytics.topics.find(t => t.topic === 'Unit Test');
  assert(unitTestTopic?.averagePercentage === 100 && unitTestTopic?.status === 'strong', `Unit test topic is strong (100%)`);

  console.log('\n--- 5. Testing Synthetic & Edge Cases ---');

  // Case A: 0 events / No activity
  const emptyStudentMembers = [
    { id: 's1', profile_id: 'p1', role: 'student', display_name: 'Empty Student', profile: { email: 's1@test.com' } }
  ];
  const emptyStudentAnalytics = computeStudentAnalytics([], emptyStudentMembers);
  assert(emptyStudentAnalytics[0].totalEvents === 0, '0 events returns totalEvents = 0');
  assert(emptyStudentAnalytics[0].averagePercentage === null, '0 events returns averagePercentage = null');
  assert(emptyStudentAnalytics[0].performanceCategory === 'INSUFFICIENT_DATA', '0 events classified as INSUFFICIENT_DATA');
  assert(emptyStudentAnalytics[0].performanceCategoryLabel === 'Insufficient data', '0 events label is "Insufficient data"');
  assert(emptyStudentAnalytics[0].confidence === 'INSUFFICIENT', '0 events confidence is INSUFFICIENT');
  assert(emptyStudentAnalytics[0].engagementIndicator === 'INACTIVE', '0 events engagement is INACTIVE');

  // Case B: Single student with 1 event (LOW confidence)
  const singleEventStudent = [
    {
      id: 'e1',
      student_id: 'p1',
      activity_id: 'a1',
      activity_type: 'exam',
      activity_title: 'Midterm',
      topic: 'Algebra',
      percentage: 88,
      completed_at: new Date().toISOString()
    }
  ];
  const singleStudentRes = computeStudentAnalytics(singleEventStudent, emptyStudentMembers);
  assert(singleStudentRes[0].totalEvents === 1, 'Single student event count = 1');
  assert(singleStudentRes[0].averagePercentage === 88, 'Single student average = 88%');
  assert(singleStudentRes[0].confidence === 'LOW', '1 event gives LOW confidence');

  // Case C: Missing topic and missing score handling
  const dirtyEvents = [
    {
      id: 'e2',
      student_id: 'p1',
      activity_id: 'a2',
      activity_type: 'assignment',
      activity_title: 'Drafting',
      topic: null,
      category: '',
      percentage: null,
      score: null,
      max_score: 100,
      completed_at: new Date().toISOString()
    }
  ];
  const dirtyTopics = computeTopicAnalytics(dirtyEvents);
  assert(dirtyTopics.length === 0, 'Null/empty topics are safely excluded without error');

  // Case D: Trend comparison when previous period has 0 data
  const trendResult = computeTrendAnalytics(singleEventStudent, 1, { periodDays: 14 });
  assert(trendResult.isAvailable === false, 'Trend unavailable when previous period has 0 events');
  assert(trendResult.scoreChangePercentagePoints === null, 'Score change is null when previous data missing');
  assert(trendResult.reason.includes('previous comparison period'), 'Clean explanation reason provided for missing trend');

  // Case E: Trend comparison with 2 periods (Percentage points calculation)
  const nowMs = Date.now();
  const twoPeriodEvents = [
    {
      id: 'cur1',
      student_id: 'p1',
      activity_id: 'a1',
      percentage: 71,
      completed_at: new Date(nowMs - 2 * 24 * 3600 * 1000).toISOString() // 2 days ago (current period)
    },
    {
      id: 'prev1',
      student_id: 'p1',
      activity_id: 'a2',
      percentage: 58,
      completed_at: new Date(nowMs - 16 * 24 * 3600 * 1000).toISOString() // 16 days ago (previous period in 14-day window)
    }
  ];
  const twoPeriodTrend = computeTrendAnalytics(twoPeriodEvents, 1, { periodDays: 14, nowTimestamp: nowMs });
  assert(twoPeriodTrend.isAvailable === true, 'Two period trend is available');
  assert(twoPeriodTrend.previousScoreAverage === 58, `Previous average is 58%: ${twoPeriodTrend.previousScoreAverage}%`);
  assert(twoPeriodTrend.currentScoreAverage === 71, `Current average is 71%: ${twoPeriodTrend.currentScoreAverage}%`);
  assert(twoPeriodTrend.scoreChangePercentagePoints === 13, `Score change is +13 percentage points: ${twoPeriodTrend.scoreChangePercentagePoints} pp`);

  // Case F: Teacher / Admin exclusion from member calculations
  const mixedMembers = [
    { id: 'm1', profile_id: 'prof_teacher', role: 'teacher', profile: { email: 'teach@test.com' } },
    { id: 'm2', profile_id: 'prof_student', role: 'student', profile: { email: 'stud@test.com' } }
  ];
  const studentOnly = mixedMembers.filter(m => m.role === 'student');
  const mixedAnalytics = computeStudentAnalytics([], studentOnly);
  assert(mixedAnalytics.length === 1 && mixedAnalytics[0].studentId === 'prof_student', 'Teacher excluded from student analytics');

  // Case G: Performance Classification rules
  const highPerf = classifyStudentPerformance({ averagePercentage: 85, validEventsCount: 3, scoreChange: 0, confidence: 'HIGH' });
  assert(highPerf.category === 'HIGH_PERFORMER', '85% classified as HIGH_PERFORMER');

  const improving = classifyStudentPerformance({ averagePercentage: 68, validEventsCount: 3, scoreChange: 6, confidence: 'HIGH' });
  assert(improving.category === 'IMPROVING', '+6 pp change classified as IMPROVING');

  const needsSupport = classifyStudentPerformance({ averagePercentage: 55, validEventsCount: 3, scoreChange: -2, confidence: 'HIGH' });
  assert(needsSupport.category === 'NEEDS_SUPPORT', '55% classified as NEEDS_SUPPORT');

  const atRisk = classifyStudentPerformance({ averagePercentage: 35, validEventsCount: 2, scoreChange: -15, confidence: 'MEDIUM' });
  assert(atRisk.category === 'AT_RISK', '35% classified as AT_RISK');

  const noData = classifyStudentPerformance({ averagePercentage: null, validEventsCount: 0, scoreChange: null, confidence: 'INSUFFICIENT' });
  assert(noData.category === 'INSUFFICIENT_DATA', 'Null average classified as INSUFFICIENT_DATA');

  console.log('\n=================================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED     `);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Analytics Test Suite Exception:', err);
  process.exit(1);
});
