import React, { useState } from 'react';
import { Trophy, ArrowRight, X, TrendingUp } from 'lucide-react';
import { ClassroomLeaderboardEntry } from '@/types/classroom';

interface ClassroomLeaderboardProps {
  entries: ClassroomLeaderboardEntry[];
  currentUserId?: string;
}

const PODIUM_IMAGE_URL = '/assets/ChatGPT%20Image%20Aug%2028,%202026,%2002_56_25%20PM.png';

export const ClassroomLeaderboard: React.FC<ClassroomLeaderboardProps> = ({
  entries,
  currentUserId
}) => {
  const [showAllModal, setShowAllModal] = useState(false);

  // Strictly partition unique students from the database
  const topThree = entries.slice(0, 3);
  const nextThree = entries.slice(3, 6);

  if (entries.length === 0) {
    return (
      <div className="bg-[#faf8f5] rounded-[28px] p-8 text-center border border-stone-200/70 shadow-xs space-y-2 h-full flex flex-col items-center justify-center min-h-[260px]">
        <Trophy className="w-10 h-10 text-amber-400/60 mx-auto" />
        <p className="text-sm font-black text-slate-700">No leaderboard activity yet</p>
        <p className="text-xs text-slate-400 font-medium max-w-xs">
          Student points from completed worksheets, quizzes, and exams will appear here.
        </p>
      </div>
    );
  }

  const rank1 = topThree[0] || null;
  const rank2 = topThree[1] || null;
  const rank3 = topThree[2] || null;

  return (
    <div className="space-y-6">
      
      {/* ======================================================================= */}
      {/* MAIN TOP 3 LEADERBOARD CARD                                             */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* LEFT: 3D CUT-PAPER PODIUM IMAGE WITH DYNAMIC OVERLAY (5 Cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative select-none">
          <div className="relative w-full max-w-[320px] aspect-[3/2] overflow-hidden rounded-2xl">
            {/* Background Paper-Cut Artwork */}
            <img
              src={PODIUM_IMAGE_URL}
              alt="Classroom Leaderboard Podium"
              className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
              loading="eager"
            />

            {/* Rank 2 Avatar (Left Slate Ring: center ~28.6%, ~49.5%, diam ~16%) */}
            <div className="absolute left-[28.6%] top-[49.5%] -translate-x-1/2 -translate-y-1/2 w-[16%] aspect-square rounded-full overflow-hidden shadow-inner flex items-center justify-center z-10">
              {rank2 ? (
                rank2.avatar_url ? (
                  <img src={rank2.avatar_url} alt={rank2.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-slate-400 text-white font-black text-[10px] sm:text-xs flex items-center justify-center">
                    {rank2.name.slice(0, 2).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-slate-200/40 rounded-full border border-dashed border-slate-300" />
              )}
            </div>
            {/* Rank 2 Number Overlay */}
            <span className="absolute left-[28.6%] top-[72%] -translate-x-1/2 -translate-y-1/2 text-white font-black text-lg sm:text-xl drop-shadow-md pointer-events-none z-10">
              2
            </span>

            {/* Rank 1 Avatar (Center Gold Ring: center ~50%, ~35.5%, diam ~20%) */}
            <div className="absolute left-[50%] top-[35.5%] -translate-x-1/2 -translate-y-1/2 w-[20%] aspect-square rounded-full overflow-hidden shadow-inner flex items-center justify-center z-10">
              {rank1 ? (
                rank1.avatar_url ? (
                  <img src={rank1.avatar_url} alt={rank1.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center">
                    {rank1.name.slice(0, 2).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-amber-100/40 rounded-full border border-dashed border-amber-300" />
              )}
            </div>
            {/* Rank 1 Number Overlay */}
            <span className="absolute left-[50%] top-[58%] -translate-x-1/2 -translate-y-1/2 text-white font-black text-2xl sm:text-3xl drop-shadow-md pointer-events-none z-10">
              1
            </span>

            {/* Rank 3 Avatar (Right Bronze Ring: center ~70.1%, ~50%, diam ~16%) */}
            <div className="absolute left-[70.1%] top-[50%] -translate-x-1/2 -translate-y-1/2 w-[16%] aspect-square rounded-full overflow-hidden shadow-inner flex items-center justify-center z-10">
              {rank3 ? (
                rank3.avatar_url ? (
                  <img src={rank3.avatar_url} alt={rank3.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-orange-400 text-white font-black text-[10px] sm:text-xs flex items-center justify-center">
                    {rank3.name.slice(0, 2).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-orange-100/40 rounded-full border border-dashed border-orange-300" />
              )}
            </div>
            {/* Rank 3 Number Overlay */}
            <span className="absolute left-[70.1%] top-[73%] -translate-x-1/2 -translate-y-1/2 text-white font-black text-lg sm:text-xl drop-shadow-md pointer-events-none z-10">
              3
            </span>

          </div>
        </div>

        {/* RIGHT: RANKS 1 TO 3 LIST (7 Cols) */}
        <div className="md:col-span-7 bg-[#faf8f5] rounded-2xl p-4 sm:p-5 border border-stone-200/70 shadow-2xs flex flex-col justify-between space-y-3 h-full">
          
          <div className="space-y-2.5">
            {topThree.map((entry, idx) => {
              const isCurrentUser = currentUserId && entry.student_id === currentUserId;

              return (
                <div
                  key={entry.student_id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50/90 border border-blue-200 shadow-2xs'
                      : 'hover:bg-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Indicator */}
                    <span className="w-6 text-sm font-black text-amber-500 shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Student Avatar */}
                    <div className="w-10 h-10 rounded-full bg-white shrink-0 overflow-hidden border-2 border-stone-200 flex items-center justify-center text-xs font-black text-slate-700 shadow-2xs">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-800">{entry.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Student Name & Completion */}
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                        <span>{entry.name}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-black uppercase bg-[#026fc3] text-white px-1.5 py-0.2 rounded-md">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-semibold">
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
          </div>

          {/* Bottom Action: View Full Leaderboard */}
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
      {/* SECOND STUDENT PANEL (RANKS #4, #5, #6 CONTINUATION)                   */}
      {/* ======================================================================= */}
      {nextThree.length > 0 && (
        <div className="pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-[#026fc3]" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Continuation Leaderboard (Ranks #4 – #{3 + nextThree.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {nextThree.map((entry, idx) => {
              const rankNum = idx + 4;
              const isCurrentUser = currentUserId && entry.student_id === currentUserId;

              return (
                <div
                  key={entry.student_id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-blue-50/90 border-blue-200 shadow-2xs'
                      : 'bg-[#faf8f5] hover:bg-white border-stone-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-black text-slate-400 w-5 shrink-0">
                      #{rankNum}
                    </span>

                    <div className="w-8 h-8 rounded-full bg-white shrink-0 overflow-hidden border border-stone-200 flex items-center justify-center text-[11px] font-black text-slate-700 shadow-2xs">
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                      ) : (
                        entry.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {entry.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold truncate">
                        {entry.assignments_completed || 0} tasks
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-black text-[#026fc3]">
                      {entry.points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

    </div>
  );
};

