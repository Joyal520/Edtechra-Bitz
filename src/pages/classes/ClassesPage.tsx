import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  KeyRound,
  Search,
  Sparkles,
  Layers,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { Classroom, ClassroomStats as IClassroomStats } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { Course } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { useAuth } from '@/context/AuthContext';
import { ClassroomCard } from '@/components/classes/ClassroomCard';
import { CreateClassroomModal } from '@/components/classes/CreateClassroomModal';
import { JoinClassroomModal } from '@/components/classes/JoinClassroomModal';
import { ClassroomStats } from '@/components/classes/ClassroomStats';
import { CreateCourseModal } from '@/components/course-studio/CreateCourseModal';
import { CoursePublishModal } from '@/components/course-studio/CoursePublishModal';
import {
  ClassroomHeroIllustration,
  BotanicalPaperCutFrame
} from '@/components/classes/ClassroomIllustrations';

export const ClassesPage: React.FC = () => {
  const { user, isTeacher, isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [studioCourses, setStudioCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<IClassroomStats>({
    total_students: 0,
    total_assignments: 0,
    total_submissions: 0,
    average_completion_percent: 0,
    average_score: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'teaching' | 'enrolled'>('all');
  const [search, setSearch] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [publishTargetCourse, setPublishTargetCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classList, statsData] = await Promise.all([
        classroomService.getClassrooms(),
        classroomService.getClassroomStats()
      ]);
      setClassrooms(classList);
      setStats(statsData);

      if (isTeacher) {
        try {
          const courseList = await courseStudioService.getCourses();
          setStudioCourses(courseList);
        } catch {
          // ignore if non-teacher or empty
        }
      }
    } catch (err) {
      console.error('Failed to load classrooms', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    if (!isAuthenticated) {
      openAuthModal('login', { type: 'action', action: 'create_classroom' });
      return;
    }
    setCreateModalOpen(true);
  };

  const handleOpenJoin = () => {
    if (!isAuthenticated) {
      openAuthModal('login', { type: 'action', action: 'join_classroom' });
      return;
    }
    setJoinModalOpen(true);
  };

  const filteredClassrooms = classrooms.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.grade.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'teaching') return c.user_role === 'teacher';
    if (activeTab === 'enrolled') return c.user_role === 'student';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f9f7f1] font-sans antialiased text-slate-800 py-6 sm:py-8 relative overflow-x-hidden">
      
      {/* 3D Botanical Cut-Paper Decorative Border Frame */}
      <BotanicalPaperCutFrame />

      {/* MAIN DIGITAL CLASSROOM WORKSPACE CONTAINER */}
      <main className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* ========================================================================= */}
        {/* HERO SECTION — INTERACTIVE DIGITAL CLASSROOMS                             */}
        {/* ========================================================================= */}
        <section className="bg-[#0a213c] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 lg:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
          
          {/* Subtle Organic Background Glow Waves */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* LEFT: Hero Content & Quick Action Buttons (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Motto Tagline Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 text-sky-200 text-xs font-black uppercase tracking-wider border border-sky-400/30">
                <GraduationCap className="w-4 h-4 text-sky-300" />
                <span>EdTechra Digital Classes</span>
              </div>

              {/* Heading */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Interactive <span className="text-[#fbbf24]">Digital Classrooms</span>
              </h1>

              {/* Supporting Text */}
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
                Collaborative spaces for teachers and students. Publish assignments, share resources, track progress, and learn together.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenJoin}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0a3a6b] hover:bg-[#082e56] text-sky-100 rounded-2xl text-xs font-black border border-sky-400/30 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <KeyRound className="w-4 h-4 text-sky-300" />
                  <span>Join Class</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-2xl text-xs font-black shadow-lg border border-emerald-400/30 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Classroom</span>
                </button>
              </div>

            </div>

            {/* RIGHT: 3D Paper-Cut Classroom Scene (5 cols) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <ClassroomHeroIllustration className="w-full max-w-[380px] sm:max-w-[420px] h-auto drop-shadow-2xl" />
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* CLASSROOM STATISTICS (4 Horizontally Aligned Pastel Paper Cards)           */}
        {/* ========================================================================= */}
        <ClassroomStats stats={stats} />

        {/* ========================================================================= */}
        {/* TEACHER COURSE STUDIO COMMAND CENTER                                      */}
        {/* ========================================================================= */}
        {isTeacher && (
          <section className="bg-white rounded-[28px] p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-[#026fc3] text-[11px] font-black uppercase tracking-wider border border-sky-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Teacher-Level Course Studio</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Course Studio
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl">
                  Create once. Teach across classrooms. Track every learner.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCreateCourseModalOpen(true)}
                  className="px-4 py-2.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create Digital Course</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/course-studio')}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Open Studio ({studioCourses.length})</span>
                </button>
              </div>
            </div>

            {/* Courses Cards Carousel / Grid */}
            {studioCourses.length === 0 ? (
              <div className="bg-[#f9f7f1] rounded-2xl p-6 text-center space-y-3 border border-stone-200/60">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">No Digital Courses Built Yet</h4>
                  <p className="text-xs text-slate-500 font-medium max-w-md mx-auto mt-0.5">
                    Build interactive multi-day courses with AI lesson generation and deliver them across all your classrooms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateCourseModalOpen(true)}
                  className="px-4 py-2 bg-[#026fc3] text-white text-xs font-black rounded-xl shadow-xs"
                >
                  + Build First Course with AI
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {studioCourses.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/course-studio/${c.id}`)}
                    className="p-4 rounded-2xl bg-stone-50/80 hover:bg-sky-50/40 border border-stone-200/80 hover:border-sky-300 transition-all cursor-pointer space-y-3 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-[#026fc3] text-[10px] font-black">
                          {c.subject}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            c.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-slate-600'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-[#026fc3] transition-colors mt-2 line-clamp-1">
                        {c.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-0.5">
                        {c.short_description || 'Click to edit and manage lessons.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 font-bold">
                        {c.assigned_classrooms_count || 0} classes • {c.units_count || 1} units
                      </span>
                      <span className="text-[#026fc3] font-black flex items-center gap-0.5 text-[11px]">
                        <span>Manage</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* CLASS FILTER / SEARCH PANEL & CLASSROOMS GRID                             */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          
          {/* Raised Paper Panel for Filter Tabs & Search */}
          <div className="bg-[#f4efe6] rounded-[24px] p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-200/70 shadow-xs">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 text-xs font-extrabold text-slate-600 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#dbeafe] text-[#026fc3] font-black border border-sky-200 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                All Classes ({classrooms.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('teaching')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'teaching'
                    ? 'bg-[#dbeafe] text-[#026fc3] font-black border border-sky-200 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Teaching
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('enrolled')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'enrolled'
                    ? 'bg-[#dbeafe] text-[#026fc3] font-black border border-sky-200 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Enrolled
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search classrooms..."
                className="w-full pl-9 pr-4 py-2 bg-white/90 border border-stone-200/80 rounded-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] shadow-2xs"
              />
            </div>

          </div>

          {/* Classes Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 bg-white rounded-[24px] border border-stone-200/70 animate-pulse p-6 space-y-4 shadow-xs">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-2/3" />
                  <div className="h-16 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredClassrooms.length === 0 ? (
            <div className="bg-white rounded-[28px] p-10 sm:p-14 text-center border border-stone-200/70 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs border border-sky-100">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {search
                    ? 'No classrooms match your search'
                    : isTeacher
                      ? 'Welcome, Teacher! Create Your First Class'
                      : 'No classrooms joined yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                  {search
                    ? 'Try searching for a different subject or teacher name.'
                    : isTeacher
                      ? 'Set up a digital classroom for your students to share assignments, launch live multiplayer quizzes, and evaluate homework with OCR.'
                      : 'Join a classroom with your teacher’s code to start completing assignments, practicing quizzes, and earning XP.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-6 py-3 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-2xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Classroom</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenJoin}
                  className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-2xl text-xs font-extrabold active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-stone-200/80"
                >
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Join Class with Code</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredClassrooms.map((c) => (
                <ClassroomCard key={c.id} classroom={c} />
              ))}
            </div>
          )}

        </section>

      </main>

      {/* ========================================================================= */}
      {/* MODALS PRESERVATION                                                       */}
      {/* ========================================================================= */}
      <CreateClassroomModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(id) => {
          loadData();
          navigate(`/classes/${id}`);
        }}
      />

      <JoinClassroomModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onSuccess={(id) => {
          loadData();
          navigate(`/classes/${id}`);
        }}
      />

      <CreateCourseModal
        isOpen={createCourseModalOpen}
        onClose={() => setCreateCourseModalOpen(false)}
        onSuccess={(c) => {
          loadData();
          navigate(`/course-studio/${c.id}`);
        }}
      />

      {publishTargetCourse && (
        <CoursePublishModal
          course={publishTargetCourse}
          isOpen={Boolean(publishTargetCourse)}
          onClose={() => setPublishTargetCourse(null)}
          onSuccess={() => {
            loadData();
            setPublishTargetCourse(null);
          }}
        />
      )}

    </div>
  );
};

