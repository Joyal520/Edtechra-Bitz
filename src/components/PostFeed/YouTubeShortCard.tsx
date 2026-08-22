import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
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
  isActive?: boolean;
  isNext?: boolean;
  onBecomeActive?: () => void;
  onBecomeInactive?: () => void;
}

export const YouTubeShortCard: React.FC<YouTubeShortCardProps> = ({
  short,
  isActive = false,
  isNext = false,
  onBecomeActive,
  onBecomeInactive
}) => {
  const [thumbnailSrc, setThumbnailSrc] = useState<string>(short.thumbnail_url);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  const cardRef = useRef<HTMLElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const durationText = short.duration_formatted || `${short.duration || 30}s`;

  // Update thumbnail source if prop changes
  useEffect(() => {
    setThumbnailSrc(short.thumbnail_url);
  }, [short.thumbnail_url]);

  // Helper to send postMessage commands to YouTube iframe API safely
  const sendIframeCommand = useCallback((func: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args
          }),
          '*'
        );
      }
    } catch {
      // Safe fallback for cross-origin boundary
    }
  }, []);

  // When Short becomes inactive, IMMEDIATELY pause and stop video playback
  useEffect(() => {
    if (!isActive) {
      sendIframeCommand('pauseVideo');
      sendIframeCommand('stopVideo');
      setIsPaused(false);
    }
  }, [isActive, sendIframeCommand]);

  // Cleanup on unmount — stop all video resources immediately
  useEffect(() => {
    return () => {
      sendIframeCommand('pauseVideo');
      sendIframeCommand('stopVideo');
    };
  }, [sendIframeCommand]);

  // Viewport-aware IntersectionObserver:
  // - Activates playback when >= 50% visible in the viewport.
  // - When scrolling away (< 20% visible), notifies coordinator to deactivate and stop.
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            onBecomeActive?.();
          } else if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
            if (isActive) {
              onBecomeInactive?.();
            }
          }
        });
      },
      {
        threshold: [0, 0.2, 0.5, 0.8, 1.0]
      }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [onBecomeActive, onBecomeInactive, isActive]);

  // Silent tap-to-play/pause toggle — COMPLETELY INVISIBLE CONTROLS (Issue 1)
  // Maintains tap functionality without ever displaying a play/pause icon or overlay.
  const handleTogglePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isActive) {
      onBecomeActive?.();
      return;
    }

    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    sendIframeCommand(nextPaused ? 'pauseVideo' : 'playVideo');
  }, [isActive, isPaused, onBecomeActive, sendIframeCommand]);

  // Fallback for YouTube thumbnail if maxresdefault is unavailable
  const handleThumbnailError = () => {
    if (thumbnailSrc.includes('maxresdefault.jpg')) {
      setThumbnailSrc(`https://i.ytimg.com/vi/${short.youtube_video_id}/hqdefault.jpg`);
    }
  };

  const originParam = typeof window !== 'undefined' && window.location.origin
    ? `&origin=${encodeURIComponent(window.location.origin)}&widget_referrer=${encodeURIComponent(window.location.origin)}`
    : '';

  // Active YouTube Embed URL:
  // - NO playlist parameter (removes YouTube's playlist HUD: previous/next buttons and center circle pause icon)
  // - controls=0 (removes native player controls)
  // - modestbranding=1, rel=0, showinfo=0, iv_load_policy=3, disablekb=1, fs=0, autohide=1
  // - enablejsapi=1 (enables authoritative programmatic control)
  const activeEmbedUrl = `https://www.youtube.com/embed/${short.youtube_video_id}?autoplay=1&playsinline=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&showinfo=0&autohide=1&enablejsapi=1${originParam}`;

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
             - Mobile: Full width 9:16 edge-to-edge, zero black sidebars (Preserved)
             - Desktop: Centered, compact 9:16 card (sm:max-w-[380px], sm:max-h-[640px]) */}
      <div className="w-full bg-black sm:bg-slate-900/90 sm:p-4 flex items-center justify-center">
        <div
          ref={videoContainerRef}
          onClick={handleTogglePlayPause}
          className="relative w-full aspect-[9/16] sm:max-w-[380px] sm:max-h-[640px] mx-auto bg-black overflow-hidden flex items-center justify-center sm:rounded-2xl shadow-md cursor-pointer select-none"
        >
          {isActive ? (
            /* ACTIVE SHORT: Exactly ONE active player in the entire feed */
            <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center pointer-events-auto">
              {/* Immediate Poster image layer underneath video to eliminate white flash */}
              <img
                src={thumbnailSrc}
                alt={short.title}
                onError={handleThumbnailError}
                className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
                loading="eager"
                decoding="async"
              />

              {/* YouTube Embed Player — Zero visible playback controls, true 9:16 full-bleed */}
              <iframe
                ref={iframeRef}
                src={activeEmbedUrl}
                title={short.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0 pointer-events-none object-cover"
                loading="eager"
              />
            </div>
          ) : (
            /* INACTIVE SHORT: Lightweight Poster image layer ONLY. NO IFRAME MOUNTED. ZERO competing audio/video */
            <div className="relative w-full h-full cursor-pointer flex items-center justify-center bg-black overflow-hidden">
              <img
                src={thumbnailSrc}
                alt={short.title}
                onError={handleThumbnailError}
                className="w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-300 hover:scale-102"
                loading={isNext ? 'eager' : 'lazy'}
                decoding="async"
              />

              {/* Bottom informative tag — Clean & immersive, NO center play/pause controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold pointer-events-none">
                <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-xs text-[11px] font-bold flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-red-400" />
                  <span>EdTechra Short</span>
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
