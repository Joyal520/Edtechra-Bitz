// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: ADD QUESTION INLINE BUTTON (LIGHT)
// Hover divider for inserting questions or opening the categorized modal
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  ListFilter,
  ToggleLeft,
  FileText,
  MinusSquare,
  ChevronDown
} from 'lucide-react';
import { SupportedQuestionType } from '../../shared/ExamSchema';
import { AssessmentThemeConfig } from '../../shared/themePresets';

interface AddQuestionInlineButtonProps {
  theme: AssessmentThemeConfig;
  onAddQuestion: (type?: SupportedQuestionType) => void;
  onOpenModal?: () => void;
  label?: string;
}

const QUICK_TYPES: { type: SupportedQuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'multiple_choice', label: 'Multiple Choice', icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> },
  { type: 'checkboxes', label: 'Checkboxes', icon: <ListFilter className="w-3.5 h-3.5 text-purple-600" /> },
  { type: 'true_false', label: 'True / False', icon: <ToggleLeft className="w-3.5 h-3.5 text-emerald-600" /> },
  { type: 'fill_in_blank', label: 'Fill in Blank', icon: <MinusSquare className="w-3.5 h-3.5 text-cyan-600" /> },
  { type: 'short_answer', label: 'Short Answer', icon: <FileText className="w-3.5 h-3.5 text-amber-600" /> },
];

export const AddQuestionInlineButton: React.FC<AddQuestionInlineButtonProps> = ({
  onAddQuestion,
  onOpenModal,
  label = 'Add Question'
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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
    <div className="relative py-2 group flex items-center justify-center my-1 select-none">
      {/* Visual divider line that highlights on hover */}
      <div className="absolute inset-x-0 h-px bg-slate-200 group-hover:bg-indigo-300 transition-colors" />

      {/* Button & Popover Container */}
      <div className="relative z-10" ref={popoverRef}>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-3 py-1 shadow-xs hover:border-indigo-400 group-hover:border-indigo-300 transition-all">
          <button
            type="button"
            onClick={() => {
              if (onOpenModal) {
                onOpenModal();
              } else {
                onAddQuestion('multiple_choice');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>{label}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopover(!showPopover);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            title="Quick question type picker"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showPopover ? 'rotate-180 text-indigo-600' : ''}`}
            />
          </button>
        </div>

        {/* Quick Question Type Picker Popover */}
        {showPopover && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-2xl p-2 shadow-xl border border-slate-200 bg-white z-50 animate-fadeIn">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2.5 py-1 mb-1">
              Quick Question Picker
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {QUICK_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onAddQuestion(item.type);
                    setShowPopover(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {onOpenModal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPopover(false);
                    onOpenModal();
                  }}
                  className="w-full mt-1 pt-1.5 border-t border-slate-100 text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 py-1"
                >
                  Browse all types...
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
