import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookmarkCheck,
  Calendar,
  CheckCircle2,
  Gamepad2,
  Loader2,
  Play,
  Save,
  Search,
  Send,
  Sparkles,
  Trophy,
  Users,
  X
} from 'lucide-react';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_TYPE_LABELS,
  GAME_CATALOG,
  gameLibraryService,
  getEmptyConfigForGame,
  getGameCatalogItem,
  type ClassroomStudentOption,
  type TeacherClassroomOption
} from '@/services/gameLibraryService';
import { isAssignmentPublished } from '@/utils/gameLevelUtils';
import {
  generateLuminaPuzzles,
  validateLuminaWords
} from '@/utils/luminaPuzzleGenerator';
import { validateJigsawConfig } from '@/utils/jigsawQuestions';
import type { Assignment } from '@/types/classroom';
import type {
  ActivityCategory,
  ClassroomJigsawConfig,
  ConnectionsConfig,
  GameConfig,
  GameId,
  GameLevelDefinition,
  GameOfWordsConfig,
  LevelUnlockMode,
  LiquidSentencesConfig,
  LuminaWordsConfig,
  MemoryMatchConfig,
  SaveTheBalloonConfig,
  SavedLibraryGame,
  SnakeSpellConfig,
  StandaloneTrainingConfig
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
  editingSavedGame?: SavedLibraryGame | null;
  onPlayAssignment: (assignment: Assignment) => void;
  onPreviewGame: (gameId: GameId, title: string, config: GameConfig, points?: number) => void;
  onPublished: (targetClassroomId: string) => void;
  onSavedToLibrary?: (savedGame: SavedLibraryGame) => void;
}

type TeacherStep = 'select' | 'configure' | 'assign';

