// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DAILY RELEASE & PROGRESSION ENGINE
// Calculates student lesson unlock schedule based on course timezone,
// authoritative server time, lesson completions, explicit lesson order,
// first release date, daily release interval, and pause states.
//
// STRICT RULE:
// When DAILY LESSON UNLOCK is Enabled:
// - Lessons unlock sequentially according to the course's first release date
//   and daily release interval (default 1 day), AND
// - A student can complete at most ONE newly completed lesson per release interval.
// - The next sequential lesson unlocks at midnight (00:00 in the course timezone)
//   after the previous lesson's completion date + interval.
// - Unfinished lessons in progress remain accessible across days until completed.
// - All subsequent lessons remain strictly locked until prior lessons are finished.
// ============================================================================

import {
  Course,
  CourseEpisode,
  LessonProgressionStatus,
  RoadmapLessonItem
} from '@/types/courseStudio';

export interface DailyReleaseCalculationOptions {
  course: Course;
  completedEpisodeIds?: Set<string> | string[];
  completedEpisodesMap?: Record<string, { completed_at?: string | null }>;
  lastCompletedAt?: string | Date | null;
  studentStartDate?: string | Date | null;
  currentDate?: string | Date | null;
  currentActiveEpisodeId?: string | null;
  isPaused?: boolean;
  isTeacher?: boolean;
}

/**
 * Returns the calendar date string (YYYY-MM-DD) for a given timestamp in the course timezone.
 */
