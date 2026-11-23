// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CLOZE PASSAGE INTERACTIVE QUESTION
// Renders a compact, 14px dark-navy reading passage with inline <select>
// vocabulary dropdowns, live "Completed X of Y blanks" counter,
// Check Answers submission, and immediate educational feedback.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, Send } from 'lucide-react';
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

  useEffect(() => {
    if (isLocked) {
      setSubmitted(true);
    }
  }, [isLocked]);

  const handleSelectChange = (blankId: string, value: string) => {
    if (submitted || isLocked || isSubmitting) return;
    setUserAnswers(prev => {
      if (!value) {
        const next = { ...prev };
        delete next[blankId];
        return next;
      }
      return { ...prev, [blankId]: value };
    });
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
      return <p className="text-[14px] leading-[1.8] text-slate-600 italic">No passage content provided.</p>;
    }
    if (blanks.length === 0) {
      return <p className="text-[14px] leading-[1.8] font-normal text-[#0f172a]">{passageText}</p>;
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
      <div className="text-[14px] leading-[1.75] font-normal text-[#0f172a]">
        {splitParts.map((part, pIdx) => {
          const match = part.match(/__CLOZE_TOKEN_(\d+)__/);
          if (match) {
            const blankIdx = parseInt(match[1], 10);
            const blank = blanks[blankIdx];
            if (!blank) return null;

            const selected = userAnswers[blank.id] || '';
            const status = blankStatuses[blank.id];
            const isEvaluated = submitted && status !== undefined;
            const shuffledOpts = shuffleOptionsForStudent(
              blank.options || [],
              user?.id,
              `${question.id || 'cloze'}_${blank.id}`
            );

            return (
              <span key={`blank_${blank.id}_${pIdx}`} className="inline-flex items-center gap-1 align-baseline mx-1 my-0.5 max-w-full">
                <select
                  aria-label={`Blank ${blankIdx + 1}`}
                  value={selected}
                  disabled={isEvaluated || isLocked || isSubmitting}
                  onChange={e => handleSelectChange(blank.id, e.target.value)}
                  className={`inline-block max-w-full rounded-xl border px-2.5 py-0.5 text-[14px] leading-[1.4] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#026fc3]/35 cursor-pointer disabled:cursor-default shadow-2xs ${
                    isEvaluated
                      ? status.isCorrect
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                        : 'bg-rose-50 border-rose-400 text-rose-900'
                      : selected
                      ? 'bg-[#e0f2fe] border-[#026fc3] text-[#0f172a]'
                      : 'bg-[#eff6ff] border-[#93c5fd] text-[#0f172a] hover:border-[#026fc3] hover:bg-[#e0f2fe]'
                  }`}
                >
                  <option value="">Select word...</option>
                  {shuffledOpts.map((option, optIdx) => (
                    <option key={optIdx} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                {isEvaluated && !status.isCorrect && (
                  <span className="text-[12px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                    ✓ {blank.answer}
                  </span>
                )}
              </span>
            );
          }
          return <React.Fragment key={pIdx}>{part}</React.Fragment>;
        })}
      </div>
    );
  };

  return (
    <div className="w-full space-y-4" data-testid="cloze-passage-container">
      {/* Compact, Content-Sized Passage Container */}
      <div className="p-3 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        {renderPassageWithBlanks()}
      </div>

      {/* Completion Counter + Check Answers Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span className="text-sm font-bold text-[#0f172a]">
          Completed {answeredCount} of {totalBlanks} blanks
        </span>

        {!submitted && !isLocked && totalBlanks > 0 && (
          <button
            type="button"
            disabled={!allAnswered || isSubmitting}
            onClick={handleCheckAnswer}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#026fc3] to-[#0284c7] hover:from-[#03589e] hover:to-[#026fc3] disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-600 text-white text-sm font-extrabold shadow-md transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Send className="w-4 h-4" />
            <span>Check Answers</span>
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
        <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs sm:text-sm text-[#0f172a] leading-relaxed">
          <p className="font-bold text-sky-900 mb-0.5">✓ Explanation</p>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
