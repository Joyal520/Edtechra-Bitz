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
  const [showTranscript, setShowTranscript] = React.useState(false);

  return (
    <div className="space-y-4 pt-1 w-full question-content">
      {/* Compact Audio Card */}
      {question.audioUrl && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-violet-200 bg-violet-50/40 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-950 font-black text-xs">
              <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <span>Listening Track</span>
            </div>

            {question.transcript && (
              <button
                type="button"
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-xs font-bold text-violet-800 hover:text-violet-950 cursor-pointer"
              >
                {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
              </button>
            )}
          </div>

          <audio controls src={question.audioUrl} className="w-full h-10 rounded-lg accent-violet-600" />

          {showTranscript && question.transcript && (
            <div className="p-3 bg-white rounded-xl border border-violet-200 text-xs text-slate-800 font-medium leading-relaxed animate-fadeIn">
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 block mb-1">
                Transcript:
              </span>
              {question.transcript}
            </div>
          )}
        </div>
      )}

      {/* Options sit immediately below audio card */}
      {question.options && question.options.length > 0 && (
        <div className="answer-area">
          <MCQQuestion
            question={question as any}
            currentAnswer={currentAnswer}
            onAnswerChange={onAnswerChange}
          />
        </div>
      )}
    </div>
  );
};
