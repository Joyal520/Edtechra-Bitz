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
      <div className="p-5 sm:p-6 bg-[#0b142c] rounded-3xl border border-blue-800/80 shadow-md space-y-3">
        <label className="text-xs font-black text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
          <PenLine className="w-4 h-4 text-orange-400" />
          Provide a concise written answer:
        </label>

        <textarea
          rows={4}
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Write your answer clearly here..."
          className="w-full p-4 bg-[#070e1f] border-2 border-blue-800/70 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20 rounded-2xl text-sm font-medium text-white placeholder:text-slate-500 leading-relaxed focus:outline-hidden transition-all resize-y"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Be direct and concise</span>
          <span>{currentAnswer.length} characters</span>
        </div>
      </div>
    </div>
  );
};
