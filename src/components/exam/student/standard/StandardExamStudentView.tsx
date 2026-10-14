// ============================================================================
// EDTECHRA STANDARD EXAM 2.0: STUDENT VIEWPORT
// Mobile-First, Controlled 100-Mark Assessment System (40 Questions across 7 Sections)
// Progressive Difficulty:
// A. MCQ (10 Qs) -> B. Matching (1 Activity, 5 Pairs) -> C. Correct/Wrong (5 Qs) ->
// D. Cloze (1 Passage, 5 Blanks) -> E. Find Mistake (5 Qs) ->
// F. Controlled Answer (5 Qs) -> G. Reorder Sentence (5 Qs)
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
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
import { MatchRenderer, MatchingPairItem } from './MatchRenderer';
import { BinaryChoiceRenderer } from './BinaryChoiceRenderer';
import { ClozeDropdownRenderer, ClozeBlankDefinition } from './ClozeDropdownRenderer';
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
  unansweredCount?: number;
  markedCount: number;
  onAnswerChange: (val: any, targetQId?: string) => void;
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
  const qType = (q.type || q.standardType || '').toLowerCase();

  // Find Mistake (Section E)
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

  // Reorder (Section G)
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

  // Cloze Passage (Section D)
  if (
    secId.includes('cloze') ||
    secTitle.includes('cloze') ||
    secTitle.includes('section d') ||
    qType === 'cloze' ||
    qType === 'cloze_passage' ||
    q.blankId !== undefined ||
    q.blankIndex !== undefined ||
    item.parentPassage !== undefined
  ) {
    return 'cloze';
  }

  // Matching (Section B)
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

  // Correct or Wrong (Section C)
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

  // Controlled Type Answer (Section F)
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

  // Default to MCQ (Section A)
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
  answeredCount: propAnsweredCount,
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

  // Defensive question lookup: guarantee currentItem is safely resolved
  const currentItem = useMemo(() => {
    if (!questions || questions.length === 0) return null;
    if (questions[currentIndex]) return questions[currentIndex];
    return questions[0];
  }, [questions, currentIndex]);

  const q = currentItem?.question as any;
  const currentType = useMemo(() => resolveStandardType(currentItem || undefined), [currentItem]);

  // Section range indices for composite activities (Matching & Cloze)
  const matchingIndices = useMemo(() => {
    const list: number[] = [];
    questions.forEach((item, idx) => {
      if (resolveStandardType(item) === 'matching') list.push(idx);
    });
    return list;
  }, [questions]);

  const clozeIndices = useMemo(() => {
    const list: number[] = [];
    questions.forEach((item, idx) => {
      if (resolveStandardType(item) === 'cloze') list.push(idx);
    });
    return list;
  }, [questions]);

  // Section B (Matching): Extract all matching items across questions array into one composite activity
  const matchingPairs: MatchingPairItem[] = useMemo(() => {
    const matchingItems = questions.filter((item) => resolveStandardType(item) === 'matching');
    return matchingItems.map((item, idx) => {
      const qObj = item.question as any;
      const left = qObj.left || qObj.pair?.left || (qObj.pairs?.[0]?.left) || `Item ${idx + 1}`;
      const right = qObj.right || qObj.pair?.right || (qObj.pairs?.[0]?.right) || `Match ${idx + 1}`;
      return {
        id: qObj.id || `match_${idx + 1}`,
        left,
        right,
        marks: qObj.marks || 2
      };
    });
  }, [questions]);

  // Section D (Cloze): Extract shared passage and all 5 individual blank definitions
  const clozePassage = useMemo(() => {
    const clozeSec = exam.sections?.find((s) => {
      const sId = (s.id || '').toLowerCase();
      const sTitle = (s.title || '').toLowerCase();
      return sId.includes('cloze') || sTitle.includes('cloze') || sTitle.includes('section d');
    });
    const clozeItems = questions.filter((item) => resolveStandardType(item) === 'cloze');
    return (
      clozeSec?.passage ||
      (clozeItems.find((item) => (item.question as any).passage)?.question as any)?.passage ||
      clozeItems[0]?.parentPassage ||
      ''
    );
  }, [exam.sections, questions]);

  const clozeBlanks: ClozeBlankDefinition[] = useMemo(() => {
    const clozeItems = questions.filter((item) => resolveStandardType(item) === 'cloze');
    return clozeItems.map((item, idx) => {
      const qObj = item.question as any;
      const blankId = qObj.blankId || (qObj.blankIndex ? `blank_${qObj.blankIndex}` : `blank_${idx + 1}`);
      const opts = Array.isArray(qObj.options)
        ? qObj.options.map((o: any) => (typeof o === 'string' ? o : o.text || o.id || ''))
        : [];
      return {
        id: blankId,
        questionId: qObj.id,
        options: opts,
        correctAnswer: typeof qObj.correctAnswer === 'string' ? qObj.correctAnswer : opts[0] || '',
        marks: qObj.marks || 2
      };
    });
  }, [questions]);

  // Dynamic answered count across all 40 questions
  const liveAnsweredCount = useMemo(() => {
    return questions.filter((item) => {
      const qObj = item.question as any;
      const type = resolveStandardType(item);
      if (type === 'matching') {
        return Boolean(answers[qObj.id] || (qObj.left && answers[qObj.left]));
      }
      if (type === 'cloze') {
        return Boolean(answers[qObj.id] || (qObj.blankId && answers[qObj.blankId]));
      }
      const val = answers[qObj.id];
      return val !== undefined && val !== null && String(val).trim().length > 0;
    }).length;
  }, [questions, answers]);

  const displayedAnsweredCount = propAnsweredCount !== undefined ? Math.max(propAnsweredCount, liveAnsweredCount) : liveAnsweredCount;

  // Active answer check for current question or activity
  const isCurrentAnswered = useMemo(() => {
    if (currentType === 'matching') {
      return matchingPairs.some((p) => Boolean(answers[p.id] || answers[p.left]));
    }
    if (currentType === 'cloze') {
      return clozeBlanks.some((b) => Boolean(answers[b.id] || (b.questionId && answers[b.questionId])));
    }
    return (
      currentAnswer !== undefined &&
      currentAnswer !== null &&
      (typeof currentAnswer === 'string'
        ? currentAnswer.trim().length > 0
        : Array.isArray(currentAnswer)
        ? currentAnswer.length > 0
        : Object.keys(currentAnswer).length > 0)
    );
  }, [currentType, matchingPairs, clozeBlanks, answers, currentAnswer]);

  const isBookmarked = currentItem ? bookmarkedIds.has(currentItem.question.id) : false;

  // Progress percentage
  const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

  // Section badge meta
  const sectionMeta = useMemo(() => {
    switch (currentType) {
      case 'mcq':
        return {
          label: 'SECTION A • MCQ',
          marksText: '2 Marks',
          rangeText: `Question ${currentIndex + 1} of ${totalQuestions}`,
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700'
        };
      case 'matching':
        return {
          label: 'SECTION B • MATCHING',
          marksText: '10 Marks',
          rangeText: matchingIndices.length > 0 ? `Questions ${matchingIndices[0] + 1}–${matchingIndices[matchingIndices.length - 1] + 1} of ${totalQuestions}` : 'Questions 11–15 of 40',
          bg: 'bg-violet-50 border-violet-200 text-violet-700'
        };
      case 'correct_wrong':
        return {
          label: 'SECTION C • CORRECT OR WRONG',
          marksText: '2 Marks',
          rangeText: `Question ${currentIndex + 1} of ${totalQuestions}`,
          bg: 'bg-sky-50 border-sky-200 text-sky-700'
        };
      case 'cloze':
        return {
          label: 'SECTION D • CLOZE PASSAGE',
          marksText: '10 Marks',
          rangeText: clozeIndices.length > 0 ? `Questions ${clozeIndices[0] + 1}–${clozeIndices[clozeIndices.length - 1] + 1} of ${totalQuestions}` : 'Questions 21–25 of 40',
          bg: 'bg-teal-50 border-teal-200 text-teal-700'
        };
      case 'find_mistake':
        return {
          label: 'SECTION E • FIND THE MISTAKE',
          marksText: '3 Marks',
          rangeText: `Question ${currentIndex + 1} of ${totalQuestions}`,
          bg: 'bg-rose-50 border-rose-200 text-rose-700'
        };
      case 'controlled_answer':
        return {
          label: 'SECTION F • TYPE THE ANSWER',
          marksText: '3 Marks',
          rangeText: `Question ${currentIndex + 1} of ${totalQuestions}`,
          bg: 'bg-amber-50 border-amber-200 text-amber-700'
        };
      case 'reorder':
        return {
          label: 'SECTION G • REORDER SENTENCE',
          marksText: '4 Marks',
          rangeText: `Question ${currentIndex + 1} of ${totalQuestions}`,
          bg: 'bg-purple-50 border-purple-200 text-purple-700'
        };
      default:
        return {
          label: 'EXAM SECTION',
          marksText: '2 Marks',
          rangeText: `Question ${currentIndex + 1} of ${totalQuestions}`,
          bg: 'bg-slate-100 border-slate-200 text-slate-700'
        };
    }
  }, [currentType, currentIndex, totalQuestions, matchingIndices, clozeIndices]);

  // Section-aware Navigation Handlers
  const handleSmartPrevious = useCallback(() => {
    if (currentType === 'matching') {
      const prevIdx = matchingIndices.length > 0 ? matchingIndices[0] - 1 : currentIndex - 1;
      onSelectIndex(Math.max(0, prevIdx));
      return;
    }
    if (currentType === 'cloze') {
      const prevIdx = clozeIndices.length > 0 ? clozeIndices[0] - 1 : currentIndex - 1;
      onSelectIndex(Math.max(0, prevIdx));
      return;
    }

    const prevIdx = currentIndex - 1;
    if (matchingIndices.includes(prevIdx) && matchingIndices.length > 0) {
      onSelectIndex(matchingIndices[0]);
    } else if (clozeIndices.includes(prevIdx) && clozeIndices.length > 0) {
      onSelectIndex(clozeIndices[0]);
    } else {
      onPrevious();
    }
  }, [currentType, currentIndex, matchingIndices, clozeIndices, onPrevious, onSelectIndex]);

  const handleSmartNext = useCallback(() => {
    if (currentType === 'matching') {
      const nextIdx = matchingIndices.length > 0 ? matchingIndices[matchingIndices.length - 1] + 1 : currentIndex + 1;
      onSelectIndex(Math.min(totalQuestions - 1, nextIdx));
      return;
    }
    if (currentType === 'cloze') {
      const nextIdx = clozeIndices.length > 0 ? clozeIndices[clozeIndices.length - 1] + 1 : currentIndex + 1;
      onSelectIndex(Math.min(totalQuestions - 1, nextIdx));
      return;
    }

    const nextIdx = currentIndex + 1;
    if (matchingIndices.includes(nextIdx) && matchingIndices.length > 0) {
      onSelectIndex(matchingIndices[0]);
    } else if (clozeIndices.includes(nextIdx) && clozeIndices.length > 0) {
      onSelectIndex(clozeIndices[0]);
    } else {
      onNext();
    }
  }, [currentType, currentIndex, totalQuestions, matchingIndices, clozeIndices, onNext, onSelectIndex]);

  // Is at the end of the examination
  const isAtExamEnd = useMemo(() => {
    if (currentType === 'reorder') {
      return currentIndex >= totalQuestions - 1;
    }
    return currentIndex >= totalQuestions - 1;
  }, [currentType, currentIndex, totalQuestions]);

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
        return (
          <MatchRenderer
            pairs={matchingPairs}
            currentAnswers={answers}
            onSelectPair={(pairId, leftText, rightText) => {
              const updated = {
                ...answers,
                [pairId]: rightText,
                [leftText]: rightText
              };
              onAnswerChange(updated, pairId);
            }}
            onClearPair={(pairId, leftText) => {
              const updated = { ...answers };
              delete updated[pairId];
              delete updated[leftText];
              onAnswerChange(updated, pairId);
            }}
            onResetAll={() => {
              const updated = { ...answers };
              matchingPairs.forEach((p) => {
                delete updated[p.id];
                delete updated[p.left];
              });
              onAnswerChange(updated);
            }}
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
        return (
          <ClozeDropdownRenderer
            passage={clozePassage}
            blanks={clozeBlanks}
            currentAnswers={answers}
            onSelectBlank={(blankId, questionId, selectedVal) => {
              const updated = {
                ...answers,
                [blankId]: selectedVal
              };
              if (questionId) {
                updated[questionId] = selectedVal;
              }
              onAnswerChange(updated, questionId || blankId);
            }}
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
        let words: string[] = [];
        if (Array.isArray(q.words) && q.words.length > 0) {
          words = q.words;
        } else if (Array.isArray(q.correctOrder)) {
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

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-center space-y-3 max-w-sm shadow-xl">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-black text-slate-800">No Questions Found</h2>
          <p className="text-xs text-slate-500">This examination does not contain any questions.</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Return
          </button>
        </div>
      </div>
    );
  }

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
                <span>{sectionMeta.rangeText}</span>
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
                {displayedAnsweredCount}/{totalQuestions}
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

              {/* Question Text / Prompt (Hidden for Find Mistake, Controlled, Matching, Cloze which have internal headers) */}
              {currentType !== 'find_mistake' && currentType !== 'controlled_answer' && currentType !== 'correct_wrong' && currentType !== 'matching' && currentType !== 'cloze' && (
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
              disabled={currentIndex === 0 && currentType !== 'matching'}
              onClick={handleSmartPrevious}
              className="px-3.5 sm:px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {!isAtExamEnd ? (
              <button
                type="button"
                onClick={handleSmartNext}
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
                  <span>{displayedAnsweredCount} Answered</span>
                  <span>•</span>
                  <span>{markedCount} Flagged</span>
                  <span>•</span>
                  <span>{Math.max(0, totalQuestions - displayedAnsweredCount)} Remaining</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Numbers Grid (1 to 40) */}
            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                {questions.map((item, idx) => {
                  const itemType = resolveStandardType(item);
                  const isCurrent =
                    itemType === 'matching' && currentType === 'matching'
                      ? true
                      : itemType === 'cloze' && currentType === 'cloze'
                      ? true
                      : idx === currentIndex;

                  const qObj = item.question as any;
                  const isAns =
                    itemType === 'matching'
                      ? Boolean(answers[qObj.id] || (qObj.left && answers[qObj.left]))
                      : itemType === 'cloze'
                      ? Boolean(answers[qObj.id] || (qObj.blankId && answers[qObj.blankId]))
                      : answers[qObj.id] !== undefined && answers[qObj.id] !== null && String(answers[qObj.id]).trim().length > 0;

                  const flagged = bookmarkedIds.has(item.question.id);

                  return (
                    <button
                      key={item.question.id || idx}
                      type="button"
                      onClick={() => {
                        if (itemType === 'matching' && matchingIndices.length > 0) {
                          onSelectIndex(matchingIndices[0]);
                        } else if (itemType === 'cloze' && clozeIndices.length > 0) {
                          onSelectIndex(clozeIndices[0]);
                        } else {
                          onSelectIndex(idx);
                        }
                        setIsBottomSheetOpen(false);
                      }}
                      className={`h-11 sm:h-12 rounded-2xl border-2 font-black text-xs sm:text-sm flex flex-col items-center justify-center relative transition-all cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 font-black scale-105'
                          : isAns
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                      {isAns && (
                        <span className="text-[9px] -mt-0.5">
                          ✓
                        </span>
                      )}
                      {/* Bookmark corner badge */}
                      {flagged && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sheet Footer */}
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
                Finish & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
