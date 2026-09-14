import React from 'react';
import { Check, X } from 'lucide-react';

export interface LiquidOptionProps {
  badge?: React.ReactNode;
  text: React.ReactNode;
  isSelected?: boolean;
  isAnswered?: boolean;
  isCorrect?: boolean;
  isCorrectOption?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const LiquidOption: React.FC<LiquidOptionProps> = ({
  badge,
  text,
  isSelected = false,
  isAnswered = false,
  isCorrect = false,
  isCorrectOption = false,
  disabled = false,
  onClick,
  className = ''
}) => {
  let stateClass = '';
  let badgeStyle = 'liquid-option-badge';

  if (isAnswered) {
    if (isSelected) {
      stateClass = isCorrect ? 'is-correct' : 'is-incorrect';
      badgeStyle = isCorrect
        ? 'w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-black shrink-0'
        : 'w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-black shrink-0';
    } else if (!isCorrect && isCorrectOption) {
      stateClass = 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold';
      badgeStyle = 'w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shrink-0';
    } else {
      stateClass = 'opacity-40 bg-slate-50 text-slate-400 cursor-not-allowed';
    }
  } else if (isSelected) {
    stateClass = 'is-selected';
    badgeStyle = 'w-8 h-8 rounded-xl bg-[#026fc3] text-white flex items-center justify-center font-black shrink-0 shadow-xs';
  }

  return (
    <button
      type="button"
      disabled={disabled || isAnswered}
      onClick={onClick}
      className={`liquid-option ${stateClass} ${className}`}
    >
      {badge !== undefined && (
        <div className={badgeStyle}>
          {isAnswered && isSelected ? (
            isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />
          ) : isAnswered && !isCorrect && isCorrectOption ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : (
            badge
          )}
        </div>
      )}
      <div className="flex-1 text-left font-medium leading-relaxed">{text}</div>
    </button>
  );
};
