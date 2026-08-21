import React, { useEffect } from 'react';
import { X, Sparkles, Youtube, ExternalLink } from 'lucide-react';
import { YouTubeShort } from '@/types';
import { QuizBitCard } from './QuizBitCard';
import { getYouTubeEmbedUrl } from '@/utils/youtubeUrl';

interface YouTubeShortModalProps {
  short: YouTubeShort;
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubeShortModal: React.FC<YouTubeShortModalProps> = ({
  short,
  isOpen,
  onClose
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const embedUrl = getYouTubeEmbedUrl(short.youtube_video_id, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0f233a] via-[#122e4d] to-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white shrink-0">
              <Youtube className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black truncate">{short.title}</h3>
              <span className="text-[10px] text-slate-400 font-semibold">{short.category || 'Educational Short'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={short.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Open on YouTube"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* YouTube Responsive Video Player */}
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-md">
            <iframe
              src={embedUrl}
              title={short.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          {/* Video Description if present */}
          {short.description && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium">
              {short.description}
            </div>
          )}

          {/* Short -> Quiz Connection (Requirement 7 & 10) */}
          {short.linked_quiz && (
            <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    🎯
                  </span>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                    Test Yourself
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  +{short.linked_quiz.xp || 10} XP
                </span>
              </div>

              {/* Render Existing QuizBitCard for instant quiz interaction & XP */}
              <QuizBitCard quiz={short.linked_quiz} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
