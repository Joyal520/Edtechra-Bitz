import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  CardHeartBean,
  CardLightbulbBean,
  CardMoonBean,
  CardMountainBean,
  CardSwordBean,
  MascotCapeBean,
} from './BannerIllustrations';
import { TodaysMotivationModal } from './TodaysMotivationModal';
import { getColomboDateKey } from './motivationData';
import './motivation.css';

const MOTIVATION_SEEN_KEY = 'edtechra_motivation_seen_date';

function markOpenedToday(): void {
  try {
    window.localStorage.setItem(MOTIVATION_SEEN_KEY, getColomboDateKey());
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

const SparkleIcon: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-4 h-4',
  color = '#fbbf24',
}) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6Z"
      fill={color}
    />
  </svg>
);

export const TodaysMotivationBanner: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpen = () => {
    markOpenedToday();
    setModalOpen(true);
  };

  return (
    <>
      <div className="relative w-full mt-5 sm:mt-6 relative z-10">
        <div
          className="relative rounded-2xl sm:rounded-[26px] border border-white/95 shadow-[0_10px_30px_-8px_rgba(15,23,42,0.12),0_4px_14px_-4px_rgba(255,217,122,0.28)] px-3.5 py-3.5 sm:px-5 sm:py-4 lg:px-7 lg:py-4"
          style={{
            background:
              'linear-gradient(105deg, #fff6df 0%, #fffbf2 36%, #f4f1ff 68%, #f8f0ff 100%)',
          }}
        >
          {/* Clipped background scenery (soft pastel meadow & clouds) */}
          <div className="absolute inset-0 rounded-2xl sm:rounded-[26px] overflow-hidden pointer-events-none select-none">
            <svg
              viewBox="0 0 1200 180"
              preserveAspectRatio="none"
              className="w-full h-full"
              aria-hidden="true"
            >
              {/* Soft sky/cloud puffs */}
              <circle cx="95" cy="24" r="38" fill="#ffffff" opacity="0.65" />
              <circle cx="140" cy="20" r="28" fill="#ffffff" opacity="0.55" />
              <circle cx="1090" cy="28" r="46" fill="#ffffff" opacity="0.55" />
              <circle cx="1140" cy="40" r="32" fill="#ede9fe" opacity="0.6" />

              {/* Soft pastel hills along bottom */}
              <path
                d="M0 154Q140 124 290 156Q430 176 580 156L580 180L0 180Z"
                fill="#bbf7d0"
                opacity="0.45"
              />
              <path
                d="M0 162Q95 142 190 166L190 180L0 180Z"
                fill="#86efac"
                opacity="0.4"
              />
              <path
                d="M780 160Q960 128 1120 156Q1170 164 1200 152L1200 180L780 180Z"
                fill="#ddd6fe"
                opacity="0.42"
              />
            </svg>
          </div>

          {/* =============================================================== */}
          {/* DESKTOP & TABLET COMPOSITION (>= 768px)                         */}
          {/* =============================================================== */}
          <div className="hidden md:flex items-center justify-between gap-4 lg:gap-6 relative z-10">
            {/* Left Section: Mascot + Heading + Yellow Underline + Subtitle */}
            <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
              <div className="relative w-24 h-24 lg:w-28 lg:h-28 -my-3 -ml-1 shrink-0 tm-banner-mascot">
                <MascotCapeBean />
                <SparkleIcon
                  className="w-3.5 h-3.5 absolute top-1 right-1 tm-banner-sparkle"
                  color="#fbbf24"
                />
              </div>

              <div className="min-w-0">
                <div className="inline-block relative">
                  <h2 className="text-xl lg:text-[26px] xl:text-[28px] font-black tracking-tight text-slate-900 leading-tight whitespace-nowrap">
                    Today&apos;s Motivation
                  </h2>
                  {/* Elegant curved yellow underline */}
                  <svg
                    viewBox="0 0 240 12"
                    fill="none"
                    aria-hidden="true"
                    className="w-full h-2.5 mt-0.5"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M4 8C64 2 176 2 236 7"
                      stroke="#fbbf24"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-xs lg:text-sm font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                  <span>A little inspiration for a better day.</span>
                  <SparkleIcon className="w-3.5 h-3.5 shrink-0" color="#f59e0b" />
                </p>
              </div>
            </div>

            {/* Centre Section: Fanned Stack of 5 Pastel Motivational Cards */}
            <button
              type="button"
              onClick={handleOpen}
              aria-label="Open Today's Motivation cards"
              className="relative flex items-center justify-center shrink-0 -mt-8 -mb-2 px-2 cursor-pointer group/stack focus-visible:outline-2 focus-visible:outline-purple-500 rounded-2xl"
            >
              <SparkleIcon
                className="w-4 h-4 absolute -left-3 top-6 tm-banner-sparkle"
                color="#fbbf24"
              />
              <div className="flex items-end tm-banner-stack transition-transform duration-300 group-hover/stack:scale-[1.03]">
                {/* Card 1: Yellow - Sword Bean (Frontmost) */}
                <div className="relative z-40 w-[76px] h-[102px] lg:w-[88px] lg:h-[118px] rounded-[14px] border-[3.5px] border-white bg-[#ffd97a] shadow-[0_8px_20px_-6px_rgba(15,23,42,0.26)] -rotate-[6deg] overflow-hidden p-1">
                  <CardSwordBean />
                </div>
                {/* Card 2: Mint - Lightbulb Bean */}
                <div className="relative z-30 w-[72px] h-[96px] lg:w-[82px] lg:h-[110px] rounded-[14px] border-[3.5px] border-white bg-[#a3e4c1] shadow-[0_8px_18px_-6px_rgba(15,23,42,0.22)] rotate-[2deg] -ml-7 lg:-ml-8 translate-y-0.5 overflow-hidden p-1">
                  <CardLightbulbBean />
                </div>
                {/* Card 3: Blue - Mountain Bean */}
                <div className="relative z-20 w-[68px] h-[92px] lg:w-[78px] lg:h-[104px] rounded-[14px] border-[3.5px] border-white bg-[#92d0f5] shadow-[0_8px_18px_-6px_rgba(15,23,42,0.2)] rotate-[9deg] -ml-7 lg:-ml-8 translate-y-1.5 overflow-hidden p-1">
                  <CardMountainBean />
                </div>
                {/* Card 4: Pink - Heart Bean */}
                <div className="relative z-10 w-[64px] h-[86px] lg:w-[74px] lg:h-[98px] rounded-[14px] border-[3.5px] border-white bg-[#f7c3da] shadow-[0_8px_18px_-6px_rgba(15,23,42,0.18)] rotate-[16deg] -ml-7 lg:-ml-8 translate-y-2.5 overflow-hidden p-1">
                  <CardHeartBean />
                </div>
                {/* Card 5: Lilac - Moon Bean */}
                <div className="relative z-0 w-[60px] h-[82px] lg:w-[70px] lg:h-[92px] rounded-[14px] border-[3.5px] border-white bg-[#d3c3f7] shadow-[0_8px_18px_-6px_rgba(15,23,42,0.16)] rotate-[23deg] -ml-7 lg:-ml-8 translate-y-4 overflow-hidden p-1">
                  <CardMoonBean />
                </div>
              </div>
              <SparkleIcon
                className="w-3.5 h-3.5 absolute -right-2 bottom-2 tm-banner-sparkle-delay"
                color="#a855f7"
              />
            </button>

            {/* Right Section: Purple Gradient CTA Button + Sparkles */}
            <div className="relative flex items-center shrink-0 pl-2">
              <SparkleIcon
                className="w-3.5 h-3.5 absolute -top-2.5 right-3 tm-banner-sparkle-delay"
                color="#c084fc"
              />
              <SparkleIcon
                className="w-4 h-4 absolute -bottom-2.5 left-4 tm-banner-sparkle"
                color="#fbbf24"
              />
              <button
                type="button"
                onClick={handleOpen}
                className="group/btn inline-flex items-center justify-center gap-2 px-5 lg:px-6 py-3 lg:py-3.5 rounded-full font-bold text-sm lg:text-[15px] text-white bg-gradient-to-r from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] hover:from-[#7c3aed] hover:to-[#5b21b6] shadow-[0_8px_22px_-4px_rgba(124,58,237,0.45)] hover:shadow-[0_12px_26px_-4px_rgba(124,58,237,0.58)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                <span>Reveal Today&apos;s Card</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* MOBILE COMPOSITION (< 768px) — Designed for 320px–767px         */}
          {/* =============================================================== */}
          <div className="flex flex-col gap-3 md:hidden relative z-10">
            <div className="flex items-center justify-between gap-2.5">
              {/* Mascot + Heading */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-16 h-16 xs:w-[70px] xs:h-[70px] shrink-0 -ml-1 tm-banner-mascot">
                  <MascotCapeBean />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="inline-block max-w-full">
                    <h2 className="text-[17px] xs:text-[19px] font-black tracking-tight text-slate-900 leading-tight">
                      Today&apos;s Motivation
                    </h2>
                    <svg
                      viewBox="0 0 200 10"
                      fill="none"
                      aria-hidden="true"
                      className="w-full max-w-[165px] h-2 mt-0.5"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M3 7C55 2 145 2 197 6"
                        stroke="#fbbf24"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p className="text-[11px] xs:text-xs font-medium text-slate-600 mt-1 leading-snug">
                    A little inspiration for a better day.
                  </p>
                </div>
              </div>

              {/* Compact Fanned Card Stack (hidden only on ultra-narrow < 360px to prevent crowding) */}
              <div
                className="hidden min-[360px]:flex items-end shrink-0 pr-1 tm-banner-stack"
                aria-hidden="true"
              >
                <div className="relative z-20 w-9 h-12 rounded-[9px] border-2 border-white bg-[#ffd97a] shadow-sm -rotate-6 overflow-hidden p-0.5">
                  <CardSwordBean />
                </div>
                <div className="relative z-10 w-8 h-11 rounded-[9px] border-2 border-white bg-[#a3e4c1] shadow-sm rotate-3 -ml-4 translate-y-0.5 overflow-hidden p-0.5">
                  <CardLightbulbBean />
                </div>
                <div className="relative z-0 w-8 h-11 rounded-[9px] border-2 border-white bg-[#92d0f5] shadow-sm rotate-12 -ml-4 translate-y-1 overflow-hidden p-0.5">
                  <CardMountainBean />
                </div>
              </div>
            </div>

            {/* Prominent Full-Width Reveal CTA */}
            <button
              type="button"
              onClick={handleOpen}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] hover:from-[#7c3aed] hover:to-[#5b21b6] shadow-[0_6px_18px_-4px_rgba(124,58,237,0.45)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Reveal Today&apos;s Card</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      <TodaysMotivationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
