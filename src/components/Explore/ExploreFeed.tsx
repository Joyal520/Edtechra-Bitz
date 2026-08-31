// ============================================================================
// EDTECHRA-BITZ: Knowledge Discovery Feed Engine
// Server-paginated, personalized Knowledge Bitz stream with topic filters,
// double-tap reading experience, and permanent learned exclusion.
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
import { knowledgeBitzService } from '@/services/knowledgeBitzService';
import { KnowledgeBitzDiscoveryCard } from './KnowledgeBitzDiscoveryCard';
import { KnowledgeBitzReaderModal } from './KnowledgeBitzReaderModal';
import { CustomizeFeedModal } from './CustomizeFeedModal';
import { SavedBitzModal } from './SavedBitzModal';
import { ALL_BITZ_TOPICS } from '@/utils/bitzTopicsConfig';

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
              // Deduplicate by id
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

  const handleOpenReader = (bitz: KnowledgeBitzItem) => {
    setSelectedBitzForReader(bitz);
    setIsReaderOpen(true);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Search & Top Action Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 dark:text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas, topics, facts..."
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-2xl text-xs sm:text-sm font-semibold text-stone-950 dark:text-white placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-500 hover:text-stone-900 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Customize Your Feed Button */}
        <button
          type="button"
          onClick={() => setIsCustomizeOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-stone-900 hover:bg-blue-50/80 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:border-blue-500 rounded-2xl text-xs font-black text-stone-900 dark:text-white shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
          title="Customize Your Feed"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#026fc3] dark:text-blue-400 stroke-[2.5]" />
          <span className="font-black">Customize</span>
        </button>

        {/* My Saved Knowledge Button */}
        <button
          type="button"
          onClick={() => setIsSavedOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-stone-900 hover:bg-amber-50/80 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:border-amber-400 rounded-2xl text-xs font-black text-stone-900 dark:text-white shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
          title="My Saved Knowledge"
        >
          <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500/30 stroke-[2.5]" />
          <span className="font-black">Saved</span>
        </button>
      </div>

      {/* Swipeable Topic Rail */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
        {/* For You / All Topics Pill */}
        <button
          type="button"
          onClick={() => {
            setActiveTopic('all');
            setActiveTab('for_you');
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
            activeTopic === 'all' && activeTab === 'for_you'
              ? 'bg-[#026fc3] text-white shadow-md shadow-blue-600/25'
              : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-700 hover:border-stone-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>For You</span>
        </button>

        {/* Trending Tab Pill */}
        <button
          type="button"
          onClick={() => {
            setActiveTopic('all');
            setActiveTab('trending');
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
            activeTab === 'trending'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
              : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-700 hover:border-stone-400'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Trending</span>
        </button>

        {/* Individual Topic Pills */}
        {ALL_BITZ_TOPICS.map((topic) => {
          const isActive = activeTopic === topic.id;

          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                setActiveTopic(topic.id);
                setActiveTab('for_you');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-[#0a213c] text-white dark:bg-white dark:text-[#0a213c] shadow-md'
                  : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-700 hover:border-stone-400'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: topic.color }}
              />
              <span>{topic.name}</span>
            </button>
          );
        })}
      </div>

      {/* Discovery Feed Stream */}
      <div className="space-y-4">
        {loading ? (
          // Loading Skeletons
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-300 dark:border-stone-700 overflow-hidden animate-pulse p-4 sm:p-5 space-y-4"
              >
                <div className="w-full aspect-[16/9] bg-stone-200 dark:bg-stone-800 rounded-2xl" />
                <div className="h-6 bg-stone-200 dark:bg-stone-800 rounded-md w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-full" />
                  <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-300 dark:border-stone-700 space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Couldn't load Knowledge Feed
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => fetchFeed(1, false)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (bitzList.length === 0 || allLearnedNotice) ? (
          // Premium Completion State (High Contrast & Clear CTA)
          <div className="p-8 sm:p-12 text-center bg-gradient-to-b from-emerald-50/80 via-white to-white dark:from-emerald-950/30 dark:via-stone-900 dark:to-stone-900 rounded-3xl border-2 border-emerald-200/90 dark:border-emerald-800/60 space-y-5 shadow-sm">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center mx-auto transform hover:scale-105 transition-transform">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-[#0a213c] dark:text-white tracking-tight">
                You're all caught up!
              </h3>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 max-w-md mx-auto leading-relaxed">
                Great job! All published facts in your selected topics have been permanently mastered.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="px-6 py-3 bg-[#026fc3] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-md shadow-blue-600/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Change My Interests</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTopic('all');
                  setSearchQuery('');
                  fetchFeed(1, false);
                }}
                className="px-6 py-3 bg-[#0a213c] hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition-all hover:scale-105 active:scale-95"
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
          <div className="py-6 flex items-center justify-center text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs font-medium ml-2">Loading more facts...</span>
          </div>
        )}

        {/* Sentinel element for IntersectionObserver */}
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
