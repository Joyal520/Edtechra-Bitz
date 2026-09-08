// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SIMPLE EXAM STUDENT VIEW
// Genuine Responsive Layout: 2-Column Desktop (2x2 Options Grid) &
// Mobile-First Single-Column Flow (Stacked Colorful Options)
// Strictly matches the EdTechra BiZ Simple Exam Reference Specification.
// ============================================================================

import React, { useState } from 'react';
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
  RotateCcw,
  GraduationCap,
  FileText,
  Menu,
  X,
  ChevronRight,
  Home
} from 'lucide-react';
import { CanonicalExamV1 } from '../shared/ExamSchema';
import { FlattenedExamQuestion } from '../shared/scoringUtilities';
import { formatTime, SyncState } from './ExamHeader';
import { renderFormattedPrompt } from '../shared/formattedText';

export interface SimpleExamStudentViewProps {
  exam: CanonicalExamV1;
  questions: FlattenedExamQuestion[];
  currentIndex: number;
  currentAnswer: any;
  answers: Record<string, any>;
  bookmarkedIds: Set<string>;
  timeRemainingSeconds: number;
  syncState?: SyncState;
  answeredCount: number;
  unansweredCount: number;
  markedCount: number;
  onAnswerChange: (val: any) => void;
  onClearAnswer: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelectIndex: (idx: number) => void;
  onToggleBookmark: () => void;
  onSubmit: () => void;
  onClose: () => void;
  showAnswerKey?: boolean;
  isMobilePreview?: boolean;
}

/**
 * Robust helper to strip redundant option letter prefixes (e.g. "A. is" -> "is", "B) are" -> "are", "A  A. is" -> "is")
 * Guarantees that the option letter badge is the ONLY place displaying A, B, C, D.
 */
export function cleanOptionText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    // Strip "(A) ", "[A] ", "A. ", "A) ", "A: ", "A - ", "A— ", "Option A: ", "Option A. ", "Option A - "
    const withDelim = cleaned.replace(
      /^(?:option\s+)?(?:[\(\[]?[A-Da-d][\)\]]?\s*[\.\:\-\–\—\)\]]|\(?[A-Da-d]\)\s*|(?:option\s+)[A-Da-d]\s*[:.-]?)\s*/i,
      ''
    ).trim();
    if (withDelim !== cleaned && withDelim.length > 0) {
      cleaned = withDelim;
      continue;
    }
    // Strip standalone prefix like "A  " (A followed by 2 or more spaces)
    const withMultiSpaces = cleaned.replace(/^[A-Da-d]\s{2,}/i, '').trim();
    if (withMultiSpaces !== cleaned && withMultiSpaces.length > 0) {
      cleaned = withMultiSpaces;
      continue;
    }
    // Strip "A " when followed by another prefix like "A. "
    const withRedundantLetter = cleaned.replace(/^[A-Da-d]\s+(?=[A-Da-d][\.\:\-\)]|[A-Da-d]\s+)/i, '').trim();
    if (withRedundantLetter !== cleaned && withRedundantLetter.length > 0) {
      cleaned = withRedundantLetter;
      continue;
    }
    break;
  }
  return cleaned;
}

/**
 * Parsed question structure separating the main instruction, context sentence, and target highlighted words
 */
export interface ParsedQuestionContent {
  promptText: string;
  contextSentence: string | null;
  targetWords: string[];
}

/**
 * Intelligently decomposes question prompts into:
 * 1. Target words from quotes (e.g. "Maria", "John")
 * 2. Main question prompt (e.g. "Which subject pronoun can replace “Maria” in this sentence?")
 * 3. Context sentence card (e.g. "Maria is a student.")
 */
