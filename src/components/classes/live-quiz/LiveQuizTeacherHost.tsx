import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Users,
  CheckCircle2,
  Play,
  Pause,
  StopCircle,
  MoreVertical,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { LiveQuizSession, LiveQuizQuestion } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';

interface LiveQuizTeacherHostProps {
  session: LiveQuizSession;
  onFinish: () => void;
}

const OPTION_COLORS = [
  { bg: 'bg-purple-600', border: 'border-purple-500', text: 'text-purple-100', label: 'A' },
  { bg: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-100', label: 'B' },
  { bg: 'bg-amber-600', border: 'border-amber-500', text: 'text-amber-100', label: 'C' },
  { bg: 'bg-emerald-600', border: 'border-emerald-500', text: 'text-emerald-100', label: 'D' }
];

const REVEAL_DURATION_MS = 2500; // 2.5s automatic transition reveal

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

  // Transition & idempotency lock
  const isAdvancingRef = useRef(false);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestion = questions[currentQIndex];
  const durationSec = activeQuestion?.durationSec || 20;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

  // 1. Initialize or advance question automatically
  useEffect(() => {
    if (!activeQuestion) return;

    isAdvancingRef.current = false;
    const startMs = Date.now();
    setQuestionStartMs(startMs);
    setTimeLeft(durationSec);
    setPhase('question');
    setAnsweredCount(0);
    setAnswerDistribution({ 0: 0, 1: 0, 2: 0, 3: 0 });

    // Broadcast question_started to all students
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (channel) {
      channel.send({
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
      });
    }

    // Persist active question in database
    liveQuizService.startQuestion({
      session_id: session.id,
      question_index: currentQIndex,
      duration_sec: durationSec,
      correct_answer_index: activeQuestion.correctIndex
    });
  }, [currentQIndex, session.id, session.pin]);

  // 2. Synchronized countdown timer with authoritative fallback
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

  // 3. Realtime listener for answer submissions and presence count
  useEffect(() => {
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (!channel) return;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let studentCount = 0;
        Object.values(state).forEach((presences: any) => {
          // Strictly count students only (exclude teacher)
          studentCount += presences.filter((p: any) => p.role !== 'teacher').length;
        });
        setTotalStudents(studentCount);
      })
      .on('broadcast', { event: 'student_answered' }, (payload: any) => {
        setAnsweredCount((prev) => prev + 1);
        const optIndex = payload.payload?.selected_option_index;
        if (typeof optIndex === 'number') {
          setAnswerDistribution((prev) => ({
            ...prev,
            [optIndex]: (prev[optIndex] || 0) + 1
          }));
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session.pin]);

  // 4. Condition A check: When all active students have answered -> Automatically advance!
  useEffect(() => {
    if (phase !== 'question' || isAdvancingRef.current) return;

    const activeCount = Math.max(totalStudents, 1);
    if (totalStudents > 0 && answeredCount >= activeCount) {
      triggerAutomaticRevealAndAdvance();
    }
  }, [answeredCount, totalStudents, phase]);

  // 5. Automatic reveal & seamless progression to next question
  const triggerAutomaticRevealAndAdvance = async () => {
    if (isAdvancingRef.current || phase === 'reveal') return;
    isAdvancingRef.current = true;

    setPhase('reveal');
    const correctIdx = activeQuestion?.correctIndex ?? 0;

    // Persist reveal state
    await liveQuizService.revealAnswer(session.id, correctIdx);

    // Broadcast question_reveal to all students
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'question_reveal',
        payload: {
          qIndex: currentQIndex,
          correctIndex: correctIdx,
          explanation: activeQuestion?.explanation || '',
          distribution: answerDistribution
        }
      });
    }

    // Schedule automatic advancement after REVEAL_DURATION_MS
    revealTimerRef.current = setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex((prev) => prev + 1);
      } else {
        handleFinishQuiz();
      }
    }, REVEAL_DURATION_MS);
  };

  const handleFinishQuiz = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    try {
      const res = await liveQuizService.finishQuiz(session.id);
      
      const channel = liveQuizService.createRealtimeChannel(session.pin);
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'quiz_finished',
          payload: {
            session_id: session.id,
            results: res.data || []
          }
        });
      }

      onFinish();
    } catch (err) {
      console.error('Failed to finalize quiz:', err);
      onFinish();
    } finally {
      setIsFinishing(false);
    }
  };

  if (!activeQuestion) {
    return (
      <div className="p-12 text-center text-white bg-slate-900 rounded-3xl">
        <h2 className="text-xl font-bold">No questions loaded for this quiz.</h2>
      </div>
    );
  }

  const activePlayers = Math.max(totalStudents, answeredCount);

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-6">
      
      {/* Top Host Status Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 px-3 py-1 rounded-full">
              Question {currentQIndex + 1} of {questions.length}
            </span>
          </div>

          <span className="text-xs font-extrabold text-sky-200 bg-sky-500/20 px-2.5 py-1 rounded-full border border-sky-400/30 hidden sm:inline">
            Host View
          </span>

          <span className="text-xs font-bold text-slate-300 hidden md:inline">
            PIN: <strong className="text-white font-mono">{session.pin}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Synchronized Timer */}
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black border ${
            timeLeft <= 5
              ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse'
              : 'bg-white/10 text-white border-white/20'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>

          {/* Student Answer Tracker */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 bg-sky-500/20 px-3.5 py-1.5 rounded-full border border-sky-400/30">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>{answeredCount} / {activePlayers} Answered</span>
          </div>

          {/* Optional Host Emergency Controls Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setHostMenuOpen(!hostMenuOpen)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
              title="Host Controls"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {hostMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800">
                  Host Controls
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaused(!isPaused);
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
                    setHostMenuOpen(false);
                    triggerAutomaticRevealAndAdvance();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reveal Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
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
        </div>
      </div>

      {/* Center Question Prompt */}
      <div className="text-center py-4 max-w-4xl mx-auto space-y-3">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
          {activeQuestion.question}
        </h2>
        {phase === 'reveal' && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-black animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Advancing to next question automatically...</span>
          </div>
        )}
      </div>

      {/* 4 Option Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
        {activeQuestion.options.map((opt, idx) => {
          const color = OPTION_COLORS[idx] || OPTION_COLORS[0];
          const isCorrect = idx === activeQuestion.correctIndex;
          const isRevealed = phase === 'reveal';
          const voteCount = answerDistribution[idx] || 0;
          const votePercent = answeredCount > 0 ? Math.round((voteCount / answeredCount) * 100) : 0;

          return (
            <div
              key={idx}
              className={`relative flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 overflow-hidden ${color.bg} ${color.border} ${
                isRevealed && isCorrect
                  ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-2xl brightness-110'
                  : isRevealed && !isCorrect
                  ? 'opacity-40 grayscale-[30%]'
                  : 'shadow-lg'
              }`}
            >
              {/* Vote bar background on reveal */}
              {isRevealed && (
                <div
                  className="absolute inset-0 bg-white/15 transition-all duration-500 pointer-events-none"
                  style={{ width: `${votePercent}%` }}
                />
              )}

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg text-white shrink-0">
                  {color.label}
                </div>
                <span className="text-base sm:text-lg font-black text-white">{opt}</span>
              </div>

              {isRevealed && (
                <div className="flex items-center gap-2 relative z-10">
                  <span className="text-xs font-black bg-white/30 text-white px-2.5 py-1 rounded-xl">
                    {voteCount} votes ({votePercent}%)
                  </span>
                  {isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Host Status Footer */}
      <div className="flex items-center justify-between border-t border-white/15 pt-4">
        <div className="flex items-center gap-2 text-xs text-sky-200 font-semibold">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>
            {phase === 'question'
              ? `Waiting for student submissions (${answeredCount}/${activePlayers})`
              : 'Question complete — auto advancing...'}
          </span>
        </div>

        {activeQuestion.explanation && phase === 'reveal' && (
          <p className="text-xs text-sky-200 font-medium line-clamp-1 max-w-lg hidden sm:block">
            💡 {activeQuestion.explanation}
          </p>
        )}
      </div>

    </div>
  );
};
