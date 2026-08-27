import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  Sparkles,
  Plus,
  ArrowRight,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  MessageSquareShare
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
  BottomBannerIllustration
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

type TabType = 'overview' | 'assignments' | 'roster' | 'stream' | 'resources' | 'leaderboard' | 'exams' | 'live-quiz';

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
  const [leaderboard, setLeaderboard] = useState<ClassroomLeaderboardEntry[]>([]);
  const [stats, setStats] = useState<IClassroomStats>({
    total_students: 0,
    total_assignments: 0,
    total_submissions: 0,
    average_completion_percent: 0,
    average_score: 0
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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

  const contentSectionRef = useRef<HTMLDivElement>(null);

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
        statsData
      ] = await Promise.all([
        classroomService.getClassroomById(id),
        classroomService.getOrCreateInvite(id),
        classroomService.getClassroomMembers(id),
        assignmentService.getAssignmentsByClassroom(id),
        classroomMessageService.getMessages(id),
        classroomResourceService.getBucketsByClassroom(id),
        classroomExamService.getExamsByClassroom(id),
        classroomPointsService.getClassroomLeaderboard(id),
        classroomService.getClassroomStats(id)
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

  const displayName =
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    classroom?.teacher?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    (isTeacher ? 'Teacher' : 'Student');

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    if (contentSectionRef.current) {
      contentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  if (loading || !classroom) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-extrabold text-slate-600">Loading EdTechra Digital Classroom...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-800 py-6 sm:py-8">
      {/* MAIN DIGITAL CLASSROOM WORKSPACE */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* TOP CLASSROOM NAVIGATION & BREADCRUMB */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link
              to="/classes"
              className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-full transition-all border border-indigo-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Classes</span>
            </Link>

            <span className="text-slate-300">/</span>

            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-100">
              {classroom.subject || 'Class'}
            </span>

            {classroom.grade && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold">
                {classroom.grade}
              </span>
            )}

            <h2 className="text-sm sm:text-base font-black text-slate-900 truncate max-w-[240px] sm:max-w-md">
              {classroom.title}
            </h2>
          </div>

          {isTeacher && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAiReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-3.5 py-1.5 rounded-full transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Classroom Report</span>
              </button>
            </div>
          )}
        </div>

        {/* GREETING HERO HEADER */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold">
            {isTeacher
              ? 'Manage your class, engage students and track progress.'
              : 'View your tasks, track your progress and learn with your class.'}
          </p>
        </div>

          {/* ========================================================================= */}
          {/* LAYER 1: FIVE CLASSROOM NAVIGATION CARDS                                  */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            
            {/* Card 1: Overview */}
            <div
              onClick={() => handleSelectTab('overview')}
              className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
                activeTab === 'overview'
                  ? 'bg-[#eaf4ff] border-sky-300 shadow-md ring-2 ring-sky-400/50'
                  : 'bg-[#f0f7ff] border-sky-100 hover:border-sky-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <OverviewIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-black text-slate-900">Overview</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    See class summary, performance & activity.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <div className="w-8 h-8 rounded-full bg-sky-200/80 group-hover:bg-sky-300 text-sky-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 2: Tasks / My Tasks */}
            <div
              onClick={() => handleSelectTab('assignments')}
              className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
                activeTab === 'assignments'
                  ? 'bg-[#e6f9ed] border-emerald-300 shadow-md ring-2 ring-emerald-400/50'
                  : 'bg-[#f0fdf4] border-emerald-100 hover:border-emerald-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <TaskIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-black text-slate-900">
                    {isTeacher ? 'Tasks' : 'My Tasks'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Create, manage and review assignments.'
                      : 'View assigned tasks, due dates and submit work.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <div className="w-8 h-8 rounded-full bg-emerald-200/80 group-hover:bg-emerald-300 text-emerald-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 3: Students / Classmates */}
            <div
              onClick={() => handleSelectTab('roster')}
              className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
                activeTab === 'roster'
                  ? 'bg-[#eee9fe] border-purple-300 shadow-md ring-2 ring-purple-400/50'
                  : 'bg-[#f5f3ff] border-purple-100 hover:border-purple-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <StudentsIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-black text-slate-900">
                    {isTeacher ? 'Students' : 'Classmates'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'View students, progress and engagement.'
                      : 'View classmates and classroom leaderboard.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <div className="w-8 h-8 rounded-full bg-purple-200/80 group-hover:bg-purple-300 text-purple-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 4: Stream */}
            <div
              onClick={() => handleSelectTab('stream')}
              className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
                activeTab === 'stream'
                  ? 'bg-[#fef9c3] border-amber-300 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-[#fefce8] border-amber-100 hover:border-amber-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <StreamIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-black text-slate-900">Stream</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    View class updates, announcements & posts.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <div className="w-8 h-8 rounded-full bg-amber-200/80 group-hover:bg-amber-300 text-amber-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 5: Resources */}
            <div
              onClick={() => handleSelectTab('resources')}
              className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden ${
                activeTab === 'resources'
                  ? 'bg-[#ffe4e6] border-rose-300 shadow-md ring-2 ring-rose-400/50'
                  : 'bg-[#fff1f2] border-rose-100 hover:border-rose-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <ResourcesIllustration className="w-24 h-20 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-black text-slate-900">Resources</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Access learning materials, files and links.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <div className="w-8 h-8 rounded-full bg-rose-200/80 group-hover:bg-rose-300 text-rose-900 flex items-center justify-center transition-all group-hover:translate-x-0.5 shadow-2xs">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* SECTION DIVIDER                                                           */}
          {/* ========================================================================= */}
          <div className="flex items-center gap-4 py-3">
            <div className="flex-1 h-[2px] bg-slate-200 flex items-center justify-end">
              <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-wider uppercase px-2 text-center select-none">
              {isTeacher ? 'ASSIGN YOUR STUDENTS' : 'CLASSROOM ACTIVITIES & LEARNING'}
            </h2>
            <div className="flex-1 h-[2px] bg-slate-200 flex items-center justify-start">
              <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LAYER 2: FIVE ASSESSMENT & ENGAGEMENT FEATURE CARDS                        */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            
            {/* Card 1: Assign Your Students (Teacher) / My Tasks (Student) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <AssignStudentsIllustration className="w-28 h-24 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-base font-black text-slate-900">
                    {isTeacher ? 'Assign Your Students' : 'My Tasks'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Assign tasks, lessons or activities to selected students or groups.'
                      : 'Complete lessons, practice exercises, and submit homework assignments.'}
                  </p>
                </div>
              </div>
              {isTeacher ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivityHubOpen(true);
                    }}
                    className="flex-1 py-2.5 px-3 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTaskDashboardOpen(true);
                    }}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer"
                  >
                    Dashboard
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTaskDashboardOpen(true);
                  }}
                  className="w-full py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Open Tasks
                </button>
              )}
            </div>

            {/* Card 2: Live Quiz */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <LiveQuizIllustration className="w-28 h-24 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-base font-black text-slate-900">Live Quiz</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Conduct live quizzes, engage students in real time and view results instantly.'
                      : 'Join real-time classroom quizzes with a game PIN and compete with classmates.'}
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
                className="w-full py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Host Live Quiz' : 'Join Quiz'}
              </button>
            </div>

            {/* Card 3: Exam (Teacher) / Exams (Student) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <ExamIllustration className="w-28 h-24 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-base font-black text-slate-900">
                    {isTeacher ? 'Exam' : 'Exams'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Create exams, set time limits and evaluate student performance.'
                      : 'Take scheduled timed assessments and review your exam results.'}
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
                className="w-full py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Create Exam' : 'View Exams'}
              </button>
            </div>

            {/* Card 4: OCR Assessment (Teacher) / My Assessments (Student) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <OCRIllustration className="w-28 h-24 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-base font-black text-slate-900">
                    {isTeacher ? 'OCR Assessment' : 'My Assessments'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Upload handwritten papers and get AI evaluation with smart feedback.'
                      : 'View your graded worksheet feedback and official AI evaluation reports.'}
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
                className="w-full py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Grade Worksheets' : 'View Evaluations'}
              </button>
            </div>

            {/* Card 5: Competition (Teacher) / Challenges (Student) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4 group">
              <div className="space-y-3">
                <div className="flex justify-center py-1">
                  <CompetitionIllustration className="w-28 h-24 transition-transform group-hover:scale-105" />
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-base font-black text-slate-900">
                    {isTeacher ? 'Competition' : 'Challenges'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {isTeacher
                      ? 'Create challenges, collect student work and let AI evaluate submissions automatically.'
                      : 'Participate in creative writing & problem-solving challenges evaluated by AI.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChallengeListModalOpen(true)}
                className="w-full py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {isTeacher ? 'Challenge Dashboard' : 'Open Challenges'}
              </button>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BOTTOM CLASSROOM INFORMATION BANNER                                       */}
          {/* ========================================================================= */}
          <div className="rounded-3xl bg-slate-100/90 border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5 text-left">
              <span className="text-2xl shrink-0" role="img" aria-label="lightbulb">💡</span>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-[#6366f1]">
                  Empower your classroom, inspire your students.
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  Everything you need to teach, assess and motivate—all in one place.
                </p>
              </div>
            </div>
            <div className="hidden sm:block shrink-0 opacity-90">
              <BottomBannerIllustration className="w-36 h-16" />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ACTIVE TAB CONTENT DISPLAY SECTION                                        */}
          {/* ========================================================================= */}
          <div ref={contentSectionRef} className="pt-4 space-y-6">
            
            {/* Quick Share Banner for Invite Code */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Classroom Invite Code</div>
                  <div className="text-base font-black text-slate-900 font-mono tracking-widest">{inviteCode}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyInvite}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedInvite ? 'Copied!' : 'Copy Code & Link'}</span>
                </button>

                {isTeacher && (
                  <button
                    onClick={handleWhatsAppShare}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquareShare className="w-3.5 h-3.5" />
                    <span>Share via WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Secondary Navigation Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 overflow-x-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Overview & Feed
                </button>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    activeTab === 'assignments'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isTeacher ? 'Tasks' : 'My Tasks'} ({assignments.length})
                </button>
                <button
                  onClick={() => setActiveTab('roster')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    activeTab === 'roster'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isTeacher ? 'Students' : 'Classmates'} ({members.length})
                </button>
                <button
                  onClick={() => setActiveTab('stream')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    activeTab === 'stream'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Stream ({messages.length})
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    activeTab === 'resources'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Resources ({buckets.length})
                </button>
                <button
                  onClick={() => setActiveTab('exams')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    activeTab === 'exams'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Exams ({exams.length})
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Leaderboard
                </button>
              </div>

              {isTeacher && (
                <button
                  onClick={() => setShowQuickCreateTask(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shrink-0 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Task</span>
                </button>
              )}
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left 2 Columns: Tasks list & Stream messages */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Inline Quick Task Creation (Teacher) */}
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

                  {/* Tasks List */}
                  <AssignmentList
                    assignments={assignments}
                    isTeacher={isTeacher}
                    onCreateAssignment={() => setShowQuickCreateTask(true)}
                    onOpenSubmissions={(a) => setActiveReviewAssignment(a)}
                    onSubmitWork={(a) => setActiveSubmitAssignment(a)}
                    onDeleteAssignment={handleDeleteAssignment}
                  />

                  {/* Stream Messages */}
                  <ClassroomMessages
                    classroomId={classroom.id}
                    messages={messages}
                    isTeacher={isTeacher}
                    onMessageUpdated={loadAllClassroomData}
                  />
                </div>

                {/* Right Column: Leaderboard & AI Feedback hub */}
                <div className="space-y-6">
                  {/* AI Report Card (Teacher Only) */}
                  {isTeacher && (
                    <div className="bg-gradient-to-br from-[#6366f1] via-indigo-700 to-[#7c3aed] text-white rounded-3xl p-6 shadow-md space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-200" />
                        <h3 className="text-sm font-black text-white">AI Teaching Intelligence</h3>
                      </div>
                      <p className="text-xs text-indigo-100 font-medium leading-relaxed">
                        Understand your classroom. Know what to teach next.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAiReportModalOpen(true)}
                        className="w-full py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        Open Teaching Intelligence
                      </button>
                    </div>
                  )}

                  {/* Leaderboard Card */}
                  <ClassroomLeaderboard
                    entries={leaderboard}
                    currentUserId={user?.id}
                  />
                </div>

              </div>
            )}

            {/* TAB: ASSIGNMENTS (TASK) */}
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
                        placeholder="Assignment Title"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        value={taskInstructions}
                        onChange={(e) => setTaskInstructions(e.target.value)}
                        placeholder="Instructions and requirements..."
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

            {/* TAB: STUDENTS (ROSTER) */}
            {activeTab === 'roster' && (
              <StudentRoster
                classroomId={classroom.id}
                members={members}
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

            {/* TAB: LEADERBOARD / COMPETITION */}
            {activeTab === 'leaderboard' && (
              <ClassroomLeaderboard
                entries={leaderboard}
                currentUserId={user?.id}
              />
            )}

          </div>

          {/* DANGER ZONE (Teacher/Admin) */}
          {isTeacher && classroom && (
            <ClassroomDangerZone
              classroom={classroom}
              isOwnerOrAdmin={isTeacher}
              stats={stats}
            />
          )}

        </main>

      {/* ALL MODALS PRESERVED */}
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
