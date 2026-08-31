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
      <header className="mx-3 sm:mx-0 relative rounded-3xl overflow-hidden border border-slate-200 shadow-xs bg-[#e8f1f8]">
        <div
          className="relative w-full aspect-[21/8] sm:aspect-[2.4/1] min-h-[120px] sm:min-h-[160px] max-h-[210px] bg-no-repeat bg-cover bg-center flex items-center justify-center select-none"
          style={{
            backgroundImage: "url('/assets/ChatGPT%20Image%20Aug%2023,%202026,%2008_44_06%20PM.png')",
            backgroundPosition: 'center 45%'
          }}
          role="banner"
          aria-label="EdTechra Micro Learning Zone"
        >
          {/* Subtle Contrast Gradient Overlay */}
          <div className="absolute inset-0 bg-radial from-white/90 via-white/40 to-transparent pointer-events-none" />

          {/* Centered Title */}
          <div className="relative z-10 px-4 sm:px-8 text-center max-w-[72%] sm:max-w-[60%] mx-auto">
            <h1 className="text-base xs:text-lg sm:text-2xl md:text-[28px] font-black text-[#0a213c] tracking-tight leading-tight drop-shadow-[0_2px_4px_rgba(255,255,255,1)]">
              EdTechra Micro Learning Zone
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#0a213c] mt-1 sm:mt-1.5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
              Discover fascinating ideas • Master them in 1 minute
            </p>
          </div>
        </div>
      </header>

      {/* Feed Mode Switcher (Knowledge Bitz vs Community Stream) */}
      <div className="flex items-center justify-center gap-2 px-3 sm:px-0">
        <div className="inline-flex p-1 bg-slate-200/90 rounded-2xl border border-slate-300 shadow-inner">
          <button
            type="button"
            onClick={() => setFeedMode('knowledge')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              feedMode === 'knowledge'
                ? 'bg-[#026fc3] text-white shadow-md shadow-blue-600/25'
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
                ? 'bg-[#026fc3] text-white shadow-md shadow-blue-600/25'
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
  );
};
