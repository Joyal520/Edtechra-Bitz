import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Copy,
  Layers,
  Lock,
  Play,
  Plus,
  Trash2,
  Trophy,
  Unlock
} from 'lucide-react';
import { getDefaultConfigForGame } from '@/services/gameLibraryService';
import type {
  GameConfig,
  GameId,
  GameLevelDefinition,
  LevelUnlockMode
} from '@/types/gameLibrary';
import { createLevelId } from '@/utils/gameLevelUtils';
import { GameContentEditor } from './GameContentEditor';

interface GameLevelManagerProps {
  gameId: GameId;
  levels: GameLevelDefinition[];
  unlockMode: LevelUnlockMode;
  dailyLimit: number;
  onChangeLevels: (next: GameLevelDefinition[]) => void;
  onChangeUnlockMode: (mode: LevelUnlockMode) => void;
  onChangeDailyLimit: (limit: number) => void;
  onPreviewLevel: (level: GameLevelDefinition) => void;
  onError?: (msg: string | null) => void;
}

export const GameLevelManager: React.FC<GameLevelManagerProps> = ({
  gameId,
  levels,
  unlockMode,
  dailyLimit,
  onChangeLevels,
  onChangeUnlockMode,
  onChangeDailyLimit,
  onPreviewLevel,
  onError
}) => {
  const [activeLevelId, setActiveLevelId] = useState<string>(levels[0]?.id || '');

  const activeIndex = Math.max(
    0,
    levels.findIndex((l) => l.id === activeLevelId)
  );
  const activeLevel = levels[activeIndex] || levels[0];

  const updateLevelsRenumbered = (next: GameLevelDefinition[]) => {
    onChangeLevels(
      next.map((lvl, idx) => ({
        ...lvl,
        levelNumber: idx + 1
      }))
    );
  };

  const handleAddLevel = () => {
    const newId = createLevelId();
    const nextNum = levels.length + 1;
    const newLevel: GameLevelDefinition = {
      id: newId,
      levelNumber: nextNum,
      title: `Level ${nextNum}`,
      instructions: '',
      points: 25,
      isManuallyLocked: false,
      unlockAt: null,
      config: getDefaultConfigForGame(gameId)
    };
    updateLevelsRenumbered([...levels, newLevel]);
    setActiveLevelId(newId);
  };

  const handleDuplicateLevel = (idx: number) => {
    const src = levels[idx];
    if (!src) return;
    const newId = createLevelId();
    const copy: GameLevelDefinition = {
      ...JSON.parse(JSON.stringify(src)),
      id: newId,
      title: `${src.title} (Copy)`
    };
    const next = [...levels];
    next.splice(idx + 1, 0, copy);
    updateLevelsRenumbered(next);
    setActiveLevelId(newId);
  };

  const handleDeleteLevel = (idx: number) => {
    if (levels.length <= 1) return;
    const deleted = levels[idx];
    const next = levels.filter((_, i) => i !== idx);
    updateLevelsRenumbered(next);
    if (deleted.id === activeLevelId && next[0]) {
      setActiveLevelId(next[0].id);
    }
  };

  const handleMoveLevel = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= levels.length) return;
    const next = [...levels];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    updateLevelsRenumbered(next);
  };

  const updateActiveLevel = (patch: Partial<GameLevelDefinition>) => {
    if (!activeLevel) return;
    updateLevelsRenumbered(
      levels.map((lvl) => (lvl.id === activeLevel.id ? { ...lvl, ...patch } : lvl))
    );
  };

  const totalPoints = levels.reduce((sum, l) => sum + Math.max(1, Number(l.points || 0)), 0);

  return (
    <div className="space-y-5">
      {/* Level Unlock Mode Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-extrabold text-slate-900">Game Level Manager</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            {levels.length} {levels.length === 1 ? 'Level' : 'Levels'} • {totalPoints} Total Pts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            {
              mode: 'sequential' as const,
              title: 'Sequential Unlock',
              desc: 'Complete Level 1 to unlock Level 2'
            },
            {
              mode: 'scheduled' as const,
              title: 'Scheduled Unlock',
              desc: 'Set release dates per level'
            },
            {
              mode: 'daily_limit' as const,
              title: 'Daily Level Limit',
              desc: 'Limit levels unlocked per day'
            }
          ]).map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => onChangeUnlockMode(opt.mode)}
              className={`p-3 rounded-xl border text-left transition ${
                unlockMode === opt.mode
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-xs font-extrabold">{opt.title}</div>
              <div
                className={`text-[11px] mt-0.5 ${
                  unlockMode === opt.mode ? 'text-sky-100' : 'text-slate-500'
                }`}
              >
                {opt.desc}
              </div>
            </button>
          ))}
        </div>

        {unlockMode === 'daily_limit' && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-xs font-bold text-slate-700">Levels per day:</span>
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChangeDailyLimit(n)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                  dailyLimit === n
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {n} / day
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Level List + Active Level Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Level List */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Levels ({levels.length})
            </span>
            <button
              type="button"
              onClick={handleAddLevel}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Level
            </button>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {levels.map((lvl, idx) => {
              const isSelected = activeLevel?.id === lvl.id;
              return (
                <div
                  key={lvl.id}
                  onClick={() => setActiveLevelId(lvl.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-sky-50/70 border-sky-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white">
                          Level {lvl.levelNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {lvl.points} pts
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            lvl.isManuallyLocked
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {lvl.isManuallyLocked ? (
                            <>
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </>
                          ) : (
                            <>
                              <Unlock className="w-2.5 h-2.5" /> Unlocked
                            </>
                          )}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-1">
                        {lvl.title || `Level ${lvl.levelNumber}`}
                      </h4>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div
                    className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateLevelsRenumbered(
                          levels.map((l) =>
                            l.id === lvl.id ? { ...l, isManuallyLocked: !l.isManuallyLocked } : l
                          )
                        )
                      }
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] font-semibold inline-flex items-center gap-1"
                      title={lvl.isManuallyLocked ? 'Unlock level' : 'Lock level'}
                    >
                      {lvl.isManuallyLocked ? (
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-rose-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLevel(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLevel(idx, 1)}
                      disabled={idx === levels.length - 1}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateLevel(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                      title="Duplicate Level"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPreviewLevel(lvl)}
                      className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                      title="Preview Level"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    {levels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLevel(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 ml-auto"
                        title="Delete Level"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Level Content & Settings Editor */}
        {activeLevel && (
          <div className="lg:col-span-7 p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700">
                Editing Level {activeLevel.levelNumber}
              </span>
              <button
                type="button"
                onClick={() => onPreviewLevel(activeLevel)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-bold"
              >
                <Play className="w-3.5 h-3.5" />
                Preview Level {activeLevel.levelNumber}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Level Title
                </label>
                <input
                  type="text"
                  value={activeLevel.title}
                  onChange={(e) => updateActiveLevel({ title: e.target.value })}
                  placeholder={`Level ${activeLevel.levelNumber} – Beginner`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Points Available
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={activeLevel.points}
                  onChange={(e) =>
                    updateActiveLevel({ points: Math.max(1, Number(e.target.value) || 20) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Optional Instructions for Students
              </label>
              <input
                type="text"
                value={activeLevel.instructions || ''}
                onChange={(e) => updateActiveLevel({ instructions: e.target.value })}
                placeholder="e.g., Match all basic science terms in under 60 seconds"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
            </div>

            {unlockMode === 'scheduled' && (
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-600" />
                  Scheduled Availability Date
                </label>
                <input
                  type="datetime-local"
                  value={
                    activeLevel.unlockAt
                      ? new Date(activeLevel.unlockAt).toISOString().slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    updateActiveLevel({
                      unlockAt: e.target.value ? new Date(e.target.value).toISOString() : null
                    })
                  }
                  className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                />
              </div>
            )}

            <div className="pt-2 border-t border-slate-200">
              <GameContentEditor
                gameId={gameId}
                config={activeLevel.config}
                onChange={(nextCfg: GameConfig) => updateActiveLevel({ config: nextCfg })}
                onError={onError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
