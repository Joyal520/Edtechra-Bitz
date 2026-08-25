import React, { useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Assignment } from '@/types/classroom';
import { AssignmentCard } from './AssignmentCard';

interface AssignmentListProps {
  assignments: Assignment[];
  isTeacher: boolean;
  onCreateAssignment?: () => void;
  onOpenSubmissions?: (assignment: Assignment) => void;
  onSubmitWork?: (assignment: Assignment) => void;
  onDeleteAssignment?: (assignmentId: string) => void;
}

export const AssignmentList: React.FC<AssignmentListProps> = ({
  assignments,
  isTeacher,
  onCreateAssignment,
  onOpenSubmissions,
  onSubmitWork,
  onDeleteAssignment
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'pending') {
      return !a.my_submission;
    }
    if (filter === 'completed') {
      return Boolean(a.my_submission);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#026fc3] flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Classroom Assignments</h2>
            <p className="text-xs text-slate-500 font-semibold">{assignments.length} total tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isTeacher && assignments.length > 0 && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-lg transition-all ${filter === 'pending' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'hover:text-slate-900'}`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-lg transition-all ${filter === 'completed' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'hover:text-slate-900'}`}
              >
                Completed
              </button>
            </div>
          )}

          {isTeacher && onCreateAssignment && (
            <button
              type="button"
              onClick={onCreateAssignment}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs space-y-2">
          <p className="text-xs font-bold text-slate-500">No assignments found.</p>
          <p className="text-[11px] text-slate-400">
            {isTeacher
              ? 'Click "+ Create Task" to publish your first assignment.'
              : 'Your teacher has not assigned any tasks yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              isTeacher={isTeacher}
              onOpenSubmissions={onOpenSubmissions}
              onSubmitWork={onSubmitWork}
              onDeleteAssignment={onDeleteAssignment}
            />
          ))}
        </div>
      )}
    </div>
  );
};
