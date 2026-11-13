import React, { useState, useEffect } from 'react';
import {
  X,
  Trophy,
  Plus,
  Sparkles,
  Users,
  CheckCircle2,
  Loader2,
  Gamepad2,
  Play,
  Library,
  Search,
  Send,
  Edit3,
  Copy,
  Trash2,
  Calendar,
  Layers
} from 'lucide-react';
import { AiChallenge } from '@/types/aiChallenge';
import type { Assignment } from '@/types/classroom';
import type { GameConfig, GameId, SavedLibraryGame } from '@/types/gameLibrary';
import {
  GAME_CATALOG,
  countGameContentItems,
  gameLibraryService,
  getGameCatalogItem,
  type TeacherClassroomOption
} from '@/services/gameLibraryService';
import { normalizeAssignmentLevels, parseStudentLevelProgress } from '@/utils/gameLevelUtils';
import { aiChallengeService } from '@/services/aiChallengeService';
import { useClassroomAuth } from '@/hooks/useClassroomAuth';
import { CreateChallengeModal } from './CreateChallengeModal';
import { StudentChallengeSubmissionModal } from './StudentChallengeSubmissionModal';
import { ChallengeDashboardModal } from './ChallengeDashboardModal';

interface ChallengeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  isTeacher?: boolean;
  onUpdated?: () => void;
  gameAssignments?: Assignment[];
  onOpenGameLibrary?: (initialGameId?: GameId) => void;
  onPlayGameAssignment?: (assignment: Assignment) => void;
  onEditSavedGame?: (savedGame: SavedLibraryGame) => void;
  onPreviewGame?: (gameId: GameId, title: string, config: GameConfig, points?: number) => void;
  libraryRefreshKey?: number;
}

