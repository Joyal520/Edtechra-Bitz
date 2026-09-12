import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Users,
  Search,
  Sparkles,
  Layers,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Archive,
  LayoutGrid,
  List,
  ChevronDown,
  Lightbulb,
  Sparkle
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
  const [activeTab, setActiveTab] = useState<'all' | 'teaching' | 'enrolled' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Distinct subjects and grades for dropdown filters
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    classrooms.forEach((c) => {
      if (c.grade && c.grade.trim()) grades.add(c.grade.trim());
    });
    return Array.from(grades).sort();
  }, [classrooms]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    classrooms.forEach((c) => {
      if (c.subject && c.subject.trim()) subjects.add(c.subject.trim());
    });
    return Array.from(subjects).sort();
  }, [classrooms]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const nonArchived = classrooms.filter((c) => !c.is_archived);
    return {
      all: nonArchived.length,
      teaching: nonArchived.filter((c) => c.user_role === 'teacher').length,
      enrolled: nonArchived.filter((c) => c.user_role === 'student').length,
      archived: classrooms.filter((c) => c.is_archived).length
    };
  }, [classrooms]);

  // Filtered list
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((c) => {
      // Tab filter
      if (activeTab === 'archived') {
        if (!c.is_archived) return false;
      } else {
        if (c.is_archived) return false;
        if (activeTab === 'teaching' && c.user_role !== 'teacher') return false;
        if (activeTab === 'enrolled' && c.user_role !== 'student') return false;
      }

      // Grade dropdown filter
      if (selectedGrade !== 'all' && c.grade !== selectedGrade) {
        return false;
      }

      // Subject dropdown filter
      if (selectedSubject !== 'all' && c.subject !== selectedSubject) {
        return false;
      }

      // Search text
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(query);
        const matchesSubject = (c.subject || '').toLowerCase().includes(query);
        const matchesGrade = (c.grade || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesSubject && !matchesGrade) return false;
      }

      return true;
    });
  }, [classrooms, activeTab, selectedGrade, selectedSubject, search]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-800 py-4 sm:py-6 relative overflow-x-hidden">
      {/* MAIN DIGITAL CLASSROOM WORKSPACE CONTAINER */}
      <main className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 relative z-10">
        
        {/* ========================================================================= */}
        {/* 1. COMPACT HERO SECTION — STRICTLY MATCHING REFERENCE DESIGN             */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-r from-sky-50/80 via-white to-sky-50/60 rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 border border-sky-100/90 shadow-2xs relative overflow-hidden">
          
          {/* Subtle ambient light gradient */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
            
            {/* LEFT: Hero Headline, Subtitles & Quick Action Buttons (7 cols) */}
            <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
              
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide">
                  Welcome to
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  EdTechra <span className="text-[#026fc3]">Digital Classroom</span>
                </h1>
              </div>

              {/* Supporting Subtitle & Description */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-slate-600 tracking-wide">
                  Learn &bull; Collaborate &bull; Create &bull; Grow
                </p>
                <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
                  Your space for assignments, resources, discussions and more.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 sm:px-5 sm:py-2.5 bg-[#026fc3] hover:bg-[#025ca5] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Classroom</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenJoin}
                  className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 sm:px-5 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-bold border border-slate-200/90 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Users className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                  <span>Join Class</span>
                </button>
              </div>

            </div>

            {/* RIGHT: Compact Educational Illustration & Quote (5 cols) */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-center justify-center lg:items-end gap-3">
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[340px] aspect-[4/3] rounded-2xl overflow-hidden shadow-xs border border-sky-100/80 bg-white">
                <img
                  src="/images/classroom/classroom-hero-student.jpg"
                  alt="EdTechra Digital Classroom"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to SVG/CSS illustration if image not available
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-black text-sky-700 shadow-2xs border border-sky-100">
                  ✨ Better Learning, Brighter Tomorrow
                </div>
              </div>

              <div className="text-right text-[11px] sm:text-xs text-slate-500 italic font-medium">
                &ldquo;Small steps today, big skills tomorrow.&rdquo;
              </div>
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* 2. COMPACT STATISTIC PANELS (4 Horizontally Aligned Cards)                */}
        {/* ========================================================================= */}
        <ClassroomStats stats={stats} />

        {/* ========================================================================= */}
        {/* TEACHER COURSE STUDIO COMMAND CENTER (Preserved functionality)            */}
        {/* ========================================================================= */}
        {isTeacher && (
          <section className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-[#026fc3] text-[10px] font-black uppercase tracking-wider border border-sky-100">
                  <Sparkles className="w-3 h-3" />
                  <span>Teacher Studio</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Course Studio
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Create once. Teach across classrooms. Track every learner.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCreateCourseModalOpen(true)}
                  className="px-3.5 py-2 bg-[#026fc3] hover:bg-[#025ca5] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Course</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/course-studio')}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open Studio ({studioCourses.length})</span>
                </button>
              </div>
            </div>

            {studioCourses.length === 0 ? (
              <div className="bg-slate-50/70 rounded-xl p-4 text-center space-y-2 border border-slate-200/60">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">No Digital Courses Built Yet</h4>
                  <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto">
                    Build interactive courses with AI lesson generation and deliver them across all your classrooms.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {studioCourses.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/course-studio/${c.id}`)}
                    className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-sky-50/40 border border-slate-200/80 hover:border-sky-300 transition-all cursor-pointer space-y-2.5 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#026fc3] text-[10px] font-black">
                          {c.subject}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            c.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-[#026fc3] transition-colors mt-1.5 line-clamp-1">
                        {c.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5">
                        {c.short_description || 'Click to edit and manage lessons.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-500 font-bold">
                        {c.assigned_classrooms_count || 0} classes &bull; {c.units_count || 1} units
                      </span>
                      <span className="text-[#026fc3] font-black flex items-center gap-0.5 text-[10px]">
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
        {/* 3. CLASS FILTER / SEARCH TOOLBAR & CLASSROOMS GRID                        */}
        {/* ========================================================================= */}
        <section className="space-y-4 sm:space-y-5">
          
          {/* Compact Toolbar containing Tabs on Left and Search/Filters/View on Right */}
          <div className="bg-white rounded-2xl p-2 sm:p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-slate-200/80 shadow-2xs">
            
            {/* Left Tabs: All Classes | Teaching | Enrolled | Archived */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-[#026fc3] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                All Classes ({tabCounts.all})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('teaching')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'teaching'
                    ? 'bg-[#026fc3] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Teaching</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('enrolled')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'enrolled'
                    ? 'bg-[#026fc3] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Enrolled</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'archived'
                    ? 'bg-[#026fc3] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archived ({tabCounts.archived})</span>
              </button>
            </div>

            {/* Right Controls: Search | Grade Filter | Subject Filter | View Toggle */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-48 lg:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search classes..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* Grade Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white cursor-pointer shadow-2xs"
                >
                  <option value="all">Grade: All</option>
                  {uniqueGrades.map((g) => (
                    <option key={g} value={g}>
                      {g.toLowerCase().includes('grade') ? g : `Grade ${g}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Subject Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:bg-white cursor-pointer shadow-2xs"
                >
                  <option value="all">Subject: All</option>
                  {uniqueSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Grid / List View Toggle */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#026fc3] text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="List view"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[#026fc3] text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

          </div>

          {/* Classes Cards Grid or List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 bg-white rounded-2xl border border-slate-200/80 animate-pulse overflow-hidden shadow-2xs">
                  <div className="h-36 bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-2/3" />
                    <div className="h-10 bg-slate-100 rounded" />
                    <div className="h-6 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredClassrooms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-2xs space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-2xs border border-sky-100">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {search
                    ? 'No classrooms match your search'
                    : isTeacher
                      ? 'Welcome, Teacher! Create Your First Class'
                      : 'No classrooms joined yet'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                  {search
                    ? 'Try searching for a different subject or title.'
                    : isTeacher
                      ? 'Set up a digital classroom for your students to share assignments, launch live quizzes, and learn together.'
                      : 'Join a classroom with your teacher’s code to start completing assignments and practicing quizzes.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ca5] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Classroom</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenJoin}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-slate-200/80"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Join Class with Code</span>
                </button>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col space-y-3">
              {filteredClassrooms.map((c) => (
                <ClassroomCard key={c.id} classroom={c} viewMode="list" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Active Classroom Cards */}
              {filteredClassrooms.map((c) => (
                <ClassroomCard key={c.id} classroom={c} viewMode="grid" />
              ))}

              {/* Create Classroom Card (Matching reference mockup item 2) */}
              {isTeacher && (activeTab === 'all' || activeTab === 'teaching') && (
                <div
                  onClick={handleOpenCreate}
                  className="min-h-[290px] rounded-2xl border-2 border-dashed border-sky-200 hover:border-[#026fc3] bg-white/80 hover:bg-sky-50/40 p-6 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs"
                >
                  <div className="w-12 h-12 rounded-full bg-[#026fc3] group-hover:bg-[#025ca5] text-white flex items-center justify-center shadow-xs mb-3.5 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-[#026fc3] transition-colors">
                    Create a New Classroom
                  </h3>
                  <p className="text-xs text-slate-500 font-medium max-w-[210px] mt-1 leading-relaxed">
                    Start your own class, invite students and begin learning together.
                  </p>
                </div>
              )}

              {/* Informational Card (Matching reference mockup item 3) */}
              {filteredClassrooms.length <= 2 && (
                <div className="min-h-[290px] rounded-2xl border border-slate-200/80 bg-white/70 p-6 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#026fc3] flex items-center justify-center mb-1 border border-sky-100">
                    <BookOpen className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    More classes coming soon!
                  </h3>
                  <p className="text-xs text-slate-500 font-medium max-w-[210px] leading-relaxed">
                    Join a class using a code or ask your teacher to invite you.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenJoin}
                    className="mt-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Join with Code
                  </button>
                </div>
              )}

            </div>
          )}

        </section>

        {/* ========================================================================= */}
        {/* BOTTOM BRAND FOOTER & MOTIVATIONAL CALLOUT                                */}
        {/* ========================================================================= */}
        <section className="pt-2 pb-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#026fc3] flex items-center justify-center text-white">
              <Sparkle className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-bold text-slate-700">EdTechra</span>
            <span>&bull;</span>
            <span>Learn. Discover. Grow.</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Clean design. More learning. A better tomorrow.</span>
          </div>

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
