import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Lock,
  Play,
  Trophy,
  X
} from 'lucide-react';
import { getGameCatalogItem } from '@/services/gameLibraryService';
import type { Assignment } from '@/types/classroom';
import type { GameId, GameLevelDefinition, LevelUnlockMode } from '@/types/gameLibrary';
import {
  evaluateLevelsForStudent,
  getLevelQuestionCount,
  isAssignmentPublished,
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
  if (!isOpen) return null;

  const isPublished = !isUnavailable && isAssignmentPublished(assignment);
  const gameId = (assignment.settings?.game_id as GameId) || 'liquid-sentences';
  const catalogItem = getGameCatalogItem(gameId);
  const levels = normalizeAssignmentLevels(assignment);
  const unlockMode: LevelUnlockMode = assignment.settings?.unlock_mode || 'sequential';
  const dailyLimit = Number(assignment.settings?.daily_limit || 1);

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

  const totalAvailablePoints = levels.reduce((sum, l) => sum + l.points, 0);
  const progressPct =
    levels.length > 0 ? Math.round((completedCount / levels.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-50 via-white to-indigo-50 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={catalogItem.thumbnailUrl}
              alt={catalogItem.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 border border-sky-200 shadow-sm"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-600 text-white">
                  {catalogItem.name}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {unlockMode === 'sequential'
                    ? 'Sequential Unlock'
                    : unlockMode === 'scheduled'
                    ? 'Scheduled Unlock'
                    : `Daily Limit: ${dailyLimit}/day`}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {assignment.title}
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Your Progress: {completedCount} of {levels.length}{' '}
                {levels.length === 1 ? 'Level' : 'Levels'} Completed
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

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <Trophy className="w-4 h-4 text-amber-500" />
            <div className="text-xs">
              <span className="font-black text-slate-900">{totalPointsEarned}</span>
              <span className="text-slate-500 font-semibold"> / {totalAvailablePoints} pts</span>
            </div>
          </div>
        </div>

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

                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {isCompleted && completionRecord
                        ? `${completionRecord.scoreEarned} / ${level.points} pts earned`
                        : `${level.points} pts`}
                    </span>

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
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                    </span>
                  ) : isAvailable ? (
                    <button
                      type="button"
                      onClick={() => onPlayLevel(level)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Play Level
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200/80 text-slate-600 text-xs font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
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
