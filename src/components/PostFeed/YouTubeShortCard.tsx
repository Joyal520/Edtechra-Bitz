import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Film,
  Clock,
  Zap,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { YouTubeShort } from '@/types';
import { QuizBitCard } from './QuizBitCard';

interface YouTubeShortCardProps {
  short: YouTubeShort;
}

export const YouTubeShortCard: React.FC<YouTubeShortCardProps> = ({ short }) => {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const [userClickedPlay, setUserClickedPlay] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showIndicator, setShowIndicator] = useState<boolean>(false);
  
  const cardRef = useRef<HTMLElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const indicatorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const durationText = short.duration_formatted || `${short.duration || 30}s`;

  // Viewport-aware IntersectionObserver:
  // Autoplays true 9:16 video inline when at least 60% visible in the viewport.
  // Pauses / unloads player when scrolled away (< 40% visible).
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setIsIntersecting(true);
            setIsPaused(false);
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
            setIsIntersecting(false);
            setIsPaused(false);
          }
        });
      },
      {
        threshold: [0, 0.4, 0.6, 1.0]
      }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    };
  }, []);

  const shouldPlayInline = isIntersecting || userClickedPlay;

  // Toggle Play / Pause on user interaction with temporary feedback
  const handleTogglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextPaused ? 'pauseVideo' : 'playVideo',
          args: []
        }),
        '*'
      );
    }

    setShowIndicator(true);
    if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    indicatorTimerRef.current = setTimeout(() => {
      setShowIndicator(false);
    }, 1200);
  };

  // Official YouTube Embed URL configured for:
  // - True 9:16 vertical presentation
  // - Clean autoplay with sound attempt
  // - controls=0 to eliminate persistent ◀ ⏸ ▶ overlays
  // - playsinline=1 without forcing native fullscreen
  // - loop=1 continuously via playlist parameter
  // - cc_load_policy=0 to avoid duplicate caption overlay (captions already burned into video)
  const embedUrl = `https://www.youtube.com/embed/${short.youtube_video_id}?autoplay=1&playsinline=1&loop=1&playlist=${short.youtube_video_id}&enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0`;

  return (
    <article
      ref={cardRef}
      className="w-full bg-white border-y sm:border border-stone-200/90 rounded-none sm:rounded-3xl overflow-hidden shadow-none sm:shadow-xs hover:shadow-md transition-all"
    >
      {/* 1. Colorful Accent Header Strip (Compact 12px text) */}
      <div className="bg-gradient-to-r from-red-600 via-[#e62117] to-rose-600 px-3.5 sm:px-5 py-2 sm:py-2.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-[11px] sm:text-xs text-white shadow-2xs">
            ▶️
          </div>
          <span className="text-xs font-black uppercase tracking-wider">
            Quick EdTechra Short
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
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

      {/* 2. RESPONSIVE VIDEO FRAME: 
             - Mobile: Full width 9:16 edge-to-edge
             - Desktop: Centered, compact 9:16 card (max-w-[360px], max-h-[640px]) */}
      <div className="w-full bg-slate-950 sm:bg-slate-900/90 sm:p-4 flex items-center justify-center">
        <div
          ref={videoContainerRef}
          onClick={shouldPlayInline ? handleTogglePlayPause : () => setUserClickedPlay(true)}
          className="relative w-full aspect-[9/16] max-h-[82svh] sm:max-h-[640px] sm:max-w-[360px] mx-auto bg-black overflow-hidden flex items-center justify-center sm:rounded-2xl shadow-md cursor-pointer select-none"
        >
          {shouldPlayInline ? (
            <>
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title={short.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0 object-cover pointer-events-none"
                loading="lazy"
              />

              {/* Sleek temporary interaction feedback indicator (Play / Pause) */}
              <div
                className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                  showIndicator ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center shadow-xl transform scale-100 transition-transform">
                  {isPaused ? (
                    <Pause className="w-8 h-8 fill-white" />
                  ) : (
                    <Play className="w-8 h-8 fill-white translate-x-0.5" />
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full cursor-pointer group flex items-center justify-center bg-slate-950">
              <img
                src={short.thumbnail_url}
                alt={short.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Dark overlay with Play button */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-all">
                  <Play className="w-7 h-7 fill-white translate-x-0.5" />
                </div>
              </div>

              {/* Bottom tag */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold pointer-events-none">
                <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-xs text-[11px] font-bold flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-red-400" />
                  <span>Tap to Play</span>
                </span>
                {short.linked_quiz_id && (
                  <span className="px-2.5 py-1 rounded-xl bg-teal-500/90 backdrop-blur-xs text-white text-[11px] font-extrabold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Quiz Attached</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Short Content Body & Metadata (Padded with 12px text) */}
      <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
        <div className="space-y-1">
          <h3 className="text-xs sm:text-base font-bold text-[#0f233a] leading-snug">
            {short.title}
          </h3>

          {short.description && (
            <p className="text-[12px] sm:text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {short.description}
            </p>
          )}
        </div>

        {/* 4. Action Toolbar with clean YouTube link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-red-500" />
              <span>YouTube Shorts</span>
            </span>
          </div>

          <a
            href={short.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors text-xs flex items-center gap-1.5 font-bold"
            title="Open on YouTube"
          >
            <span>Open in YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 5. INTERACTIVE TEST YOURSELF QUIZ BIT (If linked) */}
        {short.linked_quiz && (
          <div className="pt-2 border-t border-slate-100 animate-in fade-in">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-purple-700 flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                🎯 Test Yourself on this Short
              </span>
              <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                +{short.linked_quiz.xp || 10} XP
              </span>
            </div>
            <QuizBitCard quiz={short.linked_quiz} />
          </div>
        )}
      </div>
    </article>
  );
};
