// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: MOBILE-FIRST EDITORIAL COURSE PREVIEW
// Apple Books & Kindle inspired reading-first simulation for Teachers.
// Supports Student Course Roadmap, Daily Release simulation, and Celebration Modal.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  ArrowRight,
  Clock,
  Menu,
  X,
  Bookmark,
  Map,
  Lock,
  Check,
  CheckCircle2
} from 'lucide-react';
import { Course, CourseEpisode, RoadmapLessonItem } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { CourseContentRenderer } from '@/components/course-studio/CourseContentRenderer';
import { CourseRoadmap } from '@/components/course-studio/CourseRoadmap';
import { LessonCompletionModal } from '@/components/course-studio/LessonCompletionModal';
import { TextScale } from '@/utils/courseTextFormatting';
import { getThemePreset, DEFAULT_THEME_ID } from '@/utils/courseThemes';
import { ThemeSelectorPopover } from '@/components/course-studio/ThemeSelectorPopover';
import { computeCourseRoadmap } from '@/utils/dailyReleaseEngine';

export const CoursePreviewPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<CourseEpisode | null>(null);
  const [viewMode, setViewMode] = useState<'lesson' | 'roadmap'>('lesson');
  const [showDrawer, setShowDrawer] = useState(false);
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [textScale, setTextScale] = useState<TextScale>('md');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [completedEpisodeIds, setCompletedEpisodeIds] = useState<Set<string>>(new Set());
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [lastCompletedTitle, setLastCompletedTitle] = useState('');
  const [lastCompletedPos, setLastCompletedPos] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (courseId) {
      loadCourse(courseId);
    }
  }, [courseId]);

  const loadCourse = async (id: string) => {
    setLoading(true);
    try {
      const data = await courseStudioService.getCourse(id);
      setCourse(data);

      const firstUnit = data.units?.[0];
      if (firstUnit?.episodes?.[0]) setSelectedEpisode(firstUnit.episodes[0]);
    } catch (err) {
      console.error('Failed to load course preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const findEpisodeById = (c: Course, epId: string): CourseEpisode | null => {
    for (const u of c.units || []) {
      for (const ep of u.episodes || []) {
        if (ep.id === epId) return ep;
      }
    }
    return null;
  };

  // Track vertical reading scroll percentage
  const handleScroll = () => {
    if (mainScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mainScrollRef.current;
      const progress = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setScrollProgress(progress);
    }
  };

  // Font size scale cycler
  const handleScaleDown = () => {
    if (textScale === 'xl') setTextScale('lg');
    else if (textScale === 'lg') setTextScale('md');
    else if (textScale === 'md') setTextScale('sm');
  };

  const handleScaleUp = () => {
    if (textScale === 'sm') setTextScale('md');
    else if (textScale === 'md') setTextScale('lg');
    else if (textScale === 'lg') setTextScale('xl');
  };

  // Linearize episodes for Next / Prev navigation
  const allEpisodes: Array<{ episode: CourseEpisode; unitTitle: string; unitIndex: number; epIndex: number }> = [];
  (course?.units || []).forEach((u, uIdx) => {
    (u.episodes || []).forEach((ep, epIdx) => {
      allEpisodes.push({ episode: ep, unitTitle: u.title, unitIndex: uIdx + 1, epIndex: epIdx + 1 });
    });
  });

  const currentInfo = allEpisodes.find(item => item.episode.id === selectedEpisode?.id);
  const currentIndex = allEpisodes.findIndex(item => item.episode.id === selectedEpisode?.id);
  const prevItem = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextItem = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  // Compute preview roadmap
  const roadmapData = course ? computeCourseRoadmap({
    course,
    completedEpisodeIds,
    currentActiveEpisodeId: selectedEpisode?.id || null
  }) : null;

  const handleCompleteEpisode = () => {
    if (!selectedEpisode) return;
    const epId = selectedEpisode.id;
    setCompletedEpisodeIds(prev => new Set([...prev, epId]));
    setLastCompletedTitle(selectedEpisode.title);
    setLastCompletedPos(selectedEpisode.position || (currentIndex + 1));
    setCelebrationOpen(true);
  };

  const handleAfterCelebrationContinue = () => {
    setCelebrationOpen(false);
    if (course?.daily_release_enabled) {
      setViewMode('roadmap');
    } else if (nextItem) {
      setSelectedEpisode(nextItem.episode);
      setViewMode('lesson');
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setViewMode('roadmap');
    }
  };

  const handleSelectLessonFromRoadmap = (item: RoadmapLessonItem) => {
    if (item.status === 'locked' || item.is_locked) {
      const msg = item.unlock_message || `Lesson ${item.position} is locked. It will open tomorrow at midnight.`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    if (course) {
      const found = findEpisodeById(course, item.id);
      if (found) {
        setSelectedEpisode(found);
        setViewMode('lesson');
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto animate-spin text-[#026fc3]">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-sm font-serif italic text-stone-600">Opening Digital Book...</p>
        </div>
      </div>
    );
  }

  if (!course || !selectedEpisode) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6 text-center space-y-4">
        <h2 className="text-xl font-serif text-stone-800">No Content in this Course</h2>
        <button
          onClick={() => navigate(`/course-studio/${courseId}`)}
          className="px-6 py-2.5 bg-[#026fc3] text-white text-xs font-bold rounded-xl"
        >
          Return to Editor
        </button>
      </div>
    );
  }

  const activeTheme = getThemePreset(themeId);
  const isEpisodeCompleted = completedEpisodeIds.has(selectedEpisode.id);

  return (
    <div
      data-scale={textScale}
      data-theme={themeId}
      data-theme-mode={activeTheme.isDark ? 'dark' : 'light'}
      className={`reader-scale-container ${activeTheme.isDark ? 'dark' : ''} w-full min-h-screen h-screen flex flex-col ${activeTheme.bgGradient} text-theme-primary font-sans antialiased overflow-hidden transition-colors duration-300`}
    >
      
      {/* 1. TOP READING PROGRESS LINE */}
      <div className="w-full h-1 bg-current/5 relative shrink-0">
        <div
          className="h-full bg-[var(--theme-accent)] transition-all duration-150 shadow-xs"
          style={{ width: `${viewMode === 'roadmap' ? (roadmapData?.progressPercent || 0) : scrollProgress}%` }}
        />
      </div>

      {/* 2. COMPACT EDITORIAL TOP BAR */}
      <header className={`h-12 sm:h-14 ${activeTheme.headerBg} px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 border-b border-[var(--theme-border-subtle)] text-theme-primary transition-colors`}>
        
        {/* Left: ← Course & Roadmap Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate(`/course-studio/${course.id}`)}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-current/10 text-theme-primary transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Exit Preview"
          >
            <ArrowLeft className="w-4 h-4 text-theme-accent" />
            <span className="hidden sm:inline">Editor</span>
          </button>

          {/* Toggle between Reading & Roadmap */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'lesson' ? 'roadmap' : 'lesson')}
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black ${
              viewMode === 'roadmap'
                ? 'btn-theme-primary shadow-2xs'
                : 'hover:bg-current/10 text-theme-primary'
            }`}
            title="Toggle Course Roadmap"
          >
            <Map className="w-4 h-4" />
            <span>{viewMode === 'roadmap' ? 'Read Lesson' : 'Roadmap'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDrawer(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-current/10 text-theme-primary transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Table of Contents"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden md:inline">Contents</span>
          </button>
        </div>

        {/* Center: Chapter Info */}
        <div className="text-center truncate px-2 max-w-[140px] sm:max-w-xs hidden xs:block">
          <p className="text-xs font-serif italic text-theme-secondary truncate">
            {viewMode === 'roadmap'
              ? `${course.title} • Roadmap`
              : `Lesson ${currentInfo?.epIndex || 1} • ${selectedEpisode.title}`}
          </p>
        </div>

        {/* Right: Progress %, Font Size, Theme Popover, Bookmark */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Reading % Badge */}
          <span className="text-[11px] font-mono font-bold opacity-80 px-1 py-0.5 text-theme-primary">
            {viewMode === 'roadmap' ? `${roadmapData?.progressPercent || 0}%` : `${scrollProgress}%`}
          </span>

          {/* Font Size A- / A+ */}
          {viewMode === 'lesson' && (
            <div className="flex items-center rounded-xl bg-[var(--theme-surface-subtle)] p-0.5 border border-[var(--theme-border-subtle)]">
              <button
                type="button"
                onClick={handleScaleDown}
                disabled={textScale === 'sm'}
                className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-bold rounded-lg hover:bg-current/10 disabled:opacity-30 cursor-pointer text-theme-primary"
                title="Decrease Font Size"
              >
                A−
              </button>
              <button
                type="button"
                onClick={handleScaleUp}
                disabled={textScale === 'xl'}
                className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-bold rounded-lg hover:bg-current/10 disabled:opacity-30 cursor-pointer text-theme-primary"
                title="Increase Font Size"
              >
                A+
              </button>
            </div>
          )}

          {/* Theme Presets Popover */}
          <ThemeSelectorPopover
            activeThemeId={themeId}
            onSelectTheme={setThemeId}
          />

          {/* Bookmark Toggle */}
          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${isBookmarked ? 'text-theme-accent' : 'text-theme-muted hover:text-theme-primary'}`}
            title="Bookmark this page"
          >
            <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </header>

      {/* Non-blocking Toast Message */}
      {toastMessage && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md z-30 animate-in fade-in duration-150 reader-meta">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="font-bold px-2 py-0.5 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 3. MAIN CENTRIC READING VIEWPORT */}
      <main
        ref={mainScrollRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 scroll-smooth box-border"
      >
        {viewMode === 'roadmap' ? (
          <CourseRoadmap
            courseTitle={course.title}
            roadmapItems={roadmapData?.items || []}
            completedCount={roadmapData?.completedLessons || 0}
            totalCount={roadmapData?.totalLessons || 1}
            progressPercent={roadmapData?.progressPercent || 0}
            dailyReleaseEnabled={Boolean(course.daily_release_enabled)}
            onSelectLesson={handleSelectLessonFromRoadmap}
            activeLessonId={selectedEpisode.id}
          />
        ) : (
          <article className="w-full max-w-[760px] mx-auto space-y-6 sm:space-y-10 box-border overflow-x-hidden">
            
            {/* EDITORIAL LESSON HEADER */}
            <header className="w-full space-y-2 sm:space-y-3 pb-4 sm:pb-6 border-b border-current/15 text-left">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#026fc3] reader-meta">
                <span>LESSON {String(selectedEpisode.position || currentInfo?.epIndex || 1).padStart(2, '0')}</span>
                <span className="opacity-40">•</span>
                <span className="opacity-80 text-current">{currentInfo?.unitTitle || 'Unit 1'}</span>
                <span className="opacity-40">•</span>
                <span className="opacity-80 text-current flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#026fc3]" />
                  {selectedEpisode.estimated_minutes || 15} min read
                </span>
                {isEpisodeCompleted && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                  </span>
                )}
              </div>

              <h1 className="font-extrabold tracking-tight text-inherit leading-[1.15] text-left reader-title">
                {selectedEpisode.title}
              </h1>

              {course.short_description && (
                <p className="text-base sm:text-lg opacity-75 font-serif italic text-left max-w-xl reader-quote">
                  “{course.short_description}”
                </p>
              )}
            </header>

            {/* SHARED EDITORIAL CONTENT RENDERER */}
            <CourseContentRenderer
              blocks={selectedEpisode.blocks || []}
              questions={selectedEpisode.questions || []}
              isStudentView={true}
              textScale={textScale}
              onCompleteLesson={handleCompleteEpisode}
            />

            {/* MINIMAL EDITORIAL LESSON FOOTER */}
            <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 sm:pt-12 mt-8 sm:mt-12 border-t border-current/15">
              <button
                type="button"
                onClick={() => setViewMode('roadmap')}
                className="text-xs font-bold text-[#026fc3] hover:underline flex items-center gap-1"
              >
                <Map className="w-3.5 h-3.5" />
                <span>View Course Roadmap</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {prevItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEpisode(prevItem.episode);
                      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-current/5 hover:bg-current/10 border border-current/15 text-inherit text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCompleteEpisode}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{nextItem ? 'Complete Lesson' : 'Complete Course! 🎉'}</span>
                  {nextItem && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </footer>

          </article>
        )}
      </main>

      {/* 4. SLIDE-OVER TABLE OF CONTENTS (DRAWER) */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setShowDrawer(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <div className={`relative w-80 max-w-[85vw] h-full ${activeTheme.bgGradient} ${activeTheme.text} border-r ${activeTheme.cardBorder} p-5 sm:p-6 flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200 box-border`}>
            <div className="flex items-center justify-between pb-3 border-b border-current/15">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#026fc3]">Table of Contents</p>
                <h3 className="text-base font-bold truncate max-w-[200px]">{course.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-current/10 text-current cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {(course.units || []).map((unit, uIdx) => (
                <div key={unit.id} className="space-y-1.5">
                  <div className="text-xs font-black text-current/60 uppercase tracking-wider px-2">
                    Unit {uIdx + 1}: {unit.title}
                  </div>
                  <div className="space-y-1">
                    {(unit.episodes || []).map(ep => {
                      const isSelected = selectedEpisode.id === ep.id;
                      const isDone = completedEpisodeIds.has(ep.id);
                      const roadItem = roadmapData?.items.find(i => i.id === ep.id);
                      const isLocked = roadItem?.is_locked;

                      return (
                        <button
                          key={ep.id}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            setSelectedEpisode(ep);
                            setViewMode('lesson');
                            setShowDrawer(false);
                            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSelected
                              ? 'bg-[#026fc3] text-white shadow-xs'
                              : isDone
                              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20'
                              : 'hover:bg-current/10 text-current'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : isLocked ? (
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-current/60 shrink-0" />
                            )}
                            <span className="truncate">{ep.title}</span>
                          </div>
                          <span className="text-[10px] opacity-75 shrink-0">
                            {isLocked ? `🔒 Day ${roadItem?.release_day}` : `${ep.estimated_minutes || 15}m`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ENCOURAGING LESSON COMPLETION CELEBRATION MODAL */}
      <LessonCompletionModal
        isOpen={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        studentName="TEACHER (PREVIEW)"
        lessonTitle={lastCompletedTitle}
        lessonPosition={lastCompletedPos}
        pointsEarned={10}
        progressPercent={roadmapData?.progressPercent || 0}
        completedLessonsCount={roadmapData?.completedLessons || 1}
        totalLessonsCount={roadmapData?.totalLessons || 1}
        dailyReleaseEnabled={Boolean(course.daily_release_enabled)}
        onContinue={handleAfterCelebrationContinue}
      />

    </div>
  );
};
