// ============================================================================
// EDTECHRA COURSE STUDIO: TRACKED VIDEO PLAYER (ENGINE-LEVEL ENFORCEMENT)
// Supports YouTube IFrame API & HTML5 <video> with:
//   - Segment-tracked playback progress (requires >= 90% watched duration)
//   - Anti-skip seek enforcement (snaps back if seeking to unwatched sections)
//   - Automatic pause & tracking suspension when browser tab is hidden
//   - Cross-session persistence (localStorage + backend sync)
//   - Clear completion indicator & assessment unlock callback
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, Lock, AlertTriangle, PauseCircle, Play } from 'lucide-react';
import {
  VIDEO_COMPLETION_THRESHOLD_PERCENT,
  VideoProgressState,
  createInitialVideoProgressState,
  processVideoPlaybackTick,
  loadLocalVideoProgress,
  saveLocalVideoProgress,
  extractYouTubeId,
  formatSecondsAsTime
} from '@/utils/videoCompletionTracker';
import { courseStudioService } from '@/services/courseStudioService';

export interface TrackedCourseVideoPlayerProps {
  url: string;
  title?: string;
  courseId: string;
  episodeId: string;
  classroomId?: string | null;
  videoKey?: string;
  userId?: string | null;
  initialProgress?: Partial<VideoProgressState> | null;
  isDark?: boolean;
  aspectClassName?: string;
  estimatedDurationSeconds?: number;
  onProgressUpdate?: (state: VideoProgressState) => void;
  onVideoCompleted?: (state: VideoProgressState) => void;
}

