import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  MessageSquare,
  Folder,
  Trophy,
  Award,
  Sparkles,
  Plus,
  Layers,
  Zap
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

import { ClassroomHeader } from '@/components/classes/ClassroomHeader';
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
import { ClassroomAIFeedbackModal } from '@/components/classes/ClassroomAIFeedbackModal';
import { LiveQuizBankModal } from '@/components/classes/live-quiz/LiveQuizBankModal';
import { CreateLiveQuizModal } from '@/components/classes/live-quiz/CreateLiveQuizModal';

type TabType = 'overview' | 'assignments' | 'roster' | 'stream' | 'resources' | 'leaderboard' | 'exams' | 'live-quiz';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isTeacher: authIsTeacher } = useAuth();

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

  // Modals state
  const [activeSubmitAssignment, setActiveSubmitAssignment] = useState<Assignment | null>(null);
  const [activeReviewAssignment, setActiveReviewAssignment] = useState<Assignment | null>(null);
  const [activityHubOpen, setActivityHubOpen] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ClassroomExam | null>(null);
  const [aiReportModalOpen, setAiReportModalOpen] = useState(false);

  // Live Quiz State
  const [liveQuizBankOpen, setLiveQuizBankOpen] = useState(false);
  const [createLiveQuizOpen, setCreateLiveQuizOpen] = useState(false);

  // Quick Assignment Creation Inline State
  const [showQuickCreateTask, setShowQuickCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskPoints, setTaskPoints] = useState(100);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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

  if (loading || !classroom) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#026fc3] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-extrabold text-slate-500">Loading digital classroom...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Classroom Banner & Header */}
      <ClassroomHeader
        classroom={classroom}
        invite={invite}
        onOpenAIFeedback={() => setAiReportModalOpen(true)}
      />

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#026fc3] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'assignments'
              ? 'bg-[#026fc3] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Tasks ({assignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-[#026fc3] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Students ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stream')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'stream'
              ? 'bg-[#026fc3] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Stream</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-[#026fc3] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Resources ({buckets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-[#026fc3] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-[#026fc3] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Exams ({exams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('live-quiz')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
            activeTab === 'live-quiz'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Live Quiz</span>
        </button>
      </div>

      {/* Main Tab Content Display */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left 2 Cols: Assignments & Stream overview */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Create Task Form Modal/Inline (Teacher) */}
            {isTeacher && showQuickCreateTask && (
              <form onSubmit={handleCreateTaskSubmit} className="bg-white p-6 rounded-3xl border-2 border-brand-200 shadow-md space-y-4 animate-in fade-in">
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
                    placeholder="Assignment Title (e.g. Weekly Reading Analysis)"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={taskInstructions}
                    onChange={(e) => setTaskInstructions(e.target.value)}
                    placeholder="Instructions and assignment requirements..."
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
                    className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#03589e] text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all"
                  >
                    {isCreatingTask ? 'Publishing...' : 'Publish Task'}
                  </button>
                </div>
              </form>
            )}

            {/* Assignments Widget */}
            <AssignmentList
              assignments={assignments}
              isTeacher={isTeacher}
              onCreateAssignment={() => setShowQuickCreateTask(true)}
              onOpenSubmissions={(a) => setActiveReviewAssignment(a)}
              onSubmitWork={(a) => setActiveSubmitAssignment(a)}
              onDeleteAssignment={handleDeleteAssignment}
            />

            {/* Stream Announcements Widget */}
            <ClassroomMessages
              classroomId={classroom.id}
              messages={messages}
              isTeacher={isTeacher}
              onMessageUpdated={loadAllClassroomData}
            />

          </div>

          {/* Right Col: Leaderboard Preview & Activity Hub Shortcut */}
          <div className="space-y-6">
            
            {/* Activity Hub Launcher (Teacher) */}
            {isTeacher && (
              <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white rounded-3xl p-6 shadow-md space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-200" />
                  <h3 className="text-sm font-black text-white">Teacher Activity Hub</h3>
                </div>
                <p className="text-xs text-purple-100 font-medium leading-relaxed">
                  Quickly assign multiple-choice exams, launch AI OCR worksheet evaluations, or build new learning modules.
                </p>
                <button
                  type="button"
                  onClick={() => setActivityHubOpen(true)}
                  className="w-full py-2.5 bg-white text-purple-900 hover:bg-purple-50 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Open Activity Hub
                </button>
              </div>
            )}

            {/* Leaderboard Card Widget */}
            <ClassroomLeaderboard
              entries={leaderboard}
              currentUserId={user?.id}
            />

          </div>

        </div>
      )}

      {activeTab === 'assignments' && (
        <AssignmentList
          assignments={assignments}
          isTeacher={isTeacher}
          onCreateAssignment={() => setShowQuickCreateTask(true)}
          onOpenSubmissions={(a) => setActiveReviewAssignment(a)}
          onSubmitWork={(a) => setActiveSubmitAssignment(a)}
          onDeleteAssignment={handleDeleteAssignment}
        />
      )}

      {activeTab === 'roster' && (
        <StudentRoster
          classroomId={classroom.id}
          members={members}
          isTeacher={isTeacher}
          onMemberRemoved={loadAllClassroomData}
        />
      )}

      {activeTab === 'stream' && (
        <ClassroomMessages
          classroomId={classroom.id}
          messages={messages}
          isTeacher={isTeacher}
          onMessageUpdated={loadAllClassroomData}
        />
      )}

      {activeTab === 'resources' && (
        <ClassroomResources
          classroomId={classroom.id}
          buckets={buckets}
          isTeacher={isTeacher}
          onUpdated={loadAllClassroomData}
          onOpenActivityHub={() => setActivityHubOpen(true)}
        />
      )}

      {activeTab === 'leaderboard' && (
        <ClassroomLeaderboard
          entries={leaderboard}
          currentUserId={user?.id}
        />
      )}

      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Exam</span>
              </button>
            )}
          </div>

          {exams.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs space-y-2">
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
                <div key={exam.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
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
                        {exam.questions.length} questions
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExam(exam);
                        setExamModalOpen(true);
                      }}
                      className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer"
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

      {/* Live Quiz Tab Display */}
      {activeTab === 'live-quiz' && (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-[#026fc3] text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multiplayer Classroom Games</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">Interactive Live Quizzes</h2>
              <p className="text-xs sm:text-sm text-purple-100 font-medium leading-relaxed">
                Host synchronized, fast-paced live games. Students compete on their devices in real-time with speed bonuses and live podium rankings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isTeacher ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLiveQuizBankOpen(true)}
                    className="px-5 py-3 bg-white text-purple-900 hover:bg-purple-50 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-purple-600 fill-current" />
                    <span>Open Quiz Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateLiveQuizOpen(true)}
                    className="px-5 py-3 bg-purple-950/40 hover:bg-purple-950/60 text-white border border-white/20 rounded-2xl text-xs font-black shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Quiz</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/classes/live-quiz/join')}
                  className="px-6 py-3.5 bg-white text-purple-900 hover:bg-purple-50 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 text-purple-600 fill-current" />
                  <span>Enter 6-Digit PIN</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                1
              </div>
              <h3 className="text-sm font-black text-slate-900">Synchronized Multiplayer</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Supabase Realtime ensures all devices display questions and countdowns simultaneously with zero latency lag.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-black">
                2
              </div>
              <h3 className="text-sm font-black text-slate-900">Speed Bonus Scoring</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Earn 500 to 1,000 points per question. Faster correct responses get higher speed multipliers!
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                3
              </div>
              <h3 className="text-sm font-black text-slate-900">Classroom Points Ledger</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                All game scores instantly feed into the Classroom Leaderboard points total for the term.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
        isTeacher={isTeacher && !selectedExam}
        activeExam={selectedExam}
        onClose={() => {
          setExamModalOpen(false);
          setSelectedExam(null);
        }}
        onSuccess={loadAllClassroomData}
      />

      <ClassroomAIFeedbackModal
        isOpen={aiReportModalOpen}
        classroom={classroom}
        stats={stats}
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

    </div>
  );
};
