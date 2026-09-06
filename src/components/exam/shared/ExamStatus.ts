// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM STATUS & BADGES
// ============================================================================

export type ExamLifecycleStatus = 'draft' | 'scheduled' | 'published' | 'active' | 'closed';

export type AttemptSessionStatus = 'in_progress' | 'submitted' | 'expired' | 'abandoned' | 'reviewed';

export type QuestionAnswerStatus = 'current' | 'answered' | 'unanswered' | 'marked_for_review';

export interface QuestionStatusMeta {
  status: QuestionAnswerStatus;
  label: string;
  badgeClass: string;
  iconClass: string;
}

export const QUESTION_STATUS_CONFIG: Record<QuestionAnswerStatus, QuestionStatusMeta> = {
  current: {
    status: 'current',
    label: 'Current',
    badgeClass: 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/40 shadow-md',
    iconClass: 'text-white'
  },
  answered: {
    status: 'answered',
    label: 'Answered',
    badgeClass: 'bg-emerald-600/90 text-white border-emerald-400/80 shadow-xs',
    iconClass: 'text-emerald-200'
  },
  marked_for_review: {
    status: 'marked_for_review',
    label: 'Marked for Review',
    badgeClass: 'bg-amber-500/90 text-slate-950 font-black border-amber-300 shadow-xs',
    iconClass: 'text-amber-950'
  },
  unanswered: {
    status: 'unanswered',
    label: 'Unanswered',
    badgeClass: 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:bg-slate-700/80 hover:text-white',
    iconClass: 'text-slate-500'
  }
};
