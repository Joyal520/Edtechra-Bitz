import React, { useState } from 'react';
import { Trophy, ArrowRight, X } from 'lucide-react';
import { ClassroomLeaderboardEntry } from '@/types/classroom';

interface ClassroomLeaderboardProps {
  entries: ClassroomLeaderboardEntry[];
  currentUserId?: string;
}

export const ClassroomLeaderboard: React.FC<ClassroomLeaderboardProps> = ({
  entries,
  currentUserId
}) => {
  const [showAllModal, setShowAllModal] = useState(false);

  // Strictly split the single ordered array of unique students
  const topThree = entries.slice(0, 3);
  const nextThree = entries.slice(3, 6);

  if (entries.length === 0) {
    return (
      <div className="bg-[#faf8f5] rounded-[24px] p-8 text-center border border-stone-200/70 shadow-xs space-y-2 h-full flex flex-col items-center justify-center min-h-[220px]">
        <Trophy className="w-9 h-9 text-slate-300 mx-auto" />
        <p className="text-xs font-bold text-slate-500">No leaderboard activity yet.</p>
        <p className="text-[11px] text-slate-400">Student points from tasks, quizzes, and exams will appear here.</p>
      </div>
    );
  }

  const rank1 = topThree[0] || null;
  const rank2 = topThree[1] || null;
  const rank3 = topThree[2] || null;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center h-full">
        
        {/* ======================================================================= */}
        {/* LEFT: 3D STEPPED CUT-PAPER PODIUM WITH CROWN & LAUREL WREATH (5 Cols)   */}
        {/* ======================================================================= */}
        <div className="md:col-span-5 flex flex-col items-center justify-end p-3 relative select-none">
          
          {/* Base Botanical Flanking Leaves (Bottom Left & Right) */}
          <div className="absolute -bottom-2 -left-2 w-14 h-14 pointer-events-none opacity-80">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M 0 60 C 20 40, 40 45, 45 20 C 30 35, 10 35, 0 60 Z" fill="#047857" />
              <path d="M 0 60 C 30 50, 50 35, 55 10 C 35 25, 15 35, 0 60 Z" fill="#10b981" />
              <path d="M 0 60 C 15 45, 20 30, 25 15 C 15 30, 5 45, 0 60 Z" fill="#34d399" />
            </svg>
          </div>

          <div className="absolute -bottom-2 -right-2 w-14 h-14 pointer-events-none opacity-80">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M 60 60 C 40 40, 20 45, 15 20 C 30 35, 50 35, 60 60 Z" fill="#047857" />
              <path d="M 60 60 C 30 50, 10 35, 5 10 C 25 25, 45 35, 60 60 Z" fill="#10b981" />
              <path d="M 60 60 C 45 45, 40 30, 35 15 C 45 30, 55 45, 60 60 Z" fill="#34d399" />
            </svg>
          </div>

          {/* Stepped Podium Blocks */}
          <div className="flex items-end justify-center gap-2 w-full max-w-[240px] pt-10">
            
            {/* Step 2 (Left - Slate Blue) */}
            <div className="flex-1 flex flex-col items-center">
              {rank2 ? (
                <div className="w-12 h-12 rounded-full bg-slate-200 p-0.5 -mb-2.5 z-10 overflow-hidden shadow-md border-2 border-slate-300">
                  {rank2.avatar_url ? (
                    <img src={rank2.avatar_url} alt={rank2.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-500 text-white font-black text-xs flex items-center justify-center">
                      {rank2.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-12 h-12 -mb-2.5 z-10 rounded-full border-2 border-dashed border-slate-300 bg-slate-100/50" />
              )}
              {/* Step Block 2 */}
              <div className="w-full h-20 bg-[#334155] rounded-t-xl flex items-center justify-center text-white font-black text-2xl shadow-md border-t-2 border-[#475569] pt-2">
                2
              </div>
            </div>

            {/* Step 1 (Center - Gold with Laurel Wreath & Crown) */}
            <div className="flex-1 flex flex-col items-center -mt-6 z-20">
              {/* Floating Golden Crown */}
              <div className="mb-0.5 animate-bounce">
                <svg viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-5 drop-shadow-sm">
                  <path d="M 2 20 L 0 4 L 8 10 L 16 0 L 24 10 L 32 4 L 30 20 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                  <circle cx="0" cy="4" r="2" fill="#ef4444" />
                  <circle cx="16" cy="0" r="2" fill="#3b82f6" />
                  <circle cx="32" cy="4" r="2" fill="#10b981" />
                  <rect x="2" y="19" width="28" height="3" rx="1.5" fill="#d97706" />
                </svg>
              </div>

              {rank1 ? (
                <div className="w-14 h-14 rounded-full bg-amber-100 p-0.5 -mb-3 z-10 overflow-hidden shadow-lg border-2 border-amber-400 ring-3 ring-amber-300/40">
                  {rank1.avatar_url ? (
                    <img src={rank1.avatar_url} alt={rank1.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center">
                      {rank1.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-14 h-14 -mb-3 z-10 rounded-full border-2 border-dashed border-amber-300 bg-amber-50/50" />
              )}

              {/* Step Block 1 with Laurel Wreath */}
              <div className="w-full h-28 bg-[#d97706] rounded-t-xl flex flex-col items-center justify-between py-2 text-white shadow-xl border-t-2 border-[#fbbf24]">
                <span className="font-black text-3xl pt-1">1</span>
                
                {/* Laurel Wreath */}
                <svg viewBox="0 0 64 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-5 opacity-90 pb-1">
                  {/* Left Wreath Branch */}
                  <path d="M 8 16 C 14 6, 26 8, 30 18" stroke="#fde68a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <circle cx="12" cy="11" r="2" fill="#fde68a" />
                  <circle cx="18" cy="8" r="2" fill="#fde68a" />
                  <circle cx="25" cy="11" r="2" fill="#fde68a" />
                  {/* Right Wreath Branch */}
                  <path d="M 56 16 C 50 6, 38 8, 34 18" stroke="#fde68a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <circle cx="52" cy="11" r="2" fill="#fde68a" />
                  <circle cx="46" cy="8" r="2" fill="#fde68a" />
                  <circle cx="39" cy="11" r="2" fill="#fde68a" />
                </svg>
              </div>
            </div>

            {/* Step 3 (Right - Bronze/Coral) */}
            <div className="flex-1 flex flex-col items-center">
              {rank3 ? (
                <div className="w-12 h-12 rounded-full bg-orange-100 p-0.5 -mb-2.5 z-10 overflow-hidden shadow-md border-2 border-orange-300">
                  {rank3.avatar_url ? (
                    <img src={rank3.avatar_url} alt={rank3.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orange-400 text-white font-black text-xs flex items-center justify-center">
                      {rank3.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-12 h-12 -mb-2.5 z-10 rounded-full border-2 border-dashed border-orange-300 bg-orange-50/50" />
              )}
              {/* Step Block 3 */}
              <div className="w-full h-16 bg-[#c2410c] rounded-t-xl flex items-center justify-center text-white font-black text-xl shadow-md border-t-2 border-[#ea580c] pt-2">
                3
              </div>
            </div>

          </div>

        </div>

        {/* ======================================================================= */}
        {/* RIGHT: STUDENT RANKING LIST (7 Cols)                                     */}
        {/* ======================================================================= */}
        <div className="md:col-span-7 bg-[#faf8f5] rounded-2xl p-4 sm:p-5 border border-stone-200/60 shadow-2xs flex flex-col justify-between space-y-3 h-full">
          
          <div className="space-y-2.5">
            {/* Ranks 1 to 3 */}
            {topThree.map((entry, idx) => {
              const isCurrentUser = currentUserId && entry.student_id === currentUserId;

              return (
                <div
                  key={entry.student_id}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50/90 border border-blue-200'
                      : 'hover:bg-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Number (#1, #2, #3) */}
                    <span className="w-6 text-xs font-black text-amber-500 shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Avatar Frame */}
                    <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0 overflow-hidden border-2 border-stone-200 flex items-center justify-center text-xs font-black text-slate-700 shadow-2xs">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                      ) : (
                        entry.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    {/* Name & Task Count */}
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {entry.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {entry.assignments_completed || 0} tasks completed
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0 pl-3">
                    <span className="text-xs sm:text-sm font-black text-[#026fc3]">
                      {entry.points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Optional Ranks 4 to 6 (Strictly Unique Students) */}
            {nextThree.map((entry, idx) => {
              const isCurrentUser = currentUserId && entry.student_id === currentUserId;
              const rankNum = idx + 4;

              return (
                <div
                  key={entry.student_id}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50/90 border border-blue-200'
                      : 'hover:bg-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-xs font-black text-slate-400 shrink-0">
                      #{rankNum}
                    </span>

                    <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shadow-2xs">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                      ) : (
                        entry.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                        {entry.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {entry.assignments_completed || 0} tasks completed
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <span className="text-xs font-black text-slate-600">
                      {entry.points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Button: View Full Leaderboard */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAllModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-stone-50 text-slate-800 text-xs font-black border border-stone-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <span>View Full Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

        </div>

      </div>

      {/* ======================================================================= */}
      {/* FULL LEADERBOARD MODAL                                                  */}
      {/* ======================================================================= */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-stone-200 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Classroom Full Leaderboard</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Student List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {entries.map((entry, idx) => {
                const isCurrentUser = currentUserId && entry.student_id === currentUserId;

                return (
                  <div
                    key={entry.student_id}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isCurrentUser
                        ? 'bg-blue-50 border border-blue-200 font-bold'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 text-center text-xs font-black ${
                        idx < 3 ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-slate-700">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          entry.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{entry.name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-[#026fc3] text-white px-1.5 py-0.2 rounded font-extrabold">You</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{entry.assignments_completed} tasks completed</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-[#026fc3]">
                        {entry.points.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

