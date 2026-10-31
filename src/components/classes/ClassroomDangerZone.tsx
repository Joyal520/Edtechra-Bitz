import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Trash2,
  X,
  Flame,
  FileWarning,
  Loader2,
  Users,
  Search,
  UserX,
  CheckSquare,
  Square,
  ShieldAlert
} from 'lucide-react';
import { Classroom, ClassroomMember, ClassroomStats } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';

interface ClassroomDangerZoneProps {
  classroom: Classroom;
  isOwnerOrAdmin: boolean;
  stats?: ClassroomStats;
  members?: ClassroomMember[];
  onMembersUpdated?: () => void;
}

export const ClassroomDangerZone: React.FC<ClassroomDangerZoneProps> = ({
  classroom,
  isOwnerOrAdmin,
  stats,
  members: initialMembers,
  onMembersUpdated
}) => {
  const navigate = useNavigate();

  // Classroom Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [typedTitle, setTypedTitle] = useState('');
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Student Management Modal State
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<ClassroomMember[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeErrorMessage, setRemoveErrorMessage] = useState<string | null>(null);
  const [removeSuccessMessage, setRemoveSuccessMessage] = useState<string | null>(null);

  if (!isOwnerOrAdmin) {
    return null;
  }

  const expectedTitle = classroom.title.trim();
  const isMatch = typedTitle.trim() === expectedTitle;
  const canDelete = isMatch && confirmedRisk && !isDeleting;

  // Load students for management
  const loadStudents = async () => {
    setLoadingStudents(true);
    setRemoveErrorMessage(null);
    try {
      const allMembers = await classroomService.getClassroomMembers(classroom.id, { throwOnError: true });
      // Filter out classroom owner/teachers, only show student members
      const studentsOnly = allMembers.filter(
        (m) => m.role === 'student' && m.profile_id !== classroom.teacher_id
      );
      setEnrolledStudents(studentsOnly);
    } catch (err: any) {
      console.error('[ClassroomDangerZone] Error loading students:', err);
      // Fallback to initial members if available but show warning
      if (initialMembers && initialMembers.length > 0) {
        setEnrolledStudents(
          initialMembers.filter((m) => m.role === 'student' && m.profile_id !== classroom.teacher_id)
        );
      } else {
        setRemoveErrorMessage('Failed to load enrolled students from the database. Please check your connection.');
      }
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleOpenManageStudents = () => {
    setSelectedStudentIds([]);
    setStudentSearch('');
    setRemoveErrorMessage(null);
    setRemoveSuccessMessage(null);
    setIsConfirmRemoveOpen(false);
    setIsManageStudentsOpen(true);
    loadStudents();
  };

  const toggleSelectStudent = (profileId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const filteredStudents = enrolledStudents.filter((m) => {
    const name = m.display_name || m.profile?.full_name || m.profile?.email || '';
    const email = m.profile?.email || '';
    const q = studentSearch.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.profile_id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredProfileIds = new Set(filteredStudents.map((s) => s.profile_id));
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredProfileIds.has(id)));
    } else {
      const newIds = new Set([...selectedStudentIds, ...filteredStudents.map((s) => s.profile_id)]);
      setSelectedStudentIds(Array.from(newIds));
    }
  };

  const handleConfirmRemoveStudents = async () => {
    if (selectedStudentIds.length === 0 || isRemoving) return;

    setIsRemoving(true);
    setRemoveErrorMessage(null);
    setRemoveSuccessMessage(null);

    try {
      // Safely remove student enrollments from classroom_members table atomically
      // IMPORTANT: Does NOT delete the user profiles, certificates, or grades
      const res = await classroomService.removeMembers(classroom.id, selectedStudentIds);
      if (!res.success) {
        setRemoveErrorMessage(res.error || "We couldn't remove the selected students. No changes were made.");
        setIsRemoving(false);
        setIsConfirmRemoveOpen(false);
        return;
      }

      // Fresh database verification query to guarantee zero target students remain
      const freshMembers = await classroomService.getClassroomMembers(classroom.id, { throwOnError: true });
      const remainingSelected = freshMembers.filter((m) =>
        selectedStudentIds.includes(m.profile_id)
      );

      if (remainingSelected.length > 0) {
        console.error('[ClassroomDangerZone] Removal verification failed - students still present:', remainingSelected);
        setRemoveErrorMessage('Student removal could not be verified in the database. Please try again.');
        setIsRemoving(false);
        setIsConfirmRemoveOpen(false);
        await loadStudents();
        return;
      }

      const studentsOnly = freshMembers.filter(
        (m) => m.role === 'student' && m.profile_id !== classroom.teacher_id
      );
      setEnrolledStudents(studentsOnly);

      const countRemoved = res.removedCount;
      setRemoveSuccessMessage(
        `Successfully removed ${countRemoved} student${countRemoved === 1 ? '' : 's'} from this classroom. Historical learning records were preserved.`
      );

      // Reset selection and close confirmation
      setSelectedStudentIds([]);
      setIsConfirmRemoveOpen(false);

      // Trigger parent refresh for classroom count, stats, and roster
      onMembersUpdated?.();

      setTimeout(() => setRemoveSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('[ClassroomDangerZone] Error removing students:', err);
      setRemoveErrorMessage(err?.message || "We couldn't remove the selected students. No changes were made.");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setDeleteErrorMessage(null);

    try {
      const res = await classroomService.deleteClassroom(classroom.id);
      if (res.error) {
        setDeleteErrorMessage(res.error);
        setIsDeleting(false);
        return;
      }

      setIsDeleteModalOpen(false);
      navigate('/classes', {
        replace: true,
        state: { deletedClassroom: classroom.title }
      });
    } catch (err: any) {
      setDeleteErrorMessage(err.message || 'Failed to delete classroom.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* 1. Student Management Section (Separate from Decommission) */}
      <div className="mt-8 rounded-[24px] border border-sky-200 bg-white p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider">
              <Users className="w-3 h-3 text-[#0284c7]" />
              <span>Student Management</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Manage Classroom Students
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              View enrolled learners and safely remove students from this classroom without affecting their global EdTechra accounts.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleOpenManageStudents}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#026fc3] hover:bg-[#025ca5] active:bg-[#024a87] text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              aria-label="Manage students in this classroom"
            >
              <Users className="w-4 h-4" />
              <span>Manage Students</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Danger Zone Bottom Banner (Preserved & Visually Separated) */}
      <div className="mt-4 rounded-[24px] border border-rose-200 bg-[#fff8f8] p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>DANGER ZONE</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Decommission &amp; Delete Classroom
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Permanently delete this classroom, student submission records, points history, live quiz lobbies, and active enrollments. This action is irreversible.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setTypedTitle('');
                setConfirmedRisk(false);
                setDeleteErrorMessage(null);
                setIsDeleteModalOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer border border-rose-500/30"
              aria-label="Delete this classroom permanently"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete This Classroom</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MANAGE STUDENTS MODAL                                                  */}
      {/* ===================================================================== */}
      {isManageStudentsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
            data-light-surface="true"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#026fc3] flex items-center justify-center shadow-2xs">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Manage Students
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    {enrolledStudents.length} enrolled student{enrolledStudents.length === 1 ? '' : 's'} in {classroom.title}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManageStudentsOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Close student management modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success & Error alerts */}
            {removeSuccessMessage && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
                {removeSuccessMessage}
              </div>
            )}
            {removeErrorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shrink-0">
                {removeErrorMessage}
              </div>
            )}

            {/* Search and Selection Toolbar */}
            <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search enrolled students..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] select-text"
                />
              </div>

              {filteredStudents.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer self-start sm:self-auto py-1"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#026fc3]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{allFilteredSelected ? 'Deselect All' : 'Select All'}</span>
                </button>
              )}
            </div>

            {/* Students List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 divide-y divide-slate-100">
              {loadingStudents ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[#026fc3]" />
                  <p className="text-xs font-bold text-slate-500">Loading enrolled students...</p>
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <p className="text-xs font-bold text-slate-600">No students are currently enrolled.</p>
                  <p className="text-[11px] text-slate-400">Share your classroom invite code for students to join.</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-500">No students match &ldquo;{studentSearch}&rdquo;</p>
                </div>
              ) : (
                filteredStudents.map((member) => {
                  const name =
                    member.display_name ||
                    member.profile?.full_name ||
                    member.profile?.email?.split('@')[0] ||
                    'Student';
                  const email = member.profile?.email || '';
                  const avatar = member.profile?.avatar_url;
                  const initials = name.slice(0, 2).toUpperCase();
                  const isSelected = selectedStudentIds.includes(member.profile_id);

                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleSelectStudent(member.profile_id)}
                      className={`py-3 px-3 rounded-2xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50/80 border border-sky-100' : 'hover:bg-slate-50/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div className="shrink-0 text-[#026fc3]">
                          {isSelected ? (
                            <CheckSquare className="w-4.5 h-4.5 text-[#026fc3]" />
                          ) : (
                            <Square className="w-4.5 h-4.5 text-slate-300" />
                          )}
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 p-[1.5px] shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-amber-100 text-slate-900 font-black text-xs flex items-center justify-center">
                              {initials}
                            </div>
                          )}
                        </div>

                        {/* Student Details */}
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                            {name}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono truncate">
                            {email && <span className="truncate">{email}</span>}
                            {email && <span>•</span>}
                            <span className="text-[10px] text-slate-500 font-sans">
                              {typeof member.points === 'number' ? `${member.points} XP` : '0 XP'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Enrollment status pill */}
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with selection summary and Remove Action */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs font-bold text-slate-600">
                {selectedStudentIds.length} of {enrolledStudents.length} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManageStudentsOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0}
                  onClick={() => setIsConfirmRemoveOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
                >
                  <UserX className="w-4 h-4" />
                  <span>
                    Remove Selected {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* REMOVE STUDENT CONFIRMATION DIALOG                                    */}
      {/* ===================================================================== */}
      {isConfirmRemoveOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Remove Students?
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Classroom enrollment removal
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                You are about to remove <span className="font-extrabold text-slate-900">{selectedStudentIds.length} student{selectedStudentIds.length === 1 ? '' : 's'}</span> from this classroom.
              </p>
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-sky-800 text-xs font-medium leading-relaxed">
                <span className="font-bold">Important note:</span> Their EdTechra accounts will not be deleted. They will only lose access to this specific classroom.
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Are you sure you want to continue?
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isRemoving}
                onClick={() => setIsConfirmRemoveOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRemoving}
                onClick={handleConfirmRemoveStudents}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    <span>Remove Students</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DRAMATIC NUCLEAR CLASSROOM DELETION MODAL (PRESERVED INTACT)           */}
      {/* ===================================================================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 text-white border-2 border-rose-500/80 shadow-2xl shadow-rose-950/60 overflow-hidden my-8">
            
            {/* Top Danger Warning Header */}
            <div className="relative bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 p-6 sm:p-7 border-b border-rose-700/50">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border-2 border-rose-500 text-rose-300 flex items-center justify-center shadow-lg shadow-rose-900/50 animate-pulse">
                    <Flame className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                        Critical Destruction Alert
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight mt-1">
                      Permanent Classroom Purge
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="text-slate-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Close delete modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 bg-slate-900">
              
              {/* Destruction Inventory */}
              <div className="rounded-2xl bg-slate-950/90 border border-rose-900/60 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <FileWarning className="w-4 h-4" />
                  <span>The following data will be wiped permanently:</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 pl-5 list-disc font-medium">
                  <li>
                    Classroom: <span className="font-extrabold text-white">&ldquo;{classroom.title}&rdquo;</span> ({classroom.subject}, {classroom.grade})
                  </li>
                  <li>
                    Enrolled Students: <span className="font-bold text-rose-300">{stats?.total_students ?? 0} students</span> will be removed
                  </li>
                  <li>
                    Assignments &amp; Submissions: <span className="font-bold text-rose-300">{stats?.total_assignments ?? 0} tasks</span> and all graded student papers
                  </li>
                  <li>
                    All points ledger, live quiz rooms, stream messages, and study buckets
                  </li>
                </ul>
              </div>

              {/* Exact Name Verification Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  To confirm decommissioning, type <span className="text-rose-400 font-mono font-black select-all px-1.5 py-0.5 bg-rose-950/80 rounded border border-rose-800">{expectedTitle}</span> below:
                </label>
                <input
                  type="text"
                  value={typedTitle}
                  onChange={(e) => setTypedTitle(e.target.value)}
                  disabled={isDeleting}
                  placeholder={`Type "${expectedTitle}"`}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all select-text"
                  autoFocus
                />
              </div>

              {/* Checkbox Acknowledgment */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedRisk}
                  onChange={(e) => setConfirmedRisk(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 focus:ring-offset-slate-900"
                />
                <span className="text-xs text-slate-300 font-medium">
                  I understand that this action cannot be undone and no backups will be recoverable.
                </span>
              </label>

              {/* Error notification if any */}
              {deleteErrorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deleteErrorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel &amp; Keep Classroom
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canDelete}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    canDelete
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/40 active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting Classroom...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
