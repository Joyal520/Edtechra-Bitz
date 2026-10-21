// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE PUBLISH & CLASSROOM ASSIGNMENT MODAL
// Multi-Classroom Delivery, Lifecycle Management (Draft, Published - Unassigned,
// Published - Assigned), and One-Lesson-Per-Day Learning Pace Engine.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  GraduationCap,
  Calendar,
  Sparkles,
  Lock,
  AlertCircle,
  Check,
  EyeOff,
  Clock
} from 'lucide-react';
import { Course, CourseAssignmentSettings } from '@/types/courseStudio';
import { Classroom } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { courseStudioService } from '@/services/courseStudioService';

interface Props {
  course: Course;
  isOpen: boolean;
  initialClassroomId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CoursePublishModal: React.FC<Props> = ({
  course,
  isOpen,
  initialClassroomId,
  onClose,
  onSuccess
}) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [dailyReleaseEnabled, setDailyReleaseEnabled] = useState<boolean>(
    Boolean(course.daily_release_enabled)
  );
  const [settings, setSettings] = useState<CourseAssignmentSettings>({
    sequential_unlock: false,
    allow_retries: true,
    track_mastery: true,
    award_points: true,
    daily_release_enabled: Boolean(course.daily_release_enabled)
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ assignedCount: number; status: string } | null>(null);

  const isPublished = course.status === 'published';

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setDailyReleaseEnabled(Boolean(course.daily_release_enabled));
      loadTeacherClassroomsAndAssignments();
      setSuccessResult(null);
      setError(null);
    }
  }, [isOpen, course.id, initialClassroomId, course.daily_release_enabled]);

  const loadTeacherClassroomsAndAssignments = async () => {
    setLoading(true);
    try {
      // 1. Load teacher's classrooms
      const list = await classroomService.getClassrooms();
      const teachingOnly = list.filter(c => c.user_role === 'teacher');
      setClassrooms(teachingOnly);

      // 2. Fetch full course details to discover currently assigned classrooms
      let currentAssigned: string[] = [];
      try {
        const fullCourse = await courseStudioService.getCourse(course.id);
        const activeAssigned = ((fullCourse as any)?.assignments || (fullCourse as any)?.course_classroom_assignments || [])
          .filter((a: any) => a.status === 'active')
          .map((a: any) => a.classroom_id);
        currentAssigned = activeAssigned;

        if (typeof (fullCourse as any)?.daily_release_enabled === 'boolean') {
          setDailyReleaseEnabled((fullCourse as any).daily_release_enabled);
        }
      } catch (_e) {
        // Do NOT assume zero assignments: saving with an empty list would archive every existing class assignment.
        throw new Error('Could not load the current class assignments for this course. Please try again.');
      }

      setAlreadyAssignedIds(currentAssigned);

      // Pre-selection logic:
      // If opened from a classroom context (initialClassroomId), preselect it
      // Otherwise preselect currently assigned classrooms
      if (initialClassroomId) {
        const combined = Array.from(new Set([...currentAssigned, initialClassroomId]));
        setSelectedClassroomIds(combined);
      } else {
        setSelectedClassroomIds(currentAssigned);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load teacher classrooms.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedClassroomIds.length === classrooms.length) {
      setSelectedClassroomIds([]);
    } else {
      setSelectedClassroomIds(classrooms.map(c => c.id));
    }
  };

  const handleToggleClassroom = (id: string) => {
    setSelectedClassroomIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePublishAndAssign = async (allowZeroAssignments: boolean = false) => {
    if (!allowZeroAssignments && selectedClassroomIds.length === 0 && !isPublished) {
      setError('Select at least one classroom, or choose "Publish without Assigning".');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const mergedSettings = {
        ...settings,
        daily_release_enabled: dailyReleaseEnabled
      };

      // 1. Update the course metadata to persist daily_release_enabled on the course record
      await courseStudioService.updateCourse(course.id, {
        daily_release_enabled: dailyReleaseEnabled
      }).catch(err => {
        console.warn('Non-fatal error updating course daily_release_enabled:', err);
      });

      // 2. Publish and assign with full multi-classroom and settings sync
      const res = await courseStudioService.publishAndAssignCourse(course.id, {
        classroom_ids: selectedClassroomIds,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        settings: mergedSettings,
        daily_release_enabled: dailyReleaseEnabled
      });

      setSuccessResult({
        assignedCount: res.assigned_count,
        status: res.assigned_count > 0 ? 'assigned' : 'published_unassigned'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to publish and assign course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Are you sure you want to revert this course to Draft? It will be hidden from students, but all student progress and submissions will be safely preserved.')) {
      return;
    }

    setUnpublishing(true);
    setError(null);

    try {
      await courseStudioService.unpublishCourse(course.id);
      setSuccessResult({
        assignedCount: 0,
        status: 'draft'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to unpublish course.');
    } finally {
      setUnpublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-hidden">
      {/* WIDENED & HEIGHT-BOUNDED MODAL SHELL */}
      <div className="bg-[#fcfaf6] rounded-[24px] sm:rounded-[28px] w-full max-w-[1100px] h-[88dvh] max-h-[88dvh] border border-stone-200/90 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ===================================================================== */}
        {/* PERSISTENT HEADER (NON-SCROLLING)                                     */}
        {/* ===================================================================== */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[11px] font-black uppercase tracking-wider border border-sky-400/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              <span>{isPublished ? 'Manage Class Assignments & Delivery' : 'Publish & Assign Course'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
              {course.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close publishing modal"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ===================================================================== */}
        {/* SCROLLABLE CENTRAL CONTENT                                            */}
        {/* ===================================================================== */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isPublished
              ? alreadyAssignedIds.length > 0
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-slate-100/90 border-slate-200 text-slate-800'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              {isPublished ? (
                alreadyAssignedIds.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )
              ) : (
                <Lock className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div className="text-xs space-y-1">
              <p className="font-black text-sm">
                Status:{' '}
                {isPublished
                  ? alreadyAssignedIds.length > 0
                    ? `PUBLISHED — ASSIGNED TO ${alreadyAssignedIds.length} CLASS${alreadyAssignedIds.length === 1 ? '' : 'ES'}`
                    : 'PUBLISHED — NOT ASSIGNED'
                  : 'DRAFT (Private to Teacher)'}
              </p>
              <p className="text-slate-600 font-medium leading-relaxed">
                {isPublished
                  ? alreadyAssignedIds.length > 0
                    ? 'Students enrolled in the assigned classes can see and learn from this course.'
                    : 'The course is published, but no classes receive it yet. Select classes below to deliver it to students.'
                  : 'Students cannot see or access draft courses. Select classes to publish and deliver.'}
              </p>
            </div>
          </div>

          {successResult ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  {successResult.status === 'draft'
                    ? 'Course Reverted to Draft'
                    : successResult.assignedCount > 0
                    ? 'Course Assignments Updated!'
                    : 'Course Published (Unassigned)'}
                </h3>
                <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
                  {successResult.status === 'draft'
                    ? 'The course has been set to draft. Existing student progress remains preserved.'
                    : successResult.assignedCount > 0
                    ? `Assigned to ${successResult.assignedCount} classroom(s). Enrolled students can now access this course.`
                    : 'The course is published but not assigned to any class yet.'}
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Close & Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Classroom Selection (Expanded Multi-Column Grid on Wide Viewports) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#026fc3]" />
                    <span>Choose Recipient Classrooms</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-bold text-[#026fc3] hover:underline cursor-pointer"
                  >
                    {selectedClassroomIds.length === classrooms.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-semibold animate-pulse">
                    Loading your classrooms...
                  </div>
                ) : classrooms.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center">
                    No active classrooms found where you are a teacher. Create a classroom first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 sm:max-h-64 overflow-y-auto pr-1">
                    {classrooms.map(c => {
                      const isSelected = selectedClassroomIds.includes(c.id);
                      const isAlreadyAssigned = alreadyAssignedIds.includes(c.id);

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleClassroom(c.id)}
                          className={`p-3.5 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50/90 border-[#026fc3] text-[#026fc3] shadow-xs ring-1 ring-[#026fc3]/20'
                              : 'bg-white border-stone-200/80 text-slate-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="truncate min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-black truncate text-slate-900">{c.title}</p>
                              {isAlreadyAssigned && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                                  Assigned
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {c.grade || 'All Grades'} • {c.subject || 'General'}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#026fc3] border-[#026fc3] text-white shadow-xs'
                                : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                  <span>
                    Selected:{' '}
                    <strong className="text-slate-900 font-bold">
                      {selectedClassroomIds.length} of {classrooms.length} class{classrooms.length === 1 ? '' : 'es'}
                    </strong>
                  </span>
                  {selectedClassroomIds.length === 0 && (
                    <span className="text-amber-600 font-bold">
                      No classrooms selected
                    </span>
                  )}
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Available From</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200/90 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Due Date (Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    placeholder="No due date"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200/90 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                  />
                </div>
              </div>

              {/* ============================================================= */}
              {/* DELIVERABLE 2: LEARNING PACE & ACCESS (ONE LESSON PER DAY)     */}
              {/* ============================================================= */}
              <div className="space-y-2.5 pt-2 border-t border-stone-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#026fc3]" />
                    <span>Learning Pace & Access</span>
                  </label>
                </div>

                <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  dailyReleaseEnabled
                    ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-200 shadow-xs'
                    : 'bg-white border-stone-200/80 hover:border-slate-300'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dailyReleaseEnabled}
                      onChange={e => setDailyReleaseEnabled(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3] accent-[#026fc3] cursor-pointer shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">
                          Unlock One Lesson Per Day
                        </span>
                        {dailyReleaseEnabled ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-[#026fc3] border border-sky-200">
                            Daily Release Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Pacing Off (All Open)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        When enabled, enrolled students can complete only <strong>1 newly completed lesson per calendar day</strong>. The next lesson unlocks automatically at midnight. Unfinished lessons remain accessible.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Classroom Experience Settings */}
              <div className="space-y-2.5 pt-2 border-t border-stone-200/70">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Classroom Experience Settings
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="p-3 bg-white rounded-xl border border-stone-200/80 flex items-center gap-2.5 cursor-pointer hover:bg-stone-50 select-none">
                    <input
                      type="checkbox"
                      checked={settings.allow_retries}
                      onChange={e => setSettings(s => ({ ...s, allow_retries: e.target.checked }))}
                      className="rounded text-[#026fc3] focus:ring-[#026fc3] accent-[#026fc3]"
                    />
                    <span className="font-bold text-slate-800">Allow Question Retries</span>
                  </label>

                  <label className="p-3 bg-white rounded-xl border border-stone-200/80 flex items-center gap-2.5 cursor-pointer hover:bg-stone-50 select-none">
                    <input
                      type="checkbox"
                      checked={settings.award_points}
                      onChange={e => setSettings(s => ({ ...s, award_points: e.target.checked }))}
                      className="rounded text-[#026fc3] focus:ring-[#026fc3] accent-[#026fc3]"
                    />
                    <span className="font-bold text-slate-800">Award Bitz Points</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ===================================================================== */}
        {/* PERSISTENT FOOTER (NON-SCROLLING ACTIONS)                             */}
        {/* ===================================================================== */}
        {!successResult && (
          <div className="px-5 sm:px-7 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div>
              {isPublished && (
                <button
                  type="button"
                  disabled={unpublishing || submitting}
                  onClick={handleUnpublish}
                  className="px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Revert to draft. Students will no longer see this course."
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Unpublish to Draft</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-slate-700 hover:bg-stone-100 text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>

              {/* Publish Without Assigning Option (if 0 classes selected and draft) */}
              {!isPublished && selectedClassroomIds.length === 0 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handlePublishAndAssign(true)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <span>Publish Without Assigning</span>
                </button>
              )}

              {/* Primary Action Button */}
              {(isPublished || selectedClassroomIds.length > 0) && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handlePublishAndAssign(false)}
                  className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Saving...'
                      : isPublished
                      ? `Save Assignments (${selectedClassroomIds.length})`
                      : `Publish to Selected (${selectedClassroomIds.length})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
