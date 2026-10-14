import React from 'react';
import { Check } from 'lucide-react';

interface ChoiceRendererProps {
  options: Array<{ id: string; text: string } | string>;
  selectedAnswer: string | undefined;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
}

export const ChoiceRenderer: React.FC<ChoiceRendererProps> = ({
  options,
  selectedAnswer,
  onSelectAnswer,
  disabled = false
}) => {
  // Normalize options to { id, text }
  const normalizedOptions = React.useMemo(() => {
    return options.map((opt, idx) => {
      const letter = String.fromCharCode(65 + idx); // A, B, C, D
      if (typeof opt === 'string') {
        return { id: opt, text: opt, letter };
      }
      return {
        id: opt.id || opt.text || letter,
        text: opt.text || opt.id || '',
        letter
      };
    });
  }, [options]);

  return (
    <div className="w-full space-y-3 pt-2">
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
        {normalizedOptions.map((opt) => {
          const isSelected =
            selectedAnswer !== undefined &&
            (selectedAnswer === opt.id ||
              selectedAnswer === opt.text ||
              selectedAnswer.toLowerCase() === opt.letter.toLowerCase());

          return (
            <button
              key={opt.letter}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAnswer(opt.text || opt.id)}
              className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 flex items-center justify-between gap-3.5 min-h-[56px] cursor-pointer active:scale-[0.99] touch-manipulation ${
                isSelected
                  ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-800'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {opt.letter}
                </span>
                <span
                  className={`text-sm sm:text-base font-semibold leading-snug break-words ${
                    isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'
                  }`}
                >
                  {opt.text}
                </span>
              </div>

              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
