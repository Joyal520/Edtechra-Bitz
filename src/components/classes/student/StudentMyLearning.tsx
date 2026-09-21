import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  Award,
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
  RefreshCw,
  Zap,
  Target,
  GraduationCap
} from 'lucide-react';
import {
  studentLearningService,
  StudentLearningResponse,
  StudentCorrectedWorkItem,
  StudentTopicProgress,
  StudentAchievementItem
} from '@/services/studentLearningService';
import { CorrectedWorkModal } from './CorrectedWorkModal';

interface StudentMyLearningProps {
  classroomId: string;
  classroomTitle?: string;
  currentUserId?: string;
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
  r2ResultPath?: string | null;
}

export const StudentMyLearning: React.FC<StudentMyLearningProps> = ({
  classroomId,
  classroomTitle = 'Classroom'
}) => {
  const [data, setData] = useState<StudentLearningResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<'all' | 'task' | 'quiz' | 'exam' | 'competition'>('all');

  // Modal State
  const [selectedWork, setSelectedWork] = useState<StudentCorrectedWorkItem | null>(null);
  const [modalTab, setModalTab] = useState<'work' | 'feedback' | 'original'>('work');

  const fetchLearningData = async () => {
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
      setError(err.message || 'Failed to load your personal learning data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearningData();
  }, [classroomId]);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLearningData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [classroomId]);

  const openWorkModal = (item: StudentCorrectedWorkItem, tab: 'work' | 'feedback' | 'original' = 'work') => {
    setSelectedWork(item);
    setModalTab(tab);
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
        isAiGraded: Boolean(t.is_ai_graded || t.writing_evaluation || t.r2_result_path),
        writingEvaluation: t.writing_evaluation || null,
        r2ResultPath: t.r2_result_path || null
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

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-black text-slate-900">Couldn't load your learning space</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={fetchLearningData}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ca5] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const performance = data?.performance;
  const correctedWork = data?.corrected_work || [];
  const topics = data?.topics || [];
  const achievements = data?.achievements;

  return (
    <div className="space-y-10" id="my-learning-container">
      {/* ======================================================================= */}
      {/* HERO BANNER: MY LEARNING                                                */}
      {/* ======================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-sky-50/50 to-blue-50/30 p-6 sm:p-8 border border-sky-100/80 shadow-[0_4px_20px_rgba(2,111,195,0.06)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#026fc3]/10 text-[#026fc3] text-xs font-black tracking-wider uppercase">
              <GraduationCap className="w-4 h-4 text-[#026fc3]" />
              <span>Student Personal Space</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              MY LEARNING
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xl">
              See your results, progress and learning evidence for {classroomTitle}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs text-center min-w-[100px]">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class Rank</div>
              <div className="text-xl font-black text-[#026fc3] flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>{achievements?.rank ? `#${achievements.rank}` : '—'}</span>
              </div>
            </div>

            <div className="px-4 py-3 bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs text-center min-w-[110px]">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bitz Points</div>
              <div className="text-xl font-black text-slate-900 flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>{(achievements?.points || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-sky-200/30 blur-3xl pointer-events-none" />
      </div>

      {/* ======================================================================= */}
      {/* SECTION 1: MY PERFORMANCE                                               */}
      {/* ======================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#026fc3]" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
              1. My Performance
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Your personal summary</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Overall Score */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#026fc3]" />
              <span>Overall Score</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {performance?.overall_percentage !== null && performance?.overall_percentage !== undefined
                  ? `${Math.round(performance.overall_percentage)}%`
                  : '—'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {performance?.overall_percentage !== null && performance?.overall_percentage !== undefined
                ? 'Calculated across evaluated work'
                : 'No scored activities yet'}
            </p>
          </div>

          {/* Recent Score */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Recent Score</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                {performance?.recent_score !== null && performance?.recent_score !== undefined
                  ? `${Math.round(performance.recent_score)}%`
                  : '—'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {performance?.recent_score !== null && performance?.recent_score !== undefined
                ? 'Latest evaluation'
                : 'Awaiting first evaluation'}
            </p>
          </div>

          {/* Activities Completed */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              <span>Activities Done</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {performance?.activities_completed || 0}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Tasks, quizzes & exams completed
            </p>
          </div>

          {/* Learning Status */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-purple-600" />
              <span>Learning Status</span>
            </div>
            <div>
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${
                  performance?.learning_status === 'Mastery' || performance?.learning_status === 'Excellent'
                    ? 'bg-emerald-100 text-emerald-800'
                    : performance?.learning_status === 'Progressing' || performance?.learning_status === 'Good Progress'
                    ? 'bg-sky-100 text-sky-800'
                    : performance?.learning_status === 'Needs Practice' || performance?.learning_status === 'Developing'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {performance?.learning_status || 'Starting Out'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {performance?.learning_status === 'Mastery' || performance?.learning_status === 'Excellent'
                ? 'Exceeding grade benchmarks'
                : performance?.learning_status === 'Progressing' || performance?.learning_status === 'Good Progress'
                ? 'Consistently on track'
                : 'Keep practicing daily'}
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================================= */}
      {/* SECTION 2: MY RESULTS                                                   */}
      {/* ======================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#026fc3]" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
              2. My Results
            </h2>
          </div>

          {/* Activity Type Filters */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl overflow-x-auto">
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
          <div className="p-8 sm:p-12 bg-white rounded-3xl border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              No results in this category
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Your results will appear here after you complete a learning activity.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {filteredResults.map((result) => {
              // Check if matching corrected work item exists
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#026fc3] text-xs font-bold border border-sky-200/80 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Review</span>
                      </button>
                    ) : (result.writingEvaluation || result.r2ResultPath || result.isAiGraded) ? (
                      <button
                        type="button"
                        onClick={() => {
                          const w = result.writingEvaluation;
                          const synthItem: StudentCorrectedWorkItem = {
                            id: result.id.replace(/^task-/, ''),
                            title: result.title,
                            source_type: 'writing_task',
                            work_type: 'writing',
                            score: result.score,
                            max_score: result.maxScore || 100,
                            percentage: result.percentage,
                            feedback: w?.feedback || result.feedback,
                            original_text: w?.original_text,
                            corrected_work: w?.corrected_work,
                            mistakes: w?.mistakes || [],
                            corrections: w?.corrections || [],
                            strengths: w?.strengths || [],
                            grammar_errors: w?.grammar_errors || [],
                            spelling_errors: w?.spelling_errors || [],
                            r2_result_path: result.r2ResultPath || null,
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
      </section>

      {/* ======================================================================= */}
      {/* SECTION 3: MY CORRECTED WORK                                            */}
      {/* ======================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
              3. My Corrected Work
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Marked papers & feedback</span>
        </div>

        {correctedWork.length === 0 ? (
          <div className="p-8 sm:p-12 bg-white rounded-3xl border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              No corrected work available yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
              Corrected assignments and handwritten evaluations with teacher or AI annotations will appear here once reviewed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {correctedWork.map((item) => {
              const isAi = item.source_type === 'ocr_handwritten' || item.source_type === 'challenge';
              return (
                <div
                  key={item.id}
                  className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
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

                    {/* Summary / Strengths preview */}
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

                  {/* 3 Explicit Action Buttons: [View Corrected Work], [View Work], [View Feedback] */}
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
      </section>

      {/* ======================================================================= */}
      {/* SECTION 4: MY PROGRESS                                                  */}
      {/* ======================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
              4. My Progress
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Mastery by Topic</span>
        </div>

        {topics.length === 0 ? (
          <div className="p-8 sm:p-12 bg-white rounded-3xl border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              No topic mastery data yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              As you complete subject assignments and quizzes, your topic mastery progress will track here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
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
      </section>

      {/* ======================================================================= */}
      {/* SECTION 5: ACHIEVEMENTS                                                 */}
      {/* ======================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
              5. Achievements
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Badges & Milestones</span>
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
      </section>

      {/* Corrected Work Modal */}
      {selectedWork && (
        <CorrectedWorkModal
          item={selectedWork}
          classroomId={classroomId}
          onClose={() => setSelectedWork(null)}
          defaultTab={modalTab}
        />
      )}
    </div>
  );
};
