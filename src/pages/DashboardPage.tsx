// ============================================================================
// EDTECHRA-BITZ: Common User Dashboard (V3 Canonical)
// Premium Dark-Blue Visual Identity • Real Knowledge Bitz Learning Data
// Features: Connected XP, Bitz Mastered (3/5 rule), 12 Category Progress,
// Continue Learning, Recently Mastered, Real-time Subscriptions.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  LogIn,
  ShieldCheck,
  GraduationCap,
  Award,
  Settings,
  Bookmark,
  BookOpen,
  Atom,
  Brain,
  Landmark,
  Cpu,
  TrendingUp,
  HeartPulse,
  Globe,
  Palette,
  Trophy,
  Sprout,
  HelpCircle,
  LucideIcon
} from 'lucide-react';
import { youtubeClient, ProgressSummary } from '@/services/youtubeClient';
import { useAuth } from '@/context/AuthContext';
import { getTimeBasedGreeting } from '@/utils/greeting';
import { quizService } from '@/services/quizService';
import { postService } from '@/services/postService';
import { PostUserStats } from '@/types/post';
import { UserSettingsModal } from '@/components/UserSettingsModal';
import { TopLearnersLeaderboard } from '@/components/Dashboard/TopLearnersLeaderboard';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { KnowledgeBitzItem } from '@/types';
import { KnowledgeBitzReaderModal } from '@/components/Explore/KnowledgeBitzReaderModal';

// Icon mapping for the 12 canonical Knowledge Bitz categories
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  science_nature: Atom,
  people_psychology: Brain,
  history_culture: Landmark,
  technology_ai: Cpu,
  business_economics: TrendingUp,
  health_body: HeartPulse,
  world_geography: Globe,
  arts_entertainment: Palette,
  sports_games: Trophy,
  life_skills_english: BookOpen,
  personal_growth: Sprout,
  mysteries_legends: HelpCircle
};

interface BitzDashboardStatsState {
  totalBitzXp: number;
  masteredCount: number;
  totalPublishedBitz: number;
  completedCount: number;
  savedCount: number;
  categoryProgress: {
    id: string;
    name: string;
    masteredCount: number;
    totalCount: number;
    percentage: number;
  }[];
  recentlyMastered: KnowledgeBitzItem[];
  continueLearning: KnowledgeBitzItem | null;
}

