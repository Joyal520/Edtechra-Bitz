// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE PUBLISH & CLASSROOM ASSIGNMENT MODAL
// Multi-Classroom Course Delivery with Enrollment Automation and Settings.
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
  RotateCcw,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { Course, CourseAssignmentSettings } from '@/types/courseStudio';
import { Classroom } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { courseStudioService } from '@/services/courseStudioService';

interface Props {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CoursePublishModal: React.FC<Props> = ({
  course,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [settings, setSettings] = useState<CourseAssignmentSettings>({
    sequential_unlock: false,
    allow_retries: true,
    track_mastery: true,
    award_points: true
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ assignedCount: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeacherClassrooms();
      setSuccessResult(null);
      setError(null);
    }
  }, [isOpen]);

  const loadTeacherClassrooms = async () => {
    setLoading(true);
    try {
      const list = await classroomService.getClassrooms();
      const teachingOnly = list.filter(c => c.user_role === 'teacher');
      setClassrooms(teachingOnly);
      // Pre-select all classrooms by default for convenience
      setSelectedClassroomIds(teachingOnly.map(c => c.id));
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

  const handlePublish = async () => {
    if (selectedClassroomIds.length === 0) {
      setError('Please select at least one classroom to assign this course.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await courseStudioService.publishAndAssignCourse(course.id, {
        classroom_ids: selectedClassroomIds,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        settings
      });

      setSuccessResult({ assignedCount: res.assigned_count });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to publish and assign course.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#fcfaf6] rounded-[28px] max-w-xl w-full border border-stone-200/90 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-6 bg-[#0a213c] text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 text-[11px] font-black uppercase tracking-wider border border-sky-400/30">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>Publish & Assign Course</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {course.title}
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

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {course.status === 'published' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Publishing Updates to Active Classrooms: </span>
                <span>This course is currently assigned across classrooms. Publishing will deploy your latest draft changes while preserving all existing student progress and question attempt history.</span>
              </div>
            </div>
          )}

          {successResult ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Course Published Successfully!
                </h3>
                <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
                  Assigned to <span className="font-black text-slate-900">{successResult.assignedCount} classroom(s)</span>. All enrolled students can now access lessons and complete interactive questions.
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Close & View Studio
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Classroom Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#026fc3]" />
                    <span>Select Delivery Classrooms</span>
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
                  <div className="p-6 text-center text-xs text-slate-400 font-semibold animate-pulse">
                    Loading your classrooms...
                  </div>
                ) : classrooms.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center">
                    No active classrooms found. Create a classroom first from the Classes page.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {classrooms.map(c => {
                      const isSelected = selectedClassroomIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleClassroom(c.id)}
                          className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50/80 border-[#026fc3] text-[#026fc3] shadow-xs'
                              : 'bg-white border-stone-200/80 text-slate-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="truncate">
                            <p className="font-extrabold truncate text-slate-900">{c.title}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{c.grade} • {c.subject}</p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-[#026fc3] border-[#026fc3] text-white' : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Available From</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#026fc3] focus:outline-none"
                  />
                </div>
              </div>

              {/* Learning Experience Settings */}
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Course Delivery Options
                </h4>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200/80 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-xs font-black text-slate-900">Sequential Episode Unlock</p>
                        <p className="text-[11px] text-slate-500 font-medium">Students must complete Day 1 before opening Day 2</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.sequential_unlock}
                      onChange={e => setSettings(s => ({ ...s, sequential_unlock: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200/80 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-xs font-black text-slate-900">Allow Question Retries</p>
                        <p className="text-[11px] text-slate-500 font-medium">Students can practice questions multiple times</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.allow_retries}
                      onChange={e => setSettings(s => ({ ...s, allow_retries: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200/80 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-xs font-black text-slate-900">Track Concept Mastery & XP</p>
                        <p className="text-[11px] text-slate-500 font-medium">Compute granular skill telemetry for Teaching Intelligence</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.track_mastery}
                      onChange={e => setSettings(s => ({ ...s, track_mastery: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#026fc3] focus:ring-[#026fc3]"
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={submitting || selectedClassroomIds.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Assigning Course...' : 'Publish & Deliver'}</span>
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
