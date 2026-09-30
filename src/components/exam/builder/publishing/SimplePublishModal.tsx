// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: SIMPLIFIED PUBLISH MODAL
// Teacher-friendly publishing dialog:
// - "When should students access this exam?" (Publish Now vs Schedule)
// - Start date and start time with configured exam duration
// - Wide responsive layout (700-800px on desktop) with internal scroll
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  Clock,
  Calendar,
  Info
} from 'lucide-react';

interface SimplePublishModalProps {
  isOpen: boolean;
  examTitle: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  onClose: () => void;
  onConfirmPublish: (settings: {
    mode: 'now' | 'schedule';
    scheduledDate?: string;
    startTime?: string;
    availability: 'class' | 'selected' | 'course';
  }) => void;
}

export const SimplePublishModal: React.FC<SimplePublishModalProps> = ({
  isOpen,
  examTitle,
  totalQuestions,
  totalMarks,
  durationMinutes,
  onClose,
  onConfirmPublish
}) => {
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('09:00');
  const [availability, setAvailability] = useState<'class' | 'selected' | 'course'>('class');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isScheduleInvalid = publishMode === 'schedule' && (!scheduledDate || !startTime);

  const handlePublish = () => {
    if (isScheduleInvalid || totalQuestions === 0) return;
    setIsSubmitting(true);
    onConfirmPublish({
      mode: publishMode,
      scheduledDate: publishMode === 'schedule' ? scheduledDate : undefined,
      startTime: publishMode === 'schedule' ? startTime : undefined,
      availability
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn select-none">
      {/* Responsive wide modal: ~768px on desktop (max-w-3xl), fits viewport with max-h-[90vh] */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header - Fixed top */}
        <div className="p-5 sm:p-6 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block">
                Final Step
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                Publish Examination
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close publish dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Exam Summary Header */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Target Examination
              </div>
              <div className="text-sm sm:text-base font-black text-indigo-950 truncate">
                {examTitle || 'Classroom Examination'}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-indigo-800 shrink-0">
              <span className="px-2.5 py-1 rounded-xl bg-white border border-indigo-200/80 shadow-2xs">
                {totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-indigo-200/80 shadow-2xs">
                {totalMarks} Marks
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white shadow-2xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{durationMinutes} Min</span>
              </span>
            </div>
          </div>

          {/* Timing Section */}
          <div className="space-y-3.5">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              When should students access this exam?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label
                onClick={() => setPublishMode('now')}
                className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                  publishMode === 'now'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="pubMode"
                  checked={publishMode === 'now'}
                  onChange={() => setPublishMode('now')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-1">
                  <div className="text-sm font-black text-slate-900">Publish Now</div>
                  <div className="text-xs text-slate-500 leading-relaxed font-medium">
                    Available immediately for classroom students upon publishing
                  </div>
                </div>
              </label>

              <label
                onClick={() => setPublishMode('schedule')}
                className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                  publishMode === 'schedule'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="pubMode"
                  checked={publishMode === 'schedule'}
                  onChange={() => setPublishMode('schedule')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-1">
                  <div className="text-sm font-black text-slate-900">Schedule</div>
                  <div className="text-xs text-slate-500 leading-relaxed font-medium">
                    Students see a countdown waiting screen until the start time
                  </div>
                </div>
              </label>
            </div>

            {/* Schedule Inputs: Date & Start Time only (No End Time) */}
            {publishMode === 'schedule' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Date</span>
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Start Time</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                {/* Duration Relationship Information Row */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <div className="font-bold text-slate-900">
                      Duration: {durationMinutes} minutes
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      The examination timer begins when students start taking the test. The exam authoritatively concludes based on this configured duration.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Availability Targeting */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              Student Availability
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'class', label: 'Specific class', desc: 'Enrolled students' },
                { id: 'selected', label: 'Selected students', desc: 'Targeted group' },
                { id: 'course', label: 'Entire course', desc: 'All batches' }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                    availability === opt.id
                      ? 'bg-indigo-50/50 border-indigo-500 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="avail"
                    checked={availability === opt.id}
                    onChange={() => setAvailability(opt.id as any)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-slate-900">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 font-normal">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 0 Questions Warning */}
          {totalQuestions === 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-xs font-black">Cannot Publish Empty Examination</div>
                <div className="text-xs text-rose-700 leading-relaxed font-medium">
                  This examination currently contains 0 questions. Please add questions in the editor before publishing or scheduling for students.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed bottom */}
        <div className="p-5 sm:p-6 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || totalQuestions === 0 || isScheduleInvalid}
            onClick={handlePublish}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{publishMode === 'schedule' ? 'Schedule Exam' : 'Publish Exam'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
