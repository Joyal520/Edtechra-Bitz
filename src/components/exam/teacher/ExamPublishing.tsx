// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM PUBLISHING (STEP 8)
// Runs comprehensive checklist and safely deploys exam to classroom(s)
// ============================================================================

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Calendar,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { CanonicalExamV1 } from '../shared/ExamSchema';
import {
  calculateExamTotalMarks,
  calculateTotalQuestionCount
} from '../shared/scoringUtilities';

interface ExamPublishingProps {
  exam: CanonicalExamV1;
  classroomId: string;
  isPublishing: boolean;
  onPublish: (settings: { startsAt?: string; endsAt?: string }) => void;
  onPreviewAsStudent: () => void;
  onBackToPreview: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
  severity: 'error' | 'warning';
}

export const ExamPublishing: React.FC<ExamPublishingProps> = ({
  exam,
  classroomId: _classroomId,
  isPublishing,
  onPublish,
  onPreviewAsStudent,
  onBackToPreview
}) => {
  const [startsAt, setStartsAt] = useState(exam.exam.startsAt || '');
  const [endsAt, setEndsAt] = useState(exam.exam.endsAt || '');

  const totalMarks = calculateExamTotalMarks(exam.sections);
  const totalQuestions = calculateTotalQuestionCount(exam.sections);

  // Run publishing validation checklist
  const checklist: ChecklistItem[] = React.useMemo(() => {
    const items: ChecklistItem[] = [];

    // 1. Exam Title
    items.push({
      id: 'title',
      label: 'Exam Title Specified',
      passed: Boolean(exam.exam.title?.trim()),
      detail: exam.exam.title || 'Missing title',
      severity: 'error'
    });

    // 2. Questions Exist
    items.push({
      id: 'has_questions',
      label: 'Questions Configured',
      passed: totalQuestions > 0,
      detail: `${totalQuestions} question(s) found across ${exam.sections.length} section(s)`,
      severity: 'error'
    });

    // 3. Duration Configured
    items.push({
      id: 'duration',
      label: 'Exam Duration Set',
      passed: Number(exam.exam.durationMinutes) > 0,
      detail: `${exam.exam.durationMinutes || 0} minutes`,
      severity: 'error'
    });

    // 4. Total Marks Calculated
    items.push({
      id: 'marks',
      label: 'Total Marks Calculated',
      passed: totalMarks > 0,
      detail: `${totalMarks} total marks`,
      severity: 'error'
    });

    // 5. Pass Percentage Valid
    items.push({
      id: 'pass_mark',
      label: 'Pass Benchmark Configured',
      passed: Number(exam.exam.passPercentage) > 0 && Number(exam.exam.passPercentage) <= 100,
      detail: `${exam.exam.passPercentage}% (${Math.ceil((totalMarks * (exam.exam.passPercentage || 40)) / 100)} marks)`,
      severity: 'error'
    });

    // 6. Question ID Uniqueness & Correct Answer Integrity
    let duplicateIds = false;
    let missingCorrectAnswer = false;
    const seenIds = new Set<string>();

    exam.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        if (seenIds.has(q.id)) duplicateIds = true;
        seenIds.add(q.id);

        if (q.type === 'multiple_choice' || q.type === 'multiple_select') {
          if (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)) {
            missingCorrectAnswer = true;
          }
        }
      });
    });

    items.push({
      id: 'unique_ids',
      label: 'No Duplicate Question IDs',
      passed: !duplicateIds,
      detail: duplicateIds ? 'Duplicate question IDs found' : 'All question IDs are unique',
      severity: 'error'
    });

    items.push({
      id: 'correct_answers',
      label: 'Answer Keys Configured',
      passed: !missingCorrectAnswer,
      detail: missingCorrectAnswer ? 'One or more objective questions are missing answers' : 'All objective questions have answer keys',
      severity: 'error'
    });

    // 7. Instructions present (Warning)
    items.push({
      id: 'instructions',
      label: 'Student Instructions Provided',
      passed: Boolean(exam.exam.instructions?.trim() || exam.exam.description?.trim()),
      detail: exam.exam.instructions || exam.exam.description ? 'Configured' : 'Recommended for student clarity',
      severity: 'warning'
    });

    return items;
  }, [exam, totalMarks, totalQuestions]);

  const hasBlockingErrors = checklist.some(item => item.severity === 'error' && !item.passed);

  const handleConfirmPublish = () => {
    if (hasBlockingErrors || isPublishing) return;
    onPublish({
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-indigo-950/60 to-blue-950/70 p-6 rounded-3xl border border-emerald-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-300 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">Step 8: Publishing Validation Checklist</h3>
            <p className="text-xs text-emerald-200/80 leading-relaxed max-w-xl">
              Verify your assessment integrity before deploying to students. EdTechra verifies answer completeness, timer configurations, and schema rules.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPreviewAsStudent}
          className="px-5 py-3 rounded-2xl bg-[#091124] hover:bg-blue-900/60 border border-blue-700/60 text-indigo-300 hover:text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <Eye className="w-4 h-4 text-indigo-400" />
          <span>Preview as Student</span>
        </button>
      </div>

      {/* Validation Checklist Grid */}
      <div className="bg-[#0f1b3d] p-6 rounded-3xl border border-blue-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            Integrity Checklist ({checklist.filter(c => c.passed).length} / {checklist.length} Passed)
          </h4>
          {hasBlockingErrors && (
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              Fix errors before publishing
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                item.passed
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : item.severity === 'error'
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : item.severity === 'error' ? (
                  <XCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black text-white">{item.label}</div>
                {item.detail && <div className="text-[11px] opacity-80">{item.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Release Window */}
      <div className="bg-[#0f1b3d] p-6 rounded-3xl border border-blue-800/80 space-y-4">
        <h4 className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          Schedule Assessment Availability Window <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          If specified, students can only start the exam within this time window. Once started, the {exam.exam.durationMinutes}-minute countdown timer begins.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Opens At (Students can begin)</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Closes At (Hard deadline)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#091124] border border-blue-800/70 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 rounded-3xl bg-[#091124] border border-blue-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToPreview}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-blue-800/70 text-slate-300 hover:text-white hover:bg-blue-900/40 text-xs font-black cursor-pointer transition-all"
        >
          Back to Exam Preview
        </button>

        <div className="w-full sm:w-auto flex items-center gap-3">
          <button
            type="button"
            disabled={hasBlockingErrors || isPublishing}
            onClick={handleConfirmPublish}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing Exam to Classroom...' : 'Confirm & Publish Exam Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
