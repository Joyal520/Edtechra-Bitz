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
    <div className="space-y-2 pt-1 max-w-2xl answer-area">
      <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
        <PenLine className="w-4 h-4 text-indigo-600" />
        <span>Concise Written Answer ({marks} Mark{marks > 1 ? 's' : ''}):</span>
      </label>

      <textarea
        rows={3}
        value={currentAnswer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Write your answer clearly and concisely here..."
        className={`w-full p-3.5 bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-hidden transition-all resize-y shadow-2xs ${
          isCompact ? 'min-h-[80px] sm:min-h-[120px] max-h-[160px]' : 'min-h-[180px] max-h-[240px]'
        }`}
      />

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
        <span>Be direct, accurate, and concise.</span>
        <span className="font-mono text-slate-700">{currentAnswer.length} characters</span>
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
