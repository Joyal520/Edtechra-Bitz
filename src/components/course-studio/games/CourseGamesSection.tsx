import React, { useEffect, useState, useCallback } from 'react';
import {
  Gamepad2,
  Trophy,
  Plus,
  BarChart3,
  Edit2,
  Trash2,
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { courseGamesService } from '@/services/courseGamesService';
import type { CourseGame, CourseGameMode } from '@/types/courseGames';
import { CourseGameBuilderModal } from './CourseGameBuilderModal';
import { CourseGameAnalyticsModal } from './CourseGameAnalyticsModal';

interface CourseGamesSectionProps {
  courseId?: string;
  courseTitle?: string;
}

export const CourseGamesSection: React.FC<CourseGamesSectionProps> = ({ courseId, courseTitle }) => {
  const [games, setGames] = useState<CourseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<CourseGameMode>('learning_game');
  const [gameToEdit, setGameToEdit] = useState<CourseGame | null>(null);
  const [analyticsGameId, setAnalyticsGameId] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const data = await courseGamesService.listGames(courseId);
      setGames(data);
    } catch (err) {
      console.error('[CourseGamesSection] loadGames error:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this course game? Existing classroom points are preserved.')) return;
    try {
      await courseGamesService.deleteGame(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete game');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-sky-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-[#026fc3] text-[11px] font-black uppercase tracking-wider border border-sky-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Games & Competitions</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            {courseTitle ? `${courseTitle} — Games & Competitions` : 'Course Studio Games & Competitions'}
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Build AI-powered educational games and classroom competitions from your course lessons, EdTechra Library resources, or uploaded materials.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => {
              setGameToEdit(null);
              setBuilderMode('learning_game');
              setBuilderOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-2xl text-xs font-black shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Game</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGameToEdit(null);
              setBuilderMode('competition');
              setBuilderOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black shadow-xs cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Create Competition</span>
          </button>
        </div>
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs font-bold bg-white/80 rounded-3xl border border-slate-200">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#026fc3]" />
          Loading Games & Competitions...
        </div>
      ) : games.length === 0 ? (
        <div className="py-14 px-6 text-center bg-white/90 rounded-3xl border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-900">No Games or Competitions Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select a course lesson or EdTechra Library resource like &ldquo;Amazing Brain Facts&rdquo; and generate an interactive game in seconds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-[#026fc3]/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                      g.mode === 'competition'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-sky-50 text-[#026fc3] border border-sky-200'
                    }`}
                  >
                    {g.mode === 'competition' ? <Trophy className="w-3 h-3" /> : <Gamepad2 className="w-3 h-3" />}
                    <span>{g.mode === 'competition' ? 'Competition' : 'Learning Game'}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                      g.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {g.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{g.status}</span>
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">{g.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                  {g.description || `${g.total_questions} questions • ${g.difficulty} difficulty`}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100">{g.total_questions} Questions</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">{g.total_points} pts</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 capitalize">{g.difficulty}</span>
                </div>

                {g.assignments && g.assignments.length > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-700">
                    Assigned to {g.assignments.length} classroom{g.assignments.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGameToEdit(g);
                      setBuilderMode(g.mode);
                      setBuilderOpen(true);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Edit & Assign"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsGameId(g.id)}
                    className="p-2 rounded-xl text-[#026fc3] hover:bg-sky-50 cursor-pointer"
                    title="View Analytics"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(g.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setGameToEdit(g);
                    setBuilderMode(g.mode);
                    setBuilderOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Manage / Assign</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CourseGameBuilderModal
        isOpen={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setGameToEdit(null);
        }}
        initialCourseId={courseId}
        initialMode={builderMode}
        gameToEdit={gameToEdit}
        onSaved={() => loadGames()}
      />

      <CourseGameAnalyticsModal
        isOpen={Boolean(analyticsGameId)}
        gameId={analyticsGameId}
        onClose={() => setAnalyticsGameId(null)}
      />
    </div>
  );
};
