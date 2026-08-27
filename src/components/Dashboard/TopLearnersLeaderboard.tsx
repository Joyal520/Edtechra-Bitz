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
  Loader2,
  Calendar,
  Sparkles,
  Star
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

// Curated avatar background palette for initials fallback
const AVATAR_BG_COLORS = [
  'bg-emerald-600',
  'bg-teal-700',
  'bg-amber-600',
  'bg-purple-600',
  'bg-sky-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-blue-600'
];

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

  // Handle immediate period selection
  const handleSelectPeriod = (selectedPeriod: LeaderboardPeriod) => {
    setPeriod(selectedPeriod);
    setPeriodDropdownOpen(false);
    loadLeaderboard(selectedPeriod);
  };

  const top10 = data?.top10 || [];
  const currentUser = data?.currentUser || null;

  // Podium Positions (1st, 2nd, 3rd)
  const firstPlace = top10.find((u) => u.rank === 1);
  const secondPlace = top10.find((u) => u.rank === 2);
  const thirdPlace = top10.find((u) => u.rank === 3);

  // Ranks 4–10 (Guaranteed to render all 10 without cutoffs)
  const remainingRanks = top10.filter((u) => u.rank >= 4 && u.rank <= 10);

  // Helper: Format initials
  const getInitials = (name: string) => {
    return (name || 'L').slice(0, 2).toUpperCase();
  };

  return (
    <section className="w-full bg-gradient-to-b from-[#0c1322] via-[#131b2e] to-[#1a243a] text-white rounded-[32px] p-4 sm:p-7 shadow-2xl border border-slate-800/80 space-y-6 sm:space-y-8 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
            <Trophy className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Top 10 Learners</span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-300 mt-0.5">
              Compete, climb, and become an EdTechra Champion!
            </p>
          </div>
        </div>

        {/* Action Controls: Period Selector & Admin Reset Menu */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          
          {/* Period Selector Dropdown */}
          <div className="relative" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/20 text-xs font-bold rounded-2xl shadow-lg backdrop-blur-md transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{PERIOD_LABELS[period]}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {periodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#141e34] border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                {(['today', 'week', 'month', 'all_time'] as LeaderboardPeriod[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPeriod(p)}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleSelectPeriod(p);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      period === p
                        ? 'bg-[#026fc3] text-white font-black'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span>{PERIOD_LABELS[p]}</span>
                    {period === p && <Check className="w-3.5 h-3.5 text-white" />}
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 text-xs font-extrabold rounded-2xl shadow-lg backdrop-blur-md transition-all cursor-pointer"
                title="Leaderboard Administrative Controls"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                <span>Admin ▾</span>
              </button>

              {adminMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#141e34] border border-purple-500/40 rounded-2xl shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                  
                  {/* Reset Frequency Setting */}
                  <div className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-300 border-b border-slate-700/80">
                    Leaderboard Reset Schedule
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const token = session?.access_token || null;
                        await leaderboardService.updateLeaderboardSettings('weekly', token);
                        setPeriod('week');
                        setAdminMenuOpen(false);
                        setResetNotice('Leaderboard reset schedule set to Weekly (Monday-Sunday).');
                        await loadLeaderboard('week');
                        setTimeout(() => setResetNotice(null), 4000);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        period === 'week' ? 'bg-purple-600 text-white' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>Weekly (Mon-Sun)</span>
                      {period === 'week' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const token = session?.access_token || null;
                        await leaderboardService.updateLeaderboardSettings('monthly', token);
                        setPeriod('month');
                        setAdminMenuOpen(false);
                        setResetNotice('Leaderboard reset schedule set to Monthly (1st - End of Month).');
                        await loadLeaderboard('month');
                        setTimeout(() => setResetNotice(null), 4000);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        period === 'month' ? 'bg-purple-600 text-white' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>Monthly (1st - End)</span>
                      {period === 'month' && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const token = session?.access_token || null;
                        await leaderboardService.updateLeaderboardSettings('never', token);
                        setPeriod('all_time');
                        setAdminMenuOpen(false);
                        setResetNotice('Leaderboard reset schedule set to Never (All-Time Cumulative).');
                        await loadLeaderboard('all_time');
                        setTimeout(() => setResetNotice(null), 4000);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        period === 'all_time' ? 'bg-purple-600 text-white' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>Never (All Time)</span>
                      {period === 'all_time' && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="border-t border-slate-700/80 my-1"></div>

                  <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Instant Manual Resets
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setResetTargetPeriod('week');
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-rose-500/20 hover:text-rose-200 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Weekly Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      setResetTargetPeriod('month');
                    }}
                    className="w-full text-left px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-rose-500/20 hover:text-rose-200 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Monthly Now</span>
                  </button>

                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Admin Reset Feedback Notification */}
      {resetNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{resetNotice}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <div className="w-9 h-9 border-3 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-300">Loading top learners...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && top10.length === 0 && (
        <div className="py-12 text-center space-y-3 bg-slate-900/40 rounded-3xl p-6 border border-slate-800/80">
          <p className="text-base font-black text-white">No activity recorded for this period yet.</p>
          <p className="text-xs text-slate-400">Be the first to complete a quiz or lesson and claim #1 rank!</p>
          {period !== 'all_time' && (
            <button
              type="button"
              onClick={() => handleSelectPeriod('all_time')}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 fill-slate-950" />
              <span>View All-Time Champions</span>
            </button>
          )}
        </div>
      )}

      {/* 2. TOP 3 PODIUM */}
      {!loading && top10.length > 0 && (
        <div className="space-y-6 sm:space-y-8 relative z-10">
          <div className="pt-2 pb-0 px-1 sm:px-4">
            <div className="flex items-end justify-center gap-2 sm:gap-6 max-w-xl mx-auto">
              
              {/* 🥈 2nd Place (Silver) */}
              <div className="flex-1 flex flex-col items-center text-center">
                {secondPlace ? (
                  <div className="space-y-2 flex flex-col items-center w-full">
                    {/* Medal / Avatar */}
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 p-[3px] shadow-[0_0_20px_rgba(203,213,225,0.25)]">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center font-black text-slate-100 text-lg">
                          {secondPlace.avatarUrl ? (
                            <img src={secondPlace.avatarUrl} alt={secondPlace.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(secondPlace.displayName)}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-1.5 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200 text-slate-800 border-2 border-[#141e34] flex items-center justify-center text-xs font-black shadow-md">
                        🥈
                      </div>
                    </div>

                    <div className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[95px] sm:max-w-[130px]">
                      {secondPlace.displayName}
                    </div>

                    <span className="px-3 py-0.5 rounded-full bg-[#1e293b] text-blue-300 border border-blue-500/30 text-[11px] font-black font-mono shadow-xs">
                      {secondPlace.xp.toLocaleString()} XP
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Level {secondPlace.level}
                    </span>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-500 italic">
                    Open Slot
                  </div>
                )}

                {/* Podium Pedestal Pillar 2 */}
                <div className="w-full h-24 sm:h-28 mt-3 rounded-t-2xl bg-gradient-to-b from-[#475569] via-[#334155] to-[#1e293b] border-t-2 border-slate-300 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-200/20 border border-slate-300/40 flex items-center justify-center text-slate-100 font-black text-sm sm:text-base shadow-inner">
                    2
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-300 mt-1">
                    Silver
                  </span>
                </div>
              </div>

              {/* 🥇 1st Place (Gold, Champion) */}
              <div className="flex-1 flex flex-col items-center text-center -mt-6">
                {firstPlace ? (
                  <div className="space-y-2 flex flex-col items-center w-full relative">
                    {/* Crown Icon */}
                    <div className="text-amber-400 animate-bounce">
                      <Crown className="w-7 h-7 sm:w-8 sm:h-8 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                    </div>

                    {/* Avatar with Gold Ring and Glow */}
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-500 p-[3.5px] shadow-[0_0_35px_rgba(245,158,11,0.6)]">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center font-black text-amber-300 text-xl">
                          {firstPlace.avatarUrl ? (
                            <img src={firstPlace.avatarUrl} alt={firstPlace.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(firstPlace.displayName)}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 text-slate-950 border-2 border-[#141e34] flex items-center justify-center text-xs sm:text-sm font-black shadow-md">
                        🥇
                      </div>
                    </div>

                    <div className="font-black text-sm sm:text-base text-white truncate max-w-[110px] sm:max-w-[150px]">
                      {firstPlace.displayName}
                    </div>

                    <span className="px-3.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] sm:text-xs font-black font-mono shadow-xs">
                      {firstPlace.xp.toLocaleString()} XP
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>LEVEL {firstPlace.level} • CHAMPION</span>
                    </span>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs text-slate-500 italic">
                    Open Slot
                  </div>
                )}

                {/* Podium Pedestal Pillar 1 */}
                <div className="w-full h-32 sm:h-36 mt-3 rounded-t-2xl bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] border-t-3 border-yellow-300 flex flex-col items-center justify-center shadow-[0_10px_25px_rgba(217,119,6,0.3)] relative overflow-hidden">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-300/30 border border-yellow-200/50 flex items-center justify-center text-yellow-100 font-black text-base sm:text-lg shadow-inner">
                    1
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-black text-yellow-200 mt-1">
                    Champion
                  </span>
                </div>
              </div>

              {/* 🥉 3rd Place (Bronze) */}
              <div className="flex-1 flex flex-col items-center text-center">
                {thirdPlace ? (
                  <div className="space-y-2 flex flex-col items-center w-full">
                    {/* Medal / Avatar */}
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-600 via-orange-400 to-amber-800 p-[3px] shadow-[0_0_20px_rgba(217,119,6,0.25)]">
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center font-black text-amber-200 text-lg">
                          {thirdPlace.avatarUrl ? (
                            <img src={thirdPlace.avatarUrl} alt={thirdPlace.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(thirdPlace.displayName)}</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-1.5 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-700 text-white border-2 border-[#141e34] flex items-center justify-center text-xs font-black shadow-md">
                        🥉
                      </div>
                    </div>

                    <div className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[95px] sm:max-w-[130px]">
                      {thirdPlace.displayName}
                    </div>

                    <span className="px-3 py-0.5 rounded-full bg-amber-900/30 text-amber-300 border border-amber-700/40 text-[11px] font-black font-mono shadow-xs">
                      {thirdPlace.xp.toLocaleString()} XP
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Level {thirdPlace.level}
                    </span>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-xs text-slate-500 italic">
                    Open Slot
                  </div>
                )}

                {/* Podium Pedestal Pillar 3 */}
                <div className="w-full h-20 sm:h-24 mt-3 rounded-t-2xl bg-gradient-to-b from-[#9a3412] via-[#7c2d12] to-[#431407] border-t-2 border-orange-400 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-300/20 border border-orange-300/40 flex items-center justify-center text-orange-100 font-black text-sm sm:text-base shadow-inner">
                    3
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-200 mt-1">
                    Bronze
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* 3. RANKS 4–10 WHITE CARD CONTAINER */}
          {remainingRanks.length > 0 && (
            <div className="bg-white text-slate-900 rounded-[28px] p-4 sm:p-6 shadow-2xl border border-stone-200/80 space-y-3">
              
              {/* Header Label Row */}
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                <span>RANK & LEARNER</span>
                <span>XP EARNED</span>
              </div>

              {/* Ranks 4 to 10 List */}
              <div className="space-y-2">
                {remainingRanks.map((entry, index) => {
                  const isCurrent = user && entry.userId === user.id;
                  const bgFallback = AVATAR_BG_COLORS[index % AVATAR_BG_COLORS.length];

                  return (
                    <div
                      key={entry.userId || entry.rank}
                      className={`p-3 sm:p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-brand-50/90 border-2 border-[#026fc3] shadow-sm'
                          : 'bg-[#f8fafc] hover:bg-[#f1f5f9] border border-slate-200/70 hover:border-slate-300'
                      }`}
                    >
                      {/* Left: Rank, Avatar, Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isCurrent
                            ? 'bg-[#026fc3] text-white shadow-xs'
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}>
                          {entry.rank}
                        </div>

                        {/* Avatar */}
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-2xs ${bgFallback}`}>
                          {entry.avatarUrl ? (
                            <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(entry.displayName)}</span>
                          )}
                        </div>

                        {/* Name & Level */}
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
                          <div className="text-[11px] font-semibold text-slate-400">
                            Level {entry.level}
                          </div>
                        </div>
                      </div>

                      {/* Right: XP Pill */}
                      <div className="shrink-0 flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black text-slate-900">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                        <span>{entry.xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Motivation Banner */}
              <div className="pt-2">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-blue-50/90 border border-purple-100/90 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5 fill-purple-500 text-purple-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-purple-950">
                        Keep learning, keep growing!
                      </h4>
                      <p className="text-[11px] font-medium text-slate-600">
                        Every activity you complete helps you climb the leaderboard.
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center text-xl">
                    🏆✨
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 4. CURRENT USER POSITION (When Outside Top 10) */}
          {user && currentUser && !currentUser.isInTop10 && (
            <div className="bg-[#141e34] border border-slate-700/80 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#026fc3] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    #{currentUser.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-white truncate">
                        {currentUser.displayName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-md bg-[#026fc3] text-white text-[9px] font-black uppercase">
                        Your Rank
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Complete quizzes & lessons to enter the Top 10!
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs sm:text-sm font-black font-mono text-amber-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 text-slate-900 animate-in zoom-in-95 duration-200"
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
