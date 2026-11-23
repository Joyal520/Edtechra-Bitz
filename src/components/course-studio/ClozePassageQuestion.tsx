// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CLOZE PASSAGE INTERACTIVE QUESTION
// Renders a compact, readable passage with inline interactive dropdown blanks,
// live completion counter ("Completed X of Y blanks"), Check Answer submission,
// and immediate educational feedback.
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, X, ChevronDown, CheckCircle2, XCircle, Send } from 'lucide-react';
import { CourseQuestion, ClozeBlank } from '@/types/courseStudio';
import { playCorrectSound, playIncorrectSound, playCompleteSound } from '@/utils/courseAudio';
import { triggerConfettiBurst } from '@/utils/courseConfetti';
import { shuffleOptionsForStudent } from '@/utils/optionRandomizer';
import { useAuth } from '@/context/AuthContext';

interface Props {
  question: CourseQuestion;
  isLocked?: boolean;
  isSubmitting?: boolean;
  selectedAnswer?: string;
  feedback?: { isCorrect: boolean; showExplanation: boolean } | null;
  onEvaluateAnswer: (question: CourseQuestion, answer: string, targetEl?: HTMLElement) => void;
}

function parseClozePayload(question: CourseQuestion): { passageText: string; blanks: ClozeBlank[] } {
  let parsedOptions: any = question.options;
  if (typeof parsedOptions === 'string') {
    try {
      parsedOptions = JSON.parse(parsedOptions);
    } catch {
      parsedOptions = null;
    }
  }

  const optionsObj =
    parsedOptions && typeof parsedOptions === 'object' && !Array.isArray(parsedOptions)
      ? parsedOptions
      : null;

  const passageText =
    (typeof question.passage === 'string' && question.passage.trim() ? question.passage : '') ||
    (typeof optionsObj?.passage === 'string' && optionsObj.passage.trim() ? optionsObj.passage : '') ||
    question.question_text ||
    '';

  const blanks: ClozeBlank[] =
    (Array.isArray(question.blanks) && question.blanks.length > 0 ? question.blanks : null) ||
    (Array.isArray(optionsObj?.blanks) && optionsObj.blanks.length > 0 ? optionsObj.blanks : null) ||
    [];

  return { passageText, blanks };
}

