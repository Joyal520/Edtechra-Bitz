// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: FILL IN THE BLANK RENDERER
// Understands [blank] and ___ placeholders. Never renders literal "[blank]" text.
// Supports inline interactive blank input and dedicated text input box.
// ============================================================================

import React from 'react';
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
    <div className="pt-2 max-w-2xl space-y-4 answer-area w-full">
      {/* Exactly ONE Sentence with embedded Liquid Input */}
      {promptHasBlank ? (
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-50/80 border border-slate-200 text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed shadow-2xs">
          {renderFormattedPrompt(question.question, {
            isFillBlank: true,
            inlineInputValue: currentAnswer,
            onInlineInputChange: onAnswerChange,
            inputPlaceholder: 'type answer...'
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-base sm:text-lg md:text-xl font-bold text-slate-900 leading-relaxed">
            {question.question}
          </p>
          <div className="relative max-w-md">
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Type missing word or phrase..."
              autoComplete="off"
              spellCheck={false}
              className="w-full h-12 sm:h-14 px-5 bg-white/95 backdrop-blur-md border-2 border-sky-400 focus:border-[#026fc3] focus:ring-4 focus:ring-sky-200/70 rounded-2xl text-base sm:text-lg font-black text-slate-900 placeholder:text-slate-400/80 transition-all focus:outline-hidden shadow-inner text-center caret-[#026fc3]"
            />
          </div>
        </div>
      )}

      {/* Answer status and optional key */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>{question.caseSensitive ? 'Note: Answer is case-sensitive' : 'Answer is not case-sensitive'}</span>
        {showAnswerKey && (question as any).correctAnswer && (
          <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-bold">
            Key: {Array.isArray((question as any).correctAnswer) ? (question as any).correctAnswer.join(', ') : (question as any).correctAnswer}
          </span>
        )}
        {!showAnswerKey && currentAnswer.trim() && (
          <span className="text-emerald-700 font-black">● Saved</span>
        )}
      </div>
    </div>
  );
};
