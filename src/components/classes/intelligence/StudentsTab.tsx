// ============================================================================
// EDTECHRA TEACHING INTELLIGENCE: STUDENTS TAB (PART A.2)
// "Who needs attention?"
// 1. Clean Roster with count pills: All (N), Needs Support (N), Improving (N), On Track (N), Strong (N)
// 2. Course Progress & Multi-Source Student Cards
// 3. Individual Student Intelligence deep-dive on select:
//    - Course Progress (Overall %, Units, Lessons completed/remaining, Current lesson)
//    - Performance across Quizzes, Exams, Tasks, Live Quizzes, OCR Worksheets
//    - Prioritized Learning Gaps (NEEDS SUPPORT) & Strengths (STRONG AREAS)
//    - Grounded AI pedagogical diagnosis
//    - Chronological assessment history
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Sparkles,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { CourseAnalyticsSummary, StudentCoursePerformance } from '@/types/courseStudio';
import { StudentIntelligenceDetail, teachingIntelligenceService } from '@/services/teachingIntelligenceService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';
import { EvidenceDetailModal, EvidenceDetailItem } from './EvidenceDetailModal';

export interface StudentListItem {
  studentId: string;
  fullName: string;
  email?: string;
  avatarUrl?: string | null;
  averagePercentage?: number | null;
  quizzesAverage?: number | null;
  tasksAverage?: number | null;
  strongestSkill?: string | null;
  weakestSkill?: string | null;
  trend?: string;
  performanceCategory?: string;
  isAttention?: boolean;
  isImproving?: boolean;
}

interface StudentsTabProps {
  classroom: Classroom;
  courseAnalytics?: CourseAnalyticsSummary | null;
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
  courseAnalytics: courseAnalyticsProp,
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
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Internal state fallback
  const [localStudentsList, setLocalStudentsList] = useState<StudentListItem[]>([]);
  const [localCourseAnalytics, setLocalCourseAnalytics] = useState<CourseAnalyticsSummary | null>(null);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [localDetail, setLocalDetail] = useState<StudentIntelligenceDetail | null>(null);
  const [localLoadingDetail, setLocalLoadingDetail] = useState(false);
  const [localRefreshingAi, setLocalRefreshingAi] = useState(false);
  const [localDetailError, setLocalDetailError] = useState('');

  const activeCourseAnalytics = courseAnalyticsProp || localCourseAnalytics;

  // Load students if studentsList not provided
  useEffect(() => {
    if ((!studentsList || studentsList.length === 0) && classroom?.id) {
      teachingIntelligenceService.getTeachingIntelligence(classroom.id)
        .then((res) => {
          const summary = res.metrics as any;
          if (summary.course_analytics && !courseAnalyticsProp) {
            setLocalCourseAnalytics(summary.course_analytics);
          }
          const list: StudentListItem[] = (summary.students || []).map((s: any) => ({
            studentId: s.studentId,
            fullName: s.fullName,
            email: s.email,
            avatarUrl: s.avatarUrl || s.avatar_url || null,
            averagePercentage: s.averagePercentage,
            quizzesAverage: s.activityBreakdown?.live_quiz?.averageScore ?? null,
            tasksAverage: s.activityBreakdown?.assignment?.averageScore ?? s.activityBreakdown?.ocr?.averageScore ?? null,
            strongestSkill: s.strongAreas?.[0]?.topic || null,
            weakestSkill: s.weakAreas?.[0]?.topic || null,
            trend: s.trend != null ? (typeof s.trend === 'number' ? (s.trend > 0 ? `+${s.trend}%` : `${s.trend}%`) : String(s.trend)) : undefined,
            performanceCategory: (s.averagePercentage || 0) >= 80 ? 'strong' : (s.averagePercentage || 0) >= 65 ? 'on_track' : 'struggling',
            isAttention: (s.averagePercentage || 0) < 65,
            isImproving: s.trend === 'IMPROVING' || (typeof s.trend === 'number' && s.trend > 0)
          }));
          if (list.length === 0 && summary.students_needing_attention) {
            summary.students_needing_attention.forEach((st: any) => {
              list.push({
                studentId: st.studentId || st.student_ref,
                fullName: st.studentName || st.student_ref || 'Student',
                averagePercentage: st.average_score ?? st.currentScore ?? null,
                weakestSkill: st.main_weakness || null,
                trend: st.trend || (st.change != null ? (st.change > 0 ? `+${st.change}%` : `${st.change}%`) : undefined),
                performanceCategory: 'struggling',
                isAttention: true
              });
            });
          }
          setLocalStudentsList(list);
          if (list.length > 0 && !selectedStudentId && !localSelectedId) {
            handleSelectStudent(list[0].studentId, false);
          }
        })
        .catch((err) => console.warn('Failed to fetch students list:', err));
    }
  }, [classroom?.id]);

