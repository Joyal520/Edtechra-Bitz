import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  SlidersHorizontal,
  BookOpen,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Zap,
  ArrowUp
} from 'lucide-react';
import { StudentPost } from '@/types/post';
import { QuizBit, QuizAttemptResult, YouTubeShort, ReadingBit, PollBit, ReorderActivity, SpellingScramble, WordOfTheDay } from '@/types';
import { postService } from '@/services/postService';
import { quizService } from '@/services/quizService';
import { youtubeShortsService } from '@/services/youtubeShortsService';
import { readingService } from '@/services/readingService';
import { pollService } from '@/services/pollService';
import { reorderService } from '@/services/reorderService';
import { spellingScrambleService } from '@/services/spellingScrambleService';
import { wordOfTheDayService } from '@/services/wordOfTheDayService';
import { useAuth } from '@/context/AuthContext';
import { PostCard } from './PostCard';
import { QuizBitCard } from './QuizBitCard';
import { YouTubeShortCard } from './YouTubeShortCard';
import { OneMinuteReadingCard } from './OneMinuteReadingCard';
import { PollBitCard } from './PollBitCard';
import { ReorderSentenceCard } from './ReorderSentenceCard';
import { SpellingScrambleCard } from './SpellingScrambleCard';
import { WordOfTheDayCard } from './WordOfTheDayCard';
import { TypographyControls } from './TypographyControls';
import { PostComposerModal } from './PostComposerModal';
import { AdminModerationModal } from './AdminModerationModal';
import { QUIZ_CONFIG } from '@/utils/quizConfig';
import { FEED_CONFIG, selectNextRotatedShort } from '@/utils/feedConfig';

export type FeedItem =
  | { type: 'post'; post: StudentPost; key: string }
  | { type: 'quiz'; quiz: QuizBit; key: string }
  | { type: 'youtube_short'; short: YouTubeShort; key: string }
  | { type: 'reading'; reading: ReadingBit; key: string }
  | { type: 'poll'; poll: PollBit; key: string }
  | { type: 'reorder'; reorder: ReorderActivity; key: string }
  | { type: 'spelling_scramble'; scramble: SpellingScramble; key: string }
  | { type: 'word_of_the_day'; wordOfDay: WordOfTheDay; key: string };

// Deterministic intervals for stable session interleaving
const QUIZ_INTERVAL_PATTERN = [3, 2, 4, 3, 2, 4, 3, 3, 2, 4];
const SHORT_INTERVAL_PATTERN = [
  FEED_CONFIG.SHORT_FEED_INTERVAL_MIN,
  FEED_CONFIG.SHORT_FEED_INTERVAL_MAX,
  FEED_CONFIG.SHORT_FEED_INTERVAL_MIN,
  5,
  FEED_CONFIG.SHORT_FEED_INTERVAL_MAX,
  FEED_CONFIG.SHORT_FEED_INTERVAL_MIN
];
const READING_INTERVAL_PATTERN = [4, 4, 4, 4];
const POLL_INTERVAL_PATTERN = [6, 7, 8, 6, 7, 8];
const REORDER_INTERVAL_PATTERN = [
  FEED_CONFIG.REORDER_FEED_INTERVAL_MIN,
  FEED_CONFIG.REORDER_FEED_INTERVAL_MAX,
  FEED_CONFIG.REORDER_FEED_INTERVAL_MIN,
  5,
  FEED_CONFIG.REORDER_FEED_INTERVAL_MAX
];
const SPELLING_INTERVAL_PATTERN = [
  FEED_CONFIG.SPELLING_FEED_INTERVAL_MIN,
  FEED_CONFIG.SPELLING_FEED_INTERVAL_MAX,
  5,
  FEED_CONFIG.SPELLING_FEED_INTERVAL_MIN,
  FEED_CONFIG.SPELLING_FEED_INTERVAL_MAX
];
const WORD_OF_THE_DAY_INTERVAL_PATTERN = [
  FEED_CONFIG.WORD_OF_THE_DAY_FEED_INTERVAL_MIN,
  FEED_CONFIG.WORD_OF_THE_DAY_FEED_INTERVAL_MAX,
  4,
  FEED_CONFIG.WORD_OF_THE_DAY_FEED_INTERVAL_MIN,
  FEED_CONFIG.WORD_OF_THE_DAY_FEED_INTERVAL_MAX
];

