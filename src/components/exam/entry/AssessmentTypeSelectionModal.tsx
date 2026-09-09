// ============================================================================
// EDTECHRA ASSESSMENT BUILDER 2.0: ENTRY POINT SELECTION MODAL
// Choose between EXAM MODE (Graded, Timed, Security) and SURVEY MODE (Feedback, Branching)
// ============================================================================

import React from 'react';
import { X, Award, MessageSquareHeart, ArrowRight, Sparkles, CheckCircle2, Library } from 'lucide-react';
import { AssessmentType } from '../shared/ExamSchema';

interface AssessmentTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: AssessmentType) => void;
  onOpenLibrary?: () => void;
}

export const AssessmentTypeSelectionModal: React.FC<AssessmentTypeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
  onOpenLibrary
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b142c] border border-blue-800/80 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-950/90 via-[#0f1b3d] to-blue-950/90 border-b border-blue-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300 font-black shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">EdTechra Assessment Studio</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-bold text-slate-300">Choose Assessment Type</span>
              </div>
              <h2 className="text-xl font-black text-white">Create New Assessment</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-blue-900/40 cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selection Cards Grid (3 Cards) */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* EXAM CARD */}
          <div
            onClick={() => onSelectType('exam')}
            className="p-6 rounded-3xl bg-gradient-to-b from-[#0f1d42] to-[#0a142e] border-2 border-indigo-600/50 hover:border-indigo-400 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-600/20 group flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300 shadow-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Award className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-black uppercase tracking-wider text-indigo-300">
                  Graded & Timed
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-indigo-300 transition-colors">
                  EXAM
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Assess knowledge, skills, and student learning outcomes with rigorous grading rules.
                </p>
              </div>

              {/* Bullet Highlights */}
              <div className="space-y-2 pt-2 border-t border-blue-900/60 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Objective & Subjective grading with answer keys</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Server-authoritative timer & deadline expiry</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Passing marks, multiple attempts, & password security</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 group-hover:bg-indigo-500 transition-all"
            >
              <span>Create Exam</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* SURVEY CARD */}
          <div
            onClick={() => onSelectType('survey')}
            className="p-6 rounded-3xl bg-gradient-to-b from-[#0f233b] to-[#0a192c] border-2 border-teal-600/50 hover:border-teal-400 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-teal-600/20 group flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all pointer-events-none" />

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-600/30 border border-teal-400/50 flex items-center justify-center text-teal-300 shadow-lg group-hover:bg-teal-600 group-hover:text-white transition-all">
                <MessageSquareHeart className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-[10px] font-black uppercase tracking-wider text-teal-300">
                  Feedback & Polls
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-teal-300 transition-colors">
                  SURVEY
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Collect student opinions, course feedback, polls, and registrations without marks or pressure.
                </p>
              </div>

              {/* Bullet Highlights */}
              <div className="space-y-2 pt-2 border-t border-blue-900/60 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>No grading, marks, or pass/fail stress</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Conditional branching logic & section jumps</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Anonymous responses & visual distribution charts</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-3.5 px-5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 group-hover:bg-teal-500 transition-all"
            >
              <span>Create Survey</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* EXAM LIBRARY CARD */}
          <div
            onClick={() => {
              if (onOpenLibrary) {
                onOpenLibrary();
              } else {
                onSelectType('exam');
              }
            }}
            className="p-6 rounded-3xl bg-gradient-to-b from-[#17143e] to-[#0c0d29] border-2 border-purple-600/50 hover:border-purple-400 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-600/20 group flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-lg group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Library className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-black uppercase tracking-wider text-purple-300">
                  Teacher Repository
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
                  EXAM LIBRARY
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Browse, manage, edit, preview, and republish your saved and previously created exams.
                </p>
              </div>

              {/* Bullet Highlights */}
              <div className="space-y-2 pt-2 border-t border-blue-900/60 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Search & filter past classroom assessments</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Instant live preview & student share link copying</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Edit in Studio or republish without duplicates</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-3.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 group-hover:bg-purple-500 transition-all"
            >
              <span>View Exams</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer info note */}
        <div className="p-4 bg-[#070e1f] border-t border-blue-900/70 text-center text-xs text-slate-400 font-medium">
          You can customize question types, Canva themes, and settings inside the visual builder at any time.
        </div>
      </div>
    </div>
  );
};
