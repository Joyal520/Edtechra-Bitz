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
          className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
            normalizedAnswer === true
              ? 'bg-emerald-600 text-white border-emerald-400 ring-4 ring-emerald-400/30 shadow-emerald-600/30'
              : 'bg-[#0b142c] text-slate-200 border-blue-800/60 hover:bg-[#132047] hover:border-emerald-500/50'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-lg ${
              normalizedAnswer === true
                ? 'bg-white text-emerald-700 border-white shadow-xs'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
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
          className={`p-6 sm:p-7 rounded-3xl border flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 active:scale-95 shadow-md ${
            normalizedAnswer === false
              ? 'bg-rose-600 text-white border-rose-400 ring-4 ring-rose-400/30 shadow-rose-600/30'
              : 'bg-[#0b142c] text-slate-200 border-blue-800/60 hover:bg-[#132047] hover:border-rose-500/50'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-lg ${
              normalizedAnswer === false
                ? 'bg-white text-rose-700 border-white shadow-xs'
                : 'bg-rose-950/50 text-rose-300 border-rose-500/40'
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
