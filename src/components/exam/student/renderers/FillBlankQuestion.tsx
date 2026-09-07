// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: FILL IN THE BLANK RENDERER
// Understands [blank] and ___ placeholders. Never renders literal "[blank]" text.
// Supports inline interactive blank input and dedicated text input box.
// ============================================================================

import React from 'react';
import { PenLine } from 'lucide-react';
import { FillInBlankQuestion } from '../../shared/ExamSchema';
import { renderFormattedPrompt, hasBlankPlaceholder } from '../../shared/formattedText';

interface FillBlankQuestionProps {
  question: FillInBlankQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
  showAnswerKey?: boolean;
}

export const FillBlankQuestionComponent: React.FC<FillBlankQuestionProps> = ({
  question,
  currentAnswer = '',
  onAnswerChange,
  showAnswerKey = false
}) => {
  const promptHasBlank = hasBlankPlaceholder(question.question);

  return (
    <div className="pt-2 max-w-xl space-y-3 answer-area">
      {/* If prompt contains inline [blank] or ___, render embedded prompt */}
      {promptHasBlank && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-base font-medium text-slate-900 leading-relaxed shadow-2xs">
          {renderFormattedPrompt(question.question, {
            isFillBlank: true,
            inlineInputValue: currentAnswer,
            onInlineInputChange: onAnswerChange,
            inputPlaceholder: 'type answer...'
          })}
        </div>
      )}

      {/* Main answer input control */}
      <div className="space-y-1.5">
        <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
          <PenLine className="w-4 h-4 text-indigo-600" />
          <span>{promptHasBlank ? 'Or type your answer below:' : 'Type Missing Word / Phrase:'}</span>
        </label>

        <input
          type="text"
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Type your answer accurately..."
          autoComplete="off"
          spellCheck={false}
          className="w-full h-11 sm:h-12 px-4 bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:outline-hidden shadow-2xs"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
          <span>{question.caseSensitive ? 'Note: Answer is case-sensitive' : 'Answer is not case-sensitive'}</span>
          {showAnswerKey && (question as any).correctAnswer && (
            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
              Key: {Array.isArray((question as any).correctAnswer) ? (question as any).correctAnswer.join(', ') : (question as any).correctAnswer}
            </span>
          )}
          {!showAnswerKey && currentAnswer.trim() && (
            <span className="text-emerald-700 font-bold">Recorded</span>
          )}
        </div>
      </div>
    </div>
  );
};
