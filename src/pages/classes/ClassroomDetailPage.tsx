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
  BookOpen,
  Clock,
  FileText
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
import { LiveQuiz, LiveQuizSession } from '@/types/liveQuiz';
import { classroomService } from '@/services/classroomService';
import { assignmentService } from '@/services/assignmentService';
import { classroomPointsService } from '@/services/classroomPointsService';
import { supabase } from '@/lib/supabase';
import { classroomMessageService } from '@/services/classroomMessageService';
import { classroomResourceService } from '@/services/classroomResourceService';
import { classroomExamService } from '@/services/classroomExamService';
import { liveQuizService } from '@/services/liveQuizService';
import { useAuth } from '@/context/AuthContext';

import {
  ClassroomHeroIllustration,
  TaskIllustration,
  CoursesIllustration,
  StudentsIllustration,
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
import { ExamPlatformModal } from '@/components/exam/ExamPlatformModal';
import { AssessmentTypeSelectionModal } from '@/components/exam/entry/AssessmentTypeSelectionModal';
import { ExamLibraryModal } from '@/components/exam/library/ExamLibraryModal';
import { AITeachingIntelligenceModal } from '@/components/classes/AITeachingIntelligenceModal';
import { LiveQuizBankModal } from '@/components/classes/live-quiz/LiveQuizBankModal';
import { CreateLiveQuizModal } from '@/components/classes/live-quiz/CreateLiveQuizModal';
import { LiveQuizLaunchDecisionModal } from '@/components/classes/live-quiz/LiveQuizLaunchDecisionModal';
import { ChallengeListModal } from '@/components/classes/challenges/ChallengeListModal';
import { TaskDashboardModal } from '@/components/classes/tasks/TaskDashboardModal';
import { StudentAssessmentHistoryModal } from '@/components/classes/StudentAssessmentHistoryModal';
import { ClassroomDangerZone } from '@/components/classes/ClassroomDangerZone';
import { CourseClassroomAssignment } from '@/types/courseStudio';
import { courseStudioService } from '@/services/courseStudioService';
import { getQuizCover, DEFAULT_QUIZ_COVER } from '@/utils/quizCover';

type TabType = 'overview' | 'assignments' | 'roster' | 'stream' | 'resources' | 'leaderboard' | 'exams' | 'courses';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isTeacher: authIsTeacher, isLoading: authLoading } = useAuth();

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
  const [assessmentTypeModalOpen, setAssessmentTypeModalOpen] = useState(false);
  const [examLibraryOpen, setExamLibraryOpen] = useState(false);
  const [copiedExamCardId, setCopiedExamCardId] = useState<string | null>(null);
  const [aiReportModalOpen, setAiReportModalOpen] = useState(false);
  const [studentAssessmentHistoryOpen, setStudentAssessmentHistoryOpen] = useState(false);

  // Live Quiz State
  const [liveQuizBankOpen, setLiveQuizBankOpen] = useState(false);
  const [createLiveQuizOpen, setCreateLiveQuizOpen] = useState(false);
  const [launchDecisionModalOpen, setLaunchDecisionModalOpen] = useState(false);
  const [quizToLaunch, setQuizToLaunch] = useState<LiveQuiz | null>(null);
  const [activeLiveQuizSession, setActiveLiveQuizSession] = useState<LiveQuizSession | null>(null);
  const [isJoiningLiveQuiz, setIsJoiningLiveQuiz] = useState(false);
  const [scheduledCountdownText, setScheduledCountdownText] = useState('');

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

  const effectiveLiveQuizState = liveQuizService.getEffectiveSessionState(activeLiveQuizSession);
  const scheduledTimeStr = activeLiveQuizSession?.scheduled_start_at || activeLiveQuizSession?.started_at;

  // Live countdown ticker for scheduled session banner
  useEffect(() => {
    if (effectiveLiveQuizState !== 'scheduled' || !scheduledTimeStr) {
      setScheduledCountdownText('');
      return;
    }

    const updateCountdown = () => {
      const diffMs = new Date(scheduledTimeStr).getTime() - Date.now();
      if (diffMs <= 0) {
        setScheduledCountdownText('00:00');
        if (id) {
          liveQuizService.getActiveSessionForClassroom(id).then(setActiveLiveQuizSession);
        }
        return;
      }
      const totalSec = Math.ceil(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      if (hours > 0) {
        setScheduledCountdownText(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      } else {
        setScheduledCountdownText(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [effectiveLiveQuizState, scheduledTimeStr, id]);

  const handleOpenLaunchDecision = (quiz: LiveQuiz) => {
    setLiveQuizBankOpen(false);
    setCreateLiveQuizOpen(false);
    setQuizToLaunch(quiz);
    setLaunchDecisionModalOpen(true);
  };

  const handleLaunchNow = async (selectedQuiz: LiveQuiz) => {
    if (!id) return;
    try {
      const res = await liveQuizService.createSession({
        classroom_id: id,
        quiz_id: selectedQuiz.id,
        custom_quiz: selectedQuiz,
        is_scheduled: false
      });

      if (res.error || !res.data) {
        alert(res.error || 'Failed to start live quiz');
        return;
      }

      setActiveLiveQuizSession(res.data);
      navigate(`/classes/${id}/live-quiz/lobby/${res.data.pin}`);
    } catch (err: any) {
      alert(err.message || 'Error launching quiz');
    }
  };

  const handleScheduleQuiz = async (selectedQuiz: LiveQuiz, scheduledStartAt: string) => {
    if (!id) return;
    try {
      const res = await liveQuizService.scheduleSession({
        classroom_id: id,
        quiz_id: selectedQuiz.id,
        custom_quiz: selectedQuiz,
        scheduled_start_at: scheduledStartAt
      });

      if (res.error || !res.data) {
        alert(res.error || 'Failed to schedule live quiz');
        return;
      }

      setActiveLiveQuizSession(res.data);
    } catch (err: any) {
      alert(err.message || 'Error scheduling quiz');
    }
  };

  const handleStudentJoinLiveQuiz = async () => {
    if (!id) return;
    setIsJoiningLiveQuiz(true);
    try {
      const session = await liveQuizService.getActiveSessionForClassroom(id);
      if (!session) {
        alert('No active Live Quiz in this classroom right now. When your teacher starts a quiz, you can join directly here without entering a PIN!');
        return;
      }

      // Automatically enroll student into the session
      const studentName = profile?.full_name || profile?.name || user?.email?.split('@')[0] || 'Student';
      await liveQuizService.joinSession({
        session_id: session.id,
        display_name: studentName,
        avatar_url: profile?.avatar_url || profile?.avatarUrl || undefined
      });

      // Direct navigation without PIN prompt
      if (session.status === 'scheduled' || session.status === 'lobby') {
        navigate(`/classes/${id}/live-quiz/lobby/${session.pin}`);
      } else {
        navigate(`/classes/${id}/live-quiz/play/${session.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to join live quiz');
    } finally {
      setIsJoiningLiveQuiz(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const refreshActiveQuiz = async () => {
      try {
        const s = await liveQuizService.getActiveSessionForClassroom(id);
        if (isMounted) {
          const state = liveQuizService.getEffectiveSessionState(s);
          if (state === 'live' || state === 'scheduled') {
            setActiveLiveQuizSession(s);
          } else {
            setActiveLiveQuizSession(null);
          }
        }
      } catch {
        if (isMounted) setActiveLiveQuizSession(null);
      }
    };

    // Immediate authoritative query
    refreshActiveQuiz();

    // Periodic safety poll
    const interval = setInterval(refreshActiveQuiz, 5000);

    // Realtime postgres_changes subscription on live_quiz_sessions for this classroom
    const channel = supabase
      ? supabase
          .channel(`classroom_live_quiz_${id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'live_quiz_sessions',
              filter: `classroom_id=eq.${id}`
            },
            (payload: any) => {
              const row = payload.new || payload.old;
              if (
                payload.eventType === 'DELETE' ||
                row?.status === 'finished' ||
                row?.status === 'completed' ||
                row?.status === 'cancelled'
              ) {
                // Immediately remove panel
                if (isMounted) setActiveLiveQuizSession(null);
              } else {
                refreshActiveQuiz();
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  useEffect(() => {
    if (id && !authLoading) {
      loadAllClassroomData();
    }
  }, [id, user, authLoading]);

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
        user ? courseStudioService.getClassroomCourses(id).catch(() => []) : Promise.resolve([])
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
        {/* ========================================================================= */}
        {/* SECTION 1 — CLASSROOM HERO                                                */}
        {/* ========================================================================= */}
        <section className="bg-[#0a213c] rounded-[24px] p-5 sm:p-6 lg:p-7 text-white shadow-lg relative overflow-hidden border border-slate-800">
          
          {/* Subtle Organic Background Glow Waves */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
            
            {/* LEFT: Hero Content, Classroom Details & Invite Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-3.5">
              
              {/* Motto Tagline */}
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  Empower your classroom,
                </p>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                  inspire your students.
                </h1>
              </div>

              {/* Classroom Details & Badges */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-0.5">
                <span className="px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-xs text-xs font-black text-white border border-white/15">
                  {classroom.title}
                </span>

                <span className="px-3 py-0.5 rounded-full bg-sky-400/20 text-sky-200 text-xs font-black border border-sky-400/30">
                  {classroom.subject || 'General'}
                </span>

                {classroom.grade && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-xs font-black border border-amber-400/30">
                    {classroom.grade}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-black border border-emerald-400/30">
                  <Users className="w-3.5 h-3.5" />
                  <span>{studentCount} {studentCount === 1 ? 'Student' : 'Students'}</span>
                </span>
              </div>

              {/* Invite Code Box & Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap">
                
                {/* Monospace Invite Code Box */}
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Code:</span>
                  <span className="font-mono font-black text-sm text-sky-300 tracking-widest">{inviteCode}</span>
                </div>

                {/* Copy Code & Link Button */}
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiedInvite ? 'Copied Link!' : 'Copy Code & Link'}</span>
                </button>

                {/* Share via WhatsApp Button */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <MessageSquareShare className="w-3.5 h-3.5" />
                  <span>Share via WhatsApp</span>
                </button>

              </div>

            </div>

            {/* RIGHT: 3D Paper-Cut Classroom Scene (5 cols) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <ClassroomHeroIllustration className="w-full max-w-[280px] sm:max-w-[320px] h-auto drop-shadow-xl" />
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* SECTION 2 — PRIMARY NAVIGATION (4 Compact Tiles)                          */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Card 1: My Tasks (Soft Green) */}
          <div
            onClick={() => handleSelectTab('assignments')}
            className={`rounded-[20px] p-3.5 sm:p-4 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden min-h-[110px] sm:min-h-[118px] ${
              activeTab === 'assignments'
                ? 'bg-[#eef8f1] border-emerald-300 shadow-md ring-2 ring-emerald-400/50'
                : 'bg-[#eef8f1] border-emerald-100/90 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/80 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <TaskIllustration className="w-7 h-7 transition-transform group-hover:scale-105" />
              </div>
              <div className="w-6 h-6 rounded-full bg-white/90 group-hover:bg-white text-emerald-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-emerald-200">
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div className="pt-2 text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                {isTeacher ? 'Tasks' : 'My Tasks'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-tight line-clamp-1 mt-0.5">
                {isTeacher
                  ? 'Create, manage and review assignments.'
                  : 'View assigned tasks and submit work.'}
              </p>
            </div>
          </div>

          {/* Card 2: Courses (Soft Blue / Lavender) */}
          <div
            onClick={() => handleSelectTab('courses')}
            className={`rounded-[20px] p-3.5 sm:p-4 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden min-h-[110px] sm:min-h-[118px] ${
              activeTab === 'courses'
                ? 'bg-[#eef2ff] border-indigo-300 shadow-md ring-2 ring-indigo-400/50'
                : 'bg-[#eef2ff] border-indigo-100/90 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/80 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <CoursesIllustration className="w-7 h-7 transition-transform group-hover:scale-105" />
              </div>
              <div className="w-6 h-6 rounded-full bg-white/90 group-hover:bg-white text-indigo-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-indigo-200">
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div className="pt-2 text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                Courses
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-tight line-clamp-1 mt-0.5">
                {isTeacher
                  ? 'Structured multi-day digital courses.'
                  : 'Access assigned interactive course lessons.'}
              </p>
            </div>
          </div>

          {/* Card 3: Classmates (Soft Purple) */}
          <div
            onClick={() => handleSelectTab('roster')}
            className={`rounded-[20px] p-3.5 sm:p-4 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden min-h-[110px] sm:min-h-[118px] ${
              activeTab === 'roster'
                ? 'bg-[#f3edf9] border-purple-300 shadow-md ring-2 ring-purple-400/50'
                : 'bg-[#f3edf9] border-purple-100/90 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/80 border border-purple-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <StudentsIllustration className="w-7 h-7 transition-transform group-hover:scale-105" />
              </div>
              <div className="w-6 h-6 rounded-full bg-white/90 group-hover:bg-white text-purple-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-purple-200">
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div className="pt-2 text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                {isTeacher ? 'Students' : 'Classmates'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-tight line-clamp-1 mt-0.5">
                {isTeacher
                  ? 'View students, progress and engagement.'
                  : 'View classmates & learning progress.'}
              </p>
            </div>
          </div>

          {/* Card 4: Resources (Soft Pink) */}
          <div
            onClick={() => handleSelectTab('resources')}
            className={`rounded-[20px] p-3.5 sm:p-4 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden min-h-[110px] sm:min-h-[118px] ${
              activeTab === 'resources'
                ? 'bg-[#faecea] border-rose-300 shadow-md ring-2 ring-rose-400/50'
                : 'bg-[#faecea] border-rose-100/90 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/80 border border-rose-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                <ResourcesIllustration className="w-7 h-7 transition-transform group-hover:scale-105" />
              </div>
              <div className="w-6 h-6 rounded-full bg-white/90 group-hover:bg-white text-rose-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs border border-rose-200">
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
            <div className="pt-2 text-left">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                Resources
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-tight line-clamp-1 mt-0.5">
                {isTeacher
                  ? 'Access learning materials, files and links.'
                  : 'Access learning materials, files and links.'}
              </p>
            </div>
          </div>

        </section>

        {/* Contextual Active Live Quiz Banner (Upgraded to match Reference Design) */}
        {activeLiveQuizSession && (effectiveLiveQuizState === 'live' || effectiveLiveQuizState === 'scheduled') && (() => {
          const totalQuestions = activeLiveQuizSession.quiz?.questions?.length || 10;
          const durationMinutes = activeLiveQuizSession.quiz?.timer_seconds
            ? Math.ceil(activeLiveQuizSession.quiz.timer_seconds / 60)
            : Math.ceil((totalQuestions * (activeLiveQuizSession.question_duration_sec || 20)) / 60) || 15;
          const isLive = effectiveLiveQuizState === 'live';

          return (
            <div className="relative bg-gradient-to-r from-sky-50 via-blue-50/70 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
              {/* Subtle Decorative Educational Vectors */}
              <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-none overflow-hidden select-none opacity-40">
                <svg className="w-full h-full text-blue-400" viewBox="0 0 320 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M40,90 Q120,20 220,50 T310,30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.6"/>
                  <g transform="translate(200, 30) rotate(-15) scale(0.75)">
                    <polygon points="0,15 30,0 20,25 15,18" fill="currentColor" opacity="0.3"/>
                    <polygon points="30,0 15,18 20,25" fill="currentColor" opacity="0.5"/>
                  </g>
                  <g transform="translate(260, 20) scale(0.9)">
                    <polygon points="25,5 50,16 25,27 0,16" fill="currentColor" opacity="0.35"/>
                    <path d="M10,21 L10,32 C10,37 40,37 40,32 L40,21" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4"/>
                    <path d="M42,20 L47,30 L45,33 L43,30" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  </g>
                </svg>
              </div>

              {/* Left & Center Content */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 flex-1 min-w-0">
                {/* Quiz Cover Thumbnail */}
                <div className="relative w-full sm:w-44 sm:h-24 h-32 rounded-xl overflow-hidden shadow-xs bg-slate-900 shrink-0">
                  <img
                    src={getQuizCover(activeLiveQuizSession.quiz)}
                    alt={activeLiveQuizSession.quiz?.title || 'Live Quiz'}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_QUIZ_COVER;
                    }}
                    className="w-full h-full object-cover"
                  />
                  {/* Status Overlay Badge on Cover */}
                  <div className="absolute top-2 left-2">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE QUIZ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        <Clock className="w-2.5 h-2.5" />
                        STARTING SOON
                      </span>
                    )}
                  </div>
                </div>

                {/* Center Details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black tracking-wider uppercase inline-flex items-center gap-1.5 text-[#026fc3]">
                      {isLive ? (
                        <>
                          <span>JOIN NOW</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        </>
                      ) : (
                        <>
                          <span>STARTING SOON</span>
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                    {activeLiveQuizSession.quiz?.title || (activeLiveQuizSession as any).title || 'Live Quiz'}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-1">
                    {activeLiveQuizSession.quiz?.description ||
                      (isLive
                        ? 'Test your knowledge with your classmates in real time!'
                        : 'A scheduled quiz is starting soon! Enter the waiting lobby now.')}
                  </p>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 flex-wrap pt-1">
                    <div className="inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{totalQuestions} Questions</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{durationMinutes} Minutes</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 truncate max-w-[200px]">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Class: {classroom.title}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Action & Countdown */}
              <div className="relative z-10 flex flex-col items-start sm:items-end justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-100">
                <button
                  type="button"
                  disabled={isJoiningLiveQuiz}
                  onClick={() => {
                    if (isTeacher) {
                      if (activeLiveQuizSession.status === 'in_progress' || activeLiveQuizSession.status === 'reveal') {
                        navigate(`/classes/${id}/live-quiz/host/${activeLiveQuizSession.id}`);
                      } else {
                        navigate(`/classes/${id}/live-quiz/lobby/${activeLiveQuizSession.pin}`);
                      }
                    } else {
                      handleStudentJoinLiveQuiz();
                    }
                  }}
                  className="px-6 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <span>
                    {isTeacher
                      ? 'Host Controls →'
                      : isJoiningLiveQuiz
                      ? 'Connecting...'
                      : isLive
                      ? 'Join Now →'
                      : 'Join Lobby →'}
                  </span>
                </button>
                {!isLive && (
                  <span className="text-[11px] font-bold text-slate-500">
                    Starts in {scheduledCountdownText || 'a few moments'}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* SECTION 3 — CLASS STREAM (Announcements, Posts & Updates)                  */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">
                Class Stream
              </h2>
              <span className="text-[11px] font-bold text-slate-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                Announcements & Updates
              </span>
            </div>
          </div>

          <ClassroomMessages
            classroomId={classroom.id}
            messages={messages}
            isTeacher={isTeacher}
            onMessageUpdated={loadAllClassroomData}
          />
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4 — CLASSROOM ACTIVITIES & LEARNING (5 Action Cards)               */}
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
            <div className={`bg-white rounded-[24px] p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden ${
              effectiveLiveQuizState === 'live'
                ? 'border-emerald-400/80 ring-2 ring-emerald-400/20'
                : effectiveLiveQuizState === 'scheduled'
                ? 'border-amber-400/80 ring-2 ring-amber-400/20'
                : 'border-stone-200/70'
            }`}>
              {effectiveLiveQuizState === 'live' && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Live Now
                </div>
              )}
              {effectiveLiveQuizState === 'scheduled' && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                  <Clock className="w-3 h-3 animate-pulse" />
                  <span>{scheduledCountdownText ? `Starts ${scheduledCountdownText}` : 'Starting Soon'}</span>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <LiveQuizIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-sm font-black text-slate-900">Live Quiz</h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? effectiveLiveQuizState === 'live'
                        ? 'A live quiz session is currently running.'
                        : effectiveLiveQuizState === 'scheduled'
                        ? 'A quiz is scheduled and waiting to start.'
                        : 'Conduct live quizzes, engage students in real time.'
                      : effectiveLiveQuizState === 'live'
                      ? 'A live quiz is currently in session! Click below to join directly.'
                      : effectiveLiveQuizState === 'scheduled'
                      ? 'A quiz is starting soon! Enter the waiting lobby.'
                      : 'Join real-time classroom quizzes directly without a PIN.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isJoiningLiveQuiz}
                onClick={() => {
                  if (isTeacher) {
                    if (activeLiveQuizSession?.pin && (effectiveLiveQuizState === 'live' || effectiveLiveQuizState === 'scheduled')) {
                      if (activeLiveQuizSession.status === 'in_progress' || activeLiveQuizSession.status === 'reveal') {
                        navigate(`/classes/${id}/live-quiz/host/${activeLiveQuizSession.id}`);
                      } else {
                        navigate(`/classes/${id}/live-quiz/lobby/${activeLiveQuizSession.pin}`);
                      }
                    } else {
                      setLiveQuizBankOpen(true);
                    }
                  } else {
                    handleStudentJoinLiveQuiz();
                  }
                }}
                className={`w-full py-2.5 px-4 text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer ${
                  effectiveLiveQuizState === 'live'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 animate-pulse'
                    : effectiveLiveQuizState === 'scheduled'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25'
                    : 'bg-[#026fc3] hover:bg-[#03589e]'
                }`}
              >
                {isTeacher
                  ? effectiveLiveQuizState === 'live' || effectiveLiveQuizState === 'scheduled'
                    ? 'Host Controls →'
                    : 'Host Live Quiz'
                  : isJoiningLiveQuiz
                  ? 'Connecting...'
                  : effectiveLiveQuizState === 'live'
                  ? 'Join Active Quiz Now →'
                  : effectiveLiveQuizState === 'scheduled'
                  ? 'Join Waiting Lobby →'
                  : 'Join Quiz'}
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
                    {isTeacher ? 'Assessment & Survey' : 'Exams'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Visual Canva-style builder, question bank & AI generator.'
                      : 'Take scheduled timed assessments and review results.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isTeacher) {
                    setAssessmentTypeModalOpen(true);
                  } else {
                    handleSelectTab('exams');
                  }
                }}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-full text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Create Assessment' : 'View Exams'}
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
            {activeTab === 'exams' && (() => {
              const visibleExams = isTeacher
                ? exams
                : exams.filter((e) => e.status === 'published' || e.status === 'active');

              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                    <div>
                      <h2 className="text-base font-black text-slate-900">Assessments & Surveys Studio</h2>
                      <p className="text-xs text-slate-500 font-semibold">{visibleExams.length} active assessments & surveys</p>
                    </div>
                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => setAssessmentTypeModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Assessment</span>
                      </button>
                    )}
                  </div>

                  {visibleExams.length === 0 ? (
                    <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-2">
                      <Award className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-500">No assessments or surveys created for this classroom.</p>
                      <p className="text-[11px] text-slate-400">
                        {isTeacher
                          ? 'Click "+ Create Assessment" to launch the Canva-style visual builder.'
                          : 'Check back when your teacher announces an assessment.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleExams.map((exam) => {
                        const isSurveyItem = (exam as any).assessment_type === 'survey';

                        return (
                          <div key={exam.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isSurveyItem ? 'text-amber-700 bg-amber-50' : 'text-indigo-700 bg-indigo-50'
                                }`}>
                                  {isSurveyItem ? 'Survey' : `${exam.duration_minutes} Mins`}
                                </span>
                                <span className="text-xs font-extrabold text-slate-600">
                                  {isSurveyItem ? 'Feedback / Poll' : `${exam.total_marks} Marks Total`}
                                </span>
                              </div>

                              <h3 className="text-base font-black text-slate-900 mt-2">{exam.title}</h3>
                              {exam.description && (
                                <p className="text-xs text-slate-500 mt-1 font-medium">{exam.description}</p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              {exam.latest_result ? (
                                <span className="text-xs font-black text-emerald-600 truncate">
                                  {isSurveyItem
                                    ? 'Submitted'
                                    : `Score: ${exam.latest_result.score} / ${exam.total_marks} (${exam.latest_result.percentage}%)`}
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

                              <div className="flex items-center gap-1.5">
                                {isTeacher && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const url = `${window.location.origin}/classes/${classroom.id}/exams/${exam.id}`;
                                        try {
                                          await navigator.clipboard.writeText(url);
                                          setCopiedExamCardId(exam.id);
                                          setTimeout(() => setCopiedExamCardId(null), 2500);
                                        } catch (e) {}
                                      }}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                      title="Copy direct student exam link"
                                    >
                                      {copiedExamCardId === exam.id ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          <span className="text-emerald-700 font-extrabold">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                                          <span>Copy Link</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => navigate(`/classes/${classroom.id}/assessments/builder/${exam.id}`)}
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                      title="Edit in Assessment Studio"
                                    >
                                      Edit Studio
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => navigate(`/classes/${classroom.id}/exams/${exam.id}`)}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  {exam.latest_result ? 'View Result' : isSurveyItem ? 'Take Survey' : 'Take Exam'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

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
          setAssessmentTypeModalOpen(true);
        }}
      />

      <OCRGradingModal
        isOpen={ocrModalOpen}
        classroomId={classroom.id}
        members={members}
        onClose={() => setOcrModalOpen(false)}
        onSuccess={loadAllClassroomData}
      />

      <ExamPlatformModal
        isOpen={examModalOpen}
        classroomId={classroom.id}
        isTeacher={isTeacher}
        activeExam={selectedExam}
        initialTab={isTeacher ? (selectedExam ? 'results' : 'creator') : (selectedExam?.latest_result ? 'results' : 'taking')}
        onClose={() => {
          setExamModalOpen(false);
          setSelectedExam(null);
        }}
        onSuccess={loadAllClassroomData}
      />

      <AssessmentTypeSelectionModal
        isOpen={assessmentTypeModalOpen}
        onClose={() => setAssessmentTypeModalOpen(false)}
        onSelectType={(type) => {
          setAssessmentTypeModalOpen(false);
          navigate(`/classes/${classroom.id}/assessments/builder?type=${type}`);
        }}
        onOpenLibrary={() => {
          setAssessmentTypeModalOpen(false);
          setExamLibraryOpen(true);
        }}
      />

      <ExamLibraryModal
        isOpen={examLibraryOpen}
        classroomId={classroom.id}
        onClose={() => setExamLibraryOpen(false)}
        onExamRepublished={loadAllClassroomData}
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
        onSelectQuiz={handleOpenLaunchDecision}
        onCreateCustomQuiz={() => setCreateLiveQuizOpen(true)}
      />

      <CreateLiveQuizModal
        isOpen={createLiveQuizOpen}
        classroomId={classroom.id}
        onClose={() => setCreateLiveQuizOpen(false)}
        onSuccess={handleOpenLaunchDecision}
      />

      <LiveQuizLaunchDecisionModal
        isOpen={launchDecisionModalOpen}
        quiz={quizToLaunch}
        onClose={() => {
          setLaunchDecisionModalOpen(false);
          setQuizToLaunch(null);
        }}
        onLaunchNow={handleLaunchNow}
        onScheduleQuiz={handleScheduleQuiz}
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
