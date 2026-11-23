// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: TAP-TO-NUMBER ORDERING QUESTION ENGINE
// Mobile-first, thumb-friendly chronological story arranger.
// Students tap sentences in order to assign sequence numbers (1, 2, 3...),
// tap again to undo & auto-renumber, or Clear All to start over.
// Preserves the canonical `options` array and `|||` serialization contract.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  XCircle,
  Check,
  X,
  RotateCcw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { CourseQuestion } from '@/types/courseStudio';
import { courseAudio } from '@/utils/courseAudio';
import { LiquidButton } from '@/components/course-studio/liquid';

interface OrderItem {
  id: string;
  text: string;
  originalIndex: number;
}

interface Props {
  question: CourseQuestion;
  isLocked: boolean;
  isSubmitting: boolean;
  selectedAnswer?: string;
  feedback?: { isCorrect: boolean; showExplanation: boolean; selected: string };
  onEvaluateAnswer: (question: CourseQuestion, answer: string, targetElement?: HTMLElement | null) => void;
}

// Stable shuffle algorithm (ensures shuffled order differs from canonical when > 1 item)
function shuffleItems(items: OrderItem[]): OrderItem[] {
  if (items.length <= 1) return [...items];

  const shuffled = [...items];
  for (let attempt = 0; attempt < 12; attempt++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const isIdentical = shuffled.every((item, idx) => item.text === items[idx].text);
    if (!isIdentical) break;
  }

  return shuffled;
}

