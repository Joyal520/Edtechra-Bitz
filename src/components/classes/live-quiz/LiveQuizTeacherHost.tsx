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
  Sparkles
} from 'lucide-react';
import { LiveQuizSession, LiveQuizQuestion } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { quizAudioService } from '@/services/quizAudioService';

interface LiveQuizTeacherHostProps {
  session: LiveQuizSession;
  onFinish: () => void;
}

const OPTION_STYLES = [
  {
    label: 'A',
    gradient: 'from-[#7c3aed] to-[#6d28d9]',
    border: 'border-purple-400/50',
    shadow: 'shadow-[0_10px_30px_rgba(124,58,237,0.35)]',
    badgeText: 'text-purple-700',
    ring: 'ring-purple-400',
    glowColor: '#7c3aed'
  },
  {
    label: 'B',
    gradient: 'from-[#0284c7] to-[#2563eb]',
    border: 'border-blue-400/50',
    shadow: 'shadow-[0_10px_30px_rgba(37,99,235,0.35)]',
    badgeText: 'text-blue-700',
    ring: 'ring-blue-400',
    glowColor: '#0284c7'
  },
  {
    label: 'C',
    gradient: 'from-[#ea580c] to-[#d97706]',
    border: 'border-amber-400/50',
    shadow: 'shadow-[0_10px_30px_rgba(234,88,12,0.35)]',
    badgeText: 'text-amber-700',
    ring: 'ring-amber-400',
    glowColor: '#ea580c'
  },
  {
    label: 'D',
    gradient: 'from-[#059669] to-[#10b981]',
    border: 'border-emerald-400/50',
    shadow: 'shadow-[0_10px_30px_rgba(16,185,129,0.35)]',
    badgeText: 'text-emerald-700',
    ring: 'ring-emerald-400',
    glowColor: '#059669'
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
  const [answerDistribution, setAnswerDistribution] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });
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
  const durationSec = activeQuestion?.durationSec || 20;

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
    liveQuizService.getParticipants(session.id).then((parts) => {
      if (parts && parts.length > 0) {
        setTotalStudents((prev) => Math.max(prev, parts.length));
      }
    }).catch(() => {});

    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (!channel) return;
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let studentCount = 0;
        Object.values(state).forEach((presences: any) => {
          // Strictly count students only (exclude teacher)
          studentCount += presences.filter((p: any) => p.role !== 'teacher').length;
        });
        setTotalStudents((prev) => Math.max(prev, studentCount));
      })
      .on('broadcast', { event: 'student_answered' }, (payload: any) => {
        const studentId = payload.payload?.student_id;
        const optIndex = payload.payload?.selected_option_index;

        if (studentId) {
          if (answeredStudentIdsRef.current.has(studentId)) {
            return; // Ignore duplicate broadcast from same student
          }
          answeredStudentIdsRef.current.add(studentId);
        }

        const newAnsweredCount = answeredStudentIdsRef.current.size;
        setAnsweredCount(newAnsweredCount);

        if (typeof optIndex === 'number') {
          setAnswerDistribution((prev) => ({
            ...prev,
            [optIndex]: (prev[optIndex] || 0) + 1
          }));
        }
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
        totalQuestions: questions.length
      }
    };

    // 1. Authoritative DB update FIRST
    liveQuizService.startQuestion({
      session_id: session.id,
      question_index: currentQIndex,
      duration_sec: durationSec,
      correct_answer_index: activeQuestion.correctIndex
    }).then(() => {
      // 2. Fast-lane Realtime Broadcast
      safeBroadcast(broadcastPayload);
    }).catch(() => {
      safeBroadcast(broadcastPayload);
    });
  }, [currentQIndex, session.id, activeQuestion, durationSec, questions.length, safeBroadcast]);

  // Active players count considers both presence and actual answers received
  const activePlayers = Math.max(totalStudents, answeredCount, 1);

  // 3. Synchronized countdown timer with authoritative fallback
  useEffect(() => {
    if (phase !== 'question' || isPaused) return;

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
  }, [phase, questionStartMs, durationSec, isPaused]);

  // 4. Condition A check: When all active students have answered -> Automatically advance!
  useEffect(() => {
    if (phase !== 'question' || isAdvancingRef.current) return;

    // Trigger auto-advance if at least 1 student answered and all connected have submitted
    if (answeredCount > 0 && answeredCount >= activePlayers) {
      triggerAutomaticRevealAndAdvance();
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

  // Helper to actually advance question index or finish quiz
  const proceedToNextQuestionOrFinish = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
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

  // Manual Next Question handler (skips reveal wait if already in reveal, or triggers reveal first)
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
    quizAudioService.stopBackgroundMusic();
    quizAudioService.playQuizComplete();

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
      <div className="p-12 text-center text-white bg-[#060e24] rounded-3xl border border-sky-500/20">
        <h2 className="text-xl font-bold">No questions loaded for this quiz.</h2>
      </div>
    );
  }

  // Circular timer calculations
  const timerRadius = 26;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference - (timeLeft / Math.max(durationSec, 1)) * timerCircumference;
  const answeredPercentage = activePlayers > 0 ? Math.round((answeredCount / activePlayers) * 100) : 0;

  return (
    <div className="relative min-h-[90vh] bg-gradient-to-br from-[#040c1e] via-[#081b3d] to-[#040f28] text-white rounded-[32px] p-6 sm:p-8 lg:p-10 shadow-2xl overflow-hidden border border-sky-500/25 flex flex-col justify-between select-none">
      
      {/* Background Decorative Energy Ribbons & Watermark Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path d="M0,300 C300,150 700,450 1000,300" stroke="#38bdf8" strokeWidth="2" fill="none" />
          <path d="M0,350 C350,200 650,500 1000,350" stroke="#818cf8" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER                                                                */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
        
        {/* Left: EdTechra Biz Logo + Live Quiz Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center p-2 shadow-lg shadow-blue-500/30 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-black tracking-tight text-white flex items-center gap-1">
                <span>EdTechra</span>
                <span className="text-sky-400 font-extrabold">Biz</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider">
                Learn • Assess • Grow
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/20 hidden md:block" />

          {/* Live Quiz Pill */}
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-sm font-black text-white tracking-wide">Live Quiz</span>
            </div>
            <div className="text-[11px] text-slate-300 font-medium line-clamp-1 max-w-[200px] sm:max-w-xs">
              {session.classroom?.title || 'Class 10'} — {session.quiz?.title || 'General Knowledge'}
            </div>
          </div>
        </div>

        {/* Right: Student Presence Count, Sound, Menu, End Quiz */}
        <div className="flex items-center gap-3">
          
          {/* Active Students Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-500/30 text-xs font-bold text-sky-200 shadow-inner">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>{activePlayers} Students</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Live</span>
          </div>

          {/* Background Music Mute / Unmute Toggle */}
          <button
            type="button"
            onClick={toggleMusic}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
            title={isMusicMuted ? 'Unmute Background Music' : 'Mute Background Music'}
          >
            {isMusicMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
          </button>

          {/* Host Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                quizAudioService.playClick();
                setHostMenuOpen(!hostMenuOpen);
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-200 transition-colors cursor-pointer"
              title="Host Controls"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {hostMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#091733] border border-blue-500/30 text-white rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-sky-300/80 tracking-wider border-b border-white/10">
                  Host Controls
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleTogglePause();
                    setHostMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isPaused ? 'Resume Timer' : 'Pause Timer'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    quizAudioService.playClick();
                    setHostMenuOpen(false);
                    triggerAutomaticRevealAndAdvance();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reveal Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    quizAudioService.playClick();
                    setHostMenuOpen(false);
                    handleFinishQuiz();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>End Quiz Early</span>
                </button>
              </div>
            )}
          </div>

          {/* End Quiz Button (Pill red button with rounded square stop icon) */}
          <button
            type="button"
            onClick={() => {
              quizAudioService.playClick();
              handleFinishQuiz();
            }}
            disabled={isFinishing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-full text-xs font-black shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <div className="w-3.5 h-3.5 rounded-[4px] border-2 border-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-[2px]" />
            </div>
            <span>End Quiz</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUESTION PROGRESS TRACK & CIRCULAR COUNTDOWN TIMER                        */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-4 py-3 sm:py-4">
        
        {/* Left: QUESTION X OF Y Pill */}
        <div className="px-5 py-2 rounded-full bg-[#0d224d]/80 border border-blue-500/40 text-blue-200 text-xs font-black uppercase tracking-wider shadow-md shrink-0">
          QUESTION {currentQIndex + 1} OF {questions.length}
        </div>

        {/* Center: Glowing Track Dots */}
        <div className="flex-1 max-w-xl mx-auto flex items-center justify-center gap-2 sm:gap-3 px-2">
          {questions.map((_, idx) => {
            const isCompleted = idx < currentQIndex;
            const isCurrent = idx === currentQIndex;
            return (
              <div key={idx} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full transition-all duration-300 shrink-0 ${
                    isCompleted
                      ? 'bg-purple-500 shadow-[0_0_8px_#a855f7]'
                      : isCurrent
                      ? 'bg-purple-400 ring-4 ring-purple-500/40 shadow-[0_0_12px_#c084fc] scale-125'
                      : 'border-2 border-sky-400/30 bg-sky-950/40'
                  }`}
                />
                {idx < questions.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-1 rounded-full transition-all duration-300 ${
                      idx < currentQIndex ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Authoritative Circular Countdown Timer Ring */}
        <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <circle
              cx="32"
              cy="32"
              r={timerRadius}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="32"
              cy="32"
              r={timerRadius}
              stroke="url(#timerGrad)"
              strokeWidth="4.5"
              strokeDasharray={timerCircumference}
              strokeDashoffset={timerOffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-base sm:text-lg font-black font-mono tracking-tight ${
              timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}>
              {timeLeft}s
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CENTER QUESTION PROMPT & MOTIVATIONAL WATERMARKS                           */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-6 my-auto py-2 sm:py-4">
        
        {/* Ambient Motivational Watermark — Left */}
        <div className="hidden lg:block w-28 text-[10px] font-black tracking-widest text-sky-400/25 uppercase text-left leading-loose select-none">
          EXPLORE<br />
          LEARN<br />
          ACHIEVE<br />
          TOGETHER
          <div className="w-8 h-0.5 bg-sky-400/30 mt-2 rounded-full" />
        </div>

        {/* Center: Question Prompt + Helper Pill */}
        <div className="flex-1 max-w-4xl mx-auto text-center space-y-4">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-snug drop-shadow-md">
            {activeQuestion.question}
          </h1>

          {/* Helper Pill */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#0a1b3d]/90 border border-purple-500/30 text-purple-200 text-xs sm:text-sm font-bold shadow-lg">
            <Lightbulb className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              {phase === 'reveal'
                ? activeQuestion.explanation || 'Question complete — auto advancing to next question!'
                : 'Think carefully and choose the best answer.'}
            </span>
          </div>
        </div>

        {/* Ambient Motivational Watermark — Right */}
        <div className="hidden lg:block w-28 text-[11px] font-medium italic text-sky-400/25 text-right leading-relaxed select-none">
          Knowledge<br />
          today<br />
          brighter<br />
          tomorrow
          <div className="w-8 h-0.5 bg-sky-400/30 mt-2 ml-auto rounded-full" />
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4 ANSWER CARDS (2x2 GRID)                                                 */}
      {/* ========================================================================= */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-5xl mx-auto w-full my-3 sm:my-4">
        {(activeQuestion?.options || []).map((optionText, idx) => {
          const style = OPTION_STYLES[idx] || OPTION_STYLES[0];
          const isCorrect = idx === activeQuestion.correctIndex;
          const isRevealed = phase === 'reveal';
          const voteCount = answerDistribution[idx] || 0;
          const votePercent = answeredCount > 0 ? Math.round((voteCount / answeredCount) * 100) : 0;

          return (
            <div
              key={idx}
              className={`relative flex items-center justify-between p-5 sm:p-6 rounded-[24px] border-2 transition-all duration-300 overflow-hidden bg-gradient-to-r ${style.gradient} ${style.border} ${style.shadow} ${
                isRevealed && isCorrect
                  ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-[0_0_35px_rgba(52,211,153,0.5)] brightness-110'
                  : isRevealed && !isCorrect
                  ? 'opacity-40 grayscale-[20%]'
                  : 'hover:brightness-105'
              }`}
            >
              {/* Glossy top sheen highlight */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[22px]" />

              {/* Vote bar background on reveal */}
              {isRevealed && (
                <div
                  className="absolute inset-0 bg-white/20 transition-all duration-700 pointer-events-none"
                  style={{ width: `${votePercent}%` }}
                />
              )}

              {/* Left: Circular Letter Badge + Option Text */}
              <div className="flex items-center gap-4 relative z-10 flex-1 min-w-0 pr-3">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white ${style.badgeText} flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shrink-0`}>
                  {style.label}
                </div>
                <span className="text-lg sm:text-xl font-bold text-white tracking-wide truncate">
                  {optionText}
                </span>
              </div>

              {/* Right Action / Reveal Stats */}
              <div className="relative z-10 shrink-0 flex items-center gap-2">
                {isRevealed ? (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <span className="text-xs font-black bg-white/30 text-white px-3 py-1 rounded-xl shadow-inner">
                      {voteCount} votes ({votePercent}%)
                    </span>
                    {isCorrect && (
                      <CheckCircle2 className="w-6 h-6 text-emerald-300 drop-shadow-md shrink-0" />
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/90">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM FLOATING CONTROL BAR                                               */}
      {/* ========================================================================= */}
      <div className="relative z-10 bg-[#071533]/90 backdrop-blur-md rounded-[24px] border border-blue-500/30 p-3 sm:p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 mt-4">
        
        {/* Left: Live Student Counter */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-sky-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-sm font-black text-white">{activePlayers}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live in Class</div>
          </div>
        </div>

        {/* Center Controls: Previous, Pause, Next Question */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto">
          {/* Previous Question */}
          <button
            type="button"
            onClick={handleManualPrevious}
            disabled={currentQIndex === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Pause / Resume Timer */}
          <button
            type="button"
            onClick={handleTogglePause}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-black border border-white/15 transition-all cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Primary Action: Next Question -> */}
          <button
            type="button"
            onClick={handleManualNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-95 transition-all cursor-pointer"
          >
            <span>{currentQIndex === questions.length - 1 && phase === 'reveal' ? 'Show Podium 🏆' : 'Next Question'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Section: Answered Progress Tracker & Quick Tips */}
        <div className="flex items-center gap-3">
          
          {/* Submissions Progress Widget */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
            <BarChart2 className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-extrabold text-white">{answeredCount} / {activePlayers} answered</span>
                <span className="text-sky-300 font-mono font-black">{answeredPercentage}%</span>
              </div>
              <div className="w-24 sm:w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${answeredPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Tips Toggle */}
          <button
            type="button"
            onClick={() => {
              quizAudioService.playClick();
              setQuickTipsOpen(!quickTipsOpen);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-black transition-colors cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Quick Tips</span>
            {quickTipsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

        </div>

      </div>

      {/* Quick Tips Expandable Drawer */}
      {quickTipsOpen && (
        <div className="relative z-20 mt-3 p-4 bg-[#0a183d] rounded-2xl border border-amber-400/40 text-left text-xs text-amber-100 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="font-black text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Host Tips & Auto-Advance Guide</span>
            </div>
            <button
              type="button"
              onClick={() => setQuickTipsOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
          <ul className="space-y-1.5 text-slate-300 font-medium">
            <li>• <strong>Auto-Advance:</strong> The quiz automatically advances 3.5 seconds after all active students submit or when the timer hits zero.</li>
            <li>• <strong>Manual Override:</strong> Click <em>Next Question</em> anytime to reveal immediately or skip the countdown.</li>
            <li>• <strong>Classroom Direct Join:</strong> Students enrolled in your class join directly from the class stream without typing the PIN.</li>
          </ul>
        </div>
      )}

    </div>
  );
};
