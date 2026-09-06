// ============================================================================
// EDTECHRA DIGITAL EXAMINATION PLATFORM: EXAM DETAILS (STEP 1)
// ============================================================================

import React from 'react';
import { BookOpen, GraduationCap, Award, FileText, Sparkles, Layers, Info } from 'lucide-react';
import { ExamDifficulty, ExamMetadata, ExamType } from '../shared/ExamSchema';

interface ExamDetailsProps {
  metadata: ExamMetadata;
  sourceMaterial: string;
  onChangeMetadata: (updates: Partial<ExamMetadata>) => void;
  onChangeSourceMaterial: (text: string) => void;
}

const EXAM_TYPES: { type: ExamType; label: string; desc: string }[] = [
  { type: 'Unit Test', label: 'Unit Test', desc: 'Focused assessment on a single chapter or learning unit' },
  { type: 'Mid Term', label: 'Mid-Term', desc: 'Mid-semester milestone examination' },
  { type: 'Final Exam', label: 'Final Exam', desc: 'Comprehensive end-of-term summative assessment' },
  { type: 'Practice Test', label: 'Practice Test', desc: 'Formative test for revision & self-assessment' },
  { type: 'Quiz', label: 'Quiz', desc: 'Quick check for understanding' },
  { type: 'Assignment', label: 'Assignment', desc: 'Structured homework or take-home test' },
  { type: 'Diagnostic Test', label: 'Diagnostic', desc: 'Pre-assessment to identify student skill gaps' },
  { type: 'Mock Exam', label: 'Mock Exam', desc: 'Full exam simulation under formal conditions' },
  { type: 'Custom', label: 'Custom', desc: 'Teacher-tailored assessment structure' }
];

const DIFFICULTIES: { level: ExamDifficulty; label: string; desc: string; color: string }[] = [
  { level: 'Easy', label: 'Easy', desc: 'Foundational recall and basic concepts', color: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/30' },
  { level: 'Medium', label: 'Medium', desc: 'Balanced application and analysis', color: 'border-indigo-500/50 text-indigo-300 bg-indigo-950/30' },
  { level: 'Hard', label: 'Hard', desc: 'Rigorous critical thinking and problem-solving', color: 'border-rose-500/50 text-rose-300 bg-rose-950/30' },
  { level: 'Mixed', label: 'Mixed', desc: 'Dynamic distribution across all levels (Recommended)', color: 'border-purple-500/50 text-purple-300 bg-purple-950/30' }
];

export const ExamDetails: React.FC<ExamDetailsProps> = ({
  metadata,
  sourceMaterial,
  onChangeMetadata,
  onChangeSourceMaterial
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-blue-950/60 to-purple-950/70 p-6 rounded-3xl border border-indigo-500/30 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0 text-indigo-300 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white tracking-wide">Step 1: Exam Information</h3>
            <p className="text-xs text-indigo-200/80 leading-relaxed max-w-2xl">
              Specify the foundational details for your examination. You do not need to calculate or balance question marks here—the system handles scoring automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Title */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-400" />
            Exam Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => onChangeMetadata({ title: e.target.value })}
            placeholder="e.g., Grade 8 English Mid-Term Assessment: Tenses & Comprehension"
            className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Subject <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={metadata.subject}
            onChange={(e) => onChangeMetadata({ subject: e.target.value })}
            placeholder="e.g., English, Science, Mathematics, ICT"
            className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>

        {/* Grade / Target Level */}
        <div className="space-y-2">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            Grade / Level <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={metadata.grade}
            onChange={(e) => onChangeMetadata({ grade: e.target.value })}
            placeholder="e.g., Grade 8, High School, Level B1"
            className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>

        {/* Topic / Subject Area */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            Topic / Subject Area <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={metadata.topic || ''}
            onChange={(e) => onChangeMetadata({ topic: e.target.value })}
            placeholder="e.g., Present Perfect Continuous vs Simple Past, Passive Voice, Cellular Biology"
            className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-semibold text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>
      </div>

      {/* Exam Type Selector (Visual Cards) */}
      <div className="space-y-3">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
          Exam Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {EXAM_TYPES.map((t) => {
            const isSelected = metadata.examType === t.type;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => onChangeMetadata({ examType: t.type })}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/40 scale-[1.02]'
                    : 'bg-[#0d1733]/90 text-slate-300 border-blue-800/50 hover:bg-[#16224c] hover:border-blue-600/60'
                }`}
              >
                <div className="font-black text-xs">{t.label}</div>
                <div className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty Selector (Visual Chips) */}
      <div className="space-y-3">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
          Overall Difficulty
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DIFFICULTIES.map((d) => {
            const isSelected = metadata.difficulty === d.level;
            return (
              <button
                key={d.level}
                type="button"
                onClick={() => onChangeMetadata({ difficulty: d.level })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? `${d.color} ring-2 ring-indigo-400/50 shadow-md scale-[1.02]`
                    : 'bg-[#0d1733]/90 text-slate-300 border-blue-800/50 hover:bg-[#16224c]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs">{d.label}</span>
                  {isSelected && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/20">Selected</span>}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{d.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional Description */}
      <div className="space-y-2">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-400" />
          Exam Description / Instructions for Students <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={metadata.description || ''}
          onChange={(e) => onChangeMetadata({ description: e.target.value })}
          placeholder="Brief student instructions, syllabus boundaries, or assessment notes..."
          className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-medium text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all resize-y"
        />
      </div>

      {/* Optional Source Material / Notes for AI Grounding */}
      <div className="space-y-2">
        <label className="text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-indigo-400" />
          Source Material / Notes / Lesson Text <span className="text-slate-400 font-normal lowercase">(optional reference)</span>
        </label>
        <p className="text-[11px] text-slate-400">
          Paste teacher notes, textbook excerpts, or lecture transcripts to strictly ground the AI assessment in your classroom material.
        </p>
        <textarea
          rows={4}
          value={sourceMaterial}
          onChange={(e) => onChangeSourceMaterial(e.target.value)}
          placeholder="Paste lecture text, key concepts, vocabulary lists, or reading comprehension passage here..."
          className="w-full px-4 py-3 bg-[#0d1733] border border-blue-800/70 rounded-2xl text-sm font-medium text-white placeholder:text-blue-300/40 focus:outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all resize-y font-mono text-xs"
        />
      </div>
    </div>
  );
};
