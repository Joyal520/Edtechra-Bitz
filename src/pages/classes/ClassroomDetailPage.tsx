import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  Sparkles,
  Plus,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  MessageSquareShare,
  Users,
  BookOpen
} from 'lucide-react';
import {
  Classroom,
  ClassroomMember,
  ClassroomInvite,
  Assignment,
  ClassroomMessage,
  ContentBucket,
  ClassroomExam,
  ClassroomLeaderboardEntry,
  ClassroomStats as IClassroomStats
} from '@/types/classroom';
import { LiveQuiz } from '@/types/liveQuiz';
import { classroomService } from '@/services/classroomService';
import { assignmentService } from '@/services/assignmentService';
import { classroomPointsService } from '@/services/classroomPointsService';
import { classroomMessageService } from '@/services/classroomMessageService';
import { classroomResourceService } from '@/services/classroomResourceService';
import { classroomExamService } from '@/services/classroomExamService';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';

import {
  ClassroomHeroIllustration,
  OverviewIllustration,
  TaskIllustration,
  StudentsIllustration,
  StreamIllustration,
  ResourcesIllustration,
  AssignStudentsIllustration,
  LiveQuizIllustration,
  ExamIllustration,
  OCRIllustration,
  CompetitionIllustration,
  CreateCourseIllustration,
  BotanicalPaperCutFrame,
  CourseCardLeaves
} from '@/components/classes/ClassroomIllustrations';

import { AssignmentList } from '@/components/classes/AssignmentList';
import { StudentRoster } from '@/components/classes/StudentRoster';
import { ClassroomLeaderboard } from '@/components/classes/ClassroomLeaderboard';
import { ClassroomMessages } from '@/components/classes/ClassroomMessages';
import { ClassroomResources } from '@/components/classes/ClassroomResources';
import { StudentSubmitModal } from '@/components/classes/StudentSubmitModal';
import { SubmissionListModal } from '@/components/classes/SubmissionListModal';
import { ActivityHubModal } from '@/components/classes/ActivityHubModal';
import { OCRGradingModal } from '@/components/classes/OCRGradingModal';
import { ClassroomExamModal } from '@/components/classes/ClassroomExamModal';
import { AITeachingIntelligenceModal } from '@/components/classes/AITeachingIntelligenceModal';
import { LiveQuizBankModal } from '@/components/classes/live-quiz/LiveQuizBankModal';
import { CreateLiveQuizModal } from '@/components/classes/live-quiz/CreateLiveQuizModal';
import { ChallengeListModal } from '@/components/classes/challenges/ChallengeListModal';
import { TaskDashboardModal } from '@/components/classes/tasks/TaskDashboardModal';
import { StudentAssessmentHistoryModal } from '@/components/classes/StudentAssessmentHistoryModal';
import { ClassroomDangerZone } from '@/components/classes/ClassroomDangerZone';
import { CourseClassroomAssignment } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';

