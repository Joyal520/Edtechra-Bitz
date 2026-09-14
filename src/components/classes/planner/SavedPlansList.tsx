// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: SAVED TEACHING PLANS DRAWER (PHASE 2A)
// ============================================================================

import React from 'react';
import {
  Calendar,
  Clock,
  Trash2,
  ExternalLink,
  FolderOpen,
  ArrowLeft,
  BookOpen
} from 'lucide-react';
import { SavedTeachingPlanRecord } from '@/services/teachingPlannerService';

interface SavedPlansListProps {
  plans: SavedTeachingPlanRecord[];
  isLoading: boolean;
  onSelectPlan: (plan: SavedTeachingPlanRecord) => void;
  onDeletePlan: (planId: string) => void;
  onBackToPlanner: () => void;
}

export const SavedPlansList: React.FC<SavedPlansListProps> = ({
  plans,
  isLoading,
  onSelectPlan,
  onDeletePlan,
  onBackToPlanner
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-6 border border-[#C9E5E2] shadow-xs flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPlanner}
            className="p-2.5 rounded-2xl border border-[#C9E5E2] hover:bg-[#E8F7F5] text-[#087477] transition-all cursor-pointer active:scale-95"
            title="Back to planner"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-xl font-black text-[#173B3F] tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#087477]" />
              <span>Saved Classroom Teaching Plans</span>
            </h3>
            <p className="text-xs text-[#36565A] font-medium mt-0.5">
              Revisit, edit, or reuse evidence-based plans created for this classroom.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToPlanner}
          className="px-4.5 py-2.5 rounded-xl bg-[#087477] hover:bg-[#065e60] text-white text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95"
        >
          + Create New Plan
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#087477] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#36565A]">Loading saved plans...</p>
        </div>
      ) : plans.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-[#C9E5E2] p-8 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] text-[#087477] flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen className="w-7 h-7 text-[#087477]" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="text-lg font-black text-[#173B3F]">No Saved Plans Yet</h4>
            <p className="text-xs text-[#36565A] font-medium leading-relaxed">
              When you create and save teaching plans, they will be archived here for easy reference and reuse.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToPlanner}
            className="px-5 py-2.5 bg-[#087477] hover:bg-[#065e60] text-white rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95"
          >
            Create Your First Plan
          </button>
        </div>
      ) : (
        /* Plans List */
        <div className="space-y-3.5">
          {plans.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-[#C9E5E2] p-5 sm:p-6 shadow-xs hover:border-[#159A9C] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-base font-black text-[#173B3F] tracking-tight">
                    {p.title}
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      p.status === 'approved'
                        ? 'bg-emerald-50 text-[#159A75] border border-emerald-200'
                        : 'bg-amber-50 text-[#D99500] border border-amber-200'
                    }`}
                  >
                    {p.status === 'approved' ? '● Approved' : '○ Draft'}
                  </span>
                </div>

                <p className="text-xs text-[#36565A] font-medium line-clamp-2 leading-relaxed">
                  {p.learning_goal || 'Evidence-grounded teaching plan.'}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-[#36565A] font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#087477]" />
                    <span>{p.duration_days} Days</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#159A75]" />
                    <span>{p.lesson_duration_minutes} Mins/Lesson</span>
                  </span>
                  <span>&bull;</span>
                  <span>Saved {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onDeletePlan(p.id)}
                  className="p-2.5 rounded-xl border border-[#C9E5E2] hover:bg-rose-50 text-[#36565A] hover:text-[#C94B4B] transition-all cursor-pointer"
                  title="Delete plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectPlan(p)}
                  className="px-4.5 py-2 rounded-xl bg-[#087477] hover:bg-[#065e60] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Open Plan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

