import React, { useState, useRef } from 'react';
import {
  Sparkles,
  XCircle,
  HelpCircle,
  Zap,
  BookOpen,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { QuizBit, QuizAttemptResult } from '@/types';
import { quizService } from '@/services/quizService';
import { useAuth } from '@/context/AuthContext';
import { triggerConfetti } from '@/utils/confetti';
import { asmrAudio } from '@/utils/reorderAudio';

interface QuizBitCardProps {
  quiz: QuizBit;
  onAttemptCompleted?: (quizId: string, result: QuizAttemptResult) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizBitCard: React.FC<QuizBitCardProps> = ({
  quiz,
  onAttemptCompleted
}) => {
  const { session } = useAuth();
  const cardRef = useRef<HTMLElement>(null);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectOption = async (option: string) => {
    if (submitting || result) return;

    // Instant tactile ASMR pop feedback on option selection
    asmrAudio.playAsmrPop();

    setSelectedOption(option);
    setSubmitting(true);
    setError(null);

    try {
      const token = session?.access_token || null;
      const attemptResult = await quizService.submitAttempt(quiz.id, option, token);
      setResult(attemptResult);

      if (attemptResult.is_correct) {
        // ASMR celebratory double-pop + harmonic sparkle chime
        asmrAudio.playCorrectAnswerPop();
        // Trigger celebratory confetti burst
        triggerConfetti(cardRef.current);
      } else {
        // Gentle wrong feedback sound
        asmrAudio.playWrongThud();
      }

      if (onAttemptCompleted) {
        onAttemptCompleted(quiz.id, attemptResult);
      }
    } catch (err: any) {
      console.error('[QuizBitCard] Submit attempt error:', err);
      setError(err.message || 'Could not record quiz attempt. Please try again.');
      setSelectedOption(null);
    } finally {
      setSubmitting(false);
    }
  };

  const isAnswered = Boolean(result);
  const isCorrect = result?.is_correct ?? false;
  const correctAnswer = result?.correct_answer;
  const explanation = result?.explanation || quiz.explanation;
  const xpEarned = result?.xp_awarded ?? (quiz.xp || 10);

  return (
    <article
      ref={cardRef}
      className="w-full bg-white border border-stone-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all relative"
    >
      {/* 1. Colorful Accent Header Strip */}
      <div className="bg-gradient-to-r from-[#026fc3] via-[#0e8ce4] to-teal-500 px-4 sm:px-5 py-2.5 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs text-white shadow-2xs">
            🎯
          </div>
          <span className="text-xs font-black uppercase tracking-wider">
            Quick Quiz Bit
          </span>
        </div>

        <div className="flex items-center gap-2">
          {quiz.category && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold text-white">
              {quiz.category}
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black shadow-2xs flex items-center gap-1">
            <Zap className="w-3 h-3 fill-slate-900" />
            +{quiz.xp || 10} XP
          </span>
        </div>
      </div>

      {/* 2. Question Body */}
      <div className="p-4 sm:p-5 pb-3 space-y-4">
        {/* Difficulty pill */}
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
            <span>Interactive Knowledge Check</span>
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
            quiz.difficulty?.toLowerCase() === 'hard'
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : quiz.difficulty?.toLowerCase() === 'medium'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {quiz.difficulty || 'Easy'}
          </span>
        </div>

        {/* Question text */}
        <h3 className="text-sm sm:text-base font-black text-[#0f233a] leading-snug learning-content-text">
          {quiz.question}
        </h3>

        {/* 3. Four Large Touch-Friendly Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {quiz.options.map((option, index) => {
            const letter = OPTION_LETTERS[index] || String(index + 1);
            const isSelected = selectedOption === option;

            // Determine option button styling based on quiz state
            let buttonStyle = 'border-slate-200 bg-slate-50/70 hover:bg-brand-50/70 hover:border-brand-300 text-slate-800 cursor-pointer';
            let badgeStyle = 'bg-slate-200 text-slate-700';

            if (submitting && isSelected) {
              buttonStyle = 'border-brand-400 bg-brand-50 text-brand-800';
              badgeStyle = 'bg-brand-500 text-white';
            } else if (isAnswered) {
              const isThisCorrect = option === correctAnswer;

              if (isThisCorrect) {
                // Correct answer is always highlighted in emerald
                buttonStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-extrabold shadow-2xs';
                badgeStyle = 'bg-emerald-500 text-white';
              } else if (isSelected && !isCorrect) {
                // Wrong selected option
                buttonStyle = 'border-rose-400 bg-rose-50 text-rose-900 font-semibold line-through opacity-90';
                badgeStyle = 'bg-rose-500 text-white';
              } else {
                // Unselected wrong options
                buttonStyle = 'border-slate-200 bg-slate-100/50 text-slate-400 opacity-60 cursor-not-allowed';
                badgeStyle = 'bg-slate-200 text-slate-400';
              }
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectOption(option)}
                disabled={submitting || isAnswered}
                className={`min-h-[48px] sm:min-h-[50px] p-3 rounded-2xl border text-left font-bold transition-all flex items-center justify-between gap-2.5 active:scale-[0.99] ${buttonStyle}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${badgeStyle}`}>
                    {letter}
                  </div>
                  <span className="truncate break-words learning-content-text">{option}</span>
                </div>

                {/* Status Indicator Icon */}
                {isAnswered && (
                  <div className="shrink-0">
                    {option === correctAnswer ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs animate-in zoom-in-50">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xs animate-in zoom-in-50">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : null}
                  </div>
                )}

                {submitting && isSelected && (
                  <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Error message if attempt failed */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 4. Feedback & Explanation Banner */}
      {isAnswered && (
        <div
          className={`p-4 sm:p-5 border-t animate-in fade-in slide-in-from-top-2 duration-300 ${
            isCorrect
              ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-emerald-200'
              : 'bg-gradient-to-br from-amber-50/90 via-slate-50/50 to-white border-amber-200'
          }`}
        >
          {/* Result Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-xs">
                    🎉
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-emerald-900">
                      Brilliant! Correct Answer
                    </h4>
                    <p className="text-[11px] font-bold text-emerald-700">
                      {result?.already_attempted
                        ? 'Previously completed • 0 XP'
                        : `+${xpEarned} XP added to your learning journey`}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black shadow-xs">
                    💡
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-rose-900">
                      Not quite, but great try!
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600">
                      Correct answer: <span className="text-emerald-700 font-extrabold">{correctAnswer}</span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* XP Award Pill */}
            {isCorrect && !result?.already_attempted && (
              <div className="px-3 py-1 bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1 animate-bounce">
                <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>+{xpEarned} XP</span>
              </div>
            )}
          </div>

          {/* Explanation text */}
          {explanation && (
            <div className="mt-2.5 p-3 rounded-2xl bg-white/90 border border-stone-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#026fc3] mb-1">
                <BookOpen className="w-3 h-3 text-[#026fc3]" />
                <span>Why is this correct?</span>
              </div>
              <p className="font-semibold text-slate-700 leading-relaxed learning-content-text">
                {explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
