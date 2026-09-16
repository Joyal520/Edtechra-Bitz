// ============================================================================
// EDTECHRA TEACHING INTELLIGENCE: STUDENTS TAB (PART A.2)
// "Who needs attention?"
// 1. Clean Roster with count pills: All (N), Needs Support (N), Improving (N), On Track (N), Strong (N)
// 2. Individual Student Intelligence deep-dive on select:
//    - Overall performance & trend
//    - Strengths & weak areas
//    - 4-Source activity breakdown
//    - Grounded AI pedagogical diagnosis
//    - Chronological assessment history
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { StudentIntelligenceDetail, teachingIntelligenceService } from '@/services/teachingIntelligenceService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';

export interface StudentListItem {
  studentId: string;
  fullName: string;
  email?: string;
  averagePercentage?: number | null;
  trend?: string;
  performanceCategory?: string;
  isAttention?: boolean;
  isImproving?: boolean;
}

interface StudentsTabProps {
  classroom: Classroom;
  studentsList?: StudentListItem[];
  selectedStudentId?: string | null;
  studentDetail?: StudentIntelligenceDetail | null;
  loadingStudentDetail?: boolean;
  refreshingStudentAi?: boolean;
  studentDetailError?: string;
  onSelectStudent?: (studentId: string) => void;
  onRefreshStudentAi?: (studentId: string) => void;
}

type RosterCategoryFilter = 'all' | 'needs_support' | 'improving' | 'on_track' | 'strong';

