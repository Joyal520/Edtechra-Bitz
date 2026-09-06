// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: REORDER QUESTION RENDERER
// Interactive sequencing cards with Up / Down rearrangement controls
// ============================================================================

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ReorderItem, ReorderQuestion } from '../../shared/ExamSchema';

interface ReorderQuestionProps {
  question: ReorderQuestion;
  currentAnswer: string[] | undefined; // Ordered array of item IDs
  onAnswerChange: (order: string[]) => void;
}

export const ReorderQuestionComponent: React.FC<ReorderQuestionProps> = ({
  question,
  currentAnswer,
  onAnswerChange
}) => {
  const items = question.items || [];

  // If student hasn't rearranged yet, initialize with default items list
  const currentOrder = React.useMemo(() => {
    if (Array.isArray(currentAnswer) && currentAnswer.length === items.length) {
      return currentAnswer;
    }
    return items.map(i => i.id);
  }, [currentAnswer, items]);

  const orderedItems: ReorderItem[] = React.useMemo(() => {
    const map = new Map(items.map(i => [i.id, i]));
    return currentOrder.map(id => map.get(id) || { id, text: id });
  }, [currentOrder, items]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= currentOrder.length) return;

    const nextOrder = [...currentOrder];
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[target];
    nextOrder[target] = temp;

    onAnswerChange(nextOrder);
  };

  return (
    <div className="space-y-3 pt-2 max-w-2xl mx-auto">
      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 pb-1">
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span>Use the arrow buttons to arrange these items in the correct order:</span>
      </div>

      <div className="space-y-2.5">
        {orderedItems.map((item, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === orderedItems.length - 1;

          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#0b142c] border border-blue-800/80 shadow-xs hover:border-amber-500/50 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-white leading-snug">
                  {item.text}
                </span>
              </div>

              {/* Rearrange Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => handleMove(idx, 'up')}
                  className="p-2 rounded-xl bg-[#070e1f] text-slate-300 hover:text-white hover:bg-blue-900/60 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                  title="Move Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => handleMove(idx, 'down')}
                  className="p-2 rounded-xl bg-[#070e1f] text-slate-300 hover:text-white hover:bg-blue-900/60 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                  title="Move Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
