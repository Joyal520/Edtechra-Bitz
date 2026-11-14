import React from 'react';
import {
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Trash2,
  Users,
  EyeOff,
  RotateCcw,
  Globe
} from 'lucide-react';
import { Assignment } from '@/types/classroom';
import {
  isAssignmentPublished,
  normalizeAssignmentLevels,
  parseStudentLevelProgress
} from '@/utils/gameLevelUtils';

interface AssignmentCardProps {
  assignment: Assignment;
  isTeacher: boolean;
  onOpenSubmissions?: (assignment: Assignment) => void;
  onSubmitWork?: (assignment: Assignment) => void;
  onDeleteAssignment?: (assignmentId: string) => void;
  onRequestPublishToggle?: (assignment: Assignment, nextPublish: boolean) => void;
  isPublishBusy?: boolean;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  isTeacher,
  onOpenSubmissions,
  onSubmitWork,
  onDeleteAssignment,
  onRequestPublishToggle,
  isPublishBusy = false
}) => {
  const isPublished = isAssignmentPublished(assignment);
  const isGameLibrary = Boolean(assignment.settings?.is_game_library);
  const gameLevels = isGameLibrary ? normalizeAssignmentLevels(assignment) : [];
  const gameProgress = isGameLibrary ? parseStudentLevelProgress(assignment.my_submission) : null;
  const sub = assignment.my_submission;
  const isGameFullyCompleted = Boolean(
    isGameLibrary && gameLevels.length > 0 && gameProgress && gameProgress.completedCount >= gameLevels.length
  );
  const isGraded = isGameLibrary
    ? isGameFullyCompleted
    : sub?.status === 'graded' || sub?.points_awarded != null || (sub && sub.final_score != null);
  const isEvaluating = !isGraded && (sub?.status === 'evaluating' || sub?.status === 'processing');
  const isSubmitted = isGameLibrary
    ? Boolean(gameProgress && gameProgress.completedCount > 0)
    : Boolean(sub);
  const score = isGameLibrary
    ? gameProgress?.totalPointsEarned ?? 0
    : sub?.points_awarded ?? sub?.final_score;

  const dueDateFormatted = assignment.due_date
    ? new Date(assignment.due_date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'No due date';

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs hover:border-brand-200 transition-all space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                assignment.settings?.is_game_library
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-blue-50 text-[#026fc3] border-blue-200'
              }`}
            >
              {assignment.settings?.is_game_library
                ? String(assignment.settings.game_name || 'Game')
                : assignment.assignment_type}
            </span>
            {isTeacher && (
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isPublished
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isPublished ? 'Published' : 'Unpublished'}
              </span>
            )}
            <span className="text-xs text-slate-500 font-extrabold flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{assignment.points} pts</span>
            </span>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due {dueDateFormatted}</span>
            </span>
          </div>

          <h3 className="text-base font-black text-slate-900 pt-1">
            {assignment.title}
          </h3>
        </div>

        {/* Teacher Actions */}
        {isTeacher && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onRequestPublishToggle && (
              <button
                type="button"
                disabled={isPublishBusy}
                onClick={() => onRequestPublishToggle(assignment, !isPublished)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition cursor-pointer disabled:opacity-50 ${
                  isPublished
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}
                title={isPublished ? 'Unpublish assignment' : 'Republish assignment'}
              >
                {isPublished ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Unpublish</span>
                  </>
                ) : assignment.settings?.is_unpublished ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Republish</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Publish</span>
                  </>
                )}
              </button>
            )}
            {onDeleteAssignment && (
              <button
                onClick={() => onDeleteAssignment(assignment.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Assignment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      {assignment.instructions && (
        <p className="text-xs text-slate-600 font-medium line-clamp-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          {assignment.instructions}
        </p>
      )}

      {/* Footer / Actions */}
      <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
        {isTeacher ? (
          <>
            <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>{assignment.submission_count ?? 0} Submissions</span>
              {assignment.graded_count ? (
                <span className="text-emerald-600">({assignment.graded_count} Graded)</span>
              ) : null}
            </div>

            {onOpenSubmissions && (
              <button
                type="button"
                onClick={() => onOpenSubmissions(assignment)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-[#026fc3] font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                <span>Review & Grade</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {isGraded ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Graded: {score != null ? score : ''} / {assignment.points}</span>
                </span>
              ) : isEvaluating ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </span>
              ) : isSubmitted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Submitted</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-500 bg-slate-100">
                  Not Submitted
                </span>
              )}
            </div>

            {onSubmitWork && (
              <button
                type="button"
                onClick={() => onSubmitWork(assignment)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  isGraded
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : isSubmitted
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-[#026fc3] hover:bg-[#03589e] text-white shadow-xs'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {assignment.settings?.is_game_library
                    ? isGameFullyCompleted
                      ? 'Completed'
                      : isSubmitted
                      ? `Continue (${gameProgress?.completedCount || 0}/${gameLevels.length})`
                      : 'Play Game'
                    : isGraded
                    ? 'View Result'
                    : isEvaluating
                    ? 'View Progress'
                    : isSubmitted
                    ? 'View Work'
                    : 'Submit Work'}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
