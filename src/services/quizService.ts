// ============================================================================
// EDTECHRA-BITZ: Quiz Service (Client-Side API Integration)
// ============================================================================

import {
  QuizBit,
  RawQuizInput,
  QuizAttemptResult,
  QuizImportResult,
  QuizAdminStats
} from '@/types';
import { supabase } from '@/lib/supabase';

class QuizService {
  /**
   * Resolves a valid Supabase JWT access token for authorization headers.
   */
  async getValidAuthToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken) return explicitToken;

    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.access_token) {
          return session.access_token;
        }
      } catch (err) {
        console.warn('[QuizService] Failed to retrieve session from Supabase:', err);
      }
    }
    return null;
  }

  private async getAuthHeaders(explicitToken?: string | null): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = await this.getValidAuthToken(explicitToken);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetches a randomized pool of published Quiz Bits for the feed.
   * If user is authenticated, excludes quizzes they have already correctly completed.
   */
  async getFeedQuizzes(token?: string | null): Promise<QuizBit[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/quiz/feed', { headers });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch quiz feed pool');
      }

      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('[QuizService] getFeedQuizzes fallback/error:', err);
      return [];
    }
  }

  /**
   * Submits a student's quiz answer for server-side verification and XP awarding.
   */
  async submitAttempt(
    quizId: string,
    selectedAnswer: string,
    token?: string | null
  ): Promise<QuizAttemptResult> {
    const headers = await this.getAuthHeaders(token);

    const res = await fetch('/api/quiz/attempt', {
      method: 'POST',
      headers,
      body: JSON.stringify({ quizId, selectedAnswer })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to verify quiz answer.');
    }

    return json.data as QuizAttemptResult;
  }

  /**
   * Admin API: Imports a validated batch of quizzes.
   */
  async importBatch(
    quizzes: RawQuizInput[],
    token?: string | null
  ): Promise<QuizImportResult> {
    const headers = await this.getAuthHeaders(token);

    if (!headers['Authorization']) {
      throw new Error('Admin authorization token required.');
    }

    const res = await fetch('/api/quiz/import', {
      method: 'POST',
      headers,
      body: JSON.stringify({ quizzes })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to import quiz batch.');
    }

    return json.data as QuizImportResult;
  }

  /**
   * Admin API: Fetches quizzes with filtering and analytics.
   */
  async getAdminQuizzes(
    params: {
      search?: string;
      category?: string;
      difficulty?: string;
      published?: string;
      page?: number;
      limit?: number;
    } = {},
    token?: string | null
  ): Promise<{ quizzes: QuizBit[]; stats: QuizAdminStats; total: number }> {
    const defaultStats: QuizAdminStats = {
      totalQuizzes: 0,
      publishedQuizzes: 0,
      unpublishedQuizzes: 0,
      totalAttempts: 0,
      totalXpAwarded: 0,
      totalBatches: 0
    };

    try {
      const headers = await this.getAuthHeaders(token);
      const query = new URLSearchParams();

      if (params.search) query.set('search', params.search);
      if (params.category && params.category !== 'all') query.set('category', params.category);
      if (params.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty);
      if (params.published && params.published !== 'all') query.set('published', params.published);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await fetch(`/api/quiz/admin?${query.toString()}`, { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('[QuizService] getAdminQuizzes returned non-ok status:', res.status, json.error);
        return {
          quizzes: [],
          stats: defaultStats,
          total: 0
        };
      }

      return {
        quizzes: json.data?.quizzes || [],
        stats: json.data?.stats || defaultStats,
        total: json.data?.total || 0
      };
    } catch (err) {
      console.warn('[QuizService] getAdminQuizzes fetch error:', err);
      return {
        quizzes: [],
        stats: defaultStats,
        total: 0
      };
    }
  }

  /**
   * Admin API: Updates a quiz bit.
   */
  async updateQuiz(
    id: string,
    updates: Partial<QuizBit>,
    token?: string | null
  ): Promise<QuizBit> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/quiz/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update quiz.');
    }

    return json.data;
  }

  /**
   * Admin API: Deletes a quiz bit.
   */
  async deleteQuiz(id: string, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/quiz/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to delete quiz.');
    }
  }

  /**
   * Admin API: Toggles published status.
   */
  async togglePublish(id: string, is_published: boolean, token?: string | null): Promise<QuizBit> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/quiz/${encodeURIComponent(id)}/publish`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_published })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to toggle publication status.');
    }

    return json.data;
  }

  /**
   * Admin API: Batch publish or unpublish.
   */
  async batchPublish(ids: string[], is_published: boolean, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/quiz/batch-publish', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ ids, is_published })
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to update batch publication.');
    }
  }

  /**
   * Retrieves total earned Quiz Bit XP and completed count for a student.
   */
  async getUserQuizStats(userId: string, token?: string | null): Promise<{ totalXp: number; completedCount: number }> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch(`/api/quiz/user-xp/${encodeURIComponent(userId)}`, { headers });
      if (!res.ok) return { totalXp: 0, completedCount: 0 };
      const json = await res.json();
      return {
        totalXp: json.data?.totalXp || 0,
        completedCount: json.data?.completedCount || 0
      };
    } catch {
      return { totalXp: 0, completedCount: 0 };
    }
  }
}

export const quizService = new QuizService();
