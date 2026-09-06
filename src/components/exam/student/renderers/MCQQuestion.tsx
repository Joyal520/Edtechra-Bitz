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
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {options.map((opt) => {
          const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onAnswerChange(opt.id)}
              className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-400 ring-4 ring-indigo-400/30 shadow-lg shadow-indigo-600/30'
                  : 'bg-[#0b142c] text-slate-200 border-blue-800/60 hover:bg-[#132047] hover:border-indigo-500/50'
              }`}
            >
              {/* Option Letter Chip */}
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-white text-indigo-700 border-white shadow-xs'
                    : 'bg-[#070e1f] text-indigo-300 border-blue-800'
                }`}
              >
                {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : opt.id.toUpperCase()}
              </div>

              {/* Option Text */}
              <span className="text-sm sm:text-base font-bold leading-snug flex-1">
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
