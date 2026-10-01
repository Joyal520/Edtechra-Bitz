import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Smartphone,
  CheckCircle2,
  X,
  Loader2,
  Download,
  ArrowLeft,
  Wifi,
  Copy,
  Check,
  LayoutGrid
} from 'lucide-react';
import { libraryService } from '@/services/libraryService';
import { LibraryResource, ParsedPptxDeck, PresentationSession } from '@/types/library';
import { parsePptx } from '@/utils/pptxParser';

export const PresentationViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resource, setResource] = useState<LibraryResource | null>(null);
  const [deck, setDeck] = useState<ParsedPptxDeck | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Presentation Session / Remote Controller State
  const [session, setSession] = useState<PresentationSession | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState<boolean>(false);
  const [creatingSession, setCreatingSession] = useState<boolean>(false);
  const [controllerConnected, setControllerConnected] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Thumbnail drawer toggle
  const [thumbnailsOpen, setThumbnailsOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Load resource and parse PPTX
  useEffect(() => {
    let isCancelled = false;

    async function loadPresentation() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const item = await libraryService.getResourceById(id);
        if (!item) {
          throw new Error('Presentation resource not found.');
        }
        if (isCancelled) return;
        setResource(item);

        // Fetch binary PPTX file
        const res = await fetch(item.file_url);
        if (!res.ok) {
          throw new Error(`Failed to download presentation file (Status: ${res.status})`);
        }
        const arrayBuffer = await res.arrayBuffer();
        if (isCancelled) return;

        // Parse PPTX slides
        const parsed = await parsePptx(arrayBuffer, item.title);
        if (isCancelled) return;
        setDeck(parsed);
        setCurrentSlide(1);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[PresentationViewer] Error:', err);
          setError(err.message || 'Failed to load presentation slides.');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadPresentation();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Clean up realtime subscription on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current?.unsubscribe) {
        realtimeChannelRef.current.unsubscribe();
      }
    };
  }, []);

  // Slide navigation with boundary checks
  const totalSlides = deck?.totalSlides || 1;

  const goToSlide = useCallback(
    (slideNum: number) => {
      const target = Math.max(1, Math.min(totalSlides, slideNum));
      setCurrentSlide(target);

      // Synchronize with active presentation session if connected
      if (session?.id) {
        libraryService.updatePresentationSlide(session.id, target).catch(() => {});
        if (realtimeChannelRef.current?.channel) {
          libraryService.broadcastSlideChange(realtimeChannelRef.current.channel, target).catch(() => {});
        }
      }
    },
    [session?.id, totalSlides]
  );

  const handleNext = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const handlePrev = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionModalOpen) return;

      if (e.key === 'ArrowRight' || e.key === 'Space' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, sessionModalOpen]);

  // Start or open mobile presentation controller session
  const handleStartSession = async () => {
    if (!resource || !deck) return;
    setSessionModalOpen(true);

    if (session && session.status === 'active') {
      return; // Already active
    }

    setCreatingSession(true);
    try {
      const res = await libraryService.createPresentationSession(resource.id, deck.totalSlides);
      if (res.data) {
        setSession(res.data);
        setControllerConnected(res.data.controller_connected);

        // Subscribe to realtime updates for this session
        if (realtimeChannelRef.current?.unsubscribe) {
          realtimeChannelRef.current.unsubscribe();
        }

        const sub = libraryService.subscribeToSession(res.data.id, (update) => {
          if (typeof update.current_slide === 'number' && update.current_slide > 0) {
            setCurrentSlide(update.current_slide);
          }
          if (typeof update.controller_connected === 'boolean') {
            setControllerConnected(update.controller_connected);
          }
        });
        realtimeChannelRef.current = sub;
      } else {
        alert(res.error || 'Failed to start presentation session');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating presentation session');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCopyCode = () => {
    if (!session?.session_code) return;
    navigator.clipboard.writeText(session.session_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownload = () => {
    if (!resource) return;
    const link = document.createElement('a');
    link.href = resource.file_url;
    link.download = `${resource.title}.pptx`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white p-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <h2 className="text-base sm:text-lg font-black">Loading Presentation Deck...</h2>
        <p className="text-xs text-slate-400 font-semibold">
          Extracting slides, illustrations, and notes
        </p>
      </div>
    );
  }

  if (error || !resource || !deck) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 text-white shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <Presentation className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black">Unable to Load Presentation</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'Could not parse the PowerPoint file.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <Link
              to="/library"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Back to Library
            </Link>
            {resource?.file_url && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
              >
                Download PPTX
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeSlideData = deck.slides[currentSlide - 1];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-white select-none relative overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* TOP HEADER: Branding, Status, Mobile Remote & Tools                      */}
      {/* ========================================================================= */}
      <header className="h-14 sm:h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-30">
        
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back to Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Presentation className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[180px] sm:max-w-md">
              {resource.title}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold truncate">
              <span className="text-amber-400 uppercase tracking-wider font-extrabold">Slide Deck</span>
              <span>•</span>
              <span className="truncate">{resource.subject}</span>
              <span>•</span>
              <span>{totalSlides} Slides</span>
            </div>
          </div>
        </div>

        {/* Center: Slide indicator */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/90 px-3.5 py-1.5 rounded-2xl border border-slate-700/80 text-xs font-mono font-bold">
          <span className="text-slate-400">Slide</span>
          <span className="text-amber-400 font-black">{currentSlide}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-300">{totalSlides}</span>
        </div>

        {/* Right: Controller Pairing, Thumbnails, Mode, Download, Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Mobile Controller Pairing Button */}
          <button
            type="button"
            onClick={handleStartSession}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer ${
              controllerConnected
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
            }`}
            title="Connect Phone as Remote Controller"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {controllerConnected ? 'Remote Connected' : 'Phone Remote'}
            </span>
            {session && (
              <span className="font-mono text-[10px] bg-black/25 px-1.5 py-0.5 rounded">
                {session.session_code}
              </span>
            )}
          </button>

          {/* Thumbnails Drawer Toggle */}
          <button
            type="button"
            onClick={() => setThumbnailsOpen(!thumbnailsOpen)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              thumbnailsOpen ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Slide Thumbnails"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Download Original File */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Download PPTX"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </header>

      {/* ========================================================================= */}
      {/* MAIN PRESENTATION STAGE                                                   */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full h-full flex items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden">
        
        {/* Subtle Background Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* 16:9 Presentation Canvas Container */}
        <div className="w-full max-w-5xl aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-10 md:p-12 flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle Stage Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-sky-500 opacity-80" />

          {/* Slide Header: Title & Subtitle */}
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400/90 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                Slide {currentSlide} of {totalSlides}
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              {activeSlideData?.title || `Slide ${currentSlide}`}
            </h2>

            {activeSlideData?.subtitle && (
              <p className="text-sm sm:text-base text-slate-400 font-semibold">
                {activeSlideData.subtitle}
              </p>
            )}
          </div>

          {/* Slide Body: Bullets, Content & Embedded Images */}
          <div className="my-auto py-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            
            {/* Text & Bullets Column */}
            <div className={`${activeSlideData?.images?.length ? 'md:col-span-7' : 'md:col-span-12'} space-y-4`}>
              
              {/* Bullet Points */}
              {activeSlideData?.bulletPoints && activeSlideData.bulletPoints.length > 0 && (
                <ul className="space-y-2.5">
                  {activeSlideData.bulletPoints.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                      <span className="text-sm sm:text-base md:text-lg text-slate-200 font-medium leading-relaxed">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Standard Paragraph Content */}
              {activeSlideData?.content && activeSlideData.content.length > 0 && (
                <div className="space-y-2">
                  {activeSlideData.content.map((paragraph, pIdx) => (
                    <p key={pIdx} className="text-xs sm:text-sm md:text-base text-slate-300 font-normal leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {(!activeSlideData?.bulletPoints?.length && !activeSlideData?.content?.length) && (
                <p className="text-xs text-slate-500 italic">No text content on this slide.</p>
              )}
            </div>

            {/* Embedded Graphics Column (If Slide Has Images) */}
            {activeSlideData?.images && activeSlideData.images.length > 0 && (
              <div className="md:col-span-5 flex flex-col gap-3 justify-center items-center">
                {activeSlideData.images.slice(0, 2).map((imgUrl, imgIdx) => (
                  <div key={imgIdx} className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-black/40 shadow-lg max-h-56">
                    <img
                      src={imgUrl}
                      alt={`Slide Graphic ${imgIdx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Slide Footer: Deck Title & Slide Progress Bar */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-semibold relative z-10">
            <span className="truncate max-w-xs">{resource.title}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono">{currentSlide} / {totalSlides}</span>
              <div className="w-24 sm:w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${(currentSlide / totalSlides) * 100}%` }}
                />
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* ========================================================================= */}
      {/* FLOATING PRESENTER TOOLBAR: Prev, Next & Shortcuts                       */}
      {/* ========================================================================= */}
      <footer className="h-16 sm:h-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 z-30">
        
        {/* Left: Remote Control status badge */}
        <div className="flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs">
              {controllerConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Remote Synced</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-slate-300 font-medium">Code: <strong className="font-mono text-amber-400">{session.session_code}</strong></span>
                </>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500 hidden sm:inline font-medium">
              Tip: Use Left/Right keys or Space to advance
            </span>
          )}
        </div>

        {/* Center: Large Prev & Next Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide <= 1}
            className="flex items-center gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs sm:text-sm font-black border border-slate-700 transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-mono font-bold text-slate-400 px-2">
            {currentSlide} / {totalSlides}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlide >= totalSlides}
            className="flex items-center gap-1.5 px-5 sm:px-7 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-amber-500 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick Jump */}
        <div className="flex items-center gap-2">
          <select
            value={currentSlide}
            onChange={(e) => goToSlide(parseInt(e.target.value, 10))}
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            {deck.slides.map((s) => (
              <option key={s.slideNumber} value={s.slideNumber}>
                Slide {s.slideNumber}
              </option>
            ))}
          </select>
        </div>

      </footer>

      {/* ========================================================================= */}
      {/* SLIDE THUMBNAIL DRAWER                                                    */}
      {/* ========================================================================= */}
      {thumbnailsOpen && (
        <div className="absolute right-0 top-16 bottom-20 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-4 overflow-y-auto z-40 animate-in slide-in-from-right duration-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Slide Overview ({totalSlides})
            </span>
            <button
              type="button"
              onClick={() => setThumbnailsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {deck.slides.map((slide) => (
              <div
                key={slide.slideNumber}
                onClick={() => {
                  goToSlide(slide.slideNumber);
                  setThumbnailsOpen(false);
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                  slide.slideNumber === currentSlide
                    ? 'bg-amber-500/15 border-amber-400 text-white shadow-xs'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-amber-400">
                    Slide {slide.slideNumber}
                  </span>
                  {slide.slideNumber === currentSlide && (
                    <span className="text-[9px] font-black uppercase bg-amber-500 text-white px-1.5 py-0.2 rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold line-clamp-1">{slide.title}</div>
                {slide.bulletPoints?.length > 0 && (
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    • {slide.bulletPoints[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE REMOTE CONTROL PAIRING MODAL                                       */}
      {/* ========================================================================= */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center relative animate-in zoom-in-95 duration-150">
            
            <button
              type="button"
              onClick={() => setSessionModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white">Mobile Presentation Remote</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Control this presentation wirelessly from your smartphone while speaking.
              </p>
            </div>

            {/* 6-Digit Session Code Banner */}
            {creatingSession ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs font-bold text-slate-400">Generating secure session code...</span>
              </div>
            ) : session ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    6-Digit Remote Control Code
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-amber-400">
                      {session.session_code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-left bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span>Open EdTechra on your smartphone</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      2
                    </span>
                    <span>Navigate to <strong className="text-amber-400 font-mono">/library/controller</strong></span>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      3
                    </span>
                    <span>Enter code <strong className="text-amber-400 font-mono">{session.session_code}</strong> to begin controlling</span>
                  </div>
                </div>

                {/* Live Connection Status */}
                <div className="flex items-center justify-center gap-2 text-xs font-bold pt-1">
                  {controllerConnected ? (
                    <div className="inline-flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Phone Connected! You can now control slides.</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-amber-400 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Waiting for phone controller to connect...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSessionModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Dismiss & Continue Presentation
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
