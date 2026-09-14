// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ACTION CARD COMPONENT (PHASE 2B)
// Modular card representing a single classroom AI action with status,
// pedagogical reason, preview trigger, and execution controls.
// ============================================================================

import React, { useState } from 'react';
import {
  FileQuestion,
  BookOpen,
  Megaphone,
  Gamepad2,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Eye,
  Loader2,
  XCircle,
  Sparkles
} from 'lucide-react';
import { AIAction, actionExecutionService } from '@/services/actionExecutionService';
import { ActionPreviewModal } from './ActionPreviewModal';

interface ActionCardProps {
  action: AIAction;
  classroomId: string;
  classroomTitle?: string;
  onActionUpdated: (updatedAction: AIAction, result?: any) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  classroomId,
  classroomTitle,
  onActionUpdated
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const getTypeIcon = () => {
    switch (action.action_type) {
      case 'create_diagnostic_exam':
        return <FileQuestion className="w-4 h-4 text-[#087477]" />;
      case 'create_learning_resource':
        return <BookOpen className="w-4 h-4 text-[#159A75]" />;
      case 'post_announcement':
        return <Megaphone className="w-4 h-4 text-[#159A9C]" />;
      case 'create_live_quiz':
      case 'schedule_live_quiz':
        return <Gamepad2 className="w-4 h-4 text-[#D99500]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#087477]" />;
    }
  };

  const getTypeLabel = () => {
    switch (action.action_type) {
      case 'create_diagnostic_exam':
        return 'Diagnostic Assessment';
      case 'create_learning_resource':
        return 'Study Notes';
      case 'post_announcement':
        return 'Announcement';
      case 'create_live_quiz':
        return 'Live Quiz';
      case 'schedule_live_quiz':
        return 'Scheduled Quiz';
      default:
        return 'Action';
    }
  };

  const getStatusBadge = () => {
    switch (action.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-[#D99500] border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F7F5] text-[#087477] border border-[#C9E5E2]">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#159A9C] border border-[#159A9C]/40 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            Executing...
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#159A75] border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#C94B4B] border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-50 text-[#36565A] border border-slate-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const handleQuickExecute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsExecuting(true);
      const res = await actionExecutionService.executeAction(classroomId, action.id);
      onActionUpdated(res.action, res.result);
    } catch (err: any) {
      alert(`Execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsExecuting(true);
      const res = await actionExecutionService.retryAction(classroomId, action.id);
      onActionUpdated(res.action, res.result);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <div
        onClick={() => setIsPreviewOpen(true)}
        className="group relative bg-white border border-[#C9E5E2] hover:border-[#159A9C] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          {/* Top Bar: Type, Priority, Status */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#E8F7F5] flex items-center justify-center border border-[#C9E5E2]">
                {getTypeIcon()}
              </div>
              <span className="text-xs font-bold text-[#36565A]">
                {getTypeLabel()}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                action.priority === 'high'
                  ? 'bg-rose-50 text-[#C94B4B] border border-rose-200'
                  : action.priority === 'medium'
                  ? 'bg-amber-50 text-[#D99500] border border-amber-200'
                  : 'bg-slate-50 text-[#36565A] border border-slate-200'
              }`}>
                {action.priority}
              </span>
              {getStatusBadge()}
            </div>
          </div>

          {/* Title & Description */}
          <h4 className="text-base font-black text-[#173B3F] group-hover:text-[#087477] transition-colors line-clamp-1">
            {action.title}
          </h4>
          <p className="text-xs text-[#36565A] mt-1.5 line-clamp-2 leading-relaxed font-medium">
            {action.description || 'No additional details provided.'}
          </p>

          {/* Pedagogical Grounding Box */}
          {action.reason && (
            <div className="mt-3.5 p-3 bg-[#E8F7F5] border border-[#C9E5E2] rounded-xl">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-[#087477] uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-[#087477]" />
                Pedagogical Grounding
              </div>
              <p className="text-xs text-[#173B3F] font-semibold line-clamp-2 mt-1 leading-relaxed">
                {action.reason}
              </p>
            </div>
          )}

          {/* Failure reason if failed */}
          {action.status === 'failed' && action.last_error && (
            <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[#C94B4B] text-xs flex items-start gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{action.last_error}</span>
            </div>
          )}
        </div>

        {/* Card Footer: Metadata & Actions */}
        <div className="mt-4 pt-3 border-t border-[#C9E5E2] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#36565A] font-semibold">
            {action.scheduled_for ? (
              <>
                <Calendar className="w-3.5 h-3.5 text-[#D99500]" />
                <span>{new Date(action.scheduled_for).toLocaleDateString()}</span>
              </>
            ) : action.executed_at ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159A75]" />
                <span>Executed {new Date(action.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <span>Ready for preview</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {action.status === 'pending' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-[#087477] bg-[#E8F7F5] hover:bg-[#D4EFEC] border border-[#C9E5E2] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <Eye className="w-3.5 h-3.5" />
                Inspect
              </button>
            )}

            {action.status === 'approved' && (
              <button
                type="button"
                onClick={handleQuickExecute}
                disabled={isExecuting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#087477] hover:bg-[#065e60] rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                Execute
              </button>
            )}

            {action.status === 'failed' && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isExecuting}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#C94B4B] hover:bg-rose-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Retry
              </button>
            )}

            {action.status === 'completed' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-[#159A75] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159A75]" />
                View Result
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview & Execution Modal */}
      <ActionPreviewModal
        action={action}
        classroomId={classroomId}
        classroomTitle={classroomTitle}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onActionUpdated={onActionUpdated}
      />
    </>
  );
};
