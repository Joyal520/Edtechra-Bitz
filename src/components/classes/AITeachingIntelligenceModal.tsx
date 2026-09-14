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
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  TrendingDown,
  Zap,
  Bot,
  CalendarDays
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import {
  teachingIntelligenceService,
  TeachingIntelligenceResponse,
  ThirtyDayReportRecord,
  RecentExamReportCard,
  ExamDetailedAnalysisData,
  StudentIntelligenceDetail,
  StructuredRecommendation,
  TeacherChatMessage
} from '@/services/teachingIntelligenceService';
import { StructuredAIReportRenderer, InlineMarkdown } from './StructuredAIReportRenderer';
import { AITeachingPlannerTab } from './planner/AITeachingPlannerTab';
import { AIActionsDashboard } from './actions/AIActionsDashboard';

export type ModalTab = 'intelligence' | 'planner' | 'actions' | 'students' | 'chat' | 'recent-exams' | '30day-report';

interface AITeachingIntelligenceModalProps {
  isOpen: boolean;
  classroom: Classroom | null;
  onClose: () => void;
  initialTab?: ModalTab;
}

export const AITeachingIntelligenceModal: React.FC<AITeachingIntelligenceModalProps> = ({
  isOpen,
  classroom,
  onClose,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab || 'intelligence');
  const [data, setData] = useState<TeachingIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const sanitizeErrorMessage = (msg: any, fallback: string): string => {
    if (!msg || typeof msg !== 'string') return fallback;
    if (msg.includes('Unexpected token') || msg.includes('is not valid JSON') || msg.includes('JSON.parse') || msg.includes('FUNCTION_INVOCATION_TIMEOUT')) {
      return 'The analytics service is processing a heavy load. Please click "Run Fresh AI Analysis" in a few seconds.';
    }
    return msg;
  };

  // Student Intelligence State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentIntelligenceDetail | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [refreshingStudentAi, setRefreshingStudentAi] = useState(false);
  const [studentDetailError, setStudentDetailError] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'struggling' | 'improving'>('all');

  // AI Teacher Chat State
  const [chatMessages, setChatMessages] = useState<TeacherChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState('');

  // Action Bus Preview Notification State
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  // Prevent underlying classroom page from scrolling while full-screen modal is open, and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      setErrorMsg(sanitizeErrorMessage(err.message, 'Failed to load classroom intelligence.'));
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
      setRecentExamsError(sanitizeErrorMessage(err.message, 'Failed to load recent exam reports.'));
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
      setAnalysisError(sanitizeErrorMessage(err.message, 'Failed to load exam analysis.'));
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
      alert(sanitizeErrorMessage(err.message, 'Failed to refresh AI analysis.'));
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
      alert(sanitizeErrorMessage(err.message, 'Failed to generate 30-day report.'));
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSelectStudent = async (studentId: string) => {
    if (!classroom?.id || !studentId) return;
    setSelectedStudentId(studentId);
    setLoadingStudentDetail(true);
    setStudentDetailError('');
    try {
      const res = await teachingIntelligenceService.getStudentIntelligence(classroom.id, studentId);
      setStudentDetail({
        ...res.student,
        ai_assessment: res.ai_assessment
      });
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] load student error:', err);
      setStudentDetailError(sanitizeErrorMessage(err.message, 'Failed to load student intelligence.'));
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const handleRefreshStudentAi = async (studentId: string) => {
    if (!classroom?.id || !studentId) return;
    setRefreshingStudentAi(true);
    try {
      const res = await teachingIntelligenceService.refreshStudentAIAssessment(classroom.id, studentId);
      if (studentDetail) {
        setStudentDetail({
          ...studentDetail,
          ai_assessment: res.ai_assessment
        });
      }
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] refresh student AI error:', err);
      alert(sanitizeErrorMessage(err.message, 'Failed to refresh student AI assessment.'));
    } finally {
      setRefreshingStudentAi(false);
    }
  };

  const handleSendChat = async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim();
    if (!classroom?.id || !text || sendingChat) return;

    const userMsg: TeacherChatMessage = {
      role: 'teacher',
      content: text,
      timestamp: new Date().toISOString()
    };

    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    if (!overrideText) setChatInput('');
    setSendingChat(true);
    setChatError('');

    try {
      const res = await teachingIntelligenceService.sendTeacherChatMessage(
        classroom.id,
        text,
        chatMessages
      );
      if (res.reply) {
        const assistantMsg: TeacherChatMessage = {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString()
        };
        setChatMessages([...nextHistory, assistantMsg]);
      } else {
        throw new Error(res.error || 'No response received from AI assistant.');
      }
    } catch (err: any) {
      console.error('[TeachingIntelligenceModal] chat error:', err);
      setChatError(sanitizeErrorMessage(err.message, 'Failed to send message to AI assistant.'));
    } finally {
      setSendingChat(false);
    }
  };

  if (!isOpen || !classroom) return null;

  const metrics = data?.metrics?.class_summary;
  const classHealth = data?.metrics?.class_health;
  const intel = data?.intelligence;
  const topics = data?.metrics?.topic_performance || [];
  const writingIntel = (intel as any)?.writing_intelligence || (data?.metrics as any)?.writing_intelligence;

  // Derive student roster for Tab 2
  const rawRoster: Array<{
    studentId: string;
    fullName: string;
    email?: string;
    averagePercentage?: number | null;
    trend?: string;
    performanceCategory?: string;
    isAttention?: boolean;
    isImproving?: boolean;
  }> = (data?.metrics?.students || []).map((s: any) => ({
    studentId: s.studentId || s.student_id,
    fullName: s.fullName || s.student_name || s.student_ref || 'Student',
    email: s.email || '',
    averagePercentage: s.averagePercentage ?? s.average_score ?? null,
    trend: s.trend || 'STEADY',
    performanceCategory: s.performanceCategory || 'ON_TRACK',
    isAttention: (data?.metrics?.students_needing_attention || []).some((a: any) => (a.studentId === (s.studentId || s.student_id))),
    isImproving: (data?.metrics?.class_health?.improvingStudents || []).some((imp: any) => (imp.studentId === (s.studentId || s.student_id)))
  }));

  const mergedRoster = rawRoster.length > 0 ? rawRoster : (data?.metrics?.students_needing_attention || []).map((a: any) => ({
    studentId: a.studentId || a.student_ref,
    fullName: a.student_ref,
    email: '',
    averagePercentage: a.average_score ?? null,
    trend: a.trend || 'STEADY',
    performanceCategory: 'NEEDS_SUPPORT',
    isAttention: true,
    isImproving: false
  }));

  const filteredRoster = mergedRoster.filter((st) => {
    const matchesSearch = st.fullName.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (st.email && st.email.toLowerCase().includes(rosterSearch.toLowerCase()));
    const matchesFilter =
      rosterFilter === 'all' ||
      (rosterFilter === 'struggling' && (st.isAttention || (st.averagePercentage != null && st.averagePercentage < 65))) ||
      (rosterFilter === 'improving' && (st.isImproving || st.trend === 'IMPROVING'));
    return matchesSearch && matchesFilter;
  });

  // Filter student performance table for exam analysis
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
    <div className="fixed inset-0 z-[9999] w-screen h-screen h-[100dvh] bg-slate-50 flex flex-col overflow-hidden animate-in fade-in duration-150">
      <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">
        
        {/* ================================================================= */}
        {/* TOP COMMAND CENTER HEADER (Harmonized with Classroom Hero)        */}
        {/* ================================================================= */}
        <div className="px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#0a192f] via-[#0d223f] to-[#071322] border-b border-sky-500/25 text-white flex items-center justify-between shrink-0 shadow-md relative overflow-hidden">
          {/* Ambient header glows */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 right-1/4 w-48 h-48 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Left: AI Icon + Title + Badges */}
          <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/40 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight truncate">
                  AI Teaching Intelligence
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-xs shrink-0">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>{data?.cached ? 'Cached • 0 Tokens' : data?.ai_provider === 'openai_fallback' ? 'OpenAI' : 'Google Gemini AI'}</span>
                </div>
              </div>
              <p className="text-xs text-sky-200/90 font-medium truncate hidden sm:block mt-0.5">
                Grounded pedagogical analytics & automated diagnostics for {classroom.title}
              </p>
            </div>
          </div>

          {/* Right Controls: Refresh AI + Close Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => {
                loadIntelligence(true);
                loadRecentExams();
              }}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-400 hover:to-cyan-400 text-white rounded-xl text-xs font-black shadow-md shadow-sky-500/25 active:scale-95 transition-all cursor-pointer border border-cyan-300/30 disabled:opacity-50 select-none"
              title="Recalculate AI analysis with fresh classroom data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Analyzing...' : 'Refresh AI'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-sky-200 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
              title="Close Teaching Intelligence"
              aria-label="Close Teaching Intelligence"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABS SELECTOR (5 TABS - HORIZONTALLY SCROLLABLE ON MOBILE)        */}
        {/* ================================================================= */}
        <div className="bg-white border-b border-slate-200/90 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 shadow-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 flex-1 min-w-0">
            
            {/* Tab 1: Teaching Intelligence */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('intelligence');
                setSelectedExamId(null);
              }}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none ${
                activeTab === 'intelligence'
                  ? 'bg-[#0a192f] text-white shadow-sm border border-[#0a192f]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Teaching Intelligence</span>
            </button>

            {/* Tab 2: AI Teaching Planner (Phase 2A) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('planner');
                setSelectedStudentId(null);
                setSelectedExamId(null);
              }}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none ${
                activeTab === 'planner'
                  ? 'bg-gradient-to-r from-[#026fc3] to-sky-500 text-white shadow-sm shadow-sky-500/20 border border-sky-400/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span>Teaching Planner</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                activeTab === 'planner' ? 'bg-white/25 text-white' : 'bg-sky-100 text-[#026fc3]'
              }`}>
                2A
              </span>
            </button>

            {/* Tab 2B: AI Action Center */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('actions');
                setSelectedStudentId(null);
                setSelectedExamId(null);
              }}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none ${
                activeTab === 'actions'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/20 border border-indigo-400/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0 text-amber-300" />
              <span>Action Center</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                activeTab === 'actions' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                2B
              </span>
            </button>

            {/* Tab 3: Student Intelligence */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('students');
                setSelectedExamId(null);
                if (!selectedStudentId && mergedRoster.length > 0) {
                  handleSelectStudent(mergedRoster[0].studentId);
                }
              }}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 border border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Student Intelligence</span>
              {((data?.metrics?.students_needing_attention?.length || 0) > 0 || (classHealth?.strugglingCount || 0) > 0) && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                  activeTab === 'students' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'
                }`}>
                  {data?.metrics?.students_needing_attention?.length || classHealth?.strugglingCount}
                </span>
              )}
            </button>

            {/* Tab 3: AI Teacher Chat */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('chat');
                setSelectedExamId(null);
              }}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none ${
                activeTab === 'chat'
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/20 border border-sky-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>AI Teacher Chat</span>
            </button>

            {/* Tab 4: Recent Exam Reports */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('recent-exams');
              }}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none ${
                activeTab === 'recent-exams'
                  ? 'bg-[#026fc3] text-white shadow-sm shadow-sky-500/20 border border-[#026fc3]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Recent Exam Reports</span>
              {recentExams.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                  activeTab === 'recent-exams' ? 'bg-white/25 text-white' : 'bg-sky-100 text-sky-800'
                }`}>
                  {recentExams.length}
                </span>
              )}
            </button>

            {/* Tab 5: 30-Day Performance Report */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('30day-report');
                setSelectedExamId(null);
              }}
              className={`h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none ${
                activeTab === '30day-report'
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20 border border-violet-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>30-Day Performance Report</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-bold hidden xl:flex items-center gap-1.5 shrink-0">
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
              
              {/* Action notice banner if teacher previewed an action */}
              {actionNotice && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                    <p className="text-xs font-bold text-indigo-900">{actionNotice}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionNotice(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-black cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* 1. TOP KPI METRICS STRIP (GROUNDED CLASS HEALTH) */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all">
                    <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Class Average</span>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-indigo-600">
                        {classHealth?.classAverage != null ? `${classHealth.classAverage}%` : metrics?.overall_score != null ? `${metrics.overall_score}%` : '—'}
                      </span>
                      {metrics?.score_change ? (
                        <span className={`text-xs font-black ${metrics.score_change >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {metrics.score_change >= 0 ? `+${metrics.score_change}%` : `${metrics.score_change}%`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500">All Sources</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 shadow-2xs hover:border-sky-300 transition-all">
                    <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Task Completion</span>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900">
                        {classHealth?.completionRate ?? metrics?.task_completion_rate ?? 0}%
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">Classroom</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 shadow-2xs hover:border-purple-300 transition-all">
                    <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Active Participation</span>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-purple-600">
                        {classHealth?.participationRate ?? metrics?.engagement_rate ?? 0}%
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">Enrolled</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 shadow-2xs hover:border-cyan-300 transition-all">
                    <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Assessments Count</span>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-cyan-600">
                        {classHealth?.assessmentActivityCount ?? (
                          (metrics?.assessments_count?.tasks || 0) +
                          (metrics?.assessments_count?.quizzes || 0) +
                          (metrics?.assessments_count?.exams || 0) +
                          (metrics?.assessments_count?.ocr_assessments || 0)
                        )}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">Evaluated</span>
                    </div>
                  </div>
                </div>

                {/* Class Health Sub-bar */}
                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border-2 border-slate-200/80 shadow-2xs text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-extrabold text-slate-800">Improving Students:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200">
                        {classHealth?.improvingCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-extrabold text-slate-800">Struggling Students:</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-xs border border-rose-200">
                        {classHealth?.strugglingCount || data?.metrics?.students_needing_attention?.length || 0}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('students');
                      if (!selectedStudentId && mergedRoster.length > 0) {
                        handleSelectStudent(mergedRoster[0].studentId);
                      }
                    }}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Student Roster</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
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

              {/* CLEAN EMPTY STATE WHEN NO ANALYSIS GENERATED YET */}
              {(!intel || data?.has_analysis === false) ? (
                <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-200/90 shadow-2xs text-center space-y-5 max-w-2xl mx-auto my-6">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25 ring-4 ring-sky-100">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      AI Teaching Intelligence
                    </h3>
                    <p className="text-sm sm:text-base font-bold text-slate-700">
                      No analysis generated yet.
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
                      Generate an evidence-based classroom analysis using student performance, assessments, assignments and learning activity.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => loadIntelligence(true)}
                      disabled={refreshing}
                      className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-sky-500/25 active:scale-95 transition-all cursor-pointer border border-white/20 disabled:opacity-50 select-none"
                    >
                      <Sparkles className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>{refreshing ? 'Generating AI Analysis...' : 'Generate AI Analysis'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Executive Summary / Class Insight */}
                  {intel.summary && (
                    <div className="bg-gradient-to-br from-sky-50/90 via-white to-sky-50/40 rounded-3xl p-5 sm:p-6 md:p-7 border-2 border-sky-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-sky-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 border border-sky-200/80">
                            <Sparkles className="w-4 h-4 text-[#026fc3]" />
                          </div>
                          <h4 className="text-base sm:text-lg font-black text-sky-950 tracking-tight">
                            Class Executive Insight
                          </h4>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
                          Class Insight
                        </span>
                      </div>
                      <p className="text-base sm:text-[16px] md:text-[17px] text-slate-800 font-medium leading-[1.65] max-w-4xl">
                        <InlineMarkdown text={intel.summary} />
                      </p>
                    </div>
                  )}

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
                                <p className="text-slate-200 font-medium leading-relaxed"><InlineMarkdown text={item.why} /></p>
                              </div>
                              <div className="bg-black/20 p-2.5 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-emerald-300 block mb-0.5">Recommended Action:</span>
                                <p className="text-slate-100 font-semibold leading-relaxed"><InlineMarkdown text={item.recommended_action} /></p>
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
                        <span className="text-xs font-black text-emerald-950 block"><InlineMarkdown text={s.title} /></span>
                        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed"><InlineMarkdown text={s.detail} /></p>
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
                        <span className="text-xs font-black text-amber-950 block"><InlineMarkdown text={a.title} /></span>
                        <p className="text-[11px] text-amber-800 font-medium leading-relaxed"><InlineMarkdown text={a.detail} /></p>
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

              {/* 6. STUDENTS NEEDING ATTENTION (RANKED ON REAL EVIDENCE) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Students Needing Attention
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Evidence-grounded identified learners requiring differentiated academic support
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    Intervention Priority
                  </span>
                </div>

                {((data?.metrics?.students_needing_attention || intel?.students_needing_attention || []).length === 0) ? (
                  <div className="p-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">Not enough evidence yet.</p>
                    <p className="text-[11px] text-slate-500">
                      Students requiring targeted intervention will appear here once classroom assessments are completed.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(data?.metrics?.students_needing_attention || intel?.students_needing_attention || []).map((st, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2.5 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-black text-slate-900">{st.student_ref}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {st.average_score != null && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                                  Avg: {st.average_score}%
                                </span>
                              )}
                              {st.trend && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  st.trend.startsWith('+') || st.trend === 'IMPROVING'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : st.trend.startsWith('-') || st.trend === 'DECLINING'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {st.trend}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-rose-700 font-bold bg-rose-50/70 px-2.5 py-1.5 rounded-xl border border-rose-200/60">
                            <strong>Weakness:</strong> <InlineMarkdown text={st.main_weakness || st.issue} />
                          </div>

                          {st.recent_evidence && (
                            <p className="text-[11px] text-slate-500 font-medium">
                              <strong>Evidence:</strong> <InlineMarkdown text={st.recent_evidence} />
                            </p>
                          )}

                          {(st.recommended_action || st.suggested_support) && (
                            <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80 font-medium leading-relaxed">
                              <strong className="text-indigo-900">Recommended Action:</strong> <InlineMarkdown text={st.recommended_action || st.suggested_support || ''} />
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const sid = st.studentId || st.student_ref;
                              handleSelectStudent(sid);
                              setActiveTab('students');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            <span>Diagnose Student</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. RECOMMENDED PEDAGOGICAL ACTIONS (STRUCTURED WITH ACTION BUS SPEC) */}
              <div className="bg-slate-50 rounded-3xl p-5 sm:p-6 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Recommended Pedagogical Actions
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Concrete interventions structured into Observation, Analysis, and Action Plan
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Action Plan
                  </span>
                </div>

                {((intel?.recommended_actions || []).length === 0) ? (
                  <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-700">Not enough evidence yet.</p>
                    <p className="text-[11px] text-slate-500">
                      Conduct more classroom activities to generate tailored pedagogical action plans.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(intel?.recommended_actions || []).map((item, idx) => {
                      const isStructured = typeof item === 'object' && item !== null && 'observation' in item;
                      const rec = item as StructuredRecommendation;

                      if (!isStructured) {
                        return (
                          <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-white rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800">
                            <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{String(item)}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 inline-block mb-1">
                                Observation
                              </span>
                              <p className="text-xs font-bold text-slate-900 leading-snug">
                                <InlineMarkdown text={rec.observation} />
                              </p>
                            </div>

                            {rec.action_spec && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionNotice(`Action Bus Preview: "${rec.action_spec?.action_label}" queued for ${rec.action_spec?.target_topic || 'classroom target'}. Automated bus execution will activate in Phase 2.`);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-all active:scale-95"
                                title="Action Bus Ready"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-300" />
                                <span>{rec.action_spec.action_label}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                              <span className="text-[10px] font-black uppercase text-slate-500 block">
                                Pedagogical Analysis:
                              </span>
                              <p className="text-slate-700 font-medium leading-relaxed">
                                <InlineMarkdown text={rec.analysis} />
                              </p>
                            </div>

                            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60 space-y-0.5">
                              <span className="text-[10px] font-black uppercase text-indigo-700 block">
                                Concrete Recommendation:
                              </span>
                              <p className="text-indigo-950 font-semibold leading-relaxed">
                                <InlineMarkdown text={rec.recommendation} />
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

            </div>
          ) : activeTab === 'planner' && classroom ? (
            /* ============================================================= */
            /* TAB 2: AI TEACHING PLANNER (PHASE 2A)                         */
            /* ============================================================= */
            <AITeachingPlannerTab
              classroom={classroom}
              onOpenActionCenter={() => setActiveTab('actions')}
            />
          ) : activeTab === 'actions' && classroom ? (
            /* ============================================================= */
            /* TAB 2B: AI ACTION EXECUTION BUS (PHASE 2B)                    */
            /* ============================================================= */
            <AIActionsDashboard
              classroomId={classroom.id}
              classroomTitle={classroom.title}
              onNavigateToPlanner={() => setActiveTab('planner')}
            />
          ) : activeTab === 'students' ? (
            /* ============================================================= */
            /* TAB 2: STUDENT INTELLIGENCE                                   */
            /* ============================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
              
              {/* Left Column: Student Roster List (4 cols on desktop) */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Class Roster
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {filteredRoster.length} {filteredRoster.length === 1 ? 'Student' : 'Students'}
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 pb-1">
                  {(['all', 'struggling', 'improving'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setRosterFilter(filterKey)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-black capitalize transition-all cursor-pointer ${
                        rosterFilter === filterKey
                          ? filterKey === 'struggling'
                            ? 'bg-rose-600 text-white'
                            : filterKey === 'improving'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filterKey === 'all' ? 'All' : filterKey === 'struggling' ? 'Needs Help' : 'Improving'}
                    </button>
                  ))}
                </div>

                {/* Roster List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[560px]">
                  {filteredRoster.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      {mergedRoster.length === 0
                        ? 'No student learning records recorded yet.'
                        : 'No students match your filter.'}
                    </div>
                  ) : (
                    filteredRoster.map((st) => {
                      const isSelected = selectedStudentId === st.studentId;
                      return (
                        <div
                          key={st.studentId}
                          onClick={() => handleSelectStudent(st.studentId)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                              : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-black truncate ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                                {st.fullName}
                              </span>
                              {st.isAttention && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Needs attention" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                              <span>
                                {st.averagePercentage != null ? `${st.averagePercentage}% Avg` : 'No score'}
                              </span>
                              <span>•</span>
                              <span className={`font-black ${
                                st.trend === 'IMPROVING' || (st.trend && st.trend.startsWith('+'))
                                  ? 'text-emerald-600'
                                  : st.trend === 'DECLINING' || (st.trend && st.trend.startsWith('-'))
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}>
                                {st.trend === 'IMPROVING' ? 'Improving' : st.trend === 'DECLINING' ? 'Declining' : st.trend || 'Steady'}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300'
                          }`} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Student Intelligence Deep Dive (8 cols on desktop) */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                {loadingStudentDetail ? (
                  <div className="py-32 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-slate-200/80 p-6">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-900">Loading Student Intelligence</h4>
                      <p className="text-xs text-slate-500 max-w-xs">
                        Synthesizing student mastery across all 5 classroom assessment sources...
                      </p>
                    </div>
                  </div>
                ) : studentDetailError ? (
                  <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-rose-900">Failed to Load Student</h4>
                      <p className="text-xs text-rose-700">{studentDetailError}</p>
                    </div>
                    {selectedStudentId && (
                      <button
                        type="button"
                        onClick={() => handleSelectStudent(selectedStudentId)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                ) : !studentDetail ? (
                  <div className="py-32 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200 p-6">
                    <Users className="w-10 h-10 text-slate-300" />
                    <div className="space-y-1 max-w-sm">
                      <h4 className="text-sm font-black text-slate-700">Select a Student</h4>
                      <p className="text-xs text-slate-500">
                        Choose any learner from the class roster to view their grounded performance metrics, activity breakdown, and AI pedagogical diagnosis.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    
                    {/* Student Header Card */}
                    <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                            Student Intelligence
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            studentDetail.trend === 'IMPROVING'
                              ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                              : studentDetail.trend === 'DECLINING'
                              ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30'
                              : 'bg-white/10 text-slate-200 border border-white/15'
                          }`}>
                            Trend: {studentDetail.trend}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                            {studentDetail.performanceCategoryLabel || studentDetail.performanceCategory}
                          </span>
                        </div>

                        <h3 className="text-xl font-black text-white">
                          {studentDetail.fullName}
                        </h3>
                        {studentDetail.email && (
                          <p className="text-xs text-indigo-200 font-medium">{studentDetail.email}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-indigo-200 block">Overall Mastery</span>
                          <span className="text-2xl font-black text-white">
                            {studentDetail.averagePercentage != null ? `${studentDetail.averagePercentage}%` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Student 4-KPI Metric Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Avg Score</span>
                        <span className="text-xl font-black text-indigo-600 mt-0.5 block">
                          {studentDetail.averagePercentage != null ? `${studentDetail.averagePercentage}%` : '—'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">Across Activities</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Accuracy</span>
                        <span className="text-xl font-black text-slate-900 mt-0.5 block">
                          {studentDetail.accuracyPercentage != null ? `${studentDetail.accuracyPercentage}%` : '—'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">Question Accuracy</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Completion</span>
                        <span className="text-xl font-black text-emerald-600 mt-0.5 block">
                          {studentDetail.completionRate}%
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">Submission Rate</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                        <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Assessments</span>
                        <span className="text-xl font-black text-purple-600 mt-0.5 block">
                          {studentDetail.attempts}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">Total Attempts</span>
                      </div>
                    </div>

                    {/* Strong & Weak Areas Tags */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-black uppercase tracking-wider">Strong Areas</span>
                        </div>
                        {studentDetail.strongAreas && studentDetail.strongAreas.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {studentDetail.strongAreas.map((sa, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-white rounded-xl text-xs font-bold text-emerald-900 border border-emerald-200/80 shadow-2xs"
                              >
                                {sa.topic} ({sa.average}%)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Not enough evidence yet.</p>
                        )}
                      </div>

                      <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-rose-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-xs font-black uppercase tracking-wider">Areas for Growth</span>
                        </div>
                        {studentDetail.weakAreas && studentDetail.weakAreas.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {studentDetail.weakAreas.map((wa, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-white rounded-xl text-xs font-bold text-rose-900 border border-rose-200/80 shadow-2xs"
                              >
                                {wa.topic} ({wa.average}%)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">Not enough evidence yet.</p>
                        )}
                      </div>
                    </div>

                    {/* 5-Source Activity Breakdown */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            5-Source Learning Activity Breakdown
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Synthesized records across quizzes, exams, assignments, OCR, and AI challenges
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-0.5">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Live Quizzes</span>
                          <span className="text-sm font-black text-slate-900 block">
                            {studentDetail.activityBreakdown.live_quiz.averageScore != null ? `${studentDetail.activityBreakdown.live_quiz.averageScore}%` : '—'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">{studentDetail.activityBreakdown.live_quiz.attempts} attempts</span>
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-0.5">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Exams</span>
                          <span className="text-sm font-black text-slate-900 block">
                            {studentDetail.activityBreakdown.exam.averageScore != null ? `${studentDetail.activityBreakdown.exam.averageScore}%` : '—'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">{studentDetail.activityBreakdown.exam.attempts} attempts</span>
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-0.5">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Assignments</span>
                          <span className="text-sm font-black text-slate-900 block">
                            {studentDetail.activityBreakdown.assignment.averageScore != null ? `${studentDetail.activityBreakdown.assignment.averageScore}%` : '—'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">{studentDetail.activityBreakdown.assignment.attempts} submitted</span>
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-0.5">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">OCR Tests</span>
                          <span className="text-sm font-black text-slate-900 block">
                            {studentDetail.activityBreakdown.ocr.averageScore != null ? `${studentDetail.activityBreakdown.ocr.averageScore}%` : '—'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">{studentDetail.activityBreakdown.ocr.attempts} graded</span>
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-0.5 col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">AI Challenges</span>
                          <span className="text-sm font-black text-slate-900 block">
                            {studentDetail.activityBreakdown.ai_challenge.averageScore != null ? `${studentDetail.activityBreakdown.ai_challenge.averageScore}%` : '—'}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">{studentDetail.activityBreakdown.ai_challenge.attempts} completed</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Pedagogical Assessment Card */}
                    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-300" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                            AI Pedagogical Diagnosis
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRefreshStudentAi(studentDetail.studentId)}
                          disabled={refreshingStudentAi}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshingStudentAi ? 'animate-spin text-indigo-300' : ''}`} />
                          <span>{refreshingStudentAi ? 'Diagnosing...' : 'Refresh AI'}</span>
                        </button>
                      </div>

                      {studentDetail.ai_assessment?.has_sufficient_data === false ? (
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center space-y-1">
                          <p className="text-xs font-bold text-indigo-200">Not enough evidence yet.</p>
                          <p className="text-[11px] text-slate-300">
                            {studentDetail.ai_assessment.message || 'Have this student complete more quizzes or assignments to generate targeted AI diagnostic insights.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 text-xs">
                          <div className="p-3 bg-black/20 rounded-2xl border border-white/10 space-y-1">
                            <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">
                              What They Are Doing Well
                            </span>
                            <p className="text-slate-200 leading-relaxed">
                              <InlineMarkdown text={studentDetail.ai_assessment?.doing_well || 'Demonstrating consistent engagement across completed coursework.'} />
                            </p>
                          </div>

                          <div className="p-3 bg-black/20 rounded-2xl border border-white/10 space-y-1">
                            <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider block">
                              Where They Are Struggling
                            </span>
                            <p className="text-slate-200 leading-relaxed">
                              <InlineMarkdown text={studentDetail.ai_assessment?.where_struggling || 'Requires reinforcement in core topic assessments.'} />
                            </p>
                          </div>

                          <div className="p-3 bg-black/20 rounded-2xl border border-white/10 space-y-1">
                            <span className="text-[10px] font-black uppercase text-amber-200 tracking-wider block">
                              Grounded Evidence
                            </span>
                            <p className="text-slate-200 leading-relaxed">
                              <InlineMarkdown text={studentDetail.ai_assessment?.evidence || `Based on ${studentDetail.attempts} learning events in this classroom.`} />
                            </p>
                          </div>

                          <div className="p-3 bg-black/20 rounded-2xl border border-white/10 space-y-1">
                            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider block">
                              Recommended Next Steps
                            </span>
                            <p className="text-slate-100 font-semibold leading-relaxed">
                              <InlineMarkdown text={studentDetail.ai_assessment?.next_steps || 'Assign differentiated review set focusing on identified weak concepts.'} />
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chronological Assessment History Table */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Assessment History ({studentDetail.assessmentHistory.length})
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">Chronological</span>
                      </div>

                      {studentDetail.assessmentHistory.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 italic">No assessment submissions recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                                <th className="pb-2 font-bold">Activity</th>
                                <th className="pb-2 font-bold">Type</th>
                                <th className="pb-2 font-bold">Topic</th>
                                <th className="pb-2 font-bold text-right">Score</th>
                                <th className="pb-2 font-bold text-right">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y border-slate-100 font-medium text-slate-700">
                              {studentDetail.assessmentHistory.map((ev) => (
                                <tr key={ev.id} className="hover:bg-slate-50/60">
                                  <td className="py-2.5 font-bold text-slate-900 max-w-[180px] truncate">
                                    {ev.activityTitle}
                                  </td>
                                  <td className="py-2.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                                      {ev.activityType.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-slate-500 max-w-[140px] truncate">
                                    {ev.topic || 'General'}
                                  </td>
                                  <td className="py-2.5 text-right font-black">
                                    <span className={`${
                                      ev.percentage != null
                                        ? ev.percentage >= 75
                                          ? 'text-emerald-600'
                                          : ev.percentage < 60
                                          ? 'text-rose-600'
                                          : 'text-indigo-600'
                                        : 'text-slate-400'
                                    }`}>
                                      {ev.percentage != null ? `${ev.percentage}%` : ev.score != null ? `${ev.score}` : '—'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right text-slate-400 text-[11px]">
                                    {ev.completedAt ? new Date(ev.completedAt).toLocaleDateString() : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

            </div>
          ) : activeTab === 'chat' ? (
            /* ============================================================= */
            /* TAB 3: AI TEACHER CHAT (HIGH-CONTRAST EVIDENCE GROUNDED CHAT) */
            /* ============================================================= */
            <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm flex flex-col h-full min-h-[640px] flex-1 overflow-hidden">
              
              {/* Chat Top Banner */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center font-black shadow-xs ring-2 ring-sky-100 shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                        Evidence-Grounded AI Teaching Assistant
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Zero Hallucination
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Answers inquiries using verified assessment records from this classroom.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setChatMessages([])}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                >
                  Clear Chat
                </button>
              </div>

              {/* Quick Prompt Suggestion Chips */}
              <div className="px-4 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 shrink-0">
                  Try asking:
                </span>
                {[
                  'Who needs the most help in this class?',
                  'What topics should I reteach tomorrow?',
                  'Which students have shown the most improvement?',
                  'Draft a quick remedial plan for struggling students'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChat(chip)}
                    disabled={sendingChat}
                    className="px-3 py-1.5 bg-white hover:bg-sky-50 text-slate-800 hover:text-sky-900 border-2 border-slate-200 hover:border-sky-300 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8fafc]">
                {chatMessages.length === 0 ? (
                  <div className="py-20 sm:py-24 text-center space-y-4 max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white flex items-center justify-center mx-auto shadow-md shadow-sky-500/25 ring-4 ring-sky-100">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900">
                        AI Teacher Assistant
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                        Ask about your students, topics, assessments, or lesson strategies.
                      </p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => {
                    const isTeacher = msg.role === 'teacher' || msg.role === 'user';
                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 ${isTeacher ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isTeacher && (
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-black text-xs shadow-xs ring-2 ring-sky-100">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-xl sm:max-w-2xl p-4 sm:p-5 rounded-3xl text-sm space-y-2 shadow-xs ${
                            isTeacher
                              ? 'bg-gradient-to-r from-[#026fc3] to-[#0284c7] text-white rounded-br-xs border border-sky-400/30'
                              : 'bg-white border-2 border-sky-100 text-slate-900 rounded-bl-xs'
                          }`}
                        >
                          {isTeacher ? (
                            <div className="whitespace-pre-wrap leading-relaxed font-semibold text-white">
                              {msg.content}
                            </div>
                          ) : (
                            <StructuredAIReportRenderer content={msg.content} />
                          )}
                          <span className={`text-[10px] block font-bold ${isTeacher ? 'text-sky-100 text-right' : 'text-slate-500'}`}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {sendingChat && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs ring-2 ring-sky-100">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border-2 border-sky-200 p-4 rounded-2xl text-xs sm:text-sm text-slate-700 font-bold flex items-center gap-2.5 shadow-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#026fc3]" />
                      <span>Synthesizing answer from classroom records...</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 font-semibold">
                    {chatError}
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="p-3.5 sm:p-4 border-t-2 border-slate-200 bg-white flex items-center gap-3 relative z-10"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about students, topics, or lesson strategies..."
                  disabled={sendingChat}
                  style={{ color: '#0f172a', backgroundColor: '#ffffff', caretColor: '#026fc3' }}
                  className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all shadow-xs"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingChat}
                  className="px-5 sm:px-6 py-3 bg-gradient-to-r from-sky-600 via-[#026fc3] to-cyan-600 hover:from-sky-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-500/25 active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>

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
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Total Students</span>
                          <span className="text-xl font-black text-slate-900 mt-0.5 block">
                            {examAnalysis.summary.total_students}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">Enrolled</span>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Class Average</span>
                          <span className="text-xl font-black text-indigo-600 mt-0.5 block">
                            {examAnalysis.summary.average_score}%
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-600">Overall</span>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Highest Score</span>
                          <span className="text-xl font-black text-emerald-600 mt-0.5 block">
                            {examAnalysis.summary.highest_score}%
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600">Top Result</span>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Lowest Score</span>
                          <span className="text-xl font-black text-rose-600 mt-0.5 block">
                            {examAnalysis.summary.lowest_score}%
                          </span>
                          <span className="text-[10px] font-semibold text-rose-600">Floor Result</span>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Pass Rate</span>
                          <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                            {examAnalysis.summary.pass_rate}%
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {examAnalysis.summary.passed_count} of {examAnalysis.summary.completed_students}
                          </span>
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
                          <span className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">Completion Rate</span>
                          <span className="text-xl font-black text-cyan-600 mt-0.5 block">
                            {examAnalysis.summary.completion_rate}%
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
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
                              <InlineMarkdown text={examAnalysis.ai_analysis.class_performance_summary} />
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
                        <InlineMarkdown text={reportResult.report.sections?.executive_summary} />
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
                          <InlineMarkdown text={reportResult.report.sections?.positive_feedback} />
                        </p>
                      </div>

                      <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/60">
                        <strong className="block text-rose-950 font-bold mb-1">Critical Feedback (Honest Assessment):</strong>
                        <p className="text-rose-900 leading-relaxed font-medium">
                          <InlineMarkdown text={reportResult.report.sections?.critical_feedback} />
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <strong className="block text-slate-900 font-bold mb-2">Next-Month Strategic Action Plan:</strong>
                      <div className="space-y-1.5">
                        {(reportResult.report.sections?.next_month_strategy || []).map((st: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-slate-800">
                            <span className="font-bold text-indigo-600">{idx + 1}.</span>
                            <span><InlineMarkdown text={st} /></span>
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
