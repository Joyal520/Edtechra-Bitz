import React, { useState } from 'react';
import { Users, Search, Trash2, Trophy, FileText, GraduationCap, ShieldCheck } from 'lucide-react';
import { ClassroomMember } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';
import { StudentAssessmentHistoryModal } from './StudentAssessmentHistoryModal';

interface StudentRosterProps {
  classroomId: string;
  members: ClassroomMember[];
  isTeacher: boolean;
  classroomTeacherId?: string;
  currentUserId?: string;
  onMemberRemoved: () => void;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({
  classroomId,
  members,
  isTeacher,
  classroomTeacherId,
  currentUserId,
  onMemberRemoved
}) => {
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<ClassroomMember | null>(null);

  // Helper: determine if member is a teacher/instructor
  const isMemberTeacher = (m: ClassroomMember) => {
    if (classroomTeacherId && m.profile_id === classroomTeacherId) return true;
    if (m.role === 'teacher' || m.role === 'co-teacher') return true;
    if (m.profile?.role === 'teacher' || m.profile?.role === 'admin') return true;
    if (isTeacher && currentUserId && m.profile_id === currentUserId) return true;
    return false;
  };

  const teacherMembers = members.filter(isMemberTeacher);
  const studentMembers = members.filter((m) => !isMemberTeacher(m));

  const filteredTeachers = teacherMembers.filter((m) => {
    const name = m.display_name || m.profile?.full_name || m.profile?.email || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredStudents = studentMembers.filter((m) => {
    const name = m.display_name || m.profile?.full_name || m.profile?.email || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleRemove = async (memberProfileId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this classroom?`)) {
      return;
    }
    setRemovingId(memberProfileId);
    try {
      await classroomService.removeMember(classroomId, memberProfileId);
      onMemberRemoved();
    } catch (err) {
      alert('Failed to remove student');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">
              {isTeacher ? 'Enrolled Students' : 'Classroom Members'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              {studentMembers.length} {studentMembers.length === 1 ? 'active student' : 'active students'}
            </p>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roster..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TEACHERS & INSTRUCTORS SECTION                                         */}
      {/* ===================================================================== */}
      {filteredTeachers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span>Classroom Teacher</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTeachers.map((teacher) => {
              const name = teacher.display_name || teacher.profile?.full_name || teacher.profile?.email?.split('@')[0] || 'Teacher';
              const avatar = teacher.profile?.avatar_url;
              const initials = name.slice(0, 2).toUpperCase();
              const isCurrent = teacher.profile_id === currentUserId;

              return (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50/70 to-indigo-50/50 rounded-2xl border border-purple-100/80 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-[2px] shrink-0 shadow-2xs">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 text-sm flex items-center gap-1.5 truncate">
                        <span>{name}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase bg-purple-600 text-white px-1.5 py-0.2 rounded-md">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{teacher.profile?.email}</div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                    <ShieldCheck className="w-3 h-3 text-purple-600" />
                    <span>Teacher</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ENROLLED STUDENTS TABLE                                               */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-black text-slate-700 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#026fc3]" />
            <span>Enrolled Students ({filteredStudents.length})</span>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-500">
              {search ? 'No students match your search.' : 'No students enrolled yet.'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isTeacher ? 'Share your class invite code with students to start enrolling.' : 'Classmates will appear here once they join.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-3">Student</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Class Points</th>
                  <th className="pb-3 px-3">Assessments</th>
                  <th className="pb-3 px-3">Joined Date</th>
                  {isTeacher && <th className="pb-3 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((member) => {
                  const name = member.display_name || member.profile?.full_name || member.profile?.email?.split('@')[0] || 'Student';
                  const avatar = member.profile?.avatar_url;
                  const initials = name.slice(0, 2).toUpperCase();
                  const isCurrent = member.profile_id === currentUserId;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 p-[1.5px] shrink-0">
                            {avatar ? (
                              <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-amber-100 text-slate-900 font-black text-[11px] flex items-center justify-center">
                                {initials}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-md">
                                  You
                                </span>
                              )}
                            </div>
                            {isTeacher && (
                              <div className="text-[10px] text-slate-400 font-mono">{member.profile?.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-800">
                        <div className="flex items-center gap-1.5 text-[#026fc3]">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>{member.points ?? 0} pts</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isTeacher || isCurrent ? (
                          <button
                            type="button"
                            onClick={() => setSelectedStudentHistory(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-black transition-colors cursor-pointer border border-indigo-200"
                            title="View evaluation history"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{isCurrent && !isTeacher ? 'My Reports' : 'History & Reports'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 font-medium text-[11px] select-none">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {new Date(member.joined_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      {isTeacher && (
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={removingId === member.profile_id}
                            onClick={() => handleRemove(member.profile_id, name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Assessment History Modal */}
      {selectedStudentHistory && (
        <StudentAssessmentHistoryModal
          isOpen={Boolean(selectedStudentHistory)}
          classroomId={classroomId}
          student={selectedStudentHistory}
          onClose={() => setSelectedStudentHistory(null)}
        />
      )}
    </div>
  );
};

