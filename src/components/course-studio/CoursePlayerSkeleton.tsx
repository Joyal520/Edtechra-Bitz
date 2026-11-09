import React from 'react';
import { Loader2 } from 'lucide-react';

interface CoursePlayerSkeletonProps {
  isStudioPreview?: boolean;
  message?: string;
}

/**
 * Clean, minimal Ocean Blue loading state for Course Studio & Student Course Player.
 * Preserves page structure (top bar, sidebar shell, and main canvas) to prevent
 * layout shift while avoiding oversized white or grey placeholder blocks.
 */
export const CoursePlayerSkeleton: React.FC<CoursePlayerSkeletonProps> = ({
  isStudioPreview = false,
  message = 'Loading course...'
}) => {
  return (
    <div
      className="min-h-screen flex flex-col bg-[#061326] text-slate-100 font-sans select-none overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Top Sticky Header Shell */}
      <header className="sticky top-0 z-30 bg-[#07162c]/95 backdrop-blur-md border-b border-sky-500/15 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 h-[57px]">
        <div className="flex items-center gap-3">
          <div className="h-7 w-20 bg-sky-500/10 border border-sky-400/15 rounded-lg" />
          <div className="h-4 w-px bg-sky-500/15 hidden sm:block" />
          <div className="h-4 w-40 sm:w-56 bg-sky-500/10 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          {isStudioPreview && (
            <div className="hidden md:flex items-center gap-2">
              <div className="h-7 w-20 bg-sky-500/10 rounded-full" />
              <div className="h-7 w-20 bg-sky-500/10 rounded-full" />
            </div>
          )}
          <div className="h-7 w-24 bg-sky-500/10 border border-sky-400/15 rounded-full" />
        </div>
      </header>

      {/* Subtle Ocean Blue Indeterminate Progress Bar */}
      <div className="w-full h-0.5 bg-sky-950/80 overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-sky-400 to-cyan-300 animate-pulse rounded-full" />
      </div>

      {/* Main Split Structure */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex overflow-hidden">
        {/* Left Navigation Shell (Desktop) */}
        <aside className="w-72 bg-[#071529]/80 border-r border-sky-500/10 flex-col shrink-0 hidden lg:flex p-4 space-y-3">
          <div className="h-3 w-24 bg-sky-400/15 rounded mb-1" />
          <div className="rounded-xl border border-sky-500/15 bg-[#0a1d37]/50 p-3 space-y-2.5">
            <div className="h-4 w-3/4 bg-sky-400/15 rounded" />
            {[1, 2, 3, 4, 5].map(idx => (
              <div
                key={idx}
                className="h-8 w-full rounded-lg bg-[#0d2444]/40 border border-sky-500/10 flex items-center px-3 gap-2.5"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-sky-400/15 shrink-0" />
                <div className="h-2.5 flex-1 bg-sky-400/10 rounded" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Viewport Shell */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 py-6">
          <div className="max-w-4xl mx-auto">
            {/* Minimal Ocean Blue Course Header Frame with Subtle Centered Progress Indicator */}
            <div className="relative rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#0a1e3c] via-[#08172e] to-[#051020] p-8 sm:p-12 shadow-xl flex flex-col items-center justify-center text-center min-h-[280px] sm:min-h-[320px]">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center mb-4 shadow-inner">
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-sky-100 tracking-wide">
                {message}
              </p>
              <div className="mt-3 w-36 h-1 rounded-full bg-sky-950 overflow-hidden">
                <div className="h-full w-1/2 bg-sky-400/70 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CoursePlayerSkeleton;
