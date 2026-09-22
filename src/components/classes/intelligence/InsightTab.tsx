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
  PenTool
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { TeachingIntelligenceResponse } from '@/services/teachingIntelligenceService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';

interface InsightTabProps {
  classroom?: Classroom;
  data?: TeachingIntelligenceResponse | null;
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
  intelligence,
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
  const resolvedIntelligence = intelligence || data?.intelligence;

  const classSummary = resolvedMetrics.class_summary || {};
  const classHealth = resolvedMetrics.class_health || {};
  const topicPerformance = resolvedMetrics.topic_performance || [];
  const topStrengths = resolvedMetrics.top_strengths || [];
  const teachNext = resolvedIntelligence?.teach_next || [];
  const studentsNeedingAttention = resolvedMetrics.students_needing_attention || [];
  const recentEvidence = resolvedMetrics.recent_learning_evidence || [];

  const totalStudents = classSummary.total_students || classroom?.student_count || 0;
  const overallScore = classSummary.overall_score ?? classHealth.classAverage ?? null;
  const scoreChange = classSummary.score_change ?? 0;
  const completionRate = classSummary.task_completion_rate ?? classHealth.completionRate ?? null;
  const participationRate = classSummary.engagement_rate ?? classHealth.participationRate ?? null;
  const strugglingCount = classHealth.strugglingCount ?? studentsNeedingAttention.length;

  // Multi-source Evidence Summary Counts
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

  // Section 1: Class Performance — Max 10 clean canonical concept bars (No raw JSON, no duplicates)
  const sortedTopics = useMemo(() => {
    const rawTopics = (resolvedMetrics.topics && resolvedMetrics.topics.length > 0)
      ? resolvedMetrics.topics
      : topicPerformance;

    const seenNames = new Set<string>();
    const cleaned = [];

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

    // Sort by lowest score first, maximum 10 bars
    return cleaned.sort((a, b) => a.score - b.score).slice(0, 10);
  }, [resolvedMetrics.topics, topicPerformance]);

  // Section 2: What Your Students Are Struggling With — Maximum 5 clean, evidence-backed diagnostic cards
  const learningGaps = useMemo(() => {
    const rawGaps = resolvedMetrics.learningGapPriority || [];
    const seen = new Set<string>();
    const validGaps = [];

    for (const g of rawGaps) {
      const name = g.displayName || g.topic;
      if (!name || seen.has(name.toLowerCase())) continue;
      if (/session[-_]?id|final[-_]?rank|\{|\}/i.test(name)) continue;
      if (/^(?:grammar|spelling|writing|vocabulary|reading|general|other|task|assignment)$/i.test(name.trim())) continue;

      seen.add(name.toLowerCase());

      const sources = Array.isArray(g.sourcesList) && g.sourcesList.length > 0
        ? g.sourcesList
        : (Array.isArray(g.sources) ? g.sources : ['Task']);
      const isMultiSource = sources.length >= 2 || (g.affectedStudentsCount >= 2);
      const studentCount = g.affectedStudentsCount ?? g.studentCount ?? 1;
      const total = g.totalStudents || totalStudents || 1;
      const accuracy = g.accuracy != null ? Math.round(g.accuracy) : (g.averageAccuracy != null ? Math.round(g.averageAccuracy) : 0);
      const category = g.category || 'Grammar';
      const commonErrors = Array.isArray(g.commonErrors) ? g.commonErrors : (Array.isArray(g.common_errors) ? g.common_errors : []);
      const teachAction = g.teachAction || g.recommended_action || `Review foundational rules of ${name} with contrast practice.`;

      validGaps.push({
        rank: validGaps.length + 1,
        category,
        topic: g.topic,
        displayName: name,
        accuracy,
        studentCount,
        totalStudents: total,
        sources,
        confidence: g.confidence || (isMultiSource ? 'Confirmed gap' : 'Early signal'),
        commonErrors,
        teachAction
      });

      if (validGaps.length >= 5) break; // Maximum 5 learning gaps
    }

    return validGaps;
  }, [resolvedMetrics.learningGapPriority, totalStudents]);

  // Section 3: Teaching Focus — Single #1 Highest Priority Specific Concept
  const topGap = learningGaps[0] || null;
  const recommendedFocus = useMemo(() => {
    if (topGap) {
      return {
        displayName: topGap.displayName,
        topic: topGap.topic,
        accuracy: topGap.accuracy,
        studentCount: topGap.studentCount,
        totalStudents: topGap.totalStudents,
        teachAction: topGap.teachAction
      };
    }
    const focus = resolvedMetrics.recommendedTeachingFocus || teachNext[0];
    if (focus && focus.displayName && !/^(?:grammar|spelling|writing|vocabulary|reading|general)$/i.test(focus.displayName.trim())) {
      return {
        displayName: focus.displayName || focus.topic,
        topic: focus.topic,
        accuracy: focus.accuracy || focus.averageAccuracy || 50,
        studentCount: focus.studentsAffected || focus.studentCount || 1,
        totalStudents: focus.studentsTotal || totalStudents || 1,
        teachAction: focus.teachAction || focus.recommended_action || "Spend the next class period reviewing key rules with guided practice."
      };
    }
    return null;
  }, [topGap, resolvedMetrics.recommendedTeachingFocus, teachNext, totalStudents]);

