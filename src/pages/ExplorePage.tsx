import React from 'react';
import { Sparkles } from 'lucide-react';
import { PostFeed } from '@/components/PostFeed/PostFeed';

export const ExplorePage: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto py-3 sm:py-8 px-0 sm:px-6 space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="px-4 sm:px-0">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-1.5 border border-brand-200">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>@EdTechraBitz Learning Stream</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#0f233a] tracking-tight">
          EdTechra Micro Learning Zone
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Learn something useful, one short lesson at a time.
        </p>
      </div>

      {/* Main Continuous Feed: Posts + Quizzes + YouTube Shorts with Infinite Scroll */}
      <div className="w-full">
        <PostFeed />
      </div>

    </div>
  );
};
