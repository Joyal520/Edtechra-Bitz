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
      className="group relative bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-[#026fc3]/50 transition-all duration-200 overflow-hidden cursor-pointer select-none"
      aria-label={`Knowledge Bitz: ${bitz.title}`}
    >
      {/* Visual Media Container with 16:9 Aspect Ratio */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-slate-100 overflow-hidden">
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
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#082847] via-[#026fc3] to-[#0c3f6c] text-white p-6 text-center">
            <Sparkles className="w-12 h-12 mb-2 opacity-80 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-extrabold opacity-95">
              {topicConfig.name}
            </span>
          </div>
        )}

        {/* Gradient Overlay for Top Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/35 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: topicConfig.color }}
            />
            <span className="text-xs font-black text-[#0a213c] uppercase tracking-wide">
              {topicConfig.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{bitz.reading_time_sec || 30}s read</span>
          </div>
        </div>

        {/* Double-tap animated feedback popup */}
        {showDoubleTapHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-white/95 backdrop-blur-md text-[#026fc3] rounded-full p-5 shadow-2xl animate-ping duration-300">
              <BookOpen className="w-12 h-12 fill-current" />
            </div>
          </div>
        )}

        {/* Bottom Double-Tap Visual Cue inside Image */}
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white text-xs pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold tracking-wide shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Double tap to read more</span>
          </div>

          {bitz.difficulty && (
            <span className="bg-white/30 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider text-white shadow-xs">
              {bitz.difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Content Section (Hook & Insight) */}
      <div className="p-4 sm:p-5">
        {/* Title / Hook */}
        <h3 className="text-lg sm:text-xl font-black text-[#0a213c] leading-snug tracking-tight mb-2 group-hover:text-[#026fc3] transition-colors">
          {bitz.title}
        </h3>

        {/* Short Supporting Fact (1-2 sentences) */}
        <p className="text-slate-700 text-sm sm:text-[15px] font-medium leading-relaxed line-clamp-3 mb-4">
          {bitz.short_fact}
        </p>

        {/* Action Bar (Like, Save, Share, Read More) */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Like Button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isLiked
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-[#0a213c]'
              }`}
              title="Like this fact"
              aria-label="Like"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-600' : 'stroke-[2.2]'}`} />
              <span>{likesCount > 0 ? likesCount : 'Like'}</span>
            </button>

            {/* Save to Pocket Button */}
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isSaved
                  ? 'bg-blue-50 text-[#026fc3] border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-[#0a213c]'
              }`}
              title="Save to My Knowledge"
              aria-label="Save"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-[#026fc3]' : 'stroke-[2.2]'}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 text-slate-600 hover:text-[#0a213c] hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer"
              title="Share fact"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4 stroke-[2.2]" />
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
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>Read</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Share Feedback Toast */}
        {shareToast && (
          <div className="mt-2 text-center text-xs font-bold text-emerald-800 bg-emerald-100 py-1 px-3 rounded-xl border border-emerald-200 animate-fade-in">
            {shareToast}
          </div>
        )}
      </div>
    </article>
  );
};
