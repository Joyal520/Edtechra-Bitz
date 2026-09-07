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
    <div className="pt-2 max-w-xl space-y-2.5 answer-area">
      <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
        <PenLine className="w-4 h-4 text-indigo-600" />
        Type Missing Word / Phrase
      </label>

      <input
        type="text"
        value={currentAnswer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="Type the missing word or phrase..."
        autoComplete="off"
        spellCheck={false}
        className="w-full h-11 sm:h-12 px-4 bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:outline-hidden shadow-2xs"
      />

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
        <span>{question.caseSensitive ? 'Note: Answer is case-sensitive' : 'Answer is not case-sensitive'}</span>
        {currentAnswer.trim() && (
          <span className="text-emerald-700 font-bold">Recorded</span>
        )}
      </div>
    </div>
  );
};
