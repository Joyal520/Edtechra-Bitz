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
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Check,
  X,
  Award,
  Zap
} from 'lucide-react';
import { TeachingPlan, DailyLessonPlan, LessonActivity } from '@/services/teachingPlannerService';
import { actionExecutionService } from '@/services/actionExecutionService';
import { InlineMarkdown } from '../StructuredAIReportRenderer';
import { AIDebugBadge } from '../ai/AIDebugBadge';

interface PlanReviewScreenProps {
  plan: TeachingPlan;
  status: 'draft' | 'approved' | 'archived';
  isSaving: boolean;
  isRegeneratingDay: boolean;
  classroomId?: string;
  classroomTitle?: string;
  onApproveAndSave: (updatedPlan: TeachingPlan) => void;
  onSaveDraft: (updatedPlan: TeachingPlan) => void;
  onRegenerateFullPlan: () => void;
  onRegenerateDay: (dayNumber: number, teacherInstructions: string) => void;
  onBackToForm: () => void;
  onOpenActionCenter?: () => void;
}

export const PlanReviewScreen: React.FC<PlanReviewScreenProps> = ({
  plan: initialPlan,
  status: initialStatus,
  isSaving,
  isRegeneratingDay,
  classroomId,
  classroomTitle: _classroomTitle,
  onApproveAndSave,
  onSaveDraft,
  onRegenerateFullPlan,
  onRegenerateDay,
  onBackToForm,
  onOpenActionCenter
}) => {
  const [currentPlan, setCurrentPlan] = useState<TeachingPlan>(initialPlan);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDayModal, setActiveDayModal] = useState<number | null>(null);
  const [dayInstructions, setDayInstructions] = useState('');
  const [isConvertingActions, setIsConvertingActions] = useState(false);
  const [convertedCount, setConvertedCount] = useState<number | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

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

  const handleConvertActions = async () => {
    if (!classroomId) {
      setConversionError('Classroom ID is required to create actions.');
      return;
    }
    try {
      setIsConvertingActions(true);
      setConversionError(null);
      const actions = await actionExecutionService.createActionsFromPlan(classroomId, currentPlan);
      setConvertedCount(actions.length);
    } catch (err: any) {
      setConversionError(err.message || 'Failed to convert recommendations into actions.');
    } finally {
      setIsConvertingActions(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Action Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#C9E5E2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToForm}
            className="p-2.5 rounded-2xl border border-[#C9E5E2] hover:bg-[#E8F7F5] text-[#087477] transition-all cursor-pointer active:scale-95 shrink-0"
            title="Back to planner form"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-[#173B3F] tracking-tight">
                {currentPlan.title}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  initialStatus === 'approved'
                    ? 'bg-emerald-50 text-[#159A75] border border-emerald-200'
                    : 'bg-amber-50 text-[#D99500] border border-amber-200'
                }`}
              >
                {initialStatus === 'approved' ? '● Approved Plan' : '○ Draft Plan'}
              </span>
              <AIDebugBadge
                provider="openai"
                model="gpt-5-nano"
                taskType="Teaching Plan"
              />
            </div>
            <p className="text-xs text-[#36565A] font-medium mt-0.5">
              Topic: <strong className="text-[#173B3F]">{currentPlan.topic}</strong> &bull; {currentPlan.duration_days} Days &bull; {currentPlan.lesson_duration_minutes} Mins/lesson
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              isEditing
                ? 'bg-[#087477] text-white shadow-xs'
                : 'bg-white hover:bg-[#E8F7F5] text-[#36565A] border border-[#C9E5E2]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done Editing' : 'Edit Plan'}</span>
          </button>

          <button
            type="button"
            onClick={onRegenerateFullPlan}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#E8F7F5] text-[#36565A] border border-[#C9E5E2] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            title="Regenerate full plan with fresh pedagogical reasoning"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Full</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSaveDraft(currentPlan)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#E8F7F5] border border-[#C9E5E2] text-[#173B3F] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-[#36565A]" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => onApproveAndSave(currentPlan)}
            className="px-5 py-2.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4EFEC]" />
            <span>{isSaving ? 'Saving...' : 'Approve & Save Plan'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Overview & Class Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Goal & Objectives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Learning Goal Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#C9E5E2] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#087477]">
              <Target className="w-5 h-5 text-[#087477]" />
              <h3 className="text-base font-black text-[#173B3F] tracking-tight">Learning Goal &amp; Intended Outcome</h3>
            </div>
            {isEditing ? (
              <textarea
                rows={2}
                value={currentPlan.learning_goal}
                onChange={e => setCurrentPlan({ ...currentPlan, learning_goal: e.target.value })}
                className="w-full p-3 bg-white rounded-xl border border-[#C9E5E2] text-sm font-semibold text-[#173B3F] focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20"
              />
            ) : (
              <p className="text-sm font-semibold text-[#173B3F] leading-relaxed">
                <InlineMarkdown text={currentPlan.learning_goal} />
              </p>
            )}

            <div className="pt-3 border-t border-[#C9E5E2] space-y-2">
              <span className="text-xs font-black text-[#36565A] uppercase tracking-wider block">
                Key Learning Objectives
              </span>
              <ul className="space-y-1.5">
                {currentPlan.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium text-[#173B3F]">
                    <Check className="w-3.5 h-3.5 text-[#159A75] mt-0.5 shrink-0" />
                    <span><InlineMarkdown text={obj} /></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Grounded Classroom Evidence Profile */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#C9E5E2] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#173B3F]">
                <Users className="w-4 h-4 text-[#087477]" />
                <h3 className="text-xs font-black uppercase tracking-wider">Class Profile Evidence</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                currentPlan.class_profile.data_sufficiency === 'comprehensive'
                  ? 'bg-emerald-50 text-[#159A75] border border-emerald-200'
                  : 'bg-amber-50 text-[#D99500] border border-amber-200'
              }`}>
                {currentPlan.class_profile.data_sufficiency === 'comprehensive' ? 'Class Evidence' : 'Initial Diagnostic'}
              </span>
            </div>

            <p className="text-xs text-[#173B3F] font-medium leading-relaxed bg-[#E8F7F5]/50 p-3.5 rounded-xl border border-[#C9E5E2]">
              <InlineMarkdown text={currentPlan.class_profile.evidence_summary} />
            </p>

            {/* Strengths */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-[#159A75] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Class Strengths</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPlan.class_profile.strengths.map((str, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#159A75] text-xs font-bold">
                    {str}
                  </span>
                ))}
              </div>
            </div>

            {/* Areas for Focus */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-[#D99500] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Focus &amp; Support Areas</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPlan.class_profile.weaknesses.map((w, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[#D99500] text-xs font-bold">
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
            <div className="w-9 h-9 rounded-2xl bg-[#087477] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#173B3F] tracking-tight">
                Daily Teaching Breakdown ({currentPlan.duration_days} Days)
              </h3>
              <p className="text-xs text-[#36565A] font-medium">
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
              className="bg-white rounded-3xl border border-[#C9E5E2] overflow-hidden shadow-xs hover:border-[#159A9C] transition-all"
            >
              {/* Day Header */}
              <div className="p-4 sm:p-5 bg-[#E8F7F5]/50 border-b border-[#C9E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-[#087477] text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                    {dayPlan.day}
                  </span>
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={dayPlan.title}
                        onChange={e => handleUpdateDayField(dayIdx, 'title', e.target.value)}
                        className="px-2.5 py-1 bg-white rounded-lg border border-[#C9E5E2] text-base font-black text-[#173B3F]"
                      />
                    ) : (
                      <h4 className="text-base font-black text-[#173B3F]">
                        {dayPlan.title}
                      </h4>
                    )}
                    <span className="text-xs text-[#36565A] font-medium">
                      Focus: <strong className="text-[#173B3F]"><InlineMarkdown text={dayPlan.lesson_focus} /></strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={isRegeneratingDay}
                    onClick={() => setActiveDayModal(dayPlan.day)}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#E8F7F5] text-[#087477] border border-[#C9E5E2] text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
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
                  <span className="text-xs font-black text-[#36565A] uppercase tracking-wider block">
                    Lesson Activities ({currentPlan.lesson_duration_minutes} Minutes Total)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dayPlan.activities.map((act, actIdx) => (
                      <div
                        key={actIdx}
                        className="p-4 rounded-2xl bg-[#E8F7F5]/30 border border-[#C9E5E2] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-black text-[#173B3F]">{act.name}</strong>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#C9E5E2] text-[10px] font-black text-[#087477]">
                              {act.duration_minutes}m
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white text-[#159A75] border border-emerald-200 text-[10px] font-black capitalize">
                              {act.grouping.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={act.description}
                            onChange={e => handleUpdateActivity(dayIdx, actIdx, 'description', e.target.value)}
                            className="w-full p-2 bg-white rounded-lg border border-[#C9E5E2] text-xs text-[#173B3F] font-medium"
                          />
                        ) : (
                          <p className="text-xs text-[#36565A] font-medium leading-relaxed">
                            <InlineMarkdown text={act.description} />
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assessment & Homework Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#C9E5E2] text-xs">
                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <span className="font-black text-[#159A75] block mb-0.5 uppercase tracking-wider text-[10px]">
                      Formative Assessment Checkpoint
                    </span>
                    <p className="text-[#173B3F] font-semibold">
                      <InlineMarkdown text={dayPlan.assessment} />
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#E8F7F5]/70 rounded-xl border border-[#C9E5E2]">
                    <span className="font-black text-[#087477] block mb-0.5 uppercase tracking-wider text-[10px]">
                      Homework / Extension Task
                    </span>
                    <p className="text-[#173B3F] font-semibold">
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
        <div className="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#D99500]">
            <Lightbulb className="w-5 h-5 text-[#D99500]" />
            <h4 className="text-base font-black tracking-tight text-[#173B3F]">Support for Struggling Students</h4>
          </div>
          <p className="text-xs font-semibold text-[#173B3F] leading-relaxed">
            <InlineMarkdown text={currentPlan.differentiation.support_strategy} />
          </p>
          <div className="pt-2 border-t border-amber-100 flex flex-wrap gap-1.5">
            {currentPlan.differentiation.support_students.map((st, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[#D99500] text-[11px] font-bold">
                {st}
              </span>
            ))}
          </div>
        </div>

        {/* Extension Strategy */}
        <div className="bg-white rounded-3xl p-6 border border-[#C9E5E2] shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#087477]">
            <Award className="w-5 h-5 text-[#087477]" />
            <h4 className="text-base font-black tracking-tight text-[#173B3F]">Extension for Advanced Learners</h4>
          </div>
          <p className="text-xs font-semibold text-[#173B3F] leading-relaxed">
            <InlineMarkdown text={currentPlan.differentiation.extension_strategy} />
          </p>
          <div className="pt-2 border-t border-[#C9E5E2] flex flex-wrap gap-1.5">
            {currentPlan.differentiation.advanced_students.map((st, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-full bg-[#E8F7F5] border border-[#C9E5E2] text-[#087477] text-[11px] font-bold">
                {st}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Pedagogical Actions & Phase 2B Action Bus Integration */}
      <div className="bg-gradient-to-br from-[#173B3F] via-[#173B3F] to-[#087477] text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#D4EFEC] text-[10px] font-black uppercase tracking-wider border border-[#D4EFEC]/30">
              <Zap className="w-3 h-3 text-amber-300" />
              <span>AI Action Execution Bus (Phase 2B)</span>
            </div>
            <h4 className="text-base sm:text-lg font-black tracking-tight text-white">
              Recommended Pedagogical Actions
            </h4>
            <p className="text-xs text-[#D4EFEC] max-w-lg leading-relaxed font-medium">
              Transform approved pedagogical recommendations into safe, controlled, observable classroom actions (diagnostic exams, study notes, live quizzes, and announcements).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {convertedCount !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {convertedCount} Actions Created!
                </span>
                {onOpenActionCenter && (
                  <button
                    onClick={onOpenActionCenter}
                    className="px-4 py-2 bg-white hover:bg-[#E8F7F5] text-[#087477] rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                  >
                    View in Action Center &rarr;
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConvertActions}
                disabled={isConvertingActions || !classroomId}
                className="px-4.5 py-2.5 bg-white hover:bg-[#E8F7F5] text-[#087477] rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-[#087477] text-[#087477]" />
                <span>{isConvertingActions ? 'Converting...' : 'Convert to Executable Actions'}</span>
              </button>
            )}
          </div>
        </div>

        {conversionError && (
          <div className="p-3.5 bg-rose-950/70 border border-rose-700 rounded-xl text-xs text-rose-200 font-semibold">
            {conversionError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentPlan.recommended_actions.map((act, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2 hover:border-[#D4EFEC]/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white tracking-tight">{act.title}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  act.priority === 'high' ? 'bg-rose-500/40 text-rose-100 border border-rose-400/40' : 'bg-teal-500/30 text-teal-100 border border-teal-400/30'
                }`}>
                  {act.priority} priority
                </span>
              </div>
              <p className="text-xs text-[#E8F7F5] leading-relaxed font-medium">
                <InlineMarkdown text={act.reason} />
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-white/15 text-[10px] text-[#D4EFEC] font-semibold">
                <span className="capitalize">Type: {act.type.replace('_', ' ')}</span>
                <span className="text-emerald-300 font-bold">Safe Idempotent Action</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Criteria */}
      <div className="bg-white rounded-3xl p-6 border border-[#C9E5E2] shadow-xs space-y-3">
        <h4 className="text-sm font-black text-[#173B3F] uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#159A75]" />
          <span>Evaluation &amp; Success Criteria</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {currentPlan.success_criteria.map((crit, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-[#E8F7F5]/40 border border-[#C9E5E2] text-xs font-semibold text-[#173B3F] flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#087477] text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span><InlineMarkdown text={crit} /></span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Approval Footer */}
      <div className="p-6 bg-[#E8F7F5] rounded-3xl border border-[#C9E5E2] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-black text-[#173B3F]">Ready to teach this plan?</h4>
          <p className="text-xs text-[#36565A] font-medium mt-0.5">
            Approve and save this plan to your classroom library. You can revisit, edit, or adjust it anytime.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onSaveDraft(currentPlan)}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white hover:bg-[#D4EFEC] text-[#173B3F] border border-[#C9E5E2] text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => onApproveAndSave(currentPlan)}
            disabled={isSaving}
            className="flex-1 sm:flex-none py-3 px-6 text-sm font-black bg-[#087477] hover:bg-[#065e60] text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4EFEC]" />
            <span>{isSaving ? 'Saving...' : 'Approve & Save Plan'}</span>
          </button>
        </div>
      </div>

      {/* Single-Day Regeneration Modal */}
      {activeDayModal !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border-2 border-[#C9E5E2] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#087477]" />
                <h3 className="text-lg font-black text-[#173B3F]">
                  Regenerate Day {activeDayModal}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="p-1 rounded-lg text-[#36565A] hover:text-[#173B3F] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#36565A] font-medium leading-relaxed">
              How would you like to adapt Day {activeDayModal}? The AI will regenerate the activities, focus, and formative assessment specifically for this day while keeping the rest of your plan untouched.
            </p>

            <textarea
              rows={3}
              value={dayInstructions}
              onChange={e => setDayInstructions(e.target.value)}
              placeholder="e.g. Focus on interactive group roleplay games; allocate more time to guided scaffolding; include an exit ticket on irregular verbs."
              className="w-full p-3.5 bg-white border-2 border-[#C9E5E2] rounded-2xl text-xs font-semibold text-[#173B3F] focus:outline-hidden focus:border-[#159A9C]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveDayModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#36565A] hover:bg-[#E8F7F5]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleTriggerRegenerateDay(activeDayModal)}
                className="px-5 py-2.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
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
