import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  FileText,
  CheckCircle2,
  Users,
  Search,
  Eye,
  Edit3,
  Loader2,
  ChevronRight,
  Upload,
  Sparkles,
  Calendar,
  Camera
} from 'lucide-react';
import {
  ClassroomTask,
  TaskSubmission
} from '@/types/classroomTask';
import { ClassroomMember } from '@/types/classroom';
import { classroomTaskService } from '@/services/classroomTaskService';
import { useClassroomAuth } from '@/hooks/useClassroomAuth';
import { supabase } from '@/lib/supabase';
import { CreateTaskModal } from './CreateTaskModal';
import { StudentTaskModal } from './StudentTaskModal';
import { TaskHandwrittenUploadModal } from './TaskHandwrittenUploadModal';
import { QuickAssessmentModal } from './QuickAssessmentModal';

interface TaskDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  isTeacher?: boolean;
  members?: ClassroomMember[];
}

export const TaskDashboardModal: React.FC<TaskDashboardModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  isTeacher: isTeacherProp,
  members: membersProp = []
}) => {
  const classroomAuth = useClassroomAuth(classroomId);
  const isTeacher = isTeacherProp ?? classroomAuth.isTeacher;
  const isRoleResolving = classroomAuth.isLoading && !isTeacher;

  const [tasks, setTasks] = useState<ClassroomTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<ClassroomMember[]>(membersProp);

  // Submodals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickAssessmentOpen, setIsQuickAssessmentOpen] = useState(false);
  const [activeTaskIdForStudent, setActiveTaskIdForStudent] = useState<string | null>(null);

  // Teacher Handwritten Upload Modal State (Evaluate Classroom Work)
  const [isHandwrittenUploadOpen, setIsHandwrittenUploadOpen] = useState(false);
  const [handwrittenTaskId, setHandwrittenTaskId] = useState<string | null>(null);
  const [handwrittenStudentId, setHandwrittenStudentId] = useState<string | null>(null);

  // Teacher Review Submissions Modal
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selectedSubForOverride, setSelectedSubForOverride] = useState<TaskSubmission | null>(null);
  const [overrideScoreVal, setOverrideScoreVal] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  // View single student submission modal
  const [selectedSubForView, setSelectedSubForView] = useState<TaskSubmission | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await classroomTaskService.getTasks(classroomId);
      setTasks(data);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen, classroomId]);

  useEffect(() => {
    if (isOpen && classroomId && members.length === 0 && supabase) {
      supabase
        .from('classroom_members')
        .select(`
          id,
          classroom_id,
          profile_id,
          role,
          status,
          display_name,
          joined_at,
          profile:profiles!classroom_members_profile_id_fkey(id, full_name, email, avatar_url, role)
        `)
        .eq('classroom_id', classroomId)
        .eq('status', 'active')
        .then(({ data }) => {
          if (data) setMembers(data as any);
        });
    }
  }, [isOpen, classroomId]);

  // Students list only
  const studentMembers = members.filter((m) => {
    if (m.role === 'teacher' || m.role === 'co-teacher') return false;
    if (m.profile?.role === 'teacher' || m.profile?.role === 'admin') return false;
    return true;
  });

  const handleOpenReview = async (taskId: string) => {
    setReviewTaskId(taskId);
    setLoadingSubs(true);
    try {
      const subs = await classroomTaskService.getSubmissions(taskId);
      setTaskSubmissions(subs);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleSaveScoreOverride = async () => {
    if (!selectedSubForOverride) return;
    const num = Number(overrideScoreVal);
    if (isNaN(num) || num < 0) return;

    setOverriding(true);
    try {
      const res = await classroomTaskService.overrideScore(
        selectedSubForOverride.id,
        num,
        overrideReason
      );

      if (res.data && reviewTaskId) {
        setSelectedSubForOverride(null);
        const subs = await classroomTaskService.getSubmissions(reviewTaskId);
        setTaskSubmissions(subs);
        loadTasks();
      }
    } catch (err) {
      console.error('Error overriding score:', err);
    } finally {
      setOverriding(false);
    }
  };

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((t) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return t.title.toLowerCase().includes(term) || (t.subtitle || '').toLowerCase().includes(term);
  });

  const activeReviewTask = tasks.find((t) => t.id === reviewTaskId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#F8FCFB] w-full max-w-5xl rounded-3xl shadow-2xl border border-[#C9E5E2] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#071a1c] border-b border-[#0e3b40] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#159A9C] to-[#087477] text-white flex items-center justify-center font-black shadow-md shadow-[#159A9C]/25 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">Tasks</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-[#159A9C]/30 text-teal-200 border border-[#159A9C]/40">
                  {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-medium">
                {isTeacher
                  ? 'Collect and measure student learning evidence.'
                  : 'View assigned learning work, complete typed responses, or upload handwritten papers.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeacher && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create & Assign</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickAssessmentOpen(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#087477] hover:bg-[#065e60] text-white text-xs font-black transition-all shadow-xs border border-teal-400/30 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Quick Assessment</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-teal-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Title Strip */}
        <div className="px-6 py-3.5 bg-white border-b border-[#C9E5E2] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#173B3F]">
              Assigned Tasks
            </span>
            <span className="text-[11px] font-bold text-[#087477] bg-[#E8F7F5] border border-[#C9E5E2] px-2 py-0.5 rounded-full">
              {filteredTasks.length}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#36565A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
              className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-bold text-[#172B2F] placeholder:text-[#475569] focus:outline-none focus:border-[#159A9C] focus:ring-2 focus:ring-[#159A9C]/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Task Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-[#F8FCFB]">
          {(loading || isRoleResolving) && tasks.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#159A9C] animate-spin mx-auto" />
              <p className="text-xs text-[#36565A] font-bold">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-[#C9E5E2] p-8 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F7F5] text-[#087477] flex items-center justify-center mx-auto border border-[#C9E5E2]">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-[#173B3F]">No tasks found</h4>
              <p className="text-xs text-[#36565A] max-w-sm mx-auto font-medium">
                {isTeacher
                  ? 'Click "Create & Assign Task" above to publish your first classroom assignment.'
                  : 'Your teacher has not assigned any tasks yet. Check back soon!'}
              </p>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-[#087477] hover:bg-[#159A9C] text-white rounded-xl text-xs font-black shadow-sm cursor-pointer inline-flex items-center gap-2 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Task</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredTasks.map((t) => {
                const mySub = t.my_submission;
                const isCompleted = mySub && (mySub.status === 'graded' || mySub.completed_at != null);

                return (
                  <div
                    key={t.id}
                    className="p-5 rounded-2xl border border-[#C9E5E2] bg-white hover:border-[#159A9C] hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F7F5] text-[#087477] border border-[#C9E5E2]">
                          Task
                        </span>
                        <span className="text-[11px] font-black text-[#173B3F]">
                          {t.points} Points Total
                        </span>
                        {t.due_date && (
                          <span className="text-[10px] font-medium text-[#36565A] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#159A9C]" />
                            <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-[#173B3F] group-hover:text-[#087477] transition-colors">
                        {t.title}
                      </h3>

                      {t.subtitle && (
                        <p className="text-xs font-medium text-[#36565A]">
                          {t.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] font-bold text-[#36565A] pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#159A9C]" />
                          <span>{t.total_assigned || studentMembers.length} Assigned</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.completed_count || 0} Graded</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center flex-wrap">
                      {isTeacher ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setHandwrittenTaskId(t.id);
                              setHandwrittenStudentId(null);
                              setIsHandwrittenUploadOpen(true);
                            }}
                            className="px-3.5 py-2 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 border border-[#C9E5E2]"
                            title="Upload physical student work and evaluate"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Evaluate Work</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReview(t.id)}
                            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#173B3F] border border-[#C9E5E2] rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          >
                            <Users className="w-3.5 h-3.5 text-[#159A9C]" />
                            <span>Submissions ({t.submitted_count || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTaskIdForStudent(t.id)}
                            className="px-3.5 py-2 bg-[#087477] hover:bg-[#159A9C] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Task</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTaskIdForStudent(t.id)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-[#087477] hover:bg-[#159A9C] text-white'
                          }`}
                        >
                          <span>{isCompleted ? 'View Results' : mySub ? 'Continue' : 'Submit your Task'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Create Task Submodal */}
      {isCreateOpen && (
        <CreateTaskModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          classroomId={classroomId}
          members={members}
          onTaskCreated={loadTasks}
        />
      )}

      {/* Student Task Player Submodal */}
      {activeTaskIdForStudent && (
        <StudentTaskModal
          isOpen={Boolean(activeTaskIdForStudent)}
          onClose={() => setActiveTaskIdForStudent(null)}
          taskId={activeTaskIdForStudent}
          onSubmitted={loadTasks}
        />
      )}

      {/* Teacher Review Submissions Modal */}
      {reviewTaskId && activeReviewTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#F8FCFB] w-full max-w-4xl rounded-3xl shadow-2xl border border-[#C9E5E2] overflow-hidden flex flex-col max-h-[88vh]">
            
            {/* Review Header */}
            <div className="p-5 bg-white border-b border-[#C9E5E2] flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-[#087477] bg-[#E8F7F5] border border-[#C9E5E2] px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Submissions Roster
                </span>
                <h3 className="text-base font-black text-[#173B3F]">
                  {activeReviewTask.title} • {activeReviewTask.points} Points Max
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHandwrittenTaskId(reviewTaskId);
                    setHandwrittenStudentId(null);
                    setIsHandwrittenUploadOpen(true);
                  }}
                  className="px-3.5 py-2 bg-[#087477] hover:bg-[#159A9C] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Evaluate Classroom Work</span>
                </button>
                <button
                  onClick={() => setReviewTaskId(null)}
                  className="p-2 text-[#36565A] hover:text-[#173B3F] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Roster List of ALL Students in Classroom */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1 bg-[#F8FCFB]">
              {loadingSubs ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#159A9C] mx-auto" />
                  <p className="text-xs text-[#36565A] font-bold mt-2">Loading submissions...</p>
                </div>
              ) : studentMembers.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#36565A] font-bold">
                  No enrolled students found in this classroom.
                </div>
              ) : (
                studentMembers.map((studentMember) => {
                  const studentId = studentMember.profile_id;
                  const studentName = studentMember.display_name || studentMember.profile?.full_name || studentMember.profile?.email || 'Student';
                  const sub = taskSubmissions.find((s) => s.student_id === studentId);
                  const isSubmitted = Boolean(sub && (sub.status === 'submitted' || sub.status === 'graded' || sub.completed_at != null));
                  const isHandwritten = Boolean(sub && (sub.ocr_evaluation_id || (sub.file_urls && sub.file_urls.length > 0)));

                  return (
                    <div
                      key={studentId}
                      className="p-4 rounded-2xl border border-[#C9E5E2] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-[#159A9C] transition-colors"
                    >
                      {/* Student Info & Status */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#E8F7F5] border border-[#C9E5E2] text-[#087477] flex items-center justify-center font-black text-sm shrink-0">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-[#173B3F]">
                              {studentName}
                            </h4>
                            {isSubmitted ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Submitted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#36565A]">
                                Not submitted
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-[#36565A] font-medium mt-0.5">
                            {isSubmitted && sub?.submitted_at && (
                              <span>Submitted {new Date(sub.submitted_at).toLocaleDateString()}</span>
                            )}
                            {isHandwritten && (
                              <span className="px-1.5 py-0.5 rounded bg-[#E8F7F5] text-[#087477] text-[9px] font-black border border-[#C9E5E2]">
                                Handwritten Work
                              </span>
                            )}
                            {sub?.text_response && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#173B3F] text-[9px] font-bold">
                                Typed Response
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Score & Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {isSubmitted ? (
                          <>
                            <div className="text-right">
                              <span className="text-sm font-black text-[#087477] block">
                                {sub?.final_score ?? sub?.points_awarded ?? 'Ungraded'} / {activeReviewTask.points} pts
                              </span>
                              {sub?.teacher_adjusted && (
                                <span className="text-[9px] text-purple-700 font-bold block">
                                  (Adjusted)
                                </span>
                              )}
                            </div>

                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedSubForView(sub || null)}
                              className="px-3 py-1.5 bg-white hover:bg-[#E8F7F5] text-[#173B3F] border border-[#C9E5E2] rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="View student work"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Evaluate Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setHandwrittenTaskId(reviewTaskId);
                                setHandwrittenStudentId(studentId);
                                setIsHandwrittenUploadOpen(true);
                              }}
                              className="px-3 py-1.5 bg-[#E8F7F5] hover:bg-[#D4EFEC] text-[#087477] border border-[#C9E5E2] rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                              title="Evaluate with AI or adjust score"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Evaluate</span>
                            </button>

                            {/* Override Score Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubForOverride(sub || null);
                                setOverrideScoreVal(String(sub?.final_score ?? sub?.points_awarded ?? ''));
                                setOverrideReason(sub?.teacher_adjustment_reason || '');
                              }}
                              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-[#36565A] rounded-xl text-xs font-medium cursor-pointer"
                              title="Adjust score manually"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setHandwrittenTaskId(reviewTaskId);
                              setHandwrittenStudentId(studentId);
                              setIsHandwrittenUploadOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-[#087477] hover:bg-[#159A9C] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Work & Evaluate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* View Student Submission Detail Modal */}
      {selectedSubForView && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F8FCFB] w-full max-w-2xl rounded-3xl shadow-2xl border border-[#C9E5E2] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-white border-b border-[#C9E5E2] flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-[#087477] bg-[#E8F7F5] border border-[#C9E5E2] px-2 py-0.5 rounded-full inline-block mb-1">
                  Student Submission
                </span>
                <h3 className="text-sm font-black text-[#173B3F]">
                  {selectedSubForView.student?.full_name || 'Student'} • {selectedSubForView.final_score ?? selectedSubForView.points_awarded ?? 'Ungraded'} pts
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubForView(null)}
                className="p-1.5 text-[#36565A] hover:text-[#173B3F] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#F8FCFB]">
              {/* Typed Response */}
              {selectedSubForView.text_response && (
                <div className="bg-white p-4 rounded-2xl border border-[#C9E5E2] space-y-1.5">
                  <label className="text-xs font-black text-[#173B3F] block">
                    Typed Response
                  </label>
                  <p className="text-xs text-[#173B3F] whitespace-pre-wrap leading-relaxed">
                    {selectedSubForView.text_response}
                  </p>
                </div>
              )}

              {/* Uploaded Handwritten Image */}
              {selectedSubForView.file_urls && selectedSubForView.file_urls.length > 0 && selectedSubForView.file_urls[0] && (
                <div className="bg-white p-4 rounded-2xl border border-[#C9E5E2] space-y-2">
                  <label className="text-xs font-black text-[#173B3F] block">
                    Handwritten Work Image
                  </label>
                  <div className="rounded-xl overflow-hidden border border-[#C9E5E2] bg-slate-50 max-h-96 flex justify-center p-2">
                    <img
                      src={selectedSubForView.file_urls[0]}
                      alt="Student handwritten work"
                      className="max-h-96 object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Teacher Feedback */}
              {selectedSubForView.teacher_feedback && (
                <div className="bg-[#E8F7F5] p-4 rounded-2xl border border-[#C9E5E2] space-y-1">
                  <label className="text-xs font-black text-[#087477] block">
                    Feedback
                  </label>
                  <p className="text-xs text-[#173B3F] font-medium leading-relaxed">
                    {selectedSubForView.teacher_feedback}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-[#C9E5E2] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = selectedSubForView;
                  setSelectedSubForView(null);
                  setHandwrittenTaskId(reviewTaskId);
                  setHandwrittenStudentId(s.student_id);
                  setIsHandwrittenUploadOpen(true);
                }}
                className="px-4 py-2 bg-[#087477] hover:bg-[#159A9C] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Evaluate with AI</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubForView(null)}
                className="px-4 py-2 bg-white border border-[#C9E5E2] text-[#173B3F] hover:bg-[#E8F7F5] rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Score Override Prompt */}
      {selectedSubForOverride && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 border border-[#C9E5E2]">
            <h3 className="text-sm font-black text-[#173B3F]">
              Adjust Score for {selectedSubForOverride.student?.full_name || 'Student'}
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#173B3F] block">Final Score (pts)</label>
              <input
                type="number"
                value={overrideScoreVal}
                onChange={(e) => setOverrideScoreVal(e.target.value)}
                style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                className="w-full px-3 py-2 bg-white border-2 border-[#C9E5E2] rounded-xl text-sm font-black text-[#172B2F] focus:outline-none focus:border-[#159A9C]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#173B3F] block">Adjustment Reason</label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Recognized valid alternate solution"
                style={{ color: '#172B2F', backgroundColor: '#FFFFFF' }}
                className="w-full px-3 py-2 bg-white border-2 border-[#C9E5E2] rounded-xl text-xs font-semibold text-[#172B2F] placeholder:text-[#475569] focus:outline-none focus:border-[#159A9C]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubForOverride(null)}
                className="px-4 py-2 text-xs font-bold text-[#36565A] hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={overriding}
                onClick={handleSaveScoreOverride}
                className="px-5 py-2 bg-[#087477] hover:bg-[#159A9C] text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {overriding ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Handwritten Work Upload Modal (Evaluate Classroom Work) */}
      {isHandwrittenUploadOpen && (
        <TaskHandwrittenUploadModal
          isOpen={isHandwrittenUploadOpen}
          onClose={() => setIsHandwrittenUploadOpen(false)}
          classroomId={classroomId}
          tasks={tasks}
          members={members}
          initialTaskId={handwrittenTaskId || undefined}
          initialStudentId={handwrittenStudentId || undefined}
          onSuccess={() => {
            loadTasks();
            if (reviewTaskId) {
              classroomTaskService.getSubmissions(reviewTaskId).then(setTaskSubmissions);
            }
          }}
        />
      )}

      {/* Quick Classroom Assessment Modal */}
      {isQuickAssessmentOpen && (
        <QuickAssessmentModal
          isOpen={isQuickAssessmentOpen}
          onClose={() => setIsQuickAssessmentOpen(false)}
          classroomId={classroomId}
          members={members}
          onSuccess={() => {
            loadTasks();
          }}
        />
      )}

    </div>
  );
};
