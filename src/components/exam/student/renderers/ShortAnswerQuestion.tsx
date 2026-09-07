// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SHORT ANSWER QUESTION RENDERER
// Sized text entry with character counter
// ============================================================================

import React from 'react';
import { PenLine } from 'lucide-react';
import { ShortAnswerQuestion } from '../../shared/ExamSchema';

interface ShortAnswerQuestionProps {
  question: ShortAnswerQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
}

export const ShortAnswerQuestionComponent: React.FC<ShortAnswerQuestionProps> = ({
  question: _question,
  currentAnswer = '',
  onAnswerChange
}) => {
  return (
    <div className="space-y-3 pt-2 max-w-2xl mx-auto">
      <div className="p-5 sm:p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <label className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
          <PenLine className="w-4 h-4 text-amber-600" />
          Provide a concise written answer:
        </label>

        <textarea
          rows={4}
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Write your answer clearly here..."
          className="w-full p-4 bg-white border-2 border-slate-300 focus:border-amber-600 focus:ring-4 focus:ring-amber-100 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-hidden transition-all resize-y"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Be direct and concise</span>
          <span>{currentAnswer.length} characters</span>
        </div>
      </div>
    </div>
  );
};
