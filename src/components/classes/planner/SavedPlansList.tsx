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
      <div className="flex items-center justify-between bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToPlanner}
            className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer active:scale-95"
            title="Back to planner"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-sky-600" />
              <span>Saved Classroom Teaching Plans</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Revisit, edit, or reuse evidence-based plans created for this classroom.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToPlanner}
          className="btn-liquid-primary px-4 py-2 text-xs font-black"
        >
          + Create New Plan
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading saved plans...</p>
        </div>
      ) : plans.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-slate-300 p-8">
          <div className="w-14 h-14 rounded-3xl bg-sky-100 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h4 className="text-lg font-black text-slate-900">No Saved Plans Yet</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              When you create and save teaching plans, they will be archived here for easy reference and reuse.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToPlanner}
            className="btn-liquid-primary px-5 py-2.5 text-xs font-black shadow-md cursor-pointer"
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
              className="bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-6 shadow-xs hover:border-sky-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-base font-black text-slate-900 tracking-tight">
                    {p.title}
                  </h4>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      p.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {p.status === 'approved' ? '● Approved' : '○ Draft'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 font-medium line-clamp-2">
                  {p.learning_goal || 'Evidence-grounded teaching plan.'}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>{p.duration_days} Days</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
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
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
                  title="Delete plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectPlan(p)}
                  className="btn-liquid-secondary px-4 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
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
