import React from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';

export interface ClozeBlankDefinition {
  id: string; // e.g. "blank_1" or "1"
  options: string[];
  correctAnswer: string;
  marks?: number;
}

interface ClozeDropdownRendererProps {
  passage: string;
  // Options for this particular blank if single-blank question
  options?: string[];
  // If multiple blanks exist in passage
  blanks?: ClozeBlankDefinition[];
  // Active blank ID / index (e.g. "blank_1" or 0)
  activeBlankId?: string;
  // Current student answer for this blank (string) or map of all blanks
  currentAnswer: string | Record<string, string> | undefined;
  onAnswerChange: (answer: string | Record<string, string>) => void;
  disabled?: boolean;
}

export const ClozeDropdownRenderer: React.FC<ClozeDropdownRendererProps> = ({
  passage,
  options = [],
  blanks = [],
  activeBlankId,
  currentAnswer,
  onAnswerChange,
  disabled = false
}) => {
  // Extract answers map
  const answersMap: Record<string, string> = React.useMemo(() => {
    if (typeof currentAnswer === 'object' && currentAnswer !== null) {
      return currentAnswer;
    }
    if (typeof currentAnswer === 'string' && activeBlankId) {
      return { [activeBlankId]: currentAnswer };
    }
    if (typeof currentAnswer === 'string') {
      return { blank_1: currentAnswer };
    }
    return {};
  }, [currentAnswer, activeBlankId]);

  const handleSelectValue = (blankKey: string, val: string) => {
    if (disabled) return;
    if (typeof currentAnswer === 'string' && (!activeBlankId || activeBlankId === blankKey)) {
      onAnswerChange(val);
    } else {
      const updated = { ...answersMap, [blankKey]: val };
      // If parent expects a single string for this question
      if (activeBlankId === blankKey) {
        onAnswerChange(val);
      } else {
        onAnswerChange(updated);
      }
    }
  };

  // Split passage into text segments and embedded blank markers
  // Matches: [blank_1], [blank_2], [blank-1], [1], [went v], etc.
  const renderedPassage = React.useMemo(() => {
    if (!passage) return null;

    const blankRegex = /(\[blank[_-]?[a-zA-Z0-9]+\]|\[\s*\d+\s*\])/gi;
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
      const cleanKey = part.replace(/[\[\]\s]/g, '').toLowerCase();
      // Match with blanks array or use fallback options
      const matchedBlank =
        blanks.find(
          (b) =>
            b.id.toLowerCase() === cleanKey ||
            b.id.toLowerCase() === `blank_${cleanKey}` ||
            b.id.toLowerCase() === `blank_${blankIndex + 1}`
        ) || blanks[blankIndex];

      const blankKey = matchedBlank?.id || `blank_${blankIndex + 1}`;
      const blankOptions = matchedBlank?.options?.length ? matchedBlank.options : options;
      const selectedValue = answersMap[blankKey] || (activeBlankId === blankKey && typeof currentAnswer === 'string' ? currentAnswer : '');
      const isActive = activeBlankId ? activeBlankId === blankKey || activeBlankId === cleanKey : blankIndex === 0;

      return (
        <span
          key={`blank-${blankKey}-${idx}`}
          className={`inline-block mx-1.5 my-1 align-middle transition-all ${
            isActive ? 'ring-2 ring-indigo-500 rounded-xl' : ''
          }`}
        >
          <div className="relative inline-block">
            <select
              value={selectedValue}
              disabled={disabled}
              onChange={(e) => handleSelectValue(blankKey, e.target.value)}
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
  }, [passage, blanks, options, answersMap, activeBlankId, currentAnswer, disabled]);

  return (
    <div className="w-full space-y-4 pt-2">
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-100">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>Cloze Passage — Select the correct word for each blank:</span>
        </div>

        <div className="text-sm sm:text-base leading-loose font-medium text-slate-900">
          {renderedPassage || passage}
        </div>
      </div>
    </div>
  );
};
