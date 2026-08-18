import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Play,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  Lock,
  Trophy,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { YouTubeVideo, UserLearningProgress } from '@/types';
import { youtubeClient } from '@/services/youtubeClient';
import { AdminSyncModal } from '@/components/AdminSyncModal';
import { useAuth } from '@/context/AuthContext';
import {
  getAllLevels,
  getLevelStatus,
  LevelStatus
} from '@/utils/levelsData';

const CATEGORIES = [
  'All',
  'Science',
  'Psychology',
  'Nature',
  'English',
  'Life Skills',
  'History',
  'Space',
  'Technology',
  'Mysteries'
];

export const ExplorePage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'guest-user';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = (searchParams.get('status') as 'all' | 'published' | 'upcoming') || 'all';
  const initialTab = (searchParams.get('tab') as 'levels' | 'catalog') || 'levels';

  const [viewTab, setViewTab] = useState<'levels' | 'catalog'>(initialTab);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [progressMap, setProgressMap] = useState<{ [videoId: string]: UserLearningProgress }>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'upcoming'>(initialStatus);
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'recommended'>('latest');
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const allLevels = getAllLevels();

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const [videosData, pMap] = await Promise.all([
        youtubeClient.getShorts({
          category: selectedCategory,
          search: searchQuery,
          difficulty: selectedDifficulty,
          status: selectedStatus === 'all' ? 'all' : selectedStatus
        }),
        youtubeClient.getProgressMap(userId)
      ]);
      setVideos(videosData);
      setProgressMap(pMap);
    } catch (err) {
      console.error('Error loading Explore feed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, selectedDifficulty, selectedStatus, userId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideos();
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (selectedCategory !== 'All') params.category = selectedCategory;
    if (selectedStatus !== 'all') params.status = selectedStatus;
    if (viewTab !== 'levels') params.tab = viewTab;
    setSearchParams(params);
  };

  // Compute overall Levels completion statistics
  const completedLevelsCount = allLevels.filter(l => {
    const status = getLevelStatus(l.levelNumber, progressMap);
    return status === 'completed';
  }).length;

  const firstAvailableLevel = allLevels.find(l => {
    const status = getLevelStatus(l.levelNumber, progressMap);
    return status === 'available' || status === 'in_progress';
  }) || allLevels[0];

  // Sorting for catalog
  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'popular') return (b.view_count || 0) - (a.view_count || 0);
    if (sortBy === 'latest') return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    return 0;
  });

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

      {/* Primary Navigation Mode Tabs (Levels 1-20 Roadmap vs All Shorts Catalog) */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => {
            setViewTab('levels');
            const params = Object.fromEntries(searchParams.entries());
            delete params.tab;
            setSearchParams(params);
          }}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
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
            setViewTab('catalog');
            const params = Object.fromEntries(searchParams.entries());
            params.tab = 'catalog';
            setSearchParams(params);
          }}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
            viewTab === 'catalog'
              ? 'bg-[#026fc3] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-brand-400" />
          <span>All Shorts Catalog (198+)</span>
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
      {/* 2. ALL SHORTS CATALOG VIEW (198+ VIDEOS)                                  */}
      {/* ========================================================================= */}
      {viewTab === 'catalog' && (
        <div className="space-y-6">
          
          {/* Status Navigation Bar: All / Published / Upcoming */}
          <div className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl w-fit">
            {(['all', 'published', 'upcoming'] as const).map((st) => {
              const isSelected = selectedStatus === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedStatus(st);
                    const params: Record<string, string> = { tab: 'catalog' };
                    if (searchQuery) params.search = searchQuery;
                    if (selectedCategory !== 'All') params.category = selectedCategory;
                    if (st !== 'all') params.status = st;
                    setSearchParams(params);
                  }}
                  className={`px-4 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-white text-[#026fc3] shadow-xs scale-102'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' && <Layers className="w-3.5 h-3.5 text-[#026fc3]" />}
                  {st === 'published' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {st === 'upcoming' && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{st === 'all' ? 'All Bitz' : st}</span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, vocabulary word, or title (e.g. Gravity, Dopamine, Strongest Bone)..."
              className="w-full pl-11 pr-24 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#026fc3] focus:border-transparent transition-all shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all"
            >
              Search
            </button>
          </form>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    const params: Record<string, string> = { tab: 'catalog' };
                    if (searchQuery) params.search = searchQuery;
                    if (cat !== 'All') params.category = cat;
                    if (selectedStatus !== 'all') params.status = selectedStatus;
                    setSearchParams(params);
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#026fc3] text-white shadow-sm scale-102'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-semibold pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-2">
              <span>Showing <strong>{sortedVideos.length}</strong> Bitz lessons</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none"
                >
                  <option value="All">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 text-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none"
                >
                  <option value="latest">Latest Uploads</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          </div>

          {/* Videos Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 animate-pulse">
                  <div className="aspect-[16/10] bg-slate-200 rounded-2xl w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : sortedVideos.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Bitz Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No lessons match your current filters. Try searching for another topic or click "Sync Channel" to refresh.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedVideos.map((video) => {
                const isUpcoming = video.status === 'upcoming' || video.learning_content?.status === 'upcoming';
                const vocabCount = video.learning_content?.vocabulary?.length || 3;
                const quizCount = video.learning_content?.quiz?.length || 3;

                return (
                  <div
                    key={video.youtube_video_id}
                    className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between group"
                  >
                    <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30"></div>
                      
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold rounded-lg uppercase tracking-wider">
                          {video.category}
                        </span>

                        {isUpcoming ? (
                          <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-extrabold rounded-lg flex items-center gap-1 shadow-xs">
                            <Clock className="w-3 h-3 text-amber-100" /> Upcoming
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-[#026fc3] text-white text-[10px] font-extrabold rounded-lg flex items-center gap-1 shadow-xs">
                            <Sparkles className="w-3 h-3 text-amber-300" /> +40 XP
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/bitz/${video.youtube_video_id}`}
                        className="absolute inset-0 flex items-center justify-center group"
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-all ${
                          isUpcoming ? 'bg-amber-500 text-white group-hover:bg-amber-400' : 'bg-white/90 text-[#026fc3] group-hover:bg-white'
                        }`}>
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                      </Link>

                      <div className="absolute bottom-3 left-3 text-white text-[11px] font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{video.duration_formatted || 'Short (15s)'}</span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">
                          {video.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {video.learning_content?.summary || video.description || 'Interactive microlearning lesson from EdTechra-Bitz.'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
                        {isUpcoming ? (
                          <span className="flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-lg text-[10px]">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Interactive Lesson In Production</span>
                          </span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">
                              <BookOpen className="w-3 h-3" />
                              <span>{vocabCount} Words</span>
                            </span>
                            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                              <HelpCircle className="w-3 h-3" />
                              <span>{quizCount} Quiz Qs</span>
                            </span>
                          </>
                        )}
                        <span className="text-slate-400 font-semibold">
                          {video.difficulty || 'Beginner'}
                        </span>
                      </div>

                      <Link
                        to={`/bitz/${video.youtube_video_id}`}
                        className={`w-full py-2.5 px-4 text-white text-xs sm:text-sm font-extrabold rounded-2xl text-center shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                          isUpcoming
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                            : 'bg-[#026fc3] hover:bg-[#025ea6]'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isUpcoming ? 'PREVIEW SHORT' : 'WATCH & LEARN'}</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Admin Channel Sync Modal */}
      <AdminSyncModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSyncComplete={() => {
          fetchVideos();
        }}
      />

    </div>
  );
};
