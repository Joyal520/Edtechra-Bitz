import React, { useState, useEffect, useRef, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  LogOut,
  Hash,
  Trophy
} from 'lucide-react';
import { LiveQuizSession, LiveQuizServerState } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';
import { quizAudioService } from '@/services/quizAudioService';
import { ConfettiCelebration } from './ConfettiCelebration';
import {
  QuizHeader,
  QuizProgress,
  QuestionCard,
  AnswerOption,
  SubmitButton,
  Timer
} from './LiveQuizUI';

interface LiveQuizStudentPlayProps {
  session: LiveQuizSession;
  onQuizFinished?: (results: any) => void;
}

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
        <div className="min-h-[60vh] bg-white text-[#10245A] rounded-[28px] p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-[0_20px_50px_rgba(8,124,245,0.08)] border border-[#DCEBFA] max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#FFF1F5] text-[#F43F7A] flex items-center justify-center">
            <AlertCircle className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-[#10245A]">Something went wrong</h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-xs font-medium">
            We hit an unexpected issue loading the quiz question. Tap below to reload smoothly.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              if (this.props.onReset) this.props.onReset();
              else window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#087CF5] to-[#08AEEF] text-white font-extrabold text-xs sm:text-sm rounded-full shadow-[0_8px_20px_rgba(8,124,245,0.28)] active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
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
  const navigate = useNavigate();

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
  const [menuOpen, setMenuOpen] = useState(false);

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

  const [, setTotalTimeLeft] = useState<number>(() => {
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
    const durationSec = state.question_duration_sec || q.durationSec || session.quiz?.timer_seconds || 20;
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
      setQuestionTimeLeft(durationSec);
      hasTriggeredFeedbackRef.current = null;
      expirySyncedForRef.current = null;
    }

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
  }, [handleFinished, session.quiz?.timer_seconds]);

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

  // ---- Per-Question Countdown: locks answer on 0 and auto-advances to next question ----
  const deadlineMs = questionData?.deadlineMs;
  const countdownQIdx = questionData?.qIndex;
  const isQuestionTimed = session.quiz?.timer_enabled !== false && (questionData?.durationSec ?? 20) < 3600;
  useEffect(() => {
    if (!isQuestionTimed || !deadlineMs || countdownQIdx === undefined) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - liveQuizService.getServerNowMs()) / 1000));
      setQuestionTimeLeft(remaining);
      if (remaining <= 0 && expirySyncedForRef.current !== countdownQIdx) {
        // 1. Lock further answers for this question
        expirySyncedForRef.current = countdownQIdx;
        setIsLocked(true);
        // 2. Sync with server (enters reveal or advances) and auto-advance to next question
        syncWithDatabase();
        setTimeout(() => {
          liveQuizService.advanceQuestion(session.id, countdownQIdx).finally(() => {
            syncWithDatabase();
          });
        }, 1200);
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [isQuestionTimed, deadlineMs, countdownQIdx, session.id, syncWithDatabase]);

  // ---- after reveal, ask the server to move on at its reveal boundary (server decides) ----
  useEffect(() => {
    if (!revealData || !deadlineMs) return;
    const REVEAL_MS = 3500;
    const delay = Math.max(250, deadlineMs + REVEAL_MS - liveQuizService.getServerNowMs() + 200);
    const t1 = setTimeout(() => {
      if (typeof countdownQIdx === 'number') {
        liveQuizService.advanceQuestion(session.id, countdownQIdx).finally(() => syncWithDatabase());
      } else {
        syncWithDatabase();
      }
    }, delay);
    const t2 = setTimeout(() => syncWithDatabase(), delay + 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [revealData, deadlineMs, countdownQIdx, session.id, syncWithDatabase]);

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
    if (isQuestionTimed && questionTimeLeft <= 1 && selectedDisplayIndex !== null && !isLocked && !isSubmitting && !revealData) {
      handleSubmitAnswer();
    }
  }, [isQuestionTimed, questionTimeLeft, selectedDisplayIndex, isLocked, isSubmitting, revealData]);

  const handleToggleSound = () => {
    quizAudioService.playClick();
    const nextMuted = quizAudioService.toggleMusicMute();
    setIsMusicMuted(nextMuted);
  };

  // Fallback Loading / Rehydration View
  if (!questionData || !Array.isArray(questionData.options) || questionData.options.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto min-h-[70vh] bg-white text-[#10245A] rounded-[28px] p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-[0_20px_50px_rgba(8,124,245,0.08)] border border-[#DCEBFA]">
        <div className="w-12 h-12 border-4 border-[#087CF5] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#10245A]">
          Loading Question {((session.current_question_index ?? 0) + 1)}...
        </h2>
        <p className="text-xs sm:text-sm text-[#64748B] max-w-xs font-medium">
          Synchronizing question data. Your question will appear automatically!
        </p>

        <div className="flex items-center gap-3 pt-2">
          {isQuestionTimed && <Timer seconds={questionTimeLeft} variant="pill" />}

          <button
            type="button"
            onClick={syncWithDatabase}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#BCE3FF] bg-[#EAF7FF] hover:bg-[#D8F0FF] text-[#087CF5] text-xs font-extrabold transition-all cursor-pointer"
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

  const categoryName = session.quiz?.category || 'Grammar';
  const headerTimerSec = isQuestionTimed ? questionTimeLeft : null;

  const displayPoints = totalScore > 0 ? totalScore : 10;

  return (
    <div className="relative w-full max-w-[460px] mx-auto my-auto">
      {/* Confetti Celebration Particle Layer */}
      {showConfetti && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={1500} />
      )}

      {/* Main White Rounded Quiz Card Shell */}
      <div className="relative bg-white rounded-[28px] p-4 sm:p-6 border border-[#DCEBFA] shadow-[0_20px_50px_rgba(8,124,245,0.08)] space-y-4 sm:space-y-5">
        {/* 1. HEADER */}
        <QuizHeader
          uppercaseBrand={true}
          isMuted={isMusicMuted}
          onToggleSound={handleToggleSound}
          timerSeconds={headerTimerSec}
          onMenuClick={() => {
            quizAudioService.playClick();
            setMenuOpen((prev) => !prev);
          }}
        />

        {/* Quick Menu Popover */}
        {menuOpen && (
          <div className="p-3.5 rounded-2xl bg-[#F5FBFF] border border-[#DCEBFA] flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-3 text-[#10245A] font-bold">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#DCEBFA]">
                <Hash className="w-3.5 h-3.5 text-[#087CF5]" />
                <span>PIN: {session.pin}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#DCEBFA]">
                <Trophy className="w-3.5 h-3.5 text-[#F7B928]" />
                <span>{totalScore} pts</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/classes/${session.classroom_id}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFF1F5] hover:bg-[#FFE4EC] text-[#F43F7A] font-extrabold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        )}

        {/* 2. PROGRESS BAR & META ROW */}
        <QuizProgress
          currentQuestion={questionData.qIndex + 1}
          totalQuestions={questionData.totalQuestions}
          category={categoryName}
          points={displayPoints}
          questionTimeLeft={isQuestionTimed ? questionTimeLeft : null}
          streak={streak}
        />

        {/* 3. QUESTION CARD & ANSWER OPTIONS */}
        <QuestionCard
          question={questionData.question}
          imageUrl={(questionData as any)?.image_url}
        >
          {/* Reveal / Feedback Banner */}
          {(revealData || answerResult) && (
            <div
              className={`py-2.5 px-4 rounded-2xl text-center font-extrabold text-xs sm:text-sm animate-in fade-in zoom-in-95 duration-200 ${
                isSelectedCorrect
                  ? 'bg-[#ECFDF5] border border-[#18B981]/40 text-[#065F46]'
                  : isSelectedIncorrect
                  ? 'bg-[#FFF1F5] border border-[#F43F7A]/40 text-[#9F1239]'
                  : 'bg-[#EEF5FC] border border-[#DCEBFA] text-[#10245A]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isSelectedCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#18B981] shrink-0" />
                    <span>Correct! +{pointsEarned} points</span>
                  </>
                ) : isSelectedIncorrect ? (
                  <>
                    <XCircle className="w-4 h-4 text-[#F43F7A] shrink-0" />
                    <span>Incorrect</span>
                  </>
                ) : (
                  <span>Time&apos;s Up</span>
                )}
              </div>
              {revealData?.explanation && (
                <p className="text-[11px] font-semibold text-[#475569] mt-1">
                  {revealData.explanation}
                </p>
              )}
            </div>
          )}

          {/* 4 Answer Options */}
          <div className="space-y-2.5 sm:space-y-3 w-full">
            {(
              questionData.permutation ||
              Array.from({ length: questionData.options?.length || 0 }, (_, i) => i)
            ).map((canonicalIdx, displayIdx) => {
              const opt = questionData.options[canonicalIdx];
              const isSelected = selectedDisplayIndex === displayIdx;
              const isRevealed = Boolean(revealData);
              const isThisOptionCorrect = Boolean(
                revealData && canonicalIdx === revealData.correctIndex
              );
              const isThisOptionIncorrectSelection = Boolean(
                isRevealed && isSelected && !isThisOptionCorrect
              );

              return (
                <AnswerOption
                  key={displayIdx}
                  index={displayIdx}
                  text={opt}
                  selected={isSelected}
                  disabled={isLocked || isSubmitting || isRevealed}
                  isRevealed={isRevealed}
                  isCorrectOption={isThisOptionCorrect}
                  isIncorrectSelection={isThisOptionIncorrectSelection}
                  onSelect={() => handlePickOption(displayIdx)}
                />
              );
            })}
          </div>

          {/* 4. SUBMIT BUTTON */}
          <div className="pt-2 space-y-2 w-full">
            {submitError && !revealData && (
              <div className="text-center text-xs text-[#F43F7A] font-bold py-2 px-3 rounded-xl bg-[#FFF1F5] border border-[#FECDD3]">
                {submitError}
              </div>
            )}

            <SubmitButton
              onClick={handleSubmitAnswer}
              disabled={selectedDisplayIndex === null}
              isLoading={isSubmitting}
              isLocked={isLocked}
              isReveal={Boolean(revealData)}
              label="Submit Answer"
            />
          </div>
        </QuestionCard>
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
