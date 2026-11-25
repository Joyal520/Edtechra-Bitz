/**
 * Campaign Games Service (Neon Flow 1000, Arrow Escape 1000, Game of Words 2000)
 * Pure helpers + backend enforcement for teacher-controlled level releases,
 * student progression unlocking, idempotent scoring, and classroom analytics.
 */

export const CAMPAIGN_GAMES_META = {
  'neon-flow': {
    gameId: 'neon-flow',
    name: 'Neon Flow',
    subtitle: 'Connect the Pipes',
    category: 'Logic & Puzzle Training',
    totalLevels: 1000,
    defaultInitialEnd: 10,
    defaultPointsPerLevel: 10
  },
  'arrow-escape': {
    gameId: 'arrow-escape',
    name: 'Arrow Escape',
    subtitle: 'Arrow Direction Puzzle',
    category: 'Logic & Brain Training',
    totalLevels: 1000,
    defaultInitialEnd: 10,
    defaultPointsPerLevel: 10
  },
  'game-of-words-2000': {
    gameId: 'game-of-words-2000',
    name: 'Game of Words 2000',
    subtitle: 'Word Formation',
    category: 'Language & Vocabulary Training',
    totalLevels: 2000,
    defaultInitialEnd: 20,
    defaultPointsPerLevel: 10
  }
};

export function isCampaignGameId(gameId) {
  return Boolean(gameId && CAMPAIGN_GAMES_META[String(gameId)]);
}

export function resolveCampaignRelease(assignment) {
  const gameId = String(assignment?.settings?.game_id || '');
  const meta = CAMPAIGN_GAMES_META[gameId] || {
    totalLevels: Number(assignment?.settings?.total_levels || 1000),
    defaultInitialEnd: 10,
    defaultPointsPerLevel: 10
  };
  const lr = assignment?.settings?.level_release || {};
  const totalLevels = Math.max(1, Number(lr.total_levels || assignment?.settings?.total_levels || meta.totalLevels));
  const releasedStart = Math.max(1, Math.min(totalLevels, Number(lr.released_start ?? 1)));
  const rawEnd = lr.released_end !== undefined && lr.released_end !== null
    ? Number(lr.released_end)
    : Math.min(totalLevels, meta.defaultInitialEnd);
  const releasedEnd = Math.max(0, Math.min(totalLevels, rawEnd));
  const releaseHistory = Array.isArray(lr.release_history) ? lr.release_history : [];
  const pointsPerLevel = Math.max(0, Number(assignment?.settings?.points_per_level ?? meta.defaultPointsPerLevel ?? 10));

  return {
    gameId,
    totalLevels,
    releasedStart,
    releasedEnd,
    releaseHistory,
    pointsPerLevel
  };
}

