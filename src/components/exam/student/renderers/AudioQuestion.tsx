// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: AUDIO QUESTION RENDERER
// Embedded audio track player with contextual question options
// ============================================================================

import React from 'react';
import { Volume2 } from 'lucide-react';
import { AudioQuestion } from '../../shared/ExamSchema';
import { MCQQuestion } from './MCQQuestion';

interface AudioQuestionProps {
  question: AudioQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
}

export const AudioQuestionComponent: React.FC<AudioQuestionProps> = ({
  question,
  currentAnswer,
  onAnswerChange
}) => {
  return (
    <div className="space-y-4 pt-2 max-w-2xl mx-auto">
      {/* Audio Track Player */}
      {question.audioUrl && (
        <div className="p-4 rounded-2xl border border-pink-200 bg-pink-50/40 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-700 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <audio controls src={question.audioUrl} className="w-full accent-pink-600" />
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
