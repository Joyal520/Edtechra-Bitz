// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: QUESTION NAVIGATOR
// Direct jump palette with status indicators (Current, Answered, Marked for Review)
// ============================================================================

import React, { useState } from 'react';
import { Bookmark, Check, X, Clock, FileEdit, CheckCircle2 } from 'lucide-react';
import { FlattenedExamQuestion } from '../shared/scoringUtilities';
import { QuestionAnswerStatus, QUESTION_STATUS_CONFIG } from '../shared/ExamStatus';
import { formatTime } from './ExamHeader';

interface QuestionNavigatorProps {
  questions: FlattenedExamQuestion[];
  currentIndex: number;
  answers: Record<string, any>;
  bookmarkedIds: Set<string>;
  onSelectIndex: (index: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
  timeRemainingSeconds?: number;
  onSubmitExam?: () => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  answers,
  bookmarkedIds,
  onSelectIndex,
  isOpen = true,
  onClose,
  timeRemainingSeconds,
  onSubmitExam
}) => {
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchText, setScratchText] = useState('');

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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col text-slate-900 [color-scheme:light]">
      {/* Navigator Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            Question Navigator
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">Jump directly to any question</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Countdown Timer Box (if provided) */}
      {timeRemainingSeconds !== undefined && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Time Left
          </span>
          <span className="font-mono font-black text-sm text-indigo-950">
            {formatTime(timeRemainingSeconds)}
          </span>
        </div>
      )}

      {/* Summary Stat Chips */}
      <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-bold">
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <div className="text-sm font-black">{answeredCount}</div>
          <div className="text-[9px] uppercase tracking-wider opacity-80">Answered</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
          <div className="text-sm font-black">{unansweredCount}</div>
          <div className="text-[9px] uppercase tracking-wider opacity-80">Remaining</div>
        </div>

        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <div className="text-sm font-black">{reviewCount}</div>
          <div className="text-[9px] uppercase tracking-wider opacity-80">Review</div>
        </div>
      </div>

      {/* Question Number Buttons Grid */}
      <div className="grid grid-cols-5 gap-1.5 max-h-60 overflow-y-auto pr-0.5">
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
              className={`relative h-9 rounded-xl border text-xs font-black transition-all flex items-center justify-center cursor-pointer active:scale-95 ${config.badgeClass}`}
              title={`Question ${idx + 1} (${config.label})`}
            >
              <span>{idx + 1}</span>

              {/* Status Icons Overlay */}
              {isAnswered && !isCurrent && (
                <Check className="w-2.5 h-2.5 absolute top-1 right-1 text-white" />
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
      <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <span>Current question</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          <span>Answered (saved)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Marked for review (🔖)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span>Unanswered</span>
        </div>
      </div>

      {/* Student Tools: Scratchpad */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={() => setShowScratchpad(!showScratchpad)}
          className="w-full py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <FileEdit className="w-3.5 h-3.5 text-slate-500" />
          <span>{showScratchpad ? 'Hide Scratchpad' : 'Open Scratchpad'}</span>
        </button>

        {showScratchpad && (
          <textarea
            rows={3}
            value={scratchText}
            onChange={(e) => setScratchText(e.target.value)}
            placeholder="Rough scratch notes for this exam..."
            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 resize-none leading-relaxed shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 animate-fadeIn"
          />
        )}
      </div>

      {/* Submit Exam Button */}
      {onSubmitExam && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onSubmitExam}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Submit Exam</span>
          </button>
        </div>
      )}
    </div>
  );
};
