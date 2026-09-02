// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Discovery Card (V2 Canonical)
// 1:1 Square Media, CEFR badge, 20-30 word discovery preview, double-tap reader,
// Premium Dark Blue Theme default (Tokens: #020817, #081B35, #1677FF, #36D1FF).
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
import { useBitzTheme } from '@/context/BitzThemeContext';
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
  const { isDark } = useBitzTheme();

  const [isLiked, setIsLiked] = useState<boolean>(Boolean(bitz.is_liked_by_me));
  const [likesCount, setLikesCount] = useState<number>(bitz.likes_count || 0);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(bitz.is_saved_by_me));
  const [savesCount, setSavesCount] = useState<number>(bitz.saves_count || 0);
  const [showDoubleTapFeedback, setShowDoubleTapFeedback] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [imgLoadError, setImgLoadError] = useState<boolean>(false);

  const category = getCategoryById(bitz.category || bitz.topic_id);
  // Strict Image Priority: If visual_url exists and hasn't failed to load, it ALWAYS wins
  const hasImage = Boolean(bitz.visual_url) && !imgLoadError;

  // Double-tap touch/click detection
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
      className={`group relative rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer select-none max-w-xl mx-auto w-full ${
        isDark
          ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)] hover:border-[#2D8CFF] hover:shadow-[0_0_30px_rgba(45,140,255,0.22)]'
          : 'bg-white border-slate-200/90 shadow-sm hover:shadow-lg hover:border-[#1677FF]/60'
      }`}
      aria-label={`Knowledge Bitz: ${bitz.title}`}
    >
      {/* 1:1 Square Media Container (Section 3: aspect-ratio: 1/1, width: 100%, object-fit: cover) */}
      <div className="relative w-full aspect-square bg-[#020817] overflow-hidden">
        {hasImage ? (
          <img
            src={bitz.visual_url!}
            alt={bitz.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            onError={() => setImgLoadError(true)}
          />
        ) : (
          /* Premium animated visual preview for facts without images (Section 19) */
          <div className="w-full h-full relative flex flex-col items-center justify-center p-8 text-center overflow-hidden bg-gradient-to-br from-[#020817] via-[#06152B] to-[#081B35]">
            {/* Ambient decorative glowing rings & light wave */}
            <div className="absolute w-80 h-80 rounded-full bg-[#1677FF]/15 blur-3xl animate-bitz-glow pointer-events-none" />
            <div className="absolute w-56 h-56 rounded-full bg-[#8B5CF6]/15 blur-2xl animate-bitz-drift pointer-events-none -bottom-10 -right-10" />

            <div className="relative z-10 flex flex-col items-center max-w-sm px-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#5AA9FF] mb-4 shadow-xl">
                <Sparkles className="w-8 h-8 animate-pulse text-[#36D1FF]" />
              </div>
              <span className="text-xs uppercase tracking-widest font-black text-[#5AA9FF] mb-2">
                {category.name}
              </span>
              <h4 className="font-display text-xl sm:text-2xl font-normal text-[#F8FAFC] leading-tight tracking-tight drop-shadow-md">
                {bitz.title}
              </h4>
            </div>
          </div>
        )}

        {/* Subtle Vignette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/45 pointer-events-none" />

        {/* Top Badge: Category Pill */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-start pointer-events-none z-10">
          {/* Category Badge */}
          <div className="flex items-center gap-1.5 bg-[#06152B]/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-md font-ui">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-[11px] font-black text-white uppercase tracking-wider">
              {category.name}
            </span>
          </div>
        </div>

        {/* Double-Tap Animation Popup */}
        {showDoubleTapFeedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-white/95 backdrop-blur-md text-[#1677FF] rounded-full p-5 shadow-2xl animate-ping duration-300">
              <BookOpen className="w-10 h-10 fill-current" />
            </div>
          </div>
        )}

      </div>

      {/* Discovery Fact Content (Section 4: 20-30 word short_fact ONLY) */}
      <div className="p-4 sm:p-5">
        {/* Hook Headline: DM Serif Display */}
        <h3
          className={`font-display text-xl sm:text-2xl font-normal leading-snug tracking-tight mb-2 transition-colors ${
            isDark
              ? 'text-[#F8FAFC] group-hover:text-[#36D1FF]'
              : 'text-[#0a213c] group-hover:text-[#1677FF]'
          }`}
        >
          {bitz.title}
        </h3>

        {/* 20–30 Word Discovery Fact */}
        <p
          className={`text-sm sm:text-[15px] font-normal leading-relaxed mb-4 ${
            isDark ? 'text-[#CBD5E1]' : 'text-slate-700'
          }`}
        >
          {bitz.short_fact}
        </p>

        {/* Action Bar */}
        <div
          className={`flex items-center justify-between pt-3 border-t ${
            isDark ? 'border-[rgba(96,165,250,0.18)]' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Like Button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isLiked
                  ? isDark
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                  : isDark
                  ? 'text-[#CBD5E1] hover:bg-[#0B2342] hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-[#0a213c]'
              }`}
              title="Like this fact"
              aria-label="Like"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-500' : 'stroke-[2.2]'}`} />
              <span>{likesCount > 0 ? likesCount : 'Like'}</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                isSaved
                  ? isDark
                    ? 'bg-blue-950/80 text-[#36D1FF] border border-[#2D8CFF]/60'
                    : 'bg-blue-50 text-[#1677FF] border border-blue-200'
                  : isDark
                  ? 'text-[#CBD5E1] hover:bg-[#0B2342] hover:text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-[#0a213c]'
              }`}
              title="Save to My Knowledge"
              aria-label="Save"
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-[#36D1FF]' : 'stroke-[2.2]'}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'text-[#CBD5E1] hover:text-white hover:bg-[#0B2342]'
                  : 'text-slate-600 hover:text-[#0a213c] hover:bg-slate-100'
              }`}
              title="Share fact"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Accessible Read Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              knowledgeBitzService.recordInteraction(bitz.id, 'opened', undefined, undefined, token);
              onOpenReader(bitz);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs font-black rounded-full shadow-md shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <span>Read</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Share Toast */}
        {shareToast && (
          <div
            className={`mt-2 text-center text-xs font-bold py-1 px-3 rounded-xl border animate-fade-in ${
              isDark
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
                : 'text-emerald-800 bg-emerald-100 border-emerald-200'
            }`}
          >
            {shareToast}
          </div>
        )}
      </div>
    </article>
  );
};
