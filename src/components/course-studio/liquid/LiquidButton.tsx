import React from 'react';

export type LiquidButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'emerald' | 'purple' | 'amber';
export type LiquidButtonSize = 'sm' | 'md' | 'lg';

export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LiquidButtonVariant;
  size?: LiquidButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const LiquidButton: React.FC<LiquidButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-liquid-primary';
      case 'secondary':
        return 'btn-liquid-secondary';
      case 'tertiary':
        return 'btn-liquid-tertiary';
      case 'emerald':
        return 'btn-liquid-emerald';
      case 'purple':
        return 'btn-liquid-purple';
      case 'amber':
        return 'btn-liquid-amber';
      default:
        return 'btn-liquid-primary';
    }
  };

  const getSizeClass = () => {
    if (variant === 'tertiary') {
      switch (size) {
        case 'sm':
          return 'px-2 py-0.5 text-[11px] min-h-[28px]';
        case 'lg':
          return 'px-3.5 py-1.5 text-xs min-h-[36px]';
        case 'md':
        default:
          return 'px-2.5 py-1 text-xs min-h-[32px]';
      }
    }

    switch (size) {
      case 'sm':
        return 'px-3.5 py-1.5 text-xs min-h-[36px]';
      case 'lg':
        return 'px-6 sm:px-8 py-3.5 text-sm sm:text-base min-h-[48px]';
      case 'md':
      default:
        return 'px-5 py-2.5 text-xs sm:text-sm min-h-[42px]';
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${getVariantClass()} ${getSizeClass()} ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};
