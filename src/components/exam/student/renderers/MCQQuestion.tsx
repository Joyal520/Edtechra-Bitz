// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: COMPACT MCQ QUESTION RENDERER
// 2x2 grid for short options (<40 chars), single-column for long options.
// Compact height (min-h-[48px]), high-contrast letter badges, zero answer key leaks.
// ============================================================================

import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { MultipleChoiceQuestion } from '../../shared/ExamSchema';

interface MCQQuestionProps {
  question: MultipleChoiceQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
  showAnswerKey?: boolean;
}

export const MCQQuestion: React.FC<MCQQuestionProps> = ({
  question,
  currentAnswer,
  onAnswerChange,
  showAnswerKey = false
}) => {
  const options = question.options || [];

  // Determine if options are short enough for a 2x2 grid layout
  const isShortOptions = useMemo(() => {
    if (options.length > 4) return false;
    return options.every((opt) => (opt.text || '').length < 40);
  }, [options]);

  return (
    <div className="space-y-2 pt-1 answer-area">
      <div
        className={`grid gap-2.5 sm:gap-3 ${
          isShortOptions ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {options.map((opt) => {
          const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;

          // Answer key is ONLY visible when explicitly instructed in teacher view
          const isCorrect =
            showAnswerKey &&
            (Array.isArray((question as any).correctAnswer)
              ? (question as any).correctAnswer.includes(opt.id) ||
                (question as any).correctAnswer.includes(opt.text)
              : (question as any).correctAnswer === opt.id ||
                (question as any).correctAnswer === opt.text);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onAnswerChange(opt.id)}
              className={`min-h-[48px] p-3 sm:p-3.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all duration-150 active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50 hover:border-indigo-400 shadow-2xs'
              } ${isCorrect ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30' : ''}`}
            >
              {/* Option Letter Chip */}
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : isCorrect
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : opt.id.toUpperCase()}
              </div>

              {/* Option Text */}
              <span
                className={`text-xs sm:text-sm font-semibold leading-snug flex-1 ${
                  isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'
                }`}
              >
                {opt.text}
              </span>

              {/* Teacher Answer Key Badge */}
              {isCorrect && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  Key
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
