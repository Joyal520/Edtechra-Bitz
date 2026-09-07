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
    <div className="space-y-2 pt-1 max-w-2xl answer-area">
      <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
        <PenLine className="w-4 h-4 text-indigo-600" />
        Concise Written Answer:
      </label>

      <textarea
        rows={3}
        value={currentAnswer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Write your answer clearly here..."
        className="w-full p-3.5 bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-hidden transition-all resize-y min-h-[80px] max-h-[140px] shadow-2xs"
      />

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
        <span>Be direct, accurate, and concise.</span>
        <span className="font-mono text-slate-700">{currentAnswer.length} characters</span>
      </div>
    </div>
  );
};
