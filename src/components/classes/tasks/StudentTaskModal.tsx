import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { ClassroomTask, TaskSubmission } from '@/types/classroomTask';
import { classroomTaskService } from '@/services/classroomTaskService';
import { PremiumTaskPage } from './PremiumTaskPage';

export type EvaluationPhase = 'idle' | 'evaluating' | 'evaluated' | 'error';

interface StudentTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onSubmitted?: () => void;
}

export const StudentTaskModal: React.FC<StudentTaskModalProps> = ({
  isOpen,
  onClose,
  taskId,
  onSubmitted
}) => {
  const [task, setTask] = useState<ClassroomTask | null>(null);
  const [submission, setSubmission] = useState<TaskSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluationPhase, setEvaluationPhase] = useState<EvaluationPhase>('idle');

  const loadTask = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await classroomTaskService.getTask(taskId);
      if (data) {
        setTask(data);
        setSubmission(data.my_submission || null);
        
        const sub = data.my_submission;
        if (sub) {
          if (sub.status === 'graded' || sub.final_score != null || sub.points_awarded != null) {
            setEvaluationPhase('evaluated');
          } else if (sub.status === 'evaluating' || sub.status === 'submitted' || sub.status === 'processing') {
            setEvaluationPhase('evaluating');
          } else if (sub.status !== 'draft') {
            setEvaluationPhase('evaluated');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  // Poll when in evaluating phase to auto-refresh when AI grading completes
  useEffect(() => {
    if (!isOpen || evaluationPhase !== 'evaluating' || !taskId) return;

    let pollCount = 0;
    const maxPolls = 15;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        return;
      }
      try {
        const freshTask = await classroomTaskService.getTask(taskId);
        if (freshTask?.my_submission) {
          const freshSub = freshTask.my_submission;
          if (freshSub.status === 'graded' || freshSub.final_score != null || freshSub.points_awarded != null) {
            setTask(freshTask);
            setSubmission(freshSub);
            setEvaluationPhase('evaluated');
            if (onSubmitted) onSubmitted();
            clearInterval(interval);
          }
        }
      } catch (_) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, evaluationPhase, taskId, onSubmitted]);

  useEffect(() => {
    if (isOpen && taskId) {
      setEvaluationPhase('idle');
      loadTask();
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const handleSubmit = async (
    answers: Array<{ question_id: string; student_answer: any }>,
    textResponse?: string,
    handwrittenImageBase64?: string
  ) => {
    setSubmitting(true);
    setError(null);
    setEvaluationPhase('evaluating');

    try {
      const res = await classroomTaskService.submitTask(taskId, {
        studentAnswers: answers,
        textResponse,
        handwrittenImageBase64
      });

      if (res.error) {
        setError(res.error);
        setEvaluationPhase('error');
      } else if (res.data) {
        setSubmission(res.data);
        setEvaluationPhase('evaluated');
        if (onSubmitted) onSubmitted();
      }
    } catch (err: any) {
      setError(err.message || 'Submission error');
      setEvaluationPhase('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-100 w-full max-w-5xl h-full sm:h-auto rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[95vh]">
        
        {/* Top Navbar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xs">
              E
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 block">
                TASK
              </span>
              <h2 className="text-sm font-black tracking-tight leading-snug text-white">
                {task?.title || 'Loading task...'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-1 sm:p-6">
          {error && (
            <div className="max-w-[8.5in] mx-auto mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Loading educational sheet...</p>
            </div>
          ) : task ? (
            <PremiumTaskPage
              task={task}
              submission={submission}
              onSubmit={handleSubmit}
              isSubmitting={submitting}
              evaluationPhase={evaluationPhase}
            />
          ) : (
            <div className="py-24 text-center text-xs text-slate-500 font-bold">
              Task not found.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
