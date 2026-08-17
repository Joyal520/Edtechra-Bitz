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
  TrendingUp
} from 'lucide-react';
import { youtubeClient, ProgressSummary } from '@/services/youtubeClient';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<ProgressSummary>({
    shortsWatched: 4,
    quizzesCompleted: 3,
    averageQuizScore: 88,
    learningProgressPercent: 12,
    vocabularyLearned: 14,
    totalCompleted: 3,
    recentHistory: []
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await youtubeClient.getUserProgress('alex-walker');
        if (data && (data.shortsWatched > 0 || data.quizzesCompleted > 0)) {
          setStats(data);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    }
    loadStats();
  }, []);

  const totalXP = 120 + (stats.totalCompleted * 40);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Profile Header */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[3px] shadow-sm">
            <div className="w-full h-full rounded-[22px] bg-amber-100 flex items-center justify-center font-black text-2xl overflow-hidden">
              <span>👦</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#0f233a]">Alex Walker</h1>
              <span className="px-2.5 py-0.5 bg-brand-50 text-brand-700 text-xs font-extrabold rounded-lg border border-brand-200">
                Level 2 Explorer
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Microlearning on @EdTechraBitz Shorts
            </p>
          </div>
        </div>

        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-extrabold rounded-2xl shadow-xs transition-all"
        >
          <span>Find New Bitz</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Learning Stats Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Streak */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#0f233a] leading-none">3 Days</div>
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
              {stats.vocabularyLearned || 14} Words
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
          {[
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
          ))}
        </div>
      </section>

    </div>
  );
};
