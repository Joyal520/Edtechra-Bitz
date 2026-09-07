// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: 3 CREATION MODES ENTRY MODAL
// 1. STANDARD EXAM (Primary / Recommended Default)
// 2. O/L STYLE EXAM (Curriculum Practice Simulation)
// 3. CUSTOM EXAM (Advanced Blank Canvas / Manual Authoring)
// ============================================================================

import React from 'react';
import {
  X,
  Sparkles,
  GraduationCap,
  PenTool,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export type CreationMode = 'standard' | 'ol_style' | 'custom' | 'manual' | 'ai_blueprint';

interface CreationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'standard' | 'ol_style' | 'custom') => void;
}

export const CreationModeModal: React.FC<CreationModeModalProps> = ({
  isOpen,
  onClose,
  onSelectMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto select-none">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  EdTechra Assessment Studio
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">Creation Workflow</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Create New Examination
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Creation Cards Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/40">
          {/* Option 1: STANDARD EXAM (PRIMARY / DEFAULT) */}
          <div
            onClick={() => onSelectMode('standard')}
            className="p-6 rounded-2xl bg-white border-2 border-indigo-600 cursor-pointer transition-all shadow-lg shadow-indigo-100/60 hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between space-y-5 group relative"
          >
            <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
              Primary • Recommended
            </div>

            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 mb-1.5">
                  Automated Blueprint
                </span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  1. STANDARD EXAM
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                  "Recommended question mix created by EdTechra"
                </p>
                <p className="text-[11px] text-slate-500 font-normal leading-normal mt-1">
                  You provide lesson notes & topic. EdTechra automatically designs the complete assessment structure.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-800 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Grammar & Core Language</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Reading Comprehension</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Listening & Picture Tasks</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <span>Create Standard Exam</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Option 2: O/L STYLE EXAM */}
          <div
            onClick={() => onSelectMode('ol_style')}
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-500 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <GraduationCap className="w-6 h-6" />
              </div>

              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1.5">
                  Curriculum Practice
                </span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  2. O/L STYLE EXAM
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                  "Create an examination using an O/L-style assessment structure"
                </p>
                <p className="text-[11px] text-slate-500 font-normal leading-normal mt-1">
                  Structured tests following national Sri Lankan O/L English papers: tests 1–8 with authentic rubrics.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-800 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Grammar & Vocabulary tests</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Picture Description with Rubric</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Reading & Guided Writing</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <span>Build O/L Style Exam</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Option 3: CUSTOM EXAM */}
          <div
            onClick={() => onSelectMode('custom')}
            className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-400 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <PenTool className="w-6 h-6" />
              </div>

              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300 mb-1.5">
                  Advanced Mode
                </span>
                <h3 className="text-base font-black text-slate-900 group-hover:text-slate-800 transition-colors">
                  3. CUSTOM EXAM
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                  "Choose your own question types and structure"
                </p>
                <p className="text-[11px] text-slate-500 font-normal leading-normal mt-1">
                  Start with a blank canvas. Add custom sections, individual questions, and configure your own assessment layout.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-800 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Manual question assembly</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Categorized question picker</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Full authoring flexibility</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <span>Build Custom Exam</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer philosophy notice */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-600 font-medium">
          Teachers provide the content. EdTechra designs the assessment structure. You can adjust and edit questions at any time.
        </div>
      </div>
    </div>
  );
};
