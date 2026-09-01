// ============================================================================
// EDTECHRA-BITZ: Explore Discovery Page
// Primary Knowledge Bitz discovery stream with topic personalization,
// double-tap reading experience, and optional community post stream.
// Supports Premium Dark Blue (DEFAULT) and Light Theme.
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { ExploreFeed } from '@/components/Explore/ExploreFeed';
import { PostFeed } from '@/components/PostFeed/PostFeed';
import { useBitzTheme } from '@/context/BitzThemeContext';

const ExplorePageContent: React.FC = () => {
  const [feedMode, setFeedMode] = useState<'knowledge' | 'community'>('knowledge');
  const [imgError, setImgError] = useState<boolean>(false);
  const { isDark } = useBitzTheme();

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-[#020817] text-[#F8FAFC]' : 'bg-[#f8fafc] text-[#0a213c]'
      }`}
    >
      <div className="w-full max-w-3xl mx-auto py-2 sm:py-6 px-0 sm:px-4 space-y-4">
        {/* EdTechra Micro Learning Zone Hero Banner */}
        <header
          className={`mx-3 sm:mx-0 relative rounded-3xl overflow-hidden border shadow-xs transition-all duration-300 ${
            isDark
              ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)] shadow-xl shadow-blue-950/60'
              : 'bg-[#e8f1f8] border-slate-200 shadow-xs'
          }`}
        >
          <div
            className="relative w-full aspect-[21/8] sm:aspect-[2.4/1] min-h-[140px] sm:min-h-[160px] max-h-[220px] flex items-center justify-center select-none overflow-hidden"
            role="banner"
            aria-label="EdTechra Micro Learning Zone"
          >
            {/* Optimized Responsive Paper-Cut Landscape Artwork */}
            {!imgError && (
              <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
                <source
                  type="image/avif"
                  media="(max-width: 768px)"
                  srcSet="/assets/edtechra-microlearning-header-mobile.avif"
                />
                <source
                  type="image/webp"
                  media="(max-width: 768px)"
                  srcSet="/assets/edtechra-microlearning-header-mobile.webp"
                />
                <source
                  type="image/avif"
                  srcSet="/assets/edtechra-microlearning-header-desktop.avif"
                />
                <source
                  type="image/webp"
                  srcSet="/assets/edtechra-microlearning-header-desktop.webp"
                />
                <img
                  src="/assets/edtechra-microlearning-header.webp"
                  alt="EdTechra Micro Learning Zone"
                  className="w-full h-full object-cover object-center transform scale-[1.01] motion-safe:transition-transform motion-safe:duration-700"
                  loading="eager"
                  decoding="async"
                  onError={() => setImgError(true)}
                />
              </picture>
            )}

            {/* Subtle Contrast / Readability Gradient Layer */}
            <div
              className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                isDark
                  ? 'bg-gradient-to-t from-[#020817]/85 via-[#06152B]/35 to-[#020817]/50 mix-blend-multiply'
                  : 'bg-gradient-to-t from-white/90 via-white/45 to-white/60'
              }`}
            />

            {/* Ambient Radial Vignette behind central text for maximum readability */}
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? 'bg-radial from-[#020817]/60 via-transparent to-transparent'
                  : 'bg-radial from-white/80 via-transparent to-transparent'
              }`}
            />

            {/* Centered Title Content */}
            <div className="relative z-10 px-4 sm:px-8 text-center max-w-[90%] sm:max-w-[80%] mx-auto space-y-1.5">
              <h1
                className={`text-base xs:text-lg sm:text-2xl md:text-[28px] font-black tracking-tight leading-tight ${
                  isDark
                    ? 'text-[#F8FAFC] drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]'
                    : 'text-[#0a213c] drop-shadow-[0_2px_4px_rgba(255,255,255,1)]'
                }`}
              >
                EdTechra Micro Learning Zone
              </h1>
              <p
                className={`text-xs sm:text-sm font-bold ${
                  isDark
                    ? 'text-[#CBD5E1] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]'
                    : 'text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]'
                }`}
              >
                Discover fascinating ideas • Master them in 1 minute
              </p>
            </div>
          </div>
        </header>

        {/* Feed Mode Switcher (Knowledge Bitz vs Community Stream) */}
        <div className="flex items-center justify-center gap-2 px-3 sm:px-0">
          <div
            className={`inline-flex p-1 rounded-2xl border shadow-inner transition-colors ${
              isDark
                ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)]'
                : 'bg-slate-200/90 border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setFeedMode('knowledge')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                feedMode === 'knowledge'
                  ? 'bg-[#1677FF] text-white shadow-md shadow-blue-600/35'
                  : isDark
                  ? 'text-[#CBD5E1] hover:text-white font-extrabold'
                  : 'text-[#0a213c] hover:text-black font-extrabold'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Knowledge Bitz</span>
            </button>

            <button
              type="button"
              onClick={() => setFeedMode('community')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                feedMode === 'community'
                  ? 'bg-[#1677FF] text-white shadow-md shadow-blue-600/35'
                  : isDark
                  ? 'text-[#CBD5E1] hover:text-white font-extrabold'
                  : 'text-[#0a213c] hover:text-black font-extrabold'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Community Stream</span>
            </button>
          </div>
        </div>

        {/* Main Feed Container */}
        <main className="w-full">
          {feedMode === 'knowledge' ? <ExploreFeed /> : <PostFeed />}
        </main>
      </div>
    </div>
  );
};

export const ExplorePage: React.FC = () => {
  return <ExplorePageContent />;
};
