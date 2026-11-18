import React, { useEffect, useState } from 'react';
import {
  X,
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Loader2,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { courseGamesService } from '@/services/courseGamesService';
import type { CourseGameAnalytics } from '@/types/courseGames';

interface CourseGameAnalyticsModalProps {
  isOpen: boolean;
  gameId: string | null;
  onClose: () => void;
}

export const CourseGameAnalyticsModal: React.FC<CourseGameAnalyticsModalProps> = ({
  isOpen,
  gameId,
  onClose
}) => {
  const [analytics, setAnalytics] = useState<CourseGameAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !gameId) return;
    setLoading(true);
    setError(null);
    courseGamesService
      .getAnalytics(gameId)
      .then(setAnalytics)
      .catch((err) => setError(err.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [isOpen, gameId]);

  if (!isOpen || !gameId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-[#0a213c] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart3 className="w-5 h-5 text-sky-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">
                {analytics?.game_title || 'Game Performance Analytics'}
              </h2>
              <p className="text-[11px] text-sky-200 font-semibold">
                Participant completion, question-level accuracy & learning gaps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-bold">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#026fc3]" />
              Loading performance intelligence...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
              {error}
            </div>
          ) : analytics ? (
            <>
              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Participants
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {analytics.total_participants}
                    {analytics.total_assigned_students > 0 && (
                      <span className="text-xs text-slate-400 font-bold">/{analytics.total_assigned_students}</span>
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completion
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-1">{analytics.completion_rate}%</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
                  <div className="text-[10px] font-black uppercase text-[#026fc3] flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Avg Score
                  </div>
                  <div className="text-xl font-black text-[#026fc3] mt-1">{analytics.average_score}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="text-[10px] font-black uppercase text-amber-700 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Highest
                  </div>
                  <div className="text-xl font-black text-amber-800 mt-1">{analytics.highest_score}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="text-[10px] font-black uppercase text-rose-600">Lowest</div>
                  <div className="text-xl font-black text-rose-700 mt-1">{analytics.lowest_score}</div>
                </div>
              </div>

              {/* Most Frequently Incorrect Questions & Students Needing Support */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Most Frequently Missed Questions
                  </h3>
                  {analytics.most_incorrect_questions.length === 0 ? (
                    <p className="text-xs text-slate-400">No missed questions recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.most_incorrect_questions.map((q) => (
                        <div key={q.question_id} className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs">
                          <div className="font-bold text-slate-900 line-clamp-2">{q.question_text}</div>
                          <div className="text-[11px] text-amber-800 font-semibold mt-1">
                            {q.incorrect_count} incorrect • {q.accuracy_pct}% accuracy
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-rose-500" />
                    Students Requiring Support (&lt; 60%)
                  </h3>
                  {analytics.students_needing_support.length === 0 ? (
                    <p className="text-xs text-slate-400">All participating students scored 60% or above.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.students_needing_support.map((st) => (
                        <div key={st.student_id} className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/70 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{st.full_name}</span>
                          <span className="font-black text-rose-700">
                            {st.accuracy_pct}% ({st.best_score}/{st.max_score})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Question-Level Performance */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Question-Level Performance</h3>
                <div className="space-y-2">
                  {analytics.question_performance.map((q) => (
                    <div key={q.question_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-lg">
                          Q{q.order_index + 1}. {q.question_text}
                        </span>
                        <span className="font-black text-slate-700 shrink-0">{q.accuracy_pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            q.accuracy_pct >= 75 ? 'bg-emerald-500' : q.accuracy_pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${q.accuracy_pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard */}
              {analytics.leaderboard.length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Participant Rankings
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {analytics.leaderboard.map((entry, idx) => (
                      <div key={entry.student_id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-slate-100 font-black text-slate-700 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">{entry.full_name}</span>
                          {entry.team_name && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#026fc3] text-[10px] font-black">
                              {entry.team_name}
                            </span>
                          )}
                        </div>
                        <div className="font-black text-slate-800">
                          {entry.best_score} pts • {entry.accuracy_pct}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
