import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  Trophy,
  X
} from 'lucide-react';
import { ACTIVITY_TYPE_LABELS, gameLibraryService, getGameCatalogItem } from '@/services/gameLibraryService';
import type { Assignment } from '@/types/classroom';
import type { ActivityType, CampaignProgressState, GameId, GameLevelDefinition, LevelUnlockMode } from '@/types/gameLibrary';
import {
  evaluateLevelsForStudent,
  getLevelQuestionCount,
  isAssignmentPublished,
  isAssignmentStarted,
  normalizeAssignmentLevels,
  parseStudentLevelProgress
} from '@/utils/gameLevelUtils';

interface GameLevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment;
  classroomTimezone?: string;
  isUnavailable?: boolean;
  onPlayLevel: (level: GameLevelDefinition) => void;
}

export const GameLevelSelectModal: React.FC<GameLevelSelectModalProps> = ({
  isOpen,
  onClose,
  assignment,
  classroomTimezone = 'UTC',
  isUnavailable = false,
  onPlayLevel
}) => {
  const [campaignState, setCampaignState] = useState<CampaignProgressState | null>(null);

  const gameId = (assignment?.settings?.game_id as GameId) || 'liquid-sentences';
  const catalogItem = getGameCatalogItem(gameId);
  const isCampaign = Boolean(assignment?.settings?.is_campaign_game) || Boolean(catalogItem.isCampaignGame);

  useEffect(() => {
    if (!isOpen || !isCampaign || !assignment?.id) {
      setCampaignState(null);
      return;
    }
    let cancelled = false;
    gameLibraryService.getCampaignState(assignment.id).then((res) => {
      if (!cancelled && res.campaignState) {
        setCampaignState(res.campaignState);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isCampaign, assignment?.id]);

  if (!isOpen) return null;

  const isPublished = !isUnavailable && isAssignmentPublished(assignment);
  const started = isAssignmentStarted(assignment);
  const levels = normalizeAssignmentLevels(assignment);
  const unlockMode: LevelUnlockMode = assignment.settings?.unlock_mode || 'sequential';
  const dailyLimit = Number(assignment.settings?.daily_limit || 1);
  const supportsScoring = assignment.settings?.supports_scoring !== false && catalogItem.supportsScoring !== false;
  const showScores = assignment.settings?.show_scores_to_students !== false;
  const isCompulsory = assignment.settings?.is_compulsory !== false;
  const maxAttempts = assignment.settings?.max_attempts ?? 1;
  const teacherInstructions = assignment.settings?.teacher_instructions || assignment.instructions || '';
  const actType = (assignment.settings?.activity_type || catalogItem.activityType) as ActivityType;

  const { completedMap, totalPointsEarned, completedCount } = parseStudentLevelProgress(
    assignment.my_submission
  );

  const evaluated = evaluateLevelsForStudent(
    levels,
    unlockMode,
    dailyLimit,
    completedMap,
    classroomTimezone
  );

  const totalAvailablePoints = isCampaign
    ? (() => {
        const lr = assignment.settings?.level_release;
        const rs = campaignState?.releasedStart ?? Number(lr?.released_start ?? 1);
        const re = campaignState?.releasedEnd ?? Number(lr?.released_end ?? catalogItem.defaultInitialReleaseEnd ?? 10);
        const ppl = campaignState?.pointsPerLevel ?? Number(assignment.settings?.points_per_level ?? 10);
        return Math.max(0, re >= rs ? (re - rs + 1) * ppl : 0);
      })()
    : levels.reduce((sum, l) => sum + l.points, 0);

  const campaignDisplay = (() => {
    if (!isCampaign) return null;
    const lr = assignment.settings?.level_release;
    const totalLevels = campaignState?.totalLevels ?? Number(lr?.total_levels || assignment.settings?.total_levels || catalogItem.totalLevels || 1000);
    const relStart = campaignState?.releasedStart ?? Number(lr?.released_start ?? 1);
    const relEnd = campaignState?.releasedEnd ?? Number(lr?.released_end ?? catalogItem.defaultInitialReleaseEnd ?? 10);
    const ppl = campaignState?.pointsPerLevel ?? Number(assignment.settings?.points_per_level ?? 10);
    const completedLvls = campaignState?.completedLevels || completedMap;
    const releasedCount = relEnd >= relStart ? relEnd - relStart + 1 : 0;

    let completedInRel = 0;
    let highestUnlocked = relEnd >= relStart ? relStart : 0;
    for (let l = relStart; l <= relEnd; l++) {
      if (completedLvls[String(l)]) {
        completedInRel++;
        if (l === highestUnlocked && l < relEnd) highestUnlocked = l + 1;
      }
    }
    if (campaignState?.highestUnlockedLevel !== undefined) {
      highestUnlocked = campaignState.highestUnlockedLevel;
    }

    const completedAllReleased = releasedCount > 0 && completedInRel >= releasedCount;
    const pct = releasedCount > 0 ? Math.round((completedInRel / releasedCount) * 100) : 0;
    const earnedPts = campaignState?.totalScore ?? totalPointsEarned;

    const launchLevel = (lvlNum: number) => {
      onPlayLevel({
        id: String(lvlNum),
        levelNumber: lvlNum,
        title: `Level ${lvlNum}`,
        points: ppl,
        isManuallyLocked: false,
        unlockAt: null,
        config: { title: assignment.title }
      });
    };

    return {
      totalLevels,
      relStart,
      relEnd,
      releasedCount,
      completedInRel,
      highestUnlocked,
      completedAllReleased,
      pct,
      earnedPts,
      completedLvls,
      ppl,
      launchLevel
    };
  })();

  const progressPct = campaignDisplay
    ? campaignDisplay.pct
    : levels.length > 0
      ? Math.round((completedCount / levels.length) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-50 via-white to-indigo-50 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={catalogItem.thumbnailUrl}
              alt={catalogItem.name}
              className="w-24 sm:w-28 aspect-video rounded-2xl object-cover shrink-0 border border-sky-200 shadow-sm"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-600 text-white">
                  {catalogItem.name}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {ACTIVITY_TYPE_LABELS[actType] || 'Activity'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isCompulsory
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-teal-50 text-teal-700 border-teal-200'
                  }`}
                >
                  {isCompulsory ? 'Compulsory' : 'Optional'}
                </span>
                {levels.length > 1 && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {unlockMode === 'sequential'
                      ? 'Sequential Unlock'
                      : unlockMode === 'scheduled'
                      ? 'Scheduled Unlock'
                      : `Daily Limit: ${dailyLimit}/day`}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {assignment.title}
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Your Progress: {campaignDisplay ? campaignDisplay.completedInRel : completedCount} of{' '}
                {campaignDisplay ? campaignDisplay.releasedCount : levels.length}{' '}
                {campaignDisplay
                  ? 'Released Levels Completed'
                  : `${levels.length === 1 ? (supportsScoring ? 'Level' : 'Session') : 'Levels'} Completed`}
                {assignment.due_date ? ` • Due ${new Date(assignment.due_date).toLocaleString()}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/80 text-slate-500 transition shrink-0"
            aria-label="Close level selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Summary Bar */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-[180px] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Overall Completion</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {supportsScoring && showScores && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <Trophy className="w-4 h-4 text-amber-500" />
              <div className="text-xs">
                <span className="font-black text-slate-900">
                  {campaignDisplay ? campaignDisplay.earnedPts : totalPointsEarned}
                </span>
                <span className="text-slate-500 font-semibold"> / {totalAvailablePoints} pts</span>
              </div>
            </div>
          )}
        </div>

        {teacherInstructions && (
          <div className="px-5 sm:px-6 py-2.5 bg-sky-50/70 border-b border-sky-100 text-xs text-sky-950 font-medium shrink-0">
            <span className="font-extrabold text-sky-800 mr-1.5">Instructions:</span>
            {teacherInstructions}
          </div>
        )}

        {/* Level List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {!isPublished ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3 my-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  This game is currently unavailable
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your teacher has unpublished this assignment. You cannot start new attempts or access levels right now, and your existing progress and leaderboard scores have been preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Back to Classroom
              </button>
            </div>
          ) : campaignDisplay ? (
            <div className="space-y-4">
              {campaignDisplay.completedAllReleased && !campaignState?.hasDifficultyPaths && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200 text-center space-y-1.5">
                  <div className="text-sm font-black text-emerald-900">
                    🎉 You&apos;ve completed all the available levels!
                  </div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Wait for your teacher to unlock the next challenge.
                  </p>
                </div>
              )}

              {campaignState?.hasDifficultyPaths && campaignState.paths ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { id: 'easy' as const, title: 'EASY', icon: '🟢', sub: 'Discover familiar images', tone: 'border-emerald-200 bg-emerald-50/50' },
                    { id: 'intermediate' as const, title: 'INTERMEDIATE', icon: '🟡', sub: 'Challenge your knowledge', tone: 'border-amber-200 bg-amber-50/50' },
                    { id: 'hard' as const, title: 'HARD', icon: '🔴', sub: 'Test your visual intelligence', tone: 'border-rose-200 bg-rose-50/50' }
                  ]).map((meta) => {
                    const dp = campaignState.paths![meta.id];
                    const isLocked = !dp || !dp.isAllowed || dp.releasedCount === 0;
                    const pct = dp && dp.releasedCount > 0 ? Math.round((dp.completedInReleased / dp.releasedCount) * 100) : 0;
                    return (
                      <div key={meta.id} className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${isLocked ? 'border-slate-200 bg-slate-50 opacity-75' : meta.tone}`}>
                        <div className="space-y-1.5">
                          <div className="text-xs font-black tracking-wide text-slate-900">
                            {meta.icon} {meta.title}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-600">{meta.sub}</div>
                          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[11px] font-bold text-slate-700">
                            {isLocked ? '🔒 Locked by Teacher' : `${dp.completedInReleased} / ${dp.releasedCount} Levels Completed`}
                          </div>
                          {!isLocked && dp && (
                            <div className="text-[10px] font-semibold text-slate-600 space-y-0.5">
                              {dp.completedInReleased > 0 && <div>🟢 {dp.releasedStart}–{Math.min(dp.releasedEnd, dp.releasedStart + dp.completedInReleased - 1)} Completed</div>}
                              {!dp.completedAllReleased && <div>🔵 Level {dp.highestUnlockedLevel} Available</div>}
                              {dp.releasedEnd < dp.totalLevels && <div>🔒 Levels {dp.releasedEnd + 1}+ Not Yet Released</div>}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isLocked || !started}
                          onClick={() => {
                            if (!dp) return;
                            onPlayLevel({
                              id: String(dp.highestUnlockedLevel || dp.releasedStart || 1),
                              levelNumber: dp.highestUnlockedLevel || dp.releasedStart || 1,
                              title: `${meta.title} Level ${dp.highestUnlockedLevel || dp.releasedStart || 1}`,
                              points: campaignState.pointsPerLevel || 25,
                              isManuallyLocked: false,
                              unlockAt: null,
                              config: { title: assignment.title, difficulty: meta.id } as any
                            });
                          }}
                          className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-extrabold cursor-pointer"
                        >
                          {isLocked ? '🔒 Locked' : `Play ${meta.title.charAt(0) + meta.title.slice(1).toLowerCase()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>

              {/* Breakdown pills */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {campaignDisplay.completedInRel > 0 && (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      🟢 Levels {campaignDisplay.relStart}–{Math.min(campaignDisplay.relEnd, campaignDisplay.relStart + campaignDisplay.completedInRel - 1)} Completed
                    </span>
                  )}
                  {!campaignDisplay.completedAllReleased && campaignDisplay.highestUnlocked >= campaignDisplay.relStart && (
                    <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      🔵 Level {campaignDisplay.highestUnlocked} Available
                    </span>
                  )}
                  {campaignDisplay.highestUnlocked < campaignDisplay.relEnd && (
                    <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                      🔒 Levels {campaignDisplay.highestUnlocked + 1}–{campaignDisplay.relEnd} Available after progression
                    </span>
                  )}
                  {campaignDisplay.relEnd < campaignDisplay.totalLevels && (
                    <span className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-600">
                      🔒 Levels {campaignDisplay.relEnd + 1}–{campaignDisplay.totalLevels.toLocaleString()} Not Released by Teacher
                    </span>
                  )}
                </div>

                {started && campaignDisplay.releasedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => campaignDisplay.launchLevel(campaignDisplay.highestUnlocked || campaignDisplay.relStart)}
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {campaignDisplay.completedAllReleased
                        ? `Replay Level ${campaignDisplay.relEnd}`
                        : campaignDisplay.completedInRel > 0
                          ? `Continue Playing (Level ${campaignDisplay.highestUnlocked})`
                          : `Start Level ${campaignDisplay.relStart}`}
                    </span>
                  </button>
                )}
              </div>

              {/* Released Levels Grid */}
              {campaignDisplay.releasedCount > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Released Levels ({campaignDisplay.relStart}–{campaignDisplay.relEnd})
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {Array.from({ length: Math.min(200, campaignDisplay.releasedCount) }, (_, idx) => {
                      const lvlNum = campaignDisplay.relStart + idx;
                      const rec = campaignDisplay.completedLvls[String(lvlNum)];
                      const isDone = Boolean(rec);
                      const isNext = !isDone && lvlNum === campaignDisplay.highestUnlocked;
                      const isLocked = !isDone && lvlNum > campaignDisplay.highestUnlocked;
                      return (
                        <button
                          key={lvlNum}
                          type="button"
                          disabled={isLocked || !started}
                          onClick={() => campaignDisplay.launchLevel(lvlNum)}
                          className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                            isDone
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 cursor-pointer'
                              : isNext
                                ? 'bg-sky-600 border-sky-600 text-white shadow-sm hover:bg-sky-700 cursor-pointer'
                                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-xs font-black">{lvlNum}</span>
                          <span className="text-[10px] mt-0.5">
                            {isDone ? '✓' : isNext ? '▶' : '🔒'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {campaignDisplay.releasedCount > 200 && (
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Showing first 200 released levels above. Use the in-game level selector to jump to any unlocked level up to {campaignDisplay.relEnd}.
                    </p>
                  )}
                </div>
              )}
                </>
              )}
            </div>
          ) : evaluated.map(({ level, status, lockReason, completionRecord }) => {
            const isCompleted = status === 'completed';
            const isAvailable = status === 'available';
            const itemCount = getLevelQuestionCount(gameId, level.config);

            return (
              <div
                key={level.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : isAvailable
                    ? 'bg-white border-sky-200 shadow-sm hover:border-sky-400'
                    : 'bg-slate-50/80 border-slate-200 opacity-85'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : isAvailable
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      Level {level.levelNumber}
                    </span>

                    {supportsScoring && showScores && (
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        {isCompleted && completionRecord
                          ? `${completionRecord.scoreEarned} / ${level.points} pts earned`
                          : `${level.points} pts`}
                      </span>
                    )}

                    {isCompleted && completionRecord && (
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {completionRecord.timeTakenSeconds}s
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {level.title}
                  </h3>
                  {itemCount > 0 && (
                    <p className="text-[11px] font-semibold text-slate-500">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} in this level
                    </p>
                  )}

                  {level.instructions && isAvailable && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {level.instructions}
                    </p>
                  )}

                  {status === 'locked' && lockReason && (
                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{lockReason}</span>
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {isCompleted ? (
                    (() => {
                      const usedAttempts = Number(completionRecord?.attempts || 1);
                      const canRetry = maxAttempts === 0 || (maxAttempts > 1 && usedAttempts < maxAttempts);
                      return canRetry && started ? (
                        <button
                          type="button"
                          onClick={() => onPlayLevel(level)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Replay ({maxAttempts === 0 ? `${usedAttempts} played` : `${usedAttempts}/${maxAttempts}`})</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </span>
                      );
                    })()
                  ) : isAvailable && started ? (
                    <button
                      type="button"
                      onClick={() => onPlayLevel(level)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {levels.length === 1 ? 'Start Activity' : 'Play Level'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200/80 text-slate-600 text-xs font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      {!started ? 'Scheduled' : 'Locked'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
