import React from 'react';

export interface LiquidTabProps {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const LiquidTab: React.FC<LiquidTabProps> = ({
  label,
  count,
  isActive,
  onClick,
  icon,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`liquid-tab ${isActive ? 'is-active' : ''} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            isActive
              ? 'bg-[#026fc3]/15 text-[#026fc3]'
              : 'bg-slate-200/80 text-slate-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
