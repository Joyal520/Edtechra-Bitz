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
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { CourseClassroomAssignment } from '@/types/courseStudio';
import { CourseCoverImage } from '@/utils/courseCover';
import { Classroom } from '@/types/classroom';

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

            const handleCardClick = () => {
              navigate(`/classes/${classroomId}/courses/${course.id}/learn`);
            };

            return (
              <div
                key={item.id}
                onClick={handleCardClick}
                className="bg-white rounded-2xl sm:rounded-[26px] border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-sky-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group h-full"
              >
                {/* Course Cover Container */}
                <div className="relative w-full overflow-hidden bg-slate-950 shrink-0 select-none">
                  <CourseCoverImage
                    course={course}
                    aspectRatio={course.cover_aspect_ratio}
                    imgClassName="group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20 shadow-xs flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-sky-300" />
                      <span>{course.subject || 'General'}</span>
                    </span>

                    {isCompleted ? (
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
                      {isCompleted ? (
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
