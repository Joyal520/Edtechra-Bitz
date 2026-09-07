// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: IMAGE QUESTION RENDERER
// Embedded visual element with contextual question options
// ============================================================================

import React from 'react';
import { ImageQuestion } from '../../shared/ExamSchema';
import { MCQQuestion } from './MCQQuestion';

interface ImageQuestionProps {
  question: ImageQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
}

export const ImageQuestionComponent: React.FC<ImageQuestionProps> = ({
  question,
  currentAnswer = '',
  onAnswerChange
}) => {
  const wordCount = React.useMemo(() => {
    if (!currentAnswer.trim()) return 0;
    return currentAnswer.trim().split(/\s+/).filter(Boolean).length;
  }, [currentAnswer]);

  const hasOptions = Boolean(question.options && question.options.length > 0);

  return (
    <div className="space-y-4 pt-1 max-w-[760px] mx-auto w-full question-content">
      {/* Embedded Image Container */}
      {question.imageUrl && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs flex flex-col items-center justify-center">
          <img
            src={question.imageUrl}
            alt={question.caption || 'Assessment Visual'}
            className="w-full max-h-[360px] object-contain mx-auto"
          />
          {question.caption && (
            <div className="py-2 px-3 text-center text-xs text-slate-600 font-medium w-full bg-white border-t border-slate-100">
              {question.caption}
            </div>
          )}
        </div>
      )}

      {/* Options if configured as multiple choice */}
      {hasOptions ? (
        <MCQQuestion
          question={question as any}
          currentAnswer={currentAnswer}
          onAnswerChange={onAnswerChange}
        />
      ) : (
        /* Textarea for picture description / written analysis */
        <div className="space-y-1.5 answer-area">
          <textarea
            rows={6}
            value={currentAnswer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Write your description here..."
            className="w-full p-4 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed shadow-2xs resize-y min-h-[180px] max-h-[240px]"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
            <span>Describe key elements, characters, actions, and settings clearly.</span>
            <span className="font-mono text-slate-700 font-bold">
              {wordCount} words • {currentAnswer.length} characters
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
