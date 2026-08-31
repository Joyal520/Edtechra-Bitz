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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas, topics, facts..."
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs sm:text-sm font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Customize Your Feed Button */}
        <button
          type="button"
          onClick={() => setIsCustomizeOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs font-bold text-stone-700 dark:text-stone-200 shadow-sm transition-all active:scale-95 shrink-0"
          title="Customize Your Feed"
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Customize</span>
        </button>

        {/* My Saved Knowledge Button */}
        <button
          type="button"
          onClick={() => setIsSavedOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl text-xs font-bold text-stone-700 dark:text-stone-200 shadow-sm transition-all active:scale-95 shrink-0"
          title="My Saved Knowledge"
        >
          <Bookmark className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">Saved</span>
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
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
            activeTopic === 'all' && activeTab === 'for_you'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-stone-300'
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
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
            activeTab === 'trending'
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
              : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-stone-300'
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
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
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
                className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-pulse p-4 space-y-4"
              >
                <div className="w-full aspect-[16/9] bg-stone-200 dark:bg-stone-800 rounded-2xl" />
                <div className="h-5 bg-stone-200 dark:bg-stone-800 rounded-md w-3/4" />
                <div className="space-y-2">
                  <div className="h-3.5 bg-stone-200 dark:bg-stone-800 rounded w-full" />
                  <div className="h-3.5 bg-stone-200 dark:bg-stone-800 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
              Couldn't load Knowledge Feed
            </h3>
            <p className="text-xs text-stone-500">{error}</p>
            <button
              type="button"
              onClick={() => fetchFeed(1, false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm hover:bg-blue-700 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (bitzList.length === 0 || allLearnedNotice) ? (
          // No More Facts / All Learned State (Section 13)
          <div className="p-8 sm:p-10 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-stone-900 dark:text-stone-50">
                You've learned everything available right now!
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1 leading-relaxed">
                Great job! All published facts in your selected topics have been permanently mastered.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTopic('all');
                  setSearchQuery('');
                  fetchFeed(1, false);
                }}
                className="px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 text-xs font-bold rounded-xl transition-all"
              >
                Explore Other Topics
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold rounded-xl transition-all"
              >
                Change My Interests
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
