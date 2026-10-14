import React from 'react';
import { Check, X } from 'lucide-react';

interface BinaryChoiceRendererProps {
  statement?: string;
  selectedAnswer: string | undefined;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
}

export const BinaryChoiceRenderer: React.FC<BinaryChoiceRendererProps> = ({
  statement,
  selectedAnswer,
  onSelectAnswer,
  disabled = false
}) => {
  // Normalize selectedAnswer (e.g., 'CORRECT', 'WRONG', true, false, 'true', 'false')
  const normalizedSelection = React.useMemo(() => {
    if (selectedAnswer === undefined || selectedAnswer === null) return undefined;
    const s = String(selectedAnswer).trim().toUpperCase();
    if (s === 'CORRECT' || s === 'TRUE' || s === 'YES') return 'CORRECT';
    if (s === 'WRONG' || s === 'FALSE' || s === 'NO') return 'WRONG';
    return s;
  }, [selectedAnswer]);

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Context card if statement passed directly */}
      {statement && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Is this sentence correct?
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed italic">
            "{statement}"
          </div>
        </div>
      )}

      {/* Two prominent action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* CORRECT Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectAnswer('CORRECT')}
          className={`w-full p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center gap-3 min-h-[64px] cursor-pointer active:scale-[0.99] touch-manipulation font-black text-sm sm:text-base ${
            normalizedSelection === 'CORRECT'
              ? 'bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-200 shadow-md'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-800'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              normalizedSelection === 'CORRECT'
                ? 'bg-white text-emerald-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span>CORRECT</span>
        </button>

        {/* WRONG Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectAnswer('WRONG')}
          className={`w-full p-4 sm:p-5 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center gap-3 min-h-[64px] cursor-pointer active:scale-[0.99] touch-manipulation font-black text-sm sm:text-base ${
            normalizedSelection === 'WRONG'
              ? 'bg-rose-600 text-white border-rose-600 ring-4 ring-rose-200 shadow-md'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 text-slate-800'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              normalizedSelection === 'WRONG'
                ? 'bg-white text-rose-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            <X className="w-4 h-4 stroke-[3]" />
          </div>
          <span>WRONG</span>
        </button>
      </div>
    </div>
  );
};
