// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM INSTRUCTIONS (START SCREEN)
// Pre-examination briefing before server timer begins
// ============================================================================

import React, { useState } from 'react';
import {
  Clock,
  Award,
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CanonicalExamV1 } from '../shared/ExamSchema';
import { calculateExamTotalMarks, calculateTotalQuestionCount } from '../shared/scoringUtilities';

interface ExamInstructionsProps {
  exam: CanonicalExamV1;
  isStarting: boolean;
  onBeginExam: (password?: string) => void;
  onClose?: () => void;
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({
  exam,
  isStarting,
  onBeginExam,
  onClose
}) => {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const totalMarks = calculateExamTotalMarks(exam.sections);
  const totalQuestions = calculateTotalQuestionCount(exam.sections);
  const passMarks = Math.ceil((totalMarks * (exam.exam.passPercentage || 40)) / 100);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (exam.exam.password) {
      if (password.trim() !== exam.exam.password.trim()) {
        setPasswordError('Incorrect exam password. Please check with your teacher.');
        return;
      }
    }
    onBeginExam(password);
  };

  return (
    <div className="min-h-screen bg-[#070e1f] text-white flex flex-col items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0b142c] border border-blue-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-indigo-950/90 via-blue-950/80 to-purple-950/90 p-6 sm:p-8 border-b border-blue-800/80 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EdTechra Examination</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            {exam.exam.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-bold text-slate-300">
            <span className="px-2.5 py-1 rounded-lg bg-[#070e1f]/80 border border-blue-900/80 text-blue-300">
              {exam.exam.subject}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#070e1f]/80 border border-blue-900/80 text-purple-300">
              {exam.exam.grade}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#070e1f]/80 border border-blue-900/80 text-indigo-300">
              {exam.exam.examType || 'Assessment'}
            </span>
          </div>
        </div>

        {/* Exam Metrics Grid */}
        <div className="grid grid-cols-3 divide-x divide-blue-900/60 bg-[#091124] border-b border-blue-900/80 text-center py-4">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Duration
            </div>
            <div className="text-base font-black text-white">{exam.exam.durationMinutes} Mins</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              Questions
            </div>
            <div className="text-base font-black text-white">{totalQuestions} Total</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              Total Marks
            </div>
            <div className="text-base font-black text-emerald-400">{totalMarks} Marks</div>
          </div>
        </div>

        {/* Content Body & Instructions */}
        <form onSubmit={handleStart} className="p-6 sm:p-8 space-y-6 flex-1">
          {/* Teacher Instructions */}
          {exam.exam.instructions && (
            <div className="p-4 rounded-2xl bg-[#0f1b3d] border border-blue-800/70 space-y-1.5">
              <div className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Teacher Instructions
              </div>
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                {exam.exam.instructions}
              </p>
            </div>
          )}

          {/* Important Rules Checklist */}
          <div className="space-y-3">
            <div className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Examination Guidelines
            </div>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Server-Authoritative Timer:</strong> The timer begins the moment you click "Begin Examination" and does not stop if you close your browser.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Continuous Autosave:</strong> Your answers are saved automatically as you work. In case of page refresh, your answers are safely restored.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Pass Benchmark:</strong> {exam.exam.passPercentage}% ({passMarks} / {totalMarks} marks).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Submission:</strong> Ensure you click "Submit Exam" before time expires. If time runs out, your saved answers are automatically submitted.
                </span>
              </li>
            </ul>
          </div>

          {/* Password Prompt if required */}
          {exam.exam.password && (
            <div className="p-4 rounded-2xl bg-[#0e1a39] border border-amber-500/50 space-y-2">
              <label className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Proctored Exam Password Required
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter access password provided by your teacher..."
                className="w-full px-4 py-2.5 bg-[#070e1f] border border-blue-800/80 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-amber-400"
              />
              {passwordError && (
                <p className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {passwordError}
                </p>
              )}
            </div>
          )}

          {/* Start Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-blue-800/80 text-slate-300 hover:text-white text-xs font-black cursor-pointer"
              >
                Cancel & Return
              </button>
            )}

            <button
              type="submit"
              disabled={isStarting}
              className="w-full sm:w-auto flex-1 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 cursor-pointer active:scale-95 transition-all"
            >
              <span>{isStarting ? 'Initializing Exam Session...' : 'Begin Examination'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
