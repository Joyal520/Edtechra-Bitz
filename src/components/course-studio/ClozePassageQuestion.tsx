// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CLOZE PASSAGE INTERACTIVE QUESTION
// Renders an editorial reading passage with inline interactive 4-option dropdown chips.
// Immediate evaluation, single-attempt permanent lock, sound & feedback.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import { CourseQuestion, ClozeBlank } from '@/types/courseStudio';
import { playCorrectSound, playIncorrectSound, playCompleteSound } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';

interface Props {
  question: CourseQuestion;
  isLocked?: boolean;
  isSubmitting?: boolean;
  selectedAnswer?: string;
  feedback?: { isCorrect: boolean; showExplanation: boolean } | null;
  onEvaluateAnswer: (question: CourseQuestion, answer: string, targetEl?: HTMLElement) => void;
}

export const ClozePassageQuestion: React.FC<Props> = ({
  question,
  isLocked = false,
  isSubmitting = false,
  onEvaluateAnswer
}) => {
  // Extract passage and blanks from question or options
  const passageText: string = question.passage || (typeof question.options === 'object' && !Array.isArray(question.options) ? (question.options as any).passage : '') || question.question_text || '';
  const blanks: ClozeBlank[] = question.blanks || (typeof question.options === 'object' && !Array.isArray(question.options) ? (question.options as any).blanks : []) || [];

  // State: mapping of blankId -> selected option string
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  // State: mapping of blankId -> { isCorrect: boolean }
  const [blankStatuses, setBlankStatuses] = useState<Record<string, { isCorrect: boolean }>>({});
  // Currently active dropdown blank ID
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle selecting an option for a specific blank
  const handleSelectOption = (blank: ClozeBlank, optionText: string, targetEl?: HTMLElement) => {
    if (blankStatuses[blank.id] || isLocked || isSubmitting) return;

    const isCorrect = optionText.trim().toLowerCase() === blank.answer.trim().toLowerCase();
    
    // Play sound feedback
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    const nextAnswers = { ...userAnswers, [blank.id]: optionText };
    const nextStatuses = { ...blankStatuses, [blank.id]: { isCorrect } };

    setUserAnswers(nextAnswers);
    setBlankStatuses(nextStatuses);
    setActiveDropdownId(null);

    // Check if all blanks have been answered
    const allAnswered = blanks.length > 0 && blanks.every(b => nextStatuses[b.id] !== undefined);
    if (allAnswered) {
      const allCorrect = blanks.every(b => nextStatuses[b.id]?.isCorrect);
      if (allCorrect) {
        setTimeout(() => {
          playCompleteSound();
          if (targetEl) triggerConfettiBurst(targetEl);
        }, 200);
      }
      
      // Serialize full response
      const answerSummary = blanks.map(b => `${b.id}: ${nextAnswers[b.id] || ''}`).join('; ');
      onEvaluateAnswer(question, answerSummary, targetEl);
    }
  };

  // Build segmented passage with blanks
  const renderPassageWithBlanks = () => {
    if (!passageText) return <p className="text-slate-500 italic">No passage content provided.</p>;
    if (blanks.length === 0) return <p className="leading-[1.75] text-slate-800 dark:text-slate-100">{passageText}</p>;

    let workingText = passageText;
    // Strategy: replace each blank's answer or placeholder with a unique token `__CLOZE_BLANK_INDEX__`
    blanks.forEach((blank, idx) => {
      const placeholderRegex = new RegExp(`\\[\\s*(?:${blank.id}|${idx + 1}|${blank.answer})\\s*\\]`, 'gi');
      if (placeholderRegex.test(workingText)) {
        workingText = workingText.replace(placeholderRegex, ` __CLOZE_TOKEN_${idx}__ `);
      } else {
        // Fallback: replace literal answer word (word boundary safe)
        const wordRegex = new RegExp(`\\b${escapeRegExp(blank.answer)}\\b`, 'i');
        if (wordRegex.test(workingText)) {
          workingText = workingText.replace(wordRegex, ` __CLOZE_TOKEN_${idx}__ `);
        }
      }
    });

    const splitParts = workingText.split(/(__CLOZE_TOKEN_\d+__)/g);

    return (
      <div className="text-sm sm:text-base leading-[1.85] text-slate-800 dark:text-slate-100 font-medium space-y-2">
        {splitParts.map((part, pIdx) => {
          const match = part.match(/__CLOZE_TOKEN_(\d+)__/);
          if (match) {
            const blankIdx = parseInt(match[1], 10);
            const blank = blanks[blankIdx];
            if (!blank) return null;

            const selected = userAnswers[blank.id];
            const status = blankStatuses[blank.id];
            const isAnswered = status !== undefined;
            const isOpen = activeDropdownId === blank.id;

            return (
              <span key={`blank_${blank.id}_${pIdx}`} className="inline-block relative align-middle my-1 mx-1">
                {/* Interactive Blank Chip */}
                <button
                  type="button"
                  disabled={isAnswered || isLocked || isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownId(isOpen ? null : blank.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                    isAnswered
                      ? status.isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                        : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-950 dark:text-rose-100 animate-subtle-shake'
                      : isOpen
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-[#026fc3] text-[#026fc3] ring-2 ring-[#026fc3]/20'
                      : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-slate-200 border-stone-300 dark:border-stone-600 hover:border-[#026fc3] hover:bg-sky-50/40 cursor-pointer'
                  }`}
                >
                  {isAnswered ? (
                    <>
                      {status.isCorrect ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>{selected}</span>
                    </>
                  ) : (
                    <>
                      <span className="opacity-60">[ ______ ]</span>
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </>
                  )}
                </button>

                {/* Incorrect state: show correct answer inline */}
                {isAnswered && !status.isCorrect && (
                  <span className="ml-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-300/60">
                    ✓ {blank.answer}
                  </span>
                )}

                {/* 4-Option Dropdown Popover */}
                {isOpen && !isAnswered && (
                  <div
                    className="absolute left-0 bottom-full mb-2 z-50 w-56 sm:w-64 p-2 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-150 box-border"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 py-1 border-b border-stone-100 dark:border-stone-800">
                      Choose correct word:
                    </div>
                    {blank.options.map((option, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={(e) => handleSelectOption(blank, option, e.currentTarget)}
                          className="w-full p-2.5 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-stone-800 hover:text-[#026fc3] transition-all flex items-center gap-2 cursor-pointer box-border"
                        >
                          <span className="w-5 h-5 rounded-md bg-stone-100 dark:bg-stone-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black shrink-0">
                            {letter}
                          </span>
                          <span className="flex-1 truncate">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </span>
            );
          }
          return <span key={pIdx}>{part}</span>;
        })}
      </div>
    );
  };

  const answeredCount = Object.keys(blankStatuses).length;
  const totalBlanks = blanks.length;
  const correctCount = Object.values(blankStatuses).filter(s => s.isCorrect).length;
  const isFinished = totalBlanks > 0 && answeredCount === totalBlanks;

  return (
    <div ref={containerRef} className="w-full space-y-4 pt-1">
      {/* Passage Reader Card */}
      <div className="p-5 sm:p-7 rounded-3xl bg-stone-50/70 dark:bg-stone-900/70 border border-stone-200/90 dark:border-stone-800 shadow-2xs transition-all">
        {renderPassageWithBlanks()}
      </div>

      {/* Progress & Feedback Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-xs font-bold">
        <span className="text-slate-500 dark:text-slate-400">
          Completed {answeredCount} of {totalBlanks} blanks
        </span>

        {isFinished && (
          <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
            correctCount === totalBlanks
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
          }`}>
            {correctCount === totalBlanks ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Score: {correctCount} / {totalBlanks} correct</span>
          </span>
        )}
      </div>

      {/* Post-Completion Explanation Card */}
      {isFinished && question.explanation && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 leading-relaxed animate-in fade-in duration-200">
          <p className="font-black mb-1">✓ Passage Summary & Explanation:</p>
          <p className="opacity-90">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
