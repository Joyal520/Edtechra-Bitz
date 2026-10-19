import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  Play,
  Pause,
  StopCircle,
  MoreVertical,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  Lightbulb,
  Sparkles,
  Clock
} from 'lucide-react';
import { LiveQuizSession, LiveQuizQuestion } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { supabase } from '@/lib/supabase';
import { quizAudioService } from '@/services/quizAudioService';

interface LiveQuizTeacherHostProps {
  session: LiveQuizSession;
  onFinish: () => void;
}

const OPTION_STYLES = [
  {
    label: 'A',
    badgeBg: 'bg-[#EDE9FE]',
    badgeText: 'text-[#6D28D9]',
    barFill: 'bg-[#EDE9FE]/70'
  },
  {
    label: 'B',
    badgeBg: 'bg-[#D8F0FF]',
    badgeText: 'text-[#0284C7]',
    barFill: 'bg-[#D8F0FF]/70'
  },
  {
    label: 'C',
    badgeBg: 'bg-[#FEF0C7]',
    badgeText: 'text-[#B45309]',
    barFill: 'bg-[#FEF0C7]/70'
  },
  {
    label: 'D',
    badgeBg: 'bg-[#CBEBFF]',
    badgeText: 'text-[#087CF5]',
    barFill: 'bg-[#CBEBFF]/70'
  }
];

const REVEAL_DURATION_MS = 3500; // 3.5s reveal transition before automatic progression

