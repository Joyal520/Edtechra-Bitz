// ============================================================================
// EDTECHRA THEME SELECTOR POPOVER
// Visual palette switcher with 10 Light Premium Gradients + Night Dark mode.
// Displays gradient preview cards, typography contrast checks, and active indicators.
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { THEME_PRESETS } from '@/utils/courseThemes';

interface Props {
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
}

export const ThemeSelectorPopover: React.FC<Props> = ({ activeThemeId, onSelectTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activePreset = THEME_PRESETS.find(p => p.id === activeThemeId) || THEME_PRESETS[0];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button with Active Gradient Swatch */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-current/5 hover:bg-current/10 border border-current/15 transition-all text-xs font-bold cursor-pointer"
        title="Change Reading Appearance"
      >
        <div
          className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-2xs shrink-0"
          style={{ background: activePreset.previewCss }}
        />
        <Palette className="w-3.5 h-3.5 opacity-70" />
        <span className="hidden sm:inline text-[11px] font-semibold opacity-90 max-w-[80px] truncate">
          {activePreset.name}
        </span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[320px] sm:w-[360px] p-4 rounded-2xl bg-white text-slate-900 shadow-2xl border border-stone-200 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Reading Appearance
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Select a subtle light gradient or midnight mode
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-stone-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 10 Gradient Presets Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {THEME_PRESETS.map((preset) => {
              const isSelected = preset.id === activeThemeId;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectTheme(preset.id);
                    setIsOpen(false);
                  }}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'border-[#026fc3] ring-2 ring-[#026fc3]/20 bg-sky-50/40 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/70'
                  }`}
                >
                  {/* Swatch Preview Box */}
                  <div
                    className="w-full h-10 rounded-lg border border-black/5 shadow-2xs relative flex items-center justify-end p-1.5"
                    style={{ background: preset.previewCss }}
                  >
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-[#026fc3] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Preset Name & Tone */}
                  <div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      {preset.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
