// ============================================================================
// EDTECHRA-BITZ: Explore Discovery Page
// Primary Knowledge Bitz discovery stream with topic personalization,
// double-tap reading experience, and optional community post stream.
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { ExploreFeed } from '@/components/Explore/ExploreFeed';
import { PostFeed } from '@/components/PostFeed/PostFeed';

export const ExplorePage: React.FC = () => {
  const [feedMode, setFeedMode] = useState<'knowledge' | 'community'>('knowledge');

  return (
    <div className="w-full max-w-3xl mx-auto py-2 sm:py-6 px-0 sm:px-4 space-y-4">
      {/* EdTechra Micro Learning Zone Hero Banner */}
      <header className="mx-3 sm:mx-0 relative rounded-3xl overflow-hidden border border-stone-200/90 dark:border-stone-800 shadow-sm bg-[#eef5fa] dark:bg-stone-900">
        <div
          className="relative w-full aspect-[21/8] sm:aspect-[2.35/1] min-h-[110px] sm:min-h-[150px] max-h-[200px] bg-no-repeat bg-cover bg-center flex items-center justify-center select-none"
          style={{
            backgroundImage: "url('/assets/ChatGPT%20Image%20Aug%2023,%202026,%2008_44_06%20PM.png')",
            backgroundPosition: 'center 45%'
          }}
          role="banner"
          aria-label="EdTechra Micro Learning Zone"
        >
          {/* Subtle Glow */}
          <div className="absolute inset-0 bg-radial from-white/75 dark:from-black/60 via-white/25 to-transparent pointer-events-none" />

          {/* Centered Title */}
          <div className="relative z-10 px-3 sm:px-8 text-center max-w-[68%] sm:max-w-[56%] mx-auto">
            <h1 className="text-sm xs:text-base sm:text-2xl md:text-[26px] font-black text-[#0a213c] dark:text-white tracking-tight leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] dark:drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              EdTechra Micro Learning Zone
            </h1>
            <p className="hidden sm:block text-xs font-semibold text-stone-700 dark:text-stone-300 mt-1">
              Discover fascinating ideas. Master them in 1 minute.
            </p>
          </div>
        </div>
      </header>

      {/* Feed Mode Switcher (Knowledge Bitz vs Community Notes) */}
      <div className="flex items-center justify-center gap-2 px-3 sm:px-0">
        <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-800/80 rounded-2xl border border-stone-200/80 dark:border-stone-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => setFeedMode('knowledge')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              feedMode === 'knowledge'
                ? 'bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Knowledge Bitz</span>
          </button>

          <button
            type="button"
            onClick={() => setFeedMode('community')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              feedMode === 'community'
                ? 'bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
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
  );
};