type TabType = 'overview' | 'assignments' | 'roster' | 'stream' | 'resources' | 'leaderboard' | 'exams' | 'courses';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isTeacher: authIsTeacher } = useAuth();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [invite, setInvite] = useState<ClassroomInvite | null>(null);
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [messages, setMessages] = useState<ClassroomMessage[]>([]);
  const [buckets, setBuckets] = useState<ContentBucket[]>([]);
  const [exams, setExams] = useState<ClassroomExam[]>([]);
  const [classroomCourses, setClassroomCourses] = useState<CourseClassroomAssignment[]>([]);
  const [leaderboard, setLeaderboard] = useState<ClassroomLeaderboardEntry[]>([]);
  const [stats, setStats] = useState<IClassroomStats>({
    total_students: 0,
    total_assignments: 0,
    total_submissions: 0,
    average_completion_percent: 0,
    average_score: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  // Invite code copied feedback
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Modals state
  const [activeSubmitAssignment, setActiveSubmitAssignment] = useState<Assignment | null>(null);
  const [activeReviewAssignment, setActiveReviewAssignment] = useState<Assignment | null>(null);
  const [activityHubOpen, setActivityHubOpen] = useState(false);
  const [taskDashboardOpen, setTaskDashboardOpen] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ClassroomExam | null>(null);
  const [aiReportModalOpen, setAiReportModalOpen] = useState(false);
  const [studentAssessmentHistoryOpen, setStudentAssessmentHistoryOpen] = useState(false);

  // Live Quiz State
  const [liveQuizBankOpen, setLiveQuizBankOpen] = useState(false);
  const [createLiveQuizOpen, setCreateLiveQuizOpen] = useState(false);

  // AI Challenge Competition State
  const [challengeListModalOpen, setChallengeListModalOpen] = useState(false);

  // Quick Assignment Creation Inline State
  const [showQuickCreateTask, setShowQuickCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskPoints, setTaskPoints] = useState(100);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const tabSectionRef = useRef<HTMLDivElement>(null);

  const handleLaunchLiveQuiz = async (selectedQuiz: LiveQuiz) => {
    if (!id) return;
    try {
      const res = await liveQuizService.createSession({
        classroom_id: id,
        quiz_id: selectedQuiz.id,
        custom_quiz: selectedQuiz
      });

      if (res.error || !res.data) {
        alert(res.error || 'Failed to start live quiz');
        return;
      }

      navigate(`/classes/${id}/live-quiz/lobby/${res.data.pin}`);
    } catch (err: any) {
      alert(err.message || 'Error launching quiz');
    }
  };

  useEffect(() => {
    if (id) {
      loadAllClassroomData();
    }
  }, [id, user]);

  const loadAllClassroomData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const [
        classData,
        inviteData,
        membersData,
        assignmentsData,
        messagesData,
        bucketsData,
        examsData,
        leaderboardData,
        statsData,
        coursesData
      ] = await Promise.all([
        classroomService.getClassroomById(id),
        classroomService.getOrCreateInvite(id),
        classroomService.getClassroomMembers(id),
        assignmentService.getAssignmentsByClassroom(id),
        classroomMessageService.getMessages(id),
        classroomResourceService.getBucketsByClassroom(id),
        classroomExamService.getExamsByClassroom(id),
        classroomPointsService.getClassroomLeaderboard(id),
        classroomService.getClassroomStats(id),
        courseStudioService.getClassroomCourses(id).catch(() => [])
      ]);

      if (!classData) {
        navigate('/classes');
        return;
      }

      setClassroom(classData);
      setInvite(inviteData);
      setMembers(membersData);
      setAssignments(assignmentsData);
      setMessages(messagesData);
      setBuckets(bucketsData);
      setExams(examsData);
      setLeaderboard(leaderboardData);
      setStats(statsData);
      setClassroomCourses(coursesData || []);
    } catch (err) {
      console.error('Error loading classroom:', err);
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = Boolean(
    classroom?.teacher_id === user?.id ||
    classroom?.user_role === 'teacher' ||
    authIsTeacher
  );

  const myMemberRecord = members.find((m) => m.profile_id === user?.id) || null;

  const handleSelectTab = (tab: TabType) => {
    if (activeTab === tab) {
      setActiveTab(null); // Toggle off if clicked again
    } else {
      setActiveTab(tab);
      setTimeout(() => {
        if (tabSectionRef.current) {
          tabSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !taskTitle.trim()) return;

    setIsCreatingTask(true);
    try {
      const res = await assignmentService.createAssignment({
        classroom_id: id,
        title: taskTitle.trim(),
        instructions: taskInstructions.trim(),
        points: taskPoints,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null
      });

      if (res.error) throw new Error(res.error);

      setTaskTitle('');
      setTaskInstructions('');
      setTaskPoints(100);
      setTaskDueDate('');
      setShowQuickCreateTask(false);
      await loadAllClassroomData();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await assignmentService.deleteAssignment(assignmentId);
      await loadAllClassroomData();
    } catch (err) {
      alert('Failed to delete assignment');
    }
  };

  const inviteCode = invite?.invite_code || '...';
  const inviteUrl = `${window.location.origin}/classes/join/${inviteCode}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Join my classroom "${classroom?.title}" on EdTechra!\nUse code: ${inviteCode}\nOr click link: ${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const studentCount = members.filter(m => m.role === 'student').length || stats.total_students || 0;

  if (loading || !classroom) {
    return (
      <div className="min-h-screen bg-[#f9f7f1] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#0a213c] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-extrabold text-slate-700">Loading EdTechra Digital Classroom...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f1] font-sans antialiased text-slate-800 py-4 sm:py-6 relative overflow-x-hidden">
      
      {/* 3D Botanical Cut-Paper Decorative Border Frame */}
      <BotanicalPaperCutFrame />

      {/* MAIN DIGITAL CLASSROOM WORKSPACE CONTAINER */}
      <main className="max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
        
        {/* ========================================================================= */}
        {/* CLEAN CLASSROOM SUBHEADER (Search & AI Report Buttons Removed)            */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-stone-200/60">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              to="/classes"
              className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-900 bg-white hover:bg-stone-50 px-3.5 py-1.5 rounded-full transition-all border border-stone-200/80 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Classes</span>
            </Link>

            <span className="text-stone-300">/</span>

            <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-black border border-sky-100">
              {classroom.subject || 'Classroom'}
            </span>

            {classroom.grade && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-slate-700 text-xs font-extrabold">
                {classroom.grade}
              </span>
            )}

            <h2 className="text-sm sm:text-base font-black text-slate-900 truncate max-w-[220px] sm:max-w-md">
              {classroom.title}
            </h2>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1 — CLASSROOM HERO                                                */}
        {/* ========================================================================= */}
        <section className="bg-[#0a213c] rounded-[28px] p-6 sm:p-8 lg:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
          
          {/* Subtle Organic Background Glow Waves */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* LEFT: Hero Content, Classroom Details & Invite Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Motto Tagline */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-300">
                  Empower your classroom,
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  inspire your students.
                </h1>
              </div>

              {/* Classroom Details & Badges */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap pt-1">
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-black text-white border border-white/15">
                  {classroom.title}
                </span>

                <span className="px-3 py-1 rounded-full bg-sky-400/20 text-sky-200 text-xs font-black border border-sky-400/30">
                  {classroom.subject || 'General'}
                </span>

                {classroom.grade && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 text-xs font-black border border-amber-400/30">
                    {classroom.grade}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-black border border-emerald-400/30">
                  <Users className="w-3.5 h-3.5" />
                  <span>{studentCount} {studentCount === 1 ? 'Student' : 'Students'}</span>
                </span>
              </div>

              {/* Invite Code Box & Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                
                {/* Monospace Invite Code Box */}
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-2 rounded-xl shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Code:</span>
                  <span className="font-mono font-black text-sm text-sky-300 tracking-widest">{inviteCode}</span>
                </div>

                {/* Copy Code & Link Button */}
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiedInvite ? 'Copied Link!' : 'Copy Code & Link'}</span>
                </button>

                {/* Share via WhatsApp Button */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <MessageSquareShare className="w-3.5 h-3.5" />
                  <span>Share via WhatsApp</span>
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
        {/* SECTION 2 — MAIN TEACHER TOOLS (6 Pastel Cards)                           */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
          
          {/* Card 1: Overview */}
          <div
            onClick={() => handleSelectTab('overview')}
            className={`rounded-[24px] p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
              activeTab === 'overview'
                ? 'bg-[#e8f3fa] border-sky-300 shadow-md ring-2 ring-sky-400/50'
                : 'bg-[#e8f3fa] border-sky-100/90 hover:border-sky-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-center py-1">
                <OverviewIllustration className="w-20 h-16 transition-transform group-hover:scale-105" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-black text-slate-900">Overview</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  See class summary, performance & activity.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-white text-sky-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-sky-200">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 2: Tasks */}
          <div
            onClick={() => handleSelectTab('assignments')}
            className={`rounded-[24px] p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
              activeTab === 'assignments'
                ? 'bg-[#eef8f1] border-emerald-300 shadow-md ring-2 ring-emerald-400/50'
                : 'bg-[#eef8f1] border-emerald-100/90 hover:border-emerald-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-center py-1">
                <TaskIllustration className="w-20 h-16 transition-transform group-hover:scale-105" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-black text-slate-900">
                  {isTeacher ? 'Tasks' : 'My Tasks'}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {isTeacher
                    ? 'Create, manage and review assignments.'
                    : 'View assigned tasks and submit work.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-white text-emerald-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-emerald-200">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 3: Students */}
          <div
            onClick={() => handleSelectTab('roster')}
            className={`rounded-[24px] p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
              activeTab === 'roster'
                ? 'bg-[#f3edf9] border-purple-300 shadow-md ring-2 ring-purple-400/50'
                : 'bg-[#f3edf9] border-purple-100/90 hover:border-purple-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-center py-1">
                <StudentsIllustration className="w-20 h-16 transition-transform group-hover:scale-105" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-black text-slate-900">
                  {isTeacher ? 'Students' : 'Classmates'}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {isTeacher
                    ? 'View students, progress and engagement.'
                    : 'View classmates & learning progress.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-white text-purple-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-purple-200">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 4: Stream */}
          <div
            onClick={() => handleSelectTab('stream')}
            className={`rounded-[24px] p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
              activeTab === 'stream'
                ? 'bg-[#fbf4e4] border-amber-300 shadow-md ring-2 ring-amber-400/50'
                : 'bg-[#fbf4e4] border-amber-100/90 hover:border-amber-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-center py-1">
                <StreamIllustration className="w-20 h-16 transition-transform group-hover:scale-105" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-black text-slate-900">Stream</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  View class updates, announcements & posts.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-white text-amber-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-amber-200">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 5: Resources */}
          <div
            onClick={() => handleSelectTab('resources')}
            className={`rounded-[24px] p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
              activeTab === 'resources'
                ? 'bg-[#faecea] border-rose-300 shadow-md ring-2 ring-rose-400/50'
                : 'bg-[#faecea] border-rose-100/90 hover:border-rose-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-center py-1">
                <ResourcesIllustration className="w-20 h-16 transition-transform group-hover:scale-105" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-black text-slate-900">Resources</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Access learning materials, files and links.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-white text-rose-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-rose-200">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Card 6: Courses */}
          <div
            onClick={() => handleSelectTab('courses')}
            className={`rounded-[24px] p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
              activeTab === 'courses'
                ? 'bg-[#eef2ff] border-indigo-300 shadow-md ring-2 ring-indigo-400/50'
                : 'bg-[#eef2ff] border-indigo-100/90 hover:border-indigo-300'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-center py-2">
                <div className="w-16 h-14 rounded-2xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  <BookOpen className="w-7 h-7" />
                </div>
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-base font-black text-slate-900">
                  {isTeacher ? 'Courses' : 'My Courses'}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {isTeacher
                    ? 'Structured multi-day digital courses.'
                    : 'Access assigned interactive course lessons.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-3">
              <div className="w-8 h-8 rounded-full bg-white/90 group-hover:bg-white text-indigo-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-indigo-200">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* SECTION 3 — ASSIGN YOUR STUDENTS (5 Action Cards)                          */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">
              {isTeacher ? 'Assign Your Students' : 'Classroom Activities & Learning'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            
            {/* Card 1: Assign Your Students / My Tasks */}
            <div className="bg-white rounded-[24px] p-5 border border-stone-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <AssignStudentsIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-black text-slate-900">
                    {isTeacher ? 'Assign Your Students' : 'My Tasks'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Assign tasks, lessons or activities to selected students.'
                      : 'Complete lessons and submit homework assignments.'}
                  </p>
                </div>
              </div>
              {isTeacher ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivityHubOpen(true)}
                    className="flex-1 py-2 px-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskDashboardOpen(true)}
                    className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] font-black transition-all cursor-pointer"
                  >
                    Tasks
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setTaskDashboardOpen(true)}
                  className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  Open Tasks
                </button>
              )}
            </div>

            {/* Card 2: Live Quiz */}
            <div className="bg-white rounded-[24px] p-5 border border-stone-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <LiveQuizIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-black text-slate-900">Live Quiz</h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Conduct live quizzes, engage students in real time.'
                      : 'Join real-time classroom quizzes with a game PIN.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isTeacher) {
                    setLiveQuizBankOpen(true);
                  } else {
                    navigate('/classes/live-quiz/join');
                  }
                }}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Host Live Quiz' : 'Join Quiz'}
              </button>
            </div>

            {/* Card 3: Exam */}
            <div className="bg-white rounded-[24px] p-5 border border-stone-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <ExamIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-black text-slate-900">
                    {isTeacher ? 'Exam' : 'Exams'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Create exams, set time limits & evaluate performance.'
                      : 'Take scheduled timed assessments and review results.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isTeacher) {
                    setSelectedExam(null);
                    setExamModalOpen(true);
                  } else {
                    handleSelectTab('exams');
                  }
                }}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Create Exam' : 'View Exams'}
              </button>
            </div>

            {/* Card 4: OCR Assessment */}
            <div className="bg-white rounded-[24px] p-5 border border-stone-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <OCRIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-black text-slate-900">
                    {isTeacher ? 'OCR Assessment' : 'My Assessments'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Upload handwritten papers & get AI evaluation.'
                      : 'View your graded worksheet AI evaluation reports.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isTeacher) {
                    setOcrModalOpen(true);
                  } else {
                    setStudentAssessmentHistoryOpen(true);
                  }
                }}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Grade Worksheets' : 'View Evaluations'}
              </button>
            </div>

            {/* Card 5: Competition */}
            <div className="bg-white rounded-[24px] p-5 border border-stone-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <CompetitionIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-black text-slate-900">
                    {isTeacher ? 'Competition' : 'Challenges'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Create challenges, let AI evaluate student work.'
                      : 'Participate in creative problem-solving challenges.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChallengeListModalOpen(true)}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Challenge Dashboard' : 'Open Challenges'}
              </button>
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* SECTION 4 — STUDENT PERFORMANCE & AI TEACHING INTELLIGENCE                */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-[32px] p-6 sm:p-8 border border-stone-200/80 shadow-md relative overflow-hidden">
          
          {/* Section Header with Blue Indicator Line */}
          <div className="space-y-1 pb-5 border-b border-stone-100">
            <h2 className="text-sm sm:text-base font-black text-[#0f233a] tracking-wider uppercase">
              Student Performance
            </h2>
            <div className="w-8 h-0.5 bg-[#026fc3] rounded-full" />
          </div>

          <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            
            {/* LEFT: Classroom Leaderboard (3D Podium + Top Students) (7 Cols) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between">
              <ClassroomLeaderboard
                entries={leaderboard}
                currentUserId={user?.id}
              />
            </div>

            {/* RIGHT: AI Teaching Intelligence Card (5 Cols) */}
            <div className="lg:col-span-5 xl:col-span-4 rounded-[28px] p-6 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col justify-between space-y-4 border border-indigo-950/60 min-h-[300px]">
              
              {/* Background Paper-Cut Artwork Image */}
              <img
                src="/assets/92697e31-f3ea-46a7-b531-ca18d5725169.png"
                alt="AI Teaching Intelligence Artwork"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Soft Contrast Gradient Overlay for Crystal Clear Text Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-indigo-950/30 to-indigo-950/40 pointer-events-none" />

              <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span className="text-sm sm:text-base font-black text-white">
                    AI Teaching Intelligence
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-indigo-100 font-medium leading-relaxed max-w-[240px] drop-shadow-xs">
                  Understand your classroom. Know what to teach next.
                </p>
              </div>

              <div className="pt-4 relative z-10">
                <button
                  type="button"
                  onClick={() => setAiReportModalOpen(true)}
                  className="w-full py-3 px-5 bg-[#f9f7f1] hover:bg-white text-[#1e1b4b] rounded-full text-xs sm:text-sm font-black shadow-md active:scale-95 transition-all text-center cursor-pointer"
                >
                  Open Teaching Intelligence
                </button>
              </div>

            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* SECTION 5 — CREATE A COURSE                                               */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-[24px] p-5 sm:p-7 border border-stone-200/70 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          
          {/* Decorative Corner Leaves on Right Edge */}
          <CourseCardLeaves />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <CreateCourseIllustration className="w-16 h-14" />
              </div>
              <div className="space-y-1 max-w-xl">
                <h3 className="text-base font-black text-slate-900">
                  Create a Course
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Build structured learning experiences with modules, lessons, quizzes and resources for your students.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setActivityHubOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Course</span>
              </button>
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* SECTION 6 — CLASSROOM ANNOUNCEMENTS                                       */}
        {/* ========================================================================= */}
        <section>
          <ClassroomMessages
            classroomId={classroom.id}
            messages={messages}
            isTeacher={isTeacher}
            onMessageUpdated={loadAllClassroomData}
          />
        </section>

        {/* ========================================================================= */}
        {/* SECTION 7 — DANGER ZONE (Teacher/Admin Only)                              */}
        {/* ========================================================================= */}
        {isTeacher && classroom && (
          <section>
            <ClassroomDangerZone
              classroom={classroom}
              isOwnerOrAdmin={isTeacher}
              stats={stats}
            />
          </section>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE TAB DRAWER / CONTENT VIEW (When a tool card is clicked)       */}
        {/* ========================================================================= */}
        {activeTab && (
          <div ref={tabSectionRef} className="pt-4 border-t-2 border-stone-200/80 space-y-6">
            
            {/* Tab Header with Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#026fc3]" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Detailed View • {activeTab}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded-full transition-all cursor-pointer"
              >
                Close View ✕
              </button>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <AssignmentList
                  assignments={assignments}
                  isTeacher={isTeacher}
                  onCreateAssignment={() => setShowQuickCreateTask(true)}
                  onOpenSubmissions={(a) => setActiveReviewAssignment(a)}
                  onSubmitWork={(a) => setActiveSubmitAssignment(a)}
                  onDeleteAssignment={handleDeleteAssignment}
                />
              </div>
            )}

            {/* TAB: TASKS (ASSIGNMENTS) */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                {isTeacher && showQuickCreateTask && (
                  <form onSubmit={handleCreateTaskSubmit} className="bg-white p-6 rounded-3xl border-2 border-indigo-200 shadow-md space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">Create New Classroom Task</h3>
                      <button
                        type="button"
                        onClick={() => setShowQuickCreateTask(false)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        required
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Assignment Title (e.g. Chapter 4 Chemistry Review)"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        value={taskInstructions}
                        onChange={(e) => setTaskInstructions(e.target.value)}
                        placeholder="Instructions and requirements for students..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-600 mb-1">Max Points</label>
                        <input
                          type="number"
                          min={10}
                          max={500}
                          required
                          value={taskPoints}
                          onChange={(e) => setTaskPoints(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-slate-600 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isCreatingTask}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        {isCreatingTask ? 'Publishing...' : 'Publish Task'}
                      </button>
                    </div>
                  </form>
                )}

                <AssignmentList
                  assignments={assignments}
                  isTeacher={isTeacher}
                  onCreateAssignment={() => setShowQuickCreateTask(true)}
                  onOpenSubmissions={(a) => setActiveReviewAssignment(a)}
                  onSubmitWork={(a) => setActiveSubmitAssignment(a)}
                  onDeleteAssignment={handleDeleteAssignment}
                />
              </div>
            )}

            {/* TAB: ROSTER */}
            {activeTab === 'roster' && (
              <StudentRoster
                classroomId={classroom.id}
                members={members}
                classroomTeacherId={classroom.teacher_id}
                isTeacher={isTeacher}
                currentUserId={user?.id}
                onMemberRemoved={loadAllClassroomData}
              />
            )}

            {/* TAB: STREAM */}
            {activeTab === 'stream' && (
              <ClassroomMessages
                classroomId={classroom.id}
                messages={messages}
                isTeacher={isTeacher}
                onMessageUpdated={loadAllClassroomData}
              />
            )}

            {/* TAB: RESOURCES */}
            {activeTab === 'resources' && (
              <ClassroomResources
                classroomId={classroom.id}
                buckets={buckets}
                isTeacher={isTeacher}
                onUpdated={loadAllClassroomData}
                onOpenActivityHub={() => setActivityHubOpen(true)}
              />
            )}

            {/* TAB: EXAMS */}
            {activeTab === 'exams' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Classroom Timed Assessments</h2>
                    <p className="text-xs text-slate-500 font-semibold">{exams.length} active exams</p>
                  </div>
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExam(null);
                        setExamModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Exam</span>
                    </button>
                  )}
                </div>

                {exams.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-2">
                    <Award className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">No exams scheduled for this classroom.</p>
                    <p className="text-[11px] text-slate-400">
                      {isTeacher
                        ? 'Click "+ Create Exam" to build an interactive timed assessment.'
                        : 'Check back when your teacher announces an assessment.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exams.map((exam) => (
                      <div key={exam.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {exam.duration_minutes} Minutes
                            </span>
                            <span className="text-xs font-extrabold text-slate-600">
                              {exam.total_marks} Marks Total
                            </span>
                          </div>

                          <h3 className="text-base font-black text-slate-900 mt-2">{exam.title}</h3>
                          {exam.description && (
                            <p className="text-xs text-slate-500 mt-1 font-medium">{exam.description}</p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          {exam.latest_result ? (
                            <span className="text-xs font-black text-emerald-600">
                              Score: {exam.latest_result.score} / {exam.total_marks} ({exam.latest_result.percentage}%)
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              {(Array.isArray(exam.questions_json) && exam.questions_json.length > 0
                                ? exam.questions_json.flatMap((s: any) => s.questions || []).length
                                : Array.isArray(exam.questions)
                                ? exam.questions.length
                                : 0)} questions
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExam(exam);
                              setExamModalOpen(true);
                            }}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            {exam.latest_result ? 'View Result' : 'Take Exam'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: LEADERBOARD */}
            {activeTab === 'leaderboard' && (
              <ClassroomLeaderboard
                entries={leaderboard}
                currentUserId={user?.id}
              />
            )}

            {/* TAB: COURSES */}
            {activeTab === 'courses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Assigned Digital Courses</h2>
                    <p className="text-xs text-slate-500 font-semibold">{classroomCourses.length} active digital courses assigned</p>
                  </div>
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() => navigate('/course-studio')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Assign / Manage Studio Courses</span>
                    </button>
                  )}
                </div>

                {classroomCourses.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">No courses assigned to this classroom yet.</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      {isTeacher
                        ? 'Build courses in Course Studio and assign them to this classroom in one click.'
                        : 'Your teacher has not assigned any digital courses yet.'}
                    </p>
                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => navigate('/course-studio')}
                        className="px-4 py-2 bg-[#026fc3] text-white text-xs font-black rounded-xl shadow-xs"
                      >
                        Open Course Studio
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {classroomCourses.map((c) => {
                      const course = c.course;
                      const enrollment = c.enrollment;
                      const progressPct = Math.round(enrollment?.progress_percent || 0);

                      return (
                        <div
                          key={c.id}
                          className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs flex flex-col justify-between"
                        >
                          <div>
                            {course?.cover_image_url && (
                              <div className={`relative w-full bg-slate-900 overflow-hidden ${
                                course.cover_aspect_ratio === '1:1' ? 'aspect-square max-h-48' : 'h-32'
                              }`}>
                                <img
                                  src={course.cover_image_url}
                                  alt={course.title || 'Course Cover'}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              </div>
                            )}

                            <div className="p-5 pb-0 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[#026fc3] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                                  {course?.subject || 'Subject'}
                                </span>
                                <span className="text-xs font-bold text-slate-400">
                                  {course?.grade_level || 'All Grades'}
                                </span>
                              </div>

                              <h3 className="text-base font-black text-slate-900 line-clamp-1">{course?.title}</h3>
                              {course?.short_description && (
                                <p className="text-xs text-slate-500 font-medium line-clamp-2">{course.short_description}</p>
                              )}
                            </div>

                            {!isTeacher && (
                              <div className="mt-4 space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-slate-500">Your Progress</span>
                                  <span className="text-[#026fc3] font-black">{progressPct}%</span>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                  <div className="bg-[#026fc3] h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            {isTeacher ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/course-studio/${c.course_id}/analytics`)}
                                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                                >
                                  Analytics
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/course-studio/${c.course_id}`)}
                                  className="px-3 py-1.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
                                >
                                  Edit Course
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate(`/classes/${id}/courses/${c.course_id}/learn`)}
                                className="w-full py-2 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>{progressPct > 0 ? 'Continue Learning' : 'Start Course'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* ALL MODALS FULLY PRESERVED AND WIRED                                      */}
      {/* ========================================================================= */}
      <StudentSubmitModal
        isOpen={Boolean(activeSubmitAssignment)}
        assignment={activeSubmitAssignment}
        classroomId={classroom.id}
        onClose={() => setActiveSubmitAssignment(null)}
        onSuccess={() => {
          loadAllClassroomData();
          setActiveSubmitAssignment(null);
        }}
      />

      <SubmissionListModal
        isOpen={Boolean(activeReviewAssignment)}
        assignment={activeReviewAssignment}
        classroomId={classroom.id}
        onClose={() => setActiveReviewAssignment(null)}
        onGraded={loadAllClassroomData}
      />

      <ActivityHubModal
        isOpen={activityHubOpen}
        classroomId={classroom.id}
        onClose={() => setActivityHubOpen(false)}
        onCreateTask={() => setShowQuickCreateTask(true)}
        onOpenOCR={() => setOcrModalOpen(true)}
        onOpenExam={() => {
          setSelectedExam(null);
          setExamModalOpen(true);
        }}
      />

      <OCRGradingModal
        isOpen={ocrModalOpen}
        classroomId={classroom.id}
        members={members}
        onClose={() => setOcrModalOpen(false)}
        onSuccess={loadAllClassroomData}
      />

      <ClassroomExamModal
        isOpen={examModalOpen}
        classroomId={classroom.id}
        isTeacher={isTeacher}
        activeExam={selectedExam}
        initialTab={selectedExam ? 'results' : 'creator'}
        onClose={() => {
          setExamModalOpen(false);
          setSelectedExam(null);
        }}
        onSuccess={loadAllClassroomData}
      />

      <AITeachingIntelligenceModal
        isOpen={aiReportModalOpen}
        classroom={classroom}
        onClose={() => setAiReportModalOpen(false)}
      />

      <LiveQuizBankModal
        isOpen={liveQuizBankOpen}
        classroomId={classroom.id}
        onClose={() => setLiveQuizBankOpen(false)}
        onSelectQuiz={handleLaunchLiveQuiz}
        onCreateCustomQuiz={() => setCreateLiveQuizOpen(true)}
      />

      <CreateLiveQuizModal
        isOpen={createLiveQuizOpen}
        classroomId={classroom.id}
        onClose={() => setCreateLiveQuizOpen(false)}
        onSuccess={handleLaunchLiveQuiz}
      />

      <ChallengeListModal
        isOpen={challengeListModalOpen}
        classroomId={classroom.id}
        isTeacher={isTeacher}
        onClose={() => setChallengeListModalOpen(false)}
      />

      <TaskDashboardModal
        isOpen={taskDashboardOpen}
        classroomId={classroom.id}
        isTeacher={isTeacher}
        onClose={() => setTaskDashboardOpen(false)}
      />

      <StudentAssessmentHistoryModal
        isOpen={studentAssessmentHistoryOpen}
        classroomId={classroom.id}
        student={myMemberRecord || (user ? {
          id: user.id,
          classroom_id: classroom.id,
          profile_id: user.id,
          role: 'student',
          points: 0,
          status: 'active',
          joined_at: new Date().toISOString(),
          profile: profile as any
        } : null)}
        onClose={() => setStudentAssessmentHistoryOpen(false)}
      />

    </div>
  );
};
