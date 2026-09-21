import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  FileText,
  Trophy,
  Flame,
  Eye,
  MessageSquare,
  BarChart3,
  BookOpen,
  AlertCircle,
  Zap,
  GraduationCap,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  studentLearningService,
  StudentLearningResponse,
  StudentCorrectedWorkItem,
  StudentTopicProgress,
  StudentAchievementItem
} from '@/services/studentLearningService';
import { CorrectedWorkModal } from './CorrectedWorkModal';

interface StudentReportModalProps {
  isOpen: boolean;
  classroomId: string;
  classroomTitle?: string;
  onClose: () => void;
  initialTab?: 'results' | 'corrected' | 'progress' | 'achievements';
  refreshTrigger?: number;
}

interface UnifiedResultItem {
  id: string;
  title: string;
  category: 'task' | 'quiz' | 'exam' | 'competition';
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  date: string;
  status: string;
  feedback?: string | null;
  isAiGraded?: boolean;
  writingEvaluation?: any;
}

export const StudentReportModal: React.FC<StudentReportModalProps> = ({
  isOpen,
  classroomId,
  classroomTitle = 'Classroom',
  onClose,
  initialTab = 'results',
  refreshTrigger = 0
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'corrected' | 'progress' | 'achievements'>(initialTab);
  const [data, setData] = useState<StudentLearningResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<'all' | 'task' | 'quiz' | 'exam' | 'competition'>('all');

  // Sub-modal state for viewing specific corrected work / files
  const [selectedWork, setSelectedWork] = useState<StudentCorrectedWorkItem | null>(null);
  const [workModalTab, setWorkModalTab] = useState<'work' | 'feedback' | 'original'>('work');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentLearningService.getMyLearningData(classroomId);
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your personal learning report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchReport();
  }, [isOpen, classroomId, refreshTrigger]);

  // Auto-refresh when tab becomes visible (handles background evaluation completion)
  useEffect(() => {
    if (!isOpen) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchReport();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isOpen, classroomId]);

  const openWorkModal = (item: StudentCorrectedWorkItem, tab: 'work' | 'feedback' | 'original' = 'work') => {
    setSelectedWork(item);
    setWorkModalTab(tab);
  };

  // Flatten and unify results from tasks, quizzes, exams, and competitions
  const unifiedResults = useMemo<UnifiedResultItem[]>(() => {
    if (!data?.results) return [];

    const list: UnifiedResultItem[] = [];

    (data.results.tasks || []).forEach((t: any) => {
      list.push({
        id: `task-${t.id}`,
        title: t.title,
        category: 'task',
        score: t.score,
        maxScore: t.max_score,
        percentage: t.percentage,
        date: t.completed_at || t.submitted_at,
        status: t.status,
        feedback: t.teacher_feedback,
        isAiGraded: Boolean(t.is_ai_graded || t.writing_evaluation),
        writingEvaluation: t.writing_evaluation || null
      });
    });

    (data.results.quizzes || []).forEach((q) => {
      list.push({
        id: `quiz-${q.id}`,
        title: q.title,
        category: 'quiz',
        score: q.score,
        maxScore: q.total_questions,
        percentage: q.percentage,
        date: q.completed_at,
        status: 'completed'
      });
    });

    (data.results.exams || []).forEach((e) => {
      list.push({
        id: `exam-${e.id}`,
        title: e.title,
        category: 'exam',
        score: e.score,
        maxScore: e.total_marks,
        percentage: e.percentage,
        date: e.submitted_at,
        status: e.status
      });
    });

    (data.results.competitions || []).forEach((c) => {
      list.push({
        id: `comp-${c.id}`,
        title: c.title,
        category: 'competition',
        score: c.score,
        maxScore: c.max_score,
        percentage: c.percentage,
        date: c.submitted_at,
        status: c.status,
        feedback: c.feedback
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data]);

  const filteredResults = useMemo(() => {
    if (resultFilter === 'all') return unifiedResults;
    return unifiedResults.filter((r) => r.category === resultFilter);
  }, [unifiedResults, resultFilter]);

  if (!isOpen) return null;

  const performance = data?.performance;
  const correctedWork = data?.corrected_work || [];
  const topics = data?.topics || [];
  const achievements = data?.achievements;
  const student = data?.student;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* ======================================================================= */}
        {/* MODAL HEADER: STUDENT IDENTITY & HIGHLIGHT METRICS                      */}
        {/* ======================================================================= */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-50 via-sky-50/50 to-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-[#026fc3] border border-sky-200 flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
              {student?.avatar_url ? (
                <img src={student.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span>{(student?.name || 'S').slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#026fc3] text-white">
                  <GraduationCap className="w-3 h-3" />
                  <span>My Report</span>
                </span>
                <span className="text-xs text-slate-500 font-semibold truncate">
                  {classroomTitle}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {student?.name || 'Student Learning Report'}
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {/* Quick Metrics */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Class Rank</div>
                <div className="text-sm font-black text-[#026fc3] flex items-center justify-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{achievements?.rank ? `#${achievements.rank}` : '—'}</span>
                </div>
              </div>

              <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Bitz Points</div>
                <div className="text-sm font-black text-slate-900 flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>{(achievements?.points || 0).toLocaleString()}</span>
                </div>
              </div>

              {performance?.overall_percentage !== null && performance?.overall_percentage !== undefined && (
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Overall</div>
                  <div className="text-sm font-black">
                    {Math.round(performance.overall_percentage)}%
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchReport()}
              disabled={loading}
              className="p-2 rounded-full text-slate-400 hover:text-[#026fc3] hover:bg-sky-50 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Report Data"
              aria-label="Refresh Report Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#026fc3]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* REPORT TABS NAVIGATION                                                  */}
        {/* ======================================================================= */}
        <div className="px-4 sm:px-6 pt-3 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'results'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. My Results</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {unifiedResults.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('corrected')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'corrected'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>2. My Corrected Work</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {correctedWork.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'progress'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>3. My Progress</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {topics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'achievements'
                ? 'border-[#026fc3] text-[#026fc3]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>4. My Achievements</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {(achievements?.items || []).filter(i => i.earned).length}
            </span>
          </button>
        </div>

        {/* ======================================================================= */}
        {/* REPORT CONTENT BODY                                                     */}
        {/* ======================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/60 space-y-6">
          {loading ? (
            <div className="space-y-4 py-8 animate-pulse">
              <div className="h-10 bg-slate-200/70 rounded-2xl w-1/3" />
              <div className="h-24 bg-slate-200/70 rounded-2xl" />
              <div className="h-24 bg-slate-200/70 rounded-2xl" />
            </div>
          ) : error ? (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-black text-slate-900">Unable to load report</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
            </div>
          ) : (
            <>
              {/* TAB 1: MY RESULTS */}
              {activeTab === 'results' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">
                        Evaluated Activities & Results
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Actual results recorded across your tasks, quizzes, exams and competitions
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl overflow-x-auto">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'task', label: 'Tasks' },
                        { id: 'quiz', label: 'Quizzes' },
                        { id: 'exam', label: 'Exams' },
                        { id: 'competition', label: 'Competitions' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setResultFilter(tab.id as any)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                            resultFilter === tab.id
                              ? 'bg-white text-[#026fc3] shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredResults.length === 0 ? (
                    <div className="p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900">
                        No results recorded in this category
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                        Your results will appear here automatically after you complete an activity.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                      {filteredResults.map((result) => {
                        const matchedCorrected = correctedWork.find(
                          (c) => c.title.toLowerCase() === result.title.toLowerCase()
                        );

                        return (
                          <div
                            key={result.id}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#026fc3] flex items-center justify-center shrink-0 mt-0.5">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {result.category}
                                  </span>
                                  {result.isAiGraded && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      <span>AI Evaluated</span>
                                    </span>
                                  )}
                                  {result.date && (
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      {new Date(result.date).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 truncate">
                                  {result.title}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                              <div className="text-right">
                                {result.percentage !== null ? (
                                  <div className="inline-flex items-baseline gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                                    <span className="text-sm font-black">{Math.round(result.percentage)}%</span>
                                    {result.score !== null && result.maxScore !== null && (
                                      <span className="text-[10px] font-bold text-emerald-700">
                                        ({result.score}/{result.maxScore})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                                    <Clock className="w-3 h-3" />
                                    <span>Pending Review</span>
                                  </span>
                                )}
                              </div>

                              {matchedCorrected ? (
                                <button
                                  type="button"
                                  onClick={() => openWorkModal(matchedCorrected, 'work')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#026fc3] text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Review</span>
                                </button>
                              ) : result.writingEvaluation ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const w = result.writingEvaluation;
                                    const synthItem: StudentCorrectedWorkItem = {
                                      id: result.id,
                                      title: result.title,
                                      source_type: 'writing_task',
                                      work_type: 'writing',
                                      score: result.score,
                                      max_score: result.maxScore || 100,
                                      percentage: result.percentage,
                                      feedback: w.feedback || result.feedback,
                                      original_text: w.original_text,
                                      corrected_work: w.corrected_work,
                                      mistakes: w.mistakes || [],
                                      corrections: w.corrections || [],
                                      strengths: w.strengths || [],
                                      grammar_errors: w.grammar_errors || [],
                                      spelling_errors: w.spelling_errors || [],
                                      date: result.date
                                    };
                                    openWorkModal(synthItem, 'work');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Review</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium italic pr-2">
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MY CORRECTED WORK */}
              {activeTab === 'corrected' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      Marked Papers & Learning Evidence
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Submissions evaluated with teacher remarks, AI handwriting correction, or rubric feedback
                    </p>
                  </div>

                  {correctedWork.length === 0 ? (
                    <div className="p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900">
                        No corrected work available yet
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                        Corrected assignments, annotated PDFs, and evaluated handwriting will appear here once reviewed.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {correctedWork.map((item) => {
                        const isAi = item.source_type === 'ocr_handwritten' || item.source_type === 'challenge' || item.source_type === 'writing_task' || Boolean(item.corrected_work);
                        return (
                          <div
                            key={item.id}
                            className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-100 text-[#026fc3]">
                                      {item.source_type.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500">
                                      {isAi ? 'AI Evaluated' : 'Teacher Reviewed'}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-black text-slate-900 truncate">
                                    {item.title}
                                  </h4>
                                </div>

                                {item.percentage !== null && item.percentage !== undefined && (
                                  <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-black text-sm shrink-0">
                                    {Math.round(item.percentage)}%
                                  </div>
                                )}
                              </div>

                              {/* Feedback Summary */}
                              {item.feedback ? (
                                <p className="text-xs text-slate-700 line-clamp-2 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  "{item.feedback}"
                                </p>
                              ) : item.breakdown?.strengths && Array.isArray(item.breakdown.strengths) && item.breakdown.strengths.length > 0 ? (
                                <div className="text-xs text-emerald-900 font-medium bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">{item.breakdown.strengths[0]}</span>
                                </div>
                              ) : null}
                            </div>

                            {/* 3 Explicit Action Buttons */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openWorkModal(item, 'work')}
                                className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#026fc3] hover:bg-[#025ca5] shadow-2xs transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Corrected Work</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openWorkModal(item, (item.original_r2_key || item.original_url || item.text_response) ? 'original' : 'work')}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                <span>View Work</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openWorkModal(item, 'feedback')}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#026fc3] hover:bg-sky-50 bg-white border border-sky-200 transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>View Feedback</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MY PROGRESS */}
              {activeTab === 'progress' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      Topic & Skill Progress
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Mastery percentages derived strictly from your completed assignments, quizzes, and exams
                    </p>
                  </div>

                  {topics.length === 0 ? (
                    <div className="p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                        <Zap className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900">
                        No topic mastery data recorded yet
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                        As you complete coursework and quizzes, your topic mastery progress will automatically calculate here.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {topics.map((topic: StudentTopicProgress, idx: number) => {
                          const mastery = Math.min(100, Math.max(0, Math.round(topic.average_percentage || 0)));
                          const badgeColor =
                            topic.status === 'strong'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : topic.status === 'developing'
                              ? 'bg-sky-100 text-sky-800 border-sky-200'
                              : 'bg-amber-100 text-amber-900 border-amber-200';

                          const barColor =
                            topic.status === 'strong'
                              ? 'bg-emerald-500'
                              : topic.status === 'developing'
                              ? 'bg-[#026fc3]'
                              : 'bg-amber-500';

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                    {topic.topic}
                                  </h4>
                                  <div className="text-[11px] text-slate-500 font-semibold">
                                    {topic.activities_count} activities completed
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeColor}`}
                                >
                                  {topic.status.replace('_', ' ')}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-slate-600">Mastery Level</span>
                                  <span className="text-slate-900">{mastery}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                    style={{ width: `${mastery}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MY ACHIEVEMENTS */}
              {activeTab === 'achievements' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      Personal Badges & Milestones
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Honors, competition achievements, quiz streaks, and learning milestones
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(achievements?.items || []).map((badge: StudentAchievementItem) => (
                      <div
                        key={badge.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          badge.earned
                            ? 'bg-white border-amber-200/80 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                        } flex items-start gap-3.5`}
                      >
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                            badge.earned
                              ? 'bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-600 shadow-2xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {badge.icon === 'crown' ? '👑' : badge.icon === 'star' ? '⭐' : badge.icon === 'trophy' ? '🏆' : badge.icon === 'sparkles' ? '✨' : '🏅'}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {badge.title}
                            </h4>
                            {badge.earned && (
                              <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-md">
                                Earned
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium leading-snug">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ======================================================================= */}
        {/* FOOTER                                                                  */}
        {/* ======================================================================= */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-500">
            EdTechra BITZ • Personal Learning Evidence
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>

      {/* Sub-modal: Detailed inspection of specific corrected work item */}
      {selectedWork && (
        <CorrectedWorkModal
          item={selectedWork}
          classroomId={classroomId}
          onClose={() => setSelectedWork(null)}
          defaultTab={workModalTab}
        />
      )}
    </div>
  );
};
