import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Link2,
  MessageCircle,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { ClassroomLeaderboardEntry, LeaderboardResetFrequency } from '@/types/classroom';
import {
  DEFAULT_LEADERBOARD_TIMEZONE,
  formatLeaderboardResetText,
  sanitizeLeaderboardStudentName,
} from '@/utils/leaderboardResetUtils';
import {
  formatLeaderboardPeriodRange,
  partitionLeaderboardEntries,
} from '@/utils/classChampionsUtils';
import { ClassChampionsPodium } from './champions/ClassChampionsPodium';
import { ClassroomOptionsDropdown } from './ClassroomOptionsDropdown';
import { LeaderboardSettingsModal } from './LeaderboardSettingsModal';
import { ShareLeaderboardModal, ShareQuickAction } from './ShareLeaderboardModal';

interface ClassroomLeaderboardProps {
  entries: ClassroomLeaderboardEntry[];
  currentUserId?: string;
  classroomId?: string;
  classroomName?: string;
  isTeacher?: boolean;
  resetFrequency?: LeaderboardResetFrequency;
  nextResetAt?: string | null;
  lastResetAt?: string | null;
  timeZone?: string;
  onRefreshLeaderboard?: () => Promise<void> | void;
  onShowToast?: (message: string) => void;
}

const getInitials = (name: string): string => {
  const clean = sanitizeLeaderboardStudentName(name).trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'ST').toUpperCase();
};

