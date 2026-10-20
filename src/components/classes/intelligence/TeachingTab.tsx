// ============================================================================
// EDTECHRA TEACHING INTELLIGENCE: TEACHING TAB (PART A.3)
// Merges:
// 1. "WHAT SHOULD I DO NEXT?" (Sequence: Learn, Practise, Check, Reassess)
// 2. Action buttons ([Create Notes], [Create Practice], [Create Quiz], [Plan Lesson])
// 3. Action Interventions Queue (Powered by Action Bus without technical jargon)
// 4. Multi-Day Lesson Planner (Powered by Teaching Planner)
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Calendar,
  Zap,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { CourseAnalyticsSummary } from '@/types/courseStudio';
import { TeachingIntelligenceResponse } from '@/services/teachingIntelligenceService';
import { AIActionsDashboard } from '../actions/AIActionsDashboard';
import { AITeachingPlannerTab } from '../planner/AITeachingPlannerTab';
import { actionExecutionService, ActionType } from '@/services/actionExecutionService';

interface TeachingTabProps {
  classroom: Classroom;
  data: TeachingIntelligenceResponse | null;
  courseAnalytics?: CourseAnalyticsSummary | null;
  targetTopic?: string;
  onActionTriggered?: (actionLabel: string) => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
}

type TeachingSubView = 'actions' | 'planner';

