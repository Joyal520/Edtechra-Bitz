import { ClassroomLeaderboardEntry, LeaderboardResetFrequency } from '@/types/classroom';
import {
  DEFAULT_LEADERBOARD_TIMEZONE,
  sanitizeLeaderboardStudentName,
} from '@/utils/leaderboardResetUtils';

export interface AchievementChampion {
  rank: 1 | 2 | 3;
  name: string;
  points: number;
  avatarUrl: string | null;
}

export interface AchievementSnapshot {
  id: string;
  classroomId: string;
  classroomName: string;
  periodLabel: string;
  createdAt: string;
  revoked?: boolean;
  champions: AchievementChampion[];
}

/**
 * Sorts leaderboard entries deterministically by XP descending (ties broken by name)
 * and partitions them strictly so Top 3 appear ONLY on the podium and Rank #4+ appear
 * ONLY in the remaining leaderboard list without duplicates.
 */
export function partitionLeaderboardEntries(entries: ClassroomLeaderboardEntry[]): {
  sortedEntries: ClassroomLeaderboardEntry[];
  podiumEntries: ClassroomLeaderboardEntry[];
  remainingEntries: ClassroomLeaderboardEntry[];
} {
  const seenIds = new Set<string>();
  const uniqueEntries: ClassroomLeaderboardEntry[] = [];

  for (const entry of entries || []) {
    const key = entry.student_id || `${entry.name}-${entry.rank}`;
    if (seenIds.has(key)) continue;
    seenIds.add(key);
    uniqueEntries.push(entry);
  }

  const sortedEntries = [...uniqueEntries]
    .sort((a, b) => {
      const ptsDiff = (Number(b.points) || 0) - (Number(a.points) || 0);
      if (ptsDiff !== 0) return ptsDiff;
      return sanitizeLeaderboardStudentName(a.name).localeCompare(
        sanitizeLeaderboardStudentName(b.name)
      );
    })
    .map((entry, idx) => ({
      ...entry,
      name: sanitizeLeaderboardStudentName(entry.name),
      points: Math.max(0, Number(entry.points) || 0),
      rank: idx + 1,
    }));

  return {
    sortedEntries,
    podiumEntries: sortedEntries.slice(0, 3),
    remainingEntries: sortedEntries.slice(3),
  };
}

function formatMonthDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatFullDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getTzDateParts(date: Date, timeZone: string): { year: number; month: number; day: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  const map = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(map.year, 10) || date.getUTCFullYear(),
    month: (parseInt(map.month, 10) || date.getUTCMonth() + 1) - 1,
    day: parseInt(map.day, 10) || date.getUTCDate(),
    weekday: weekdayMap[map.weekday] ?? date.getUTCDay(),
  };
}

/**
 * Computes a clean, human-readable leaderboard period label (e.g. "Nov 1 – Nov 15, 2026")
 * using actual reset timestamps and timezone without hardcoding dates.
 */
