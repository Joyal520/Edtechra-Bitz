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
    badgeClass: 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-400/50 shadow-xs font-black',
    iconClass: 'text-white'
  },
  answered: {
    status: 'answered',
    label: 'Answered',
    badgeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold',
    iconClass: 'text-white'
  },
  marked_for_review: {
    status: 'marked_for_review',
    label: 'Marked for Review',
    badgeClass: 'bg-amber-500 text-white border-amber-500 shadow-2xs font-black',
    iconClass: 'text-white'
  },
  unanswered: {
    status: 'unanswered',
    label: 'Unanswered',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-semibold',
    iconClass: 'text-slate-400'
  }
};