export const StudentsTab: React.FC<StudentsTabProps> = ({
  classroom,
  studentsList,
  selectedStudentId,
  studentDetail,
  loadingStudentDetail,
  refreshingStudentAi,
  studentDetailError,
  onSelectStudent,
  onRefreshStudentAi
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RosterCategoryFilter>('all');

  // Internal state fallback
  const [localStudentsList, setLocalStudentsList] = useState<StudentListItem[]>([]);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [localDetail, setLocalDetail] = useState<StudentIntelligenceDetail | null>(null);
  const [localLoadingDetail, setLocalLoadingDetail] = useState(false);
  const [localRefreshingAi, setLocalRefreshingAi] = useState(false);
  const [localDetailError, setLocalDetailError] = useState('');

  // Load students if studentsList not provided
  useEffect(() => {
    if ((!studentsList || studentsList.length === 0) && classroom?.id) {
      teachingIntelligenceService.getTeachingIntelligence(classroom.id)
        .then((res) => {
          const summary = res.metrics;
          const list: StudentListItem[] = (summary.students || []).map((s: any) => ({
            studentId: s.studentId,
            fullName: s.fullName,
            email: s.email,
            averagePercentage: s.averagePercentage,
            trend: s.trend != null ? (s.trend > 0 ? `+${s.trend}%` : `${s.trend}%`) : undefined,
            performanceCategory: (s.averagePercentage || 0) >= 80 ? 'strong' : (s.averagePercentage || 0) >= 65 ? 'on_track' : 'struggling',
            isAttention: (s.averagePercentage || 0) < 65,
            isImproving: (s.trend || 0) > 0
          }));
          if (list.length === 0 && summary.students_needing_attention) {
            summary.students_needing_attention.forEach((st: any) => {
              list.push({
                studentId: st.studentId || st.student_ref,
                fullName: st.studentName || st.student_ref || 'Student',
                averagePercentage: st.average_score ?? st.currentScore ?? null,
                trend: st.trend || (st.change != null ? (st.change > 0 ? `+${st.change}%` : `${st.change}%`) : undefined),
                performanceCategory: 'struggling',
                isAttention: true
              });
            });
          }
          setLocalStudentsList(list);
          if (list.length > 0 && !selectedStudentId && !localSelectedId) {
            handleSelectStudent(list[0].studentId);
          }
        })
        .catch((err) => console.warn('Failed to fetch students list:', err));
    }
  }, [classroom?.id]);

  const effectiveStudentsList = studentsList && studentsList.length > 0 ? studentsList : localStudentsList;
  const effectiveSelectedId = selectedStudentId !== undefined ? selectedStudentId : localSelectedId;
  const effectiveDetail = studentDetail !== undefined ? studentDetail : localDetail;
  const detail = effectiveDetail;
  const effectiveLoadingDetail = loadingStudentDetail !== undefined ? loadingStudentDetail : localLoadingDetail;
  const effectiveRefreshingAi = refreshingStudentAi !== undefined ? refreshingStudentAi : localRefreshingAi;
  const effectiveDetailError = studentDetailError !== undefined ? studentDetailError : localDetailError;

  const handleSelectStudent = async (studentId: string) => {
    if (onSelectStudent) {
      onSelectStudent(studentId);
      return;
    }
    setLocalSelectedId(studentId);
    setLocalLoadingDetail(true);
    setLocalDetailError('');
    try {
      const res = await teachingIntelligenceService.getStudentIntelligence(classroom.id, studentId);
      setLocalDetail(res.student ? { ...res.student, ai_assessment: res.ai_assessment } : null);
    } catch (err: any) {
      setLocalDetailError(err.message || 'Failed to load student intelligence');
    } finally {
      setLocalLoadingDetail(false);
    }
  };

  const handleRefreshStudentAi = async (studentId: string) => {
    if (onRefreshStudentAi) {
      onRefreshStudentAi(studentId);
      return;
    }
    setLocalRefreshingAi(true);
    try {
      const res = await teachingIntelligenceService.refreshStudentAIAssessment(classroom.id, studentId);
      if (res.ai_assessment && localDetail) {
        setLocalDetail({
          ...localDetail,
          ai_assessment: res.ai_assessment
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to refresh student AI assessment');
    } finally {
      setLocalRefreshingAi(false);
    }
  };

  // Categorize students
  const needsSupportStudents = effectiveStudentsList.filter(
    (s) => s.isAttention || (s.averagePercentage != null && s.averagePercentage < 65) || s.trend === 'DECLINING'
  );
  const improvingStudents = effectiveStudentsList.filter(
    (s) => s.isImproving || s.trend === 'IMPROVING' || (s.trend && s.trend.startsWith('+'))
  );
  const onTrackStudents = effectiveStudentsList.filter(
    (s) => s.averagePercentage != null && s.averagePercentage >= 65 && s.averagePercentage < 80
  );
  const strongStudents = effectiveStudentsList.filter(
    (s) => s.averagePercentage != null && s.averagePercentage >= 80
  );

  // Filter roster
  const filteredRoster = effectiveStudentsList.filter((st) => {
    const term = search.toLowerCase().trim();
    const matchesSearch = !term || st.fullName.toLowerCase().includes(term) || (st.email && st.email.toLowerCase().includes(term));
    if (!matchesSearch) return false;

    if (filter === 'needs_support') return needsSupportStudents.some((s) => s.studentId === st.studentId);
    if (filter === 'improving') return improvingStudents.some((s) => s.studentId === st.studentId);
    if (filter === 'on_track') return onTrackStudents.some((s) => s.studentId === st.studentId);
    if (filter === 'strong') return strongStudents.some((s) => s.studentId === st.studentId);
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px] animate-in fade-in duration-150">
      
      {/* =================================================================== */}
      {/* LEFT COLUMN: CLEAN STUDENT ROSTER (4 cols on desktop)              */}
      {/* =================================================================== */}
      <div className="lg:col-span-4 bg-white rounded-3xl p-4 sm:p-5 border border-[#C9E5E2] shadow-xs flex flex-col space-y-3.5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#087477]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
              Student Roster
            </h3>
          </div>

          <span className="text-[11px] font-bold text-[#36565A]">
            {filteredRoster.length} of {effectiveStudentsList.length} Students
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student..."
            className="w-full pl-8 pr-3 py-2 bg-[#E8F7F5]/50 border border-[#C9E5E2] rounded-xl text-xs font-semibold text-[#173B3F] placeholder:text-[#36565A]/60 focus:outline-hidden focus:ring-2 focus:ring-[#159A9C] focus:bg-white transition-all"
          />
        </div>

        {/* 5 Filter Pills with Real Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
              filter === 'all'
                ? 'bg-[#173B3F] text-white shadow-2xs'
                : 'bg-[#E8F7F5] text-[#36565A] hover:bg-[#D4EFEC]'
            }`}
          >
            All ({effectiveStudentsList.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('needs_support')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
              filter === 'needs_support'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            Needs Help ({needsSupportStudents.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('improving')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
              filter === 'improving'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            Improving ({improvingStudents.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('on_track')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
              filter === 'on_track'
                ? 'bg-[#087477] text-white shadow-2xs'
                : 'bg-[#E8F7F5] text-[#087477] hover:bg-[#D4EFEC]'
            }`}
          >
            On Track ({onTrackStudents.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter('strong')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer whitespace-nowrap ${
              filter === 'strong'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
          >
            Strong ({strongStudents.length})
          </button>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[580px]">
          {filteredRoster.length === 0 ? (
            <div className="py-12 text-center text-[#36565A] text-xs font-semibold">
              {effectiveStudentsList.length === 0
                ? 'No students enrolled or recorded yet.'
                : 'No students match your filter.'}
            </div>
          ) : (
            filteredRoster.map((st) => {
              const isSelected = effectiveSelectedId === st.studentId;
              return (
                <div
                  key={st.studentId}
                  onClick={() => handleSelectStudent(st.studentId)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-[#E8F7F5] border-[#159A9C] shadow-xs'
                      : 'bg-white border-slate-200/80 hover:bg-[#E8F7F5]/40 hover:border-[#C9E5E2]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-black truncate ${isSelected ? 'text-[#087477]' : 'text-[#173B3F]'}`}>
                        {st.fullName}
                      </span>
                      {st.isAttention && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Needs support" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#36565A] font-semibold">
                      <span>
                        {st.averagePercentage != null ? `${st.averagePercentage}% Avg` : 'No score yet'}
                      </span>
                      <span>•</span>
                      <span className={`font-black ${
                        st.trend === 'IMPROVING' || (st.trend && st.trend.startsWith('+'))
                          ? 'text-emerald-700'
                          : st.trend === 'DECLINING' || (st.trend && st.trend.startsWith('-'))
                          ? 'text-rose-700'
                          : 'text-[#36565A]'
                      }`}>
                        {st.trend === 'IMPROVING' ? 'Improving' : st.trend === 'DECLINING' ? 'Declining' : st.trend || 'Steady'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                    isSelected ? 'text-[#087477] translate-x-0.5' : 'text-slate-300'
                  }`} />
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* =================================================================== */}
      {/* RIGHT COLUMN: STUDENT INTELLIGENCE DEEP-DIVE (8 cols on desktop)   */}
      {/* =================================================================== */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        {effectiveLoadingDetail ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-[#C9E5E2] p-6">
            <RefreshCw className="w-8 h-8 animate-spin text-[#087477]" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#173B3F]">Loading Student Intelligence</h4>
              <p className="text-xs text-[#36565A] max-w-xs">
                Synthesizing student evidence across Tasks, Quizzes, Assessments, and Competitions...
              </p>
            </div>
          </div>
        ) : effectiveDetailError ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-900">Failed to Load Student Intelligence</h4>
              <p className="text-xs text-rose-700 font-semibold">{effectiveDetailError}</p>
            </div>
            {effectiveSelectedId && (
              <button
                type="button"
                onClick={() => handleSelectStudent(effectiveSelectedId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Try Again
              </button>
            )}
          </div>
        ) : !detail ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-3 bg-[#E8F7F5]/40 rounded-3xl border border-dashed border-[#C9E5E2] p-6">
            <Users className="w-10 h-10 text-[#159A9C]/50" />
            <div className="space-y-1 max-w-sm">
              <h4 className="text-sm font-black text-[#173B3F]">Select a Student</h4>
              <p className="text-xs text-[#36565A] font-medium">
                Choose any learner from the roster to view their performance metrics, 4-source activity records, and AI diagnosis.
              </p>
            </div>
          </div>
        ) : (
          <StudentDetailView
            detail={detail}
            refreshingStudentAi={effectiveRefreshingAi}
            onRefreshStudentAi={handleRefreshStudentAi}
          />
        )}
      </div>

    </div>
  );
};

interface StudentDetailViewProps {
  detail: StudentIntelligenceDetail;
  refreshingStudentAi: boolean;
  onRefreshStudentAi: (studentId: string) => void;
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  detail,
  refreshingStudentAi,
  onRefreshStudentAi
}) => {
  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Student Header Card */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#173B3F] via-[#1a4247] to-[#0d2a2d] text-white rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#173B3F]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                        Student Profile
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        detail.trend === 'IMPROVING'
                          ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                          : detail.trend === 'DECLINING'
                          ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30'
                          : 'bg-white/10 text-slate-200 border border-white/15'
                      }`}>
                        Trend: {detail.trend}
                      </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#159A9C]/30 text-[#D4EFEC] border border-[#159A9C]/40">
                    {detail.performanceCategoryLabel || detail.performanceCategory}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white">
                  {detail.fullName}
                </h3>
                {detail.email && (
                  <p className="text-xs text-[#D4EFEC] font-medium">{detail.email}</p>
                )}
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-[#D4EFEC] block">Overall Mastery</span>
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {detail.averagePercentage != null ? `${detail.averagePercentage}%` : '—'}
                </span>
              </div>
            </div>

            {/* 4-KPI Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] shadow-2xs text-center">
                <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Avg Score</span>
                <span className="text-xl font-black text-[#087477] mt-0.5 block">
                  {detail.averagePercentage != null ? `${detail.averagePercentage}%` : '—'}
                </span>
                <span className="text-[10px] font-semibold text-[#36565A]">Across Activities</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] shadow-2xs text-center">
                <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Accuracy</span>
                <span className="text-xl font-black text-[#173B3F] mt-0.5 block">
                  {detail.accuracyPercentage != null ? `${detail.accuracyPercentage}%` : '—'}
                </span>
                <span className="text-[10px] font-semibold text-[#36565A]">Questions Correct</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] shadow-2xs text-center">
                <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Completion</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                  {detail.completionRate}%
                </span>
                <span className="text-[10px] font-semibold text-[#36565A]">Submission Rate</span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-[#C9E5E2] shadow-2xs text-center">
                <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Assessments</span>
                <span className="text-xl font-black text-[#159A9C] mt-0.5 block">
                  {detail.attempts}
                </span>
                <span className="text-[10px] font-semibold text-[#36565A]">Total Submissions</span>
              </div>
            </div>

            {/* Strengths & Growth Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-black uppercase tracking-wider">Strong Areas</span>
                </div>
                {detail.strongAreas && detail.strongAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.strongAreas.map((sa, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white rounded-xl text-xs font-bold text-emerald-900 border border-emerald-200 shadow-2xs"
                      >
                        {sa.topic} ({sa.average}%)
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#36565A] italic">Not enough evidence yet.</p>
                )}
              </div>

              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-900">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-black uppercase tracking-wider">Areas for Growth</span>
                </div>
                {detail.weakAreas && detail.weakAreas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.weakAreas.map((wa, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white rounded-xl text-xs font-bold text-rose-900 border border-rose-200 shadow-2xs"
                      >
                        {wa.topic} ({wa.average}%)
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#36565A] italic">Not enough evidence yet.</p>
                )}
              </div>
            </div>

            {/* 4-Source Activity Breakdown */}
            <div className="bg-white rounded-3xl p-5 border border-[#C9E5E2] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                    4-Source Learning Breakdown
                  </h4>
                  <p className="text-[11px] text-[#36565A] font-medium">
                    Evidence across Tasks, Live Quizzes, Assessments, and Competitions
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* Tasks (includes OCR) */}
                <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
                  <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Tasks</span>
                  <span className="text-sm font-black text-[#173B3F] block">
                    {detail.activityBreakdown.assignment.averageScore != null ? `${detail.activityBreakdown.assignment.averageScore}%` : '—'}
                  </span>
                  <span className="text-[10px] font-semibold text-[#36565A]">
                    {detail.activityBreakdown.assignment.attempts} submitted
                  </span>
                </div>

                {/* Live Quizzes */}
                <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
                  <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Live Quizzes</span>
                  <span className="text-sm font-black text-[#173B3F] block">
                    {detail.activityBreakdown.live_quiz.averageScore != null ? `${detail.activityBreakdown.live_quiz.averageScore}%` : '—'}
                  </span>
                  <span className="text-[10px] font-semibold text-[#36565A]">
                    {detail.activityBreakdown.live_quiz.attempts} attempts
                  </span>
                </div>

                {/* Assessments */}
                <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
                  <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Assessments</span>
                  <span className="text-sm font-black text-[#173B3F] block">
                    {detail.activityBreakdown.exam.averageScore != null ? `${detail.activityBreakdown.exam.averageScore}%` : '—'}
                  </span>
                  <span className="text-[10px] font-semibold text-[#36565A]">
                    {detail.activityBreakdown.exam.attempts} attempts
                  </span>
                </div>

                {/* Competitions */}
                <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
                  <span className="text-[10px] font-black text-[#36565A] block uppercase tracking-wider">Competitions</span>
                  <span className="text-sm font-black text-[#173B3F] block">
                    {detail.activityBreakdown.ai_challenge.averageScore != null ? `${detail.activityBreakdown.ai_challenge.averageScore}%` : '—'}
                  </span>
                  <span className="text-[10px] font-semibold text-[#36565A]">
                    {detail.activityBreakdown.ai_challenge.attempts} completed
                  </span>
                </div>
              </div>
            </div>

            {/* AI Pedagogical Diagnosis Card */}
            <div className="bg-gradient-to-br from-[#173B3F] via-[#1a4247] to-[#0d2a2d] text-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-md border border-[#173B3F]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4EFEC]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#D4EFEC]">
                    AI Pedagogical Diagnosis
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => onRefreshStudentAi(detail.studentId)}
                  disabled={refreshingStudentAi}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingStudentAi ? 'animate-spin text-[#D4EFEC]' : ''}`} />
                  <span>{refreshingStudentAi ? 'Diagnosing...' : 'Refresh AI'}</span>
                </button>
              </div>

              {detail.ai_assessment?.has_sufficient_data === false ? (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center space-y-1">
                  <p className="text-xs font-bold text-[#D4EFEC]">Not enough evidence yet.</p>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {detail.ai_assessment.message || 'Have this student complete more quizzes or assignments to generate targeted AI diagnostic insights.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-black/20 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">
                      What They Are Doing Well
                    </span>
                    <p className="text-slate-100 font-medium leading-relaxed">
                      <InlineMarkdown text={detail.ai_assessment?.doing_well || 'Demonstrating consistent engagement across completed coursework.'} />
                    </p>
                  </div>

                  <div className="p-3.5 bg-black/20 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider block">
                      Where They Are Struggling
                    </span>
                    <p className="text-slate-100 font-medium leading-relaxed">
                      <InlineMarkdown text={detail.ai_assessment?.where_struggling || 'Requires reinforcement in core topic assessments.'} />
                    </p>
                  </div>

                  <div className="p-3.5 bg-black/20 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block">
                      Grounded Evidence
                    </span>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      <InlineMarkdown text={detail.ai_assessment?.evidence || `Based on ${detail.attempts} learning events in this classroom.`} />
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#E8F7F5]/20 rounded-2xl border border-[#159A9C]/40 space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#D4EFEC] tracking-wider block">
                      Recommended Next Steps
                    </span>
                    <p className="text-white font-bold leading-relaxed">
                      <InlineMarkdown text={detail.ai_assessment?.next_steps || 'Assign differentiated review set focusing on identified weak concepts.'} />
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Chronological Assessment History Table */}
            <div className="bg-white rounded-3xl p-5 border border-[#C9E5E2] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                  Assessment History ({detail.assessmentHistory.length})
                </h4>
                <span className="text-[10px] font-bold text-[#36565A]">Chronological Record</span>
              </div>

              {detail.assessmentHistory.length === 0 ? (
                <p className="text-xs text-[#36565A] text-center py-6 italic font-medium">
                  No assessment submissions recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[#36565A] uppercase text-[10px]">
                        <th className="pb-2 font-black">Activity</th>
                        <th className="pb-2 font-black">Type</th>
                        <th className="pb-2 font-black">Topic</th>
                        <th className="pb-2 font-black text-right">Score</th>
                        <th className="pb-2 font-black text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-[#173B3F]">
                      {detail.assessmentHistory.map((ev) => (
                        <tr key={ev.id} className="hover:bg-[#E8F7F5]/30">
                          <td className="py-2.5 font-bold text-[#173B3F] max-w-[180px] truncate">
                            {ev.activityTitle}
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E8F7F5] text-[#087477] capitalize">
                              {ev.activityType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 text-[#36565A] max-w-[140px] truncate">
                            {ev.topic || 'General'}
                          </td>
                          <td className="py-2.5 text-right font-black">
                            <span className={`${
                              ev.percentage != null
                                ? ev.percentage >= 75
                                  ? 'text-emerald-700'
                                  : ev.percentage < 60
                                  ? 'text-rose-700'
                                  : 'text-[#087477]'
                                : 'text-slate-400'
                            }`}>
                              {ev.percentage != null ? `${ev.percentage}%` : ev.score != null ? `${ev.score}` : '—'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-[#36565A] text-[11px] font-medium">
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
  );
};
