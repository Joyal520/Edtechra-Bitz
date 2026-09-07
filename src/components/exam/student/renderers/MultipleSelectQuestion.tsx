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
      <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 pb-1">
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
                  ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-200 shadow-md'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {/* Checkbox Chip */}
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-white text-indigo-700 border-white shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : opt.id.toUpperCase()}
              </div>

              {/* Option Text */}
              <span className={`text-sm sm:text-base font-bold leading-snug flex-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
