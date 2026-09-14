// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: TEACHING PLAN REVIEW SCREEN (PHASE 2A)
// ============================================================================

import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  RefreshCw,
  Edit3,
  Save,
  ArrowLeft,
  Users,
  Target,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Check,
  X,
  Award
} from 'lucide-react';
import { TeachingPlan, DailyLessonPlan, LessonActivity } from '@/services/teachingPlannerService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';

interface PlanReviewScreenProps {
  plan: TeachingPlan;
  status: 'draft' | 'approved' | 'archived';
  isSaving: boolean;
  isRegeneratingDay: boolean;
  onApproveAndSave: (updatedPlan: TeachingPlan) => void;
  onSaveDraft: (updatedPlan: TeachingPlan) => void;
  onRegenerateFullPlan: () => void;
  onRegenerateDay: (dayNumber: number, teacherInstructions: string) => void;
  onBackToForm: () => void;
}

export const PlanReviewScreen: React.FC<PlanReviewScreenProps> = ({
  plan: initialPlan,
  status: initialStatus,
  isSaving,
  isRegeneratingDay,
  onApproveAndSave,
  onSaveDraft,
  onRegenerateFullPlan,
  onRegenerateDay,
  onBackToForm
}) => {
  const [currentPlan, setCurrentPlan] = useState<TeachingPlan>(initialPlan);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDayModal, setActiveDayModal] = useState<number | null>(null);
  const [dayInstructions, setDayInstructions] = useState('');

  // Keep internal state updated if parent changes plan
  React.useEffect(() => {
    setCurrentPlan(initialPlan);
  }, [initialPlan]);

  const handleUpdateDayField = (dayIndex: number, field: keyof DailyLessonPlan, value: any) => {
    const updatedDays = [...currentPlan.daily_plan];
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], [field]: value };
    setCurrentPlan({ ...currentPlan, daily_plan: updatedDays });
  };

  const handleUpdateActivity = (dayIndex: number, actIndex: number, field: keyof LessonActivity, value: any) => {
    const updatedDays = [...currentPlan.daily_plan];
    const updatedActivities = [...updatedDays[dayIndex].activities];
    updatedActivities[actIndex] = { ...updatedActivities[actIndex], [field]: value };
    updatedDays[dayIndex] = { ...updatedDays[dayIndex], activities: updatedActivities };
    setCurrentPlan({ ...currentPlan, daily_plan: updatedDays });
  };

  const handleTriggerRegenerateDay = (dayNum: number) => {
    setActiveDayModal(null);
    onRegenerateDay(dayNum, dayInstructions);
    setDayInstructions('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Action Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToForm}
            className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Back to planner form"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {currentPlan.title}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  initialStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {initialStatus === 'approved' ? '● Approved Plan' : '○ Draft Plan'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Topic: <strong className="text-slate-800">{currentPlan.topic}</strong> &bull; {currentPlan.duration_days} Days &bull; {currentPlan.lesson_duration_minutes} Mins/lesson
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              isEditing
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done Editing' : 'Edit Plan'}</span>
          </button>

          <button
            type="button"
            onClick={onRegenerateFullPlan}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            title="Regenerate full plan with fresh pedagogical reasoning"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Full</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSaveDraft(currentPlan)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-slate-600" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onApproveAndSave(currentPlan)}
            className="btn-liquid-primary px-5 py-2.5 text-xs font-black shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-200" />
            <span>{isSaving ? 'Saving...' : 'Approve & Save Plan'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Overview & Class Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Goal & Objectives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Learning Goal Card */}
          <div className="bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 rounded-3xl p-6 border-2 border-sky-100 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-sky-800">
              <Target className="w-5 h-5 text-[#026fc3]" />
              <h3 className="text-base font-black tracking-tight">Learning Goal &amp; Intended Outcome</h3>
            </div>
            {isEditing ? (
              <textarea
                rows={2}
                value={currentPlan.learning_goal}
                onChange={e => setCurrentPlan({ ...currentPlan, learning_goal: e.target.value })}
                className="w-full p-3 bg-white rounded-xl border border-sky-300 text-sm font-semibold text-slate-900"
              />
            ) : (
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                <InlineMarkdown text={currentPlan.learning_goal} />
              </p>
            )}

            <div className="pt-2 border-t border-sky-100/80 space-y-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Key Learning Objectives
              </span>
              <ul className="space-y-1.5">
                {currentPlan.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span><InlineMarkdown text={obj} /></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Grounded Classroom Evidence Profile */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black uppercase tracking-wider">Class Profile Evidence</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                currentPlan.class_profile.data_sufficiency === 'comprehensive'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {currentPlan.class_profile.data_sufficiency === 'comprehensive' ? 'Class Evidence' : 'Initial Diagnostic'}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              <InlineMarkdown text={currentPlan.class_profile.evidence_summary} />
            </p>

            {/* Strengths */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Class Strengths</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPlan.class_profile.strengths.map((str, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                    {str}
                  </span>
                ))}
              </div>
            </div>

            {/* Areas for Focus */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Focus &amp; Support Areas</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPlan.class_profile.weaknesses.map((w, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Sequence */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#026fc3] to-sky-400 text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Daily Teaching Breakdown ({currentPlan.duration_days} Days)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Paced activities, formative checks, and homework for every lesson.
              </p>
            </div>
          </div>
        </div>

        {/* Day Cards */}
        <div className="space-y-4">
          {currentPlan.daily_plan.map((dayPlan, dayIdx) => (
            <div
              key={dayPlan.day}
              className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-xs hover:border-sky-300 transition-all"
            >
              {/* Day Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-sky-50/30 to-indigo-50/20 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#026fc3] text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                    {dayPlan.day}
                  </span>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={dayPlan.title}
                        onChange={e => handleUpdateDayField(dayIdx, 'title', e.target.value)}
                        className="px-2 py-1 bg-white rounded-lg border border-slate-300 text-base font-black text-slate-900"
                      />
                    ) : (
                      <h4 className="text-base font-black text-slate-900">
                        {dayPlan.title}
                      </h4>
                    )}
                    <span className="text-xs text-slate-500 font-medium">
                      Focus: <strong className="text-slate-800"><InlineMarkdown text={dayPlan.lesson_focus} /></strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={isRegeneratingDay}
                    onClick={() => setActiveDayModal(dayPlan.day)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-[#026fc3] border border-sky-200 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingDay ? 'animate-spin' : ''}`} />
                    <span>Regenerate Day {dayPlan.day}</span>
                  </button>
                </div>
              </div>

              {/* Day Content */}
              <div className="p-5 sm:p-6 space-y-4">
                {/* Activities Breakdown */}
                <div className="space-y-2.5">
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                    Lesson Activities ({currentPlan.lesson_duration_minutes} Minutes Total)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dayPlan.activities.map((act, actIdx) => (
                      <div
                        key={actIdx}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-black text-slate-900">{act.name}</strong>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-black text-indigo-700">
                              {act.duration_minutes}m
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#026fc3] text-[10px] font-black capitalize">
                              {act.grouping.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={act.description}
                            onChange={e => handleUpdateActivity(dayIdx, actIdx, 'description', e.target.value)}
                            className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 font-medium"
                          />
                        ) : (
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            <InlineMarkdown text={act.description} />
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assessment & Homework Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
                    <span className="font-black text-emerald-900 block mb-0.5 uppercase tracking-wider text-[10px]">
                      Formative Assessment Checkpoint
                    </span>
                    <p className="text-emerald-850 font-semibold">
                      <InlineMarkdown text={dayPlan.assessment} />
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/80">
                    <span className="font-black text-indigo-900 block mb-0.5 uppercase tracking-wider text-[10px]">
                      Homework / Extension Task
                    </span>
                    <p className="text-indigo-850 font-semibold">
                      <InlineMarkdown text={dayPlan.homework} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Differentiation & Pedagogical Support Strategies */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Support Strategy */}
        <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-3xl p-6 border-2 border-amber-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-850">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h4 className="text-base font-black tracking-tight">Support for Struggling Students</h4>
          </div>
          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
            <InlineMarkdown text={currentPlan.differentiation.support_strategy} />
          </p>
          <div className="pt-2 border-t border-amber-100 flex flex-wrap gap-1.5">
            {currentPlan.differentiation.support_students.map((st, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                {st}
              </span>
            ))}
          </div>
        </div>

        {/* Extension Strategy */}
        <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-3xl p-6 border-2 border-purple-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-purple-850">
            <Award className="w-5 h-5 text-purple-600" />
            <h4 className="text-base font-black tracking-tight">Extension for Advanced Learners</h4>
          </div>
          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
            <InlineMarkdown text={currentPlan.differentiation.extension_strategy} />
          </p>
          <div className="pt-2 border-t border-purple-100 flex flex-wrap gap-1.5">
            {currentPlan.differentiation.advanced_students.map((st, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[11px] font-bold">
                {st}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Pedagogical Actions (Future Phase 2B Compatibility - Recommendations ONLY) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-400/30">
              <Sparkles className="w-3 h-3" />
              <span>Phase 2B Recommendations &bull; No Auto-Execution</span>
            </div>
            <h4 className="text-base sm:text-lg font-black tracking-tight text-white">
              Recommended Pedagogical Actions
            </h4>
          </div>
          <p className="text-xs text-slate-300 max-w-sm">
            These diagnostic and revision recommendations will connect directly to the Action Execution Bus in Phase 2B.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentPlan.recommended_actions.map((act, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300 tracking-tight">{act.title}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  act.priority === 'high' ? 'bg-rose-500/30 text-rose-200 border border-rose-400/30' : 'bg-sky-500/30 text-sky-200 border border-sky-400/30'
                }`}>
                  {act.priority} priority
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                <InlineMarkdown text={act.reason} />
              </p>
              <span className="text-[10px] text-slate-400 font-semibold block capitalize pt-1">
                Type: {act.type.replace('_', ' ')} (Recommendation only)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Success Criteria */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs space-y-3">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Evaluation &amp; Success Criteria</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {currentPlan.success_criteria.map((crit, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 text-xs font-semibold text-emerald-950 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-200/80 text-emerald-900 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span><InlineMarkdown text={crit} /></span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Approval Footer */}
      <div className="p-6 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-3xl border-2 border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-black text-slate-900">Ready to teach this plan?</h4>
          <p className="text-xs text-slate-600 font-medium">
            Approve and save this plan to your classroom library. You can revisit, edit, or adjust it anytime.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onSaveDraft(currentPlan)}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 text-xs font-black transition-all cursor-pointer active:scale-95"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => onApproveAndSave(currentPlan)}
            disabled={isSaving}
            className="btn-liquid-primary flex-1 sm:flex-none py-3 px-6 text-sm font-black shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-200" />
            <span>{isSaving ? 'Saving...' : 'Approve & Save Plan'}</span>
          </button>
        </div>
      </div>

      {/* Single-Day Regeneration Modal */}
      {activeDayModal !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#026fc3]" />
                <h3 className="text-lg font-black text-slate-900">
                  Regenerate Day {activeDayModal}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              How would you like to adapt Day {activeDayModal}? The AI will regenerate the activities, focus, and formative assessment specifically for this day while keeping the rest of your plan untouched.
            </p>

            <textarea
              rows={3}
              value={dayInstructions}
              onChange={e => setDayInstructions(e.target.value)}
              placeholder="e.g. Focus on interactive group roleplay games; allocate more time to guided scaffolding; include an exit ticket on irregular verbs."
              className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-sky-500 focus:bg-white"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleTriggerRegenerateDay(activeDayModal)}
                className="btn-liquid-primary px-5 py-2.5 text-xs font-black shadow-md cursor-pointer"
              >
                Regenerate Day {activeDayModal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
