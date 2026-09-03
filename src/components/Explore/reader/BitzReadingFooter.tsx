// ============================================================================
// EDTECHRA-BITZ: BitzReadingFooter
// Bottom action bar:
// Desktop: Done / Back button (left), pagination indicator (center), Quiz CTA (right).
// Mobile: Done button and Quiz CTA side-by-side with accessible 44px+ touch targets.
// ============================================================================

import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface BitzReadingFooterProps {
  onDone: () => void;
  onStartQuiz: () => void;
  hasQuiz: boolean;
}

export const BitzReadingFooter: React.FC<BitzReadingFooterProps> = ({
  onDone,
  onStartQuiz,
  hasQuiz
}) => {
  return (
    <footer className="w-full pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-slate-800/80">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Action: Done / Back Button */}
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-ui font-semibold bg-[#071630]/90 hover:bg-[#0a1f42] text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all active:scale-95 cursor-pointer min-h-[44px] shadow-sm focus-visible:ring-2 focus-visible:ring-sky-400 focus:outline-none"
          aria-label="Done reading, back to Explore"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
          <span className="hidden sm:inline">Back</span>
          <span className="sm:hidden">Done</span>
        </button>

        {/* Center: Reading Pagination Indicator (3 dots for the 3 sections, Desktop only) */}
        <div className="hidden sm:flex items-center gap-2" aria-hidden="true">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs shadow-sky-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
        </div>

        {/* Right Action: Quiz CTA Button */}
        {hasQuiz ? (
          <button
            type="button"
            onClick={onStartQuiz}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-ui font-bold bg-gradient-to-r from-[#1677FF] via-[#0ea5e9] to-[#0284c7] hover:from-[#2d8cff] hover:to-[#0ea5e9] text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 transition-all active:scale-95 cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-sky-300 focus:outline-none"
            aria-label="Start interactive quiz"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span>Quiz →</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-ui font-bold bg-[#1677FF] hover:bg-[#2d8cff] text-white transition-all active:scale-95 cursor-pointer min-h-[44px]"
          >
            <span>Finish</span>
          </button>
        )}
      </div>
    </footer>
  );
};
