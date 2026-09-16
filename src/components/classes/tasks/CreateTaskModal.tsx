import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  CheckCircle2,
  Users,
  Sparkles,
  AlertCircle,
  Loader2,
  Type,
  Upload,
  Layers
} from 'lucide-react';
import { ClassroomMember } from '@/types/classroom';
import { classroomTaskService } from '@/services/classroomTaskService';
import { supabase } from '@/lib/supabase';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  members?: ClassroomMember[];
  onTaskCreated?: () => void;
  initialCategory?: any;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  classroomId,
  members: membersProp = [],
  onTaskCreated
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [points, setPoints] = useState<number>(20);
  const [dueDate, setDueDate] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState<'both' | 'text' | 'upload'>('both');

  // Student Assignment State
  const [assignTarget, setAssignTarget] = useState<'all' | 'specific'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [students, setStudents] = useState<ClassroomMember[]>(membersProp);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classroomId && students.length === 0 && supabase) {
      supabase
        .from('classroom_members')
        .select(`
          id,
          classroom_id,
          profile_id,
          role,
          status,
          display_name,
          profile:profiles!classroom_members_profile_id_fkey(id, full_name, email, avatar_url, role)
        `)
        .eq('classroom_id', classroomId)
        .eq('status', 'active')
        .then(({ data }) => {
          if (data) {
            const studentMembers = (data as any[]).filter(
              (m) => m.role !== 'teacher' && m.role !== 'co-teacher' && m.profile?.role !== 'teacher' && m.profile?.role !== 'admin'
            );
            setStudents(studentMembers);
          }
        });
    }
  }, [isOpen, classroomId]);

  useEffect(() => {
    if (membersProp && membersProp.length > 0) {
      const studentMembers = membersProp.filter(
        (m) => m.role !== 'teacher' && m.role !== 'co-teacher' && m.profile?.role !== 'teacher' && m.profile?.role !== 'admin'
      );
      setStudents(studentMembers);
    }
  }, [membersProp]);

  if (!isOpen) return null;

  const toggleStudent = (profileId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(students.map((s) => s.profile_id));
  };

  const handleClearStudents = () => {
    setSelectedStudentIds([]);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Task Title is required.');
      return;
    }

    if (points <= 0 || isNaN(points)) {
      setError('Total Points must be a positive number.');
      return;
    }

    if (assignTarget === 'specific' && selectedStudentIds.length === 0) {
      setError('Please select at least one student to assign this task.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await classroomTaskService.createTask({
        classroomId,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        instructions: instructions.trim() || undefined,
        category: 'assignment',
        points: Number(points),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignedStudentIds: assignTarget === 'specific' ? selectedStudentIds : undefined,
        settings: {
          show_result_immediately: true,
          show_correct_answers: true,
          allow_retry: false,
          enable_ai_feedback: true,
          submission_method: submissionMethod
        }
      });

      if (res.error) {
        setError(res.error);
      } else {
        if (onTaskCreated) onTaskCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* EdTechra Light Header */}
        <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200/70 text-teal-700 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full">
                  Task Workspace
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Create & Assign Task
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Title & Topic */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., My Favourite Hobby, Chapter 4 Summary, Math Problem Set"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">
                  Topic / Subtitle <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g., Creative Writing, Unit 2"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700">
                  Total Points / Max Score <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800">
                Instructions & Prompt <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Give students clear instructions. Example: Write a paragraph about your favourite hobby, describing why you enjoy it and what you have learned from it."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Submission Method */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div>
              <label className="text-xs font-black text-slate-800 block">
                Allowed Submission Method
              </label>
              <p className="text-[11px] text-slate-500 font-medium">
                Choose how students are allowed to submit their work for this task.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                {
                  id: 'both',
                  label: 'Both (Recommended)',
                  desc: 'Students can type their response or upload a handwritten photo.',
                  icon: Layers
                },
                {
                  id: 'text',
                  label: 'Type Response Only',
                  desc: 'Students type their response directly into the application.',
                  icon: Type
                },
                {
                  id: 'upload',
                  label: 'Upload Work Only',
                  desc: 'Students upload a photo of their handwritten paper or worksheet.',
                  icon: Upload
                }
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = submissionMethod === method.id;
                return (
                  <div
                    key={method.id}
                    onClick={() => setSubmissionMethod(method.id as any)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-teal-600 bg-teal-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block">
                        {method.label}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium leading-tight block mt-0.5">
                        {method.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Due Date & Student Assignment */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Due Date <span className="text-slate-400 font-normal">(Optional)</span></span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full sm:w-64 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assign Students</span>
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Assign this task to the entire classroom or choose specific students.
                  </p>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAssignTarget('all')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      assignTarget === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Students ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignTarget('specific')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      assignTarget === 'specific'
                        ? 'bg-white text-slate-900 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Specific Students
                  </button>
                </div>
              </div>

              {/* Specific Students Checklist */}
              {assignTarget === 'specific' && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-[11px]">
                    <span className="font-bold text-slate-600">
                      Selected: {selectedStudentIds.length} of {students.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllStudents}
                        className="text-teal-700 hover:underline font-bold"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleClearStudents}
                        className="text-slate-500 hover:underline font-bold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {students.map((st) => {
                      const isChecked = selectedStudentIds.includes(st.profile_id);
                      const name = st.display_name || st.profile?.full_name || st.profile?.email || 'Student';
                      return (
                        <div
                          key={st.profile_id}
                          onClick={() => toggleStudent(st.profile_id)}
                          className={`p-2 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold transition-colors ${
                            isChecked ? 'bg-teal-50 text-teal-900' : 'bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span>{name}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isChecked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                          }`}>
                            {isChecked && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing Task...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create & Assign Task</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
