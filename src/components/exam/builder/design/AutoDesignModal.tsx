// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: AUTO DESIGN MODAL ("DESIGN WITH AI")
// Conversational visual theme generator matching Canva-style presets
// ============================================================================

import React, { useState } from 'react';
import { X, Sparkles, Wand2, Check } from 'lucide-react';
import { AssessmentThemeConfig, THEME_PRESETS } from '../../shared/themePresets';

interface AutoDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTheme: (theme: AssessmentThemeConfig) => void;
}

export const AutoDesignModal: React.FC<AutoDesignModalProps> = ({
  isOpen,
  onClose,
  onApplyTheme
}) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedTheme, setSuggestedTheme] = useState<AssessmentThemeConfig | null>(null);
  const [explanation, setExplanation] = useState<string>('');

  if (!isOpen) return null;

  const quickPrompts = [
    'Make this exam playful and fun for Grade 5 elementary students',
    'Give this exam a modern high-school biology & chemistry science theme',
    'Make this assessment look like a professional Cambridge academic exam',
    'Create an energetic colorful pop theme for an ICT quiz',
    'Make this assessment calm with natural earthy tones'
  ];

  const handleGenerate = (textToUse?: string) => {
    const input = (textToUse || prompt).toLowerCase();
    if (!input.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      let matched: AssessmentThemeConfig = THEME_PRESETS.modern_academy;
      let reason = 'Selected clean academic typography and authoritative indigo styling.';

      if (input.includes('kid') || input.includes('elementary') || input.includes('fun') || input.includes('playful')) {
        matched = THEME_PRESETS.kids_explorer;
        reason = 'Applied sunny warm tones, rounded card badges, and friendly display typography.';
      } else if (input.includes('science') || input.includes('biology') || input.includes('chemistry') || input.includes('lab')) {
        matched = THEME_PRESETS.science_lab;
        reason = 'Applied beaker cyan & emerald chemistry palette with structured card borders.';
      } else if (input.includes('tech') || input.includes('ict') || input.includes('code') || input.includes('cyber') || input.includes('future')) {
        matched = THEME_PRESETS.future_tech;
        reason = 'Applied neon cyan, electric violet, monospaced accents, and cyber glass cards.';
      } else if (input.includes('english') || input.includes('reading') || input.includes('literature') || input.includes('book')) {
        matched = THEME_PRESETS.english_adventure;
        reason = 'Applied warm literary parchment tones, serif headings, and crimson badges.';
      } else if (input.includes('pop') || input.includes('color') || input.includes('creative') || input.includes('vibrant')) {
        matched = THEME_PRESETS.color_pop;
        reason = 'Applied vibrant neo-brutalist pink and purple energetic surfaces.';
      } else if (input.includes('nature') || input.includes('earth') || input.includes('calm') || input.includes('green')) {
        matched = THEME_PRESETS.nature_classroom;
        reason = 'Applied earthy sage and botanical papercut styling for a tranquil test environment.';
      } else if (input.includes('minimal') || input.includes('clean') || input.includes('swiss') || input.includes('simple')) {
        matched = THEME_PRESETS.minimal_pro;
        reason = 'Applied monochrome high-whitespace slate with refined hairline borders.';
      } else if (input.includes('dark') || input.includes('luxury') || input.includes('premium')) {
        matched = THEME_PRESETS.dark_premium;
        reason = 'Applied obsidian glass with champagne gold accents.';
      }

      setSuggestedTheme(matched);
      setExplanation(reason);
      setIsProcessing(false);
    }, 600);
  };

  const handleApply = () => {
    if (!suggestedTheme) return;
    onApplyTheme(suggestedTheme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Design With AI</h3>
              <p className="text-xs text-slate-600 font-medium">Describe the mood, topic, or grade to generate styling.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 bg-white">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-800">
              How should your assessment look and feel?
            </label>
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Make it modern and scientific for high school students..."
                className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-500 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isProcessing || !prompt.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer disabled:opacity-30 transition-all shadow-xs"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Or pick an inspiration:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(qp);
                    handleGenerate(qp);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-slate-900 cursor-pointer transition-all text-left"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested Theme Preview Card */}
          {suggestedTheme && (
            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{suggestedTheme.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">
                    Suggested Theme
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: suggestedTheme.primaryColor }} />
                  <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: suggestedTheme.secondaryColor }} />
                  <span className="w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: suggestedTheme.accentColor }} />
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                "{explanation}"
              </p>

              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Apply This Theme to Assessment</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
