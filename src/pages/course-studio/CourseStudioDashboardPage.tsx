// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: TEACHER COURSE STUDIO DASHBOARD
// Centralized Teacher Course Library & Delivery Management Command Center.
// "Create once. Teach across classrooms. Track every learner."
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';
import { Course } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { useAuth } from '@/context/AuthContext';
import { CreateCourseModal } from '@/components/course-studio/CreateCourseModal';
import { CoursePublishModal } from '@/components/course-studio/CoursePublishModal';
import { AICourseDesignerModal } from '@/components/course-studio/AICourseDesignerModal';
import { BotanicalPaperCutFrame } from '@/components/classes/ClassroomIllustrations';
import { LiquidButton, LiquidTab } from '@/components/course-studio/liquid';

export const CourseStudioDashboardPage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'published' | 'draft'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [publishTargetCourse, setPublishTargetCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadCourses();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await courseStudioService.getCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load studio courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (course: Course) => {
    navigate(`/course-studio/${course.id}`);
  };

  const handleDuplicate = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    try {
      await courseStudioService.duplicateCourse(courseId);
      loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate course.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
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
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.grade_level.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filterTab === 'published') return c.status === 'published';
    if (filterTab === 'draft') return c.status === 'draft';
    return true;
  });

  const totalPublished = courses.filter(c => c.status === 'published').length;
  const totalAssignedClassrooms = courses.reduce((s, c) => s + (c.assigned_classrooms_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#f9f7f1] font-sans antialiased text-slate-800 py-6 sm:py-8 relative overflow-x-hidden">
      <BotanicalPaperCutFrame />

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
                <span>EdTechra Course Studio</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Create Once. <span className="text-[#fbbf24]">Teach Across Classrooms.</span>
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
                <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">Classroom Links</p>
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
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[28px] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-sky-200/60 dark:border-slate-800 shadow-sm">
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
                count={courses.length - totalPublished}
                isActive={filterTab === 'draft'}
                onClick={() => setFilterTab('draft')}
              />
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
          {/* COURSE CARDS GRID                                                     */}
          {/* ===================================================================== */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-white rounded-[24px] border border-stone-200/70 animate-pulse p-6 space-y-4 shadow-xs">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-2/3" />
                  <div className="h-20 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="bg-white rounded-[28px] p-10 sm:p-14 text-center border border-stone-200/70 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs border border-sky-100">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {search ? 'No courses match your search' : 'No courses created yet in Studio'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                  {search
                    ? 'Try searching for a different subject or grade keyword.'
                    : 'Create your first digital course with AI lessons, interactive practice, and deliver it across your classrooms.'}
                </p>
              </div>
              <div className="pt-2">
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

                return (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/course-studio/${course.id}`)}
                    className="bg-white rounded-[28px] border border-stone-200/80 shadow-xs hover:shadow-xl hover:border-sky-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group h-full"
                  >
                    {/* Dominant Hero Image Container (45–55% height, full width) */}
                    <div className="relative w-full h-52 sm:h-56 bg-slate-950 overflow-hidden shrink-0 select-none">
                      {course.cover_image_url ? (
                        <img
                          src={course.cover_image_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-[#06182c] via-[#026fc3] to-[#7c3aed] overflow-hidden">
                          {/* Ambient background lighting */}
                          <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />
                          <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                          <div className="relative flex flex-col items-center justify-center text-center p-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner mb-2 group-hover:scale-110 transition-transform duration-300">
                              <BookOpen className="w-7 h-7 text-sky-200" />
                            </div>
                            <span className="text-xs font-black text-white/90 tracking-wide uppercase">
                              {course.subject || 'Interactive Course'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Vignette Overlay for Crisp Contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent pointer-events-none" />

                      {/* Top Overlays: Aspect ratio & Status Badge */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
                        <div>
                          {course.cover_aspect_ratio === '1:1' && (
                            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20 shadow-xs">
                              1:1 Square
                            </span>
                          )}
                        </div>
                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md border ${
                              isPublished
                                ? 'bg-emerald-500/90 text-white border-emerald-300/40 shadow-emerald-500/20'
                                : 'bg-slate-900/80 text-slate-300 border-white/15'
                            }`}
                          >
                            {isPublished ? '● Published' : '○ Draft'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Overlays: Subject & Grade Pills */}
                      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center gap-1.5 flex-wrap pointer-events-none">
                        <span className="px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 shadow-xs flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-sky-400" />
                          {course.subject || 'General'}
                        </span>
                        {course.grade_level && (
                          <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold border border-white/25 shadow-xs">
                            {course.grade_level}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3.5">
                      {/* Title & Description */}
                      <div className="space-y-1.5">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-[#026fc3] transition-colors leading-snug line-clamp-2 min-h-[2.5rem]">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed min-h-[2rem]">
                          {course.short_description || 'Build interactive lessons and activities.'}
                        </p>
                      </div>

                      {/* Stats & Actions Container */}
                      <div className="space-y-3.5 pt-1">
                        {/* 3-Column Compact Stats */}
                        <div className="grid grid-cols-3 py-2 px-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                          <div>
                            <p className="text-xs font-black text-slate-900">{course.units_count || 1}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Units</p>
                          </div>
                          <div className="border-x border-slate-200/70">
                            <p className="text-xs font-black text-slate-900">{course.episodes_count || 1}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lessons</p>
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#026fc3]">{course.assigned_classrooms_count || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Classes</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Duplicate Course"
                              onClick={e => handleDuplicate(e, course.id)}
                              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete Course"
                              onClick={e => handleDelete(e, course.id)}
                              className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {isPublished && (
                              <button
                                type="button"
                                title="Course Analytics"
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/course-studio/${course.id}/analytics`);
                                }}
                                className="p-2 rounded-xl hover:bg-sky-50 text-[#026fc3] transition-all cursor-pointer"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <LiquidButton
                              variant={isPublished ? 'secondary' : 'emerald'}
                              size="sm"
                              className="!px-3 !py-1.5 !text-[11px] !min-h-[32px]"
                              icon={<Send className="w-3 h-3" />}
                              onClick={e => {
                                e.stopPropagation();
                                setPublishTargetCourse(course);
                              }}
                            >
                              {isPublished ? 'Assign' : 'Publish'}
                            </LiquidButton>

                            <LiquidButton
                              variant="primary"
                              size="sm"
                              className="!px-3 !py-1.5 !text-[11px] !min-h-[32px]"
                              iconRight={<ArrowRight className="w-3 h-3" />}
                              onClick={e => {
                                e.stopPropagation();
                                navigate(`/course-studio/${course.id}`);
                              }}
                            >
                              Open
                            </LiquidButton>
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
          onClose={() => setPublishTargetCourse(null)}
          onSuccess={() => {
            loadCourses();
            setPublishTargetCourse(null);
          }}
        />
      )}

    </div>
  );
};
