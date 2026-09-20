import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Target,
  ArrowRight,
  Sparkles,
  BarChart3,
  UserX,
  Lightbulb,
  X,
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
  students,
  onNavigateToTab,
  onNavigateToTeaching,
  onNavigateToStudents,
  onNavigateToEvidence,
  onGenerateAnalysis: _onGenerateAnalysis,
  refreshing: _refreshing
}) => {
  const [selectedEvidenceGap, setSelectedEvidenceGap] = useState<any | null>(null);

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
  const resolvedStudents = students || data?.metrics?.students || [];

  const classSummary = resolvedMetrics.class_summary || {};
  const classHealth = resolvedMetrics.class_health || {};
  const topicPerformance = resolvedMetrics.topic_performance || [];
  const topWeaknesses = resolvedMetrics.top_weaknesses || [];
  const topStrengths = resolvedMetrics.top_strengths || [];
  const teachNext = resolvedIntelligence?.teach_next || [];
  const studentsNeedingAttention = resolvedMetrics.students_needing_attention || [];
  const recentEvidence = resolvedMetrics.recent_learning_evidence || [];

  // Data for Section A
  const totalStudents = classSummary.total_students || classroom?.student_count || 0;
  const overallScore = classSummary.overall_score ?? classHealth.classAverage ?? null;
  const scoreChange = classSummary.score_change ?? 0;
  const completionRate = classSummary.task_completion_rate ?? classHealth.completionRate ?? null;
  const participationRate = classSummary.engagement_rate ?? classHealth.participationRate ?? null;
  const strugglingCount = classHealth.strugglingCount ?? studentsNeedingAttention.length;

  // Data for Section B: Learning Gaps
  const learningGaps = useMemo(() => {
    if (resolvedMetrics.learningGapPriority && resolvedMetrics.learningGapPriority.length > 0) {
      return resolvedMetrics.learningGapPriority.map((g: any) => ({
        topic: g.topic,
        skill: g.skill,
        displayName: g.displayName || (g.skill ? `${g.topic} — ${g.skill}` : g.topic),
        accuracy: g.accuracy != null ? Math.round(g.accuracy) : 0,
        studentCount: g.affectedStudentsCount ?? g.studentCount ?? 1,
        totalStudents: g.totalStudents || totalStudents || 1,
        sources: Array.isArray(g.sources) ? g.sources : (g.sources > 1 ? ['Task', 'Live Quiz'] : ['Assessment']),
        confidence: g.confidence || (g.sources?.length > 1 ? 'CONFIRMED GAP' : 'EARLY SIGNAL'),
        evidenceList: g.evidenceList || [],
        why: teachNext.find((t: any) => t.topic === g.topic || t.topic === g.displayName)?.why || null
      }));
    }

    if (topWeaknesses.length > 0) {
      return topWeaknesses
        .filter((w: any) => (w.score ?? w.averageScore ?? 0) > 0)
        .map((w: any) => ({
          topic: w.topic,
          skill: null,
          displayName: w.topic,
          accuracy: Math.round(w.score ?? w.averageScore ?? 0),
          studentCount: Math.min(totalStudents, w.eventsCount || strugglingCount || 1),
          totalStudents: totalStudents || 1,
          sources: w.eventsCount > 2 ? ['Task', 'Live Quiz'] : ['Assessment'],
          confidence: w.eventsCount > 2 ? 'CONFIRMED GAP' : 'EARLY SIGNAL',
          evidenceList: [],
          why: teachNext.find((t: any) => t.topic === w.topic)?.why || null
        }));
    }

    return topicPerformance
      .filter((t: any) => (t.score ?? 0) > 0 && (t.score ?? 0) < 70)
      .map((t: any) => ({
        topic: t.topic,
        skill: null,
        displayName: t.topic,
        accuracy: Math.round(t.score ?? 0),
        studentCount: Math.max(1, Math.min(totalStudents, strugglingCount)),
        totalStudents: totalStudents || 1,
        sources: ['Class Assessments'],
        confidence: 'EARLY SIGNAL',
        evidenceList: [],
        why: teachNext.find((t: any) => t.topic === t.topic)?.why || null
      }));
  }, [resolvedMetrics.learningGapPriority, topWeaknesses, topicPerformance, teachNext, totalStudents, strugglingCount]);

  // Visual Diagnosis Charts Data: Chart 1 (Topic Accuracy)
  const sortedTopics = useMemo(() => {
    return topicPerformance
      .filter((t: any) => t.topic && (t.score > 0 || (t.eventsCount && t.eventsCount > 0)))
      .sort((a: any, b: any) => a.score - b.score);
  }, [topicPerformance]);

  // Chart 2: Mastery Distribution Donut
  const donutData = useMemo(() => {
    let high = 0, steady = 0, needsSupport = 0, atRisk = 0;
    if (resolvedStudents && resolvedStudents.length > 0) {
      resolvedStudents.forEach((s: any) => {
        const avg = s.averagePercentage ?? s.averageScore ?? s.score ?? null;
        if (avg === null || avg === undefined) return;
        if (avg >= 80) high++;
        else if (avg >= 60) steady++;
        else if (avg >= 50) needsSupport++;
        else atRisk++;
      });
    }
    return [
      { label: 'High Performers', count: high, color: '#10b981' },
      { label: 'Steady', count: steady, color: '#14b8a6' },
      { label: 'Needs Support', count: needsSupport, color: '#f59e0b' },
      { label: 'At Risk', count: atRisk, color: '#ef4444' },
    ];
  }, [resolvedStudents]);

  // Chart 3: Performance Over Time (Date-Aggregated & Chronological)
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
  const chartWidth = 400;
  const chartHeight = 160;
  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 16;
  const paddingBottom = 26;
  const plotWidth = chartWidth - paddingLeft - paddingRight; // 344
  const plotHeight = chartHeight - paddingTop - paddingBottom; // 118

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

  // Section D
  const strengthsList = resolvedMetrics.classStrengths || topStrengths.map((s: any) => ({ topic: s.topic, accuracy: s.score || s.averageScore }));
  if (strengthsList.length === 0) {
    topicPerformance.filter((t: any) => t.score >= 75).forEach((t: any) => {
      strengthsList.push({ topic: t.topic, accuracy: t.score });
    });
  }

  // Section E
  const supportStudentsList = resolvedMetrics.studentsNeedingSupport || studentsNeedingAttention;

  // Section F: Classroom Diagnosis
  const primaryAction = resolvedIntelligence?.recommended_actions?.[0];
  const recommendedFocus = resolvedMetrics.recommendedTeachingFocus || teachNext[0] || (learningGaps[0] ? {
    topic: learningGaps[0].displayName || learningGaps[0].topic,
    why: `${learningGaps[0].studentCount} of ${learningGaps[0].totalStudents} students require reinforcement in this concept based on assessment evidence.`,
    recommended_action: `Review key rules of ${learningGaps[0].topic} with guided contrast examples, followed by immediate formative practice.`
  } : null);

  // SVG Helpers
  const getBarColor = (score: number) => {
    if (score < 50) return '#ef4444';
    if (score < 70) return '#f59e0b';
    return '#14b8a6';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      
      {/* SECTION A: Class Pulse */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Class Pulse</h2>
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

      {/* SECTION B: Learning Gaps */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Learning Gaps</h2>
          <p className="text-xs text-[#36565A] mt-1">Grounded diagnostic concepts requiring attention based on unified multi-source evidence.</p>
        </div>

        {learningGaps.length === 0 ? (
          <div className="bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] p-8 text-center">
            <Target className="w-8 h-8 text-[#159A9C] mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-[#173B3F]">No learning gaps identified yet.</p>
            <p className="text-xs text-[#36565A] mt-1">Assign tasks, quizzes, or assessments to collect student evidence.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {learningGaps.map((gap: any, i: number) => (
              <div key={i} className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-black text-[#173B3F]">{gap.displayName || gap.topic}</h3>
                      
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                        gap.confidence === 'CONFIRMED GAP' || gap.sources?.length > 1
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {gap.confidence || (gap.sources?.length > 1 ? `Confirmed Gap (${gap.sources.length} sources)` : 'Early Signal (1 source)')}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#173B3F] border border-slate-200">
                        {gap.studentCount} of {gap.totalStudents || totalStudents || '-'} students affected
                      </span>

                      <span 
                        className="px-2.5 py-0.5 rounded text-xs font-black"
                        style={{ backgroundColor: getBarColor(gap.accuracy) + '20', color: getBarColor(gap.accuracy) }}
                      >
                        {gap.accuracy}% class accuracy
                      </span>
                    </div>

                    {/* Multi-Source Evidence Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#36565A]">Verified across:</span>
                      {(gap.sources || []).map((source: string, idx: number) => (
                        <span key={idx} className="text-xs font-semibold px-2.5 py-0.5 bg-[#F8FCFB] border border-[#C9E5E2] rounded-md text-[#173B3F] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#14b8a6]"></span>
                          {source}
                        </span>
                      ))}
                    </div>

                    {/* Pedagogical Why / Grounded Reasoning */}
                    {gap.why && (
                      <div className="text-xs text-[#173B3F] bg-[#E8F7F5] p-3 rounded-lg border border-[#C9E5E2] flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-[#087477] shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-bold text-[#087477]">Diagnosis: </span>
                          <InlineMarkdown text={gap.why} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => setSelectedEvidenceGap(gap)}
                      className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors w-full cursor-pointer flex items-center justify-center gap-1.5"
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

      {/* Interactive Evidence Breakdown Modal */}
      {selectedEvidenceGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#C9E5E2] shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    Diagnostic Evidence
                  </span>
                  <span className="text-[10px] font-bold text-[#36565A]">
                    {selectedEvidenceGap.confidence}
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#173B3F]">
                  {selectedEvidenceGap.displayName}
                </h3>
                <p className="text-xs text-[#36565A]">
                  Parent Unit: <span className="font-semibold text-[#173B3F]">{selectedEvidenceGap.topic}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedEvidenceGap(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#F8FCFB] p-3 rounded-xl border border-[#C9E5E2]">
              <div>
                <span className="text-[10px] font-bold text-[#36565A] uppercase">Class Accuracy</span>
                <div className="text-xl font-black text-[#173B3F] mt-0.5" style={{ color: getBarColor(selectedEvidenceGap.accuracy) }}>
                  {selectedEvidenceGap.accuracy}%
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#36565A] uppercase">Affected Students</span>
                <div className="text-xl font-black text-[#173B3F] mt-0.5">
                  {selectedEvidenceGap.studentCount} <span className="text-xs text-[#36565A] font-normal">of {selectedEvidenceGap.totalStudents}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase text-[#173B3F] mb-2 tracking-wide">Multi-Source Verification</h4>
              <div className="flex flex-wrap gap-2">
                {(selectedEvidenceGap.sources || []).map((source: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-white border border-[#C9E5E2] rounded-lg text-xs font-bold text-[#173B3F] flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-[#14b8a6]"></span>
                    {source}
                  </span>
                ))}
              </div>
            </div>

            {selectedEvidenceGap.evidenceList && selectedEvidenceGap.evidenceList.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase text-[#173B3F] mb-2 tracking-wide">Sample Assessment Events</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedEvidenceGap.evidenceList.slice(0, 5).map((ev: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#173B3F]">{ev.activityTitle || ev.source}</div>
                        <div className="text-[10px] text-[#36565A]">{ev.studentName || 'Student'} • {ev.source}</div>
                      </div>
                      <div className="font-black text-[#173B3F]" style={{ color: getBarColor(ev.score) }}>
                        {ev.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#C9E5E2]">
              <button
                onClick={() => {
                  const topic = selectedEvidenceGap.displayName || selectedEvidenceGap.topic;
                  setSelectedEvidenceGap(null);
                  handleNavigation('evidence-reports', { topic });
                }}
                className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Open Full Evidence Tab
              </button>
              <button
                onClick={() => {
                  const topic = selectedEvidenceGap.topic;
                  setSelectedEvidenceGap(null);
                  handleNavigation('teaching', { topic });
                }}
                className="px-4 py-2 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                Teach This Concept <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <hr className="border-[#C9E5E2]" />

      {/* SECTION C: Visual Diagnosis Charts */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Visual Diagnosis</h2>
          <p className="text-xs text-[#36565A] mt-1">Multi-dimensional overview of mastery, distributions, and historical learning progress.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Chart 1: Topic Accuracy */}
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-[#173B3F] mb-4">Topic Accuracy</h3>
            {sortedTopics.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <BarChart3 className="w-6 h-6 text-slate-300 mb-2" />
                <span className="text-xs text-[#36565A]">Not enough evidence yet.</span>
              </div>
            ) : (
              <div className="flex-1 space-y-3 relative pb-4">
                {/* 70% Benchmark line */}
                <div className="absolute top-0 bottom-4 left-[70%] border-l-2 border-dashed border-teal-500/40 z-0"></div>
                <div className="absolute bottom-0 left-[70%] text-[9px] font-bold text-teal-600 -translate-x-1/2">70% Target</div>
                
                {sortedTopics.slice(0, 5).map((t: any, i: number) => (
                  <div key={i} className="relative z-10">
                    <div className="flex justify-between text-[10px] font-bold text-[#36565A] mb-1">
                      <span className="truncate pr-2">{t.topic}</span>
                      <span>{t.score}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
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

          {/* Chart 2: Mastery Distribution Donut */}
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-sm flex flex-col items-center">
            <h3 className="text-xs font-bold text-[#173B3F] w-full text-left mb-4">Mastery Distribution</h3>
            {donutData.every(d => d.count === 0) ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                 <UserX className="w-6 h-6 text-slate-300 mb-2" />
                 <span className="text-xs text-[#36565A]">Not enough evidence yet.</span>
               </div>
            ) : (
              <div className="flex flex-col items-center gap-4 flex-1 justify-center w-full">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let currentOffset = 0;
                      const totalCount = donutData.reduce((acc, curr) => acc + curr.count, 0) || 1;
                      return donutData.map((slice, i) => {
                        const strokeDasharray = `${(slice.count / totalCount) * 283} 283`;
                        const strokeDashoffset = -currentOffset;
                        currentOffset += (slice.count / totalCount) * 283;
                        return slice.count > 0 ? (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="45"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="10"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
                        ) : null;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-black text-[#173B3F]">
                      {donutData.reduce((acc, curr) => acc + curr.count, 0)}
                    </span>
                    <span className="text-[9px] font-bold text-[#36565A]">Students</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full text-[10px]">
                  {donutData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                      <span className="text-[#36565A] font-medium truncate">{d.label}</span>
                      <span className="font-bold text-[#173B3F] ml-auto">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart 3: Performance Over Time (Fixed SVG Coordinate Scaling) */}
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#173B3F]">Performance Over Time</h3>
              {lineChartData.length > 1 && (
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {lineChartData.length} checkpoints
                </span>
              )}
            </div>

            {chartPoints.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-[#F8FCFB] rounded-lg border border-dashed border-[#C9E5E2]">
                <TrendingUp className="w-7 h-7 text-[#159A9C] mb-2 opacity-50" />
                <span className="text-xs font-bold text-[#173B3F]">Not enough historical data yet.</span>
                <span className="text-[11px] text-[#36565A] mt-0.5">Complete assessments to track class progress over time.</span>
              </div>
            ) : chartPoints.length === 1 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-2">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto max-h-[140px] overflow-visible">
                  {/* Gridlines */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const y = paddingTop + plotHeight - (val / 100) * plotHeight;
                    return (
                      <g key={val}>
                        <line x1={paddingLeft} y1={y} x2={paddingLeft + plotWidth} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                        <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="8.5" fill="#36565A" fontWeight="600">{val}%</text>
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
                <p className="text-[11px] text-[#36565A] text-center mt-1">
                  1 checkpoint recorded ({chartPoints[0].date}: {chartPoints[0].value}%). More activity is needed to show a trend line.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto max-h-[140px] overflow-visible">
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
                        <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="8.5" fill="#36565A" fontWeight="600">{val}%</text>
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
                  <text x={paddingLeft + plotWidth - 4} y={targetY - 3} textAnchor="end" fontSize="8.5" fill="#0d9488" fontWeight="700">
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

        </div>
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* SECTION D: Class Strengths */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Class Strengths</h2>
        </div>
        
        {strengthsList.length === 0 ? (
          <div className="bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] p-6 text-center">
             <span className="text-xs font-bold text-[#36565A]">No confirmed strengths yet. More evidence needed.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {strengthsList.map((s: any, i: number) => (
              <div key={i} className="bg-white border border-[#C9E5E2] rounded-xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-[#173B3F] mb-3 line-clamp-2">{s.topic}</span>
                <div className="inline-flex items-center self-start gap-1.5 px-2 py-1 rounded bg-teal-50 text-teal-800 text-[10px] font-black border border-teal-100">
                  <CheckCircle2 className="w-3 h-3" />
                  {s.accuracy}%
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* SECTION E: Students Needing Support */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Students Needing Support</h2>
        </div>
        
        {supportStudentsList.length === 0 ? (
          <div className="bg-[#F8FCFB] rounded-xl border border-dashed border-[#C9E5E2] p-6 text-center">
             <span className="text-xs font-bold text-[#36565A]">All students are performing well!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supportStudentsList.slice(0, 6).map((student: any, i: number) => (
              <div 
                key={i} 
                onClick={() => handleNavigation('students', { studentId: student.studentId || student.id })}
                className="bg-white border border-[#C9E5E2] hover:border-amber-300 rounded-xl p-4 shadow-sm cursor-pointer transition-colors group flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">
                  {student.name?.[0] || student.student_ref?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-black text-[#173B3F] truncate pr-2">{student.name || student.student_ref}</span>
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                      {student.average ?? student.average_score ?? '<60'}%
                    </span>
                  </div>
                  <p className="text-[10px] text-[#36565A] mt-1 line-clamp-2">
                    {student.issue || student.weakestArea || student.main_weakness || "Struggling with recent topics."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION F: Classroom Diagnosis (Observe -> Analyze -> Identify -> Recommend -> Act) */}
      {recommendedFocus && (
        <section className="pt-4">
          <div className="bg-white rounded-xl border border-[#C9E5E2] border-l-4 border-l-[#159A9C] p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-teal-50 rounded-bl-full -z-10 opacity-60"></div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#087477]" />
                <h2 className="text-xs font-black uppercase tracking-wider text-[#087477]">Pedagogical Diagnosis</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                Actionable Guidance
              </span>
            </div>

            {/* Diagnostic Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 1. Observe */}
              <div className="p-3.5 bg-[#F8FCFB] rounded-xl border border-[#C9E5E2]">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[#173B3F] uppercase tracking-wide mb-1">
                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[9px] font-bold">1</span>
                  Observe (Evidence)
                </div>
                <p className="text-xs text-[#173B3F] leading-relaxed">
                  <InlineMarkdown text={primaryAction?.observation || (learningGaps[0] ? `${learningGaps[0].studentCount} of ${learningGaps[0].totalStudents} students scored below mastery (${learningGaps[0].accuracy}% accuracy) across ${learningGaps[0].sources.join(', ')}.` : "Variance detected across recent assessments.")} />
                </p>
              </div>

              {/* 2. Analyze */}
              <div className="p-3.5 bg-[#F8FCFB] rounded-xl border border-[#C9E5E2]">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[#173B3F] uppercase tracking-wide mb-1">
                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[9px] font-bold">2</span>
                  Analyze (Root Cause)
                </div>
                <p className="text-xs text-[#173B3F] leading-relaxed">
                  <InlineMarkdown text={primaryAction?.analysis || "Persistent misconceptions in foundational rule application compounded across multiple assessment formats."} />
                </p>
              </div>

              {/* 3. Identify */}
              <div className="p-3.5 bg-[#F8FCFB] rounded-xl border border-[#C9E5E2]">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[#173B3F] uppercase tracking-wide mb-1">
                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[9px] font-bold">3</span>
                  Identify (Priority Gap)
                </div>
                <div className="text-sm font-black text-[#173B3F] mt-0.5">
                  {learningGaps[0]?.displayName || recommendedFocus.topic}
                </div>
                <p className="text-[11px] text-[#36565A] mt-0.5">
                  Priority concept requiring targeted intervention before advancing curriculum.
                </p>
              </div>

              {/* 4. Recommend */}
              <div className="p-3.5 bg-[#E8F7F5] rounded-xl border border-[#C9E5E2]">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-[#087477] uppercase tracking-wide mb-1">
                  <span className="w-4 h-4 rounded-full bg-[#087477] text-white flex items-center justify-center text-[9px] font-bold">4</span>
                  Recommend (1-Lesson Plan)
                </div>
                <p className="text-xs text-[#173B3F] leading-relaxed">
                  <InlineMarkdown text={primaryAction?.recommendation || recommendedFocus.recommended_action || "Spend the next class period reviewing key rules with guided contrast examples, followed by immediate formative practice."} />
                </p>
              </div>
            </div>

            {/* 5. Act */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#C9E5E2]">
              <span className="text-xs font-bold text-[#36565A]">Step 5: Act on this diagnosis</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleNavigation('evidence-reports', { topic: learningGaps[0]?.displayName || recommendedFocus.topic })}
                  className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#087477]" />
                  View Diagnostic Evidence
                </button>
                <button 
                  onClick={() => handleNavigation('teaching', { topic: learningGaps[0]?.topic || recommendedFocus.topic })}
                  className="px-4 py-2 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  Teach This Concept <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default InsightTab;
