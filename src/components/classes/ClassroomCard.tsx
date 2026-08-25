import React from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, ArrowRight } from 'lucide-react';
import { Classroom } from '@/types/classroom';

interface ClassroomCardProps {
  classroom: Classroom;
}

const themeStyles: Record<string, { gradient: string; badge: string; border: string }> = {
  'theme-blue': {
    gradient: 'from-blue-600 to-sky-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-blue-100 hover:border-blue-300'
  },
  'theme-purple': {
    gradient: 'from-purple-600 to-indigo-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    border: 'border-purple-100 hover:border-purple-300'
  },
  'theme-green': {
    gradient: 'from-emerald-600 to-teal-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-100 hover:border-emerald-300'
  },
  'theme-amber': {
    gradient: 'from-amber-600 to-orange-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-amber-100 hover:border-amber-300'
  },
  'theme-rose': {
    gradient: 'from-rose-600 to-pink-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-rose-100 hover:border-rose-300'
  },
  'theme-teal': {
    gradient: 'from-teal-600 to-cyan-500',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    border: 'border-teal-100 hover:border-teal-300'
  }
};

export const ClassroomCard: React.FC<ClassroomCardProps> = ({ classroom }) => {
  const themeKey = classroom.theme || 'theme-blue';
  const style = themeStyles[themeKey] || themeStyles['theme-blue'];

  return (
    <Link
      to={`/classes/${classroom.id}`}
      className={`group relative flex flex-col bg-white rounded-3xl p-5 border ${style.border} shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden`}
    >
      {/* Decorative top gradient stripe */}
      <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${style.gradient}`} />

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3 mb-3 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${style.badge}`}>
              {classroom.subject}
            </span>
            <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {classroom.grade}
            </span>
            {classroom.user_role === 'teacher' && (
              <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                Teacher
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#026fc3] transition-colors line-clamp-1">
            {classroom.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 font-medium line-clamp-2 mb-4 flex-1">
        {classroom.description || 'Welcome to this digital classroom. Stay on top of assignments, collaborate, and learn together.'}
      </p>

      {/* Stats footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5" title="Enrolled Students">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{classroom.student_count ?? 0} students</span>
          </span>
          <span className="flex items-center gap-1.5" title="Assignments">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>{classroom.assignment_count ?? 0} tasks</span>
          </span>
        </div>

        <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-brand-50 flex items-center justify-center text-slate-400 group-hover:text-[#026fc3] transition-all">
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
};
