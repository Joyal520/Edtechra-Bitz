// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: ADD QUESTION INLINE BUTTON
// Floating hover divider for inserting questions between items on the canvas
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  ListFilter,
  ToggleLeft,
  FileText,
  HelpCircle,
  Sliders,
  SplitSquareVertical,
  ChevronDown
} from 'lucide-react';
import { SupportedQuestionType } from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';

interface AddQuestionInlineButtonProps {
  theme: AssessmentThemeConfig;
  onAddQuestion: (type?: SupportedQuestionType) => void;
  label?: string;
}

const QUICK_TYPES: { type: SupportedQuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'multiple_choice', label: 'Multiple Choice', icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> },
  { type: 'multiple_select', label: 'Checkboxes', icon: <ListFilter className="w-3.5 h-3.5 text-emerald-400" /> },
  { type: 'short_answer', label: 'Short Answer', icon: <FileText className="w-3.5 h-3.5 text-cyan-400" /> },
  { type: 'true_false', label: 'True / False', icon: <ToggleLeft className="w-3.5 h-3.5 text-amber-400" /> },
  { type: 'linear_scale', label: 'Rating Scale', icon: <Sliders className="w-3.5 h-3.5 text-purple-400" /> },
  { type: 'fill_in_blank', label: 'Fill in Blank', icon: <HelpCircle className="w-3.5 h-3.5 text-pink-400" /> },
  { type: 'matching', label: 'Matching Pairs', icon: <SplitSquareVertical className="w-3.5 h-3.5 text-orange-400" /> },
];

export const AddQuestionInlineButton: React.FC<AddQuestionInlineButtonProps> = ({
  theme,
  onAddQuestion,
  label = 'Add Question'
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  return (
    <div className="relative py-2 group flex items-center justify-center my-1">
      {/* Visual divider line that glows on hover */}
      <div className="absolute inset-x-0 h-px bg-blue-900/40 group-hover:bg-indigo-500/40 transition-colors" />

      {/* Button & Popover Container */}
      <div className="relative z-10" ref={popoverRef}>
        <div className="flex items-center gap-1 bg-[#091124] border border-blue-800/60 rounded-full px-3 py-1 shadow-md hover:border-indigo-400 group-hover:border-indigo-500/60 transition-all">
          <button
            type="button"
            onClick={() => onAddQuestion()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>{label}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover(!showPopover);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-indigo-300 hover:bg-white/5 transition-colors"
            title="Choose specific question type"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showPopover ? 'rotate-180 text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Quick Question Type Picker Popover */}
        {showPopover && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 rounded-2xl p-2 shadow-2xl border border-blue-800/80 backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
            style={{ backgroundColor: theme.cardBg }}
          >
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2.5 py-1 mb-1">
              Select Question Type
            </div>
            <div className="grid grid-cols-1 gap-1">
              {QUICK_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onAddQuestion(item.type);
                    setShowPopover(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span className="p-1 rounded-lg bg-[#050b18] border border-blue-900/60">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
