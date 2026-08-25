import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Award,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  Clock
} from 'lucide-react';
import { Assignment, AssignmentSubmission } from '@/types/classroom';
import { assignmentService } from '@/services/assignmentService';

interface SubmissionListModalProps {
  isOpen: boolean;
  assignment: Assignment | null;
  classroomId: string;
  onClose: () => void;
  onGraded: () => void;
}

export const SubmissionListModal: React.FC<SubmissionListModalProps> = ({
  isOpen,
  assignment,
  classroomId,
  onClose,
  onGraded
}) => {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<AssignmentSubmission | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradingSuccess, setGradingSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && assignment) {
      loadSubmissions();
    }
  }, [isOpen, assignment]);

  const loadSubmissions = async () => {
    if (!assignment) return;
    setLoading(true);
    try {
      const data = await assignmentService.getSubmissionsByAssignment(assignment.id);
      setSubmissions(data);
      if (data.length > 0) {
        selectSubmission(data[0]);
      } else {
        setSelectedSub(null);
      }
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoading(false);
    }
  };

  const selectSubmission = (sub: AssignmentSubmission) => {
    setSelectedSub(sub);
    setScoreInput(sub.points_awarded !== null && sub.points_awarded !== undefined ? String(sub.points_awarded) : String(assignment?.points || 100));
    setFeedbackInput(sub.teacher_feedback || '');
    setGradingSuccess(false);
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !assignment) return;

    const points = Number(scoreInput);
    if (isNaN(points) || points < 0) {
      alert('Please enter a valid point value.');
      return;
    }

    setIsGrading(true);
    try {
      await assignmentService.gradeSubmission({
        submission_id: selectedSub.id,
        classroom_id: classroomId,
        student_id: selectedSub.student_id,
        points_awarded: points,
        teacher_feedback: feedbackInput.trim(),
        assignment_title: assignment.title
      });

      setGradingSuccess(true);
      onGraded();
      await loadSubmissions();
      setTimeout(() => setGradingSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save score and feedback');
    } finally {
      setIsGrading(false);
    }
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] p-6 shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                  Review & Grade
                </span>
                <span className="text-xs font-bold text-slate-400">Max {assignment.points} pts</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 line-clamp-1">
                {assignment.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body (2 Columns) */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs font-bold text-slate-400 animate-pulse">Loading submissions...</div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Users className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-black text-slate-800">No submissions yet</p>
            <p className="text-xs text-slate-400 max-w-sm">Students enrolled in this classroom have not submitted work for this task yet.</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 overflow-hidden">
            
            {/* Left Column: Student Submission List */}
            <div className="md:col-span-1 border-r border-slate-100 pr-2 overflow-y-auto space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                Students ({submissions.length})
              </span>
              {submissions.map((sub) => {
                const name = sub.student?.full_name || sub.student?.email?.split('@')[0] || 'Student';
                const isSelected = selectedSub?.id === sub.id;
                const isGraded = sub.status === 'graded';

                return (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => selectSubmission(sub)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-purple-50/70 border-purple-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <strong className="text-xs font-black text-slate-900 truncate">{name}</strong>
                      {isGraded ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                          {sub.points_awarded} pts
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                          Needs Grade
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Active Submission Review & Grading Form */}
            {selectedSub && (
              <div className="md:col-span-2 flex flex-col justify-between overflow-y-auto pl-2 space-y-4">
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {selectedSub.student?.full_name || selectedSub.student?.email}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{selectedSub.student?.email}</div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-medium">
                      Submitted: {new Date(selectedSub.submitted_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Student's Text Answer */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-700 mb-1.5">Written Response</h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                      {selectedSub.text_response || <span className="text-slate-400 italic">No written response provided.</span>}
                    </div>
                  </div>

                  {/* Student's Attachments */}
                  {selectedSub.file_urls && selectedSub.file_urls.length > 0 && (
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-700 mb-1.5">
                        Attachments ({selectedSub.file_urls.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedSub.file_urls.map((file, i) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-2 p-2.5 bg-blue-50/60 hover:bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-[#026fc3] transition-colors group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Paperclip className="w-3.5 h-3.5 shrink-0 text-[#026fc3]" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading Form */}
                <form onSubmit={handleGradeSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        Points Awarded (Max {assignment.points}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={assignment.points}
                        required
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        Teacher Feedback & Comments
                      </label>
                      <input
                        type="text"
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Well done! Clear arguments and structure."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {gradingSuccess && (
                      <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Score & points saved!</span>
                      </span>
                    )}
                    <div className="ml-auto">
                      <button
                        type="submit"
                        disabled={isGrading}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{isGrading ? 'Saving Grade...' : 'Save Grade & Award Points'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
