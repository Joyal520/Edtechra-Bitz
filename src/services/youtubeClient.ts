import { YouTubeVideo, UserLearningProgress, ContentStatus } from '@/types';

const API_BASE = '/api/youtube';

export interface ShortsQueryParams {
  category?: string;
  search?: string;
  difficulty?: string;
  status?: ContentStatus | 'all';
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

export const youtubeClient = {
  // 1. Fetch Shorts Feed
  async getShorts(params?: ShortsQueryParams): Promise<YouTubeVideo[]> {
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
      console.warn('[YouTube Client] Error fetching shorts from API:', error);
      return [];
    }
  },

  // 2. Fetch Single Video with Full Learning Content
  async getVideo(id: string): Promise<YouTubeVideo | null> {
    try {
      const response = await fetch(`${API_BASE}/video/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const json = await response.json();
      return json.data || null;
    } catch (error) {
      console.warn(`[YouTube Client] Error fetching video ${id}:`, error);
      return null;
    }
  },

  // 3. Trigger Channel Synchronization
  async syncChannel(): Promise<{ success: boolean; message: string; count: number }> {
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

  // 4. Update Learning Content (Admin / Teacher)
  async updateContent(id: string, updates: Partial<YouTubeVideo['learning_content']>): Promise<boolean> {
    try {
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

  // 5. Save Student Progress
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
      const response = await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: progress.userId || 'alex-walker',
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
  async getUserProgress(userId = 'alex-walker'): Promise<ProgressSummary> {
    try {
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