export const TrackedCourseVideoPlayer: React.FC<TrackedCourseVideoPlayerProps> = ({
  url,
  title = 'Lesson Video',
  courseId,
  episodeId,
  classroomId = null,
  videoKey: propVideoKey,
  userId = null,
  initialProgress = null,
  isDark = false,
  aspectClassName = 'aspect-video',
  estimatedDurationSeconds = 180,
  onProgressUpdate,
  onVideoCompleted
}) => {
  const youtubeId = extractYouTubeId(url);
  const effectiveVideoKey = propVideoKey || youtubeId || 'default';

  const [progressState, setProgressState] = useState<VideoProgressState>(() => {
    const local = loadLocalVideoProgress(courseId, episodeId, effectiveVideoKey, userId);
    const base = createInitialVideoProgressState({
      courseId,
      episodeId,
      videoKey: effectiveVideoKey,
      durationSeconds: local?.durationSeconds || initialProgress?.durationSeconds || estimatedDurationSeconds
    });

    if (local && initialProgress) {
      const useLocal = (local.watchedPercent || 0) >= (initialProgress.watchedPercent || 0);
      const chosen = useLocal ? local : { ...base, ...initialProgress };
      return {
        ...base,
        ...chosen,
        isCompleted: Boolean(local.isCompleted || initialProgress.isCompleted || (chosen.watchedPercent || 0) >= VIDEO_COMPLETION_THRESHOLD_PERCENT)
      };
    }
    if (local) return local;
    if (initialProgress) {
      return {
        ...base,
        ...initialProgress,
        isCompleted: Boolean(initialProgress.isCompleted || (initialProgress.watchedPercent || 0) >= VIDEO_COMPLETION_THRESHOLD_PERCENT)
      };
    }
    return base;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [seekWarning, setSeekWarning] = useState<string | null>(null);
  const [visibilityNotice, setVisibilityNotice] = useState<boolean>(false);
  const [embedHost, setEmbedHost] = useState<'www.youtube-nocookie.com' | 'youtube.com'>('www.youtube-nocookie.com');
  const [embedRetryKey, setEmbedRetryKey] = useState<number>(0);

  const stateRef = useRef<VideoProgressState>(progressState);
  stateRef.current = progressState;

  const lastTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isTabVisibleRef = useRef<boolean>(isTabVisible);
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialize state if episodeId or videoKey changes
  useEffect(() => {
    const local = loadLocalVideoProgress(courseId, episodeId, effectiveVideoKey, userId);
    const next =
      local ||
      createInitialVideoProgressState({
        courseId,
        episodeId,
        videoKey: effectiveVideoKey,
        durationSeconds: estimatedDurationSeconds
      });
    stateRef.current = next;
    lastTimeRef.current = next.maxAllowedPosition || 0;
    setProgressState(next);
    setSeekWarning(null);
    setVisibilityNotice(false);
    onProgressUpdate?.(next);
    if (next.isCompleted) {
      onVideoCompleted?.(next);
    }
  }, [courseId, episodeId, effectiveVideoKey, userId]);

  const syncToServer = useCallback(
    (nextState: VideoProgressState, immediate = false) => {
      saveLocalVideoProgress(nextState, userId);

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      const executeSync = () => {
        courseStudioService
          .saveVideoProgress({
            course_id: courseId,
            classroom_id: classroomId || undefined,
            episode_id: episodeId,
            video_key: effectiveVideoKey,
            watched_seconds: nextState.watchedSeconds,
            duration_seconds: nextState.durationSeconds,
            watched_percent: nextState.watchedPercent,
            watched_segments: nextState.watchedSegments,
            max_allowed_position: nextState.maxAllowedPosition,
            is_completed: nextState.isCompleted
          })
          .catch(() => {
            // Non-blocking: localStorage retains full state if offline or in preview mode
          });
      };

      if (immediate) {
        executeSync();
      } else {
        syncTimeoutRef.current = setTimeout(executeSync, 2500);
      }
    },
    [courseId, classroomId, episodeId, effectiveVideoKey, userId]
  );

  const showSeekBlockedBanner = useCallback((snapBackTime: number) => {
    if (seekWarningTimeoutRef.current) {
      clearTimeout(seekWarningTimeoutRef.current);
    }
    setSeekWarning(
      `Skipping ahead to unwatched sections is disabled. Returned to ${formatSecondsAsTime(snapBackTime)}.`
    );
    seekWarningTimeoutRef.current = setTimeout(() => {
      setSeekWarning(null);
    }, 4500);
  }, []);

  const pauseActivePlayer = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);

    if (htmlVideoRef.current && !htmlVideoRef.current.paused) {
      try {
        htmlVideoRef.current.pause();
      } catch {
        // Ignore
      }
    }

    if (ytIframeRef.current?.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      } catch {
        // Ignore
      }
    }
  }, []);

  const seekPlayerTo = useCallback((targetSeconds: number) => {
    const safeTarget = Math.max(0, Number(targetSeconds) || 0);
    lastTimeRef.current = safeTarget;

    if (htmlVideoRef.current) {
      try {
        htmlVideoRef.current.currentTime = safeTarget;
      } catch {
        // Ignore
      }
    }

    if (ytIframeRef.current?.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [safeTarget, true] }),
          '*'
        );
      } catch {
        // Ignore
      }
    }
  }, []);

  const applyPlaybackTick = useCallback(
    (params: {
      currentTime: number;
      previousTime?: number;
      durationSeconds?: number;
      isPlaying?: boolean;
      isTabVisible?: boolean;
    }) => {
      const currentTabVisible =
        params.isTabVisible !== undefined ? params.isTabVisible : isTabVisibleRef.current;
      const currentPlaying =
        params.isPlaying !== undefined ? params.isPlaying : isPlayingRef.current;
      const prevTime =
        params.previousTime !== undefined ? params.previousTime : lastTimeRef.current;
      const duration =
        params.durationSeconds || stateRef.current.durationSeconds || estimatedDurationSeconds;

      const result = processVideoPlaybackTick(stateRef.current, {
        currentTime: params.currentTime,
        previousTime: prevTime,
        durationSeconds: duration,
        isPlaying: currentPlaying,
        isTabVisible: currentTabVisible
      });

      if (result.pausedByVisibility) {
        setVisibilityNotice(true);
        pauseActivePlayer();
        return result;
      }

      if (result.seekBlocked) {
        showSeekBlockedBanner(result.snapBackTime);
        seekPlayerTo(result.snapBackTime);
        return result;
      }

      lastTimeRef.current = params.currentTime;
      stateRef.current = result.nextState;
      setProgressState(result.nextState);
      onProgressUpdate?.(result.nextState);

      if (result.justCompleted) {
        onVideoCompleted?.(result.nextState);
        syncToServer(result.nextState, true);
      } else if (result.nextState.watchedSeconds !== progressState.watchedSeconds) {
        syncToServer(result.nextState, false);
      }

      return result;
    },
    [
      estimatedDurationSeconds,
      onProgressUpdate,
      onVideoCompleted,
      pauseActivePlayer,
      progressState.watchedSeconds,
      seekPlayerTo,
      showSeekBlockedBanner,
      syncToServer
    ]
  );

  // 1. Visibility change & window blur enforcement (pause tracking & video when tab hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      isTabVisibleRef.current = visible;
      setIsTabVisible(visible);

      if (!visible) {
        if (isPlayingRef.current) {
          setVisibilityNotice(true);
        }
        pauseActivePlayer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseActivePlayer]);

  // 2. YouTube IFrame postMessage bridge for real-time currentTime, duration & playerState
  useEffect(() => {
    if (!youtubeId) return;

    const sendListeningHandshake = () => {
      if (!ytIframeRef.current?.contentWindow) return;
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: `yt_${effectiveVideoKey}`, channel: 'widget' }),
          '*'
        );
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'addEventListener',
            args: ['onStateChange']
          }),
          '*'
        );
      } catch {
        // Ignore cross-origin init errors
      }
    };

    const handshakeInterval = setInterval(sendListeningHandshake, 1500);

    // Detect when student clicks inside the YouTube iframe to play the video
    const handleWindowBlur = () => {
      if (
        !document.hidden &&
        ytIframeRef.current &&
        document.activeElement === ytIframeRef.current
      ) {
        sendListeningHandshake();
        if (!isPlayingRef.current) {
          isPlayingRef.current = true;
          setIsPlaying(true);
          setVisibilityNotice(false);
        }
      }
    };

    const handleYouTubeMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      if (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com')) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (!data) return;

        if (data.event === 'infoDelivery' && data.info) {
          const info = data.info;

          if (typeof info.playerState === 'number') {
            const playingNow = info.playerState === 1;
            isPlayingRef.current = playingNow;
            setIsPlaying(playingNow);
            if (playingNow && !document.hidden) {
              setVisibilityNotice(false);
            }
            if (playingNow && document.hidden) {
              pauseActivePlayer();
              return;
            }
          }

          const reportedDuration =
            typeof info.duration === 'number' && info.duration > 0
              ? info.duration
              : stateRef.current.durationSeconds || estimatedDurationSeconds;

          if (typeof info.currentTime === 'number') {
            applyPlaybackTick({
              currentTime: info.currentTime,
              durationSeconds: reportedDuration,
              isPlaying: isPlayingRef.current,
              isTabVisible: !document.hidden
            });
          }
        } else if (data.event === 'onStateChange' && typeof data.info === 'number') {
          const playingNow = data.info === 1;
          isPlayingRef.current = playingNow;
          setIsPlaying(playingNow);
          if (playingNow && document.hidden) {
            pauseActivePlayer();
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      clearInterval(handshakeInterval);
      window.removeEventListener('message', handleYouTubeMessage);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [youtubeId, effectiveVideoKey, estimatedDurationSeconds, applyPlaybackTick, pauseActivePlayer]);

  // 3. Fallback timer for YouTube embed when playing (in case browser blocks third-party infoDelivery ticks)
  useEffect(() => {
    if (!youtubeId || !isPlaying || !isTabVisible) return;
    const interval = setInterval(() => {
      if (!isPlayingRef.current || document.hidden) return;
      const nextTime = lastTimeRef.current + 1;
      const dur = stateRef.current.durationSeconds || estimatedDurationSeconds;
      if (nextTime <= dur) {
        applyPlaybackTick({
          currentTime: nextTime,
          previousTime: lastTimeRef.current,
          durationSeconds: dur,
          isPlaying: true,
          isTabVisible: !document.hidden
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [youtubeId, isPlaying, isTabVisible, estimatedDurationSeconds, applyPlaybackTick]);

  // 4. Support deterministic test & custom events on container for automated E2E verification
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleCustomTick = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.action === 'seek') {
        applyPlaybackTick({
          currentTime: Number(detail.currentTime) || 0,
          previousTime: lastTimeRef.current,
          durationSeconds: Number(detail.durationSeconds) || stateRef.current.durationSeconds || estimatedDurationSeconds,
          isPlaying: detail.isPlaying !== undefined ? Boolean(detail.isPlaying) : true,
          isTabVisible: detail.isTabVisible !== undefined ? Boolean(detail.isTabVisible) : !document.hidden
        });
      } else if (detail.action === 'watch_range') {
        const start = Number(detail.start) || 0;
        const end = Number(detail.end) || 0;
        const dur = Number(detail.durationSeconds) || stateRef.current.durationSeconds || 100;
        const visible = detail.isTabVisible !== undefined ? Boolean(detail.isTabVisible) : !document.hidden;
        let t = start;
        lastTimeRef.current = start;
        while (t < end) {
          const step = Math.min(2, end - t);
          const res = applyPlaybackTick({
            currentTime: t + step,
            previousTime: t,
            durationSeconds: dur,
            isPlaying: true,
            isTabVisible: visible
          });
          if (res.seekBlocked || res.pausedByVisibility) break;
          t += step;
        }
      }
    };

    el.addEventListener('edtechra:video-control', handleCustomTick as EventListener);
    return () => {
      el.removeEventListener('edtechra:video-control', handleCustomTick as EventListener);
    };
  }, [applyPlaybackTick, estimatedDurationSeconds]);

  const youtubeOrigin =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';

  const pct = Math.min(100, Math.round(progressState.watchedPercent || 0));

  return (
    <div
      ref={containerRef}
      data-testid="tracked-course-video-player"
      data-video-key={effectiveVideoKey}
      data-watched-percent={progressState.watchedPercent}
      data-video-completed={progressState.isCompleted ? 'true' : 'false'}
      data-max-allowed-position={progressState.maxAllowedPosition}
      className="w-full space-y-2.5"
    >
      {/* VIDEO VIEWPORT */}
      <div
        className={`video-container course-video-bleed relative w-full ${aspectClassName} bg-slate-950 rounded-2xl overflow-hidden border ${
          isDark ? 'border-slate-700/80' : 'border-stone-200/90'
        } shadow-md`}
      >
        {youtubeId ? (
          <iframe
            key={`${youtubeId}-${embedHost}-${embedRetryKey}`}
            ref={ytIframeRef}
            id={`yt_player_${effectiveVideoKey}`}
            src={`https://${embedHost}/embed/${youtubeId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1${
              youtubeOrigin ? `&origin=${youtubeOrigin}` : ''
            }`}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            onLoad={() => {
              if (ytIframeRef.current?.contentWindow) {
                try {
                  ytIframeRef.current.contentWindow.postMessage(
                    JSON.stringify({ event: 'listening', id: `yt_${effectiveVideoKey}`, channel: 'widget' }),
                    '*'
                  );
                } catch {
                  // Ignore
                }
              }
            }}
            onError={() => {
              if (embedHost === 'www.youtube-nocookie.com') {
                setEmbedHost('youtube.com');
                setEmbedRetryKey(prev => prev + 1);
              }
            }}
          />
        ) : (
          <video
            ref={htmlVideoRef}
            src={url}
            controls
            playsInline
            controlsList="nodownload"
            className="w-full h-full object-contain bg-black"
            onLoadedMetadata={e => {
              const v = e.currentTarget;
              if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
                const updated: VideoProgressState = {
                  ...stateRef.current,
                  durationSeconds: Math.round(v.duration)
                };
                stateRef.current = updated;
                setProgressState(updated);
              }
            }}
            onPlay={() => {
              if (document.hidden) {
                pauseActivePlayer();
                return;
              }
              isPlayingRef.current = true;
              setIsPlaying(true);
              setVisibilityNotice(false);
            }}
            onPause={() => {
              isPlayingRef.current = false;
              setIsPlaying(false);
            }}
            onSeeking={e => {
              const v = e.currentTarget;
              const allowed = Math.max(
                stateRef.current.maxAllowedPosition,
                lastTimeRef.current
              );
              if (!stateRef.current.isCompleted && v.currentTime > allowed + 2.5) {
                v.currentTime = allowed;
                showSeekBlockedBanner(allowed);
              }
            }}
            onTimeUpdate={e => {
              const v = e.currentTarget;
              applyPlaybackTick({
                currentTime: v.currentTime,
                previousTime: lastTimeRef.current,
                durationSeconds:
                  v.duration && Number.isFinite(v.duration)
                    ? v.duration
                    : stateRef.current.durationSeconds || estimatedDurationSeconds,
                isPlaying: !v.paused,
                isTabVisible: !document.hidden
              });
            }}
          />
        )}
      </div>

      {/* VIDEO COMPLETION & ANTI-SKIP STATUS BAR */}
      <div
        data-testid="video-progress-status-bar"
        className={`rounded-xl px-3.5 py-2.5 border transition-colors ${
          progressState.isCompleted
            ? isDark
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
            : isDark
            ? 'bg-slate-900/90 border-slate-700/80 text-slate-200'
            : 'bg-stone-50 border-stone-200/90 text-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            data-testid="video-completion-badge"
            className="flex items-center gap-2 text-xs font-extrabold"
          >
            {progressState.isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  ✓ Video Completed ({Math.max(90, pct)}% watched) • Assessment Unlocked
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Watch at least {VIDEO_COMPLETION_THRESHOLD_PERCENT}% to unlock assessment ({pct}% /{' '}
                  {VIDEO_COMPLETION_THRESHOLD_PERCENT}%)
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono font-bold opacity-85">
            {!progressState.isCompleted && youtubeId && (
              <button
                type="button"
                onClick={() => {
                  const nextPlay = !isPlaying;
                  isPlayingRef.current = nextPlay;
                  setIsPlaying(nextPlay);
                  if (ytIframeRef.current?.contentWindow) {
                    try {
                      ytIframeRef.current.contentWindow.postMessage(
                        JSON.stringify({
                          event: 'command',
                          func: nextPlay ? 'playVideo' : 'pauseVideo',
                          args: []
                        }),
                        '*'
                      );
                    } catch {
                      // Ignore
                    }
                  }
                }}
                className="px-2 py-0.5 rounded-md bg-[#026fc3] text-white text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer hover:bg-[#025da3]"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>{isPlaying ? 'Tracking Active' : 'Start / Resume Tracking'}</span>
              </button>
            )}
            <span>{pct}% Watched</span>
          </div>
        </div>

        {/* Progress Bar with 90% Target Marker */}
        <div className="relative w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-2">
          <div
            data-testid="video-progress-fill"
            className={`h-full rounded-full transition-all duration-300 ${
              progressState.isCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-[#026fc3] to-sky-400'
            }`}
            style={{ width: `${pct}%` }}
          />
          <div
            title="90% Required Completion Threshold"
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500/80"
            style={{ left: '90%' }}
          />
        </div>

        {/* Anti-Seek Warning Banner */}
        {seekWarning && (
          <div
            data-testid="video-seek-blocked-warning"
            role="alert"
            className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{seekWarning}</span>
          </div>
        )}

        {/* Hidden Tab Pause Notice */}
        {visibilityNotice && !progressState.isCompleted && (
          <div
            data-testid="video-visibility-paused-warning"
            className="mt-2 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-800 dark:text-sky-200 text-xs font-bold flex items-center gap-2"
          >
            <PauseCircle className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>
              Progress tracking paused while browser tab was hidden. Resume playback to continue.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