export const LiveQuizTeacherHost: React.FC<LiveQuizTeacherHostProps> = ({
  session,
  onFinish
}) => {
  const questions: LiveQuizQuestion[] = session.quiz?.questions || [];
  const [currentQIndex, setCurrentQIndex] = useState(session.current_question_index || 0);
  const [phase, setPhase] = useState<'question' | 'reveal'>('question');
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [answerDistribution, setAnswerDistribution] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0
  });
  const [timeLeft, setTimeLeft] = useState(20);
  const [questionStartMs, setQuestionStartMs] = useState(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(() => quizAudioService.isMusicMuted());
  const [quickTipsOpen, setQuickTipsOpen] = useState(false);

  // Transition & idempotency lock
  const isAdvancingRef = useRef(false);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const advancedQuestionsRef = useRef<Set<number>>(new Set());

  // Channel management & subscription tracking
  const channelRef = useRef<any>(null);
  const isChannelSubscribedRef = useRef(false);
  const pendingBroadcastRef = useRef<any>(null);

  // Deduplication: track student IDs who submitted for current question
  const answeredStudentIdsRef = useRef<Set<string>>(new Set());

  const activeQuestion = questions[currentQIndex];
  const durationSec = session.quiz?.timer_enabled === false
    ? 86400
    : (session.quiz?.timer_seconds || activeQuestion?.durationSec || 20);
  const isQuestionTimed = session.quiz?.timer_enabled !== false && durationSec < 3600;

  // Background music lifecycle: start on mount when quiz is active, stop on unmount
  useEffect(() => {
    quizAudioService.startBackgroundMusic();
    return () => {
      quizAudioService.stopBackgroundMusic();
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  // Safe broadcast helper that awaits channel subscription
  const safeBroadcast = useCallback((message: any) => {
    if (channelRef.current && isChannelSubscribedRef.current) {
      channelRef.current.send(message);
    } else {
      pendingBroadcastRef.current = message;
    }
  }, []);

  // 1. Establish single Realtime channel and presence listener + load participants
  useEffect(() => {
    // Initial fetch of participants from DB to seed student count accurately
    liveQuizService
      .getParticipants(session.id)
      .then((parts) => {
        if (parts && parts.length > 0) {
          setRegisteredCount(parts.length);
          setTotalStudents((prev) => Math.max(prev, parts.length));
        }
      })
      .catch(() => {});

    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (!channel) return;
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let studentCount = 0;
        Object.values(state).forEach((presences: any) => {
          // Strictly count students only (exclude teacher / host)
          studentCount += presences.filter(
            (p: any) => p.role !== 'teacher' && p.student_id !== session.teacher_id
          ).length;
        });
        setTotalStudents((prev) => Math.max(prev, studentCount));
      })
      .on('broadcast', { event: 'student_answered' }, (payload: any) => {
        const studentId = payload.payload?.student_id || `anon_${Date.now()}_${Math.random()}`;
        const optIndex = payload.payload?.selected_option_index;

        if (answeredStudentIdsRef.current.has(studentId)) {
          return; // Ignore duplicate broadcast from same student
        }
        answeredStudentIdsRef.current.add(studentId);

        const newAnsweredCount = answeredStudentIdsRef.current.size;
        setAnsweredCount(newAnsweredCount);

        if (typeof optIndex === 'number') {
          setAnswerDistribution((prev) => ({
            ...prev,
            [optIndex]: (prev[optIndex] || 0) + 1
          }));
        }
      })
      .on('broadcast', { event: 'question_started' }, (payload: any) => {
        const nextIdx = payload?.payload?.qIndex;
        if (typeof nextIdx === 'number' && nextIdx !== currentQIndex) {
          setCurrentQIndex(nextIdx);
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
            onFinish();
            return;
          }

          if (
            typeof updated.current_question_index === 'number' &&
            updated.current_question_index !== currentQIndex
          ) {
            setCurrentQIndex(updated.current_question_index);
          }
        }
      )
      .on('broadcast', { event: 'quiz_finished' }, () => {
        onFinish();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isChannelSubscribedRef.current = true;
          if (pendingBroadcastRef.current) {
            channel.send(pendingBroadcastRef.current);
            pendingBroadcastRef.current = null;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isChannelSubscribedRef.current = false;
        }
      });

    return () => {
      isChannelSubscribedRef.current = false;
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [session.id, session.pin]);

  // 2. Initialize or advance question: Update DB first, then broadcast
  useEffect(() => {
    if (!activeQuestion) return;

    isAdvancingRef.current = false;
    answeredStudentIdsRef.current.clear();
    const startMs = Date.now();
    setQuestionStartMs(startMs);
    setTimeLeft(durationSec);
    setPhase('question');
    setAnsweredCount(0);
    setAnswerDistribution({ 0: 0, 1: 0, 2: 0, 3: 0 });

    // Play start fanfare on Q0, or transition chime on subsequent questions
    if (currentQIndex === 0) {
      quizAudioService.playQuizStart();
    } else {
      quizAudioService.playQuestionTransition();
    }

    const broadcastPayload = {
      type: 'broadcast',
      event: 'question_started',
      payload: {
        qIndex: currentQIndex,
        question: activeQuestion.question,
        options: activeQuestion.options,
        durationSec: durationSec,
        questionStartMs: startMs,
        questionEndsAtMs: startMs + durationSec * 1000,
        totalQuestions: questions.length
      }
    };

    // 1. Authoritative DB update FIRST
    liveQuizService
      .startQuestion({
        session_id: session.id,
        question_index: currentQIndex,
        duration_sec: durationSec,
        correct_answer_index: activeQuestion.correctIndex
      })
      .then(() => {
        // 2. Fast-lane Realtime Broadcast
        safeBroadcast(broadcastPayload);
      })
      .catch(() => {
        safeBroadcast(broadcastPayload);
      });
  }, [currentQIndex, session.id, activeQuestion, durationSec, questions.length, safeBroadcast]);

  // Active players count considers presence (connected students), registered participants, and answers received
  const activePlayers = Math.max(1, totalStudents > 0 ? totalStudents : registeredCount);

  // 3. Synchronized countdown timer with authoritative fallback
  useEffect(() => {
    if (!isQuestionTimed || phase !== 'question' || isPaused) return;

    const timer = setInterval(() => {
      const elapsed = (Date.now() - questionStartMs) / 1000;
      const remaining = Math.max(0, Math.ceil(durationSec - elapsed));
      setTimeLeft(remaining);

      // Condition B: Timer reached zero -> Trigger automatic advancement
      if (remaining <= 0) {
        clearInterval(timer);
        triggerAutomaticRevealAndAdvance();
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isQuestionTimed, phase, questionStartMs, durationSec, isPaused]);

  // 4. Condition A check: When all active students have answered -> Automatically advance with grace period!
  useEffect(() => {
    if (phase !== 'question' || isAdvancingRef.current) return;

    // Trigger auto-advance if at least 1 student answered and all active have submitted
    if (answeredCount > 0 && answeredCount >= activePlayers) {
      const timer = setTimeout(() => {
        if (!isAdvancingRef.current) {
          triggerAutomaticRevealAndAdvance();
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [answeredCount, activePlayers, phase]);

  // 5. Automatic reveal & seamless progression to next question (Idempotent)
  const triggerAutomaticRevealAndAdvance = async () => {
    if (isAdvancingRef.current || phase === 'reveal') return;
    isAdvancingRef.current = true;
    advancedQuestionsRef.current.add(currentQIndex);

    setPhase('reveal');
    quizAudioService.playCorrect();

    const correctIdx = activeQuestion?.correctIndex ?? 0;

    // 1. Persist reveal state in DB
    await liveQuizService.revealAnswer(session.id, correctIdx);

    // 2. Broadcast question_reveal to all students
    safeBroadcast({
      type: 'broadcast',
      event: 'question_reveal',
      payload: {
        qIndex: currentQIndex,
        correctIndex: correctIdx,
        explanation: activeQuestion?.explanation || '',
        distribution: answerDistribution
      }
    });

    // 3. Clear any existing reveal timer
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
    }

    // 4. Schedule automatic advancement after REVEAL_DURATION_MS (3.5s)
    revealTimerRef.current = setTimeout(() => {
      proceedToNextQuestionOrFinish();
    }, REVEAL_DURATION_MS);
  };

  // Helper to actually advance question index or finish quiz via CAS RPC
  // CRITICAL: Never fall back to local-only setCurrentQIndex — the DB must be updated
  // so that student clients receive the postgres_changes event.
  const proceedToNextQuestionOrFinish = async () => {
    if (currentQIndex < questions.length - 1) {
      let res = await liveQuizService.advanceQuestion(session.id, currentQIndex);

      // If the RPC rejected (e.g. stale race), retry once after a short delay
      if (!res.advanced && !res.finished) {
        console.warn('[TeacherHost] advanceQuestion rejected, retrying once...', res.reason);
        await new Promise((r) => setTimeout(r, 500));
        res = await liveQuizService.advanceQuestion(session.id, currentQIndex);
      }

      if (res.finished) {
        handleFinishQuiz();
      } else if (res.advanced && typeof res.next_question_index === 'number') {
        setCurrentQIndex(res.next_question_index);
      } else if (res.advanced) {
        setCurrentQIndex((prev) => prev + 1);
      } else {
        // RPC still failed after retry — force a direct DB update as last resort
        // to ensure students get the postgres_changes event
        console.warn('[TeacherHost] advanceQuestion failed after retry, forcing direct DB update');
        const nextIdx = currentQIndex + 1;
        try {
          if (supabase) {
            await supabase
              .from('live_quiz_sessions')
              .update({
                current_question_index: nextIdx,
                question_start_ms: Date.now(),
                status: 'in_progress',
                correct_answer_index: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', session.id);
          }
        } catch (dbErr) {
          console.error('[TeacherHost] Direct DB fallback also failed:', dbErr);
        }
        setCurrentQIndex(nextIdx);
      }
    } else {
      handleFinishQuiz();
    }
  };

  // Safe fallback: if currentQIndex reaches or exceeds questions length, immediately finalize quiz
  useEffect(() => {
    if (questions.length > 0 && currentQIndex >= questions.length && !isFinishing) {
      handleFinishQuiz();
    }
  }, [currentQIndex, questions.length, isFinishing]);

  // Manual Next Question handler
  const handleManualNext = () => {
    quizAudioService.playClick();
    if (phase === 'question') {
      triggerAutomaticRevealAndAdvance();
    } else if (phase === 'reveal') {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
      proceedToNextQuestionOrFinish();
    }
  };

  // Manual Previous Question handler
  const handleManualPrevious = () => {
    quizAudioService.playClick();
    if (currentQIndex > 0) {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
      isAdvancingRef.current = false;
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const handleTogglePause = () => {
    quizAudioService.playClick();
    if (isPaused) {
      quizAudioService.resumeBackgroundMusic();
      setIsPaused(false);
    } else {
      quizAudioService.pauseBackgroundMusic();
      setIsPaused(true);
    }
  };

  const handleFinishQuiz = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    quizAudioService.setQuizFinished(true);
    quizAudioService.stopBackgroundMusic();
    quizAudioService.playQuizComplete(session.id);

    try {
      const res = await liveQuizService.finishQuiz(session.id);

      safeBroadcast({
        type: 'broadcast',
        event: 'quiz_finished',
        payload: {
          session_id: session.id,
          results: res.data || []
        }
      });

      onFinish();
    } catch (err) {
      console.error('Failed to finalize quiz:', err);
      onFinish();
    } finally {
      setIsFinishing(false);
    }
  };

  const toggleMusic = () => {
    quizAudioService.playClick();
    const nextMuted = quizAudioService.toggleMusicMute();
    setIsMusicMuted(nextMuted);
  };

  if (!activeQuestion) {
    return (
      <div className="p-12 text-center text-[#10245A] bg-white rounded-[28px] border border-[#DCEBFA] shadow-[0_20px_50px_rgba(8,124,245,0.08)]">
        <h2 className="text-xl font-extrabold">No questions loaded for this quiz.</h2>
      </div>
    );
  }

  const answeredPercentage =
    activePlayers > 0 ? Math.round((answeredCount / activePlayers) * 100) : 0;
  const progressPct = Math.min(
    100,
    Math.max(5, Math.round(((currentQIndex + 1) / Math.max(1, questions.length)) * 100))
  );
  const categoryName = session.quiz?.category || 'Grammar';

  return (
    <div className="relative bg-white text-[#10245A] rounded-[28px] p-4 sm:p-6 lg:p-8 shadow-[0_20px_50px_rgba(8,124,245,0.08)] border border-[#DCEBFA] flex flex-col justify-between space-y-5 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6F1FC]">
        {/* Left: Official EdTechra Logo + Brand + PIN */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo.png"
            alt="EdTechra"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-extrabold text-[#10245A] tracking-tight">
                EDTECHRA
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7FF] border border-[#BCE3FF] text-[#087CF5] text-[10px] font-extrabold uppercase tracking-wider">
                Host View • PIN {session.pin}
              </span>
            </div>
            <div className="text-xs text-[#64748B] font-semibold truncate">
              {session.classroom?.title || 'Classroom'} — {session.quiz?.title || 'Live Quiz'}
            </div>
          </div>
        </div>

        {/* Right: Active Students Pill, Sound Toggle, Menu, End Quiz */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Active Students Pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-full bg-[#EAF7FF] border border-[#BCE3FF] text-xs font-extrabold text-[#10245A]">
            <Users className="w-3.5 h-3.5 text-[#087CF5]" />
            <span>{activePlayers} Players</span>
            <span className="w-2 h-2 rounded-full bg-[#18B981] animate-pulse" />
          </div>

          {/* Sound Button */}
          <button
            type="button"
            onClick={toggleMusic}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMusicMuted
                ? 'bg-[#FFF1F5] text-[#F43F7A] hover:bg-[#FFE4EC]'
                : 'bg-[#DDF0FF] text-[#087CF5] hover:bg-[#CBE7FF]'
            }`}
            title={isMusicMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Host Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                quizAudioService.playClick();
                setHostMenuOpen(!hostMenuOpen);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EEF5FC] hover:bg-[#E1EEF9] text-[#10245A] flex items-center justify-center transition-colors cursor-pointer"
              title="Host Controls"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {hostMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#DCEBFA] text-[#10245A] rounded-2xl shadow-[0_12px_32px_rgba(16,36,90,0.12)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-[#087CF5] tracking-wider border-b border-[#E6F1FC]">
                  Host Controls
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePause();
                    setHostMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-[#F5FBFF] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isPaused ? (
                    <Play className="w-3.5 h-3.5 text-[#18B981]" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-[#F7B928]" />
                  )}
                  <span>{isPaused ? 'Resume Timer' : 'Pause Timer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    quizAudioService.playClick();
                    setHostMenuOpen(false);
                    triggerAutomaticRevealAndAdvance();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-[#F5FBFF] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-[#087CF5]" />
                  <span>Reveal Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    quizAudioService.playClick();
                    setHostMenuOpen(false);
                    handleFinishQuiz();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[#F43F7A] hover:bg-[#FFF1F5] rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5 text-[#F43F7A]" />
                  <span>End Quiz Early</span>
                </button>
              </div>
            )}
          </div>

          {/* End Quiz Pill Button */}
          <button
            type="button"
            onClick={() => {
              quizAudioService.playClick();
              handleFinishQuiz();
            }}
            disabled={isFinishing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#F43F7A] to-[#E11D62] hover:brightness-105 text-white rounded-full text-xs font-extrabold shadow-[0_6px_16px_rgba(244,63,122,0.28)] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>End Quiz</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROGRESS BAR & META ROW                                                */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="w-full h-2.5 bg-[#E6F0FA] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#087CF5] to-[#08AEEF] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#10245A]">
              Question {currentQIndex + 1} of {questions.length}
            </span>
            <span className="text-[#7BA7D7]">•</span>
            <span className="font-bold text-[#087CF5]">{categoryName}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-[#E5F2FF] text-[#10245A] font-extrabold text-xs">
              {questions.length > 0 ? Math.round(100 / questions.length) : 10} pts
            </span>
            {isQuestionTimed ? (
              <span
                className={`inline-flex items-center gap-1 font-extrabold text-sm tabular-nums ${
                  timeLeft <= 5 ? 'text-[#F43F7A] animate-pulse' : 'text-[#087CF5]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-extrabold text-xs text-[#64748B]">
                <Clock className="w-3.5 h-3.5" />
                <span>No Timer</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. QUESTION CARD & 4 ANSWER OPTIONS                                       */}
      {/* ========================================================================= */}
      <div className="bg-[#F8FCFF] rounded-[24px] p-5 sm:p-7 border border-[#DCEBFA] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#10245A] tracking-tight leading-snug max-w-3xl mx-auto">
            {activeQuestion.question}
          </h1>

          {phase === 'reveal' && activeQuestion.explanation && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-bold">
              <Lightbulb className="w-3.5 h-3.5 text-[#18B981] shrink-0" />
              <span>{activeQuestion.explanation}</span>
            </div>
          )}
        </div>

        {/* 4 Answer Cards (2x2 Grid on Desktop, Stack on Mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 max-w-4xl mx-auto w-full">
          {(activeQuestion?.options || []).map((optionText, idx) => {
            const style = OPTION_STYLES[idx] || OPTION_STYLES[0];
            const isCorrect = idx === activeQuestion.correctIndex;
            const isRevealed = phase === 'reveal';
            const voteCount = answerDistribution[idx] || 0;
            const votePercent =
              answeredCount > 0 ? Math.round((voteCount / answeredCount) * 100) : 0;

            return (
              <div
                key={idx}
                className={`relative flex items-center justify-between p-4 sm:p-5 rounded-[20px] border transition-all duration-300 overflow-hidden ${
                  isRevealed && isCorrect
                    ? 'bg-[#ECFDF5] border-2 border-[#18B981] text-[#065F46] shadow-[0_8px_24px_rgba(24,185,129,0.16)] scale-[1.01]'
                    : isRevealed && !isCorrect
                    ? 'bg-white/70 border-[#E2EDF8] text-[#64748B] opacity-70'
                    : 'bg-white border-[#E2EDF8] text-[#10245A] shadow-[0_4px_12px_rgba(16,36,90,0.03)]'
                }`}
              >
                {/* Vote distribution fill bar on reveal */}
                {isRevealed && (
                  <div
                    className={`absolute inset-y-0 left-0 ${
                      isCorrect ? 'bg-[#18B981]/15' : style.barFill
                    } transition-all duration-700 pointer-events-none`}
                    style={{ width: `${votePercent}%` }}
                  />
                )}

                {/* Left: Letter Badge + Option Text */}
                <div className="flex items-center gap-3.5 relative z-10 flex-1 min-w-0 pr-3">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${style.badgeBg} ${style.badgeText} flex items-center justify-center font-extrabold text-base sm:text-lg shrink-0`}
                  >
                    {style.label}
                  </div>
                  <span className="text-base sm:text-lg font-bold text-[#10245A] leading-snug break-words">
                    {optionText}
                  </span>
                </div>

                {/* Right: Vote Count / Correct Check */}
                <div className="relative z-10 shrink-0 flex items-center gap-2">
                  {isRevealed ? (
                    <div className="flex items-center gap-2 animate-in fade-in">
                      <span className="text-xs font-extrabold bg-[#EAF7FF] border border-[#BCE3FF] text-[#087CF5] px-2.5 py-1 rounded-lg">
                        {voteCount} ({votePercent}%)
                      </span>
                      {isCorrect && (
                        <CheckCircle2 className="w-6 h-6 text-[#18B981] shrink-0" />
                      )}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-[#CBD8E8] flex items-center justify-center text-[#94A3B8]">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM CONTROL BAR                                                     */}
      {/* ========================================================================= */}
      <div className="bg-[#F5FBFF] rounded-[22px] border border-[#DCEBFA] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Answered Progress Tracker */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white border border-[#E2EEF9] text-xs font-bold text-[#10245A]">
          <BarChart2 className="w-4 h-4 text-[#087CF5] shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="font-extrabold text-[#10245A]">
                {answeredCount} / {activePlayers} Answered
              </span>
              <span className="text-[#087CF5] font-mono font-black">{answeredPercentage}%</span>
            </div>
            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-[#E6F0FA] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#087CF5] to-[#08AEEF] rounded-full transition-all duration-500"
                style={{ width: `${answeredPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center Controls: Previous, Pause, Next Question */}
        <div className="flex items-center gap-2 sm:gap-2.5 mx-auto">
          <button
            type="button"
            onClick={handleManualPrevious}
            disabled={currentQIndex === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-[#EAF7FF] text-[#10245A] text-xs font-extrabold border border-[#CDE4FA] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePause}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-[#EAF7FF] text-[#10245A] text-xs font-extrabold border border-[#CDE4FA] transition-all cursor-pointer"
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 text-[#18B981]" />
            ) : (
              <Pause className="w-3.5 h-3.5 text-[#F7B928]" />
            )}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            type="button"
            onClick={handleManualNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#087CF5] via-[#0895F3] to-[#08AEEF] hover:brightness-105 text-white rounded-full text-xs sm:text-sm font-extrabold shadow-[0_8px_20px_rgba(8,124,245,0.28)] active:scale-95 transition-all cursor-pointer"
          >
            <span>
              {currentQIndex === questions.length - 1 && phase === 'reveal'
                ? 'Show Podium 🏆'
                : 'Next Question'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick Tips Toggle */}
        <button
          type="button"
          onClick={() => {
            quizAudioService.playClick();
            setQuickTipsOpen(!quickTipsOpen);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#EAF7FF] border border-[#CDE4FA] text-[#087CF5] text-xs font-extrabold transition-colors cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5 text-[#F7B928]" />
          <span className="hidden md:inline">Quick Tips</span>
          {quickTipsOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Quick Tips Expandable Drawer */}
      {quickTipsOpen && (
        <div className="p-4 bg-[#F5FBFF] rounded-2xl border border-[#BCE3FF] text-left text-xs text-[#10245A] space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-[#087CF5] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Host Tips & Auto-Advance Guide</span>
            </div>
            <button
              type="button"
              onClick={() => setQuickTipsOpen(false)}
              className="text-[#64748B] hover:text-[#10245A] text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
          <ul className="space-y-1 text-[#4A608A] font-medium">
            <li>
              • <strong className="text-[#10245A]">Auto-Advance:</strong> Advances 3.5 seconds
              after all active students submit or when the timer reaches zero.
            </li>
            <li>
              • <strong className="text-[#10245A]">Manual Override:</strong> Click{' '}
              <em>Next Question</em> anytime to reveal immediately or skip the countdown.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
