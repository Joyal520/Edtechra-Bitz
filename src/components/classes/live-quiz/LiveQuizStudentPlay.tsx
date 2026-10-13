import React, { useState, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Hourglass,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { LiveQuizSession, LiveQuizServerState } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';
import { quizAudioService } from '@/services/quizAudioService';
import { ConfettiCelebration } from './ConfettiCelebration';

interface LiveQuizStudentPlayProps {
  session: LiveQuizSession;
  onQuizFinished?: (results: any) => void;
}

const OPTION_THEMES = [
  { badgeBg: 'bg-violet-500/15 text-violet-300 border border-violet-500/20', label: 'A' },
  { badgeBg: 'bg-sky-500/15 text-sky-300 border border-sky-500/20', label: 'B' },
  { badgeBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/20', label: 'C' },
  { badgeBg: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20', label: 'D' }
];

// ---------------------------------------------------------------------------
// Error Boundary to prevent any blank screen in student player
// ---------------------------------------------------------------------------
interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LiveQuizErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LiveQuizErrorBoundary] Caught runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl border border-rose-500/30">
          <AlertCircle className="w-12 h-12 text-rose-400 animate-pulse" />
          <h2 className="text-xl font-black">Something went wrong</h2>
          <p className="text-xs text-slate-300 max-w-sm">
            We hit an unexpected issue loading the quiz question. Click below to reload your question smoothly.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              if (this.props.onReset) this.props.onReset();
              else window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Question</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Main Player Inner Component
// ---------------------------------------------------------------------------
const LiveQuizStudentPlayInner: React.FC<LiveQuizStudentPlayProps> = ({
  session,
  onQuizFinished
}) => {
  const { user } = useAuth();

  // ---- helpers -------------------------------------------------------------
  const parseOptions = (opts: any): string[] => {
    if (Array.isArray(opts)) return opts.map(String);
    if (typeof opts === 'string') {
      try {
        const parsed = JSON.parse(opts);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return [];
      }
    }
    return [];
  };

  const generatePermutation = (length: number): number[] => {
    const arr = Array.from({ length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  };

  // ---- state ---------------------------------------------------------------
  // AUTHORITY: the server (get_live_quiz_state / submit_live_quiz_answer RPCs) owns the
  // question index, deadline, reveal and grading. This component only DISPLAYS that state.
  const [questionData, setQuestionData] = useState<{
    qIndex: number;
    question: string;
    options: string[];
    permutation: number[];
    durationSec: number;
    /** Server-clock deadline (ms). Display-only countdown. */
    deadlineMs: number;
    totalQuestions: number;
  } | null>(null);

  const [, setSelectedIndex] = useState<number | null>(null);
  const [selectedDisplayIndex, setSelectedDisplayIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [revealData, setRevealData] = useState<{ correctIndex: number; explanation?: string } | null>(null);
  // Server-graded result for the current question (single source of truth for feedback)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; points: number } | null>(null);

  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(session.question_duration_sec || 20);
  const [streak, setStreak] = useState(0);

  const [isMusicMuted, setIsMusicMuted] = useState(() => quizAudioService.isMusicMuted());
  const [showConfetti, setShowConfetti] = useState(false);
  const hasTriggeredFeedbackRef = useRef<number | null>(null);

  const [studentQuestions, setStudentQuestions] = useState<any[]>(() => session.quiz?.questions || []);

  // ---- refs ----------------------------------------------------------------
  const mountedRef = useRef(true);
  const finishedRef = useRef(false);
  const submittingRef = useRef(false);
  const activeQIndexRef = useRef<number | null>(null);
  const questionsRef = useRef<any[]>(studentQuestions);
  const permutationsRef = useRef<Map<number, number[]>>(new Map());
  const syncSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  const expirySyncedForRef = useRef<number | null>(null);
  const onQuizFinishedRef = useRef(onQuizFinished);
  useEffect(() => {
    onQuizFinishedRef.current = onQuizFinished;
  }, [onQuizFinished]);
  useEffect(() => {
    questionsRef.current = studentQuestions;
  }, [studentQuestions]);

  // ---- questions -------------------------------------------------------------
  useEffect(() => {
    if (session.quiz?.questions && session.quiz.questions.length > 0) {
      setStudentQuestions(session.quiz.questions);
      return;
    }
    const quizId = session.quiz_id || session.quiz?.id;
    if (quizId) {
      liveQuizService.getStudentQuestions(quizId).then((fetched) => {
        if (fetched && fetched.length > 0) {
          setStudentQuestions(fetched);
        }
      }).catch((err) => console.warn('[LiveQuizStudentPlay] Error fetching student questions:', err));
    }
  }, [session.quiz_id, session.quiz?.id, session.quiz?.questions]);

  // ---- audio lifecycle: one owner, stopped on unmount ------------------------
  const hasQuestion = Boolean(questionData);
  useEffect(() => {
    if (hasQuestion && !finishedRef.current) {
      quizAudioService.startBackgroundMusic();
    }
    return () => {
      quizAudioService.stopBackgroundMusic();
    };
  }, [hasQuestion]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- total quiz timer (optional per-quiz feature; display + lock) -----------
  const isTotalTimed = Boolean(session.quiz?.timer_enabled);
  const totalDurationSec = session.quiz?.timer_seconds || 60;

  const getEffectiveExpirationMs = useCallback((): number | null => {
    if (!isTotalTimed) return null;
    const startedMs = session.started_at ? new Date(session.started_at).getTime() : null;
    const expiresMs = session.expires_at ? new Date(session.expires_at).getTime() : null;
    if (startedMs && (!expiresMs || expiresMs <= startedMs)) {
      return startedMs + (totalDurationSec * 1000);
    }
    if (expiresMs) return expiresMs;
    if (startedMs) return startedMs + (totalDurationSec * 1000);
    return null;
  }, [isTotalTimed, session.started_at, session.expires_at, totalDurationSec]);

  const [totalTimeLeft, setTotalTimeLeft] = useState<number>(() => {
    if (!isTotalTimed) return 0;
    const expMs = getEffectiveExpirationMs();
    if (expMs) {
      const remainingSec = Math.ceil((expMs - Date.now()) / 1000);
      if (remainingSec > 0) return remainingSec;
    }
    return totalDurationSec;
  });

  // ---- finish ---------------------------------------------------------------
  const handleFinished = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    quizAudioService.setQuizFinished(true);
    quizAudioService.stopBackgroundMusic();

    let results: any[] = [];
    try {
      // 1. Await server completion endpoint which computes and returns results
      const endpoint = session.classroom_id
        ? `/api/classes/${session.classroom_id}/live-quiz/sessions/${session.id}/complete`
        : `/api/live-quiz/sessions/${session.id}/complete`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data) && json.data.length > 0) {
          results = json.data;
        }
      }
    } catch {}

    // 2. Fallback: query liveQuizService.getResults if endpoint did not return data
    if (!results || results.length === 0) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await liveQuizService.getResults(session.id);
        if (res.data && res.data.length > 0) {
          results = res.data;
          break;
        }
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
    }

    if (onQuizFinishedRef.current) {
      onQuizFinishedRef.current(results);
    }
  }, [session.classroom_id, session.id]);

  // ---- apply an authoritative server snapshot ----------------------------------
  const applyServerState = useCallback((state: LiveQuizServerState) => {
    if (!mountedRef.current || finishedRef.current) return;

    if (state.status === 'finished' || state.phase === 'finished') {
      handleFinished();
      return;
    }
    if (state.status !== 'in_progress' && state.status !== 'reveal') return;

    const idx = state.current_question_index ?? 0;
    const questions = questionsRef.current;
    const q = questions[idx];
    if (!q) return; // questions not loaded yet; a sync is re-run once they load

    const opts = parseOptions(q.options);
    let perm = permutationsRef.current.get(idx);
    if (!perm || perm.length !== opts.length) {
      perm = generatePermutation(opts.length);
      permutationsRef.current.set(idx, perm);
    }

    const isNewQuestion = activeQIndexRef.current !== idx;
    if (isNewQuestion) {
      activeQIndexRef.current = idx;
      setSelectedIndex(null);
      setSelectedDisplayIndex(null);
      setIsLocked(false);
      setRevealData(null);
      setAnswerResult(null);
      setPointsEarned(0);
      setShowConfetti(false);
      setSubmitError(null);
      hasTriggeredFeedbackRef.current = null;
      expirySyncedForRef.current = null;
    }

    const durationSec = state.question_duration_sec || q.durationSec || 20;
    setQuestionData({
      qIndex: idx,
      question: q.question || `Question ${idx + 1}`,
      options: opts,
      permutation: perm,
      durationSec,
      deadlineMs: Number(state.deadline_ms),
      totalQuestions: state.total_questions || questions.length || 0
    });

    // Our own recorded answer (survives refresh, reconnect, late load)
    if (state.my_answer && typeof state.my_answer.selected_option_index === 'number') {
      const canonical = state.my_answer.selected_option_index;
      setSelectedIndex(canonical);
      setSelectedDisplayIndex(perm.indexOf(canonical));
      setIsLocked(true);
      setAnswerResult({ isCorrect: Boolean(state.my_answer.is_correct), points: Number(state.my_answer.points_awarded || 0) });
      setPointsEarned(Number(state.my_answer.points_awarded || 0));
    }

    // Reveal is decided by the SERVER (deadline passed). Never inferred from client clock.
    if (state.phase === 'reveal' && typeof state.correct_index === 'number') {
      setRevealData({ correctIndex: state.correct_index, explanation: q.explanation });
      setIsLocked(true);
    }
  }, [handleFinished]);

  const applyRef = useRef(applyServerState);
  useEffect(() => {
    applyRef.current = applyServerState;
  }, [applyServerState]);

  // ---- single sync path: refetch authoritative state; stale responses dropped ----
  const syncWithDatabase = useCallback(async () => {
    const seq = ++syncSeqRef.current;
    let state = await liveQuizService.getLiveState(session.id);

    if (!state) {
      // v3 engine not installed: degrade to a read-only view of the DB row.
      const fresh = await liveQuizService.getSessionById(session.id);
      if (!fresh) return;
      const dur = fresh.question_duration_sec || 20;
      const start = Number(fresh.question_start_ms) || Date.now();
      state = {
        server_now_ms: Date.now(),
        status: fresh.status,
        phase: fresh.status === 'reveal' ? 'reveal' : fresh.status === 'finished' ? 'finished' : 'active',
        current_question_index: fresh.current_question_index ?? 0,
        question_start_ms: start,
        question_duration_sec: dur,
        deadline_ms: start + dur * 1000,
        total_questions: questionsRef.current.length,
        eligible_count: 0,
        answered_count: 0,
        correct_index: fresh.correct_answer_index ?? null,
        my_answer: null
      };
    }

    if (seq < appliedSeqRef.current) return; // a newer snapshot was already applied
    appliedSeqRef.current = seq;
    applyRef.current(state);
  }, [session.id]);

  // Re-sync when questions finish loading (snapshot may have arrived first)
  useEffect(() => {
    if (studentQuestions.length > 0) {
      syncWithDatabase();
    }
  }, [studentQuestions.length, syncWithDatabase]);

  // Running score (authoritative from DB), refreshed whenever the question changes
  const currentQIdx = questionData?.qIndex;
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    liveQuizService.getParticipants(session.id).then((ps) => {
      if (cancelled) return;
      const me = ps.find((p) => p.student_id === user.id);
      if (me && typeof me.score === 'number') setTotalScore(me.score);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.id, user?.id, currentQIdx]);

  // ---- realtime: ONE channel, ONE listener; any change triggers an authoritative refetch ----
  useEffect(() => {
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (!channel) return;

    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_quiz_sessions', filter: `id=eq.${session.id}` },
        () => {
          syncWithDatabase();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          syncWithDatabase();
        }
      });

    return () => {
      liveQuizService.removeRealtimeChannel(channel);
    };
  }, [session.pin, session.id, syncWithDatabase]);

  // ---- safety refetch (also the presence heartbeat): visibility, focus, 5s ----
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncWithDatabase();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') syncWithDatabase();
    }, 5000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
      clearInterval(heartbeat);
    };
  }, [syncWithDatabase]);

  // ---- feedback audio/visual: driven by the SERVER-graded result ------------------
  useEffect(() => {
    if (!answerResult || !questionData) return;
    if (hasTriggeredFeedbackRef.current === questionData.qIndex) return;
    hasTriggeredFeedbackRef.current = questionData.qIndex;

    if (answerResult.isCorrect) {
      quizAudioService.playCorrect();
      setShowConfetti(true);
      setStreak((prev) => prev + 1);
    } else {
      quizAudioService.playIncorrect();
      setStreak(0);
    }
  }, [questionData, answerResult]);

  // ---- countdown: DISPLAY ONLY, using server-clock estimate -------------------------
  const deadlineMs = questionData?.deadlineMs;
  const countdownQIdx = questionData?.qIndex;
  useEffect(() => {
    if (!deadlineMs || countdownQIdx === undefined) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - liveQuizService.getServerNowMs()) / 1000));
      setQuestionTimeLeft(remaining);
      if (remaining <= 0 && expirySyncedForRef.current !== countdownQIdx) {
        // Ask the server what happened (it decides). One request per question.
        expirySyncedForRef.current = countdownQIdx;
        syncWithDatabase();
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadlineMs, countdownQIdx, syncWithDatabase]);

  // ---- after reveal, ask the server to move on at its reveal boundary (server decides) ----
  useEffect(() => {
    if (!revealData || !deadlineMs) return;
    const REVEAL_MS = 3500;
    const delay = Math.max(250, deadlineMs + REVEAL_MS - liveQuizService.getServerNowMs() + 200);
    const t1 = setTimeout(() => syncWithDatabase(), delay);
    const t2 = setTimeout(() => syncWithDatabase(), delay + 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [revealData, deadlineMs, syncWithDatabase]);

  // ---- total quiz timer (display only; server controls session lifecycle) ----------
  useEffect(() => {
    if (!isTotalTimed) return;
    const interval = setInterval(() => {
      const expMs = getEffectiveExpirationMs();
      let remaining = 0;
      if (expMs) {
        remaining = Math.max(0, Math.ceil((expMs - liveQuizService.getServerNowMs()) / 1000));
      }
      setTotalTimeLeft(remaining);
      if (remaining <= 0) {
        // Sync with authoritative server snapshot when total time reaches 0
        syncWithDatabase();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isTotalTimed, getEffectiveExpirationMs, syncWithDatabase]);

  // ---- answer selection & submission --------------------------------------------------
  const handlePickOption = (displayIndex: number) => {
    if (isLocked || isSubmitting || revealData) return;
    quizAudioService.playClick();
    quizAudioService.unlockAudio();
    setSelectedDisplayIndex(displayIndex);
  };

  const handleSubmitAnswer = async () => {
    if (submittingRef.current || isLocked || revealData || !questionData || selectedDisplayIndex === null) return;

    quizAudioService.playClick();
    quizAudioService.unlockAudio();

    const displayIndex = selectedDisplayIndex;
    const canonicalIndex = questionData.permutation?.[displayIndex] ?? displayIndex;
    const submittedForIndex = questionData.qIndex;

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setSelectedIndex(canonicalIndex);
    setIsLocked(true);

    try {
      const res = await liveQuizService.submitAnswer({
        session_id: session.id,
        question_index: submittedForIndex,
        selected_option_index: canonicalIndex
      });

      if (!mountedRef.current) return;

      if (res.data) {
        if (activeQIndexRef.current === submittedForIndex) {
          setAnswerResult({ isCorrect: res.data.is_correct, points: res.data.points_awarded });
          setPointsEarned(res.data.points_awarded);
        }
        if (typeof res.data.current_score === 'number') {
          setTotalScore(res.data.current_score);
        }
        if (res.data.advanced || res.data.is_finished || res.data.all_answered) {
          await syncWithDatabase();
        }
      } else {
        if (activeQIndexRef.current === submittedForIndex) {
          setSelectedIndex(null);
          setSelectedDisplayIndex(null);
          setIsLocked(false);
        }
        if (res.code === 'LATE') {
          setSubmitError('Your answer reached the server after time ran out.');
        } else if (res.code === 'QUESTION_MISMATCH' || res.code === 'NOT_ACTIVE') {
          setSubmitError('That question has already moved on.');
        } else if (res.code === 'ENGINE_NOT_INSTALLED') {
          setSubmitError('Live quiz server update is not installed yet. Please tell your teacher.');
        } else {
          setSubmitError('Could not submit your answer. Please tap an option again.');
        }
        await syncWithDatabase();
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      if (mountedRef.current && activeQIndexRef.current === submittedForIndex) {
        setSelectedIndex(null);
        setSelectedDisplayIndex(null);
        setIsLocked(false);
        setSubmitError('Network problem. Please tap an option again.');
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  // Auto-submit pending choice if countdown reaches <= 1s
  useEffect(() => {
    if (questionTimeLeft <= 1 && selectedDisplayIndex !== null && !isLocked && !isSubmitting && !revealData) {
      handleSubmitAnswer();
    }
  }, [questionTimeLeft, selectedDisplayIndex, isLocked, isSubmitting, revealData]);

  const handleToggleSound = () => {
    quizAudioService.playClick();
    const nextMuted = quizAudioService.toggleMusicMute();
    setIsMusicMuted(nextMuted);
  };

  const formatTotalTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Fallback Loading / Rehydration View
  if (!questionData || !Array.isArray(questionData.options) || questionData.options.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl border border-sky-500/20">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl sm:text-2xl font-black">
          Loading Question {((session.current_question_index ?? 0) + 1)}...
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-sm font-medium">
          Synchronizing question data. Question will appear automatically on your screen!
        </p>

        <div className="flex items-center gap-3 pt-2">
          {isTotalTimed && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 text-xs font-black">
              <Hourglass className="w-3.5 h-3.5 text-amber-400" />
              <span>Quiz Timer: {formatTotalTime(totalTimeLeft)}</span>
            </div>
          )}

          <button
            type="button"
            onClick={syncWithDatabase}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-sky-400/30 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Question</span>
          </button>
        </div>
      </div>
    );
  }

  const isSelectedCorrect = Boolean(answerResult?.isCorrect);
  const isSelectedIncorrect = Boolean(answerResult && !answerResult.isCorrect);

  const categoryName = session.quiz?.category || 'Classroom Quiz';
  const progressPct = Math.round(((questionData.qIndex + 1) / questionData.totalQuestions) * 100);

  return (
    <div className="w-full max-w-lg mx-auto min-h-[92vh] sm:min-h-[85vh] flex flex-col justify-between px-2 sm:px-4 py-2 text-white">
      
      {/* Confetti Celebration Particle Layer */}
      {showConfetti && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={1500} />
      )}

      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="EdTechra"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-contain"
            />
            <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
              EDTECHRA
            </span>
          </div>

          {/* Right Header Controls: Audio & Timer */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                !isMusicMuted
                  ? 'bg-slate-800/80 text-sky-400 hover:bg-slate-700/80'
                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
              }`}
              title={isMusicMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {isTotalTimed && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300">
                <Hourglass className="w-3 h-3 text-amber-400" />
                <span className="font-mono text-[11px]">{formatTotalTime(totalTimeLeft)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Minimalist Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>

        {/* Typographic Status Row (Clean & Borderless) */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">
              Question <span className="text-white">{questionData.qIndex + 1}</span> of {questionData.totalQuestions}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">
              {categoryName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {streak > 1 && (
              <span className="font-bold text-amber-400 flex items-center gap-0.5 text-xs">
                🔥 {streak}
              </span>
            )}
            <span className="font-mono font-bold text-amber-300 text-xs">
              {totalScore} pts
            </span>
            <span className={`font-mono font-bold text-xs flex items-center gap-1 ${
              questionTimeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-sky-300'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{questionTimeLeft}s</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. QUESTION PRESENTATION (TYPOGRAPHIC FOCUS - NO DECORATIVE IMAGES) */}
      <div className="my-auto py-6 sm:py-8 text-center sm:text-left">
        {/* Only display legitimate question image if provided in question data */}
        {(questionData as any)?.image_url && (
          <div className="mb-4 max-h-48 overflow-hidden rounded-2xl mx-auto flex items-center justify-center bg-slate-900/50">
            <img
              src={(questionData as any).image_url}
              alt="Question Visual"
              className="max-h-48 w-auto object-contain rounded-xl"
            />
          </div>
        )}

        {/* Question Text */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
          {questionData.question}
        </h1>
      </div>

      {/* 3. REVEAL FEEDBACK (ELEGANT & MINIMALIST) */}
      {(revealData || answerResult) && (
        <div className={`py-3 px-4 rounded-2xl text-center font-bold text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-200 mb-3.5 ${
          isSelectedCorrect
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            : isSelectedIncorrect
            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            : 'bg-slate-800/80 text-slate-300'
        }`}>
          <div className="flex items-center justify-center gap-2">
            {isSelectedCorrect ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Correct! +{pointsEarned} points</span>
              </>
            ) : isSelectedIncorrect ? (
              <>
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Incorrect</span>
              </>
            ) : (
              <span>Time's Up</span>
            )}
          </div>
          {revealData?.explanation && (
            <p className="text-[11px] font-normal text-slate-300 mt-1">
              {revealData.explanation}
            </p>
          )}
        </div>
      )}

      {/* 4. FOUR INTERACTIVE ANSWER CHOICES */}
      <div className="space-y-3 w-full">
        {(questionData.permutation || Array.from({ length: questionData.options?.length || 0 }, (_, i) => i)).map((canonicalIdx, displayIdx) => {
          const opt = questionData.options[canonicalIdx];
          const theme = OPTION_THEMES[displayIdx] || OPTION_THEMES[0];
          const isSelected = selectedDisplayIndex === displayIdx;
          const isRevealed = Boolean(revealData);
          const isThisOptionCorrect = revealData && canonicalIdx === revealData.correctIndex;
          const isThisOptionIncorrectSelection = isRevealed && isSelected && !isThisOptionCorrect;

          let cardStyling = 'bg-[#0f172a]/70 hover:bg-[#152038] border border-white/[0.06] text-slate-100';

          if (isRevealed) {
            if (isSelected && isThisOptionCorrect) {
              cardStyling = 'bg-emerald-950/70 border-2 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.3)] scale-[1.01]';
            } else if (isThisOptionIncorrectSelection) {
              cardStyling = 'bg-rose-950/70 border-2 border-rose-500 text-rose-100';
            } else if (isThisOptionCorrect) {
              cardStyling = 'bg-emerald-950/50 border border-emerald-500/60 text-emerald-100';
            } else {
              cardStyling = 'opacity-35 grayscale-[50%] bg-slate-900/40 text-slate-400 border border-transparent';
            }
          } else if (isSelected) {
            cardStyling = 'bg-[#1e1b4b]/80 border-2 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.01]';
          }

          return (
            <button
              key={displayIdx}
              type="button"
              disabled={isLocked || isSubmitting || isRevealed}
              onClick={() => handlePickOption(displayIdx)}
              className={`w-full min-h-[56px] p-3.5 sm:p-4 rounded-2xl text-left flex items-center justify-between gap-3.5 transition-all duration-150 cursor-pointer ${cardStyling}`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Letter Circle (A, B, C, D) */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${theme.badgeBg}`}>
                  {theme.label}
                </div>
                {/* Option Text */}
                <span className="text-sm sm:text-base font-semibold leading-snug break-words">
                  {opt}
                </span>
              </div>

              {/* Right Selection / State Indicator */}
              <div className="shrink-0 flex items-center justify-center">
                {isRevealed && isThisOptionCorrect ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-400 text-emerald-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : isRevealed && isThisOptionIncorrectSelection ? (
                  <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <XCircle className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 border-2 border-indigo-300 flex items-center justify-center text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-600/70" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 5. PRIMARY ACTION ("Submit answer →") */}
      <div className="pt-5 space-y-2 w-full">
        {submitError && !revealData && (
          <div className="text-center text-xs text-rose-300 font-medium py-1.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            {submitError}
          </div>
        )}

        <button
          type="button"
          disabled={selectedDisplayIndex === null || isLocked || isSubmitting || Boolean(revealData)}
          onClick={handleSubmitAnswer}
          className={`w-full py-4 rounded-2xl font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isLocked && !revealData
              ? 'bg-sky-500/10 border border-sky-400/20 text-sky-300 cursor-default'
              : selectedDisplayIndex !== null && !isLocked && !isSubmitting && !revealData
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/25 active:scale-[0.98]'
              : isSubmitting
              ? 'bg-indigo-600/40 text-indigo-200 cursor-wait'
              : 'bg-slate-800/40 text-slate-500 border border-white/[0.04] cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Submitting...</span>
            </span>
          ) : isLocked && !revealData ? (
            <span className="flex items-center gap-2 text-sky-300 text-xs sm:text-sm">
              <Lock className="w-3.5 h-3.5" />
              <span>Answer locked • Waiting for players...</span>
            </span>
          ) : revealData ? (
            <span className="text-xs sm:text-sm text-slate-400">Next question coming up...</span>
          ) : selectedDisplayIndex !== null ? (
            <span className="flex items-center gap-1.5">
              <span>Submit answer</span>
              <span>→</span>
            </span>
          ) : (
            <span>Select an answer above</span>
          )}
        </button>
      </div>

    </div>
  );
};

// ---------------------------------------------------------------------------
// Exported Component Wrapped in Error Boundary
// ---------------------------------------------------------------------------
export const LiveQuizStudentPlay: React.FC<LiveQuizStudentPlayProps> = (props) => {
  return (
    <LiveQuizErrorBoundary>
      <LiveQuizStudentPlayInner {...props} />
    </LiveQuizErrorBoundary>
  );
};
