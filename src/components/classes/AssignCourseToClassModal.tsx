// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ASSIGN COURSE TO CLASSROOM MODAL
// Opened directly from ClassroomDetailPage.
// Allows teachers to assign published courses to THIS classroom in one click.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  BookOpen,
  Sparkles,
  Plus,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Course } from '@/types/courseStudio';
import { Classroom } from '@/types/classroom';
import { courseStudioService } from '@/services/courseStudioService';
import { CourseCoverImage } from '@/utils/courseCover';
import { CoursePublishModal } from '@/components/course-studio/CoursePublishModal';

interface Props {
  isOpen: boolean;
  classroom: Classroom;
  onClose: () => void;
  onAssigned: () => void;
}

export const AssignCourseToClassModal: React.FC<Props> = ({
  isOpen,
  classroom,
  onClose,
  onAssigned
}) => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseForPublish, setSelectedCourseForPublish] = useState<Course | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeacherCourses();
      setError(null);
    }
  }, [isOpen]);

  const loadTeacherCourses = async () => {
    setLoading(true);
    try {
      const data = await courseStudioService.getCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load teacher courses.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAssignToggle = async (course: Course, currentlyAssigned: boolean) => {
    setAssigningId(course.id);
    setError(null);

    try {
      // 1. Fetch full course details to get current assigned classrooms
      const full = await courseStudioService.getCourse(course.id);
      const activeClassroomIds: string[] = ((full as any)?.course_classroom_assignments || [])
        .filter((a: any) => a.status === 'active')
        .map((a: any) => a.classroom_id);

      let newClassroomIds: string[];
      if (currentlyAssigned) {
        // Remove this classroom
        newClassroomIds = activeClassroomIds.filter(id => id !== classroom.id);
      } else {
        // Add this classroom
        newClassroomIds = Array.from(new Set([...activeClassroomIds, classroom.id]));
      }

      await courseStudioService.publishAndAssignCourse(course.id, {
        classroom_ids: newClassroomIds,
        start_date: new Date().toISOString()
      });

      // Reload list and notify parent classroom page
      await loadTeacherCourses();
      onAssigned();
    } catch (err: any) {
      setError(err.message || 'Failed to update course assignment.');
    } finally {
      setAssigningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <div className="bg-[#fcfaf6] rounded-[28px] max-w-2xl w-full border border-stone-200/90 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-6 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[11px] font-black uppercase tracking-wider border border-sky-400/30">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span>Classroom Delivery</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Assign Courses to &ldquo;{classroom.title}&rdquo;
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Select which of your Course Studio courses should be active for students in this classroom.
              Assigning a course makes its units, lessons, and interactive questions instantly available to all enrolled students.
            </p>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-semibold space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#026fc3]" />
                <p>Loading your courses from Course Studio...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200/80 space-y-3">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">No courses created yet in Course Studio</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Build your first course in Course Studio to assign it to this class.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/course-studio?classroomId=${classroom.id}`);
                  }}
                  className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Open Course Studio</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {courses.map(c => {
                  const isPublished = c.status === 'published';
                  // Check if course is already assigned to this classroom
                  const isAssignedToThisClass = Boolean(
                    (c as any).course_classroom_assignments?.some(
                      (a: any) => a.classroom_id === classroom.id && a.status === 'active'
                    )
                  );
                  const isProcessing = assigningId === c.id;

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isAssignedToThisClass
                          ? 'bg-sky-50/70 border-sky-300 shadow-xs'
                          : 'bg-white border-stone-200/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-20 h-14 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 shadow-2xs">
                          <CourseCoverImage course={c} className="w-full h-full" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70">
                              {c.subject || 'General'}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isPublished
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isPublished ? '● Published' : '○ Draft'}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-slate-900 truncate">
                            {c.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 font-medium">
                            {c.episodes_count ?? 1} Lesson{(c.episodes_count ?? 1) === 1 ? '' : 's'} •{' '}
                            {c.assigned_classrooms_count ?? 0} Class{(c.assigned_classrooms_count ?? 0) === 1 ? '' : 'es'} total
                          </p>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleQuickAssignToggle(c, isAssignedToThisClass)}
                          className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            isAssignedToThisClass
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-[#026fc3] hover:bg-[#03589e] text-white'
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : isAssignedToThisClass ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Assigned to This Class</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Assign to Class</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          title="Detailed multi-classroom settings"
                          onClick={() => setSelectedCourseForPublish(c)}
                          className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/course-studio?classroomId=${classroom.id}`);
              }}
              className="text-xs font-bold text-[#026fc3] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Go to Course Studio</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white hover:bg-stone-100 text-slate-700 border border-stone-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>

      {/* Advanced Full Publish Modal */}
      {selectedCourseForPublish && (
        <CoursePublishModal
          course={selectedCourseForPublish}
          isOpen={Boolean(selectedCourseForPublish)}
          initialClassroomId={classroom.id}
          onClose={() => setSelectedCourseForPublish(null)}
          onSuccess={() => {
            loadTeacherCourses();
            onAssigned();
            setSelectedCourseForPublish(null);
          }}
        />
      )}
    </>
  );
};
