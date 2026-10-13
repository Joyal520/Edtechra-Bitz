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
  { bg: 'bg-purple-600 hover:bg-purple-500 active:scale-95', label: 'A', ring: 'ring-purple-400' },
  { bg: 'bg-blue-600 hover:bg-blue-500 active:scale-95', label: 'B', ring: 'ring-blue-400' },
  { bg: 'bg-amber-600 hover:bg-amber-500 active:scale-95', label: 'C', ring: 'ring-amber-400' },
  { bg: 'bg-emerald-600 hover:bg-emerald-500 active:scale-95', label: 'D', ring: 'ring-emerald-400' }
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
  const handleFinished = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    quizAudioService.setQuizFinished(true);
    quizAudioService.stopBackgroundMusic();
    // Idempotent server finalization (results + classroom points); safe if already done.
    if (session.classroom_id) {
      fetch(`/api/classes/${session.classroom_id}/live-quiz/sessions/${session.id}/complete`, { method: 'POST' }).catch(() => {});
    }
    if (onQuizFinishedRef.current) {
      onQuizFinishedRef.current([]);
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
    } else {
      quizAudioService.playIncorrect();
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

  // ---- answer submission --------------------------------------------------------------
  const handleSelectOption = async (displayIndex: number) => {
    // Guard: one in-flight submit, no double taps, no input after server-declared reveal.
    if (submittingRef.current || isLocked || revealData || !questionData) return;

    quizAudioService.playClick();
    quizAudioService.unlockAudio();

    // Canonical option index (original order) is the single representation sent and graded.
    const canonicalIndex = questionData.permutation?.[displayIndex] ?? displayIndex;
    const submittedForIndex = questionData.qIndex;

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setSelectedDisplayIndex(displayIndex);
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
        // The question may have changed while the request was in flight; only paint if still current.
        if (activeQIndexRef.current === submittedForIndex) {
          setAnswerResult({ isCorrect: res.data.is_correct, points: res.data.points_awarded });
          setPointsEarned(res.data.points_awarded);
        }
        if (typeof res.data.current_score === 'number') {
          setTotalScore(res.data.current_score);
        }
        // Server may have advanced / finished (all answered): refetch authoritative state now.
        if (res.data.advanced || res.data.is_finished || res.data.all_answered) {
          await syncWithDatabase();
        }
      } else {
        // Real, typed failure. Never disguised as TIME UP; never an ungraded write.
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

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-6 relative">
      
      {/* Confetti Celebration Particle Layer (Auto disappears after 1.5s) */}
      {showConfetti && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={1500} />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3 flex-wrap">
        <span className="text-xs font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full border border-purple-400/30">
          Question {questionData.qIndex + 1} of {questionData.totalQuestions}
        </span>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Background Music Toggle Control */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer ${
              !isMusicMuted
                ? 'bg-white/10 text-sky-300 border-white/20 hover:bg-white/20'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
            }`}
            title={isMusicMuted ? 'Unmute Background Music' : 'Mute Background Music'}
          >
            {isMusicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isMusicMuted ? 'Muted' : 'Music'}</span>
          </button>

          {/* Total Quiz Timer (if enabled) */}
          {isTotalTimed && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all ${
                totalTimeLeft <= 10
                  ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse'
                  : totalTimeLeft <= 60
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500'
                  : 'bg-white/10 text-white border-white/20'
              }`}
              title="Total Quiz Time Remaining"
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Total: {formatTotalTime(totalTimeLeft)}</span>
            </div>
          )}

          {/* Current Question Countdown */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
              questionTimeLeft <= 5
                ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse'
                : 'bg-white/10 text-white border-white/20'
            }`}
            title="Question Timer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{questionTimeLeft}s</span>
          </div>

          <div className="text-xs font-black text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
            Score: {totalScore} pts
          </div>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="text-center py-4 space-y-2 max-w-3xl mx-auto">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
          {questionData.question}
        </h2>
      </div>

      {/* Reveal Feedback Banner if active */}
      {(revealData || answerResult) && (
        <div className={`p-4 rounded-2xl text-center font-black animate-in zoom-in-95 duration-200 ${
          isSelectedCorrect
            ? 'bg-emerald-500/25 border-2 border-emerald-400 text-emerald-300 shadow-xl shadow-emerald-500/20 animate-correct-bounce'
            : isSelectedIncorrect
            ? 'bg-rose-500/25 border-2 border-rose-400 text-rose-300 shadow-xl shadow-rose-500/20 animate-error-shake'
            : 'bg-slate-800/60 border border-slate-600 text-slate-300'
        }`}>
          <div className="flex items-center justify-center gap-2 text-base">
            {isSelectedCorrect ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span className="text-emerald-200">Excellent! Correct Answer • +{pointsEarned} Points</span>
              </>
            ) : isSelectedIncorrect ? (
              <>
                <XCircle className="w-6 h-6 text-rose-400" />
                <span className="text-rose-200">Incorrect</span>
              </>
            ) : (
              <span>Time's Up — No Answer Selected</span>
            )}
          </div>
          {revealData?.explanation && (
            <p className="text-xs font-medium text-slate-200 mt-1.5 leading-relaxed">{revealData.explanation}</p>
          )}
        </div>
      )}

      {/* 4 Interactive Option Cards (Randomized display order per question/session) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-4xl mx-auto w-full">
        {(questionData.permutation || Array.from({ length: questionData.options?.length || 0 }, (_, i) => i)).map((canonicalIdx, displayIdx) => {
          const opt = questionData.options[canonicalIdx];
          const theme = OPTION_THEMES[displayIdx] || OPTION_THEMES[0];
          const isSelected = selectedDisplayIndex === displayIdx;
          const isRevealed = Boolean(revealData);
          const isThisOptionCorrect = revealData && canonicalIdx === revealData.correctIndex;
          const isThisOptionIncorrectSelection = isRevealed && isSelected && !isThisOptionCorrect;

          let cardStyling = `${theme.bg}`;

          if (isRevealed) {
            if (isSelected && isThisOptionCorrect) {
              cardStyling = 'bg-emerald-600 ring-4 ring-emerald-300 text-white shadow-2xl shadow-emerald-500/40 scale-[1.02] animate-correct-bounce brightness-110';
            } else if (isThisOptionIncorrectSelection) {
              cardStyling = 'bg-rose-600 ring-4 ring-rose-400 text-white shadow-xl shadow-rose-600/40 animate-error-shake brightness-100';
            } else if (isThisOptionCorrect) {
              cardStyling = 'bg-emerald-700/90 ring-4 ring-emerald-400 text-white shadow-md brightness-105';
            } else {
              cardStyling = 'opacity-35 grayscale-[50%] bg-slate-800 text-slate-400';
            }
          } else if (isSelected) {
            cardStyling = `${theme.bg} ring-4 ring-white scale-[1.02] shadow-2xl brightness-110`;
          }

          return (
            <button
              key={displayIdx}
              type="button"
              disabled={isLocked || isSubmitting || isRevealed}
              onClick={() => handleSelectOption(displayIdx)}
              className={`p-5 rounded-3xl font-black text-left flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg ${cardStyling}`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-base text-white shrink-0 ${
                  isRevealed && isThisOptionCorrect
                    ? 'bg-emerald-400 text-emerald-950 shadow-xs'
                    : isRevealed && isThisOptionIncorrectSelection
                    ? 'bg-rose-400 text-rose-950 shadow-xs'
                    : 'bg-white/20'
                }`}>
                  {isRevealed && isThisOptionCorrect ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : isRevealed && isThisOptionIncorrectSelection ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    theme.label
                  )}
                </div>
                <span className="text-sm sm:text-base text-white">{opt}</span>
              </div>

              {isSelected && !isRevealed && (
                <span className="text-[11px] font-black bg-white/30 text-white px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </span>
              )}

              {isRevealed && isThisOptionCorrect && (
                <span className="text-[11px] font-black bg-white/20 text-emerald-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Correct</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Lock / Progress Status */}
      <div className="text-center text-xs text-slate-400 font-bold">
        {isSubmitting ? (
          <span className="text-sky-300 font-black animate-pulse">Submitting…</span>
        ) : submitError && !revealData ? (
          <span className="text-rose-300 font-black">{submitError}</span>
        ) : isLocked && !revealData ? (
          <span className="text-sky-300 font-black animate-pulse">
            ✓ Answer recorded! Waiting for the other players...
          </span>
        ) : questionTimeLeft <= 0 && !revealData ? (
          <span className="text-amber-300 font-black animate-pulse">
            ⏳ Checking time with server...
          </span>
        ) : !revealData ? (
          <span>Select an answer card above before the timer expires</span>
        ) : (
          <span className="text-slate-300">
            {isSelectedCorrect ? '🎉 Great job! Points recorded.' : isSelectedIncorrect ? 'Review the explanation above.' : 'Question complete.'}
          </span>
        )}
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
