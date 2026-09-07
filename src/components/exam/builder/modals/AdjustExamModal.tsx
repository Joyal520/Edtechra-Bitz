// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: ADJUST EXAM MODAL
// Allows teachers to make simple high-level changes without understanding
// assessment engineering. EdTechra translates requests into actual question changes.
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { AdjustExamOptions } from '../../shared/assessmentBlueprints';

interface AdjustExamModalProps {
  isOpen: boolean;
  currentQuestionCount: number;
  currentDurationMinutes: number;
  onClose: () => void;
  onApplyAdjustments: (options: AdjustExamOptions) => void;
}

export const AdjustExamModal: React.FC<AdjustExamModalProps> = ({
  isOpen,
  currentQuestionCount,
  currentDurationMinutes,
  onClose,
  onApplyAdjustments
}) => {
  const [options, setOptions] = useState<AdjustExamOptions>({
    moreGrammar: false,
    moreVocabulary: false,
    moreReading: false,
    addListening: false,
    addVideo: false,
    addPictureDescription: false,
    addWriting: false,
    makeEasier: false,
    makeChallenging: false,
    questionCount: currentQuestionCount || 20,
    durationMinutes: currentDurationMinutes || 45
  });

  if (!isOpen) return null;

  const toggleOption = (key: keyof AdjustExamOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleUpdate = () => {
    onApplyAdjustments(options);
    onClose();
  };

  const adjustmentCheckboxes: Array<{
    key: keyof AdjustExamOptions;
    label: string;
    description: string;
  }> = [
    { key: 'moreGrammar', label: 'More grammar', description: 'Add targeted multiple-choice & concord items' },
    { key: 'moreVocabulary', label: 'More vocabulary', description: 'Add context vocabulary gap-filling' },
    { key: 'moreReading', label: 'More reading', description: 'Add extra comprehension passage and inquiries' },
    { key: 'addListening', label: 'Add listening', description: 'Include an audio track activity with questions' },
    { key: 'addVideo', label: 'Add video', description: 'Embed an instructional video with student questions' },
    { key: 'addPictureDescription', label: 'Add picture description', description: 'Add visual scene prompt with rubric' },
    { key: 'addWriting', label: 'Add more writing', description: 'Add extended composition or paragraph response' },
    { key: 'makeEasier', label: 'Make easier', description: 'Adjust question difficulty to foundation tier' },
    { key: 'makeChallenging', label: 'Make more challenging', description: 'Incorporate higher-order analytical questions' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Smart Adjustment
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">Intelligent Blueprint Shift</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                Adjust Examination Structure
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

        {/* Modal Body */}
        <div className="p-6 sm:p-7 overflow-y-auto custom-scrollbar space-y-6 bg-white">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
              <span>WHAT WOULD YOU LIKE TO CHANGE?</span>
            </h3>

            {/* Checkbox Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {adjustmentCheckboxes.map(({ key, label, description }) => {
                const isChecked = Boolean(options[key]);

                return (
                  <label
                    key={key}
                    onClick={() => toggleOption(key)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // Controlled by parent label click
                      className="w-4 h-4 accent-indigo-600 rounded mt-0.5 pointer-events-none shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-xs font-bold text-slate-950 block">
                        {label}
                      </span>
                      <p className="text-[11px] text-slate-600 font-medium leading-snug">
                        {description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Counters: Number of Questions & Duration */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Target Questions
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={options.questionCount || 20}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      questionCount: Math.max(5, parseInt(e.target.value, 10) || 5)
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-600 shrink-0">Questions</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Exam Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={options.durationMinutes || 45}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      durationMinutes: Math.max(10, parseInt(e.target.value, 10) || 10)
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-600 shrink-0">Minutes</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>EdTechra automatically translates these requests into the actual question distribution.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpdate}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer transition-all active:scale-95"
          >
            <span>Update Exam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