export const PostFeed: React.FC = () => {
  const { profile, session, requireAuth } = useAuth();
  
  const [posts, setPosts] = useState<StudentPost[]>([]);
  const [quizzes, setQuizzes] = useState<QuizBit[]>([]);
  const [shorts, setShorts] = useState<YouTubeShort[]>([]);
  const [readings, setReadings] = useState<ReadingBit[]>([]);
  const [polls, setPolls] = useState<PollBit[]>([]);
  const [reorders, setReorders] = useState<ReorderActivity[]>([]);
  const [scrambles, setScrambles] = useState<SpellingScramble[]>([]);
  const [wordsOfDay, setWordsOfDay] = useState<WordOfTheDay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const [activeShortId, setActiveShortId] = useState<string | null>(null);

  // Sentinel ref for production-grade infinite scroll prefetching
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef<boolean>(false);

  const displayName =
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    'Student';

  const avatarUrl =
    profile?.avatar_url ||
    profile?.avatarUrl;

  const initials = (displayName || 'S').slice(0, 2).toUpperCase();

  // Track window scroll position for floating Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Stop active Short when tab is blurred/hidden or user navigates away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setActiveShortId(null);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, []);

  // Load feed quizzes, shorts, readings, polls, sentence reorders, spelling scrambles, and words of the day pool
  const loadMediaPool = useCallback(async () => {
    try {
      const token = session?.access_token || null;
      const [quizData, shortsData, readingData, pollData, reorderData, scrambleData, wordsData] = await Promise.all([
        quizService.getFeedQuizzes(token),
        youtubeShortsService.getFeedShorts(token),
        readingService.getFeedReadings(token),
        pollService.getFeedPolls(token),
        reorderService.getFeedReorders(token),
        spellingScrambleService.getFeedScrambles(token),
        wordOfTheDayService.getFeedWords(token)
      ]);
      setQuizzes(quizData || []);
      setShorts(shortsData || []);
      setReadings(readingData || []);
      setPolls(pollData || []);
      setReorders(reorderData || []);
      setScrambles(scrambleData || []);
      setWordsOfDay(wordsData || []);
    } catch (err) {
      console.warn('[PostFeed] Failed to load media pools:', err);
    }
  }, [session]);

  const fetchPosts = useCallback(
    async (targetPage = 1, append = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const token = session?.access_token || null;
        const [postsData] = await Promise.all([
          postService.getPosts({ page: targetPage, limit: 8, sort: sortBy }, token),
          targetPage === 1 ? loadMediaPool() : Promise.resolve()
        ]);

        if (append) {
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            const freshPosts = postsData.posts.filter((p) => !seen.has(p.id));
            return [...prev, ...freshPosts];
          });
        } else {
          setPosts(postsData.posts);
        }

        setHasMore(postsData.hasMore);
        setPage(targetPage);
      } catch (err) {
        console.error('[PostFeed] Error loading posts:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [session, sortBy, loadMediaPool]
  );

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  // Production-grade IntersectionObserver for infinite scrolling with prefetch margin
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading && !loadingMore && !isFetchingRef.current) {
          fetchPosts(page + 1, true);
        }
      },
      {
        root: null,
        rootMargin: '400px', // Prefetch next batch 400px before reaching the end!
        threshold: 0.1
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore, page, fetchPosts]);

  const handleOpenComposer = () => {
    requireAuth({ type: 'action', action: 'create_post' }, () => {
      setComposerOpen(true);
    });
  };

  const handlePostCreated = (newPost: StudentPost) => {
    // Optimistically insert new post at top of feed
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  const handleQuizAttemptCompleted = (_quizId: string, _result: QuizAttemptResult) => {
    // Attempt state is self-managed inside QuizBitCard so the answered quiz
    // stays in place with its explanation and confetti. The next quiz will
    // be encountered further down the feed as the student scrolls.
  };

  // Interleave Quizzes, Shorts, One-Minute Readings, Polls, Sentence Reorders, and Spelling Scrambles stably into the feed stream
  const feedItems = useMemo<FeedItem[]>(() => {
    if (posts.length === 0) return [];

    const items: FeedItem[] = [];
    let quizIndex = 0;
    let readingIndex = 0;
    let pollIndex = 0;
    let reorderIndex = 0;
    let scrambleIndex = 0;
    let wordIndex = 0;

    let postsSinceLastQuiz = 0;
    let postsSinceLastShort = 0;
    let postsSinceLastReading = 0;
    let postsSinceLastPoll = 0;
    let postsSinceLastReorder = 0;
    let postsSinceLastScramble = 0;
    let postsSinceLastWord = 0;

    let quizPatternIdx = 0;
    let shortPatternIdx = 0;
    let readingPatternIdx = 0;
    let pollPatternIdx = 0;
    let reorderPatternIdx = 0;
    let scramblePatternIdx = 0;
    let wordPatternIdx = 0;

    let quizTargetInterval = QUIZ_INTERVAL_PATTERN[0];
    let shortTargetInterval = SHORT_INTERVAL_PATTERN[0];
    let readingTargetInterval = READING_INTERVAL_PATTERN[0];
    let pollTargetInterval = POLL_INTERVAL_PATTERN[0];
    let reorderTargetInterval = REORDER_INTERVAL_PATTERN[0];
    let scrambleTargetInterval = SPELLING_INTERVAL_PATTERN[0];
    let wordTargetInterval = WORD_OF_THE_DAY_INTERVAL_PATTERN[0];

    // Track shown IDs and recent categories for category-aware rotation with cooldown
    const seenShortIds = new Set<string>();
    const seenQuizIds = new Set<string>();
    const seenReadingIds = new Set<string>();
    const seenPollIds = new Set<string>();
    const seenReorderIds = new Set<string>();
    const seenScrambleIds = new Set<string>();
    const seenWordIds = new Set<string>();
    let recentShortCategories: string[] = [];

    posts.forEach((post, index) => {
      items.push({ type: 'post', post, key: `post-${post.id}` });
      postsSinceLastReading++;
      postsSinceLastQuiz++;
      postsSinceLastShort++;
      postsSinceLastPoll++;
      postsSinceLastReorder++;
      postsSinceLastScramble++;
      postsSinceLastWord++;

      let insertedNonPostThisSlot = false;

      // 1. TOP PRIORITY: Insert a One-Minute Reading strictly after every 4 posts
      if (
        !insertedNonPostThisSlot &&
        postsSinceLastReading >= readingTargetInterval &&
        readings.length > 0
      ) {
        let availableReading = readings.find(r => !seenReadingIds.has(r.id));
        if (!availableReading) {
          // If all pool readings have been seen in this session, cycle from the published pool
          availableReading = readings[readingIndex % readings.length];
        }
        if (availableReading) {
          seenReadingIds.add(availableReading.id);
          items.push({ type: 'reading', reading: availableReading, key: `reading-${availableReading.id}-${index}` });
          readingIndex++;
          postsSinceLastReading = 0;
          readingPatternIdx = (readingPatternIdx + 1) % READING_INTERVAL_PATTERN.length;
          readingTargetInterval = READING_INTERVAL_PATTERN[readingPatternIdx];
          insertedNonPostThisSlot = true;
        }
      }

      // 2. Check if it's time to insert a Word of the Day card
      if (
        !insertedNonPostThisSlot &&
        postsSinceLastWord >= wordTargetInterval &&
        wordsOfDay.length > 0
      ) {
        let availableWord = wordsOfDay.find(w => !seenWordIds.has(w.id));
        if (!availableWord) {
          availableWord = wordsOfDay[wordIndex % wordsOfDay.length];
        }
        if (availableWord) {
          seenWordIds.add(availableWord.id);
          items.push({ type: 'word_of_the_day', wordOfDay: availableWord, key: `word-${availableWord.id}-${index}` });
          wordIndex++;
          postsSinceLastWord = 0;
          wordPatternIdx = (wordPatternIdx + 1) % WORD_OF_THE_DAY_INTERVAL_PATTERN.length;
          wordTargetInterval = WORD_OF_THE_DAY_INTERVAL_PATTERN[wordPatternIdx];
          insertedNonPostThisSlot = true;
        }
      }

      // 3. Check if it's time to insert an educational Quiz Bit
      if (
        !insertedNonPostThisSlot &&
        QUIZ_CONFIG.ENABLED &&
        postsSinceLastQuiz >= quizTargetInterval &&
        quizzes.length > 0
      ) {
        let currentQuiz = quizzes.find(q => !seenQuizIds.has(q.id));
        if (!currentQuiz) {
          currentQuiz = quizzes[quizIndex % quizzes.length];
        }
        if (currentQuiz) {
          seenQuizIds.add(currentQuiz.id);
          items.push({ type: 'quiz', quiz: currentQuiz, key: `quiz-${currentQuiz.id}-${index}` });
          quizIndex++;
          postsSinceLastQuiz = 0;
          quizPatternIdx = (quizPatternIdx + 1) % QUIZ_INTERVAL_PATTERN.length;
          quizTargetInterval = QUIZ_INTERVAL_PATTERN[quizPatternIdx];
          insertedNonPostThisSlot = true;
        }
      }

      // 4. Check if it's time to insert a Spelling Scramble activity
      if (
        !insertedNonPostThisSlot &&
        postsSinceLastScramble >= scrambleTargetInterval &&
        scrambles.length > 0
      ) {
        let availableScramble = scrambles.find(s => !seenScrambleIds.has(s.id));
        if (!availableScramble) {
          availableScramble = scrambles[scrambleIndex % scrambles.length];
        }
        if (availableScramble) {
          seenScrambleIds.add(availableScramble.id);
          items.push({ type: 'spelling_scramble', scramble: availableScramble, key: `scramble-${availableScramble.id}-${index}` });
          scrambleIndex++;
          postsSinceLastScramble = 0;
          scramblePatternIdx = (scramblePatternIdx + 1) % SPELLING_INTERVAL_PATTERN.length;
          scrambleTargetInterval = SPELLING_INTERVAL_PATTERN[scramblePatternIdx];
          insertedNonPostThisSlot = true;
        }
      }

      // 5. Check if it's time to insert a Sentence Reorder activity
      if (
        !insertedNonPostThisSlot &&
        postsSinceLastReorder >= reorderTargetInterval &&
        reorders.length > 0
      ) {
        let availableReorder = reorders.find(r => !seenReorderIds.has(r.id));
        if (!availableReorder) {
          availableReorder = reorders[reorderIndex % reorders.length];
        }
        if (availableReorder) {
          seenReorderIds.add(availableReorder.id);
          items.push({ type: 'reorder', reorder: availableReorder, key: `reorder-${availableReorder.id}-${index}` });
          reorderIndex++;
          postsSinceLastReorder = 0;
          reorderPatternIdx = (reorderPatternIdx + 1) % REORDER_INTERVAL_PATTERN.length;
          reorderTargetInterval = REORDER_INTERVAL_PATTERN[reorderPatternIdx];
          insertedNonPostThisSlot = true;
        }
      }

      // 6. Check if it's time to insert a category-rotated YouTube Short
      if (
        !insertedNonPostThisSlot &&
        postsSinceLastShort >= shortTargetInterval &&
        shorts.length > 0
      ) {
        const { selectedShort, updatedRecentCategories } = selectNextRotatedShort(
          shorts,
          seenShortIds,
          recentShortCategories,
          FEED_CONFIG.SHORT_CATEGORY_COOLDOWN
        );

        if (selectedShort) {
          seenShortIds.add(selectedShort.id);
          seenShortIds.add(selectedShort.youtube_video_id);
          recentShortCategories = updatedRecentCategories;
          items.push({ type: 'youtube_short', short: selectedShort, key: `short-${selectedShort.id}-${index}` });
          postsSinceLastShort = 0;
          shortPatternIdx = (shortPatternIdx + 1) % SHORT_INTERVAL_PATTERN.length;
          shortTargetInterval = SHORT_INTERVAL_PATTERN[shortPatternIdx];
          insertedNonPostThisSlot = true;
        }
      }

      // 7. Check if it's time to insert a Community Poll
      if (
        !insertedNonPostThisSlot &&
        postsSinceLastPoll >= pollTargetInterval &&
        polls.length > 0
      ) {
        let availablePoll = polls.find(p => !seenPollIds.has(p.id));
        if (!availablePoll) {
          availablePoll = polls[pollIndex % polls.length];
        }
        if (availablePoll) {
          seenPollIds.add(availablePoll.id);
          items.push({ type: 'poll', poll: availablePoll, key: `poll-${availablePoll.id}-${index}` });
          pollIndex++;
          postsSinceLastPoll = 0;
          pollPatternIdx = (pollPatternIdx + 1) % POLL_INTERVAL_PATTERN.length;
          pollTargetInterval = POLL_INTERVAL_PATTERN[pollPatternIdx];
          insertedNonPostThisSlot = true;
        }
      }
    });

    return items;
  }, [posts, quizzes, shorts, readings, polls, reorders, scrambles, wordsOfDay]);

  // Extract ordered list of YouTube Short IDs in current feed
  const feedShortIds = useMemo(() => {
    return feedItems
      .filter((item): item is Extract<FeedItem, { type: 'youtube_short' }> => item.type === 'youtube_short')
      .map((item) => item.short.id);
  }, [feedItems]);

  // Determine immediate next Short for intelligent 1-step background preloading
  const nextShortId = useMemo(() => {
    if (feedShortIds.length === 0) return null;
    if (!activeShortId) return feedShortIds[0] || null;
    const currentIdx = feedShortIds.indexOf(activeShortId);
    if (currentIdx >= 0 && currentIdx + 1 < feedShortIds.length) {
      return feedShortIds[currentIdx + 1];
    }
    return null;
  }, [feedShortIds, activeShortId]);

  const handleShortBecomeActive = useCallback((shortId: string) => {
    setActiveShortId((prev) => (prev !== shortId ? shortId : prev));
  }, []);

  const handleShortBecomeInactive = useCallback((shortId: string) => {
    setActiveShortId((prev) => (prev === shortId ? null : prev));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      
      {/* 1. Quick "Create Post" Composer Bar */}
      <div className="mx-3 sm:mx-0 bg-white border border-stone-200/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1.5px] shadow-2xs overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover bg-amber-100" />
            ) : (
              <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs text-slate-800">
                {initials}
              </div>
            )}
          </div>

          <button
            onClick={handleOpenComposer}
            className="flex-1 py-2 px-3 sm:py-2.5 sm:px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold rounded-2xl text-left transition-colors cursor-pointer min-h-[40px]"
          >
            What's on your mind? Share your knowledge…
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={handleOpenComposer}
            className="px-3.5 py-1.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create Post</span>
          </button>
        </div>
      </div>

      {/* 2. Feed Controls & Filter Header */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-1 text-xs text-slate-500 font-semibold min-h-[36px]">
        <div>
          {quizzes.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] sm:text-[11px] font-bold border border-teal-200 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              <span>Quizzes Active</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto">
          {/* Global Educational Typography Control (A- / A / A+) */}
          <TypographyControls showLabel={false} />

          {profile?.role === 'admin' && (
            <button
              onClick={() => setAdminModalOpen(true)}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Open AI Moderation Queue"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Admin Queue</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
              className="bg-transparent text-slate-700 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
            </select>
          </div>

          <button
            onClick={() => fetchPosts(1, false)}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#026fc3]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Feed List (Interleaved Posts, Quiz Bits, and Category-Rotated YouTube Shorts) */}
      {loading ? (
        <div className="space-y-4 sm:space-y-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-none sm:rounded-3xl border-y sm:border border-slate-200 p-4 sm:p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-2.5 bg-slate-100 rounded w-1/6"></div>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-3/4"></div>
              <div className="w-full aspect-square bg-slate-200 rounded-none sm:rounded-2xl"></div>
            </div>
          ))}
        </div>
      ) : feedItems.length === 0 ? (
        <div className="mx-3 sm:mx-0 bg-white border border-dashed border-slate-300 rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-[#026fc3] flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#0f233a]">No Student Posts Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Be the first to share an educational insight, study diagram, or learning reflection with the community!
            </p>
          </div>
          <button
            onClick={handleOpenComposer}
            className="px-5 py-2.5 bg-[#026fc3] hover:bg-[#025ea6] text-white text-xs font-black rounded-2xl shadow-xs transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {feedItems.map((item) => {
            if (item.type === 'word_of_the_day') {
              return (
                <div key={item.key} className="px-3 sm:px-0">
                  <WordOfTheDayCard word={item.wordOfDay} />
                </div>
              );
            }

            if (item.type === 'quiz') {
              return (
                <div key={item.key} className="px-3 sm:px-0">
                  <QuizBitCard
                    quiz={item.quiz}
                    onAttemptCompleted={handleQuizAttemptCompleted}
                  />
                </div>
              );
            }

            if (item.type === 'youtube_short') {
              const isShortActive = item.short.id === activeShortId;
              const isShortNext = item.short.id === nextShortId;

              return (
                <YouTubeShortCard
                  key={item.key}
                  short={item.short}
                  isActive={isShortActive}
                  isNext={isShortNext}
                  onBecomeActive={() => handleShortBecomeActive(item.short.id)}
                  onBecomeInactive={() => handleShortBecomeInactive(item.short.id)}
                />
              );
            }

            if (item.type === 'reading') {
              return (
                <div key={item.key} className="px-3 sm:px-0">
                  <OneMinuteReadingCard reading={item.reading} />
                </div>
              );
            }

            if (item.type === 'reorder') {
              return (
                <div key={item.key} className="px-3 sm:px-0">
                  <ReorderSentenceCard reorder={item.reorder} />
                </div>
              );
            }

            if (item.type === 'spelling_scramble') {
              return (
                <div key={item.key} className="px-3 sm:px-0">
                  <SpellingScrambleCard scramble={item.scramble} />
                </div>
              );
            }

            if (item.type === 'poll') {
              return (
                <div key={item.key} className="px-3 sm:px-0">
                  <PollBitCard poll={item.poll} />
                </div>
              );
            }

            return (
              <PostCard
                key={item.key}
                post={item.post}
                onPostDeleted={handlePostDeleted}
              />
            );
          })}

          {/* Minimal Loading Indicator when fetching next page */}
          {loadingMore && (
            <div className="py-4 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-semibold animate-in fade-in">
              <Loader2 className="w-5 h-5 animate-spin text-[#026fc3]" />
              <span>Loading more educational bits…</span>
            </div>
          )}

          {/* End of Feed Caught-up Indicator */}
          {!hasMore && posts.length > 0 && (
            <div className="py-6 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-1.5">
              <span>✨ You're all caught up with the community feed!</span>
            </div>
          )}

          {/* Prefetch Sentinel (Invisible trigger placed 400px before bottom) */}
          <div ref={sentinelRef} className="h-6 w-full pointer-events-none" aria-hidden="true" />
        </div>
      )}

      {/* Floating "Back to Top" Button after significant scrolling */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 bg-white/95 hover:bg-white text-slate-700 hover:text-[#026fc3] border border-stone-200/90 rounded-full shadow-lg backdrop-blur-md transition-all duration-200 active:scale-95 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          aria-label="Back to top"
          title="Scroll to top"
        >
          <ArrowUp className="w-4 h-4 text-[#026fc3]" />
          <span className="hidden sm:inline font-bold">Top</span>
        </button>
      )}

      {/* Post Composer Modal */}
      <PostComposerModal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Admin Moderation Queue Modal */}
      {profile?.role === 'admin' && (
        <AdminModerationModal
          isOpen={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          onPostUpdated={() => fetchPosts(1, false)}
        />
      )}

    </div>
  );
};
