// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SIMPLE EXAM STUDENT VIEW
// Genuine Responsive Layout: 2-Column Desktop & Mobile-First Single-Column Flow
// Liquid / Glass Design with Multi-Type Question Renderer Support:
// (MCQ, True/False, Fill-in-the-Blank, Short Answer, Error Correction, Reading Comprehension)
// ============================================================================

import React, { useState, useMemo } from 'react';
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
  Edit3,
  Type,
  AlertCircle,
  Lightbulb
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

export type CanonicalQuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_in_blank'
  | 'short_answer'
  | 'error_correction'
  | 'reading_comprehension';

/**
 * Normalizes loose or backend question types into canonical interactive renderer types.
 */
export function normalizeQuestionType(type?: string): CanonicalQuestionType {
  const t = (type || '').toLowerCase().trim().replace(/[- ]/g, '_');
  if (t === 'true_false' || t === 'tf' || t === 'boolean') {
    return 'true_false';
  }
  if (
    t === 'fill_in_blank' ||
    t === 'fill_in_the_blank' ||
    t === 'fib' ||
    t === 'blank' ||
    t === 'sentence_completion' ||
    t === 'cloze_passage' ||
    t === 'cloze_activity'
  ) {
    return 'fill_in_blank';
  }
  if (
    t === 'short_answer' ||
    t === 'sa' ||
    t === 'paragraph' ||
    t === 'essay' ||
    t === 'open_ended' ||
    t === 'text'
  ) {
    return 'short_answer';
  }
  if (t === 'error_correction' || t === 'find_error' || t === 'error') {
    return 'error_correction';
  }
  if (
    t === 'reading_comprehension' ||
    t === 'comprehension' ||
    t === 'passage' ||
    t === 'reading_activity'
  ) {
    return 'reading_comprehension';
  }
  return 'mcq';
}

/**
 * Helper to strip redundant option letter prefixes (e.g. "A. is" -> "is", "B) are" -> "are")
 */
export function cleanOptionText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    const withDelim = cleaned.replace(
      /^(?:option\s+)?(?:[\(\[]?[A-Da-d][\)\]]?\s*[\.\:\-\–\—\)\]]|\(?[A-Da-d]\)\s*|(?:option\s+)[A-Da-d]\s*[:.-]?)\s*/i,
      ''
    ).trim();
    if (withDelim !== cleaned && withDelim.length > 0) {
      cleaned = withDelim;
      continue;
    }
    const withMultiSpaces = cleaned.replace(/^[A-Da-d]\s{2,}/i, '').trim();
    if (withMultiSpaces !== cleaned && withMultiSpaces.length > 0) {
      cleaned = withMultiSpaces;
      continue;
    }
    const withRedundantLetter = cleaned.replace(/^[A-Da-d]\s+(?=[A-Da-d][\.\:\-\)]|[A-Da-d]\s+)/i, '').trim();
    if (withRedundantLetter !== cleaned && withRedundantLetter.length > 0) {
      cleaned = withRedundantLetter;
      continue;
    }
    break;
  }
  return cleaned;
}

export interface ParsedQuestionContent {
  instructionText: string | null;
  promptText: string;
  contextSentence: string | null;
  targetWords: string[];
}

/**
 * Intelligently separates prompt instructions, main question text, and context sentences
 * WITHOUT aggressively surrounding standard quoted words in purple tags.
 */
