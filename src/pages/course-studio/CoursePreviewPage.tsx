// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: UNIFIED COURSE STUDIO (EDITOR + PREVIEW)
// Single-page course creator, editor, interactive preview, and publisher.
// Mode = "edit" (inline click-to-edit, outlines, questions, blocks)
// Mode = "student" (clean, interactive student learning simulation)
// Zero duplicated data state. Fully responsive down to 320px screen width.
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  CheckCircle2,
  Edit3,
  Eye,
  Send,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  Layers,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Course, CourseUnit, CourseEpisode, RoadmapLessonItem, CourseBlock, CourseQuestion } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { CourseContentRenderer } from '@/components/course-studio/CourseContentRenderer';
import { CourseRoadmap } from '@/components/course-studio/CourseRoadmap';
import { LessonCompletionModal } from '@/components/course-studio/LessonCompletionModal';
import { CoursePublishModal } from '@/components/course-studio/CoursePublishModal';
import { AILessonAssistantModal } from '@/components/course-studio/AILessonAssistantModal';
import { AddQuestionsModal } from '@/components/course-studio/AddQuestionsModal';
import { QuestionPlanModal } from '@/components/course-studio/QuestionPlanModal';
import { TextScale } from '@/utils/courseTextFormatting';
import { getThemePreset, DEFAULT_THEME_ID } from '@/utils/courseThemes';
import { ThemeSelectorPopover } from '@/components/course-studio/ThemeSelectorPopover';
import { computeCourseRoadmap } from '@/utils/dailyReleaseEngine';
import { LiquidButton } from '@/components/course-studio/liquid';

