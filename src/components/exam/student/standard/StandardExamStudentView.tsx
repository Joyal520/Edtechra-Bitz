// ============================================================================
// EDTECHRA STANDARD EXAM 2.0: STUDENT VIEWPORT
// Mobile-First, Controlled 100-Mark Assessment System (40 Questions across 7 Sections)
// Progressive Difficulty:
// A. MCQ -> B. Matching -> C. Correct/Wrong -> D. Cloze -> E. Find Mistake ->
// F. Controlled Answer -> G. Reorder Sentence
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  RotateCcw,
  Grid,
  X,
  AlertCircle
} from 'lucide-react';
import { CanonicalExamV1 } from '../../shared/ExamSchema';
import { FlattenedExamQuestion } from '../../shared/scoringUtilities';
import { formatTime, SyncState } from '../ExamHeader';
import { ChoiceRenderer } from './ChoiceRenderer';
import { MatchRenderer } from './MatchRenderer';
import { BinaryChoiceRenderer } from './BinaryChoiceRenderer';
import { ClozeDropdownRenderer } from './ClozeDropdownRenderer';
import { ErrorTokenRenderer } from './ErrorTokenRenderer';
import { ControlledInputRenderer } from './ControlledInputRenderer';
import { SentenceBuilderRenderer } from './SentenceBuilderRenderer';

