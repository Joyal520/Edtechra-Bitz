import React, { useState } from 'react';
import { Users, Search, Trash2, Trophy } from 'lucide-react';
import { ClassroomMember } from '@/types/classroom';
import { classroomService } from '@/services/classroomService';

interface StudentRosterProps {
  classroomId: string;
  members: ClassroomMember[];
  isTeacher: boolean;
  onMemberRemoved: () => void;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({
  classroomId,
  members,
  isTeacher,
  onMemberRemoved
}) => {
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const filteredMembers = members.filter((m) => {
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
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-5">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Enrolled Students</h2>
            <p className="text-xs text-slate-500 font-semibold">{members.length} active students</p>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3]"
          />
        </div>
      </div>

      {/* Roster Table */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-xs font-bold text-slate-500">No students enrolled yet.</p>
          <p className="text-[11px] text-slate-400">Share your class invite code with students to join.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-3">Student</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Class Points</th>
                <th className="pb-3 px-3">Joined Date</th>
                {isTeacher && <th className="pb-3 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((member) => {
                const name = member.display_name || member.profile?.full_name || member.profile?.email?.split('@')[0] || 'Student';
                const avatar = member.profile?.avatar_url;
                const initials = name.slice(0, 2).toUpperCase();

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
                          <div className="font-extrabold text-slate-900">{name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{member.profile?.email}</div>
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
  );
};
