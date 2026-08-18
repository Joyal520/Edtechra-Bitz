import { YouTubeVideo, UserLearningProgress, ContentStatus } from '@/types';
import { supabase } from '@/lib/supabase';

const API_BASE = '/api/youtube';

export interface ShortsQueryParams {
  category?: string;
  search?: string;
  difficulty?: string;
  status?: ContentStatus | 'all';
}

export interface SyncStatusData {
  lastSyncTime: string;
  lastSyncStatus: 'idle' | 'success' | 'error' | 'in_progress';
  totalVideos: number;
  upcomingVideos: number;
  lastError: string | null;
  newVideosAddedLastSync: number;
  syncTrigger: string;
}

export interface ProgressSummary {
  shortsWatched: number;
  quizzesCompleted: number;
  averageQuizScore: number;
  learningProgressPercent: number;
  vocabularyLearned: number;
  totalCompleted: number;
  recentHistory: Array<{
    id: string;
    title: string;
    category: string;
    score: string;
    completed: boolean;
    date: string;
  }>;
}

// Helper: Format duration in seconds to human-readable string
function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '30 sec';
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
}

// Helper: Normalize Supabase response into the standard YouTubeVideo interface
function normalizeSupabaseVideo(row: any): YouTubeVideo {
  const content = row.youtube_learning_content || row.learning_content;
  const learningContent = Array.isArray(content) ? content[0] : content;
  const resolvedStatus = row.status || learningContent?.status || 'published';

  return {
    id: row.id,
    youtube_video_id: row.youtube_video_id,
    channel_id: row.channel_id,
    title: row.title,
    description: row.description || '',
    thumbnail_url: row.thumbnail_url || `https://i.ytimg.com/vi/${row.youtube_video_id}/maxresdefault.jpg`,
    youtube_url: row.youtube_url || `https://www.youtube.com/watch?v=${row.youtube_video_id}`,
    published_at: row.published_at,
    duration_seconds: row.duration_seconds || 0,
    duration_formatted: formatDuration(row.duration_seconds),
    is_short: row.is_short ?? true,
    view_count: Number(row.view_count || 0),
    like_count: Number(row.like_count || 0),
    category: row.category || 'General',
    difficulty: row.difficulty || 'Beginner',
    status: resolvedStatus,
    learning_content: learningContent ? {
      id: learningContent.id,
      youtube_video_id: learningContent.youtube_video_id || row.youtube_video_id,
      summary: learningContent.summary || '',
      key_takeaway: learningContent.key_takeaway || '',
      vocabulary: learningContent.vocabulary || [],
      quiz: learningContent.quiz || [],
      learning_objectives: learningContent.learning_objectives || [],
      status: learningContent.status || resolvedStatus,
      created_at: learningContent.created_at,
      updated_at: learningContent.updated_at
    } : undefined
  };
}

