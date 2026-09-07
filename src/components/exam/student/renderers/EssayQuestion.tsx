// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: ESSAY QUESTION RENDERER
// Dedicated long-form writing environment with real-time word counter
// ============================================================================

import React from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { EssayQuestion } from '../../shared/ExamSchema';

interface EssayQuestionProps {
  question: EssayQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
}

export const EssayQuestionComponent: React.FC<EssayQuestionProps> = ({
  question,
  currentAnswer = '',
  onAnswerChange
}) => {
  const wordCount = React.useMemo(() => {
    if (!currentAnswer.trim()) return 0;
    return currentAnswer.trim().split(/\s+/).filter(Boolean).length;
  }, [currentAnswer]);

  const minWords = question.minWords;
  const maxWords = question.maxWords;

  const isUnderMin = minWords !== undefined && wordCount < minWords;
  const isOverMax = maxWords !== undefined && wordCount > maxWords;

  return (
    <div className="space-y-3 pt-1 w-full question-content">
      <div className="p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 answer-area">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            Written Composition
          </label>

          {/* Word Count Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                isUnderMin || isOverMax
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              {wordCount} {minWords ? `/ ${minWords}` : ''} Words
              {maxWords && ` (Max: ${maxWords})`}
            </span>
          </div>
        </div>

        <textarea
          rows={8}
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Compose your response here. Structure your answer logically with clear paragraphs..."
          className="w-full p-4 bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-hidden transition-all resize-y min-h-[220px] max-h-[280px] shadow-2xs"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
          <span>Structure your answer logically with clear sentences.</span>
          {isUnderMin && (
            <span className="text-amber-800 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {minWords - wordCount} more word{minWords - wordCount > 1 ? 's' : ''} recommended
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
