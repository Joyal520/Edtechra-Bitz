import React from 'react';
import { Trophy } from 'lucide-react';
import { ClassroomLeaderboardEntry } from '@/types/classroom';

interface ClassroomLeaderboardProps {
  entries: ClassroomLeaderboardEntry[];
  currentUserId?: string;
}

export const ClassroomLeaderboard: React.FC<ClassroomLeaderboardProps> = ({
  entries,
  currentUserId
}) => {
  const topThree = entries.slice(0, 3);

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-xs space-y-2">
        <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-xs font-bold text-slate-500">No leaderboard activity yet.</p>
        <p className="text-[11px] text-slate-400">Points will appear here as students complete tasks, quizzes, and exams.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Classroom Leaderboard</h2>
            <p className="text-xs text-slate-500 font-semibold">Live point rankings for this class</p>
          </div>
        </div>
      </div>

      {/* Top 3 Podium (If at least 2 entries) */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 pb-2 items-end">
          
          {/* Rank 2 (Silver) */}
          {topThree[1] ? (
            <div className="flex flex-col items-center p-3 bg-slate-50/80 rounded-2xl border border-slate-200 text-center space-y-1 relative">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center mb-1">
                2
              </span>
              <div className="w-10 h-10 rounded-full bg-slate-200 p-[1.5px] shrink-0 overflow-hidden">
                {topThree[1].avatar_url ? (
                  <img src={topThree[1].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-300 font-black text-xs flex items-center justify-center text-slate-800">
                    {topThree[1].name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <strong className="text-xs font-black text-slate-800 truncate max-w-full">
                {topThree[1].name}
              </strong>
              <span className="text-[11px] font-black text-[#026fc3] bg-blue-50 px-2 py-0.5 rounded-full">
                {topThree[1].points} pts
              </span>
            </div>
          ) : <div />}

          {/* Rank 1 (Gold) */}
          {topThree[0] && (
            <div className="flex flex-col items-center p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-300 text-center space-y-1.5 relative shadow-sm scale-105">
              <span className="w-7 h-7 rounded-full bg-amber-400 text-white font-black text-xs flex items-center justify-center mb-1 shadow-xs">
                👑
              </span>
              <div className="w-12 h-12 rounded-full bg-amber-300 p-[2px] shrink-0 overflow-hidden shadow-xs">
                {topThree[0].avatar_url ? (
                  <img src={topThree[0].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-amber-200 font-black text-sm flex items-center justify-center text-slate-900">
                    {topThree[0].name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <strong className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-full">
                {topThree[0].name}
              </strong>
              <span className="text-xs font-black text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                {topThree[0].points} pts
              </span>
            </div>
          )}

          {/* Rank 3 (Bronze) */}
          {topThree[2] ? (
            <div className="flex flex-col items-center p-3 bg-amber-50/40 rounded-2xl border border-amber-200/60 text-center space-y-1 relative">
              <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-900 font-black text-xs flex items-center justify-center mb-1">
                3
              </span>
              <div className="w-10 h-10 rounded-full bg-amber-200 p-[1.5px] shrink-0 overflow-hidden">
                {topThree[2].avatar_url ? (
                  <img src={topThree[2].avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-amber-100 font-black text-xs flex items-center justify-center text-slate-800">
                    {topThree[2].name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <strong className="text-xs font-black text-slate-800 truncate max-w-full">
                {topThree[2].name}
              </strong>
              <span className="text-[11px] font-black text-[#026fc3] bg-blue-50 px-2 py-0.5 rounded-full">
                {topThree[2].points} pts
              </span>
            </div>
          ) : <div />}

        </div>
      )}

      {/* Leaderboard Table List */}
      <div className="divide-y divide-slate-100">
        {entries.map((entry) => {
          const isCurrentUser = currentUserId && entry.student_id === currentUserId;

          return (
            <div
              key={entry.student_id}
              className={`flex items-center justify-between py-3 px-3 rounded-2xl transition-colors ${
                isCurrentUser
                  ? 'bg-blue-50/70 border border-blue-200 font-black'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center text-xs font-black ${entry.rank <= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                  #{entry.rank}
                </span>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    entry.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{entry.name}</span>
                    {isCurrentUser && (
                      <span className="text-[10px] bg-[#026fc3] text-white px-1.5 py-0.2 rounded font-extrabold">You</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">{entry.assignments_completed} tasks completed</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-[#026fc3]">
                  {entry.points} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
