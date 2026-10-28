import React, { useState } from 'react';
import {
  Trophy,
  ArrowRight,
  X,
  TrendingUp,
  Settings,
  Clock,
  Sparkles,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { ClassroomLeaderboardEntry, LeaderboardResetFrequency } from '@/types/classroom';
import { formatLeaderboardResetText, DEFAULT_LEADERBOARD_TIMEZONE } from '@/utils/leaderboardResetUtils';
import { LeaderboardSettingsModal } from './LeaderboardSettingsModal';
import { ShareLeaderboardModal } from './ShareLeaderboardModal';

interface ClassroomLeaderboardProps {
  entries: ClassroomLeaderboardEntry[];
  currentUserId?: string;
  classroomId?: string;
  isTeacher?: boolean;
  resetFrequency?: LeaderboardResetFrequency;
  nextResetAt?: string | null;
  lastResetAt?: string | null;
  timeZone?: string;
  onRefreshLeaderboard?: () => Promise<void> | void;
  onShowToast?: (message: string) => void;
}

const PODIUM_IMAGE_URL = '/assets/ChatGPT%20Image%20Aug%2028,%202026,%2002_56_25%20PM.png';

export const ClassroomLeaderboard: React.FC<ClassroomLeaderboardProps> = ({
  entries,
  currentUserId,
  classroomId,
  isTeacher = false,
  resetFrequency = 'never',
  nextResetAt,
  lastResetAt,
  timeZone = DEFAULT_LEADERBOARD_TIMEZONE,
  onRefreshLeaderboard,
  onShowToast
}) => {
  const [showAllModal, setShowAllModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [localToast, setLocalToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(null), 3500);
    }
  };

  // Strictly partition unique students from the database
  const topThree = entries.slice(0, 3);
  const nextThree = entries.slice(3, 6);

  // Check if all students currently have 0 XP (e.g. right after a leaderboard reset or at cycle start)
  const allZeroXP = entries.length > 0 && entries.every((e) => (e.points || 0) === 0);

  // Format schedule text for friendly reset indicator
  const { frequencyLabel, nextResetLabel } = formatLeaderboardResetText(
    resetFrequency,
    nextResetAt,
    timeZone
  );

  return (
    <div className="space-y-4">

      {/* ======================================================================= */}
      {/* TOP HEADER STATUS BAR: RESET INDICATOR & TEACHER SETTINGS CONTROL        */}
      {/* ======================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
        
        {/* Left: Next Reset Indicator */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faf8f5] border border-stone-200/90 text-xs font-semibold text-slate-700 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Reset frequency: <strong className="text-slate-900 font-black">{frequencyLabel}</strong>
            </span>

            {resetFrequency !== 'never' && nextResetLabel && (
              <>
                <span className="text-stone-300">•</span>
                <span className="text-slate-500">
                  Next reset: <strong className="text-[#026fc3] font-bold">{nextResetLabel}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Controls - Teacher-only Settings & Share Leaderboard Update */}
        <div className="flex items-center gap-2">
          {isTeacher && classroomId && (
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-xs font-bold text-slate-700 shadow-2xs hover:border-[#026fc3]/60 hover:text-[#026fc3] active:scale-95 transition-all cursor-pointer"
              title="Classroom Leaderboard Scoring & Reset Schedule (Teacher Only)"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#026fc3] group-hover:rotate-45 transition-all duration-300" />
              <span>Leaderboard Settings</span>
            </button>
          )}

          {classroomId && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-xs font-bold text-slate-700 shadow-2xs hover:border-amber-400/80 hover:text-amber-600 active:scale-95 transition-all cursor-pointer"
              title="Share Leaderboard Update"
              aria-label="Share Leaderboard Update"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
              <span>Share</span>
            </button>
          )}
        </div>

      </div>

      {/* ======================================================================= */}
      {/* EMPTY STATE (No enrolled students)                                      */}
      {/* ======================================================================= */}
      {entries.length === 0 ? (
        <div className="bg-[#faf8f5] rounded-[28px] p-8 text-center border border-stone-200/70 shadow-xs space-y-2 h-full flex flex-col items-center justify-center min-h-[260px]">
          <Trophy className="w-10 h-10 text-amber-400/60 mx-auto" />
          <p className="text-sm font-black text-slate-700">No leaderboard activity yet</p>
          <p className="text-xs text-slate-400 font-medium max-w-xs">
            Student points from completed worksheets, quizzes, and exams will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Friendly Fresh Period Banner when all student scores are at 0 XP */}
          {allZeroXP && (
            <div className="bg-sky-50/90 border border-sky-200/80 rounded-2xl p-3 sm:px-4 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#026fc3]">
                <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Leaderboard reset. Complete activities to take the lead!</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-[#026fc3] px-2 py-0.5 rounded-md border border-sky-200 shrink-0">
                Fresh Period • All 0 XP
              </span>
            </div>
          )}

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
                  {topThree[1] ? (
                    topThree[1].avatar_url ? (
                      <img src={topThree[1].avatar_url} alt={topThree[1].name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full bg-slate-400 text-white font-black text-[10px] sm:text-xs flex items-center justify-center">
                        {topThree[1].name.slice(0, 2).toUpperCase()}
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
                  {topThree[0] ? (
                    topThree[0].avatar_url ? (
                      <img src={topThree[0].avatar_url} alt={topThree[0].name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center">
                        {topThree[0].name.slice(0, 2).toUpperCase()}
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
                  {topThree[2] ? (
                    topThree[2].avatar_url ? (
                      <img src={topThree[2].avatar_url} alt={topThree[2].name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full bg-orange-400 text-white font-black text-[10px] sm:text-xs flex items-center justify-center">
                        {topThree[2].name.slice(0, 2).toUpperCase()}
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
                  const displayPoints = entry.points || 0;

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
                        <span className={`w-6 text-sm font-black shrink-0 ${
                          idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-500' : 'text-amber-700'
                        }`}>
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

                        {/* Student Name */}
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                            <span>{entry.name}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] font-black uppercase bg-[#026fc3] text-white px-1.5 py-0.2 rounded-md">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Points / XP */}
                      <div className="text-right shrink-0 pl-3">
                        <span className={`text-xs sm:text-sm font-black ${
                          displayPoints === 0 ? 'text-slate-400' : 'text-[#026fc3]'
                        }`}>
                          {displayPoints.toLocaleString()} XP
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
                  const displayPoints = entry.points || 0;

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
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className={`text-xs font-black ${
                          displayPoints === 0 ? 'text-slate-400' : 'text-[#026fc3]'
                        }`}>
                          {displayPoints.toLocaleString()} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
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
                const displayPoints = entry.points || 0;

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
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-black ${
                        displayPoints === 0 ? 'text-slate-400' : 'text-[#026fc3]'
                      }`}>
                        {displayPoints.toLocaleString()} XP
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

      {/* ======================================================================= */}
      {/* TEACHER-ONLY LEADERBOARD SETTINGS MODAL                                 */}
      {/* ======================================================================= */}
      {isTeacher && classroomId && (
        <LeaderboardSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          classroomId={classroomId}
          currentFrequency={resetFrequency}
          nextResetAt={nextResetAt}
          lastResetAt={lastResetAt}
          timeZone={timeZone}
          onSettingsUpdated={async () => {
            await onRefreshLeaderboard?.();
          }}
          onLeaderboardReset={async () => {
            await onRefreshLeaderboard?.();
          }}
          onShowToast={showNotification}
        />
      )}

      {/* ======================================================================= */}
      {/* SHARE LEADERBOARD MODAL                                                 */}
      {/* ======================================================================= */}
      {classroomId && (
        <ShareLeaderboardModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          classroomId={classroomId}
          initialEntries={entries}
          onRefreshParentLeaderboard={onRefreshLeaderboard}
          onShowToast={showNotification}
        />
      )}

      {/* Local Toast Fallback if parent does not provide one */}
      {localToast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/80 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{localToast}</span>
        </div>
      )}

    </div>
  );
};
