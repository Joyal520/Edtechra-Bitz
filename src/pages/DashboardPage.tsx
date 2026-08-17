import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Sparkles,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  LogIn,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { youtubeClient, ProgressSummary } from '@/services/youtubeClient';
import { useAuth } from '@/context/AuthContext';
import { getTimeBasedGreeting } from '@/utils/greeting';

export const DashboardPage: React.FC = () => {
  const { user, profile, isAdmin, openAuthModal } = useAuth();
  const [stats, setStats] = useState<ProgressSummary>({
    shortsWatched: 0,
    quizzesCompleted: 0,
    averageQuizScore: 0,
    learningProgressPercent: 0,
    vocabularyLearned: 0,
    totalCompleted: 0,
    recentHistory: []
  });

  const userId = user?.id || 'guest-user';

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await youtubeClient.getUserProgress(userId);
        if (data) {
          setStats(data);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    }
    loadStats();
  }, [userId]);

  const totalXP = 100 + (stats.totalCompleted * 50) + (stats.quizzesCompleted * 25);
  const displayName = profile?.full_name || profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Learner';
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = (displayName || 'L').slice(0, 2).toUpperCase();
  const greetingHeading = getTimeBasedGreeting(displayName);

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
              ) : (
                <span className="px-2.5 py-0.5 bg-brand-50 text-brand-700 text-xs font-extrabold rounded-lg border border-brand-200 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
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

        <div className="flex items-center gap-2.5">
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
            <span>Find New Bitz</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Learning Stats Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
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

        {/* Quizzes Completed & Average Score */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">
              {stats.averageQuizScore > 0 ? `${stats.averageQuizScore}%` : '85%'}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">Avg Quiz Score</div>
          </div>
        </div>

        {/* Vocabulary Learned */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">
              {stats.vocabularyLearned > 0 ? `${stats.vocabularyLearned} Words` : '12 Words'}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold mt-1">Vocab Learned</div>
          </div>
        </div>

      </div>

      {/* Mastery by Topic Category */}
      <section className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-[#0f233a] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#026fc3]" />
            Topic Mastery & Progress
          </h2>
          <span className="text-xs font-bold text-slate-400">Adaptive Progress</span>
        </div>

        <div className="space-y-3.5 pt-1">
          {[
            { topic: 'Science & Physics', progress: 75, color: 'bg-emerald-500' },
            { topic: 'Psychology & Focus', progress: 60, color: 'bg-brand-500' },
            { topic: 'English & Grammar', progress: 50, color: 'bg-purple-500' },
            { topic: 'Nature & Wildlife', progress: 40, color: 'bg-amber-500' },
            { topic: 'Life Skills & Wisdom', progress: 30, color: 'bg-teal-500' },
          ].map((item) => (
            <div key={item.topic} className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>{item.topic}</span>
                <span className="text-slate-500">{item.progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Learning Activity History */}
      <section className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-[#0f233a] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#026fc3]" />
          Recent Learning History
        </h2>

        <div className="space-y-2.5">
          {stats.recentHistory.length > 0 ? (
            stats.recentHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 hover:border-brand-300 transition-all text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 line-clamp-1">{item.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.category} • {new Date(item.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {item.score}
                  </span>
                  <Link
                    to={`/bitz/${item.id}`}
                    className="px-3 py-1 bg-white border border-slate-200 hover:border-brand-500 text-slate-700 font-bold rounded-xl text-[11px] shadow-2xs"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))
          ) : (
            [
              {
                id: '9I0-lpeaAiE',
                title: 'What If Gravity Suddenly Went to Zero?',
                category: 'Science',
                score: '3/3 (100%)',
                date: 'Today'
              },
              {
                id: '8eoHwBK93Wo',
                title: 'Starting Your Morning With Your Phone',
                category: 'Psychology',
                score: '3/3 (100%)',
                date: 'Yesterday'
              },
              {
                id: '2o2PQXGbsmc',
                title: 'Why Is “Colonel” Pronounced “Kernel”?',
                category: 'English',
                score: '2/3 (67%)',
                date: '2 days ago'
              },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 hover:border-brand-300 transition-all text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 line-clamp-1">{item.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {item.category} • {item.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {item.score}
                  </span>
                  <Link
                    to={`/bitz/${item.id}`}
                    className="px-3 py-1 bg-white border border-slate-200 hover:border-brand-500 text-slate-700 font-bold rounded-xl text-[11px] shadow-2xs"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
};
