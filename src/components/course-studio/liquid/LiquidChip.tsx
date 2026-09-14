import React from 'react';
import { X } from 'lucide-react';

export interface LiquidChipProps {
  id?: string;
  text: string;
  isPlaced?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export const LiquidChip: React.FC<LiquidChipProps> = ({
  text,
  isPlaced = false,
  disabled = false,
  onClick,
  className = '',
  title
}) => {
  if (isPlaced) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title || (disabled ? undefined : 'Click to remove')}
        className={`liquid-chip-placed group ${className}`}
      >
        <span className="font-bold tracking-tight text-white select-none">{text}</span>
        {!disabled && (
          <span className="w-4 h-4 rounded-full bg-white/20 group-hover:bg-white/40 flex items-center justify-center transition-colors shrink-0">
            <X className="w-2.5 h-2.5 text-white stroke-[3]" />
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title || (disabled ? undefined : 'Click to place in sentence')}
      className={`liquid-chip ${className}`}
    >
      <span className="font-extrabold tracking-tight text-slate-900 select-none">{text}</span>
    </button>
  );
};