  // Section 4: Students Needing Support (with real names and specific weak concepts)
  const supportStudentsList = useMemo(() => {
    const list = resolvedMetrics.studentsNeedingSupport || [];
    if (list.length > 0) {
      return list.map((s: any) => ({
        studentId: s.studentId,
        studentName: s.studentName || s.fullName || 'Student',
        averagePercentage: s.averagePercentage != null ? Math.round(s.averagePercentage) : null,
        specificWeakConcepts: Array.isArray(s.specificWeakConcepts) && s.specificWeakConcepts.length > 0
          ? s.specificWeakConcepts
          : (s.weakAreas?.map((w: any) => w.displayName || w.topic) || ['Targeted Concept Review'])
      })).slice(0, 6);
    }

    return studentsNeedingAttention.map((s: any) => ({
      studentId: s.studentId || s.id,
      studentName: s.student_ref || s.name || s.fullName || 'Student',
      averagePercentage: s.average_score != null ? Math.round(s.average_score) : null,
      specificWeakConcepts: s.main_weakness ? [s.main_weakness] : ['Core Concept Review']
    })).slice(0, 6);
  }, [resolvedMetrics.studentsNeedingSupport, studentsNeedingAttention]);

  // Section 5: Class Strengths (Deduplicated concepts >= 75%)
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

        {/* Evidence Sources Badges */}
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

      <hr className="border-[#C9E5E2]" />

      {/* 2. CLASS PERFORMANCE (MAX 10 CLEAN BARS AGAINST 70% TARGET) */}
      <section>
        <div className="mb-3.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Class Performance</h2>
          <p className="text-xs text-[#36565A] mt-0.5">Assessed concept accuracy against the 70% curriculum mastery benchmark.</p>
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
              
