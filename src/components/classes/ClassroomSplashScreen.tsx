import React, { useEffect, useState } from 'react';
import {
  GlowingLightbulbIcon,
  GraduationCapIcon,
  GrowingPlantIcon,
  OpenGlowingBook,
  ProgrammingLaptopIcon,
  ScienceFlaskIcon,
  SplashSparkle,
} from './ClassroomSplashIllustrations';
import './ClassroomSplashScreen.css';

export interface ClassroomSplashScreenProps {
  /** Real loading progress percentage from 0 to 100 */
  progress?: number;
  /** Optional custom loading status message */
  statusText?: string;
  /** Optional error message if loading fails */
  errorMessage?: string | null;
  /** Optional retry callback on error */
  onRetry?: () => void;
  /** Optional back navigation callback on error */
  onBack?: () => void;
}

export const ClassroomSplashScreen: React.FC<ClassroomSplashScreenProps> = ({
  progress = 15,
  statusText = 'Loading EdTechra Digital Classroom...',
  errorMessage = null,
  onRetry,
  onBack,
}) => {
  const [isTakingLong, setIsTakingLong] = useState(false);

  useEffect(() => {
    if (errorMessage) return;
    const timer = window.setTimeout(() => {
      setIsTakingLong(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  const clampedProgress = Math.max(6, Math.min(100, Math.round(progress)));
  const displayStatus = errorMessage
    ? errorMessage
    : isTakingLong
      ? 'Still loading classroom resources — almost there...'
      : statusText;

  return (
    <div
      className="edsplash-root"
      role="status"
      aria-live="polite"
      aria-label="Loading EdTechra Digital Classroom"
    >
      {/* Top-Left Decorative Purple/Blue Waves */}
      <div className="absolute top-0 left-0 w-[210px] sm:w-[320px] md:w-[400px] pointer-events-none select-none z-0">
        <svg viewBox="0 0 400 180" fill="none" className="w-full h-auto" aria-hidden="true">
          <defs>
            <linearGradient id="topWaveA" x1="0" y1="0" x2="360" y2="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="topWaveB" x1="0" y1="0" x2="290" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.52" />
              <stop offset="65%" stopColor="#0ea5e9" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 0H390C310 22 250 85 160 108C92 126 38 128 0 165V0Z"
            fill="url(#topWaveA)"
          />
          <path
            d="M0 0H295C225 18 180 65 110 88C62 104 28 110 0 132V0Z"
            fill="url(#topWaveB)"
          />
        </svg>
      </div>

      {/* Subtle Top-Right Soft Glow */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none select-none z-0"
        style={{
          background:
            'radial-gradient(circle, rgba(147, 197, 253, 0.35) 0%, rgba(224, 242, 254, 0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* Top Spacer for vertical balance */}
      <div className="h-2 sm:h-4 shrink-0" />

      {/* ================================================================= */}
      {/* CENTER: LOGO, BRANDING & REAL PROGRESS INDICATOR                  */}
      {/* ================================================================= */}
      <main className="relative z-10 w-full max-w-xl mx-auto px-4 flex flex-col items-center text-center my-auto py-2">
        {/* Actual EdTechra Logo */}
        <div className="edsplash-enter-logo mb-2 sm:mb-3">
          <div className="edsplash-logo-float">
            <img
              src="/images/edtechra-classroom-logo.png"
              alt="EdTechra Logo"
              loading="eager"
              decoding="async"
              className="w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 object-contain drop-shadow-[0_10px_20px_rgba(11,34,73,0.12)]"
            />
          </div>
        </div>

        {/* Branding: EdTechra + Digital Classroom Pill + Tagline */}
        <div className="edsplash-enter-brand flex flex-col items-center">
          <h1 className="text-[30px] xs:text-[34px] sm:text-[42px] md:text-[46px] font-extrabold tracking-tight text-[#0b2249] leading-none">
            EdTechra
          </h1>

          <div
            className="mt-2 sm:mt-2.5 inline-flex items-center justify-center px-5 sm:px-6 py-1.5 sm:py-2 rounded-full text-white font-bold text-sm sm:text-base md:text-[17px] tracking-wide shadow-[0_6px_18px_-4px_rgba(2,132,199,0.5)]"
            style={{
              background: 'linear-gradient(90deg, #006be6 0%, #0ea5e9 100%)',
            }}
          >
            Digital Classroom
          </div>

          <p className="mt-3 sm:mt-3.5 text-xs xs:text-sm sm:text-[15px] font-semibold text-slate-600 tracking-[0.14em] flex items-center justify-center gap-2 sm:gap-2.5">
            <span>Learn</span>
            <span className="text-[#0ea5e9]">•</span>
            <span>Discover</span>
            <span className="text-[#0ea5e9]">•</span>
            <span>Grow</span>
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="edsplash-enter-progress w-full flex flex-col items-center mt-5 sm:mt-6">
          {!errorMessage ? (
            <>
              <div
                className="w-[min(280px,84vw)] sm:w-[340px] md:w-[390px] h-2.5 sm:h-3 rounded-full bg-[#c9def6]/80 overflow-hidden shadow-inner p-[1px]"
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full edsplash-progress-fill"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-center gap-2 px-2">
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  {displayStatus}
                </p>
                <span className="text-[11px] sm:text-xs font-bold text-[#0284c7] tabular-nums">
                  {clampedProgress}%
                </span>
              </div>
            </>
          ) : (
            <div className="mt-2 max-w-sm w-full bg-white/90 backdrop-blur-xs border border-rose-200 rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-xs sm:text-sm font-bold text-rose-700">{errorMessage}</p>
              <div className="flex items-center justify-center gap-2.5">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#0070e0] to-[#0ea5e9] shadow-sm active:scale-95 transition-transform cursor-pointer"
                  >
                    Try Again
                  </button>
                )}
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform cursor-pointer"
                  >
                    Back to Classes
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ================================================================= */}
      {/* BOTTOM: CLOUDS, LAYERED WAVES & EDUCATIONAL ILLUSTRATION          */}
      {/* ================================================================= */}
      <div className="edsplash-enter-scene relative w-full shrink-0 pt-4 sm:pt-6 z-10">
        {/* Soft Clouds Behind Scene */}
        <div className="absolute inset-x-0 bottom-8 sm:bottom-10 pointer-events-none select-none z-0 flex justify-between overflow-hidden">
          <svg
            viewBox="0 0 380 140"
            fill="none"
            className="w-[170px] sm:w-[290px] md:w-[360px] h-auto -ml-6 edsplash-cloud-drift"
            aria-hidden="true"
          >
            <path
              d="M0 140V85C24 62 60 58 88 74C108 42 156 36 184 64C212 52 248 64 260 92C286 88 318 102 332 140H0Z"
              fill="#ffffff"
              opacity="0.88"
            />
          </svg>
          <svg
            viewBox="0 0 380 140"
            fill="none"
            className="w-[170px] sm:w-[290px] md:w-[360px] h-auto -mr-6 edsplash-cloud-drift"
            aria-hidden="true"
          >
            <path
              d="M380 140V80C352 54 310 52 282 72C260 36 208 32 180 62C152 50 116 64 104 94C76 92 48 106 36 140H380Z"
              fill="#ffffff"
              opacity="0.88"
            />
          </svg>
        </div>

        {/* Educational Icons Fanning Out Above the Open Book */}
        <div className="relative z-20 mx-auto w-full max-w-[310px] sm:max-w-[400px] md:max-w-[440px] px-2 flex flex-col items-center">
          {/* Ambient Sparkles */}
          <SplashSparkle
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 sm:left-4 bottom-12 edsplash-sparkle"
            color="#ffffff"
          />
          <SplashSparkle
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute right-3 sm:right-4 bottom-12 edsplash-sparkle-delay"
            color="#ffffff"
          />
          <SplashSparkle
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 absolute left-10 sm:left-14 top-0 edsplash-sparkle-delay"
            color="#fde047"
          />
          <SplashSparkle
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 absolute right-10 sm:right-14 top-0 edsplash-sparkle"
            color="#fde047"
          />

          {/* 5 Floating Educational Tiles */}
          <div className="flex items-end justify-center gap-1.5 xs:gap-2 sm:gap-3.5 md:gap-4 mb-[-14px] sm:mb-[-18px] relative z-20">
            {/* 1. Graduation Cap */}
            <div className="edsplash-icon-float-1 translate-y-3 sm:translate-y-4">
              <div className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-[#e0f2fe]/95 border-2 border-white shadow-[0_8px_18px_-4px_rgba(2,132,199,0.22)] p-1.5 sm:p-2 -rotate-[12deg] flex items-center justify-center">
                <GraduationCapIcon />
              </div>
            </div>

            {/* 2. Programming Laptop */}
            <div className="edsplash-icon-float-2 translate-y-1">
              <div className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-[#ede9fe]/95 border-2 border-white shadow-[0_8px_18px_-4px_rgba(99,102,241,0.22)] p-1.5 sm:p-2 -rotate-[6deg] flex items-center justify-center">
                <ProgrammingLaptopIcon />
              </div>
            </div>

            {/* 3. Glowing Lightbulb (Center Hero) */}
            <div className="edsplash-icon-float-3 -translate-y-1 sm:-translate-y-2">
              <div className="w-12 h-12 xs:w-[52px] xs:h-[52px] sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] rounded-2xl bg-[#fef9c3]/95 border-2 border-white shadow-[0_10px_24px_-4px_rgba(234,179,8,0.3)] p-1.5 sm:p-2 flex items-center justify-center">
                <GlowingLightbulbIcon />
              </div>
            </div>

            {/* 4. Science Flask */}
            <div className="edsplash-icon-float-4 translate-y-1">
              <div className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-[#e8ebff]/95 border-2 border-white shadow-[0_8px_18px_-4px_rgba(99,102,241,0.22)] p-1.5 sm:p-2 rotate-[6deg] flex items-center justify-center">
                <ScienceFlaskIcon />
              </div>
            </div>

            {/* 5. Growing Plant */}
            <div className="edsplash-icon-float-5 translate-y-3 sm:translate-y-4">
              <div className="w-11 h-11 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-[#dcfce7]/95 border-2 border-white shadow-[0_8px_18px_-4px_rgba(22,163,74,0.22)] p-1.5 sm:p-2 rotate-[12deg] flex items-center justify-center">
                <GrowingPlantIcon />
              </div>
            </div>
          </div>

          {/* Open Glowing Educational Book */}
          <div className="edsplash-book-float w-[210px] xs:w-[235px] sm:w-[290px] md:w-[320px] relative z-20 -mb-1">
            <OpenGlowingBook />
          </div>
        </div>

        {/* Layered Bottom Blue & Cyan Waves */}
        <div className="relative w-full h-14 sm:h-20 md:h-24 -mt-8 sm:-mt-12 overflow-hidden pointer-events-none select-none z-10">
          <svg
            viewBox="0 0 1440 140"
            preserveAspectRatio="none"
            className="w-[106%] -ml-[3%] h-full edsplash-wave-slow"
            aria-hidden="true"
          >
            <path
              d="M0 44C220 4 420 90 720 62C1020 34 1230 8 1440 46V140H0V44Z"
              fill="#67e8f9"
              opacity="0.52"
            />
            <path
              d="M0 64C280 28 490 98 780 74C1070 50 1260 22 1440 58V140H0V64Z"
              fill="#6366f1"
              opacity="0.58"
            />
          </svg>
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="w-[106%] -ml-[3%] h-full absolute inset-0 edsplash-wave-fast"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="frontWaveGrad" x1="0" y1="0" x2="1440" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <path
              d="M0 68C320 98 560 40 860 66C1140 90 1300 56 1440 44V120H0V68Z"
              fill="url(#frontWaveGrad)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
