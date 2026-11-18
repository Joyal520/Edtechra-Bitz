import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Award,
  RotateCcw
} from 'lucide-react';
import { courseGamesService } from '@/services/courseGamesService';
import type {
  CourseGame,
  CourseGameAssignment,
  CourseGameAttempt,
  CourseGameQuestion
} from '@/types/courseGames';

interface CourseGamePlayerModalProps {
  isOpen: boolean;
  gameAssignmentId: string | null;
  onClose: () => void;
  onCompleted?: () => void;
}

export const CourseGamePlayerModal: React.FC<CourseGamePlayerModalProps> = ({
  isOpen,
  gameAssignmentId,
  onClose,
  onCompleted
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<CourseGame | null>(null);
  const [assignment, setAssignment] = useState<CourseGameAssignment | null>(null);
  const [questions, setQuestions] = useState<CourseGameQuestion[]>([]);
  const [attempts, setAttempts] = useState<CourseGameAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Gameplay state
  const [phase, setPhase] = useState<'intro' | 'playing' | 'results'>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [teamName, setTeamName] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [latestResult, setLatestResult] = useState<{
    attempt: CourseGameAttempt;
    recommendations: string[];
    points_awarded_delta: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadSession = async () => {
    if (!gameAssignmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await courseGamesService.getPlaySession(gameAssignmentId);
      setGame(data.game);
      setAssignment(data.assignment);
      setQuestions(data.questions || []);
      setAttempts(data.attempts || []);
      setLeaderboard(data.leaderboard || []);
      if (data.game.competition_format === 'team' && data.game.settings?.team_names?.length) {
        setTeamName(data.game.settings.team_names[0]);
      }
      setPhase('intro');
      setAnswers({});
      setCurrentIdx(0);
      setLatestResult(null);
    } catch (err: any) {
      setError(err.message || 'Unable to load game.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && gameAssignmentId) {
      loadSession();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, gameAssignmentId]);

  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSec((s) => s + 1);
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  if (!isOpen || !gameAssignmentId) return null;

  const startGame = () => {
    setAnswers({});
    setCurrentIdx(0);
    setElapsedSec(0);
    const limit = assignment?.time_limit_sec || game?.settings?.time_limit_sec || 0;
    setSecondsLeft(limit > 0 ? limit : null);
    setPhase('playing');
  };

  const handleSubmit = async (autoTimeout = false) => {
    if (!gameAssignmentId || submitting) return;
    if (!autoTimeout && questions.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await courseGamesService.submitAttempt(gameAssignmentId, {
        answers,
        timeTakenSec: elapsedSec,
        teamName: teamName || null
      });
      setLatestResult(res);
      setPhase('results');
      if (onCompleted) onCompleted();
    } catch (err: any) {
      setError(err.message || 'Failed to submit answers.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentIdx];
  const maxAttempts = assignment?.max_attempts || 3;
  const attemptsUsed = attempts.length;
  const canPlay = attemptsUsed < maxAttempts && questions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Bar */}
        <div className="px-5 py-3.5 bg-[#0a213c] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black truncate">{game?.title || 'Course Game'}</h2>
            <p className="text-[11px] text-sky-200 font-semibold truncate">
              {game?.course?.title || 'Course Studio'} • {questions.length} Questions • {game?.total_points || 100} Max Pts
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {phase === 'playing' && secondsLeft !== null && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black ${
                  secondsLeft <= 15 ? 'bg-rose-600 text-white animate-pulse' : 'bg-white/10 text-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs font-bold">
              <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#026fc3]" />
              Preparing game session...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
              {error}
            </div>
          ) : phase === 'intro' && game ? (
            <div className="space-y-5 text-center max-w-lg mx-auto py-4">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 text-[#026fc3] border border-sky-200 flex items-center justify-center mx-auto">
                {game.mode === 'competition' ? <Trophy className="w-8 h-8 text-amber-500" /> : <Sparkles className="w-8 h-8" />}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">{game.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{game.description || 'Answer every question carefully to earn points and badges!'}</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 font-bold text-[10px] uppercase">Questions</div>
                  <div className="font-black text-slate-900 text-base">{questions.length}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 font-bold text-[10px] uppercase">Max Score</div>
                  <div className="font-black text-[#026fc3] text-base">{game.total_points} pts</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 font-bold text-[10px] uppercase">Attempts</div>
                  <div className="font-black text-slate-900 text-base">
                    {attemptsUsed}/{maxAttempts}
                  </div>
                </div>
              </div>

              {game.competition_format === 'team' && game.settings?.team_names?.length ? (
                <div className="text-left">
                  <label className="block text-xs font-black text-slate-700 mb-1">Select Your Team</label>
                  <select
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {game.settings.team_names.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {canPlay ? (
                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-2xl text-sm font-black shadow-md cursor-pointer"
                >
                  {attemptsUsed > 0 ? 'Start New Attempt' : 'Start Game'}
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                  {questions.length === 0 ? 'No questions available in this game.' : `You have used all ${maxAttempts} attempts.`}
                </div>
              )}
            </div>
          ) : phase === 'playing' && currentQ ? (
            <div className="space-y-5">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black text-slate-500">
                  <span>
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span>{currentQ.points} pts</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#026fc3] transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Prompt */}
              <div className="space-y-3">
                {currentQ.image_url && (
                  <img src={currentQ.image_url} alt="" className="max-h-56 rounded-2xl object-contain mx-auto border border-slate-200" />
                )}
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {currentQ.question_text}
                </h3>
              </div>

              {/* Answer Input by Type */}
              {(currentQ.question_type === 'multiple_choice' ||
                currentQ.question_type === 'image_based' ||
                currentQ.question_type === 'true_false') && (
                <div className="grid grid-cols-1 gap-2.5">
                  {(Array.isArray(currentQ.options) ? currentQ.options : ['True', 'False']).map((opt: string, oIdx: number) => {
                    const selected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: opt }))}
                        className={`p-3.5 rounded-2xl border-2 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          selected
                            ? 'bg-sky-50 border-[#026fc3] text-[#026fc3]'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-sky-300'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {(currentQ.question_type === 'fill_blank' ||
                currentQ.question_type === 'short_answer' ||
                currentQ.question_type === 'correct_mistake') && (
                <input
                  type="text"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-[#026fc3] rounded-2xl text-sm font-semibold focus:outline-none"
                />
              )}

              {currentQ.question_type === 'word_arrangement' && (
                <div className="space-y-3">
                  <div className="min-h-[48px] p-3 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-wrap gap-2">
                    {(Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : []).map((w: string, wIdx: number) => (
                      <button
                        key={`${w}_${wIdx}`}
                        type="button"
                        onClick={() => {
                          const cur = [...(answers[currentQ.id] || [])];
                          cur.splice(wIdx, 1);
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: cur }));
                        }}
                        className="px-3 py-1.5 bg-[#026fc3] text-white rounded-xl text-xs font-black cursor-pointer"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(currentQ.options) ? currentQ.options : []).map((word: string, wIdx: number) => (
                      <button
                        key={`${word}_${wIdx}`}
                        type="button"
                        onClick={() => {
                          const cur = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                          setAnswers((prev) => ({ ...prev, [currentQ.id]: [...cur, word] }));
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:border-[#026fc3] rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentQ.question_type === 'matching' && Array.isArray(currentQ.options) && (
                <div className="space-y-2.5">
                  {currentQ.options.map((pair: { left: string; right: string }, pIdx: number) => {
                    const currentMap = answers[currentQ.id] || {};
                    const rightChoices = currentQ.options.map((p: any) => p.right);
                    return (
                      <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-black text-slate-900">{pair.left}</span>
                        <select
                          value={currentMap[pair.left] || ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: { ...currentMap, [pair.left]: e.target.value }
                            }))
                          }
                          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          <option value="">-- Select match --</option>
                          {rightChoices.map((rc: string, rIdx: number) => (
                            <option key={rIdx} value={rc}>
                              {rc}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Navigation */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black disabled:opacity-40 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white rounded-xl text-xs font-black cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{submitting ? 'Submitting...' : 'Submit Answers'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : phase === 'results' && latestResult ? (
            <div className="space-y-5">
              {/* Score Hero */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a213c] to-[#033d6b] text-white text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-black">
                  <Award className="w-4 h-4" />
                  <span>{latestResult.attempt.badges_earned?.join(' • ') || 'Completed'}</span>
                </div>
                <div className="text-4xl font-black">
                  {latestResult.attempt.score}{' '}
                  <span className="text-lg text-sky-200 font-bold">/ {latestResult.attempt.max_score} pts</span>
                </div>
                <div className="grid grid-cols-4 gap-2 max-w-md mx-auto pt-2 text-xs">
                  <div className="p-2 rounded-xl bg-white/10">
                    <div className="text-emerald-300 font-black">{latestResult.attempt.correct_count}</div>
                    <div className="text-[10px] text-sky-200">Correct</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <div className="text-rose-300 font-black">{latestResult.attempt.incorrect_count}</div>
                    <div className="text-[10px] text-sky-200">Incorrect</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <div className="text-amber-300 font-black">{latestResult.attempt.accuracy_pct}%</div>
                    <div className="text-[10px] text-sky-200">Accuracy</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <div className="text-white font-black">{latestResult.attempt.time_taken_sec}s</div>
                    <div className="text-[10px] text-sky-200">Time</div>
                  </div>
                </div>
              </div>

              {/* Learning Recommendations */}
              {latestResult.recommendations?.length > 0 && (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-1.5">
                  <div className="text-xs font-black uppercase text-[#026fc3]">Learning Recommendations</div>
                  {latestResult.recommendations.map((rec, i) => (
                    <p key={i} className="text-xs font-medium text-slate-700">
                      • {rec}
                    </p>
                  ))}
                </div>
              )}

              {/* Answer Review */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase text-slate-600">Answer Breakdown</h4>
                {latestResult.attempt.answers.map((ans, idx) => {
                  const q = questions.find((item) => item.id === ans.question_id);
                  return (
                    <div
                      key={ans.question_id}
                      className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                        ans.is_correct ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          Q{idx + 1}. {q?.question_text}
                        </span>
                        {ans.is_correct ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </div>
                      {!ans.is_correct && (
                        <div className="text-[11px] font-semibold text-emerald-800">
                          Correct Answer: {typeof ans.correct_answer === 'object' ? JSON.stringify(ans.correct_answer) : String(ans.correct_answer)}
                        </div>
                      )}
                      {ans.explanation && <p className="text-[11px] text-slate-600">{ans.explanation}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Competition Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Leaderboard
                  </div>
                  {leaderboard.slice(0, 10).map((entry, idx) => (
                    <div key={entry.student_id} className="flex items-center justify-between text-xs py-1">
                      <span className="font-bold text-slate-800">
                        #{idx + 1} {entry.full_name}
                      </span>
                      <span className="font-black text-[#026fc3]">{entry.score} pts</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                {attemptsUsed + 1 < maxAttempts && (
                  <button
                    type="button"
                    onClick={loadSession}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Play Again</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-[#026fc3] text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
