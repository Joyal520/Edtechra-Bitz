import React, { useState } from 'react';
import { GitFork, Check, X, RotateCcw } from 'lucide-react';

export interface MatchingPairItem {
  id?: string;
  left: string;
  right: string;
}

interface MatchRendererProps {
  pairs: MatchingPairItem[];
  // Map of left -> right
  currentAnswer: Record<string, string> | undefined;
  onAnswerChange: (answer: Record<string, string>) => void;
  disabled?: boolean;
}

export const MatchRenderer: React.FC<MatchRendererProps> = ({
  pairs = [],
  currentAnswer = {},
  onAnswerChange,
  disabled = false
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Stable shuffled right options (deterministic shuffle)
  const rightOptions = React.useMemo(() => {
    const rights = pairs.map((p) => p.right).filter(Boolean);
    // Shuffle deterministically based on character codes
    return [...rights].sort((a, b) => {
      const codeA = (a.charCodeAt(0) * 17 + a.length) % 100;
      const codeB = (b.charCodeAt(0) * 17 + b.length) % 100;
      return codeA - codeB;
    });
  }, [pairs]);

  // Which right items have already been paired
  const matchedRights = React.useMemo(() => {
    return new Set(Object.values(currentAnswer || {}));
  }, [currentAnswer]);

  const handleSelectLeft = (leftText: string) => {
    if (disabled) return;
    if (selectedLeft === leftText) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(leftText);
    }
  };

  const handleSelectRight = (rightText: string) => {
    if (disabled || !selectedLeft) return;

    // Check if rightText was paired with someone else; unlink if so
    const updated = { ...currentAnswer };
    for (const [l, r] of Object.entries(updated)) {
      if (r === rightText) {
        delete updated[l];
      }
    }

    updated[selectedLeft] = rightText;
    onAnswerChange(updated);
    setSelectedLeft(null);
  };

  const handleClearPair = (leftText: string) => {
    if (disabled) return;
    const updated = { ...currentAnswer };
    delete updated[leftText];
    onAnswerChange(updated);
    if (selectedLeft === leftText) {
      setSelectedLeft(null);
    }
  };

  const handleResetAll = () => {
    if (disabled) return;
    onAnswerChange({});
    setSelectedLeft(null);
  };

  const matchedCount = Object.keys(currentAnswer || {}).length;

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Instructions header */}
      <div className="p-3 rounded-2xl bg-violet-50/80 border border-violet-200/80 flex items-center justify-between text-xs text-violet-950">
        <div className="flex items-center gap-2 font-bold">
          <GitFork className="w-4 h-4 text-violet-600 shrink-0" />
          <span>Tap an item in Column A, then tap its match in Column B:</span>
        </div>
        {matchedCount > 0 && !disabled && (
          <button
            type="button"
            onClick={handleResetAll}
            className="text-[11px] font-bold text-violet-700 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Columns: side-by-side on sm screens, stacked on tiny mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Column A */}
        <div className="space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
            Column A (Terms)
          </div>
          <div className="space-y-2">
            {pairs.map((p, idx) => {
              const isSelected = selectedLeft === p.left;
              const matchedRight = currentAnswer?.[p.left];

              return (
                <div
                  key={`left-${idx}`}
                  onClick={() => handleSelectLeft(p.left)}
                  className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all flex items-center justify-between gap-2.5 min-h-[50px] touch-manipulation ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-600 ring-4 ring-violet-200 shadow-sm'
                      : matchedRight
                      ? 'bg-violet-50 text-violet-950 border-violet-300 shadow-2xs'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white text-violet-700'
                          : matchedRight
                          ? 'bg-violet-200 text-violet-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {p.left}
                    </span>
                  </div>

                  {matchedRight && !isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearPair(p.left);
                      }}
                      className="p-1 rounded-lg text-violet-400 hover:text-rose-600 hover:bg-violet-100/60 transition-colors"
                      title="Remove match"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column B */}
        <div className="space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
            Column B (Matches)
          </div>
          <div className="space-y-2">
            {rightOptions.map((rightText, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isPaired = matchedRights.has(rightText);
              // Find which left it is paired with
              const pairedLeft = Object.entries(currentAnswer || {}).find(
                ([, r]) => r === rightText
              )?.[0];

              return (
                <button
                  key={`right-${idx}`}
                  type="button"
                  disabled={disabled || !selectedLeft}
                  onClick={() => handleSelectRight(rightText)}
                  className={`w-full p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-2.5 min-h-[50px] touch-manipulation cursor-pointer ${
                    isPaired
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                      : selectedLeft
                      ? 'bg-white border-violet-300 text-slate-800 hover:bg-violet-50/60 ring-2 ring-violet-100'
                      : 'bg-white border-slate-200 text-slate-700 opacity-80'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                        isPaired
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {rightText}
                    </span>
                  </div>

                  {isPaired && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      {pairedLeft && (
                        <span className="hidden sm:inline max-w-[80px] truncate text-[10px] text-emerald-600">
                          ({pairedLeft})
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active matched pairs summary */}
      {matchedCount > 0 && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
          <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
            Current Pairs ({matchedCount}/{pairs.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(currentAnswer || {}).map(([l, r]) => (
              <span
                key={l}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-xs shadow-2xs"
              >
                <span className="font-bold text-violet-700">{l}</span>
                <span className="text-slate-400">↔</span>
                <span className="font-bold text-emerald-700">{r}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleClearPair(l)}
                    className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