export function parseQuestionPrompt(rawText: string): ParsedQuestionContent {
  if (!rawText || typeof rawText !== 'string') {
    return { promptText: '', contextSentence: null, targetWords: [] };
  }

  const text = rawText.trim();

  // 1. Extract target words from quotes (e.g. “Maria”, "John", ‘word’, 'word')
  const targetWords: string[] = [];
  const quoteRegex = /(?:[“"‘'])([^“”"'`\n\r]{1,40})(?:[”"’'])/g;
  let match: RegExpExecArray | null;
  while ((match = quoteRegex.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (candidate.length > 0 && !candidate.includes('.') && !candidate.includes('?') && !candidate.includes('!')) {
      if (!targetWords.includes(candidate)) {
        targetWords.push(candidate);
      }
    }
  }

  let promptText = text;
  let contextSentence: string | null = null;

  // 2. Pattern A: Colon separator after "in this sentence", "in the sentence", "context", "passage", etc.
  // e.g. "Which subject pronoun can replace the noun “Maria” in this sentence: Maria is a student."
  const colonMatch = text.match(
    /^(.*?(?:in (?:this|the|following) sentence|in the sentence below|sentence|context|passage|example))\s*[:]\s*(.+)$/i
  );
  if (colonMatch) {
    let p = colonMatch[1].trim();
    let s = colonMatch[2].trim();
    // Clean up wrapping quotes around sentence if any
    s = s.replace(/^[“"']\s*/, '').replace(/\s*[”"']$/, '').trim();
    if (!/[?.!]$/.test(p)) {
      p += '?';
    }
    promptText = p;
    contextSentence = s;
  } else {
    // 3. Pattern B: Newline separator
    const lines = text.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      if (/sentence\s*:/i.test(lines[0])) {
        contextSentence = lines[0].replace(/^sentence\s*:\s*/i, '').trim();
        promptText = lines.slice(1).join(' ').trim();
      } else if (lines[0].includes('?') || /replace|choose|identify|which|what|select/i.test(lines[0])) {
        promptText = lines[0];
        contextSentence = lines.slice(1).join(' ').trim();
      }
    } else {
      // 4. Pattern C: Question mark followed by a sentence (e.g. "...in this sentence? John is my friend.")
      const qMarkMatch = text.match(/^(.*?\?)\s+([A-Z0-9][^?]+?\.)\s*$/);
      if (qMarkMatch) {
        promptText = qMarkMatch[1].trim();
        contextSentence = qMarkMatch[2].trim();
      }
    }
  }

  if (contextSentence) {
    contextSentence = contextSentence.replace(/^[“"']\s*/, '').replace(/\s*[”"']$/, '').trim();
  }

  return { promptText, contextSentence, targetWords };
}

/**
 * Safely renders text with soft lavender/purple inline highlighting for the target word.
 * Does NOT highlight everything and avoids neon yellow marker styling.
 */
export function renderHighlightedText(
  text: string,
  targetWords: string[],
  isContextSentence: boolean = false
): React.ReactNode {
  if (!text) return null;

  if (!targetWords || targetWords.length === 0) {
    return renderFormattedPrompt(text, { isMCQ: true });
  }

  const escapedWords = targetWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  let pattern: RegExp;
  if (!isContextSentence) {
    // In question prompt: match target word with quotes or word boundaries
    pattern = new RegExp(`([“"‘'](?:${escapedWords.join('|')})[”"’']|\\b(?:${escapedWords.join('|')})\\b)`, 'gi');
  } else {
    // In context sentence: match target word with word boundaries
    pattern = new RegExp(`(\\b(?:${escapedWords.join('|')})\\b)`, 'gi');
  }

  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        const stripped = part.replace(/[“"‘'”]/g, '').trim().toLowerCase();
        const isTarget = targetWords.some((w) => w.toLowerCase() === stripped);

        if (isTarget) {
          return (
            <span
              key={`target-${idx}`}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-lg bg-purple-100 text-purple-950 font-black border border-purple-200/90 shadow-2xs select-text"
            >
              {part}
            </span>
          );
        }

        return <React.Fragment key={`text-${idx}`}>{renderFormattedPrompt(part, { isMCQ: true })}</React.Fragment>;
      })}
    </>
  );
}

// Pastel style definition for options A, B, C, D (Visibly fills card in default state)
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
  chevronBg: string;
  chevronText: string;
}

const OPTION_THEMES: OptionTheme[] = [
  // Option A - Soft Rose / Pink Pastel Card
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
    chevronBg: 'bg-[#ffd3dc]',
    chevronText: 'text-[#f43f5e]'
  },
  // Option B - Soft Sky-Blue Pastel Card
  {
    letter: 'B',
    badgeBg: 'bg-[#0284c7]',
    badgeText: 'text-white',
    cardBg: 'bg-gradient-to-r from-[#f0f7ff] to-[#e0f0fe]',
    cardBorder: 'border-[#bae0fd]',
    cardHover: 'hover:border-[#38bdf8] hover:shadow-md hover:shadow-sky-100',
    cardSelectedBg: 'bg-gradient-to-r from-[#dbeafe] to-[#bae0fd]',
    cardSelectedBorder: 'border-[#0284c7]',
    cardSelectedRing: 'ring-4 ring-[#0284c7]/25',
    chevronBg: 'bg-[#bfdbfe]',
    chevronText: 'text-[#0284c7]'
  },
  // Option C - Soft Mint / Green Pastel Card
  {
    letter: 'C',
    badgeBg: 'bg-[#059669]',
    badgeText: 'text-white',
    cardBg: 'bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7]',
    cardBorder: 'border-[#bbf7d0]',
    cardHover: 'hover:border-[#4ade80] hover:shadow-md hover:shadow-emerald-100',
    cardSelectedBg: 'bg-gradient-to-r from-[#d1fae5] to-[#bbf7d0]',
    cardSelectedBorder: 'border-[#059669]',
    cardSelectedRing: 'ring-4 ring-[#059669]/25',
    chevronBg: 'bg-[#bbf7d0]',
    chevronText: 'text-[#059669]'
  },
  // Option D - Soft Yellow / Warm Amber Pastel Card
  {
    letter: 'D',
    badgeBg: 'bg-[#d97706]',
    badgeText: 'text-white',
    cardBg: 'bg-gradient-to-r from-[#fffbeb] to-[#fef3c7]',
    cardBorder: 'border-[#fde68a]',
    cardHover: 'hover:border-[#fbbf24] hover:shadow-md hover:shadow-amber-100',
    cardSelectedBg: 'bg-gradient-to-r from-[#fef3c7] to-[#fde68a]',
    cardSelectedBorder: 'border-[#d97706]',
    cardSelectedRing: 'ring-4 ring-[#d97706]/25',
    chevronBg: 'bg-[#fde68a]',
    chevronText: 'text-[#d97706]'
  }
];

