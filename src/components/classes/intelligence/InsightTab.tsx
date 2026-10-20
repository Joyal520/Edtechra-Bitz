import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Target,
  ArrowRight,
  Sparkles,
  BarChart3,
  Lightbulb,
  FileText,
  AlertCircle,
  Layers,
  BookOpen,
  Award,
  Zap,
  PenTool,
  Stethoscope
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { CourseAnalyticsSummary } from '@/types/courseStudio';
import { TeachingIntelligenceResponse } from '@/services/teachingIntelligenceService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';

interface InsightTabProps {
  classroom?: Classroom;
  data?: TeachingIntelligenceResponse | null;
  courseAnalytics?: CourseAnalyticsSummary | null;
  intelligence?: any;
  metrics?: any;
  classroomId?: string;
  students?: any[];
  onNavigateToTab?: (tab: string, context?: { topic?: string; studentId?: string }) => void;
  onNavigateToTeaching?: (targetTopic?: string) => void;
  onNavigateToStudents?: () => void;
  onNavigateToEvidence?: () => void;
  onOpenExamAnalysis?: (examId: string) => void;
  onGenerateAnalysis?: () => void;
  refreshing?: boolean;
}

export const InsightTab: React.FC<InsightTabProps> = ({
  classroom,
  data,
  courseAnalytics: courseAnalyticsProp,
  intelligence: _intelligence,
  metrics,
  classroomId: _classroomId,
  students: _students,
  onNavigateToTab,
  onNavigateToTeaching,
  onNavigateToStudents,
  onNavigateToEvidence,
  onGenerateAnalysis: _onGenerateAnalysis,
  refreshing: _refreshing
}) => {
  const handleNavigation = (tab: string, context?: { topic?: string; studentId?: string }) => {
    if (onNavigateToTab) {
      onNavigateToTab(tab, context);
    } else {
      if (tab === 'teaching' && onNavigateToTeaching) onNavigateToTeaching(context?.topic);
      if (tab === 'students' && onNavigateToStudents) onNavigateToStudents();
      if (tab === 'evidence-reports' && onNavigateToEvidence) onNavigateToEvidence();
    }
  };

  const resolvedMetrics = metrics || data?.metrics || {};
  const activeCourseAnalytics: CourseAnalyticsSummary | null = courseAnalyticsProp || resolvedMetrics.course_analytics || null;

  const classSummary = resolvedMetrics.class_summary || {};
  const classHealth = resolvedMetrics.class_health || {};
  const topicPerformance = resolvedMetrics.topic_performance || [];
  const topStrengths = resolvedMetrics.top_strengths || [];
  const studentsNeedingAttention = resolvedMetrics.students_needing_attention || [];
  const recentEvidence = resolvedMetrics.recent_learning_evidence || [];

  const totalStudents = classSummary.total_students || classroom?.student_count || 0;
  const overallScore = classSummary.overall_score ?? classHealth.classAverage ?? null;
  const scoreChange = classSummary.score_change ?? 0;
  const completionRate = classSummary.task_completion_rate ?? classHealth.completionRate ?? null;
  const participationRate = classSummary.engagement_rate ?? classHealth.participationRate ?? null;
  const strugglingCount = classHealth.strugglingCount ?? studentsNeedingAttention.length;

  // Multi-source Evidence Summary Counts (50% OCR/writing, 30% Exams, 20% Quizzes/Comp)
  const evidenceCounts = useMemo(() => {
    const raw = resolvedMetrics.evidenceSummaryCounts || resolvedMetrics.evidence_summary_counts;
    if (raw) return raw;

    let ocr = 0, tasks = 0, live_quizzes = 0, exams = 0, competitions = 0;
    (recentEvidence || []).forEach((e: any) => {
      const t = e.activityType || e.rawActivityType;
      if (t === 'ocr') ocr++;
      else if (t === 'task' || t === 'assignment') tasks++;
      else if (t === 'live_quiz' || t === 'quiz') live_quizzes++;
      else if (t === 'exam' || t === 'assessment') exams++;
      else if (t === 'competition' || t === 'ai_challenge') competitions++;
    });

    return {
      ocr,
      tasks,
      live_quizzes,
      exams,
      competitions,
      total: ocr + tasks + live_quizzes + exams + competitions
    };
  }, [resolvedMetrics.evidenceSummaryCounts, resolvedMetrics.evidence_summary_counts, recentEvidence]);

  // Section 1: Class & Course Performance — Max 10 clean canonical concept bars (No raw JSON, no duplicates)
  const sortedTopics = useMemo(() => {
    const rawTopics = (resolvedMetrics.topics && resolvedMetrics.topics.length > 0)
      ? resolvedMetrics.topics
      : topicPerformance;

    const seenNames = new Set<string>();
    const cleaned: Array<{ displayName: string; topic: string; score: number }> = [];

    for (const t of rawTopics) {
      const name = t.displayName || t.topic || '';
      // Reject raw JSON, session IDs, generic categories, or placeholders
      if (!name || name.length < 3 || seenNames.has(name.toLowerCase())) continue;
      if (/session[-_]?id|final[-_]?rank|\{|\}|\[|\]/i.test(name)) continue;
      if (/^(?:grammar|spelling|writing|vocabulary|reading|general|other|task|assignment)$/i.test(name.trim())) continue;

      const score = t.averagePercentage != null ? Math.round(t.averagePercentage) : (t.score != null ? Math.round(t.score) : null);
      if (score === null || isNaN(score)) continue;

      seenNames.add(name.toLowerCase());
      cleaned.push({
        displayName: name,
        topic: t.topic || name,
        score
      });
    }

    // Merge course concept mastery if available
    if (activeCourseAnalytics?.concept_mastery) {
      for (const cm of activeCourseAnalytics.concept_mastery) {
        const name = cm.concept || '';
        if (!name || name.length < 3 || seenNames.has(name.toLowerCase())) continue;
        if (/^(?:general|other|course question)$/i.test(name.trim())) continue;
        const score = Math.round(cm.accuracy_percentage || 0);
        seenNames.add(name.toLowerCase());
        cleaned.push({
          displayName: name,
          topic: name,
          score
        });
      }
    }

    // Sort by lowest score first, maximum 10 bars
    return cleaned.sort((a, b) => a.score - b.score).slice(0, 10);
  }, [resolvedMetrics.topics, topicPerformance, activeCourseAnalytics]);

  // Course-Level Analysis Summary (Scoped to this classroom if matched, or course-wide)
  const courseSummary = useMemo(() => {
    if (!activeCourseAnalytics) return null;
    const { overview, classroom_performance, student_performance, concept_mastery, most_difficult_lessons, strongest_lessons, ai_insights, course } = activeCourseAnalytics;

    const classPerf = classroom?.id
      ? classroom_performance.find(c => c.classroom_id === classroom.id)
      : null;

    const classStudents = classroom?.id
      ? student_performance.filter(s => s.classroom_id === classroom.id)
      : student_performance;
    const effectiveStudents = classStudents.length > 0 ? classStudents : student_performance;

    const enrolledCount = classPerf ? classPerf.enrolled_students : (overview.total_enrolled_students || totalStudents);
    const avgProgress = classPerf ? Math.round(classPerf.average_progress_percent) : Math.round(overview.average_progress_percent || 0);
    const completionRatePct = classPerf ? Math.round(classPerf.completion_rate_percent) : Math.round(overview.overall_completion_rate || 0);
    const avgAssessmentScore = classPerf
      ? Math.round(classPerf.average_accuracy_percent || classPerf.average_mastery_percent || 0)
      : Math.round(overview.average_accuracy_percent || overview.average_mastery_percent || 0);

    const onTrackCount = effectiveStudents.filter(s => s.status === 'strong' || s.status === 'good' || s.progress_percent >= 65).length;
    const fallingBehindCount = effectiveStudents.filter(s => s.progress_percent < 40 && s.status !== 'strong').length;
    const needingSupportCount = effectiveStudents.filter(s => s.status === 'needs_support' || s.status === 'at_risk').length;

    const difficultLessons = (most_difficult_lessons && most_difficult_lessons.length > 0)
      ? most_difficult_lessons
      : concept_mastery.filter(c => c.accuracy_percentage < 65).slice(0, 3).map(c => ({
          episode_id: c.concept,
          title: c.concept,
          unit_title: c.skill || 'Concept',
          accuracy_percentage: Math.round(c.accuracy_percentage),
          total_attempts: c.total_attempts,
          correct_attempts: c.correct_attempts,
          has_attempts: true,
          status: c.status
        }));

    const topStrongLessons = (strongest_lessons && strongest_lessons.length > 0)
      ? strongest_lessons
      : concept_mastery.filter(c => c.accuracy_percentage >= 70).slice(0, 3).map(c => ({
          episode_id: c.concept,
          title: c.concept,
          unit_title: c.skill || 'Concept',
          accuracy_percentage: Math.round(c.accuracy_percentage),
          total_attempts: c.total_attempts,
          correct_attempts: c.correct_attempts,
          has_attempts: true,
          status: c.status
        }));

    const commonGaps = concept_mastery
      .filter(c => c.status === 'needs_support' || c.status === 'at_risk' || c.accuracy_percentage < 65)
      .slice(0, 4);

    return {
      course,
      enrolledCount,
      avgProgress,
      completionRatePct,
      avgAssessmentScore,
      onTrackCount,
      fallingBehindCount,
      needingSupportCount,
      difficultLessons,
      topStrongLessons,
      commonGaps,
      aiInsights: ai_insights
    };
  }, [activeCourseAnalytics, classroom?.id, totalStudents]);

  // Section 2: DIAGNOSIS ENGINE — Maximum 5 clean, evidence-backed diagnostic cards
  const diagnosesList = useMemo(() => {
    const rawDiagnoses = (resolvedMetrics.diagnoses && resolvedMetrics.diagnoses.length > 0)
      ? resolvedMetrics.diagnoses
      : (resolvedMetrics.learningGapPriority || []);

    const seen = new Set<string>();
    const valid = [];

    for (const d of rawDiagnoses) {
      const name = d.displayName || d.specific_problem || d.skill || d.topic;
      if (!name || seen.has(name.toLowerCase())) continue;
      if (/session[-_]?id|final[-_]?rank|\{|\}/i.test(name)) continue;
      if (/^(?:grammar|spelling|writing|vocabulary|reading|general|other|task|assignment)$/i.test(name.trim())) continue;

      seen.add(name.toLowerCase());

      const sources = Array.isArray(d.evidence_sources) && d.evidence_sources.length > 0
        ? d.evidence_sources
        : (Array.isArray(d.sourcesList) && d.sourcesList.length > 0
          ? d.sourcesList
          : (Array.isArray(d.sources) ? d.sources : ['Worksheet (OCR)']));
      
      const affectedStudents = Array.isArray(d.affected_students) ? d.affected_students : [];
      const studentCount = d.affected_students_count ?? (affectedStudents.length > 0 ? affectedStudents.length : (d.affectedStudentsCount ?? d.studentCount ?? 1));
      const total = d.total_students || d.totalStudents || totalStudents || 1;
      const accuracy = d.accuracy != null ? Math.round(d.accuracy) : (d.averageAccuracy != null ? Math.round(d.averageAccuracy) : 0);
      const category = d.category || 'Grammar';
      const frequency = d.frequency ?? (d.occurrences ?? (d.commonErrors?.length || 1));
      const severity = (d.severity || (accuracy < 50 ? 'high' : accuracy < 65 ? 'medium' : 'low')).toLowerCase();
      const isMultiSource = sources.length >= 2 || studentCount >= 2;
      const confidence = d.confidence === 'confirmed' || d.confidence === 'confirmed_gap'
        ? 'Confirmed Gap'
        : (d.confidence === 'early_signal' ? 'Early Signal' : (isMultiSource ? 'Confirmed Gap' : 'Early Signal'));
      
      const examples = Array.isArray(d.examples) && d.examples.length > 0
        ? d.examples
        : (Array.isArray(d.commonErrors) && d.commonErrors.length > 0
          ? d.commonErrors.map((e: any) => ({
              student_error: e.student_error || e.error || e.student_answer || '',
              correction: e.correction || e.correct_form || e.correct_answer || ''
            }))
          : []);

      const recommendedTeaching = d.recommended_teaching || d.recommended_action || d.teachAction || `Review foundational rules of ${name} with guided contrast practice.`;

      valid.push({
        id: d.diagnosis_id || d.topic_key || `diag_${valid.length + 1}`,
        rank: valid.length + 1,
        category,
        skill: d.skill || name,
        subskill: d.subskill,
        specific_problem: d.specific_problem || name,
        displayName: name,
        topic: d.topic || d.skill || name,
        accuracy,
        frequency,
        severity,
        studentCount,
        totalStudents: total,
        affectedStudents,
        sources,
        confidence,
        examples,
        recommendedTeaching,
        priorityScore: d.priority_score ?? d.priority ?? 0
      });

      if (valid.length >= 5) break; // Strict Maximum 5 Diagnoses
    }

    return valid;
  }, [resolvedMetrics.diagnoses, resolvedMetrics.learningGapPriority, totalStudents]);

  // Section 3: Students Needing Support (with real names and linked primary/secondary diagnoses)
  const supportStudentsList = useMemo(() => {
    const list = resolvedMetrics.studentsNeedingSupport || [];
    if (list.length > 0) {
      return list.map((s: any) => ({
        studentId: s.studentId,
        studentName: s.studentName || s.fullName || 'Student',
        averagePercentage: s.overallAvg != null ? Math.round(s.overallAvg) : (s.averagePercentage != null ? Math.round(s.averagePercentage) : null),
        primaryDiagnosis: s.primary_diagnosis || s.primaryDiagnosis || (s.weakConcepts && s.weakConcepts[0]) || (s.specificWeakConcepts && s.specificWeakConcepts[0]) || 'Targeted Concept Review',
        secondaryDiagnosis: s.secondary_diagnosis || s.secondaryDiagnosis || (s.weakConcepts && s.weakConcepts[1]) || (s.specificWeakConcepts && s.specificWeakConcepts[1]) || null,
        weakConcepts: s.weakConcepts || s.specificWeakConcepts || []
      })).slice(0, 6);
    }

    return studentsNeedingAttention.map((s: any) => ({
      studentId: s.studentId || s.id,
      studentName: s.student_ref || s.name || s.fullName || 'Student',
      averagePercentage: s.average_score != null ? Math.round(s.average_score) : null,
      primaryDiagnosis: s.main_weakness || 'Targeted Concept Review',
      secondaryDiagnosis: null,
      weakConcepts: s.main_weakness ? [s.main_weakness] : ['Core Concept Review']
    })).slice(0, 6);
  }, [resolvedMetrics.studentsNeedingSupport, studentsNeedingAttention]);

  // Section 4: Class Strengths (Deduplicated concepts >= 75%)
  const strengthsList = useMemo(() => {
    const raw = resolvedMetrics.classStrengths || topStrengths || [];
    const seen = new Set<string>();
    const cleaned = [];

    for (const s of raw) {
      const name = s.displayName || s.topic;
      if (!name || seen.has(name.toLowerCase())) continue;
      if (/session[-_]?id|final[-_]?rank|\{|\}/i.test(name)) continue;
      if (/^(?:grammar|spelling|writing|vocabulary|reading|general|other|task|assignment)$/i.test(name.trim())) continue;

      const acc = s.accuracy != null ? Math.round(s.accuracy) : (s.averagePercentage != null ? Math.round(s.averagePercentage) : (s.averageScore != null ? Math.round(s.averageScore) : null));
      if (acc == null || acc < 75) continue;

      seen.add(name.toLowerCase());
      cleaned.push({
        displayName: name,
        accuracy: acc
      });

      if (cleaned.length >= 4) break;
    }

    return cleaned;
  }, [resolvedMetrics.classStrengths, topStrengths]);

  const getBarColor = (score: number) => {
    if (score < 50) return '#ef4444';
    if (score < 70) return '#f59e0b';
    return '#14b8a6';
  };

  const getCategoryBadgeColor = (cat: string) => {
    const category = (cat || 'GENERAL').toUpperCase();
    switch (category) {
      case 'READING':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'GRAMMAR':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'WRITING':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'SPELLING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'VOCABULARY':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      default:
        return 'bg-teal-50 text-teal-800 border-teal-200';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const hasEvidence = totalStudents > 0 && (evidenceCounts.total > 0 || sortedTopics.length > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      
      {/* 1. CLASSROOM PULSE & MULTI-SOURCE EVIDENCE SUMMARY */}
      <section>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Classroom Pulse</h2>
          <span className="text-xs font-bold text-[#36565A]">{totalStudents} Enrolled Students</span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#36565A]">Overall Learning Health</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173B3F]">
                {overallScore != null ? `${overallScore}%` : '--'}
              </span>
              {scoreChange !== 0 && overallScore != null && (
                <span className={`flex items-center text-xs font-bold ${scoreChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {scoreChange > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {Math.abs(scoreChange)}%
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#36565A]">Task Completion Rate</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173B3F]">
                {completionRate != null ? `${completionRate}%` : '--'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#36565A]">Active Participation</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173B3F]">
                {participationRate != null ? `${participationRate}%` : '--'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-[#36565A]">Students Needing Support</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173B3F]">
                {supportStudentsList.length > 0 ? supportStudentsList.length : (strugglingCount || 0)}
              </span>
              {totalStudents > 0 && <span className="text-xs text-[#36565A]">/ {totalStudents}</span>}
            </div>
          </div>
        </div>

        {/* Evidence Sources Badges (50% OCR/Writing, 30% Exams, 20% Quizzes) */}
        <div className="mt-3.5 bg-[#F8FCFB] rounded-xl border border-[#C9E5E2] p-3 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#173B3F]">
            <Layers className="w-3.5 h-3.5 text-[#087477]" />
            <span>Diagnostic Learning Evidence:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#C9E5E2] font-semibold text-[#173B3F] flex items-center gap-1 shadow-2xs">
              <PenTool className="w-3 h-3 text-[#087477]" />
              OCR Worksheets: <strong className="font-black text-[#087477]">{evidenceCounts.ocr}</strong>
            </span>

            <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#C9E5E2] font-semibold text-[#173B3F] flex items-center gap-1 shadow-2xs">
              <BookOpen className="w-3 h-3 text-indigo-600" />
              Typed Tasks: <strong className="font-black text-indigo-700">{evidenceCounts.tasks}</strong>
            </span>

            <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#C9E5E2] font-semibold text-[#173B3F] flex items-center gap-1 shadow-2xs">
              <Award className="w-3 h-3 text-rose-500" />
              Exams & Assessments: <strong className="font-black text-rose-600">{evidenceCounts.exams}</strong>
            </span>

            {evidenceCounts.competitions > 0 && (
              <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#C9E5E2] font-semibold text-[#173B3F] flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-purple-500" />
                Competitions: <strong className="font-black text-purple-600">{evidenceCounts.competitions}</strong>
              </span>
            )}

            {evidenceCounts.live_quizzes > 0 && (
              <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#C9E5E2] font-semibold text-[#173B3F] flex items-center gap-1 shadow-2xs">
                <Zap className="w-3 h-3 text-amber-500" />
                Live Quizzes: <strong className="font-black text-amber-600">{evidenceCounts.live_quizzes}</strong>
              </span>
            )}

            <span className="px-2.5 py-0.5 rounded-md bg-[#087477] text-white font-bold text-xs shadow-2xs">
              Total Evidence: {evidenceCounts.total}
            </span>
          </div>
        </div>
      </section>

      {/* 1B. COURSE-LEVEL ANALYSIS ("What is happening in my course?") */}
      {courseSummary && (
        <>
          <hr className="border-[#C9E5E2]" />
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#087477]" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                    Course Analysis • {courseSummary.course?.title || 'Assigned Course'}
                  </h2>
                </div>
                <p className="text-xs text-[#36565A] mt-0.5">
                  Real-time curriculum progress, lesson performance, and student pacing across your assigned course.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleNavigation('students')}
                className="px-3.5 py-1.5 rounded-xl bg-[#087477]/10 hover:bg-[#087477]/20 text-[#087477] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
              >
                <span>View Student Course Progress</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4 Course Telemetry Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-[#36565A] uppercase tracking-wider">Enrolled Students</span>
                <p className="text-2xl font-black text-[#173B3F] mt-1">{courseSummary.enrolledCount}</p>
                <span className="text-[11px] text-[#36565A] font-medium">Active in course</span>
              </div>

              <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-[#36565A] uppercase tracking-wider">Average Course Progress</span>
                <p className="text-2xl font-black text-[#173B3F] mt-1">{courseSummary.avgProgress}%</p>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-[#087477] h-full rounded-full transition-all" style={{ width: `${courseSummary.avgProgress}%` }} />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-[#36565A] uppercase tracking-wider">Course Completion Rate</span>
                <p className="text-2xl font-black text-[#173B3F] mt-1">{courseSummary.completionRatePct}%</p>
                <span className="text-[11px] text-[#36565A] font-medium">Finished all lessons</span>
              </div>

              <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs">
                <span className="text-[11px] font-bold text-[#36565A] uppercase tracking-wider">Avg Assessment Score</span>
                <p className="text-2xl font-black text-[#173B3F] mt-1">{courseSummary.avgAssessmentScore}%</p>
                <span className="text-[11px] text-[#36565A] font-medium">Lesson quizzes & checks</span>
              </div>
            </div>

            {/* Pacing Status Pills */}
            <div className="bg-[#F8FCFB] rounded-xl border border-[#C9E5E2] p-3 flex items-center justify-between flex-wrap gap-2.5 text-xs">
              <span className="font-bold text-[#173B3F]">Learner Pacing Breakdown:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  Students On Track: <strong>{courseSummary.onTrackCount}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  Falling Behind: <strong>{courseSummary.fallingBehindCount}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                  Needing Support: <strong>{courseSummary.needingSupportCount}</strong>
                </span>
              </div>
            </div>

            {/* Most Difficult Lessons, Strongest Lessons, Common Learning Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Most Difficult Lessons */}
              <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Most Difficult Lessons</span>
                </div>
                {courseSummary.difficultLessons.length === 0 ? (
                  <p className="text-xs text-[#36565A]">No high-difficulty lesson bottlenecks detected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {courseSummary.difficultLessons.map((l, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-[#173B3F] truncate">{l.title}</p>
                          <p className="text-[10px] text-[#36565A] truncate">{l.unit_title}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[11px] shrink-0">
                          {l.accuracy_percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strongest Lessons */}
              <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Strongest Lessons</span>
                </div>
                {courseSummary.topStrongLessons.length === 0 ? (
                  <p className="text-xs text-[#36565A]">Complete more lesson checks to identify top strengths.</p>
                ) : (
                  <div className="space-y-2">
                    {courseSummary.topStrongLessons.map((l, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-[#173B3F] truncate">{l.title}</p>
                          <p className="text-[10px] text-[#36565A] truncate">{l.unit_title}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] shrink-0">
                          {l.accuracy_percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Common Learning Gaps */}
              <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700">
                  <Target className="w-3.5 h-3.5" />
                  <span>Common Learning Gaps</span>
                </div>
                {courseSummary.commonGaps.length === 0 ? (
                  <p className="text-xs text-[#36565A]">No widespread concept gaps detected across the course.</p>
                ) : (
                  <div className="space-y-2">
                    {courseSummary.commonGaps.map((g, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-[#173B3F] truncate">{g.concept}</p>
                          <p className="text-[10px] text-[#36565A]">{g.correct_attempts}/{g.total_attempts} correct</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[11px] shrink-0">
                          {Math.round(g.accuracy_percentage)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <hr className="border-[#C9E5E2]" />

      {/* 2. COURSE PERFORMANCE (MAX 10 CLEAN CANONICAL BARS AGAINST 70% TARGET) */}
      <section>
        <div className="mb-3.5 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Course & Concept Performance</h2>
            <p className="text-xs text-[#36565A] mt-0.5">Assessed concept and lesson accuracy against the 70% curriculum mastery benchmark.</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
              <span className="w-2 h-2 rounded-full bg-[#14b8a6]" /> Strong (70%+)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Developing (50–69%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Needs Support (&lt;50%)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#C9E5E2] p-4.5 shadow-2xs">
          {sortedTopics.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <BarChart3 className="w-7 h-7 text-slate-300 mb-1.5" />
              <span className="text-xs text-[#36565A] font-bold">No topic assessment data available yet.</span>
            </div>
          ) : (
            <div className="space-y-3.5 relative pb-4">
              {/* 70% Target Benchmark Marker */}
              <div className="hidden sm:block absolute top-0 bottom-4 left-[70%] border-l-2 border-dashed border-teal-500/40 z-0" />
              <div className="hidden sm:block absolute bottom-0 left-[70%] text-[9px] font-bold text-teal-600 -translate-x-1/2">
                70% Target
              </div>
              
              {sortedTopics.map((t, i) => {
                const statusLabel = t.score >= 70 ? 'Strong' : t.score >= 50 ? 'Developing' : 'Needs Support';
                const statusBadgeClass = t.score >= 70
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : t.score >= 50
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200';

                return (
                  <div key={i} className="relative z-10">
                    <div className="flex justify-between items-center text-xs font-bold text-[#173B3F] mb-1 gap-2">
                      <span className="truncate pr-2">{t.displayName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusBadgeClass}`}>
                          {statusLabel}
                        </span>
                        <span className="font-mono font-black" style={{ color: getBarColor(t.score) }}>{t.score}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, t.score))}%`, backgroundColor: getBarColor(t.score) }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* 3. DIAGNOSIS (MAXIMUM 5 GRANULAR, PEDAGOGICAL DIAGNOSES) */}
      <section>
        <div className="mb-3.5 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-[#087477]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                DIAGNOSIS
              </h2>
            </div>
            <p className="text-xs text-[#36565A] mt-0.5">
              Specific learning problems detected from student evidence and what to teach next.
            </p>
          </div>
          {diagnosesList.length > 0 && (
            <span className="text-xs font-bold text-[#087477] bg-teal-50 px-3 py-0.5 rounded-full border border-teal-200">
              {diagnosesList.length} {diagnosesList.length === 1 ? 'Diagnosis' : 'Diagnoses'} Detected
            </span>
          )}
        </div>

        {!hasEvidence || diagnosesList.length === 0 ? (
          <div className="bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] p-8 text-center">
            <Target className="w-8 h-8 text-[#159A9C] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#173B3F]">
              {!hasEvidence ? "Not enough evidence yet." : "No learning problems diagnosed."}
            </p>
            <p className="text-xs text-[#36565A] mt-1">
              {!hasEvidence 
                ? "Have students complete worksheets, tasks, or exams to unlock AI pedagogical diagnoses."
                : "All assessed concepts meet or exceed the 70% curriculum benchmark."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {diagnosesList.map((diag) => (
              <div 
                key={diag.id || diag.rank} 
                className={`bg-white rounded-xl border p-5 shadow-2xs hover:border-[#159A9C] transition-all space-y-3.5 ${
                  diag.rank === 1 ? 'border-l-4 border-l-[#087477] border-[#C9E5E2]' : 'border-[#C9E5E2]'
                }`}
              >
                {/* Header Row: Rank + Category + Specific Problem Title + Confidence + Severity */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-full bg-[#173B3F] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                        {diag.rank}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getCategoryBadgeColor(diag.category)}`}>
                        {diag.category}
                      </span>

                      <h3 className="text-sm sm:text-base font-black text-[#173B3F] break-words">
                        {diag.displayName}
                      </h3>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                        diag.confidence === 'Confirmed Gap'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {diag.confidence}
                      </span>

                      {diag.severity && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getSeverityBadgeColor(diag.severity)}`}>
                          {diag.severity} Priority
                        </span>
                      )}
                    </div>

                    {/* Metrics Row: Accuracy, Student Ratio, Frequency, Sources */}
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-[#173B3F] flex-wrap">
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-black"
                        style={{ backgroundColor: getBarColor(diag.accuracy) + '20', color: getBarColor(diag.accuracy) }}
                      >
                        {diag.accuracy}% accuracy
                      </span>

                      <span>•</span>

                      <span className="text-[#36565A]">
                        <strong className="text-[#173B3F]">{diag.studentCount}</strong> of <strong className="text-[#173B3F]">{diag.totalStudents}</strong> students affected
                      </span>

                      {diag.frequency > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#36565A]">
                            <strong className="text-[#173B3F]">{diag.frequency}</strong> {diag.frequency === 1 ? 'error occurrence' : 'error occurrences'}
                          </span>
                        </>
                      )}

                      <span>•</span>

                      {/* Evidence in */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[11px] text-[#36565A] font-medium">Evidence in:</span>
                        {(diag.sources || []).map((source: string, idx: number) => (
                          <span key={idx} className="text-[10px] font-bold px-1.5 py-0.2 bg-[#F8FCFB] border border-[#C9E5E2] rounded text-[#173B3F]">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleNavigation('evidence-reports', { topic: diag.displayName || diag.topic })}
                      className="px-3 py-1.5 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#087477]" />
                      View Evidence
                    </button>
                    <button 
                      onClick={() => handleNavigation('teaching', { topic: diag.topic || diag.skill })}
                      className="px-3 py-1.5 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      Teach This
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Common Student Errors Contrast Box */}
                {diag.examples && diag.examples.length > 0 && (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3 text-xs space-y-1.5">
                    <div className="font-bold text-[#92400E] flex items-center gap-1.5 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>Observed student error pattern:</span>
                    </div>
                    <div className="space-y-1 pl-4">
                      {diag.examples.slice(0, 3).map((err: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs flex-wrap font-sans">
                          <span className="line-through text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono font-medium text-[11px]">
                            {err.student_error}
                          </span>
                          <span className="text-slate-400 font-bold">→</span>
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold text-[11px]">
                            {err.correction}
                          </span>
                          {err.source && (
                            <span className="text-[10px] text-slate-500 font-medium">({err.source})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pedagogical Teaching Prescription Box */}
                <div className="text-xs text-[#173B3F] bg-[#E8F7F5] p-3 rounded-lg border border-[#C9E5E2] flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-[#087477] shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs leading-relaxed">
                    <span className="font-black text-[#087477]">Teach next: </span>
                    <InlineMarkdown text={diag.recommendedTeaching} />
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* 4. STUDENTS NEEDING SUPPORT (LINKED DIRECTLY TO DIAGNOSIS) */}
      <section className="space-y-6 pt-1">
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Students Needing Support</h2>
              <p className="text-xs text-[#36565A] mt-0.5">Learners connected to diagnosed skill gaps requiring intervention.</p>
            </div>
            {supportStudentsList.length > 0 && (
              <span className="text-[11px] font-bold text-[#087477] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                {supportStudentsList.length} {supportStudentsList.length === 1 ? 'student' : 'students'}
              </span>
            )}
          </div>
          
          {supportStudentsList.length === 0 ? (
            <div className="bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] p-4 text-center">
              <span className="text-xs font-semibold text-[#36565A]">No students currently flagged for intervention.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {supportStudentsList.map((student: any, i: number) => {
                const sName = student.studentName || 'Student';
                const initial = sName.trim().charAt(0).toUpperCase() || 'S';

                return (
                  <div 
                    key={i} 
                    onClick={() => handleNavigation('students', { studentId: student.studentId })}
                    className="bg-white border border-[#C9E5E2] hover:border-[#159A9C] rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all flex items-start gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#087477] font-black text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-[#173B3F] truncate pr-2">{sName}</span>
                        {student.averagePercentage != null && (
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 shrink-0">
                            {student.averagePercentage}%
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="text-[10px] text-[#36565A] font-medium truncate">
                          <strong className="text-[#087477]">Primary:</strong> {student.primaryDiagnosis}
                        </div>
                        {student.secondaryDiagnosis && (
                          <div className="text-[10px] text-[#36565A] font-medium truncate">
                            <strong className="text-slate-600">Secondary:</strong> {student.secondaryDiagnosis}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. CLASS STRENGTHS (Deduplicated concepts >= 75%) */}
        {strengthsList.length > 0 && (
          <div>
            <div className="mb-2.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Class Strengths</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {strengthsList.map((s: any, i: number) => (
                <div key={i} className="bg-white border border-[#C9E5E2] rounded-xl p-3 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-bold text-[#173B3F] mb-1.5 truncate">{s.displayName}</span>
                  <div className="inline-flex items-center self-start gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-black border border-teal-100">
                    <CheckCircle2 className="w-3 h-3" />
                    {s.accuracy}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

    </div>
  );
};

export default InsightTab;
