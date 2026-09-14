// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: DYNAMIC SHORT ANSWER RENDERER
// Scaled height based on marks: 120-160px for 1-2 marks; 180-240px for 3+ marks.
// Compact padding, character count, and zero wasted empty vertical space.
// ============================================================================

import React from 'react';
import { PenLine } from 'lucide-react';
import { ShortAnswerQuestion } from '../../shared/ExamSchema';

interface ShortAnswerQuestionProps {
  question: ShortAnswerQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
  showAnswerKey?: boolean;
}

export const ShortAnswerQuestionComponent: React.FC<ShortAnswerQuestionProps> = ({
  question,
  currentAnswer = '',
  onAnswerChange,
  showAnswerKey = false
}) => {
  const marks = Number(question.marks) || 1;
  const isCompact = marks <= 2;

  return (
    <div className="space-y-3 pt-1 max-w-3xl answer-area w-full">
      <div className="flex items-center justify-between text-xs font-black text-indigo-900 uppercase tracking-wider px-1">
        <div className="flex items-center gap-1.5">
          <PenLine className="w-4 h-4 text-indigo-600" />
          <span>Written Answer ({marks} Mark{marks > 1 ? 's' : ''}):</span>
        </div>
        <span className="text-slate-400 font-medium lowercase">auto-saved</span>
      </div>

      <textarea
        rows={isCompact ? 3 : 5}
        value={currentAnswer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Type your structured answer or explanation here..."
        className="w-full p-4 sm:p-5 bg-white/95 backdrop-blur-xs border-2 border-slate-200 focus:border-[#026fc3] focus:ring-4 focus:ring-sky-200/70 rounded-2xl sm:rounded-3xl text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-hidden transition-all duration-200 resize-y shadow-inner min-h-[130px] sm:min-h-[160px]"
      />

      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>Be clear, structured, and accurate.</span>
        <span className="font-mono text-slate-700 font-bold">
          {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words • {currentAnswer.length} chars
        </span>
      </div>

      {showAnswerKey && (question as any).correctAnswer && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-950 space-y-1">
          <span className="font-bold block uppercase text-[10px] tracking-wider text-emerald-800">
            Model Answer / Key:
          </span>
          <p>{Array.isArray((question as any).correctAnswer) ? (question as any).correctAnswer.join(', ') : (question as any).correctAnswer}</p>
        </div>
      )}
    </div>
  );
};