export const DraggableOrderingQuestion: React.FC<Props> = ({
  question,
  isLocked,
  isSubmitting,
  selectedAnswer,
  feedback,
  onEvaluateAnswer
}) => {
  // Canonical list of items (The correct chronological sequence)
  const canonicalItems: string[] = useMemo(
    () =>
      Array.isArray(question.options)
        ? question.options.map(opt => (typeof opt === 'string' ? opt : (opt as any)?.text || ''))
        : [],
    [question.options]
  );

  // Shuffled display cards with stable IDs
  const [items] = useState<OrderItem[]>(() => {
    const rawItems: OrderItem[] = canonicalItems.map((text, idx) => ({
      id: `ord_${idx}_${text.substring(0, 15).replace(/\s+/g, '_')}`,
      text,
      originalIndex: idx
    }));
    return shuffleItems(rawItems);
  });

  // Sequence of selected item IDs in the order the student tapped them
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (!selectedAnswer) return [];
    const submittedTexts = selectedAnswer.split('|||').map(t => t.trim());
    const usedIds = new Set<string>();
    const restored: string[] = [];
    submittedTexts.forEach(text => {
      const matched = items.find(i => !usedIds.has(i.id) && i.text.trim() === text);
      if (matched) {
        usedIds.add(matched.id);
        restored.push(matched.id);
      }
    });
    return restored;
  });

  const [incompleteWarning, setIncompleteWarning] = useState(false);

  // Sync if selectedAnswer is cleared (e.g. student clicks Retry) or restored externally
  useEffect(() => {
    if (!selectedAnswer && !isLocked) {
      setSelectedIds([]);
      setIncompleteWarning(false);
      return;
    }
    if (selectedAnswer && isLocked) {
      const submittedTexts = selectedAnswer.split('|||').map(t => t.trim());
      const usedIds = new Set<string>();
      const restored: string[] = [];
      submittedTexts.forEach(text => {
        const matched = items.find(i => !usedIds.has(i.id) && i.text.trim() === text);
        if (matched) {
          usedIds.add(matched.id);
          restored.push(matched.id);
        }
      });
      if (restored.length > 0) {
        setSelectedIds(restored);
      }
    }
  }, [selectedAnswer, isLocked, items]);

  const handleToggleItem = (itemId: string) => {
    if (isLocked || isSubmitting) return;
    setIncompleteWarning(false);

    setSelectedIds(prev => {
      const existingIndex = prev.indexOf(itemId);
      if (existingIndex !== -1) {
        // Undo: remove and automatically renumber remaining items without gaps
        courseAudio.playClick();
        return prev.filter(id => id !== itemId);
      }
      courseAudio.playSelectSound();
      return [...prev, itemId];
    });
  };

  const handleClearAll = () => {
    if (isLocked || isSubmitting) return;
    courseAudio.playClick();
    setSelectedIds([]);
    setIncompleteWarning(false);
  };

  const handleSubmitOrder = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLocked || isSubmitting) return;
    if (selectedIds.length < items.length) {
      setIncompleteWarning(true);
      courseAudio.playIncorrectSound();
      return;
    }
    setIncompleteWarning(false);
    const orderedTexts = selectedIds
      .map(id => items.find(i => i.id === id)?.text || '')
      .filter(Boolean);
    const serializedOrder = orderedTexts.join('|||');
    onEvaluateAnswer(question, serializedOrder, e.currentTarget);
  };

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <div className="w-full space-y-3.5" data-testid="tap-to-number-ordering">
      {/* Helpful Instruction & Progress Pill */}
      {!isLocked && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs sm:text-sm font-semibold text-theme-secondary">
            Tap the sentences in the correct order (1 → {items.length}).
          </p>
          <span className="px-2.5 py-1 rounded-full bg-[var(--theme-accent-soft)] text-theme-accent text-xs font-black border border-[var(--theme-border-subtle)]">
            {selectedIds.length} / {items.length} Selected
          </span>
        </div>
      )}

      {/* TAP-TO-NUMBER SENTENCE CARDS */}
      <div className="w-full space-y-3">
        {items.map(item => {
          const seqIndex = selectedIds.indexOf(item.id);
          const isSelected = seqIndex !== -1;
          const sequenceNumber = isSelected ? seqIndex + 1 : null;

          let cardStyle =
            '!bg-white border-slate-200 hover:border-[#026fc3]/60 !text-[#0f172a] shadow-xs';
          let badgeStyle =
            'border-2 border-slate-300 bg-slate-50 text-transparent';
          let textStyle = '!text-[#0f172a]';

          if (isLocked) {
            if (feedback?.isCorrect) {
              cardStyle =
                '!bg-emerald-50 !border-emerald-400 !text-emerald-950 shadow-xs';
              badgeStyle = 'bg-emerald-600 text-white border-0 shadow-xs';
              textStyle = '!text-emerald-950';
            } else {
              cardStyle =
                '!bg-rose-50 !border-rose-400 !text-rose-950 shadow-xs';
              badgeStyle = 'bg-rose-600 text-white border-0 shadow-xs';
              textStyle = '!text-rose-950';
            }
          } else if (isSelected) {
            cardStyle =
              '!bg-[#eff6ff] !border-[#026fc3] ring-2 ring-[#026fc3]/20 shadow-sm !text-[#0f172a]';
            badgeStyle = 'bg-[#026fc3] text-white border-0 shadow-sm scale-105';
            textStyle = '!text-[#0f172a]';
          }

          return (
            <button
              key={item.id}
              type="button"
              disabled={isLocked || isSubmitting}
              onClick={() => handleToggleItem(item.id)}
              aria-pressed={isSelected}
              aria-label={
                isSelected
                  ? `Selected #${sequenceNumber}: ${item.text}`
                  : `Tap to select: ${item.text}`
              }
              className={`w-full min-h-[54px] p-3 sm:p-[18px] rounded-2xl sm:rounded-[18px] border-2 text-left transition-all duration-150 flex items-center gap-2.5 sm:gap-4 box-border min-w-0 ${
                isLocked
                  ? 'cursor-default'
                  : 'cursor-pointer active:scale-[0.99]'
              } ${cardStyle}`}
            >
              {/* Sequential Number Badge on the Left */}
              <span
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base font-black shrink-0 transition-all duration-150 ${badgeStyle}`}
              >
                {isLocked ? (
                  feedback?.isCorrect ? (
                    sequenceNumber ?? <Check className="w-4 h-4" />
                  ) : (
                    sequenceNumber ?? <X className="w-4 h-4" />
                  )
                ) : (
                  sequenceNumber ?? ''
                )}
              </span>

              {/* Sentence Text */}
              <span className={`flex-1 min-w-0 text-[14px] sm:text-base font-semibold leading-relaxed text-left ${textStyle}`}>
                {item.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* INCOMPLETE SELECTION WARNING */}
      {incompleteWarning && !isLocked && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in duration-150"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Please select all the sentences before checking.</span>
        </div>
      )}

      {/* ACTION CONTROLS: CLEAR ALL + CHECK MY ORDER */}
      {!isLocked && (
        <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSubmitting || selectedIds.length === 0}
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0f172a] text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear All</span>
          </button>

          <LiquidButton
            variant={allSelected ? 'emerald' : 'primary'}
            size="md"
            disabled={isSubmitting}
            onClick={handleSubmitOrder}
            icon={<Check className="w-4 h-4" />}
          >
            Check My Order
          </LiquidButton>
        </div>
      )}

      {/* POST-SUBMISSION FEEDBACK */}
      {isLocked && feedback?.showExplanation && (
        <div className="space-y-3 pt-1 animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm leading-relaxed reader-explanation ${
              feedback.isCorrect
                ? 'bg-[var(--theme-success-bg)] border-[var(--theme-success-border)] text-[var(--theme-success-text)]'
                : 'bg-[var(--theme-error-bg)] border-[var(--theme-error-border)] text-[var(--theme-error-text)]'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-sm sm:text-base mb-1">
              {feedback.isCorrect ? (
                <>
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>🎉 Excellent! You arranged the story in the correct order.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Not quite! Try again.</span>
                </>
              )}
            </div>

            {feedback.isCorrect && question.explanation && (
              <p className="opacity-90 leading-relaxed font-medium pt-1">
                {question.explanation}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
