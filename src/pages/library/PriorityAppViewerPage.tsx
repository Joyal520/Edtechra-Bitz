import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  RefreshCw,
  Home,
  BookOpen,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePriorityApp } from '@/context/PriorityAppContext';
import { priorityAppService } from '@/services/priorityAppService';
import type { LibraryResource } from '@/types/library';
import { getNormalizedFileType, getNormalizedTrainingFormat } from '@/types/library';
import { setPriorityBypass } from '@/utils/priorityApp';

function resolveMediaRenderMode(app: LibraryResource): {
  kind: 'video_tag' | 'iframe' | 'pdf_iframe';
  src: string;
  useSandbox: boolean;
} {
  const rawUrl = (app.file_url || '').trim();
  const lower = rawUrl.toLowerCase();
  const normalizedType = getNormalizedFileType(app);

  if (normalizedType === 'training') {
    const fmt = getNormalizedTrainingFormat(app);
    if (
      fmt === 'video' &&
      (lower.endsWith('.mp4') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.m4v'))
    ) {
      return { kind: 'video_tag', src: rawUrl, useSandbox: false };
    }

    if (fmt === 'video') {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.hostname.includes('youtube.com')) {
          const v = parsed.searchParams.get('v');
          if (v) return { kind: 'iframe', src: `https://www.youtube.com/embed/${v}?rel=0`, useSandbox: false };
          if (parsed.pathname.startsWith('/shorts/')) {
            const id = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
            if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}?rel=0`, useSandbox: false };
          }
        }
        if (parsed.hostname === 'youtu.be') {
          const id = parsed.pathname.replace(/^\//, '').split('/')[0];
          if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}?rel=0`, useSandbox: false };
        }
        if (parsed.hostname.includes('vimeo.com') && !parsed.hostname.includes('player.vimeo.com')) {
          const id = parsed.pathname.replace(/^\//, '').split('/')[0];
          if (id && /^\d+$/.test(id)) {
            return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}`, useSandbox: false };
          }
        }
      } catch {
        // Fallback to standard iframe
      }
    }

    if (fmt === 'pdf') {
      return { kind: 'pdf_iframe', src: rawUrl, useSandbox: false };
    }
  }

  if (normalizedType === 'pdf') {
    return { kind: 'pdf_iframe', src: rawUrl, useSandbox: false };
  }

  return { kind: 'iframe', src: rawUrl, useSandbox: true };
}

export const PriorityAppViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const {
    preference,
    isUpdating,
    toggleAutoLaunch,
    removePriorityApp,
    refreshPreference,
    setFallbackNotice
  } = usePriorityApp();

  const [app, setApp] = useState<LibraryResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showSlowBanner, setShowSlowBanner] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validate & resolve app server-side on mount or id change
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      openAuthModal('login', { type: 'navigate', path: `/library/app/${id}` });
      return;
    }
    if (!id) {
      setPriorityBypass();
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setIframeLoaded(false);
    setShowSlowBanner(false);

    priorityAppService
      .resolveAppForLaunch(id, 5500)
      .then((resolved) => {
        if (cancelled) return;
        if (resolved.launchType === 'presentation') {
          navigate(`/library/present/${resolved.app.id}?from=priority`, { replace: true });
          return;
        }
        if (resolved.launchType === 'internal') {
          navigate(resolved.app.file_url, { replace: true });
          return;
        }
        setApp(resolved.app);
        setLoading(false);
      })
      .catch(async (err: any) => {
        if (cancelled) return;
        setPriorityBypass();
        await refreshPreference().catch(() => null);
        setFallbackNotice(err?.message || 'Your Priority App is unavailable. Returning to EdTechra Home.');
        navigate('/', { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [id, authLoading, isAuthenticated, navigate, openAuthModal, refreshPreference, setFallbackNotice]);

  // Detect slow loading or X-Frame-Options blocked embeds
  useEffect(() => {
    if (loading || !app || iframeLoaded) return;
    const timer = setTimeout(() => {
      setShowSlowBanner(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading, app, iframeLoaded, iframeKey]);

  const handleExploreEdTechra = () => {
    setPriorityBypass();
    setMenuOpen(false);
    navigate('/');
  };

  const handleGoToLibrary = (selectPriority = false) => {
    setPriorityBypass();
    setMenuOpen(false);
    navigate(selectPriority ? '/library?selectPriority=1' : '/library');
  };

  const handleToggleAutoLaunch = async () => {
    if (!preference) return;
    try {
      const nextState = !preference.enabled;
      await toggleAutoLaunch(nextState);
      setStatusToast(nextState ? 'Auto-launch enabled.' : 'Auto-launch paused.');
      setTimeout(() => setStatusToast(null), 2500);
    } catch (err: any) {
      setStatusToast(err?.message || 'Unable to update setting.');
      setTimeout(() => setStatusToast(null), 3000);
    } finally {
      setMenuOpen(false);
    }
  };

  const handleRemovePriority = async () => {
    try {
      await removePriorityApp();
      setStatusToast('Priority App removed.');
      setTimeout(() => setStatusToast(null), 2500);
    } catch (err: any) {
      setStatusToast(err?.message || 'Unable to remove Priority App.');
      setTimeout(() => setStatusToast(null), 3000);
    } finally {
      setMenuOpen(false);
    }
  };

  if (loading || !app) {
    return (
      <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#026fc3]" />
        <div className="space-y-1">
          <p className="text-sm font-black">Launching Priority App...</p>
          <p className="text-xs text-slate-400">Verifying access and loading workspace</p>
        </div>
        <button
          type="button"
          onClick={handleExploreEdTechra}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-white cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Explore EdTechra</span>
        </button>
      </div>
    );
  }

  const isCurrentPriority = preference?.priority_app_id === app.id;
  const media = resolveMediaRenderMode(app);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 text-white overflow-hidden">
      {/* Slim Non-Overlapping Top Navigation Bar */}
      <header className="h-12 sm:h-14 bg-[#071a2f] border-b border-slate-800 px-2.5 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleExploreEdTechra}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Explore EdTechra</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] sm:max-w-sm md:max-w-md">
              {app.title}
            </h1>
            {isCurrentPriority && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-black shrink-0">
                <Star className="w-3 h-3 fill-amber-300" />
                <span>{preference?.enabled ? 'Priority App' : 'Priority (Paused)'}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={app.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in Tab</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setIframeLoaded(false);
              setShowSlowBanner(false);
              setIframeKey((k) => k + 1);
            }}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Reload application"
            aria-label="Reload application"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Priority App Options Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              aria-label="Priority App Menu"
            >
              <MoreVertical className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  type="button"
                  onClick={handleExploreEdTechra}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#026fc3] flex items-center gap-2.5 cursor-pointer"
                >
                  <Home className="w-4 h-4 text-slate-400" />
                  <span>EdTechra Home</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoToLibrary(false)}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#026fc3] flex items-center gap-2.5 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <span>App Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoToLibrary(true)}
                  className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#026fc3] flex items-center gap-2.5 cursor-pointer"
                >
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Change Priority App</span>
                </button>

                {isCurrentPriority && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleToggleAutoLaunch}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                    >
                      {preference?.enabled ? (
                        <>
                          <Pause className="w-4 h-4 text-amber-600" />
                          <span>Pause Auto-Launch</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-emerald-600" />
                          <span>Enable Auto-Launch</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleRemovePriority}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Priority App</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Isolated App Viewport */}
      <div className="flex-1 min-h-0 w-full relative bg-white overflow-hidden">
        {media.kind === 'video_tag' ? (
          <video
            key={iframeKey}
            src={media.src}
            controls
            autoPlay
            onLoadedData={() => setIframeLoaded(true)}
            className="w-full h-full object-contain bg-black"
          />
        ) : media.kind === 'pdf_iframe' ? (
          <iframe
            key={iframeKey}
            src={media.src}
            title={app.title}
            onLoad={() => {
              setIframeLoaded(true);
              setShowSlowBanner(false);
            }}
            className="w-full h-full border-0 bg-slate-900"
          />
        ) : (
          <iframe
            key={iframeKey}
            src={media.src}
            title={app.title}
            sandbox={media.useSandbox ? 'allow-scripts allow-same-origin allow-popups allow-forms' : undefined}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            onLoad={() => {
              setIframeLoaded(true);
              setShowSlowBanner(false);
            }}
            className="w-full h-full border-0 bg-white"
          />
        )}

        {/* Loading indicator while iframe initializes */}
        {!iframeLoaded && media.kind !== 'video_tag' && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <Loader2 className="w-7 h-7 animate-spin text-sky-400 mb-2" />
            <p className="text-xs font-bold text-slate-200">Loading {app.title}...</p>
          </div>
        )}

        {/* Slow / Blocked Frame Fallback Banner */}
        {showSlowBanner && !iframeLoaded && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md bg-slate-900/95 text-white rounded-2xl p-4 border border-amber-400/40 shadow-2xl space-y-2.5 z-20">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-black text-white">Taking longer than expected?</p>
                <p className="text-slate-300 mt-0.5">
                  Some external apps restrict embedded views. You can open it directly in a new tab or return to EdTechra.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={app.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowSlowBanner(false);
                  setIframeKey((k) => k + 1);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Reload App
              </button>
              <button
                type="button"
                onClick={handleExploreEdTechra}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Explore EdTechra
              </button>
            </div>
          </div>
        )}

        {statusToast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 z-30">
            {statusToast}
          </div>
        )}
      </div>
    </div>
  );
};
