// ============================================================================
// EDTECHRA-BITZ: Word of the Day Card Component
// 100% Real HTML/CSS Typography + Reusable Boy Illustration Asset
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Bookmark,
  BookmarkCheck,
  Heart,
  Share2,
  Sparkles,
  Check,
  BookA
} from 'lucide-react';
import { WordOfTheDay } from '@/types/wordOfTheDay';
import { pronunciationService } from '@/services/pronunciationService';
import { wordOfTheDayService } from '@/services/wordOfTheDayService';
import { useAuth } from '@/context/AuthContext';
import { triggerConfetti } from '@/utils/confetti';

interface WordOfTheDayCardProps {
  word: WordOfTheDay;
  onSavedChanged?: (wordId: string, isSaved: boolean) => void;
}

const DEFAULT_BOY_ASSET = '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png';

export const WordOfTheDayCard: React.FC<WordOfTheDayCardProps> = ({
  word,
  onSavedChanged
}) => {
  const { session, requireAuth } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(word.is_liked_by_me));
  const [likesCount, setLikesCount] = useState<number>(Number(word.likes_count) || 0);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(word.is_saved_by_me));
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Subscribe to pronunciation service speaking state
  useEffect(() => {
    const unsubscribe = pronunciationService.subscribeState((speakingWord) => {
      setIsSpeaking(speakingWord === word.word.trim());
    });
    return () => {
      unsubscribe();
    };
  }, [word.word]);

  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      pronunciationService.stop();
    } else {
      // Speak the actual English word, never the IPA pronunciation string
      pronunciationService.speak(word.word);
    }
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth({ type: 'action', action: 'like' }, async () => {
      const nextLiked = !isLiked;
      setIsLiked(nextLiked);
      setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

      try {
        const token = session?.access_token || null;
        const res = await wordOfTheDayService.toggleLike(word.id, token);
        setIsLiked(res.liked);
        setLikesCount(res.likesCount);
      } catch (err) {
        console.warn('Failed to toggle like:', err);
        // Revert on error
        setIsLiked(!nextLiked);
        setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
      }
    });
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth({ type: 'action', action: 'save_word' }, async () => {
      const nextSaved = !isSaved;
      setIsSaved(nextSaved);

      if (nextSaved) {
        triggerConfetti();
        setSavedToast('Added to My Words!');
      } else {
        setSavedToast('Removed from My Words');
      }
      setTimeout(() => setSavedToast(null), 2500);

      try {
        const token = session?.access_token || null;
        const res = await wordOfTheDayService.toggleSave(word.id, token);
        setIsSaved(res.saved);
        if (onSavedChanged) onSavedChanged(word.id, res.saved);
      } catch (err) {
        console.warn('Failed to save word:', err);
      }
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/explore?word=${encodeURIComponent(word.id)}`;
    const shareData = {
      title: `Word of the Day: ${word.word}`,
      text: `Learn today's word on EdTechra: "${word.word}" - ${word.meaning}`,
      url: shareUrl
    };

    if (navigator.share && typeof navigator.share === 'function') {
      navigator.share(shareData).catch(() => {
        // Fallback to clipboard
        copyToClipboard(shareUrl);
      });
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2200);
      });
    }
  };

  const formattedDate = new Date(word.published_at || word.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  const partOfSpeechDisplay = word.part_of_speech
    ? word.part_of_speech.charAt(0).toUpperCase() + word.part_of_speech.slice(1).toLowerCase()
    : null;

  return (
    <article className="w-full bg-[#fdfcf7] border border-amber-200/80 hover:border-amber-300 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 relative group">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-3.5 sm:px-5 py-2 sm:py-2.5 text-white flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs text-white shadow-2xs shrink-0">
            <BookA className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
          </div>
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap">
            Word of the Day
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] sm:text-[11px] font-black text-white flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </div>

      {/* 2. Main Content Layout (Desktop: Balanced 2-Column Grid | Mobile: Compact High-Density Stream) */}
      <div className="p-3.5 sm:p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 lg:gap-6 items-center">
        
        {/* Left Column (Desktop: 58% col-span-7 | Mobile: Compact flow) */}
        <div className="md:col-span-7 flex flex-col space-y-2.5 sm:space-y-3.5">
          
          {/* Word Header with Speaker 🔊 and Bookmark 🔖 beside the title */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Word Title with Scalable Typography System */}
              <h2 className="learning-word-title font-black text-[#0f233a] tracking-tight capitalize select-text break-words">
                {word.word}
              </h2>

              {/* Native Speaker Pronunciation Button (Compact & Tappable) */}
              <button
                type="button"
                onClick={handlePronounce}
                aria-label={`Listen to pronunciation of ${word.word}`}
                title={`Listen to pronunciation of ${word.word}`}
                className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
                  isSpeaking
                    ? 'bg-amber-500 text-white scale-105 shadow-xs ring-2 ring-amber-200 animate-pulse'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800 active:scale-95'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
              </button>

              {/* Bookmark / Save to My Words Button (Directly beside word) */}
              <button
                type="button"
                onClick={handleToggleSave}
                aria-label={isSaved ? `Remove ${word.word} from My Words` : `Save ${word.word} to My Words`}
                title={isSaved ? 'Saved in My Words (Click to remove)' : 'Save to My Words'}
                className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                  isSaved
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : 'bg-white hover:bg-amber-100 text-slate-600 hover:text-amber-800 border border-stone-200/80 active:scale-95'
                }`}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                ) : (
                  <Bookmark className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Part of Speech Pill */}
              {partOfSpeechDisplay && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                  {partOfSpeechDisplay}
                </span>
              )}
            </div>

            {/* Phonetic Pronunciation String (if available) */}
            {word.pronunciation && (
              <div className="text-left">
                <span className="font-mono text-xs text-slate-500 font-semibold select-text">
                  {word.pronunciation}
                </span>
              </div>
            )}
          </div>

          {/* Mobile Illustration: Compact height to prevent excessive screen consumption */}
          <div className="block md:hidden w-full max-w-[130px] sm:max-w-[150px] mx-auto my-0.5">
            <div className="relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-gradient-to-b from-amber-50/60 to-orange-50/30 border border-amber-200/60 shadow-2xs flex items-center justify-center p-1.5">
              <img
                src={word.image_url || DEFAULT_BOY_ASSET}
                alt={`Illustration for ${word.word}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>

          {/* Meaning Section Box */}
          <div className="bg-amber-50/80 border border-amber-200/70 rounded-2xl p-2.5 sm:p-3.5 space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-900/80 block">
              Meaning
            </span>
            <p className="text-slate-800 font-medium leading-relaxed select-text break-words learning-meaning-text">
              {word.meaning}
            </p>
          </div>

          {/* Example Section Box */}
          <div className="bg-sky-50/80 border border-sky-200/70 rounded-2xl p-2.5 sm:p-3.5 space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-900/80 block">
              Example
            </span>
            <p className="text-slate-800 font-serif italic leading-relaxed select-text break-words learning-example-text">
              "{word.example}"
            </p>
          </div>

        </div>

        {/* Right Column: Word Illustration (Desktop: 42% col-span-5) */}
        <div className="hidden md:flex md:col-span-5 items-center justify-center p-1">
          <div className="relative w-full max-w-[240px] lg:max-w-[260px] aspect-square rounded-3xl overflow-hidden bg-gradient-to-b from-amber-50/60 to-orange-50/30 border border-amber-200/60 shadow-2xs flex items-center justify-center p-3 group-hover:scale-[1.01] transition-transform duration-300">
            <img
              src={word.image_url || DEFAULT_BOY_ASSET}
              alt={`Illustration for ${word.word}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        </div>

      </div>

      {/* 3. Bottom Action Bar */}
      <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-stone-50/80 border-t border-amber-100/90 flex items-center justify-between gap-2">
        
        {/* Left Actions: Like & Save status pill */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          {/* Like Button */}
          <button
            type="button"
            onClick={handleToggleLike}
            aria-label={isLiked ? 'Unlike this word' : 'Like this word'}
            className={`min-h-[36px] sm:min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              isLiked
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-stone-200/80'
            }`}
            title="Like this word"
          >
            <Heart className={`w-3.5 h-3.5 shrink-0 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
            <span>{likesCount}</span>
          </button>

          {/* Quick Bookmark Status Pill */}
          <button
            type="button"
            onClick={handleToggleSave}
            aria-label={isSaved ? 'Word is saved in My Words (click to remove)' : 'Save word to My Words'}
            title={isSaved ? 'Word saved in My Words' : 'Save word to My Words'}
            className={`min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isSaved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-stone-200/80'
            }`}
          >
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 shrink-0" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[11px] sm:text-xs">{isSaved ? 'In My Words' : 'Save'}</span>
          </button>
        </div>

        {/* Right Actions: Share */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share this Word of the Day"
            className="min-h-[36px] sm:min-h-[38px] px-3 sm:px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-stone-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            title="Share this Word of the Day"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] sm:text-xs">Share</span>
          </button>
        </div>

      </div>

      {/* Floating Copied Toast */}
      {copiedToast && (
        <div className="absolute bottom-14 right-4 sm:right-6 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs animate-in fade-in duration-200 z-30">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Word link copied!</span>
        </div>
      )}

      {/* Floating Save Toast */}
      {savedToast && (
        <div className="absolute bottom-14 left-4 sm:left-6 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs animate-in fade-in duration-200 z-30">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{savedToast}</span>
        </div>
      )}

    </article>
  );
};