export const youtubeClient = {
  // 1. Fetch Shorts Feed (Primary: Supabase | Fallback: Local API/JSON)
  async getShorts(params?: ShortsQueryParams): Promise<YouTubeVideo[]> {
    if (!supabase) {
      return await this.getShortsFromFallback(params);
    }

    try {
      let query = supabase
        .from('youtube_videos')
        .select(`
          *,
          youtube_learning_content (*)
        `)
        .order('published_at', { ascending: false });

      if (params?.category && params.category !== 'All') {
        query = query.ilike('category', params.category);
      }
      if (params?.difficulty && params.difficulty !== 'All') {
        query = query.eq('difficulty', params.difficulty);
      }
      if (params?.search && params.search.trim()) {
        const q = params.search.trim();
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[YouTube Client] Supabase getShorts query error, using API fallback:', error.message);
        return await this.getShortsFromFallback(params);
      }

      if (data && data.length > 0) {
        let results = data.map(normalizeSupabaseVideo);

        // Filter by content status if specified
        if (params?.status && params.status !== 'all') {
          results = results.filter(v => (v.status || v.learning_content?.status || 'published') === params.status);
        }

        return results;
      }

      // If unfiltered query returned 0 from Supabase, try API fallback
      if (!params?.category && !params?.search && !params?.difficulty) {
        return await this.getShortsFromFallback(params);
      }

      return [];
    } catch (error) {
      console.warn('[YouTube Client] Supabase connection error, using API fallback:', error);
      return await this.getShortsFromFallback(params);
    }
  },

  // 2. Fetch Single Video with Full Learning Content (Primary: Supabase | Fallback: Local API/JSON)
  async getVideo(id: string): Promise<YouTubeVideo | null> {
    if (!supabase) {
      return await this.getVideoFromFallback(id);
    }

    try {
      const { data, error } = await supabase
        .from('youtube_videos')
        .select(`
          *,
          youtube_learning_content (*)
        `)
        .or(`youtube_video_id.eq.${id},id.eq.${id}`)
        .maybeSingle();

      if (error) {
        console.warn(`[YouTube Client] Supabase getVideo error for ${id}, using API fallback:`, error.message);
        return await this.getVideoFromFallback(id);
      }

      if (data) {
        return normalizeSupabaseVideo(data);
      }

      return await this.getVideoFromFallback(id);
    } catch (error) {
      console.warn(`[YouTube Client] Supabase connection error for ${id}, using API fallback:`, error);
      return await this.getVideoFromFallback(id);
    }
  },

  // Fallback 1: Fetch Shorts from Local Server API / Cache
  async getShortsFromFallback(params?: ShortsQueryParams): Promise<YouTubeVideo[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'All') query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.difficulty && params.difficulty !== 'All') query.set('difficulty', params.difficulty);
      if (params?.status) query.set('status', params.status);

      const url = `${API_BASE}/shorts${query.toString() ? `?${query.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.warn('[YouTube Client Fallback] Error fetching shorts from API:', error);
      return [];
    }
  },

  // Fallback 2: Fetch Single Video from Local Server API / Cache
  async getVideoFromFallback(id: string): Promise<YouTubeVideo | null> {
    try {
      const response = await fetch(`${API_BASE}/video/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const json = await response.json();
      return json.data || null;
    } catch (error) {
      console.warn(`[YouTube Client Fallback] Error fetching video ${id}:`, error);
      return null;
    }
  },

  // 3. Trigger Channel Synchronization (Admin)
  async syncChannel(): Promise<{ success: boolean; message: string; count: number; newCount?: number; upcomingCount?: number; stats?: SyncStatusData }> {
    try {
      const response = await fetch(`${API_BASE}/sync`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[YouTube Client] Sync error:', error);
      throw error;
    }
  },

  // 3b. Retrieve Sync Metrics for Admin Panel
  async getSyncStatus(): Promise<SyncStatusData | null> {
    try {
      const response = await fetch(`${API_BASE}/sync-status`);
      if (!response.ok) return null;
      const json = await response.json();
      return json.stats || null;
    } catch (e) {
      console.warn('[YouTube Client] Error loading sync status:', e);
      return null;
    }
  },

  // 4. Update Learning Content (Admin)
  async updateContent(id: string, updates: Partial<YouTubeVideo['learning_content']>): Promise<boolean> {
    try {
      // 1. Direct Supabase update if client available
      if (supabase) {
        const { error: dbError } = await supabase
          .from('youtube_learning_content')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('youtube_video_id', id);

        if (!dbError) {
          return true;
        }
      }

      // 2. Fallback to API if DB update failed or client unavailable
      const response = await fetch(`${API_BASE}/content/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return response.ok;
    } catch (error) {
      console.error(`[YouTube Client] Error updating content for ${id}:`, error);
      return false;
    }
  },

  // 5. Save Student Progress (Preserves exact youtube_video_id & progress schema)
  async saveProgress(progress: {
    userId?: string;
    videoId: string;
    watched?: boolean;
    watchProgress?: number;
    quizCompleted?: boolean;
    quizScore?: number;
    quizTotal?: number;
    completed?: boolean;
  }): Promise<UserLearningProgress | null> {
    try {
      // If user is authenticated with a valid UUID and Supabase client is available, persist directly
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (supabase && progress.userId && isUuid.test(progress.userId)) {
        const { data, error } = await supabase
          .from('youtube_learning_progress')
          .upsert({
            user_id: progress.userId,
            youtube_video_id: progress.videoId,
            watched: progress.watched ?? false,
            watch_progress: progress.watchProgress ?? 0,
            quiz_completed: progress.quizCompleted ?? false,
            quiz_score: progress.quizScore ?? 0,
            quiz_total: progress.quizTotal ?? 3,
            completed: progress.completed ?? false,
            last_watched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,youtube_video_id' })
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as UserLearningProgress;
        }
      }

      // Also persist to local server progress store for resilience
      const response = await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: progress.userId || 'guest-user',
          ...progress
        })
      });
      if (!response.ok) return null;
      const json = await response.json();
      return json.data;
    } catch (error) {
      console.error('[YouTube Client] Error saving progress:', error);
      return null;
    }
  },

  // 6. Get User Progress Summary for Dashboard
  async getUserProgress(userId = 'guest-user'): Promise<ProgressSummary> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (supabase && userId && isUuid.test(userId)) {
        const { data: progressRows, error } = await supabase
          .from('youtube_learning_progress')
          .select('*')
          .eq('user_id', userId);

        if (!error && progressRows && progressRows.length > 0) {
          const shortsWatched = progressRows.filter(r => r.watched).length;
          const quizzes = progressRows.filter(r => r.quiz_completed);
          const quizzesCompleted = quizzes.length;
          const totalScore = quizzes.reduce((sum, r) => sum + (r.quiz_score || 0), 0);
          const totalPossible = quizzes.reduce((sum, r) => sum + (r.quiz_total || 3), 0);
          const averageQuizScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
          const totalCompleted = progressRows.filter(r => r.completed).length;
          const vocabularyLearned = totalCompleted * 3;
          const learningProgressPercent = Math.min(100, Math.round((totalCompleted / 198) * 100));

          return {
            shortsWatched,
            quizzesCompleted,
            averageQuizScore,
            learningProgressPercent,
            vocabularyLearned,
            totalCompleted,
            recentHistory: []
          };
        }
      }

      // Fallback to API progress
      const response = await fetch(`${API_BASE}/progress/${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const json = await response.json();
      return json.stats;
    } catch (error) {
      console.warn('[YouTube Client] Error loading user progress:', error);
      return {
        shortsWatched: 0,
        quizzesCompleted: 0,
        averageQuizScore: 0,
        learningProgressPercent: 0,
        vocabularyLearned: 0,
        totalCompleted: 0,
        recentHistory: []
      };
    }
  }
};
