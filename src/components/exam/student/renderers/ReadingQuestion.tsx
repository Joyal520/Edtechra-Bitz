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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 items-start">
      {/* Passage Card */}
      <div className="bg-[#0b142c] p-5 sm:p-6 rounded-3xl border border-teal-500/40 shadow-md space-y-3 lg:sticky lg:top-20 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-teal-500/30 pb-3">
          <BookOpen className="w-4 h-4 text-teal-400 shrink-0" />
          <h4 className="text-sm font-black text-white truncate">
            {passageTitle || 'Reading Comprehension Passage'}
          </h4>
        </div>

        <div className="text-sm text-blue-100/95 leading-relaxed font-serif whitespace-pre-wrap selection:bg-teal-500/30">
          {passage}
        </div>
      </div>

      {/* Associated Question Card */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};
