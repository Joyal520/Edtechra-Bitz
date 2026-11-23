import React from 'react';
import {
  Sparkles,
  Star,
  Camera,
  CheckCircle2,
  Lock,
  Play,
  Sun,
  Award
} from 'lucide-react';
import { Course, CourseEpisode } from '@/types/courseStudio';
import { parseCoverPosition } from '@/utils/courseCover';

export interface BornForTheSkyDayNavItem {
  episode: CourseEpisode;
  unitId?: string;
  unitTitle?: string;
  dayNumber: number;
  cleanTitle: string;
  isCompleted: boolean;
  isLocked: boolean;
  unlockMessage?: string | null;
}

interface BornForTheSkyHeaderProps {
  course: Course;
  selectedEpisode: CourseEpisode;
  allEpisodes: BornForTheSkyDayNavItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  onSelectEpisode: (ep: CourseEpisode, isLocked: boolean, unlockMessage?: string | null) => void;
  onOpenCoverModal?: () => void;
}

const DEFAULT_BORN_FOR_THE_SKY_COVER =
  'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/general/covers/548eea36-a825-4c69-9ca3-89fc06218c39/1788017132945_ea85960e.webp';

export const BornForTheSkyHeader: React.FC<BornForTheSkyHeaderProps> = ({
  course,
  selectedEpisode,
  allEpisodes,
  completedCount,
  totalCount,
  progressPercent,
  onSelectEpisode,
  onOpenCoverModal
}) => {
  const coverImageUrl = course.cover_image_url || DEFAULT_BORN_FOR_THE_SKY_COVER;
  const coverPos = parseCoverPosition(course.cover_image_url, (course as any)?.cover_object_position);
  const currentDayNum = selectedEpisode.position || 1;
  const cleanLessonTitle =
    selectedEpisode.title.replace(/^Day\s+\d+\s*:\s*/i, '').trim() ||
    (currentDayNum === 1
      ? 'The Story of the Eagle'
      : currentDayNum === 2
      ? 'Born for the Sky Song'
      : currentDayNum === 3
      ? 'Scene Puzzle & Discovery'
      : selectedEpisode.title);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. WARM INSPIRATIONAL HERO COURSE COVER HEADER */}
      <header
        data-testid="born-for-the-sky-hero-header"
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-sky-200/90 shadow-xl bg-gradient-to-br from-sky-900 via-sky-800 to-amber-900"
      >
        <div className="relative w-full min-h-[168px] sm:min-h-[260px] md:min-h-[295px] flex flex-col justify-between p-3.5 sm:p-7 md:p-8">
          <img
            src={coverImageUrl}
            alt={course.title}
            loading="eager"
            fetchPriority="high"
            style={{ objectPosition: coverPos.objectPosition }}
            onError={e => {
              const target = e.currentTarget;
              if (target.src !== DEFAULT_BORN_FOR_THE_SKY_COVER) {
                target.src = DEFAULT_BORN_FOR_THE_SKY_COVER;
              }
            }}
            className="absolute inset-0 w-full h-full object-cover opacity-90 brightness-105 contrast-105 scale-[1.01] transition-all duration-500"
          />

          {/* Warm sky & golden-hour gradient overlay: keeps artwork vivid while guaranteeing crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c2d48]/88 via-[#144266]/55 to-[#1a365d]/20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b253c]/92 via-[#0c2d48]/25 to-[#0c2d48]/20 pointer-events-none" />

          {/* Top Badges Row */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/95 text-slate-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm">
                <Sun className="w-3.5 h-3.5 text-amber-900" />
                <span>Interactive Nature Story</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/90 text-sky-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm">
                {course.grade_level || 'A1–A2'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/95 text-white text-[10px] sm:text-[11px] font-black shadow-sm">
                <Star className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
                <span>+100 Bonus XP</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/60 border border-sky-200/40 text-sky-50 text-[10px] sm:text-[11px] font-black backdrop-blur-md">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {completedCount}/{totalCount} Completed ({progressPercent}%)
                </span>
              </span>
            </div>

            {onOpenCoverModal && (
              <button
                type="button"
                onClick={onOpenCoverModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-md"
                title="Edit or Reposition Course Cover Image"
              >
                <Camera className="w-3.5 h-3.5 text-sky-600" />
                <span>Cover</span>
              </button>
            )}
          </div>

          {/* Center & Bottom Hero Content */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pt-6 sm:pt-8">
            <div className="space-y-1.5 max-w-2xl">
              <p className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-widest text-amber-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {course.subject || 'English Language'} • {totalCount} Days • Story, Song & Puzzle
                </span>
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.75)] leading-[1.08]">
                Born for the Sky
              </h1>
              <p className="text-xs sm:text-base text-sky-50 font-medium max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
                {course.short_description && course.short_description.trim()
                  ? course.short_description
                  : 'A 3-Day Interactive English Journey of Courage, Discovery & Flight'}
              </p>
            </div>

            {/* Featured Current Day Plaque */}
            <div className="shrink-0 w-full sm:w-auto self-start md:self-end bg-gradient-to-br from-[#fffdf7]/95 to-[#fef3c7]/95 border-2 border-amber-300 rounded-2xl px-4 sm:px-5 py-3 shadow-xl backdrop-blur-md sm:min-w-[250px]">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-sky-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs">
                  Day {currentDayNum}
                </span>
                <span className="text-[11px] font-extrabold text-amber-900">
                  Lesson {currentDayNum} of {totalCount}
                </span>
              </div>
              <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight line-clamp-1">
                {cleanLessonTitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. WARM LIGHT DAY NAVIGATION STRIP */}
      <nav
        aria-label="Course Day Navigation"
        data-testid="born-for-the-sky-day-navigation"
        className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-white/95 border border-sky-200/80 rounded-2xl p-1.5 sm:p-2 shadow-sm"
      >
        {allEpisodes.map(item => {
          const isActive = item.episode.id === selectedEpisode.id;
          const label =
            item.dayNumber === 1
              ? 'Story'
              : item.dayNumber === 2
              ? 'Song'
              : item.dayNumber === 3
              ? 'Puzzle'
              : item.cleanTitle;

          return (
            <button
              key={item.episode.id}
              type="button"
              onClick={() => onSelectEpisode(item.episode, item.isLocked, item.unlockMessage)}
              className={`min-w-0 flex items-center gap-2 px-2 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-sky-600 to-sky-500 border-sky-600 text-white shadow-md'
                  : item.isCompleted
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 hover:bg-emerald-100/80'
                  : item.isLocked
                  ? 'bg-slate-50 border-slate-200 text-slate-500 opacity-80'
                  : 'bg-amber-50/60 border-amber-200/80 text-slate-800 hover:bg-amber-50'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : item.isCompleted
                    ? 'bg-emerald-500 text-white'
                    : item.isLocked
                    ? 'bg-slate-200 text-slate-500'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                {item.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : item.isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </span>
              <div className="min-w-0">
                <div
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    isActive ? 'text-sky-100' : item.isCompleted ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  Day {item.dayNumber}
                </div>
                <div className="text-xs sm:text-sm font-extrabold truncate">{label}</div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
