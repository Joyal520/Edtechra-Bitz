import React, { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronRight } from 'lucide-react';

interface CoursePlayerSkeletonProps {
  isStudioPreview?: boolean;
  message?: string;
  /** Optional explicit progress (0-100); when omitted, advances smoothly through real loading stages. */
  progress?: number;
  /** Optional explicit stage index (0 | 1 | 2). */
  activeStage?: 0 | 1 | 2;
}

const LOADING_STAGES = [
  'Preparing content',
  'Loading lessons',
  'Setting up activities'
] as const;

/**
 * Centered EdTechra Course Studio flash loading screen matching the glowing
 * dark-navy banner design with live progress, percentage, and 3-stage tracker.
 */
export const CoursePlayerSkeleton: React.FC<CoursePlayerSkeletonProps> = ({
  message = 'Loading Course...',
  progress,
  activeStage
}) => {
  const [animatedProgress, setAnimatedProgress] = useState<number>(
    typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 14
  );

  useEffect(() => {
    if (typeof progress === 'number') {
      setAnimatedProgress(Math.max(0, Math.min(100, progress)));
      return;
    }

    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      // Smoothly progress: 14% -> 45% (0-450ms), 45% -> 76% (450-1400ms), 76% -> 94% (1400-3500ms)
      let next = 14;
      if (elapsed < 450) {
        next = 14 + (elapsed / 450) * 31;
      } else if (elapsed < 1400) {
        next = 45 + ((elapsed - 450) / 950) * 31;
      } else {
        const tail = Math.min(1, (elapsed - 1400) / 2600);
        next = 76 + (1 - Math.pow(1 - tail, 2)) * 18;
      }
      setAnimatedProgress(next);
      if (elapsed < 4000) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [progress]);

  const displayPercent = Math.round(animatedProgress);
  const resolvedStage: 0 | 1 | 2 =
    typeof activeStage === 'number'
      ? activeStage
      : displayPercent < 36
        ? 0
        : displayPercent < 82
          ? 1
          : 2;

  const displayHeading =
    !message || message.toLowerCase() === 'loading course...'
      ? 'Loading Course...'
      : message;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 bg-[#020c1f] text-white font-sans select-none overflow-hidden relative"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="course-studio-loading-screen"
    >
      {/* Subtle ambient background glow behind the centered loading card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_50%,rgba(14,165,233,0.16),transparent_72%)]"
      />

      {/* Centered Glowing Loading Card */}
      <div className="relative w-full max-w-[920px] sm:aspect-[1280/500] rounded-[24px] sm:rounded-[30px] overflow-hidden border border-cyan-400/55 shadow-[0_0_45px_-8px_rgba(34,211,238,0.42),0_24px_64px_-16px_rgba(0,0,0,0.85)] bg-[#021e54]">
        {/* Top & Bottom Electric-Cyan Rim Glow Highlights */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-90 z-20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-[14%] right-[14%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 z-20"
        />

        {/* Preloaded Optimized WebP Background Artwork */}
        <img
          src="/assets/course-loading-banner.webp"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none"
        />

        {/* Mobile legibility scrim so text & progress remain crisp on narrow screens */}
        <div
          aria-hidden="true"
          className="sm:hidden absolute inset-0 bg-gradient-to-b from-[#021b4d]/92 via-[#021d52]/82 to-[#021844]/90 pointer-events-none"
        />

        {/* Center-Left Foreground Overlay */}
        <div className="relative z-10 h-full w-full sm:w-[66%] flex flex-col justify-center items-center sm:items-center text-center px-5 py-8 sm:px-8 md:px-12 sm:py-6">
          {/* Glowing Book Icon Badge */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#072968]/80 border border-cyan-300/35 shadow-[0_0_24px_rgba(34,211,238,0.28),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center mb-3 sm:mb-3.5 backdrop-blur-xs">
            <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.65)]" />
          </div>

          {/* Brand & Heading */}
          <p className="text-sm sm:text-base md:text-lg font-bold tracking-tight">
            <span className="text-white">EdTechra </span>
            <span className="text-cyan-300">Course Studio</span>
          </p>
          <h1 className="mt-0.5 text-xl sm:text-2xl md:text-[30px] font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            {displayHeading}
          </h1>

          {/* Cyan/Blue Progress Bar + Live Percentage */}
          <div className="mt-4 sm:mt-5 w-full max-w-[440px] flex items-center gap-3 sm:gap-4">
            <div className="flex-1 h-3 sm:h-3.5 rounded-full bg-[#071f4b]/90 border border-sky-400/20 overflow-hidden shadow-inner p-[1px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-400 shadow-[0_0_14px_rgba(34,211,238,0.75)] transition-[width] duration-150 ease-out"
                style={{ width: `${displayPercent}%` }}
              />
            </div>
            <span className="text-sm sm:text-base font-extrabold text-white tabular-nums min-w-[3ch] text-right">
              {displayPercent}%
            </span>
          </div>

          {/* 3-Stage Loading Tracker */}
          <div className="mt-4 sm:mt-5 flex flex-wrap sm:flex-nowrap items-center justify-center gap-y-2 gap-x-1.5 sm:gap-x-2 text-[11px] sm:text-xs font-semibold">
            {LOADING_STAGES.map((label, idx) => {
              const isCompleted = idx < resolvedStage || displayPercent >= 100;
              const isActive = idx === resolvedStage && displayPercent < 100;

              return (
                <React.Fragment key={label}>
                  <div
                    className={`flex items-center gap-1.5 whitespace-nowrap transition-colors duration-200 ${
                      isCompleted
                        ? 'text-white'
                        : isActive
                          ? 'text-cyan-100'
                          : 'text-sky-200/55'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full bg-cyan-400 text-[#021a45] flex items-center justify-center shadow-[0_0_10px_rgba(34,211,238,0.65)] shrink-0">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3.2]" />
                      </span>
                    ) : isActive ? (
                      <span className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full border-2 border-cyan-300 border-t-transparent animate-spin shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.45)]" />
                    ) : (
                      <span className="w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full border border-sky-300/35 shrink-0" />
                    )}
                    <span>{label}</span>
                  </div>
                  {idx < LOADING_STAGES.length - 1 && (
                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-300/45 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePlayerSkeleton;
