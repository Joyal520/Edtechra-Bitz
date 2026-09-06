// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: MULTIPLE SELECT QUESTION RENDERER
// Checkbox-style interactive cards for multi-answer questions
// ============================================================================

import React from 'react';
import { Check, CheckSquare } from 'lucide-react';
import { MultipleSelectQuestion } from '../../shared/ExamSchema';

interface MultipleSelectQuestionProps {
  question: MultipleSelectQuestion;
  currentAnswer: string[] | undefined;
  onAnswerChange: (answer: string[]) => void;
}

export const MultipleSelectQuestionComponent: React.FC<MultipleSelectQuestionProps> = ({
  question,
  currentAnswer = [],
  onAnswerChange
}) => {
  const options = question.options || [];
  const selectedList = Array.isArray(currentAnswer) ? currentAnswer : [];

  const handleToggle = (optId: string) => {
    if (selectedList.includes(optId)) {
      onAnswerChange(selectedList.filter(id => id !== optId));
    } else {
      onAnswerChange([...selectedList, optId]);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5 pb-1">
        <CheckSquare className="w-3.5 h-3.5" />
        <span>Select all correct options that apply ({selectedList.length} selected)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {options.map((opt) => {
          const isSelected = selectedList.includes(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleToggle(opt.id)}
              className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-400/30 shadow-lg shadow-blue-600/30'
                  : 'bg-[#0b142c] text-slate-200 border-blue-800/60 hover:bg-[#132047] hover:border-blue-500/50'
              }`}
            >
              {/* Checkbox Chip */}
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-white text-blue-700 border-white shadow-xs'
                    : 'bg-[#070e1f] text-blue-300 border-blue-800'
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
