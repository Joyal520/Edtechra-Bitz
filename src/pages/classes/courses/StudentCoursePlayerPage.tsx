// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: MOBILE-FIRST STUDENT DIGITAL BOOK PLAYER
// Apple Books & Kindle inspired reading-first digital learning experience.
// Integrated with Student Course Roadmap, Daily Lesson Release,
// and Encouraging Lesson Completion Celebration Modal.
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
  Bookmark,
  Map,
  Lock,
  Pause,
  Edit3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Course, CourseEpisode, CourseEnrollment, RoadmapLessonItem } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { CourseContentRenderer, getValidLessonQuestions } from '@/components/course-studio/CourseContentRenderer';
import { CourseRoadmap } from '@/components/course-studio/CourseRoadmap';
import { LessonCompletionModal } from '@/components/course-studio/LessonCompletionModal';
import { TextScale } from '@/utils/courseTextFormatting';
import { getThemePreset, DEFAULT_THEME_ID } from '@/utils/courseThemes';
import { ThemeSelectorPopover } from '@/components/course-studio/ThemeSelectorPopover';
import { computeCourseRoadmap } from '@/utils/dailyReleaseEngine';
import { LiquidButton } from '@/components/course-studio/liquid';

export const StudentCoursePlayerPage: React.FC = () => {
  const { classroomId, courseId } = useParams<{ classroomId: string; courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<CourseEpisode | null>(null);
  const [viewMode, setViewMode] = useState<'lesson' | 'roadmap'>('lesson');
  const [showDrawer, setShowDrawer] = useState(false);
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('edtechra_course_theme') || DEFAULT_THEME_ID;
  });
  const [textScale, setTextScale] = useState<TextScale>(() => {
    return (localStorage.getItem('edtechra_reader_scale') as TextScale) || 'md';
  });
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [completedEpisodeIds, setCompletedEpisodeIds] = useState<Set<string>>(new Set());
  const [completedEpisodesMap, setCompletedEpisodesMap] = useState<Record<string, { completed_at?: string }>>({});
  const [isTeacherPreview, setIsTeacherPreview] = useState(false);
  const [isCoursePaused, setIsCoursePaused] = useState(false);
  const [completingEpisode, setCompletingEpisode] = useState(false);

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [feedbackState, setFeedbackState] = useState<Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }>>({});
  const [questionProgress, setQuestionProgress] = useState<{ answered: number; total: number }>({ answered: 0, total: 0 });

  // Celebration Modal State
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [lastCompletedTitle, setLastCompletedTitle] = useState('');
  const [lastCompletedPos, setLastCompletedPos] = useState(1);
  const [lastCompletedPoints, setLastCompletedPoints] = useState(10);
  const [totalClassroomPoints, setTotalClassroomPoints] = useState<number | undefined>(undefined);
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mainScrollRef = useRef<HTMLElement>(null);
  const completingEpisodeRef = useRef(false);

  const handleProgressChange = React.useCallback((answered: number, total: number) => {
    setQuestionProgress({ answered, total });
  }, []);

  useEffect(() => {
    if (courseId && classroomId) {
      loadCourseAndProgress(courseId, classroomId);
    }
  }, [courseId, classroomId]);

  useEffect(() => {
    if (courseId && classroomId && selectedEpisode) {
      const initialTotal = getValidLessonQuestions(selectedEpisode.questions).length;
      setUserAnswers({});
      setFeedbackState({});
      setQuestionScores({});
      setQuestionProgress({ answered: 0, total: initialTotal });
      loadEpisodeAttempts(courseId, classroomId, selectedEpisode.id);
    }
  }, [courseId, classroomId, selectedEpisode?.id]);

  const loadEpisodeAttempts = async (cId: string, clId: string, epId: string) => {
    try {
      const attempts = await courseStudioService.getStudentQuestionAttempts(cId, clId, epId);
      const answersMap: Record<string, string> = {};
      const feedbackMap: Record<string, { isCorrect: boolean; showExplanation: boolean; selected: string }> = {};
      const scoresMap: Record<string, number> = {};

      attempts.forEach((att: any) => {
        if (att.student_answer !== undefined && att.student_answer !== null && String(att.student_answer).trim() !== '') {
          answersMap[att.question_id] = att.student_answer;
          feedbackMap[att.question_id] = {
            isCorrect: att.is_correct,
            showExplanation: true,
            selected: att.student_answer
          };
          scoresMap[att.question_id] = att.is_correct ? (att.points_awarded || 10) : 0;
        }
      });

      setUserAnswers(answersMap);
      setFeedbackState(feedbackMap);
      setQuestionScores(scoresMap);
    } catch (err) {
      console.error('Failed to load past attempts:', err);
    }
  };

  const loadCourseAndProgress = async (cId: string, clId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userData.user.id)
            .maybeSingle();

          const dbProfileName = profileRow?.full_name && !profileRow.full_name.includes('@')
            ? profileRow.full_name.trim()
            : '';
          const metaName = (userData.user.user_metadata as any)?.full_name
            || (userData.user.user_metadata as any)?.name
            || '';
          setStudentName(dbProfileName || metaName);
        }
      }

      // Fetch course and actual student progress concurrently
      const [courseData, progressData] = await Promise.all([
        courseStudioService.getCourse(cId),
        courseStudioService.getStudentProgress(cId, clId).catch(() => ({
          enrollment: null,
          completedEpisodeIds: [],
          progress_percent: 0,
          total_classroom_points: undefined
        }))
      ]);

      setCourse(courseData);

      const isTeacher = Boolean((progressData as any)?.is_teacher);
      const isPaused = Boolean((progressData as any)?.is_paused) || Boolean(courseData?.is_paused);
      setIsTeacherPreview(isTeacher);
      setIsCoursePaused(isPaused);

      if ((progressData as any)?.completedEpisodesMap) {
        setCompletedEpisodesMap((progressData as any).completedEpisodesMap);
      }

      // Restore persistent completed episode states from database
      const completedSet = new Set(progressData.completedEpisodeIds || []);
      setCompletedEpisodeIds(completedSet);
      setCelebratedIds(new Set(completedSet));
      if (typeof (progressData as any).total_classroom_points === 'number') {
        setTotalClassroomPoints((progressData as any).total_classroom_points);
      }

      if (progressData.enrollment) {
        setEnrollment(progressData.enrollment as CourseEnrollment);
      }

      // Compute initial roadmap with actual completed lessons & exact daily release state
      const roadmap = computeCourseRoadmap({
        course: courseData,
        completedEpisodeIds: completedSet,
        completedEpisodesMap: (progressData as any)?.completedEpisodesMap,
        studentStartDate: progressData.enrollment?.created_at || null,
        isPaused,
        isTeacher
      });

      if (roadmap.currentAvailableEpisode) {
        const found = findEpisodeById(courseData, roadmap.currentAvailableEpisode.id);
        if (found) setSelectedEpisode(found);
      } else {
        const firstUnit = courseData.units?.[0];
        if (firstUnit?.episodes?.[0]) setSelectedEpisode(firstUnit.episodes[0]);
      }
    } catch (err: any) {
      console.error('Failed to load course player:', err);
      setLoadError(err.message || 'Access restricted. You do not have permission to access this course.');
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
      setScrollProgress(prev => (prev === progress ? prev : progress));
    }
  };

  // Font size scale cycler with persistence
  const handleScaleDown = () => {
    let next: TextScale = 'md';
    if (textScale === 'xxl') next = 'xl';
    else if (textScale === 'xl') next = 'lg';
    else if (textScale === 'lg') next = 'md';
    else if (textScale === 'md') next = 'sm';
    setTextScale(next);
    localStorage.setItem('edtechra_reader_scale', next);
  };

  const handleScaleUp = () => {
    let next: TextScale = 'md';
    if (textScale === 'sm') next = 'md';
    else if (textScale === 'md') next = 'lg';
    else if (textScale === 'lg') next = 'xl';
    else if (textScale === 'xl') next = 'xxl';
    setTextScale(next);
    localStorage.setItem('edtechra_reader_scale', next);
  };

  const handleThemeChange = (newThemeId: string) => {
    setThemeId(newThemeId);
    localStorage.setItem('edtechra_course_theme', newThemeId);
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

  // Compute live roadmap with strict daily lock state
  const roadmapData = course ? computeCourseRoadmap({
    course,
    completedEpisodeIds,
    completedEpisodesMap,
    studentStartDate: enrollment?.created_at || null,
    currentActiveEpisodeId: selectedEpisode?.id || null,
    isPaused: isCoursePaused,
    isTeacher: isTeacherPreview
  }) : null;

  const currentRoadmapItem = roadmapData?.items.find(item => item.id === selectedEpisode?.id);
  const isCurrentEpisodeLocked = Boolean(currentRoadmapItem && (currentRoadmapItem.is_locked || currentRoadmapItem.status === 'locked'));

  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const currentScore = Object.values(questionScores).reduce((sum, pts) => sum + pts, 0);

  const handleQuestionAnswer = async (
    questionId: string,
    answer: string,
    isCorrect: boolean,
    pointsAwarded: number,
    question: any
  ) => {
    if (!courseId || !classroomId || !selectedEpisode) return;

    setQuestionScores(prev => ({
      ...prev,
      [questionId]: isCorrect ? pointsAwarded : 0
    }));

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

  const totalRequiredQuestions = selectedEpisode
    ? getValidLessonQuestions(selectedEpisode.questions).length
    : questionProgress.total;
  const answeredQuestionsCount = Math.min(questionProgress.answered, totalRequiredQuestions);
  const canCompleteLesson = totalRequiredQuestions === 0 || answeredQuestionsCount >= totalRequiredQuestions;

  const handleCompleteEpisode = async () => {
    if (!courseId || !classroomId || !selectedEpisode) return;
    if (completingEpisodeRef.current || completingEpisode) return;

    // Strict business rule: do NOT allow lesson completion until ALL required questions are answered
    if (totalRequiredQuestions > 0 && answeredQuestionsCount < totalRequiredQuestions) {
      return;
    }

    const epId = selectedEpisode.id;

    // Teacher Preview Guard: Do NOT record student progress or alter leaderboard points
    if (isTeacherPreview) {
      setCompletedEpisodeIds(prev => new Set([...prev, epId]));
      setCelebratedIds(prev => new Set([...prev, epId]));
      setToastMessage('Teacher Preview: Lesson completed in simulation. No student progress or points were recorded to the database.');
      setTimeout(() => setToastMessage(null), 4000);
      handleAfterCelebrationContinue();
      return;
    }

    // Paused Course Guard: Prevent submissions while paused
    if (isCoursePaused) {
      setToastMessage('Course is currently paused by your teacher. Lesson submissions are temporarily on hold.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    completingEpisodeRef.current = true;
    setCompletingEpisode(true);

    const calculatedScore = Object.values(questionScores).reduce((sum, pts) => sum + pts, 0);

    try {
      const res = await courseStudioService.recordStudentProgress({
        course_id: courseId,
        classroom_id: classroomId,
        episode_id: epId,
        score: calculatedScore,
        max_score: 100,
        time_spent_seconds: (selectedEpisode.estimated_minutes || 15) * 60
      });

      if (res?.enrollment) {
        setEnrollment(res.enrollment);
      }

      if (typeof res?.total_classroom_points === 'number') {
        setTotalClassroomPoints(res.total_classroom_points);
      }

      setCompletedEpisodeIds(prev => new Set([...prev, epId]));

      const alreadyAwarded = Boolean(res?.already_awarded);
      const awardedByBackend = typeof res?.points_awarded === 'number'
        ? res.points_awarded
        : (alreadyAwarded ? 0 : 10);

      // Only trigger celebration modal ONCE when backend confirms new lesson completion & reward
      if (!alreadyAwarded && !celebratedIds.has(epId)) {
        setCelebratedIds(prev => new Set([...prev, epId]));
        setLastCompletedTitle(selectedEpisode.title);
        setLastCompletedPos(selectedEpisode.position || (currentIndex + 1));
        setLastCompletedPoints(awardedByBackend);
        setCelebrationOpen(true);
      } else {
        setCelebratedIds(prev => new Set([...prev, epId]));
        handleAfterCelebrationContinue();
      }
    } catch (err: any) {
      console.error('Failed to mark lesson complete:', err);
      const errMsg = err?.message || 'Failed to complete lesson.';
      setToastMessage(errMsg);
      setTimeout(() => setToastMessage(null), 4500);
    } finally {
      completingEpisodeRef.current = false;
      setCompletingEpisode(false);
    }
  };

  const handleAfterCelebrationContinue = () => {
    setCelebrationOpen(false);

    if (course?.daily_release_enabled) {
      // Daily Release is ON: switch to Roadmap view so student sees next lesson is locked until tomorrow
      setViewMode('roadmap');
    } else {
      // Daily Release is OFF: proceed to next lesson if available
      if (nextItem) {
        setSelectedEpisode(nextItem.episode);
        setViewMode('lesson');
        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setViewMode('roadmap');
      }
    }
  };

  const handleSelectLessonFromRoadmap = (item: RoadmapLessonItem) => {
    if ((item.status === 'locked' || item.is_locked) && !isTeacherPreview) {
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

  if (loadError || !course || !selectedEpisode) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-black text-slate-900">
            {loadError ? 'Access Restricted' : 'Course Not Available'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {loadError || 'This course is currently unavailable or has not been assigned to your classroom.'}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate(`/classes/${classroomId}`)}
            className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Classroom</span>
          </button>
        </div>
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
      className={`reader-scale-container course-reader-shell ${activeTheme.isDark ? 'dark' : ''} w-full flex flex-col ${activeTheme.bgGradient} text-theme-primary font-sans antialiased overflow-hidden transition-colors duration-300`}
    >
      {/* 0A. TEACHER PREVIEW MODE BANNER */}
      {isTeacherPreview && (
        <aside aria-label="Teacher preview mode" className="bg-slate-900 text-white px-3 sm:px-6 py-2 text-xs font-bold flex items-center justify-between gap-3 border-b border-indigo-500/40 shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-[10px] font-black uppercase tracking-wider shrink-0">
              Teacher Preview
            </span>
            <span className="hidden sm:inline text-slate-300 text-[11px] truncate">
              Testing course as author. Student progress and leaderboard scores are not recorded.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate(`/course-studio/${courseId}`)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Course</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/classes/${classroomId}`)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden xs:inline">Classroom</span>
            </button>
          </div>
        </aside>
      )}

      {/* 0B. PAUSED ACCESS BANNER */}
      {isCoursePaused && !isTeacherPreview && (
        <aside aria-label="Course paused" className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-3 sm:px-6 py-2.5 text-xs font-bold flex items-center gap-2 shrink-0 z-30">
          <Pause className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Course Paused:</strong> Your teacher has temporarily paused access to this course. Lessons and exercises are currently on hold.
          </span>
        </aside>
      )}
      
      {/* 1. TOP READING PROGRESS LINE */}
      <div className="w-full h-1 bg-current/5 relative shrink-0">
        <div
          className="h-full bg-[var(--theme-accent)] transition-all duration-150 shadow-xs"
          style={{ width: `${viewMode === 'roadmap' ? (roadmapData?.progressPercent || 0) : scrollProgress}%` }}
        />
      </div>

      {/* 2. COMPACT EDITORIAL TOP BAR */}
      <header className={`h-12 sm:h-14 ${activeTheme.headerBg} px-2.5 sm:px-6 flex items-center justify-between gap-1.5 shrink-0 z-20 border-b border-[var(--theme-border-subtle)] text-theme-primary transition-colors`}>
        
        {/* Left: ← Class, Roadmap Toggle, Contents */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <LiquidButton
            variant="tertiary"
            size="sm"
            onClick={() => navigate(`/classes/${classroomId}`)}
            icon={<ArrowLeft className="w-3.5 h-3.5 text-[#026fc3]" />}
            title="Back to Class"
            className="!px-2 sm:!px-2.5 !py-1"
          >
            <span className="hidden sm:inline">Class</span>
          </LiquidButton>

          {/* Toggle between Reading & Roadmap */}
          <LiquidButton
            variant={viewMode === 'roadmap' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode(viewMode === 'lesson' ? 'roadmap' : 'lesson')}
            icon={<Map className="w-3.5 h-3.5" />}
            title="Toggle Course Roadmap"
            className="!px-2 sm:!px-2.5 !py-1"
          >
            <span>{viewMode === 'roadmap' ? 'Lesson' : 'Roadmap'}</span>
          </LiquidButton>

          <LiquidButton
            variant="secondary"
            size="sm"
            onClick={() => setShowDrawer(true)}
            icon={<Menu className="w-3.5 h-3.5" />}
            title="Table of Contents"
            className="!px-2 sm:!px-2.5 !py-1"
          >
            <span className="inline font-bold">Contents</span>
          </LiquidButton>
        </div>

        {/* Center: Chapter Info (Desktop / Tablet) */}
        <div className="text-center truncate px-2 max-w-[160px] md:max-w-xs hidden md:block">
          <p className="text-xs font-serif italic text-current/80 truncate">
            {viewMode === 'roadmap'
              ? `${course.title} • Roadmap`
              : `Lesson ${currentInfo?.epIndex || 1} • ${selectedEpisode.title}`}
          </p>
        </div>

        {/* Right: XP, Progress %, Font Controls (Desktop), Theme Popover, Bookmark */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* XP Pill */}
          <div
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/15 ${
              activeTheme.isDark ? 'text-amber-300' : 'text-amber-900'
            } text-[10px] sm:text-[11px] font-bold border border-amber-400/30 whitespace-nowrap`}
          >
            <Award className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${activeTheme.isDark ? 'text-amber-400' : 'text-amber-600'} shrink-0`} />
            <span>{currentScore} XP</span>
          </div>

          {/* Reading / Roadmap Progress Badge */}
          <span className="hidden min-[380px]:inline text-[11px] font-mono font-bold opacity-80 px-1 py-0.5 whitespace-nowrap">
            {viewMode === 'roadmap' ? `${roadmapData?.progressPercent || 0}%` : `${scrollProgress}%`}
          </span>

          {/* Font Size A- / A+ (Desktop header; on mobile available inside Reading Appearance sheet) */}
          {viewMode === 'lesson' && (
            <div className="hidden sm:flex items-center gap-1">
              <LiquidButton
                variant="tertiary"
                size="sm"
                onClick={handleScaleDown}
                disabled={textScale === 'sm'}
                title="Decrease Font Size"
              >
                A−
              </LiquidButton>
              <LiquidButton
                variant="tertiary"
                size="sm"
                onClick={handleScaleUp}
                disabled={textScale === 'xxl'}
                title="Increase Font Size"
              >
                A+
              </LiquidButton>
            </div>
          )}

          {/* Theme Presets Popover (Desktop Popover + Mobile Bottom Sheet) */}
          <ThemeSelectorPopover
            activeThemeId={themeId}
            onSelectTheme={handleThemeChange}
            textScale={textScale}
            onScaleDown={handleScaleDown}
            onScaleUp={handleScaleUp}
            showFontControls={viewMode === 'lesson'}
          />

          {/* Bookmark Toggle */}
          <LiquidButton
            variant="tertiary"
            size="sm"
            onClick={() => setIsBookmarked(!isBookmarked)}
            title="Bookmark this page"
            className="!px-2 !py-1"
            icon={<Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current text-[#026fc3]' : ''}`} />}
          />
        </div>
      </header>

      {/* Non-blocking Toast Message */}
      {toastMessage && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md z-30 animate-in fade-in duration-150 reader-meta shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="font-bold px-2 py-0.5 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 3. MAIN CENTRIC VIEWPORT (Roadmap vs Lesson Reader) */}
      <main
        ref={mainScrollRef}
        onScroll={handleScroll}
        className="course-reader-scroll flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 md:px-8 pt-6 pb-24 sm:py-10 scroll-smooth box-border [--reader-gutter:1rem] sm:[--reader-gutter:1.5rem]"
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
          <article className="w-full max-w-[760px] mx-auto space-y-6 sm:space-y-10 pb-8 box-border min-w-0">
            
            {/* EDITORIAL LESSON HEADER */}
            <header className="w-full space-y-2 sm:space-y-3 pb-4 sm:pb-6 border-b border-[var(--theme-border-subtle)] text-left">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-theme-accent reader-meta">
                <span>LESSON {String(selectedEpisode.position || currentInfo?.epIndex || 1).padStart(2, '0')}</span>
                <span className="opacity-40">•</span>
                <span className="opacity-80 text-theme-secondary">{currentInfo?.unitTitle || 'Unit 1'}</span>
                <span className="opacity-40">•</span>
                <span className="opacity-80 text-theme-secondary flex items-center gap-1">
                  <Clock className="w-3 h-3 text-theme-accent" />
                  {selectedEpisode.estimated_minutes || 15} min read
                </span>
                {isEpisodeCompleted && (
                  <span
                    className={`px-2 py-0.5 rounded-full bg-emerald-500/15 ${
                      activeTheme.isDark ? 'text-emerald-300' : 'text-emerald-800'
                    } text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Done
                  </span>
                )}
              </div>

              <h1 className="font-extrabold tracking-tight text-theme-primary leading-[1.15] text-left reader-title">
                {selectedEpisode.title}
              </h1>

              {course.short_description && (
                <p className="text-base sm:text-lg text-theme-secondary font-serif italic text-left max-w-xl reader-quote">
                  “{course.short_description}”
                </p>
              )}
            </header>

            {isCurrentEpisodeLocked ? (
              <div className="py-14 sm:py-20 text-center space-y-4 max-w-md mx-auto surface-card rounded-3xl p-6 sm:p-8 border border-[var(--theme-border-primary)] shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto shadow-xs border border-amber-500/30">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-theme-primary">This Lesson is Locked</h3>
                  <p className="text-xs sm:text-sm text-theme-secondary font-medium leading-relaxed">
                    {currentRoadmapItem?.unlock_message || 'Unlock One Lesson Per Day is active for this course. This lesson unlocks tomorrow at midnight.'}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('roadmap')}
                    className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>View Course Roadmap</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* SHARED EDITORIAL CONTENT RENDERER */}
                <CourseContentRenderer
                  key={selectedEpisode.id}
                  blocks={selectedEpisode.blocks || []}
                  questions={selectedEpisode.questions || []}
                  isStudentView={true}
                  textScale={textScale}
                  themeId={themeId}
                  userAnswers={userAnswers}
                  feedbackState={feedbackState}
                  onQuestionAnswer={handleQuestionAnswer}
                  onCompleteLesson={handleCompleteEpisode}
                  onProgressChange={handleProgressChange}
                />

            {/* ============================================================== */}
            {/* FINAL LESSON COMPLETION & NAVIGATION ACTION AREA               */}
            {/* ============================================================== */}
            <footer
              data-testid="lesson-final-action-area"
              className="w-full pt-6 sm:pt-8 mt-6 sm:mt-10 border-t border-[var(--theme-border-subtle)] space-y-4"
            >
              {/* Question Completion Gate Banner (shown when lesson has required questions) */}
              {totalRequiredQuestions > 0 && (
                <div className="w-full surface-card rounded-2xl p-4 sm:p-5 border border-[var(--theme-border-primary)] space-y-3 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-theme-primary">
                      Lesson Progress: {answeredQuestionsCount} / {totalRequiredQuestions} Questions Answered
                    </span>
                    <span className="text-xs font-mono font-bold text-theme-accent">
                      {Math.round((answeredQuestionsCount / totalRequiredQuestions) * 100)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[var(--theme-surface-subtle)] border border-[var(--theme-border-subtle)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        canCompleteLesson
                          ? 'bg-emerald-500'
                          : 'bg-linear-to-r from-[#026fc3] to-[#38bdf8]'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((answeredQuestionsCount / totalRequiredQuestions) * 100))}%`
                      }}
                    />
                  </div>

                  {/* Status / Helper Message */}
                  {canCompleteLesson ? (
                    <div
                      className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${
                        activeTheme.isDark ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>✓ All questions answered</span>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-medium text-theme-secondary">
                      Answer all questions to continue.
                    </p>
                  )}
                </div>
              )}

              {/* Bottom Navigation & Complete Lesson Controls */}
              <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode('roadmap')}
                  className="text-xs font-bold text-theme-accent hover:underline flex items-center justify-center sm:justify-start gap-1.5 py-2 cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>View Course Roadmap</span>
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {prevItem && (
                    <LiquidButton
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setSelectedEpisode(prevItem.episode);
                        mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      icon={<ArrowLeft className="w-4 h-4" />}
                      className="flex-1 sm:flex-initial"
                    >
                      Previous
                    </LiquidButton>
                  )}

                  {canCompleteLesson ? (
                    <LiquidButton
                      variant="emerald"
                      size="md"
                      onClick={handleCompleteEpisode}
                      disabled={completingEpisode}
                      loading={completingEpisode}
                      icon={<Check className="w-4 h-4 stroke-[3]" />}
                      iconRight={nextItem ? <ArrowRight className="w-4 h-4" /> : undefined}
                      className="flex-1 sm:flex-initial shadow-md"
                    >
                      {nextItem ? 'Complete Lesson' : 'Complete Course'}
                    </LiquidButton>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Answer all questions to unlock lesson completion"
                      className="flex-1 sm:flex-initial min-h-[44px] px-6 py-2.5 rounded-full font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 bg-[var(--theme-surface-subtle)] text-theme-muted border border-[var(--theme-border-primary)] opacity-60 cursor-not-allowed select-none"
                    >
                      <span>{nextItem ? 'Complete Lesson' : 'Complete Course'}</span>
                    </button>
                  )}
                </div>
              </div>
            </footer>
          </>
        )}

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
        studentName={studentName}
        lessonTitle={lastCompletedTitle}
        lessonPosition={lastCompletedPos}
        pointsEarned={lastCompletedPoints}
        totalLeaderboardPoints={totalClassroomPoints}
        progressPercent={roadmapData?.progressPercent || 0}
        completedLessonsCount={roadmapData?.completedLessons || 1}
        totalLessonsCount={roadmapData?.totalLessons || 1}
        dailyReleaseEnabled={Boolean(course.daily_release_enabled)}
        onContinue={handleAfterCelebrationContinue}
      />

    </div>
  );
};
