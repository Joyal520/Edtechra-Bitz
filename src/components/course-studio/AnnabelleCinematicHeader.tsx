// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ANNABELLE CINEMATIC HERO & DAY NAVIGATION
// Matches the visual layout and structure of the Creepy Legends course header:
// 16:9 cinematic artwork hero banner, dark atmospheric gradient, compact badge
// pills, featured current-day plaque, and horizontal day selector strip.
// ============================================================================

import React, { useRef, useEffect } from 'react';
import {
  Sparkles,
  Star,
  Camera,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  Lock
} from 'lucide-react';
import { Course, CourseEpisode } from '@/types/courseStudio';
import { EpisodeNavItem } from '@/components/course-studio/CreepyLegendsStudentView';

interface AnnabelleCinematicHeaderProps {
  course: Course;
  selectedEpisode: CourseEpisode;
  allEpisodes: EpisodeNavItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  onSelectEpisode: (episode: CourseEpisode, isLocked?: boolean, unlockMessage?: string | null) => void;
  onOpenCoverModal?: () => void;
}

export const AnnabelleCinematicHeader: React.FC<AnnabelleCinematicHeaderProps> = ({
  course,
  selectedEpisode,
  allEpisodes,
  completedCount,
  totalCount,
  progressPercent,
  onSelectEpisode,
  onOpenCoverModal
}) => {
  const dayNavScrollRef = useRef<HTMLDivElement>(null);
  const activeDayBtnRef = useRef<HTMLButtonElement>(null);

  const currentNav = allEpisodes.find(e => e.episode.id === selectedEpisode.id);
  const currentDayNumber = currentNav?.dayNumber || selectedEpisode.position || 1;
  const cleanLessonTitle = currentNav?.cleanTitle || selectedEpisode.title.replace(/^Day\s+\d+\s*:\s*/i, '');

  const coverImageUrl =
    course.cover_image_url ||
    '/courses/annabelle/annabelle-cover.png';

  // Scroll active day pill into view smoothly
  useEffect(() => {
    if (activeDayBtnRef.current && dayNavScrollRef.current) {
      const container = dayNavScrollRef.current;
      const target = activeDayBtnRef.current;
      const cLeft = container.scrollLeft;
      const cRight = cLeft + container.clientWidth;
      const tLeft = target.offsetLeft;
      const tRight = tLeft + target.offsetWidth;

      if (tLeft < cLeft) {
        container.scrollTo({ left: tLeft - 20, behavior: 'smooth' });
      } else if (tRight > cRight) {
        container.scrollTo({ left: tRight - container.clientWidth + 20, behavior: 'smooth' });
      }
    }
  }, [selectedEpisode.id]);

  const scrollDayStrip = (dir: 'left' | 'right') => {
    if (!dayNavScrollRef.current) return;
    const offset = dir === 'left' ? -260 : 260;
    dayNavScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4 font-sans select-none">
      {/* ================================================================ */}
      {/* 1. CINEMATIC HERO COURSE COVER BANNER                            */}
      {/* ================================================================ */}
      <header
        data-testid="annabelle-cinematic-hero-header"
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-sky-400/30 shadow-2xl bg-[#07152b]"
      >
        <div className="relative w-full min-h-[210px] sm:min-h-[260px] md:min-h-[300px] flex flex-col justify-between p-4 sm:p-7 md:p-8">
          {/* Background Artwork Layer */}
          <img
            src={coverImageUrl}
            alt={course.title}
            loading="eager"
            fetchPriority="high"
            onError={e => {
              const target = e.currentTarget;
              if (!target.src.includes('annabelle-cover.png')) {
                target.src = '/courses/annabelle/annabelle-cover.png';
              }
            }}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-90 brightness-105 contrast-105 scale-[1.01] transition-all duration-500"
          />

          {/* Controlled Cinematic Gradient & Vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050e1f]/95 via-[#07162e]/65 to-[#050e1f]/35 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050e1f]/95 via-[#050e1f]/30 to-[#050e1f]/25 pointer-events-none" />

          {/* Top Badges Row */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-950/70 border border-sky-400/40 text-sky-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Interactive English Course</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-950/70 border border-amber-300/45 text-amber-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs">
                {course.grade_level || 'A1–A2'}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-950/70 border border-indigo-400/40 text-indigo-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs">
                7 Days
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/70 border border-emerald-400/40 text-emerald-200 text-[10px] sm:text-[11px] font-black backdrop-blur-md shadow-xs">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>100 Marks / 400 Pts</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/70 border border-sky-400/35 text-sky-200 text-[10px] sm:text-[11px] font-black backdrop-blur-md shadow-xs">
                <span>{completedCount}/{totalCount} Completed ({progressPercent}%)</span>
              </span>
            </div>

            {onOpenCoverModal && (
              <button
                type="button"
                onClick={onOpenCoverModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-950/90 border border-white/25 text-white text-xs font-bold backdrop-blur-md transition-all cursor-pointer shadow-md"
                title="Edit Course Cover Image"
              >
                <Camera className="w-3.5 h-3.5 text-sky-300" />
                <span>Cover</span>
              </button>
            )}
          </div>

          {/* Center & Bottom Hero Content */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pt-5 sm:pt-8">
            <div className="space-y-1.5 max-w-2xl text-left">
              <p className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-sky-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                {course.subject || 'English Language'} • {totalCount} Days
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] leading-[1.15]">
                {course.title}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-100 font-medium max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-relaxed">
                {course.short_description ||
                  'Master the Simple Past Tense through the mystery of Annabelle. 7 days of grammar, stories, listening, video, and writing.'}
              </p>
            </div>

            {/* Featured Current Day Plaque */}
            <div className="shrink-0 w-full sm:w-auto self-start md:self-end bg-gradient-to-b from-[#2b1d12]/95 to-[#1a110a]/95 border-2 border-amber-500/60 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_10px_25px_rgba(0,0,0,0.7)] backdrop-blur-md sm:min-w-[250px] text-left">
              <div className="flex items-center justify-between gap-3 mb-0.5 sm:mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-xs">
                  Day {currentDayNumber}
                </span>
                <span className="text-[11px] font-bold text-amber-300/95">
                  Lesson {currentDayNumber} of {totalCount}
                </span>
              </div>
              <p className="text-sm sm:text-base font-black text-amber-50 tracking-tight line-clamp-1">
                {cleanLessonTitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* 2. HORIZONTAL DAY NAVIGATION STRIP                               */}
      {/* ================================================================ */}
      <nav
        aria-label="Annabelle Course Day Navigation"
        data-testid="annabelle-day-navigation"
        className="relative flex items-center gap-1.5 bg-[#0a1b36] border border-sky-400/25 rounded-2xl p-2 shadow-lg"
      >
        {/* Left Scroll Button */}
        <button
          type="button"
          onClick={() => scrollDayStrip('left')}
          className="hidden sm:flex w-9 h-12 rounded-xl bg-[#102649] hover:bg-[#173564] border border-sky-400/20 items-center justify-center text-sky-200 shrink-0 cursor-pointer transition-colors"
          title="Scroll days left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Day Pills */}
        <div
          ref={dayNavScrollRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5"
        >
          {allEpisodes.map(item => {
            const isCurrent = item.episode.id === selectedEpisode.id;
            const isEpCompleted = item.isCompleted;
            const isEpLocked = item.isLocked;

            return (
              <button
                key={item.episode.id}
                ref={isCurrent ? activeDayBtnRef : null}
                type="button"
                onClick={() => onSelectEpisode(item.episode, isEpLocked, item.unlockMessage)}
                className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all shrink-0 min-w-[190px] sm:min-w-[220px] max-w-[260px] cursor-pointer ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#026fc3] to-[#1d6ef2] border-sky-300/80 text-white shadow-[0_0_20px_rgba(29,110,242,0.45)]'
                    : isEpCompleted
                    ? 'bg-[#0f2942] hover:bg-[#153656] border-emerald-400/40 text-slate-100'
                    : isEpLocked
                    ? 'bg-[#09162b]/70 border-slate-800 text-slate-400 opacity-75'
                    : 'bg-[#0e2240] hover:bg-[#142e54] border-sky-500/20 text-slate-200'
                }`}
              >
                {/* Status Icon Circle */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${
                    isCurrent
                      ? 'bg-white text-[#026fc3] shadow-xs'
                      : isEpCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : isEpLocked
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-sky-500/15 text-sky-300 border border-sky-400/25'
                  }`}
                >
                  {isCurrent ? (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  ) : isEpCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isEpLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <span>{item.dayNumber}</span>
                  )}
                </div>

                {/* Day Label + Title */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        isCurrent
                          ? 'text-sky-100'
                          : isEpCompleted
                          ? 'text-emerald-300'
                          : 'text-sky-400/90'
                      }`}
                    >
                      Day {item.dayNumber}
                    </span>
                    {isEpCompleted && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-extrabold truncate leading-snug">
                    {item.cleanTitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          type="button"
          onClick={() => scrollDayStrip('right')}
          className="hidden sm:flex w-9 h-12 rounded-xl bg-[#102649] hover:bg-[#173564] border border-sky-400/20 items-center justify-center text-sky-200 shrink-0 cursor-pointer transition-colors"
          title="Scroll days right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
};
