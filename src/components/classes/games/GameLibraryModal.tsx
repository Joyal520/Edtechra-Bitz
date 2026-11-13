import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Gamepad2,
  Loader2,
  Play,
  Send,
  Sparkles,
  Trophy,
  X
} from 'lucide-react';
import {
  GAME_CATALOG,
  gameLibraryService,
  getDefaultConfigForGame,
  getGameCatalogItem,
  type TeacherClassroomOption
} from '@/services/gameLibraryService';
import type { Assignment } from '@/types/classroom';
import type {
  ClassroomJigsawConfig,
  GameConfig,
  GameId,
  GameLevelDefinition,
  LevelUnlockMode,
  LiquidSentencesConfig,
  LuminaWordsConfig,
  MemoryMatchConfig,
  SaveTheBalloonConfig
} from '@/types/gameLibrary';
import { createLevelId } from '@/utils/gameLevelUtils';
import { GameLevelManager } from './GameLevelManager';

interface GameLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  classroomName: string;
  isTeacher: boolean;
  assignments: Assignment[];
  initialGameId?: GameId | null;
  onPlayAssignment: (assignment: Assignment) => void;
  onPreviewGame: (gameId: GameId, title: string, config: GameConfig, points?: number) => void;
  onPublished: (targetClassroomId: string) => void;
}

type TeacherStep = 'select' | 'configure' | 'assign';

function createInitialLevels(gameId: GameId): GameLevelDefinition[] {
  return [
    {
      id: createLevelId(),
      levelNumber: 1,
      title: 'Level 1 – Beginner',
      instructions: '',
      points: 25,
      isManuallyLocked: false,
      unlockAt: null,
      config: getDefaultConfigForGame(gameId)
    }
  ];
}

function sanitizeLevelConfig(
  gameId: GameId,
  cfg: GameConfig,
  levelLabel: string
): { config?: GameConfig; error?: string } {
  switch (gameId) {
    case 'liquid-sentences': {
      const c = cfg as LiquidSentencesConfig;
      const clean = c.sentences
        .map((s) => ({ text: s.text.trim(), hint: (s.hint || '').trim() }))
        .filter((s) => s.text.split(/\s+/).filter(Boolean).length >= 2);
      if (clean.length === 0) {
        return { error: `${levelLabel}: Please enter at least 1 sentence with at least 2 words.` };
      }
      return { config: { sentences: clean } };
    }
    case 'save-the-balloon': {
      const c = cfg as SaveTheBalloonConfig;
      const clean = c.words
        .map((w) => ({
          word: w.word.replace(/[^a-zA-Z]/g, '').toUpperCase(),
          hint: (w.hint || '').trim()
        }))
        .filter((w) => w.word.length >= 2);
      if (clean.length === 0) {
        return { error: `${levelLabel}: Please enter at least 1 word (letters A-Z, minimum 2 characters).` };
      }
      return {
        config: {
          difficulty: c.difficulty || 'medium',
          lives: c.lives || (c.difficulty === 'easy' ? 8 : c.difficulty === 'hard' ? 5 : 6),
          showTimer: c.showTimer !== false,
          allowHints: c.allowHints !== false,
          words: clean
        }
      };
    }
    case 'memory-match': {
      const c = cfg as MemoryMatchConfig;
      const clean = c.pairs
        .map((p) => ({
          term: p.term.trim(),
          definition: p.definition.trim(),
          imageUrl: p.imageUrl || undefined
        }))
        .filter((p) => p.term.length > 0 && (p.definition.length > 0 || Boolean(p.imageUrl)));
      if (clean.length < 2) {
        return { error: `${levelLabel}: Please enter at least 2 word-definition (or picture) pairs.` };
      }
      return { config: { themeName: (c.themeName || '').trim() || 'Classroom Match', pairs: clean } };
    }
    case 'classroom-jigsaw': {
      const c = cfg as ClassroomJigsawConfig;
      const imgs = c.images && c.images.length > 0 ? c.images : c.imageDataUrl ? [c.imageDataUrl] : [];
      if (imgs.length === 0) {
        return { error: `${levelLabel}: Please upload at least one picture for the Classroom Jigsaw puzzle.` };
      }
      return {
        config: {
          imageDataUrl: imgs[0],
          images: imgs,
          gridSize: ([2, 3, 4].includes(c.gridSize) ? c.gridSize : 3) as 2 | 3 | 4,
          title: (c.title || '').trim() || levelLabel
        }
      };
    }
    case 'lumina-words': {
      const c = cfg as LuminaWordsConfig;
      const clean = c.words
        .map((w) => ({
          word: w.word.replace(/[^a-zA-Z]/g, '').toUpperCase(),
          clue: w.clue.trim()
        }))
        .filter((w) => w.word.length >= 3 && w.word.length <= 12);
      if (clean.length < 2) {
        return { error: `${levelLabel}: Please enter at least 2 words (3 to 12 letters each, A-Z).` };
      }
      return { config: { title: (c.title || '').trim() || 'Lumina Words', words: clean } };
    }
  }
}

