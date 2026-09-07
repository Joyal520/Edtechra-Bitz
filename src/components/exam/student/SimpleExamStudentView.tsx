// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SIMPLE EXAM STUDENT VIEW
// Redesigned student-facing UI for the Simple Exam template (25 MCQs, 100 Marks).
// Visual design strictly adheres to the bright pastel, premium educational reference.
// ============================================================================

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Bookmark,
  CheckCircle2,
  Star,
  BookOpen,
  Sparkles,
  Check,
  GraduationCap,
  FileText
} from 'lucide-react';
import { CanonicalExamV1 } from '../shared/ExamSchema';
import { FlattenedExamQuestion } from '../shared/scoringUtilities';
import { formatTime, SyncState } from './ExamHeader';
import { renderFormattedPrompt } from '../shared/formattedText';

interface SimpleExamStudentViewProps {
  exam: CanonicalExamV1;
  questions: FlattenedExamQuestion[];
  currentIndex: number;
  currentAnswer: any;
  bookmarkedIds: Set<string>;
  timeRemainingSeconds: number;
  syncState: SyncState;
  onAnswerChange: (val: any) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleBookmark: () => void;
  onSubmit: () => void;
  onClose: () => void;
  showAnswerKey?: boolean;
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
  // Option A - Pink / Rose
  {
    letter: 'A',
    badgeBg: 'bg-[#f43f5e]',
    badgeText: 'text-white',
    cardBg: 'bg-[#fff0f4]',
    cardBorder: 'border-[#fecdd6]',
    cardHover: 'hover:border-[#fb7185] hover:bg-[#ffe4eb]',
    cardSelectedBg: 'bg-[#ffe2e8]',
    cardSelectedBorder: 'border-[#f43f5e]',
    cardSelectedRing: 'ring-4 ring-[#f43f5e]/20',
    accentRays: 'text-[#f43f5e]',
    chevronBg: 'bg-[#ffd3dc]',
    chevronText: 'text-[#f43f5e]'
  },
  // Option B - Blue / Sky
  {
    letter: 'B',
    badgeBg: 'bg-[#3b82f6]',
    badgeText: 'text-white',
    cardBg: 'bg-[#f0f7ff]',
    cardBorder: 'border-[#bae0fd]',
    cardHover: 'hover:border-[#60a5fa] hover:bg-[#e0f0fe]',
    cardSelectedBg: 'bg-[#dbeafe]',
    cardSelectedBorder: 'border-[#3b82f6]',
    cardSelectedRing: 'ring-4 ring-[#3b82f6]/20',
    accentRays: 'text-[#3b82f6]',
    chevronBg: 'bg-[#bfdbfe]',
    chevronText: 'text-[#2563eb]'
  },
  // Option C - Green / Emerald
  {
    letter: 'C',
    badgeBg: 'bg-[#10b981]',
    badgeText: 'text-white',
    cardBg: 'bg-[#f0fdf4]',
    cardBorder: 'border-[#bbf7d0]',
    cardHover: 'hover:border-[#4ade80] hover:bg-[#dcfce7]',
    cardSelectedBg: 'bg-[#d1fae5]',
    cardSelectedBorder: 'border-[#10b981]',
    cardSelectedRing: 'ring-4 ring-[#10b981]/20',
    accentRays: 'text-[#10b981]',
    chevronBg: 'bg-[#bbf7d0]',
    chevronText: 'text-[#059669]'
  },
  // Option D - Yellow / Amber
  {
    letter: 'D',
    badgeBg: 'bg-[#f59e0b]',
    badgeText: 'text-white',
    cardBg: 'bg-[#fffbeb]',
    cardBorder: 'border-[#fde68a]',
    cardHover: 'hover:border-[#fbbf24] hover:bg-[#fef3c7]',
    cardSelectedBg: 'bg-[#fef3c7]',
    cardSelectedBorder: 'border-[#f59e0b]',
    cardSelectedRing: 'ring-4 ring-[#f59e0b]/20',
    accentRays: 'text-[#f59e0b]',
    chevronBg: 'bg-[#fde68a]',
    chevronText: 'text-[#d97706]'
  }
];

