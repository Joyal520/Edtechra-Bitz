// ============================================================================
// EDTECHRA COURSE STUDIO: VIDEO COMPLETION ENFORCEMENT & SEGMENT TRACKER
// Engine-level playback verification across all existing and future courses:
//   - Tracks actual watched segments (1-second resolution intervals)
//   - Requires >= 90% unique watched duration to unlock assessments/completion
//   - Blocks seeking ahead to unwatched sections
//   - Pauses tracking & playback when browser tab becomes hidden
//   - Persists progress across sessions (localStorage + server sync)
// ============================================================================

import { CourseBlock } from '@/types/courseStudio';

export const VIDEO_COMPLETION_THRESHOLD_PERCENT = 90;
export const MAX_ALLOWED_SEEK_AHEAD_SECONDS = 2.5;
export const MAX_NORMAL_TICK_DELTA_SECONDS = 4.0;

export type WatchedSegment = [number, number];

export interface VideoProgressState {
  videoKey: string;
  courseId: string;
  episodeId: string;
  durationSeconds: number;
  watchedSeconds: number;
  watchedPercent: number;
  watchedSegments: WatchedSegment[];
  maxAllowedPosition: number;
  isCompleted: boolean;
  completedAt: string | null;
  updatedAt: string;
}

export interface VideoTickInput {
  currentTime: number;
  previousTime: number;
  durationSeconds: number;
  isPlaying: boolean;
  isTabVisible: boolean;
}

export interface VideoTickResult {
  nextState: VideoProgressState;
  seekBlocked: boolean;
  snapBackTime: number;
  pausedByVisibility: boolean;
  justCompleted: boolean;
}

/**
 * Normalizes and merges overlapping or contiguous [start, end] watched segments.
 */
export function mergeWatchedSegments(
  segments: WatchedSegment[],
  maxDuration?: number
): WatchedSegment[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const cap = typeof maxDuration === 'number' && maxDuration > 0 ? maxDuration : Infinity;

  const valid: WatchedSegment[] = [];
  for (const seg of segments) {
    if (!Array.isArray(seg) || seg.length < 2) continue;
    const rawStart = Number(seg[0]);
    const rawEnd = Number(seg[1]);
    if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) continue;
    const start = Math.max(0, Math.min(cap, Number(rawStart.toFixed(2))));
    const end = Math.max(0, Math.min(cap, Number(rawEnd.toFixed(2))));
    if (end > start) {
      valid.push([start, end]);
    }
  }

  if (valid.length === 0) return [];

  valid.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged: WatchedSegment[] = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = valid[i];
    // Merge if overlapping or within 0.75s of each other (normal polling jitter)
    if (curr[0] <= prev[1] + 0.75) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push([curr[0], curr[1]]);
    }
  }

  return merged;
}

/**
 * Computes total unique watched seconds from merged segments.
 */
export function computeUniqueWatchedSeconds(
  segments: WatchedSegment[],
  maxDuration?: number
): number {
  const merged = mergeWatchedSegments(segments, maxDuration);
  let total = 0;
  for (const [start, end] of merged) {
    total += Math.max(0, end - start);
  }
  if (typeof maxDuration === 'number' && maxDuration > 0) {
    return Math.min(maxDuration, Number(total.toFixed(2)));
  }
  return Number(total.toFixed(2));
}

/**
 * Computes watched percentage [0..100] from unique watched seconds and duration.
 */
export function computeWatchedPercent(watchedSeconds: number, durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  const pct = (Math.max(0, watchedSeconds) / durationSeconds) * 100;
  return Math.min(100, Math.max(0, Number(pct.toFixed(1))));
}

/**
 * Returns the furthest watched timestamp in the merged segments.
 */
export function getMaxWatchedPosition(segments: WatchedSegment[]): number {
  if (!Array.isArray(segments) || segments.length === 0) return 0;
  let maxPos = 0;
  for (const seg of segments) {
    if (Array.isArray(seg) && Number.isFinite(seg[1]) && seg[1] > maxPos) {
      maxPos = seg[1];
    }
  }
  return Number(maxPos.toFixed(2));
}

/**
 * Creates a clean initial VideoProgressState.
 */
