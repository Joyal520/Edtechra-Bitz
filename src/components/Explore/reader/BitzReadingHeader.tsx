// ============================================================================
// EDTECHRA-BITZ: BitzReadingHeader
// Navigation, Category Badge, Title, Subtitle, Reading & XP Badges.
// Adheres strictly to reference UI typography:
// Title: DM Serif Display (34–42px desktop, 28–32px mobile)
// Subtitle: Muted text-slate-400 (16–18px desktop, 14–16px mobile)
// ============================================================================

import React from 'react';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  X,
  BookOpen,
  Star
} from 'lucide-react';
import { useBitzTheme } from '@/context/BitzThemeContext';

interface BitzReadingHeaderProps {
  title: string;
  subtitle?: string | null;
  categoryName: string;
  categoryColor?: string;
  xpValue: number;
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onClose: () => void;
}

export const BitzReadingHeader: React.FC<BitzReadingHeaderProps> = ({
  title,
  subtitle,
  categoryName,
  categoryColor = '#f472b6',
  xpValue = 10,
  isSaved,
  onToggleSave,
  onShare,
  onClose
}) => {
  const { readingSettings } = useBitzTheme();
  const textSize = readingSettings?.textSize || 'medium';

  let titleSizeClass = 'text-[28px] sm:text-[34px] md:text-[40px]';
  let subtitleSizeClass = 'text-sm sm:text-base md:text-[17px]';

  if (textSize === 'small') {
    titleSizeClass = 'text-[26px] sm:text-[32px] md:text-[36px]';
    subtitleSizeClass = 'text-xs sm:text-sm md:text-[15px]';
  } else if (textSize === 'large') {
    titleSizeClass = 'text-[30px] sm:text-[36px] md:text-[42px]';
    subtitleSizeClass = 'text-base sm:text-[17px] md:text-[18px]';
  } else if (textSize === 'xlarge') {
    titleSizeClass = 'text-[32px] sm:text-[38px] md:text-[44px]';
    subtitleSizeClass = 'text-[17px] sm:text-[18px] md:text-[20px]';
  }

  return (
    <header className="w-full space-y-4 sm:space-y-5 select-text">
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Left: Back to Explore */}
        <button
          type="button"
          onClick={onClose}
          className="group inline-flex items-center gap-2 text-xs sm:text-sm font-ui font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus:outline-none rounded-full px-2 py-1 -ml-2"
          aria-label="Back to Explore"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Back to Explore</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Right: Bookmark, Share, Close Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Bookmark */}
          <button
            type="button"
            onClick={onToggleSave}
            className={`p-2 sm:p-2.5 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus:outline-none ${
              isSaved
                ? 'text-[#36D1FF] bg-sky-950/70 border border-sky-800/70 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
            title="Save Bitz"
            aria-label="Save Bitz"
          >
            <Bookmark className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={onShare}
            className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-400 focus:outline-none"
            title="Share"
            aria-label="Share Bitz"
          >
            <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all cursor-pointer ml-0.5 focus-visible:ring-2 focus-visible:ring-sky-400 focus:outline-none"
            title="Close"
            aria-label="Close reader"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* 2. Category Badge & Progress Badges Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        {/* Category Badge with Colored Bullet Dot */}
        <div className="inline-flex items-center gap-2">
          <span
            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: categoryColor }}
            aria-hidden="true"
          />
          <span
            className="font-ui text-xs sm:text-[13px] font-black uppercase tracking-wider"
            style={{ color: categoryColor }}
          >
            {categoryName}
          </span>
        </div>

        {/* Right Badges: Reading 1 of 1 and +XP */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2">
          {/* Reading 1 of 1 Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#071733]/90 border border-sky-900/40 text-sky-300 text-xs font-ui font-semibold shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-sky-400 stroke-[2.2]" />
            <span>Reading 1 of 1</span>
          </div>

          {/* +XP Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#071733]/90 border border-sky-900/40 text-amber-300 text-xs font-ui font-bold shadow-xs">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 stroke-[1.5]" />
            <span>+{xpValue} XP</span>
          </div>
        </div>
      </div>

      {/* 3. Title & Subtitle */}
      <div className="space-y-1.5 sm:space-y-2">
        <h1
          className={`font-display text-[#F8FAFC] leading-[1.2] tracking-tight font-normal text-left ${titleSizeClass}`}
          style={{ textAlign: 'left' }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className={`font-ui text-slate-400 font-medium leading-normal text-left ${subtitleSizeClass}`}
            style={{ textAlign: 'left' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
};
