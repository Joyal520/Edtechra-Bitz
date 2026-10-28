import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Trophy,
  Loader2,
  Sparkles
} from 'lucide-react';
import { ClassroomLeaderboardEntry } from '@/types/classroom';
import { classroomPointsService } from '@/services/classroomPointsService';
import {
  LEADERBOARD_SHARE_TITLE,
  formatLeaderboardShareText,
  sanitizeLeaderboardStudentName
} from '@/utils/leaderboardResetUtils';

export interface ShareLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId?: string;
  initialEntries?: ClassroomLeaderboardEntry[];
  onRefreshParentLeaderboard?: () => Promise<void> | void;
  onShowToast?: (message: string) => void;
}

export const ShareLeaderboardModal: React.FC<ShareLeaderboardModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  initialEntries = [],
  onRefreshParentLeaderboard,
  onShowToast
}) => {
  const [entries, setEntries] = useState<ClassroomLeaderboardEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Sync entries from props when modal opens or initialEntries change
  useEffect(() => {
    if (initialEntries && initialEntries.length > 0) {
      setEntries(initialEntries);
    }
  }, [initialEntries]);

  // Fetch authoritative fresh leaderboard data from database when modal opens
  const fetchFreshEntries = useCallback(async () => {
    if (!classroomId) return;
    setIsLoading(true);
    setCopyError(null);
    try {
      const fresh = await classroomPointsService.getClassroomLeaderboard(classroomId, {
        throwOnError: true
      });
      setEntries(fresh);
      // Also notify parent component to sync
      if (onRefreshParentLeaderboard) {
        await onRefreshParentLeaderboard();
      }
    } catch (err: any) {
      // Keep existing entries if refresh fails, but note in console
      console.warn('Share modal background refresh warning:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [classroomId, onRefreshParentLeaderboard]);

  useEffect(() => {
    if (isOpen && classroomId) {
      setHasCopied(false);
      setCopyError(null);
      fetchFreshEntries();
    }
  }, [isOpen, classroomId, fetchFreshEntries]);

  if (!isOpen) return null;

  // Take top 3 for display and sharing
  const topEntries = entries.slice(0, 3);
  const shareText = formatLeaderboardShareText(topEntries, 3);
  const canUseNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function';

  const handleCopyUpdate = async () => {
    setCopyError(null);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setHasCopied(true);
      onShowToast?.('Leaderboard update copied to clipboard.');
      setTimeout(() => setHasCopied(false), 2500);
    } catch (err: any) {
      setCopyError('Unable to copy to clipboard. Please copy manually.');
    }
  };

  const handleNativeShare = async () => {
    if (!canUseNativeShare) {
      handleCopyUpdate();
      return;
    }

    try {
      await navigator.share({
        title: LEADERBOARD_SHARE_TITLE,
        text: shareText
      });
    } catch (err: any) {
      // User cancelled native share sheet or it was aborted - ignore AbortError
      if (err?.name !== 'AbortError') {
        // Fallback to clipboard if share sheet encountered a system error
        handleCopyUpdate();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-5 animate-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-2xs">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Share Leaderboard</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Broadcast current rankings to your students or team.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-stone-100 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Copy Error Banner */}
        {copyError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {copyError}
          </div>
        )}

        {/* Preview Card */}
        <div className="relative rounded-2xl bg-gradient-to-br from-stone-900 via-slate-900 to-slate-950 p-5 text-white shadow-inner border border-stone-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black tracking-wide text-amber-300 uppercase">
                {LEADERBOARD_SHARE_TITLE}
              </span>
            </div>
            {isLoading && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                <span>Syncing fresh XP...</span>
              </span>
            )}
          </div>

          {/* Student Rankings List */}
          {topEntries.length > 0 ? (
            <div className="space-y-2.5">
              {topEntries.map((entry, index) => {
                const rank = index + 1;
                const medalColors =
                  rank === 1
                    ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                    : rank === 2
                    ? 'text-slate-300 bg-slate-300/10 border-slate-300/20'
                    : 'text-amber-600 bg-amber-600/10 border-amber-600/20';

                return (
                  <div
                    key={entry.student_id || `${entry.name}-${index}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-black shrink-0 ${medalColors}`}
                      >
                        {rank}
                      </span>
                      <span className="text-sm font-bold text-white truncate">
                        {sanitizeLeaderboardStudentName(entry.name || 'Anonymous Student')}
                      </span>
                    </div>
                    <span className="text-xs font-black text-amber-300 shrink-0 ml-2">
                      {Number(entry.points) || 0} XP
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center space-y-1">
              <p className="text-xs text-slate-300 font-semibold">No student scores recorded yet</p>
              <p className="text-[11px] text-slate-500">Students will appear once classroom points are earned.</p>
            </div>
          )}

          {/* Card Footer Motto */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="italic font-medium">Keep learning. Keep growing.</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          {canUseNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-black transition-all cursor-pointer active:scale-95 border border-stone-200"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-700" />
              <span>Native Share</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyUpdate}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#026fc3] hover:bg-[#025ca5] text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {hasCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Leaderboard Update</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
