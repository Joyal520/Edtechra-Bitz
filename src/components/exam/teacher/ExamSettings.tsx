// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM SETTINGS (STEP 4)
// ============================================================================

import React from 'react';
import {
  Clock,
  Percent,
  Lock,
  Shuffle,
  Eye,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { ExamMetadata, ScorePolicy } from '../shared/ExamSchema';

interface ExamSettingsProps {
  metadata: ExamMetadata;
  onChangeMetadata: (updates: Partial<ExamMetadata>) => void;
}

export const ExamSettings: React.FC<ExamSettingsProps> = ({
  metadata,
  onChangeMetadata
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-teal-950/70 via-indigo-950/60 to-blue-950/70 p-6 rounded-3xl border border-teal-500/30 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center shrink-0 text-teal-300 shadow-inner">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">Step 4: Exam Delivery & Security Settings</h3>
            <p className="text-xs text-teal-200/80 leading-relaxed max-w-xl">
              Configure how the exam is administered to students. These delivery settings are server-authoritative and control access windows, timer expiry, retakes, and answer visibility.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Timing & Threshold Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Duration */}
        <div className="bg-[#0f1b3d] p-5 rounded-3xl border border-blue-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              Duration (Minutes)
            </label>
            <span className="text-base font-black text-white">{metadata.durationMinutes || 45} mins</span>
          </div>
          <div className="flex items-center gap-3">
            {[15, 30, 45, 60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => onChangeMetadata({ durationMinutes: mins })}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  metadata.durationMinutes === mins
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#0a1226] text-slate-400 hover:text-white border border-blue-900/60'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
          <input
            type="number"
            min={5}
            max={360}
            value={metadata.durationMinutes}
            onChange={(e) => onChangeMetadata({ durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
            placeholder="Custom duration in minutes"
            className="w-full px-4 py-2 bg-[#091124] border border-blue-900/80 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
          />
        </div>

        {/* Pass Percentage */}
        <div className="bg-[#0f1b3d] p-5 rounded-3xl border border-blue-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-indigo-400" />
              Pass Percentage Threshold
            </label>
            <span className="text-base font-black text-white">{metadata.passPercentage || 40}%</span>
          </div>
          <div className="flex items-center gap-3">
            {[35, 40, 50, 60, 70, 75].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => onChangeMetadata({ passPercentage: pct })}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  metadata.passPercentage === pct
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#0a1226] text-slate-400 hover:text-white border border-blue-900/60'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
          <input
            type="range"
            min={10}
            max={90}
            value={metadata.passPercentage}
            onChange={(e) => onChangeMetadata({ passPercentage: parseInt(e.target.value) || 40 })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Multiple Attempts & Scoring Policy */}
      <div className="bg-[#0f1b3d] p-5 sm:p-6 rounded-3xl border border-blue-800/60 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-400" />
              Attempt Limits & Scoring Policy
            </h4>
            <p className="text-xs text-slate-400">Control student retakes and how final scores are aggregated.</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400">Max Attempts: </span>
            <span className="text-sm font-black text-indigo-300">{metadata.maxAttempts || 1}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Max Attempts Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Allowed Attempts</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((att) => (
                <button
                  key={att}
                  type="button"
                  onClick={() => onChangeMetadata({ maxAttempts: att })}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    (metadata.maxAttempts || 1) === att
                      ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/40'
                      : 'bg-[#091124] text-slate-400 hover:text-white border border-blue-900/60'
                  }`}
                >
                  {att === 1 ? '1 (Single)' : `${att} tries`}
                </button>
              ))}
            </div>
          </div>

          {/* Scoring Policy (if retakes allowed) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Final Grade Policy</label>
            <div className="grid grid-cols-3 gap-2">
              {(['highest', 'latest', 'average'] as ScorePolicy[]).map((policy) => (
                <button
                  key={policy}
                  type="button"
                  disabled={(metadata.maxAttempts || 1) <= 1}
                  onClick={() => onChangeMetadata({ scorePolicy: policy })}
                  className={`py-2.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    metadata.scorePolicy === policy
                      ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/40'
                      : 'bg-[#091124] text-slate-400 hover:text-white border border-blue-900/60'
                  }`}
                >
                  {policy}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Integrity & Randomization Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Randomize Question Order */}
        <label className="p-4 rounded-2xl border border-blue-800/60 bg-[#0f1b3d] flex items-center justify-between cursor-pointer hover:border-blue-600/60 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Randomize Question Order</div>
              <div className="text-[11px] text-slate-400">Shuffles questions deterministically per student attempt</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(metadata.randomizeQuestions)}
            onChange={(e) => onChangeMetadata({ randomizeQuestions: e.target.checked })}
            className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer"
          />
        </label>

        {/* Randomize Answer Options */}
        <label className="p-4 rounded-2xl border border-blue-800/60 bg-[#0f1b3d] flex items-center justify-between cursor-pointer hover:border-blue-600/60 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Randomize Answer Options</div>
              <div className="text-[11px] text-slate-400">Shuffles MCQ & multi-select choices without breaking keys</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={Boolean(metadata.randomizeOptions)}
            onChange={(e) => onChangeMetadata({ randomizeOptions: e.target.checked })}
            className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer"
          />
        </label>

        {/* Show Marks Immediately */}
        <label className="p-4 rounded-2xl border border-blue-800/60 bg-[#0f1b3d] flex items-center justify-between cursor-pointer hover:border-blue-600/60 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Show Marks Immediately</div>
              <div className="text-[11px] text-slate-400">Display score and grade as soon as the student submits</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={metadata.showMarksImmediately !== false}
            onChange={(e) => onChangeMetadata({ showMarksImmediately: e.target.checked })}
            className="w-5 h-5 accent-emerald-600 rounded-md cursor-pointer"
          />
        </label>

        {/* Show Correct Answers */}
        <label className="p-4 rounded-2xl border border-blue-800/60 bg-[#0f1b3d] flex items-center justify-between cursor-pointer hover:border-blue-600/60 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white">Show Correct Answers</div>
              <div className="text-[11px] text-slate-400">Allow students to review solution explanations after submission</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={metadata.showCorrectAnswers !== false}
            onChange={(e) => onChangeMetadata({ showCorrectAnswers: e.target.checked })}
            className="w-5 h-5 accent-cyan-600 rounded-md cursor-pointer"
          />
        </label>
      </div>

      {/* Exam Password & Access Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Exam Password */}
        <div className="space-y-2">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-indigo-400" />
            Exam Access Password <span className="text-slate-400 font-normal lowercase">(optional proctoring)</span>
          </label>
          <input
            type="text"
            value={metadata.password || ''}
            onChange={(e) => onChangeMetadata({ password: e.target.value })}
            placeholder="Leave blank for open student access"
            className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400"
          />
        </div>

        {/* Late Submissions Toggle */}
        <div className="space-y-2 flex flex-col justify-end">
          <label className="p-3.5 rounded-2xl border border-blue-800/60 bg-[#0f1b3d] flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-xs font-black text-white">Allow Late Submissions</div>
              <div className="text-[11px] text-slate-400">Accept submissions with a late penalty flag after deadline</div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(metadata.allowLateSubmission)}
              onChange={(e) => onChangeMetadata({ allowLateSubmission: e.target.checked })}
              className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
