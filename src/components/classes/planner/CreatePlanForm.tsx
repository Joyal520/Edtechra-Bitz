// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: CREATE TEACHING PLAN FORM (PHASE 2A)
// ============================================================================

import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Clock,
  FileText,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { TeachingPlanInput } from '@/services/teachingPlannerService';
import { Classroom } from '@/types/classroom';

interface CreatePlanFormProps {
  classroom: Classroom;
  isGenerating: boolean;
  onSubmit: (input: TeachingPlanInput) => void;
  onOpenSavedPlans: () => void;
  savedPlansCount: number;
}

const DURATION_OPTIONS = [
  { days: 1, label: '1 Day', desc: 'Single focused lesson' },
  { days: 3, label: '3 Days', desc: 'Mini-unit immersion' },
  { days: 5, label: '5 Days', desc: 'Full-week curriculum' },
  { days: 7, label: '1 Week', desc: 'Extended 7-day module' },
  { days: 10, label: '2 Weeks', desc: 'In-depth 10-lesson mastery' }
];

const TIME_OPTIONS = [30, 45, 60, 90];

export const CreatePlanForm: React.FC<CreatePlanFormProps> = ({
  classroom,
  isGenerating,
  onSubmit,
  onOpenSavedPlans,
  savedPlansCount
}) => {
  const [topic, setTopic] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [content, setContent] = useState('');
  const [showContentField, setShowContentField] = useState(false);
  const [level, setLevel] = useState(classroom.grade || '');
  const [durationDays, setDurationDays] = useState(5);
  const [lessonMinutes, setLessonMinutes] = useState(45);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setValidationError('Please specify what topic you would like to teach.');
      return;
    }
    setValidationError('');

    onSubmit({
      topic: topic.trim(),
      learning_goal: learningGoal.trim() || undefined,
      content: content.trim() || undefined,
      level: level.trim() || classroom.grade || undefined,
      duration_days: durationDays,
      lesson_duration_minutes: lessonMinutes,
      teacher_notes: teacherNotes.trim() || undefined
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-br from-[#E8F7F5] via-[#E8F7F5]/90 to-[#D4EFEC] rounded-3xl p-6 sm:p-8 border border-[#C9E5E2] shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#C9E5E2] text-[#087477] text-xs font-black uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#087477]" />
              <span>AI Teaching Planner</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#173B3F] tracking-tight">
              What would you like to teach today?
            </h2>
            <p className="text-xs sm:text-sm text-[#36565A] font-medium leading-relaxed">
              Tell AI your teaching goal. The planner inspects your students&apos; real performance, assessments, and learning gaps to build a personalized, evidence-grounded curriculum.
            </p>
          </div>

          {savedPlansCount > 0 && (
            <button
              type="button"
              onClick={onOpenSavedPlans}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#E8F7F5] text-[#087477] border border-[#C9E5E2] text-xs font-bold shadow-xs hover:shadow-sm transition-all self-start sm:self-center cursor-pointer active:scale-95"
            >
              <FolderOpen className="w-4 h-4 text-[#087477]" />
              <span>Saved Plans ({savedPlansCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Input Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#C9E5E2] p-6 sm:p-8 shadow-xs space-y-6">
        {validationError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-[#C94B4B]">
            {validationError}
          </div>
        )}

        {/* 1. Classroom & Level Context Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#087477] border border-[#C9E5E2] flex items-center justify-center shrink-0 shadow-2xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[#36565A] font-bold uppercase tracking-wider text-[10px]">Classroom</span>
              <strong className="text-[#173B3F] font-black text-sm">{classroom.title}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#159A75] border border-[#C9E5E2] flex items-center justify-center shrink-0 shadow-2xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="block text-[#36565A] font-bold uppercase tracking-wider text-[10px]">Subject & Level</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#173B3F]">{classroom.subject || 'General'}</span>
                <span className="text-[#36565A]">&bull;</span>
                <input
                  type="text"
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  placeholder="e.g. Grade 8 / Intermediate"
                  className="px-2.5 py-1 bg-white rounded-lg border border-[#C9E5E2] text-xs font-bold text-[#173B3F] focus:outline-hidden focus:border-[#159A9C]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Topic Input */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase text-[#173B3F] tracking-wider">
            Topic or Subject Focus <span className="text-[#C94B4B]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Present Perfect Tense, Photosynthesis, Quadratic Equations..."
              className="w-full px-4.5 py-3.5 rounded-2xl bg-white border-2 border-[#C9E5E2] focus:border-[#159A9C] focus:ring-4 focus:ring-[#159A9C]/15 text-[#173B3F] font-bold text-base placeholder:text-[#36565A]/50 transition-all"
            />
          </div>
          <p className="text-xs text-[#36565A] font-medium">
            Be as specific or general as you like (e.g. &ldquo;Present Perfect vs. Past Simple with irregular verbs&rdquo;).
          </p>
        </div>

        {/* 3. Desired Learning Goal / Outcome */}
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase text-[#173B3F] tracking-wider">
            Desired Learning Goal <span className="text-[#36565A] font-normal lowercase">(What should students be able to do?)</span>
          </label>
          <textarea
            rows={2}
            value={learningGoal}
            onChange={e => setLearningGoal(e.target.value)}
            placeholder="e.g. Students will correctly identify when to use present perfect, conjugate irregular verbs with 85% accuracy, and apply them in short written dialogues."
            className="w-full p-4 rounded-2xl bg-white border-2 border-[#C9E5E2] focus:border-[#159A9C] focus:ring-4 focus:ring-[#159A9C]/15 text-[#173B3F] font-semibold text-sm placeholder:text-[#36565A]/50 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* 4. Duration Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black uppercase text-[#173B3F] tracking-wider">
              Teaching Duration
            </label>
            <span className="text-xs font-black text-[#087477] bg-[#E8F7F5] px-3 py-1 rounded-full border border-[#C9E5E2]">
              {durationDays} {durationDays === 1 ? 'Day' : 'Days'} Plan
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setDurationDays(opt.days)}
                className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer select-none active:scale-95 ${
                  durationDays === opt.days
                    ? 'border-[#087477] bg-gradient-to-b from-[#E8F7F5] to-white text-[#087477] ring-2 ring-[#159A9C]/30 shadow-xs'
                    : 'border-[#C9E5E2] hover:border-[#159A9C]/60 bg-white text-[#36565A]'
                }`}
              >
                <span className="block text-sm font-black">{opt.label}</span>
                <span className="block text-[10px] text-[#36565A] font-medium truncate mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Lesson Minutes Per Session */}
        <div className="space-y-3">
          <label className="block text-xs font-black uppercase text-[#173B3F] tracking-wider">
            Teaching Time per Lesson
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {TIME_OPTIONS.map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => setLessonMinutes(mins)}
                className={`px-4 py-2 rounded-xl border-2 text-xs font-black transition-all cursor-pointer active:scale-95 ${
                  lessonMinutes === mins
                    ? 'border-[#087477] bg-[#E8F7F5] text-[#087477] ring-2 ring-[#159A9C]/30 shadow-xs'
                    : 'border-[#C9E5E2] hover:border-[#159A9C]/60 bg-white text-[#36565A]'
                }`}
              >
                <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                <span>{mins} mins</span>
              </button>
            ))}
          </div>
        </div>

        {/* 6. Optional Learning Material / Text */}
        <div className="pt-2 border-t border-[#C9E5E2] space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowContentField(prev => !prev)}
              className="text-xs font-bold text-[#087477] hover:text-[#065e60] flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showContentField ? 'Hide Learning Material Text' : '+ Add Optional Reference Text / Material'}</span>
            </button>
          </div>

          {showContentField && (
            <div className="space-y-2 animate-fadeIn">
              <textarea
                rows={4}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste reference text, textbook excerpt, vocabulary list, or notes the AI should incorporate into the activities and lesson plans..."
                className="w-full p-4 rounded-2xl bg-white border-2 border-[#C9E5E2] focus:border-[#159A9C] focus:ring-4 focus:ring-[#159A9C]/15 text-[#173B3F] font-medium text-xs placeholder:text-[#36565A]/50 transition-all resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* 7. Optional Teacher Instructions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowNotesField(prev => !prev)}
              className="text-xs font-bold text-[#36565A] hover:text-[#173B3F] flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showNotesField ? 'Hide Teacher Instructions' : '+ Add Optional Teacher Instructions'}</span>
            </button>
          </div>

          {showNotesField && (
            <div className="space-y-2 animate-fadeIn">
              <textarea
                rows={2}
                value={teacherNotes}
                onChange={e => setTeacherNotes(e.target.value)}
                placeholder="e.g. Include paired speaking games on Day 2; emphasize formative exit tickets; keep homework under 15 minutes."
                className="w-full p-4 rounded-2xl bg-white border-2 border-[#C9E5E2] focus:border-[#159A9C] focus:ring-4 focus:ring-[#159A9C]/15 text-[#173B3F] font-medium text-xs placeholder:text-[#36565A]/50 transition-all resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Action Button & Evidence Notice */}
        <div className="pt-4 space-y-3">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-4 px-6 text-base font-black bg-[#087477] hover:bg-[#065e60] text-white rounded-2xl shadow-lg shadow-[#087477]/20 hover:shadow-xl hover:shadow-[#087477]/30 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-98"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Analyzing Classroom Intelligence &amp; Building Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-[#D4EFEC]" />
                <span>Create AI Teaching Plan</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-[#36565A] font-medium flex items-center justify-center gap-1.5">
            <span>&bull;</span>
            <span>Real classroom records &bull; Gemini pedagogical reasoning &bull; Teacher review &amp; approval</span>
            <span>&bull;</span>
          </p>
        </div>
      </form>
    </div>
  );
};
