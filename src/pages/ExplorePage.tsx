import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Play,
  Sparkles,
  CheckCircle2,
  Lock,
  Trophy,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { YouTubeVideo, UserLearningProgress } from '@/types';
import { youtubeClient } from '@/services/youtubeClient';
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
  const [videoMap, setVideoMap] = useState<Record<string, YouTubeVideo>>({});

  const allLevels = getAllLevels();

  const loadData = useCallback(async () => {
    try {
      const [pMap, shorts] = await Promise.all([
        youtubeClient.getProgressMap(userId),
        youtubeClient.getShorts({ status: 'all' })
      ]);

      setProgressMap(pMap);

      const map: Record<string, YouTubeVideo> = {};
      shorts.forEach((s) => {
        if (s.youtube_video_id) {
          map[s.youtube_video_id] = s;
        }
      });
      setVideoMap(map);
    } catch (err) {
      console.error('Error loading Explore page data:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-1 border border-brand-200">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>@EdTechraBitz Learning Curriculum</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0f233a] tracking-tight">
            EdTechra Micro Learning Zone
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Learn something useful, one short lesson at a time.
          </p>
        </div>
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

          {/* 20 Levels Grid with Premium 1:1 Square Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allLevels.map((lvl) => {
              const status: LevelStatus = getLevelStatus(lvl.levelNumber, progressMap);
              const userProg = progressMap[lvl.youtubeVideoId];
              const isLocked = status === 'locked';
              const isCompleted = status === 'completed';
              const isInProgress = status === 'in_progress';

              const video = videoMap[lvl.youtubeVideoId];
              const thumbnailUrl = video?.thumbnail_url || `https://i.ytimg.com/vi/${lvl.youtubeVideoId}/maxresdefault.jpg`;

              return (
                <div
                  key={lvl.levelNumber}
                  className={`bg-white border rounded-3xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 hover:shadow-md ${
                    isLocked
                      ? 'border-slate-200/60 opacity-80 bg-slate-50/50'
                      : isCompleted
                      ? 'border-emerald-200/90 hover:border-emerald-400'
                      : isInProgress
                      ? 'border-amber-300 hover:border-amber-400'
                      : 'border-brand-200/80 hover:border-[#026fc3]'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Premium 1:1 Square Thumbnail Container */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xs border border-stone-200/80 bg-slate-950 group">
                      <img
                        src={thumbnailUrl}
                        alt={lvl.title}
                        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                          isLocked ? 'grayscale-[40%] contrast-90 brightness-75' : ''
                        }`}
                        loading="lazy"
                      />

                      {/* Top Left: Level Pill Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                          isCompleted
                            ? 'bg-emerald-600/90 text-white'
                            : isLocked
                            ? 'bg-slate-900/80 text-slate-300 border border-white/10'
                            : 'bg-[#026fc3]/90 text-white'
                        }`}>
                          Level {lvl.levelNumber}
                        </span>
                      </div>

                      {/* Top Right: Status Badge */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        {isCompleted ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600/90 px-2 py-0.5 rounded-lg backdrop-blur-md shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>Passed ({userProg?.quiz_score || 3}/3)</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-amber-600/90 px-2 py-0.5 rounded-lg backdrop-blur-md shadow-xs">
                            <RotateCcw className="w-3 h-3 text-white" />
                            <span>In Progress</span>
                          </span>
                        ) : isLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-lg backdrop-blur-md border border-white/10 shadow-xs">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-black text-white bg-[#026fc3]/90 px-2 py-0.5 rounded-lg backdrop-blur-md shadow-xs">
                            <Play className="w-3 h-3 fill-current" />
                            <span>Available</span>
                          </span>
                        )}
                      </div>

                      {/* Locked Overlay Center (if locked) */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center pointer-events-none">
                          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center text-white mb-1.5 shadow-md">
                            <Lock className="w-5 h-5" />
                          </div>
                          <p className="text-[11px] font-bold text-white/90 drop-shadow-xs">
                            Requires Level {lvl.levelNumber - 1}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Level Title */}
                    <h3 className={`font-black text-sm sm:text-base leading-snug line-clamp-2 ${
                      isLocked ? 'text-slate-600' : 'text-[#0f233a]'
                    }`}>
                      {lvl.title}
                    </h3>

                    {/* Explanation Preview */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {lvl.explanation}
                    </p>
                  </div>

                  {/* Level Footer & Action CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                      <span>3 Quiz Qs</span>
                      <span>•</span>
                      <span className="text-[#026fc3] font-black">+40 XP</span>
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
                            : 'bg-[#026fc3] hover:bg-[#025ea6] text-white shadow-xs active:scale-95'
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

    </div>
  );
};
