import React from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, ArrowRight } from 'lucide-react';
import { Classroom } from '@/types/classroom';

interface ClassroomCardProps {
  classroom: Classroom;
}

export const ClassroomCard: React.FC<ClassroomCardProps> = ({ classroom }) => {
  return (
    <Link
      to={`/classes/${classroom.id}`}
      className="group relative flex flex-col bg-white rounded-[24px] p-5 sm:p-6 border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden justify-between space-y-4"
    >
      <div className="space-y-2.5">
        {/* Top Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-sky-50 text-[#026fc3] border border-sky-200">
            {classroom.subject || 'General'}
          </span>
          {classroom.grade && (
            <span className="text-[10px] font-extrabold text-slate-600 bg-stone-100 px-2.5 py-0.5 rounded-md">
              {classroom.grade}
            </span>
          )}
          {classroom.user_role === 'teacher' ? (
            <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
              Teacher
            </span>
          ) : classroom.user_role === 'student' ? (
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              Student
            </span>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#026fc3] transition-colors line-clamp-1 tracking-tight">
          {classroom.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
          {classroom.description || 'Welcome to this digital classroom. Stay on top of assignments, collaborate, and learn together.'}
        </p>
      </div>

      {/* Footer Stats & Arrow Button */}
      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-slate-500 font-bold">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5 text-slate-500" title="Enrolled Students">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{classroom.student_count ?? 0} students</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-500" title="Assignments">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>{classroom.assignment_count ?? 0} tasks</span>
          </span>
        </div>

        {/* Blue Circular Arrow Button */}
        <div className="w-8 h-8 rounded-full bg-[#026fc3] group-hover:bg-[#03589e] text-white flex items-center justify-center shadow-xs transition-transform group-hover:translate-x-0.5 shrink-0">
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </div>
    </Link>
  );
};

