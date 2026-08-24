// ============================================================================
// EDTECHRA-BITZ: Unified Vocabulary Card Component
// Supports: Word of the Day, Collocation of the Day, Phrasal Verb of the Day, Idiom of the Day
// Mode A: Standard 2-column card without uploaded visual
// Mode B: Full-width 1:1 image post matching standard feed layout when custom image is present
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
  BookA,
  Link2,
  Layers,
  Lightbulb,
  Maximize2,
  X,
  ShieldCheck
} from 'lucide-react';
import { VocabularyItem, VocabularyContentType } from '@/types/vocabulary';
import { pronunciationService } from '@/services/pronunciationService';
import { vocabularyService } from '@/services/vocabularyService';
import { useAuth } from '@/context/AuthContext';
import { triggerConfetti } from '@/utils/confetti';

interface VocabularyCardProps {
  item?: VocabularyItem;
  word?: any; // Backward compatibility alias
  onSavedChanged?: (itemId: string, isSaved: boolean) => void;
}

const DEFAULT_VOCAB_ASSET = '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png';

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  item: propItem,
  word: propWord,
  onSavedChanged
}) => {
  const item: VocabularyItem = propItem || propWord || {
    id: 'unknown',
    content_type: 'word',
    title: 'Word',
    meaning: '',
    example: '',
    status: 'published',
    validation_status: 'manually_approved',
    validation_provider: 'manual',
    likes_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const titleText = item.title || item.word || 'Vocabulary';
  const contentType: VocabularyContentType = item.content_type || 'word';

  const { session, requireAuth } = useAuth();

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(item.is_liked_by_me));
  const [likesCount, setLikesCount] = useState<number>(Number(item.likes_count) || 0);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(item.is_saved_by_me));
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Check if this vocabulary record has a valid administrator-uploaded visual
  const hasCustomImage = Boolean(
    !imageError &&
    item.image_url &&
    item.image_url.trim() !== '' &&
    item.image_url !== DEFAULT_VOCAB_ASSET &&
    !item.image_url.includes('ChatGPT Image') &&
    !item.image_url.startsWith('blob:')
  );

  // Subscribe to pronunciation service speaking state
  useEffect(() => {
    const unsubscribe = pronunciationService.subscribeState((speakingText) => {
      setIsSpeaking(speakingText === titleText.trim());
    });
    return () => {
      unsubscribe();
    };
  }, [titleText]);

  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      pronunciationService.stop();
    } else {
      pronunciationService.speak(titleText);
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
        const res = await vocabularyService.toggleLike(item.id, token);
        setIsLiked(res.liked);
        setLikesCount(res.likesCount);
      } catch (err) {
        console.warn('Failed to toggle like:', err);
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
        const res = await vocabularyService.toggleSave(item.id, token);
        setIsSaved(res.saved);
        if (onSavedChanged) onSavedChanged(item.id, res.saved);
      } catch (err) {
        console.warn('Failed to save vocabulary:', err);
      }
    });
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/explore?word=${encodeURIComponent(item.id)}`;
    const shareData = {
      title: `${getTypeLabel(contentType)}: ${titleText}`,
      text: `Learn today's ${getTypeLabel(contentType).toLowerCase()} on EdTechra: "${titleText}" - ${item.meaning}`,
      url: shareUrl
    };

    if (navigator.share && typeof navigator.share === 'function') {
      navigator.share(shareData).catch(() => copyToClipboard(shareUrl));
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

  const formattedDate = new Date(item.published_at || item.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  const partOfSpeechDisplay = item.part_of_speech
    ? item.part_of_speech.charAt(0).toUpperCase() + item.part_of_speech.slice(1).toLowerCase()
    : null;

  // Visual Theme Configuration per Content Type
  const theme = getThemeConfig(contentType);

  // Check if meaning/example are non-placeholder custom text
  const hasDisplayableMeaning = item.meaning && !item.meaning.startsWith('Visual learning lesson for');
  const hasDisplayableExample = item.example && !item.example.startsWith('Study the image for');

  return (
    <article className={`w-full bg-[#fdfcf7] border ${theme.cardBorder} hover:${theme.cardBorderHover} rounded-none sm:rounded-3xl overflow-hidden shadow-none sm:shadow-xs hover:shadow-md transition-all duration-300 relative group`}>
      
      {/* 1. Header Banner */}
      <div className={`bg-gradient-to-r ${theme.headerGradient} px-3.5 sm:px-5 py-2 sm:py-2.5 text-white flex items-center justify-between shadow-2xs`}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs text-white shadow-2xs shrink-0">
            {theme.icon}
          </div>
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap">
            {theme.label}
          </span>
          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-white/20 text-white text-[9px] font-extrabold uppercase">
            <ShieldCheck className="w-2.5 h-2.5" /> Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          {item.level && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-black text-white">
              {item.level}
            </span>
          )}
          <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] sm:text-[11px] font-black text-white flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-amber-200" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE B: FULL-WIDTH 1:1 IMAGE TREATMENT (When Admin Uploaded an Image)     */}
      {/* ========================================================================= */}
      {hasCustomImage ? (
        <div className="space-y-3">
          
          {/* Title Header with Speaker & Save */}
          <div className="px-3.5 sm:px-5 pt-3 sm:pt-4 space-y-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h2 className="learning-word-title font-black text-[#0f233a] tracking-tight capitalize select-text break-words">
                {titleText}
              </h2>

              {/* Native Speaker Pronunciation Button */}
              <button
                type="button"
                onClick={handlePronounce}
                aria-label={`Listen to pronunciation of ${titleText}`}
                title={`Listen to pronunciation of ${titleText}`}
                className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSpeaking
                    ? 'bg-amber-500 text-white scale-105 shadow-xs ring-2 ring-amber-200 animate-pulse'
                    : `${theme.pronounceBtnBg} text-slate-800 active:scale-95`
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
              </button>

              {/* Save to My Words Button */}
              <button
                type="button"
                onClick={handleToggleSave}
                aria-label={isSaved ? `Remove ${titleText} from My Words` : `Save ${titleText} to My Words`}
                title={isSaved ? 'Saved in My Words (Click to remove)' : 'Save to My Words'}
                className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
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

              {partOfSpeechDisplay && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                  {partOfSpeechDisplay}
                </span>
              )}
            </div>

            {(item.pronunciation || item.phonetic) && (
              <div className="text-left">
                <span className="font-mono text-xs text-slate-500 font-semibold select-text">
                  {item.pronunciation || item.phonetic}
                </span>
              </div>
            )}
          </div>

          {/* FULL-WIDTH 1:1 SQUARE MEDIA CONTAINER (Same as normal feed PostCard) */}
          <div className="w-full sm:px-4 sm:pb-2">
            <div
              onClick={() => setImageModalOpen(true)}
              className="relative w-full aspect-square bg-slate-900 rounded-none sm:rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group shadow-2xs"
            >
              <img
                src={item.image_url || ''}
                alt={`Visual learning graphic for ${titleText}`}
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
                className="w-full h-full object-contain sm:object-cover group-hover:scale-102 transition-transform duration-300"
              />

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-900 shadow-md">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Vocabulary Metadata (Meaning & Example if provided) */}
          {(hasDisplayableMeaning || hasDisplayableExample) && (
            <div className="px-3.5 sm:px-5 space-y-2 pb-1">
              {hasDisplayableMeaning && (
                <div className={`${theme.meaningBg} border ${theme.meaningBorder} rounded-2xl p-2.5 sm:p-3.5 space-y-0.5`}>
                  <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${theme.meaningLabel} block`}>
                    Meaning
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed select-text break-words learning-meaning-text">
                    {item.meaning || item.definition}
                  </p>
                </div>
              )}

              {hasDisplayableExample && (
                <div className="bg-sky-50/80 border border-sky-200/70 rounded-2xl p-2.5 sm:p-3.5 space-y-0.5">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-900/80 block">
                    Example
                  </span>
                  <p className="text-slate-800 font-serif italic leading-relaxed select-text break-words learning-example-text">
                    "{item.example}"
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        /* ========================================================================= */
        /* MODE A: STANDARD 2-COLUMN VOCABULARY CARD (Without custom image)          */
        /* ========================================================================= */
        <div className="p-3.5 sm:p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 lg:gap-6 items-center">
          
          {/* Left Column (Content) */}
          <div className="md:col-span-7 flex flex-col space-y-2.5 sm:space-y-3.5">
            
            {/* Title Header with Speaker & Bookmark */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <h2 className="learning-word-title font-black text-[#0f233a] tracking-tight capitalize select-text break-words">
                  {titleText}
                </h2>

                {/* Native Speaker Pronunciation Button */}
                <button
                  type="button"
                  onClick={handlePronounce}
                  aria-label={`Listen to pronunciation of ${titleText}`}
                  title={`Listen to pronunciation of ${titleText}`}
                  className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isSpeaking
                      ? 'bg-amber-500 text-white scale-105 shadow-xs ring-2 ring-amber-200 animate-pulse'
                      : `${theme.pronounceBtnBg} text-slate-800 active:scale-95`
                  }`}
                >
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
                </button>

                {/* Bookmark / Save to My Words Button */}
                <button
                  type="button"
                  onClick={handleToggleSave}
                  aria-label={isSaved ? `Remove ${titleText} from My Words` : `Save ${titleText} to My Words`}
                  title={isSaved ? 'Saved in My Words (Click to remove)' : 'Save to My Words'}
                  className={`w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-full transition-all cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
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

                {partOfSpeechDisplay && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide shrink-0">
                    {partOfSpeechDisplay}
                  </span>
                )}
              </div>

              {(item.pronunciation || item.phonetic) && (
                <div className="text-left">
                  <span className="font-mono text-xs text-slate-500 font-semibold select-text">
                    {item.pronunciation || item.phonetic}
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Illustration */}
            <div className="block md:hidden w-full max-w-[130px] sm:max-w-[150px] mx-auto my-0.5">
              <div className="relative aspect-[4/3] sm:aspect-square rounded-2xl overflow-hidden bg-gradient-to-b from-amber-50/60 to-orange-50/30 border border-amber-200/60 shadow-2xs flex items-center justify-center p-1.5">
                <img
                  src={DEFAULT_VOCAB_ASSET}
                  alt={`Illustration for ${titleText}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Meaning Section Box */}
            <div className={`${theme.meaningBg} border ${theme.meaningBorder} rounded-2xl p-2.5 sm:p-3.5 space-y-0.5`}>
              <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${theme.meaningLabel} block`}>
                Meaning
              </span>
              <p className="text-slate-800 font-medium leading-relaxed select-text break-words learning-meaning-text">
                {item.meaning || item.definition}
              </p>
            </div>

            {/* Example Section Box */}
            <div className="bg-sky-50/80 border border-sky-200/70 rounded-2xl p-2.5 sm:p-3.5 space-y-0.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-900/80 block">
                Example
              </span>
              <p className="text-slate-800 font-serif italic leading-relaxed select-text break-words learning-example-text">
                "{item.example}"
              </p>
            </div>

          </div>

          {/* Right Column: Illustration (Desktop) */}
          <div className="hidden md:flex md:col-span-5 items-center justify-center p-1">
            <div className="relative w-full max-w-[240px] lg:max-w-[260px] aspect-square rounded-3xl overflow-hidden bg-gradient-to-b from-amber-50/60 to-orange-50/30 border border-amber-200/60 shadow-2xs flex items-center justify-center p-3 group-hover:scale-[1.01] transition-transform duration-300">
              <img
                src={DEFAULT_VOCAB_ASSET}
                alt={`Illustration for ${titleText}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
          </div>

        </div>
      )}

      {/* 3. Bottom Action Bar (Identical across Mode A and Mode B) */}
      <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-stone-50/80 border-t border-stone-200/80 flex items-center justify-between gap-2">
        
        {/* Left Actions: Like & Save pill */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          
          <button
            type="button"
            onClick={handleToggleLike}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className={`min-h-[36px] sm:min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              isLiked
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-stone-200/80'
            }`}
            title="Like this item"
          >
            <Heart className={`w-3.5 h-3.5 shrink-0 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
            <span>{likesCount}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSave}
            aria-label={isSaved ? 'Saved in My Words (click to remove)' : 'Save to My Words'}
            title={isSaved ? 'Saved in My Words' : 'Save to My Words'}
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
            aria-label="Share"
            className="min-h-[36px] sm:min-h-[38px] px-3 sm:px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-stone-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            title="Share"
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
          <span>Link copied!</span>
        </div>
      )}

      {/* Floating Save Toast */}
      {savedToast && (
        <div className="absolute bottom-14 left-4 sm:left-6 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-xs animate-in fade-in duration-200 z-30">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Fullscreen 1:1 Image Preview Modal */}
      {imageModalOpen && hasCustomImage && (
        <div
          onClick={() => setImageModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <button
            onClick={() => setImageModalOpen(false)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20"
          >
            <img
              src={item.image_url || ''}
              alt={titleText}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

    </article>
  );
};

function getTypeLabel(type: VocabularyContentType): string {
  switch (type) {
    case 'collocation': return 'Collocation of the Day';
    case 'phrasal_verb': return 'Phrasal Verb of the Day';
    case 'idiom': return 'Idiom of the Day';
    case 'word':
    default: return 'Word of the Day';
  }
}

function getThemeConfig(type: VocabularyContentType) {
  switch (type) {
    case 'collocation':
      return {
        label: 'Collocation of the Day',
        headerGradient: 'from-blue-600 via-indigo-600 to-sky-600',
        cardBorder: 'border-blue-200/80',
        cardBorderHover: 'border-blue-300',
        icon: <Link2 className="w-3.5 h-3.5 text-white" />,
        pronounceBtnBg: 'bg-blue-100 hover:bg-blue-200',
        meaningBg: 'bg-blue-50/80',
        meaningBorder: 'border-blue-200/70',
        meaningLabel: 'text-blue-900/80'
      };
    case 'phrasal_verb':
      return {
        label: 'Phrasal Verb of the Day',
        headerGradient: 'from-purple-600 via-violet-600 to-indigo-600',
        cardBorder: 'border-purple-200/80',
        cardBorderHover: 'border-purple-300',
        icon: <Layers className="w-3.5 h-3.5 text-white" />,
        pronounceBtnBg: 'bg-purple-100 hover:bg-purple-200',
        meaningBg: 'bg-purple-50/80',
        meaningBorder: 'border-purple-200/70',
        meaningLabel: 'text-purple-900/80'
      };
    case 'idiom':
      return {
        label: 'Idiom of the Day',
        headerGradient: 'from-teal-600 via-emerald-600 to-teal-700',
        cardBorder: 'border-teal-200/80',
        cardBorderHover: 'border-teal-300',
        icon: <Lightbulb className="w-3.5 h-3.5 text-white" />,
        pronounceBtnBg: 'bg-teal-100 hover:bg-teal-200',
        meaningBg: 'bg-teal-50/80',
        meaningBorder: 'border-teal-200/70',
        meaningLabel: 'text-teal-900/80'
      };
    case 'word':
    default:
      return {
        label: 'Word of the Day',
        headerGradient: 'from-amber-500 via-orange-500 to-amber-600',
        cardBorder: 'border-amber-200/80',
        cardBorderHover: 'border-amber-300',
        icon: <BookA className="w-3.5 h-3.5 text-white" />,
        pronounceBtnBg: 'bg-amber-100 hover:bg-amber-200',
        meaningBg: 'bg-amber-50/80',
        meaningBorder: 'border-amber-200/70',
        meaningLabel: 'text-amber-900/80'
      };
  }
}
