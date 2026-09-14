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
        return <FileQuestion className="w-5 h-5 text-[#087477]" />;
      case 'create_learning_resource':
        return <BookOpen className="w-5 h-5 text-[#159A75]" />;
      case 'post_announcement':
        return <Megaphone className="w-5 h-5 text-[#159A9C]" />;
      case 'create_live_quiz':
      case 'schedule_live_quiz':
        return <Gamepad2 className="w-5 h-5 text-[#D99500]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#087477]" />;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border-2 border-[#C9E5E2] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C9E5E2] bg-[#E8F7F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border border-[#C9E5E2] shadow-2xs">
              {getActionIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#36565A]">
                  {getActionTypeLabel()}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                  action.priority === 'high'
                    ? 'bg-rose-50 text-[#C94B4B] border border-rose-200'
                    : action.priority === 'medium'
                    ? 'bg-amber-50 text-[#D99500] border border-amber-200'
                    : 'bg-slate-50 text-[#36565A] border border-slate-200'
                }`}>
                  {action.priority} priority
                </span>
              </div>
              <h3 className="text-lg font-black text-[#173B3F] mt-0.5">
                Action Execution Preview
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#36565A] hover:text-[#173B3F] hover:bg-white/80 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-[#C94B4B] text-xs font-bold">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. WHY — Pedagogical Rationale */}
          <div className="bg-[#E8F7F5] border border-[#C9E5E2] rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#087477] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#087477]" />
              <span>WHY THIS ACTION WAS GENERATED</span>
            </div>
            <p className="text-xs sm:text-sm text-[#173B3F] leading-relaxed font-semibold">
              {action.reason || 'Recommended based on classroom metrics and unit curriculum goals.'}
            </p>
          </div>

          {/* 2. WHAT — Action Specifications */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#36565A] uppercase tracking-wider">
                WHAT WILL BE CREATED
              </span>
              {!isEditing && action.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-[#087477] hover:text-[#065e60] font-bold cursor-pointer hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3 p-4 bg-[#E8F7F5]/40 border border-[#C9E5E2] rounded-2xl">
                <div>
                  <label className="text-xs font-bold text-[#173B3F] block mb-1">
                    Action Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-[#C9E5E2] rounded-xl focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 text-[#173B3F]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#173B3F] block mb-1">
                    Description / Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-[#C9E5E2] rounded-xl focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 text-[#173B3F]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#173B3F] block mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full text-xs font-semibold px-3 py-2 bg-white border border-[#C9E5E2] rounded-xl focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 text-[#173B3F]"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#173B3F] block mb-1">
                      Schedule For (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 bg-white border border-[#C9E5E2] rounded-xl focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 text-[#173B3F]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs text-[#36565A] hover:bg-white rounded-xl font-bold border border-transparent hover:border-[#C9E5E2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 text-xs bg-[#087477] hover:bg-[#065e60] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white border border-[#C9E5E2] rounded-2xl space-y-2 shadow-2xs">
                <h4 className="text-sm font-black text-[#173B3F]">
                  {action.title}
                </h4>
                <p className="text-xs text-[#36565A] leading-relaxed font-medium">
                  {action.description || 'No detailed description provided.'}
                </p>

                {/* Specific payload details preview */}
                {action.payload && Object.keys(action.payload).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#C9E5E2] flex flex-wrap gap-2 text-xs">
                    {action.payload.topic && (
                      <span className="px-2.5 py-1 bg-[#E8F7F5] border border-[#C9E5E2] rounded-lg text-[#173B3F] font-bold">
                        Topic: {action.payload.topic}
                      </span>
                    )}
                    {action.payload.question_count && (
                      <span className="px-2.5 py-1 bg-[#E8F7F5] border border-[#C9E5E2] rounded-lg text-[#173B3F] font-bold">
                        Questions: {action.payload.question_count}
                      </span>
                    )}
                    {action.payload.target_students && (
                      <span className="px-2.5 py-1 bg-[#E8F7F5] border border-[#C9E5E2] rounded-lg text-[#173B3F] font-bold">
                        Target: {action.payload.target_students}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. TARGET & 4. WHEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-[#C9E5E2] rounded-2xl space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#36565A] uppercase tracking-wider">
                <Target className="w-3.5 h-3.5 text-[#087477]" />
                TARGET AUDIENCE
              </div>
              <p className="text-sm font-black text-[#173B3F]">
                {classroomTitle}
              </p>
              <p className="text-xs text-[#36565A] font-medium">
                Audience: {action.payload?.target_students === 'needs_attention' ? 'Students Needing Extra Help' : 'Entire Classroom'}
              </p>
            </div>

            <div className="p-4 bg-white border border-[#C9E5E2] rounded-2xl space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#36565A] uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-[#D99500]" />
                TIMING &amp; EXECUTION
              </div>
              <p className="text-sm font-black text-[#173B3F] flex items-center gap-1.5">
                {action.scheduled_for ? (
                  <>
                    <Calendar className="w-4 h-4 text-[#D99500]" />
                    <span>{new Date(action.scheduled_for).toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#159A75]" />
                    <span>Immediately upon approval</span>
                  </>
                )}
              </p>
              <p className="text-xs text-[#36565A] font-medium">
                {action.requires_approval ? 'Requires teacher confirmation' : 'Safe automated execution'}
              </p>
            </div>
          </div>

          {/* Result preview if already completed */}
          {action.status === 'completed' && action.result_payload && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-[#159A75] uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-[#159A75]" />
                ACTION EXECUTION COMPLETED
              </div>
              <div className="text-xs font-mono text-[#173B3F] bg-white p-3 rounded-xl border border-emerald-200 overflow-x-auto">
                {JSON.stringify(action.result_payload, null, 2)}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#C9E5E2] bg-[#E8F7F5]/50 flex-wrap gap-3">
          <div>
            {action.status === 'pending' && (
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-bold text-[#C94B4B] hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reject Action</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#36565A] hover:text-[#173B3F] hover:bg-white border border-transparent hover:border-[#C9E5E2] rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>

            {action.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={handleApproveOnly}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-[#087477] bg-white hover:bg-[#E8F7F5] border border-[#087477] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Check className="w-4 h-4 text-[#087477]" />
                  <span>Approve (Schedule)</span>
                </button>
                <button
                  type="button"
                  onClick={handleApproveAndExecute}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-black text-white bg-[#087477] hover:bg-[#065e60] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Approve &amp; Execute Now</span>
                </button>
              </>
            )}

            {action.status === 'approved' && (
              <button
                type="button"
                onClick={handleApproveAndExecute}
                disabled={isSubmitting}
                className="px-4.5 py-2 text-xs font-black text-white bg-[#087477] hover:bg-[#065e60] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Immediately</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
