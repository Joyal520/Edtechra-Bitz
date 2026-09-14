// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: COMPACT TRUE / FALSE RENDERER
// Compact horizontal control (height: 48-56px) fitting naturally beneath prompt.
// Desktop: side-by-side [ TRUE ] [ FALSE ]; Mobile: compact stacked buttons.
// ============================================================================

import React from 'react';
import { Check, X } from 'lucide-react';
import { TrueFalseQuestion } from '../../shared/ExamSchema';

interface TrueFalseQuestionProps {
  question: TrueFalseQuestion;
  currentAnswer: boolean | string | undefined;
  onAnswerChange: (answer: boolean) => void;
  showAnswerKey?: boolean;
}

export const TrueFalseQuestionComponent: React.FC<TrueFalseQuestionProps> = ({
  question,
  currentAnswer,
  onAnswerChange,
  showAnswerKey = false
}) => {
  const normalizedAnswer =
    typeof currentAnswer === 'boolean'
      ? currentAnswer
      : typeof currentAnswer === 'string'
      ? currentAnswer.toLowerCase() === 'true'
      : undefined;

  const rawCorrect = (question as any).correctAnswer;
  const isCorrectTrue =
    rawCorrect === true ||
    rawCorrect === 'true' ||
    (Array.isArray(rawCorrect) && rawCorrect.includes('true'));
  const isCorrectFalse =
    rawCorrect === false ||
    rawCorrect === 'false' ||
    (Array.isArray(rawCorrect) && rawCorrect.includes('false'));

  return (
    <div className="pt-2 answer-area max-w-xl w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* TRUE Liquid Button */}
        <button
          type="button"
          onClick={() => onAnswerChange(true)}
          className={`w-full min-h-[64px] sm:min-h-[72px] p-3.5 sm:p-4 rounded-2xl sm:rounded-[24px] border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-emerald-400 relative overflow-hidden group ${
            normalizedAnswer === true
              ? 'bg-gradient-to-r from-emerald-100 via-teal-100 to-emerald-100/90 border-emerald-500 ring-4 ring-emerald-500/25 shadow-md -translate-y-0.5'
              : 'bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white border-emerald-200/80 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 shadow-2xs hover:-translate-y-0.5'
          } ${showAnswerKey && isCorrectTrue ? 'ring-4 ring-emerald-500/40 border-emerald-500' : ''}`}
        >
          {/* Glossy top-highlight reflection */}
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />

          <div className="flex items-center gap-3 relative z-10">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg shadow-xs shrink-0 select-none group-hover:scale-105 transition-transform ${
                normalizedAnswer === true
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">TRUE</div>
              <span className="text-[11px] sm:text-xs font-bold text-emerald-800/80">Statement is correct</span>
            </div>
          </div>

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform relative z-10 ${
              normalizedAnswer === true
                ? 'bg-emerald-600 text-white shadow-xs scale-105'
                : 'bg-emerald-100/80 text-emerald-600'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        </button>

        {/* FALSE Liquid Button */}
        <button
          type="button"
          onClick={() => onAnswerChange(false)}
          className={`w-full min-h-[64px] sm:min-h-[72px] p-3.5 sm:p-4 rounded-2xl sm:rounded-[24px] border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-rose-400 relative overflow-hidden group ${
            normalizedAnswer === false
              ? 'bg-gradient-to-r from-rose-100 via-pink-100 to-rose-100/90 border-rose-500 ring-4 ring-rose-500/25 shadow-md -translate-y-0.5'
              : 'bg-gradient-to-r from-rose-50/70 via-pink-50/50 to-white border-rose-200/80 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10 shadow-2xs hover:-translate-y-0.5'
          } ${showAnswerKey && isCorrectFalse ? 'ring-4 ring-emerald-500/40 border-emerald-500' : ''}`}
        >
          {/* Glossy top-highlight reflection */}
          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />

          <div className="flex items-center gap-3 relative z-10">
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg shadow-xs shrink-0 select-none group-hover:scale-105 transition-transform ${
                normalizedAnswer === false
                  ? 'bg-rose-600 text-white shadow-rose-500/30'
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <X className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">FALSE</div>
              <span className="text-[11px] sm:text-xs font-bold text-rose-800/80">Statement is incorrect</span>
            </div>
          </div>

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform relative z-10 ${
              normalizedAnswer === false
                ? 'bg-rose-600 text-white shadow-xs scale-105'
                : 'bg-rose-100/80 text-rose-600'
            }`}
          >
            <X className="w-4 h-4 stroke-[3]" />
          </div>
        </button>
      </div>
    </div>
  );
};