const LeaderboardAvatar: React.FC<{
  avatarUrl?: string | null;
  name: string;
  sizeClass?: string;
}> = ({ avatarUrl, name, sizeClass = 'w-9 h-9' }) => {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`${sizeClass} rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-xs font-extrabold text-slate-700 shadow-2xs`}
    >
      {avatarUrl && !failed ? (
        <img
          src={avatarUrl}
          alt={sanitizeLeaderboardStudentName(name)}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-sky-100 to-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
};

export const ClassroomLeaderboard: React.FC<ClassroomLeaderboardProps> = ({
  entries,
  currentUserId,
  classroomId,
  classroomName = 'Classroom',
  isTeacher = false,
  resetFrequency = 'never',
  nextResetAt,
  lastResetAt,
  timeZone = DEFAULT_LEADERBOARD_TIMEZONE,
  onRefreshLeaderboard,
  onShowToast,
}) => {
  const [showAllModal, setShowAllModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareInitialAction, setShareInitialAction] = useState<ShareQuickAction>('preview');
  const [localToast, setLocalToast] = useState<string | null>(null);

  const shareBtnRef = useRef<HTMLDivElement | null>(null);

  const showNotification = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    } else {
      setLocalToast(msg);
      window.setTimeout(() => setLocalToast(null), 3500);
    }
  };

  // Strictly partition: Top 3 ONLY on podium; #4+ ONLY in remaining leaderboard
  const { sortedEntries, podiumEntries, remainingEntries } =
    partitionLeaderboardEntries(entries);

  const periodLabel = formatLeaderboardPeriodRange(
    resetFrequency,
    lastResetAt,
    nextResetAt,
    timeZone
  );

  const allZeroXP =
    sortedEntries.length > 0 && sortedEntries.every((e) => (e.points || 0) === 0);

  const { frequencyLabel, nextResetLabel } = formatLeaderboardResetText(
    resetFrequency,
    nextResetAt,
    timeZone
  );

  const openShareWithAction = (action: ShareQuickAction) => {
    setShareMenuOpen(false);
    setShareInitialAction(action);
    setShowShareModal(true);
  };

  return (
    <div className="space-y-4">
      {/* ======================================================================= */}
      {/* TOP HEADER STATUS BAR: RESET INDICATOR, SETTINGS & SHARE DROPDOWN       */}
      {/* ======================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-stone-200/80">
        {/* Left: Reset Indicator */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faf8f5] border border-stone-200/90 text-xs font-semibold text-slate-700 shadow-2xs flex-wrap">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Reset frequency:{' '}
              <strong className="text-slate-900 font-black">{frequencyLabel}</strong>
            </span>

            {resetFrequency !== 'never' && nextResetLabel && (
              <>
                <span className="text-stone-300">•</span>
                <span className="text-slate-500">
                  Next reset:{' '}
                  <strong className="text-[#026fc3] font-bold">{nextResetLabel}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Controls */}
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
            <div className="relative" ref={shareBtnRef}>
              {/* Subtle Golden Rays accent matching Class Champions design */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="w-4 h-4 absolute -top-2 -right-2 pointer-events-none select-none"
              >
                <path
                  d="M5 17L10 9M12 19L19 14M4 9L5 3"
                  stroke="#f59e0b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>

              <button
                type="button"
                onClick={() => setShareMenuOpen((prev) => !prev)}
                className={`group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer ${
                  shareMenuOpen
                    ? 'border-[#026fc3] bg-sky-100/80 text-[#026fc3]'
                    : 'border-[#026fc3]/80 text-[#026fc3] bg-sky-50/50 hover:bg-sky-50'
                }`}
                title="Share Class Champions Achievement Certificate"
                aria-label="Share Class Champions"
                aria-expanded={shareMenuOpen}
                aria-haspopup="true"
              >
                <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Share</span>
              </button>

              <ClassroomOptionsDropdown
                isOpen={shareMenuOpen}
                onClose={() => setShareMenuOpen(false)}
                anchorRef={shareBtnRef}
                preferredAlign="right"
                widthPx={260}
              >
                <div className="py-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => openShareWithAction('whatsapp')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </span>
                      <span>Share on WhatsApp</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openShareWithAction('download')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Download className="w-3.5 h-3.5" />
                      </span>
                      <span>Download Achievement Certificate</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openShareWithAction('link')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:text-[#026fc3] hover:bg-sky-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-[#026fc3] flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5" />
                      </span>
                      <span>Copy Share Link</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => openShareWithAction('preview')}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                      <span>Preview &amp; Achievement Gallery</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </ClassroomOptionsDropdown>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* EMPTY STATE (No enrolled students)                                      */}
      {/* ======================================================================= */}
      {sortedEntries.length === 0 ? (
        <div className="bg-[#faf8f5] rounded-[28px] p-8 text-center border border-stone-200/70 shadow-xs space-y-2 h-full flex flex-col items-center justify-center min-h-[260px]">
          <Trophy className="w-10 h-10 text-amber-400/60 mx-auto" />
          <p className="text-sm font-black text-slate-700">No leaderboard activity yet</p>
          <p className="text-xs text-slate-400 font-medium max-w-xs">
            Student points from completed worksheets, quizzes, and exams will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Fresh Period Banner when all scores are 0 XP */}
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
          {/* CLASS CHAMPIONS PODIUM (LEFT) + REMAINING LEADERBOARD #4+ (RIGHT)       */}
          {/* ======================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Left: Class Champions Podium (Top 3 only) */}
            <div className="md:col-span-6">
              <ClassChampionsPodium
                topThree={podiumEntries}
                currentUserId={currentUserId}
              />
            </div>

            {/* Right: Remaining Leaderboard (#4 and below only — never duplicates Top 3) */}
            <div className="md:col-span-6 bg-[#f8fafc] rounded-[26px] p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                {/* Panel Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#026fc3] flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4 stroke-[2.4]" />
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Leaderboard
                    </h4>
                  </div>

                  <span className="bg-blue-50 text-[#026fc3] border border-blue-200/60 text-[11px] font-bold px-3 py-1 rounded-full">
                    Students #4 and below
                  </span>
                </div>

                {/* Remaining Ranked Student Rows */}
                {remainingEntries.length > 0 ? (
                  <div className="space-y-2.5">
                    {remainingEntries.slice(0, 5).map((entry) => {
                      const isCurrentUser = Boolean(
                        currentUserId && entry.student_id === currentUserId
                      );

                      return (
                        <div
                          key={entry.student_id}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border transition-all ${
                            isCurrentUser
                              ? 'bg-sky-50/90 border-sky-200 shadow-2xs'
                              : 'bg-white border-slate-100 hover:border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.03)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 text-xs sm:text-sm font-black text-indigo-700 shrink-0 tabular-nums">
                              #{entry.rank}
                            </span>

                            <LeaderboardAvatar
                              avatarUrl={entry.avatar_url}
                              name={entry.name}
                            />

                            <div className="min-w-0 flex items-center gap-1.5">
                              <span
                                className="text-xs sm:text-sm font-extrabold text-slate-900 truncate"
                                title={entry.name}
                              >
                                {entry.name}
                              </span>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded bg-[#026fc3] text-white text-[10px] font-extrabold shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`text-xs sm:text-sm font-black shrink-0 tabular-nums ${
                              entry.points === 0 ? 'text-slate-400' : 'text-[#026fc3]'
                            }`}
                          >
                            {entry.points.toLocaleString()} XP
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-6 text-center space-y-1.5 my-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-700">
                      Ranks #4 and below will appear here
                    </p>
                    <p className="text-xs text-slate-400">
                      All {sortedEntries.length}{' '}
                      {sortedEntries.length === 1 ? 'student is' : 'students are'} currently celebrated on the Class Champions podium!
                    </p>
                  </div>
                )}
              </div>

              {/* View Full Leaderboard CTA */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAllModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs sm:text-sm font-extrabold text-slate-700 hover:text-[#026fc3] hover:border-sky-200 shadow-2xs transition-all cursor-pointer group"
                >
                  <span>
                    View Full Leaderboard ({sortedEntries.length}{' '}
                    {sortedEntries.length === 1 ? 'Student' : 'Students'})
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#026fc3] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================================================================= */}
      {/* FULL LEADERBOARD MODAL                                                  */}
      {/* ======================================================================= */}
      {showAllModal && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllModal(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">
                  Classroom Full Leaderboard
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                aria-label="Close full leaderboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {sortedEntries.map((entry, idx) => {
                const isCurrentUser = Boolean(
                  currentUserId && entry.student_id === currentUserId
                );
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
                      <span
                        className={`w-7 text-center text-xs font-black ${
                          idx < 3 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <LeaderboardAvatar
                        avatarUrl={entry.avatar_url}
                        name={entry.name}
                        sizeClass="w-8 h-8"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{entry.name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-[#026fc3] text-white px-1.5 py-0.2 rounded font-extrabold">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-black ${
                          displayPoints === 0 ? 'text-slate-400' : 'text-[#026fc3]'
                        }`}
                      >
                        {displayPoints.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

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
      {/* SHARE CLASS CHAMPIONS CERTIFICATE MODAL                                 */}
      {/* ======================================================================= */}
      {classroomId && (
        <ShareLeaderboardModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          classroomId={classroomId}
          classroomName={classroomName}
          periodLabel={periodLabel}
          initialAction={shareInitialAction}
          initialEntries={sortedEntries}
          onRefreshParentLeaderboard={onRefreshLeaderboard}
          onShowToast={showNotification}
        />
      )}

      {/* Local Toast Fallback */}
      {localToast && (
        <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700/80 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{localToast}</span>
        </div>
      )}
    </div>
  );
};
