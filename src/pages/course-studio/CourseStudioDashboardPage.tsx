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
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login', { type: 'action', action: 'create_course' });
                      return;
                    }
                    setAiModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-lg border border-sky-300/30 active:scale-95 transition-all cursor-pointer ring-2 ring-sky-400/30"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>✨ Create with AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      openAuthModal('login', { type: 'action', action: 'create_course' });
                      return;
                    }
                    setCreateModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-2xl text-xs font-black shadow-lg border border-emerald-400/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Manually</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/classes')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0a3a6b] hover:bg-[#082e56] text-sky-100 rounded-2xl text-xs font-black border border-sky-400/30 active:scale-95 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-sky-300" />
                  <span>My Classrooms</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Pill Panel */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1">
                <p className="text-2xl font-black text-white">{courses.length}</p>
                <p className="text-[11px] font-bold text-sky-200 uppercase tracking-wider">Total Courses</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1">
                <p className="text-2xl font-black text-emerald-400">{totalPublished}</p>
                <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">Published</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1">
                <p className="text-2xl font-black text-[#fbbf24]">{totalAssignedClassrooms}</p>
                <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">Classroom Links</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center space-y-1">
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
          <div className="bg-[#f4efe6] rounded-[24px] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-200/70 shadow-xs">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 text-xs font-extrabold text-slate-600 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-[#dbeafe] text-[#026fc3] font-black border border-sky-200 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                All Courses ({courses.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('published')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  filterTab === 'published'
                    ? 'bg-[#dbeafe] text-[#026fc3] font-black border border-sky-200 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Published ({totalPublished})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('draft')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  filterTab === 'draft'
                    ? 'bg-[#dbeafe] text-[#026fc3] font-black border border-sky-200 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Drafts ({courses.length - totalPublished})
              </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => {
                const isPublished = course.status === 'published';

                return (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/course-studio/${course.id}`)}
                    className="bg-white rounded-[24px] border border-stone-200/80 shadow-xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Cover / Header */}
                    <div>
                      {course.cover_image_url ? (
                        <div className={`relative w-full bg-slate-900 overflow-hidden ${
                          course.cover_aspect_ratio === '1:1' ? 'aspect-square max-h-56' : 'h-36'
                        }`}>
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute top-3 left-3">
                            {course.cover_aspect_ratio === '1:1' && (
                              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider border border-white/20">
                                1:1 Square
                              </span>
                            )}
                          </div>
                          <div className="absolute top-3 right-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPublished
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-800/80 text-slate-300 border border-slate-600'
                              }`}
                            >
                              {isPublished ? 'Published' : 'Draft'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 pb-0 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-[#026fc3] text-[11px] font-black border border-sky-100">
                              {course.subject}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-slate-600 text-[11px] font-bold">
                              {course.grade_level}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPublished
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-100 text-slate-600 border border-stone-200'
                            }`}
                          >
                            {isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      )}

                      {/* Title & Description */}
                      <div className="p-5 space-y-2">
                        <h3 className="text-base font-black text-slate-900 group-hover:text-[#026fc3] transition-colors leading-snug line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                          {course.short_description || 'No description provided. Click to open course editor and build content.'}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Counters & Action Footer */}
                    <div className="p-5 pt-0 space-y-4">
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-stone-100 text-center">
                        <div>
                          <p className="text-xs font-black text-slate-900">{course.units_count || 1}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Units</p>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{course.episodes_count || 1}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Lessons</p>
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#026fc3]">
                            {course.assigned_classrooms_count || 0}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Classes</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Duplicate Course"
                            onClick={e => handleDuplicate(e, course.id)}
                            className="p-2 rounded-xl hover:bg-stone-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
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
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setPublishTargetCourse(course);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-black border border-emerald-200 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>{isPublished ? 'Assign' : 'Publish'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/course-studio/${course.id}`)}
                            className="px-3 py-1.5 rounded-xl bg-[#026fc3] hover:bg-[#03589e] text-white text-[11px] font-black shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
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