export const DashboardPage: React.FC = () => {
  const { user, profile, isAdmin, isTeacher, openAuthModal, isLoading, session } = useAuth();

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [selectedBitzForReading, setSelectedBitzForReading] = useState<KnowledgeBitzItem | null>(null);

  // Knowledge Bitz real learning stats
  const [bitzStats, setBitzStats] = useState<BitzDashboardStatsState>({
    totalBitzXp: 0,
    masteredCount: 0,
    totalPublishedBitz: 0,
    completedCount: 0,
    savedCount: 0,
    categoryProgress: [],
    recentlyMastered: [],
    continueLearning: null
  });
  const [bitzStatsLoading, setBitzStatsLoading] = useState<boolean>(true);
  const [bitzStatsError, setBitzStatsError] = useState<string | null>(null);

  // General activity stats (legacy feed activities)
  const [feedStats, setFeedStats] = useState<ProgressSummary>({
    shortsWatched: 0,
    quizzesCompleted: 0,
    averageQuizScore: 0,
    learningProgressPercent: 0,
    vocabularyLearned: 0,
    totalCompleted: 0,
    recentHistory: []
  });
  const [quizStats, setQuizStats] = useState<{ totalXp: number; completedCount: number }>({
    totalXp: 0,
    completedCount: 0
  });
  const [postStats, setPostStats] = useState<PostUserStats>({
    postsCount: 0,
    likesReceived: 0,
    totalPostXp: 0
  });

  const userId = user?.id || 'guest-user';
  const token = session?.access_token || null;

  // Authoritative Data Loader
  const loadDashboardData = useCallback(async () => {
    try {
      setBitzStatsLoading(true);
      setBitzStatsError(null);

      const [bStats, fStats, qStats, pStats] = await Promise.all([
        knowledgeBitzService.getUserDashboardStats(token),
        youtubeClient.getUserProgress(userId).catch(() => null),
        quizService.getUserQuizStats(userId, token).catch(() => null),
        postService.getUserPostStats(userId, token).catch(() => null)
      ]);

      if (bStats) {
        setBitzStats({
          totalBitzXp: bStats.totalBitzXp || 0,
          masteredCount: bStats.masteredCount || 0,
          totalPublishedBitz: bStats.totalPublishedBitz || 0,
          completedCount: bStats.completedCount || 0,
          savedCount: bStats.savedCount || 0,
          categoryProgress: bStats.categoryProgress || [],
          recentlyMastered: bStats.recentlyMastered || [],
          continueLearning: bStats.continueLearning || null
        });
      }

      if (fStats) setFeedStats(fStats);
      if (qStats) setQuizStats(qStats);
      if (pStats) setPostStats(pStats);
    } catch (err: any) {
      console.error('[DashboardPage] Error loading dashboard stats:', err);
      setBitzStatsError(err?.message || 'Failed to load progress.');
    } finally {
      setBitzStatsLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time Event Subscriptions for instant Dashboard stat updates
  useEffect(() => {
    const handleRefresh = () => {
      loadDashboardData();
    };

    window.addEventListener('edtechra:activity_completed', handleRefresh);
    window.addEventListener('edtechra:bitz_mastered', handleRefresh);
    window.addEventListener('edtechra:post_created', handleRefresh);
    window.addEventListener('edtechra:profile_updated', handleRefresh);

    return () => {
      window.removeEventListener('edtechra:activity_completed', handleRefresh);
      window.removeEventListener('edtechra:bitz_mastered', handleRefresh);
      window.removeEventListener('edtechra:post_created', handleRefresh);
      window.removeEventListener('edtechra:profile_updated', handleRefresh);
    };
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#071328] w-full flex flex-col items-center justify-center p-6 text-slate-300">
        <div className="w-12 h-12 border-3 border-[#38bdf8]/30 border-t-[#38bdf8] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 mt-4 font-sans tracking-wide">Loading your command center...</p>
      </div>
    );
  }

  // Authoritative Total XP (profile.xp takes precedence if persisted, otherwise sum of all earned XP)
  const totalXP = (profile?.xp !== undefined && profile?.xp !== null)
    ? profile.xp
    : (bitzStats.totalBitzXp + (quizStats.totalXp || 0) + (postStats.totalPostXp || 0) + (feedStats.totalCompleted * 40));

  const displayName = profile?.full_name?.trim() || profile?.name?.trim() || user?.user_metadata?.full_name?.trim() || user?.user_metadata?.name?.trim() || (user?.email ? user.email.split('@')[0] : 'Learner');
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = (displayName || 'L').slice(0, 2).toUpperCase();
  const greetingHeading = getTimeBasedGreeting(displayName);

  // Role Detection
  const isUserTeacher = isTeacher || profile?.role === 'teacher';

  // Overall Mastery Percentage
  const totalPublished = bitzStats.totalPublishedBitz || 84;
  const overallMasteryPercent = totalPublished > 0 ? Math.min(100, Math.round((bitzStats.masteredCount / totalPublished) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#071328] text-slate-100 selection:bg-[#026fc3] selection:text-white pb-16">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Unauthenticated Guest Banner */}
        {!user && (
          <div className="bg-gradient-to-r from-[#0d2347] via-[#0f2e5c] to-[#0d2347] border border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">
                  Sign in to sync your Knowledge Bitz mastery
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-cyan-300 text-[10px] font-bold rounded-md border border-cyan-400/30">
                  Cloud Sync
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Log in with your account to save quiz scores, +2 XP rewards, and category progress across all devices.
              </p>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#0284c7] text-white text-xs font-black rounded-2xl shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In / Sign Up</span>
            </button>
          </div>
        )}

        {/* 1. Profile / Hero Section */}
        <div className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] p-[2.5px] shadow-md shrink-0">
              <div className="w-full h-full rounded-[22px] bg-[#071328] flex items-center justify-center font-black text-2xl overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-cyan-300 text-lg font-black">{initials}</span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
                  {greetingHeading}
                </h1>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 bg-purple-900/50 text-purple-300 text-xs font-bold rounded-lg border border-purple-600/40 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </span>
                ) : isUserTeacher ? (
                  <span className="px-2.5 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs font-bold rounded-lg border border-indigo-600/40 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    Teacher
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-900/50 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-600/40 flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Learner
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Keep building your knowledge.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {user && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0e274d] hover:bg-[#133363] text-slate-200 border border-blue-800/40 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-sm"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Settings</span>
              </button>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-600/40 text-xs font-bold rounded-2xl transition-all shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-purple-300" />
                <span>Admin Center</span>
              </Link>
            )}
          </div>
        </div>

        {/* 2. Top Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          
          {/* Learning Streak */}
          <div className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-2xl p-4 shadow-md flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-white leading-none">
                {feedStats.shortsWatched > 0 ? `${Math.min(feedStats.shortsWatched, 7)} Days` : '1 Day'}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">Streak</div>
            </div>
          </div>

          {/* Total XP */}
          <div className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-2xl p-4 shadow-md flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-white leading-none">
                {totalXP.toLocaleString()} XP
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">Total Earned</div>
            </div>
          </div>

          {/* Bitz Mastered (3/5 rule) */}
          <div className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-2xl p-4 shadow-md flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-white leading-none">
                {bitzStats.masteredCount} / {totalPublished}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">Bitz Mastered</div>
            </div>
          </div>

          {/* Topics Completed / Read */}
          <div className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-2xl p-4 shadow-md flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-white leading-none">
                {bitzStats.completedCount}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">Learned</div>
            </div>
          </div>

          {/* Saved Bitz */}
          <div className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-2xl p-4 shadow-md flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold shrink-0">
              <Bookmark className="w-5 h-5 fill-rose-400 text-rose-400" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-white leading-none">
                {bitzStats.savedCount}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">Saved Bitz</div>
            </div>
          </div>

        </div>

        {/* 3. Knowledge Bitz Overall Journey & Category Progress */}
        <section className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6 backdrop-blur-sm">
          
          {/* Header & Overall Mastery Banner */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">Knowledge Bitz</span>
              </div>
              <Link
                to="/explore"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>Explore Bitz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white">Your Knowledge Journey</h2>
              <span className="text-xs font-bold text-slate-300 font-mono">
                {bitzStats.masteredCount} of {totalPublished} topics mastered • <span className="text-cyan-300 font-black">{overallMasteryPercent}%</span>
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="h-2.5 w-full bg-[#071328] border border-blue-900/50 rounded-full overflow-hidden p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-emerald-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(overallMasteryPercent > 0 ? 3 : 0, overallMasteryPercent)}%` }}
              />
            </div>
          </div>

          {/* 12 Canonical Categories Progress */}
          {bitzStatsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3.5 bg-[#071328]/60 border border-blue-900/30 rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-blue-900/40 rounded w-28"></div>
                    <div className="h-4 bg-blue-900/40 rounded w-14"></div>
                  </div>
                  <div className="h-2 bg-blue-950 rounded-full w-full"></div>
                </div>
              ))}
            </div>
          ) : bitzStatsError ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800/40 rounded-2xl text-xs text-rose-300 font-medium flex items-center justify-between">
              <span>Knowledge Bitz progress couldn't be loaded.</span>
              <button
                onClick={loadDashboardData}
                className="text-xs font-bold underline hover:text-white cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
              {bitzStats.categoryProgress.map((cat) => {
                const IconComponent = CATEGORY_ICON_MAP[cat.id] || BookOpen;
                const hasMastered = cat.masteredCount > 0;

                return (
                  <Link
                    key={cat.id}
                    to={`/explore?topic=${cat.id}`}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#071328]/70 border border-blue-900/30 hover:border-cyan-500/40 hover:bg-[#091b38] transition-all group cursor-pointer block space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-400/20 text-cyan-300 flex items-center justify-center shrink-0">
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-slate-200">
                        {cat.masteredCount} / {cat.totalCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 bg-[#050e1a] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${hasMastered ? 'bg-gradient-to-r from-[#0284c7] to-[#38bdf8]' : 'bg-slate-700/40'} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(cat.percentage > 0 ? 4 : 0, cat.percentage)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-7 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. Continue Learning & Recently Mastered Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Continue Learning */}
          <section className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Continue Learning
                </h3>
              </div>

              {bitzStats.continueLearning ? (
                <div className="space-y-2.5 p-4 rounded-2xl bg-[#071328]/80 border border-blue-900/40">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-900/50 text-cyan-300 text-[10px] font-bold border border-blue-700/40">
                      {bitzStats.continueLearning.category || 'General Knowledge'}
                    </span>
                    {bitzStats.continueLearning.sub_topic && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        • {bitzStats.continueLearning.sub_topic}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white line-clamp-2">
                    {bitzStats.continueLearning.title}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {bitzStats.continueLearning.short_fact}
                  </p>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs space-y-2 rounded-2xl bg-[#071328]/40 border border-blue-900/20">
                  <p>Ready to discover new Knowledge Bitz?</p>
                </div>
              )}
            </div>

            {bitzStats.continueLearning ? (
              <button
                type="button"
                onClick={() => setSelectedBitzForReading(bitzStats.continueLearning)}
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#0284c7] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue Reading</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                to="/explore"
                className="w-full py-2.5 px-4 bg-[#026fc3] hover:bg-[#0284c7] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Explore Knowledge Bitz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </section>

          {/* Recently Mastered */}
          <section className="bg-[#0b1e3b]/80 border border-blue-900/40 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Recently Mastered
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Score ≥ 3/5
              </span>
            </div>

            <div className="space-y-2">
              {bitzStats.recentlyMastered.length > 0 ? (
                bitzStats.recentlyMastered.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBitzForReading(b)}
                    className="p-3 rounded-xl bg-[#071328]/70 border border-blue-900/30 hover:border-emerald-500/40 hover:bg-[#091b38] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                          {b.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {b.category}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Review →
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs space-y-2 rounded-2xl bg-[#071328]/40 border border-blue-900/20">
                  <p>No mastered Bitz yet.</p>
                  <p className="text-[11px] text-slate-500">Answer 3/5 questions correctly to master a topic.</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* 5. Top 10 Learners Leaderboard */}
        <TopLearnersLeaderboard />

        {/* User Profile & Preferences Settings Modal */}
        <UserSettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Knowledge Bitz Full-Screen Reader & Quiz Modal */}
        {selectedBitzForReading && (
          <KnowledgeBitzReaderModal
            bitz={selectedBitzForReading}
            isOpen={Boolean(selectedBitzForReading)}
            onClose={() => setSelectedBitzForReading(null)}
            onLearned={() => {
              loadDashboardData();
            }}
          />
        )}

      </div>
    </div>
  );
};
