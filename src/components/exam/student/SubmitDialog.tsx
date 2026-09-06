// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: SUBMIT CONFIRMATION DIALOG
// Clear summary of answered, unanswered, and flagged questions before final submission
// ============================================================================

import React from 'react';
import { CheckCircle2, AlertTriangle, Send } from 'lucide-react';

interface SubmitDialogProps {
  isOpen: boolean;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  markedForReviewCount: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
}

export const SubmitDialog: React.FC<SubmitDialogProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  unansweredCount,
  markedForReviewCount,
  isSubmitting,
  onClose,
  onConfirmSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b142c] border border-blue-800/90 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-6 text-white text-center">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
          <Send className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">Ready to Submit Exam?</h3>
          <p className="text-xs text-slate-400">
            {totalQuestions} total questions. Once submitted, your answers are finalized and graded.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-2">
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-0.5">
            <div className="text-xl font-black text-emerald-300">{answeredCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Answered</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-0.5">
            <div className="text-xl font-black text-slate-300">{unansweredCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unanswered</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-0.5">
            <div className="text-xl font-black text-amber-300">{markedForReviewCount}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Review</div>
          </div>
        </div>

        {/* Warning Notice if unanswered */}
        {unansweredCount > 0 && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>You still have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl border border-blue-800/80 text-slate-300 hover:text-white hover:bg-blue-900/40 text-xs font-black cursor-pointer transition-all"
          >
            Return to Exam
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirmSubmit}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Yes, Submit Exam'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