  // Merge course-enrolled students if any are missing from effectiveStudentsList
  const mergedStudentsList = useMemo(() => {
    const base = studentsList && studentsList.length > 0 ? [...studentsList] : [...localStudentsList];
    const seen = new Set(base.map(s => s.studentId));
    if (activeCourseAnalytics?.student_performance) {
      activeCourseAnalytics.student_performance
        .filter(sp => !classroom?.id || sp.classroom_id === classroom.id)
        .forEach(sp => {
          if (!seen.has(sp.student_id)) {
            seen.add(sp.student_id);
            base.push({
              studentId: sp.student_id,
              fullName: sp.student_name,
              email: sp.student_email,
              avatarUrl: sp.avatar_url,
              averagePercentage: sp.accuracy_percent || sp.mastery_percent || null,
              strongestSkill: sp.strong_concepts?.[0] || null,
              weakestSkill: sp.weak_concepts?.[0] || null,
              performanceCategory: sp.status === 'strong' ? 'strong' : sp.status === 'good' ? 'on_track' : 'struggling',
              isAttention: sp.status === 'needs_support' || sp.status === 'at_risk'
            });
          }
        });
    }
    return base;
  }, [studentsList, localStudentsList, activeCourseAnalytics, classroom?.id]);

  const effectiveStudentsList = mergedStudentsList;
  const effectiveSelectedId = selectedStudentId !== undefined ? selectedStudentId : localSelectedId;
  const effectiveDetail = studentDetail !== undefined ? studentDetail : localDetail;
  const detail = effectiveDetail;
  const effectiveLoadingDetail = loadingStudentDetail !== undefined ? loadingStudentDetail : localLoadingDetail;
  const effectiveRefreshingAi = refreshingStudentAi !== undefined ? refreshingStudentAi : localRefreshingAi;
  const effectiveDetailError = studentDetailError !== undefined ? studentDetailError : localDetailError;

  const findStudentCoursePerf = (studentId: string): StudentCoursePerformance | null => {
    if (!activeCourseAnalytics?.student_performance) return null;
    return (
      activeCourseAnalytics.student_performance.find(
        sp => sp.student_id === studentId && (!classroom?.id || sp.classroom_id === classroom.id)
      ) ||
      activeCourseAnalytics.student_performance.find(sp => sp.student_id === studentId) ||
      null
    );
  };

  const handleSelectStudent = async (studentId: string, openOnMobile = true) => {
    if (openOnMobile) {
      setMobileShowDetail(true);
    }
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

  const selectedStudentCoursePerf = effectiveSelectedId ? findStudentCoursePerf(effectiveSelectedId) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px] animate-in fade-in duration-150">
      
