import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Play,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Lock,
  Trophy,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { UserLearningProgress } from '@/types';
import { youtubeClient } from '@/services/youtubeClient';
import { AdminSyncModal } from '@/components/AdminSyncModal';
import { PostFeed } from '@/components/PostFeed/PostFeed';
import { useAuth } from '@/context/AuthContext';
import {
  getAllLevels,
  getLevelStatus,
  LevelStatus
} from '@/utils/levelsData';

export const ExplorePage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'guest-user';

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const initialTab: 'levels' | 'feed' = (rawTab === 'feed' || rawTab === 'catalog' || rawTab === 'posts') ? 'feed' : 'levels';

  const [viewTab, setViewTab] = useState<'levels' | 'feed'>(initialTab);
  const [progressMap, setProgressMap] = useState<{ [videoId: string]: UserLearningProgress }>({});
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const allLevels = getAllLevels();

  const fetchProgress = useCallback(async () => {
    try {
      const pMap = await youtubeClient.getProgressMap(userId);
      setProgressMap(pMap);
    } catch (err) {
      console.error('Error loading user progress:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Compute overall Levels completion statistics
  const completedLevelsCount = allLevels.filter(l => {
    const status = getLevelStatus(l.levelNumber, progressMap);
    return status === 'completed';
  }).length;

  const firstAvailableLevel = allLevels.find(l => {
    const status = getLevelStatus(l.levelNumber, progressMap);
    return status === 'available' || status === 'in_progress';
  }) || allLevels[0];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Header & Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-1 border border-brand-200">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>@EdTechraBitz Learning Curriculum</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f233a] tracking-tight">
            Explore Elektra Bitz
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Master the 20-level sequential learning path and explore all interactive educational shorts.
          </p>
        </div>

        <button
          onClick={() => setAdminModalOpen(true)}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-brand-400 hover:bg-brand-50/50 text-slate-700 text-xs font-bold rounded-2xl shadow-xs transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-brand-600" />
          <span>Sync Channel</span>
        </button>
      </div>

      {/* Primary Navigation Mode Tabs (Levels 1-20 Roadmap vs Post Feed) */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => {
            setViewTab('levels');
            const params = Object.fromEntries(searchParams.entries());
            delete params.tab;
            setSearchParams(params);
          }}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            viewTab === 'levels'
              ? 'bg-[#026fc3] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-300" />
          <span>Levels 1–20 Roadmap</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            viewTab === 'levels' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {completedLevelsCount}/20
          </span>
        </button>

        <button
          onClick={() => {
            setViewTab('feed');
            const params = Object.fromEntries(searchParams.entries());
            params.tab = 'feed';
            setSearchParams(params);
          }}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            viewTab === 'feed'
              ? 'bg-[#026fc3] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Post Feed</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. LEVELS 1-20 ROADMAP VIEW                                               */}
      {/* ========================================================================= */}
      {viewTab === 'levels' && (
        <div className="space-y-6">
          
          {/* Progression Banner Card */}
          <div className="bg-gradient-to-r from-[#026fc3] via-[#03589e] to-[#0c3f6c] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black">
                  Progression Status
                </span>
                <span className="text-amber-300 font-bold text-xs">
                  {completedLevelsCount === 20 ? '🏆 All Levels Completed!' : `Level ${firstAvailableLevel.levelNumber} Unlocked`}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {completedLevelsCount === 20 ? 'Mastery Achieved!' : `Continue to Level ${firstAvailableLevel.levelNumber}: ${firstAvailableLevel.title}`}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Watch the video, read the 50-word explanation, and score at least 2/3 on each quiz to unlock subsequent levels.
              </p>

              {/* Progress Bar */}
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-200">
                  <span>Completed: {completedLevelsCount} / 20 Levels</span>
                  <span>{Math.round((completedLevelsCount / 20) * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-[#22c55e] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, (completedLevelsCount / 20) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              to={`/bitz/${firstAvailableLevel.youtubeVideoId}`}
              className="px-6 py-3 bg-[#22c55e] hover:bg-[#16a34a] text-white text-xs sm:text-sm font-black rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 group"
            >
              <span>{completedLevelsCount === 0 ? 'Start Level 1' : `Resume Level ${firstAvailableLevel.levelNumber}`}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* 20 Levels Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allLevels.map((lvl) => {
              const status: LevelStatus = getLevelStatus(lvl.levelNumber, progressMap);
              const userProg = progressMap[lvl.youtubeVideoId];
              const isLocked = status === 'locked';
              const isCompleted = status === 'completed';
              const isInProgress = status === 'in_progress';

              return (
                <div
                  key={lvl.levelNumber}
                  className={`bg-white border rounded-3xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                    isLocked
                      ? 'border-slate-200/60 opacity-75 bg-slate-50/50'
                      : isCompleted
                      ? 'border-emerald-200 shadow-xs hover:shadow-md hover:border-emerald-400'
                      : isInProgress
                      ? 'border-amber-300 shadow-xs hover:shadow-md'
                      : 'border-brand-200/80 shadow-xs hover:shadow-md hover:border-[#026fc3]'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Level Pill & Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isLocked
                          ? 'bg-slate-200/80 text-slate-500'
                          : 'bg-brand-50 text-[#026fc3] border border-brand-200'
                      }`}>
                        Level {lvl.levelNumber}
                      </span>

                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Passed ({userProg?.quiz_score || 3}/3)</span>
                        </span>
                      ) : isInProgress ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl">
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                          <span>In Progress</span>
                        </span>
                      ) : isLocked ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-black text-[#026fc3] bg-brand-50 px-2.5 py-1 rounded-xl">
                          <Play className="w-3 h-3 fill-current" />
                          <span>Available</span>
                        </span>
                      )}
                    </div>

                    {/* Level Title */}
                    <h3 className={`font-black text-sm sm:text-base leading-snug ${
                      isLocked ? 'text-slate-600' : 'text-[#0f233a]'
                    }`}>
                      {lvl.title}
                    </h3>

                    {/* Explanation Preview */}
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {lvl.explanation}
                    </p>
                  </div>

                  {/* Level Footer & Action CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <span>3 Quiz Qs</span>
                      <span>•</span>
                      <span>+40 XP</span>
                    </div>

                    {isLocked ? (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Requires Level {lvl.levelNumber - 1}
                      </span>
                    ) : (
                      <Link
                        to={`/bitz/${lvl.youtubeVideoId}`}
                        className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-[#026fc3] hover:bg-[#025ea6] text-white shadow-xs'
                        }`}
                      >
                        <span>{isCompleted ? 'Review' : isInProgress ? 'Resume' : 'Start'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. POST FEED VIEW (STUDENT CREATED POSTS & MEDIA)                          */}
      {/* ========================================================================= */}
      {viewTab === 'feed' && (
        <div className="space-y-6">
          <PostFeed />
        </div>
      )}

      {/* Admin Channel Sync Modal */}
      <AdminSyncModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSyncComplete={() => {
          fetchProgress();
        }}
      />

    </div>
  );
};
