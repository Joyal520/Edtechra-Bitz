// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: PUBLISH VALIDATION MODAL
// Pre-flight assessment check: answer keys, marks, empty options, and publish execution
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  Calendar,
  ArrowRight,
  Save
} from 'lucide-react';
import {
  CanonicalAssessmentV2,
  MultipleChoiceQuestion
} from '../../shared/ExamSchema';

interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  questionId?: string;
  sectionId?: string;
}

interface PublishValidationModalProps {
  isOpen: boolean;
  assessment: CanonicalAssessmentV2;
  onClose: () => void;
  onSelectQuestion: (questionId: string) => void;
  onConfirmPublish: (publishSettings: { startsAt?: string; endsAt?: string }) => void;
  onSaveDraft: () => void;
}

export const PublishValidationModal: React.FC<PublishValidationModalProps> = ({
  isOpen,
  assessment,
  onClose,
  onSelectQuestion,
  onConfirmPublish,
  onSaveDraft
}) => {
  const [startsAt, setStartsAt] = useState<string>(assessment.exam.startsAt || '');
  const [endsAt, setEndsAt] = useState<string>(assessment.exam.endsAt || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSurvey = assessment.assessmentType === 'survey';

  // Run comprehensive validation
  const validationIssues = useMemo(() => {
    const issues: ValidationError[] = [];

    const sections = assessment.sections || [];
    const allQuestions = sections.flatMap((s) => s.questions || []);

    // 1. Check if there are any questions
    if (allQuestions.length === 0) {
      issues.push({
        type: 'error',
        message: 'The assessment must contain at least 1 question.'
      });
      return issues;
    }

    // 2. Check title
    if (!assessment.exam.title?.trim()) {
      issues.push({
        type: 'warning',
        message: 'Assessment title is currently empty.'
      });
    }

    // 3. Check each section
    sections.forEach((sec, idx) => {
      if (!sec.questions || sec.questions.length === 0) {
        issues.push({
          type: 'warning',
          message: `Section ${idx + 1} ("${sec.title || 'Untitled'}") has no questions.`,
          sectionId: sec.id
        });
      }
    });

    // 4. Check questions
    allQuestions.forEach((q, idx) => {
      const qNum = idx + 1;

      // Question prompt
      if (!q.question || !q.question.trim()) {
        issues.push({
          type: 'error',
          message: `Question #${qNum} is missing a question prompt text.`,
          questionId: q.id
        });
      }

      // Choice validation
      if (['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type)) {
        const choiceQ = q as MultipleChoiceQuestion;
        const opts = choiceQ.options || [];

        if (opts.length < 2) {
          issues.push({
            type: 'error',
            message: `Question #${qNum} must have at least 2 options.`,
            questionId: q.id
          });
        }

        if (opts.some((o) => !o.text || !o.text.trim())) {
          issues.push({
            type: 'error',
            message: `Question #${qNum} contains empty option choices.`,
            questionId: q.id
          });
        }

        // In Exam mode, check for answer key
        if (!isSurvey) {
          const correct = choiceQ.correctAnswer;
          const hasAnswerKey = Array.isArray(correct) ? correct.length > 0 : Boolean(correct);
          if (!hasAnswerKey) {
            issues.push({
              type: 'error',
              message: `Question #${qNum} has no correct answer key selected.`,
              questionId: q.id
            });
          }
        }
      }

      // Marks validation in Exam mode
      if (!isSurvey) {
        if (q.marks === undefined || q.marks <= 0) {
          issues.push({
            type: 'warning',
            message: `Question #${qNum} has 0 marks allocated.`,
            questionId: q.id
          });
        }
      }
    });

    return issues;
  }, [assessment, isSurvey]);

  if (!isOpen) return null;

  const errors = validationIssues.filter((i) => i.type === 'error');
  const warnings = validationIssues.filter((i) => i.type === 'warning');
  const hasBlockingErrors = errors.length > 0;

  const totalQuestions = assessment.sections.reduce(
    (acc, s) => acc + (s.questions?.length || 0),
    0
  );
  const totalMarks = assessment.sections.reduce(
    (acc, s) => acc + (s.questions?.reduce((qAcc, q) => qAcc + (q.marks || 1), 0) || 0),
    0
  );

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmPublish({
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border ${
                hasBlockingErrors
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}
            >
              {hasBlockingErrors ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {hasBlockingErrors
                  ? 'Validation Issues Detected'
                  : isSurvey
                  ? 'Ready to Publish Survey'
                  : 'Ready to Publish Exam'}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                {hasBlockingErrors
                  ? 'Resolve critical issues before releasing to students'
                  : 'Verify publication settings and launch'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-white">
          {/* Summary Stat Card */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Mode</span>
              <p className="text-xs font-black text-indigo-600 capitalize">
                {assessment.assessmentType}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Questions</span>
              <p className="text-xs font-black text-slate-900">{totalQuestions}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                {isSurvey ? 'Estimated Time' : 'Total Marks'}
              </span>
              <p className="text-xs font-black text-emerald-600">
                {isSurvey ? `~${Math.ceil(totalQuestions * 0.75)} mins` : `${totalMarks} pts`}
              </p>
            </div>
          </div>

          {/* Validation Checklist / Errors List */}
          {hasBlockingErrors && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Errors to Fix ({errors.length})</span>
              </span>
              <div className="space-y-1.5">
                {errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-900 font-medium"
                  >
                    <span>{err.message}</span>
                    {err.questionId && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectQuestion(err.questionId!);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-lg ml-2 flex-shrink-0 transition-colors"
                      >
                        <span>Fix</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings List */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Warnings ({warnings.length})</span>
              </span>
              <div className="space-y-1.5">
                {warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 font-medium"
                  >
                    <span>{w.message}</span>
                    {w.questionId && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectQuestion(w.questionId!);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg ml-2 flex-shrink-0 transition-colors"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publishing Schedule (StartsAt / Deadline) */}
          {!hasBlockingErrors && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Schedule & Deadlines (Optional)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-bold uppercase tracking-wider">Available From</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-700 font-bold uppercase tracking-wider">Due / Deadline</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onSaveDraft}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>Save Draft</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={hasBlockingErrors || isSubmitting}
              onClick={handlePublish}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish to Classroom'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
