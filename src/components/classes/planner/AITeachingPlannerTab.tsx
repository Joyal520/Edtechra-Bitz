// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: AI TEACHING PLANNER TAB CONTAINER (PHASE 2A)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Classroom } from '@/types/classroom';
import {
  teachingPlannerService,
  TeachingPlan,
  TeachingPlanInput,
  SavedTeachingPlanRecord
} from '@/services/teachingPlannerService';
import { CreatePlanForm } from './CreatePlanForm';
import { PlanReviewScreen } from './PlanReviewScreen';
import { SavedPlansList } from './SavedPlansList';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface AITeachingPlannerTabProps {
  classroom: Classroom;
  onOpenActionCenter?: () => void;
}

type PlannerViewMode = 'form' | 'review' | 'saved_list';

export const AITeachingPlannerTab: React.FC<AITeachingPlannerTabProps> = ({
  classroom,
  onOpenActionCenter
}) => {
  const [viewMode, setViewMode] = useState<PlannerViewMode>('form');
  const [currentPlan, setCurrentPlan] = useState<TeachingPlan | null>(null);
  const [planStatus, setPlanStatus] = useState<'draft' | 'approved' | 'archived'>('draft');
  const [currentRecordId, setCurrentRecordId] = useState<string | undefined>(undefined);

  const [savedPlans, setSavedPlans] = useState<SavedTeachingPlanRecord[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingDay, setIsRegeneratingDay] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load saved plans on mount
  useEffect(() => {
    if (classroom?.id) {
      loadSavedPlans();
    }
  }, [classroom?.id]);

  const loadSavedPlans = async () => {
    if (!classroom?.id) return;
    setLoadingPlans(true);
    try {
      const plans = await teachingPlannerService.getPlans(classroom.id);
      setSavedPlans(plans);
    } catch (err: any) {
      console.warn('Notice loading saved plans:', err?.message);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleGeneratePlan = async (input: TeachingPlanInput) => {
    if (!classroom?.id) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await teachingPlannerService.generatePlan(classroom.id, input);
      if (res.success && res.plan) {
        setCurrentPlan(res.plan);
        setPlanStatus('draft');
        setCurrentRecordId(undefined);
        setViewMode('review');
        showToast('Teaching plan synthesized using real classroom evidence!');
      } else {
        throw new Error(res.error || 'Unable to generate plan');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to generate teaching plan. Please try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDay = async (dayNumber: number, teacherInstructions: string) => {
    if (!classroom?.id || !currentPlan) return;
    setIsRegeneratingDay(true);
    setErrorMsg(null);
    try {
      const updated = await teachingPlannerService.regenerateDay(
        classroom.id,
        currentPlan,
        dayNumber,
        teacherInstructions
      );
      setCurrentPlan(updated);
      showToast(`Day ${dayNumber} successfully regenerated and updated!`);
    } catch (err: any) {
      setErrorMsg(err?.message || `Failed to regenerate Day ${dayNumber}.`);
    } finally {
      setIsRegeneratingDay(false);
    }
  };

  const handleSaveDraft = async (updatedPlan: TeachingPlan) => {
    if (!classroom?.id) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await teachingPlannerService.savePlan(classroom.id, {
        id: currentRecordId,
        plan: updatedPlan,
        status: 'draft'
      });
      if (res.success && res.plan) {
        setCurrentRecordId(res.plan.id);
        setPlanStatus('draft');
        showToast('Teaching plan saved as Draft in your classroom library.');
        loadSavedPlans();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save draft plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAndSave = async (updatedPlan: TeachingPlan) => {
    if (!classroom?.id) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await teachingPlannerService.savePlan(classroom.id, {
        id: currentRecordId,
        plan: updatedPlan,
        status: 'approved'
      });
      if (res.success && res.plan) {
        setCurrentRecordId(res.plan.id);
        setPlanStatus('approved');
        showToast('Teaching plan approved and saved! Ready for classroom execution.');
        loadSavedPlans();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to approve teaching plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!classroom?.id) return;
    try {
      await teachingPlannerService.deletePlan(classroom.id, planId);
      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      if (currentRecordId === planId) {
        setCurrentPlan(null);
        setCurrentRecordId(undefined);
        setViewMode('form');
      }
      showToast('Teaching plan removed.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove teaching plan.');
    }
  };

  const handleSelectSavedPlan = (record: SavedTeachingPlanRecord) => {
    setCurrentPlan(record.plan_json);
    setPlanStatus(record.status);
    setCurrentRecordId(record.id);
    setViewMode('review');
  };

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(prev => (prev === message ? null : prev));
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-8 z-50 bg-[#087477] text-white px-5 py-3 rounded-2xl shadow-xl border border-[#D4EFEC]/40 text-xs font-black flex items-center gap-2.5 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-[#D4EFEC] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-[#C94B4B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#C94B4B] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[#C94B4B] hover:text-rose-800 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View Switcher */}
      {viewMode === 'form' && (
        <CreatePlanForm
          classroom={classroom}
          isGenerating={isGenerating}
          onSubmit={handleGeneratePlan}
          onOpenSavedPlans={() => setViewMode('saved_list')}
          savedPlansCount={savedPlans.length}
        />
      )}

      {viewMode === 'review' && currentPlan && (
        <PlanReviewScreen
          plan={currentPlan}
          status={planStatus}
          isSaving={isSaving}
          isRegeneratingDay={isRegeneratingDay}
          classroomId={classroom?.id}
          classroomTitle={classroom?.title}
          onApproveAndSave={handleApproveAndSave}
          onSaveDraft={handleSaveDraft}
          onRegenerateFullPlan={() => setViewMode('form')}
          onRegenerateDay={handleRegenerateDay}
          onBackToForm={() => setViewMode('form')}
          onOpenActionCenter={onOpenActionCenter}
        />
      )}

      {viewMode === 'saved_list' && (
        <SavedPlansList
          plans={savedPlans}
          isLoading={loadingPlans}
          onSelectPlan={handleSelectSavedPlan}
          onDeletePlan={handleDeletePlan}
          onBackToPlanner={() => setViewMode('form')}
        />
      )}
    </div>
  );
};
