// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: CLOZE PASSAGE RENDERER
// Interactive passage with embedded blanks, optional word bank, and progress
// ============================================================================

import React from 'react';
import { CanonicalQuestion, ClozePassageQuestion, ClozeBlank } from '../../shared/ExamSchema';

interface ClozeQuestionProps {
  question: CanonicalQuestion | ClozePassageQuestion | any;
  currentAnswer: Record<string, string> | any;
  onAnswerChange: (answer: Record<string, string>) => void;
}

export const ClozeQuestionComponent: React.FC<ClozeQuestionProps> = ({
  question,
  currentAnswer = {},
  onAnswerChange
}) => {
  const clozeQ = question as ClozePassageQuestion;
  const blanks: ClozeBlank[] = clozeQ.blanks || [];
  const wordBank: string[] = clozeQ.wordBank || [];

  const answers: Record<string, string> =
    typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};

  const handleBlankInput = (blankId: string, value: string) => {
    onAnswerChange({
      ...answers,
      [blankId]: value
    });
  };

  const completedCount = blanks.filter((b) => Boolean(answers[b.id]?.trim())).length;

  return (
    <div className="space-y-4 answer-area">
      {/* Optional Word Bank */}
      {wordBank.length > 0 && (
        <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-teal-950">
            <span>Word Bank</span>
            <span className="text-[10px] text-teal-700 font-semibold normal-case">
              Select or type the missing words
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {wordBank.map((term, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1 rounded-xl bg-white border border-teal-300 text-teal-950 font-bold text-xs shadow-2xs"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cloze Passage Text Box */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="uppercase tracking-wider font-black text-slate-900">
            Read the passage and complete each blank:
          </span>
          <span className="text-teal-700 font-bold">
            {blanks.length} blanks • {completedCount} / {blanks.length} completed
          </span>
        </div>

        <div className="text-sm font-serif text-slate-900 leading-[1.8] whitespace-pre-wrap max-w-[72ch]">
          {clozeQ.passage}
        </div>
      </div>

      {/* Interactive Answer Inputs Grid */}
      <div className="space-y-2.5 pt-1">
        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Complete Answers:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {blanks.map((b, bIdx) => (
            <div
              key={b.id || bIdx}
              className="p-3 rounded-xl border border-slate-200 bg-white flex items-center gap-2.5 shadow-2xs focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 flex items-center justify-center font-black text-xs shrink-0">
                [{bIdx + 1}]
              </div>
              <input
                type="text"
                value={answers[b.id] || ''}
                onChange={(e) => handleBlankInput(b.id, e.target.value)}
                placeholder={`Answer for blank [ ${bIdx + 1} ]...`}
                className="flex-1 px-2 py-1 text-xs font-semibold text-slate-900 bg-transparent focus:outline-hidden"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
