// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: TEACHER COURSE STUDIO DASHBOARD
// Centralized Teacher Course Library & Delivery Management Command Center.
// "Create once. Teach across classrooms. Track every learner."
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Search,
  BookOpen,
  Send,
  BarChart3,
  Copy,
  Trash2,
  GraduationCap,
  ArrowRight,
  Eye,
  Camera,
  MoreVertical,
  Clock,
  Pause,
  Play,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Course } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { useAuth } from '@/context/AuthContext';
import { CreateCourseModal } from '@/components/course-studio/CreateCourseModal';
import { CoursePublishModal } from '@/components/course-studio/CoursePublishModal';
import { CourseCoverModal } from '@/components/course-studio/CourseCoverModal';
import { AICourseDesignerModal } from '@/components/course-studio/AICourseDesignerModal';
import { CourseStudioWorkspaceBackground } from '@/components/course-studio/CourseStudioWorkspaceBackground';
import { LiquidButton, LiquidTab } from '@/components/course-studio/liquid';
import { CourseCoverImage, getCourseSubjectIdentity } from '@/utils/courseCover';

export const CourseStudioDashboardPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialClassroomId = searchParams.get('classroomId') || undefined;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'published' | 'draft' | 'unassigned'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [publishTargetCourse, setPublishTargetCourse] = useState<Course | null>(null);
  const [coverTargetCourse, setCoverTargetCourse] = useState<Course | null>(null);
  const [activeMenuCourseId, setActiveMenuCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadCourses();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadCourses = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await courseStudioService.getCourses();
      setCourses(data);
    } catch (err: any) {
      console.error('Failed to load studio courses:', err);
      setLoadError(err?.message || 'Unable to load courses from Course Studio.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (course: Course) => {
    navigate(`/course-studio/${course.id}`);
  };

  const handleDuplicate = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setActiveMenuCourseId(null);
    try {
      await courseStudioService.duplicateCourse(courseId);
      loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate course.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setActiveMenuCourseId(null);
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    try {
      await courseStudioService.deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete course.');
    }
  };

  const filteredCourses = courses.filter(c => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (c.title || '').toLowerCase().includes(q) ||
      (c.subject || '').toLowerCase().includes(q) ||
      (c.grade_level || '').toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (filterTab === 'published') return c.status === 'published';
    if (filterTab === 'draft') return c.status === 'draft';
    if (filterTab === 'unassigned') {
      return c.status === 'published' && (!c.assigned_classrooms_count || c.assigned_classrooms_count === 0);
    }
    return true;
  });

  const totalPublished = courses.filter(c => c.status === 'published').length;
  const totalDrafts = courses.filter(c => c.status === 'draft').length;
  const totalUnassigned = courses.filter(
    c => c.status === 'published' && (!c.assigned_classrooms_count || c.assigned_classrooms_count === 0)
  ).length;
  const totalAssignedClassrooms = courses.reduce((s, c) => s + (c.assigned_classrooms_count || 0), 0);

  return (
    <div
      onClick={() => setActiveMenuCourseId(null)}
      className="min-h-screen bg-[#f3f8ff] font-sans antialiased text-slate-800 py-6 sm:py-8 relative overflow-x-hidden"
    >
      {/* Course Studio Educational Background Visual */}
      <CourseStudioWorkspaceBackground />

      <main className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* ===================================================================== */}
        {/* HERO COMMAND CENTER BANNER                                            */}
        {/* ===================================================================== */}
        <section className="bg-[#0a213c] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 lg:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 text-sky-200 text-xs font-black uppercase tracking-wider border border-sky-400/30">
                <Sparkles className="w-4 h-4 text-sky-300" />
                <span>Course Studio</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Create once. <span className="text-[#fbbf24]">Teach across classrooms.</span> Track every learner.
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-2xl">
                Build rich digital lessons with AI assistance, visual R2 media, and interactive question sets. Assign your curriculum to any number of classrooms without duplicating content, and track every student’s concept mastery in real time.
              </p>

              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <LiquidButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login', { type: 'action', action: 'create_course' });
                      return;
                    }
                    setAiModalOpen(true);
                  }}
                  icon={<Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />}
                  className="shadow-xl"
                >
                  ✨ Create with AI
                </LiquidButton>

                <LiquidButton
                  variant="emerald"
                  size="lg"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login', { type: 'action', action: 'create_course' });
                      return;
                    }
                    setCreateModalOpen(true);
                  }}
                  icon={<Plus className="w-4 h-4 stroke-[3]" />}
                  className="shadow-xl"
                >
                  + Create Manually
                </LiquidButton>

                <LiquidButton
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate('/classes')}
                  icon={<GraduationCap className="w-4 h-4 text-[#026fc3]" />}
                  className="shadow-xl"
                >
                  My Classrooms
                </LiquidButton>
              </div>
            </div>

            {/* Quick Stats Pill Panel */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1 shadow-inner">
                <p className="text-2xl font-black text-white">{courses.length}</p>
                <p className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">Total Courses</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1 shadow-inner">
                <p className="text-2xl font-black text-emerald-400">{totalPublished}</p>
                <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Published</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1 shadow-inner">
                <p className="text-2xl font-black text-[#fbbf24]">{totalAssignedClassrooms}</p>
                <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">Class Links</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1 shadow-inner">
                <p className="text-2xl font-black text-sky-300">100%</p>
                <p className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">AI Studio Ready</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* FILTER & SEARCH BAR                                                   */}
        {/* ===================================================================== */}
        <section className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md rounded-[28px] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-sky-200/60 shadow-xs">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 flex-wrap">
              <LiquidTab
                label="All Courses"
                count={courses.length}
                isActive={filterTab === 'all'}
                onClick={() => setFilterTab('all')}
              />

              <LiquidTab
                label="Published"
                count={totalPublished}
                isActive={filterTab === 'published'}
                onClick={() => setFilterTab('published')}
              />

              <LiquidTab
                label="Drafts"
                count={totalDrafts}
                isActive={filterTab === 'draft'}
                onClick={() => setFilterTab('draft')}
              />

              {totalUnassigned > 0 && (
                <LiquidTab
                  label="Unassigned"
                  count={totalUnassigned}
                  isActive={filterTab === 'unassigned'}
                  onClick={() => setFilterTab('unassigned')}
                />
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, subject, grade..."
                className="w-full pl-9 pr-4 py-2 bg-white/90 border border-stone-200/80 rounded-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] shadow-2xs"
              />
            </div>
          </div>

          {/* ===================================================================== */}
          {/* PREMIUM COURSE CARDS GRID                                             */}
          {/* ===================================================================== */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-80 bg-white rounded-[26px] border border-stone-200/70 animate-pulse p-6 space-y-4 shadow-xs">
                  <div className="h-44 bg-slate-200 rounded-2xl" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-2/3" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="bg-white/95 rounded-[28px] p-10 sm:p-14 text-center border border-rose-200 shadow-xs space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs border border-rose-100">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  We couldn&apos;t load your courses
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                  Your courses are safe. The Course Studio service did not respond correctly.
                </p>
                <p className="text-[11px] text-rose-600 font-mono break-words max-w-md mx-auto">{loadError}</p>
              </div>
              <div className="pt-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadCourses();
                  }}
                  className="px-6 py-3 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-2xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="bg-white rounded-[28px] p-10 sm:p-14 text-center border border-stone-200/70 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs border border-sky-100">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {search
                    ? 'No courses match your search'
                    : courses.length > 0
                    ? 'No courses in this filter'
                    : 'No courses created yet in Studio'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                  {search
                    ? 'Try searching for a different subject or grade keyword.'
                    : 'Create your first digital course with AI lessons, interactive practice, and deliver it across your classrooms.'}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="px-6 py-3 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-2xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create First Digital Course</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {filteredCourses.map(course => {
                const isPublished = course.status === 'published';
                const assignedCount = course.assigned_classrooms_count || 0;
                const identity = getCourseSubjectIdentity(course);
                const SubjectIcon = identity.icon;
                const isMenuOpen = activeMenuCourseId === course.id;

                return (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/course-studio/${course.id}`)}
                    className="bg-white rounded-[22px] sm:rounded-[24px] border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-sky-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group h-full relative"
                  >
                    {/* Fixed 2.35:1 Landscape Banner Cover Container */}
                    <div className="relative w-full aspect-[2.35/1] overflow-hidden bg-slate-900 shrink-0 select-none">
                      <CourseCoverImage
                        course={course}
                        aspectRatio="banner"
                        imgClassName="group-hover:scale-105 transition-transform duration-500 ease-out"
                      />

                      {/* Top Badges Overlay (Matching Reference Design) */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        {/* Top-Left: White Pill Subject Badge */}
                        <span className="px-3 py-1 rounded-full bg-white/95 text-slate-800 text-[11px] font-bold shadow-xs border border-white/40 flex items-center gap-1.5">
                          <SubjectIcon className="w-3 h-3 text-[#026fc3]" />
                          <span className="truncate max-w-[120px]">
                            {course.subject || (course.grade_level ? `Grade ${course.grade_level}` : identity.badgeLabel)}
                          </span>
                        </span>

                        {/* Top-Right: Status Badge */}
                        {isPublished ? (
                          <div className="flex items-center gap-1">
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                              PUBLISHED
                            </span>
                            {course.is_paused && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-300 flex items-center gap-1">
                                <Pause className="w-2.5 h-2.5 text-amber-600" /> PAUSED
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-200/90 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-300">
                            DRAFT
                          </span>
                        )}
                      </div>

                      {/* Quick Hover Cover Actions Overlay */}
                      <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          type="button"
                          title="Change Cover Artwork"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverTargetCourse(course);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 shadow-xs cursor-pointer transition-all hover:scale-105"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Preview Course Player"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/course-studio/${course.id}/preview`);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 shadow-xs cursor-pointer transition-all hover:scale-105"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 bg-white">
                      
                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#026fc3] transition-colors leading-snug line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1 leading-relaxed">
                          {course.short_description || 'Click to edit and manage lessons.'}
                        </p>
                      </div>

                      {/* Bottom Row: Metadata & Manage Action (Matching Reference Design) */}
                      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs relative">
                        
                        {/* Left: Metadata info */}
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px] sm:text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{assignedCount} classes • {course.units_count ?? 1} units</span>
                        </div>

                        {/* Right: Manage Link & Three Dots Menu */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/course-studio/${course.id}`);
                            }}
                            className="text-xs font-bold text-[#026fc3] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Manage</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              title="Course Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuCourseId(isMenuOpen ? null : course.id);
                              }}
                              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs font-bold text-slate-700"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuCourseId(null);
                                    setPublishTargetCourse(course);
                                  }}
                                  className="w-full px-3.5 py-2 text-left hover:bg-sky-50 hover:text-[#026fc3] flex items-center gap-2 cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5 text-[#026fc3]" />
                                  <span>{isPublished ? 'Manage Classes' : 'Publish & Assign'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuCourseId(null);
                                    navigate(`/course-studio/${course.id}/preview`);
                                  }}
                                  className="w-full px-3.5 py-2 text-left hover:bg-sky-50 hover:text-[#026fc3] flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview Course</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuCourseId(null);
                                    setCoverTargetCourse(course);
                                  }}
                                  className="w-full px-3.5 py-2 text-left hover:bg-sky-50 hover:text-[#026fc3] flex items-center gap-2 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Change Cover</span>
                                </button>

                                {isPublished && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuCourseId(null);
                                        navigate(`/course-studio/${course.id}/analytics`);
                                      }}
                                      className="w-full px-3.5 py-2 text-left hover:bg-sky-50 hover:text-[#026fc3] flex items-center gap-2 cursor-pointer"
                                    >
                                      <BarChart3 className="w-3.5 h-3.5 text-[#026fc3]" />
                                      <span>Course Analytics</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveMenuCourseId(null);
                                        try {
                                          if (course.is_paused) {
                                            await courseStudioService.resumeCourse(course.id);
                                          } else {
                                            await courseStudioService.pauseCourse(course.id);
                                          }
                                          await loadCourses();
                                        } catch (err: any) {
                                          alert(err.message || 'Failed to update course pause status.');
                                        }
                                      }}
                                      className="w-full px-3.5 py-2 text-left hover:bg-amber-50 hover:text-amber-800 flex items-center gap-2 cursor-pointer"
                                    >
                                      {course.is_paused ? (
                                        <>
                                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Resume Course Access</span>
                                        </>
                                      ) : (
                                        <>
                                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Pause Course Access</span>
                                        </>
                                      )}
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => handleDuplicate(e, course.id)}
                                  className="w-full px-3.5 py-2 text-left hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Duplicate Course</span>
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(e, course.id)}
                                  className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Course</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* MODALS */}
      <AICourseDesignerModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onCourseCreated={handleCreateSuccess}
      />

      <CreateCourseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {publishTargetCourse && (
        <CoursePublishModal
          course={publishTargetCourse}
          isOpen={Boolean(publishTargetCourse)}
          initialClassroomId={initialClassroomId}
          onClose={() => setPublishTargetCourse(null)}
          onSuccess={() => {
            loadCourses();
            setPublishTargetCourse(null);
          }}
        />
      )}

      {coverTargetCourse && (
        <CourseCoverModal
          course={coverTargetCourse}
          isOpen={Boolean(coverTargetCourse)}
          onClose={() => setCoverTargetCourse(null)}
          onSuccess={(updated) => {
            setCourses(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
            setCoverTargetCourse(null);
          }}
        />
      )}

    </div>
  );
};
