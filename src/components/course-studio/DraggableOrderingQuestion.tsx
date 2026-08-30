// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: DRAGGABLE ORDERING QUESTION ENGINE
// Premium touch & pointer-based drag-and-drop chronological story arranger.
// Mobile-first, stable shuffling, visual drop indicators, immediate evaluation,
// one-attempt locking, and comprehensive side-by-side educational feedback.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  GripVertical,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Send
} from 'lucide-react';
import { CourseQuestion } from '@/types/courseStudio';
import { courseAudio } from '@/utils/courseAudio';

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

// Stable shuffle algorithm (ensures shuffled order is different from canonical if possible)
function shuffleItems(items: OrderItem[]): OrderItem[] {
  if (items.length <= 1) return [...items];

  const shuffled = [...items];
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Check if at least one item moved
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
  // Canonical list of items (The correct sequence)
  const canonicalItems: string[] = Array.isArray(question.options)
    ? question.options.map(opt => (typeof opt === 'string' ? opt : (opt as any)?.text || ''))
    : [];

  // Items with stable identity
  const [items, setItems] = useState<OrderItem[]>(() => {
    const rawItems: OrderItem[] = canonicalItems.map((text, idx) => ({
      id: `ord_${idx}_${text.substring(0, 15).replace(/\s+/g, '_')}`,
      text,
      originalIndex: idx
    }));

    if (selectedAnswer) {
      // Restore previously submitted arrangement
      const submittedTexts = selectedAnswer.split('|||');
      const restored: OrderItem[] = [];
      submittedTexts.forEach((text, sIdx) => {
        const matched = rawItems.find(r => r.text.trim() === text.trim());
        if (matched) {
          restored.push(matched);
        } else {
          restored.push({ id: `sub_${sIdx}`, text, originalIndex: sIdx });
        }
      });
      if (restored.length === rawItems.length) return restored;
    }

    return shuffleItems(rawItems);
  });

  // Dragging State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Touch Drag Tracking Refs
  const touchStateRef = useRef<{
    active: boolean;
    startIndex: number;
    initialY: number;
  }>({ active: false, startIndex: -1, initialY: 0 });

  // Sync if selectedAnswer changes from external source
  useEffect(() => {
    if (selectedAnswer && isLocked) {
      const submittedTexts = selectedAnswer.split('|||');
      const updated: OrderItem[] = submittedTexts.map((text, idx) => ({
        id: `ord_restored_${idx}`,
        text,
        originalIndex: idx
      }));
      setItems(updated);
    }
  }, [selectedAnswer, isLocked]);

  // --------------------------------------------------------------------------
  // POINTER & MOUSE DRAG HANDLERS (Desktop & Laptop)
  // --------------------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isLocked || isSubmitting) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isLocked || isSubmitting || draggedIndex === null) return;
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (isLocked || isSubmitting || draggedIndex === null) return;

    if (draggedIndex !== targetIndex) {
      const nextItems = [...items];
      const [removed] = nextItems.splice(draggedIndex, 1);
      nextItems.splice(targetIndex, 0, removed);
      setItems(nextItems);
      courseAudio.playSelectSound();
    }

    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // --------------------------------------------------------------------------
  // TOUCH DRAG HANDLERS (Mobile & Tablet)
  // --------------------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (isLocked || isSubmitting) return;
    const touch = e.touches[0];
    touchStateRef.current = {
      active: true,
      startIndex: index,
      initialY: touch.clientY
    };
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStateRef.current.active || isLocked || isSubmitting) return;
    const touch = e.touches[0];
    const clientY = touch.clientY;

    // Find which item is currently under the touch point
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        if (dropTargetIndex !== idx) {
          setDropTargetIndex(idx);
        }
      }
    });
  };

  const handleTouchEnd = () => {
    if (touchStateRef.current.active && draggedIndex !== null && dropTargetIndex !== null) {
      if (draggedIndex !== dropTargetIndex) {
        const nextItems = [...items];
        const [removed] = nextItems.splice(draggedIndex, 1);
        nextItems.splice(dropTargetIndex, 0, removed);
        setItems(nextItems);
        courseAudio.playSelectSound();
      }
    }

    touchStateRef.current = { active: false, startIndex: -1, initialY: 0 };
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // --------------------------------------------------------------------------
  // KEYBOARD ACCESSIBILITY HANDLER
  // --------------------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (isLocked || isSubmitting) return;

    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const nextItems = [...items];
      const temp = nextItems[index];
      nextItems[index] = nextItems[index - 1];
      nextItems[index - 1] = temp;
      setItems(nextItems);
      courseAudio.playSelectSound();
    } else if (e.key === 'ArrowDown' && index < items.length - 1) {
      e.preventDefault();
      const nextItems = [...items];
      const temp = nextItems[index];
      nextItems[index] = nextItems[index + 1];
      nextItems[index + 1] = temp;
      setItems(nextItems);
      courseAudio.playSelectSound();
    }
  };

  // --------------------------------------------------------------------------
  // SUBMIT ORDER
  // --------------------------------------------------------------------------
  const handleSubmitOrder = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLocked || isSubmitting) return;
    const serializedOrder = items.map(item => item.text).join('|||');
    onEvaluateAnswer(question, serializedOrder, e.currentTarget);
  };

  return (
    <div
      ref={containerRef}
      className="w-full space-y-4 select-none"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Subtitle / Hint Header */}
      {!isLocked && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#026fc3]" />
            <span className="uppercase tracking-wider text-[11px] font-bold text-[#026fc3] reader-meta">
              Arrange the Story in Chronological Order
            </span>
          </div>
          <span className="text-[11px] opacity-80 reader-meta">
            Drag cards or tap <span className="font-bold text-[#026fc3]">↑ / ↓</span> to order
          </span>
        </div>
      )}

      {/* DRAGGABLE & ACCESSIBLE SENTENCE BLOCKS */}
      <div className="w-full space-y-2.5">
        {items.map((item, index) => {
          const isBeingDragged = draggedIndex === index;
          const isDropTarget = dropTargetIndex === index && draggedIndex !== index;

          let cardStyle = 'surface-answer-option text-slate-800 dark:text-slate-100 shadow-2xs';
          let numBadgeStyle = 'bg-sky-50 dark:bg-slate-800 text-[#026fc3] dark:text-sky-300 border border-sky-200/80 dark:border-slate-700';

          if (isLocked) {
            if (feedback?.isCorrect) {
              cardStyle = 'surface-answer-selected-correct';
              numBadgeStyle = 'bg-emerald-600 text-white border-0';
            } else {
              cardStyle = 'surface-answer-selected-incorrect';
              numBadgeStyle = 'bg-rose-600 text-white border-0';
            }
          } else if (isBeingDragged) {
            cardStyle = 'bg-sky-50 dark:bg-sky-950/50 border-2 border-[#026fc3] shadow-lg scale-[1.01] ring-2 ring-[#026fc3]/20';
            numBadgeStyle = 'bg-[#026fc3] text-white border-0';
          }

          return (
            <div key={item.id} className="relative transition-all duration-150">
              
              {/* Drop Target Indicator Line */}
              {isDropTarget && (
                <div className="w-full py-1.5 flex items-center justify-center gap-2 animate-pulse">
                  <div className="h-0.5 flex-1 bg-[#026fc3] rounded-full" />
                  <span className="text-[10px] font-black uppercase text-[#026fc3] px-2.5 py-0.5 bg-sky-50 rounded-full border border-sky-200 shadow-2xs">
                    Drop Here
                  </span>
                  <div className="h-0.5 flex-1 bg-[#026fc3] rounded-full" />
                </div>
              )}

              <div
                ref={el => { itemRefs.current[index] = el; }}
                draggable={!isLocked && !isSubmitting}
                onDragStart={e => handleDragStart(e, index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={e => handleDrop(e, index)}
                onTouchStart={e => handleTouchStart(e, index)}
                tabIndex={isLocked ? -1 : 0}
                onKeyDown={e => handleKeyDown(e, index)}
                aria-label={`Event ${index + 1}: ${item.text}`}
                className={`w-full min-h-[58px] p-3 sm:p-4 rounded-2xl border text-left reader-option leading-relaxed transition-all flex items-center gap-3 box-border ${
                  isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:shadow-xs'
                } ${cardStyle}`}
              >
                {/* Grip Handle Indicator */}
                {!isLocked && (
                  <div className="text-slate-300 hover:text-[#026fc3] dark:hover:text-sky-400 shrink-0 touch-none cursor-grab" title="Drag to rearrange">
                    <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                )}

                {/* Position Number Badge (01, 02, 03...) */}
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors shadow-2xs ${numBadgeStyle}`}>
                  {isLocked ? (
                    feedback?.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />
                  ) : (
                    String(index + 1).padStart(2, '0')
                  )}
                </span>

                {/* Sentence Block Text */}
                <span className="flex-1 font-medium break-words leading-relaxed text-left reader-option text-inherit">
                  {item.text}
                </span>

                {/* Prominent, Touch-Friendly Move Up / Move Down Controls */}
                {!isLocked && (
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextItems = [...items];
                        const temp = nextItems[index];
                        nextItems[index] = nextItems[index - 1];
                        nextItems[index - 1] = temp;
                        setItems(nextItems);
                        courseAudio.playSelectSound();
                      }}
                      aria-label="Move item up"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-[#026fc3] hover:text-white dark:hover:bg-[#026fc3] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-20 disabled:hover:bg-slate-50 disabled:hover:text-slate-600 cursor-pointer flex items-center justify-center transition-all shadow-2xs active:scale-95 reader-button"
                      title="Move up"
                    >
                      <span className="text-sm font-black leading-none">▲</span>
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextItems = [...items];
                        const temp = nextItems[index];
                        nextItems[index] = nextItems[index + 1];
                        nextItems[index + 1] = temp;
                        setItems(nextItems);
                        courseAudio.playSelectSound();
                      }}
                      aria-label="Move item down"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-[#026fc3] hover:text-white dark:hover:bg-[#026fc3] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-20 disabled:hover:bg-slate-50 disabled:hover:text-slate-600 cursor-pointer flex items-center justify-center transition-all shadow-2xs active:scale-95 reader-button"
                      title="Move down"
                    >
                      <span className="text-sm font-black leading-none">▼</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CHECK ORDER BUTTON (Available before locking) */}
      {!isLocked && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 font-medium italic text-center sm:text-left reader-meta">
            Drag cards or use ▲ ▼ buttons to arrange before submitting.
          </p>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitOrder}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl bg-[#026fc3] hover:bg-[#02599c] text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98 reader-button"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Check Order</span>
          </button>
        </div>
      )}

      {/* POST-SUBMISSION EDUCATIONAL FEEDBACK */}
      {isLocked && feedback?.showExplanation && (
        <div className="space-y-3 pt-2">
          
          {/* Main Feedback Banner */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border text-xs sm:text-sm leading-relaxed transition-all animate-in fade-in duration-200 reader-explanation ${
              feedback.isCorrect
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 text-emerald-950 dark:text-emerald-200'
                : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 text-rose-950 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-black mb-1">
              {feedback.isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>✓ Correct! Excellent work. You arranged the events in the right order.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>✕ Not quite. Review the correct story timeline below.</span>
                </>
              )}
            </div>

            <p className="opacity-90 leading-relaxed font-medium pt-1">
              {question.explanation || (feedback.isCorrect ? 'The chronological sequence matches the narrative flow.' : 'Compare your sequence with the correct order to see where the story unfolded differently.')}
            </p>
          </div>

          {/* If Incorrect: Show the Canonical Correct Order clearly */}
          {!feedback.isCorrect && (
            <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border-2 border-sky-200/80 dark:border-sky-800/60 space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#026fc3] dark:text-sky-300 flex items-center gap-1.5 reader-meta">
                <CheckCircle2 className="w-4 h-4 text-[#026fc3]" />
                <span>Correct Chronological Order</span>
              </span>

              <ol className="space-y-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                {canonicalItems.map((correctSentence, cIdx) => (
                  <li
                    key={cIdx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-sky-100 dark:border-slate-800 reader-body"
                  >
                    <span className="w-5 h-5 rounded-md bg-[#026fc3] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {cIdx + 1}
                    </span>
                    <span className="flex-1 font-medium leading-relaxed text-inherit">
                      {correctSentence}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