              {sortedTopics.map((t, i) => (
                <div key={i} className="relative z-10">
                  <div className="flex justify-between text-xs font-bold text-[#173B3F] mb-1">
                    <span className="truncate pr-2">{t.displayName}</span>
                    <span className="shrink-0 font-mono font-black" style={{ color: getBarColor(t.score) }}>{t.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(0, t.score))}%`, backgroundColor: getBarColor(t.score) }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* 3. WHAT YOUR STUDENTS ARE STRUGGLING WITH (MAXIMUM 5 CLEAN DIAGNOSTIC CARDS) */}
      <section>
        <div className="mb-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
              What Your Students Are Struggling With
            </h2>
            <p className="text-xs text-[#36565A] mt-0.5">
              Specific, evidence-backed learning gaps and target 1-lesson teaching actions.
            </p>
          </div>
          {learningGaps.length > 0 && (
            <span className="text-xs font-bold text-[#087477] bg-teal-50 px-3 py-0.5 rounded-full border border-teal-200">
              {learningGaps.length} Priority {learningGaps.length === 1 ? 'Gap' : 'Gaps'}
            </span>
          )}
        </div>

        {!hasEvidence || learningGaps.length === 0 ? (
          <div className="bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] p-8 text-center">
            <Target className="w-8 h-8 text-[#159A9C] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#173B3F]">
              {!hasEvidence ? "Not enough evidence yet." : "No learning gaps identified yet."}
            </p>
            <p className="text-xs text-[#36565A] mt-1">
              {!hasEvidence 
                ? "Have students complete worksheets, tasks, or exams to unlock diagnostic insights."
                : "All assessed concepts currently meet or exceed the 70% mastery threshold."}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {learningGaps.map((gap) => (
              <div 
                key={gap.rank || gap.displayName} 
                className="bg-white rounded-xl border border-[#C9E5E2] p-4.5 shadow-2xs hover:border-[#159A9C]/60 transition-all space-y-3"
              >
                {/* Header Row: Rank + Category + Concept Name + Ratio + Confidence */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-full bg-[#173B3F] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                        {gap.rank}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getCategoryBadgeColor(gap.category)}`}>
                        {gap.category}
                      </span>

                      <h3 className="text-sm sm:text-base font-black text-[#173B3F]">
                        {gap.displayName}
                      </h3>
                      
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                        gap.confidence === 'Confirmed gap'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {gap.confidence}
                      </span>
                    </div>

                    {/* Ratio & Accuracy */}
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-[#173B3F] flex-wrap">
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-black"
                        style={{ backgroundColor: getBarColor(gap.accuracy) + '20', color: getBarColor(gap.accuracy) }}
                      >
                        {gap.accuracy}% accuracy
                      </span>

                      <span>•</span>

                      <span className="text-[#36565A]">
                        <strong className="text-[#173B3F]">{gap.studentCount}</strong> of <strong className="text-[#173B3F]">{gap.totalStudents}</strong> students
                      </span>

                      <span>•</span>

                      {/* Evidence in */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[11px] text-[#36565A] font-medium">Evidence in:</span>
                        {(gap.sources || []).map((source: string, idx: number) => (
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
                      onClick={() => handleNavigation('evidence-reports', { topic: gap.displayName || gap.topic })}
                      className="px-3 py-1.5 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#087477]" />
                      View Evidence
                    </button>
                    <button 
                      onClick={() => handleNavigation('teaching', { topic: gap.topic })}
                      className="px-3 py-1.5 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      Teach This
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Common Student Errors Box */}
                {gap.commonErrors && gap.commonErrors.length > 0 && (
                  <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-2.5 text-xs space-y-1">
                    <div className="font-bold text-[#92400E] flex items-center gap-1.5 text-[11px]">
                      <AlertCircle className="w-3 h-3 text-[#D97706]" />
                      <span>Common error:</span>
                    </div>
                    <div className="space-y-0.5 pl-4">
                      {gap.commonErrors.slice(0, 2).map((err: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs flex-wrap font-sans">
                          <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 font-mono font-medium text-[11px]">
                            {err.student_error}
                          </span>
                          <span className="text-slate-400 font-bold">→</span>
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono font-bold text-[11px]">
                            {err.correct_form}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teach Callout */}
                <div className="text-xs text-[#173B3F] bg-[#E8F7F5] p-2.5 rounded-lg border border-[#C9E5E2] flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-[#087477] shrink-0 mt-0.5" />
                  <div className="flex-1 text-[11px] leading-relaxed">
                    <span className="font-bold text-[#087477]">Teach: </span>
                    <InlineMarkdown text={gap.teachAction || "Review core concept with guided examples."} />
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* 4. TEACHING FOCUS (ONE CLEAR PRIORITY) */}
      <section>
        <div className="bg-gradient-to-r from-[#F0FDF4] to-[#F8FCFB] rounded-xl border border-[#C9E5E2] border-l-4 border-l-[#159A9C] p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#087477]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-[#087477]">Teaching Focus</h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
              #1 Priority
            </span>
          </div>

          {recommendedFocus ? (
            <div className="space-y-2.5">
              <h3 className="text-sm sm:text-base font-black text-[#173B3F]">
                Your class currently needs support with:{' '}
                <span className="text-[#087477]">{recommendedFocus.displayName}</span>
              </h3>

              <div className="flex items-center gap-3 text-xs text-[#36565A]">
                <span>{recommendedFocus.studentCount} of {recommendedFocus.totalStudents} students affected</span>
                <span>•</span>
                <span className="font-bold text-rose-600">{recommendedFocus.accuracy}% accuracy</span>
              </div>

              <p className="text-xs text-[#173B3F] leading-relaxed">
                <strong className="text-[#087477]">Teach next: </strong>
                <InlineMarkdown text={recommendedFocus.teachAction} />
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                <button 
                  onClick={() => handleNavigation('teaching', { topic: recommendedFocus.topic })}
                  className="px-3.5 py-1.5 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  Teach This Concept <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleNavigation('evidence-reports', { topic: recommendedFocus.displayName })}
                  className="px-3.5 py-1.5 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#087477]" />
                  View Diagnostic Evidence
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#36565A] font-semibold">
              No clear teaching priority yet. Complete student assessments to identify focal areas.
            </p>
          )}
        </div>
      </section>

      {/* 5. SUPPORTING PANELS: Students Needing Support & Class Strengths */}
      <section className="space-y-6 pt-1">
        {/* Students Needing Support */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Students Needing Support</h2>
            {supportStudentsList.length > 0 && (
              <span className="text-[11px] font-bold text-[#087477]">
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
                    className="bg-white border border-[#C9E5E2] hover:border-amber-300 rounded-xl p-3 shadow-2xs cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#087477] font-black text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-[#173B3F] truncate pr-2">{sName}</span>
                        {student.averagePercentage != null && (
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                            {student.averagePercentage}%
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#36565A] mt-0.5 line-clamp-1 font-medium">
                        {student.specificWeakConcepts?.join(', ') || "Needs concept review"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Class Strengths */}
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
