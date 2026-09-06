// ============================================================================
// EDTECHRA ASSESSMENT BUILDER: 3 CREATION MODES ENTRY MODAL
// Choose: 1. Build Manually | 2. Build with AI (Blueprint) | 3. O/L Style Examination
// ============================================================================

import React from 'react';
import {
  X,
  Sparkles,
  PenTool,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export type CreationMode = 'manual' | 'ai_blueprint' | 'ol_style';

interface CreationModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: CreationMode) => void;
}

export const CreationModeModal: React.FC<CreationModeModalProps> = ({
  isOpen,
  onClose,
  onSelectMode
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  EdTechra Assessment Studio
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">Creation Workflow</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                How would you like to create this examination?
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Creation Cards Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50/30">
          {/* Option 1: BUILD MANUALLY */}
          <div
            onClick={() => onSelectMode('manual')}
            className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-500 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                <PenTool className="w-6 h-6" />
              </div>

              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 mb-1.5">
                  Full Authoring Control
                </span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  1. Build Manually
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Start with a clean canvas. Author and customize every section, activity, question, and answer key yourself.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Custom question authoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Flexible sections & activities</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Interactive question bank</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Build Manually</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Option 2: BUILD WITH AI */}
          <div
            onClick={() => onSelectMode('ai_blueprint')}
            className="p-5 rounded-2xl bg-white border-2 border-indigo-500 hover:border-indigo-600 cursor-pointer transition-all shadow-md shadow-indigo-100 hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between space-y-5 group relative"
          >
            <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
              Recommended
            </div>

            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 mb-1.5">
                  Blueprint Specification
                </span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  2. Build with AI
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Define your exact blueprint: topic, total marks, question distribution, Bloom's skills, and let AI generate the complete exam.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Exact question distribution matrix</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Bloom's skill weighting</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Fully editable generated result</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <span>Define Blueprint & Generate</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Option 3: O/L STYLE EXAMINATION */}
          <div
            onClick={() => onSelectMode('ol_style')}
            className="p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-500 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between space-y-5 group"
          >
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <GraduationCap className="w-6 h-6" />
              </div>

              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mb-1.5">
                  Curriculum Practice
                </span>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  3. O/L Style Examination
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Pre-configured O/L English Practice template: Grammar, Vocabulary, Reading Comprehension, Picture Description, Guided Writing & Listening.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Grammar & Vocabulary tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Picture Description with Rubric</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Reading Comprehension passage</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Load O/L Practice Template</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
