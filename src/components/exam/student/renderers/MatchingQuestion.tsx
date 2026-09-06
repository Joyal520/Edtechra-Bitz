// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: MATCHING QUESTION RENDERER
// Interactive click-to-pair column interface
// ============================================================================

import React, { useState } from 'react';
import { GitFork, X, RotateCcw } from 'lucide-react';
import { MatchingQuestion } from '../../shared/ExamSchema';

interface MatchingQuestionProps {
  question: MatchingQuestion;
  currentAnswer: Record<string, string> | undefined; // left -> right
  onAnswerChange: (answer: Record<string, string>) => void;
}

export const MatchingQuestionComponent: React.FC<MatchingQuestionProps> = ({
  question,
  currentAnswer = {},
  onAnswerChange
}) => {
  const pairs = question.pairs || [];
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Derive shuffled right-side options once so they don't jump around on click
  const rightOptions = React.useMemo(() => {
    const rights = pairs.map(p => p.right).filter(Boolean);
    // Deterministic pseudo-shuffle based on question ID
    return [...rights].sort((a, b) => (a.charCodeAt(0) % 3) - (b.charCodeAt(0) % 3));
  }, [pairs]);

  const handleSelectLeft = (leftText: string) => {
    if (selectedLeft === leftText) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(leftText);
    }
  };

  const handleSelectRight = (rightText: string) => {
    if (!selectedLeft) return;
    const updated = { ...currentAnswer, [selectedLeft]: rightText };
    onAnswerChange(updated);
    setSelectedLeft(null);
  };

  const handleClearPair = (leftText: string) => {
    const updated = { ...currentAnswer };
    delete updated[leftText];
    onAnswerChange(updated);
  };

  const handleResetAll = () => {
    onAnswerChange({});
    setSelectedLeft(null);
  };

  const matchedCount = Object.keys(currentAnswer).length;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between text-xs text-indigo-200">
        <span className="font-bold flex items-center gap-1.5">
          <GitFork className="w-4 h-4 text-violet-400" />
          Click an item on the left, then click its matching match on the right:
        </span>

        {matchedCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Pairs</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column (Items) */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
            Column A (Terms)
          </div>
          {pairs.map((p, idx) => {
            const isSelected = selectedLeft === p.left;
            const currentMatch = currentAnswer[p.left];

            return (
              <div
                key={idx}
                onClick={() => handleSelectLeft(p.left)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-violet-600 text-white border-violet-400 ring-4 ring-violet-400/30 shadow-lg'
                    : currentMatch
                    ? 'bg-[#121a38] text-white border-violet-500/50 shadow-xs'
                    : 'bg-[#0b142c] text-slate-200 border-blue-800/60 hover:bg-[#132047] hover:border-violet-500/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-[#070e1f] text-violet-300 border border-blue-900 flex items-center justify-center font-black text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{p.left}</div>
                    {currentMatch && (
                      <div className="text-[11px] text-violet-300 font-medium truncate mt-0.5">
                        Matched with: <strong className="text-white">{currentMatch}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {currentMatch && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearPair(p.left);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer transition-all shrink-0"
                    title="Remove match"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column (Matches) */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
            Column B (Matches)
          </div>
          {rightOptions.map((rightText, rIdx) => {
            const isClaimedBy = Object.entries(currentAnswer).find(([_, r]) => r === rightText)?.[0];

            return (
              <button
                key={rIdx}
                type="button"
                onClick={() => handleSelectRight(rightText)}
                className={`w-full p-4 rounded-2xl border text-left cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 ${
                  selectedLeft
                    ? 'hover:border-violet-400 hover:bg-violet-950/40 active:scale-[0.98]'
                    : ''
                } ${
                  isClaimedBy
                    ? 'bg-violet-950/50 text-violet-200 border-violet-500/50'
                    : 'bg-[#0b142c] text-slate-200 border-blue-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[#070e1f] text-slate-400 border border-blue-900 flex items-center justify-center font-black text-xs shrink-0">
                    {String.fromCharCode(65 + rIdx)}
                  </span>
                  <span className="text-sm font-semibold leading-snug">{rightText}</span>
                </div>

                {isClaimedBy && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/30 text-violet-200 border border-violet-400/40 shrink-0">
                    Linked
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
