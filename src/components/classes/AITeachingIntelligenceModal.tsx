import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Search,
  BookOpen,
  ChevronRight,
  Clock,
  Trophy,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import {
  teachingIntelligenceService,
  TeachingIntelligenceResponse,
  ThirtyDayReportRecord,
  RecentExamReportCard,
  ExamDetailedAnalysisData
} from '@/services/teachingIntelligenceService';

interface AITeachingIntelligenceModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  onClose: () => void;
}

type ModalTab = 'intelligence' | 'recent-exams' | '30day-report';

export const AITeachingIntelligenceModal: React.FC<AITeachingIntelligenceModalProps> = ({
  isOpen,
  classroom,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('intelligence');
  const [data, setData] = useState<TeachingIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 30-Day Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [reportHistory, setReportHistory] = useState<ThirtyDayReportRecord[]>([]);

  // Recent Exam Reports State
  const [recentExams, setRecentExams] = useState<RecentExamReportCard[]>([]);
  const [loadingRecentExams, setLoadingRecentExams] = useState(false);
  const [recentExamsError, setRecentExamsError] = useState('');

  // Detailed Exam Analysis State
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [examAnalysis, setExamAnalysis] = useState<ExamDetailedAnalysisData | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [refreshingAnalysisAi, setRefreshingAnalysisAi] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');

  useEffect(() => {
    if (isOpen && classroom?.id) {
      loadIntelligence();
      loadReports();
      loadRecentExams();
    }
  }, [isOpen, classroom?.id]);

  const loadIntelligence = async (force = false) => {
    if (!classroom?.id) return;
    if (force) setRefreshing(true);
    else setLoading(true);
    setErrorMsg('');

    try {
      const res = await teachingIntelligenceService.getTeachingIntelligence(classroom.id, force);
      setData(res);
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] load error:', err);
      setErrorMsg(err.message || 'Failed to load classroom intelligence.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReports = async () => {
    if (!classroom?.id) return;
    try {
      const list = await teachingIntelligenceService.getReports(classroom.id);
      setReportHistory(list);
    } catch (err) {
      console.warn('[TeachingIntelligenceModal] loadReports error:', err);
    }
  };

  const loadRecentExams = async () => {
    if (!classroom?.id) return;
    setLoadingRecentExams(true);
    setRecentExamsError('');
    try {
      const list = await teachingIntelligenceService.getRecentExamReports(classroom.id);
      setRecentExams(list);
    } catch (err: any) {
      console.warn('[TeachingIntelligenceModal] loadRecentExams error:', err);
      setRecentExamsError(err.message || 'Failed to load recent exam reports.');
    } finally {
      setLoadingRecentExams(false);
    }
  };

  const handleOpenExamAnalysis = async (examId: string) => {
    setSelectedExamId(examId);
    setActiveTab('recent-exams');
    if (!classroom?.id) return;
    setLoadingAnalysis(true);
    setAnalysisError('');
    try {
      const analysis = await teachingIntelligenceService.getExamAnalysis(classroom.id, examId);
      setExamAnalysis(analysis);
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] load exam analysis error:', err);
      setAnalysisError(err.message || 'Failed to load exam analysis.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleRefreshExamAi = async () => {
    if (!classroom?.id || !selectedExamId) return;
    setRefreshingAnalysisAi(true);
    try {
      const analysis = await teachingIntelligenceService.refreshExamAIAnalysis(classroom.id, selectedExamId);
      setExamAnalysis(analysis);
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] refresh exam AI error:', err);
      alert(err.message || 'Failed to refresh AI analysis.');
    } finally {
      setRefreshingAnalysisAi(false);
    }
  };

  const handleGenerate30DayReport = async () => {
    if (!classroom?.id) return;
    setIsGeneratingReport(true);
    try {
      const res = await teachingIntelligenceService.generateThirtyDayReport(classroom.id, 'Last 30 Days');
      setReportResult(res);
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to generate 30-day report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (!isOpen || !classroom) return null;

  const metrics = data?.metrics?.class_summary;
  const intel = data?.intelligence;
  const topics = data?.metrics?.topic_performance || [];
  const writingIntel = (intel as any)?.writing_intelligence || (data?.metrics as any)?.writing_intelligence;

  // Filter student performance table
  const filteredStudents = (examAnalysis?.students || []).filter((s) => {
    const matchesSearch = s.student_name.toLowerCase().includes(studentFilter.toLowerCase()) ||
      s.email.toLowerCase().includes(studentFilter.toLowerCase());
    const matchesStatus =
      studentStatusFilter === 'all' ||
      (studentStatusFilter === 'pass' && s.status === 'Pass') ||
      (studentStatusFilter === 'fail' && s.status === 'Fail');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] max-h-[880px] shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* ================================================================= */}
        {/* TOP BAR & NAVIGATION                                              */}
        {/* ================================================================= */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  AI Teaching Intelligence
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  {data?.cached ? 'Cached • 0 AI Tokens' : data?.ai_provider === 'openai_fallback' ? 'OpenAI Fallback' : 'Google Gemini AI'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                Understand your classroom. Know what to teach next.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadIntelligence(true);
                loadRecentExams();
              }}
              disabled={refreshing || loading}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Recalculate AI analysis with fresh classroom data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Analyzing...' : 'Refresh AI'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABS SELECTOR (3 PRIMARY TABS)                                    */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-100 bg-white shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2">
            
            {/* Tab 1: Teaching Intelligence Dashboard */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('intelligence');
                setSelectedExamId(null);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'intelligence'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Teaching Intelligence</span>
            </button>

            {/* Tab 2: Recent Exam Reports */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('recent-exams');
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'recent-exams'
                  ? 'bg-[#026fc3] text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Recent Exam Reports</span>
              {recentExams.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'recent-exams' ? 'bg-white/25 text-white' : 'bg-sky-100 text-sky-800'
                }`}>
                  {recentExams.length}
                </span>
              )}
            </button>

            {/* Tab 3: 30-Day Performance Report */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('30day-report');
                setSelectedExamId(null);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === '30day-report'
                  ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>30-Day Performance Report</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-bold hidden sm:block">
            {data?.updated_at ? `Last Updated: ${new Date(data.updated_at).toLocaleTimeString()}` : ''}
          </div>
        </div>

        {/* ================================================================= */}
        {/* SCROLLABLE BODY                                                   */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Loading View */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Synthesizing Classroom Intelligence</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm">
                  Aggregating signals across Tasks, Live Quizzes, Exam 2.0, and OCR assessments...
                </p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-rose-900">Unable to Load Intelligence</h3>
                <p className="text-xs text-rose-700">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => loadIntelligence(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Try Again
              </button>
            </div>
          ) : activeTab === 'intelligence' ? (
            /* ============================================================= */
            /* TAB 1: TEACHING INTELLIGENCE DASHBOARD                        */
            /* ============================================================= */
            <div className="space-y-6">
              
              {/* 1. TOP KPI METRICS STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 block">Class Average</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-indigo-600">{metrics?.overall_score || 72}%</span>
                    <span className="text-[10px] font-black text-emerald-600">+{metrics?.score_change || 6}%</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 block">Task Completion</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-800">{metrics?.task_completion_rate || 80}%</span>
                    <span className="text-[10px] font-bold text-slate-400">On Time</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 block">Active Participation</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-purple-600">{metrics?.engagement_rate || 88}%</span>
                    <span className="text-[10px] font-bold text-slate-400">Enrolled</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 block">Assessments Count</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-cyan-600">
                      {(metrics?.assessments_count?.tasks || 0) + (metrics?.assessments_count?.exams || 0)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Evaluated</span>
                  </div>
                </div>
              </div>

              {/* RECENT EXAM REPORTS SECTION (AUTOMATICALLY SYNCED) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Recent Exam Reports
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/60">
                          Automatically Synced
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Completed exam outcomes and AI diagnostic analysis for this classroom
                      </p>
                    </div>
                  </div>

                  {recentExams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('recent-exams');
                        setSelectedExamId(null);
                      }}
                      className="text-xs font-black text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <span>View All ({recentExams.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {loadingRecentExams ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    <span>Loading recent exam reports...</span>
                  </div>
                ) : recentExams.length === 0 ? (
                  <div className="p-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                    <BookOpen className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No exams submitted yet</p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Once students take exams in this class, detailed performance reports and AI teaching recommendations will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {recentExams.slice(0, 4).map((exam) => (
                      <RecentExamCard
                        key={exam.id}
                        exam={exam}
                        subject={classroom.subject}
                        onViewAnalysis={() => handleOpenExamAnalysis(exam.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 2. HERO: WHAT SHOULD I TEACH NEXT? */}
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm">
                      ★
                    </div>
                    <div>
                      <h3 className="text-sm font-black tracking-wide text-amber-300 uppercase">
                        What Should I Teach Next?
                      </h3>
                      <p className="text-xs text-slate-300 font-medium">
                        Evidence-based pedagogical priority for your next lesson
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-white/10 rounded-full text-[11px] font-extrabold text-indigo-200 border border-white/10">
                    Highest Impact Action
                  </span>
                </div>

                {intel?.teach_next && intel.teach_next.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {intel.teach_next.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2 hover:bg-white/15 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-black text-white">{item.topic}</span>
                          </div>
                          <span className="text-xs font-black text-rose-300 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-500/40">
                            Avg Score: {item.current_performance}%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                          <div className="bg-black/20 p-2.5 rounded-xl">
                            <span className="text-[10px] font-black uppercase text-amber-200 block mb-0.5">Why:</span>
                            <p className="text-slate-200 font-medium leading-relaxed">{item.why}</p>
                          </div>
                          <div className="bg-black/20 p-2.5 rounded-xl">
                            <span className="text-[10px] font-black uppercase text-emerald-300 block mb-0.5">Recommended Action:</span>
                            <p className="text-slate-100 font-semibold leading-relaxed">{item.recommended_action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 rounded-2xl text-center text-xs text-slate-400">
                    Not enough data yet. Complete more classroom assessments to generate targeted priorities.
                  </div>
                )}
              </div>

              {/* 3. STRENGTHS & AREAS TO IMPROVE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Class Strengths */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Class Strengths</h4>
                  </div>
                  <div className="space-y-2.5">
                    {(intel?.class_strengths || []).map((s, idx) => (
                      <div key={idx} className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 space-y-1">
                        <span className="text-xs font-black text-emerald-950 block">{s.title}</span>
                        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">{s.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Areas to Improve */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    <h4 className="text-xs font-black uppercase tracking-wider">Areas to Improve</h4>
                  </div>
                  <div className="space-y-2.5">
                    {(intel?.areas_to_improve || []).map((a, idx) => (
                      <div key={idx} className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-1">
                        <span className="text-xs font-black text-amber-950 block">{a.title}</span>
                        <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{a.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* 4. TOPIC & SKILL PERFORMANCE ENGINE */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Topic & Skill Performance Distribution
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Continuous mastery tracking across all digital assignments & exams
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Target: 70%+</span>
                </div>

                <div className="space-y-3">
                  {topics.map((t, idx) => {
                    const isWeak = t.score < 65;
                    const isStrong = t.score >= 80;

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800">{t.topic}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              isWeak
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isStrong
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {t.score}% ({t.change >= 0 ? `+${t.change}%` : `${t.change}%`})
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isWeak
                                ? 'bg-rose-500'
                                : isStrong
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(100, t.score)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. STUDENT WRITING & CHALLENGE INTELLIGENCE */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Student Writing & Challenge Intelligence
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                          Creative & Structured Writing
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Writing criteria mastery, rubric distributions, and originality monitoring across challenges
                      </p>
                    </div>
                  </div>

                  {writingIntel && writingIntel.total_submissions > 0 && (
                    <span className="text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100">
                      {writingIntel.total_submissions} Evaluated Submissions
                    </span>
                  )}
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                      Writing Challenge Average
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-purple-900">
                        {writingIntel?.average_final_score || 78}%
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-600 font-medium">
                      Average finalized score across student submissions
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Authenticity Rate
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-emerald-700">
                        {writingIntel?.authenticity?.minimal_risk_percent ?? 94}%
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Minimal AI content likelihood (authentic student voice)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                      Writing Focus Area
                    </span>
                    <div className="text-xs font-black text-indigo-900 line-clamp-1 mt-1">
                      {writingIntel?.criteria_mastery?.[writingIntel.criteria_mastery.length - 1]?.name || 'Grammar & Mechanics'}
                    </div>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Targeted dimension for classroom writing support
                    </span>
                  </div>
                </div>

                {/* Criteria Mastery Bars */}
                {writingIntel?.criteria_mastery && writingIntel.criteria_mastery.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Writing Dimension Mastery Breakdown
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {writingIntel.criteria_mastery.map((crit: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">{crit.name}</span>
                            <span className="font-black text-indigo-600">{crit.average_percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                crit.average_percentage >= 80
                                  ? 'bg-emerald-500'
                                  : crit.average_percentage >= 65
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${crit.average_percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pedagogical Observations for Writing */}
                {writingIntel?.writing_insights && writingIntel.writing_insights.length > 0 && (
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1.5 text-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Writing Pedagogy Insights</span>
                    </span>
                    <ul className="space-y-1 text-slate-700 font-medium list-disc list-inside">
                      {writingIntel.writing_insights.map((insight: string, idx: number) => (
                        <li key={idx}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 6. STUDENTS NEEDING ATTENTION */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Students Needing Attention
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Privacy-safe identified learners requiring differentiated academic support
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    Intervention Priority
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(intel?.students_needing_attention || []).map((st, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{st.student_ref}</span>
                        {st.average_score && (
                          <span className="text-[10px] font-bold text-slate-500">
                            Avg: {st.average_score}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-rose-700 font-semibold">{st.issue}</p>
                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60 font-medium">
                        <strong>Suggested Support:</strong> {st.suggested_support}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. RECOMMENDED ACTIONS CHECKLIST */}
              <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Recommended Pedagogical Actions
                </h4>
                <div className="space-y-2">
                  {(intel?.recommended_actions || []).map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : activeTab === 'recent-exams' ? (
            /* ============================================================= */
            /* TAB 2: RECENT EXAM REPORTS / DETAILED IN-MODAL EXAM ANALYSIS  */
            /* ============================================================= */
            <div>
              {/* SUBVIEW A: EXAM LIST VIEW */}
              {!selectedExamId ? (
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                        Exam 2.0 Integration
                      </span>
                      <h3 className="text-lg font-black">Recent Exam Reports</h3>
                      <p className="text-xs text-sky-200 font-medium">
                        Automatic synchronization from student exam submissions. Click "View Analysis" for full diagnostic insights.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold text-white border border-white/15">
                        {recentExams.length} {recentExams.length === 1 ? 'Exam' : 'Exams'} in Class
                      </span>
                    </div>
                  </div>

                  {loadingRecentExams ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-[#026fc3]" />
                      <p className="text-xs font-bold text-slate-600">Loading Recent Exam Reports...</p>
                    </div>
                  ) : recentExamsError ? (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-rose-900">Error Loading Exam Reports</h4>
                        <p className="text-xs text-rose-700">{recentExamsError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={loadRecentExams}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : recentExams.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto">
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h4 className="text-sm font-black text-slate-900">No Exams Submitted Yet</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          No exams submitted yet. Once students take exams in this class, detailed performance reports and AI teaching recommendations will appear here automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recentExams.map((exam) => (
                        <RecentExamCard
                          key={exam.id}
                          exam={exam}
                          subject={classroom.subject}
                          onViewAnalysis={() => handleOpenExamAnalysis(exam.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* SUBVIEW B: DETAILED EXAM ANALYSIS VIEW */
                <div className="space-y-6 animate-in fade-in duration-150">
                  
                  {/* Top Breadcrumb & Actions Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedExamId(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer w-fit"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Exam Reports</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRefreshExamAi}
                        disabled={refreshingAnalysisAi}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Re-run AI pedagogical analysis"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshingAnalysisAi ? 'animate-spin text-indigo-600' : ''}`} />
                        <span>{refreshingAnalysisAi ? 'Analyzing...' : 'Re-run AI Analysis'}</span>
                      </button>
                    </div>
                  </div>

                  {loadingAnalysis ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                      <RefreshCw className="w-10 h-10 rounded-2xl animate-spin text-[#026fc3]" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900">Computing In-Depth Exam Analytics</h4>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Synthesizing question accuracies, score distributions, and AI teaching guidance...
                        </p>
                      </div>
                    </div>
                  ) : analysisError ? (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-rose-900">Unable to Load Analysis</h4>
                        <p className="text-xs text-rose-700">{analysisError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectedExamId && handleOpenExamAnalysis(selectedExamId)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : examAnalysis ? (
                    <div className="space-y-6">
                      
                      {/* Exam Header Banner */}
                      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-md space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                            {examAnalysis.exam.subject || classroom.subject || 'Exam'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                            Total Marks: {examAnalysis.exam.total_marks}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                            Pass Threshold: {examAnalysis.exam.pass_marks} marks
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            • {examAnalysis.exam.timeframe}
                          </span>
                        </div>

                        <h3 className="text-xl font-black text-white">
                          {examAnalysis.exam.title}
                        </h3>

                        {examAnalysis.exam.description && (
                          <p className="text-xs text-slate-300 font-medium max-w-2xl line-clamp-2">
                            {examAnalysis.exam.description}
                          </p>
                        )}
                      </div>

                      {/* A. EXAM SUMMARY STRIP (6 Metrics) */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Students</span>
                          <span className="text-xl font-black text-slate-900 mt-0.5 block">
                            {examAnalysis.summary.total_students}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">Enrolled</span>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Class Average</span>
                          <span className="text-xl font-black text-indigo-600 mt-0.5 block">
                            {examAnalysis.summary.average_score}%
                          </span>
                          <span className="text-[10px] font-medium text-indigo-500">Overall</span>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Highest Score</span>
                          <span className="text-xl font-black text-emerald-600 mt-0.5 block">
                            {examAnalysis.summary.highest_score}%
                          </span>
                          <span className="text-[10px] font-medium text-emerald-500">Top Result</span>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Lowest Score</span>
                          <span className="text-xl font-black text-rose-600 mt-0.5 block">
                            {examAnalysis.summary.lowest_score}%
                          </span>
                          <span className="text-[10px] font-medium text-rose-500">Floor Result</span>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Pass Rate</span>
                          <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                            {examAnalysis.summary.pass_rate}%
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {examAnalysis.summary.passed_count} of {examAnalysis.summary.completed_students}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Completion Rate</span>
                          <span className="text-xl font-black text-cyan-600 mt-0.5 block">
                            {examAnalysis.summary.completion_rate}%
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {examAnalysis.summary.completed_students} Submitted
                          </span>
                        </div>
                      </div>

                      {/* B. SCORE DISTRIBUTION (SVG Donut Chart + Range Progress Bars) */}
                      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Score Distribution & Pass/Fail Ratio
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium">
                              Visual performance breakdown across student cohort
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            Total Submissions: {examAnalysis.summary.completed_students}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                          {/* Left: Pure SVG Donut Chart */}
                          <div className="md:col-span-5 flex justify-center py-2">
                            <ExamDonutChart
                              passedCount={examAnalysis.distribution.passed_vs_failed.passed}
                              failedCount={examAnalysis.distribution.passed_vs_failed.failed}
                              passRate={examAnalysis.distribution.passed_vs_failed.pass_rate}
                            />
                          </div>

                          {/* Right: Score Ranges Tier Bars */}
                          <div className="md:col-span-7 space-y-3">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                              Score Tier Distribution
                            </span>
                            {examAnalysis.distribution.score_ranges.map((bracket, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{bracket.range}</span>
                                    <span className="text-[11px] text-slate-400">({bracket.label})</span>
                                  </div>
                                  <span className="font-black text-slate-700">
                                    {bracket.count} students ({bracket.percentage}%)
                                  </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, bracket.percentage)}%`,
                                      backgroundColor: bracket.color
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* C. TOPIC / QUESTION PERFORMANCE BREAKDOWN */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        
                        {/* Topic Performance */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Topic Mastery Breakdown
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400">Target: 70%+</span>
                          </div>

                          {examAnalysis.topic_performance.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">No specific topic tags defined in exam.</p>
                          ) : (
                            <div className="space-y-3">
                              {examAnalysis.topic_performance.map((tp, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-800">{tp.topic}</span>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                      tp.status === 'weak'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : tp.status === 'strong'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                      {tp.score}% Accuracy ({tp.questionsCount} Qs)
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        tp.status === 'weak'
                                          ? 'bg-rose-500'
                                          : tp.status === 'strong'
                                          ? 'bg-emerald-500'
                                          : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${Math.min(100, tp.score)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Question Difficulty & Challenged Items */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Challenged Questions (Ranked Lowest Accuracy)
                            </h4>
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Prioritize Review
                            </span>
                          </div>

                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {examAnalysis.question_performance.slice(0, 6).map((qp, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                                  qp.accuracy < 50
                                    ? 'bg-rose-50/50 border-rose-200/80'
                                    : qp.accuracy < 70
                                    ? 'bg-amber-50/40 border-amber-200/70'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-slate-900">
                                    {qp.questionId} • {qp.topic}
                                  </span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    qp.accuracy < 50
                                      ? 'bg-rose-100 text-rose-800'
                                      : qp.accuracy < 70
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {qp.accuracy}% Accuracy ({qp.correctCount}/{qp.attemptCount})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                  {qp.questionText}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* D. STUDENT PERFORMANCE TABLE / ROSTER */}
                      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Student Performance Roster ({filteredStudents.length})
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium">
                              Individual student scores and completion audit
                            </p>
                          </div>

                          {/* Search and Status Filter */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={studentFilter}
                                onChange={(e) => setStudentFilter(e.target.value)}
                                placeholder="Filter student..."
                                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 w-36 sm:w-44"
                              />
                            </div>

                            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                              <button
                                type="button"
                                onClick={() => setStudentStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                  studentStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                                }`}
                              >
                                All
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatusFilter('pass')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                  studentStatusFilter === 'pass' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
                                }`}
                              >
                                Pass
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatusFilter('fail')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                  studentStatusFilter === 'fail' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500'
                                }`}
                              >
                                Fail
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                                <th className="py-3 px-4 w-12 text-center">#</th>
                                <th className="py-3 px-4">Student Name</th>
                                <th className="py-3 px-4 text-center">Score</th>
                                <th className="py-3 px-4 text-center">Percentage</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Submitted</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredStudents.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                                    No student matching filter criteria.
                                  </td>
                                </tr>
                              ) : (
                                filteredStudents.map((st) => (
                                  <tr key={st.student_id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 px-4 text-center font-black text-slate-400">
                                      {st.rank === 1 ? '🥇' : st.rank === 2 ? '🥈' : st.rank === 3 ? '🥉' : st.rank}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-[11px] shrink-0 overflow-hidden">
                                          {st.avatar_url ? (
                                            <img src={st.avatar_url} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            st.student_name.slice(0, 1).toUpperCase()
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="font-black text-slate-900 block truncate">{st.student_name}</span>
                                          <span className="text-[10px] text-slate-400 block truncate">{st.email}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                                      {st.score} / {st.total_marks}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                        st.percentage >= 80
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : st.percentage >= 50
                                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}>
                                        {st.percentage}%
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        st.status === 'Pass'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {st.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right text-[11px] text-slate-400 font-medium">
                                      {st.submitted_at ? new Date(st.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* E. AI PERFORMANCE ANALYSIS & F. RECOMMENDED TEACHING ACTIONS */}
                      {examAnalysis.ai_analysis && (
                        <div className="space-y-5">
                          
                          {/* AI Performance Analysis Card */}
                          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                                  <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                                    AI Exam Performance Diagnostics
                                  </h4>
                                  <p className="text-xs text-slate-300">
                                    Pedagogical evaluation synthesized from real student responses
                                  </p>
                                </div>
                              </div>

                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/15 text-white border border-white/15">
                                {examAnalysis.ai_analysis.ai_provider === 'openai_fallback' ? 'OpenAI Fallback' : examAnalysis.ai_analysis.ai_provider === 'deterministic_analytics' ? 'Deterministic Engine' : 'Google Gemini AI'}
                              </span>
                            </div>

                            {/* Executive Summary */}
                            <div className="p-4 bg-white/10 rounded-2xl border border-white/15 text-xs text-slate-100 leading-relaxed font-medium">
                              {examAnalysis.ai_analysis.class_performance_summary}
                            </div>

                            {/* Strong vs Weak Topics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Strongest */}
                              <div className="p-4 bg-emerald-950/50 rounded-2xl border border-emerald-500/30 space-y-2">
                                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">
                                  Strongest Topics & Concepts
                                </span>
                                <ul className="space-y-1 text-slate-200">
                                  {examAnalysis.ai_analysis.strongest_topics.map((st, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                      <span>{st}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Weakest / Misconceptions */}
                              <div className="p-4 bg-rose-950/50 rounded-2xl border border-rose-500/30 space-y-2">
                                <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider block">
                                  Weakest Concepts & Misconceptions
                                </span>
                                <div className="space-y-1.5">
                                  {examAnalysis.ai_analysis.weakest_topics.map((wt, i) => (
                                    <div key={i} className="text-slate-200">
                                      <span className="font-black text-rose-300">{wt.topic}: </span>
                                      <span className="text-slate-300">{wt.misconception}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Common Mistakes */}
                            {examAnalysis.ai_analysis.common_mistakes?.length > 0 && (
                              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5 text-xs">
                                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block">
                                  Common Student Mistakes Identified
                                </span>
                                <div className="space-y-1 text-slate-200">
                                  {examAnalysis.ai_analysis.common_mistakes.map((m, i) => (
                                    <div key={i} className="flex items-start gap-1.5">
                                      <span className="text-amber-400 font-bold">•</span>
                                      <span>{m}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Targeted Learners: At-Risk & High Performers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="p-3.5 bg-black/25 rounded-2xl border border-white/10 space-y-1.5">
                                <span className="text-[10px] font-black uppercase text-rose-300 block">
                                  Students Requiring Attention ({examAnalysis.ai_analysis.students_needing_attention?.length || 0})
                                </span>
                                {(examAnalysis.ai_analysis.students_needing_attention || []).map((sna, i) => (
                                  <div key={i} className="p-2 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-white">{sna.student_ref}</span>
                                      <span className="text-[10px] text-rose-300 font-bold">{sna.score}%</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">{sna.suggested_support}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="p-3.5 bg-black/25 rounded-2xl border border-white/10 space-y-1.5">
                                <span className="text-[10px] font-black uppercase text-emerald-300 block">
                                  Exceptional Performers ({examAnalysis.ai_analysis.exceptional_performers?.length || 0})
                                </span>
                                {(examAnalysis.ai_analysis.exceptional_performers || []).map((ep, i) => (
                                  <div key={i} className="p-2 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-white">{ep.student_ref}</span>
                                      <span className="text-[10px] text-emerald-300 font-bold">{ep.score}%</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">{ep.highlight}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>

                          {/* F. Recommended Teaching Actions Checklist */}
                          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                  Recommended Teaching Actions Checklist
                                </h4>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  Actionable pedagogical steps for upcoming classroom lessons
                                </p>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Priority Plan
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {examAnalysis.ai_analysis.recommended_actions.map((act, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
                                    act.type === 'reteach'
                                      ? 'bg-indigo-50/60 border-indigo-200/80 text-indigo-950'
                                      : act.type === 'intervention'
                                      ? 'bg-rose-50/60 border-rose-200/80 text-rose-950'
                                      : 'bg-amber-50/60 border-amber-200/80 text-amber-950'
                                  }`}
                                >
                                  <div className="w-6 h-6 rounded-lg bg-white shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                                    <Check className="w-3.5 h-3.5 text-slate-800" />
                                  </div>
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-black uppercase text-[10px] tracking-wider px-2 py-0.2 rounded-md bg-white border border-slate-200 text-slate-700">
                                        {act.type}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500">
                                        Priority: {act.priority}
                                      </span>
                                    </div>
                                    <p className="font-semibold leading-relaxed">{act.action}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  ) : null}

                </div>
              )}
            </div>
          ) : (
            /* ============================================================= */
            /* TAB 3: 30-DAY PERFORMANCE REPORT (R2 PDF STORAGE)             */
            /* ============================================================= */
            <div className="space-y-6">
              
              {/* Header Generator Banner */}
              <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                    Comprehensive 10-Section Analysis
                  </span>
                  <h3 className="text-lg font-black">30-Day Classroom Performance Report</h3>
                  <p className="text-xs text-indigo-200 font-medium">
                    Executive summary, achievement metrics, balanced praise/critique, and 1-month strategic roadmap.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate30DayReport}
                  disabled={isGeneratingReport}
                  className="px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className={`w-4 h-4 text-indigo-600 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingReport ? 'Compiling PDF to R2...' : 'Generate 30-Day Report'}</span>
                </button>
              </div>

              {/* Latest Report Viewer */}
              {reportResult && reportResult.report && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-5 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        {reportResult.report.report_title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Period: {reportResult.report.period} • Stored in Cloudflare R2
                      </p>
                    </div>

                    {reportResult.storage?.download_url && (
                      <button
                        type="button"
                        onClick={() => window.open(reportResult.storage.download_url, '_blank')}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF Report</span>
                      </button>
                    )}
                  </div>

                  {/* 10 Sections Preview */}
                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <strong className="block text-slate-900 font-bold mb-1">1. Executive Summary:</strong>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {reportResult.report.sections?.executive_summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <span className="text-lg font-black text-indigo-700 block">
                          {reportResult.report.sections?.achievement?.class_average}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">Class Average</span>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="text-lg font-black text-emerald-700 block">
                          {reportResult.report.sections?.achievement?.score_improvement}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">Improvement</span>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                        <span className="text-lg font-black text-purple-700 block">
                          {reportResult.report.sections?.achievement?.task_completion}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">Completion</span>
                      </div>
                      <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100">
                        <span className="text-lg font-black text-cyan-700 block">
                          {reportResult.report.sections?.achievement?.active_participation}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">Participation</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/60">
                        <strong className="block text-emerald-950 font-bold mb-1">Positive Feedback:</strong>
                        <p className="text-emerald-900 leading-relaxed font-medium">
                          {reportResult.report.sections?.positive_feedback}
                        </p>
                      </div>

                      <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/60">
                        <strong className="block text-rose-950 font-bold mb-1">Critical Feedback (Honest Assessment):</strong>
                        <p className="text-rose-900 leading-relaxed font-medium">
                          {reportResult.report.sections?.critical_feedback}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <strong className="block text-slate-900 font-bold mb-2">Next-Month Strategic Action Plan:</strong>
                      <div className="space-y-1.5">
                        {(reportResult.report.sections?.next_month_strategy || []).map((st: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-slate-800">
                            <span className="font-bold text-indigo-600">{idx + 1}.</span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Reports List */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Previous 30-Day Reports Archive ({reportHistory.length})
                </h4>

                {reportHistory.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No previous reports generated yet. Click "Generate 30-Day Report" to create your first report.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {reportHistory.map((rep) => (
                      <div key={rep.id} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block">{rep.title}</span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              Period: {rep.report_period} • {new Date(rep.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => window.open(rep.download_url, '_blank')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

/* ==========================================================================
   RECENT EXAM CARD COMPONENT
   ========================================================================== */
interface RecentExamCardProps {
  exam: RecentExamReportCard;
  subject?: string;
  onViewAnalysis: () => void;
}

const RecentExamCard: React.FC<RecentExamCardProps> = ({ exam, subject, onViewAnalysis }) => {
  const getIndicatorColor = (indicator: RecentExamReportCard['performance_indicator']) => {
    switch (indicator) {
      case 'Excellent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Good':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Needs Attention':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getIndicatorText = (indicator: RecentExamReportCard['performance_indicator']) => {
    switch (indicator) {
      case 'Excellent':
        return 'Excellent';
      case 'Good':
        return 'Good';
      case 'Needs Attention':
        return 'Needs Attention';
      default:
        return 'Active';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">{exam.exam_name}</h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              {subject && <span>{subject}</span>}
              {subject && <span>•</span>}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {exam.date ? new Date(exam.date).toLocaleDateString() : 'Recent'}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${getIndicatorColor(exam.performance_indicator)}`}>
            {getIndicatorText(exam.performance_indicator)}
          </span>
        </div>

        {/* 4-KPI Grid */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Students</span>
            <span className="text-xs font-black text-slate-800 mt-0.5 block">
              {exam.completed_students}/{exam.enrolled_students}
            </span>
          </div>
          <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/50">
            <span className="text-[10px] text-indigo-400 font-bold block uppercase">Avg Score</span>
            <span className="text-xs font-black text-indigo-700 mt-0.5 block">
              {exam.average_score}%
            </span>
          </div>
          <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
            <span className="text-[10px] text-emerald-500 font-bold block uppercase">High / Low</span>
            <span className="text-xs font-black text-slate-800 mt-0.5 block">
              {exam.highest_score}% / {exam.lowest_score}%
            </span>
          </div>
          <div className="bg-cyan-50/50 p-2 rounded-xl border border-cyan-100/50">
            <span className="text-[10px] text-cyan-600 font-bold block uppercase">Pass Rate</span>
            <span className="text-xs font-black text-cyan-800 mt-0.5 block">
              {exam.pass_rate}%
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">
          {exam.completed_students === 0 ? 'No submissions yet' : `${exam.completed_students} submissions graded`}
        </span>
        <button
          type="button"
          onClick={onViewAnalysis}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer group"
        >
          <span>View Analysis</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};

/* ==========================================================================
   PURE SVG DONUT CHART COMPONENT
   ========================================================================== */
interface ExamDonutChartProps {
  passedCount: number;
  failedCount: number;
  passRate: number;
}

const ExamDonutChart: React.FC<ExamDonutChartProps> = ({ passedCount, failedCount, passRate }) => {
  const total = passedCount + failedCount;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const safePassRate = total === 0 ? 0 : Math.max(0, Math.min(100, passRate));
  const passedStroke = (safePassRate / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          {/* Track / Failed arc */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke={total === 0 ? '#e2e8f0' : '#fda4af'}
            strokeWidth="16"
          />
          {/* Passed arc */}
          {total > 0 && (
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth="16"
              strokeDasharray={`${passedStroke} ${circumference}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          )}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-800 leading-none">
            {safePassRate}%
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            Pass Rate
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-700">{passedCount} Passed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
          <span className="text-slate-700">{failedCount} Failed</span>
        </div>
      </div>
    </div>
  );
};
