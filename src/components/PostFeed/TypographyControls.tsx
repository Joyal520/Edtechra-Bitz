import React, { useState, useEffect } from 'react';
import { Type } from 'lucide-react';

export type TextSizeLevel = 'small' | 'medium' | 'large';

interface TypographyControlsProps {
  className?: string;
  showLabel?: boolean;
}

export const TypographyControls: React.FC<TypographyControlsProps> = ({
  className = '',
  showLabel = false
}) => {
  const [currentSize, setCurrentSize] = useState<TextSizeLevel>('medium');

  // Initialize and synchronize text size from DOM / localStorage
  useEffect(() => {
    const getInitialSize = (): TextSizeLevel => {
      if (typeof window === 'undefined') return 'medium';
      const domSize = document.documentElement.getAttribute('data-text-size');
      if (domSize === 'small' || domSize === 'medium' || domSize === 'large') {
        return domSize;
      }
      const saved = localStorage.getItem('edtechra_text_size');
      if (saved === 'small' || saved === 'medium' || saved === 'large') {
        return saved;
      }
      return 'medium';
    };

    const initial = getInitialSize();
    setCurrentSize(initial);
    document.documentElement.setAttribute('data-text-size', initial);

    const handleSizeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (
        customEvent.detail === 'small' ||
        customEvent.detail === 'medium' ||
        customEvent.detail === 'large'
      ) {
        setCurrentSize(customEvent.detail as TextSizeLevel);
      }
    };

    window.addEventListener('edtechra:text-size-changed', handleSizeEvent);
    return () => {
      window.removeEventListener('edtechra:text-size-changed', handleSizeEvent);
    };
  }, []);

  const handleSelectSize = (size: TextSizeLevel) => {
    setCurrentSize(size);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-text-size', size);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('edtechra_text_size', size);
      window.dispatchEvent(
        new CustomEvent('edtechra:text-size-changed', { detail: size })
      );
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1 sm:gap-1.5 ${className}`}
      role="group"
      aria-label="Educational text size controls"
    >
      {showLabel && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 mr-1">
          <Type className="w-3 h-3 text-slate-400" />
          <span>Text Size</span>
        </span>
      )}

      <div className="inline-flex items-center p-0.5 bg-slate-100/90 border border-slate-200 rounded-xl shadow-2xs">
        {/* A- (Decrease) */}
        <button
          type="button"
          onClick={() => handleSelectSize('small')}
          aria-label="Decrease educational text size (A−)"
          title="Decrease educational text size"
          aria-pressed={currentSize === 'small'}
          className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center cursor-pointer select-none ${
            currentSize === 'small'
              ? 'bg-[#026fc3] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <span>A<span className="text-[10px] ml-0.5 font-bold">−</span></span>
        </button>

        {/* A (Reset / Default) */}
        <button
          type="button"
          onClick={() => handleSelectSize('medium')}
          aria-label="Reset educational text size to default (A)"
          title="Reset educational text size to standard"
          aria-pressed={currentSize === 'medium'}
          className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center cursor-pointer select-none ${
            currentSize === 'medium'
              ? 'bg-[#026fc3] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <span>A</span>
        </button>

        {/* A+ (Increase) */}
        <button
          type="button"
          onClick={() => handleSelectSize('large')}
          aria-label="Increase educational text size (A+)"
          title="Increase educational text size"
          aria-pressed={currentSize === 'large'}
          className={`h-7 px-2 sm:px-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center cursor-pointer select-none ${
            currentSize === 'large'
              ? 'bg-[#026fc3] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
        >
          <span>A<span className="text-[10px] ml-0.5 font-bold">+</span></span>
        </button>
      </div>
    </div>
  );
};
