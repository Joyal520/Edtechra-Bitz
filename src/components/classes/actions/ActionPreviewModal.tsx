// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ACTION PREVIEW MODAL (PHASE 2B)
// Clear, pedagogical inspection before approving or executing an AI action:
// WHY (grounding), WHAT (content), TARGET (audience), and WHEN (timing).
// ============================================================================

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  Target,
  FileQuestion,
  BookOpen,
  Megaphone,
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  Play,
  Edit3,
  Trash2,
  Check
} from 'lucide-react';
import { AIAction, actionExecutionService } from '@/services/actionExecutionService';

interface ActionPreviewModalProps {
  action: AIAction;
  classroomId: string;
  classroomTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onActionUpdated: (updatedAction: AIAction, result?: any) => void;
}

export const ActionPreviewModal: React.FC<ActionPreviewModalProps> = ({
  action,
  classroomId,
  classroomTitle = 'Current Classroom',
  isOpen,
  onClose,
  onActionUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(action.title);
  const [description, setDescription] = useState(action.description || '');
  const [scheduledFor, setScheduledFor] = useState(
    action.scheduled_for ? new Date(action.scheduled_for).toISOString().slice(0, 16) : ''
  );
  const [priority, setPriority] = useState(action.priority);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getActionIcon = () => {
    switch (action.action_type) {
      case 'create_diagnostic_exam':
        return <FileQuestion className="w-6 h-6 text-indigo-500" />;
      case 'create_learning_resource':
        return <BookOpen className="w-6 h-6 text-emerald-500" />;
      case 'post_announcement':
        return <Megaphone className="w-6 h-6 text-blue-500" />;
      case 'create_live_quiz':
      case 'schedule_live_quiz':
        return <Gamepad2 className="w-6 h-6 text-amber-500" />;
      default:
        return <Sparkles className="w-6 h-6 text-indigo-500" />;
    }
  };

  const getActionTypeLabel = () => {
    switch (action.action_type) {
      case 'create_diagnostic_exam':
        return 'Diagnostic Assessment';
      case 'create_learning_resource':
        return 'Study Guide & Notes';
      case 'post_announcement':
        return 'Classroom Announcement';
      case 'create_live_quiz':
        return 'Interactive Live Quiz';
      case 'schedule_live_quiz':
        return 'Scheduled Live Quiz Session';
      default:
        return 'Classroom Action';
    }
  };

  // Handle Approve & Execute Now
  const handleApproveAndExecute = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await actionExecutionService.approveAction(classroomId, action.id, true);
      onActionUpdated(res.action, res.result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve and execute action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Approve Only (Schedule / Later)
  const handleApproveOnly = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await actionExecutionService.approveAction(classroomId, action.id, false);
      onActionUpdated(res.action);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Edit
  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await actionExecutionService.editAction(classroomId, action.id, {
        title,
        description,
        priority,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null
      });
      setIsEditing(false);
      onActionUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update action details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reject/Cancel
  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to cancel this recommended action?')) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const updated = await actionExecutionService.rejectAction(classroomId, action.id);
      onActionUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              {getActionIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {getActionTypeLabel()}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  action.priority === 'high'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : action.priority === 'medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {action.priority} priority
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Action Execution Preview
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. WHY — Pedagogical Rationale */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              WHY THIS ACTION WAS GENERATED
            </div>
            <p className="text-sm text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
              {action.reason || 'Recommended based on classroom metrics and unit curriculum goals.'}
            </p>
          </div>

          {/* 2. WHAT — Action Specifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                WHAT WILL BE CREATED
              </span>
              {!isEditing && action.status === 'pending' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Action Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Description / Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Schedule For (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-full text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {action.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {action.description || 'No detailed description provided.'}
                </p>

                {/* Specific payload details preview */}
                {action.payload && Object.keys(action.payload).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-2 text-xs">
                    {action.payload.topic && (
                      <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300">
                        <strong>Topic:</strong> {action.payload.topic}
                      </span>
                    )}
                    {action.payload.question_count && (
                      <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300">
                        <strong>Questions:</strong> {action.payload.question_count}
                      </span>
                    )}
                    {action.payload.target_students && (
                      <span className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300">
                        <strong>Target:</strong> {action.payload.target_students}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. TARGET & 4. WHEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                TARGET AUDIENCE
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {classroomTitle}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audience: {action.payload?.target_students === 'needs_attention' ? 'Students Needing Extra Help' : 'Entire Classroom'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                TIMING & EXECUTION
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                {action.scheduled_for ? (
                  <>
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {new Date(action.scheduled_for).toLocaleString()}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Immediately upon approval
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {action.requires_approval ? 'Requires teacher confirmation' : 'Safe automated execution'}
              </p>
            </div>
          </div>

          {/* Result preview if already completed */}
          {action.status === 'completed' && action.result_payload && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ACTION EXECUTION COMPLETED
              </div>
              <div className="text-xs font-mono text-emerald-900 dark:text-emerald-200 bg-white/75 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 overflow-x-auto">
                {JSON.stringify(action.result_payload, null, 2)}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {action.status === 'pending' && (
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reject Action
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>

            {action.status === 'pending' && (
              <>
                <button
                  onClick={handleApproveOnly}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  Approve (Schedule)
                </button>
                <button
                  onClick={handleApproveAndExecute}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Approve & Execute Now
                </button>
              </>
            )}

            {action.status === 'approved' && (
              <button
                onClick={handleApproveAndExecute}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-white" />
                Execute Immediately
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
