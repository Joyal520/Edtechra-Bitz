import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Gamepad2,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
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
  LiquidSentencesConfig,
  LuminaWordsConfig,
  MemoryMatchConfig,
  SaveTheBalloonConfig
} from '@/types/gameLibrary';

interface GameLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  classroomName: string;
  isTeacher: boolean;
  assignments: Assignment[];
  onPlayAssignment: (assignment: Assignment) => void;
  onPreviewGame: (gameId: GameId, title: string, config: GameConfig) => void;
  onPublished: (targetClassroomId: string) => void;
}

type TeacherStep = 'select' | 'configure' | 'assign';

function renderGameThumbnail(gameId: GameId) {
  switch (gameId) {
    case 'liquid-sentences':
      return (
        <div className="w-full h-32 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 p-3 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/15 blur-sm" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full w-fit">
            Sentence Builder
          </span>
          <div className="flex flex-wrap gap-1.5 z-10">
            {['Water', 'flows', 'into', 'sentences'].map((w) => (
              <span
                key={w}
                className="px-2 py-1 rounded-lg bg-white/90 text-sky-900 text-[11px] font-bold shadow-sm"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      );
    case 'save-the-balloon':
      return (
        <div className="w-full h-32 rounded-xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-3 flex items-center justify-between text-white relative overflow-hidden">
          <div className="flex flex-col justify-between h-full z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full w-fit">
              Word Rescue
            </span>
            <div className="flex gap-1 font-mono text-sm font-black tracking-widest">
              <span className="bg-white/25 px-1.5 py-0.5 rounded">G</span>
              <span className="bg-white/25 px-1.5 py-0.5 rounded">R</span>
              <span className="bg-white/25 px-1.5 py-0.5 rounded">_</span>
              <span className="bg-white/25 px-1.5 py-0.5 rounded">V</span>
            </div>
          </div>
          <svg viewBox="0 0 64 80" className="w-16 h-24 drop-shadow-md shrink-0" aria-hidden="true">
            <ellipse cx="32" cy="28" rx="20" ry="24" fill="#fff" fillOpacity="0.92" />
            <ellipse cx="25" cy="20" rx="5" ry="9" fill="#fb7185" fillOpacity="0.35" />
            <path d="M32 52 Q30 62 34 74" stroke="#fff" strokeWidth="2" fill="none" />
          </svg>
        </div>
      );
    case 'memory-match':
      return (
        <div className="w-full h-32 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-3 flex flex-col justify-between text-white relative overflow-hidden">
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full w-fit">
            Card Pairs
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {['?', 'A', '?', 'A'].map((label, idx) => (
              <div
                key={idx}
                className={`h-11 rounded-lg flex items-center justify-center font-black text-xs shadow-sm ${
                  label === '?'
                    ? 'bg-white/20 border border-white/30 text-white'
                    : 'bg-white text-purple-700'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      );
    case 'classroom-jigsaw':
      return (
        <div className="w-full h-32 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-3 flex items-center justify-between text-white relative overflow-hidden">
          <div className="flex flex-col justify-between h-full">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full w-fit">
              Visual Puzzle
            </span>
            <span className="text-xs font-bold text-emerald-50">3x3 • 4x4 • 5x5</span>
          </div>
          <div className="grid grid-cols-2 gap-1 w-16 h-16 p-1 bg-white/20 rounded-xl">
            <div className="rounded bg-white/90" />
            <div className="rounded bg-emerald-200/80" />
            <div className="rounded bg-teal-200/80" />
            <div className="rounded bg-white/50 border border-dashed border-white" />
          </div>
        </div>
      );
    case 'lumina-words':
      return (
        <div className="w-full h-32 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-700 to-slate-900 p-3 flex items-center justify-between text-white relative overflow-hidden">
          <div className="flex flex-col justify-between h-full">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full w-fit">
              Word Wheel
            </span>
            <span className="text-xs font-bold text-indigo-100">Auto Crossword</span>
          </div>
          <div className="w-16 h-16 rounded-full border-2 border-indigo-300/70 bg-white/10 relative flex items-center justify-center">
            <span className="absolute top-1 text-[10px] font-black">L</span>
            <span className="absolute right-2 text-[10px] font-black">U</span>
            <span className="absolute bottom-1 text-[10px] font-black">M</span>
            <span className="absolute left-2 text-[10px] font-black">A</span>
            <div className="w-3 h-3 rounded-full bg-amber-400 shadow" />
          </div>
        </div>
      );
  }
}

async function compressImageToDataUrl(file: File, maxDimension = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Could not load selected image'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Could not read selected file'));
    reader.readAsDataURL(file);
  });
}

export const GameLibraryModal: React.FC<GameLibraryModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  classroomName,
  isTeacher,
  assignments,
  onPlayAssignment,
  onPreviewGame,
  onPublished
}) => {
  const [step, setStep] = useState<TeacherStep>('select');
  const [selectedGameId, setSelectedGameId] = useState<GameId>('liquid-sentences');
  const [config, setConfig] = useState<GameConfig>(() => getDefaultConfigForGame('liquid-sentences'));
  const [configError, setConfigError] = useState<string | null>(null);

  // Step 3: Assign fields
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[]>([]);
  const [targetClassroomId, setTargetClassroomId] = useState(classroomId);
  const [gameTitle, setGameTitle] = useState('');
  const [availablePoints, setAvailablePoints] = useState(100);
  const [dueDate, setDueDate] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep('select');
    setConfigError(null);
    setPublishError(null);
    setTargetClassroomId(classroomId);

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
  }, [isOpen, classroomId, classroomName, isTeacher]);

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
                <h2 className="text-lg font-extrabold text-slate-900">Classroom Game Library</h2>
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
                const completed = Boolean(sub);
                const gameName = String(a.settings?.game_name || 'Classroom Game');
                return (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {gameName}
                        </span>
                        {completed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed ({sub?.final_score ?? sub?.points_awarded ?? 0}/{a.points} pts)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Up to {a.points} pts
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                      {a.due_date && (
                        <p className="text-[11px] text-slate-500">
                          Due {new Date(a.due_date).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayAssignment(a)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {completed ? 'Replay Game' : 'Play Game'}
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
    setConfig(getDefaultConfigForGame(gameId));
    setGameTitle(`${item.name} Challenge`);
    setAvailablePoints(item.defaultPoints);
    setConfigError(null);
    setStep('configure');
  };

  const validateAndSanitizeConfig = (): GameConfig | null => {
    setConfigError(null);
    switch (selectedGameId) {
      case 'liquid-sentences': {
        const c = config as LiquidSentencesConfig;
        const clean = c.sentences
          .map((s) => ({ text: s.text.trim(), hint: (s.hint || '').trim() }))
          .filter((s) => s.text.split(/\s+/).filter(Boolean).length >= 2);
        if (clean.length === 0) {
          setConfigError('Please enter at least 1 sentence with at least 2 words.');
          return null;
        }
        return { sentences: clean };
      }
      case 'save-the-balloon': {
        const c = config as SaveTheBalloonConfig;
        const clean = c.words
          .map((w) => ({
            word: w.word.replace(/[^a-zA-Z]/g, '').toUpperCase(),
            hint: (w.hint || '').trim()
          }))
          .filter((w) => w.word.length >= 2);
        if (clean.length === 0) {
          setConfigError('Please enter at least 1 word (letters A-Z, minimum 2 characters).');
          return null;
        }
        return { difficulty: c.difficulty || 'medium', words: clean };
      }
      case 'memory-match': {
        const c = config as MemoryMatchConfig;
        const clean = c.pairs
          .map((p) => ({
            term: p.term.trim(),
            definition: p.definition.trim(),
            imageUrl: p.imageUrl || undefined
          }))
          .filter((p) => p.term.length > 0 && (p.definition.length > 0 || Boolean(p.imageUrl)));
        if (clean.length < 2) {
          setConfigError('Please enter at least 2 word-definition (or picture) pairs.');
          return null;
        }
        return { themeName: (c.themeName || '').trim() || 'Classroom Match', pairs: clean };
      }
      case 'classroom-jigsaw': {
        const c = config as ClassroomJigsawConfig;
        if (!c.imageDataUrl) {
          setConfigError('Please upload a picture for the Classroom Jigsaw puzzle.');
          return null;
        }
        return {
          imageDataUrl: c.imageDataUrl,
          gridSize: c.gridSize || 3,
          title: (c.title || '').trim() || 'Classroom Jigsaw'
        };
      }
      case 'lumina-words': {
        const c = config as LuminaWordsConfig;
        const clean = c.words
          .map((w) => ({
            word: w.word.replace(/[^a-zA-Z]/g, '').toUpperCase(),
            clue: w.clue.trim()
          }))
          .filter((w) => w.word.length >= 3 && w.word.length <= 12);
        if (clean.length < 2) {
          setConfigError('Please enter at least 2 words (3 to 12 letters each, A-Z).');
          return null;
        }
        return { title: (c.title || '').trim() || 'Lumina Words', words: clean };
      }
    }
  };

  const handlePreview = () => {
    const valid = validateAndSanitizeConfig();
    if (!valid) return;
    onPreviewGame(selectedGameId, gameTitle.trim() || getGameCatalogItem(selectedGameId).name, valid);
  };

  const handleGoToAssign = () => {
    const valid = validateAndSanitizeConfig();
    if (!valid) return;
    setConfig(valid);
    setPublishError(null);
    setStep('assign');
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = validateAndSanitizeConfig();
    if (!valid) {
      setStep('configure');
      return;
    }
    if (!gameTitle.trim()) {
      setPublishError('Please enter a game title.');
      return;
    }

    setPublishing(true);
    setPublishError(null);

    const dueIso = dueDate ? new Date(dueDate).toISOString() : null;
    const result = await gameLibraryService.createGameAssignment({
      classroomId: targetClassroomId,
      gameId: selectedGameId,
      title: gameTitle.trim(),
      points: availablePoints,
      dueDate: dueIso,
      config: valid
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
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
                {step === 'select' && 'Choose a template, add your classroom content, and assign it.'}
                {step === 'configure' && 'Enter your custom words, sentences, or images below.'}
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
                    {renderGameThumbnail(game.id)}
                    <div>
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
            <div className="space-y-5">
              {configError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {configError}
                </div>
              )}

              {/* 1. Liquid Sentences Config */}
              {selectedGameId === 'liquid-sentences' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Sentences & Optional Hints</h3>
                      <p className="text-xs text-slate-500">
                        Each sentence will be scrambled into interactive floating word pills.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const c = config as LiquidSentencesConfig;
                        setConfig({ sentences: [...c.sentences, { text: '', hint: '' }] });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Sentence
                    </button>
                  </div>
                  {(config as LiquidSentencesConfig).sentences.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">
                          Sentence #{idx + 1}
                        </span>
                        {(config as LiquidSentencesConfig).sentences.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const c = config as LiquidSentencesConfig;
                              setConfig({
                                sentences: c.sentences.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            aria-label="Remove sentence"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          const c = config as LiquidSentencesConfig;
                          const next = [...c.sentences];
                          next[idx] = { ...next[idx], text: e.target.value };
                          setConfig({ sentences: next });
                        }}
                        placeholder="e.g., Photosynthesis converts sunlight into chemical energy"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                      />
                      <input
                        type="text"
                        value={item.hint || ''}
                        onChange={(e) => {
                          const c = config as LiquidSentencesConfig;
                          const next = [...c.sentences];
                          next[idx] = { ...next[idx], hint: e.target.value };
                          setConfig({ sentences: next });
                        }}
                        placeholder="Optional hint (e.g., How plants make food)"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Save the Balloon Config */}
              {selectedGameId === 'save-the-balloon' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Difficulty Level</h3>
                      <p className="text-xs text-slate-500">
                        Controls balloon lives (Easy: 8, Medium: 6, Hard: 5 guesses).
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(['easy', 'medium', 'hard'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() =>
                            setConfig({ ...(config as SaveTheBalloonConfig), difficulty: diff })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border transition ${
                            (config as SaveTheBalloonConfig).difficulty === diff
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Words & Optional Clues</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const c = config as SaveTheBalloonConfig;
                        setConfig({ ...c, words: [...c.words, { word: '', hint: '' }] });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Word
                    </button>
                  </div>

                  {(config as SaveTheBalloonConfig).words.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={item.word}
                          onChange={(e) => {
                            const c = config as SaveTheBalloonConfig;
                            const next = [...c.words];
                            next[idx] = { ...next[idx], word: e.target.value.toUpperCase() };
                            setConfig({ ...c, words: next });
                          }}
                          placeholder="WORD (e.g. GRAVITY)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold uppercase"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <input
                          type="text"
                          value={item.hint || ''}
                          onChange={(e) => {
                            const c = config as SaveTheBalloonConfig;
                            const next = [...c.words];
                            next[idx] = { ...next[idx], hint: e.target.value };
                            setConfig({ ...c, words: next });
                          }}
                          placeholder="Optional clue for students"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {(config as SaveTheBalloonConfig).words.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const c = config as SaveTheBalloonConfig;
                              setConfig({ ...c, words: c.words.filter((_, i) => i !== idx) });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1.5"
                            aria-label="Remove word"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Memory Match Config */}
              {selectedGameId === 'memory-match' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Deck Theme Name
                      </label>
                      <input
                        type="text"
                        value={(config as MemoryMatchConfig).themeName || ''}
                        onChange={(e) =>
                          setConfig({ ...(config as MemoryMatchConfig), themeName: e.target.value })
                        }
                        placeholder="e.g., Water Cycle Vocabulary"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const c = config as MemoryMatchConfig;
                        setConfig({ ...c, pairs: [...c.pairs, { term: '', definition: '' }] });
                      }}
                      className="mt-5 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Pair
                    </button>
                  </div>

                  {(config as MemoryMatchConfig).pairs.map((pair, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Pair #{idx + 1}</span>
                        {(config as MemoryMatchConfig).pairs.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const c = config as MemoryMatchConfig;
                              setConfig({ ...c, pairs: c.pairs.filter((_, i) => i !== idx) });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            aria-label="Remove pair"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={pair.term}
                          onChange={(e) => {
                            const c = config as MemoryMatchConfig;
                            const next = [...c.pairs];
                            next[idx] = { ...next[idx], term: e.target.value };
                            setConfig({ ...c, pairs: next });
                          }}
                          placeholder="Word / Term"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                        />
                        <input
                          type="text"
                          value={pair.definition}
                          onChange={(e) => {
                            const c = config as MemoryMatchConfig;
                            const next = [...c.pairs];
                            next[idx] = { ...next[idx], definition: e.target.value };
                            setConfig({ ...c, pairs: next });
                          }}
                          placeholder="Definition (or upload picture below)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5 text-sky-600" />
                          {pair.imageUrl ? 'Change Picture' : 'Upload Optional Picture'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const dataUrl = await compressImageToDataUrl(file, 360, 0.8);
                              const c = config as MemoryMatchConfig;
                              const next = [...c.pairs];
                              next[idx] = { ...next[idx], imageUrl: dataUrl };
                              setConfig({ ...c, pairs: next });
                            }}
                          />
                        </label>
                        {pair.imageUrl && (
                          <div className="flex items-center gap-2">
                            <img
                              src={pair.imageUrl}
                              alt={pair.term || 'Pair preview'}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const c = config as MemoryMatchConfig;
                                const next = [...c.pairs];
                                next[idx] = { ...next[idx], imageUrl: undefined };
                                setConfig({ ...c, pairs: next });
                              }}
                              className="text-[11px] text-rose-600 hover:underline font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Classroom Jigsaw Config */}
              {selectedGameId === 'classroom-jigsaw' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center space-y-3">
                    {(config as ClassroomJigsawConfig).imageDataUrl ? (
                      <div className="space-y-3">
                        <img
                          src={(config as ClassroomJigsawConfig).imageDataUrl}
                          alt="Jigsaw preview"
                          className="max-h-56 mx-auto rounded-xl shadow-sm border border-slate-200 object-contain"
                        />
                        <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
                          <ImagePlus className="w-4 h-4 text-emerald-600" />
                          Choose Different Picture
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const dataUrl = await compressImageToDataUrl(file, 900, 0.85);
                              setConfig({ ...(config as ClassroomJigsawConfig), imageDataUrl: dataUrl });
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="block py-8 cursor-pointer space-y-2">
                        <ImagePlus className="w-10 h-10 text-emerald-600 mx-auto" />
                        <p className="text-sm font-bold text-slate-800">
                          Upload a Picture for Your Jigsaw Puzzle
                        </p>
                        <p className="text-xs text-slate-500">
                          PNG, JPG, or WebP — automatically sized for smooth desktop & mobile play
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const dataUrl = await compressImageToDataUrl(file, 900, 0.85);
                            setConfig({ ...(config as ClassroomJigsawConfig), imageDataUrl: dataUrl });
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Puzzle Difficulty</h3>
                      <p className="text-xs text-slate-500">Choose how many pieces to slice the image into.</p>
                    </div>
                    <div className="flex gap-2">
                      {([
                        { size: 3 as const, label: 'Easy (3x3)' },
                        { size: 4 as const, label: 'Medium (4x4)' },
                        { size: 5 as const, label: 'Hard (5x5)' }
                      ]).map((opt) => (
                        <button
                          key={opt.size}
                          type="button"
                          onClick={() =>
                            setConfig({ ...(config as ClassroomJigsawConfig), gridSize: opt.size })
                          }
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                            (config as ClassroomJigsawConfig).gridSize === opt.size
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Lumina Words Config */}
              {selectedGameId === 'lumina-words' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Words & Relevant Clues</h3>
                      <p className="text-xs text-slate-500">
                        Lumina Words automatically builds a crossword grid and letter wheel from your list.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const c = config as LuminaWordsConfig;
                        setConfig({ ...c, words: [...c.words, { word: '', clue: '' }] });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Word
                    </button>
                  </div>

                  {(config as LuminaWordsConfig).words.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={item.word}
                          onChange={(e) => {
                            const c = config as LuminaWordsConfig;
                            const next = [...c.words];
                            next[idx] = { ...next[idx], word: e.target.value.toUpperCase() };
                            setConfig({ ...c, words: next });
                          }}
                          placeholder="WORD (e.g. ORBIT)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold uppercase"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <input
                          type="text"
                          value={item.clue}
                          onChange={(e) => {
                            const c = config as LuminaWordsConfig;
                            const next = [...c.words];
                            next[idx] = { ...next[idx], clue: e.target.value };
                            setConfig({ ...c, words: next });
                          }}
                          placeholder="Clue (e.g. Curved path around a star)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {(config as LuminaWordsConfig).words.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const c = config as LuminaWordsConfig;
                              setConfig({ ...c, words: c.words.filter((_, i) => i !== idx) });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1.5"
                            aria-label="Remove word"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  Classroom
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
                  Game Title
                </label>
                <input
                  type="text"
                  required
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder={`e.g., ${currentCatalog.name} Review`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Available Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={availablePoints}
                    onChange={(e) => setAvailablePoints(Math.max(1, Number(e.target.value) || 100))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Assignment Deadline
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
                Publishing will add this game to the classroom&apos;s Assignments and automatically
                announce it in the <strong>Announcement Panel</strong>.
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
                    onClick={handlePreview}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Preview Game
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
                  Back to Content
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
