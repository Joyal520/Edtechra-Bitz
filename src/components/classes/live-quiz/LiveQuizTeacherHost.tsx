import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  SkipForward
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
  const [isFinishing, setIsFinishing] = useState(false);

  const activeQuestion = questions[currentQIndex];
  const durationSec = activeQuestion?.durationSec || 20;

  // Initialize or advance question
  useEffect(() => {
    if (!activeQuestion) return;

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

  // Synchronized countdown timer
  useEffect(() => {
    if (phase !== 'question') return;

    const timer = setInterval(() => {
      const elapsed = (Date.now() - questionStartMs) / 1000;
      const remaining = Math.max(0, Math.ceil(durationSec - elapsed));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        handleReveal();
      }
    }, 500);

    return () => clearInterval(timer);
  }, [phase, questionStartMs, durationSec]);

  // Realtime listener for answer submissions and presence count
  useEffect(() => {
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (!channel) return;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let count = 0;
        Object.values(state).forEach((presences: any) => {
          count += presences.filter((p: any) => p.role !== 'teacher').length;
        });
        setTotalStudents(count);
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

  const handleReveal = async () => {
    if (!activeQuestion) return;
    setPhase('reveal');

    const correctIdx = activeQuestion.correctIndex ?? 0;

    // 1. Persist reveal state
    await liveQuizService.revealAnswer(session.id, correctIdx);

    // 2. Broadcast question_reveal to all students
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'question_reveal',
        payload: {
          qIndex: currentQIndex,
          correctIndex: correctIdx,
          explanation: activeQuestion.explanation || '',
          distribution: answerDistribution
        }
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = async () => {
    setIsFinishing(true);
    try {
      const res = await liveQuizService.finishQuiz(session.id);
      
      // Broadcast quiz_finished
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
      alert('Failed to finalize quiz');
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

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-6">
      
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 px-3 py-1 rounded-full">
            Question {currentQIndex + 1} of {questions.length}
          </span>
          <span className="text-xs font-bold text-slate-300 hidden sm:inline">
            PIN: <strong className="text-white font-mono">{session.pin}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Synchronized Timer */}
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black border ${
            timeLeft <= 5
              ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse'
              : 'bg-white/10 text-white border-white/20'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>

          {/* Response Counter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 bg-sky-500/20 px-3 py-1.5 rounded-full border border-sky-400/30">
            <Users className="w-3.5 h-3.5" />
            <span>{answeredCount} / {Math.max(totalStudents, answeredCount)} Answered</span>
          </div>
        </div>
      </div>

      {/* Center Question Prompt */}
      <div className="text-center py-6 max-w-4xl mx-auto space-y-3">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
          {activeQuestion.question}
        </h2>
      </div>

      {/* 4 Option Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
        {activeQuestion.options.map((opt, idx) => {
          const color = OPTION_COLORS[idx] || OPTION_COLORS[0];
          const isCorrect = idx === activeQuestion.correctIndex;
          const isRevealed = phase === 'reveal';

          return (
            <div
              key={idx}
              className={`relative flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 ${color.bg} ${color.border} ${
                isRevealed && isCorrect
                  ? 'ring-4 ring-emerald-400 scale-[1.02] shadow-2xl brightness-110'
                  : isRevealed && !isCorrect
                  ? 'opacity-40 grayscale-[40%]'
                  : 'shadow-lg'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-lg text-white shrink-0">
                  {color.label}
                </div>
                <span className="text-base sm:text-lg font-black text-white">{opt}</span>
              </div>

              {isRevealed && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-white/30 text-white px-2.5 py-1 rounded-xl">
                    {answerDistribution[idx] || 0} votes
                  </span>
                  {isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between border-t border-white/15 pt-4">
        <div>
          {phase === 'reveal' && activeQuestion.explanation && (
            <p className="text-xs text-sky-200 font-medium line-clamp-1 max-w-xl">
              💡 {activeQuestion.explanation}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {phase === 'question' ? (
            <button
              type="button"
              onClick={handleReveal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
              <span>Reveal Answers Now</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isFinishing}
              onClick={handleNextQuestion}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              <span>{currentQIndex < questions.length - 1 ? 'Next Question' : 'Finish & View Podium'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
