// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: MCQ QUESTION RENDERER
// Large interactive clickable cards with high-contrast letters
// ============================================================================

import React from 'react';
import { Check } from 'lucide-react';
import { MultipleChoiceQuestion } from '../../shared/ExamSchema';

interface MCQQuestionProps {
  question: MultipleChoiceQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
}

export const MCQQuestion: React.FC<MCQQuestionProps> = ({
  question,
  currentAnswer,
  onAnswerChange
}) => {
  const options = question.options || [];

  return (
    <div className="space-y-2 pt-1 answer-area">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onAnswerChange(opt.id)}
              className={`p-3 sm:p-3.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all duration-150 active:scale-[0.99] ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50 hover:border-indigo-300 shadow-2xs'
              }`}
            >
              {/* Option Letter Chip */}
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : opt.id.toUpperCase()}
              </div>

              {/* Option Text */}
              <span className={`text-xs sm:text-sm font-semibold leading-snug flex-1 ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
