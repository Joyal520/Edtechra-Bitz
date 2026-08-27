import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import {
  teachingIntelligenceService,
  TeachingIntelligenceResponse,
  ThirtyDayReportRecord
} from '@/services/teachingIntelligenceService';

interface AITeachingIntelligenceModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  onClose: () => void;
}

export const AITeachingIntelligenceModal: React.FC<AITeachingIntelligenceModalProps> = ({
  isOpen,
  classroom,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'intelligence' | '30day-report'>('intelligence');
  const [data, setData] = useState<TeachingIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 30-Day Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<any | null>(null);
  const [reportHistory, setReportHistory] = useState<ThirtyDayReportRecord[]>([]);

  useEffect(() => {
    if (isOpen && classroom?.id) {
      loadIntelligence();
      loadReports();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] max-h-[860px] shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
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
              onClick={() => loadIntelligence(true)}
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
        {/* TABS SELECTOR                                                     */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('intelligence')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'intelligence'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Teaching Intelligence</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('30day-report')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
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

              {/* 5. STUDENTS NEEDING ATTENTION */}
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
          ) : (
            /* ============================================================= */
            /* TAB 2: 30-DAY PERFORMANCE REPORT (R2 PDF STORAGE)             */
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
