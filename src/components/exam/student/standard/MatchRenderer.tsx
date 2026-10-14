import React, { useState, useMemo } from 'react';
import { GitFork, Check, X, RotateCcw } from 'lucide-react';

export interface MatchingPairItem {
  id: string; // e.g. "match_1"
  left: string; // e.g. "write"
  right: string; // e.g. "wrote"
  marks?: number;
}

export interface MatchRendererProps {
  pairs: MatchingPairItem[];
  // Answers map containing pair.id or leftText -> selected rightText
  currentAnswers: Record<string, string>;
  onSelectPair: (pairId: string, leftText: string, rightText: string) => void;
  onClearPair: (pairId: string, leftText: string) => void;
  onResetAll: () => void;
  disabled?: boolean;
}

export const MatchRenderer: React.FC<MatchRendererProps> = ({
  pairs = [],
  currentAnswers = {},
  onSelectPair,
  onClearPair,
  onResetAll,
  disabled = false
}) => {
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);

  // Shuffled right options (deterministic shuffle across all pairs)
  const rightOptions = useMemo(() => {
    const rights = pairs.map((p) => p.right).filter(Boolean);
    // Deterministic shuffle based on character values
    return [...rights].sort((a, b) => {
      const codeA = (a.charCodeAt(0) * 17 + a.length * 3) % 100;
      const codeB = (b.charCodeAt(0) * 17 + b.length * 3) % 100;
      return codeA - codeB;
    });
  }, [pairs]);

  // Set of right items that have already been matched
  const matchedRights = useMemo(() => {
    const matched = new Set<string>();
    pairs.forEach((p) => {
      const ans = currentAnswers[p.id] || currentAnswers[p.left];
      if (ans) matched.add(ans);
    });
    return matched;
  }, [pairs, currentAnswers]);

  const handleSelectLeft = (pair: MatchingPairItem) => {
    if (disabled) return;
    if (selectedLeftId === pair.id) {
      setSelectedLeftId(null);
    } else {
      setSelectedLeftId(pair.id);
    }
  };

  const handleSelectRight = (rightText: string) => {
    if (disabled || !selectedLeftId) return;

    const currentPair = pairs.find((p) => p.id === selectedLeftId);
    if (!currentPair) return;

    onSelectPair(currentPair.id, currentPair.left, rightText);
    setSelectedLeftId(null);
  };

  const handleClearPair = (pair: MatchingPairItem) => {
    if (disabled) return;
    onClearPair(pair.id, pair.left);
    if (selectedLeftId === pair.id) {
      setSelectedLeftId(null);
    }
  };
  const handleRemovePair = handleClearPair;

  // Count of currently completed pairs
  const matchedCount = pairs.filter((p) => Boolean(currentAnswers[p.id] || currentAnswers[p.left])).length;

  return (
    <div className="w-full space-y-4 pt-1">
      {/* Top Banner / Instructions */}
      <div className="p-3.5 rounded-2xl bg-violet-50/90 border border-violet-200 flex items-center justify-between text-xs text-violet-950">
        <div className="flex items-center gap-2 font-bold">
          <GitFork className="w-4 h-4 text-violet-600 shrink-0" />
          <span>Tap an item in Column A, then tap its corresponding match in Column B:</span>
        </div>
        {matchedCount > 0 && !disabled && (
          <button
            type="button"
            onClick={onResetAll}
            className="text-[11px] font-bold text-violet-700 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-violet-100"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        )}
      </div>

      {/* Side-by-Side Matching Columns (Stacked gracefully on very narrow mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Column A (Terms) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Column A (Terms)
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {pairs.length} Items
            </span>
          </div>
          <div className="space-y-2">
            {pairs.map((p, idx) => {
              const isSelected = selectedLeftId === p.id;
              const matchedRight = currentAnswers[p.id] || currentAnswers[p.left];

              return (
                <div
                  key={`left-${p.id || idx}`}
                  onClick={() => handleSelectLeft(p)}
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

                  {matchedRight && !isSelected ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-violet-700 bg-violet-100/80 px-2 py-0.5 rounded-md truncate max-w-[110px]">
                        → {matchedRight}
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePair(p);
                          }}
                          className="p-1 rounded-lg text-violet-400 hover:text-rose-600 hover:bg-violet-100 transition-colors"
                          title="Remove pair"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column B (Matches) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Column B (Matches)
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {rightOptions.length} Matches
            </span>
          </div>
          <div className="space-y-2">
            {rightOptions.map((rightText, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isPaired = matchedRights.has(rightText);
              // Find which left pair this rightText is paired with
              const pairedPair = pairs.find((p) => {
                const ans = currentAnswers[p.id] || currentAnswers[p.left];
                return ans === rightText;
              });

              return (
                <button
                  key={`right-${idx}`}
                  type="button"
                  disabled={disabled || !selectedLeftId}
                  onClick={() => handleSelectRight(rightText)}
                  className={`w-full p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-2.5 min-h-[50px] touch-manipulation cursor-pointer ${
                    isPaired
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                      : selectedLeftId
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
                      {pairedPair && (
                        <span className="hidden sm:inline max-w-[90px] truncate text-[10px] text-emerald-600">
                          ({pairedPair.left})
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

      {/* Matched pairs counter summary */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-600">
          Matched: <span className="text-indigo-600 font-black">{matchedCount}</span> of {pairs.length} pairs
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          {matchedCount === pairs.length ? '✓ All pairs matched' : 'Tap item in A, then B'}
        </span>
      </div>
    </div>
  );
};