export function createInitialVideoProgressState(params: {
  courseId: string;
  episodeId: string;
  videoKey?: string;
  durationSeconds?: number;
}): VideoProgressState {
  return {
    videoKey: params.videoKey || 'default',
    courseId: params.courseId || 'course',
    episodeId: params.episodeId || 'episode',
    durationSeconds: Math.max(0, Number(params.durationSeconds) || 0),
    watchedSeconds: 0,
    watchedPercent: 0,
    watchedSegments: [],
    maxAllowedPosition: 0,
    isCompleted: false,
    completedAt: null,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Processes a playback tick or seek event.
 * - Blocks seeking ahead past maxAllowedPosition + tolerance (unless video is already completed)
 * - Ignores progress while tab is hidden
 * - Credits only genuine sequential playback intervals
 * - Marks video completed once >= 90% unique duration is watched
 */
export function processVideoPlaybackTick(
  state: VideoProgressState,
  tick: VideoTickInput
): VideoTickResult {
  const duration = Math.max(
    state.durationSeconds || 0,
    Number.isFinite(tick.durationSeconds) && tick.durationSeconds > 0 ? tick.durationSeconds : 0
  );

  const currentTime = Math.max(0, Number(tick.currentTime) || 0);
  const previousTime = Math.max(0, Number(tick.previousTime) || 0);

  // 1. If browser tab is hidden, pause progress tracking immediately
  if (!tick.isTabVisible) {
    return {
      nextState: {
        ...state,
        durationSeconds: duration
      },
      seekBlocked: false,
      snapBackTime: state.maxAllowedPosition,
      pausedByVisibility: true,
      justCompleted: false
    };
  }

  // 2. Prevent skipping ahead to unwatched sections (unless video is already 90%+ completed)
  const allowedFrontier = Math.max(state.maxAllowedPosition, getMaxWatchedPosition(state.watchedSegments));
  if (!state.isCompleted && currentTime > allowedFrontier + MAX_ALLOWED_SEEK_AHEAD_SECONDS) {
    return {
      nextState: {
        ...state,
        durationSeconds: duration,
        maxAllowedPosition: allowedFrontier
      },
      seekBlocked: true,
      snapBackTime: allowedFrontier,
      pausedByVisibility: false,
      justCompleted: false
    };
  }

  // 3. If not actively playing, do not accumulate watched segments
  if (!tick.isPlaying) {
    return {
      nextState: {
        ...state,
        durationSeconds: duration
      },
      seekBlocked: false,
      snapBackTime: allowedFrontier,
      pausedByVisibility: false,
      justCompleted: false
    };
  }

  // 4. Genuine playback progression check
  const delta = currentTime - previousTime;
  let nextSegments = state.watchedSegments;

  if (delta > 0 && delta <= MAX_NORMAL_TICK_DELTA_SECONDS) {
    const segStart = Math.max(0, previousTime);
    const segEnd = duration > 0 ? Math.min(duration, currentTime) : currentTime;
    if (segEnd > segStart) {
      nextSegments = mergeWatchedSegments([...state.watchedSegments, [segStart, segEnd]], duration);
    }
  } else if (delta > MAX_NORMAL_TICK_DELTA_SECONDS && !state.isCompleted) {
    // Attempted forward jump larger than normal tick delta into unwatched region
    if (currentTime > allowedFrontier + MAX_ALLOWED_SEEK_AHEAD_SECONDS) {
      return {
        nextState: {
          ...state,
          durationSeconds: duration,
          maxAllowedPosition: allowedFrontier
        },
        seekBlocked: true,
        snapBackTime: allowedFrontier,
        pausedByVisibility: false,
        justCompleted: false
      };
    }
  }

  const watchedSeconds = computeUniqueWatchedSeconds(nextSegments, duration);
  const watchedPercent = computeWatchedPercent(watchedSeconds, duration);
  const nextMaxAllowed = Math.max(
    allowedFrontier,
    getMaxWatchedPosition(nextSegments),
    delta > 0 && delta <= MAX_NORMAL_TICK_DELTA_SECONDS ? currentTime : allowedFrontier
  );

  const meetsThreshold =
    duration > 0 && watchedPercent >= VIDEO_COMPLETION_THRESHOLD_PERCENT;
  const isCompleted = Boolean(state.isCompleted || meetsThreshold);
  const justCompleted = !state.isCompleted && isCompleted;
  const nowIso = new Date().toISOString();

  const nextState: VideoProgressState = {
    ...state,
    durationSeconds: duration,
    watchedSeconds: Math.round(watchedSeconds),
    watchedPercent,
    watchedSegments: nextSegments,
    maxAllowedPosition: Number(nextMaxAllowed.toFixed(2)),
    isCompleted,
    completedAt: state.completedAt || (isCompleted ? nowIso : null),
    updatedAt: nowIso
  };

  return {
    nextState,
    seekBlocked: false,
    snapBackTime: nextState.maxAllowedPosition,
    pausedByVisibility: false,
    justCompleted
  };
}

/**
 * Storage key helper for persisting video progress across page refreshes and sessions.
 */
export function getVideoProgressStorageKey(
  courseId: string,
  episodeId: string,
  videoKey = 'default',
  userId?: string | null
): string {
  const cleanUser = userId ? String(userId).trim() : 'student';
  return `edtechra_video_progress_v1:${cleanUser}:${courseId}:${episodeId}:${videoKey}`;
}

export function loadLocalVideoProgress(
  courseId: string,
  episodeId: string,
  videoKey = 'default',
  userId?: string | null
): VideoProgressState | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getVideoProgressStorageKey(courseId, episodeId, videoKey, userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const durationSeconds = Math.max(0, Number(parsed.durationSeconds) || 0);
    const watchedSegments = mergeWatchedSegments(parsed.watchedSegments || [], durationSeconds);
    const watchedSeconds = computeUniqueWatchedSeconds(watchedSegments, durationSeconds);
    const watchedPercent =
      durationSeconds > 0
        ? computeWatchedPercent(watchedSeconds, durationSeconds)
        : Math.min(100, Math.max(0, Number(parsed.watchedPercent) || 0));
    const isCompleted = Boolean(
      parsed.isCompleted || watchedPercent >= VIDEO_COMPLETION_THRESHOLD_PERCENT
    );

    return {
      videoKey: parsed.videoKey || videoKey,
      courseId: parsed.courseId || courseId,
      episodeId: parsed.episodeId || episodeId,
      durationSeconds,
      watchedSeconds: Math.round(watchedSeconds),
      watchedPercent,
      watchedSegments,
      maxAllowedPosition: Math.max(
        Number(parsed.maxAllowedPosition) || 0,
        getMaxWatchedPosition(watchedSegments)
      ),
      isCompleted,
      completedAt: parsed.completedAt || (isCompleted ? new Date().toISOString() : null),
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function saveLocalVideoProgress(
  state: VideoProgressState,
  userId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getVideoProgressStorageKey(
      state.courseId,
      state.episodeId,
      state.videoKey,
      userId
    );
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Extracts YouTube video ID from any standard YouTube URL or 11-character video ID.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|u\/\w\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (match && match[1]) return match[1];
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const fallbackMatch = trimmed.match(regExp);
  return fallbackMatch && fallbackMatch[2].length === 11 ? fallbackMatch[2] : null;
}

/**
 * Identifies all required video blocks in a lesson so the assessment/completion
 * gate knows whether video completion is required for the current lesson.
 */
export function extractEpisodeRequiredVideos(
  blocks: CourseBlock[] = []
): Array<{ videoKey: string; url: string; title: string; blockId: string }> {
  const result: Array<{ videoKey: string; url: string; title: string; blockId: string }> = [];
  const seenKeys = new Set<string>();

  (blocks || []).forEach((b, idx) => {
    if (!b) return;
    const c = (b.content || {}) as any;
    const isVideoBlock =
      b.block_type === 'video' ||
      b.block_type === 'youtube_video' ||
      b.block_type === 'youtube_short' ||
      b.block_type === 'text_video' ||
      Boolean(c?.video?.url || c?.video_url || c?.video_id);

    if (!isVideoBlock) return;

    const rawUrl = String(
      c?.video?.url || c?.video?.video_url || c?.url || c?.video_url || c?.video_id || c?.video?.video_id || ''
    ).trim();
    if (!rawUrl) return;

    const ytId = extractYouTubeId(rawUrl);
    const videoKey = ytId || b.id || `video_${idx}`;
    if (seenKeys.has(videoKey)) return;
    seenKeys.add(videoKey);

    result.push({
      videoKey,
      url: rawUrl,
      title: String(c?.video?.title || c?.title || `Lesson Video ${result.length + 1}`),
      blockId: b.id || `block_${idx}`
    });
  });

  return result;
}

/**
 * Formats seconds as M:SS for seek/progress messages.
 */
export function formatSecondsAsTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
