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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b142c] border border-blue-800/90 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-950 via-[#0f1b3d] to-pink-950 border-b border-blue-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Design With AI</h3>
              <p className="text-xs text-slate-400">Describe the mood, topic, or grade to generate styling.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-900/40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">
              How should your assessment look and feel?
            </label>
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. Make it modern and scientific for high school students..."
                className="w-full pl-4 pr-12 py-3 bg-[#070e1f] border border-blue-800/80 rounded-2xl text-xs font-semibold text-white focus:outline-hidden focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isProcessing || !prompt.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl cursor-pointer disabled:opacity-30 transition-all"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400">Or pick an inspiration:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(qp);
                    handleGenerate(qp);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 text-[10px] font-semibold text-slate-300 hover:text-white cursor-pointer transition-all text-left"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested Theme Preview Card */}
          {suggestedTheme && (
            <div className="p-4 rounded-2xl border border-pink-500/50 bg-[#070e1f] space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{suggestedTheme.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 font-bold">
                    Suggested Theme
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: suggestedTheme.primaryColor }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: suggestedTheme.secondaryColor }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: suggestedTheme.accentColor }} />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{explanation}"
              </p>

              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
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
