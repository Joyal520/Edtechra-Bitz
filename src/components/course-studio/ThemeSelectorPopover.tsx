// ============================================================================
// EDTECHRA THEME SELECTOR POPOVER & MOBILE BOTTOM SHEET
// Visual palette switcher with 5 Reading Themes:
// Midnight Navy, Ocean Blue, Morning Mist, Aurora Blue, Cloud Light.
// Desktop: Anchored dropdown popover.
// Mobile (< 640px): Responsive bottom-sheet modal via Portal that fits 100%
// inside the mobile viewport with zero horizontal overflow.
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Check, X, Type } from 'lucide-react';
import { THEME_PRESETS } from '@/utils/courseThemes';
import { TextScale } from '@/utils/courseTextFormatting';

interface Props {
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
  textScale?: TextScale;
  onScaleDown?: () => void;
  onScaleUp?: () => void;
  showFontControls?: boolean;
}

export const ThemeSelectorPopover: React.FC<Props> = ({
  activeThemeId,
  onSelectTheme,
  textScale = 'md',
  onScaleDown,
  onScaleUp,
  showFontControls = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const desktopPopoverRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 360
  });

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(360, window.innerWidth - 24);
    let left = rect.right - popoverWidth;
    if (left < 12) left = 12;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    const estimatedHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let top: number;
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      // Intelligently open upward if constrained below
      top = Math.max(12, rect.top - estimatedHeight - 8);
    } else {
      // Open downward
      top = rect.bottom + 8;
    }

    setPopoverPos({ top, left, width: popoverWidth });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Close on outside click (desktop popover & mobile sheet) and Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        (!desktopPopoverRef.current || !desktopPopoverRef.current.contains(target)) &&
        (!sheetRef.current || !sheetRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activePreset = THEME_PRESETS.find(p => p.id === activeThemeId) || THEME_PRESETS[0];

  const renderThemeCards = (isMobileSheet: boolean) => (
    <div
      className={
        isMobileSheet
          ? 'grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5 w-full min-w-0 box-border'
          : 'grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1 w-full min-w-0 box-border'
      }
    >
      {THEME_PRESETS.map((preset, idx) => {
        const isSelected = preset.id === activeThemeId;
        // On mobile 2-col layout, if 5th item (Cloud Light), span full width or fit cleanly
        const isLastOddItem = isMobileSheet && idx === THEME_PRESETS.length - 1 && THEME_PRESETS.length % 2 === 1;

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              onSelectTheme(preset.id);
              if (!isMobileSheet) {
                setIsOpen(false);
              }
            }}
            className={`p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1.5 focus:outline-none min-w-0 w-full box-border ${
              isLastOddItem ? 'min-[360px]:col-span-2' : ''
            } ${isSelected ? 'shadow-md' : 'hover:bg-[#174A75]'}`}
            style={{
              backgroundColor: isSelected ? '#174A75' : '#0d2745',
              border: isSelected ? '2px solid #38BDF8' : '1px solid #315579',
              boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.28)' : 'none'
            }}
          >
            {/* Swatch Preview Box */}
            <div
              className="w-full h-10 rounded-lg border border-white/25 shadow-2xs relative flex items-center justify-between px-2.5 py-1.5 box-border"
              style={{ background: preset.previewCss }}
            >
              <span
                className="text-[11px] font-extrabold px-1.5 py-0.5 rounded"
                style={{
                  color: preset.textHex,
                  backgroundColor: preset.isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.85)'
                }}
              >
                Aa
              </span>
              {isSelected && (
                <span className="w-5 h-5 rounded-full bg-[#38BDF8] text-[#0B2340] flex items-center justify-center shadow-xs font-bold shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </div>

            {/* Preset Name & Tone */}
            <div className="min-w-0 w-full">
              <div className="text-xs font-bold text-white flex items-center justify-between gap-1 min-w-0">
                <span className="truncate">{preset.name}</span>
                {isSelected && (
                  <span className="text-[10px] text-[#38BDF8] font-black uppercase shrink-0">
                    Active
                  </span>
                )}
              </div>
              <div className="text-[10px] font-medium text-[#DCE8F5] truncate">
                {preset.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative inline-block shrink-0">
      {/* Trigger Button with Active Gradient Swatch */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-current/5 hover:bg-current/10 border border-current/15 transition-all text-xs font-bold cursor-pointer shrink-0"
        title="Reading Appearance"
      >
        <div
          className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-2xs shrink-0"
          style={{ background: activePreset.previewCss }}
        />
        <Palette className="w-3.5 h-3.5 opacity-80 shrink-0" />
        <span className="hidden md:inline text-[11px] font-semibold opacity-90 max-w-[90px] truncate">
          {activePreset.name}
        </span>
      </button>

      {/* DESKTOP POPOVER (sm and up) RENDERED VIA PORTAL TO OVERCOME STACKING CONTEXTS */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={desktopPopoverRef}
            role="dialog"
            aria-label="Reading Appearance"
            className="hidden sm:block fixed p-4 rounded-2xl shadow-2xl z-[1200] animate-in fade-in zoom-in-95 duration-150 box-border"
            style={{
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              width: `${popoverPos.width}px`,
              backgroundColor: '#0B2340',
              borderColor: '#315579',
              borderWidth: '1px',
              borderStyle: 'solid',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div
              className="flex items-center justify-between pb-3 mb-3"
              style={{ borderBottom: '1px solid #315579' }}
            >
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Reading Appearance
                </h4>
                <p className="text-[11px] font-medium text-[#DCE8F5]">
                  Choose your reading theme
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[#DCE8F5] hover:text-white hover:bg-[#174A75] transition-colors cursor-pointer"
                title="Close Appearance Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderThemeCards(false)}
          </div>,
          document.body
        )}

      {/* MOBILE BOTTOM SHEET MODAL (< sm, rendered via Portal to avoid header clipping) */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="sm:hidden fixed inset-0 z-[1200] flex items-end justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Reading Appearance"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
              onClick={() => setIsOpen(false)}
            />

            {/* Bottom Sheet Panel */}
            <div
              ref={sheetRef}
              className="relative z-10 w-full max-w-full max-h-[85dvh] rounded-t-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 box-border"
              style={{
                backgroundColor: '#0B2340',
                borderTop: '1px solid #315579',
                boxShadow: '0 -12px 32px rgba(0, 0, 0, 0.65)',
                paddingBottom: 'env(safe-area-inset-bottom, 12px)'
              }}
            >
              {/* Drag Handle Pill */}
              <div className="w-full pt-2.5 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>

              {/* Sheet Header */}
              <div
                className="px-4 pt-1 pb-3 flex items-center justify-between shrink-0"
                style={{ borderBottom: '1px solid #315579' }}
              >
                <div className="min-w-0 pr-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-white">
                    Reading Appearance
                  </h4>
                  <p className="text-xs font-medium text-[#DCE8F5]">
                    Choose your reading theme
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-[#DCE8F5] hover:text-white bg-[#133256] hover:bg-[#174A75] transition-colors cursor-pointer shrink-0"
                  aria-label="Close Reading Appearance"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Sheet Body */}
              <div className="px-4 py-3.5 overflow-y-auto overflow-x-hidden flex-1 space-y-3.5 min-h-0 box-border">
                {/* Optional Font Size Controls on Mobile */}
                {showFontControls && onScaleDown && onScaleUp && (
                  <div
                    className="p-3 rounded-xl flex items-center justify-between gap-2"
                    style={{ backgroundColor: '#0d2745', border: '1px solid #315579' }}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Type className="w-4 h-4 text-[#38BDF8]" />
                      <span>Text Size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onScaleDown}
                        disabled={textScale === 'sm'}
                        className="px-3 py-1.5 rounded-lg bg-[#174A75] hover:bg-[#1e5b8f] disabled:opacity-40 text-white text-xs font-black transition-all cursor-pointer"
                      >
                        A−
                      </button>
                      <span className="text-[11px] font-mono font-bold text-[#DCE8F5] uppercase min-w-[32px] text-center">
                        {textScale}
                      </span>
                      <button
                        type="button"
                        onClick={onScaleUp}
                        disabled={textScale === 'xxl'}
                        className="px-3 py-1.5 rounded-lg bg-[#174A75] hover:bg-[#1e5b8f] disabled:opacity-40 text-white text-xs font-black transition-all cursor-pointer"
                      >
                        A+
                      </button>
                    </div>
                  </div>
                )}

                {/* 5 Theme Cards */}
                {renderThemeCards(true)}
              </div>

              {/* Always-Accessible Footer Close Button */}
              <div
                className="px-4 pt-2.5 pb-3 shrink-0 flex items-center justify-end"
                style={{ borderTop: '1px solid #315579' }}
              >
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#174A75] hover:bg-[#1e5b8f] text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer text-center shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
