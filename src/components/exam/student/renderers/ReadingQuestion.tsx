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
    <div className="space-y-5">
      {/* Passage Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-teal-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-teal-100 pb-2.5">
          <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
            {passageTitle || 'Reading Comprehension Passage'}
          </h4>
        </div>

        <div className="text-xs sm:text-sm text-slate-800 leading-[1.6] font-serif max-w-[72ch] whitespace-pre-wrap selection:bg-teal-100">
          {passage}
        </div>
      </div>

      {/* Associated Question Card */}
      <div className="question-card">
        {children}
      </div>
    </div>
  );
};
