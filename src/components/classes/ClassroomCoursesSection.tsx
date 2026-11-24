// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: "COURSES FOR THIS CLASS" SECTION
// Dedicated Student Classroom Course Discovery & Progress Hub.
// "Continue learning with courses selected by your teacher."
// ============================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Plus,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';
import { CourseClassroomAssignment } from '@/types/courseStudio';
import { CourseCoverImage } from '@/utils/courseCover';
import { Classroom } from '@/types/classroom';
import {
  formatUnlockDateLabel,
  getDateStringInTimezone,
  ymdToUtcMs
} from '@/utils/dailyReleaseEngine';

interface Props {
  classroomId: string;
  classroom?: Classroom | null;
  courses: CourseClassroomAssignment[];
  loading?: boolean;
  error?: string | null;
  isTeacher?: boolean;
  onRefresh?: () => void;
  onOpenAssignModal?: () => void;
}

export const ClassroomCoursesSection: React.FC<Props> = ({
  classroomId,
  classroom: _classroom,
  courses,
  loading = false,
  error = null,
  isTeacher = false,
  onRefresh,
  onOpenAssignModal
}) => {
  const navigate = useNavigate();

  // Sort courses according to pedagogical priority:
  // 1. In progress (started but not completed)
  // 2. New (untouched, progress = 0)
  // 3. Completed (progress = 100)
  const sortedCourses = [...courses].sort((a, b) => {
    const progA = a.enrollment?.progress_percent || 0;
    const progB = b.enrollment?.progress_percent || 0;

    const rank = (p: number) => {
      if (p > 0 && p < 100) return 1; // In Progress first
      if (p === 0) return 2;          // New courses next
      return 3;                       // Completed last
    };

    return rank(progA) - rank(progB);
  });

  return (
    <section className="space-y-4">
      
      {/* ===================================================================== */}
      {/* SECTION HEADER                                                        */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#026fc3] ring-4 ring-sky-100" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Courses for This Class
            </h2>
            <span className="text-[11px] font-bold text-sky-800 bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-full">
              {courses.length} Active Course{courses.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Continue learning with courses selected by your teacher.
          </p>
        </div>

        {/* Teacher Actions or Student Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh courses"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {isTeacher && onOpenAssignModal && (
            <button
              type="button"
              onClick={onOpenAssignModal}
              className="px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Assign Studio Course</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* LOADING STATE                                                         */}
      {/* ===================================================================== */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {[1, 2].map(i => (
            <div
              key={i}
              className="bg-white rounded-[26px] border border-stone-200/80 p-5 space-y-4 shadow-xs animate-pulse"
            >
              <div className="w-full h-36 bg-slate-200 rounded-2xl" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* ===================================================================== */
        /* ERROR STATE (With Retry Button)                                       */
        /* ===================================================================== */
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-rose-900">Unable to load classroom courses</p>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : sortedCourses.length === 0 ? (
        /* ===================================================================== */
        /* EMPTY STATE                                                           */
        /* ===================================================================== */
        <div className="bg-gradient-to-br from-white via-stone-50/60 to-sky-50/30 rounded-2xl sm:rounded-[26px] p-8 sm:p-10 text-center border border-stone-200/80 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#026fc3] border border-sky-100 flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-black text-slate-900">
              No courses have been assigned to this class yet.
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {isTeacher
                ? 'Create or pick a course from Course Studio and assign it to this classroom for your students.'
                : 'Your teacher has not assigned any digital courses to this classroom yet. Check back soon!'}
            </p>
          </div>

          {isTeacher && (
            <div className="pt-2 flex items-center justify-center gap-3">
              {onOpenAssignModal && (
                <button
                  type="button"
                  onClick={onOpenAssignModal}
                  className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Assign Studio Course</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/course-studio')}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-stone-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Open Course Studio
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ===================================================================== */
        /* RESPONSIVE COURSE CARDS GRID                                          */
        /* ===================================================================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {sortedCourses.map(item => {
            const course = item.course;
            if (!course) return null;

            const enrollment = item.enrollment;
            const progressPct = Number(enrollment?.progress_percent || 0);
            const totalEpisodes = course.episodes_count ?? enrollment?.total_episodes_count ?? 1;
            const completedEpisodes = enrollment?.completed_episodes_count || 0;
            const isCompleted = progressPct >= 100;
            const hasStarted = progressPct > 0;

            const cfg = (item as any).resolved_config || {};
            const timeZone =
              cfg.course_timezone ||
              item.unlock_configuration?.course_timezone ||
              item.settings?.course_timezone ||
              'Asia/Colombo';
            const availableFromRaw =
              cfg.available_from ?? item.available_from ?? item.start_date ?? null;
            const dueDateRaw =
              cfg.due_date ?? item.due_date ?? item.settings?.due_date ?? null;
            const dailyEnabled = Boolean(
              cfg.daily_release_enabled ??
                item.daily_unlock_enabled ??
                item.settings?.daily_release_enabled
            );
            const intervalDays = Math.max(
              1,
              Number(
                cfg.daily_release_interval_days ??
                  item.unlock_configuration?.unlock_frequency_days ??
                  item.settings?.daily_release_interval_days ??
                  1
              ) || 1
            );
            const lessonsPerRelease = Math.max(
              1,
              Number(
                cfg.unlock_lessons_per_release ??
                  item.unlock_configuration?.unlock_lessons_per_release ??
                  item.settings?.unlock_lessons_per_release ??
                  1
              ) || 1
            );

            const todayYmd = getDateStringInTimezone((item as any).server_time || new Date(), timeZone);
            const todayMs = ymdToUtcMs(todayYmd);
            const availYmd = availableFromRaw ? getDateStringInTimezone(availableFromRaw, timeZone) : null;
            const isBeforeAvailableFrom = Boolean(availYmd && todayMs < ymdToUtcMs(availYmd));
            const availLabel = availYmd ? formatUnlockDateLabel(availYmd) : null;

            const dueYmd = dueDateRaw ? getDateStringInTimezone(dueDateRaw, timeZone) : null;
            const isPastDue = Boolean(dueYmd && !isCompleted && todayMs > ymdToUtcMs(dueYmd));
            const dueLabel = dueYmd ? formatUnlockDateLabel(dueYmd) : null;

            const handleCardClick = () => {
              navigate(`/classes/${classroomId}/courses/${course.id}/learn`);
            };

            return (
              <div
                key={item.id}
                onClick={handleCardClick}
                className="bg-white rounded-2xl sm:rounded-[26px] border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-sky-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group h-full"
              >
                {/* Course Cover Container - Strict Uniform 2.35:1 Banner Aspect Ratio */}
                <div className="relative w-full aspect-[2.35/1] overflow-hidden bg-slate-950 shrink-0 select-none">
                  <CourseCoverImage
                    course={course}
                    aspectRatio="banner"
                    imgClassName="group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20 shadow-xs flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-sky-300" />
                      <span>{course.subject || 'General'}</span>
                    </span>

                    {item.status === 'paused' ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs flex items-center gap-1 border border-amber-300/40">
                        <Pause className="w-3 h-3" />
                        <span>Paused</span>
                      </span>
                    ) : isBeforeAvailableFrom ? (
                      <span className="px-2.5 py-1 rounded-full bg-indigo-600/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs flex items-center gap-1 border border-indigo-300/40">
                        <Lock className="w-3 h-3" />
                        <span>Opens {availLabel}</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs flex items-center gap-1 border border-emerald-300/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    ) : hasStarted ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs flex items-center gap-1 border border-amber-300/40">
                        <span>In Progress</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-sky-600/90 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs border border-sky-300/40">
                        <span>New</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Metadata Pill on Cover */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold pointer-events-none drop-shadow-xs">
                    <span className="bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15">
                      {totalEpisodes} Lesson{totalEpisodes === 1 ? '' : 's'}
                    </span>
                    {course.grade_level && (
                      <span className="bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15">
                        {course.grade_level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                  
                  {/* Title and Short Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-[#026fc3] transition-colors line-clamp-2 leading-snug">
                      {course.title}
                    </h3>
                    {course.short_description ? (
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {course.short_description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium italic">
                        Interactive curriculum designed for your classroom.
                      </p>
                    )}

                    {/* Class-Specific Assignment Schedule & Unlock Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      {availLabel && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isBeforeAvailableFrom
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-600 border-stone-200'
                          }`}
                        >
                          <Calendar className="w-2.5 h-2.5 shrink-0" />
                          <span>{isBeforeAvailableFrom ? `Opens ${availLabel}` : `Available ${availLabel}`}</span>
                        </span>
                      )}
                      {dueLabel && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isPastDue
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50/70 text-amber-800 border-amber-200/80'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span>{isPastDue ? `Past Due • ${dueLabel}` : `Due ${dueLabel}`}</span>
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          dailyEnabled
                            ? 'bg-sky-50 text-[#026fc3] border-sky-200'
                            : 'bg-emerald-50/70 text-emerald-700 border-emerald-200/80'
                        }`}
                      >
                        {dailyEnabled ? <Lock className="w-2.5 h-2.5 shrink-0" /> : <Unlock className="w-2.5 h-2.5 shrink-0" />}
                        <span>
                          {dailyEnabled
                            ? lessonsPerRelease === 1 && intervalDays === 1
                              ? 'Daily Unlock (1/day)'
                              : `${lessonsPerRelease} lesson${lessonsPerRelease > 1 ? 's' : ''} / ${intervalDays === 7 ? 'week' : intervalDays === 1 ? 'day' : `${intervalDays}d`}`
                            : 'All Lessons Open'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Progress & Actions Section */}
                  <div className="space-y-3 pt-1 border-t border-stone-100">
                    
                    {/* Student Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Your Progress
                        </span>
                        <span className={`font-black text-xs ${
                          isCompleted ? 'text-emerald-600' : hasStarted ? 'text-[#026fc3]' : 'text-slate-400'
                        }`}>
                          {progressPct.toFixed(0)}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : hasStarted
                              ? 'bg-gradient-to-r from-[#026fc3] to-sky-400'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${Math.max(progressPct, 0)}%` }}
                        />
                      </div>

                      {hasStarted && (
                        <p className="text-[10px] text-slate-400 font-semibold text-right">
                          {completedEpisodes} of {totalEpisodes} lesson{totalEpisodes === 1 ? '' : 's'} completed
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-1">
                      {item.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isTeacher) handleCardClick();
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-2xs flex items-center justify-center gap-2 ${
                            isTeacher
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer'
                              : 'bg-amber-50 text-amber-800 border border-amber-200/90 cursor-not-allowed opacity-90'
                          }`}
                        >
                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                          <span>{isTeacher ? 'Preview Paused Course' : 'Course Paused'}</span>
                        </button>
                      ) : isBeforeAvailableFrom ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isTeacher) handleCardClick();
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-2xs flex items-center justify-center gap-2 ${
                            isTeacher
                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-pointer'
                              : 'bg-indigo-50/70 text-indigo-800 border border-indigo-200/90 cursor-not-allowed opacity-90'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isTeacher ? `Preview (Opens ${availLabel})` : `Opens ${availLabel}`}</span>
                        </button>
                      ) : isCompleted ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick();
                          }}
                          className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 rounded-xl text-xs font-black shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Review Course</span>
                        </button>
                      ) : hasStarted ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick();
                          }}
                          className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Continue Learning →</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick();
                          }}
                          className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>Start Course →</span>
                        </button>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </section>
  );
};
