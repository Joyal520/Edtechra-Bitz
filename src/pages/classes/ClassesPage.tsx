import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  KeyRound,
  Search
} from 'lucide-react';
import { Classroom, ClassroomStats as IClassroomStats } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { useAuth } from '@/context/AuthContext';
import { ClassroomCard } from '@/components/classes/ClassroomCard';
import { CreateClassroomModal } from '@/components/classes/CreateClassroomModal';
import { JoinClassroomModal } from '@/components/classes/JoinClassroomModal';
import { ClassroomStats } from '@/components/classes/ClassroomStats';

export const ClassesPage: React.FC = () => {
  const { user, isTeacher, isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Hero Banner */}
      <div className="relative bg-gradient-to-br from-[#031528] via-[#082847] to-[#0c3f6c] text-white rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden border border-sky-500/20">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-black uppercase tracking-wider border border-sky-400/30">
              <GraduationCap className="w-4 h-4" />
              <span>EdTechra Digital Classes</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Interactive Digital Classrooms
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Collaborative spaces for teachers and students. Publish assignments, share resources, track progress, and learn together.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleOpenJoin}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-extrabold backdrop-blur-md border border-white/20 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-emerald-300" />
              <span>Join Class</span>
            </button>

            {(isTeacher || !isAuthenticated) && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-2xl text-xs font-extrabold shadow-lg active:scale-95 transition-all cursor-pointer border border-sky-400/30"
              >
                <Plus className="w-4 h-4" />
                <span>Create Classroom</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Classroom Stats Overview (When logged in) */}
      {isAuthenticated && isTeacher && classrooms.length > 0 && (
        <ClassroomStats stats={stats} />
      )}

      {/* Classrooms Grid & Filter Bar */}
      <div className="space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-extrabold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              All Classes ({classrooms.length})
            </button>
            {isTeacher && (
              <button
                type="button"
                onClick={() => setActiveTab('teaching')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'teaching'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'hover:text-slate-900'
                }`}
              >
                Teaching
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('enrolled')}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeTab === 'enrolled'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'hover:text-slate-900'
              }`}
            >
              Enrolled
            </button>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classrooms..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
            />
          </div>

        </div>

        {/* Classes Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 bg-white rounded-3xl border border-slate-100 animate-pulse p-6 space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-2/3" />
                <div className="h-16 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredClassrooms.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">
                {search
                  ? 'No classrooms match your search'
                  : isTeacher
                    ? 'Welcome, Teacher! Create Your First Class'
                    : 'No classrooms joined yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                {search
                  ? 'Try searching for a different subject or teacher name.'
                  : isTeacher
                    ? 'Set up a digital classroom for your students to share assignments, launch live multiplayer quizzes, and evaluate homework with OCR.'
                    : 'Join a classroom with your teacher’s code to start completing assignments, practicing quizzes, and earning XP.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              {isTeacher ? (
                <>
                  <button
                    onClick={handleOpenCreate}
                    className="px-6 py-3 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-2xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Class</span>
                  </button>
                  <button
                    onClick={handleOpenJoin}
                    className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-2xl text-xs font-extrabold active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span>Join Class with Code</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleOpenJoin}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Join a Class with Code</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClassrooms.map((c) => (
              <ClassroomCard key={c.id} classroom={c} />
            ))}
          </div>
        )}

      </div>

      {/* Modals */}
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

    </div>
  );
};
