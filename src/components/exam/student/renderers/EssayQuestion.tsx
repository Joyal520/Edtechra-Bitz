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
    <div className="space-y-3 pt-2 max-w-3xl mx-auto">
      <div className="p-5 sm:p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-rose-600" />
            Essay Response
          </label>

          {/* Word Count Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                isUnderMin || isOverMax
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              {wordCount} Words
              {minWords && ` (Min: ${minWords})`}
              {maxWords && ` (Max: ${maxWords})`}
            </span>
          </div>
        </div>

        <textarea
          rows={10}
          value={currentAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Compose your essay here. Organize your thoughts into clear paragraphs..."
          className="w-full p-4 bg-white border-2 border-slate-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 leading-relaxed focus:outline-hidden transition-all resize-y"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Structure your answer logically with an introduction, body, and conclusion.</span>
          {isUnderMin && (
            <span className="text-amber-700 font-bold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {minWords - wordCount} more word{minWords - wordCount > 1 ? 's' : ''} recommended
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
