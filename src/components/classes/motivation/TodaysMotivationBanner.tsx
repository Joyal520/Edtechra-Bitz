import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  MOTIVATION_CARDS,
  getBeanBodyColor,
  getCardBackground,
  getColomboDateKey,
  getColomboDayIndex,
} from './motivationData';
import { MotivationIllustration } from './MotivationIllustrations';
import { TodaysMotivationModal } from './TodaysMotivationModal';

const MOTIVATION_SEEN_KEY = 'edtechra_motivation_seen_date';

function hasOpenedToday(): boolean {
  try {
    return window.localStorage.getItem(MOTIVATION_SEEN_KEY) === getColomboDateKey();
  } catch {
    return false;
  }
}

function markOpenedToday(): void {
  try {
    window.localStorage.setItem(MOTIVATION_SEEN_KEY, getColomboDateKey());
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

export const TodaysMotivationBanner: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [openedToday, setOpenedToday] = useState<boolean>(() => hasOpenedToday());

  const todayIndex = getColomboDayIndex();
  const todayCard = MOTIVATION_CARDS[todayIndex];
  const cardBg = getCardBackground(todayIndex);
  const bodyColor = getBeanBodyColor(todayIndex);

  const handleOpen = () => {
    markOpenedToday();
    setOpenedToday(true);
    setModalOpen(true);
  };

  return (
    <>
      <div className="pt-1 max-w-xl">
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Reveal Today's Card — Today's Motivation"
          className="w-full text-left group/motivation relative flex items-center justify-between gap-3 sm:gap-4 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-white/92 hover:bg-white border border-slate-200/85 hover:border-pink-200/90 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_-4px_rgba(240,111,168,0.18)] backdrop-blur-xs transition-all duration-200 active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Small motivational bean illustration */}
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-2 border-white shadow-[0_2px_8px_rgba(15,23,42,0.1)] shrink-0 overflow-hidden flex items-center justify-center transition-transform duration-200 group-hover/motivation:scale-105 group-hover/motivation:-rotate-2"
              style={{ backgroundColor: cardBg }}
            >
              <MotivationIllustration
                sceneId={todayCard.sceneId}
                bodyColor={bodyColor}
                className="w-10 h-10 sm:w-11 sm:h-11"
              />
            </div>

            {/* Title & Subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  Today&apos;s Motivation
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-800 border border-black/10"
                  style={{ backgroundColor: cardBg }}
                >
                  Day {todayCard.day}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-600 truncate mt-0.5">
                A little inspiration for a better day.
              </p>
            </div>
          </div>

          {/* Clear Reveal CTA */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold shrink-0 transition-all duration-200 ${
              openedToday
                ? 'bg-pink-50 text-pink-700 border border-pink-200/80 group-hover/motivation:bg-pink-100'
                : 'bg-[#1c1c1c] text-white shadow-2xs group-hover/motivation:bg-[#f06fa8]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Reveal Today&apos;s Card</span>
            <span className="xs:hidden">Reveal</span>
          </span>
        </button>
      </div>

      <TodaysMotivationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
