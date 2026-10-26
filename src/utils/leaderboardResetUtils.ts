// ============================================================================
// EDTECHRA-BITZ: Classroom Leaderboard Reset Engine & Schedule Utilities
// ============================================================================

import { LeaderboardResetFrequency } from '@/types/classroom';

export const DEFAULT_LEADERBOARD_TIMEZONE = 'Asia/Colombo';

/**
 * Returns the exact millisecond offset between target timeZone and UTC for a given timestamp.
 */
export function getTimeZoneOffsetMs(date: Date, timeZone: string = DEFAULT_LEADERBOARD_TIMEZONE): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23'
    });
    const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
    const tzAsUtc = Date.UTC(
      parseInt(parts.year, 10),
      parseInt(parts.month, 10) - 1,
      parseInt(parts.day, 10),
      parseInt(parts.hour, 10),
      parseInt(parts.minute, 10),
      parseInt(parts.second, 10)
    );
    return tzAsUtc - date.getTime();
  } catch (_e) {
    return 0;
  }
}

/**
 * Calculates the next scheduled reset timestamp (at midnight 00:00:00 in the given timezone).
 */
export function calculateNextResetDate(
  frequency: LeaderboardResetFrequency,
  fromDateInput: Date | string | number = new Date(),
  timeZone: string = DEFAULT_LEADERBOARD_TIMEZONE
): Date | null {
  if (frequency === 'never') return null;

  const fromDate = new Date(fromDateInput);
  if (isNaN(fromDate.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
    const parts = Object.fromEntries(formatter.formatToParts(fromDate).map(p => [p.type, p.value]));
    const year = parseInt(parts.year, 10);
    const month = parseInt(parts.month, 10) - 1;
    const day = parseInt(parts.day, 10);
    const weekday = parts.weekday;

    const dayIndexMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDayOfWeek = dayIndexMap[weekday] ?? 0;

    let targetYear = year;
    let targetMonth = month;
    let targetDay = day;

    if (frequency === 'daily') {
      targetDay += 1;
    } else if (frequency === 'weekly') {
      // Advance to the upcoming Monday (day 1)
      const daysUntilMonday = (8 - currentDayOfWeek) % 7 || 7;
      targetDay += daysUntilMonday;
    } else if (frequency === 'monthly') {
      // 1st of the next month
      targetDay = 1;
      targetMonth += 1;
    }

    const localTargetUtc = Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0);
    const offset = getTimeZoneOffsetMs(new Date(localTargetUtc), timeZone);
    return new Date(localTargetUtc - offset);
  } catch (_err) {
    // Fallback: simple UTC addition
    const fallback = new Date(fromDate);
    fallback.setUTCHours(0, 0, 0, 0);
    if (frequency === 'daily') fallback.setUTCDate(fallback.getUTCDate() + 1);
    else if (frequency === 'weekly') fallback.setUTCDate(fallback.getUTCDate() + ((8 - fallback.getUTCDay()) % 7 || 7));
    else if (frequency === 'monthly') {
      fallback.setUTCMonth(fallback.getUTCMonth() + 1);
      fallback.setUTCDate(1);
    }
    return fallback;
  }
}

/**
 * Checks whether the scheduled reset time has passed.
 */
export function isResetDue(nextResetAt?: string | null): boolean {
  if (!nextResetAt) return false;
  const target = new Date(nextResetAt).getTime();
  if (isNaN(target)) return false;
  return target <= Date.now();
}

/**
 * Formats the reset frequency and next reset date for clear, human-friendly presentation.
 * Example outputs:
 *  - { frequencyLabel: 'Never', nextResetLabel: null }
 *  - { frequencyLabel: 'Weekly', nextResetLabel: 'Monday, 12:00 AM' }
 *  - { frequencyLabel: 'Daily', nextResetLabel: 'Tomorrow, 12:00 AM' }
 *  - { frequencyLabel: 'Monthly', nextResetLabel: 'Nov 1, 12:00 AM' }
 */
export function formatLeaderboardResetText(
  frequency: LeaderboardResetFrequency = 'never',
  nextResetAt?: string | null,
  timeZone: string = DEFAULT_LEADERBOARD_TIMEZONE
): { frequencyLabel: string; nextResetLabel: string | null } {
  const capFreq = frequency.charAt(0).toUpperCase() + frequency.slice(1);

  if (frequency === 'never' || !nextResetAt) {
    return {
      frequencyLabel: 'Never',
      nextResetLabel: null
    };
  }

  const resetDate = new Date(nextResetAt);
  if (isNaN(resetDate.getTime())) {
    return {
      frequencyLabel: capFreq,
      nextResetLabel: null
    };
  }

  try {
    if (frequency === 'weekly') {
      // Explicitly format as "Monday, 12:00 AM" matching requirement specification
      const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(resetDate);
      const timeStr = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(resetDate);
      return {
        frequencyLabel: 'Weekly',
        nextResetLabel: `${dayName}, ${timeStr}`
      };
    }

    if (frequency === 'daily') {
      // Check if tomorrow or today
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return {
        frequencyLabel: 'Daily',
        nextResetLabel: dateFormatter.format(resetDate)
      };
    }

    if (frequency === 'monthly') {
      const monthFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return {
        frequencyLabel: 'Monthly',
        nextResetLabel: monthFormatter.format(resetDate)
      };
    }

    return {
      frequencyLabel: capFreq,
      nextResetLabel: resetDate.toLocaleDateString()
    };
  } catch (_e) {
    return {
      frequencyLabel: capFreq,
      nextResetLabel: resetDate.toISOString()
    };
  }
}
