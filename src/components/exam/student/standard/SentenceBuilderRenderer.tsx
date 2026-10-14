import React from 'react';
import { ArrowUpDown, RotateCcw, X, Plus } from 'lucide-react';

interface SentenceBuilderRendererProps {
  // Scrambled word chips
  words: string[];
  // Selected tokens in order (string[] or string with words)
  currentAnswer: string[] | string | undefined;
  onAnswerChange: (orderedWords: string[]) => void;
  disabled?: boolean;
}

export const SentenceBuilderRenderer: React.FC<SentenceBuilderRendererProps> = ({
  words = [],
  currentAnswer,
  onAnswerChange,
  disabled = false
}) => {
  // Normalize selected array
  const selectedWords: string[] = React.useMemo(() => {
    if (Array.isArray(currentAnswer)) {
      return currentAnswer;
    }
    if (typeof currentAnswer === 'string' && currentAnswer.trim()) {
      return currentAnswer.trim().split(/\s+/);
    }
    return [];
  }, [currentAnswer]);

  // Track word occurrences to handle duplicate words in a sentence accurately
  // Available indices from words that haven't been selected yet
  const availableIndices = React.useMemo(() => {
    const usedIndices = new Set<number>();
    const selectedCopy = [...selectedWords];

    selectedCopy.forEach((selWord) => {
      const matchIdx = words.findIndex(
        (w, i) => !usedIndices.has(i) && w.toLowerCase() === selWord.toLowerCase()
      );
      if (matchIdx !== -1) {
        usedIndices.add(matchIdx);
      }
    });

    return words
      .map((w, i) => ({ word: w, index: i }))
      .filter((item) => !usedIndices.has(item.index));
  }, [words, selectedWords]);

  const handleTapWord = (word: string) => {
    if (disabled) return;
    const updated = [...selectedWords, word];
    onAnswerChange(updated);
  };

  const handleRemoveWord = (removeIdx: number) => {
    if (disabled) return;
    const updated = selectedWords.filter((_, i) => i !== removeIdx);
    onAnswerChange(updated);
  };

  const handleReset = () => {
    if (disabled) return;
    onAnswerChange([]);
  };

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Top instruction & Reset */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-between text-xs text-amber-950">
        <div className="flex items-center gap-2 font-bold">
          <ArrowUpDown className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Tap the words below to build the correct sentence:</span>
        </div>
        {selectedWords.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-bold text-amber-800 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Answer Area: Your Sentence */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border-2 border-indigo-200/80 shadow-2xs space-y-3 min-h-[110px] flex flex-col justify-center">
        <div className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
          Your Sentence:
        </div>

        {selectedWords.length === 0 ? (
          <div className="text-xs sm:text-sm text-slate-400 italic py-2">
            Tap words from the word bank below to place them here in order...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {selectedWords.map((word, idx) => (
              <button
                key={`sel-${idx}-${word}`}
                type="button"
                disabled={disabled}
                onClick={() => handleRemoveWord(idx)}
                className={`group inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm shadow-2xs hover:bg-rose-600 transition-all cursor-pointer active:scale-95 ${
                  disabled ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                title="Tap to remove"
              >
                <span>{word}</span>
                <X className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Word Bank: Available Words */}
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
          Available Words
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-2.5 items-center p-4 rounded-2xl bg-slate-50 border border-slate-200">
          {words.map((word, idx) => {
            // Check if this specific instance has been tapped
            const isRemaining = availableIndices.some((item) => item.index === idx);

            return (
              <button
                key={`word-${idx}-${word}`}
                type="button"
                disabled={disabled || !isRemaining}
                onClick={() => handleTapWord(word)}
                className={`px-3.5 py-2.5 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all duration-150 touch-manipulation flex items-center gap-1.5 shadow-2xs ${
                  isRemaining
                    ? 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer active:scale-95'
                    : 'bg-slate-200/50 text-slate-400 border-slate-200/50 cursor-not-allowed opacity-40'
                }`}
              >
                <span>{word}</span>
                {isRemaining && <Plus className="w-3 h-3 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
