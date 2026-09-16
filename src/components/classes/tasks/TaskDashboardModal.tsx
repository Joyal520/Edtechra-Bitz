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
  Calendar
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-700 flex items-center justify-center font-black shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Tasks</h2>
              <p className="text-xs text-slate-500 font-medium">
                {isTeacher
                  ? 'Give students work to complete, or upload and evaluate classroom submissions.'
                  : 'View assigned tasks, type responses, or upload your handwritten work.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Teacher Workflow Landing Banner */}
        {isTeacher && (
          <div className="p-5 bg-slate-50/70 border-b border-slate-100 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Workflow A: Create & Assign Task */}
              <div
                onClick={() => setIsCreateOpen(true)}
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                      Create & Assign Task
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Give students work to complete and submit.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Workflow B: Evaluate Classroom Work */}
              <div
                onClick={() => {
                  setHandwrittenTaskId(null);
                  setHandwrittenStudentId(null);
                  setIsHandwrittenUploadOpen(true);
                }}
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex items-center gap-3.5 group"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                      Evaluate Classroom Work
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Upload physical student work and evaluate it with AI.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
              </div>

            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800">
              All Classroom Tasks
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredTasks.length}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Task Cards List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/40">
          {(loading || isRoleResolving) && tasks.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200/60">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-slate-900">No tasks created yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                {isTeacher
                  ? 'Click "Create & Assign Task" above to publish your first classroom task.'
                  : 'Your teacher has not published any tasks yet. Check back soon!'}
              </p>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer inline-flex items-center gap-2 transition-all active:scale-95"
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
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                          Task
                        </span>
                        <span className="text-[11px] font-black text-slate-700">
                          {t.points} Points Total
                        </span>
                        {t.due_date && (
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                        {t.title}
                      </h3>

                      {t.subtitle && (
                        <p className="text-xs font-medium text-slate-500">
                          {t.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-teal-600" />
                          <span>{t.total_assigned || studentMembers.length} Assigned</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.completed_count || 0} Graded</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      {isTeacher ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setHandwrittenTaskId(t.id);
                              setHandwrittenStudentId(null);
                              setIsHandwrittenUploadOpen(true);
                            }}
                            className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-teal-200/70"
                            title="Upload physical student work and evaluate"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Evaluate Work</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReview(t.id)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Submissions ({t.submitted_count || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTaskIdForStudent(t.id)}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
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
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
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

      {/* Teacher Review Submissions Modal (Part 5: Complete Student Submissions Roster) */}
      {reviewTaskId && activeReviewTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            
            {/* Review Header */}
            <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full inline-block mb-1">
                  Submissions Roster
                </span>
                <h3 className="text-base font-black text-slate-900">
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
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Evaluate Classroom Work</span>
                </button>
                <button
                  onClick={() => setReviewTaskId(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Roster List of ALL Students in Classroom */}
            <div className="p-6 overflow-y-auto space-y-2.5 flex-1 bg-slate-50/40">
              {loadingSubs ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold mt-2">Loading submissions...</p>
                </div>
              ) : studentMembers.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 font-bold">
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
                      className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      {/* Student Info & Status */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-700 flex items-center justify-center font-black text-sm shrink-0">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-slate-900">
                              {studentName}
                            </h4>
                            {isSubmitted ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Submitted
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                Not submitted
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                            {isSubmitted && sub?.submitted_at && (
                              <span>Submitted {new Date(sub.submitted_at).toLocaleDateString()}</span>
                            )}
                            {isHandwritten && (
                              <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 text-[9px] font-black border border-teal-200/60">
                                Handwritten Work
                              </span>
                            )}
                            {sub?.text_response && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold">
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
                              <span className="text-sm font-black text-teal-700 block">
                                {sub?.final_score ?? sub?.points_awarded ?? 'Ungraded'} / {activeReviewTask.points} pts
                              </span>
                              {sub?.teacher_adjusted && (
                                <span className="text-[9px] text-purple-600 font-bold block">
                                  (Adjusted)
                                </span>
                              )}
                            </div>

                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedSubForView(sub || null)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="View student work"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Evaluate Button (Reuses uploaded image if present!) */}
                            <button
                              type="button"
                              onClick={() => {
                                setHandwrittenTaskId(reviewTaskId);
                                setHandwrittenStudentId(studentId);
                                setIsHandwrittenUploadOpen(true);
                              }}
                              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
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
                              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-medium cursor-pointer"
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
                            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
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
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full inline-block mb-1">
                  Student Submission
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  {selectedSubForView.student?.full_name || 'Student'} • {selectedSubForView.final_score ?? selectedSubForView.points_awarded ?? 'Ungraded'} pts
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubForView(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/40">
              {/* Typed Response */}
              {selectedSubForView.text_response && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <label className="text-xs font-black text-slate-800 block">
                    Typed Response
                  </label>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedSubForView.text_response}
                  </p>
                </div>
              )}

              {/* Uploaded Handwritten Image */}
              {selectedSubForView.file_urls && selectedSubForView.file_urls.length > 0 && selectedSubForView.file_urls[0] && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-black text-slate-800 block">
                    Handwritten Work Image
                  </label>
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-96 flex justify-center p-2">
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
                <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200 space-y-1">
                  <label className="text-xs font-black text-teal-900 block">
                    Feedback
                  </label>
                  <p className="text-xs text-teal-950 font-medium leading-relaxed">
                    {selectedSubForView.teacher_feedback}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = selectedSubForView;
                  setSelectedSubForView(null);
                  setHandwrittenTaskId(reviewTaskId);
                  setHandwrittenStudentId(s.student_id);
                  setIsHandwrittenUploadOpen(true);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Evaluate with AI</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubForView(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Score Override Prompt */}
      {selectedSubForOverride && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-sm font-black text-slate-900">
              Adjust Score for {selectedSubForOverride.student?.full_name || 'Student'}
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">Final Score (pts)</label>
              <input
                type="number"
                value={overrideScoreVal}
                onChange={(e) => setOverrideScoreVal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">Adjustment Reason</label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Recognized valid alternate solution"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubForOverride(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={overriding}
                onClick={handleSaveScoreOverride}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
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

    </div>
  );
};