export function parseQuestionPrompt(rawText: string): ParsedQuestionContent {
  if (!rawText || typeof rawText !== 'string') {
    return { instructionText: null, promptText: '', contextSentence: null, targetWords: [] };
  }

  let text = rawText.trim();
  let instructionText: string | null = null;
  let contextSentence: string | null = null;
  const targetWords: string[] = [];

  // 1. Detect dynamic instruction prefix
  const instructionRegex = /^(choose the (?:correct|best)[^:\n\r]*:|complete the sentence[^:\n\r]*:|identify the (?:error|correct|underlined)[^:\n\r]*:|read the (?:passage|text)[^:\n\r]*:|fill in the blank[s]?[^:\n\r]*:|select the best option[^:\n\r]*:|which of the following[^:\n\r]*:)/i;
  const instMatch = text.match(instructionRegex);
  if (instMatch) {
    instructionText = instMatch[1].trim();
    text = text.substring(instMatch[0].length).trim();
  }

  // 2. Pattern A: Colon separator after "in this sentence", "in the sentence", etc.
  const colonMatch = text.match(
    /^(.*?(?:in (?:this|the|following) sentence|in the sentence below|sentence|context|passage|example))\s*[:]\s*(.+)$/i
  );
  let promptText = text;

  if (colonMatch) {
    let p = colonMatch[1].trim();
    let s = colonMatch[2].trim();
    s = s.replace(/^[“"']\s*/, '').replace(/\s*[”"']$/, '').trim();
    if (!/[?.!]$/.test(p)) {
      p += '?';
    }
    promptText = p;
    contextSentence = s;
  } else {
    // Check newline separation
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

  return { instructionText, promptText, contextSentence, targetWords };
}

// 4-Color Liquid Option Themes (A Pink, B Blue, C Green, D Yellow)
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

  // Authoritative format time
  const formattedTime = formatTime(timeRemainingSeconds);
  const isCritical = timeRemainingSeconds <= 60;
  const isWarning = !isCritical && timeRemainingSeconds <= 300;

  // Parse question text into prompt, instruction, and context
  const parsedQuestion = useMemo(() => {
    return currentQ
      ? parseQuestionPrompt(currentQ.question.question)
      : { instructionText: null, promptText: 'Question not found', contextSentence: null, targetWords: [] };
  }, [currentQ]);

  // Determine canonical interactive question type with robust detection
  const normalizedType = useMemo<CanonicalQuestionType>(() => {
    if (!currentQ?.question) return 'mcq';
    const q = currentQ.question;
    const t = (q.type || '').toLowerCase().trim().replace(/[- ]/g, '_');
    if (t === 'true_false' || t === 'tf' || t === 'boolean' || t === 'bool' || t === 'truefalse') {
      return 'true_false';
    }
    // Check if question has only True & False options
    const opts = (q as any).options;
    if (Array.isArray(opts) && opts.length === 2) {
      const t0 = String(opts[0]?.text || opts[0]).trim().toLowerCase();
      const t1 = String(opts[1]?.text || opts[1]).trim().toLowerCase();
      if ((t0 === 'true' && t1 === 'false') || (t0 === 'false' && t1 === 'true')) {
        return 'true_false';
      }
    }
    // Check reading passage
    if (currentQ.parentPassage || (q as any).passage) {
      return 'reading_comprehension';
    }
    return normalizeQuestionType(q.type);
  }, [currentQ]);

  // Extract raw options if MCQ
  const rawOptions = (currentQ?.question as any)?.options || [];

  // Question Type Label & Badge Meta
  const typeMeta = useMemo(() => {
    switch (normalizedType) {
      case 'true_false':
        return { label: 'True / False', icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'fill_in_blank':
        return { label: 'Fill in the Blank', icon: Edit3, color: 'text-sky-700 bg-sky-50 border-sky-200' };
      case 'short_answer':
        return { label: 'Short Answer', icon: Type, color: 'text-violet-700 bg-violet-50 border-violet-200' };
      case 'error_correction':
        return { label: 'Error Correction', icon: AlertCircle, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'reading_comprehension':
        return { label: 'Reading Comprehension', icon: BookOpen, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
      default:
        return { label: 'Multiple Choice Question', icon: BookOpen, color: 'text-pink-700 bg-pink-50 border-pink-200' };
    }
  }, [normalizedType]);

  return (
    <div
      data-simple-exam="true"
      className="min-h-screen bg-gradient-to-b from-[#eef6ff] via-[#f7faff] to-[#eaf3fe] flex flex-col font-sans select-none [color-scheme:light] p-2.5 sm:p-5 md:p-6 lg:p-8 w-full overflow-x-hidden"
    >
      <div className="w-full max-w-[1360px] mx-auto flex flex-col gap-3.5 sm:gap-5 flex-1">
        {/* ================================================================
            1. TOP HEADER (Synchronized Timer)
        ================================================================ */}
        {isMobilePreview ? (
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
          <header className="w-full flex items-center justify-between gap-3 bg-transparent shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileNavigatorOpen(true)}
                className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95"
                title="Open Question Navigator"
              >
                <Menu className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </button>

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

            <div className="hidden sm:flex bg-white/90 backdrop-blur-xs border border-blue-100 rounded-2xl px-4 py-2 items-center gap-2.5 shadow-2xs min-w-0">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate flex items-center gap-1.5">
                  <span>{exam.exam.title || 'Simple Exam'}</span>
                  {syncState === 'saving' && (
                    <span className="text-[10px] font-bold text-sky-600 animate-pulse">Saving...</span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-500 block truncate">
                  {exam.exam.subject || 'English'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 flex items-center gap-2 border shadow-2xs transition-all ${
                  isCritical
                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                    : isWarning
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-white/90 backdrop-blur-xs border-blue-100 text-slate-900'
                }`}
              >
                <Clock
                  className={`w-4 h-4 shrink-0 ${
                    isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-blue-600'
                  }`}
                />
                <span className="text-sm sm:text-base font-black tracking-tight font-mono">
                  {formattedTime}
                </span>
              </div>
            </div>
          </header>
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
              LEFT / MAIN COLUMN: Progress + Question + Interactive Area + Actions
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
              {/* Top Tag Row: Dynamic Type Badge + Instruction Highlight */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className={`border ${typeMeta.color} px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 sm:gap-2 shadow-2xs`}>
                  <typeMeta.icon className="w-3.5 h-3.5" />
                  <span>{typeMeta.label}</span>
                </div>

                {parsedQuestion.instructionText ? (
                  <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200/80 text-indigo-700 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-extrabold shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                    <span>{parsedQuestion.instructionText}</span>
                  </div>
                ) : (
                  !isMobilePreview && (
                    <div className="hidden sm:flex bg-[#f0f4ff] border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold items-center gap-1.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Answer carefully</span>
                    </div>
                  )
                )}
              </div>

              {/* Main Question Text */}
              <div className="pt-1">
                {normalizedType === 'fill_in_blank' ? (
                  /* Fill in the Blank: EXACTLY ONE sentence with embedded interactive Liquid Input */
                  <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-slate-50/80 border border-slate-200 text-lg sm:text-xl md:text-2xl font-black text-slate-900 leading-relaxed shadow-2xs">
                    {renderFormattedPrompt(
                      (parsedQuestion.promptText && (parsedQuestion.promptText.includes('[blank]') || parsedQuestion.promptText.includes('___')))
                        ? parsedQuestion.promptText
                        : ((currentQ?.question?.question && (currentQ.question.question.includes('[blank]') || currentQ.question.question.includes('___')))
                          ? currentQ.question.question
                          : (parsedQuestion.promptText || currentQ?.question?.question || '')),
                      {
                        isFillBlank: true,
                        inlineInputValue: currentAnswer || '',
                        onInlineInputChange: onAnswerChange,
                        inputPlaceholder: 'type answer...'
                      }
                    )}
                  </div>
                ) : (
                  <h2 className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 leading-snug sm:leading-tight tracking-tight break-words">
                    {renderFormattedPrompt(parsedQuestion.promptText, { isMCQ: normalizedType === 'mcq' })}
                  </h2>
                )}
              </div>

              {/* Referenced Context Sentence Card (only if non-fill-in-blank AND distinct context sentence exists) */}
              {normalizedType !== 'fill_in_blank' && parsedQuestion.contextSentence && (
                <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs flex items-center gap-3 w-full">
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 select-none">
                    Context
                  </span>
                  <div className="text-base sm:text-lg font-semibold text-slate-800 leading-relaxed break-words flex-1 italic">
                    &ldquo;{parsedQuestion.contextSentence}&rdquo;
                  </div>
                </div>
              )}

              {/* ==========================================================
                  DYNAMIC INTERACTIVE QUESTION RENDERER:
                  Maps canonical type to the exact interactive component!
              ========================================================== */}
              <div className="w-full pt-1">
                {/* 1. MULTIPLE CHOICE QUESTION (MCQ) - LIQUID BUTTONS */}
                {normalizedType === 'mcq' && (
                  rawOptions && rawOptions.length > 0 ? (
                    <div
                      className={
                        isMobilePreview
                          ? 'grid grid-cols-1 gap-3 sm:gap-3.5 w-full'
                          : 'grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full'
                      }
                    >
                      {rawOptions.map((opt: any, optIdx: number) => {
                        const theme = OPTION_THEMES[optIdx % OPTION_THEMES.length];
                        const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;
                        const cleanedText = cleanOptionText(opt.text);

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
                            className={`w-full min-h-[58px] sm:min-h-[66px] md:min-h-[74px] p-3.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-[24px] border-2 text-left flex items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-4 relative overflow-hidden group ${
                              isSelected
                                ? `${theme.cardSelectedBg} ${theme.cardSelectedBorder} ${theme.cardSelectedRing} shadow-md -translate-y-0.5`
                                : `${theme.cardBg} ${theme.cardBorder} ${theme.cardHover} shadow-2xs hover:-translate-y-0.5`
                            } ${isCorrect ? 'ring-4 ring-emerald-500/40 border-emerald-500' : ''}`}
                          >
                            {/* Glossy top reflection */}
                            <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />

                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 relative z-10">
                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl ${theme.badgeBg} ${theme.badgeText} flex items-center justify-center font-black text-lg sm:text-xl shadow-xs shrink-0 select-none group-hover:scale-105 transition-transform`}
                              >
                                {theme.letter}
                              </div>
                              <span className="text-base sm:text-lg md:text-xl font-bold sm:font-black text-slate-900 break-words flex-1 leading-snug">
                                {cleanedText}
                              </span>
                            </div>

                            <div
                              className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform relative z-10 ${
                                isSelected
                                  ? `${theme.badgeBg} text-white shadow-xs scale-105`
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
                  ) : (
                    /* Defensive fallback text input if an MCQ question was stored with 0 options */
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Type your answer below for this question:</span>
                      </div>
                      <input
                        type="text"
                        value={currentAnswer || ''}
                        onChange={(e) => onAnswerChange(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-base font-bold text-slate-900 outline-hidden transition-all bg-slate-50/60 focus:bg-white"
                      />
                    </div>
                  )
                )}

                {/* 2. TRUE / FALSE RENDERER - LIQUID BUTTONS */}
                {normalizedType === 'true_false' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full">
                    {/* TRUE Liquid Button */}
                    {(() => {
                      const isTrueSelected =
                        String(currentAnswer).toLowerCase() === 'true' ||
                        currentAnswer === true ||
                        currentAnswer === 't' ||
                        currentAnswer === 'T';
                      return (
                        <button
                          type="button"
                          onClick={() => onAnswerChange('true')}
                          className={`w-full min-h-[66px] sm:min-h-[76px] p-4 sm:p-5 rounded-2xl sm:rounded-[24px] border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-emerald-400 relative overflow-hidden group ${
                            isTrueSelected
                              ? 'bg-gradient-to-r from-emerald-100 via-teal-100 to-emerald-100/90 border-emerald-500 ring-4 ring-emerald-500/25 shadow-md -translate-y-0.5'
                              : 'bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white border-emerald-200/80 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 shadow-2xs hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />
                          <div className="flex items-center gap-3.5 relative z-10">
                            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs shrink-0 select-none group-hover:scale-105 transition-transform ${isTrueSelected ? 'bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                              <Check className="w-6 h-6 stroke-[3]" />
                            </div>
                            <div>
                              <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">TRUE</div>
                              <span className="text-xs font-bold text-emerald-800/80">Statement is correct</span>
                            </div>
                          </div>
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform relative z-10 ${isTrueSelected ? 'bg-emerald-600 text-white shadow-xs scale-105' : 'bg-emerald-100/80 text-emerald-600'}`}>
                            <Check className="w-5 h-5 stroke-[3]" />
                          </div>
                        </button>
                      );
                    })()}

                    {/* FALSE Liquid Button */}
                    {(() => {
                      const isFalseSelected =
                        String(currentAnswer).toLowerCase() === 'false' ||
                        currentAnswer === false ||
                        currentAnswer === 'f' ||
                        currentAnswer === 'F';
                      return (
                        <button
                          type="button"
                          onClick={() => onAnswerChange('false')}
                          className={`w-full min-h-[66px] sm:min-h-[76px] p-4 sm:p-5 rounded-2xl sm:rounded-[24px] border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-rose-400 relative overflow-hidden group ${
                            isFalseSelected
                              ? 'bg-gradient-to-r from-rose-100 via-pink-100 to-rose-100/90 border-rose-500 ring-4 ring-rose-500/25 shadow-md -translate-y-0.5'
                              : 'bg-gradient-to-r from-rose-50/70 via-pink-50/50 to-white border-rose-200/80 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10 shadow-2xs hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />
                          <div className="flex items-center gap-3.5 relative z-10">
                            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs shrink-0 select-none group-hover:scale-105 transition-transform ${isFalseSelected ? 'bg-rose-600 text-white shadow-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                              <X className="w-6 h-6 stroke-[3]" />
                            </div>
                            <div>
                              <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">FALSE</div>
                              <span className="text-xs font-bold text-rose-800/80">Statement is incorrect</span>
                            </div>
                          </div>
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform relative z-10 ${isFalseSelected ? 'bg-rose-600 text-white shadow-xs scale-105' : 'bg-rose-100/80 text-rose-600'}`}>
                            <X className="w-4 h-4 stroke-[3]" />
                          </div>
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* 3. FILL IN THE BLANK HELPER STRIP (Single sentence is embedded above!) */}
                {normalizedType === 'fill_in_blank' && (
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-2 pt-2">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Answer embedded above • Instant auto-save</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-600 font-bold">
                        {(currentAnswer || '').length} characters
                      </span>
                      {currentAnswer && (
                        <button
                          type="button"
                          onClick={() => onAnswerChange('')}
                          className="text-slate-400 hover:text-rose-600 font-semibold underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. SHORT ANSWER / ESSAY RENDERER */}
                {normalizedType === 'short_answer' && (
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between text-xs font-black text-indigo-900 uppercase tracking-wider px-1">
                      <div className="flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-indigo-600" />
                        <span>Type your response below:</span>
                      </div>
                      <span className="text-slate-400 font-medium lowercase">auto-saved to cloud</span>
                    </div>

                    <textarea
                      rows={5}
                      value={currentAnswer || ''}
                      onChange={(e) => onAnswerChange(e.target.value)}
                      placeholder="Type your explanation or answer here..."
                      className="w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-slate-200 bg-white/95 focus:border-[#026fc3] focus:ring-4 focus:ring-sky-200/70 text-sm sm:text-base font-semibold text-slate-900 outline-hidden transition-all duration-200 shadow-inner leading-relaxed min-h-[140px] sm:min-h-[170px]"
                    />

                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                      <span>Write clearly and structured.</span>
                      <span className="font-mono text-slate-700 font-bold">
                        {(currentAnswer || '').trim().split(/\s+/).filter(Boolean).length} words • {(currentAnswer || '').length} chars
                      </span>
                    </div>
                  </div>
                )}

                {/* 5. ERROR CORRECTION RENDERER */}
                {normalizedType === 'error_correction' && (
                  <div className="space-y-4 w-full">
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">Identify & Correct</h4>
                        <p className="text-xs text-amber-700 font-medium">
                          Find the grammatical or spelling error and type the corrected word or phrase below.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 block px-1">Corrected Form:</label>
                      <input
                        type="text"
                        value={currentAnswer || ''}
                        onChange={(e) => onAnswerChange(e.target.value)}
                        placeholder="Type corrected word or sentence..."
                        className="w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-slate-200 bg-slate-50/60 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-base font-bold text-slate-900 outline-hidden transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* 6. READING COMPREHENSION RENDERER */}
                {normalizedType === 'reading_comprehension' && (() => {
                  const passageText =
                    currentQ?.parentPassage ||
                    (currentQ?.question as any)?.passage ||
                    (currentQ?.question as any)?.content ||
                    '';
                  const passageTitle = currentQ?.parentPassageTitle || 'Comprehension Passage';

                  return (
                    <div className="space-y-5 w-full">
                      {/* Distinct Styled Reading Passage Container */}
                      {passageText && (
                        <div className="bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-amber-50/50 p-5 sm:p-7 rounded-3xl border-2 border-amber-200/80 shadow-xs space-y-3">
                          <div className="flex items-center gap-2 border-b border-amber-200/70 pb-2.5">
                            <BookOpen className="w-4.5 h-4.5 text-amber-700 shrink-0" />
                            <span className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wider">
                              Reading Passage: {passageTitle}
                            </span>
                          </div>
                          <div className="max-h-80 overflow-y-auto pr-3 text-sm sm:text-base font-medium text-slate-850 leading-[1.8] font-serif scrollbar-thin whitespace-pre-wrap selection:bg-amber-100">
                            {passageText}
                          </div>
                        </div>
                      )}

                      {/* Associated Question Options or Text Response */}
                      {rawOptions && rawOptions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                          {rawOptions.map((opt: any, optIdx: number) => {
                            const theme = OPTION_THEMES[optIdx % OPTION_THEMES.length];
                            const isSelected = currentAnswer === opt.id || currentAnswer === opt.text;
                            const cleanedText = cleanOptionText(opt.text);
                            return (
                              <button
                                key={opt.id || optIdx}
                                type="button"
                                onClick={() => onAnswerChange(opt.id || opt.text)}
                                className={`w-full min-h-[58px] p-3.5 sm:p-4 rounded-2xl sm:rounded-[24px] border-2 text-left flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 active:scale-[0.98] relative overflow-hidden group ${
                                  isSelected
                                    ? `${theme.cardSelectedBg} ${theme.cardSelectedBorder} ${theme.cardSelectedRing} shadow-md -translate-y-0.5`
                                    : `${theme.cardBg} ${theme.cardBorder} ${theme.cardHover} shadow-2xs hover:-translate-y-0.5`
                                }`}
                              >
                                <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-2xl" />
                                <div className="flex items-center gap-3 relative z-10 min-w-0 flex-1">
                                  <div className={`w-10 h-10 rounded-xl sm:rounded-2xl ${theme.badgeBg} ${theme.badgeText} flex items-center justify-center font-black text-lg shadow-xs shrink-0 select-none`}>
                                    {theme.letter}
                                  </div>
                                  <span className="text-base font-bold text-slate-900 break-words flex-1 leading-snug">{cleanedText}</span>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform relative z-10 ${isSelected ? theme.badgeBg + ' text-white shadow-xs scale-105' : theme.chevronBg + ' ' + theme.chevronText}`}>
                                  {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <ChevronRight className="w-4 h-4" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-700 block px-1">Your Written Answer:</label>
                          <textarea
                            rows={4}
                            value={currentAnswer || ''}
                            onChange={(e) => onAnswerChange(e.target.value)}
                            placeholder="Type your response based on the passage above..."
                            className="w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-slate-200 bg-white/95 focus:border-[#026fc3] focus:ring-4 focus:ring-sky-200/70 text-sm sm:text-base font-semibold text-slate-900 outline-hidden transition-all shadow-inner leading-relaxed min-h-[120px]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ==========================================================
                  NAVIGATION CONTROLS:
                  - Desktop: Previous, Flag for Review, Clear, Next Question
                  - Mobile: 2 rows ([Flag] [Clear], then [Previous] [Next])
              ========================================================== */}
              {isMobilePreview ? (
                <div className="flex flex-col gap-2.5 pt-2 w-full border-t border-slate-100">
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
                      <span>{isBookmarked ? 'Flagged for Review' : 'Flag for Review'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClearAnswer}
                      disabled={!hasAnsweredCurrent}
                      className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Clear Answer</span>
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
              )}
            </main>
          </div>

          {/* ==============================================================
              RIGHT COLUMN: DESKTOP SIDEBAR
              (Navigator, Mascot Card, Synchronized Timer 2, Status, Submit)
          ============================================================== */}
          {!isMobilePreview && (
            <aside className="hidden lg:flex lg:col-span-4 xl:col-span-4 2xl:col-span-3 flex-col gap-4 sticky top-6">
              {/* Card 1: Question Navigator Grid (5 x 5) */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 tracking-wide">Question Navigator</h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-100">
                    {answeredCount} / {totalCount}
                  </span>
                </div>

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

                {/* Navigator Legend Matching Reference: Mint/Purple/Gray */}
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

              {/* Card 2: 3D Mascot Character Encouragement Card */}
              <div className="bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/90 rounded-3xl border border-indigo-100/90 p-4 shadow-sm space-y-3 overflow-hidden relative">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xs border border-indigo-200/70 shrink-0 bg-indigo-100">
                    <img
                      src="/images/exam/exam-character-student.jpg"
                      alt="Student Encouragement Mascot"
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>Focus & Flow</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      You've got this!
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      Keep steady pacing and read each question carefully.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/80 border border-indigo-100/60 text-[11px] font-semibold text-slate-700 leading-relaxed flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>Small steps in grammar lead to big leaps in speaking!</span>
                </div>
              </div>

              {/* Card 3: Time Remaining Display */}
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
                      Live synchronized timer
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Card 4: Exam Progress Stats (Answered, Marked, Remaining) */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Exam Progress</div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 text-center">
                    <div className="text-lg font-black text-emerald-800 leading-none">{answeredCount}</div>
                    <div className="text-[10px] font-bold text-emerald-600 mt-1">Answered</div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5 text-center">
                    <div className="text-lg font-black text-amber-800 leading-none">{markedCount}</div>
                    <div className="text-[10px] font-bold text-amber-600 mt-1">Marked</div>
                  </div>

                  <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-2.5 text-center">
                    <div className="text-lg font-black text-sky-800 leading-none">{unansweredCount}</div>
                    <div className="text-[10px] font-bold text-sky-600 mt-1">Remaining</div>
                  </div>
                </div>

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
            3. BRAND FOOTER
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
          MOBILE QUESTION NAVIGATOR DRAWER (Opened via Menu Button)
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
                    className={`w-full aspect-square rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer active:scale-90 ${btnStyle}`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>

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
        </div>
      )}
    </div>
  );
};
