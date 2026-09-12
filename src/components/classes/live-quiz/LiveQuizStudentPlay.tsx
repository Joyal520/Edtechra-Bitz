import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Lock,
  Hourglass,
  Volume2,
  VolumeX,
  Check
} from 'lucide-react';
import { LiveQuizSession } from '@/types/liveQuiz';
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

export const LiveQuizStudentPlay: React.FC<LiveQuizStudentPlayProps> = ({
  session,
  onQuizFinished
}) => {
  const { user } = useAuth();

  // Rehydrate initial question immediately if session is already in_progress or reveal
  const [questionData, setQuestionData] = useState<{
    qIndex: number;
    question: string;
    options: string[];
    durationSec: number;
    questionStartMs: number;
    totalQuestions: number;
  } | null>(() => {
    if (session.status === 'in_progress' || session.status === 'reveal') {
      const idx = session.current_question_index ?? 0;
      const questions = session.quiz?.questions || [];
      if (questions.length > 0 && idx >= questions.length) {
        return null;
      }
      const q = questions[idx];
      if (q) {
        return {
          qIndex: idx,
          question: q.question || `Question ${idx + 1}`,
          options: Array.isArray(q.options) ? q.options : [],
          durationSec: session.question_duration_sec || q.durationSec || 20,
          questionStartMs: Number(session.question_start_ms) || Date.now(),
          totalQuestions: questions.length || 0
        };
      }
    }
    return null;
  });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Rehydrate initial reveal data if session is already in reveal
  const [revealData, setRevealData] = useState<{
    correctIndex: number;
    explanation?: string;
  } | null>(() => {
    if (session.status === 'reveal' && typeof session.correct_answer_index === 'number') {
      const idx = session.current_question_index ?? 0;
      const q = session.quiz?.questions?.[idx];
      return {
        correctIndex: session.correct_answer_index,
        explanation: q?.explanation
      };
    }
    return null;
  });

  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  // Rehydrate initial remaining time
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(() => {
    if (session.status === 'in_progress' && session.question_start_ms) {
      const elapsed = (Date.now() - Number(session.question_start_ms)) / 1000;
      const duration = session.question_duration_sec || 20;
      return Math.max(0, Math.ceil(duration - elapsed));
    }
    return 20;
  });

  // Audio and Visual Celebration Feedback State
  const [isMusicMuted, setIsMusicMuted] = useState(() => quizAudioService.isMusicMuted());
  const [showConfetti, setShowConfetti] = useState(false);
  const hasTriggeredFeedbackRef = useRef<number | null>(null);

  // Background music lifecycle: start on mount, stop on unmount
  useEffect(() => {
    quizAudioService.startBackgroundMusic();
    return () => {
      quizAudioService.stopBackgroundMusic();
    };
  }, []);

  // Stable ref for callbacks & active question index
  const onQuizFinishedRef = useRef(onQuizFinished);
  useEffect(() => {
    onQuizFinishedRef.current = onQuizFinished;
  }, [onQuizFinished]);

  const activeQIndexRef = useRef<number | null>(questionData?.qIndex ?? null);
  useEffect(() => {
    activeQIndexRef.current = questionData?.qIndex ?? null;
  }, [questionData?.qIndex]);

  // Total Quiz Timer State
  const isTotalTimed = Boolean(session.quiz?.timer_enabled || session.expires_at);
  const totalDurationSec = session.quiz?.timer_seconds || 60;
  
  const [totalTimeLeft, setTotalTimeLeft] = useState<number>(() => {
    if (!isTotalTimed) return 0;
    if (session.expires_at) {
      const remainingMs = new Date(session.expires_at).getTime() - Date.now();
      return Math.max(0, Math.ceil(remainingMs / 1000));
    }
    return totalDurationSec;
  });
  const [isTotalTimeExpired, setIsTotalTimeExpired] = useState(false);

  // Handlers for state updates
  const applyQuestionStarted = useCallback((raw: any) => {
    if (!raw) return;

    const questions = session.quiz?.questions || [];
    const totalCount = questions.length || raw.totalQuestions || raw.total_questions || 1;
    const rawIdx = typeof raw.qIndex === 'number'
      ? raw.qIndex
      : (typeof raw.questionIndex === 'number'
        ? raw.questionIndex
        : (typeof raw.current_question_index === 'number' ? raw.current_question_index : 0));

    // Bounds check: if quiz has questions and index is past the end, complete quiz!
    if (questions.length > 0 && rawIdx >= questions.length) {
      quizAudioService.stopBackgroundMusic();
      if (onQuizFinishedRef.current) {
        onQuizFinishedRef.current([]);
      }
      return;
    }

    const fallbackQ = questions[rawIdx];
    const resolvedQuestion = raw.question || fallbackQ?.question || `Question ${rawIdx + 1}`;
    const rawOptions = Array.isArray(raw.options) && raw.options.length > 0 ? raw.options : fallbackQ?.options;
    const resolvedOptions = Array.isArray(rawOptions) ? rawOptions : [];

    const duration = raw.durationSec || raw.duration_sec || session.question_duration_sec || fallbackQ?.durationSec || 20;
    const startMs = Number(raw.questionStartMs || raw.startMs || raw.question_start_ms) || Date.now();

    setQuestionData({
      qIndex: rawIdx,
      question: resolvedQuestion,
      options: resolvedOptions,
      durationSec: duration,
      questionStartMs: startMs,
      totalQuestions: totalCount
    });
    setSelectedIndex(null);
    setIsLocked(false);
    setRevealData(null);
    setShowConfetti(false);
    hasTriggeredFeedbackRef.current = null;
    setPointsEarned(0);

    const elapsed = (Date.now() - startMs) / 1000;
    const remaining = Math.max(0, Math.ceil(duration - elapsed));
    setQuestionTimeLeft(remaining);
  }, [session.quiz?.questions, session.question_duration_sec]);

  const applyQuestionReveal = useCallback((rData: {
    qIndex?: number;
    correctIndex: number;
    explanation?: string;
  }) => {
    setRevealData(rData);
    setIsLocked(true);
  }, []);

  // Ensure Question 1 / current question rehydrates immediately if session prop updates or loads fresh
  useEffect(() => {
    if (!questionData && (session.status === 'in_progress' || session.status === 'reveal')) {
      const idx = session.current_question_index ?? 0;
      const questions = session.quiz?.questions || [];
      if (questions.length > 0 && idx >= questions.length) {
        if (onQuizFinishedRef.current) {
          onQuizFinishedRef.current([]);
        }
        return;
      }
      const q = questions[idx];
      if (q) {
        applyQuestionStarted({
          qIndex: idx,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
          durationSec: session.question_duration_sec || q.durationSec || 20,
          questionStartMs: Number(session.question_start_ms) || Date.now(),
          totalQuestions: questions.length
        });
      }
    }
  }, [session, questionData, applyQuestionStarted]);

  // Sync with database helper
  const syncWithDatabase = useCallback(async () => {
    try {
      const fresh = await liveQuizService.getSessionById(session.id);
      if (!fresh) return;

      if (fresh.status === 'finished') {
        if (onQuizFinishedRef.current) {
          onQuizFinishedRef.current([]);
        }
        return;
      }

      if (fresh.status === 'reveal') {
        const correctIdx = fresh.correct_answer_index;
        if (typeof correctIdx === 'number') {
          const q = fresh.quiz?.questions?.[fresh.current_question_index ?? 0];
          applyQuestionReveal({
            qIndex: fresh.current_question_index,
            correctIndex: correctIdx,
            explanation: q?.explanation
          });
        }
        return;
      }

      if (fresh.status === 'in_progress') {
        const idx = fresh.current_question_index ?? 0;
        const questions = fresh.quiz?.questions || session.quiz?.questions || [];
        if (questions.length > 0 && idx >= questions.length) {
          if (onQuizFinishedRef.current) {
            onQuizFinishedRef.current([]);
          }
          return;
        }
        if (activeQIndexRef.current !== idx || !questionData) {
          const q = questions[idx];
          if (q) {
            applyQuestionStarted({
              qIndex: idx,
              question: q.question,
              options: Array.isArray(q.options) ? q.options : [],
              durationSec: fresh.question_duration_sec || q.durationSec || 20,
              questionStartMs: Number(fresh.question_start_ms) || Date.now(),
              totalQuestions: questions.length
            });
          }
        }
      }
    } catch (err) {
      console.warn('[LiveQuizStudentPlay] sync error:', err);
    }
  }, [session.id, questionData, applyQuestionStarted, applyQuestionReveal]);

  // Check if answer was already submitted for current question (e.g. after refresh or late load)
  useEffect(() => {
    if (!questionData || !user?.id) return;
    let isCancelled = false;

    liveQuizService.checkStudentExistingAnswer(session.id, questionData.qIndex, user.id)
      .then((res) => {
        if (isCancelled) return;
        if (res.answered) {
          setIsLocked(true);
          if (typeof res.selectedOptionIndex === 'number') {
            setSelectedIndex(res.selectedOptionIndex);
          }
          if (typeof res.pointsAwarded === 'number' && res.pointsAwarded > 0) {
            setPointsEarned(res.pointsAwarded);
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [questionData?.qIndex, session.id, user?.id]);

  // Connect to Supabase Realtime Channel with dual-lane listening: Broadcast + Postgres Changes
  useEffect(() => {
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (!channel) return;

    channel
      .on('broadcast', { event: 'question_started' }, (payload: any) => {
        const data = payload?.payload;
        if (data) {
          applyQuestionStarted(data);
        }
      })
      .on('broadcast', { event: 'question_reveal' }, (payload: any) => {
        const rData = payload?.payload;
        if (rData) {
          applyQuestionReveal(rData);
        }
      })
      .on('broadcast', { event: 'quiz_finished' }, (payload: any) => {
        quizAudioService.stopBackgroundMusic();
        if (onQuizFinishedRef.current) {
          onQuizFinishedRef.current(payload?.payload?.results || []);
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_quiz_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload: any) => {
          const updated = payload.new as Partial<LiveQuizSession>;
          if (!updated) return;

          if (updated.status === 'finished') {
            quizAudioService.stopBackgroundMusic();
            if (onQuizFinishedRef.current) {
              onQuizFinishedRef.current([]);
            }
            return;
          }

          if (updated.status === 'reveal') {
            const correctIdx = updated.correct_answer_index;
            if (typeof correctIdx === 'number') {
              const q = session.quiz?.questions?.[updated.current_question_index ?? 0];
              applyQuestionReveal({
                qIndex: updated.current_question_index,
                correctIndex: correctIdx,
                explanation: q?.explanation
              });
            }
            return;
          }

          if (updated.status === 'in_progress') {
            const newIdx = updated.current_question_index ?? 0;
            const questions = session.quiz?.questions || [];
            if (questions.length > 0 && newIdx >= questions.length) {
              if (onQuizFinishedRef.current) {
                onQuizFinishedRef.current([]);
              }
              return;
            }
            if (activeQIndexRef.current !== newIdx || !questionData) {
              const q = questions[newIdx];
              if (q) {
                applyQuestionStarted({
                  qIndex: newIdx,
                  question: q.question,
                  options: Array.isArray(q.options) ? q.options : [],
                  durationSec: updated.question_duration_sec || q.durationSec || 20,
                  questionStartMs: Number(updated.question_start_ms) || Date.now(),
                  totalQuestions: questions.length
                });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Immediately sync with database upon successful connection to catch any state in flight
          syncWithDatabase();
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [session.pin, session.id, session.quiz, syncWithDatabase, applyQuestionStarted, applyQuestionReveal]);

  // Tab visibility, focus, and periodic heartbeat sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithDatabase();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Safety heartbeat: poll every 3.5 seconds to ensure student never gets left behind
    const heartbeat = setInterval(() => {
      syncWithDatabase();
    }, 3500);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(heartbeat);
    };
  }, [syncWithDatabase]);

  // Trigger Local Answer Audio and Visual Feedback upon Reveal (Guarded against duplicates)
  useEffect(() => {
    if (!revealData || !questionData) return;

    // Check if feedback already fired for this question index
    if (hasTriggeredFeedbackRef.current === questionData.qIndex) return;
    hasTriggeredFeedbackRef.current = questionData.qIndex;

    const isAnswerCorrect = selectedIndex !== null && selectedIndex === revealData.correctIndex;

    if (isAnswerCorrect) {
      quizAudioService.playCorrect();
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2500);
      return () => clearTimeout(timer);
    } else {
      quizAudioService.playIncorrect();
    }
  }, [revealData, questionData, selectedIndex]);

  // Question synchronized countdown
  useEffect(() => {
    if (!questionData || revealData) return;

    const timer = setInterval(() => {
      const elapsed = (Date.now() - questionData.questionStartMs) / 1000;
      const remaining = Math.max(0, Math.ceil(questionData.durationSec - elapsed));
      setQuestionTimeLeft(remaining);

      if (remaining <= 0) {
        setIsLocked(true);
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [questionData, revealData]);

  // Total Quiz authoritative countdown timer
  useEffect(() => {
    if (!isTotalTimed) return;

    const interval = setInterval(() => {
      let remaining = 0;
      if (session.expires_at) {
        const remainingMs = new Date(session.expires_at).getTime() - Date.now();
        remaining = Math.max(0, Math.ceil(remainingMs / 1000));
      } else {
        setTotalTimeLeft((prev) => {
          remaining = Math.max(0, prev - 1);
          return remaining;
        });
      }

      setTotalTimeLeft(remaining);

      if (remaining <= 0) {
        setIsTotalTimeExpired(true);
        setIsLocked(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTotalTimed, session.expires_at]);

  const handleSelectOption = async (index: number) => {
    if (isLocked || revealData || !questionData || isTotalTimeExpired || questionTimeLeft <= 0) return;

    // Play subtle UI click sound & unlock audio
    quizAudioService.playClick();
    quizAudioService.unlockAudio();

    setSelectedIndex(index);
    setIsLocked(true);

    try {
      const res = await liveQuizService.submitAnswer({
        session_id: session.id,
        question_index: questionData.qIndex,
        selected_option_index: index
      });

      const pts = res.data?.points_awarded || 0;
      setPointsEarned(pts);
      if (typeof res.data?.current_score === 'number') {
        setTotalScore(res.data.current_score);
      } else if (pts > 0) {
        setTotalScore((prev) => prev + pts);
      }

      // Notify host of response submission
      const channel = liveQuizService.createRealtimeChannel(session.pin);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'student_answered',
          payload: {
            student_id: user?.id,
            qIndex: questionData.qIndex,
            selected_option_index: index
          }
        });
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
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

  if (!questionData || !Array.isArray(questionData.options) || questionData.options.length === 0) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl border border-sky-500/20">
        <Sparkles className="w-12 h-12 text-sky-400 animate-pulse" />
        <h2 className="text-xl sm:text-2xl font-black">Get Ready!</h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-sm font-medium">
          The teacher will start the next question shortly. Fast answers earn up to +1000 points!
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
            onClick={handleToggleSound}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
              !isMusicMuted
                ? 'bg-white/10 text-sky-300 border-white/20 hover:bg-white/20'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
            }`}
            title={isMusicMuted ? 'Unmute Background Music' : 'Mute Background Music'}
          >
            {isMusicMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-300" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>Music {isMusicMuted ? 'OFF' : 'ON'}</span>
          </button>
        </div>
      </div>
    );
  }

  const isSelectedCorrect = revealData && selectedIndex !== null && selectedIndex === revealData.correctIndex;
  const isSelectedIncorrect = revealData && selectedIndex !== null && selectedIndex !== revealData.correctIndex;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-6 relative">
      
      {/* Confetti Celebration Particle Layer (Auto disappears after 1.5s) */}
      {showConfetti && (
        <ConfettiCelebration onComplete={() => setShowConfetti(false)} durationMs={1500} />
      )}

      {/* Total Time Expired Modal / Overlay */}
      {isTotalTimeExpired && (
        <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 space-y-3 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">Time's up!</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm font-medium">
            Your answers have been submitted automatically.
          </p>
        </div>
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
      {revealData && (
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
          {revealData.explanation && (
            <p className="text-xs font-medium text-slate-200 mt-1.5 leading-relaxed">{revealData.explanation}</p>
          )}
        </div>
      )}

      {/* 4 Interactive Option Cards with Polished Feedback */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-4xl mx-auto w-full">
        {(Array.isArray(questionData.options) ? questionData.options : []).map((opt, idx) => {
          const theme = OPTION_THEMES[idx] || OPTION_THEMES[0];
          const isSelected = selectedIndex === idx;
          const isRevealed = Boolean(revealData);
          const isThisOptionCorrect = revealData && idx === revealData.correctIndex;
          const isThisOptionIncorrectSelection = isRevealed && isSelected && !isThisOptionCorrect;

          let cardStyling = `${theme.bg}`;

          if (isRevealed) {
            if (isSelected && isThisOptionCorrect) {
              // Student selected correct answer
              cardStyling = 'bg-emerald-600 ring-4 ring-emerald-300 text-white shadow-2xl shadow-emerald-500/40 scale-[1.02] animate-correct-bounce brightness-110';
            } else if (isThisOptionIncorrectSelection) {
              // Student selected incorrect answer
              cardStyling = 'bg-rose-600 ring-4 ring-rose-400 text-white shadow-xl shadow-rose-600/40 animate-error-shake brightness-100';
            } else if (isThisOptionCorrect) {
              // Highlight the correct answer if student chose wrong or missed
              cardStyling = 'bg-emerald-700/90 ring-4 ring-emerald-400 text-white shadow-md brightness-105';
            } else {
              // Non-selected wrong options
              cardStyling = 'opacity-35 grayscale-[50%] bg-slate-800 text-slate-400';
            }
          } else if (isSelected) {
            cardStyling = `${theme.bg} ring-4 ring-white scale-[1.02] shadow-2xl brightness-110`;
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isLocked || isRevealed || isTotalTimeExpired || questionTimeLeft <= 0}
              onClick={() => handleSelectOption(idx)}
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

      {/* Footer Lock Status */}
      <div className="text-center text-xs text-slate-400 font-bold">
        {questionTimeLeft <= 0 && !revealData ? (
          <span className="text-amber-300 font-black animate-pulse">
            ⏳ Time's up! Waiting for teacher to reveal the answer...
          </span>
        ) : isLocked && !revealData ? (
          <span className="text-sky-300 font-black animate-pulse">
            ✓ Answer submitted. Waiting for teacher reveal...
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
