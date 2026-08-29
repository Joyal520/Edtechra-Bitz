// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: MOBILE-FIRST STUDENT DIGITAL BOOK PLAYER
// Apple Books & Kindle inspired reading-first digital learning experience.
// Guarantees zero horizontal overflow, responsive single-column mobile flow,
// large editorial typography, progress tracking, and minimal footer ending.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Award,
  ArrowRight,
  Clock,
  Check,
  Menu,
  X,
  Bookmark
} from 'lucide-react';
import { Course, CourseEpisode, CourseEnrollment } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { CourseContentRenderer } from '@/components/course-studio/CourseContentRenderer';
import { TextScale } from '@/utils/courseTextFormatting';
import { getThemePreset, DEFAULT_THEME_ID } from '@/utils/courseThemes';
import { ThemeSelectorPopover } from '@/components/course-studio/ThemeSelectorPopover';

export const StudentCoursePlayerPage: React.FC = () => {
  const { classroomId, courseId } = useParams<{ classroomId: string; courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<CourseEpisode | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [textScale, setTextScale] = useState<TextScale>('md');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [completedEpisodeIds, setCompletedEpisodeIds] = useState<Set<string>>(new Set());
  const [completingEpisode, setCompletingEpisode] = useState(false);
  const [userScore, setUserScore] = useState(0);

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [feedbackState, setFeedbackState] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>({});

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (courseId && classroomId) {
      loadCourseAndProgress(courseId, classroomId);
    }
  }, [courseId, classroomId]);

  useEffect(() => {
    if (courseId && classroomId && selectedEpisode) {
      loadEpisodeAttempts(courseId, classroomId, selectedEpisode.id);
    }
  }, [courseId, classroomId, selectedEpisode?.id]);

  const loadEpisodeAttempts = async (cId: string, clId: string, epId: string) => {
    try {
      const attempts = await courseStudioService.getStudentQuestionAttempts(cId, clId, epId);
      const answersMap: Record<string, string> = {};
      const feedbackMap: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }> = {};

      attempts.forEach((att: any) => {
        answersMap[att.question_id] = att.student_answer;
        feedbackMap[att.question_id] = {
          isCorrect: att.is_correct,
          showExplanation: true,
          selected: att.student_answer
        };
      });

      setUserAnswers(answersMap);
      setFeedbackState(feedbackMap);
    } catch (err) {
      console.error('Failed to load past attempts:', err);
    }
  };

  const loadCourseAndProgress = async (cId: string, clId: string) => {
    setLoading(true);
    try {
      const courseData = await courseStudioService.getCourse(cId);
      setCourse(courseData);

      // Load classroom assignments to find enrollment
      const assignments = await courseStudioService.getClassroomCourses(clId);
      const matched = assignments.find(a => a.course_id === cId);
      if (matched?.enrollment) {
        setEnrollment(matched.enrollment as CourseEnrollment);
      }

      const firstUnit = courseData.units?.[0];
      if (firstUnit) {
        const firstEp = firstUnit.episodes?.[0];
        if (firstEp) setSelectedEpisode(firstEp);
      }
    } catch (err) {
      console.error('Failed to load course player:', err);
    } finally {
      setLoading(false);
    }
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

  // Linearize episodes for progress navigation
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

  const handleQuestionAnswer = async (
    questionId: string,
    answer: string,
    isCorrect: boolean,
    pointsAwarded: number,
    question: any
  ) => {
    if (!courseId || !classroomId || !selectedEpisode) return;

    if (isCorrect) {
      setUserScore(s => s + pointsAwarded);
    }

    try {
      await courseStudioService.recordQuestionAttempt({
        course_id: courseId,
        classroom_id: classroomId,
        episode_id: selectedEpisode.id,
        question_id: questionId,
        student_answer: answer,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        skill: question.skill,
        concept: question.concept,
        difficulty: question.difficulty
      });
    } catch (err) {
      console.error('Failed to record question attempt telemetry:', err);
    }
  };

  const handleCompleteEpisode = async () => {
    if (!courseId || !classroomId || !selectedEpisode) return;

    setCompletingEpisode(true);
    try {
      const res = await courseStudioService.recordStudentProgress({
        course_id: courseId,
        classroom_id: classroomId,
        episode_id: selectedEpisode.id,
        score: userScore,
        max_score: 100,
        time_spent_seconds: (selectedEpisode.estimated_minutes || 15) * 60
      });

      if (res?.enrollment) {
        setEnrollment(res.enrollment);
      }

      setCompletedEpisodeIds(prev => new Set([...prev, selectedEpisode.id]));

      // Advance to next episode if available
      if (nextItem) {
        setSelectedEpisode(nextItem.episode);
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
    } finally {
      setCompletingEpisode(false);
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
        <h2 className="text-xl font-serif text-stone-800">Course Not Available</h2>
        <button
          onClick={() => navigate(`/classes/${classroomId}`)}
          className="px-6 py-2.5 bg-[#026fc3] text-white text-xs font-bold rounded-xl"
        >
          Return to Classroom
        </button>
      </div>
    );
  }

  const activeTheme = getThemePreset(themeId);
  const isEpisodeCompleted = completedEpisodeIds.has(selectedEpisode.id);

  return (
    <div className={`w-full min-h-screen h-screen flex flex-col ${activeTheme.bgGradient} ${activeTheme.text} font-sans antialiased overflow-hidden transition-colors duration-300`}>
      
      {/* 1. TOP READING PROGRESS LINE (Subtle 2px line) */}
      <div className="w-full h-0.5 bg-current/5 relative shrink-0">
        <div
          className="h-full bg-[#026fc3] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. COMPACT EDITORIAL TOP BAR */}
      <header className={`h-12 sm:h-14 ${activeTheme.headerBg} px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 border-b ${activeTheme.cardBorder} transition-colors`}>
        
        {/* Left: ← Class & Contents */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => navigate(`/classes/${classroomId}`)}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-current/10 text-current transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Back to Class"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Class</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDrawer(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-current/10 text-current transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Table of Contents"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">Contents</span>
          </button>
        </div>

        {/* Center: Chapter Info (Hidden on small mobile) */}
        <div className="text-center truncate px-2 max-w-[140px] sm:max-w-xs hidden xs:block">
          <p className="text-xs font-serif italic text-current/75 truncate">
            Lesson {currentInfo?.epIndex || 1} • {selectedEpisode.title}
          </p>
        </div>

        {/* Right: XP, Progress %, Font Controls, Theme Popover, Bookmark */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* XP Pill */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-400/30">
            <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{userScore} XP</span>
          </div>

          {/* Reading % Badge */}
          <span className="text-[11px] font-mono font-bold opacity-65 px-1 py-0.5">
            {scrollProgress}%
          </span>

          {/* Font Size A- / A+ */}
          <div className="flex items-center rounded-xl bg-current/5 p-0.5 border border-current/10">
            <button
              type="button"
              onClick={handleScaleDown}
              disabled={textScale === 'sm'}
              className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-bold rounded-lg hover:bg-current/10 disabled:opacity-30 cursor-pointer"
              title="Decrease Font Size"
            >
              A−
            </button>
            <button
              type="button"
              onClick={handleScaleUp}
              disabled={textScale === 'xl'}
              className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-bold rounded-lg hover:bg-current/10 disabled:opacity-30 cursor-pointer"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* 10 Gradient Presets Theme Switcher Popover */}
          <ThemeSelectorPopover
            activeThemeId={themeId}
            onSelectTheme={setThemeId}
          />

          {/* Bookmark Toggle */}
          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${isBookmarked ? 'text-[#026fc3]' : 'text-current/60 hover:text-current'}`}
            title="Bookmark this page"
          >
            <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </header>

      {/* 3. MAIN CENTRIC READING VIEWPORT */}
      <main
        ref={mainScrollRef}
        onScroll={handleScroll}
        className="flex-1 w-full overflow-y-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 scroll-smooth box-border"
      >
        <article className="w-full max-w-[760px] mx-auto space-y-6 sm:space-y-10 box-border overflow-x-hidden">
          
          {/* EDITORIAL LESSON HEADER */}
          <header className="w-full space-y-2 sm:space-y-3 pb-4 sm:pb-6 border-b border-current/15 text-left">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#026fc3]">
              <span>LESSON {String(currentInfo?.epIndex || 1).padStart(2, '0')}</span>
              <span className="opacity-40">•</span>
              <span className="opacity-80 text-current">{currentInfo?.unitTitle || 'Unit 1'}</span>
              <span className="opacity-40">•</span>
              <span className="opacity-80 text-current flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {selectedEpisode.estimated_minutes || 15} min read
              </span>
              {isEpisodeCompleted && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                </span>
              )}
            </div>

            <h1 className="text-[30px] sm:text-[34px] md:text-[42px] font-extrabold tracking-tight text-inherit leading-[1.15] text-left">
              {selectedEpisode.title}
            </h1>

            {course.short_description && (
              <p className="text-base sm:text-lg opacity-75 font-serif italic text-left max-w-xl">
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
            userAnswers={userAnswers}
            feedbackState={feedbackState}
            onQuestionAnswer={handleQuestionAnswer}
            onCompleteLesson={handleCompleteEpisode}
          />

          {/* MINIMAL EDITORIAL LESSON FOOTER */}
          <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 sm:pt-12 mt-8 sm:mt-12 border-t border-current/15">
            <div className="text-xs opacity-60 font-serif italic text-center sm:text-left">
              Lesson complete
            </div>

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
                disabled={completingEpisode}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{completingEpisode ? 'Saving...' : nextItem ? 'Complete & Continue' : 'Complete Course! 🎉'}</span>
                {nextItem && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </footer>

        </article>
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#026fc3]">
                  Table of Contents {enrollment?.progress_percent ? `• ${Math.round(enrollment.progress_percent)}%` : ''}
                </p>
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
                <div key={unit.id} className="space-y-1">
                  <p className="text-xs font-bold opacity-60 uppercase tracking-wider px-2">
                    Unit {uIdx + 1}: {unit.title}
                  </p>
                  <div className="space-y-1">
                    {(unit.episodes || []).map((ep) => {
                      const isSelected = selectedEpisode.id === ep.id;
                      const isDone = completedEpisodeIds.has(ep.id);

                      return (
                        <button
                          key={ep.id}
                          type="button"
                          onClick={() => {
                            setSelectedEpisode(ep);
                            setShowDrawer(false);
                            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer box-border ${
                            isSelected
                              ? 'bg-[#026fc3] text-white shadow-xs'
                              : 'hover:bg-current/10 text-current'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isDone ? (
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`} />
                            ) : (
                              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'opacity-50'}`} />
                            )}
                            <span className="truncate">{ep.title}</span>
                          </div>
                          <span className={`text-[10px] shrink-0 ${isSelected ? 'text-sky-100' : 'opacity-50'}`}>
                            {ep.estimated_minutes || 15}m
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

    </div>
  );
};