export function formatLeaderboardPeriodRange(
  resetFrequency: LeaderboardResetFrequency = 'never',
  lastResetAt?: string | null,
  _nextResetAt?: string | null,
  timeZone: string = DEFAULT_LEADERBOARD_TIMEZONE,
  now: Date = new Date()
): string {
  try {
    const tz = timeZone || DEFAULT_LEADERBOARD_TIMEZONE;

    if (resetFrequency === 'daily') {
      return formatFullDate(now, tz);
    }

    let startDate: Date | null = null;
    if (lastResetAt) {
      const parsed = new Date(lastResetAt);
      if (!isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime()) {
        startDate = parsed;
      }
    }

    if (!startDate) {
      const parts = getTzDateParts(now, tz);
      if (resetFrequency === 'weekly') {
        const diffFromMonday = (parts.weekday + 6) % 7;
        startDate = new Date(Date.UTC(parts.year, parts.month, parts.day - diffFromMonday, 12, 0, 0));
      } else {
        // Monthly or 'never' default: 1st of current month in target timezone
        startDate = new Date(Date.UTC(parts.year, parts.month, 1, 12, 0, 0));
      }
    }

    const startParts = getTzDateParts(startDate, tz);
    const endParts = getTzDateParts(now, tz);

    if (
      startParts.year === endParts.year &&
      startParts.month === endParts.month &&
      startParts.day === endParts.day
    ) {
      return formatFullDate(now, tz);
    }

    if (startParts.year === endParts.year) {
      return `${formatMonthDay(startDate, tz)} – ${formatFullDate(now, tz)}`;
    }

    return `${formatFullDate(startDate, tz)} – ${formatFullDate(now, tz)}`;
  } catch {
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export function buildAchievementSnapshot(params: {
  classroomId: string;
  classroomName: string;
  periodLabel: string;
  entries: ClassroomLeaderboardEntry[];
}): AchievementSnapshot {
  const { podiumEntries } = partitionLeaderboardEntries(params.entries);
  const champions: AchievementChampion[] = podiumEntries.map((entry, idx) => ({
    rank: (idx + 1) as 1 | 2 | 3,
    name: sanitizeLeaderboardStudentName(entry.name),
    points: Math.max(0, Number(entry.points) || 0),
    avatarUrl: entry.avatar_url || null,
  }));

  return {
    id: `champ_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    classroomId: params.classroomId,
    classroomName: params.classroomName.trim() || 'EdTechra Classroom',
    periodLabel: params.periodLabel,
    createdAt: new Date().toISOString(),
    champions,
  };
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((token.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes a privacy-safe AchievementSnapshot (no student IDs, emails, or DB keys)
 * into a compact URL-safe token for shareable certificate links.
 */
export function encodeSnapshotToken(snapshot: AchievementSnapshot): string {
  const safePayload = {
    i: snapshot.id,
    c: snapshot.classroomId,
    n: snapshot.classroomName,
    p: snapshot.periodLabel,
    d: snapshot.createdAt,
    t: snapshot.champions.slice(0, 3).map((ch) => ({
      r: ch.rank,
      n: ch.name,
      x: ch.points,
      a: ch.avatarUrl || '',
    })),
  };
  return toBase64Url(JSON.stringify(safePayload));
}

export function decodeSnapshotToken(token: string): AchievementSnapshot | null {
  try {
    if (!token) return null;
    const raw = JSON.parse(fromBase64Url(token));
    if (!raw || !raw.n || !Array.isArray(raw.t)) return null;

    const snapshot: AchievementSnapshot = {
      id: String(raw.i || 'shared'),
      classroomId: String(raw.c || ''),
      classroomName: String(raw.n || 'Classroom'),
      periodLabel: String(raw.p || ''),
      createdAt: String(raw.d || new Date().toISOString()),
      champions: raw.t.slice(0, 3).map((item: any, idx: number) => ({
        rank: ([1, 2, 3].includes(Number(item?.r)) ? Number(item.r) : idx + 1) as 1 | 2 | 3,
        name: sanitizeLeaderboardStudentName(item?.n),
        points: Math.max(0, Number(item?.x) || 0),
        avatarUrl: typeof item?.a === 'string' && item.a.trim() ? item.a.trim() : null,
      })),
    };
    return snapshot;
  } catch {
    return null;
  }
}

const GALLERY_STORAGE_PREFIX = 'edtechra_champions_gallery_';
const REVOKED_STORAGE_KEY = 'edtechra_champions_revoked_ids';

export function getGallerySnapshots(classroomId: string): AchievementSnapshot[] {
  try {
    if (!classroomId || typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(`${GALLERY_STORAGE_PREFIX}${classroomId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSnapshotToGallery(snapshot: AchievementSnapshot): void {
  try {
    if (!snapshot.classroomId || typeof window === 'undefined') return;
    const existing = getGallerySnapshots(snapshot.classroomId).filter(
      (item) => item.id !== snapshot.id
    );
    const updated = [snapshot, ...existing].slice(0, 20);
    window.localStorage.setItem(
      `${GALLERY_STORAGE_PREFIX}${snapshot.classroomId}`,
      JSON.stringify(updated)
    );
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getRevokedSnapshotIds(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(REVOKED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isSnapshotRevoked(snapshotId: string): boolean {
  if (!snapshotId) return false;
  return getRevokedSnapshotIds().includes(snapshotId);
}

export function revokeSnapshotInGallery(classroomId: string, snapshotId: string): void {
  try {
    if (typeof window === 'undefined') return;
    const revoked = Array.from(new Set([...getRevokedSnapshotIds(), snapshotId]));
    window.localStorage.setItem(REVOKED_STORAGE_KEY, JSON.stringify(revoked));

    if (classroomId) {
      const updated = getGallerySnapshots(classroomId).map((item) =>
        item.id === snapshotId ? { ...item, revoked: true } : item
      );
      window.localStorage.setItem(
        `${GALLERY_STORAGE_PREFIX}${classroomId}`,
        JSON.stringify(updated)
      );
    }
  } catch {
    // Ignore storage errors
  }
}
