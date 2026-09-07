// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: SIMPLIFIED PUBLISH MODAL
// Teacher-friendly publishing dialog:
// - "When should students access this exam?" (Publish Now vs Schedule)
// - Availability targeting: Specific class, Selected students, Entire course
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Send
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
    endTime?: string;
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
  const [endTime, setEndTime] = useState('11:00');
  const [availability, setAvailability] = useState<'class' | 'selected' | 'course'>('class');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePublish = () => {
    setIsSubmitting(true);
    onConfirmPublish({
      mode: publishMode,
      scheduledDate: publishMode === 'schedule' ? scheduledDate : undefined,
      startTime: publishMode === 'schedule' ? startTime : undefined,
      endTime: publishMode === 'schedule' ? endTime : undefined,
      availability
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-block">
                Final Step
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                Publish Examination
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Exam Summary Header */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
            <div className="text-xs font-black text-indigo-950 truncate">
              {examTitle || 'Classroom Examination'}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-indigo-800">
              <span>{totalQuestions} Questions</span>
              <span>•</span>
              <span>{totalMarks} Total Marks</span>
              <span>•</span>
              <span>{durationMinutes} Minutes</span>
            </div>
          </div>

          {/* Timing Section */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              When should students access this exam?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setPublishMode('now')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  publishMode === 'now'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="pubMode"
                  checked={publishMode === 'now'}
                  onChange={() => setPublishMode('now')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-black text-slate-900">Publish Now</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Available immediately for classroom students
                  </div>
                </div>
              </label>

              <label
                onClick={() => setPublishMode('schedule')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  publishMode === 'schedule'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="pubMode"
                  checked={publishMode === 'schedule'}
                  onChange={() => setPublishMode('schedule')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-black text-slate-900">Schedule</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Unlocks at a specific date and time
                  </div>
                </div>
              </label>
            </div>

            {/* Schedule Inputs */}
            {publishMode === 'schedule' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Availability Targeting */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student Availability
            </label>

            <div className="space-y-2">
              {[
                { id: 'class', label: 'Specific class', desc: 'Enrolled students in this classroom' },
                { id: 'selected', label: 'Selected students', desc: 'Remedial or targeted student group' },
                { id: 'course', label: 'Entire course', desc: 'All batches and cohorts' }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    availability === opt.id
                      ? 'bg-slate-50 border-indigo-400 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="avail"
                    checked={availability === opt.id}
                    onChange={() => setAvailability(opt.id as any)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 font-normal">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePublish}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span>{publishMode === 'schedule' ? 'Schedule Exam' : 'Publish Exam'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
