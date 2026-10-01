import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  FileText,
  ExternalLink
} from 'lucide-react';
import { LibraryResource } from '@/types/library';

interface PdfViewerModalProps {
  isOpen: boolean;
  resource: LibraryResource | null;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  resource,
  onClose
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setZoomLevel(100);
    }
  }, [isOpen, resource?.id]);

  // Keyboard navigation: Escape closes modal, Left/Right changes page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(250, prev + 25));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(50, prev - 25));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resource.file_url;
    link.download = `${resource.title}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build PDF viewer URL with page & zoom fragments
  const viewerUrl = `${resource.file_url}#page=${currentPage}&zoom=${zoomLevel}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full h-full flex flex-col bg-slate-900 text-white overflow-hidden shadow-2xl">
        
        {/* ========================================================================= */}
        {/* TOP TOOLBAR: Controls & EdTechra Interface Header                        */}
        {/* ========================================================================= */}
        <header className="h-14 sm:h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          
          {/* Left: Document info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-md">
                {resource.title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold truncate">
                <span className="text-rose-400 uppercase tracking-wider font-extrabold">PDF Document</span>
                <span>•</span>
                <span className="truncate">{resource.subject}</span>
                {resource.author && (
                  <>
                    <span>•</span>
                    <span className="truncate">{resource.author}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center: Page Navigation & Zoom Controls (Hidden on very small screens, visible on tablet/desktop) */}
          <div className="hidden md:flex items-center gap-4 bg-slate-800/90 px-4 py-1.5 rounded-2xl border border-slate-700/80 shadow-inner">
            
            {/* Page Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-300">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) setCurrentPage(val);
                  }}
                  className="w-12 px-1.5 py-0.5 text-center bg-slate-900 border border-slate-700 rounded-md text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#026fc3]"
                />
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                title="Next Page (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-4 bg-slate-700" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-0.5 rounded-md text-xs font-mono font-bold text-slate-300 hover:bg-slate-700 cursor-pointer"
                title="Reset Zoom to 100%"
              >
                {zoomLevel}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 250}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Right: Download, Fullscreen & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

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

        {/* Mobile secondary toolbar for page navigation */}
        <div className="flex md:hidden items-center justify-between px-4 py-2 bg-slate-850 border-b border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 bg-slate-800 rounded-lg disabled:opacity-30"
            >
              ◀ Prev
            </button>
            <span className="font-mono font-bold">Page {currentPage}</span>
            <button
              type="button"
              onClick={handleNextPage}
              className="px-2.5 py-1 bg-slate-800 rounded-lg"
            >
              Next ▶
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleZoomOut} className="p-1 bg-slate-800 rounded">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1">{zoomLevel}%</span>
            <button onClick={handleZoomIn} className="p-1 bg-slate-800 rounded">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PDF VIEWPORT                                                              */}
        {/* ========================================================================= */}
        <div className="flex-1 w-full h-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
          <iframe
            src={viewerUrl}
            title={resource.title}
            className="w-full h-full border-0 bg-slate-900"
            style={{
              transformOrigin: 'top center'
            }}
          />

          {/* Fallback floating button if iframe rendering is blocked in certain mobile browsers */}
          <div className="absolute bottom-4 right-4 pointer-events-auto">
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-black shadow-lg backdrop-blur-md transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#026fc3]" />
              <span>Open in New Tab</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