function createInitialLevels(gameId: GameId): GameLevelDefinition[] {
  const item = getGameCatalogItem(gameId);
  const initialPoints = item.supportsScoring === false ? 0 : item.isStandaloneBuiltIn ? item.defaultPoints : 25;
  return [
    {
      id: createLevelId(),
      levelNumber: 1,
      title: item.isStandaloneBuiltIn ? item.name : 'Level 1 – Beginner',
      instructions: '',
      points: initialPoints,
      isManuallyLocked: false,
      unlockAt: null,
      config: getEmptyConfigForGame(gameId)
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
      const validation = validateJigsawConfig(cfg as ClassroomJigsawConfig, levelLabel);
      if (validation.error || !validation.normalized) {
        return { error: validation.error || `${levelLabel}: Invalid Classroom Jigsaw configuration.` };
      }
      return {
        config: validation.normalized
      };
    }
    case 'lumina-words': {
      const c = cfg as LuminaWordsConfig;
      const nonEmpty = c.words.filter((w) => w.word.trim().length > 0);
      const validation = validateLuminaWords(nonEmpty);
      if (validation.tooLongWords.length > 0) {
        const examples = validation.tooLongWords
          .slice(0, 3)
          .map((w) => `"${w.clean}" (${w.length} chars)`)
          .join(', ');
        return {
          error: `${levelLabel}: Target words must be 8 characters or fewer. Please shorten or replace: ${examples}.`
        };
      }
      if (validation.tooShortWords.length > 0) {
        const examples = validation.tooShortWords
          .slice(0, 3)
          .map((w) => `"${w}"`)
          .join(', ');
        return {
          error: `${levelLabel}: Each target word must have at least 2 letters (A–Z): ${examples}.`
        };
      }
      if (validation.validWords.length < 2) {
        return {
          error: `${levelLabel}: Please enter at least 2 words (2 to 8 letters each, A–Z).`
        };
      }
      const generatedPuzzles = generateLuminaPuzzles(validation.validWords);
      if (generatedPuzzles.length === 0) {
        return {
          error: `${levelLabel}: Could not organize words into valid puzzles (max 8 unique letters per puzzle).`
        };
      }
      return {
        config: {
          title: (c.title || '').trim() || 'Lumina Words',
          words: validation.validWords,
          puzzles: generatedPuzzles
        }
      };
    }
    case 'snake-spell': {
      const c = cfg as SnakeSpellConfig;
      const seen = new Set<string>();
      const cleanWords: { word: string; hint: string }[] = [];
      for (const item of c.words || []) {
        const cleaned = [...String(item.word || '')]
          .filter((ch) => /\p{L}/u.test(ch))
          .join('')
          .toLocaleUpperCase();
        if (cleaned.length < 3 || cleaned.length > 12) continue;
        if (seen.has(cleaned)) continue;
        seen.add(cleaned);
        cleanWords.push({ word: cleaned, hint: (item.hint || '').trim() });
      }
      if (cleanWords.length === 0) {
        return {
          error: `${levelLabel}: Please enter at least 1 valid word (3 to 12 letters each).`
        };
      }
      return {
        config: {
          title: (c.title || '').trim() || 'Snake Spell',
          words: cleanWords,
          missingLetters: ([0, 1, 2, 3].includes(Number(c.missingLetters))
            ? Number(c.missingLetters)
            : 0) as 0 | 1 | 2 | 3,
          lives: ([3, 5, 8].includes(Number(c.lives)) ? Number(c.lives) : 3) as 3 | 5 | 8,
          speed: ([0.8, 1, 1.25].includes(Number(c.speed)) ? Number(c.speed) : 1) as 0.8 | 1 | 1.25
        }
      };
    }
    case 'connections': {
      const c = cfg as ConnectionsConfig;
      const groups = Array.isArray(c.groups) ? c.groups : [];
      if (groups.length !== 4) {
        return { error: `${levelLabel}: Connections requires exactly 4 category groups.` };
      }
      const seenWords = new Set<string>();
      const normalizedGroups: ConnectionsConfig['groups'] = [];
      for (let i = 0; i < 4; i++) {
        const g = groups[i];
        const grpTitle = (g?.title || '').trim();
        if (!grpTitle) {
          return {
            error: `${levelLabel}: Please enter a category name for Group ${i + 1}.`
          };
        }
        const words = (Array.isArray(g?.words) ? g.words : []).map((w) =>
          String(w || '').trim().toUpperCase()
        );
        if (words.length !== 4 || words.some((w) => !w)) {
          return {
            error: `${levelLabel}: Group "${grpTitle}" must contain 4 words.`
          };
        }
        for (const w of words) {
          if (seenWords.has(w)) {
            return {
              error: `${levelLabel}: Duplicate word "${w}" found. All 16 words must be unique.`
            };
          }
          seenWords.add(w);
        }
        normalizedGroups.push({
          title: grpTitle,
          level: ([0, 1, 2, 3].includes(Number(g?.level)) ? Number(g.level) : i) as 0 | 1 | 2 | 3,
          words: words as [string, string, string, string]
        });
      }
      return {
        config: {
          title: (c.title || '').trim() || 'Connections Challenge',
          groups: normalizedGroups
        }
      };
    }
    case 'game-of-words': {
      const c = (cfg || {}) as GameOfWordsConfig;
      const sourceMode = c.sourceMode || 'builtin';
      const cleanWords = (Array.isArray(c.words) ? c.words : [])
        .map((w) => ({
          word: String(w.word || '').trim(),
          definition: String(w.definition || '').trim(),
          example: (w.example || '').trim(),
          category: (w.category || 'Everyday').trim(),
          difficulty: (w.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
          synonyms: Array.isArray(w.synonyms)
            ? w.synonyms.map((s) => String(s || '').trim()).filter(Boolean)
            : undefined,
          antonym: (w.antonym || '').trim() || undefined,
          imageUrl: w.imageUrl || undefined,
          emoji: (w.emoji || '').trim() || undefined
        }))
        .filter((w) => w.word.length > 0 && w.definition.length > 0);

      if (sourceMode === 'custom' && cleanWords.length < 4) {
        return {
          error: `${levelLabel}: Custom Word List mode requires at least 4 words with definitions (or switch to Hybrid / Built-in 2,000 Words).`
        };
      }

      return {
        config: {
          title: (c.title || '').trim() || 'Vocabulary Training',
          description: (c.description || '').trim(),
          sourceMode,
          category: c.category || 'All',
          difficulty: c.difficulty || 'all',
          gameMode: c.gameMode || 'all',
          roundSize: Math.max(4, Math.min(30, Number(c.roundSize || 10))),
          timedChallenge: Boolean(c.timedChallenge),
          timeLimitSeconds: Math.max(30, Math.min(300, Number(c.timeLimitSeconds || 60))),
          words: cleanWords
        } satisfies GameOfWordsConfig
      };
    }
    default: {
      const item = getGameCatalogItem(gameId);
      const sc = (cfg || {}) as StandaloneTrainingConfig;
      return {
        config: {
          title: (sc.title || '').trim() || item.name,
          teacherNote: (sc.teacherNote || '').trim()
        }
      };
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
  editingSavedGame = null,
  onPlayAssignment,
  onPreviewGame,
  onPublished,
  onSavedToLibrary
}) => {
  const [step, setStep] = useState<TeacherStep>('select');
  const [selectedGameId, setSelectedGameId] = useState<GameId>('liquid-sentences');
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [levels, setLevels] = useState<GameLevelDefinition[]>(() =>
    createInitialLevels('liquid-sentences')
  );
  const [unlockMode, setUnlockMode] = useState<LevelUnlockMode>('sequential');
  const [dailyLimit, setDailyLimit] = useState<number>(1);
  const [configError, setConfigError] = useState<string | null>(null);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [librarySaveMessage, setLibrarySaveMessage] = useState<string | null>(null);

  // Step 1: Select filters
  const [selectSearch, setSelectSearch] = useState('');
  const [selectCategory, setSelectCategory] = useState<'all' | ActivityCategory>('all');

  // Step 3: Assign fields
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[]>([]);
  const [targetClassroomId, setTargetClassroomId] = useState(classroomId);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([classroomId]);
  const [classroomStudents, setClassroomStudents] = useState<ClassroomStudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [audienceMode, setAudienceMode] = useState<'all' | 'selected'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [gameTitle, setGameTitle] = useState('');
  const [teacherInstructions, setTeacherInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [isCompulsory, setIsCompulsory] = useState<boolean>(true);
  const [showScoresToStudents, setShowScoresToStudents] = useState<boolean>(true);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState<boolean>(true);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [campaignReleaseStart, setCampaignReleaseStart] = useState<number>(1);
  const [campaignReleaseEnd, setCampaignReleaseEnd] = useState<number>(10);
  const [campaignPointsPerLevel, setCampaignPointsPerLevel] = useState<number>(10);

  useEffect(() => {
    if (!isOpen) return;
    setConfigError(null);
    setPublishError(null);
    setLibrarySaveMessage(null);
    setTargetClassroomId(classroomId);
    setSelectedClassroomIds([classroomId]);
    setAudienceMode('all');
    setSelectedStudentIds([]);
    setTeacherInstructions('');
    setStartDate('');
    setMaxAttempts(1);
    setIsCompulsory(true);
    setSelectSearch('');
    setSelectCategory('all');

    if (isTeacher && editingSavedGame) {
      const item = getGameCatalogItem(editingSavedGame.game_id);
      setEditingLibraryId(editingSavedGame.id);
      setSelectedGameId(editingSavedGame.game_id);
      setLevels(
        editingSavedGame.levels && editingSavedGame.levels.length > 0
          ? JSON.parse(JSON.stringify(editingSavedGame.levels))
          : createInitialLevels(editingSavedGame.game_id)
      );
      setUnlockMode(editingSavedGame.unlock_mode || 'sequential');
      setDailyLimit(editingSavedGame.daily_limit || 1);
      setGameTitle(editingSavedGame.title);
      setShowScoresToStudents(item.supportsScoring !== false);
      setLeaderboardEnabled(item.defaultLeaderboardEnabled !== false);
      setStep('configure');
    } else if (isTeacher && initialGameId) {
      const item = getGameCatalogItem(initialGameId);
      setEditingLibraryId(null);
      setSelectedGameId(initialGameId);
      setLevels(createInitialLevels(initialGameId));
      setUnlockMode('sequential');
      setDailyLimit(1);
      setGameTitle(item.isStandaloneBuiltIn ? item.name : `${item.name} Challenge`);
      setShowScoresToStudents(item.supportsScoring !== false);
      setLeaderboardEnabled(item.defaultLeaderboardEnabled !== false);
      if (item.isCampaignGame) {
        setCampaignReleaseStart(1);
        setCampaignReleaseEnd(item.defaultInitialReleaseEnd || 10);
        setCampaignPointsPerLevel(10);
        setStep('assign');
      } else {
        setStep('configure');
      }
    } else {
      setEditingLibraryId(null);
      setUnlockMode('sequential');
      setDailyLimit(1);
      setShowScoresToStudents(true);
      setLeaderboardEnabled(true);
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
  }, [isOpen, classroomId, classroomName, isTeacher, initialGameId, editingSavedGame]);

  useEffect(() => {
    if (!isOpen || !isTeacher || step !== 'assign' || !targetClassroomId) return;
    let active = true;
    setLoadingStudents(true);
    gameLibraryService.getClassroomStudents(targetClassroomId).then((students) => {
      if (!active) return;
      setClassroomStudents(students);
      setLoadingStudents(false);
    });
    return () => {
      active = false;
    };
  }, [isOpen, isTeacher, step, targetClassroomId]);

  if (!isOpen) return null;

  const gameAssignments = assignments.filter(
    (a) => Boolean(a.settings?.is_game_library) && (isTeacher || isAssignmentPublished(a))
  );

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
                <h2 className="text-lg font-extrabold text-slate-900">Games & Training</h2>
                <p className="text-xs text-slate-500">
                  Play assigned games, cognitive training, and mindfulness activities in {classroomName}
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
    setGameTitle(item.isStandaloneBuiltIn ? item.name : `${item.name} Challenge`);
    setShowScoresToStudents(item.supportsScoring !== false);
    setLeaderboardEnabled(item.defaultLeaderboardEnabled !== false);
    setConfigError(null);
    if (item.isCampaignGame) {
      setCampaignReleaseStart(1);
      setCampaignReleaseEnd(item.defaultInitialReleaseEnd || 10);
      setCampaignPointsPerLevel(10);
      setStep('assign');
    } else {
      setStep('configure');
    }
  };

  const validateAllLevels = (): GameLevelDefinition[] | null => {
    setConfigError(null);
    const item = getGameCatalogItem(selectedGameId);
    const supportsScoring = item.supportsScoring !== false;
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
        points: supportsScoring ? Math.max(0, Math.round(lvl.points ?? 20)) : 0,
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

  const handleSaveToLibrary = async () => {
    const validLevels = validateAllLevels();
    if (!validLevels) return;
    const titleToSave = gameTitle.trim() || `${getGameCatalogItem(selectedGameId).name} Challenge`;
    setSavingLibrary(true);
    setLibrarySaveMessage(null);
    const saved = await gameLibraryService.saveGameToLibrary({
      id: editingLibraryId || undefined,
      gameId: selectedGameId,
      title: titleToSave,
      levels: validLevels,
      unlockMode,
      dailyLimit
    });
    setSavingLibrary(false);
    if (saved.error || !saved.data) {
      setConfigError(saved.error || 'Failed to save game to library.');
      return;
    }
    setEditingLibraryId(saved.data.id);
    setGameTitle(saved.data.title);
    setLevels(validLevels);
    setLibrarySaveMessage('Saved to your Game Library');
    onSavedToLibrary?.(saved.data);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameTitle.trim()) {
      setPublishError('Please enter an activity title.');
      return;
    }

    const classroomIdsToPublish =
      selectedClassroomIds.length > 0 ? selectedClassroomIds : [targetClassroomId];

    if (classroomIdsToPublish.length === 1 && audienceMode === 'selected' && selectedStudentIds.length === 0) {
      setPublishError('Please select at least one student, or switch to Entire Classroom.');
      return;
    }

    const item = getGameCatalogItem(selectedGameId);
    const isCampaign = Boolean(item.isCampaignGame);
    const validLevels = isCampaign ? levels : validateAllLevels();
    if (!validLevels) {
      setStep('configure');
      return;
    }

    const supportsScoring = item.supportsScoring !== false;
    const totalPoints = supportsScoring
      ? validLevels.reduce((sum, l) => sum + l.points, 0)
      : 0;
    setPublishing(true);
    setPublishError(null);

    let savedLibId: string | undefined;
    if (!isCampaign) {
      const libResult = await gameLibraryService.saveGameToLibrary({
        id: editingLibraryId || undefined,
        gameId: selectedGameId,
        title: gameTitle.trim(),
        levels: validLevels,
        unlockMode,
        dailyLimit
      });
      if (libResult.data) {
        savedLibId = libResult.data.id;
        setEditingLibraryId(libResult.data.id);
        onSavedToLibrary?.(libResult.data);
      }
    }

    const dueIso = dueDate ? new Date(dueDate).toISOString() : null;
    const startIso = startDate ? new Date(startDate).toISOString() : null;
    const result = await gameLibraryService.createGameAssignment({
      classroomId: classroomIdsToPublish[0],
      classroomIds: classroomIdsToPublish,
      gameId: selectedGameId,
      title: gameTitle.trim(),
      points: totalPoints,
      dueDate: dueIso,
      startDate: startIso,
      instructions: teacherInstructions.trim() || undefined,
      maxAttempts,
      isCompulsory,
      showScoresToStudents: supportsScoring ? showScoresToStudents : false,
      leaderboardEnabled: supportsScoring ? leaderboardEnabled : false,
      assignedStudentIds:
        classroomIdsToPublish.length === 1 && audienceMode === 'selected'
          ? selectedStudentIds
          : null,
      levels: validLevels,
      unlockMode,
      dailyLimit,
      libraryGameId: savedLibId,
      ...(isCampaign
        ? {
            campaignRelease: {
              releasedStart: campaignReleaseStart,
              releasedEnd: Math.max(campaignReleaseStart, campaignReleaseEnd),
              pointsPerLevel: campaignPointsPerLevel
            }
          }
        : {})
    });

    setPublishing(false);

    if (result.error) {
      setPublishError(result.error);
      return;
    }

    onPublished(classroomIdsToPublish[0]);
    onClose();
  };

  const currentCatalog = getGameCatalogItem(selectedGameId);
  const supportsScoring = currentCatalog.supportsScoring !== false;
  const totalPoints = supportsScoring
    ? levels.reduce((sum, l) => sum + Math.max(0, Number(l.points ?? 0)), 0)
    : 0;

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
                {step === 'select' && 'Games & Training — Select an Activity'}
                {step === 'configure' && `Configure ${currentCatalog.name}`}
                {step === 'assign' && `Assign ${currentCatalog.name}`}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {step === 'select' && 'Choose an educational game, brain training, or mindfulness activity to preview and assign.'}
                {step === 'configure' && currentCatalog.shortDescription}
                {step === 'assign' && 'Configure classroom & student targeting, dates, attempts, and scoring rules.'}
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
            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={selectSearch}
                    onChange={(e) => setSelectSearch(e.target.value)}
                    placeholder="Search activities by title, category, or type..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {ACTIVITY_CATEGORIES.filter((c) => c.id !== 'competitions').map((catOpt) => {
                    const active = selectCategory === catOpt.id;
                    return (
                      <button
                        key={catOpt.id}
                        type="button"
                        onClick={() => setSelectCategory(catOpt.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 border transition ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {catOpt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAME_CATALOG.filter((game) => {
                  if (selectCategory !== 'all' && game.categoryId !== selectCategory) return false;
                  const q = selectSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    game.name.toLowerCase().includes(q) ||
                    game.shortDescription.toLowerCase().includes(q) ||
                    game.category.toLowerCase().includes(q) ||
                    ACTIVITY_TYPE_LABELS[game.activityType].toLowerCase().includes(q)
                  );
                }).map((game) => (
                  <div
                    key={game.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-4 hover:border-sky-300 hover:shadow-md transition"
                  >
                    <div className="space-y-3">
                      <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-100 relative">
                        <img
                          src={game.thumbnailUrl}
                          alt={game.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900/75 text-white">
                          {ACTIVITY_TYPE_LABELS[game.activityType]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            {game.category}
                          </span>
                          {game.estimatedDuration && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {game.estimatedDuration}
                            </span>
                          )}
                          {game.difficulty && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
                              {game.difficulty}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900">{game.name}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {game.shortDescription}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onPreviewGame(
                            game.id,
                            game.name,
                            getEmptyConfigForGame(game.id),
                            game.defaultPoints
                          )
                        }
                        className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1 transition"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectGame(game.id)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {game.isStandaloneBuiltIn ? 'Assign Activity' : 'Create Game'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'configure' && (
            <div className="space-y-4">
              {configError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {configError}
                </div>
              )}
              {librarySaveMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 shrink-0" />
                  <span>{librarySaveMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Game Title (saved in your Game Library)
                </label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder={`e.g., ${currentCatalog.name} Challenge`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                />
              </div>

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
            <form id="game-assign-form" onSubmit={handlePublish} className="space-y-4 max-w-2xl mx-auto">
              {publishError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {publishError}
                </div>
              )}

              {currentCatalog.isCampaignGame && (
                <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/70 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-sky-900">
                        Initial Teacher-Controlled Level Release
                      </h4>
                      <p className="text-[11px] text-sky-800">
                        Students can only play released levels ({currentCatalog.totalLevels?.toLocaleString()} total levels available). You can unlock more batches per class anytime.
                      </p>
                    </div>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white text-sky-700 border border-sky-200">
                      {Math.max(0, campaignReleaseEnd - campaignReleaseStart + 1)} Levels Released
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[10, 20, 50, currentCatalog.totalLevels || 1000].map((endVal) => (
                      <button
                        key={endVal}
                        type="button"
                        onClick={() => {
                          setCampaignReleaseStart(1);
                          setCampaignReleaseEnd(endVal);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          campaignReleaseStart === 1 && campaignReleaseEnd === endVal
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {endVal === currentCatalog.totalLevels ? `All (${endVal.toLocaleString()})` : `Levels 1–${endVal}`}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Level</label>
                      <input
                        type="number"
                        min={1}
                        max={currentCatalog.totalLevels || 1000}
                        value={campaignReleaseStart}
                        onChange={(e) => setCampaignReleaseStart(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">End Level</label>
                      <input
                        type="number"
                        min={1}
                        max={currentCatalog.totalLevels || 1000}
                        value={campaignReleaseEnd}
                        onChange={(e) => setCampaignReleaseEnd(Math.max(campaignReleaseStart, Math.min(currentCatalog.totalLevels || 1000, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Pts / Level</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={campaignPointsPerLevel}
                        onChange={(e) => setCampaignPointsPerLevel(Math.max(1, Number(e.target.value) || 10))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Target Classroom(s) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Target Classroom{classrooms.length > 1 ? 's' : ''}
                </label>
                {classrooms.length <= 1 ? (
                  <select
                    value={targetClassroomId}
                    onChange={(e) => {
                      setTargetClassroomId(e.target.value);
                      setSelectedClassroomIds([e.target.value]);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.subject ? ` (${c.subject})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {classrooms.map((c) => {
                      const checked = selectedClassroomIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            checked
                              ? 'border-sky-400 bg-sky-50/70 text-sky-950'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedClassroomIds((prev) => {
                                const next = checked
                                  ? prev.filter((id) => id !== c.id)
                                  : [...prev, c.id];
                                if (next.length === 0) return prev;
                                setTargetClassroomId(next[0]);
                                if (next.length > 1) setAudienceMode('all');
                                return next;
                              });
                            }}
                            className="rounded accent-sky-600"
                          />
                          <span className="truncate">
                            {c.name}
                            {c.subject ? ` (${c.subject})` : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assign To: Entire Classroom vs Selected Students */}
              {selectedClassroomIds.length === 1 && (
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-sky-600" />
                      Assign To
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAudienceMode('all')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition ${
                          audienceMode === 'all'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Entire Classroom
                      </button>
                      <button
                        type="button"
                        onClick={() => setAudienceMode('selected')}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition ${
                          audienceMode === 'selected'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Selected Students ({selectedStudentIds.length})
                      </button>
                    </div>
                  </div>

                  {audienceMode === 'selected' && (
                    <div className="space-y-2 pt-1">
                      {loadingStudents ? (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Loading classroom students...
                        </div>
                      ) : classroomStudents.length === 0 ? (
                        <p className="text-xs text-slate-500">No active students enrolled in this classroom yet.</p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Select students who can access this activity</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedStudentIds(
                                  selectedStudentIds.length === classroomStudents.length
                                    ? []
                                    : classroomStudents.map((s) => s.id)
                                )
                              }
                              className="text-sky-700 hover:underline"
                            >
                              {selectedStudentIds.length === classroomStudents.length
                                ? 'Clear All'
                                : 'Select All'}
                            </button>
                          </div>
                          <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                            {classroomStudents.map((st) => {
                              const picked = selectedStudentIds.includes(st.id);
                              return (
                                <label
                                  key={st.id}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${
                                    picked
                                      ? 'bg-white border-sky-400 text-slate-900 font-bold'
                                      : 'bg-white/70 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={picked}
                                    onChange={() =>
                                      setSelectedStudentIds((prev) =>
                                        picked ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                                      )
                                    }
                                    className="rounded accent-sky-600"
                                  />
                                  <span className="truncate">{st.fullName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Activity Title
                </label>
                <input
                  type="text"
                  required
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder={`e.g., ${currentCatalog.name}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Teacher Instructions (shown to students before starting)
                </label>
                <textarea
                  rows={2}
                  value={teacherInstructions}
                  onChange={(e) => setTeacherInstructions(e.target.value)}
                  placeholder={`e.g., Complete ${currentCatalog.name} carefully and review your progress at the end.`}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Start Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Deadline (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Allowed Attempts
                  </label>
                  <select
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value={1}>1 Attempt</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={0}>Unlimited Attempts</option>
                  </select>
                </div>
              </div>

              {/* Teacher Controls: Compulsory / Score Visibility / Leaderboard */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer">
                  <span>Compulsory Activity</span>
                  <input
                    type="checkbox"
                    checked={isCompulsory}
                    onChange={(e) => setIsCompulsory(e.target.checked)}
                    className="rounded accent-sky-600"
                  />
                </label>
                {supportsScoring && (
                  <>
                    <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer">
                      <span>Show Scores to Students</span>
                      <input
                        type="checkbox"
                        checked={showScoresToStudents}
                        onChange={(e) => setShowScoresToStudents(e.target.checked)}
                        className="rounded accent-sky-600"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer">
                      <span>Include in Leaderboard</span>
                      <input
                        type="checkbox"
                        checked={leaderboardEnabled}
                        onChange={(e) => setLeaderboardEnabled(e.target.checked)}
                        className="rounded accent-sky-600"
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    {supportsScoring
                      ? `Total Points (${levels.length} ${levels.length === 1 ? 'Level' : 'Levels'})`
                      : `Completion Activity (${ACTIVITY_TYPE_LABELS[currentCatalog.activityType]})`}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {supportsScoring
                      ? `Mode: ${unlockMode.replace('_', ' ')} • ${leaderboardEnabled ? 'Counts toward leaderboard' : 'Practice / non-leaderboard'}`
                      : 'Completion and session metrics recorded without forced scores.'}
                  </p>
                </div>
                <span className="text-lg font-black text-slate-900">
                  {supportsScoring ? `${totalPoints} pts` : 'Completion'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-800">
                Publishing will assign this activity to {selectedClassroomIds.length}{' '}
                {selectedClassroomIds.length === 1 ? 'classroom' : 'classrooms'} and announce it in the{' '}
                <strong>Announcement Panel</strong>.
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
                <div className="flex flex-wrap items-center gap-2.5">
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
                    onClick={handleSaveToLibrary}
                    disabled={savingLibrary}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 text-xs font-bold"
                  >
                    {savingLibrary ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {editingLibraryId ? 'Update Library' : 'Save to Library'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToAssign}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
                  >
                    Next: Assign Activity
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
