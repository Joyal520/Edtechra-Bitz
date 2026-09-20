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
  FileText
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
  onNavigateToTab?: (tab: string, context?: { topic?: string, studentId?: string }) => void;
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
  const handleNavigation = (tab: string, context?: { topic?: string, studentId?: string }) => {
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
  const topWeaknesses = resolvedMetrics.top_weaknesses || [];
  const topStrengths = resolvedMetrics.top_strengths || [];
  const teachNext = resolvedIntelligence?.teach_next || [];
  const studentsNeedingAttention = resolvedMetrics.students_needing_attention || [];
  const recentEvidence = resolvedMetrics.recent_learning_evidence || [];

  // Data for Section 1: Classroom Pulse
  const totalStudents = classSummary.total_students || classroom?.student_count || 0;
  const overallScore = classSummary.overall_score ?? classHealth.classAverage ?? null;
  const scoreChange = classSummary.score_change ?? 0;
  const completionRate = classSummary.task_completion_rate ?? classHealth.completionRate ?? null;
  const participationRate = classSummary.engagement_rate ?? classHealth.participationRate ?? null;
  const strugglingCount = classHealth.strugglingCount ?? studentsNeedingAttention.length;

  // Data for Section 2: Current Learning Gaps
  const learningGaps = useMemo(() => {
    if (resolvedMetrics.learningGapPriority && resolvedMetrics.learningGapPriority.length > 0) {
      return resolvedMetrics.learningGapPriority.map((g: any) => {
        const sources = Array.isArray(g.sources) ? g.sources : (g.sources > 1 ? ['Task', 'Live Quiz'] : ['Assessment']);
        const isMultiSource = sources.length >= 2;
        const studentCount = g.affectedStudentsCount ?? g.studentCount ?? 1;
        const total = g.totalStudents || totalStudents || 1;
        const accuracy = g.accuracy != null ? Math.round(g.accuracy) : 0;
        const displayName = g.displayName || (g.skill ? `${g.topic} — ${g.skill}` : g.topic);
        const category = g.category || 'General';

        return {
          category,
          topic: g.topic,
          baseTopic: g.baseTopic || g.topic,
          skill: g.skill,
          displayName,
          accuracy,
          studentCount,
          totalStudents: total,
          sources,
          confidence: g.confidence || (isMultiSource ? 'Confirmed gap' : 'Early signal'),
          diagnosis: g.why || `${studentCount} of ${total} students scored below mastery (${accuracy}% accuracy) across ${sources.join(', ')}.`,
          recommended_action: g.recommended_action || `Review key rules of ${displayName} with guided practice before next assessment.`
        };
      });
    }

    if (topWeaknesses.length > 0) {
      return topWeaknesses
        .filter((w: any) => (w.score ?? w.averageScore ?? 0) > 0)
        .map((w: any) => {
          const sources = w.eventsCount > 2 ? ['Task', 'Live Quiz'] : ['Assessment'];
          const studentCount = Math.min(totalStudents, w.eventsCount || strugglingCount || 1);
          const accuracy = Math.round(w.score ?? w.averageScore ?? 0);
          return {
            category: 'Curriculum',
            topic: w.topic,
            baseTopic: w.baseTopic || w.topic,
            skill: w.skill || null,
            displayName: w.topic,
            accuracy,
            studentCount,
            totalStudents: totalStudents || 1,
            sources,
            confidence: w.eventsCount > 2 ? 'Confirmed gap' : 'Early signal',
            diagnosis: `${studentCount} of ${totalStudents} students scored below mastery (${accuracy}% accuracy) across ${sources.join(', ')}.`,
            recommended_action: `Review key rules of ${w.topic} with guided practice before next assessment.`
          };
        });
    }

    return topicPerformance
      .filter((t: any) => (t.score ?? 0) > 0 && (t.score ?? 0) < 70)
      .map((t: any) => {
        const studentCount = Math.max(1, Math.min(totalStudents, strugglingCount));
        const accuracy = Math.round(t.score ?? 0);
        return {
          category: 'Curriculum',
          topic: t.topic,
          baseTopic: t.topic,
          skill: null,
          displayName: t.topic,
          accuracy,
          studentCount,
          totalStudents: totalStudents || 1,
          sources: ['Class Assessments'],
          confidence: 'Early signal',
          diagnosis: `${studentCount} of ${totalStudents} students scored below mastery (${accuracy}% accuracy) across assessments.`,
          recommended_action: `Review key rules of ${t.topic} with guided practice before next assessment.`
        };
      });
  }, [resolvedMetrics.learningGapPriority, topWeaknesses, topicPerformance, totalStudents, strugglingCount]);

  // Section 3: Topic Accuracy Chart Data
  const sortedTopics = useMemo(() => {
    return topicPerformance
      .filter((t: any) => t.topic && (t.score > 0 || (t.eventsCount && t.eventsCount > 0)))
      .sort((a: any, b: any) => a.score - b.score);
  }, [topicPerformance]);

  // Section 4: Performance Over Time (Date-Aggregated & Chronological)
  const lineChartData = useMemo(() => {
    const rawData = resolvedMetrics.performance_over_time || 
                    resolvedMetrics.performanceOverTime || 
                    resolvedMetrics.trendData;
    if (Array.isArray(rawData) && rawData.length > 0) {
      return rawData.map((d: any) => ({
        date: d.date || (d.timestamp ? new Date(d.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''),
        value: typeof d.value === 'number' ? Math.round(d.value) : (typeof d.score === 'number' ? Math.round(d.score) : 0),
        count: d.count || d.eventCount || 1
      })).filter((d: any) => Boolean(d.date) && d.value >= 0);
    }

    if (recentEvidence.length > 0) {
      const dateMap = new Map<string, { totalScore: number; count: number; dateStr: string; time: number }>();
      
      recentEvidence.forEach((e: any) => {
        const rawDate = e.latestCompletedAt || e.completedAt;
        if (!rawDate) return;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return;
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const score = e.averagePercentage ?? e.score ?? null;
        if (score === null || isNaN(score) || score <= 0) return;

        const current = dateMap.get(dateKey) || {
          totalScore: 0,
          count: 0,
          dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          time: d.getTime()
        };
        current.totalScore += Number(score);
        current.count += 1;
        dateMap.set(dateKey, current);
      });

      return Array.from(dateMap.entries())
        .sort((a, b) => a[1].time - b[1].time)
        .map(([, v]) => ({
          date: v.dateStr,
          value: Math.round(v.totalScore / v.count),
          count: v.count
        }));
    }

    return [];
  }, [resolvedMetrics.performance_over_time, resolvedMetrics.performanceOverTime, resolvedMetrics.trendData, recentEvidence]);

  // Fixed SVG Coordinate Specs for Line Chart
  const chartWidth = 500;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotWidth = chartWidth - paddingLeft - paddingRight; // 436
  const plotHeight = chartHeight - paddingTop - paddingBottom; // 130

  const chartPoints = useMemo(() => {
    if (lineChartData.length === 0) return [];
    if (lineChartData.length === 1) {
      const val = Math.min(100, Math.max(0, lineChartData[0].value));
      return [{
        x: paddingLeft + plotWidth / 2,
        y: paddingTop + plotHeight - (val / 100) * plotHeight,
        date: lineChartData[0].date,
        value: val,
        count: lineChartData[0].count || 1
      }];
    }
    return lineChartData.map((d: any, i: number) => {
      const val = Math.min(100, Math.max(0, d.value));
      return {
        x: paddingLeft + (i / (lineChartData.length - 1)) * plotWidth,
        y: paddingTop + plotHeight - (val / 100) * plotHeight,
        date: d.date,
        value: val,
        count: d.count || 1
      };
    });
  }, [lineChartData, paddingLeft, plotWidth, paddingTop, plotHeight]);

  const targetY = paddingTop + plotHeight - 0.70 * plotHeight; // 70% Target benchmark line

  const linePathD = useMemo(() => {
    if (chartPoints.length < 2) return '';
    return `M ${chartPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`;
  }, [chartPoints]);

  const areaPathD = useMemo(() => {
    if (chartPoints.length < 2) return '';
    const bottomY = paddingTop + plotHeight;
    const firstX = chartPoints[0].x.toFixed(1);
    const lastX = chartPoints[chartPoints.length - 1].x.toFixed(1);
    return `M ${firstX},${bottomY} L ${chartPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} L ${lastX},${bottomY} Z`;
  }, [chartPoints, paddingTop, plotHeight]);

  // Section 5: Teaching Focus (Compact callout for #1 priority concept)
  const topGap = learningGaps[0] || null;
  const recommendedFocus = resolvedMetrics.recommendedTeachingFocus || teachNext[0] || (topGap ? {
    topic: topGap.topic,
    displayName: topGap.displayName,
    why: topGap.diagnosis,
    recommended_action: topGap.recommended_action
  } : null);

  // Supporting Data
  const strengthsList = resolvedMetrics.classStrengths || topStrengths.map((s: any) => ({ topic: s.topic, accuracy: s.score || s.averageScore }));
  if (strengthsList.length === 0) {
    topicPerformance.filter((t: any) => t.score >= 75).forEach((t: any) => {
      strengthsList.push({ topic: t.topic, accuracy: t.score });
    });
  }
  const supportStudentsList = resolvedMetrics.studentsNeedingSupport || studentsNeedingAttention;

  // Helper colors
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      
      {/* 1. CLASSROOM PULSE */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Classroom Pulse</h2>
          <span className="text-xs font-bold text-[#36565A]">{totalStudents} Students</span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-sm flex flex-col justify-between">
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
          
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-[#36565A]">Task Completion Rate</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173B3F]">
                {completionRate != null ? `${completionRate}%` : '--'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-[#36565A]">Active Participation</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173B3F]">
                {participationRate != null ? `${participationRate}%` : '--'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#C9E5E2] p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-[#36565A]">Students Needing Support</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#173B3F]">
                {strugglingCount != null ? strugglingCount : '--'}
              </span>
              {totalStudents > 0 && <span className="text-xs text-[#36565A]">/ {totalStudents}</span>}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* 2. CURRENT LEARNING GAPS (WHAT ARE MY STUDENTS STRUGGLING WITH?) */}
      <section>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Current Learning Gaps</h2>
            <span className="text-xs font-bold text-[#087477]">
              {learningGaps.length} Identified {learningGaps.length === 1 ? 'Gap' : 'Gaps'}
            </span>
          </div>
          <p className="text-xs text-[#36565A] mt-1">
            Specific skills and concepts that need attention based on recent student evidence.
          </p>
        </div>

        {learningGaps.length === 0 ? (
          <div className="bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] p-8 text-center">
            <Target className="w-8 h-8 text-[#159A9C] mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-[#173B3F]">No learning gaps identified yet.</p>
            <p className="text-xs text-[#36565A] mt-1">All assessed concepts currently meet or exceed the 70% mastery threshold.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {learningGaps.map((gap: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-xs hover:border-[#159A9C]/50 transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  
                  <div className="space-y-3 flex-1">
                    {/* Header: Category Badge + Concept Name + Stats */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${getCategoryBadgeColor(gap.category)}`}>
                        {gap.category}
                      </span>

                      <h3 className="text-base font-black text-[#173B3F]">
                        {gap.displayName || gap.topic}
                      </h3>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                        gap.confidence === 'Confirmed gap' || gap.sources?.length > 1
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {gap.confidence}
                      </span>
                    </div>

                    {/* Grounded Evidence Details */}
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#173B3F] flex-wrap">
                      <span 
                        className="px-2 py-0.5 rounded text-xs font-black"
                        style={{ backgroundColor: getBarColor(gap.accuracy) + '20', color: getBarColor(gap.accuracy) }}
                      >
                        {gap.accuracy}% class accuracy
                      </span>

                      <span>•</span>

                      <span className="text-[#36565A]">
                        <strong className="text-[#173B3F]">{gap.studentCount}</strong> of <strong className="text-[#173B3F]">{gap.totalStudents}</strong> students affected
                      </span>

                      <span>•</span>

                      {/* Evidence Source Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-[#36565A] font-medium">Evidence in:</span>
                        {(gap.sources || []).map((source: string, idx: number) => (
                          <span key={idx} className="text-[11px] font-bold px-2 py-0.5 bg-[#F8FCFB] border border-[#C9E5E2] rounded text-[#173B3F]">
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Diagnosis Statement */}
                    {gap.diagnosis && (
                      <div className="text-xs text-[#173B3F] bg-[#E8F7F5] p-3 rounded-lg border border-[#C9E5E2] flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-[#087477] shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-bold text-[#087477]">Diagnosis: </span>
                          <InlineMarkdown text={gap.diagnosis} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleNavigation('evidence-reports', { topic: gap.displayName || gap.topic })}
                      className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors w-full cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#087477]" />
                      View Evidence
                    </button>
                    <button 
                      onClick={() => handleNavigation('teaching', { topic: gap.topic })}
                      className="px-4 py-2 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors w-full cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      Teach This
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* 3. CLASS PERFORMANCE (TOPIC ACCURACY HORIZONTAL BAR CHART) */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Class Performance</h2>
          <p className="text-xs text-[#36565A] mt-1">Class mastery across assessed curriculum topics.</p>
        </div>

        <div className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-xs">
          {sortedTopics.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-xs text-[#36565A] font-bold">No topic assessment data available yet.</span>
            </div>
          ) : (
            <div className="space-y-4 relative pb-4">
              {/* 70% Target Benchmark Line */}
              <div className="hidden sm:block absolute top-0 bottom-4 left-[70%] border-l-2 border-dashed border-teal-500/40 z-0"></div>
              <div className="hidden sm:block absolute bottom-0 left-[70%] text-[9px] font-bold text-teal-600 -translate-x-1/2">70% Target</div>
              
              {sortedTopics.map((t: any, i: number) => (
                <div key={i} className="relative z-10">
                  <div className="flex justify-between text-xs font-bold text-[#173B3F] mb-1.5">
                    <span className="truncate pr-2">{t.topic}</span>
                    <span className="shrink-0" style={{ color: getBarColor(t.score) }}>{t.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
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

      {/* 4. PERFORMANCE OVER TIME (CHRONOLOGICAL SVG LINE CHART) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Performance Over Time</h2>
            <p className="text-xs text-[#36565A] mt-1">Class assessment trend across chronological checkpoints.</p>
          </div>
          {lineChartData.length > 1 && (
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              {lineChartData.length} checkpoints
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-xs">
          {chartPoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-[#F8FCFB] rounded-lg border border-dashed border-[#C9E5E2]">
              <TrendingUp className="w-8 h-8 text-[#159A9C] mb-2 opacity-50" />
              <span className="text-xs font-bold text-[#173B3F]">Not enough historical data yet.</span>
              <span className="text-[11px] text-[#36565A] mt-0.5">Complete assessments to track class progress over time.</span>
            </div>
          ) : chartPoints.length === 1 ? (
            <div className="flex flex-col items-center justify-center p-4">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto max-h-[160px] overflow-visible">
                {/* Horizontal Gridlines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = paddingTop + plotHeight - (val / 100) * plotHeight;
                  return (
                    <g key={val}>
                      <line x1={paddingLeft} y1={y} x2={paddingLeft + plotWidth} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                      <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#36565A" fontWeight="600">{val}%</text>
                    </g>
                  );
                })}
                {/* Single Data Point */}
                <circle
                  cx={chartPoints[0].x}
                  cy={chartPoints[0].y}
                  r="6"
                  fill="#087477"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
                <text x={chartPoints[0].x} y={chartPoints[0].y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#087477">
                  {chartPoints[0].value}%
                </text>
                <text x={chartPoints[0].x} y={chartHeight - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#36565A">
                  {chartPoints[0].date}
                </text>
              </svg>
              <p className="text-[11px] text-[#36565A] text-center mt-2">
                1 checkpoint recorded ({chartPoints[0].date}: {chartPoints[0].value}%). More activity is needed to show a trend line.
              </p>
            </div>
          ) : (
            <div>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto max-h-[160px] overflow-visible">
                <defs>
                  <linearGradient id="performanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#159A9C" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#159A9C" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = paddingTop + plotHeight - (val / 100) * plotHeight;
                  return (
                    <g key={val}>
                      <line x1={paddingLeft} y1={y} x2={paddingLeft + plotWidth} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                      <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#36565A" fontWeight="600">{val}%</text>
                    </g>
                  );
                })}

                {/* 70% Target Benchmark Line */}
                <line
                  x1={paddingLeft}
                  y1={targetY}
                  x2={paddingLeft + plotWidth}
                  y2={targetY}
                  stroke="#14b8a6"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.8"
                />
                <text x={paddingLeft + plotWidth - 4} y={targetY - 3} textAnchor="end" fontSize="9" fill="#0d9488" fontWeight="700">
                  70% Target
                </text>

                {/* Gradient Fill Under Trend Line */}
                {areaPathD && (
                  <path d={areaPathD} fill="url(#performanceAreaGrad)" />
                )}

                {/* Connected Trend Line */}
                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="#087477"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points with Clean Circles and Hover Tooltips */}
                {chartPoints.map((p, idx) => (
                  <g key={idx} className="cursor-pointer group">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#087477"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="transition-all duration-150 group-hover:scale-125"
                    />
                    <title>{`${p.date}: ${p.value}% (${p.count} assessment${p.count > 1 ? 's' : ''})`}</title>
                  </g>
                ))}

                {/* X-Axis Date Labels */}
                {chartPoints.length > 0 && (
                  <g>
                    <text x={chartPoints[0].x} y={chartHeight - 8} textAnchor="start" fontSize="9" fontWeight="600" fill="#36565A">
                      {chartPoints[0].date}
                    </text>
                    {chartPoints.length >= 3 && (
                      <text x={chartPoints[Math.floor(chartPoints.length / 2)].x} y={chartHeight - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#36565A">
                        {chartPoints[Math.floor(chartPoints.length / 2)].date}
                      </text>
                    )}
                    <text x={chartPoints[chartPoints.length - 1].x} y={chartHeight - 8} textAnchor="end" fontSize="9" fontWeight="600" fill="#36565A">
                      {chartPoints[chartPoints.length - 1].date}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          )}
        </div>
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* 5. TEACHING FOCUS (COMPACT CALLOUT FOR #1 CONCEPT) */}
      {recommendedFocus && (
        <section>
          <div className="bg-gradient-to-r from-[#F0FDF4] to-[#F8FCFB] rounded-xl border border-[#C9E5E2] border-l-4 border-l-[#159A9C] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#087477]" />
                <h2 className="text-xs font-black uppercase tracking-wider text-[#087477]">Teaching Focus</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                Recommended Next Step
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-black text-[#173B3F]">
                Your class currently needs support with:{' '}
                <span className="text-[#087477]">{recommendedFocus.displayName || recommendedFocus.topic}</span>
              </h3>

              <p className="text-xs text-[#173B3F] leading-relaxed">
                <InlineMarkdown text={recommendedFocus.recommended_action || recommendedFocus.why || "Spend the next class period reviewing key rules with guided contrast examples, followed by immediate formative practice."} />
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  onClick={() => handleNavigation('teaching', { topic: recommendedFocus.topic })}
                  className="px-4 py-2 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  Teach This Concept <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleNavigation('evidence-reports', { topic: recommendedFocus.displayName || recommendedFocus.topic })}
                  className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#087477]" />
                  View Diagnostic Evidence
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. SUPPORTING PANELS: Students Needing Support & Class Strengths */}
      <section className="space-y-6 pt-2">
        {/* Students Needing Support */}
        {supportStudentsList.length > 0 && (
          <div>
            <div className="mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Students Needing Support</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {supportStudentsList.slice(0, 6).map((student: any, i: number) => (
                <div 
                  key={i} 
                  onClick={() => handleNavigation('students', { studentId: student.studentId || student.id })}
                  className="bg-white border border-[#C9E5E2] hover:border-amber-300 rounded-xl p-3.5 shadow-2xs cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                    {student.name?.[0] || student.student_ref?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-[#173B3F] truncate pr-2">{student.name || student.student_ref}</span>
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                        {student.average ?? student.average_score ?? '<60'}%
                      </span>
                    </div>
                    <p className="text-[10px] text-[#36565A] mt-1 line-clamp-1">
                      {student.issue || student.weakestArea || student.main_weakness || "Needs support in recent topics."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Class Strengths */}
        {strengthsList.length > 0 && (
          <div>
            <div className="mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">Class Strengths</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {strengthsList.map((s: any, i: number) => (
                <div key={i} className="bg-white border border-[#C9E5E2] rounded-xl p-3 shadow-2xs flex flex-col justify-between">
                  <span className="text-xs font-bold text-[#173B3F] mb-2 truncate">{s.topic}</span>
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
