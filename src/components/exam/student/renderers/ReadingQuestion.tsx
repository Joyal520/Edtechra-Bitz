// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: READING COMPREHENSION RENDERER
// Side-by-side or stacked passage reader + contextual child questions
// ============================================================================

import React from 'react';
import { BookOpen } from 'lucide-react';

interface ReadingQuestionProps {
  passage: string;
  passageTitle?: string;
  children: React.ReactNode;
}

export const ReadingQuestionLayout: React.FC<ReadingQuestionProps> = ({
  passage,
  passageTitle,
  children
}) => {
  return (
    <div className="space-y-6 w-full">
      {/* Distinct Styled Reading Passage Card */}
      <div className="bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-amber-50/50 p-6 sm:p-8 rounded-3xl border-2 border-amber-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-amber-200/70 pb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
              Reading Passage
            </span>
            <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
              {passageTitle || 'Comprehension Text'}
            </h4>
          </div>
        </div>

        <div className="text-sm sm:text-base text-slate-800 leading-[1.8] font-serif max-w-[78ch] whitespace-pre-wrap selection:bg-amber-100/80 pr-2">
          {passage}
        </div>
      </div>

      {/* Associated Question Card */}
      <div className="question-card pt-1">
        {children}
      </div>
    </div>
  );
};
