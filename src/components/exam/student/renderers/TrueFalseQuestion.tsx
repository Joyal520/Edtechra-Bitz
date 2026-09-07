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
    <div className="pt-2 answer-area max-w-md">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* TRUE Button */}
        <button
          type="button"
          onClick={() => onAnswerChange(true)}
          className={`h-12 sm:h-13 px-6 rounded-xl border text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-[0.99] flex-1 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 ${
            normalizedAnswer === true
              ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 shadow-xs'
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 hover:border-indigo-300'
          } ${showAnswerKey && isCorrectTrue ? 'bg-emerald-50 border-emerald-500 text-emerald-950' : ''}`}
        >
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-black shrink-0 ${
              normalizedAnswer === true
                ? 'bg-white text-indigo-600 border-white'
                : 'border-slate-300 bg-slate-50 text-slate-600'
            }`}
          >
            {normalizedAnswer === true && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <span className="tracking-wide">TRUE</span>
          {showAnswerKey && isCorrectTrue && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 ml-1">
              Key
            </span>
          )}
        </button>

        {/* FALSE Button */}
        <button
          type="button"
          onClick={() => onAnswerChange(false)}
          className={`h-12 sm:h-13 px-6 rounded-xl border text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-[0.99] flex-1 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 ${
            normalizedAnswer === false
              ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 shadow-xs'
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 hover:border-indigo-300'
          } ${showAnswerKey && isCorrectFalse ? 'bg-emerald-50 border-emerald-500 text-emerald-950' : ''}`}
        >
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-black shrink-0 ${
              normalizedAnswer === false
                ? 'bg-white text-indigo-600 border-white'
                : 'border-slate-300 bg-slate-50 text-slate-600'
            }`}
          >
            {normalizedAnswer === false && <X className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <span className="tracking-wide">FALSE</span>
          {showAnswerKey && isCorrectFalse && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 ml-1">
              Key
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
