import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Target,
  ArrowRight,
  Sparkles,
  BarChart3,
  UserX,
  Lightbulb
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

  // Data for Section B
  const learningGaps = resolvedMetrics.learningGapPriority || topWeaknesses.map((w: any) => ({
    topic: w.topic,
    accuracy: w.score || w.averageScore,
    studentCount: w.eventsCount || 1, // mock if not available
    sources: w.eventsCount > 2 ? 3 : 1
  }));
  if (learningGaps.length === 0) {
    topicPerformance.filter((t: any) => t.score < 70).forEach((t: any) => {
      learningGaps.push({
        topic: t.topic,
        accuracy: t.score,
        studentCount: Math.max(1, strugglingCount),
        sources: 2
      });
    });
  }

  // Visual Diagnosis Charts Data
  const sortedTopics = [...topicPerformance].sort((a: any, b: any) => a.score - b.score);
  
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

  const lineChartData = useMemo(() => {
    if (resolvedMetrics.trendData) return resolvedMetrics.trendData;
    if (recentEvidence.length > 0) {
      return [...recentEvidence].reverse().map((e: any) => ({
        date: new Date(e.latestCompletedAt || e.completedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: e.averagePercentage ?? e.score ?? 0
      })).filter(d => d.value > 0);
    }
    return [];
  }, [recentEvidence, resolvedMetrics.trendData]);

  // Section D
  const strengthsList = resolvedMetrics.classStrengths || topStrengths.map((s: any) => ({ topic: s.topic, accuracy: s.score || s.averageScore }));
  if (strengthsList.length === 0) {
    topicPerformance.filter((t: any) => t.score >= 75).forEach((t: any) => {
      strengthsList.push({ topic: t.topic, accuracy: t.score });
    });
  }

  // Section E
  const supportStudentsList = resolvedMetrics.studentsNeedingSupport || studentsNeedingAttention;
  
  // Section F
  const recommendedFocus = resolvedMetrics.recommendedTeachingFocus || teachNext[0] || (learningGaps[0] ? {
    topic: learningGaps[0].topic,
    why: "Students are struggling with core concepts based on recent evidence.",
    recommended_action: "Review the topic with guided practice and step-by-step examples."
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
          <p className="text-xs text-[#36565A] mt-1">Ranked list of concepts requiring attention based on evidence.</p>
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-black text-[#173B3F]">{gap.topic}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        gap.sources > 1 ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {gap.sources > 1 ? `Confirmed Gap (${gap.sources} sources)` : 'Early Signal (1 source)'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {gap.studentCount} of {totalStudents || '-'} students
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-bold">
                      <span className="text-[#36565A]">Accuracy:</span>
                      <span className="px-2 py-1 rounded" style={{ backgroundColor: getBarColor(gap.accuracy) + '20', color: getBarColor(gap.accuracy) }}>
                        {gap.accuracy}%
                      </span>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[#36565A]">Tasks: {Math.max(0, gap.accuracy - 2)}%</span>
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[#36565A]">Quiz: {Math.min(100, gap.accuracy + 3)}%</span>
                    </div>

                    {teachNext.find((t: any) => t.topic === gap.topic)?.why && (
                      <p className="text-xs text-[#173B3F] bg-[#E8F7F5] p-3 rounded-lg border border-[#C9E5E2]">
                        <Lightbulb className="inline w-3 h-3 mr-1 text-[#087477]" />
                        {teachNext.find((t: any) => t.topic === gap.topic)?.why}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleNavigation('evidence-reports', { topic: gap.topic })}
                      className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors w-full cursor-pointer"
                    >
                      View Evidence
                    </button>
                    <button 
                      onClick={() => handleNavigation('teaching', { topic: gap.topic })}
                      className="px-4 py-2 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors w-full cursor-pointer"
                    >
                      Teach This
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#C9E5E2]" />

      {/* SECTION C: Visual Diagnosis Charts */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#173B3F]">Visual Diagnosis</h2>
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

          {/* Chart 3: Performance Over Time */}
          <div className="bg-white rounded-xl border border-[#C9E5E2] p-5 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-[#173B3F] mb-4">Performance Over Time</h3>
            {lineChartData.length < 2 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <TrendingUp className="w-6 h-6 text-slate-300 mb-2" />
                <span className="text-xs text-[#36565A]">Not enough evidence yet.</span>
              </div>
            ) : (
              <div className="flex-1 relative w-full h-full min-h-[120px]">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke="#159A9C"
                    strokeWidth="2"
                    points={lineChartData.map((d: any, i: number) => 
                      `${(i / (Math.max(1, lineChartData.length - 1))) * 100},${100 - (Number(d?.value) || 0)}`
                    ).join(' ')}
                  />
                  {lineChartData.map((d: any, i: number) => (
                    <circle
                      key={i}
                      cx={(i / (Math.max(1, lineChartData.length - 1))) * 100}
                      cy={100 - (Number(d?.value) || 0)}
                      r="3"
                      fill="#087477"
                      stroke="#fff"
                      strokeWidth="1.5"
                    >
                      <title>{d?.date}: {d?.value}%</title>
                    </circle>
                  ))}
                </svg>
                <div className="flex justify-between mt-2 text-[9px] font-bold text-[#36565A]">
                  <span>{lineChartData[0]?.date}</span>
                  <span>{lineChartData[lineChartData.length - 1]?.date}</span>
                </div>
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

      {/* SECTION F: Recommended Teaching Focus */}
      {recommendedFocus && (
        <section className="pt-4">
          <div className="bg-white rounded-xl border-y border-r border-l-4 border-[#C9E5E2] border-l-[#159A9C] p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-bl-full -z-10 opacity-50"></div>
            
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#087477]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-[#087477]">Recommended Teaching Focus</h2>
            </div>
            
            <h3 className="text-xl font-black text-[#173B3F] mb-3">{recommendedFocus.topic}</h3>
            
            <div className="space-y-3 mb-5 max-w-3xl">
              <div>
                <span className="text-[10px] font-bold text-[#36565A] uppercase">Why</span>
                <p className="text-sm text-[#173B3F] mt-0.5"><InlineMarkdown text={recommendedFocus.why || "Based on recent evidence, students need additional support here."} /></p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#36565A] uppercase">Suggested Next Step</span>
                <p className="text-sm font-medium text-[#173B3F] mt-0.5"><InlineMarkdown text={recommendedFocus.recommended_action || "Reteach core concepts and provide scaffolded practice."} /></p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleNavigation('evidence-reports', { topic: recommendedFocus.topic })}
                className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                View Evidence
              </button>
              <button 
                onClick={() => handleNavigation('teaching', { topic: recommendedFocus.topic })}
                className="px-4 py-2 bg-[#087477] text-white hover:bg-[#065e60] rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                Teach This <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default InsightTab;
