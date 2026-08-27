import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  LogIn,
  ShieldCheck,
  GraduationCap,
  Award,
  Trophy,
  Settings,
  Heart,
  FileImage
} from 'lucide-react';
import { youtubeClient, ProgressSummary } from '@/services/youtubeClient';
import { useAuth } from '@/context/AuthContext';
import { getTimeBasedGreeting } from '@/utils/greeting';
import { getAllLevels, getLevelStatus } from '@/utils/levelsData';
import { UserLearningProgress, CategoryProgress } from '@/types';
import { quizService } from '@/services/quizService';
import { postService } from '@/services/postService';
import { PostUserStats } from '@/types/post';
import { UserSettingsModal } from '@/components/UserSettingsModal';
import { TopLearnersLeaderboard } from '@/components/Dashboard/TopLearnersLeaderboard';

export const DashboardPage: React.FC = () => {
  const { user, profile, isAdmin, isTeacher, openAuthModal, isLoading, session } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stats, setStats] = useState<ProgressSummary>({
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
  const [progressMap, setProgressMap] = useState<{ [videoId: string]: UserLearningProgress }>({});
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const userId = user?.id || 'guest-user';
  const allLevels = getAllLevels();

  const loadData = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const token = session?.access_token || null;
      const [statsData, pMap, catProg, qStats, pStats] = await Promise.all([
        youtubeClient.getUserProgress(userId),
        youtubeClient.getProgressMap(userId),
        youtubeClient.getCategoryProgress(userId),
        quizService.getUserQuizStats(userId, token),
        postService.getUserPostStats(userId, token)
      ]);
      if (statsData) setStats(statsData);
      if (pMap) setProgressMap(pMap);
      if (catProg) setCategoryProgress(catProg);
      if (qStats) setQuizStats(qStats);
      if (pStats) setPostStats(pStats);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setCategoriesError(err?.message || 'Failed to load progress');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, session]);

  // Real-time Event Subscriptions for instant Dashboard stat updates
  useEffect(() => {
    const handleRefreshStats = () => {
      const token = session?.access_token || null;
      postService.getUserPostStats(userId, token).then(setPostStats).catch(() => {});
      quizService.getUserQuizStats(userId, token).then(setQuizStats).catch(() => {});
      youtubeClient.getCategoryProgress(userId).then(setCategoryProgress).catch(() => {});
    };

    const handleActivityCompleted = () => {
      const token = session?.access_token || null;
      youtubeClient.getCategoryProgress(userId).then(setCategoryProgress).catch(() => {});
      quizService.getUserQuizStats(userId, token).then(setQuizStats).catch(() => {});
      youtubeClient.getUserProgress(userId).then(setStats).catch(() => {});
    };

    window.addEventListener('edtechra:post_created', handleRefreshStats);
    window.addEventListener('edtechra:profile_updated', handleRefreshStats);
    window.addEventListener('edtechra:activity_completed', handleActivityCompleted);

    return () => {
      window.removeEventListener('edtechra:post_created', handleRefreshStats);
      window.removeEventListener('edtechra:profile_updated', handleRefreshStats);
      window.removeEventListener('edtechra:activity_completed', handleActivityCompleted);
    };
  }, [userId, session]);

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#026fc3]/30 border-t-[#026fc3] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-500">Loading your learning dashboard...</p>
      </div>
    );
  }

  // Compute Levels progression
  const completedLevelsCount = allLevels.filter(l => {
    const st = getLevelStatus(l.levelNumber, progressMap);
    return st === 'completed';
  }).length;

  const totalXP = 100 + (completedLevelsCount * 40) + (stats.totalCompleted * 40) + (quizStats.totalXp || 0) + (postStats.totalPostXp || 0);
  const displayName = profile?.full_name?.trim() || profile?.name?.trim() || user?.user_metadata?.full_name?.trim() || user?.user_metadata?.name?.trim() || (user?.email ? user.email.split('@')[0] : 'Learner');
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = (displayName || 'L').slice(0, 2).toUpperCase();
  const greetingHeading = getTimeBasedGreeting(displayName);

  // Authoritative Role Detection
  const isUserTeacher = isTeacher || profile?.role === 'teacher';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Unauthenticated Guest Alert */}
      {!user && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900">
                Sign in to sync your learning progress
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                Cloud Sync
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Create an account or log in with Google to save quiz scores, XP, and streak milestones across all devices.
            </p>
          </div>
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-extrabold rounded-2xl shadow-xs transition-all shrink-0 flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Log In / Sign Up</span>
          </button>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[3px] shadow-sm shrink-0">
            <div className="w-full h-full rounded-[22px] bg-amber-100 flex items-center justify-center font-black text-2xl overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-800 text-lg font-black">{initials}</span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#0f233a] tracking-tight">{greetingHeading}</h1>
              {isAdmin ? (
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-black rounded-lg border border-purple-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </span>
              ) : isUserTeacher ? (
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg border border-indigo-200 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  Teacher
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-lg border border-emerald-200 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                  Student
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {user?.email ? (
                <span className="font-mono text-slate-400">{user.email} • </span>
              ) : null}
              Microlearning on @EdTechraBitz Shorts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {user && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-stone-50 hover:bg-stone-100 text-slate-700 border border-stone-200 text-xs font-extrabold rounded-2xl transition-all cursor-pointer shadow-2xs"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Settings</span>
            </button>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-extrabold rounded-2xl transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Center</span>
            </Link>
          )}

          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-extrabold rounded-2xl shadow-xs transition-all"
          >
            <span>Level Roadmap</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Learning Stats Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Streak */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">
              {stats.shortsWatched > 0 ? `${Math.min(stats.shortsWatched, 5)} Days` : '1 Day'}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">Learning Streak</div>
          </div>
        </div>

        {/* Total XP */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">{totalXP} XP</div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">Total Earned</div>
          </div>
        </div>

        {/* Your Posts */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileImage className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">
              {postStats.postsCount}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">Your Posts</div>
          </div>
        </div>

        {/* Likes Received on Posts */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">
              {postStats.likesReceived}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">Likes</div>
          </div>
        </div>

        {/* Levels Mastered */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Trophy className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">
              {completedLevelsCount}/20
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">Levels Mastered</div>
          </div>
        </div>

      </div>

      {/* 🏆 Top 10 Learners Leaderboard */}
      <TopLearnersLeaderboard />

      {/* Real Feed Learning Activity Progress */}
      <section className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0f233a] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#026fc3]" />
            Learning Progress
          </h2>
          <span className="text-xs font-bold text-slate-400">Feed Learning Activities</span>
        </div>

        {categoriesLoading ? (
          <div className="space-y-3.5 pt-1 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <div className="h-3.5 bg-slate-200 rounded-md w-36"></div>
                  <div className="h-3.5 bg-slate-200 rounded-md w-16"></div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-200 rounded-full w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : categoriesError ? (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 font-medium flex items-center justify-between">
            <span>Unable to load learning progress records.</span>
            <button
              onClick={() => {
                setCategoriesLoading(true);
                setCategoriesError(null);
                youtubeClient.getCategoryProgress(userId)
                  .then((cp) => {
                    setCategoryProgress(cp);
                    setCategoriesLoading(false);
                  })
                  .catch((e) => {
                    console.error(e);
                    setCategoriesError(e.message);
                    setCategoriesLoading(false);
                  });
              }}
              className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : categoryProgress.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 font-medium">
            No learning activities recorded yet. Start exploring the Feed!
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {categoryProgress.map((item) => {
              const completed = item.completedActivities ?? item.completedLessons ?? 0;
              const total = item.totalActivities ?? item.totalLessons ?? 0;
              const percent = Math.min(100, Math.max(0, item.progressPercent ?? 0));
              const isTracking = item.isTrackingAvailable !== false;

              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="text-slate-900 font-extrabold">{item.displayTitle}</span>
                      {isTracking ? (
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          {completed} / {total}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono font-semibold text-slate-400">
                          Available: {total}
                        </span>
                      )}
                    </span>

                    {isTracking ? (
                      <span className="text-slate-600 font-mono font-bold text-xs">
                        {percent}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                        {item.trackingStatusMessage || 'Tracking not currently available'}
                      </span>
                    )}
                  </div>

                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    {isTracking ? (
                      <div
                        className={`h-full ${item.color || 'bg-[#026fc3]'} rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${percent}%` }}
                      />
                    ) : (
                      <div className="h-full bg-slate-200/50 rounded-full w-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Learning Activity History */}
      <section className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-[#0f233a] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#026fc3]" />
          Recent Levels & Quizzes Completed
        </h2>

        <div className="space-y-2.5">
          {allLevels
            .filter(lvl => progressMap[lvl.youtubeVideoId]?.completed || progressMap[lvl.youtubeVideoId]?.watched)
            .slice(0, 5)
            .map((lvl) => {
              const p = progressMap[lvl.youtubeVideoId];
              return (
                <div
                  key={lvl.levelNumber}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 hover:border-brand-300 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 line-clamp-1">
                        Level {lvl.levelNumber}: {lvl.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Quiz Score: {p?.quiz_score || 3}/3 • {p?.completed ? 'Completed' : 'In Progress'}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/bitz/${lvl.youtubeVideoId}`}
                    className="px-3 py-1 bg-white border border-slate-200 hover:border-brand-500 text-slate-700 font-bold rounded-xl text-[11px] shadow-2xs"
                  >
                    Review
                  </Link>
                </div>
              );
            })}

          {allLevels.filter(lvl => progressMap[lvl.youtubeVideoId]?.completed || progressMap[lvl.youtubeVideoId]?.watched).length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs space-y-2">
              <p>No completed levels yet.</p>
              <Link
                to="/explore"
                className="inline-block px-4 py-1.5 bg-[#026fc3] text-white rounded-xl font-bold"
              >
                Start Level 1
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* User Profile & Preferences Settings Modal */}
      <UserSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

    </div>
  );
};
