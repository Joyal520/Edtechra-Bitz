// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: QUESTION NAVIGATOR
// Direct jump palette with status indicators (Current, Answered, Marked for Review)
// ============================================================================

import React from 'react';
import { Bookmark, Check, X } from 'lucide-react';
import { FlattenedExamQuestion } from '../shared/scoringUtilities';
import { QuestionAnswerStatus, QUESTION_STATUS_CONFIG } from '../shared/ExamStatus';

interface QuestionNavigatorProps {
  questions: FlattenedExamQuestion[];
  currentIndex: number;
  answers: Record<string, any>;
  bookmarkedIds: Set<string>;
  onSelectIndex: (index: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  answers,
  bookmarkedIds,
  onSelectIndex,
  isOpen = true,
  onClose
}) => {
  if (!isOpen) return null;

  const total = questions.length;

  // Compute status for each question
  const getStatus = (q: FlattenedExamQuestion, idx: number): QuestionAnswerStatus => {
    if (idx === currentIndex) return 'current';
    if (bookmarkedIds.has(q.question.id)) return 'marked_for_review';
    const ans = answers[q.question.id];
    if (ans !== undefined && ans !== null && String(ans).trim().length > 0) {
      if (Array.isArray(ans) && ans.length === 0) return 'unanswered';
      return 'answered';
    }
    return 'unanswered';
  };

  const answeredCount = questions.filter((q) => {
    const ans = answers[q.question.id];
    return ans !== undefined && ans !== null && String(ans).trim().length > 0 && !(Array.isArray(ans) && ans.length === 0);
  }).length;

  const reviewCount = bookmarkedIds.size;
  const unansweredCount = total - answeredCount;

  return (
    <div className="bg-[#0b142c] border border-blue-800/80 rounded-3xl p-5 shadow-xl space-y-5 flex flex-col">
      {/* Navigator Header */}
      <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            Question Navigator
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">Jump directly to any question</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-blue-900/40 md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary Stat Chips */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
          <div className="text-sm font-black">{answeredCount}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">Answered</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-300">
          <div className="text-sm font-black">{unansweredCount}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">Remaining</div>
        </div>

        <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300">
          <div className="text-sm font-black">{reviewCount}</div>
          <div className="text-[10px] uppercase tracking-wider opacity-80">Review</div>
        </div>
      </div>

      {/* Question Number Buttons Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const status = getStatus(q, idx);
          const config = QUESTION_STATUS_CONFIG[status];
          const isCurrent = idx === currentIndex;
          const isMarked = bookmarkedIds.has(q.question.id);
          const isAnswered = status === 'answered';

          return (
            <button
              key={q.question.id}
              type="button"
              onClick={() => {
                onSelectIndex(idx);
                if (onClose && window.innerWidth < 768) onClose();
              }}
              className={`relative h-10 rounded-2xl border text-xs font-black transition-all flex items-center justify-center cursor-pointer active:scale-95 ${config.badgeClass}`}
              title={`Question ${idx + 1} (${config.label})`}
            >
              <span>{idx + 1}</span>

              {/* Status Icons Overlay */}
              {isAnswered && !isCurrent && (
                <Check className="w-2.5 h-2.5 absolute top-1 right-1 text-emerald-300" />
              )}
              {isMarked && (
                <span className="absolute -top-1 -right-1 text-[10px]" title="Marked for review">
                  🔖
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="pt-2 border-t border-blue-900/60 space-y-1 text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Current question</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Answered (saved)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Marked for review (🔖)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span>Unanswered</span>
        </div>
      </div>
    </div>
  );
};
