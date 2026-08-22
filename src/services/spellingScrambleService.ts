// ============================================================================
// EDTECHRA-BITZ: Spelling Scramble API Service (Client-Side)
// ============================================================================

import {
  SpellingScramble,
  RawSpellingScrambleInput,
  SpellingScrambleAttemptResult,
  SpellingScrambleAdminStats
} from '@/types/spellingScramble';
import { supabase } from '@/lib/supabase';

class SpellingScrambleService {
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
        console.warn('[SpellingScrambleService] Failed to retrieve session:', err);
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
   * Fetches published activities for the student Explore feed
   */
  async getFeedScrambles(token?: string | null): Promise<SpellingScramble[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/spelling-scrambles/feed', { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch spelling scrambles feed`);
      }
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('[SpellingScrambleService] Feed fetch fallback to direct query:', err);

      if (supabase) {
        const { data, error } = await supabase
          .from('spelling_scrambles')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(15);

        if (!error && data) {
          return data as SpellingScramble[];
        }
      }
      return [];
    }
  }

  /**
   * Submits student's spelling scramble completion attempt
   */
  async submitCompletion(
    scrambleId: string,
    userWord: string,
    timeTakenSeconds?: number,
    token?: string | null
  ): Promise<SpellingScrambleAttemptResult> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/spelling-scrambles/complete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ scrambleId, userWord, timeTakenSeconds })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit spelling completion.');
    }

    const json = await res.json();
    return json.data as SpellingScrambleAttemptResult;
  }

  /**
   * Admin: Fetches list of activities with filtering & stats
   */
  async getAdminScrambles(
    filters?: { search?: string; category?: string; difficulty?: string; published?: string },
    token?: string | null
  ): Promise<{ scrambles: SpellingScramble[]; stats: SpellingScrambleAdminStats; total: number }> {
    const headers = await this.getAuthHeaders(token);
    const query = new URLSearchParams();
    if (filters?.search) query.set('search', filters.search);
    if (filters?.category && filters.category !== 'all') query.set('category', filters.category);
    if (filters?.difficulty && filters.difficulty !== 'all') query.set('difficulty', filters.difficulty);
    if (filters?.published && filters.published !== 'all') query.set('published', filters.published);

    const res = await fetch(`/api/spelling-scrambles/admin?${query.toString()}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin spelling scrambles.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Creates single activity or batch array
   */
  async createScramble(
    input: RawSpellingScrambleInput | RawSpellingScrambleInput[],
    token?: string | null
  ): Promise<SpellingScramble | SpellingScramble[]> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/spelling-scrambles', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create spelling scramble.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Batch imports array of activities
   */
  async importBatch(
    activities: RawSpellingScrambleInput[],
    token?: string | null
  ): Promise<{ importedCount: number; failedCount: number; batchId: string; scrambles: SpellingScramble[] }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/spelling-scrambles/import-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ activities })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to batch import spelling scrambles.');
    }

    return await res.json();
  }

  /**
   * Admin: Updates activity
   */
  async updateScramble(
    id: string,
    updates: Partial<RawSpellingScrambleInput>,
    token?: string | null
  ): Promise<SpellingScramble> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/spelling-scrambles/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update spelling scramble.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Toggles published status
   */
  async togglePublish(
    id: string,
    isPublished?: boolean,
    token?: string | null
  ): Promise<boolean> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/spelling-scrambles/${id}/publish`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_published: isPublished })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle publication status.');
    }

    const json = await res.json();
    return json.is_published;
  }

  /**
   * Admin: Deletes activity
   */
  async deleteScramble(id: string, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/spelling-scrambles/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete spelling scramble.');
    }
  }
}

export const spellingScrambleService = new SpellingScrambleService();
