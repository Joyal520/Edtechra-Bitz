import type { Assignment, AssignmentSubmission } from '@/types/classroom';
import type {
  CompletedLevelRecord,
  GameConfig,
  GameLevelDefinition,
  LevelUnlockMode
} from '@/types/gameLibrary';

export interface EvaluatedLevel {
  level: GameLevelDefinition;
  status: 'completed' | 'available' | 'locked';
  lockReason?: string;
  completionRecord?: CompletedLevelRecord;
}

export function createLevelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function normalizeAssignmentLevels(assignment: Assignment): GameLevelDefinition[] {
  const settings = assignment.settings || {};
  if (Array.isArray(settings.levels) && settings.levels.length > 0) {
    return [...settings.levels]
      .sort((a, b) => Number(a.levelNumber || 0) - Number(b.levelNumber || 0))
      .map((lvl, idx) => ({
        ...lvl,
        id: lvl.id || `level-${idx + 1}`,
        levelNumber: Number(lvl.levelNumber || idx + 1),
        points: Math.max(1, Number(lvl.points || 20))
      }));
  }

  if (settings.game_config) {
    return [
      {
        id: assignment.id,
        levelNumber: 1,
        title: assignment.title || 'Level 1',
        instructions: assignment.instructions || '',
        points: Math.max(1, Number(assignment.points || 100)),
        isManuallyLocked: false,
        unlockAt: null,
        config: settings.game_config as GameConfig
      }
    ];
  }

  return [];
}

export function parseStudentLevelProgress(
  submission?: AssignmentSubmission | null
): {
  completedMap: Record<string, CompletedLevelRecord>;
  totalPointsEarned: number;
  completedCount: number;
} {
  if (!submission?.text_response) {
    return { completedMap: {}, totalPointsEarned: 0, completedCount: 0 };
  }

  try {
    const parsed = JSON.parse(submission.text_response);
    if (parsed && typeof parsed === 'object' && parsed.levels_completed && typeof parsed.levels_completed === 'object') {
      const map = parsed.levels_completed as Record<string, CompletedLevelRecord>;
      const entries = Object.values(map);
      const total = entries.reduce((sum, r) => sum + Number(r?.scoreEarned || 0), 0);
      return {
        completedMap: map,
        totalPointsEarned: total,
        completedCount: entries.length
      };
    }

    // Legacy single-level submission fallback
    if (parsed && typeof parsed === 'object' && parsed.assignment_id) {
      const legacyId = String(parsed.level_id || parsed.assignment_id);
      const rec: CompletedLevelRecord = {
        levelId: legacyId,
        levelNumber: 1,
        title: 'Level 1',
        scoreEarned: Number(submission.points_awarded ?? parsed.score_earned ?? 0),
        maxPoints: Number(parsed.max_points ?? 100),
        percentage: Number(parsed.percentage ?? 100),
        timeTakenSeconds: Number(parsed.time_taken_seconds ?? 0),
        completedAt: submission.submitted_at || new Date().toISOString()
      };
      return {
        completedMap: { [legacyId]: rec },
        totalPointsEarned: rec.scoreEarned,
        completedCount: 1
      };
    }
  } catch {
    // ignore invalid JSON
  }

  return { completedMap: {}, totalPointsEarned: 0, completedCount: 0 };
}

export function getDateKeyInTimezone(dateInput: Date | string, timeZone = 'UTC'): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }
}

export function evaluateLevelsForStudent(
  levels: GameLevelDefinition[],
  unlockMode: LevelUnlockMode = 'sequential',
  dailyLimit = 1,
  completedMap: Record<string, CompletedLevelRecord> = {},
  timeZone = 'UTC'
): EvaluatedLevel[] {
  const nowMs = Date.now();
  const todayKey = getDateKeyInTimezone(new Date(nowMs), timeZone);
  const completedTodayCount = Object.values(completedMap).filter(
    (rec) => rec?.completedAt && getDateKeyInTimezone(rec.completedAt, timeZone) === todayKey
  ).length;
  const safeDailyLimit = Math.max(1, Number(dailyLimit || 1));

  return levels.map((level, idx) => {
    const completionRecord = completedMap[level.id];
    if (completionRecord) {
      return {
        level,
        status: 'completed',
        completionRecord
      };
    }

    // Manual teacher lock overrides all automatic unlock rules
    if (level.isManuallyLocked) {
      return {
        level,
        status: 'locked',
        lockReason: 'Your teacher has locked this level.'
      };
    }

    if (unlockMode === 'scheduled') {
      if (level.unlockAt) {
        const unlockMs = new Date(level.unlockAt).getTime();
        if (!isNaN(unlockMs) && nowMs < unlockMs) {
          const formatted = new Date(unlockMs).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          return {
            level,
            status: 'locked',
            lockReason: `This level will be available on ${formatted}.`
          };
        }
      }
      return { level, status: 'available' };
    }

    if (unlockMode === 'daily_limit') {
      if (completedTodayCount >= safeDailyLimit) {
        return {
          level,
          status: 'locked',
          lockReason: `Daily limit reached (${safeDailyLimit} ${safeDailyLimit === 1 ? 'level' : 'levels'} per day). Come back tomorrow to unlock the next level.`
        };
      }
      // Also enforce sequential order within daily limit so Level 2 isn't played before Level 1
      if (idx > 0 && !completedMap[levels[idx - 1].id]) {
        return {
          level,
          status: 'locked',
          lockReason: 'Complete the previous level to unlock this level.'
        };
      }
      return { level, status: 'available' };
    }

    // Default Mode A: Sequential Unlock
    if (idx === 0 || Boolean(completedMap[levels[idx - 1].id])) {
      return { level, status: 'available' };
    }

    return {
      level,
      status: 'locked',
      lockReason: 'Complete the previous level to unlock this level.'
    };
  });
}
