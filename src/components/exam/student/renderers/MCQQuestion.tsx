// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: COLORFUL PASTEL MCQ QUESTION RENDERER
// Four large colorful pastel option cards (A = Pink, B = Sky, C = Green, D = Amber)
// 2x2 grid on desktop, 1-column stack on mobile.
// Strips redundant option letter prefixes ("A. is" -> "is").
// ============================================================================

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { MultipleChoiceQuestion } from '../../shared/ExamSchema';

interface MCQQuestionProps {
  question: MultipleChoiceQuestion;
  currentAnswer: string | undefined;
  onAnswerChange: (answer: string) => void;
  showAnswerKey?: boolean;
}

// Helper to strip redundant option letter prefixes (e.g. "A. is" -> "is", "B) are" -> "are")
export function cleanOptionText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/^(\(?[A-Da-d]\)?[\.\:\-\)]\s*)/, '').trim();
}

// Pastel style definition for options A, B, C, D
interface OptionTheme {
  letter: string;
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  cardSelectedBg: string;
  cardSelectedBorder: string;
  cardSelectedRing: string;
  accentRays: string;
  chevronBg: string;
  chevronText: string;
}

const OPTION_THEMES: OptionTheme[] = [
  // Option A - Pink / Rose Pastel
  {
    letter: 'A',
    badgeBg: 'bg-[#f43f5e]',
    badgeText: 'text-white',
    cardBg: 'bg-gradient-to-r from-[#fff0f4] to-[#ffe4eb]',
    cardBorder: 'border-[#fecdd6]',
    cardHover: 'hover:border-[#fb7185] hover:shadow-md hover:shadow-pink-100',
    cardSelectedBg: 'bg-gradient-to-r from-[#ffe2e8] to-[#fecdd6]',
    cardSelectedBorder: 'border-[#f43f5e]',
    cardSelectedRing: 'ring-4 ring-[#f43f5e]/25',
    accentRays: 'text-[#f43f5e]',
    chevronBg: 'bg-[#ffd3dc]',
    chevronText: 'text-[#f43f5e]'
  },
  // Option B - Blue / Sky Pastel
  {
    letter: 'B',
    badgeBg: 'bg-[#3b82f6]',
    badgeText: 'text-white',
    cardBg: 'bg-gradient-to-r from-[#f0f7ff] to-[#e0f0fe]',
    cardBorder: 'border-[#bae0fd]',
    cardHover: 'hover:border-[#60a5fa] hover:shadow-md hover:shadow-sky-100',
    cardSelectedBg: 'bg-gradient-to-r from-[#dbeafe] to-[#bae0fd]',
    cardSelectedBorder: 'border-[#3b82f6]',
    cardSelectedRing: 'ring-4 ring-[#3b82f6]/25',
    accentRays: 'text-[#3b82f6]',
    chevronBg: 'bg-[#bfdbfe]',
    chevronText: 'text-[#2563eb]'
  },
  // Option C - Green / Mint Pastel
  {
    letter: 'C',
    badgeBg: 'bg-[#10b981]',
    badgeText: 'text-white',
    cardBg: 'bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7]',
    cardBorder: 'border-[#bbf7d0]',
    cardHover: 'hover:border-[#4ade80] hover:shadow-md hover:shadow-emerald-100',
    cardSelectedBg: 'bg-gradient-to-r from-[#d1fae5] to-[#bbf7d0]',
    cardSelectedBorder: 'border-[#10b981]',
    cardSelectedRing: 'ring-4 ring-[#10b981]/25',
    accentRays: 'text-[#10b981]',
    chevronBg: 'bg-[#bbf7d0]',
    chevronText: 'text-[#059669]'
  },
  // Option D - Yellow / Amber Pastel
  {
    letter: 'D',
    badgeBg: 'bg-[#f59e0b]',
    badgeText: 'text-white',
    cardBg: 'bg-gradient-to-r from-[#fffbeb] to-[#fef3c7]',
    cardBorder: 'border-[#fde68a]',
    cardHover: 'hover:border-[#fbbf24] hover:shadow-md hover:shadow-amber-100',
    cardSelectedBg: 'bg-gradient-to-r from-[#fef3c7] to-[#fde68a]',
    cardSelectedBorder: 'border-[#f59e0b]',
    cardSelectedRing: 'ring-4 ring-[#f59e0b]/25',
    accentRays: 'text-[#f59e0b]',
    chevronBg: 'bg-[#fde68a]',
    chevronText: 'text-[#d97706]'
  }
];

export const MCQQuestion: React.FC<MCQQuestionProps> = ({
  question,
  currentAnswer,
  onAnswerChange,
  showAnswerKey = false
}) => {
  const options = question.options || [];

  return (
    <div className="space-y-3 pt-2 answer-area w-full">
      {/* 2x2 Grid on Desktop (md:grid-cols-2), 1-Column Stack on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full">
        {options.map((opt, optIdx) => {
          const theme = OPTION_THEMES[optIdx % OPTION_THEMES.length];
          const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;
          const cleanedText = cleanOptionText(opt.text);

          // Answer key is ONLY visible when explicitly instructed in teacher view
          const isCorrect =
            showAnswerKey &&
            (Array.isArray((question as any).correctAnswer)
              ? (question as any).correctAnswer.includes(opt.id) ||
                (question as any).correctAnswer.includes(opt.text)
              : (question as any).correctAnswer === opt.id ||
                (question as any).correctAnswer === opt.text);

          return (
            <button
              key={opt.id || optIdx}
              type="button"
              onClick={() => onAnswerChange(opt.id || opt.text)}
              className={`w-full p-4 sm:p-5 rounded-3xl border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 active:scale-[0.99] focus:outline-hidden ${
                isSelected
                  ? `${theme.cardSelectedBg} ${theme.cardSelectedBorder} ${theme.cardSelectedRing} shadow-md`
                  : `${theme.cardBg} ${theme.cardBorder} ${theme.cardHover} shadow-2xs`
              } ${isCorrect ? 'ring-4 ring-emerald-500/40 border-emerald-500' : ''}`}
            >
              {/* Left: Square Colored Badge + Rays + Clean Answer Text (NO redundant letter!) */}
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                {/* Prominent Colored Letter Badge */}
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${theme.badgeBg} ${theme.badgeText} flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm shrink-0`}
                >
                  {theme.letter}
                </div>

                {/* Decorative Sunburst Rays Accent (Matching Reference Design) */}
                <svg
                  className={`w-3.5 h-5 shrink-0 ${theme.accentRays} hidden xs:block`}
                  viewBox="0 0 16 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2 5L7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M1 12H7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M2 19L7 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>

                {/* Answer Text: Displays "is" directly without redundant "A. " */}
                <span className="text-lg sm:text-xl font-black text-slate-900 break-words flex-1 leading-snug">
                  {cleanedText}
                </span>
              </div>

              {/* Right: Chevron or Check Circle Indicator */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                  isSelected
                    ? `${theme.badgeBg} text-white shadow-xs`
                    : `${theme.chevronBg} ${theme.chevronText}`
                }`}
              >
                {isSelected ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>

              {/* Teacher Answer Key Badge */}
              {isCorrect && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0 ml-1">
                  Key
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
