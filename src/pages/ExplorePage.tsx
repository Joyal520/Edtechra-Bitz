// ============================================================================
// EDTECHRA-BITZ: Explore Discovery Page
// Primary Knowledge Bitz discovery stream with topic personalization,
// double-tap reading experience, and optional community post stream.
// Supports Premium Dark Blue (DEFAULT) and Light Theme.
// ============================================================================

import React, { useState } from 'react';
import { Sparkles, Users, Moon, Sun } from 'lucide-react';
import { ExploreFeed } from '@/components/Explore/ExploreFeed';
import { PostFeed } from '@/components/PostFeed/PostFeed';
import { BitzThemeProvider, useBitzTheme } from '@/context/BitzThemeContext';

const ExplorePageContent: React.FC = () => {
  const [feedMode, setFeedMode] = useState<'knowledge' | 'community'>('knowledge');
  const { isDark, toggleTheme } = useBitzTheme();

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-[#070f1e] text-slate-100' : 'bg-[#f8fafc] text-[#0a213c]'
      }`}
    >
      <div className="w-full max-w-3xl mx-auto py-2 sm:py-6 px-0 sm:px-4 space-y-4">
        {/* EdTechra Micro Learning Zone Hero Banner */}
        <header
          className={`mx-3 sm:mx-0 relative rounded-3xl overflow-hidden border shadow-xs transition-all duration-300 ${
            isDark
              ? 'bg-[#0a1b35] border-[#1e3a5f] shadow-lg shadow-blue-950/40'
              : 'bg-[#e8f1f8] border-slate-200 shadow-xs'
          }`}
        >
          <div
            className="relative w-full aspect-[21/8] sm:aspect-[2.4/1] min-h-[120px] sm:min-h-[160px] max-h-[210px] bg-no-repeat bg-cover bg-center flex items-center justify-center select-none overflow-hidden"
            role="banner"
            aria-label="EdTechra Micro Learning Zone"
          >
            {/* Background Image / Ambient Glow */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
              style={{
                backgroundImage: "url('/assets/ChatGPT%20Image%20Aug%2023,%202026,%2008_44_06%20PM.png')",
                backgroundPosition: 'center 45%'
              }}
            />

            {/* Contrast Gradient Overlay */}
            <div
              className={`absolute inset-0 pointer-events-none ${
                isDark
                  ? 'bg-gradient-to-t from-[#070f1e] via-[#0a1b35]/80 to-transparent'
                  : 'bg-radial from-white/90 via-white/40 to-transparent'
              }`}
            />

            {/* Centered Title */}
            <div className="relative z-10 px-4 sm:px-8 text-center max-w-[85%] sm:max-w-[75%] mx-auto space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#026fc3]/20 border border-[#026fc3]/40 text-[#38bdf8] text-[11px] font-black uppercase tracking-widest mb-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Knowledge Discovery</span>
              </div>
              <h1
                className={`text-base xs:text-lg sm:text-2xl md:text-[28px] font-black tracking-tight leading-tight ${
                  isDark ? 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]' : 'text-[#0a213c] drop-shadow-[0_2px_4px_rgba(255,255,255,1)]'
                }`}
              >
                EdTechra Micro Learning Zone
              </h1>
              <p
                className={`text-xs sm:text-sm font-bold ${
                  isDark ? 'text-sky-200/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]' : 'text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]'
                }`}
              >
                Discover fascinating ideas • Master them in 1 minute
              </p>
            </div>

            {/* Quick Theme Toggle Button (Top Right of Banner) */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all active:scale-95 cursor-pointer backdrop-blur-md shadow-xs ${
                  isDark
                    ? 'bg-[#0f2347]/90 text-sky-200 border border-[#1e4070] hover:bg-[#153060] hover:text-white'
                    : 'bg-white/90 text-slate-700 border border-slate-300 hover:bg-slate-100 hover:text-[#0a213c]'
                }`}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
                aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Feed Mode Switcher (Knowledge Bitz vs Community Stream) */}
        <div className="flex items-center justify-center gap-2 px-3 sm:px-0">
          <div
            className={`inline-flex p-1 rounded-2xl border shadow-inner transition-colors ${
              isDark
                ? 'bg-[#0b172a] border-[#1e3a5f]'
                : 'bg-slate-200/90 border-slate-300'
            }`}
          >
            <button
              type="button"
              onClick={() => setFeedMode('knowledge')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                feedMode === 'knowledge'
                  ? 'bg-[#026fc3] text-white shadow-md shadow-blue-600/30'
                  : isDark
                  ? 'text-slate-300 hover:text-white font-extrabold'
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
                  ? 'bg-[#026fc3] text-white shadow-md shadow-blue-600/30'
                  : isDark
                  ? 'text-slate-300 hover:text-white font-extrabold'
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
  return (
    <BitzThemeProvider>
      <ExplorePageContent />
    </BitzThemeProvider>
  );
};