export const ChallengeListModal: React.FC<ChallengeListModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  isTeacher: isTeacherProp,
  onUpdated,
  gameAssignments = [],
  onOpenGameLibrary,
  onPlayGameAssignment,
  onEditSavedGame,
  onPreviewGame,
  libraryRefreshKey = 0
}) => {
  const classroomAuth = useClassroomAuth(classroomId);
  const isTeacher = isTeacherProp ?? classroomAuth.isTeacher;
  const isRoleResolving = classroomAuth.isLoading && !isTeacher;

  const [activeTab, setActiveTab] = useState<'games' | 'library' | 'competitions'>('games');
  const [challenges, setChallenges] = useState<AiChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Teacher Game Library state
  const [savedGames, setSavedGames] = useState<SavedLibraryGame[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | GameId>('all');
  const [busyGameId, setBusyGameId] = useState<string | null>(null);
  const [libraryFeedback, setLibraryFeedback] = useState<string | null>(null);

  // Reassign Saved Game dialog state
  const [assigningGame, setAssigningGame] = useState<SavedLibraryGame | null>(null);
  const [assignClassrooms, setAssignClassrooms] = useState<TeacherClassroomOption[]>([]);
  const [assignClassroomId, setAssignClassroomId] = useState(classroomId);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Submodals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedForDashboard, setSelectedForDashboard] = useState<AiChallenge | null>(null);
  const [selectedForSubmit, setSelectedForSubmit] = useState<AiChallenge | null>(null);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const list = await aiChallengeService.getChallenges(classroomId);
      setChallenges(list);
    } catch (err) {
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedGames = async () => {
    if (!isTeacher) return;
    setLoadingLibrary(true);
    try {
      const list = await gameLibraryService.getSavedGames();
      setSavedGames(list);
    } catch (err) {
      console.error('Error loading saved games:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadChallenges();
      if (isTeacher) {
        loadSavedGames();
      }
    }
  }, [isOpen, classroomId, isTeacher, libraryRefreshKey]);

  const openAssignDialog = async (game: SavedLibraryGame) => {
    setAssigningGame(game);
    setAssignClassroomId(classroomId);
    setAssignTitle(game.title);
    setAssignError(null);
    const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setAssignDueDate(
      `${defaultDue.getFullYear()}-${pad(defaultDue.getMonth() + 1)}-${pad(defaultDue.getDate())}T23:59`
    );
    const list = await gameLibraryService.getTeacherClassrooms();
    setAssignClassrooms(list.length > 0 ? list : [{ id: classroomId, name: 'Current Classroom' }]);
  };

  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningGame) return;
    if (!assignTitle.trim()) {
      setAssignError('Please enter an assignment title.');
      return;
    }
    setAssigning(true);
    setAssignError(null);
    const totalPoints = (assigningGame.levels || []).reduce(
      (sum, l) => sum + Math.max(1, Number(l.points || 20)),
      0
    );
    const dueIso = assignDueDate ? new Date(assignDueDate).toISOString() : null;
    const res = await gameLibraryService.createGameAssignment({
      classroomId: assignClassroomId,
      gameId: assigningGame.game_id,
      title: assignTitle.trim(),
      points: totalPoints || 100,
      dueDate: dueIso,
      levels: assigningGame.levels,
      unlockMode: assigningGame.unlock_mode,
      dailyLimit: assigningGame.daily_limit,
      libraryGameId: assigningGame.id
    });
    setAssigning(false);
    if (res.error) {
      setAssignError(res.error);
      return;
    }
    const targetName =
      assignClassrooms.find((c) => c.id === assignClassroomId)?.name || 'selected classroom';
    setLibraryFeedback(`Assigned "${assignTitle.trim()}" to ${targetName}.`);
    setTimeout(() => setLibraryFeedback(null), 4000);
    setAssigningGame(null);
    onUpdated?.();
  };

  const handleDuplicateSaved = async (game: SavedLibraryGame) => {
    setBusyGameId(game.id);
    const res = await gameLibraryService.duplicateSavedGame(game);
    setBusyGameId(null);
    if (res.data) {
      setSavedGames((prev) => [res.data!, ...prev]);
      setLibraryFeedback(`Duplicated "${game.title}".`);
      setTimeout(() => setLibraryFeedback(null), 3500);
    }
  };

  const handleDeleteSaved = async (game: SavedLibraryGame) => {
    if (
      !confirm(
        `Remove "${game.title}" from your Game Library? Historical classroom assignments and student results will remain intact.`
      )
    ) {
      return;
    }
    setBusyGameId(game.id);
    const res = await gameLibraryService.deleteSavedGame(game.id);
    setBusyGameId(null);
    if (res.success) {
      setSavedGames((prev) => prev.filter((item) => item.id !== game.id));
      setLibraryFeedback(`Deleted "${game.title}" from your Game Library.`);
      setTimeout(() => setLibraryFeedback(null), 3500);
    }
  };

  if (!isOpen) return null;

  const showInitialLoading = (loading || isRoleResolving) && challenges.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-lg">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  {isTeacher ? 'Teacher Hub' : 'Student Hub'}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight">
                Games & Competitions
              </h2>
              <p className="text-xs text-indigo-100 font-medium">
                {isTeacher
                  ? 'Assign educational games or create AI-evaluated classroom challenges'
                  : 'Play assigned educational games and participate in classroom challenges'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeacher && activeTab === 'competitions' && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-white text-indigo-700 font-black rounded-2xl text-xs shadow-md hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Challenge</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switcher: Educational Games | Game Library (Teachers) | Competitions */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'games'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Educational Games</span>
          </button>
          {isTeacher && (
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              <span>Game Library ({savedGames.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('competitions')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'competitions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Competitions ({challenges.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'library' && isTeacher ? (
            <div className="space-y-4">
              {libraryFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{libraryFeedback}</span>
                </div>
              )}

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search saved games..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <select
                  value={libraryFilter}
                  onChange={(e) => setLibraryFilter(e.target.value as 'all' | GameId)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                >
                  <option value="all">All Game Types</option>
                  {GAME_CATALOG.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {loadingLibrary ? (
                <div className="py-14 text-center space-y-2.5">
                  <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">Loading your Game Library...</p>
                </div>
              ) : savedGames.length === 0 ? (
                <div className="py-12 text-center space-y-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 px-4">
                  <Library className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-800">
                      Your Game Library is empty
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Create a game in Educational Games and save or assign it — it will automatically appear here so you can reuse it across any classroom.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('games')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Your First Game</span>
                  </button>
                </div>
              ) : (
                (() => {
                  const q = librarySearch.trim().toLowerCase();
                  const filtered = savedGames.filter((g) => {
                    if (libraryFilter !== 'all' && g.game_id !== libraryFilter) return false;
                    if (!q) return true;
                    const cat = getGameCatalogItem(g.game_id);
                    return (
                      g.title.toLowerCase().includes(q) ||
                      cat.name.toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-600">
                          No saved games match your search or filter.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filtered.map((g) => {
                        const cat = getGameCatalogItem(g.game_id);
                        const levelCount = g.levels?.length || 0;
                        const itemCount = countGameContentItems(g.game_id, g.levels || []);
                        const isBusy = busyGameId === g.id;
                        return (
                          <div
                            key={g.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3.5 hover:border-emerald-300 hover:shadow-md transition"
                          >
                            <div className="flex items-start gap-3.5">
                              <img
                                src={g.thumbnail_url || cat.thumbnailUrl}
                                alt={g.title}
                                className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                  {cat.name}
                                </span>
                                <h3 className="text-sm font-extrabold text-slate-900 truncate">
                                  {g.title}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Layers className="w-3 h-3 text-emerald-600" />
                                    {levelCount} {levelCount === 1 ? 'Level' : 'Levels'}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Updated {new Date(g.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => openAssignDialog(g)}
                                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Assign to Classroom</span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || !g.levels?.length}
                                onClick={() => {
                                  const first = g.levels?.[0];
                                  if (!first || !onPreviewGame) return;
                                  onPreviewGame(
                                    g.game_id,
                                    `${g.title} — ${first.title || 'Level 1'}`,
                                    first.config,
                                    first.points
                                  );
                                }}
                                title="Preview Level 1"
                                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 text-slate-600 transition cursor-pointer"
                                aria-label="Preview"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  onClose();
                                  onEditSavedGame?.(g);
                                }}
                                title="Edit game"
                                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-600 transition cursor-pointer"
                                aria-label="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDuplicateSaved(g)}
                                title="Duplicate game"
                                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-600 transition cursor-pointer"
                                aria-label="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteSaved(g)}
                                title="Delete from library"
                                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 transition cursor-pointer"
                                aria-label="Delete"
                              >
                                {isBusy ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
          ) : activeTab === 'games' ? (
            isTeacher ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAME_CATALOG.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between gap-3 hover:border-sky-300 hover:shadow-md transition"
                  >
                    <div className="space-y-2.5">
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                        <img
                          src={game.thumbnailUrl}
                          alt={game.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 mb-1">
                          {game.category}
                        </span>
                        <h3 className="text-sm font-extrabold text-slate-900">{game.name}</h3>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {game.shortDescription}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenGameLibrary?.(game.id);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create Game</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : gameAssignments.length === 0 ? (
              <div className="py-12 text-center space-y-2 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <Gamepad2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-800">No educational games assigned yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When your teacher assigns a game, it will appear here and in the Announcement Panel.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameAssignments.map((a) => {
                  const sub = a.my_submission;
                  const levels = normalizeAssignmentLevels(a);
                  const prog = parseStudentLevelProgress(sub);
                  const completed = levels.length > 0 && prog.completedCount >= levels.length;
                  const cat = getGameCatalogItem((a.settings?.game_id as GameId) || 'liquid-sentences');
                  return (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-sky-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                              {String(a.settings?.game_name || cat.name)}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                              {prog.completedCount}/{levels.length} Levels
                            </span>
                            {completed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed ({prog.totalPointsEarned}/{a.points} pts)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                {prog.totalPointsEarned > 0
                                  ? `${prog.totalPointsEarned}/${a.points} pts`
                                  : `Up to ${a.points} pts`}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 truncate">{a.title}</h3>
                          {a.due_date && (
                            <p className="text-[11px] text-slate-500">
                              Due {new Date(a.due_date).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {completed ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPlayGameAssignment?.(a);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0 cursor-pointer hover:bg-emerald-100 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPlayGameAssignment?.(a);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition shrink-0 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Game</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : showInitialLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Loading AI challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            /* Role-Specific Empty State */
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                {isTeacher ? 'No challenges created yet' : 'No challenges available yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                {isTeacher
                  ? 'Click "Create Challenge" above to launch an open-ended writing, story, or project challenge with automated AI evaluation.'
                  : 'Your teacher has not published any open-ended challenges yet. Check back soon!'}
              </p>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-indigo-600 text-white font-black rounded-2xl text-xs shadow-md hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Challenge</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {challenges.map((ch) => {
                const mySub = ch.my_submission;
                const isCompleted = mySub?.status === 'completed';

                return (
                  <div
                    key={ch.id}
                    className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                          {ch.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Max Marks: {ch.max_marks}
                        </span>
                        {ch.required_word_count && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            ~{ch.required_word_count} words
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {ch.title}
                      </h3>

                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {ch.instructions}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{ch.submitted_count || 0} Submitted</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{ch.completed_count || 0} Evaluated</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedForDashboard(ch)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-2xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{isTeacher ? 'View Dashboard & Results' : 'Leaderboard'}</span>
                      </button>

                      {!isTeacher && (
                        <button
                          type="button"
                          onClick={() => setSelectedForSubmit(ch)}
                          className={`px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'View Score' : mySub ? 'Check Status' : 'Submit Work'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Create Challenge Submodal */}
      {isCreateOpen && (
        <CreateChallengeModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          classroomId={classroomId}
          onChallengeCreated={() => {
            loadChallenges();
            onUpdated?.();
          }}
        />
      )}

      {/* Challenge Dashboard Submodal */}
      {selectedForDashboard && (
        <ChallengeDashboardModal
          isOpen={Boolean(selectedForDashboard)}
          onClose={() => setSelectedForDashboard(null)}
          challenge={selectedForDashboard}
          isTeacher={isTeacher}
          onOpenStudentSubmit={() => {
            const ch = selectedForDashboard;
            setSelectedForDashboard(null);
            setSelectedForSubmit(ch);
          }}
        />
      )}

      {/* Student Submission Submodal */}
      {selectedForSubmit && (
        <StudentChallengeSubmissionModal
          isOpen={Boolean(selectedForSubmit)}
          onClose={() => setSelectedForSubmit(null)}
          challenge={selectedForSubmit}
          onSubmitted={() => {
            loadChallenges();
            onUpdated?.();
          }}
        />
      )}

      {/* Reassign Saved Game to Classroom Dialog */}
      {assigningGame && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmReassign}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-sky-50">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={assigningGame.thumbnail_url || getGameCatalogItem(assigningGame.game_id).thumbnailUrl}
                  alt={assigningGame.title}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate">Assign to Classroom</h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {getGameCatalogItem(assigningGame.game_id).name} • {assigningGame.levels?.length || 0} Levels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningGame(null)}
                className="p-1.5 rounded-xl hover:bg-white text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {assignError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {assignError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Target Classroom
                </label>
                <select
                  value={assignClassroomId}
                  onChange={(e) => setAssignClassroomId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                >
                  {assignClassrooms.map((c) => (
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
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Total Points</span>
                  <span className="text-sm font-black text-slate-900">
                    {(assigningGame.levels || []).reduce(
                      (sum, l) => sum + Math.max(1, Number(l.points || 20)),
                      0
                    )}{' '}
                    pts
                  </span>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 mb-1">
                    <Calendar className="w-3 h-3 text-sky-600" />
                    Optional Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={assignDueDate}
                    onChange={(e) => setAssignDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Reuses your saved game levels and content without modifying other classrooms or student progress.
              </p>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningGame(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigning}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Confirm Assignment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
