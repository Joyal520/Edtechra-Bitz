// ============================================================================
// EDTECHRA TEACHING INTELLIGENCE: INSIGHT TAB (PART A.1)
// The primary, default overview for teachers:
// 1. Classroom Pulse (4 key high-contrast metrics)
// 2. What Are Students Struggling With? (The Learning Gap Core)
// 3. Supporting 4-Source Evidence (Tasks, Quizzes, Assessments, Competitions)
// 4. Concise AI Insight (1-2 sentences)
// 5. Pedagogical Recommendation & [Create Learning Material] Action
// 6. Compact Recent Evidence Stream
// ============================================================================

import React from 'react';
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ClipboardCheck,
  Zap,
  BookOpen,
  Trophy,
  Award,
  ChevronRight
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { TeachingIntelligenceResponse } from '@/services/teachingIntelligenceService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';

interface InsightTabProps {
  classroom: Classroom;
  data: TeachingIntelligenceResponse | null;
  onNavigateToTeaching: (targetTopic?: string) => void;
  onNavigateToStudents: () => void;
  onNavigateToEvidence?: () => void;
  onOpenExamAnalysis?: (examId: string) => void;
  onGenerateAnalysis?: () => void;
  refreshing?: boolean;
}

export const InsightTab: React.FC<InsightTabProps> = ({
  classroom,
  data,
  onNavigateToTeaching,
  onNavigateToStudents,
  onNavigateToEvidence,
  onOpenExamAnalysis,
  onGenerateAnalysis,
  refreshing = false
}) => {
  const metrics = data?.metrics?.class_summary;
  const classHealth = data?.metrics?.class_health;
  const intel = data?.intelligence;
  const topicPerf = data?.metrics?.topic_performance || [];
  const activityBreakdown = data?.metrics?.activity_breakdown || {};
  const recentEvidence = data?.metrics?.recent_learning_evidence || [];

  const totalStudents = metrics?.total_students || classroom.student_count || 0;
  const strugglingCount = classHealth?.strugglingCount ?? (data?.metrics?.students_needing_attention?.length || 0);

  // Identify the Primary Learning Gap (Weakest Topic)
  const primaryTeachNext = intel?.teach_next?.[0];
  const weakestTopicFromMetrics = data?.metrics?.top_weaknesses?.[0] || topicPerf.find(t => t.score < 65) || topicPerf[0];

  const learningGapTopic = primaryTeachNext?.topic || weakestTopicFromMetrics?.topic || 'Core Curriculum Skills';
  const fallbackScore = weakestTopicFromMetrics
    ? ('score' in weakestTopicFromMetrics ? (weakestTopicFromMetrics as any).score : (weakestTopicFromMetrics as any).averageScore)
    : null;
  const learningGapScore = primaryTeachNext?.current_performance ?? fallbackScore ?? null;
  const studentsNeedingSupportForTopic = Math.min(strugglingCount > 0 ? strugglingCount : 1, totalStudents > 0 ? totalStudents : 1);

  // Derive 4-Source Evidence breakdown for this topic or classroom
  const taskAvg = activityBreakdown.assignment?.averagePercentage ?? null;
  const quizAvg = activityBreakdown.live_quiz?.averagePercentage ?? null;
  const examAvg = activityBreakdown.exam?.averagePercentage ?? null;
  const challengeAvg = activityBreakdown.ai_challenge?.averagePercentage ?? null;

  // Derive concise AI insight (1-2 sentences)
  const aiInsightText = primaryTeachNext?.why || (intel?.summary ? intel.summary.split('. ').slice(0, 2).join('. ') + '.' : null);

  // Recommendation & Action
  const recommendationText = primaryTeachNext?.recommended_action || (intel?.recommended_actions?.[0] as any)?.recommendation || 'Dedicate the next lesson to guided review of this concept with scaffolded practice.';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* =================================================================== */}
      {/* 1. CLASSROOM PULSE (REAL DATA, HIGH CONTRAST)                      */}
      {/* =================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#36565A]">
            Classroom Pulse
          </span>
          <span className="text-[11px] font-bold text-[#36565A]">
            {totalStudents} {totalStudents === 1 ? 'Student' : 'Students Enrolled'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Pulse Card 1: Class Performance */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#C9E5E2] shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#36565A] block">
              Class Performance
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#173B3F]">
                {classHealth?.classAverage != null ? `${classHealth.classAverage}%` : metrics?.overall_score != null ? `${metrics.overall_score}%` : '—'}
              </span>
              {metrics?.score_change != null && metrics.score_change !== 0 && (
                <span className={`text-xs font-black flex items-center gap-0.5 ${
                  metrics.score_change >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {metrics.score_change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{metrics.score_change >= 0 ? `+${metrics.score_change}%` : `${metrics.score_change}%`}</span>
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-[#36565A] mt-1 block">
              Weighted across all activities
            </span>
          </div>

          {/* Pulse Card 2: Task Completion */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#C9E5E2] shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#36565A] block">
              Task Completion
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#173B3F]">
                {classHealth?.completionRate ?? metrics?.task_completion_rate ?? 0}%
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#36565A] mt-1 block">
              Submitted classroom tasks
            </span>
          </div>

          {/* Pulse Card 3: Active Participation */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#C9E5E2] shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#36565A] block">
              Active Participation
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#159A9C]">
                {classHealth?.participationRate ?? metrics?.engagement_rate ?? 0}%
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#36565A] mt-1 block">
              Active student engagement
            </span>
          </div>

          {/* Pulse Card 4: Students Needing Support */}
          <div 
            onClick={onNavigateToStudents}
            className="bg-[#E8F7F5] p-4 sm:p-5 rounded-2xl border border-[#C9E5E2] shadow-xs hover:border-[#159A9C] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#087477] block">
                Needs Support
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#087477] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#087477]">
                {strugglingCount}
              </span>
              <span className="text-xs font-bold text-[#36565A]">
                of {totalStudents} students
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#087477] mt-1 block group-hover:underline">
              View student roster →
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. CORE: WHAT ARE STUDENTS STRUGGLING WITH? (LEARNING GAP)          */}
      {/* =================================================================== */}
      {(!data?.has_analysis && !intel) ? (
        /* Empty / Not Generated Yet Card */
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#C9E5E2] text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] text-[#087477] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-black text-[#173B3F]">
              AI Classroom Diagnosis Ready
            </h3>
            <p className="text-xs font-medium text-[#36565A] leading-relaxed">
              Synthesize learning evidence across Tasks, Quizzes, Assessments, and Competitions to reveal your classroom’s primary learning gap.
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerateAnalysis}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Analyzing Evidence...' : 'Generate AI Diagnosis'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* THE CORE LEARNING GAP CARD */}
          <div className="bg-gradient-to-br from-[#173B3F] via-[#1a4247] to-[#0d2a2d] text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden border border-[#173B3F]">
            
            {/* Subtle ambient light */}
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#159A9C]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              
              {/* Top Tag & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider">
                    Primary Learning Gap
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    Critical concept requiring pedagogical intervention
                  </span>
                </div>
                
                {totalStudents > 0 && (
                  <span className="text-xs font-black text-rose-200 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-500/30 w-fit">
                    {studentsNeedingSupportForTopic} of {totalStudents} students need support
                  </span>
                )}
              </div>

              {/* Learning Gap Topic Headline */}
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {learningGapTopic}
                </h3>
                {learningGapScore != null && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-black text-rose-300">
                      {learningGapScore}% Average Performance
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      (Target Benchmark: 70%+)
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Visual Bar */}
              {learningGapScore != null && (
                <div className="space-y-1.5">
                  <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        learningGapScore < 50
                          ? 'bg-rose-500'
                          : learningGapScore < 70
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.max(8, Math.min(100, learningGapScore))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                    <span>0% (Critical)</span>
                    <span>50% (Developing)</span>
                    <span>70% (Target)</span>
                    <span>100% (Mastery)</span>
                  </div>
                </div>
              )}

              {/* Supporting 4-Source Evidence Breakdown */}
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D4EFEC] block mb-2.5">
                  Supporting Evidence Across Learning Activities
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  
                  {/* Source 1: Tasks */}
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Tasks</span>
                    <span className="text-base font-black text-white mt-0.5 block">
                      {taskAvg != null ? `${Math.round(taskAvg)}%` : '—'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {activityBreakdown.assignment?.eventCount || 0} evaluated
                    </span>
                  </div>

                  {/* Source 2: Live Quizzes */}
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Live Quizzes</span>
                    <span className="text-base font-black text-white mt-0.5 block">
                      {quizAvg != null ? `${Math.round(quizAvg)}%` : '—'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {activityBreakdown.live_quiz?.eventCount || 0} sessions
                    </span>
                  </div>

                  {/* Source 3: Assessments */}
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Assessments</span>
                    <span className="text-base font-black text-white mt-0.5 block">
                      {examAvg != null ? `${Math.round(examAvg)}%` : '—'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {activityBreakdown.exam?.eventCount || 0} completed
                    </span>
                  </div>

                  {/* Source 4: Competitions */}
                  <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 text-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase block">Competitions</span>
                    <span className="text-base font-black text-white mt-0.5 block">
                      {challengeAvg != null ? `${Math.round(challengeAvg)}%` : '—'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {activityBreakdown.ai_challenge?.eventCount || 0} entries
                    </span>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* =============================================================== */}
          {/* 3. AI INSIGHT & 4. RECOMMENDATION + [CREATE LEARNING MATERIAL]  */}
          {/* =============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* AI Insight Card (5 cols on desktop) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#C9E5E2] shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-[#087477]">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                  AI Pedagogical Diagnosis
                </h4>
              </div>
              <p className="text-sm font-semibold text-[#173B3F] leading-relaxed">
                {aiInsightText ? (
                  <InlineMarkdown text={aiInsightText} />
                ) : (
                  `Students require targeted instruction in ${learningGapTopic} based on recent classroom evidence.`
                )}
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#E8F7F5] text-[#087477] border border-[#C9E5E2]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#159A9C]" />
                  Zero Hallucination • Grounded Evidence
                </span>
              </div>
            </div>

            {/* Recommendation & Direct Action Card (7 cols on desktop) */}
            <div className="lg:col-span-7 bg-[#E8F7F5] rounded-3xl p-5 sm:p-6 border border-[#C9E5E2] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#087477]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#087477]">
                      Recommended Teacher Action
                    </h4>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full text-[#087477] border border-[#C9E5E2]">
                    High Impact
                  </span>
                </div>

                <p className="text-sm font-bold text-[#173B3F] leading-relaxed">
                  <InlineMarkdown text={recommendationText} />
                </p>
              </div>

              {/* Action Button: Starts the Teaching Loop */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateToTeaching(learningGapTopic)}
                  className="px-5 py-3 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm shadow-[#087477]/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Create Learning Material</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Secondary Weak Topics (if multiple exist) */}
          {topicPerf.filter(t => t.score < 65 && t.topic !== learningGapTopic).length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#C9E5E2] space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#36565A]">
                Additional Identified Areas for Growth
              </span>
              <div className="flex flex-wrap gap-2">
                {topicPerf.filter(t => t.score < 65 && t.topic !== learningGapTopic).map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigateToTeaching(t.topic)}
                    className="px-3 py-1.5 bg-[#E8F7F5] hover:bg-[#D4EFEC] border border-[#C9E5E2] rounded-xl text-xs font-bold text-[#173B3F] flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <span>{t.topic}</span>
                    <span className="text-[10px] font-black text-rose-700 bg-white px-2 py-0.5 rounded-md">
                      {t.score}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* =================================================================== */}
      {/* 5. RECENT EVIDENCE STREAM (COMPACT, NON-REPETITIVE)                 */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C9E5E2] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F7F5] text-[#087477] border border-[#C9E5E2] flex items-center justify-center font-black">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                Recent Learning Evidence
              </h4>
              <p className="text-[11px] text-[#36565A] font-medium">
                Latest student evaluations and activity submissions across the 4 classroom sources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#087477] bg-[#E8F7F5] px-2.5 py-1 rounded-full border border-[#C9E5E2]">
              {recentEvidence.length} Events
            </span>
            {onNavigateToEvidence && (
              <button
                type="button"
                onClick={onNavigateToEvidence}
                className="text-xs text-[#087477] hover:underline font-bold cursor-pointer"
              >
                View All &rarr;
              </button>
            )}
          </div>
        </div>

        {recentEvidence.length === 0 ? (
          <div className="py-8 text-center text-[#36565A] text-xs font-semibold bg-[#E8F7F5]/40 rounded-2xl border border-dashed border-[#C9E5E2]">
            No recent submissions recorded yet. Have students complete tasks or quizzes to stream learning evidence here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto pr-1">
            {recentEvidence.slice(0, 8).map((ev: any) => {
              const typeIcon =
                ev.activityType === 'exam' ? <Award className="w-3.5 h-3.5 text-indigo-600" /> :
                ev.activityType === 'live_quiz' ? <Zap className="w-3.5 h-3.5 text-amber-500" /> :
                ev.activityType === 'ai_challenge' ? <Trophy className="w-3.5 h-3.5 text-purple-600" /> :
                <BookOpen className="w-3.5 h-3.5 text-[#087477]" />;

              return (
                <div key={ev.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                      {typeIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#173B3F] truncate">
                          {ev.studentName}
                        </span>
                        <span className="text-[10px] text-[#36565A] truncate">
                          in {ev.activityTitle}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#36565A] font-medium block">
                        Topic: {ev.topic || 'General'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ev.percentage != null ? (
                      <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                        ev.percentage >= 75
                          ? 'bg-emerald-50 text-emerald-800'
                          : ev.percentage < 60
                          ? 'bg-rose-50 text-rose-800'
                          : 'bg-[#E8F7F5] text-[#087477]'
                      }`}>
                        {ev.percentage}%
                      </span>
                    ) : ev.score != null ? (
                      <span className="text-xs font-bold text-[#173B3F]">
                        {ev.score} pts
                      </span>
                    ) : null}

                    {ev.activityType === 'exam' && onOpenExamAnalysis && (
                      <button
                        type="button"
                        onClick={() => onOpenExamAnalysis(ev.activityId || ev.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-[#087477] transition-colors cursor-pointer"
                        title="View Detailed Exam Analysis"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
