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
        <div
          role="dialog"
          aria-label="Reading Appearance Themes"
          className="absolute right-0 top-full mt-2 w-[320px] sm:w-[360px] p-4 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: '#0B2340',
            borderColor: '#315579',
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid #315579' }}>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Reading Appearance
              </h4>
              <p className="text-[11px] font-medium text-[#DCE8F5]">
                Select a subtle light gradient or midnight mode
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

          {/* Theme Presets Grid */}
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
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTheme(preset.id);
                      setIsOpen(false);
                    } else if (e.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1.5 focus:outline-none ${
                    isSelected
                      ? 'shadow-md'
                      : 'hover:bg-[#174A75]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? '#174A75' : '#0d2745',
                    border: isSelected ? '2px solid #38BDF8' : '1px solid #315579',
                    boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none'
                  }}
                >
                  {/* Swatch Preview Box */}
                  <div
                    className="w-full h-10 rounded-lg border border-white/20 shadow-2xs relative flex items-center justify-end p-1.5"
                    style={{ background: preset.previewCss }}
                  >
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#38BDF8] text-[#0B2340] flex items-center justify-center shadow-xs font-bold">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Preset Name & Tone */}
                  <div>
                    <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                      <span>{preset.name}</span>
                      {isSelected && (
                        <span className="text-[10px] text-[#38BDF8] font-black uppercase">Active</span>
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
        </div>
      )}
    </div>
  );
};
