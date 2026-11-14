import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface UnpublishConfirmModalProps {
  isOpen: boolean;
  gameTitle?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const UnpublishConfirmModal: React.FC<UnpublishConfirmModalProps> = ({
  isOpen,
  gameTitle,
  loading = false,
  onCancel,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unpublish-dialog-title"
        className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 id="unpublish-dialog-title" className="text-lg font-black text-slate-900">
              Unpublish this game?
            </h3>
            {gameTitle && (
              <p className="text-xs font-extrabold text-slate-600 truncate max-w-[280px]">
                {gameTitle}
              </p>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">
              Students will no longer be able to access this assignment. Their existing progress and scores will be preserved.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Unpublish Game
          </button>
        </div>
      </div>
    </div>
  );
};
