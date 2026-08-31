// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Discovery Card (V2)
// 1:1 Square Media, CEFR badge, 20-30 word discovery fact, double-tap reader
// ============================================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  Heart,
  Bookmark,
  Share2,
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { KnowledgeBitzItem } from '@/types';
import { getCategoryById } from '@/utils/bitzTopicsConfig';
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
  const [showDoubleTapFeedback, setShowDoubleTapFeedback] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);

  const category = getCategoryById(bitz.category || bitz.topic_id);
  const hasImage = Boolean(bitz.visual_url) && !imgLoadError;

  // Double-tap touch detection
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCardTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.no-tap-trigger')) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 320;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;

      setShowDoubleTapFeedback(true);
      setTimeout(() => setShowDoubleTapFeedback(false), 700);

      knowledgeBitzService.recordInteraction(bitz.id, 'opened', undefined, undefined, token);
      onOpenReader(bitz);
    } else {
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        lastTapRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [bitz, onOpenReader, token]);

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
    } catch {
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
    }
  };

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
    } catch {
      setIsSaved(!nextSaved);
      setSavesCount(savesCount);
    }
  };

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
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast('Link copied to clipboard!');
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      setShareToast('Failed to copy link');
      setTimeout(() => setShareToast(null), 2000);
    }
  };

  return (
    <article
      onClick={handleCardTap}
      className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-[#026fc3]/50 transition-all duration-300 overflow-hidden cursor-pointer select-none max-w-xl mx-auto w-full"
      aria-label={`Knowledge Bitz: ${bitz.title}`}
    >
      {/* 1:1 Square Media Container */}
      <div className="relative w-full aspect-square bg-slate-900 overflow-hidden">
        {hasImage ? (
          <img
            src={bitz.visual_url!}
            alt={bitz.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            onError={() => setImgLoadError(true)}
          />
        ) : (
          /* Premium dark-blue animated background for facts without image */
          <div className="w-full h-full relative flex flex-col items-center justify-center p-8 text-center overflow-hidden bg-gradient-to-br from-[#082847] via-[#024a87] to-[#0a1f38]">
            {/* Ambient decorative glowing rings */}
            <div className="absolute w-72 h-72 rounded-full bg-blue-500/10 blur-2xl animate-pulse pointer-events-none" />
            <div className="absolute w-48 h-48 rounded-full bg-indigo-500/15 blur-xl pointer-events-none -bottom-10 -right-10" />

            <div className="relative z-10 flex flex-col items-center max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-200 mb-4 shadow-lg">
                <Sparkles className="w-7 h-7 animate-pulse text-amber-300" />
              </div>
              <span className="text-xs uppercase tracking-widest font-black text-blue-200/90 mb-2">
                {category.name}
              </span>
              <h4 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                {bitz.title}
              </h4>
            </div>
          </div>
        )}

        {/* Subtle Vignette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges: Category Pill + CEFR Level Pill */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-10">
          {/* Category Badge */}
          <div className="flex items-center gap-1.5 bg-[#082847]/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 shadow-sm">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-[11px] font-black text-white uppercase tracking-wider">
              {category.name}
            </span>
          </div>

          {/* CEFR Level Badge */}
          <div className="flex items-center gap-1 bg-[#026fc3]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-black tracking-wider border border-white/20 shadow-sm">
            <span>CEFR {bitz.cefr_level || 'B1'}</span>
          </div>
        </div>

        {/* Double-Tap Animation Popup */}
        {showDoubleTapFeedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-white/95 backdrop-blur-md text-[#026fc3] rounded-full p-5 shadow-2xl animate-ping duration-300">
              <BookOpen className="w-10 h-10 fill-current" />
            </div>
          </div>
        )}

        {/* Bottom Cue Overlay on Media */}
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white text-xs pointer-events-none z-10">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border border-white/10 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Double tap to read 100-word bitz</span>
          </div>

          {bitz.sub_topic && (
            <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white/90 truncate max-w-[120px]">
              {bitz.sub_topic}
            </span>
          )}
        </div>
      </div>

      {/* Discovery Fact Content */}
      <div className="p-4 sm:p-5">
        {/* Hook Headline */}
        <h3 className="text-lg sm:text-xl font-black text-[#0a213c] leading-snug tracking-tight mb-2 group-hover:text-[#026fc3] transition-colors">
          {bitz.title}
        </h3>

        {/* 20–30 Word Discovery Fact */}
        <p className="text-slate-700 text-sm sm:text-[15px] font-medium leading-relaxed mb-4">
          {bitz.short_fact}
        </p>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1 sm:gap-2">
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

            {/* Save Button */}
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

          {/* Accessible Expanded Reading Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              knowledgeBitzService.recordInteraction(bitz.id, 'opened', undefined, undefined, token);
              onOpenReader(bitz);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>Read</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Share Toast */}
        {shareToast && (
          <div className="mt-2 text-center text-xs font-bold text-emerald-800 bg-emerald-100 py-1 px-3 rounded-xl border border-emerald-200 animate-fade-in">
            {shareToast}
          </div>
        )}
      </div>
    </article>
  );
};
