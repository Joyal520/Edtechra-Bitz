import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Smartphone,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { libraryService } from '@/services/libraryService';
import { PresentationSession } from '@/types/library';

export const MobileControllerPage: React.FC = () => {
  const { code: routeCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCode = routeCode || searchParams.get('code') || '';
  const [sessionCode, setSessionCode] = useState<string>(initialCode);
  const [session, setSession] = useState<PresentationSession | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [totalSlides, setTotalSlides] = useState<number>(1);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const realtimeChannelRef = useRef<any>(null);

  // Auto-connect if 6-digit code is provided in URL
  useEffect(() => {
    if (initialCode && initialCode.trim().length === 6 && !session) {
      handleConnect(initialCode.trim());
    }
  }, [initialCode]);

  // Clean up realtime subscription on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current?.unsubscribe) {
        realtimeChannelRef.current.unsubscribe();
      }
    };
  }, []);

  const handleConnect = async (codeToUse?: string) => {
    const code = (codeToUse || sessionCode).trim();
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Please enter a valid 6-digit numeric session code.');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const res = await libraryService.getPresentationSessionByCode(code);
      if (res.data) {
        const found = res.data;
        setSession(found);
        setCurrentSlide(found.current_slide || 1);
        setTotalSlides(found.total_slides || 1);
        setIsConnected(true);

        // Mark controller connected
        await libraryService.markControllerConnected(found.id, true);

        // Subscribe to realtime updates for this presentation session
        if (realtimeChannelRef.current?.unsubscribe) {
          realtimeChannelRef.current.unsubscribe();
        }

        const sub = libraryService.subscribeToSession(found.id, (update) => {
          if (typeof update.current_slide === 'number' && update.current_slide > 0) {
            setCurrentSlide(update.current_slide);
          }
          if (update.status === 'ended' || update.status === 'expired') {
            setIsConnected(false);
            setError('This presentation session has ended.');
          }
        });
        realtimeChannelRef.current = sub;

        // Broadcast controller joined signal
        if (sub.channel) {
          libraryService.broadcastControllerJoined(sub.channel).catch(() => {});
        }

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([40, 60, 40]);
        }
      } else {
        setError(res.error || 'Invalid or expired session code.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSlideChange = useCallback(
    async (targetSlide: number) => {
      if (!session || !isConnected) return;
      const bounded = Math.max(1, Math.min(totalSlides, targetSlide));
      if (bounded === currentSlide) return;

      // Optimistic state update
      setCurrentSlide(bounded);

      // Haptic touch feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(35);
      }

      try {
        // Broadcast instant update to presenter screen
        if (realtimeChannelRef.current?.channel) {
          await libraryService.broadcastSlideChange(realtimeChannelRef.current.channel, bounded);
        }
        // Update persistent session state in Supabase
        await libraryService.updatePresentationSlide(session.id, bounded);
      } catch (err) {
        console.warn('[MobileController] Slide update error:', err);
      }
    },
    [session, isConnected, totalSlides, currentSlide]
  );

  const handleDisconnect = async () => {
    if (session) {
      await libraryService.markControllerConnected(session.id, false).catch(() => {});
    }
    if (realtimeChannelRef.current?.unsubscribe) {
      realtimeChannelRef.current.unsubscribe();
    }
    setSession(null);
    setIsConnected(false);
    setSessionCode('');
  };

  // =========================================================================
  // VIEW 1: Connect / Enter Code Screen
  // =========================================================================
  if (!isConnected || !session) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-amber-500">
        
        {/* Top Header */}
        <header className="flex items-center justify-between py-2">
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Library</span>
          </button>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">
            EdTechra Mobile Remote
          </span>
        </header>

        {/* Center Card */}
        <div className="max-w-sm w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
          
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
            <Smartphone className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-white">Presentation Remote</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter the 6-digit numeric code displayed on your presentation screen.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-400 text-xs font-semibold text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 6-Digit Code Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConnect();
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={sessionCode}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setSessionCode(cleaned);
                  if (cleaned.length === 6) {
                    handleConnect(cleaned);
                  }
                }}
                placeholder="• • • • • •"
                className="w-full py-4 text-center bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl font-mono text-3xl font-black tracking-widest text-amber-400 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={connecting || sessionCode.length !== 6}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-sm font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:hover:bg-amber-500 flex items-center justify-center gap-2 cursor-pointer"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Connect Controller</span>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <footer className="py-4 text-center text-xs text-slate-600 font-semibold">
          EdTechra Realtime Presentation Sync
        </footer>

      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Active Controller Pad Screen
  // =========================================================================
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none touch-manipulation">
      
      {/* Top Header: Session & Status */}
      <header className="flex items-center justify-between py-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black text-emerald-400">Live Connected</span>
          <span className="font-mono text-xs text-slate-500">#{session.session_code}</span>
        </div>

        <button
          type="button"
          onClick={handleDisconnect}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-400 py-1 px-2 rounded-lg hover:bg-slate-900 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </header>

      {/* Main Controller Stage */}
      <div className="flex-1 flex flex-col justify-around py-4 max-w-md w-full mx-auto space-y-6">
        
        {/* Presentation Metadata */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            {session.resource?.subject || 'Presentation'}
          </span>
          <h2 className="text-base sm:text-lg font-black text-white line-clamp-1">
            {session.resource?.title || 'PowerPoint Presentation'}
          </h2>
        </div>

        {/* Big Slide Counter Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3 shadow-xl">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Current Slide
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl sm:text-6xl font-black text-white font-mono tracking-tight">
              {currentSlide}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-600 font-mono">
              / {totalSlides}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(currentSlide / totalSlides) * 100}%` }}
            />
          </div>
        </div>

        {/* GIANT TOUCH CONTROL BUTTONS */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 h-44 sm:h-52">
          
          {/* PREVIOUS BUTTON */}
          <button
            type="button"
            onClick={() => handleSlideChange(currentSlide - 1)}
            disabled={currentSlide <= 1}
            className="flex flex-col items-center justify-center gap-2 bg-slate-900 active:bg-slate-800 border-2 border-slate-800 active:border-slate-700 text-white rounded-3xl p-4 shadow-xl transition-transform active:scale-95 disabled:opacity-25 disabled:active:scale-100 cursor-pointer"
          >
            <ChevronLeft className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 stroke-[2.5]" />
            <span className="text-sm sm:text-base font-black uppercase tracking-wider">
              Previous
            </span>
          </button>

          {/* NEXT BUTTON */}
          <button
            type="button"
            onClick={() => handleSlideChange(currentSlide + 1)}
            disabled={currentSlide >= totalSlides}
            className="flex flex-col items-center justify-center gap-2 bg-gradient-to-tr from-amber-500 to-amber-400 active:from-amber-600 active:to-amber-500 text-slate-950 rounded-3xl p-4 shadow-xl shadow-amber-500/20 transition-transform active:scale-95 disabled:opacity-25 disabled:active:scale-100 cursor-pointer"
          >
            <ChevronRight className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950 stroke-[3]" />
            <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-950">
              Next Slide
            </span>
          </button>

        </div>

        {/* Quick Slide Jump Dropdown */}
        <div className="flex items-center justify-center gap-2">
          <label className="text-xs font-bold text-slate-400">Jump to:</label>
          <select
            value={currentSlide}
            onChange={(e) => handleSlideChange(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {Array.from({ length: totalSlides }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                Slide {num}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Footer Info */}
      <footer className="text-center py-2 text-[11px] text-slate-600 font-semibold shrink-0">
        Tap Next or Previous to instantly synchronize presenter screen
      </footer>

    </div>
  );
};