export interface StandardExamStudentViewProps {
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

export type StandardSectionType =
  | 'mcq'
  | 'matching'
  | 'correct_wrong'
  | 'cloze'
  | 'find_mistake'
  | 'controlled_answer'
  | 'reorder';

/**
 * Resolves standard section type from section ID, title, or question metadata.
 */
export function resolveStandardType(
  item: FlattenedExamQuestion | undefined
): StandardSectionType {
  if (!item) return 'mcq';
  const q = item.question as any;
  const secId = (item.sectionId || '').toLowerCase();
  const secTitle = (item.sectionTitle || '').toLowerCase();
  const qType = (q.type || '').toLowerCase();

  // Find Mistake
  if (
    q.incorrectToken !== undefined ||
    q.tokenIndex !== undefined ||
    secId.includes('mistake') ||
    secTitle.includes('mistake') ||
    secTitle.includes('section e') ||
    qType === 'find_mistake' ||
    qType === 'error_token'
  ) {
    return 'find_mistake';
  }

  // Reorder
  if (
    Array.isArray(q.correctOrder) ||
    Array.isArray(q.words) ||
    secId.includes('reorder') ||
    secTitle.includes('reorder') ||
    secTitle.includes('section g') ||
    qType === 'reorder' ||
    qType === 'sentence_builder'
  ) {
    return 'reorder';
  }

  // Cloze Passage
  if (
    secId.includes('cloze') ||
    secTitle.includes('cloze') ||
    secTitle.includes('section d') ||
    qType === 'cloze' ||
    qType === 'cloze_passage' ||
    item.parentPassage !== undefined
  ) {
    return 'cloze';
  }

  // Matching
  if (
    q.left !== undefined ||
    Array.isArray(q.pairs) ||
    secId.includes('matching') ||
    secTitle.includes('matching') ||
    secTitle.includes('section b') ||
    qType === 'matching'
  ) {
    return 'matching';
  }

  // Correct or Wrong
  if (
    secId.includes('correct_wrong') ||
    secTitle.includes('correct or wrong') ||
    secTitle.includes('section c') ||
    qType === 'correct_wrong' ||
    qType === 'true_false' ||
    qType === 'binary_choice'
  ) {
    return 'correct_wrong';
  }

  // Controlled Type Answer
  if (
    Array.isArray(q.acceptedAnswers) ||
    Array.isArray(q.accepted_answers) ||
    secId.includes('controlled') ||
    secTitle.includes('type the answer') ||
    secTitle.includes('section f') ||
    qType === 'controlled_answer' ||
    qType === 'fill_in_blank'
  ) {
    return 'controlled_answer';
  }

  // Default to MCQ
  return 'mcq';
}

export const StandardExamStudentView: React.FC<StandardExamStudentViewProps> = ({
  exam,
  questions,
  currentIndex,
  currentAnswer,
  answers,
  bookmarkedIds,
  timeRemainingSeconds,
  syncState = 'synced',
  answeredCount,
  markedCount,
  onAnswerChange,
  onClearAnswer,
  onPrevious,
  onNext,
  onSelectIndex,
  onToggleBookmark,
  onSubmit,
  onClose,
  isMobilePreview = false
}) => {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const totalQuestions = questions.length;
  const currentItem = questions[currentIndex] || questions[0];
  const q = currentItem?.question as any;

  const currentType = useMemo(() => resolveStandardType(currentItem), [currentItem]);
  const isBookmarked = currentItem ? bookmarkedIds.has(currentItem.question.id) : false;

  // Progress percentage
  const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

  // Active answer for current question
  const isCurrentAnswered =
    currentAnswer !== undefined &&
    currentAnswer !== null &&
    (typeof currentAnswer === 'string'
      ? currentAnswer.trim().length > 0
      : Array.isArray(currentAnswer)
      ? currentAnswer.length > 0
      : Object.keys(currentAnswer).length > 0);

  // Section badge meta
  const sectionMeta = useMemo(() => {
    switch (currentType) {
      case 'mcq':
        return {
          label: 'SECTION A • MCQ',
          marksText: '2 Marks',
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700'
        };
      case 'matching':
        return {
          label: 'SECTION B • MATCHING',
          marksText: '2 Marks',
          bg: 'bg-violet-50 border-violet-200 text-violet-700'
        };
      case 'correct_wrong':
        return {
          label: 'SECTION C • CORRECT OR WRONG',
          marksText: '2 Marks',
          bg: 'bg-sky-50 border-sky-200 text-sky-700'
        };
      case 'cloze':
        return {
          label: 'SECTION D • CLOZE PASSAGE',
          marksText: '2 Marks',
          bg: 'bg-teal-50 border-teal-200 text-teal-700'
        };
      case 'find_mistake':
        return {
          label: 'SECTION E • FIND THE MISTAKE',
          marksText: '3 Marks',
          bg: 'bg-rose-50 border-rose-200 text-rose-700'
        };
      case 'controlled_answer':
        return {
          label: 'SECTION F • TYPE THE ANSWER',
          marksText: '3 Marks',
          bg: 'bg-amber-50 border-amber-200 text-amber-700'
        };
      case 'reorder':
        return {
          label: 'SECTION G • REORDER SENTENCE',
          marksText: '4 Marks',
          bg: 'bg-purple-50 border-purple-200 text-purple-700'
        };
      default:
        return {
          label: 'EXAM SECTION',
          marksText: '2 Marks',
          bg: 'bg-slate-100 border-slate-200 text-slate-700'
        };
    }
  }, [currentType]);

  // Render the specific controlled interaction renderer
  const renderInteraction = () => {
    if (!currentItem || !q) return null;

    switch (currentType) {
      case 'mcq': {
        const rawOptions = q.options || [];
        return (
          <ChoiceRenderer
            options={rawOptions}
            selectedAnswer={currentAnswer}
            onSelectAnswer={(ans) => onAnswerChange(ans)}
          />
        );
      }

      case 'matching': {
        // Pairs from question or derive from matching items
        const pairs = q.pairs || (q.left && q.right ? [{ left: q.left, right: q.right }] : []);
        return (
          <MatchRenderer
            pairs={pairs}
            currentAnswer={currentAnswer}
            onAnswerChange={(ans) => onAnswerChange(ans)}
          />
        );
      }

      case 'correct_wrong': {
        return (
          <BinaryChoiceRenderer
            statement={q.statement || q.question}
            selectedAnswer={currentAnswer}
            onSelectAnswer={(ans) => onAnswerChange(ans)}
          />
        );
      }

      case 'cloze': {
        const passage = q.passage || currentItem.parentPassage || '';
        const options = q.options || [];
        const blanks = q.blanks || [];
        const activeBlankId = q.blankId || (q.blankIndex ? `blank_${q.blankIndex}` : undefined);

        return (
          <ClozeDropdownRenderer
            passage={passage}
            options={options}
            blanks={blanks}
            activeBlankId={activeBlankId}
            currentAnswer={currentAnswer}
            onAnswerChange={(ans) => onAnswerChange(ans)}
          />
        );
      }

      case 'find_mistake': {
        const sentence = q.sentence || q.question || '';
        const tokens = q.tokens || [];

        return (
          <ErrorTokenRenderer
            sentence={sentence}
            tokens={tokens}
            selectedAnswer={currentAnswer}
            onSelectToken={(tok, idx) => {
              // Store token and index for deterministic grading
              onAnswerChange({
                incorrectToken: tok,
                tokenIndex: idx
              });
            }}
          />
        );
      }

      case 'controlled_answer': {
        const promptText = q.question || q.prompt || '';

        return (
          <ControlledInputRenderer
            questionPrompt={promptText}
            currentAnswer={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onAnswerChange={(ans) => onAnswerChange(ans)}
          />
        );
      }

      case 'reorder': {
        // Scrambled words list
        let words: string[] = [];
        if (Array.isArray(q.words) && q.words.length > 0) {
          words = q.words;
        } else if (Array.isArray(q.correctOrder)) {
          // Shuffle deterministically
          words = [...q.correctOrder].sort((a, b) => (a.charCodeAt(0) % 3) - (b.charCodeAt(0) % 3));
        }

        return (
          <SentenceBuilderRenderer
            words={words}
            currentAnswer={currentAnswer}
            onAnswerChange={(ans) => onAnswerChange(ans)}
          />
        );
      }

      default:
        return (
          <div className="p-4 bg-slate-50 border rounded-2xl text-xs text-slate-600">
            Select or enter your answer.
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased ${isMobilePreview ? 'max-w-md mx-auto shadow-2xl border-x border-slate-300' : ''}`}>
      {/* ============================================================
          TOP AUTHORITATIVE HEADER (Sticky, Mobile Optimized)
      ============================================================ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Left: Back / Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 -ml-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Return"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {exam.exam.title || 'Standard Examination'}
              </h1>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-slate-500">
                <span>Question {currentIndex + 1} of {totalQuestions}</span>
                <span>•</span>
                <span className="text-indigo-600 font-black">100 Marks</span>
                {syncState === 'syncing' && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 animate-pulse font-medium">Syncing...</span>
                  </>
                )}
                {syncState === 'error' && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Timer & Navigator Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Timer countdown */}
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-black shadow-2xs ${
                timeRemainingSeconds < 300
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(timeRemainingSeconds)}</span>
            </div>

            {/* Quick Question Sheet Trigger */}
            <button
              type="button"
              onClick={() => setIsBottomSheetOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-black cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Questions</span>
              <span className="text-[10px] bg-indigo-200/80 px-1.5 py-0.2 rounded-md">
                {answeredCount}/{totalQuestions}
              </span>
            </button>
          </div>
        </div>

        {/* Thin Progressive Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div
            className="bg-indigo-600 h-1 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* ============================================================
          MAIN QUESTION CONTAINER (Mobile-First Single-Column Flow)
      ============================================================ */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-3.5 sm:p-6 pb-28 sm:pb-32 flex flex-col justify-start">
        {currentItem ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Question Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-7 space-y-4">
              {/* Section Tag & Marks Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] sm:text-xs font-black px-3 py-1 rounded-full border ${sectionMeta.bg}`}>
                    {sectionMeta.label}
                  </span>
                </div>

                <div className="text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {sectionMeta.marksText}
                </div>
              </div>

              {/* Question Text / Prompt (Hidden if Find Mistake or Controlled which have dedicated cards) */}
              {currentType !== 'find_mistake' && currentType !== 'controlled_answer' && currentType !== 'correct_wrong' && (
                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {q.question || `Question ${currentIndex + 1}`}
                  </div>
                </div>
              )}

              {/* Optional stimulus image if pedagogical */}
              {q.imageUrl && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden max-h-[300px] flex items-center justify-center">
                  <img
                    src={q.imageUrl}
                    alt="Question illustration"
                    className="max-h-[300px] w-auto object-contain mx-auto"
                  />
                </div>
              )}

              {/* Controlled Interaction Area */}
              <div className="pt-1">
                {renderInteraction()}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3 my-auto">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <div className="text-sm font-black text-slate-800">
              Question could not be loaded
            </div>
          </div>
        )}
      </main>

      {/* ============================================================
          STICKY BOTTOM ACTION BAR (Thumb Friendly on Mobile)
      ============================================================ */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-3 flex items-center justify-between gap-2.5">
          {/* Flag / Bookmark Button */}
          <button
            type="button"
            onClick={onToggleBookmark}
            disabled={!currentItem}
            className={`px-3 sm:px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
              isBookmarked
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-amber-50/60 hover:text-amber-800 border-slate-200'
            }`}
            title="Flag question for review"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">{isBookmarked ? 'Flagged' : 'Flag'}</span>
          </button>

          {/* Clear Answer Button */}
          {isCurrentAnswered && (
            <button
              type="button"
              onClick={onClearAnswer}
              className="px-2.5 sm:px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear answer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Navigation Controls: Prev / Next / Submit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={onPrevious}
              className="px-3.5 sm:px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={onNext}
                className="px-5 sm:px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                className="px-5 sm:px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Exam</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* ============================================================
          MOBILE BOTTOM SHEET: QUESTION NAVIGATOR (01-40 Grid)
      ============================================================ */}
      {isBottomSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          {/* Overlay dismissal */}
          <div className="flex-1" onClick={() => setIsBottomSheetOpen(false)} />

          {/* Sheet Body */}
          <div className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-5 sm:p-6 max-h-[80vh] flex flex-col animate-slideUp">
            {/* Sheet Handle & Header */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-slate-900">
                  Examination Questions
                </h3>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span>{answeredCount} Answered</span>
                  <span>•</span>
                  <span>{markedCount} Flagged</span>
                  <span>•</span>
                  <span>{totalQuestions - answeredCount} Remaining</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Numbers Grid (1 to 40) */}
            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {questions.map((item, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered =
                    answers[item.question.id] !== undefined &&
                    answers[item.question.id] !== null &&
                    answers[item.question.id] !== '';
                  const flagged = bookmarkedIds.has(item.question.id);

                  return (
                    <button
                      key={item.question.id || idx}
                      type="button"
                      onClick={() => {
                        onSelectIndex(idx);
                        setIsBottomSheetOpen(false);
                      }}
                      className={`h-11 sm:h-12 rounded-2xl border-2 font-black text-xs sm:text-sm flex flex-col items-center justify-center relative transition-all cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 font-black scale-105'
                          : isAnswered
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{String(idx + 1).padStart(2, '0')}</span>

                      {/* Small Status indicator */}
                      <span className="text-[9px] -mt-0.5">
                        {flagged ? '⚑' : isAnswered ? '✓' : '—'}
                      </span>

                      {/* Bookmark corner badge */}
                      {flagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Close Navigator
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBottomSheetOpen(false);
                  onSubmit();
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer shadow-xs"
              >
                Review & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
