import React from 'react';
import { Users, BookOpen, CheckCircle, Award } from 'lucide-react';
import { ClassroomStats as IClassroomStats } from '@/types/classroom';

interface ClassroomStatsProps {
  stats: IClassroomStats;
}

export const ClassroomStats: React.FC<ClassroomStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      
      {/* 1. Enrolled Students (Pastel Blue) */}
      <div className="bg-[#e8f3fa] rounded-[24px] p-5 border border-sky-200/80 shadow-xs flex items-center gap-4.5 transition-all hover:shadow-md">
        <div className="w-13 h-13 rounded-full bg-white text-[#026fc3] flex items-center justify-center shrink-0 shadow-2xs border border-sky-100">
          <Users className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {stats.total_students.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600 font-bold tracking-wide">
            Enrolled Students
          </div>
        </div>
      </div>

      {/* 2. Active Tasks (Pastel Purple) */}
      <div className="bg-[#f3edf9] rounded-[24px] p-5 border border-purple-200/80 shadow-xs flex items-center gap-4.5 transition-all hover:shadow-md">
        <div className="w-13 h-13 rounded-full bg-white text-[#7c3aed] flex items-center justify-center shrink-0 shadow-2xs border border-purple-100">
          <BookOpen className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {stats.total_assignments.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600 font-bold tracking-wide">
            Active Tasks
          </div>
        </div>
      </div>

      {/* 3. Submissions (Pastel Green) */}
      <div className="bg-[#eef8f1] rounded-[24px] p-5 border border-emerald-200/80 shadow-xs flex items-center gap-4.5 transition-all hover:shadow-md">
        <div className="w-13 h-13 rounded-full bg-white text-[#059669] flex items-center justify-center shrink-0 shadow-2xs border border-emerald-100">
          <CheckCircle className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {stats.total_submissions.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600 font-bold tracking-wide">
            Submissions
          </div>
        </div>
      </div>

      {/* 4. Completion Rate (Pastel Amber) */}
      <div className="bg-[#fbf4e4] rounded-[24px] p-5 border border-amber-200/80 shadow-xs flex items-center gap-4.5 transition-all hover:shadow-md">
        <div className="w-13 h-13 rounded-full bg-white text-[#d97706] flex items-center justify-center shrink-0 shadow-2xs border border-amber-100">
          <Award className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {stats.average_completion_percent}%
          </div>
          <div className="text-xs text-slate-600 font-bold tracking-wide">
            Completion Rate
          </div>
        </div>
      </div>

    </div>
  );
};

