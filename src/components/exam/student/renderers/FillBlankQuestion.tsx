// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: FILL IN THE BLANK RENDERER
// Actual focused text input with clear placeholder
// ============================================================================

import React from 'react';
import { PenLine } from 'lucide-react';
import { FillInBlankQuestion } from '../../shared/ExamSchema';

interface FillBlankQuestionProps {
  question: FillInBlankQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
}

export const FillBlankQuestionComponent: React.FC<FillBlankQuestionProps> = ({
  question,
  currentAnswer = '',
  onAnswerChange
}) => {
  return (
    <div className="pt-3 max-w-xl mx-auto space-y-4">
      <div className="p-5 sm:p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <label className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
          <PenLine className="w-4 h-4 text-emerald-600" />
          Type Your Answer Below
        </label>

        <input
          type="text"
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type the missing word or phrase..."
          autoComplete="off"
          spellCheck={false}
          className="w-full px-5 py-3.5 bg-white border-2 border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 rounded-2xl text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:outline-hidden"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>{question.caseSensitive ? 'Note: Answer is case-sensitive' : 'Answer is not case-sensitive'}</span>
          {currentAnswer.trim() && (
            <span className="text-emerald-700 font-bold">Answer recorded</span>
          )}
        </div>
      </div>
    </div>
  );
};
