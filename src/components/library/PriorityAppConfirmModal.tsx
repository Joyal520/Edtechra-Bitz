import React from 'react';
import { Star, Loader2, AlertCircle, X } from 'lucide-react';
import type { LibraryResource } from '@/types/library';

interface PriorityAppConfirmModalProps {
  isOpen: boolean;
  resource: LibraryResource | null;
  currentPriorityTitle?: string | null;
  isSaving: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PriorityAppConfirmModal: React.FC<PriorityAppConfirmModalProps> = ({
  isOpen,
  resource,
  currentPriorityTitle,
  isSaving,
  error,
  onCancel,
  onConfirm
}) => {
  if (!isOpen || !resource) return null;

  const isReplacing =
    Boolean(currentPriorityTitle) && currentPriorityTitle !== resource.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/80 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            Make this your Priority App?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            This application will open automatically whenever you launch EdTechra. You can return to the EdTechra homepage and explore other applications anytime.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Selected Application
          </div>
          <div className="text-xs font-black text-slate-900 truncate">
            {resource.title}
          </div>
        </div>

        {isReplacing && (
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] font-semibold text-amber-900">
            This will replace your current Priority App (<strong className="font-black">{currentPriorityTitle}</strong>).
          </div>
        )}

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#026fc3] hover:bg-[#025ea6] disabled:opacity-60 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>Set as Priority App</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
