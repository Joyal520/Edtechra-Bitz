import React from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';

export interface ClozeBlankDefinition {
  id: string; // e.g. "blank_1"
  questionId?: string; // e.g. "cloze_1"
  options: string[];
  correctAnswer?: string;
  marks?: number;
}

export interface ClozeDropdownRendererProps {
  passage: string;
  // Blanks array containing each individual blank's question metadata and its own options array
  blanks: ClozeBlankDefinition[];
  // Answers map containing blankId or questionId -> selected string
  currentAnswers: Record<string, string>;
  onSelectBlank: (blankId: string, questionId: string | undefined, selectedValue: string) => void;
  disabled?: boolean;
}

export const ClozeDropdownRenderer: React.FC<ClozeDropdownRendererProps> = ({
  passage,
  blanks = [],
  currentAnswers = {},
  onSelectBlank,
  disabled = false
}) => {
  // Regex matches [blank_1], [blank-1], [blank1], [1], [went v], ____
  const blankRegex = /(\[blank[_-]?[a-zA-Z0-9]+\]|\[\s*\d+\s*\]|_{3,})/gi;

  const renderedPassage = React.useMemo(() => {
    if (!passage) return null;

    const parts = passage.split(blankRegex);
    let counter = 0;

    return parts.map((part, idx) => {
      if (!part) return null;

      const isBlank = blankRegex.test(part);
      blankRegex.lastIndex = 0;

      if (!isBlank) {
        return (
          <span key={`text-${idx}`} className="text-slate-800 leading-loose">
            {part}
          </span>
        );
      }

      const blankIndex = counter++;
      const cleanKey = part.replace(/[\[\]\s_]/g, '').toLowerCase();

      // Find corresponding blank object strictly by ID, cleanKey, or index
      const matchedBlank =
        blanks.find((b) => {
          const bId = (b.id || '').toLowerCase().replace(/[\[\]\s_]/g, '');
          return bId === cleanKey || b.id.toLowerCase() === `blank_${cleanKey}`;
        }) ||
        blanks.find((b) => b.questionId?.toLowerCase() === cleanKey) ||
        blanks[blankIndex] ||
        blanks[0];

      const blankKey = matchedBlank?.id || `blank_${blankIndex + 1}`;
      const questionId = matchedBlank?.questionId;
      // DYNAMIC OPTIONS: strictly uses this blank's own question object options
      const blankOptions = matchedBlank?.options?.length ? matchedBlank.options : [];

      const rawVal =
        currentAnswers[blankKey] ||
        (questionId ? currentAnswers[questionId] : '') ||
        '';
      const selectedValue = typeof rawVal === 'string' ? rawVal : '';

      return (
        <span
          key={`blank-${blankKey}-${idx}`}
          className="inline-block mx-1.5 my-1 align-middle transition-all"
        >
          <div className="relative inline-block">
            <select
              value={selectedValue}
              disabled={disabled}
              onChange={(e) => onSelectBlank(blankKey, questionId, e.target.value)}
              className={`appearance-none py-1.5 pl-3 pr-8 rounded-xl text-xs sm:text-sm font-bold border-2 cursor-pointer transition-all shadow-2xs ${
                selectedValue
                  ? 'bg-teal-50 border-teal-500 text-teal-950 font-black'
                  : 'bg-white border-slate-300 hover:border-teal-400 text-slate-700'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">[ Choose... ]</option>
              {blankOptions.map((opt, oIdx) => (
                <option key={oIdx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
        </span>
      );
    });
  }, [passage, blanks, currentAnswers, disabled, onSelectBlank]);

  // Answered blanks count
  const completedCount = blanks.filter(
    (b) => Boolean(currentAnswers[b.id] || (b.questionId && currentAnswers[b.questionId]))
  ).length;

  return (
    <div className="w-full space-y-4 pt-1">
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span className="uppercase tracking-wider">Cloze Passage — Continuous Context:</span>
          </div>
          <div className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
            {completedCount}/{blanks.length} Blanks Filled
          </div>
        </div>

        <div className="text-sm sm:text-base leading-loose font-medium text-slate-900">
          {renderedPassage || passage}
        </div>
      </div>
    </div>
  );
};
