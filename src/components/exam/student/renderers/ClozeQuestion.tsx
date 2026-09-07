// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: INLINE CLOZE PASSAGE RENDERER
// Interactive reading passage with embedded inline dropdowns inside text
// Never renders raw "[blank_n]" placeholders. Word Bank chips above passage.
// ============================================================================

import React, { useMemo } from 'react';
import { CanonicalQuestion, ClozePassageQuestion, ClozeBlank } from '../../shared/ExamSchema';

interface ClozeQuestionProps {
  question: CanonicalQuestion | ClozePassageQuestion | any;
  currentAnswer: Record<string, string> | any;
  onAnswerChange: (answer: Record<string, string>) => void;
  showAnswerKey?: boolean;
}

export const ClozeQuestionComponent: React.FC<ClozeQuestionProps> = ({
  question,
  currentAnswer = {},
  onAnswerChange,
  showAnswerKey = false
}) => {
  const clozeQ = question as ClozePassageQuestion;
  const blanks: ClozeBlank[] = useMemo(() => clozeQ.blanks || [], [clozeQ.blanks]);
  const wordBank: string[] = useMemo(() => clozeQ.wordBank || [], [clozeQ.wordBank]);
  const passage: string = clozeQ.passage || (question as any).parentPassage || '';

  const answers: Record<string, string> = useMemo(() => {
    return typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};
  }, [currentAnswer]);

  const handleBlankInput = (blankId: string, value: string) => {
    onAnswerChange({
      ...answers,
      [blankId]: value
    });
  };

  // Build a fallback word options list if wordBank is not explicitly supplied
  const fallbackOptions = useMemo(() => {
    if (wordBank.length > 0) return wordBank;
    const collected = new Set<string>();
    blanks.forEach((b) => {
      if (b.correctAnswer) collected.add(b.correctAnswer);
      (b.acceptedAnswers || []).forEach((acc) => collected.add(acc));
    });
    return Array.from(collected);
  }, [wordBank, blanks]);

  // Parse passage into text segments and embedded inline blank dropdowns
  const parsedContent = useMemo(() => {
    if (!passage) return null;

    // Pattern matches [blank_1], [blank-1], [blank1], [1], [blank_something]
    const blankRegex = /(\[blank[_-]?[a-zA-Z0-9]+\]|\[\s*\d+\s*\])/gi;
    const parts = passage.split(blankRegex);

    let blankCounter = 0;

    return parts.map((part, index) => {
      if (!part) return null;

      const isBlankMatch = blankRegex.test(part);
      blankRegex.lastIndex = 0; // reset stateful regex

      if (isBlankMatch) {
        const orderIdx = blankCounter++;
        // Extract clean identifier e.g. blank_1 or 1
        const cleanId = part.replace(/[\[\]\s]/g, '');
        const matchedBlank =
          blanks.find(
            (b) =>
              b.id.toLowerCase() === cleanId.toLowerCase() ||
              b.id.toLowerCase() === `blank_${cleanId}` ||
              b.id.toLowerCase() === `blank_${orderIdx + 1}`
          ) || blanks[orderIdx];

        const blankId = matchedBlank?.id || cleanId || `blank_${orderIdx + 1}`;
        const options =
          (matchedBlank as any)?.options?.length > 0
            ? (matchedBlank as any).options
            : fallbackOptions;

        const currentValue = answers[blankId] || '';

        return (
          <span key={`cloze-${blankId}-${index}`} className="inline-block mx-1 my-0.5 align-baseline">
            <label className="sr-only" htmlFor={`cloze-select-${blankId}`}>
              Blank {orderIdx + 1}
            </label>
            <select
              id={`cloze-select-${blankId}`}
              value={currentValue}
              onChange={(e) => handleBlankInput(blankId, e.target.value)}
              className={`inline-block py-1 px-2.5 rounded-lg text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-2xs ${
                currentValue
                  ? 'bg-teal-50 border-teal-500 text-teal-950 ring-1 ring-teal-400/40 font-black'
                  : 'bg-white border-teal-300 text-slate-700 hover:border-teal-500 focus:border-teal-600 focus:ring-2 focus:ring-teal-200'
              }`}
            >
              <option value="">[ Select ▼ ]</option>
              {options.map((opt: string, oIdx: number) => (
                <option key={`${opt}-${oIdx}`} value={opt} className="text-slate-900 font-medium">
                  {opt}
                </option>
              ))}
            </select>

            {showAnswerKey && matchedBlank?.correctAnswer && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 ml-1 select-none">
                Key: {matchedBlank.correctAnswer}
              </span>
            )}
          </span>
        );
      }

      return <span key={`text-${index}`}>{part}</span>;
    });
  }, [passage, blanks, fallbackOptions, answers, showAnswerKey]);

  const completedCount = blanks.filter((b) => Boolean(answers[b.id]?.trim())).length;

  return (
    <div className="space-y-4 answer-area">
      {/* 1. Compact Word Bank (displayed above passage) */}
      {fallbackOptions.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-teal-950">
            <span>Word Bank</span>
            <span className="text-[10px] text-teal-700 font-semibold normal-case">
              Select the appropriate word for each blank in the passage
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {fallbackOptions.map((term, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-xl bg-white border border-teal-300 text-teal-950 font-bold text-xs shadow-2xs"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. Reading Passage with Interactive Inline Dropdowns */}
      <div className="p-5 sm:p-7 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-200/80">
          <span className="uppercase tracking-wider font-black text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            Cloze Passage: Select Missing Words
          </span>
          <span className="text-teal-700 font-bold">
            {blanks.length} blanks • {completedCount} / {blanks.length} completed
          </span>
        </div>

        <div className="text-sm sm:text-base font-serif text-slate-900 leading-[2.2] sm:leading-[2.3] whitespace-pre-wrap max-w-[76ch]">
          {parsedContent || passage}
        </div>
      </div>
    </div>
  );
};
