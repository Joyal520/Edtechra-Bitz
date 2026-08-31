// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Discovery Card
// Visual curiosity card with double-tap interaction, Like, Save, and Share
// ============================================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  Heart,
  Bookmark,
  Share2,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { KnowledgeBitzItem } from '@/types';
import { getTopicById } from '@/utils/bitzTopicsConfig';
import { useAuth } from '@/context/AuthContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { playCorrectAnswerSound } from '@/utils/reorderAudio';

interface KnowledgeBitzDiscoveryCardProps {
  bitz: KnowledgeBitzItem;
  onOpenReader: (bitz: KnowledgeBitzItem) => void;
  onLikeChanged?: (bitzId: string, isLiked: boolean, count: number) => void;
  onSaveChanged?: (bitzId: string, isSaved: boolean, count: number) => void;
}

export const KnowledgeBitzDiscoveryCard: React.FC<KnowledgeBitzDiscoveryCardProps> = ({
  bitz,
  onOpenReader,
  onLikeChanged,
  onSaveChanged
}) => {
  const { session, requireAuth } = useAuth();
  const token = session?.access_token || null;

  const [isLiked, setIsLiked] = useState<boolean>(Boolean(bitz.is_liked_by_me));
  const [likesCount, setLikesCount] = useState<number>(bitz.likes_count || 0);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(bitz.is_saved_by_me));
  const [savesCount, setSavesCount] = useState<number>(bitz.saves_count || 0);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const topicConfig = getTopicById(bitz.topic_id);

  // Double-tap touch detection state
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Double-tap / Double-click to open reading experience
  const handleCardTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Prevent double tap trigger if user clicked interactive buttons
    if (target.closest('button') || target.closest('a') || target.closest('.no-tap-trigger')) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 320; // 320ms window for double tap

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;

      // Show brief visual feedback animation
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 700);

      // Record interaction & open reader
      knowledgeBitzService.recordInteraction(bitz.id, 'opened', undefined, token);
      onOpenReader(bitz);
    } else {
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [bitz, onOpenReader, token]);

  // Handle 1-Tap Like
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      requireAuth('like');
      return;
    }

    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);
    if (nextLiked) playCorrectAnswerSound();
    if (onLikeChanged) onLikeChanged(bitz.id, nextLiked, nextCount);

    try {
      await knowledgeBitzService.toggleLike(bitz.id, token);
    } catch (err) {
      // Revert on error
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
    }
  };

  // Handle 1-Tap Save to Pocket
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      requireAuth('save');
      return;
    }

    const nextSaved = !isSaved;
    const nextCount = nextSaved ? savesCount + 1 : Math.max(0, savesCount - 1);
    setIsSaved(nextSaved);
    setSavesCount(nextCount);
    if (onSaveChanged) onSaveChanged(bitz.id, nextSaved, nextCount);

    try {
      await knowledgeBitzService.toggleSave(bitz.id, bitz.category, token);
    } catch (err) {
      setIsSaved(!nextSaved);
      setSavesCount(savesCount);
    }
  };

  // Handle Native Share / Link Copy
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/explore?bitz=${bitz.bitz_code || bitz.id}`;
    const shareData = {
      title: `${bitz.title} — EdTechra Bitz`,
      text: `${bitz.short_fact}`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast('Link copied to clipboard!');
      setTimeout(() => setShareToast(null), 2500);
    } catch (err) {
      setShareToast('Failed to copy link');
      setTimeout(() => setShareToast(null), 2000);
    }
  };

  return (
    <article
      onClick={handleCardTap}
      className="group relative bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer select-none"
      aria-label={`Knowledge Bitz: ${bitz.title}`}
    >
      {/* Visual Media Container with 1:1 or 16:9 Aspect Ratio */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-stone-100 dark:bg-stone-800 overflow-hidden">
        {bitz.visual_url ? (
          <img
            src={bitz.visual_url}
            alt={bitz.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            onError={(e) => {
              // Fallback to stylized abstract background if image fails
              (e.target as HTMLImageElement).src = '/assets/ChatGPT Image May 14, 2026, 08_52_51 PM (1).png';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white p-6 text-center">
            <Sparkles className="w-12 h-12 mb-2 opacity-80 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold opacity-90">
              {topicConfig.name}
            </span>
          </div>
        )}

        {/* Gradient Overlay for Top Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: topicConfig.color }}
            />
            <span className="text-xs font-bold text-stone-800 dark:text-stone-100 uppercase tracking-wide">
              {topicConfig.name}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{bitz.reading_time_sec || 30}s read</span>
          </div>
        </div>

        {/* Double-tap animated feedback popup */}
        {showDoubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md text-amber-500 rounded-full p-5 shadow-2xl animate-ping duration-300">
              <BookOpen className="w-12 h-12 fill-current" />
            </div>
          </div>
        )}

        {/* Bottom Double-Tap Visual Cue inside Image */}
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white/90 text-xs pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Double tap to read more</span>
          </div>

          {bitz.difficulty && (
            <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider">
              {bitz.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Content Section (Hook & Insight) */}
      <div className="p-4 sm:p-5">
        {/* Title / Hook */}
        <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-50 leading-snug tracking-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {bitz.title}
        </h3>

        {/* Short Supporting Fact (1-2 sentences) */}
        <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed line-clamp-3 mb-4">
          {bitz.short_fact}
        </p>

        {/* Action Bar (Like, Save, Share, Read More) */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Like Button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                isLiked
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title="Like this fact"
              aria-label="Like"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-500' : ''}`} />
              <span>{likesCount > 0 ? likesCount : 'Like'}</span>
            </button>

            {/* Save to Pocket Button */}
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                isSaved
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title="Save to My Knowledge"
              aria-label="Save"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-blue-500' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-all active:scale-95"
              title="Share fact"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Accessible Read More Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              knowledgeBitzService.recordInteraction(bitz.id, 'opened', undefined, token);
              onOpenReader(bitz);
            }}
            className="flex items-center gap-1 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full transition-all active:scale-95"
          >
            <span>Read</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Share Feedback Toast */}
        {shareToast && (
          <div className="mt-2 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 py-1 px-3 rounded-lg animate-fade-in">
            {shareToast}
          </div>
        )}
      </div>
    </article>
  );
};
