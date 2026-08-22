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

  const handleToggleLike = () => {
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

  const handleToggleSave = () => {
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

  const handleShare = () => {
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
    <article className="w-full bg-[#fdfcf7] border border-amber-200/80 hover:border-amber-300 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 relative group">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 sm:px-5 py-2.5 text-white flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs text-white shadow-2xs">
            <BookA className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider">
            Word of the Day
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-black text-white flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </div>

      {/* 2. Main Content Layout (Desktop: Split Columns | Mobile: Responsive Stack) */}
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Left Column (Word Details & Meaning/Example Boxes) */}
        <div className="md:col-span-7 space-y-4">
          
          {/* Main Word Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0f233a] tracking-tight capitalize select-text">
                {word.word}
              </h2>

              {/* Part of Speech Pill */}
              {partOfSpeechDisplay && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-[11px] font-extrabold uppercase tracking-wide">
                  {partOfSpeechDisplay}
                </span>
              )}
            </div>

            {/* Pronunciation & Audio Speaker */}
            <div className="flex items-center gap-2.5 mt-1.5">
              {word.pronunciation && (
                <span className="font-mono text-xs sm:text-sm text-slate-500 font-semibold select-text">
                  {word.pronunciation}
                </span>
              )}

              {/* Native Pronunciation Speaker Button */}
              <button
                type="button"
                onClick={handlePronounce}
                aria-label={`Pronounce ${word.word}`}
                title={`Listen to pronunciation of ${word.word}`}
                className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px] ${
                  isSpeaking
                    ? 'bg-amber-500 text-white scale-110 shadow-md ring-4 ring-amber-200/80 animate-pulse'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800 active:scale-95'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mobile Image Display (Positioned nicely above boxes on small screens) */}
          <div className="block md:hidden w-full max-w-[200px] mx-auto my-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-amber-50/50 border border-amber-100/80 shadow-2xs">
              <img
                src={word.image_url || DEFAULT_BOY_ASSET}
                alt="Student studying with excitement"
                className="w-full h-full object-contain p-1.5"
                loading="lazy"
              />
            </div>
          </div>

          {/* Meaning Section Box */}
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-2xl p-3.5 sm:p-4 space-y-1">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-900/80 block">
              Meaning
            </span>
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed select-text">
              {word.meaning}
            </p>
          </div>

          {/* Example Section Box */}
          <div className="bg-sky-50/80 border border-sky-200/60 rounded-2xl p-3.5 sm:p-4 space-y-1">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-900/80 block">
              Example
            </span>
            <p className="text-xs sm:text-sm text-slate-800 font-serif italic leading-relaxed select-text">
              "{word.example}"
            </p>
          </div>

        </div>

        {/* Right Column: Reusable Boy Studying Illustration (Desktop view) */}
        <div className="hidden md:flex md:col-span-5 items-center justify-center p-2">
          <div className="relative w-full max-w-[240px] aspect-square rounded-3xl overflow-hidden bg-gradient-to-b from-amber-50/60 to-orange-50/40 border border-amber-100 shadow-xs group-hover:scale-[1.02] transition-transform duration-300">
            <img
              src={word.image_url || DEFAULT_BOY_ASSET}
              alt="Student studying illustration"
              className="w-full h-full object-contain p-3"
              loading="lazy"
            />
          </div>
        </div>

      </div>

      {/* 3. Bottom Action Bar */}
      <div className="px-4 sm:px-6 py-3 bg-stone-50/70 border-t border-amber-100 flex items-center justify-between">
        
        {/* Left Actions: Like & Add to My Words */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Add to My Words Button */}
          <button
            type="button"
            onClick={handleToggleSave}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              isSaved
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-stone-200/80'
            }`}
            title={isSaved ? 'Word saved in My Words' : 'Save word to My Words'}
          >
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">{isSaved ? 'In My Words' : 'Add to My Words'}</span>
            <span className="sm:hidden">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Like Button */}
          <button
            type="button"
            onClick={handleToggleLike}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              isLiked
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-stone-200/80'
            }`}
            title="Like this word"
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
            <span>{likesCount}</span>
          </button>
        </div>

        {/* Right Actions: Share */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-stone-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px]"
            title="Share this Word of the Day"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

      </div>

      {/* Floating Copied Toast */}
      {copiedToast && (
        <div className="absolute bottom-16 right-6 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs animate-in fade-in duration-200 z-30">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Word link copied!</span>
        </div>
      )}

      {/* Floating Save Toast */}
      {savedToast && (
        <div className="absolute bottom-16 left-6 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs animate-in fade-in duration-200 z-30">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{savedToast}</span>
        </div>
      )}

    </article>
  );
};
