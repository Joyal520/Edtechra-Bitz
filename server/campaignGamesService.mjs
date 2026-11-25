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
  },
  'image-recognition': {
    gameId: 'image-recognition',
    name: 'Image Recognition Challenge',
    subtitle: 'Visual Intelligence & General Knowledge',
    category: 'Visual Intelligence & General Knowledge',
    totalLevels: 200,
    hasDifficultyPaths: true,
    difficultyTotals: { easy: 80, intermediate: 70, hard: 50 },
    defaultInitialEnd: 10,
    defaultPointsPerLevel: 25
  }
};

export const DIFFICULTY_ORDER = ['easy', 'intermediate', 'hard'];
export const DIFFICULTY_TOTALS = { easy: 80, intermediate: 70, hard: 50 };

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

export function resolveDifficultyReleases(assignment) {
  const settings = assignment?.settings || {};
  const meta = CAMPAIGN_GAMES_META[String(settings.game_id || 'image-recognition')] || CAMPAIGN_GAMES_META['image-recognition'];
  const totals = meta.difficultyTotals || DIFFICULTY_TOTALS;
  const allowedList = Array.isArray(settings.allowed_difficulties) && settings.allowed_difficulties.length > 0
    ? settings.allowed_difficulties.map((d) => String(d).toLowerCase())
    : ['easy'];
  const rawDr = settings.difficulty_releases || {};
  const pointsPerLevel = Math.max(1, Number(settings.points_per_level ?? meta.defaultPointsPerLevel ?? 25));

  const paths = {};
  for (const diff of DIFFICULTY_ORDER) {
    const totalLevels = totals[diff] || 50;
    const isAllowed = allowedList.includes(diff);
    const entry = rawDr[diff] || {};
    const releasedStart = Math.max(1, Math.min(totalLevels, Number(entry.released_start ?? 1)));
    const defaultEnd = isAllowed ? (diff === allowedList[0] ? Math.min(totalLevels, 10) : 0) : 0;
    const rawEnd = entry.released_end !== undefined && entry.released_end !== null ? Number(entry.released_end) : defaultEnd;
    const releasedEnd = isAllowed ? Math.max(0, Math.min(totalLevels, rawEnd)) : 0;
    paths[diff] = {
      difficulty: diff,
      totalLevels,
      isAllowed,
      releasedStart,
      releasedEnd,
      releasedCount: isAllowed && releasedEnd >= releasedStart ? (releasedEnd - releasedStart + 1) : 0,
      releaseHistory: Array.isArray(entry.release_history) ? entry.release_history : []
    };
  }
  return {
    gameId: String(settings.game_id || 'image-recognition'),
    allowedDifficulties: allowedList,
    pointsPerLevel,
    paths
  };
}