export const TeachingTab: React.FC<TeachingTabProps> = ({
  classroom,
  data,
  courseAnalytics: courseAnalyticsProp,
  targetTopic,
  onActionTriggered,
  onOpenChatWithPrompt
}) => {
  const [subView, setSubView] = useState<TeachingSubView>('actions');
  const [creatingQuickAction, setCreatingQuickAction] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const activeCourseAnalytics: CourseAnalyticsSummary | null = courseAnalyticsProp || (data?.metrics as any)?.course_analytics || null;
  const metrics = data?.metrics?.class_summary;
  const classHealth = data?.metrics?.class_health;
  const intel = data?.intelligence;
  const topicPerf = data?.metrics?.topic_performance || [];

  const totalStudents = metrics?.total_students || activeCourseAnalytics?.overview?.total_enrolled_students || classroom.student_count || 0;
  const strugglingCount = classHealth?.strugglingCount ?? (data?.metrics?.students_needing_attention?.length || 0);

  // Derive target topic from classroom & course evidence
  const courseWeakConcept = activeCourseAnalytics?.concept_mastery?.find(c => c.status === 'needs_support' || c.status === 'at_risk')?.concept;
  const learningGapTopic = targetTopic || intel?.teach_next?.[0]?.topic || data?.metrics?.top_weaknesses?.[0]?.topic || topicPerf.find(t => t.score < 65)?.topic || courseWeakConcept || 'Foundational Concepts';
  const strugglingStudentCount = Math.min(strugglingCount > 0 ? strugglingCount : 1, totalStudents > 0 ? totalStudents : 1);

  // Build evidence-backed "What Should I Teach Next?" observations
  const teachingObservations = useMemo(() => {
    const bullets: Array<{ text: string; type: 'gap' | 'course' | 'strength' }> = [];

    if (totalStudents > 0 && learningGapTopic) {
      bullets.push({
        text: `${strugglingStudentCount} of ${totalStudents} students need additional practice with ${learningGapTopic}.`,
        type: 'gap'
      });
    }

    if (activeCourseAnalytics) {
      const difficultLesson = activeCourseAnalytics.most_difficult_lessons?.[0];
      if (difficultLesson) {
        bullets.push({
          text: `${difficultLesson.title} has the lowest average performance (${Math.round(difficultLesson.accuracy_percentage)}%).`,
          type: 'course'
        });
      }

      const classStudents = classroom?.id
        ? activeCourseAnalytics.student_performance.filter(s => s.classroom_id === classroom.id)
        : activeCourseAnalytics.student_performance;
      const effectiveStudents = classStudents.length > 0 ? classStudents : activeCourseAnalytics.student_performance;
      const behindCount = effectiveStudents.filter(s => s.progress_percent < 40 && s.status !== 'strong').length;
      if (behindCount > 0) {
        bullets.push({
          text: `${behindCount} ${behindCount === 1 ? 'student has' : 'students have'} fallen behind the course schedule in "${activeCourseAnalytics.course?.title || 'Assigned Course'}".`,
          type: 'course'
        });
      }

      const topStrong = activeCourseAnalytics.concept_mastery?.find(c => c.status === 'strong');
      if (topStrong) {
        bullets.push({
          text: `${topStrong.concept} performance is strong (${Math.round(topStrong.accuracy_percentage)}% accuracy).`,
          type: 'strength'
        });
      }
    }

    if (data?.metrics?.top_strengths?.[0]) {
      const st = data.metrics.top_strengths[0];
      bullets.push({
        text: `${st.topic} performance is steady at ${Math.round(st.averageScore)}%.`,
        type: 'strength'
      });
    }

    return bullets;
  }, [totalStudents, strugglingStudentCount, learningGapTopic, activeCourseAnalytics, classroom?.id, data?.metrics?.top_strengths]);

  // Quick Action Creator
  const handleCreateQuickAction = async (actionType: ActionType, label: string) => {
    setCreatingQuickAction(actionType);
    setActionSuccessNotice(null);

    try {
      await actionExecutionService.createAction(classroom.id, {
        action_type: actionType,
        title: `${label}: ${learningGapTopic}`,
        description: `Immediate pedagogical action for ${learningGapTopic}`,
        reason: `Targeting identified learning gap in ${learningGapTopic}`,
        priority: 'high',
        payload: {
          topic: learningGapTopic,
          classroom_id: classroom.id,
          source: 'teaching_intelligence',
          action_label: label,
          target_students: (data?.metrics?.students_needing_attention || []).map(s => s.studentId || s.student_ref).slice(0, 5)
        }
      });

      setActionSuccessNotice(`Queued "${label}" for ${learningGapTopic}. You can review and approve it below.`);
      if (onActionTriggered) onActionTriggered(label);
      setTimeout(() => setActionSuccessNotice(null), 5000);
    } catch (err: any) {
      console.warn('Notice creating quick action:', err?.message);
    } finally {
      setCreatingQuickAction(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* =================================================================== */}
      {/* SUB-NAVIGATION TOGGLE (CLEAN, JARGON-FREE)                           */}
      {/* =================================================================== */}
      <div className="flex items-center justify-between gap-3 border-b border-[#C9E5E2] pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView('actions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-2 ${
              subView === 'actions'
                ? 'bg-[#087477] text-white shadow-xs'
                : 'bg-white text-[#36565A] hover:bg-[#E8F7F5] border border-[#C9E5E2]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Recommended Actions & Interventions</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('planner')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none flex items-center gap-2 ${
              subView === 'planner'
                ? 'bg-[#087477] text-white shadow-xs'
                : 'bg-white text-[#36565A] hover:bg-[#E8F7F5] border border-[#C9E5E2]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Multi-Day Lesson Planner</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-[#36565A]">
          {subView === 'actions' ? 'Action Execution Hub' : 'Full Curriculum Sequencing'}
        </span>
      </div>

      {/* Action success alert */}
      {actionSuccessNotice && (
        <div className="p-4 bg-[#E8F7F5] border border-[#159A9C] rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#087477] shrink-0" />
            <p className="text-xs font-bold text-[#173B3F]">{actionSuccessNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessNotice(null)}
            className="text-xs text-[#087477] hover:underline font-black cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW A: RECOMMENDED ACTIONS & WHAT TO DO NEXT                      */}
      {/* =================================================================== */}
      {subView === 'actions' ? (
        <div className="space-y-6">
          
          {/* WHAT SHOULD I DO NEXT? HERO CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#C9E5E2] shadow-xs space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F7F5] text-[#087477] border border-[#C9E5E2] text-[10px] font-black uppercase tracking-wider">
                  <Zap className="w-3 h-3 text-[#087477]" />
                  <span>Immediate Classroom Action</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#173B3F]">
                  What Should I Teach Next?
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#36565A] bg-[#E8F7F5] px-3 py-1.5 rounded-xl border border-[#C9E5E2]">
                  Target: {learningGapTopic}
                </span>
                {onOpenChatWithPrompt && (
                  <button
                    type="button"
                    onClick={() => onOpenChatWithPrompt(`What pedagogical strategies should I use to reteach ${learningGapTopic}?`)}
                    className="px-3 py-1.5 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] border border-[#C9E5E2] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Ask AI Teacher
                  </button>
                )}
              </div>
            </div>

            {/* Context & Reason + Evidence-Backed Observations */}
            <div className="p-4 bg-[#E8F7F5]/50 rounded-2xl border border-[#C9E5E2] space-y-2.5 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#087477] block">
                Pedagogical Priority & Classroom Signals
              </span>
              <p className="text-sm font-bold text-[#173B3F] leading-snug">
                {strugglingStudentCount} of {totalStudents} students are struggling with {learningGapTopic}.
              </p>
              <p className="text-[#36565A] font-medium leading-relaxed">
                {intel?.teach_next?.[0]?.why || activeCourseAnalytics?.ai_insights?.recommended_action || 'Recent assessments show consistent confusion in foundational rules and error patterns.'}
              </p>

              {teachingObservations.length > 0 && (
                <div className="pt-2 border-t border-[#C9E5E2]/70 space-y-1.5">
                  {teachingObservations.map((obs, idx) => (
                    <div key={idx} className="flex items-start gap-2 font-semibold text-[#173B3F]">
                      {obs.type === 'gap' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      ) : obs.type === 'course' ? (
                        <BookOpen className="w-3.5 h-3.5 text-[#087477] shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <span>{obs.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4-Step Action Sequence (Learn, Practise, Check, Reassess) */}
            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#173B3F] block">
                Suggested 4-Step Teaching Sequence
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Step 1: Learn */}
                <div className="p-4 bg-white rounded-2xl border-2 border-[#C9E5E2] shadow-2xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-[#087477] text-white text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#087477]">
                      Learn
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#173B3F]">
                    Short Concept Notes
                  </h4>
                  <p className="text-xs text-[#36565A] font-medium leading-relaxed">
                    Provide clear rules and visual examples targeting {learningGapTopic}.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={Boolean(creatingQuickAction)}
                      onClick={() => handleCreateQuickAction('create_learning_resource', 'Create Concept Notes')}
                      className="w-full py-2 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] border border-[#C9E5E2] rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                    >
                      {creatingQuickAction ? 'Queuing...' : 'Create Notes'}
                    </button>
                  </div>
                </div>

                {/* Step 2: Practise */}
                <div className="p-4 bg-white rounded-2xl border-2 border-[#C9E5E2] shadow-2xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-[#159A9C] text-white text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#159A9C]">
                      Practise
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#173B3F]">
                    Guided Practice Task
                  </h4>
                  <p className="text-xs text-[#36565A] font-medium leading-relaxed">
                    Assign scaffolded exercises to reinforce foundational mechanics.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={Boolean(creatingQuickAction)}
                      onClick={() => handleCreateQuickAction('create_learning_resource', 'Assign Guided Practice')}
                      className="w-full py-2 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      {creatingQuickAction ? 'Queuing...' : 'Create Practice'}
                    </button>
                  </div>
                </div>

                {/* Step 3: Check */}
                <div className="p-4 bg-white rounded-2xl border-2 border-[#C9E5E2] shadow-2xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                      Check
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#173B3F]">
                    Formative Check Quiz
                  </h4>
                  <p className="text-xs text-[#36565A] font-medium leading-relaxed">
                    Run a 5-question formative quiz to check student recovery.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={Boolean(creatingQuickAction)}
                      onClick={() => handleCreateQuickAction('create_live_quiz', 'Formative Check Quiz')}
                      className="w-full py-2 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] border border-[#C9E5E2] rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                    >
                      {creatingQuickAction ? 'Queuing...' : 'Create Quiz'}
                    </button>
                  </div>
                </div>

                {/* Step 4: Reassess */}
                <div className="p-4 bg-white rounded-2xl border-2 border-[#C9E5E2] shadow-2xs space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      4
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                      Reassess
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#173B3F]">
                    Lesson Plan
                  </h4>
                  <p className="text-xs text-[#36565A] font-medium leading-relaxed">
                    Generate a structured multi-day lesson plan for deeper remediation.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSubView('planner')}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95"
                    >
                      Plan Lesson
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ACTIVE CLASSROOM ACTIONS DASHBOARD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#173B3F]">
                Active Classroom Interventions & Actions
              </span>
              <span className="text-xs font-bold text-[#36565A]">
                Idempotent & Safe Execution
              </span>
            </div>

            <AIActionsDashboard
              classroomId={classroom.id}
              classroomTitle={classroom.title}
              onNavigateToPlanner={() => setSubView('planner')}
            />
          </div>

        </div>
      ) : (
        /* =================================================================== */
        /* VIEW B: MULTI-DAY TEACHING PLANNER                                  */
        /* =================================================================== */
        <div className="space-y-4">
          <AITeachingPlannerTab
            classroom={classroom}
            onOpenActionCenter={() => setSubView('actions')}
          />
        </div>
      )}

    </div>
  );
};
