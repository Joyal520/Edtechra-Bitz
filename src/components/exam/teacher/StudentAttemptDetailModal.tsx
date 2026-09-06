// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: STUDENT ATTEMPT DETAIL & MANUAL GRADING
// Detailed question-by-question student review with subjective grading inputs
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  User,
  Save,
  MessageSquare
} from 'lucide-react';
import { CanonicalExamV1 } from '../shared/ExamSchema';

interface StudentAttemptDetailModalProps {
  isOpen: boolean;
  studentResult: any;
  exam: CanonicalExamV1 | any;
  onClose: () => void;
  onSaveManualGrade: (resultId: string, subjectiveScores: Record<string, number>, subjectiveFeedbacks: Record<string, string>, generalFeedback?: string) => Promise<void>;
}

export const StudentAttemptDetailModal: React.FC<StudentAttemptDetailModalProps> = ({
  isOpen,
  studentResult,
  exam: _exam,
  onClose,
  onSaveManualGrade
}) => {
  const [subjectiveScores, setSubjectiveScores] = useState<Record<string, number>>(
    studentResult?.subjective_scores || {}
  );
  const [subjectiveFeedbacks, setSubjectiveFeedbacks] = useState<Record<string, string>>(
    studentResult?.subjective_feedbacks || {}
  );
  const [generalFeedback, setGeneralFeedback] = useState<string>(
    studentResult?.teacher_feedback || studentResult?.feedback || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !studentResult) return null;

  const breakdown: any[] = studentResult.breakdown || studentResult.breakdown_json || [];
  const student = studentResult.student || { full_name: 'Student', email: '' };

  const handleScoreChange = (questionId: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, val));
    setSubjectiveScores(prev => ({ ...prev, [questionId]: clamped }));
  };

  const handleFeedbackChange = (questionId: string, val: string) => {
    setSubjectiveFeedbacks(prev => ({ ...prev, [questionId]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveManualGrade(studentResult.id, subjectiveScores, subjectiveFeedbacks, generalFeedback);
      alert('Manual grades and teacher feedback saved successfully.');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save review.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b142c] border border-blue-800/90 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#0f1b3d] border-b border-blue-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300 font-black text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{student.full_name || 'Student Submission'}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-200">
                  Attempt #{studentResult.attempt_number || 1}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  studentResult.grading_status === 'reviewed'
                    ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
                    : 'bg-amber-950 border-amber-500/60 text-amber-300'
                }`}>
                  {studentResult.grading_status === 'reviewed' ? 'Reviewed' : 'Requires Review'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{student.email || 'Classroom Student'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-900/40 cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-white">
          {/* Quick Result Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#091124] border border-blue-900/70 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Score</div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {studentResult.score} / {studentResult.total_marks || studentResult.max_score || 100}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#091124] border border-blue-900/70 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Percentage</div>
              <div className="text-lg font-black text-indigo-300 mt-0.5">{studentResult.percentage}%</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#091124] border border-blue-900/70 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grade</div>
              <div className="text-lg font-black text-purple-300 mt-0.5">{studentResult.grade || '—'}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#091124] border border-blue-900/70 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submitted At</div>
              <div className="text-xs font-bold text-slate-300 mt-1">
                {studentResult.submitted_at ? new Date(studentResult.submitted_at).toLocaleDateString() : 'Recent'}
              </div>
            </div>
          </div>

          {/* Overall Teacher Feedback */}
          <div className="space-y-2 p-4 rounded-2xl bg-[#0f1b3d] border border-blue-800/80">
            <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              Overall Teacher Feedback & Observations
            </label>
            <textarea
              rows={2}
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              placeholder="Add personalized feedback, study guidance, or recognition for this student..."
              className="w-full p-3 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs font-medium text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-400 leading-relaxed"
            />
          </div>

          {/* Question by Question Review */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-indigo-200 uppercase tracking-wider">
              Question-by-Question Breakdown & Subjective Grading
            </h4>

            <div className="space-y-3">
              {breakdown.map((item, idx) => {
                const qType = String(item.questionType || '').toLowerCase();
                const isSubjective = qType.includes('essay') || qType.includes('short_answer') || item.requiresTeacherReview;
                const maxMarks = Number(item.maxScore || item.marks || 5);
                const currentManualScore = subjectiveScores[item.questionId] ?? item.score;
                const currentFeedback = subjectiveFeedbacks[item.questionId] ?? '';

                return (
                  <div
                    key={idx}
                    className={`p-4 sm:p-5 rounded-2xl border space-y-3 transition-all ${
                      isSubjective
                        ? 'bg-[#121c3d] border-amber-500/50'
                        : item.isCorrect
                        ? 'bg-[#0b1633] border-emerald-500/40'
                        : 'bg-[#0b1633] border-rose-500/40'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black text-white">
                          {item.questionType || 'Question'}
                        </span>
                        {isSubjective && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Subjective — Teacher Review
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isSubjective ? (
                          <div className="flex items-center gap-1.5">
                            <label className="text-[11px] font-bold text-slate-400">Score:</label>
                            <input
                              type="number"
                              min={0}
                              max={maxMarks}
                              value={currentManualScore}
                              onChange={(e) => handleScoreChange(item.questionId, parseFloat(e.target.value) || 0, maxMarks)}
                              className="w-14 px-2 py-1 bg-[#070e1f] border border-amber-500/60 rounded-lg text-center text-xs font-black text-amber-300 focus:outline-hidden"
                            />
                            <span className="text-xs font-bold text-slate-400">/ {maxMarks}</span>
                          </div>
                        ) : (
                          <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${
                            item.isCorrect
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                          }`}>
                            {item.score} / {maxMarks} Marks
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    {item.questionText && (
                      <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                        {item.questionText}
                      </p>
                    )}

                    {/* Student Answer */}
                    <div className="p-3 rounded-xl bg-[#070e1f] border border-blue-900/60 text-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Submitted Answer:</div>
                      <div className="text-white font-medium whitespace-pre-wrap">
                        {typeof item.submittedAnswer === 'object'
                          ? JSON.stringify(item.submittedAnswer)
                          : String(item.submittedAnswer || '(No answer provided)')}
                      </div>
                    </div>

                    {/* Objective Correct Answer if not subjective */}
                    {!isSubjective && !item.isCorrect && item.correctAnswer && (
                      <div className="text-[11px] text-emerald-300 font-medium">
                        <strong>Expected Answer:</strong> {String(item.correctAnswer)}
                      </div>
                    )}

                    {/* Subjective Feedback Field for Teacher */}
                    {isSubjective && (
                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-bold text-amber-300">Teacher Question Feedback / Rubric Notes:</label>
                        <input
                          type="text"
                          value={currentFeedback}
                          onChange={(e) => handleFeedbackChange(item.questionId, e.target.value)}
                          placeholder="Feedback specific to this answer..."
                          className="w-full px-3 py-2 bg-[#070e1f] border border-blue-800/70 rounded-xl text-xs text-white focus:outline-hidden focus:border-indigo-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-blue-900/80">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-blue-800/70 text-slate-300 hover:text-white text-xs font-black cursor-pointer"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Grade...' : 'Save Evaluation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
