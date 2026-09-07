// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: TRUE / FALSE QUESTION RENDERER
// Two prominent distinct buttons for binary choice questions
// ============================================================================

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { TrueFalseQuestion } from '../../shared/ExamSchema';

interface TrueFalseQuestionProps {
  question: TrueFalseQuestion;
  currentAnswer: boolean | string | undefined;
  onAnswerChange: (answer: boolean) => void;
}

export const TrueFalseQuestionComponent: React.FC<TrueFalseQuestionProps> = ({
  question: _question,
  currentAnswer,
  onAnswerChange
}) => {
  const normalizedAnswer =
    typeof currentAnswer === 'boolean'
      ? currentAnswer
      : typeof currentAnswer === 'string'
      ? currentAnswer.toLowerCase() === 'true'
      : undefined;

  return (
    <div className="pt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {/* TRUE Button */}
        <button
          type="button"
          onClick={() => onAnswerChange(true)}
          className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 active:scale-95 shadow-xs ${
            normalizedAnswer === true
              ? 'bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-200 shadow-emerald-600/30'
              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-emerald-50/60 hover:border-emerald-300'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-lg ${
              normalizedAnswer === true
                ? 'bg-white text-emerald-700 border-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <span className="text-lg font-black tracking-wide">TRUE</span>
        </button>

        {/* FALSE Button */}
        <button
          type="button"
          onClick={() => onAnswerChange(false)}
          className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 active:scale-95 shadow-xs ${
            normalizedAnswer === false
              ? 'bg-rose-600 text-white border-rose-600 ring-4 ring-rose-200 shadow-rose-600/30'
              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-rose-50/60 hover:border-rose-300'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-lg ${
              normalizedAnswer === false
                ? 'bg-white text-rose-700 border-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <XCircle className="w-6 h-6" />
          </div>
          <span className="text-lg font-black tracking-wide">FALSE</span>
        </button>
      </div>
    </div>
  );
};