export function getDateStringInTimezone(dateInput: Date | string | number, timeZone = 'Asia/Colombo'): string {
  try {
    const str = String(dateInput || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    const d = new Date(dateInput);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch (_err) {
    return new Date(dateInput).toISOString().split('T')[0];
  }
}

/**
 * Converts a YYYY-MM-DD string to UTC midnight milliseconds for deterministic day arithmetic.
 */
export function ymdToUtcMs(ymd: string): number {
  const parts = String(ymd || '').split('-').map(Number);
  return Date.UTC(parts[0] || 1970, (parts[1] || 1) - 1, parts[2] || 1);
}

/**
 * Formats a UTC midnight timestamp (or YYYY-MM-DD) into a readable date string like "Nov 10, 2026".
 */
export function formatUnlockDateLabel(ymdOrMs: string | number): string {
  try {
    const ms = typeof ymdOrMs === 'number' ? ymdOrMs : ymdToUtcMs(ymdOrMs);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(ms));
  } catch (_e) {
    return String(ymdOrMs);
  }
}

/**
 * Computes countdown string (e.g., "11h 25m") until the next midnight (or target day) in the course timezone.
 */
export function getCountdownInTimezone(
  nowInput: Date | string | number = new Date(),
  daysAhead = 1,
  timeZone = 'Asia/Colombo'
): string {
  try {
    const now = new Date(nowInput);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(now);

    const h = Number(parts.find(p => p.type === 'hour')?.value || 0) % 24;
    const m = Number(parts.find(p => p.type === 'minute')?.value || 0);
    const s = Number(parts.find(p => p.type === 'second')?.value || 0);

    const secondsRemainingToday = Math.max(0, 86400 - (h * 3600 + m * 60 + s));
    const totalSeconds = secondsRemainingToday + Math.max(0, daysAhead - 1) * 86400;

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.max(1, Math.floor((totalSeconds % 3600) / 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h ${mins}m`;
  } catch (_e) {
    return '24h';
  }
}

/**
 * Returns next unlock summary for the Reward Screen when DAILY LESSON UNLOCK is enabled.
 */
export function getNextDailyUnlockSummary(
  course?: Partial<Course> | null,
  currentDateInput?: Date | string | null
): {
  nextUnlockDateLabel: string;
  countdownLabel: string;
  intervalDays: number;
} {
  const timeZone = course?.course_timezone || 'Asia/Colombo';
  const intervalDays = Math.max(1, Number(course?.daily_release_interval_days || 1) || 1);
  const effectiveNow = currentDateInput || course?.server_time || new Date();
  const todayStr = getDateStringInTimezone(effectiveNow, timeZone);
  const nextUnlockMs = ymdToUtcMs(todayStr) + intervalDays * 86400000;

  return {
    nextUnlockDateLabel: formatUnlockDateLabel(nextUnlockMs),
    countdownLabel: getCountdownInTimezone(effectiveNow, intervalDays, timeZone),
    intervalDays
  };
}

/**
 * Checks if two dates fall on the exact same calendar day within the given timezone.
 */
export function isSameCalendarDay(
  dateA: Date | string | number,
  dateB: Date | string | number,
  timeZone = 'Asia/Colombo'
): boolean {
  try {
    const strA = getDateStringInTimezone(dateA, timeZone);
    const strB = getDateStringInTimezone(dateB, timeZone);
    return strA === strB;
  } catch (_e) {
    const a = new Date(dateA).toISOString().split('T')[0];
    const b = new Date(dateB).toISOString().split('T')[0];
    return a === b;
  }
}

/**
 * Computes calendar days elapsed between two dates in a specific timezone.
 * Returns 1 on the first day, 2 on the next calendar day, etc.
 */
export function getCalendarDaysElapsed(
  startDateInput: Date | string,
  currentDateInput: Date | string = new Date(),
  timeZone = 'Asia/Colombo'
): number {
  const startStr = getDateStringInTimezone(startDateInput, timeZone);
  const currentStr = getDateStringInTimezone(currentDateInput, timeZone);

  const startUTC = ymdToUtcMs(startStr);
  const currentUTC = ymdToUtcMs(currentStr);

  const diffMs = currentUTC - startUTC;
  const diffDays = Math.floor(diffMs / 86400000);
  return Math.max(1, diffDays + 1);
}

/**
 * Computes the full roadmap items with accurate progression statuses.
 */
export function computeCourseRoadmap(options: DailyReleaseCalculationOptions): {
  items: RoadmapLessonItem[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  currentAvailableEpisode: RoadmapLessonItem | null;
  dailyReleaseEnabled: boolean;
  daysElapsed: number;
  timeZone: string;
  isPaused: boolean;
} {
  const {
    course,
    completedEpisodeIds = new Set<string>(),
    completedEpisodesMap = {},
    lastCompletedAt,
    studentStartDate,
    currentDate,
    currentActiveEpisodeId,
    isPaused = false
  } = options;

  const completedSet = completedEpisodeIds instanceof Set
    ? completedEpisodeIds
    : new Set(completedEpisodeIds);

  const dailyReleaseEnabled = Boolean(course.daily_release_enabled);
  const timeZone = course.course_timezone || 'Asia/Colombo';
  const intervalDays = Math.max(1, Number(course.daily_release_interval_days || 1) || 1);
  const effectiveStartDate: Date | string =
    course.course_start_date || studentStartDate || course.created_at || new Date();
  const effectiveCurrentDate: Date | string =
    currentDate || course.server_time || new Date();
  const daysElapsed = getCalendarDaysElapsed(effectiveStartDate, effectiveCurrentDate, timeZone);

  const todayStr = getDateStringInTimezone(effectiveCurrentDate, timeZone);
  const todayUtcMs = ymdToUtcMs(todayStr);
  const startDateStr = course.course_start_date
    ? getDateStringInTimezone(course.course_start_date, timeZone)
    : null;
  const startDateUtcMs = startDateStr ? ymdToUtcMs(startDateStr) : null;

  const rawEpisodes: Array<{ ep: CourseEpisode; unitTitle: string; unitId: string; unitIndex: number }> = [];

  (course.units || []).forEach((unit, uIdx) => {
    const sortedEps = [...(unit.episodes || [])].sort((a, b) => {
      const posA = a.position !== undefined ? a.position : a.order_index;
      const posB = b.position !== undefined ? b.position : b.order_index;
      return posA - posB;
    });

    sortedEps.forEach(ep => {
      rawEpisodes.push({
        ep,
        unitTitle: unit.title,
        unitId: unit.id,
        unitIndex: uIdx + 1
      });
    });
  });

  const totalLessons = rawEpisodes.length;
  let globalPosition = 1;

  // Identify the index of the first uncompleted lesson in the sequence
  const firstUncompletedIndex = rawEpisodes.findIndex(item => !completedSet.has(item.ep.id));

  const items: RoadmapLessonItem[] = rawEpisodes.map((item, index) => {
    const ep = item.ep;
    const position = ep.position || globalPosition++;
    const releaseDay = 1 + index * intervalDays;
    const isCompleted = completedSet.has(ep.id);

    let isLocked = false;
    let status: LessonProgressionStatus = 'available';
    let unlockMessage = '';
    let releaseDateStr: string | undefined;
    let nextUnlockCountdown: string | undefined;

    // Compute scheduled release date if course_start_date is configured
    const scheduledUnlockMs = startDateUtcMs !== null
      ? startDateUtcMs + index * intervalDays * 86400000
      : null;

    if (isCompleted) {
      status = 'completed';
      isLocked = false;
    } else if (isPaused) {
      isLocked = true;
      status = 'paused';
      unlockMessage = 'Student access is temporarily disabled by the teacher.';
    } else if (ep.is_manually_unlocked) {
      isLocked = false;
      status = (currentActiveEpisodeId === ep.id) ? 'in_progress' : 'available';
    } else if (dailyReleaseEnabled) {
      // Check if scheduled start/release date is in the future
      if (scheduledUnlockMs !== null && todayUtcMs < scheduledUnlockMs) {
        const daysWait = Math.max(1, Math.round((scheduledUnlockMs - todayUtcMs) / 86400000));
        releaseDateStr = formatUnlockDateLabel(scheduledUnlockMs);
        nextUnlockCountdown = getCountdownInTimezone(effectiveCurrentDate, daysWait, timeZone);
        isLocked = true;
        status = 'locked';
        unlockMessage = daysWait === 1
          ? `Unlocks tomorrow (${releaseDateStr}) in ${nextUnlockCountdown}.`
          : `Unlocks on ${releaseDateStr} (${nextUnlockCountdown}).`;
      } else if (firstUncompletedIndex === -1) {
        status = 'completed';
        isLocked = false;
      } else if (index === firstUncompletedIndex) {
        if (index === 0) {
          isLocked = false;
          status = (currentActiveEpisodeId === ep.id) ? 'in_progress' : 'available';
        } else {
          const prevEpId = rawEpisodes[index - 1].ep.id;
          const prevCompletion = completedEpisodesMap[prevEpId];
          const prevCompletedAt = prevCompletion?.completed_at || lastCompletedAt;

          if (prevCompletedAt) {
            const prevCompStr = getDateStringInTimezone(prevCompletedAt, timeZone);
            const prevCompMs = ymdToUtcMs(prevCompStr);
            const nextAllowedMs = prevCompMs + intervalDays * 86400000;

            if (todayUtcMs < nextAllowedMs) {
              const daysWait = Math.max(1, Math.round((nextAllowedMs - todayUtcMs) / 86400000));
              releaseDateStr = formatUnlockDateLabel(nextAllowedMs);
              nextUnlockCountdown = getCountdownInTimezone(effectiveCurrentDate, daysWait, timeZone);
              isLocked = true;
              status = 'locked';
              unlockMessage = daysWait === 1
                ? `Unlocks tomorrow (${releaseDateStr}) • ${nextUnlockCountdown}`
                : `Unlocks ${releaseDateStr} • ${nextUnlockCountdown}`;
            } else {
              isLocked = false;
              status = (currentActiveEpisodeId === ep.id) ? 'in_progress' : 'available';
            }
          } else {
            const nextAllowedMs = todayUtcMs + intervalDays * 86400000;
            releaseDateStr = formatUnlockDateLabel(nextAllowedMs);
            nextUnlockCountdown = getCountdownInTimezone(effectiveCurrentDate, intervalDays, timeZone);
            isLocked = true;
            status = 'locked';
            unlockMessage = `Unlocks tomorrow (${releaseDateStr}) • ${nextUnlockCountdown}`;
          }
        }
      } else {
        const stepsAfterFirst = Math.max(1, index - Math.max(0, firstUncompletedIndex));
        const estimatedUnlockMs = scheduledUnlockMs !== null && scheduledUnlockMs > todayUtcMs
          ? scheduledUnlockMs
          : todayUtcMs + stepsAfterFirst * intervalDays * 86400000;
        releaseDateStr = formatUnlockDateLabel(estimatedUnlockMs);
        isLocked = true;
        status = 'locked';
        unlockMessage = `Complete Lesson ${index} first • Unlocks ${releaseDateStr}`;
      }
    } else {
      isLocked = false;
      status = (currentActiveEpisodeId === ep.id) ? 'in_progress' : 'available';
    }

    return {
      id: ep.id,
      unit_id: item.unitId,
      unit_title: item.unitTitle,
      unit_index: item.unitIndex,
      title: ep.title,
      position,
      order_index: ep.order_index !== undefined ? ep.order_index : index,
      estimated_minutes: ep.estimated_minutes || 15,
      status,
      release_day: releaseDay,
      is_locked: isLocked,
      unlock_message: unlockMessage,
      release_date_str: releaseDateStr,
      next_unlock_countdown: nextUnlockCountdown,
      questions_count: ep.questions?.length || 0
    };
  });

  const completedLessons = items.filter(i => i.status === 'completed').length;
  const progressPercent = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const currentAvailableEpisode = items.find(i => i.status === 'in_progress')
    || items.find(i => i.status === 'available')
    || (items.length > 0 ? items[items.length - 1] : null);

  return {
    items,
    totalLessons,
    completedLessons,
    progressPercent,
    currentAvailableEpisode,
    dailyReleaseEnabled,
    daysElapsed,
    timeZone,
    isPaused
  };
}
