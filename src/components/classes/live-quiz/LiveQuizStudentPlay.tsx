import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Lock
} from 'lucide-react';
import { LiveQuizSession } from '@/types/liveQuiz';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';

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

  const [questionData, setQuestionData] = useState<{
    qIndex: number;
    question: string;
    options: string[];
    durationSec: number;
    questionStartMs: number;
    totalQuestions: number;
  } | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [revealData, setRevealData] = useState<{
    correctIndex: number;
    explanation?: string;
  } | null>(null);

  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);

  // Connect to Supabase Realtime Channel
  useEffect(() => {
    const channel = liveQuizService.createRealtimeChannel(session.pin);
    if (!channel) return;

    channel
      .on('broadcast', { event: 'question_started' }, (payload: any) => {
        const data = payload.payload;
        setQuestionData(data);
        setSelectedIndex(null);
        setIsLocked(false);
        setRevealData(null);
        setPointsEarned(0);
        setTimeLeft(data.durationSec || 20);
      })
      .on('broadcast', { event: 'question_reveal' }, (payload: any) => {
        setRevealData(payload.payload);
      })
      .on('broadcast', { event: 'quiz_finished' }, (payload: any) => {
        if (onQuizFinished) {
          onQuizFinished(payload.payload?.results);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session.pin, onQuizFinished]);

  // Local synchronized countdown
  useEffect(() => {
    if (!questionData || revealData) return;

    const timer = setInterval(() => {
      const elapsed = (Date.now() - questionData.questionStartMs) / 1000;
      const remaining = Math.max(0, Math.ceil(questionData.durationSec - elapsed));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [questionData, revealData]);

  const handleSelectOption = async (index: number) => {
    if (isLocked || revealData || !questionData) return;

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

  if (!questionData) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl border border-sky-500/20">
        <Sparkles className="w-12 h-12 text-sky-400 animate-pulse" />
        <h2 className="text-xl sm:text-2xl font-black">Get Ready!</h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-sm font-medium">
          The teacher will start the next question shortly. Fast answers earn up to +1000 points!
        </p>
      </div>
    );
  }

  const isCorrect = revealData && selectedIndex === revealData.correctIndex;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-[#031528] via-[#092b4e] to-[#0f4477] text-white rounded-3xl p-5 sm:p-8 shadow-2xl overflow-hidden border border-sky-500/20 flex flex-col justify-between space-y-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-3">
        <span className="text-xs font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full border border-purple-400/30">
          Question {questionData.qIndex + 1} of {questionData.totalQuestions}
        </span>

        <div className="flex items-center gap-3">
          <div className="text-xs font-black text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
            Score: {totalScore} pts
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
            timeLeft <= 5 ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse' : 'bg-white/10 text-white border-white/20'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
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
          isCorrect ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-rose-500/20 border border-rose-400 text-rose-300'
        }`}>
          <div className="flex items-center justify-center gap-2 text-base">
            {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span>{isCorrect ? `Correct! +${pointsEarned} Points` : 'Incorrect'}</span>
          </div>
          {revealData.explanation && (
            <p className="text-xs font-medium text-slate-200 mt-1">{revealData.explanation}</p>
          )}
        </div>
      )}

      {/* 4 Interactive Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-4xl mx-auto w-full">
        {questionData.options.map((opt, idx) => {
          const theme = OPTION_THEMES[idx] || OPTION_THEMES[0];
          const isSelected = selectedIndex === idx;
          const isRevealed = Boolean(revealData);
          const isOptionCorrect = revealData && idx === revealData.correctIndex;

          return (
            <button
              key={idx}
              type="button"
              disabled={isLocked || isRevealed}
              onClick={() => handleSelectOption(idx)}
              className={`p-5 rounded-3xl font-black text-left flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg ${theme.bg} ${
                isSelected
                  ? 'ring-4 ring-white scale-[1.02] shadow-2xl brightness-110'
                  : ''
              } ${
                isRevealed && isOptionCorrect
                  ? 'ring-4 ring-emerald-400 brightness-110'
                  : isRevealed && !isOptionCorrect
                  ? 'opacity-40 grayscale-[40%]'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-black text-base text-white shrink-0">
                  {theme.label}
                </div>
                <span className="text-sm sm:text-base text-white">{opt}</span>
              </div>

              {isSelected && (
                <span className="text-[11px] font-black bg-white/30 text-white px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Lock Status */}
      <div className="text-center text-xs text-slate-400 font-bold">
        {isLocked && !revealData ? (
          <span className="text-sky-300 font-black animate-pulse">
            ✓ Answer locked in! Waiting for time to expire...
          </span>
        ) : (
          <span>Select an answer card above before timer expires</span>
        )}
      </div>

    </div>
  );
};
