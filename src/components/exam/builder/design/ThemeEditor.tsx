// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: THEME EDITOR (CANVA STYLE)
// Visual preset switcher + custom color palette & typography controls
// ============================================================================

import React from 'react';
import { Palette, Check, Sparkles, Sliders, Type, Layers } from 'lucide-react';
import { AssessmentThemeConfig, THEME_PRESETS } from '../../shared/themePresets';

interface ThemeEditorProps {
  currentTheme: AssessmentThemeConfig;
  onChangeTheme: (theme: AssessmentThemeConfig) => void;
  onOpenAutoDesign: () => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({
  currentTheme,
  onChangeTheme,
  onOpenAutoDesign
}) => {
  const presets = Object.values(THEME_PRESETS);

  const handleSelectPreset = (preset: AssessmentThemeConfig) => {
    onChangeTheme({
      ...preset,
      coverImageUrl: currentTheme.coverImageUrl // preserve cover image if set
    });
  };

  const handleUpdateCustom = (updates: Partial<AssessmentThemeConfig>) => {
    onChangeTheme({
      ...currentTheme,
      ...updates
    });
  };

  return (
    <div className="space-y-6 text-white p-1">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-pink-400" />
            Canva Theme Studio
          </h3>
          <p className="text-xs text-slate-400">Choose a visual preset or customize colors and card styles.</p>
        </div>

        <button
          type="button"
          onClick={onOpenAutoDesign}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Design with AI</span>
        </button>
      </div>

      {/* 10 Ready-Made Presets Grid */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          Curated Visual Presets (10 Themes)
        </label>
        <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {presets.map((p) => {
            const isSelected = currentTheme.presetId === p.presetId;
            return (
              <button
                key={p.presetId}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'border-pink-500 ring-2 ring-pink-500/30 shadow-lg shadow-pink-500/20'
                    : 'border-blue-900/60 hover:border-blue-700 bg-[#070e1f]'
                }`}
                style={{ backgroundColor: p.cardBg }}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white truncate">{p.name}</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight">{p.description}</p>
                </div>

                {/* Color Swatch Dots */}
                <div className="flex items-center gap-1.5 pt-2.5">
                  <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: p.primaryColor }} />
                  <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: p.secondaryColor }} />
                  <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: p.accentColor }} />
                  <span className="text-[10px] text-slate-400 capitalize ml-auto font-mono">{p.category}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fine-Tuning Palette Controls */}
      <div className="space-y-4 pt-4 border-t border-blue-900/60">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          Color & Surface Customizer
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentTheme.primaryColor}
                onChange={(e) => handleUpdateCustom({ primaryColor: e.target.value, primaryHover: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs font-mono text-slate-300 uppercase">{currentTheme.primaryColor}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Secondary Accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentTheme.secondaryColor}
                onChange={(e) => handleUpdateCustom({ secondaryColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs font-mono text-slate-300 uppercase">{currentTheme.secondaryColor}</span>
            </div>
          </div>
        </div>

        {/* Card Style Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Card Surface Style
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['elevated', 'flat', 'glass', 'outlined'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => handleUpdateCustom({ cardStyle: style })}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-black capitalize transition-all cursor-pointer ${
                  currentTheme.cardStyle === style
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#070e1f] text-slate-400 hover:text-white border border-blue-900/60'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Typography Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            Typography
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['sans', 'serif', 'mono', 'display'] as const).map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => handleUpdateCustom({ typography: font })}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-black capitalize transition-all cursor-pointer ${
                  currentTheme.typography === font
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#070e1f] text-slate-400 hover:text-white border border-blue-900/60'
                }`}
              >
                {font}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
