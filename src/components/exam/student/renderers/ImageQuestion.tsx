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
  currentAnswer,
  onAnswerChange
}) => {
  return (
    <div className="space-y-4 pt-2 max-w-2xl mx-auto">
      {/* Embedded Image Container */}
      {question.imageUrl && (
        <div className="rounded-3xl border border-slate-200 overflow-hidden bg-slate-50 shadow-xs max-h-80 flex flex-col items-center justify-center">
          <img
            src={question.imageUrl}
            alt={question.caption || 'Assessment Visual'}
            className="w-full h-auto max-h-72 object-contain"
          />
          {question.caption && (
            <div className="p-2 text-center text-xs text-slate-600 font-medium w-full bg-slate-100 border-t border-slate-200">
              {question.caption}
            </div>
          )}
        </div>
      )}

      {/* Options if configured as multiple choice */}
      {question.options && question.options.length > 0 && (
        <MCQQuestion
          question={question as any}
          currentAnswer={currentAnswer}
          onAnswerChange={onAnswerChange}
        />
      )}
    </div>
  );
};
