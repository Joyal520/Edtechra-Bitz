import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Globe,
  ExternalLink,
  BookOpen,
  Share2,
  Check
} from 'lucide-react';
import { LibraryResource } from '@/types/library';

interface WebBlogViewerModalProps {
  isOpen: boolean;
  resource: LibraryResource | null;
  onClose: () => void;
}

export const WebBlogViewerModal: React.FC<WebBlogViewerModalProps> = ({
  isOpen,
  resource,
  onClose
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(resource.file_url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full h-full flex flex-col bg-slate-900 text-white overflow-hidden shadow-2xl">
        
        {/* ========================================================================= */}
        {/* TOP TOOLBAR: Controls & Web / Blog Header                                 */}
        {/* ========================================================================= */}
        <header className="h-14 sm:h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          
          {/* Left: Document info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-md">
                {resource.title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold truncate">
                <span className="text-emerald-400 uppercase tracking-wider font-extrabold">Web / Blog</span>
                <span>•</span>
                <span className="truncate">{resource.subject}</span>
                {resource.category && resource.category !== 'Web / Blogs' && (
                  <>
                    <span>•</span>
                    <span className="truncate text-slate-400">{resource.category}</span>
                  </>
                )}
                {resource.author && (
                  <>
                    <span>•</span>
                    <span className="truncate text-slate-400">{resource.author}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Share / Copy Link */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Copy public link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {/* Open in New Tab */}
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Open full page in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Tab</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </header>

        {/* ========================================================================= */}
        {/* WEB / BLOG IFRAME VIEWPORT                                                */}
        {/* ========================================================================= */}
        <div className="flex-1 w-full h-full bg-white relative overflow-hidden flex items-center justify-center">
          <iframe
            src={resource.file_url}
            title={resource.title}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="w-full h-full border-0 bg-white"
          />

          {/* Floating link overlay for fallback */}
          <div className="absolute bottom-4 right-4 pointer-events-auto">
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-black shadow-lg backdrop-blur-md transition-all opacity-80 hover:opacity-100"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Page View</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
