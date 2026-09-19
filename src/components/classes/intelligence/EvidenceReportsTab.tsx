// ============================================================================
// EDTECHRA TEACHING INTELLIGENCE: EVIDENCE & REPORTS TAB (PART A.4)
// Organized strictly around the 4 classroom data-collection sources:
// 1. TASKS (including OCR evaluated submissions)
// 2. LIVE QUIZZES
// 3. ASSESSMENTS (Exam 2.0 In-Modal Diagnostics)
// 4. COMPETITIONS (Writing & Challenges)
// Plus:
// - Activity Stream by Source
// - Detailed Exam Diagnostic Reports
// - 30-Day Performance Reports (Cloudflare R2 PDF Compiler & Archive)
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  BookOpen,
  Zap,
  Award,
  Trophy,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  ChevronRight,
  Sparkles,
  Camera
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import {
  TeachingIntelligenceResponse,
  RecentExamReportCard,
  ExamDetailedAnalysisData,
  ThirtyDayReportRecord,
  teachingIntelligenceService
} from '@/services/teachingIntelligenceService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';

interface EvidenceReportsTabProps {
  classroom: Classroom;
  data?: TeachingIntelligenceResponse | null;
  recentExams?: RecentExamReportCard[];
  loadingExams?: boolean;
  loadingRecentExams?: boolean;
  selectedExamId?: string | null;
  examAnalysis?: ExamDetailedAnalysisData | null;
  loadingAnalysis?: boolean;
  refreshingAnalysisAi?: boolean;
  onSelectExam?: (examId: string | null) => void;
  onRefreshExamAi?: (examId?: string) => void;
  reportResult?: any;
  reportHistory?: ThirtyDayReportRecord[];
  isGeneratingReport?: boolean;
  onGenerate30DayReport?: () => void;
}

type EvidenceSourceFilter = 'all' | 'task' | 'live_quiz' | 'exam' | 'ai_challenge' | 'ocr';