export function computeDifficultyCampaignProgress(assignment, submissionRow) {
  const rel = resolveDifficultyReleases(assignment);
  const completedLevels = parseCampaignLevelsCompleted(submissionRow?.text_response);

  const paths = {};
  let totalReleasedCount = 0;
  let totalCompletedInReleased = 0;

  for (const diff of DIFFICULTY_ORDER) {
    const p = rel.paths[diff];
    const diffCompletedMap = {};
    for (const [k, rec] of Object.entries(completedLevels)) {
      const recDiff = String(rec?.difficulty || (k.includes(':') ? k.split(':')[0] : 'easy')).toLowerCase();
      if (recDiff === diff) {
        const lvlNum = Number(rec?.levelNumber || (k.includes(':') ? k.split(':')[1] : k));
        if (Number.isInteger(lvlNum) && lvlNum >= 1) {
          diffCompletedMap[String(lvlNum)] = rec;
        }
      }
    }

    const highestUnlockedLevel = p.isAllowed
      ? computeHighestUnlockedLevel(diffCompletedMap, p.releasedStart, p.releasedEnd)
      : 0;

    let completedInReleased = 0;
    if (p.isAllowed && p.releasedEnd >= p.releasedStart) {
      for (let l = p.releasedStart; l <= p.releasedEnd; l++) {
        if (diffCompletedMap[String(l)]) completedInReleased++;
      }
    }

    const completedAllReleased = p.isAllowed && p.releasedCount > 0 && completedInReleased >= p.releasedCount;
    const currentLevel = p.isAllowed && p.releasedEnd >= p.releasedStart
      ? Math.max(p.releasedStart, Math.min(p.releasedEnd, highestUnlockedLevel || p.releasedStart))
      : 1;
    const diffScore = Object.values(diffCompletedMap).reduce((s, r) => s + Math.max(0, Number(r?.scoreEarned || 0)), 0);

    totalReleasedCount += p.releasedCount;
    totalCompletedInReleased += completedInReleased;

    paths[diff] = {
      ...p,
      highestUnlockedLevel,
      currentLevel,
      completedInReleased,
      completedAllReleased,
      score: diffScore,
      completedLevels: diffCompletedMap
    };
  }

  const allEntries = Object.values(completedLevels);
  const completedCount = allEntries.length;
  const totalScore = allEntries.reduce((s, r) => s + Math.max(0, Number(r?.scoreEarned || 0)), 0);
  const totalTimeSeconds = allEntries.reduce((s, r) => s + Math.max(0, Number(r?.timeTakenSeconds || 0)), 0);
  const defaultDiff = rel.allowedDifficulties.find((d) => paths[d]?.releasedCount > 0) || rel.allowedDifficulties[0] || 'easy';

  return {
    assignmentId: assignment.id,
    classroomId: assignment.classroom_id,
    gameId: rel.gameId,
    hasDifficultyPaths: true,
    allowedDifficulties: rel.allowedDifficulties,
    defaultDifficulty: defaultDiff,
    pointsPerLevel: rel.pointsPerLevel,
    totalLevels: DIFFICULTY_ORDER.reduce((s, d) => s + paths[d].totalLevels, 0),
    releasedCount: totalReleasedCount,
    completedInReleased: totalCompletedInReleased,
    completedAllReleased: totalReleasedCount > 0 && totalCompletedInReleased >= totalReleasedCount,
    completedCount,
    totalScore,
    totalTimeSeconds,
    paths,
    completedLevels
  };
}

export function validateDifficultyLevelAccess(diffProgress, difficulty, requestedLevel) {
  const diff = String(difficulty || '').toLowerCase();
  if (!DIFFICULTY_ORDER.includes(diff)) {
    return { allowed: false, status: 400, code: 'INVALID_DIFFICULTY', error: 'Invalid difficulty mode.' };
  }
  const pathInfo = diffProgress?.paths?.[diff];
  if (!pathInfo || !pathInfo.isAllowed || pathInfo.releasedEnd < pathInfo.releasedStart) {
    return {
      allowed: false,
      status: 403,
      code: 'DIFFICULTY_NOT_RELEASED',
      error: `The ${diff} difficulty mode has not been released by your teacher.`
    };
  }
  const lvl = Number(requestedLevel);
  if (!Number.isInteger(lvl) || lvl < 1 || lvl > pathInfo.totalLevels) {
    return {
      allowed: false,
      status: 400,
      code: 'INVALID_LEVEL',
      error: `Level must be between 1 and ${pathInfo.totalLevels}.`
    };
  }
  if (lvl < pathInfo.releasedStart || lvl > pathInfo.releasedEnd) {
    return {
      allowed: false,
      status: 403,
      code: 'LEVEL_NOT_RELEASED',
      error: `Level ${lvl} (${diff}) has not been released by your teacher yet.`
    };
  }
  if (lvl > pathInfo.highestUnlockedLevel) {
    return {
      allowed: false,
      status: 403,
      code: 'LEVEL_PROGRESSION_LOCKED',
      error: `Complete Level ${Math.max(pathInfo.releasedStart, pathInfo.highestUnlockedLevel)} (${diff}) first.`
    };
  }
  return { allowed: true, difficulty: diff, levelNumber: lvl };
}
