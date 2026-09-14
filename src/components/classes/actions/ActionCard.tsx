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
        return <FileQuestion className="w-5 h-5 text-indigo-500" />;
      case 'create_learning_resource':
        return <BookOpen className="w-5 h-5 text-emerald-500" />;
      case 'post_announcement':
        return <Megaphone className="w-5 h-5 text-blue-500" />;
      case 'create_live_quiz':
      case 'schedule_live_quiz':
        return <Gamepad2 className="w-5 h-5 text-amber-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-500" />;
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
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            Executing...
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
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
        className="group relative bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          {/* Top Bar: Type, Priority, Status */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center border border-slate-200/60 dark:border-slate-600/60">
                {getTypeIcon()}
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {getTypeLabel()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                action.priority === 'high'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : action.priority === 'medium'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                  : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}>
                {action.priority}
              </span>
              {getStatusBadge()}
            </div>
          </div>

          {/* Title & Description */}
          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            {action.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {action.description || 'No additional details provided.'}
          </p>

          {/* Pedagogical Reason */}
          {action.reason && (
            <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                <Sparkles className="w-3 h-3" />
                Pedagogical Grounding
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 mt-0.5">
                {action.reason}
              </p>
            </div>
          )}

          {/* Failure reason if failed */}
          {action.status === 'failed' && action.last_error && (
            <div className="mt-2.5 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{action.last_error}</span>
            </div>
          )}
        </div>

        {/* Card Footer: Metadata & Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {action.scheduled_for ? (
              <>
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>{new Date(action.scheduled_for).toLocaleDateString()}</span>
              </>
            ) : action.executed_at ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Executed {new Date(action.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <span>Ready for preview</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {action.status === 'pending' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 rounded-lg transition-colors flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Inspect
              </button>
            )}

            {action.status === 'approved' && (
              <button
                onClick={handleQuickExecute}
                disabled={isExecuting}
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                Execute
              </button>
            )}

            {action.status === 'failed' && (
              <button
                onClick={handleRetry}
                disabled={isExecuting}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Retry
              </button>
            )}

            {action.status === 'completed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPreviewOpen(true);
                }}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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
