import React from 'react';
import { Star, X } from 'lucide-react';

interface PriorityAppCardControlProps {
  isPriorityApp?: boolean;
  isPriorityEnabled?: boolean;
  canSetPriority?: boolean;
  onSetPriority?: () => void;
  onRemovePriority?: () => void;
}

export const PriorityAppCardControl: React.FC<PriorityAppCardControlProps> = ({
  isPriorityApp = false,
  isPriorityEnabled = true,
  canSetPriority = false,
  onSetPriority,
  onRemovePriority
}) => {
  if (!isPriorityApp && (!canSetPriority || !onSetPriority)) {
    return null;
  }

  if (isPriorityApp) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/90 text-[11px]"
      >
        <span className="inline-flex items-center gap-1.5 font-black text-amber-800 truncate">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
          <span className="truncate">
            My Priority App{!isPriorityEnabled ? ' (Paused)' : ''}
          </span>
        </span>
        {onRemovePriority && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemovePriority();
            }}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black text-rose-700 hover:bg-rose-100/80 transition-colors cursor-pointer shrink-0"
            title="Remove Priority App"
          >
            <X className="w-3 h-3" />
            <span>Remove Priority</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSetPriority?.();
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-600 hover:text-amber-800 bg-slate-50 hover:bg-amber-50 border border-slate-200/90 hover:border-amber-200 transition-all cursor-pointer"
        title="Set as Priority App"
      >
        <Star className="w-3 h-3 text-amber-500" />
        <span>Set as Priority</span>
      </button>
    </div>
  );
};
