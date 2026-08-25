import React from 'react';
import { Users, BookOpen, CheckCircle, Award } from 'lucide-react';
import { ClassroomStats as IClassroomStats } from '@/types/classroom';

interface ClassroomStatsProps {
  stats: IClassroomStats;
}

export const ClassroomStats: React.FC<ClassroomStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      
      {/* Total Students */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#026fc3] flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.total_students}</div>
          <div className="text-xs text-slate-500 font-extrabold">Enrolled Students</div>
        </div>
      </div>

      {/* Total Assignments */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.total_assignments}</div>
          <div className="text-xs text-slate-500 font-extrabold">Active Tasks</div>
        </div>
      </div>

      {/* Submissions */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{stats.total_submissions}</div>
          <div className="text-xs text-slate-500 font-extrabold">Submissions</div>
        </div>
      </div>

      {/* Average Completion / Grade */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {stats.average_completion_percent}%
          </div>
          <div className="text-xs text-slate-500 font-extrabold">Completion Rate</div>
        </div>
      </div>

    </div>
  );
};
