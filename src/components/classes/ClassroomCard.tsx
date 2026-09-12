import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, ArrowRight } from 'lucide-react';
import { Classroom } from '@/types/classroom';
import { getSubjectCover } from '@/utils/classroomCovers';

interface ClassroomCardProps {
  classroom: Classroom;
  viewMode?: 'grid' | 'list';
}

export const ClassroomCard: React.FC<ClassroomCardProps> = ({ classroom, viewMode = 'grid' }) => {
  const coverInfo = getSubjectCover(classroom.subject);
  const [imgSrc, setImgSrc] = useState<string>(coverInfo.imageUrl);

  // List View Rendering
  if (viewMode === 'list') {
    return (
      <Link
        to={`/classes/${classroom.id}`}
        className="group relative flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 gap-4 overflow-hidden"
      >
        {/* Thumbnail */}
        <div className="w-full sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden relative shrink-0 bg-slate-100">
          <img
            src={imgSrc}
            alt={classroom.title}
            onError={() => setImgSrc('/images/classroom/covers/general.jpg')}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {classroom.grade && (
            <span className="absolute top-2 left-2 bg-white/95 text-slate-800 text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs backdrop-blur-xs">
              {classroom.grade.toLowerCase().includes('grade') ? classroom.grade : `Grade ${classroom.grade}`}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-[#026fc3] border border-sky-100">
              {classroom.subject || 'General'}
            </span>
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

          <h3 className="text-base font-black text-slate-900 group-hover:text-[#026fc3] transition-colors truncate tracking-tight">
            {classroom.title}
          </h3>

          <p className="text-xs text-slate-500 font-medium line-clamp-1">
            {classroom.description || 'Welcome to this digital classroom. Stay on top of assignments, collaborate, and learn together.'}
          </p>
        </div>

        {/* Stats & Arrow */}
        <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
          <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1.5" title="Enrolled Students">
              <Users className="w-4 h-4 text-slate-400" />
              <span>{classroom.student_count ?? 0} students</span>
            </span>
            <span className="flex items-center gap-1.5" title="Tasks">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>{classroom.assignment_count ?? 0} tasks</span>
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-[#026fc3] group-hover:bg-[#025ca5] text-white flex items-center justify-center shadow-xs transition-transform group-hover:translate-x-0.5 shrink-0">
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </Link>
    );
  }

  // Grid Card Rendering (Strictly matching reference mockup)
  return (
    <Link
      to={`/classes/${classroom.id}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 overflow-hidden justify-between h-full"
    >
      {/* 1. SUBJECT COVER IMAGE WITH OVERLAID BADGES */}
      <div className="relative w-full h-36 sm:h-40 overflow-hidden bg-slate-100 shrink-0">
        <img
          src={imgSrc}
          alt={classroom.title}
          onError={() => setImgSrc('/images/classroom/covers/general.jpg')}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Subtle overlay gradient to ensure badge legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none" />

        {/* Top-Left: Grade Badge */}
        {classroom.grade && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/95 text-slate-800 text-[11px] font-black shadow-xs backdrop-blur-xs">
              {classroom.grade.toLowerCase().includes('grade') ? classroom.grade : `Grade ${classroom.grade}`}
            </span>
          </div>
        )}

        {/* Top-Right: Role Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {classroom.user_role === 'teacher' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-black shadow-xs">
              Teacher
            </span>
          ) : classroom.user_role === 'student' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black shadow-xs">
              Student
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-[11px] font-black shadow-xs">
              {classroom.subject || 'Class'}
            </span>
          )}
        </div>
      </div>

      {/* 2. CARD CONTENT */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Title */}
          <h3 className="text-base font-black text-slate-900 group-hover:text-[#026fc3] transition-colors line-clamp-1 tracking-tight">
            {classroom.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
            {classroom.description || 'Welcome to this digital classroom. Stay on top of assignments, collaborate, and learn together.'}
          </p>
        </div>

        {/* 3. CARD FOOTER: METADATA & ARROW */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5 text-slate-500" title="Enrolled Students">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{classroom.student_count ?? 0} students</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500" title="Active Tasks">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>{classroom.assignment_count ?? 0} tasks</span>
            </span>
          </div>

          {/* Blue Circular Arrow Button */}
          <div className="w-8 h-8 rounded-full bg-[#026fc3] group-hover:bg-[#025ca5] text-white flex items-center justify-center shadow-xs transition-transform group-hover:translate-x-0.5 shrink-0">
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </div>
    </Link>
  );
};