export function parseCampaignLevelsCompleted(textResponse) {
  if (!textResponse) return {};
  try {
    const parsed = typeof textResponse === 'string' ? JSON.parse(textResponse) : textResponse;
    if (parsed?.levels_completed && typeof parsed.levels_completed === 'object') {
      return { ...parsed.levels_completed };
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
}

export function computeHighestUnlockedLevel(levelsCompleted, releasedStart, releasedEnd) {
  if (releasedEnd < releasedStart || releasedEnd <= 0) return 0;
  for (let lvl = releasedStart; lvl <= releasedEnd; lvl++) {
    if (!levelsCompleted[String(lvl)]) {
      return lvl;
    }
  }
  return releasedEnd;
}

export function computeCampaignProgress(assignment, submissionRow) {
  const release = resolveCampaignRelease(assignment);
  const completedLevels = parseCampaignLevelsCompleted(submissionRow?.text_response);
  const { totalLevels, releasedStart, releasedEnd, releaseHistory, pointsPerLevel } = release;

  const highestUnlockedLevel = computeHighestUnlockedLevel(completedLevels, releasedStart, releasedEnd);
  const releasedCount = releasedEnd >= releasedStart ? (releasedEnd - releasedStart + 1) : 0;

  let completedInReleased = 0;
  for (let lvl = releasedStart; lvl <= releasedEnd; lvl++) {
    if (completedLevels[String(lvl)]) completedInReleased++;
  }

  const allCompletedEntries = Object.values(completedLevels);
  const completedCount = allCompletedEntries.length;
  const totalScore = allCompletedEntries.reduce((sum, rec) => sum + Math.max(0, Number(rec?.scoreEarned || 0)), 0);
  const totalTimeSeconds = allCompletedEntries.reduce((sum, rec) => sum + Math.max(0, Number(rec?.timeTakenSeconds || 0)), 0);
  const completedAllReleased = releasedCount > 0 && completedInReleased >= releasedCount;

  const currentLevel = releasedEnd >= releasedStart
    ? Math.max(releasedStart, Math.min(releasedEnd, highestUnlockedLevel || releasedStart))
    : 1;

  return {
    assignmentId: assignment.id,
    classroomId: assignment.classroom_id,
    gameId: release.gameId,
    totalLevels,
    releasedStart,
    releasedEnd,
    releasedCount,
    releaseHistory,
    pointsPerLevel,
    highestUnlockedLevel,
    currentLevel,
    completedCount,
    completedInReleased,
    completedAllReleased,
    totalScore,
    totalTimeSeconds,
    completedLevels
  };
}

export function validateCampaignLevelAccess(progress, requestedLevel) {
  const lvl = Number(requestedLevel);
  if (!Number.isInteger(lvl) || lvl < 1 || lvl > progress.totalLevels) {
    return {
      allowed: false,
      status: 400,
      code: 'INVALID_LEVEL',
      error: `Level must be between 1 and ${progress.totalLevels}.`
    };
  }
  if (progress.releasedEnd < progress.releasedStart || lvl < progress.releasedStart || lvl > progress.releasedEnd) {
    return {
      allowed: false,
      status: 403,
      code: 'LEVEL_NOT_RELEASED',
      error: `Level ${lvl} has not been released by your teacher yet.`
    };
  }
  if (lvl > progress.highestUnlockedLevel) {
    return {
      allowed: false,
      status: 403,
      code: 'LEVEL_PROGRESSION_LOCKED',
      error: `Complete Level ${Math.max(progress.releasedStart, progress.highestUnlockedLevel)} first to unlock Level ${lvl}.`
    };
  }
  return { allowed: true, levelNumber: lvl };
}

export function applyReleaseAction({ currentRelease, action, batchSize, startLevel, endLevel, teacherId }) {
  const total = currentRelease.totalLevels;
  const prevStart = currentRelease.releasedStart;
  const prevEnd = currentRelease.releasedEnd;
  let nextStart = prevStart;
  let nextEnd = prevEnd;

  if (action === 'batch') {
    const step = Math.max(1, Math.min(total, Math.round(Number(batchSize || 10))));
    nextStart = prevEnd < prevStart ? 1 : prevStart;
    nextEnd = Math.min(total, Math.max(0, prevEnd) + step);
  } else if (action === 'range') {
    const s = Math.max(1, Math.min(total, Math.round(Number(startLevel ?? 1))));
    const e = Math.max(s, Math.min(total, Math.round(Number(endLevel ?? s))));
    nextStart = s;
    nextEnd = e;
  } else if (action === 'release_all') {
    nextStart = 1;
    nextEnd = total;
  } else if (action === 'lock') {
    if (endLevel !== undefined && endLevel !== null) {
      nextEnd = Math.max(0, Math.min(total, Math.round(Number(endLevel))));
      if (nextEnd < nextStart && nextEnd > 0) nextStart = 1;
    } else {
      nextEnd = 0;
    }
  } else {
    throw new Error('Unsupported release action');
  }

  const newlyUnlockedRange = nextEnd > prevEnd
    ? { start: Math.max(nextStart, prevEnd + 1), end: nextEnd }
    : null;

  const history = [...(currentRelease.releaseHistory || [])];
  history.push({
    start: nextStart,
    end: nextEnd,
    action,
    releasedAt: new Date().toISOString(),
    releasedBy: teacherId || null
  });

  return {
    nextRelease: {
      total_levels: total,
      released_start: nextStart,
      released_end: nextEnd,
      release_history: history.slice(-50)
    },
    newlyUnlockedRange
  };
}
