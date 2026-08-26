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
  ChevronRight
} from 'lucide-react';
import {
  ClassroomTask,
  TaskCategory,
  TaskSubmission
} from '@/types/classroomTask';
import { classroomTaskService } from '@/services/classroomTaskService';
import { useAuth } from '@/context/AuthContext';
import { CreateTaskModal } from './CreateTaskModal';
import { StudentTaskModal } from './StudentTaskModal';

interface TaskDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
}

export const TaskDashboardModal: React.FC<TaskDashboardModalProps> = ({
  isOpen,
  onClose,
  classroomId
}) => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');
  const [tasks, setTasks] = useState<ClassroomTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Submodals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTaskIdForStudent, setActiveTaskIdForStudent] = useState<string | null>(null);

  // Teacher Review Submissions Modal
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selectedSubForOverride, setSelectedSubForOverride] = useState<TaskSubmission | null>(null);
  const [overrideScoreVal, setOverrideScoreVal] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await classroomTaskService.getTasks(classroomId, selectedCategory);
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
  }, [isOpen, classroomId, selectedCategory]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg font-black text-lg">
              E
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Assign Your Students</h2>
              <p className="text-xs text-indigo-200 font-medium">
                Assignments, structured lessons, skill practice, classroom activities and learning resources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTeacher && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Tasks' },
              { id: 'assignment', label: 'Assignments' },
              { id: 'lesson', label: 'Lessons' },
              { id: 'practice', label: 'Practice' },
              { id: 'activity', label: 'Activities' },
              { id: 'resource', label: 'Resources' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Task Cards List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-base font-black text-slate-800">No tasks found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                {isTeacher
                  ? 'Click "Create Task" above to publish assignments, lessons, practice exercises, or resources.'
                  : 'Your teacher has not published any tasks in this category yet.'}
              </p>
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer inline-flex items-center gap-2"
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
                    className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          t.category === 'lesson'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.category === 'practice'
                            ? 'bg-purple-100 text-purple-800'
                            : t.category === 'activity'
                            ? 'bg-amber-100 text-amber-800'
                            : t.category === 'resource'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {t.category.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {t.points} Points Total
                        </span>
                        {t.due_date && (
                          <span className="text-[10px] font-bold text-slate-500">
                            • Due: {new Date(t.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {t.title}
                      </h3>

                      {t.subtitle && (
                        <p className="text-xs font-semibold text-slate-500">
                          {t.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{t.total_assigned || 0} Assigned</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t.completed_count || 0} Completed</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      {isTeacher ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenReview(t.id)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Submissions ({t.submitted_count || 0})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTaskIdForStudent(t.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Sheet</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTaskIdForStudent(t.id)}
                          className={`px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <span>{isCompleted ? 'View Results' : mySub ? 'Continue' : 'Open Task'}</span>
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
      {reviewTaskId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-300 block">
                  Submissions Review
                </span>
                <h3 className="text-sm font-black">Student Attempts & Auto-Graded Scores</h3>
              </div>
              <button
                onClick={() => setReviewTaskId(null)}
                className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {loadingSubs ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                </div>
              ) : taskSubmissions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-bold">
                  No submissions recorded yet.
                </div>
              ) : (
                taskSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm">
                        {sub.student?.full_name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">
                          {sub.student?.full_name || sub.student?.email || 'Student'}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold">
                          Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-black text-indigo-700">
                          {sub.final_score ?? sub.points_awarded ?? 'Ungraded'} pts
                        </span>
                        {sub.teacher_adjusted && (
                          <span className="text-[10px] text-purple-600 font-bold block">
                            (Adjusted)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubForOverride(sub);
                          setOverrideScoreVal(String(sub.final_score ?? sub.points_awarded ?? ''));
                          setOverrideReason(sub.teacher_adjustment_reason || '');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Override</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teacher Score Override Prompt */}
      {selectedSubForOverride && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              Adjust Score for {selectedSubForOverride.student?.full_name || 'Student'}
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">Final Score</label>
              <input
                type="number"
                value={overrideScoreVal}
                onChange={(e) => setOverrideScoreVal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">Adjustment Reason</label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., Recognized valid alternate solution"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubForOverride(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={overriding}
                onClick={handleSaveScoreOverride}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
              >
                {overriding ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
