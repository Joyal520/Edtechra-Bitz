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
  const topThree = entries.slice(0, 3);

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-8 text-center border border-stone-200/70 shadow-xs space-y-2 h-full flex flex-col items-center justify-center min-h-[220px]">
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
      <div className="bg-white rounded-[24px] p-4 sm:p-5 border border-stone-200/70 shadow-xs flex flex-col justify-between space-y-4 relative overflow-hidden h-full">
        
        {/* Main Content: Split Grid (Left Podium / Right List) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          
          {/* LEFT: 3D Paper Podium (5 Cols on Tablet/Desktop) */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center p-2 sm:p-3 bg-[#f8fafd] rounded-2xl border border-slate-100">
            <div className="flex items-end justify-center gap-1.5 sm:gap-2 pt-8 pb-1 w-full max-w-[200px]">
              
              {/* Step 2 (Slate/Blue) */}
              <div className="flex-1 flex flex-col items-center">
                {rank2 ? (
                  <div className="w-8 h-8 rounded-full bg-slate-200 p-0.5 mb-1 overflow-hidden shadow-xs border border-slate-300">
                    {rank2.avatar_url ? (
                      <img src={rank2.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-400 text-white font-black text-[10px] flex items-center justify-center">
                        {rank2.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 mb-1" />
                )}
                {/* Step Block 2 */}
                <div className="w-full h-14 bg-[#334155] rounded-t-lg flex items-center justify-center text-white font-black text-sm shadow-xs border-t-2 border-[#475569]">
                  2
                </div>
              </div>

              {/* Step 1 (Gold/Center - Tallest) */}
              <div className="flex-1 flex flex-col items-center -mt-4">
                <span className="text-sm mb-0.5 animate-bounce">👑</span>
                {rank1 ? (
                  <div className="w-10 h-10 rounded-full bg-amber-200 p-0.5 mb-1 overflow-hidden shadow-xs border-2 border-amber-400 ring-2 ring-amber-300/40">
                    {rank1.avatar_url ? (
                      <img src={rank1.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                        {rank1.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 mb-1" />
                )}
                {/* Step Block 1 */}
                <div className="w-full h-20 bg-[#d97706] rounded-t-lg flex items-center justify-center text-white font-black text-base shadow-xs border-t-2 border-[#fbbf24]">
                  1
                </div>
              </div>

              {/* Step 3 (Bronze/Coral) */}
              <div className="flex-1 flex flex-col items-center">
                {rank3 ? (
                  <div className="w-8 h-8 rounded-full bg-orange-200 p-0.5 mb-1 overflow-hidden shadow-xs border border-orange-300">
                    {rank3.avatar_url ? (
                      <img src={rank3.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-orange-400 text-white font-black text-[10px] flex items-center justify-center">
                        {rank3.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 mb-1" />
                )}
                {/* Step Block 3 */}
                <div className="w-full h-11 bg-[#c2410c] rounded-t-lg flex items-center justify-center text-white font-black text-xs shadow-xs border-t-2 border-[#ea580c]">
                  3
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: Ranked Student List (7 Cols) */}
          <div className="sm:col-span-7 flex flex-col justify-between space-y-2.5">
            <div className="space-y-2">
              {topThree.map((entry, idx) => {
                const isCurrentUser = currentUserId && entry.student_id === currentUserId;
                const isFirst = idx === 0;

                return (
                  <div
                    key={entry.student_id}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      isCurrentUser
                        ? 'bg-blue-50/90 border border-blue-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Indicator */}
                      <span className={`w-4 text-center text-xs font-black shrink-0 ${
                        isFirst ? 'text-amber-500' : 'text-slate-500'
                      }`}>
                        {isFirst ? '#1' : `${idx + 1}`}
                      </span>

                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-full bg-slate-100 shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-700">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          entry.name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      {/* Name */}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {entry.name}
                        </div>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-xs font-black text-[#026fc3]">
                        {entry.points.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Button: View Full Leaderboard */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-extrabold border border-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <span>View Full Leaderboard</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* FULL LEADERBOARD MODAL */}
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
              {entries.map((entry) => {
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
                        entry.rank <= 3 ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        #{entry.rank}
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
