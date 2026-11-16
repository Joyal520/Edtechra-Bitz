import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  GraduationCap,
  Clock,
  User,
  BarChart3
} from 'lucide-react';
import { LibraryResource, getNormalizedTrainingFormat } from '@/types/library';

interface TrainingViewerModalProps {
  isOpen: boolean;
  resource: LibraryResource | null;
  onClose: () => void;
}

function getEmbedUrl(rawUrl: string): { kind: 'video_tag' | 'iframe'; src: string } {
  const url = (rawUrl || '').trim();
  const lower = url.toLowerCase();

  // Direct HTML5 video file
  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v')
  ) {
    return { kind: 'video_tag', src: url };
  }

  // YouTube
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return { kind: 'iframe', src: `https://www.youtube.com/embed/${v}?rel=0` };
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
        if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}?rel=0` };
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return { kind: 'iframe', src: url };
      }
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}?rel=0` };
    }
    if (parsed.hostname.includes('vimeo.com') && !parsed.hostname.includes('player.vimeo.com')) {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (id && /^\d+$/.test(id)) {
        return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` };
      }
    }
  } catch {
    // Fallback to raw URL iframe
  }

  return { kind: 'iframe', src: url };
}

export const TrainingViewerModal: React.FC<TrainingViewerModalProps> = ({
  isOpen,
  resource,
  onClose
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  const format = getNormalizedTrainingFormat(resource);
  const instructor = resource.instructor || resource.author || resource.uploader?.full_name || 'EdTechra Faculty';
  const difficulty = resource.difficulty || 'Beginner';
  const duration = resource.duration || 'Self-paced';
  const embed = getEmbedUrl(resource.file_url);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full h-full flex flex-col bg-slate-900 text-white overflow-hidden shadow-2xl">
        {/* Top Toolbar */}
        <header className="h-14 sm:h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-[180px] sm:max-w-md">
                {resource.title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold truncate">
                <span className="text-teal-400 uppercase tracking-wider font-extrabold">
                  {format === 'video' ? 'Video Training' : 'Interactive Tutorial'}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" /> {instructor}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline-flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> {difficulty}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {duration}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black transition-all"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in New Tab</span>
            </a>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Viewer */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
          {embed.kind === 'video_tag' ? (
            <video
              src={embed.src}
              controls
              autoPlay
              className="w-full h-full max-h-full object-contain bg-black"
            />
          ) : (
            <iframe
              src={embed.src}
              title={resource.title}
              className="w-full h-full border-0 bg-white"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
};