export const EvidenceReportsTab: React.FC<EvidenceReportsTabProps> = ({
  classroom,
  data,
  recentExams,
  loadingExams,
  loadingRecentExams,
  selectedExamId,
  examAnalysis,
  loadingAnalysis,
  refreshingAnalysisAi,
  onSelectExam,
  onRefreshExamAi,
  reportResult,
  reportHistory,
  isGeneratingReport,
  onGenerate30DayReport
}) => {
  const [sourceFilter, setSourceFilter] = useState<EvidenceSourceFilter>('all');
  const [subSection, setSubSection] = useState<'evidence' | 'exams' | '30day'>('evidence');
  const [studentFilter, setStudentFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');

  // Internal fallback state
  const [internalRecentExams, setInternalRecentExams] = useState<RecentExamReportCard[]>([]);
  const [internalLoadingExams, setInternalLoadingExams] = useState(false);
  const [internalSelectedExamId, setInternalSelectedExamId] = useState<string | null>(null);
  const [internalAnalysis, setInternalAnalysis] = useState<ExamDetailedAnalysisData | null>(null);
  const [internalLoadingAnalysis, setInternalLoadingAnalysis] = useState(false);
  const [internalRefreshingExamAi, setInternalRefreshingExamAi] = useState(false);
  const [internalReportResult, setInternalReportResult] = useState<any | null>(null);
  const [internalReportHistory, setInternalReportHistory] = useState<ThirtyDayReportRecord[]>([]);
  const [internalGeneratingReport, setInternalGeneratingReport] = useState(false);

  useEffect(() => {
    if (classroom?.id) {
      if (!effectiveRecentExams) {
        setInternalLoadingExams(true);
        teachingIntelligenceService.getRecentExamReports(classroom.id)
          .then(setInternalRecentExams)
          .catch((err) => console.warn('Failed to load recent exams:', err))
          .finally(() => setInternalLoadingExams(false));
      }
      if (!reportHistory) {
        teachingIntelligenceService.getReports(classroom.id)
          .then(setInternalReportHistory)
          .catch((err) => console.warn('Failed to load reports:', err));
      }
    }
  }, [classroom?.id]);

  const effectiveRecentExams = recentExams ?? internalRecentExams;
  const effectiveLoadingRecentExams = loadingRecentExams ?? loadingExams ?? internalLoadingExams;
  const effectiveSelectedExamId = selectedExamId !== undefined ? selectedExamId : internalSelectedExamId;
  const effectiveExamAnalysis = examAnalysis ?? internalAnalysis;
  const effectiveLoadingAnalysis = loadingAnalysis ?? internalLoadingAnalysis;
  const effectiveRefreshingAnalysisAi = refreshingAnalysisAi ?? internalRefreshingExamAi;
  const effectiveReportResult = reportResult ?? internalReportResult;
  const effectiveReportHistory = reportHistory ?? internalReportHistory;
  const effectiveIsGeneratingReport = isGeneratingReport ?? internalGeneratingReport;

  const handleSelectExam = async (examId: string | null) => {
    if (onSelectExam) {
      onSelectExam(examId);
      return;
    }
    setInternalSelectedExamId(examId);
    if (!examId) {
      setInternalAnalysis(null);
      return;
    }
    setInternalLoadingAnalysis(true);
    try {
      const res = await teachingIntelligenceService.getExamAnalysis(classroom.id, examId);
      setInternalAnalysis(res);
    } catch (err) {
      console.warn('Failed to load exam analysis:', err);
    } finally {
      setInternalLoadingAnalysis(false);
    }
  };

  const handleRefreshExamAi = async () => {
    if (onRefreshExamAi) {
      onRefreshExamAi(effectiveSelectedExamId || undefined);
      return;
    }
    const currentId = effectiveSelectedExamId;
    if (!currentId) return;
    setInternalRefreshingExamAi(true);
    try {
      const res = await teachingIntelligenceService.refreshExamAIAnalysis(classroom.id, currentId);
      setInternalAnalysis(res);
    } catch (err) {
      console.warn('Failed to refresh exam AI:', err);
    } finally {
      setInternalRefreshingExamAi(false);
    }
  };

  const handleGenerateReport = async () => {
    if (onGenerate30DayReport) {
      onGenerate30DayReport();
      return;
    }
    setInternalGeneratingReport(true);
    try {
      const res = await teachingIntelligenceService.generateThirtyDayReport(classroom.id);
      setInternalReportResult(res);
      const updatedReports = await teachingIntelligenceService.getReports(classroom.id);
      setInternalReportHistory(updatedReports);
    } catch (err) {
      console.warn('Failed to generate report:', err);
    } finally {
      setInternalGeneratingReport(false);
    }
  };

  const recentEvidence = data?.metrics?.recent_learning_evidence || [];

  const filteredEvidence = recentEvidence.filter((ev: any) => {
    if (sourceFilter === 'all') return true;
    const type = ev.rawActivityType || ev.activityType;
    if (sourceFilter === 'task') return type === 'assignment' || type === 'task' || type === 'ocr';
    if (sourceFilter === 'ocr') return type === 'ocr';
    if (sourceFilter === 'live_quiz') return type === 'live_quiz' || type === 'quiz';
    if (sourceFilter === 'exam') return type === 'exam' || type === 'assessment';
    if (sourceFilter === 'ai_challenge') return type === 'ai_challenge' || type === 'competition';
    return type === sourceFilter;
  });

  // Filter students in detailed exam analysis
  const filteredExamStudents = (effectiveExamAnalysis?.students || []).filter((s: any) => {
    const matchesSearch = !studentFilter || s.student_name.toLowerCase().includes(studentFilter.toLowerCase()) || s.email.toLowerCase().includes(studentFilter.toLowerCase());
    const matchesStatus =
      studentStatusFilter === 'all' ||
      (studentStatusFilter === 'pass' && s.status === 'Pass') ||
      (studentStatusFilter === 'fail' && s.status === 'Fail');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* =================================================================== */}
      {/* TOP SUB-SECTION TOGGLE: EVIDENCE STREAM / DETAILED EXAMS / 30-DAY   */}
      {/* =================================================================== */}
      <div className="flex items-center justify-between gap-3 border-b border-[#C9E5E2] pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSubSection('evidence');
              handleSelectExam(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-2 ${
              subSection === 'evidence'
                ? 'bg-[#087477] text-white shadow-xs'
                : 'bg-white text-[#36565A] hover:bg-[#E8F7F5] border border-[#C9E5E2]'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Learning Evidence Activity</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubSection('exams');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-2 ${
              subSection === 'exams'
                ? 'bg-[#087477] text-white shadow-xs'
                : 'bg-white text-[#36565A] hover:bg-[#E8F7F5] border border-[#C9E5E2]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Exam 2.0 Reports</span>
            {effectiveRecentExams.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                subSection === 'exams' ? 'bg-white/20 text-white' : 'bg-[#E8F7F5] text-[#087477]'
              }`}>
                {effectiveRecentExams.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSubSection('30day');
              handleSelectExam(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-2 ${
              subSection === '30day'
                ? 'bg-[#087477] text-white shadow-xs'
                : 'bg-white text-[#36565A] hover:bg-[#E8F7F5] border border-[#C9E5E2]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>30-Day Performance Reports</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-[#36565A]">
          4 Core Sources: Tasks • Quizzes • Assessments • Competitions
        </span>
      </div>

      {/* =================================================================== */}
      {/* SUBVIEW 1: EVIDENCE ACTIVITY STREAM ORGANIZED BY 4 SOURCES          */}
      {/* =================================================================== */}
      {subSection === 'evidence' ? (
        <div className="space-y-4">
          
          {/* 4 Source Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs font-black text-[#173B3F] shrink-0 mr-1">Filter Source:</span>
            
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                sourceFilter === 'all'
                  ? 'bg-[#173B3F] text-white shadow-2xs'
                  : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
              }`}
            >
              All Evidence ({recentEvidence.length})
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter('task')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                sourceFilter === 'task'
                  ? 'bg-[#087477] text-white shadow-2xs'
                  : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tasks</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter('live_quiz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                sourceFilter === 'live_quiz'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Live Quizzes</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter('exam')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                sourceFilter === 'exam'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Assessments</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter('ai_challenge')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                sourceFilter === 'ai_challenge'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Competitions</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceFilter('ocr')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                sourceFilter === 'ocr'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-white text-[#36565A] border border-[#C9E5E2] hover:bg-[#E8F7F5]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>OCR Worksheets</span>
            </button>
          </div>

          {/* Evidence List */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C9E5E2] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                Verified Classroom Submissions ({filteredEvidence.length})
              </h4>
              <span className="text-[11px] font-bold text-[#36565A]">Chronological Feed</span>
            </div>

            {filteredEvidence.length === 0 ? (
              <div className="py-12 text-center text-[#36565A] text-xs font-semibold bg-[#E8F7F5]/30 rounded-2xl border border-dashed border-[#C9E5E2]">
                No submissions found for the selected source category.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                {filteredEvidence.map((ev: any) => {
                  const typeIcon =
                    ev.activityType === 'exam' ? <Award className="w-4 h-4 text-indigo-600" /> :
                    ev.activityType === 'live_quiz' ? <Zap className="w-4 h-4 text-amber-500" /> :
                    ev.activityType === 'ai_challenge' ? <Trophy className="w-4 h-4 text-purple-600" /> :
                    ev.activityType === 'ocr' ? <Camera className="w-4 h-4 text-teal-600" /> :
                    <BookOpen className="w-4 h-4 text-[#087477]" />;

                  const typeLabel =
                    ev.activityType === 'exam' ? 'Assessment' :
                    ev.activityType === 'live_quiz' ? 'Live Quiz' :
                    ev.activityType === 'ai_challenge' ? 'Competition' :
                    ev.activityType === 'ocr' ? 'OCR Worksheet' :
                    'Task';

                  return (
                    <div
                      key={ev.id}
                      className="py-3.5 flex items-center justify-between gap-3 hover:bg-[#E8F7F5]/30 px-3 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] flex items-center justify-center shrink-0 shadow-2xs">
                          {typeIcon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-[#173B3F] truncate">
                              {ev.activityTitle}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E8F7F5] text-[#087477]">
                              {typeLabel}
                            </span>
                          </div>
                          <p className="text-xs text-[#36565A] font-medium mt-0.5 truncate">
                            Student: <strong className="text-[#173B3F]">{ev.studentName || 'Student'}</strong> • {ev.completedAt ? new Date(ev.completedAt).toLocaleDateString() : 'Recent'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {ev.percentage != null ? (
                          <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                            ev.percentage >= 75
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : ev.percentage < 60
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {ev.percentage}%
                          </span>
                        ) : ev.score != null ? (
                          <span className="text-xs font-bold text-[#173B3F]">
                            {ev.score} pts
                          </span>
                        ) : null}

                        {ev.activityType === 'exam' && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectExam(ev.activityId || ev.id);
                              setSubSection('exams');
                            }}
                            className="px-2.5 py-1 bg-[#E8F7F5] hover:bg-[#D4EFEC] border border-[#C9E5E2] text-[#087477] text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Analysis</span>
                            <ChevronRight className="w-3 h-3" />
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
      ) : subSection === 'exams' ? (
        /* =================================================================== */
        /* SUBVIEW 2: EXAM 2.0 REPORTS & IN-MODAL DIAGNOSTICS                  */
        /* =================================================================== */
        <div>
          {!effectiveSelectedExamId ? (
            /* EXAM LIST CARDS */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                  Recent Classroom Exams ({effectiveRecentExams.length})
                </h4>
                <span className="text-[11px] font-bold text-[#36565A]">
                  Select an exam for in-depth question accuracy & diagnostics
                </span>
              </div>

              {effectiveLoadingRecentExams ? (
                <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-[#C9E5E2] p-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#087477] mx-auto" />
                  <p className="text-xs font-bold text-[#36565A]">Loading recent exam reports...</p>
                </div>
              ) : effectiveRecentExams.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-[#C9E5E2] text-center space-y-2">
                  <Award className="w-10 h-10 text-[#087477]/40 mx-auto" />
                  <h4 className="text-base font-black text-[#173B3F]">No exams submitted yet</h4>
                  <p className="text-xs text-[#36565A] max-w-md mx-auto">
                    Once students complete published exams in this classroom, automatic performance reports and diagnostic recommendations will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {effectiveRecentExams.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="bg-white rounded-2xl p-5 border border-[#C9E5E2] hover:border-[#159A9C] hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-[#173B3F] text-sm leading-snug">{exam.exam_name}</h4>
                            <span className="text-[11px] text-[#36565A] font-medium flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{exam.timeframe}</span>
                            </span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${
                            exam.performance_indicator === 'Excellent'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : exam.performance_indicator === 'Good'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {exam.performance_indicator}
                          </span>
                        </div>

                        {/* 4-KPI Grid */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                          <div className="bg-[#E8F7F5]/50 p-2 rounded-xl border border-[#C9E5E2]">
                            <span className="text-[9px] text-[#36565A] font-bold block uppercase">Students</span>
                            <span className="text-xs font-black text-[#173B3F] mt-0.5 block">
                              {exam.completed_students}/{exam.enrolled_students}
                            </span>
                          </div>
                          <div className="bg-[#E8F7F5]/50 p-2 rounded-xl border border-[#C9E5E2]">
                            <span className="text-[9px] text-[#36565A] font-bold block uppercase">Avg Score</span>
                            <span className="text-xs font-black text-[#087477] mt-0.5 block">
                              {exam.average_score}%
                            </span>
                          </div>
                          <div className="bg-[#E8F7F5]/50 p-2 rounded-xl border border-[#C9E5E2]">
                            <span className="text-[9px] text-[#36565A] font-bold block uppercase">High/Low</span>
                            <span className="text-xs font-black text-[#173B3F] mt-0.5 block">
                              {exam.highest_score}%/{exam.lowest_score}%
                            </span>
                          </div>
                          <div className="bg-[#E8F7F5]/50 p-2 rounded-xl border border-[#C9E5E2]">
                            <span className="text-[9px] text-[#36565A] font-bold block uppercase">Pass Rate</span>
                            <span className="text-xs font-black text-emerald-700 mt-0.5 block">
                              {exam.pass_rate}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-[#36565A] font-medium">
                          {exam.completed_students} graded submissions
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectExam(exam.id)}
                          className="inline-flex items-center gap-1 text-xs font-black text-[#087477] hover:underline cursor-pointer"
                        >
                          <span>View Full Analysis</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* DETAILED IN-MODAL EXAM ANALYSIS */
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Top Controls */}
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSelectExam(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#173B3F] bg-[#E8F7F5] hover:bg-[#D4EFEC] border border-[#C9E5E2] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Exam Reports</span>
                </button>

                <button
                  type="button"
                  onClick={handleRefreshExamAi}
                  disabled={effectiveRefreshingAnalysisAi}
                  className="px-3.5 py-1.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${effectiveRefreshingAnalysisAi ? 'animate-spin' : ''}`} />
                  <span>{effectiveRefreshingAnalysisAi ? 'Re-analyzing...' : 'Re-run AI Analysis'}</span>
                </button>
              </div>

              {effectiveLoadingAnalysis ? (
                <div className="py-24 text-center space-y-3 bg-white rounded-3xl border border-[#C9E5E2] p-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#087477] mx-auto" />
                  <h4 className="text-sm font-black text-[#173B3F]">Computing Exam Analytics</h4>
                  <p className="text-xs text-[#36565A]">Synthesizing question accuracies and AI diagnostic insights...</p>
                </div>
              ) : effectiveExamAnalysis ? (
                <div className="space-y-6">
                  
                  {/* Header Banner */}
                  <div className="p-6 bg-gradient-to-r from-[#173B3F] via-[#1a4247] to-[#0d2a2d] text-white rounded-3xl shadow-md space-y-2 border border-[#173B3F]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                        {effectiveExamAnalysis.exam.subject || classroom.subject || 'Exam'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#159A9C]/30 text-[#D4EFEC] border border-[#159A9C]/40">
                        Total Marks: {effectiveExamAnalysis.exam.total_marks}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                        Pass Threshold: {effectiveExamAnalysis.exam.pass_marks} marks
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-white">
                      {effectiveExamAnalysis.exam.title}
                    </h3>
                  </div>

                  {/* Summary Strip (6 Metrics) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] text-center">
                      <span className="text-[10px] font-black text-[#36565A] block uppercase">Students</span>
                      <span className="text-xl font-black text-[#173B3F] mt-0.5 block">{effectiveExamAnalysis.summary.total_students}</span>
                      <span className="text-[10px] font-semibold text-[#36565A]">Enrolled</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] text-center">
                      <span className="text-[10px] font-black text-[#36565A] block uppercase">Class Avg</span>
                      <span className="text-xl font-black text-[#087477] mt-0.5 block">{effectiveExamAnalysis.summary.average_score}%</span>
                      <span className="text-[10px] font-semibold text-[#087477]">Overall</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] text-center">
                      <span className="text-[10px] font-black text-[#36565A] block uppercase">High Score</span>
                      <span className="text-xl font-black text-emerald-700 mt-0.5 block">{effectiveExamAnalysis.summary.highest_score}%</span>
                      <span className="text-[10px] font-semibold text-emerald-700">Top Result</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] text-center">
                      <span className="text-[10px] font-black text-[#36565A] block uppercase">Floor Score</span>
                      <span className="text-xl font-black text-rose-700 mt-0.5 block">{effectiveExamAnalysis.summary.lowest_score}%</span>
                      <span className="text-[10px] font-semibold text-rose-700">Lowest</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] text-center">
                      <span className="text-[10px] font-black text-[#36565A] block uppercase">Pass Rate</span>
                      <span className="text-xl font-black text-emerald-700 mt-0.5 block">{effectiveExamAnalysis.summary.pass_rate}%</span>
                      <span className="text-[10px] font-semibold text-[#36565A]">{effectiveExamAnalysis.summary.passed_count} passed</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] text-center">
                      <span className="text-[10px] font-black text-[#36565A] block uppercase">Submissions</span>
                      <span className="text-xl font-black text-[#159A9C] mt-0.5 block">{effectiveExamAnalysis.summary.completed_students}</span>
                      <span className="text-[10px] font-semibold text-[#36565A]">{effectiveExamAnalysis.summary.completion_rate}% turn-in</span>
                    </div>
                  </div>

                  {/* Challenged Questions */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C9E5E2] shadow-xs space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                      Challenged Questions (Ranked Lowest Accuracy)
                    </h4>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {effectiveExamAnalysis.question_performance.slice(0, 5).map((qp: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-[#C9E5E2] bg-[#E8F7F5]/30 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-[#173B3F]">{qp.questionId} • {qp.topic}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              qp.accuracy < 50 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {qp.accuracy}% Accuracy ({qp.correctCount}/{qp.attemptCount})
                            </span>
                          </div>
                          <p className="text-[11px] text-[#36565A] font-medium line-clamp-2">{qp.questionText}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student Performance Roster Table */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#C9E5E2] shadow-xs space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                        Student Performance Roster ({filteredExamStudents.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#E8F7F5] p-0.5 rounded-xl border border-[#C9E5E2]">
                          {(['all', 'pass', 'fail'] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setStudentStatusFilter(status)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${
                                studentStatusFilter === status
                                  ? 'bg-[#087477] text-white shadow-2xs'
                                  : 'text-[#36565A] hover:text-[#173B3F]'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={studentFilter}
                          onChange={(e) => setStudentFilter(e.target.value)}
                          placeholder="Filter student..."
                          className="px-3 py-1 bg-[#E8F7F5]/50 border border-[#C9E5E2] rounded-xl text-xs font-bold text-[#173B3F] w-36"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[#36565A] text-[10px] uppercase font-black">
                            <th className="pb-2">#</th>
                            <th className="pb-2">Student Name</th>
                            <th className="pb-2 text-center">Score</th>
                            <th className="pb-2 text-center">Percentage</th>
                            <th className="pb-2 text-center">Status</th>
                            <th className="pb-2 text-right">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-[#173B3F]">
                          {filteredExamStudents.map((st: any) => (
                            <tr key={st.student_id} className="hover:bg-[#E8F7F5]/30">
                              <td className="py-2.5 font-black text-[#36565A]">{st.rank}</td>
                              <td className="py-2.5 font-bold text-[#173B3F]">{st.student_name}</td>
                              <td className="py-2.5 text-center">{st.score} / {st.total_marks}</td>
                              <td className="py-2.5 text-center font-black">{st.percentage}%</td>
                              <td className="py-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  st.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {st.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right text-[11px] text-[#36565A]">
                                {st.submitted_at ? new Date(st.submitted_at).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ) : null}

            </div>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* SUBVIEW 3: 30-DAY PERFORMANCE REPORT (CLOUDFLARE R2 PDF)            */
        /* =================================================================== */
        <div className="space-y-6">
          
          {/* Generator Banner */}
          <div className="p-6 bg-gradient-to-r from-[#173B3F] via-[#1a4247] to-[#0d2a2d] text-white rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#173B3F]">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                Administrative PDF Synthesis
              </span>
              <h3 className="text-lg font-black">30-Day Classroom Performance Report</h3>
              <p className="text-xs text-[#D4EFEC] font-medium">
                Executive summary, achievement metrics, balanced praise/critique, and 1-month strategic roadmap.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={effectiveIsGeneratingReport}
              className="px-5 py-3 bg-[#159A9C] hover:bg-[#087477] text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${effectiveIsGeneratingReport ? 'animate-spin' : ''}`} />
              <span>{effectiveIsGeneratingReport ? 'Compiling PDF to R2...' : 'Generate 30-Day Report'}</span>
            </button>
          </div>

          {/* Latest Generated Preview */}
          {effectiveReportResult && effectiveReportResult.report && (
            <div className="bg-white rounded-3xl p-6 border border-[#C9E5E2] space-y-4 shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-base font-black text-[#173B3F]">{effectiveReportResult.report.report_title}</h4>
                  <p className="text-xs text-[#36565A]">Stored securely in Cloudflare R2</p>
                </div>
                {effectiveReportResult.storage?.download_url && (
                  <button
                    type="button"
                    onClick={() => window.open(effectiveReportResult.storage.download_url, '_blank')}
                    className="px-4 py-2 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>

              <div className="p-4 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-xs leading-relaxed text-[#173B3F] font-semibold">
                <InlineMarkdown text={effectiveReportResult.report.sections?.executive_summary} />
              </div>
            </div>
          )}

          {/* Historical Reports Archive */}
          <div className="bg-white rounded-3xl p-6 border border-[#C9E5E2] space-y-3 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
              Previous 30-Day Reports Archive ({effectiveReportHistory.length})
            </h4>

            {effectiveReportHistory.length === 0 ? (
              <p className="text-xs text-[#36565A] text-center py-6 italic font-medium">
                No archived reports yet. Click "Generate 30-Day Report" to compile your first report.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {effectiveReportHistory.map((rep: any) => (
                  <div key={rep.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#E8F7F5] text-[#087477] flex items-center justify-center font-black">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-[#173B3F] block">{rep.title}</span>
                        <span className="text-[10px] text-[#36565A] font-medium">
                          Period: {rep.report_period} • {new Date(rep.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.open(rep.download_url, '_blank')}
                      className="px-3 py-1.5 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
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
  );
};