export const CoursePreviewPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Core Course State
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<CourseEpisode | null>(null);
  const [viewMode, setViewMode] = useState<'lesson' | 'roadmap'>('lesson');

  // Mode: Default to Edit mode when teacher opens a course (or check query params)
  const [isEditMode, setIsEditMode] = useState<boolean>(() => {
    const modeParam = searchParams.get('mode');
    const editParam = searchParams.get('edit');
    if (modeParam === 'student' || editParam === '0') return false;
    return true; // Single unified editor: defaults to edit mode
  });

  // UI Panels & Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [addQuestionsModalOpen, setAddQuestionsModalOpen] = useState(false);
  const [questionPlanModalOpen, setQuestionPlanModalOpen] = useState(false);

  // Saving & Sync Status
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active In-Place Editing State for Selected Episode
  const [currentBlocks, setCurrentBlocks] = useState<CourseBlock[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<CourseQuestion[]>([]);
  const [currentEpisodeTitle, setCurrentEpisodeTitle] = useState('');
  const [currentEpisodeMins, setCurrentEpisodeMins] = useState(15);

  // Inline Editing for Course Title & Unit Titles
  const [isEditingCourseTitle, setIsEditingCourseTitle] = useState(false);
  const [tempCourseTitle, setTempCourseTitle] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [tempUnitTitle, setTempUnitTitle] = useState('');

  // Reader Settings
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('edtechra_course_theme') || DEFAULT_THEME_ID;
  });
  const [textScale, setTextScale] = useState<TextScale>(() => {
    return (localStorage.getItem('edtechra_reader_scale') as TextScale) || 'md';
  });
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Student Progress Simulation & Celebration
  const [completedEpisodeIds, setCompletedEpisodeIds] = useState<Set<string>>(new Set());
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [lastCompletedTitle, setLastCompletedTitle] = useState('');
  const [lastCompletedPos, setLastCompletedPos] = useState(1);
  const [lastCompletedPoints, setLastCompletedPoints] = useState(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mainScrollRef = useRef<HTMLElement>(null);

  // --------------------------------------------------------------------------
  // 1. LOAD COURSE DATA
  // --------------------------------------------------------------------------
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
      setTempCourseTitle(data.title || '');

      // Initialize all units as expanded
      const initialExpanded: Record<string, boolean> = {};
      (data.units || []).forEach(u => {
        initialExpanded[u.id] = true;
      });
      setExpandedUnits(initialExpanded);

      // Select initial episode
      const targetEpId = searchParams.get('episode');
      let found: CourseEpisode | null = null;
      if (targetEpId) {
        found = findEpisodeById(data, targetEpId);
      }
      if (!found) {
        const firstUnit = data.units?.[0];
        if (firstUnit?.episodes?.[0]) {
          found = firstUnit.episodes[0];
        }
      }
      if (found) {
        setSelectedEpisode(found);
      }
    } catch (err) {
      console.error('Failed to load course preview/editor:', err);
      showToast('Failed to load course details.');
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --------------------------------------------------------------------------
  // 2. EPISODE CONTENT SYNC
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (selectedEpisode) {
      setCurrentBlocks(selectedEpisode.blocks || []);
      setCurrentQuestions(selectedEpisode.questions || []);
      setCurrentEpisodeTitle(selectedEpisode.title || '');
      setCurrentEpisodeMins(selectedEpisode.estimated_minutes || 15);
      setSavingStatus('saved');
    }
  }, [selectedEpisode?.id]);

  // Track vertical reading scroll percentage
  const handleScroll = () => {
    if (mainScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mainScrollRef.current;
      const progress =
        scrollHeight <= clientHeight ? 100 : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setScrollProgress(progress);
    }
  };

  // --------------------------------------------------------------------------
  // 3. AUTOSAVE & PERSISTENCE
  // --------------------------------------------------------------------------
  const triggerAutosave = (
    nextBlocks: CourseBlock[],
    nextQuestions: CourseQuestion[],
    nextTitle: string,
    nextMins: number
  ) => {
    if (!course || !selectedEpisode) return;
    setSavingStatus('unsaved');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      await executeSave(nextBlocks, nextQuestions, nextTitle, nextMins);
    }, 800);
  };

  const executeSave = async (
    nextBlocks: CourseBlock[],
    nextQuestions: CourseQuestion[],
    nextTitle: string,
    nextMins: number,
    isManual = false
  ) => {
    if (!course || !selectedEpisode) return;
    setSavingStatus('saving');
    try {
      await Promise.all([
        courseStudioService.saveEpisodeBlocks(course.id, selectedEpisode.id, nextBlocks),
        courseStudioService.saveEpisodeQuestions(course.id, selectedEpisode.id, nextQuestions),
        courseStudioService.updateEpisode(course.id, selectedEpisode.id, {
          title: nextTitle,
          estimated_minutes: nextMins
        })
      ]);

      // In-place state synchronization across local unit tree
      const updatedEpisode: CourseEpisode = {
        ...selectedEpisode,
        title: nextTitle,
        estimated_minutes: nextMins,
        blocks: nextBlocks,
        questions: nextQuestions
      };

      setSelectedEpisode(updatedEpisode);

      // Keep course units up to date with updated episode
      setCourse(prev => {
        if (!prev) return null;
        const nextUnits = (prev.units || []).map(u => ({
          ...u,
          episodes: (u.episodes || []).map(ep => (ep.id === updatedEpisode.id ? updatedEpisode : ep))
        }));
        return { ...prev, units: nextUnits };
      });

      setSavingStatus('saved');
      if (isManual) {
        showToast('All changes saved successfully!');
      }
    } catch (err) {
      console.error('[Course Studio] Autosave error:', err);
      setSavingStatus('unsaved');
      if (isManual) {
        showToast('Save failed. Please check network.');
      }
    }
  };

  const handleManualSave = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    executeSave(currentBlocks, currentQuestions, currentEpisodeTitle, currentEpisodeMins, true);
  };

  // In-Place Episode Content Handlers
  const handleBlocksChange = (newBlocks: CourseBlock[]) => {
    setCurrentBlocks(newBlocks);
    triggerAutosave(newBlocks, currentQuestions, currentEpisodeTitle, currentEpisodeMins);
  };

  const handleQuestionsChange = (newQuestions: CourseQuestion[]) => {
    setCurrentQuestions(newQuestions);
    triggerAutosave(currentBlocks, newQuestions, currentEpisodeTitle, currentEpisodeMins);
  };

  const handleUpdateEpisodeTitle = (newTitle: string) => {
    setCurrentEpisodeTitle(newTitle);
    triggerAutosave(currentBlocks, currentQuestions, newTitle, currentEpisodeMins);
  };

  const handleUpdateEpisodeMins = (newMins: number) => {
    setCurrentEpisodeMins(newMins);
    triggerAutosave(currentBlocks, currentQuestions, currentEpisodeTitle, newMins);
  };

  // --------------------------------------------------------------------------
  // 4. COURSE TITLE & UNIT OUTLINE ACTIONS (MAX 10 UNITS)
  // --------------------------------------------------------------------------
  const handleSaveCourseTitle = async () => {
    if (!course) return;
    const trimmed = tempCourseTitle.trim();
    if (!trimmed || trimmed === course.title) {
      setIsEditingCourseTitle(false);
      setTempCourseTitle(course.title);
      return;
    }

    try {
      await courseStudioService.updateCourse(course.id, { title: trimmed });
      setCourse({ ...course, title: trimmed });
      setIsEditingCourseTitle(false);
      showToast('Course title updated.');
    } catch (err: any) {
      console.error('Failed to update course title:', err);
      showToast('Failed to update course title.');
    }
  };

  const handleAddUnit = async () => {
    if (!course) return;
    if ((course.units?.length || 0) >= 10) {
      showToast('Maximum limit of 10 units reached.');
      return;
    }

    try {
      const orderIndex = course.units?.length || 0;
      const newUnit = await courseStudioService.createUnit(course.id, {
        title: `Unit ${orderIndex + 1}`,
        order_index: orderIndex
      });

      // Automatically create a starting lesson in the new unit
      const startingEp = await courseStudioService.createEpisode(course.id, {
        unit_id: newUnit.id,
        title: `Day 1: Introduction`,
        order_index: 0,
        estimated_minutes: 15
      });

      const assembledUnit: CourseUnit = {
        ...newUnit,
        episodes: [startingEp]
      };

      const updatedUnits = [...(course.units || []), assembledUnit];
      setCourse({ ...course, units: updatedUnits });
      setExpandedUnits(prev => ({ ...prev, [newUnit.id]: true }));
      setSelectedEpisode(startingEp);
      showToast(`Unit ${orderIndex + 1} added!`);
    } catch (err: any) {
      console.error('Failed to add unit:', err);
      showToast(err.message || 'Failed to add unit.');
    }
  };

  const handleSaveUnitTitle = async (unitId: string) => {
    if (!course) return;
    const trimmed = tempUnitTitle.trim();
    if (!trimmed) {
      setEditingUnitId(null);
      return;
    }

    try {
      await courseStudioService.updateUnit(course.id, unitId, { title: trimmed });
      const nextUnits = (course.units || []).map(u => (u.id === unitId ? { ...u, title: trimmed } : u));
      setCourse({ ...course, units: nextUnits });
      setEditingUnitId(null);
      showToast('Unit title updated.');
    } catch (err) {
      console.error('Failed to update unit title:', err);
      showToast('Failed to update unit title.');
    }
  };

  const handleDeleteUnit = async (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    if (!course || !confirm('Are you sure you want to delete this unit and all its lessons?')) return;

    try {
      await courseStudioService.deleteUnit(course.id, unitId);
      const nextUnits = (course.units || []).filter(u => u.id !== unitId);
      setCourse({ ...course, units: nextUnits });

      // If active episode was in this deleted unit, select an episode in remaining units
      if (selectedEpisode && !nextUnits.some(u => u.episodes?.some(ep => ep.id === selectedEpisode.id))) {
        if (nextUnits.length > 0 && nextUnits[0].episodes?.[0]) {
          setSelectedEpisode(nextUnits[0].episodes[0]);
        } else {
          setSelectedEpisode(null);
        }
      }
      showToast('Unit deleted.');
    } catch (err: any) {
      console.error('Failed to delete unit:', err);
      showToast('Failed to delete unit.');
    }
  };

  const handleAddEpisode = async (unitId: string) => {
    if (!course) return;
    const targetUnit = course.units?.find(u => u.id === unitId);
    const orderIndex = targetUnit?.episodes?.length || 0;

    try {
      const newEp = await courseStudioService.createEpisode(course.id, {
        unit_id: unitId,
        title: `Day ${orderIndex + 1}: Lesson`,
        order_index: orderIndex,
        estimated_minutes: 15
      });

      const nextUnits = (course.units || []).map(u => {
        if (u.id === unitId) {
          return { ...u, episodes: [...(u.episodes || []), newEp] };
        }
        return u;
      });

      setCourse({ ...course, units: nextUnits });
      setSelectedEpisode(newEp);
      setViewMode('lesson');
      setShowDrawer(false);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('New lesson created!');
    } catch (err: any) {
      console.error('Failed to add lesson:', err);
      showToast('Failed to add lesson.');
    }
  };

  const handleDeleteEpisode = async (e: React.MouseEvent, unitId: string, epId: string) => {
    e.stopPropagation();
    if (!course || !confirm('Delete this lesson?')) return;

    try {
      await courseStudioService.deleteEpisode(course.id, epId);
      const nextUnits = (course.units || []).map(u => {
        if (u.id === unitId) {
          return { ...u, episodes: (u.episodes || []).filter(ep => ep.id !== epId) };
        }
        return u;
      });

      setCourse({ ...course, units: nextUnits });

      if (selectedEpisode?.id === epId) {
        // Find adjacent episode
        let nextToSelect: CourseEpisode | null = null;
        for (const u of nextUnits) {
          if (u.episodes && u.episodes.length > 0) {
            nextToSelect = u.episodes[0];
            break;
          }
        }
        setSelectedEpisode(nextToSelect);
      }
      showToast('Lesson deleted.');
    } catch (err: any) {
      console.error('Failed to delete lesson:', err);
      showToast('Failed to delete lesson.');
    }
  };

  // Toggle Mode Handler (Edit vs Student/Preview)
  const handleToggleMode = (nextEditMode: boolean) => {
    if (!nextEditMode && savingStatus === 'unsaved') {
      handleManualSave();
    }
    setIsEditMode(nextEditMode);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (nextEditMode) {
        next.set('edit', '1');
        next.delete('mode');
      } else {
        next.delete('edit');
        next.set('mode', 'student');
      }
      return next;
    });
  };

  // Font Size Cycler
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

  // Linearize episodes for navigation
  const allEpisodes = useMemo(() => {
    const list: Array<{ episode: CourseEpisode; unitTitle: string; unitIndex: number; epIndex: number }> = [];
    (course?.units || []).forEach((u, uIdx) => {
      (u.episodes || []).forEach((ep, epIdx) => {
        list.push({ episode: ep, unitTitle: u.title, unitIndex: uIdx + 1, epIndex: epIdx + 1 });
      });
    });
    return list;
  }, [course]);

  const currentInfo = allEpisodes.find(item => item.episode.id === selectedEpisode?.id);
  const currentIndex = allEpisodes.findIndex(item => item.episode.id === selectedEpisode?.id);
  const prevItem = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextItem = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  // Compute preview roadmap
  const roadmapData = course
    ? computeCourseRoadmap({
        course,
        completedEpisodeIds,
        currentActiveEpisodeId: selectedEpisode?.id || null
      })
    : null;

  const handleCompleteEpisode = () => {
    if (!selectedEpisode) return;
    const epId = selectedEpisode.id;
    const pointsForLesson = (selectedEpisode.questions || []).reduce((sum, q) => sum + (q.points || 10), 0) || 10;
    setCompletedEpisodeIds(prev => new Set([...prev, epId]));
    setLastCompletedTitle(selectedEpisode.title);
    setLastCompletedPos(selectedEpisode.position || currentIndex + 1);
    setLastCompletedPoints(pointsForLesson);
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
      showToast(msg);
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
          <p className="text-sm font-serif italic text-stone-600">Opening Course Studio...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] flex items-center justify-center p-6 text-center space-y-4">
        <div className="space-y-2">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-stone-800">Course Not Found</h2>
          <p className="text-xs text-stone-500">The requested course could not be located.</p>
        </div>
        <button
          onClick={() => navigate('/course-studio')}
          className="px-6 py-2.5 bg-[#026fc3] text-white text-xs font-bold rounded-xl"
        >
          Return to Studio
        </button>
      </div>
    );
  }

  const activeTheme = getThemePreset(themeId);
  const isEpisodeCompleted = selectedEpisode ? completedEpisodeIds.has(selectedEpisode.id) : false;

  // --------------------------------------------------------------------------
  // REUSABLE COURSE OUTLINE RENDERER (SHARED BETWEEN DESKTOP SIDEBAR & MOBILE DRAWER)
  // --------------------------------------------------------------------------
  const renderCourseOutline = (isDrawer = false) => (
    <div className="h-full flex flex-col justify-between select-none">
      {/* Top Header of Outline */}
      <div className="p-4 border-b border-[var(--theme-border-subtle)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#026fc3]">
              Course Outline
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold opacity-75">
                {(course.units || []).length} / 10 Units
              </span>
            </div>
          </div>

          {isDrawer && (
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              className="p-1.5 rounded-lg hover:bg-current/10 text-current cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* In Edit Mode: + Add Unit Button (Max 10) */}
        {isEditMode && (
          <button
            type="button"
            disabled={(course.units || []).length >= 10}
            onClick={handleAddUnit}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-[#026fc3]/50 hover:border-[#026fc3] hover:bg-[#026fc3]/10 text-[#026fc3] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{(course.units || []).length >= 10 ? 'Unit Limit Reached (10)' : 'Add Unit'}</span>
          </button>
        )}
      </div>

      {/* Units & Lessons List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {(course.units || []).length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <Layers className="w-8 h-8 mx-auto opacity-30 text-[#026fc3]" />
            <p className="text-xs font-bold opacity-60">No units created yet.</p>
            {isEditMode && (
              <button
                type="button"
                onClick={handleAddUnit}
                className="px-3 py-1.5 bg-[#026fc3] text-white text-xs font-bold rounded-lg"
              >
                + Add Unit 1
              </button>
            )}
          </div>
        ) : (
          (course.units || []).map((unit, uIdx) => {
            const isExpanded = expandedUnits[unit.id] ?? true;
            const isEditingThisUnit = editingUnitId === unit.id;

            return (
              <div
                key={unit.id}
                className="rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-surface-subtle)]/50 overflow-hidden"
              >
                {/* Unit Header */}
                <div
                  onClick={() => setExpandedUnits(prev => ({ ...prev, [unit.id]: !isExpanded }))}
                  className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-current/5 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-current/60 shrink-0">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>

                    {isEditingThisUnit ? (
                      <div
                        className="flex items-center gap-1 flex-1 min-w-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={tempUnitTitle}
                          onChange={e => setTempUnitTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveUnitTitle(unit.id);
                            if (e.key === 'Escape') setEditingUnitId(null);
                          }}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-xs font-bold rounded border border-[#026fc3] bg-white text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveUnitTitle(unit.id)}
                          className="p-1 rounded bg-[#026fc3] text-white hover:bg-[#025699]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <span className="text-[10px] font-mono font-black text-[#026fc3] uppercase shrink-0">
                          U{uIdx + 1}
                        </span>
                        <span className="text-xs font-bold truncate text-current" title={unit.title}>
                          {unit.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Edit Unit Actions */}
                  {isEditMode && !isEditingThisUnit && (
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUnitId(unit.id);
                          setTempUnitTitle(unit.title);
                        }}
                        title="Rename Unit"
                        className="p-1 rounded-md hover:bg-current/10 text-current/60 hover:text-current"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={e => handleDeleteUnit(e, unit.id)}
                        title="Delete Unit"
                        className="p-1 rounded-md hover:bg-rose-500/10 text-rose-500/70 hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Lessons in this Unit */}
                {isExpanded && (
                  <div className="px-2 pb-2 pt-1 space-y-1 border-t border-[var(--theme-border-subtle)]/60">
                    {(unit.episodes || []).map(ep => {
                      const isSelected = selectedEpisode?.id === ep.id;
                      const isDone = completedEpisodeIds.has(ep.id);
                      const roadItem = roadmapData?.items.find(i => i.id === ep.id);
                      const isLocked = !isEditMode && roadItem?.is_locked;

                      return (
                        <div
                          key={ep.id}
                          onClick={() => {
                            if (isLocked) {
                              showToast(`Lesson ${ep.position || 1} is locked. Opens on Day ${roadItem?.release_day}.`);
                              return;
                            }
                            setSelectedEpisode(ep);
                            setViewMode('lesson');
                            if (isDrawer) setShowDrawer(false);
                            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-full p-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'bg-[#026fc3] text-white shadow-xs'
                              : isDone
                              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20'
                              : 'hover:bg-current/10 text-current'
                          } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : isLocked ? (
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5 text-current/60 shrink-0" />
                            )}
                            <span className="truncate">{ep.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] opacity-75 font-mono">
                              {isLocked ? `🔒 D${roadItem?.release_day}` : `${ep.estimated_minutes || 15}m`}
                            </span>

                            {isEditMode && (
                              <button
                                type="button"
                                onClick={e => handleDeleteEpisode(e, unit.id, ep.id)}
                                title="Delete Lesson"
                                className={`p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-500 ${
                                  isSelected ? 'text-white/80 hover:text-white' : ''
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* In Edit Mode: + Add Lesson Button */}
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleAddEpisode(unit.id)}
                        className="w-full py-1.5 px-2 mt-1 rounded-lg border border-dashed border-current/25 hover:border-[#026fc3] hover:text-[#026fc3] text-[11px] font-bold text-current/60 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Lesson</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info of Outline */}
      <div className="p-3 border-t border-[var(--theme-border-subtle)] text-center">
        <p className="text-[10px] font-serif italic text-theme-secondary opacity-70">
          {isEditMode ? 'Click any content to edit directly.' : 'Student Interactive Learning Preview'}
        </p>
      </div>
    </div>
  );

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

      {/* 2. UNIFIED TOP HEADER BAR */}
      <header
        className={`h-12 sm:h-14 ${activeTheme.headerBg} px-2 sm:px-4 md:px-6 flex items-center justify-between shrink-0 z-20 border-b border-[var(--theme-border-subtle)] text-theme-primary transition-colors gap-2 overflow-x-auto`}
      >
        {/* Left: ← Studio, Contents Drawer Button, Click-to-Edit Course Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/course-studio')}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-current/10 text-theme-primary transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
            title="Return to Studio Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#026fc3]" />
            <span className="hidden sm:inline">Studio</span>
          </button>

          {/* Mobile Contents Button (visible on < lg) */}
          <LiquidButton
            variant="secondary"
            size="sm"
            onClick={() => setShowDrawer(true)}
            icon={<Menu className="w-3.5 h-3.5" />}
            title="Course Table of Contents"
            className="lg:hidden !px-2.5 !py-1 !text-xs shrink-0"
          >
            <span>Contents</span>
          </LiquidButton>

          {/* DUAL MODE TOGGLE: [ ✏️ Edit ] [ 👁️ Preview ] */}
          <div className="flex items-center rounded-xl bg-[var(--theme-surface-subtle)] p-0.5 border border-[var(--theme-border-subtle)] shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => handleToggleMode(true)}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                isEditMode
                  ? 'bg-[#026fc3] text-white shadow-xs font-black'
                  : 'text-theme-primary hover:bg-current/10'
              }`}
              title="Full In-Place Editor Mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode(false)}
              className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                !isEditMode
                  ? 'bg-white/90 dark:bg-stone-800 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-theme-primary hover:bg-current/10'
              }`}
              title="Interactive Student Preview Mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {/* Click-to-Edit Course Title */}
          <div className="hidden md:flex items-center gap-1.5 pl-1 max-w-[200px] lg:max-w-xs shrink-0">
            {isEditingCourseTitle ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempCourseTitle}
                  onChange={e => setTempCourseTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveCourseTitle();
                    if (e.key === 'Escape') {
                      setIsEditingCourseTitle(false);
                      setTempCourseTitle(course.title);
                    }
                  }}
                  onBlur={handleSaveCourseTitle}
                  autoFocus
                  className="px-2 py-0.5 text-xs font-bold rounded border border-[#026fc3] bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleSaveCourseTitle}
                  className="p-1 rounded bg-[#026fc3] text-white"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  if (isEditMode) {
                    setIsEditingCourseTitle(true);
                    setTempCourseTitle(course.title);
                  }
                }}
                className={`flex items-center gap-1.5 truncate group ${
                  isEditMode ? 'cursor-pointer hover:text-[#026fc3]' : ''
                }`}
                title={isEditMode ? 'Click to rename course' : course.title}
              >
                <span className="text-xs font-black truncate">{course.title}</span>
                {isEditMode && (
                  <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#026fc3] shrink-0" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Save Status & Teacher Assistant Actions (In Edit Mode) or Student View Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isEditMode ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Saving status dot */}
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300 border border-stone-200/60 flex items-center gap-1.5 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    savingStatus === 'saving'
                      ? 'bg-amber-400 animate-ping'
                      : savingStatus === 'unsaved'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="capitalize hidden xs:inline">{savingStatus}</span>
              </span>

              {/* Explicit Manual Save Button */}
              <LiquidButton
                variant="secondary"
                size="sm"
                onClick={handleManualSave}
                icon={<Save className="w-3.5 h-3.5 text-[#026fc3]" />}
                title="Save lesson immediately"
                className="!px-2.5 !py-1 !text-xs shrink-0"
              >
                <span className="hidden sm:inline">Save</span>
              </LiquidButton>

              {/* AI Assistant Modal Trigger */}
              <LiquidButton
                variant="primary"
                size="sm"
                onClick={() => setAiAssistantOpen(true)}
                icon={<Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />}
                className="hidden md:inline-flex !px-2.5 !py-1 !text-xs shrink-0"
              >
                ✨ AI Assistant
              </LiquidButton>

              {/* Question Planner Modal Trigger */}
              <LiquidButton
                variant="secondary"
                size="sm"
                onClick={() => setQuestionPlanModalOpen(true)}
                icon={<HelpCircle className="w-3.5 h-3.5 text-indigo-500" />}
                title="Question Planner & JSON Import"
                className="hidden lg:inline-flex !px-2.5 !py-1 !text-xs shrink-0"
              >
                Plan Questions
              </LiquidButton>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <LiquidButton
                variant={viewMode === 'roadmap' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setViewMode(viewMode === 'lesson' ? 'roadmap' : 'lesson')}
                icon={<Map className="w-3.5 h-3.5" />}
                title="Toggle Course Roadmap"
                className="!px-2.5 !py-1 !text-xs shrink-0"
              >
                <span>{viewMode === 'roadmap' ? 'Read Lesson' : 'Roadmap'}</span>
              </LiquidButton>
            </div>
          )}
        </div>

        {/* Right: Publish (in Edit Mode), Reading %, Font Size, Theme Popover */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {isEditMode && (
            <LiquidButton
              variant="emerald"
              size="sm"
              onClick={() => setPublishModalOpen(true)}
              icon={<Send className="w-3.5 h-3.5" />}
              title="Publish course & assign to classrooms"
              className="!px-3 !py-1 !text-xs font-bold shrink-0"
            >
              <span>Publish</span>
            </LiquidButton>
          )}

          {/* Reading % Badge */}
          <span className="text-[11px] font-mono font-bold opacity-80 px-1 py-0.5 text-theme-primary shrink-0">
            {viewMode === 'roadmap' ? `${roadmapData?.progressPercent || 0}%` : `${scrollProgress}%`}
          </span>

          {/* Font Size A- / A+ in Preview mode */}
          {!isEditMode && viewMode === 'lesson' && (
            <div className="hidden sm:flex items-center gap-0.5 shrink-0">
              <LiquidButton
                variant="tertiary"
                size="sm"
                onClick={handleScaleDown}
                disabled={textScale === 'sm'}
                title="Decrease Font Size"
                className="!px-1.5 !py-0.5 !text-xs"
              >
                A−
              </LiquidButton>
              <LiquidButton
                variant="tertiary"
                size="sm"
                onClick={handleScaleUp}
                disabled={textScale === 'xxl'}
                title="Increase Font Size"
                className="!px-1.5 !py-0.5 !text-xs"
              >
                A+
              </LiquidButton>
            </div>
          )}

          {/* Theme Presets Popover */}
          <ThemeSelectorPopover activeThemeId={themeId} onSelectTheme={handleThemeChange} />

          {/* Bookmark Toggle */}
          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
              isBookmarked ? 'text-theme-accent' : 'text-theme-muted hover:text-theme-primary'
            }`}
            title="Bookmark this page"
          >
            <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </header>

      {/* Non-blocking Toast Notification */}
      {toastMessage && (
        <div className="bg-[#026fc3] text-white px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md z-30 animate-in fade-in duration-150 reader-meta shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="font-bold px-2 py-0.5 cursor-pointer hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. TWO-COLUMN LAYOUT: COURSE OUTLINE SIDEBAR (DESKTOP) + MAIN VIEWPORT */}
      <div className="flex-1 w-full flex overflow-hidden">
        {/* DESKTOP COURSE OUTLINE SIDEBAR (lg:flex) */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 border-r border-[var(--theme-border-subtle)] bg-[var(--theme-surface-subtle)]/30 h-full overflow-hidden">
          {renderCourseOutline(false)}
        </aside>

        {/* MAIN SCROLLABLE LEARNING & EDITING VIEWPORT */}
        <main
          ref={mainScrollRef}
          onScroll={handleScroll}
          className="flex-1 h-full overflow-y-auto px-3 sm:px-6 md:px-8 py-5 sm:py-8 md:py-10 scroll-smooth box-border"
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
              activeLessonId={selectedEpisode?.id || ''}
            />
          ) : !selectedEpisode ? (
            <div className="max-w-[760px] mx-auto text-center py-16 space-y-4">
              <BookOpen className="w-12 h-12 text-[#026fc3] mx-auto opacity-40" />
              <h2 className="text-xl font-bold">No lesson selected</h2>
              <p className="text-xs opacity-75">
                Select a lesson from the outline or add a new lesson to start editing.
              </p>
              {isEditMode && (course.units || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => handleAddEpisode(course.units![0].id)}
                  className="px-4 py-2 bg-[#026fc3] text-white text-xs font-bold rounded-xl"
                >
                  + Add First Lesson
                </button>
              )}
            </div>
          ) : (
            <article className="w-full max-w-[760px] mx-auto space-y-6 sm:space-y-10 box-border overflow-x-hidden">
              {/* EDITORIAL LESSON HEADER */}
              <header className="w-full space-y-2 sm:space-y-3 pb-4 sm:pb-6 border-b border-current/15 text-left">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#026fc3] reader-meta">
                  <span>
                    LESSON {String(selectedEpisode.position || currentInfo?.epIndex || 1).padStart(2, '0')}
                  </span>
                  <span className="opacity-40">•</span>
                  <span className="opacity-80 text-current">{currentInfo?.unitTitle || 'Unit 1'}</span>
                  <span className="opacity-40">•</span>
                  <span className="opacity-80 text-current flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#026fc3]" />
                    {isEditMode ? (
                      <span className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={currentEpisodeMins}
                          onChange={e => handleUpdateEpisodeMins(parseInt(e.target.value, 10) || 15)}
                          className="w-12 px-1 py-0.5 text-xs font-bold rounded border border-stone-300 bg-white text-slate-800"
                        />
                        <span>mins</span>
                      </span>
                    ) : (
                      <span>{selectedEpisode.estimated_minutes || 15} min read</span>
                    )}
                  </span>
                  {isEpisodeCompleted && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                    </span>
                  )}
                </div>

                {isEditMode ? (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={currentEpisodeTitle}
                      onChange={e => handleUpdateEpisodeTitle(e.target.value)}
                      placeholder="Lesson Title"
                      className="w-full text-2xl sm:text-3xl font-black tracking-tight text-inherit bg-transparent border-b-2 border-dashed border-[#026fc3]/40 focus:border-[#026fc3] focus:outline-none pb-1"
                    />
                    <p className="text-[11px] text-slate-400 font-sans">
                      Click to edit lesson title directly. Changes autosave to course curriculum.
                    </p>
                  </div>
                ) : (
                  <h1 className="font-extrabold tracking-tight text-inherit leading-[1.15] text-left reader-title">
                    {selectedEpisode.title}
                  </h1>
                )}

                {course.short_description && (
                  <p className="text-base sm:text-lg opacity-75 font-serif italic text-left max-w-xl reader-quote">
                    “{course.short_description}”
                  </p>
                )}
              </header>

              {/* UNIFIED CONTENT ENGINE (ONE ENGINE FOR BOTH EDIT & STUDENT MODES) */}
              <CourseContentRenderer
                blocks={currentBlocks}
                questions={currentQuestions}
                mode={isEditMode ? 'edit' : 'student'}
                isStudentView={!isEditMode}
                textScale={textScale}
                onCompleteLesson={handleCompleteEpisode}
                onChangeBlocks={handleBlocksChange}
                onChangeQuestions={handleQuestionsChange}
                onOpenAiAssistant={() => setAiAssistantOpen(true)}
                onOpenAddQuestions={() => setAddQuestionsModalOpen(true)}
                themeId={themeId}
              />

              {/* MINIMAL EDITORIAL LESSON FOOTER */}
              <footer className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 sm:pt-12 mt-8 sm:mt-12 border-t border-current/15">
                <button
                  type="button"
                  onClick={() => setViewMode('roadmap')}
                  className="text-xs font-bold text-[#026fc3] hover:underline flex items-center gap-1 cursor-pointer"
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
      </div>

      {/* 4. SLIDE-OVER TABLE OF CONTENTS DRAWER (FOR MOBILE & TABLET) */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setShowDrawer(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <div
            className={`relative w-80 max-w-[85vw] h-full ${activeTheme.bgGradient} ${activeTheme.text} border-r ${activeTheme.cardBorder} flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200 box-border`}
          >
            {renderCourseOutline(true)}
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
        pointsEarned={lastCompletedPoints}
        progressPercent={roadmapData?.progressPercent || 0}
        completedLessonsCount={roadmapData?.completedLessons || 1}
        totalLessonsCount={roadmapData?.totalLessons || 1}
        dailyReleaseEnabled={Boolean(course.daily_release_enabled)}
        onContinue={handleAfterCelebrationContinue}
      />

      {/* 6. IN-PREVIEW AI LESSON ASSISTANT MODAL */}
      <AILessonAssistantModal
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        courseTitle={course.title}
        unitTitle={currentInfo?.unitTitle || 'Unit 1'}
        lessonTitle={currentEpisodeTitle}
        currentLessonText={currentBlocks.map((b: any) => b.content?.text || '').join('\n\n')}
        onApplyBlocks={handleBlocksChange}
        onApplyQuestions={handleQuestionsChange}
      />

      {/* 7. QUESTION PLANNER & AI SCHEMA GENERATOR MODAL */}
      {selectedEpisode && course && (
        <QuestionPlanModal
          isOpen={questionPlanModalOpen}
          onClose={() => setQuestionPlanModalOpen(false)}
          courseTitle={course.title}
          unitTitle={currentInfo?.unitTitle || 'Unit 1'}
          episodeTitle={currentEpisodeTitle || selectedEpisode.title || 'Lesson'}
          episodeId={selectedEpisode.id}
          courseId={course.id}
          lessonText={currentBlocks.map((b: any) => b.content?.text || '').join('\n\n')}
          hasVideo={currentBlocks.some((b: any) => b.block_type === 'video')}
          hasImage={currentBlocks.some((b: any) => b.block_type === 'image')}
          onImportQuestions={imported => {
            const next = [...currentQuestions, ...imported];
            handleQuestionsChange(next);
            setQuestionPlanModalOpen(false);
          }}
        />
      )}

      {/* 8. QUICK ADD QUESTIONS MODAL */}
      {selectedEpisode && course && (
        <AddQuestionsModal
          isOpen={addQuestionsModalOpen}
          onClose={() => setAddQuestionsModalOpen(false)}
          courseTitle={course.title}
          unitTitle={course.units?.find(u => u.episodes?.some(e => e.id === selectedEpisode.id))?.title || 'Unit'}
          episodeTitle={currentEpisodeTitle || selectedEpisode.title || 'Lesson'}
          episodeId={selectedEpisode.id}
          courseId={course.id}
          lessonText={currentBlocks.map((b: any) => b.content?.text || '').join('\n\n')}
          onImportQuestions={imported => {
            const next = [...currentQuestions, ...imported];
            handleQuestionsChange(next);
          }}
        />
      )}

      {/* 9. COURSE PUBLISH & ASSIGN MODAL */}
      <CoursePublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        course={course}
        onSuccess={() => {
          setPublishModalOpen(false);
          setCourse(prev => (prev ? { ...prev, status: 'published' } : null));
          showToast('Course published and assigned!');
        }}
      />
    </div>
  );
};
