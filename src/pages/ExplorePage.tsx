import React from 'react';
import { PostFeed } from '@/components/PostFeed/PostFeed';

export const ExplorePage: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto py-2.5 sm:py-6 px-0 sm:px-4 space-y-4 sm:space-y-6">
      
      {/* 1. EdTechra Micro Learning Zone Hero Header with Paper-Cut Artwork */}
      <header className="mx-3 sm:mx-0 relative rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm bg-[#eef5fa]">
        <div 
          className="relative w-full aspect-[21/9] sm:aspect-[2.35/1] min-h-[120px] sm:min-h-[160px] max-h-[220px] bg-no-repeat bg-cover bg-center flex items-center justify-center select-none"
          style={{
            backgroundImage: "url('/assets/ChatGPT%20Image%20Aug%2023,%202026,%2008_44_06%20PM.png')",
            backgroundPosition: 'center 45%'
          }}
          role="banner"
          aria-label="EdTechra Micro Learning Zone"
        >
          {/* Very Subtle Readability Glow / Center Vignette */}
          <div className="absolute inset-0 bg-radial from-white/70 via-white/20 to-transparent pointer-events-none" />

          {/* Centered Application-Rendered HTML/CSS Title */}
          <div className="relative z-10 px-3 sm:px-8 text-center max-w-[62%] sm:max-w-[56%] mx-auto">
            <h1 className="text-sm xs:text-base sm:text-2xl md:text-[26px] font-black text-[#0a213c] tracking-tight leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
              EdTechra Micro Learning Zone
            </h1>
          </div>
        </div>
      </header>

      {/* 2. Main Continuous Feed: Posts + Quizzes + YouTube Shorts with Infinite Scroll */}
      <main className="w-full">
        <PostFeed />
      </main>

    </div>
  );
};