export const ClozePassageQuestion: React.FC<Props> = ({
  question,
  isLocked = false,
  isSubmitting = false,
  selectedAnswer,
  onEvaluateAnswer
}) => {
  const { user } = useAuth();
  const { passageText, blanks } = useMemo(() => parseClozePayload(question), [question]);

  // State: mapping of blankId -> selected option string
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(() => {
    if (!selectedAnswer || blanks.length === 0) return {};
    const restored: Record<string, string> = {};
    const parts = selectedAnswer.split(';').map(s => s.trim());
    blanks.forEach((b, idx) => {
      const prefix = `${b.id}:`;
      const matched = parts.find(p => p.startsWith(prefix)) || parts[idx] || '';
      const val = matched.includes(':') ? matched.split(':').slice(1).join(':').trim() : matched.trim();
      if (val) restored[b.id] = val;
    });
    return restored;
  });

  const [submitted, setSubmitted] = useState<boolean>(Boolean(isLocked));
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLocked) {
      setSubmitted(true);
    }
  }, [isLocked]);

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

  const handleSelectOption = (blank: ClozeBlank, optionText: string) => {
    if (submitted || isLocked || isSubmitting) return;
    setUserAnswers(prev => ({ ...prev, [blank.id]: optionText }));
    setActiveDropdownId(null);
  };

  const answeredCount = blanks.filter(b => Boolean(userAnswers[b.id])).length;
  const totalBlanks = blanks.length;
  const allAnswered = totalBlanks > 0 && answeredCount === totalBlanks;

  const blankStatuses = useMemo(() => {
    const map: Record<string, { isCorrect: boolean }> = {};
    if (!submitted) return map;
    blanks.forEach(b => {
      const val = (userAnswers[b.id] || '').trim().toLowerCase();
      map[b.id] = { isCorrect: val === b.answer.trim().toLowerCase() };
    });
    return map;
  }, [submitted, blanks, userAnswers]);

  const correctCount = Object.values(blankStatuses).filter(s => s.isCorrect).length;

  const handleCheckAnswer = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!allAnswered || submitted || isLocked || isSubmitting) return;
    setSubmitted(true);
    setActiveDropdownId(null);

    const allRight = blanks.every(
      b => (userAnswers[b.id] || '').trim().toLowerCase() === b.answer.trim().toLowerCase()
    );
    if (allRight) {
      playCompleteSound();
      triggerConfettiBurst(e.currentTarget);
    } else {
      const someRight = blanks.some(
        b => (userAnswers[b.id] || '').trim().toLowerCase() === b.answer.trim().toLowerCase()
      );
      if (someRight) playCorrectSound();
      else playIncorrectSound();
    }

    const answerSummary = blanks.map(b => `${b.id}: ${userAnswers[b.id] || ''}`).join('; ');
    onEvaluateAnswer(question, answerSummary, e.currentTarget);
  };

  const renderPassageWithBlanks = () => {
    if (!passageText) {
      return <p className="text-slate-500 italic reader-body">No passage content provided.</p>;
    }
    if (blanks.length === 0) {
      return <p className="leading-[1.85] text-slate-900 dark:text-slate-100 reader-body">{passageText}</p>;
    }

    let workingText = passageText;

    blanks.forEach((blank, idx) => {
      const placeholderRegex = new RegExp(
        `\\[\\s*(?:${escapeRegExp(blank.id)}|${idx + 1}|${escapeRegExp(blank.answer)}|blank_?\\d+)\\s*\\]`,
        'i'
      );
      if (placeholderRegex.test(workingText)) {
        workingText = workingText.replace(placeholderRegex, ` __CLOZE_TOKEN_${idx}__ `);
      } else {
        const underscoreRegex = /_{3,}/;
        if (underscoreRegex.test(workingText)) {
          workingText = workingText.replace(underscoreRegex, ` __CLOZE_TOKEN_${idx}__ `);
        } else {
          const wordRegex = new RegExp(`\\b${escapeRegExp(blank.answer)}\\b`, 'i');
          if (wordRegex.test(workingText)) {
            workingText = workingText.replace(wordRegex, ` __CLOZE_TOKEN_${idx}__ `);
          }
        }
      }
    });

    const splitParts = workingText.split(/(__CLOZE_TOKEN_\d+__)/g);

    return (
      <div className="text-base sm:text-[17px] leading-[2.2] text-slate-900 dark:text-slate-100 font-medium reader-body">
        {splitParts.map((part, pIdx) => {
          const match = part.match(/__CLOZE_TOKEN_(\d+)__/);
          if (match) {
            const blankIdx = parseInt(match[1], 10);
            const blank = blanks[blankIdx];
            if (!blank) return null;

            const selected = userAnswers[blank.id];
            const status = blankStatuses[blank.id];
            const isEvaluated = submitted && status !== undefined;
            const isOpen = activeDropdownId === blank.id;

            return (
              <span key={`blank_${blank.id}_${pIdx}`} className="inline-block relative align-middle my-0.5 mx-1">
                <button
                  type="button"
                  disabled={isEvaluated || isLocked || isSubmitting}
                  onClick={e => {
                    e.stopPropagation();
                    setActiveDropdownId(isOpen ? null : blank.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 text-xs sm:text-sm font-black transition-all shadow-2xs reader-button ${
                    isEvaluated
                      ? status.isCorrect
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                        : 'bg-rose-50 border-rose-400 text-rose-900'
                      : selected
                      ? 'bg-sky-50 border-sky-500 text-sky-900 cursor-pointer'
                      : isOpen
                      ? 'bg-sky-100 border-sky-600 text-sky-900 ring-2 ring-sky-400/30 cursor-pointer'
                      : 'bg-white border-sky-300 text-slate-800 hover:border-sky-500 hover:bg-sky-50 cursor-pointer'
                  }`}
                >
                  {isEvaluated ? (
                    <>
                      {status.isCorrect ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-600 shrink-0 stroke-[3]" />
                      )}
                      <span>{selected}</span>
                    </>
                  ) : selected ? (
                    <>
                      <span className="text-sky-700 font-black">[{blankIdx + 1}]</span>
                      <span>{selected}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-sky-600" />
                    </>
                  ) : (
                    <>
                      <span className="text-sky-700 font-black">[{blankIdx + 1}]</span>
                      <span className="text-slate-400">______</span>
                      <ChevronDown className="w-3.5 h-3.5 text-sky-600" />
                    </>
                  )}
                </button>

                {isEvaluated && !status.isCorrect && (
                  <span className="ml-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                    ✓ {blank.answer}
                  </span>
                )}

                {isOpen && !isEvaluated && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 bottom-full mb-2 z-50 w-52 sm:w-60 max-w-[calc(100vw-3rem)] p-2 rounded-2xl bg-white dark:bg-slate-900 space-y-1 shadow-xl border border-sky-200 dark:border-slate-700"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="text-[10px] font-bold text-sky-700 uppercase px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                      <span>Blank #{blankIdx + 1}</span>
                      <span className="text-slate-400">Choose word</span>
                    </div>
                    {shuffleOptionsForStudent(
                      blank.options || [],
                      user?.id,
                      `${question.id || 'cloze'}_${blank.id}`
                    ).map((option, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isChosen = selected === option;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(blank, option)}
                          className={`w-full p-2 rounded-xl text-left text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            isChosen
                              ? 'bg-sky-100 text-sky-900'
                              : 'text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center text-[10px] font-black shrink-0">
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

  return (
    <div ref={containerRef} className="w-full space-y-3.5 pt-1">
      {/* Compact, Readable Passage Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 shadow-2xs">
        {renderPassageWithBlanks()}
      </div>

      {/* Completion Indicator + Check Answer Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
          Completed {answeredCount} of {totalBlanks} blanks
        </span>

        {!submitted && !isLocked && totalBlanks > 0 && (
          <button
            type="button"
            disabled={!allAnswered || isSubmitting}
            onClick={handleCheckAnswer}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs sm:text-sm font-black shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>Check Answer</span>
          </button>
        )}

        {submitted && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border ${
              correctCount === totalBlanks
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            {correctCount === totalBlanks ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-600" />
            )}
            <span>
              Score: {correctCount} / {totalBlanks} correct
            </span>
          </span>
        )}
      </div>

      {/* Post-Submission Explanation */}
      {submitted && question.explanation && (
        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs sm:text-sm text-slate-800 leading-relaxed">
          <p className="font-black text-sky-900 mb-1">✓ Passage Summary & Explanation</p>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