export const SimpleExamStudentView: React.FC<SimpleExamStudentViewProps> = ({
  exam,
  questions,
  currentIndex,
  currentAnswer,
  bookmarkedIds,
  timeRemainingSeconds,
  syncState,
  onAnswerChange,
  onPrevious,
  onNext,
  onToggleBookmark,
  onSubmit,
  onClose,
  showAnswerKey = false
}) => {
  const currentQ = questions[currentIndex];
  const totalCount = questions.length || 25;
  const isBookmarked = currentQ ? bookmarkedIds.has(currentQ.question.id) : false;
  const isLastQuestion = currentIndex === totalCount - 1;

  // Dynamic progress calculation (e.g. Q1 of 25 = 4%, Q13 of 25 = 52%, Q25 of 25 = 100%)
  const progressPercent = totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0;

  // Timer status
  const isCritical = timeRemainingSeconds <= 60;
  const isWarning = !isCritical && timeRemainingSeconds <= 300;

  // Subject and Topic labels
  const subjectLabel = exam.exam.subject || 'General';
  const topicLabel = exam.exam.topic || exam.exam.title || 'Unit Test';

  const options = (currentQ?.question as any)?.options || [];

  return (
    <div
      data-simple-exam="true"
      className="min-h-screen bg-gradient-to-b from-[#eef6ff] via-[#f7faff] to-[#eaf3fe] flex flex-col items-center justify-between font-sans select-none [color-scheme:light] p-3 sm:p-5 md:p-6"
    >
      <div className="w-full max-w-xl md:max-w-2xl mx-auto flex flex-col gap-4 sm:gap-5 flex-1 justify-start">
        {/* ================================================================
            1. HEADER (Back button, EdTechra BiZ branding, Exam Card, Timer Card)
        ================================================================ */}
        <header className="w-full flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Back Button & Branding */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
              title="Return to classroom"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-amber-300 shadow-sm shadow-blue-500/20 shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="hidden xs:block">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                  EdTechra BiZ
                </h1>
                <span className="text-[10px] font-bold text-slate-400 tracking-wide block mt-0.5">
                  Learn • Assess • Grow
                </span>
              </div>
            </div>
          </div>

          {/* Center: Simple Exam / Subject Badge */}
          <div className="bg-white/80 backdrop-blur-xs border border-blue-100 rounded-2xl px-3 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-2 shadow-2xs min-w-0 max-w-[160px] sm:max-w-[210px]">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate flex items-center gap-1.5">
                <span>Simple Exam</span>
                {syncState === 'saving' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Saving answer..." />
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">
                {subjectLabel}: {topicLabel}
              </div>
            </div>
          </div>

          {/* Right: Authoritative Timer Card */}
          <div
            className={`rounded-2xl px-3 sm:px-3.5 py-1.5 flex items-center gap-2 shadow-2xs shrink-0 border transition-all ${
              isCritical
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                : isWarning
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-sky-100/70 border-sky-200 text-slate-900'
            }`}
          >
            <Clock
              className={`w-5 h-5 sm:w-5 sm:h-5 shrink-0 ${
                isCritical
                  ? 'text-rose-600'
                  : isWarning
                  ? 'text-amber-600'
                  : 'text-blue-600'
              }`}
            />
            <div className="leading-none">
              <div className="text-sm sm:text-base font-black tracking-tight font-mono">
                {formatTime(timeRemainingSeconds)}
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                Time Left
              </span>
            </div>
          </div>
        </header>

        {/* ================================================================
            2. PROGRESS AREA (Question X of 25, Dynamic Progress Bar, % and Marks)
        ================================================================ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 sm:gap-4 w-full">
          {/* Question Index */}
          <div className="text-xs sm:text-sm font-bold text-slate-600 shrink-0">
            Question <span className="font-black text-slate-900 text-sm sm:text-base">{currentIndex + 1}</span> of{' '}
            <span className="font-black text-slate-900 text-sm sm:text-base">{totalCount}</span>
          </div>

          {/* Dynamic Progress Bar & Percent */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-[120px]">
            <div className="bg-slate-100 rounded-full h-2.5 sm:h-3 flex-1 overflow-hidden relative border border-slate-200/40">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs sm:text-sm font-black text-slate-700 shrink-0 font-mono">
              {progressPercent}%
            </span>
          </div>

          {/* Marks Badge */}
          <div className="bg-amber-50 border border-amber-200/70 rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 shrink-0 shadow-2xs">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span className="text-xs font-black text-amber-900 whitespace-nowrap">
              {currentQ?.question?.marks || 4} Marks
            </span>
          </div>
        </div>

        {/* ================================================================
            3. MAIN QUESTION CARD (Header Pills, Question Text, Answer Panels)
        ================================================================ */}
        <main className="bg-white rounded-3xl border border-slate-100 shadow-md shadow-blue-900/5 p-5 sm:p-7 md:p-8 flex flex-col justify-between w-full space-y-6">
          {/* Top Pill Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="bg-[#fff0f3] border border-pink-200/80 text-pink-700 px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-2 shadow-2xs">
              <BookOpen className="w-4 h-4 text-pink-600" />
              <span>Multiple Choice Question</span>
            </div>

            <div className="bg-[#f0f4ff] border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Choose the correct answer.</span>
            </div>
          </div>

          {/* Question Text (Large, High Contrast, Wrapped) */}
          <div className="pt-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight break-words">
              {currentQ ? (
                renderFormattedPrompt(currentQ.question.question, {
                  isMCQ: true
                })
              ) : (
                'Question not found'
              )}
            </h2>
          </div>

          {/* ==============================================================
              4. FOUR COLORFUL PASTEL ANSWER PANELS (A, B, C, D)
          ============================================================== */}
          <div className="flex flex-col gap-3.5 sm:gap-4 w-full pt-1">
            {options.map((opt: any, optIdx: number) => {
              const theme = OPTION_THEMES[optIdx % OPTION_THEMES.length];
              const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;

              // Answer key visibility if requested
              const isCorrect =
                showAnswerKey &&
                (Array.isArray((currentQ?.question as any)?.correctAnswer)
                  ? (currentQ?.question as any).correctAnswer.includes(opt.id) ||
                    (currentQ?.question as any).correctAnswer.includes(opt.text)
                  : (currentQ?.question as any)?.correctAnswer === opt.id ||
                    (currentQ?.question as any)?.correctAnswer === opt.text);

              return (
                <button
                  key={opt.id || optIdx}
                  type="button"
                  onClick={() => onAnswerChange(opt.id || opt.text)}
                  className={`w-full p-3.5 sm:p-4 rounded-3xl border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 active:scale-[0.99] focus:outline-hidden ${
                    isSelected
                      ? `${theme.cardSelectedBg} ${theme.cardSelectedBorder} ${theme.cardSelectedRing} shadow-md`
                      : `${theme.cardBg} ${theme.cardBorder} ${theme.cardHover} shadow-2xs`
                  } ${isCorrect ? 'ring-4 ring-emerald-500/40 border-emerald-500' : ''}`}
                >
                  {/* Left: Badge + Accent Rays + Answer Text */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* Letter Square Badge */}
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${theme.badgeBg} ${theme.badgeText} flex items-center justify-center font-black text-xl sm:text-2xl shadow-sm shrink-0`}
                    >
                      {theme.letter}
                    </div>

                    {/* Decorative Rays Accent (Matching Screenshot) */}
                    <svg
                      className={`w-3.5 h-6 shrink-0 ${theme.accentRays} hidden xs:block`}
                      viewBox="0 0 16 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M2 5L7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M1 12H7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M2 19L7 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>

                    {/* Option Text */}
                    <span className="text-lg sm:text-xl font-black text-slate-900 break-words flex-1 leading-snug">
                      {opt.text}
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
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ==============================================================
              5. NAVIGATION BUTTONS (Previous, Mark for Review, Next Question / Submit)
          ============================================================== */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-3 pt-3 w-full border-t border-slate-100">
            {/* Previous Question Button */}
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={onPrevious}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-3.5 rounded-2xl bg-[#edf2f7] hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {/* Mark for Review Button */}
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3.5 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                isBookmarked
                  ? 'bg-amber-500 border-amber-500 text-white shadow-amber-300/30'
                  : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-50/60'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : 'text-blue-700'}`} />
              <span className="whitespace-nowrap">
                {isBookmarked ? 'Marked for Review' : 'Mark for Review'}
              </span>
            </button>

            {/* Next Question or Submit Exam Button */}
            {isLastQuestion ? (
              <button
                type="button"
                onClick={onSubmit}
                className="flex-1 sm:flex-initial px-5 sm:px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="whitespace-nowrap">Submit Exam</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="flex-1 sm:flex-initial px-5 sm:px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] hover:from-[#4f46e5] hover:to-[#7c3aed] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
              >
                <span className="whitespace-nowrap">Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* ================================================================
            6. DECORATIVE FOOTER ("Progress today, brighter tomorrow!" & EdTechra BiZ)
        ================================================================ */}
        <footer className="w-full pt-3 pb-2 px-2 flex items-center justify-between gap-4 text-xs text-slate-500">
          {/* Left: Playful Tagline */}
          <div className="relative">
            <span className="font-serif italic text-xs sm:text-sm font-bold text-slate-700">
              Progress today,
              <br />
              brighter tomorrow!
            </span>
            <div className="w-16 h-1 bg-amber-400 rounded-full mt-0.5 opacity-80" />
          </div>

          {/* Right: Brand Dots & Info */}
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
            </div>
            <span className="text-xs font-black text-slate-800">EdTechra BiZ</span>
            <span className="text-[10px] text-slate-400">Education for a better you</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
