// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE PLAYER SKELETON LOADER
// Provides immediate structured visual feedback for Course Header, Day Strip,
// Video Card, Question Cards, Vocabulary Preview, and Progress Sidebar.
// ============================================================================

import React from 'react';

export const CoursePlayerSkeleton: React.FC = () => {
  return (
    <div
      data-testid="course-player-skeleton"
      className="min-h-screen bg-[#071326] text-white font-sans antialiased overflow-x-hidden select-none"
    >
      {/* Top Utility Navigation Skeleton */}
      <div className="h-13 border-b border-sky-500/15 bg-[#061020]/90 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 rounded-xl bg-slate-800/80 animate-pulse" />
          <div className="hidden sm:block h-4 w-48 rounded bg-slate-800/70 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-20 rounded-full bg-slate-800/80 animate-pulse" />
          <div className="h-7 w-24 rounded-full bg-slate-800/80 animate-pulse" />
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* 1. Course Cover Hero Header Skeleton */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-sky-400/20 bg-gradient-to-r from-[#0c1f3d] via-[#112a52] to-[#0c1f3d] p-5 sm:p-8 min-h-[180px] sm:min-h-[220px] flex flex-col justify-between shadow-2xl">
          <div className="space-y-3 max-w-xl">
            <div className="h-5 w-32 rounded-full bg-sky-500/20 animate-pulse" />
            <div className="h-8 sm:h-11 w-3/4 rounded-xl bg-slate-700/60 animate-pulse" />
            <div className="h-4 w-1/2 rounded-lg bg-slate-700/50 animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-16 rounded-lg bg-slate-700/60 animate-pulse" />
              <div className="h-7 w-20 rounded-lg bg-amber-500/20 animate-pulse" />
            </div>
            <div className="h-14 w-56 rounded-xl bg-slate-800/80 border border-amber-500/20 animate-pulse" />
          </div>
        </div>

        {/* 2. Day Navigation Strip Skeleton */}
        <div className="flex items-center gap-2.5 overflow-hidden py-1">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className={`h-14 rounded-xl shrink-0 animate-pulse ${
                idx === 0
                  ? 'w-56 bg-sky-600/40 border border-sky-400/40'
                  : 'w-48 bg-[#0e2240] border border-slate-700/50'
              }`}
            />
          ))}
        </div>

        {/* 3. Main Two-Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Main Learning Area (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Current Day Banner Skeleton */}
            <div className="rounded-2xl bg-[#0d213f] border border-sky-500/20 p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-7 w-72 max-w-full rounded-lg bg-slate-700/70 animate-pulse" />
                <div className="h-4 w-56 max-w-full rounded bg-slate-800 animate-pulse" />
              </div>
              <div className="h-14 w-36 rounded-xl bg-amber-500/15 border border-amber-400/20 animate-pulse shrink-0" />
            </div>

            {/* Video Section Skeleton */}
            <div className="rounded-2xl bg-[#0d213f] border border-sky-500/20 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500/30 animate-pulse" />
                  <div className="h-6 w-40 rounded-lg bg-slate-700/70 animate-pulse" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-800 animate-pulse" />
              </div>
              <div className="w-full aspect-video rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 rounded-full bg-sky-500/30" />
              </div>
            </div>

            {/* Assessment Section Skeleton */}
            <div className="rounded-2xl bg-white/95 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-300 animate-pulse" />
                  <div className="h-6 w-56 rounded-lg bg-slate-200 animate-pulse" />
                </div>
                <div className="h-6 w-32 rounded-full bg-slate-200 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="h-4 w-full rounded bg-slate-200 animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
                    <div className="space-y-2 pt-2">
                      <div className="h-9 w-full rounded-lg bg-slate-100 animate-pulse" />
                      <div className="h-9 w-full rounded-lg bg-slate-100 animate-pulse" />
                      <div className="h-9 w-full rounded-lg bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Area (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Course Progress Card Skeleton */}
            <div className="rounded-2xl bg-white/95 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-36 rounded bg-slate-200 animate-pulse" />
                <div className="h-5 w-14 rounded-full bg-slate-200 animate-pulse" />
              </div>
              <div className="h-3 w-full rounded-full bg-slate-200 animate-pulse" />
              <div className="flex justify-between gap-2 pt-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                ))}
              </div>
            </div>

            {/* Today's Objectives Skeleton */}
            <div className="rounded-2xl bg-white/95 p-5 space-y-3">
              <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 w-full rounded bg-slate-100 animate-pulse" />
              ))}
            </div>

            {/* Vocabulary Preview Skeleton */}
            <div className="rounded-2xl bg-amber-100/90 p-5 space-y-3">
              <div className="h-5 w-48 rounded bg-amber-300/60 animate-pulse" />
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 w-full rounded bg-amber-200/70 animate-pulse" />
              ))}
            </div>

            {/* Submit Button Skeleton */}
            <div className="h-14 w-full rounded-2xl bg-sky-600/50 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