export const SimpleExamStudentView: React.FC<SimpleExamStudentViewProps> = ({
  exam,
  questions,
  currentIndex,
  currentAnswer,
  answers,
  bookmarkedIds,
  timeRemainingSeconds,
  syncState,
  answeredCount,
  unansweredCount,
  markedCount,
  onAnswerChange,
  onClearAnswer,
  onPrevious,
  onNext,
  onSelectIndex,
  onToggleBookmark,
  onSubmit,
  onClose,
  showAnswerKey = false,
  isMobilePreview = false
}) => {
  const [mobileNavigatorOpen, setMobileNavigatorOpen] = useState(false);

  const currentQ = questions[currentIndex];
  const totalCount = questions.length || 25;
  const isBookmarked = currentQ ? bookmarkedIds.has(currentQ.question.id) : false;
  const isLastQuestion = currentIndex === totalCount - 1;
  const hasAnsweredCurrent = currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '';

  // Dynamic progress calculation
  const progressPercent = totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0;

  // Authoritative format time - reads from the single timeRemainingSeconds prop
  const formattedTime = formatTime(timeRemainingSeconds);
  const isCritical = timeRemainingSeconds <= 60;
  const isWarning = !isCritical && timeRemainingSeconds <= 300;

  // Subject and Topic labels
  const subjectLabel = exam.exam.subject || 'English';
  const topicLabel = exam.exam.topic || exam.exam.title || 'Simple Past Tense';

  const rawOptions = (currentQ?.question as any)?.options || [];

  // Parse question text into prompt, context sentence, and target words
  const parsedQuestion = currentQ
    ? parseQuestionPrompt(currentQ.question.question)
    : { promptText: 'Question not found', contextSentence: null, targetWords: [] };

  return (
    <div
      data-simple-exam="true"
      className="min-h-screen bg-gradient-to-b from-[#eef6ff] via-[#f7faff] to-[#eaf3fe] flex flex-col font-sans select-none [color-scheme:light] p-2.5 sm:p-5 md:p-6 lg:p-8 w-full overflow-x-hidden"
    >
      <div className="w-full max-w-[1360px] mx-auto flex flex-col gap-3.5 sm:gap-5 flex-1">
        {/* ================================================================
            1. TOP HEADER (Synchronized Timer 1)
        ================================================================ */}
        {isMobilePreview ? (
          // Dedicated Mobile Header when previewed in Mobile mode
          <header className="w-full flex items-center justify-between gap-2 bg-white/90 backdrop-blur-xs border border-blue-100 rounded-2xl px-3 py-2 shadow-2xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavigatorOpen(true)}
                className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-950 cursor-pointer active:scale-95 shrink-0"
                title="Open Question Navigator"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-amber-300 shadow-xs shrink-0">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs font-black text-slate-900 leading-none truncate">
                  EdTechra BiZ
                </h1>
                <span className="text-[10px] font-bold text-slate-500 truncate block mt-0.5">
                  Simple Exam
                </span>
              </div>
            </div>

            {/* Authoritative Timer Pill */}
            <div
              className={`rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 border shrink-0 transition-all ${
                isCritical
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : isWarning
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-sky-100/80 border-sky-200 text-slate-900'
              }`}
            >
              <Clock
                className={`w-3.5 h-3.5 shrink-0 ${
                  isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-blue-600'
                }`}
              />
              <span className="text-xs font-black tracking-tight font-mono">
                {formattedTime}
              </span>
            </div>
          </header>
        ) : (
          // Responsive Standard Header (Desktop full, Mobile compact)
          <header className="w-full flex items-center justify-between gap-3 bg-transparent shrink-0">
            {/* Left Branding */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Mobile Drawer Toggle (Visible on small screens) */}
              <button
                type="button"
                onClick={() => setMobileNavigatorOpen(true)}
                className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95"
                title="Open Question Navigator"
              >
                <Menu className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </button>

              {/* Back button (Desktop) */}
              <button
                type="button"
                onClick={onClose}
                className="hidden lg:flex w-10 h-10 rounded-full bg-white border border-slate-200 shadow-2xs items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all cursor-pointer active:scale-95 shrink-0"
                title="Return to classroom"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-amber-300 shadow-sm shadow-blue-500/20 shrink-0">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 leading-none">
                    EdTechra BiZ
                  </h1>
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 tracking-wide block mt-0.5">
                    Learn • Assess • Grow
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Center: Simple Exam / Subject Badge */}
            <div className="hidden sm:flex bg-white/90 backdrop-blur-xs border border-blue-100 rounded-2xl px-4 py-2 items-center gap-2.5 shadow-2xs min-w-0">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate flex items-center gap-1.5">
                  <span>Simple Exam</span>
                  {syncState === 'saving' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Saving..." />
                  )}
                </div>
                <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">
                  {subjectLabel}: {topicLabel}
                </div>
              </div>
            </div>

            {/* Right: Authoritative Timer Display 1 (Header Timer) */}
            <div
              className={`rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-2.5 shadow-2xs shrink-0 border transition-all ${
                isCritical
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : isWarning
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-sky-100/80 border-sky-200 text-slate-900'
              }`}
            >
              <Clock
                className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${
                  isCritical
                    ? 'text-rose-600'
                    : isWarning
                    ? 'text-amber-600'
                    : 'text-blue-600'
                }`}
              />
              <div className="leading-none text-right sm:text-left">
                <div className="text-sm sm:text-lg font-black tracking-tight font-mono">
                  {formattedTime}
                </div>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                  Time Left
                </span>
              </div>
            </div>
          </header>
        )}

        {/* Desktop Breadcrumbs Bar (Hidden on Mobile) */}
        {!isMobilePreview && (
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400 px-1 -mt-1">
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span>Dashboard</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>Exams</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="text-slate-600 font-bold">Simple Exam</span>
          </div>
        )}

        {/* ================================================================
            2. MAIN CONTENT AREA (Desktop 2-Column or Mobile Single-Column)
        ================================================================ */}
        <div
          className={
            isMobilePreview
              ? 'flex flex-col gap-3.5 w-full'
              : 'grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start w-full'
          }
        >
          {/* ==============================================================
              LEFT / MAIN COLUMN: Progress + Question + Options + Actions
          ============================================================== */}
          <div
            className={
              isMobilePreview
                ? 'w-full flex flex-col gap-3.5'
                : 'lg:col-span-8 xl:col-span-8 2xl:col-span-9 flex flex-col gap-3.5 sm:gap-5 w-full'
            }
          >
            {/* Progress Card (Compact & Responsive) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs px-3.5 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4 w-full">
              {/* Question Index */}
              <div className="text-xs sm:text-sm font-bold text-slate-600 shrink-0">
                <span className="hidden xs:inline">Question </span>
                <span className="xs:hidden">Q </span>
                <span className="font-black text-slate-900 text-sm sm:text-base">{currentIndex + 1}</span> of{' '}
                <span className="font-black text-slate-900 text-sm sm:text-base">{totalCount}</span>
              </div>

              {/* Dynamic Progress Bar & Percent */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-[70px] max-w-xs sm:max-w-md">
                <div className="bg-slate-100 rounded-full h-2 sm:h-2.5 flex-1 overflow-hidden relative border border-slate-200/40">
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
              <div className="bg-amber-50 border border-amber-200/70 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 shrink-0 shadow-2xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span className="text-xs font-black text-amber-900 whitespace-nowrap">
                  {currentQ?.question?.marks || 4} Marks
                </span>
              </div>
            </div>

            {/* Main Question Card */}
            <main className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-md shadow-blue-900/5 p-4 sm:p-6 md:p-8 flex flex-col justify-between w-full space-y-4 sm:space-y-5">
              {/* Top Tag Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="bg-[#fff0f3] border border-pink-200/80 text-pink-700 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 sm:gap-2 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 text-pink-600" />
                  <span>Multiple Choice Question</span>
                </div>

                {!isMobilePreview && (
                  <div className="hidden sm:flex bg-[#f0f4ff] border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Choose the correct answer.</span>
                  </div>
                )}
              </div>

              {/* Main Question Text with Soft Lavender/Purple Target Word Highlight */}
              <div className="pt-0.5">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 leading-snug sm:leading-tight tracking-tight break-words">
                  {renderHighlightedText(parsedQuestion.promptText, parsedQuestion.targetWords, false)}
                </h2>
              </div>

              {/* Referenced Context Sentence Card (when sentence is detected) */}
              {parsedQuestion.contextSentence && (
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 shadow-2xs flex items-center gap-2.5 w-full">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 select-none">
                    Context
                  </span>
                  <div className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed break-words flex-1">
                    {renderHighlightedText(parsedQuestion.contextSentence, parsedQuestion.targetWords, true)}
                  </div>
                </div>
              )}

              {/* ==========================================================
                  FOUR COLORFUL PASTEL ANSWER PANELS:
                  - 2x2 Grid on Desktop (md:grid-cols-2)
                  - 1-Column Vertical Stack on Mobile (grid-cols-1)
                  - Option text cleaned via cleanOptionText() (NO duplicate A./B./C./D.!)
                  - Natural content-driven height (NO text clipping!)
              ========================================================== */}
              <div
                className={
                  isMobilePreview
                    ? 'grid grid-cols-1 gap-2.5 sm:gap-3.5 w-full pt-1'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 md:gap-4 w-full pt-1'
                }
              >
                {rawOptions.map((opt: any, optIdx: number) => {
                  const theme = OPTION_THEMES[optIdx % OPTION_THEMES.length];
                  const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;
                  const cleanedText = cleanOptionText(opt.text);

                  // Teacher answer key reveal if requested
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
                      className={`w-full min-h-[56px] sm:min-h-[64px] md:min-h-[72px] p-3 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl border-2 text-left flex items-center justify-between gap-2.5 sm:gap-3.5 cursor-pointer transition-all duration-150 active:scale-[0.99] focus:outline-hidden ${
                        isSelected
                          ? `${theme.cardSelectedBg} ${theme.cardSelectedBorder} ${theme.cardSelectedRing} shadow-md`
                          : `${theme.cardBg} ${theme.cardBorder} ${theme.cardHover} shadow-2xs`
                      } ${isCorrect ? 'ring-4 ring-emerald-500/40 border-emerald-500' : ''}`}
                    >
                      {/* Left: Square Colored Badge + Clean Answer Text (NO redundant letter!) */}
                      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                        {/* Letter Badge: Strong color, white bold letter */}
                        <div
                          className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl ${theme.badgeBg} ${theme.badgeText} flex items-center justify-center font-black text-base sm:text-lg md:text-xl shadow-xs shrink-0 select-none`}
                        >
                          {theme.letter}
                        </div>

                        {/* Answer Text: Always fully visible, never clipped */}
                        <span className="text-sm sm:text-base md:text-lg font-bold sm:font-black text-slate-900 break-words flex-1 leading-snug">
                          {cleanedText}
                        </span>
                      </div>

                      {/* Right: Chevron or Check Circle Indicator */}
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                          isSelected
                            ? `${theme.badgeBg} text-white shadow-xs`
                            : `${theme.chevronBg} ${theme.chevronText}`
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ==========================================================
                  NAVIGATION CONTROLS:
                  - Desktop: Previous, Flag for Review, Clear, Next Question
                  - Mobile: 2 rows ([Flag] [Clear], then [Previous] [Next])
              ========================================================== */}
              {isMobilePreview ? (
                // Mobile Navigation Layout for Mobile Preview
                <div className="flex flex-col gap-2.5 pt-2 w-full border-t border-slate-100">
                  {/* Row 1: Flag & Clear */}
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={onToggleBookmark}
                      className={`py-2.5 sm:py-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                        isBookmarked
                          ? 'bg-amber-500 border-amber-500 text-white shadow-amber-300/30'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : 'text-slate-700'}`} />
                      <span>{isBookmarked ? 'Flagged' : 'Flag'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClearAnswer}
                      disabled={!hasAnsweredCurrent}
                      className="py-2.5 sm:py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>

                  {/* Row 2: Previous & Next */}
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={onPrevious}
                      className="py-3 rounded-2xl bg-[#edf2f7] text-slate-600 disabled:opacity-40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    {isLastQuestion ? (
                      <button
                        type="button"
                        onClick={onSubmit}
                        className="py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onNext}
                        className="py-3 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-95"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Standard Responsive Navigation (Desktop 1-row, Mobile 2-rows)
                <>
                  {/* Desktop Row */}
                  <div className="hidden sm:flex items-center justify-between gap-3 pt-3 w-full border-t border-slate-100">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={onPrevious}
                      className="px-5 py-2.5 sm:py-3 rounded-2xl bg-[#edf2f7] hover:bg-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={onToggleBookmark}
                        className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                          isBookmarked
                            ? 'bg-amber-500 border-amber-500 text-white shadow-amber-300/30'
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : 'text-slate-700'}`} />
                        <span>{isBookmarked ? 'Flagged' : 'Flag for Review'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClearAnswer}
                        disabled={!hasAnsweredCurrent}
                        className="px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Clear current selection"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    </div>

                    {isLastQuestion ? (
                      <button
                        type="button"
                        onClick={onSubmit}
                        className="px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit Exam</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onNext}
                        className="px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] hover:from-[#4f46e5] hover:to-[#7c3aed] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
                      >
                        <span>Next Question</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Mobile Row */}
                  <div className="sm:hidden flex flex-col gap-2.5 pt-2 w-full border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2.5 w-full">
                      <button
                        type="button"
                        onClick={onToggleBookmark}
                        className={`py-2.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                          isBookmarked
                            ? 'bg-amber-500 border-amber-500 text-white shadow-amber-300/30'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : 'text-slate-700'}`} />
                        <span>{isBookmarked ? 'Flagged' : 'Flag'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClearAnswer}
                        disabled={!hasAnsweredCurrent}
                        className="py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 w-full">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={onPrevious}
                        className="py-3 rounded-2xl bg-[#edf2f7] text-slate-600 disabled:opacity-40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      {isLastQuestion ? (
                        <button
                          type="button"
                          onClick={onSubmit}
                          className="py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onNext}
                          className="py-3 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-95"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>

          {/* ==============================================================
              RIGHT COLUMN: DESKTOP SIDEBAR
              (Navigator, Synchronized Timer 2, Status, Submit)
              Hidden on Mobile / Not rendered in Mobile Preview Mode
          ============================================================== */}
          {!isMobilePreview && (
            <aside className="hidden lg:flex lg:col-span-4 xl:col-span-4 2xl:col-span-3 flex-col gap-4 sticky top-6">
              {/* Card 1: Question Navigator Grid (5 x 5) */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-black text-slate-900 tracking-wide">Question Navigator</h3>

                {/* 5 x 5 Grid */}
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, qIdx) => {
                    const isCurrent = qIdx === currentIndex;
                    const isAnswered =
                      answers[q.question.id] !== undefined &&
                      answers[q.question.id] !== null &&
                      answers[q.question.id] !== '';
                    const isFlagged = bookmarkedIds.has(q.question.id);

                    let btnStyle = 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100';
                    if (isCurrent) {
                      btnStyle = 'bg-[#6366f1] text-white font-black shadow-xs ring-2 ring-indigo-300 border-[#6366f1]';
                    } else if (isFlagged) {
                      btnStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
                    } else if (isAnswered) {
                      btnStyle = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold';
                    }

                    return (
                      <button
                        key={q.question.id || qIdx}
                        type="button"
                        onClick={() => onSelectIndex(qIdx)}
                        className={`w-full aspect-square rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer active:scale-90 ${btnStyle}`}
                        title={`Question ${qIdx + 1}`}
                      >
                        {qIdx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Navigator Legend */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <span>Not Attempted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>Marked</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Time Remaining (Second Synchronized Live Timer Display) */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time Remaining</div>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-100 text-rose-600'
                        : isWarning
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-black font-mono text-slate-900 tracking-tight leading-none">
                      {formattedTime}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                      Synchronized authoritative timer
                    </span>
                  </div>
                </div>

                {/* Purple Accent Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Exam Progress Stats (Answered, Marked, Remaining) */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Exam Progress</div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Answered */}
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 text-center">
                    <div className="text-lg font-black text-emerald-800 leading-none">{answeredCount}</div>
                    <div className="text-[10px] font-bold text-emerald-600 mt-1">Answered</div>
                  </div>

                  {/* Marked */}
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5 text-center">
                    <div className="text-lg font-black text-amber-800 leading-none">{markedCount}</div>
                    <div className="text-[10px] font-bold text-amber-600 mt-1">Marked</div>
                  </div>

                  {/* Remaining */}
                  <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-2.5 text-center">
                    <div className="text-lg font-black text-sky-800 leading-none">{unansweredCount}</div>
                    <div className="text-[10px] font-bold text-sky-600 mt-1">Remaining</div>
                  </div>
                </div>

                {/* Submit Exam Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onSubmit}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Exam</span>
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* ================================================================
            3. BRAND FOOTER ("Every step you take builds a brighter tomorrow.")
        ================================================================ */}
        <footer className="w-full pt-3 pb-2 px-2 flex items-center justify-between gap-4 text-xs text-slate-500 shrink-0">
          <div className="relative">
            <span className="font-sans font-bold text-xs sm:text-sm text-slate-800 block">
              Every step you take
              <br />
              builds a brighter tomorrow.
            </span>
            <div className="w-14 sm:w-16 h-1 bg-[#6366f1] rounded-full mt-1 opacity-80" />
          </div>

          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#38bdf8]" />
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#facc15]" />
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#f43f5e]" />
            </div>
            <span className="text-[11px] sm:text-xs font-black text-slate-800">EdTechra BiZ</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">Education for a better you</span>
          </div>
        </footer>
      </div>

      {/* ================================================================
          MOBILE QUESTION NAVIGATOR DRAWER (Opened via Menu/Navigator Button)
      ================================================================ */}
      {mobileNavigatorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Question Navigator</h3>
              <button
                type="button"
                onClick={() => setMobileNavigatorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5x5 Grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, qIdx) => {
                const isCurrent = qIdx === currentIndex;
                const isAnswered =
                  answers[q.question.id] !== undefined &&
                  answers[q.question.id] !== null &&
                  answers[q.question.id] !== '';
                const isFlagged = bookmarkedIds.has(q.question.id);

                let btnStyle = 'bg-slate-50 text-slate-600 border border-slate-200';
                if (isCurrent) {
                  btnStyle = 'bg-[#6366f1] text-white font-black shadow-xs ring-2 ring-indigo-300';
                } else if (isFlagged) {
                  btnStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
                } else if (isAnswered) {
                  btnStyle = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold';
                }

                return (
                  <button
                    key={q.question.id || qIdx}
                    type="button"
                    onClick={() => {
                      onSelectIndex(qIdx);
                      setMobileNavigatorOpen(false);
                    }}
                    className={`w-full aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>

            {/* Progress stats */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="bg-emerald-50 rounded-xl p-2">
                <div className="text-sm font-black text-emerald-800">{answeredCount}</div>
                <div className="text-[10px] font-bold text-emerald-600">Answered</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-2">
                <div className="text-sm font-black text-amber-800">{markedCount}</div>
                <div className="text-[10px] font-bold text-amber-600">Marked</div>
              </div>
              <div className="bg-sky-50 rounded-xl p-2">
                <div className="text-sm font-black text-sky-800">{unansweredCount}</div>
                <div className="text-[10px] font-bold text-sky-600">Remaining</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileNavigatorOpen(false);
                onSubmit();
              }}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
