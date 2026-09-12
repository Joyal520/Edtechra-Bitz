import React from 'react';
import { Users, BookOpen, CheckCircle, Award, ChevronRight } from 'lucide-react';
import { ClassroomStats as IClassroomStats } from '@/types/classroom';

interface ClassroomStatsProps {
  stats: IClassroomStats;
}

export const ClassroomStats: React.FC<ClassroomStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      
      {/* 1. Enrolled Students (Blue) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#026fc3] flex items-center justify-center shrink-0 border border-sky-100">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {stats.total_students.toLocaleString()}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate mt-1">
              Enrolled Students
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-sky-400 shrink-0 ml-1" />
      </div>

      {/* 2. Active Tasks (Purple) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {stats.total_assignments.toLocaleString()}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate mt-1">
              Active Tasks
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
      </div>

      {/* 3. Submissions (Green) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {stats.total_submissions.toLocaleString()}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate mt-1">
              Submissions
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
      </div>

      {/* 4. Completion Rate (Amber) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between hover:shadow-xs transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#d97706] flex items-center justify-center shrink-0 border border-amber-100">
            <Award className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
              {stats.average_completion_percent}%
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate mt-1">
              Completion Rate
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
      </div>

    </div>
  );
};


