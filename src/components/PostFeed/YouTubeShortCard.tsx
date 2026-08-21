import React, { useState } from 'react';
import {
  Play,
  Film,
  Clock,
  Zap,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { YouTubeShort } from '@/types';
import { YouTubeShortModal } from './YouTubeShortModal';

interface YouTubeShortCardProps {
  short: YouTubeShort;
}

export const YouTubeShortCard: React.FC<YouTubeShortCardProps> = ({ short }) => {
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const durationText = short.duration_formatted || `${short.duration || 30}s`;

  return (
    <>
      <article className="w-full bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all">
        {/* 1. Colorful Accent Header Strip */}
        <div className="bg-gradient-to-r from-red-600 via-[#e62117] to-rose-600 px-4 sm:px-5 py-2.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs text-white shadow-2xs">
              ▶️
            </div>
            <span className="text-xs font-black uppercase tracking-wider">
              Quick EdTechra Short
            </span>
          </div>

          <div className="flex items-center gap-2">
            {short.category && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold text-white">
                {short.category}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-black/30 text-white text-[10px] font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-300" />
              {durationText}
            </span>
            {short.linked_quiz_id && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black shadow-2xs flex items-center gap-1">
                <Zap className="w-3 h-3 fill-slate-900" />
                +10 XP Quiz
              </span>
            )}
          </div>
        </div>

        {/* 2. Thumbnail & Play Trigger Container */}
        <div className="relative aspect-video sm:aspect-[16/9] w-full bg-slate-900 overflow-hidden group cursor-pointer" onClick={() => setModalOpen(true)}>
          <img
            src={short.thumbnail_url}
            alt={short.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
            {/* Pulsing Play Button */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-red-600 transition-all">
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </div>
          </div>

          {/* Bottom Overlay Info */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs font-bold pointer-events-none">
            <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-xs flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-red-400" />
              <span>Tap to Watch</span>
            </span>

            {short.linked_quiz_id && (
              <span className="px-2.5 py-1 rounded-xl bg-teal-500/90 backdrop-blur-xs text-white font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Quiz Linked</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. Short Content Body */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-[#0f233a] leading-snug hover:text-red-600 transition-colors cursor-pointer" onClick={() => setModalOpen(true)}>
              {short.title}
            </h3>

            {short.description && (
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {short.description}
              </p>
            )}
          </div>

          {/* 4. Action Toolbar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Watch Short</span>
            </button>

            <a
              href={short.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-xs flex items-center gap-1 font-bold"
              title="Open on YouTube"
            >
              <span className="hidden sm:inline">YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </article>

      {/* Official YouTube Embed Modal */}
      {modalOpen && (
        <YouTubeShortModal
          short={short}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};