      {/* =================================================================== */}
      {/* LEFT COLUMN: STUDENT PROGRESS ROSTER (5 cols on desktop)           */}
      {/* =================================================================== */}
      <div className={`lg:col-span-5 bg-white rounded-3xl p-4 sm:p-5 border border-[#C9E5E2] shadow-xs flex flex-col space-y-3.5 ${
        mobileShowDetail ? 'hidden lg:flex' : 'flex'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#087477]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
              Student Progress & Roster
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
            Needs Support ({needsSupportStudents.length})
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

        {/* Student Progress Cards List */}
        <div className="flex-1 space-y-2.5 pr-1">
          {filteredRoster.length === 0 ? (
            <div className="py-12 text-center text-[#36565A] text-xs font-semibold">
              {effectiveStudentsList.length === 0
                ? 'No students enrolled or recorded yet.'
                : 'No students match your filter.'}
            </div>
          ) : (
            filteredRoster.map((st) => {
              const isSelected = effectiveSelectedId === st.studentId;
              const coursePerf = findStudentCoursePerf(st.studentId);
              const progressPct = coursePerf ? Math.round(coursePerf.progress_percent || 0) : null;
              const totalLessons = coursePerf?.total_episodes_count || 0;
              const completedLessons = coursePerf?.completed_episodes_count ?? (totalLessons > 0 && progressPct != null ? Math.round((progressPct / 100) * totalLessons) : 0);
              const avgScore = st.averagePercentage ?? (coursePerf ? Math.round(coursePerf.accuracy_percent || coursePerf.mastery_percent || 0) : null);
              const strengthLabel = st.strongestSkill || coursePerf?.strong_concepts?.[0] || null;
              const gapLabel = st.weakestSkill || coursePerf?.weak_concepts?.[0] || null;

              return (
                <div
                  key={st.studentId}
                  onClick={() => handleSelectStudent(st.studentId, true)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-[#E8F7F5] border-[#159A9C] shadow-xs'
                      : 'bg-white border-slate-200/80 hover:bg-[#E8F7F5]/40 hover:border-[#C9E5E2]'
                  }`}
                >
                  {/* Top Row: Avatar, Name, Status & Progress % */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#087477] text-white' : 'bg-[#E8F7F5] text-[#087477]'
                      }`}>
                        {st.fullName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black truncate ${isSelected ? 'text-[#087477]' : 'text-[#173B3F]'}`}>
                            {st.fullName}
                          </span>
                          {st.isAttention && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-black uppercase shrink-0">
                              Needs Support
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#36565A] font-semibold block">
                          {avgScore != null ? `Average Score: ${avgScore}%` : 'No assessment score yet'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {progressPct != null && (
                        <span className="text-xs font-black text-[#087477]">{progressPct}%</span>
                      )}
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-[#087477] translate-x-0.5' : 'text-slate-300'
                      }`} />
                    </div>
                  </div>

                  {/* Course Progress Bar (when course data exists) */}
                  {progressPct != null && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progressPct >= 75 ? 'bg-emerald-500' : progressPct >= 40 ? 'bg-[#087477]' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-[#36565A]">
                        <span>
                          {totalLessons > 0 ? `Lessons: ${completedLessons} / ${totalLessons}` : `Course Progress: ${progressPct}%`}
                        </span>
                        {st.quizzesAverage != null && <span>Quizzes: {Math.round(st.quizzesAverage)}%</span>}
                        {st.tasksAverage != null && <span>Tasks: {Math.round(st.tasksAverage)}%</span>}
                      </div>
                    </div>
                  )}

                  {/* Strength & Needs Support Mini Summary */}
                  {(strengthLabel || gapLabel) && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px] font-semibold">
                      {strengthLabel ? (
                        <span className="text-emerald-700 truncate">
                          <strong>Strength:</strong> {strengthLabel}
                        </span>
                      ) : <span />}
                      {gapLabel ? (
                        <span className="text-rose-700 truncate">
                          <strong>Needs Support:</strong> {gapLabel}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* =================================================================== */}
      {/* RIGHT COLUMN: STUDENT INTELLIGENCE DEEP-DIVE (7 cols on desktop)   */}
      {/* =================================================================== */}
      <div className={`lg:col-span-7 flex flex-col space-y-4 ${
        mobileShowDetail ? 'flex' : 'hidden lg:flex'
      }`}>
        {/* Mobile Back to Roster Button */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileShowDetail(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#C9E5E2] text-xs font-black text-[#173B3F] shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#087477]" />
            <span>Back to Student Roster</span>
          </button>
        </div>

        {effectiveLoadingDetail ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-3 bg-white rounded-3xl border border-[#C9E5E2] p-6">
            <RefreshCw className="w-8 h-8 animate-spin text-[#087477]" />
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#173B3F]">Loading Student Intelligence</h4>
              <p className="text-xs text-[#36565A] max-w-xs">
                Synthesizing student course progress, tasks, quizzes, assessments, and diagnostic evidence...
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
                onClick={() => handleSelectStudent(effectiveSelectedId, false)}
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
                Choose any learner from the roster to view their course progress, multi-source performance, learning gaps, and AI diagnosis.
              </p>
            </div>
          </div>
        ) : (
          <StudentDetailView
            detail={detail}
            courseAnalytics={activeCourseAnalytics}
            courseStudentPerf={selectedStudentCoursePerf}
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
  courseAnalytics?: CourseAnalyticsSummary | null;
  courseStudentPerf?: StudentCoursePerformance | null;
  refreshingStudentAi: boolean;
  onRefreshStudentAi: (studentId: string) => void;
}

const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  detail,
  courseAnalytics,
  courseStudentPerf,
  refreshingStudentAi,
  onRefreshStudentAi
}) => {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceDetailItem | null>(null);

  // Compute course progress details
  const courseProgressPct = courseStudentPerf ? Math.round(courseStudentPerf.progress_percent || 0) : null;
  const rawUnits = (courseAnalytics?.course as any)?.units || (courseAnalytics?.course as any)?.course_units || [];
  const totalUnits = rawUnits.length || (courseAnalytics?.course?.units_count ?? 0);
  const allCourseLessons = useMemo(() => {
    const list: Array<{ id: string; title: string; unitTitle: string }> = [];
    rawUnits.forEach((u: any, uIdx: number) => {
      const eps = u.episodes || u.course_episodes || [];
      eps.forEach((ep: any, eIdx: number) => {
        list.push({
          id: ep.id,
          title: ep.title || `Lesson ${eIdx + 1}`,
          unitTitle: u.title || `Unit ${uIdx + 1}`
        });
      });
    });
    return list;
  }, [rawUnits]);

  const totalLessons = courseStudentPerf?.total_episodes_count || allCourseLessons.length || (courseAnalytics?.course?.episodes_count ?? 0);
  const completedLessons = courseStudentPerf?.completed_episodes_count ??
    (totalLessons > 0 && courseProgressPct != null ? Math.round((courseProgressPct / 100) * totalLessons) : 0);
  const remainingLessons = Math.max(0, totalLessons - completedLessons);
  const completedUnits = totalUnits > 0 && courseProgressPct != null
    ? Math.min(totalUnits, Math.floor((courseProgressPct / 100) * totalUnits))
    : 0;
  const currentLessonObj = allCourseLessons[Math.min(completedLessons, Math.max(0, allCourseLessons.length - 1))];
  const currentLessonLabel = courseProgressPct != null && courseProgressPct >= 100
    ? 'Course Completed'
    : currentLessonObj
    ? currentLessonObj.title
    : totalLessons > 0
    ? `Lesson ${Math.min(totalLessons, completedLessons + 1)}`
    : 'In Progress';

  // Focused Learning Gaps (NEEDS SUPPORT - max 5 prioritized)
  const focusedGaps = useMemo(() => {
    const items: Array<{ topic: string; percentage: number | null }> = [];
    const seen = new Set<string>();

    (detail.weakAreas || []).forEach(wa => {
      if (!wa.topic || seen.has(wa.topic.toLowerCase())) return;
      seen.add(wa.topic.toLowerCase());
      items.push({ topic: wa.topic, percentage: Math.round(wa.average) });
    });

    (courseStudentPerf?.weak_concepts || []).forEach(wc => {
      if (!wc || seen.has(wc.toLowerCase())) return;
      seen.add(wc.toLowerCase());
      const cm = courseAnalytics?.concept_mastery?.find(c => c.concept.toLowerCase() === wc.toLowerCase());
      items.push({ topic: wc, percentage: cm ? Math.round(cm.accuracy_percentage) : null });
    });

    return items.slice(0, 5);
  }, [detail.weakAreas, courseStudentPerf?.weak_concepts, courseAnalytics?.concept_mastery]);

  // Focused Strengths (STRONG AREAS - max 5)
  const focusedStrengths = useMemo(() => {
    const items: Array<{ topic: string; percentage: number | null }> = [];
    const seen = new Set<string>();

    (detail.strongAreas || []).forEach(sa => {
      if (!sa.topic || seen.has(sa.topic.toLowerCase())) return;
      seen.add(sa.topic.toLowerCase());
      items.push({ topic: sa.topic, percentage: Math.round(sa.average) });
    });

    (courseStudentPerf?.strong_concepts || []).forEach(sc => {
      if (!sc || seen.has(sc.toLowerCase())) return;
      seen.add(sc.toLowerCase());
      const cm = courseAnalytics?.concept_mastery?.find(c => c.concept.toLowerCase() === sc.toLowerCase());
      items.push({ topic: sc, percentage: cm ? Math.round(cm.accuracy_percentage) : null });
    });

    return items.slice(0, 5);
  }, [detail.strongAreas, courseStudentPerf?.strong_concepts, courseAnalytics?.concept_mastery]);

  const assignAttempts = detail.activityBreakdown.assignment?.attempts || 0;
  const ocrAttempts = detail.activityBreakdown.ocr?.attempts || 0;
  const taskScore = detail.activityBreakdown.assignment?.averageScore != null
    ? Math.round(detail.activityBreakdown.assignment.averageScore)
    : null;
  const ocrScore = detail.activityBreakdown.ocr?.averageScore != null
    ? Math.round(detail.activityBreakdown.ocr.averageScore)
    : null;
  const liveQuizScore = detail.activityBreakdown.live_quiz?.averageScore != null
    ? Math.round(detail.activityBreakdown.live_quiz.averageScore)
    : null;
  const examScore = detail.activityBreakdown.exam?.averageScore != null
    ? Math.round(detail.activityBreakdown.exam.averageScore)
    : null;
  const courseQuizScore = courseStudentPerf?.accuracy_percent != null
    ? Math.round(courseStudentPerf.accuracy_percent)
    : liveQuizScore;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Student Header Card */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#173B3F] via-[#1a4247] to-[#0d2a2d] text-white rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#173B3F]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
              Student Intelligence
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
          <span className="text-[10px] uppercase font-bold text-[#D4EFEC] block">Average Score</span>
          <span className="text-2xl sm:text-3xl font-black text-white">
            {detail.averagePercentage != null ? `${detail.averagePercentage}%` : courseQuizScore != null ? `${courseQuizScore}%` : '—'}
          </span>
        </div>
      </div>

      {/* SECTION 1: COURSE PROGRESS */}
      {(courseStudentPerf || courseAnalytics) && (
        <div className="bg-white rounded-3xl p-5 border border-[#C9E5E2] shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#087477]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                Course Progress • {courseAnalytics?.course?.title || 'Assigned Course'}
              </h4>
            </div>
            <span className="text-sm font-black text-[#087477]">
              {courseProgressPct != null ? `${courseProgressPct}% Complete` : '0% Complete'}
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#087477] to-[#14b8a6] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, courseProgressPct || 0))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-[#F8FCFB] border border-[#C9E5E2]">
              <span className="text-[10px] font-black text-[#36565A] uppercase block">Lessons Completed</span>
              <span className="text-base font-black text-[#173B3F] mt-0.5 block">
                {completedLessons} {totalLessons > 0 ? `/ ${totalLessons}` : ''}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F8FCFB] border border-[#C9E5E2]">
              <span className="text-[10px] font-black text-[#36565A] uppercase block">Remaining Lessons</span>
              <span className="text-base font-black text-amber-700 mt-0.5 block">
                {remainingLessons}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F8FCFB] border border-[#C9E5E2]">
              <span className="text-[10px] font-black text-[#36565A] uppercase block">Units Completed</span>
              <span className="text-base font-black text-[#087477] mt-0.5 block">
                {completedUnits} {totalUnits > 0 ? `/ ${totalUnits}` : ''}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#F8FCFB] border border-[#C9E5E2]">
              <span className="text-[10px] font-black text-[#36565A] uppercase block">Current Lesson</span>
              <span className="text-xs font-extrabold text-[#173B3F] mt-1 block truncate" title={currentLessonLabel}>
                {currentLessonLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MULTI-SOURCE PERFORMANCE */}
      <div className="bg-white rounded-3xl p-5 border border-[#C9E5E2] shadow-xs space-y-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
            Performance Breakdown
          </h4>
          <p className="text-[11px] text-[#36565A] font-medium">
            Scores across Quizzes, Exams, Typed Tasks, Live Quizzes, and OCR Worksheets
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
            <span className="text-[10px] font-black text-[#36565A] block uppercase">Avg Score</span>
            <span className="text-sm font-black text-[#087477] block">
              {detail.averagePercentage != null ? `${detail.averagePercentage}%` : '—'}
            </span>
            <span className="text-[10px] font-semibold text-[#36565A]">{detail.attempts} total</span>
          </div>

          <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
            <span className="text-[10px] font-black text-[#36565A] block uppercase">Course Quizzes</span>
            <span className="text-sm font-black text-[#173B3F] block">
              {courseQuizScore != null ? `${courseQuizScore}%` : '—'}
            </span>
            <span className="text-[10px] font-semibold text-[#36565A]">Lesson checks</span>
          </div>

          <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
            <span className="text-[10px] font-black text-[#36565A] block uppercase">Exams</span>
            <span className="text-sm font-black text-[#173B3F] block">
              {examScore != null ? `${examScore}%` : '—'}
            </span>
            <span className="text-[10px] font-semibold text-[#36565A]">
              {detail.activityBreakdown.exam?.attempts || 0} attempts
            </span>
          </div>

          <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
            <span className="text-[10px] font-black text-[#36565A] block uppercase">Typed Tasks</span>
            <span className="text-sm font-black text-[#173B3F] block">
              {taskScore != null ? `${taskScore}%` : '—'}
            </span>
            <span className="text-[10px] font-semibold text-[#36565A]">{assignAttempts} submitted</span>
          </div>

          <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
            <span className="text-[10px] font-black text-[#36565A] block uppercase">Live Quizzes</span>
            <span className="text-sm font-black text-[#173B3F] block">
              {liveQuizScore != null ? `${liveQuizScore}%` : '—'}
            </span>
            <span className="text-[10px] font-semibold text-[#36565A]">
              {detail.activityBreakdown.live_quiz?.attempts || 0} attempts
            </span>
          </div>

          <div className="p-3 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-center space-y-0.5">
            <span className="text-[10px] font-black text-[#36565A] block uppercase">OCR Worksheets</span>
            <span className="text-sm font-black text-[#173B3F] block">
              {ocrScore != null ? `${ocrScore}%` : '—'}
            </span>
            <span className="text-[10px] font-semibold text-[#36565A]">{ocrAttempts} scanned</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: LEARNING GAPS (NEEDS SUPPORT) & STRENGTHS (STRONG AREAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Needs Support */}
        <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-rose-900">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-black uppercase tracking-wider">Needs Support (Learning Gaps)</span>
          </div>
          {focusedGaps.length > 0 ? (
            <div className="space-y-1.5">
              {focusedGaps.map((wa, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-rose-900 border border-rose-200 shadow-2xs flex items-center justify-between"
                >
                  <span>{idx + 1}. {wa.topic}</span>
                  {wa.percentage != null && (
                    <span className="font-mono font-black text-rose-700">{wa.percentage}%</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#36565A] italic">No critical learning gaps detected yet.</p>
          )}
        </div>

        {/* Strong Areas */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-emerald-900">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-black uppercase tracking-wider">Strong Areas (Strengths)</span>
          </div>
          {focusedStrengths.length > 0 ? (
            <div className="space-y-1.5">
              {focusedStrengths.map((sa, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-emerald-900 border border-emerald-200 shadow-2xs flex items-center justify-between"
                >
                  <span>{idx + 1}. {sa.topic}</span>
                  {sa.percentage != null && (
                    <span className="font-mono font-black text-emerald-700">{sa.percentage}%</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#36565A] italic">Complete more activities to surface top strengths.</p>
          )}
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
                  <tr
                    key={ev.id}
                    onClick={() => setSelectedEvidence({
                      ...ev,
                      studentName: detail.fullName || 'Student',
                      studentId: detail.studentId
                    })}
                    className="hover:bg-[#E8F7F5] cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 font-bold text-[#173B3F] group-hover:text-[#087477] max-w-[180px] truncate">
                      {ev.activityTitle}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E8F7F5] text-[#087477]">
                        {ev.activityType === 'ocr' ? 'OCR Worksheet' : ev.activityType.replace('_', ' ')}
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

      {/* Evidence Detail Modal */}
      {selectedEvidence && (
        <EvidenceDetailModal
          item={selectedEvidence}
          isOpen={Boolean(selectedEvidence)}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </div>
  );
};
