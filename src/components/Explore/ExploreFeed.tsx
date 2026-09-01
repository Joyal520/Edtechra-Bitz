// ============================================================================
// EDTECHRA-BITZ: Knowledge Discovery Feed Engine (V2)
// Server-paginated, personalized Knowledge Bitz stream with 10-category filters,
// 1:1 discovery cards, double-tap reading experience, and permanent learned exclusion.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  RefreshCw,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { KnowledgeBitzItem, BitzDifficulty } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useBitzTheme } from '@/context/BitzThemeContext';
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { KnowledgeBitzDiscoveryCard } from './KnowledgeBitzDiscoveryCard';
import { KnowledgeBitzReaderModal } from './KnowledgeBitzReaderModal';
import { CustomizeFeedModal } from './CustomizeFeedModal';
import { SavedBitzModal } from './SavedBitzModal';
import { BITZ_CATEGORIES } from '@/utils/bitzTopicsConfig';

export const ExploreFeed: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token || null;
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and Filter State synced with URL parameters
  const initialSearch = searchParams.get('search') || '';
  const initialTopic = searchParams.get('topic') || 'all';
  const initialTab = (searchParams.get('tab') as 'for_you' | 'trending' | 'new') || 'for_you';

  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [activeTopic, setActiveTopic] = useState<string>(initialTopic);
  const [activeTab, setActiveTab] = useState<'for_you' | 'trending' | 'new'>(initialTab);
  const [difficultyFilter] = useState<BitzDifficulty | 'all'>('all');

  // Feed Data & Pagination State
  const [bitzList, setBitzList] = useState<KnowledgeBitzItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [allLearnedNotice, setAllLearnedNotice] = useState<boolean>(false);

  // Modals
  const [selectedBitzForReader, setSelectedBitzForReader] = useState<KnowledgeBitzItem | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState<boolean>(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);
  const [isSavedOpen, setIsSavedOpen] = useState<boolean>(false);

  // Sentinel for infinite scrolling
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Sync state to URL parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (activeTopic && activeTopic !== 'all') params.set('topic', activeTopic);
    if (activeTab && activeTab !== 'for_you') params.set('tab', activeTab);
    setSearchParams(params, { replace: true });
  }, [searchQuery, activeTopic, activeTab, setSearchParams]);

  // Check URL for direct bitz link (e.g. ?bitz=B000001)
  useEffect(() => {
    const directBitzParam = searchParams.get('bitz');
    if (directBitzParam) {
      knowledgeBitzService.getBitzById(directBitzParam, token).then((b) => {
        if (b) {
          setSelectedBitzForReader(b);
          setIsReaderOpen(true);
        }
      });
    }
  }, [searchParams, token]);

  // Fetch Feed from Server
  const fetchFeed = useCallback(
    async (targetPage = 1, isAppend = false) => {
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const res = await knowledgeBitzService.getFeed(
          {
            page: targetPage,
            limit: 8,
            topic: activeTopic === 'all' ? null : activeTopic,
            difficulty: difficultyFilter === 'all' ? null : difficultyFilter,
            search: searchQuery.trim(),
            tab: activeTab
          },
          token
        );

        if (res.success) {
          if (isAppend) {
            setBitzList((prev) => {
              const existingIds = new Set(prev.map((b) => b.id));
              const newItems = res.bitz.filter((b) => !existingIds.has(b.id));
              return [...prev, ...newItems];
            });
          } else {
            setBitzList(res.bitz);
          }

          setHasMore(res.hasMore);
          setPage(targetPage);
          setAllLearnedNotice(Boolean(res.allLearnedNotice));
        } else {
          setError('Failed to fetch knowledge feed.');
        }
      } catch (err: any) {
        console.error('[ExploreFeed] Fetch error:', err);
        setError(err.message || 'Error loading Knowledge Bitz.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTopic, difficultyFilter, searchQuery, activeTab, token]
  );

  // Reload feed on filter/topic/tab change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeed(1, false);
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchFeed]);

  // IntersectionObserver for Infinite Scroll
  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchFeed(page + 1, true);
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchFeed, hasMore, loading, loadingMore, page]);

  // Handler: When a Bitz is learned, permanently remove it from the feed view!
  const handleBitzLearned = (bitzId: string, _xpAwarded: number) => {
    setBitzList((prev) => prev.filter((b) => b.id !== bitzId));
  };

  const { isDark } = useBitzTheme();

  const handleOpenReader = (bitz: KnowledgeBitzItem) => {
    setSelectedBitzForReader(bitz);
    setIsReaderOpen(true);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Search & Top Action Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas, topics, facts..."
            className={`w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-[#06152B] border border-[rgba(96,165,250,0.28)] text-[#F8FAFC] placeholder:text-slate-400 focus:ring-[#1677FF]/40 focus:border-[#2D8CFF] shadow-inner'
                : 'bg-white border border-slate-300 text-[#0a213c] placeholder:text-slate-400 focus:ring-blue-500/25 focus:border-[#1677FF] shadow-xs'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Customize Your Feed Button */}
        <button
          type="button"
          onClick={() => setIsCustomizeOpen(true)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer ${
            isDark
              ? 'bg-[#081B35] hover:bg-[#0B2342] border border-[rgba(96,165,250,0.28)] hover:border-[#36D1FF] text-[#CBD5E1] hover:text-white'
              : 'bg-white hover:bg-blue-50 border border-slate-300 hover:border-[#1677FF] text-[#0a213c]'
          }`}
          title="Customize Your Feed"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#36D1FF] stroke-[2.5]" />
          <span className="font-black">Customize</span>
        </button>

        {/* My Saved Knowledge Button */}
        <button
          type="button"
          onClick={() => setIsSavedOpen(true)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer ${
            isDark
              ? 'bg-[#081B35] hover:bg-[#0B2342] border border-[rgba(96,165,250,0.28)] hover:border-amber-400/60 text-[#CBD5E1] hover:text-white'
              : 'bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-400 text-[#0a213c]'
          }`}
          title="My Saved Knowledge"
        >
          <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400/30 stroke-[2.5]" />
          <span className="font-black">Saved</span>
        </button>
      </div>

      {/* Swipeable 10-Category Topic Rail */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
        {/* For You / All Topics Pill */}
        <button
          type="button"
          onClick={() => {
            setActiveTopic('all');
            setActiveTab('for_you');
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer ${
            activeTopic === 'all' && activeTab === 'for_you'
              ? 'bg-[#1677FF] text-white shadow-md shadow-blue-600/35'
              : isDark
              ? 'bg-[#081B35] text-[#CBD5E1] border border-[rgba(96,165,250,0.25)] hover:border-[#36D1FF]'
              : 'bg-white text-[#0a213c] border border-slate-300 hover:border-slate-400 shadow-2xs'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>For You</span>
        </button>

        {/* Trending Tab Pill */}
        <button
          type="button"
          onClick={() => {
            setActiveTopic('all');
            setActiveTab('trending');
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer ${
            activeTab === 'trending'
              ? 'bg-[#1677FF] text-white shadow-md shadow-blue-600/35'
              : isDark
              ? 'bg-[#081B35] text-[#CBD5E1] border border-[rgba(96,165,250,0.25)] hover:border-[#36D1FF]'
              : 'bg-white text-[#0a213c] border border-slate-300 hover:border-slate-400 shadow-2xs'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Trending</span>
        </button>

        {/* 10 Main Category Pills */}
        {BITZ_CATEGORIES.map((cat) => {
          const isActive = activeTopic === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveTopic(cat.id);
                setActiveTab('for_you');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all active:scale-95 shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#1677FF] text-white shadow-md shadow-blue-600/35'
                  : isDark
                  ? 'bg-[#081B35] text-[#CBD5E1] border border-[rgba(96,165,250,0.25)] hover:border-[#36D1FF]'
                  : 'bg-white text-[#0a213c] border border-slate-300 hover:border-slate-400 shadow-2xs'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Discovery Feed Stream */}
      <div className="space-y-4">
        {loading ? (
          // Loading Skeletons
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`rounded-3xl border overflow-hidden animate-pulse p-4 sm:p-5 space-y-4 max-w-xl mx-auto w-full ${
                  isDark ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)]' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`w-full aspect-square rounded-2xl ${isDark ? 'bg-[#0B2342]' : 'bg-slate-100'}`} />
                <div className={`h-6 rounded-md w-3/4 ${isDark ? 'bg-[#0B2342]' : 'bg-slate-100'}`} />
                <div className="space-y-2">
                  <div className={`h-4 rounded w-full ${isDark ? 'bg-[#0B2342]' : 'bg-slate-100'}`} />
                  <div className={`h-4 rounded w-5/6 ${isDark ? 'bg-[#0B2342]' : 'bg-slate-100'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div
            className={`p-8 text-center rounded-3xl border space-y-3 ${
              isDark ? 'bg-[#1a101b] border-rose-900/50' : 'bg-rose-50 border-rose-200'
            }`}
          >
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-black text-rose-400">
              Couldn't load Knowledge Feed
            </h3>
            <p className="text-xs text-rose-300 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => fetchFeed(1, false)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (bitzList.length === 0 && !allLearnedNotice) ? (
          // Empty State (No published facts in database for this filter)
          <div
            className={`p-8 sm:p-12 text-center rounded-3xl border space-y-4 shadow-xs max-w-xl mx-auto ${
              isDark ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)] text-[#F8FAFC]' : 'bg-white border-slate-200 text-[#0a213c]'
            }`}
          >
            <div className="w-16 h-16 bg-[#1677FF]/15 text-[#36D1FF] border border-[#1677FF]/30 rounded-2xl shadow-xs flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                No Knowledge Bitz available yet.
              </h3>
              <p
                className={`text-sm font-semibold max-w-md mx-auto leading-relaxed ${
                  isDark ? 'text-[#CBD5E1]' : 'text-slate-700'
                }`}
              >
                There are currently no published facts in this category. Check back soon or explore other topics!
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTopic('all');
                  setSearchQuery('');
                  fetchFeed(1, false);
                }}
                className="px-6 py-3 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-blue-600/35 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Explore All Topics</span>
              </button>
            </div>
          </div>
        ) : allLearnedNotice ? (
          // Premium Completion State (User has mastered all facts in selection)
          <div
            className={`p-8 sm:p-12 text-center rounded-3xl border space-y-5 shadow-xs max-w-xl mx-auto ${
              isDark ? 'bg-[#081B35] border-[rgba(96,165,250,0.28)] text-[#F8FAFC]' : 'bg-white border-slate-200 text-[#0a213c]'
            }`}
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-2xl shadow-xs flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                You're all caught up!
              </h3>
              <p
                className={`text-sm font-semibold max-w-md mx-auto leading-relaxed ${
                  isDark ? 'text-[#CBD5E1]' : 'text-slate-700'
                }`}
              >
                Great job! All published facts in your selected topics have been permanently mastered.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="px-6 py-3 bg-[#1677FF] hover:bg-[#2D8CFF] text-white text-xs sm:text-sm font-black rounded-2xl shadow-md shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
                <span>Change My Interests</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTopic('all');
                  setSearchQuery('');
                  fetchFeed(1, false);
                }}
                className={`px-6 py-3 border rounded-2xl text-xs sm:text-sm font-black shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isDark
                    ? 'bg-[#0B2342] hover:bg-[#122c54] border-[rgba(96,165,250,0.3)] text-white'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-[#0a213c]'
                }`}
              >
                <span>Explore Other Topics</span>
              </button>
            </div>
          </div>
        ) : (
          // Active Feed Cards
          bitzList.map((bitz) => (
            <KnowledgeBitzDiscoveryCard
              key={bitz.id}
              bitz={bitz}
              onOpenReader={handleOpenReader}
            />
          ))
        )}

        {/* Infinite Scroll Loading Spinner */}
        {loadingMore && (
          <div className="py-6 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#026fc3]" />
            <span className="text-xs font-medium ml-2">Loading more facts...</span>
          </div>
        )}

        {/* Sentinel element for Infinite Scroll */}
        <div ref={sentinelRef} className="h-10 w-full" />
      </div>

      {/* Reading Experience Modal */}
      <KnowledgeBitzReaderModal
        bitz={selectedBitzForReader}
        isOpen={isReaderOpen}
        onClose={() => {
          setIsReaderOpen(false);
          setSelectedBitzForReader(null);
        }}
        onLearned={handleBitzLearned}
      />

      {/* Customize Your Feed Modal */}
      <CustomizeFeedModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        onPreferencesSaved={() => {
          fetchFeed(1, false);
        }}
      />

      {/* Saved Knowledge Pocket Modal */}
      <SavedBitzModal
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        onOpenReader={handleOpenReader}
      />
    </div>
  );
};