export const GameLibraryModal: React.FC<GameLibraryModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  classroomName,
  isTeacher,
  assignments,
  initialGameId = null,
  onPlayAssignment,
  onPreviewGame,
  onPublished
}) => {
  const [step, setStep] = useState<TeacherStep>('select');
  const [selectedGameId, setSelectedGameId] = useState<GameId>('liquid-sentences');
  const [levels, setLevels] = useState<GameLevelDefinition[]>(() =>
    createInitialLevels('liquid-sentences')
  );
  const [unlockMode, setUnlockMode] = useState<LevelUnlockMode>('sequential');
  const [dailyLimit, setDailyLimit] = useState<number>(1);
  const [configError, setConfigError] = useState<string | null>(null);

  // Step 3: Assign fields
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[]>([]);
  const [targetClassroomId, setTargetClassroomId] = useState(classroomId);
  const [gameTitle, setGameTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setConfigError(null);
    setPublishError(null);
    setTargetClassroomId(classroomId);
    setUnlockMode('sequential');
    setDailyLimit(1);

    if (isTeacher && initialGameId) {
      const item = getGameCatalogItem(initialGameId);
      setSelectedGameId(initialGameId);
      setLevels(createInitialLevels(initialGameId));
      setGameTitle(`${item.name} Challenge`);
      setStep('configure');
    } else {
      setStep('select');
    }

    const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setDueDate(
      `${defaultDue.getFullYear()}-${pad(defaultDue.getMonth() + 1)}-${pad(defaultDue.getDate())}T23:59`
    );

    if (isTeacher) {
      gameLibraryService.getTeacherClassrooms().then((list) => {
        if (list.length > 0) {
          setClassrooms(list);
        } else {
          setClassrooms([{ id: classroomId, name: classroomName }]);
        }
      });
    }
  }, [isOpen, classroomId, classroomName, isTeacher, initialGameId]);

  if (!isOpen) return null;

  const gameAssignments = assignments.filter((a) => Boolean(a.settings?.is_game_library));

  // Student-only view: never expose teacher configuration screens
  if (!isTeacher) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Educational Games</h2>
                <p className="text-xs text-slate-500">
                  Play assigned games to earn points on the {classroomName} leaderboard
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/80 text-slate-500 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-3">
            {gameAssignments.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <Gamepad2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No games assigned yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  When your teacher publishes a game, it will appear here and in the Class Stream.
                </p>
              </div>
            ) : (
              gameAssignments.map((a) => {
                const sub = a.my_submission;
                const completed = sub?.status === 'graded';
                const gameName = String(a.settings?.game_name || 'Classroom Game');
                const cat = getGameCatalogItem((a.settings?.game_id as GameId) || 'liquid-sentences');
                return (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={cat.thumbnailUrl}
                        alt={cat.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {gameName}
                          </span>
                          {completed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed ({sub?.points_awarded ?? 0}/{a.points} pts)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Up to {a.points} pts
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 truncate">{a.title}</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayAssignment(a)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {completed ? 'View Levels' : 'Open Levels'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSelectGame = (gameId: GameId) => {
    const item = getGameCatalogItem(gameId);
    setSelectedGameId(gameId);
    setLevels(createInitialLevels(gameId));
    setGameTitle(`${item.name} Challenge`);
    setConfigError(null);
    setStep('configure');
  };

  const validateAllLevels = (): GameLevelDefinition[] | null => {
    setConfigError(null);
    const sanitized: GameLevelDefinition[] = [];
    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i];
      const label = lvl.title?.trim() || `Level ${i + 1}`;
      const res = sanitizeLevelConfig(selectedGameId, lvl.config, label);
      if (res.error || !res.config) {
        setConfigError(res.error || `Invalid configuration in ${label}`);
        return null;
      }
      sanitized.push({
        ...lvl,
        levelNumber: i + 1,
        title: label,
        instructions: (lvl.instructions || '').trim(),
        points: Math.max(1, Math.round(lvl.points || 20)),
        config: res.config
      });
    }
    return sanitized;
  };

  const handlePreviewLevel = (lvl: GameLevelDefinition) => {
    const label = lvl.title?.trim() || `Level ${lvl.levelNumber}`;
    const res = sanitizeLevelConfig(selectedGameId, lvl.config, label);
    if (res.error || !res.config) {
      setConfigError(res.error || `Invalid configuration in ${label}`);
      return;
    }
    setConfigError(null);
    onPreviewGame(selectedGameId, `${gameTitle.trim() || currentCatalog.name} — ${label}`, res.config, lvl.points);
  };

  const handleGoToAssign = () => {
    const valid = validateAllLevels();
    if (!valid) return;
    setLevels(valid);
    setPublishError(null);
    setStep('assign');
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLevels = validateAllLevels();
    if (!validLevels) {
      setStep('configure');
      return;
    }
    if (!gameTitle.trim()) {
      setPublishError('Please enter an assignment title.');
      return;
    }

    const totalPoints = validLevels.reduce((sum, l) => sum + l.points, 0);
    setPublishing(true);
    setPublishError(null);

    const dueIso = dueDate ? new Date(dueDate).toISOString() : null;
    const result = await gameLibraryService.createGameAssignment({
      classroomId: targetClassroomId,
      gameId: selectedGameId,
      title: gameTitle.trim(),
      points: totalPoints,
      dueDate: dueIso,
      levels: validLevels,
      unlockMode,
      dailyLimit
    });

    setPublishing(false);

    if (result.error) {
      setPublishError(result.error);
      return;
    }

    onPublished(targetClassroomId);
    onClose();
  };

  const currentCatalog = getGameCatalogItem(selectedGameId);
  const totalPoints = levels.reduce((sum, l) => sum + Math.max(1, Number(l.points || 20)), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-indigo-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {step !== 'select' && (
              <button
                type="button"
                onClick={() => setStep(step === 'assign' ? 'configure' : 'select')}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {step === 'select' && 'Game Library — Select a Game'}
                {step === 'configure' && `Configure ${currentCatalog.name}`}
                {step === 'assign' && `Assign ${currentCatalog.name}`}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {step === 'select' && 'Choose a game, add levels and content, preview, and assign.'}
                {step === 'configure' && currentCatalog.shortDescription}
                {step === 'assign' && 'Publish to a classroom and announce it automatically.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {step === 'select' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAME_CATALOG.map((game) => (
                <div
                  key={game.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-4 hover:border-sky-300 hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                      <img
                        src={game.thumbnailUrl}
                        alt={game.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 mb-1.5">
                        {game.category}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900">{game.name}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {game.shortDescription}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectGame(game.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Create Game
                  </button>
                </div>
              ))}
            </div>
          )}

          {step === 'configure' && (
            <div className="space-y-4">
              {configError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {configError}
                </div>
              )}

              <GameLevelManager
                gameId={selectedGameId}
                levels={levels}
                unlockMode={unlockMode}
                dailyLimit={dailyLimit}
                onChangeLevels={setLevels}
                onChangeUnlockMode={setUnlockMode}
                onChangeDailyLimit={setDailyLimit}
                onPreviewLevel={handlePreviewLevel}
                onError={setConfigError}
              />
            </div>
          )}

          {step === 'assign' && (
            <form id="game-assign-form" onSubmit={handlePublish} className="space-y-4 max-w-xl mx-auto">
              {publishError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {publishError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Classroom
                </label>
                <select
                  value={targetClassroomId}
                  onChange={(e) => setTargetClassroomId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.subject ? ` (${c.subject})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Assignment Title
                </label>
                <input
                  type="text"
                  required
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder={`e.g., ${currentCatalog.name} Challenge`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      Total Points ({levels.length} {levels.length === 1 ? 'Level' : 'Levels'})
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sum of points configured per level
                    </p>
                  </div>
                  <span className="text-lg font-black text-slate-900">{totalPoints} pts</span>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Optional Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-800">
                Publishing will add this {levels.length}-level game ({unlockMode.replace('_', ' ')} mode)
                to the classroom&apos;s Assignments and announce it in the <strong>Announcement Panel</strong>.
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {step !== 'select' && (
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {step === 'configure' ? (
              <>
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Back to Games
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => levels[0] && handlePreviewLevel(levels[0])}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Preview Level 1
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToAssign}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
                  >
                    Assign Game
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('configure')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Back to Levels
                </button>
                <button
                  type="submit"
                  form="game-assign-form"
                  disabled={publishing}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Publish Assignment
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
