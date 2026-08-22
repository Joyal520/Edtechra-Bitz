import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Crown,
  ChevronDown,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  Loader2
} from 'lucide-react';
import { LeaderboardPeriod, LeaderboardResponse } from '@/types/leaderboard';
import { leaderboardService } from '@/services/leaderboardService';
import { useAuth } from '@/context/AuthContext';

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all_time: 'All Time'
};

export const TopLearnersLeaderboard: React.FC = () => {
  const { user, isAdmin, session } = useAuth();

  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown states
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState<boolean>(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState<boolean>(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);

  // Admin Reset Modal State
  const [resetTargetPeriod, setResetTargetPeriod] = useState<'today' | 'week' | 'month' | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setPeriodDropdownOpen(false);
      }
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch leaderboard data
  const loadLeaderboard = async (selectedPeriod: LeaderboardPeriod) => {
    try {
      setLoading(true);
      setError(null);
      const token = session?.access_token || null;
      const res = await leaderboardService.getLeaderboard(selectedPeriod, token);
      setData(res);
    } catch (err: any) {
      console.error('[TopLearnersLeaderboard] Fetch error:', err);
      setError('Could not load leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(period);
  }, [period, session]);

  // Handle Admin Reset execution
  const handleExecuteReset = async () => {
    if (!resetTargetPeriod || isResetting) return;

    setIsResetting(true);
    try {
      const token = session?.access_token || null;
      const res = await leaderboardService.resetLeaderboard(resetTargetPeriod, token);
      setResetNotice(res.message);
      setResetTargetPeriod(null);
      setAdminMenuOpen(false);
      // Reload current leaderboard
      await loadLeaderboard(period);
      setTimeout(() => setResetNotice(null), 4000);
    } catch (err: any) {
      console.error('[TopLearnersLeaderboard] Reset error:', err);
      setError(err.message || 'Failed to reset leaderboard.');
    } finally {
      setIsResetting(false);
    }
  };

  const top10 = data?.top10 || [];
  const currentUser = data?.currentUser || null;

  // Podium Positions (1st, 2nd, 3rd)
  const firstPlace = top10.find((u) => u.rank === 1);
  const secondPlace = top10.find((u) => u.rank === 2);
  const thirdPlace = top10.find((u) => u.rank === 3);

  // Ranks 4–10
  const remainingRanks = top10.filter((u) => u.rank >= 4 && u.rank <= 10);

  // Helper: Format initials
  const getInitials = (name: string) => {
    return (name || 'L').slice(0, 2).toUpperCase();
  };

  return (
    <section className="w-full bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-7 shadow-xs space-y-6 relative overflow-hidden">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-2 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#0f233a] tracking-tight">
              Top 10 Learners
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Compete, climb, and become an EdTechra Champion!
          </p>
        </div>

        {/* Action Controls: Period Selector & Admin Reset Menu */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          
          {/* Period Selector Dropdown */}
          <div className="relative" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-50 hover:bg-stone-100 text-slate-800 border border-stone-200 text-xs font-black rounded-2xl shadow-2xs transition-all cursor-pointer"
            >
              <span>{PERIOD_LABELS[period]}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {periodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white border border-stone-200 rounded-2xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                {(['today', 'week', 'month', 'all_time'] as LeaderboardPeriod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPeriod(p);
                      setPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      period === p
                        ? 'bg-brand-50 text-[#026fc3] font-black'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{PERIOD_LABELS[p]}</span>
                    {period === p && <Check className="w-3.5 h-3.5 text-[#026fc3]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Admin Controls Dropdown (Restricted strictly to Authorized Admin) */}
          {isAdmin && (
            <div className="relative" ref={adminDropdownRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-extrabold rounded-2xl transition-all cursor-pointer"
                title="Leaderboard Administrative Controls"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin ▾</span>
              </button>

              {adminMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-2xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-700 border-b border-stone-100">
                    Leaderboard Resets
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setResetTargetPeriod('today');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Today</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setResetTargetPeriod('week');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Weekly</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setResetTargetPeriod('month');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Monthly</span>
                  </button>

                  <div className="border-t border-stone-100 my-1"></div>

                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen(false)}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Keep Options
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Admin Reset Feedback Notification */}
      {resetNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{resetNotice}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#026fc3]/30 border-t-[#026fc3] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400">Loading top learners...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && top10.length === 0 && (
        <div className="py-10 text-center space-y-2">
          <p className="text-sm font-black text-slate-700">No activity recorded for this period yet.</p>
          <p className="text-xs text-slate-400">Be the first to complete a quiz or lesson and claim #1 rank!</p>
        </div>
      )}

      {/* 2. TOP 3 PODIUM */}
      {!loading && top10.length > 0 && (
        <div className="space-y-6">
          <div className="pt-4 pb-2 px-2">
            <div className="flex items-end justify-center gap-2 sm:gap-4 max-w-lg mx-auto">
              
              {/* 🥈 2nd Place (Silver) */}
              <div className="flex-1 flex flex-col items-center text-center">
                {secondPlace ? (
                  <div className="space-y-1.5 flex flex-col items-center w-full">
                    {/* Medal / Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-slate-300 to-slate-400 p-[2.5px] shadow-sm">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center font-black text-slate-700">
                          {secondPlace.avatarUrl ? (
                            <img src={secondPlace.avatarUrl} alt={secondPlace.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(secondPlace.displayName)}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-1.5 -right-1 w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-black shadow-xs">
                        🥈
                      </div>
                    </div>

                    <div className="font-extrabold text-xs sm:text-sm text-[#0f233a] truncate max-w-[90px] sm:max-w-[120px]">
                      {secondPlace.displayName}
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black font-mono">
                      {secondPlace.xp.toLocaleString()} XP
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Level {secondPlace.level}
                    </span>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-300 italic">
                    Open Slot
                  </div>
                )}

                {/* Podium Pedestal Pillar 2 */}
                <div className="w-full h-20 sm:h-24 mt-2.5 rounded-t-2xl bg-gradient-to-b from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-black text-sm sm:text-base shadow-inner">
                  2nd
                </div>
              </div>

              {/* 🥇 1st Place (Gold, Champion) */}
              <div className="flex-1 flex flex-col items-center text-center -mt-4">
                {firstPlace ? (
                  <div className="space-y-1.5 flex flex-col items-center w-full relative">
                    {/* Crown Icon */}
                    <div className="text-amber-500 animate-bounce">
                      <Crown className="w-6 h-6 fill-amber-400" />
                    </div>

                    {/* Avatar with Gold Ring and Glow */}
                    <div className="relative">
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-[3px] shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                        <div className="w-full h-full rounded-full overflow-hidden bg-amber-50 flex items-center justify-center font-black text-slate-800 text-lg">
                          {firstPlace.avatarUrl ? (
                            <img src={firstPlace.avatarUrl} alt={firstPlace.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(firstPlace.displayName)}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-xs font-black shadow-xs">
                        🥇
                      </div>
                    </div>

                    <div className="font-black text-sm sm:text-base text-[#0f233a] truncate max-w-[100px] sm:max-w-[140px]">
                      {firstPlace.displayName}
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black font-mono shadow-2xs">
                      {firstPlace.xp.toLocaleString()} XP
                    </span>
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">
                      Level {firstPlace.level} • Champion
                    </span>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs text-slate-300 italic">
                    Open Slot
                  </div>
                )}

                {/* Podium Pedestal Pillar 1 */}
                <div className="w-full h-28 sm:h-32 mt-2.5 rounded-t-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 flex flex-col items-center justify-center text-slate-900 font-black text-base sm:text-lg shadow-md">
                  <span>1st</span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900/80">
                    Leader
                  </span>
                </div>
              </div>

              {/* 🥉 3rd Place (Bronze) */}
              <div className="flex-1 flex flex-col items-center text-center">
                {thirdPlace ? (
                  <div className="space-y-1.5 flex flex-col items-center w-full">
                    {/* Medal / Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-800 p-[2.5px] shadow-sm">
                        <div className="w-full h-full rounded-full overflow-hidden bg-amber-50 flex items-center justify-center font-black text-amber-900">
                          {thirdPlace.avatarUrl ? (
                            <img src={thirdPlace.avatarUrl} alt={thirdPlace.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(thirdPlace.displayName)}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-1.5 -right-1 w-6 h-6 rounded-full bg-amber-600 border-2 border-white flex items-center justify-center text-xs font-black text-white shadow-xs">
                        🥉
                      </div>
                    </div>

                    <div className="font-extrabold text-xs sm:text-sm text-[#0f233a] truncate max-w-[90px] sm:max-w-[120px]">
                      {thirdPlace.displayName}
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black font-mono">
                      {thirdPlace.xp.toLocaleString()} XP
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Level {thirdPlace.level}
                    </span>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-300 italic">
                    Open Slot
                  </div>
                )}

                {/* Podium Pedestal Pillar 3 */}
                <div className="w-full h-16 sm:h-20 mt-2.5 rounded-t-2xl bg-gradient-to-b from-amber-600/80 to-amber-700 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-inner">
                  3rd
                </div>
              </div>

            </div>
          </div>

          {/* 3. RANKS 4–10 LIST */}
          {remainingRanks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-3 pb-1 flex items-center justify-between">
                <span>Rank & Learner</span>
                <span>XP Earned</span>
              </div>

              <div className="space-y-1.5">
                {remainingRanks.map((entry) => {
                  const isCurrent = user && entry.userId === user.id;
                  return (
                    <div
                      key={entry.userId || entry.rank}
                      className={`p-2.5 sm:p-3 rounded-2xl transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-brand-50/80 border-2 border-[#026fc3] shadow-xs'
                          : 'bg-stone-50/70 border border-stone-200/70 hover:bg-stone-100/70'
                      }`}
                    >
                      {/* Left: Rank, Avatar, Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isCurrent
                            ? 'bg-[#026fc3] text-white'
                            : 'bg-white text-slate-700 border border-stone-200'
                        }`}>
                          {entry.rank}
                        </div>

                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-slate-700">
                          {entry.avatarUrl ? (
                            <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(entry.displayName)}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs sm:text-sm text-[#0f233a] truncate">
                              {entry.displayName}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded-md bg-[#026fc3] text-white text-[9px] font-black uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            Level {entry.level}
                          </div>
                        </div>
                      </div>

                      {/* Right: XP Chip */}
                      <div className="shrink-0 flex items-center gap-1 font-mono text-xs sm:text-sm font-black text-slate-800">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                        <span>{entry.xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. CURRENT USER POSITION (When Outside Top 10) */}
          {user && currentUser && !currentUser.isInTop10 && (
            <div className="pt-3 border-t border-stone-200">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50/70 border border-brand-200 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#026fc3] text-white font-black text-xs flex items-center justify-center shrink-0">
                    #{currentUser.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#0f233a] truncate">
                        {currentUser.displayName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md bg-[#026fc3] text-white text-[9px] font-black uppercase">
                        Your Rank
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Complete quizzes & lessons to enter the Top 10!
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs sm:text-sm font-black font-mono text-[#026fc3]">
                    {currentUser.xp.toLocaleString()} XP
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    Level {currentUser.level}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. ADMIN RESET CONFIRMATION MODAL                                     */}
      {/* ===================================================================== */}
      {resetTargetPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-[#0f233a]">
                Reset {PERIOD_LABELS[resetTargetPeriod]} Leaderboard?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This will reset the competitive ranking for <strong>{PERIOD_LABELS[resetTargetPeriod]}</strong>.
              </p>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-semibold">
                🛡️ <strong>Safety Guarantee:</strong> Users&apos; all-time XP, learning progress, and streaks will <strong>not</strong> be deleted.
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetTargetPeriod(null)}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset {PERIOD_LABELS[resetTargetPeriod]}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
