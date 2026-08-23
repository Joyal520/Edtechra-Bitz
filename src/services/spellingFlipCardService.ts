// ============================================================================
// EDTECHRA-BITZ: Spelling Flip Card API Service (Client-Side)
// ============================================================================

import {
  SpellingFlipCardItem,
  RawSpellingFlipInput,
  SpellingFlipAttemptResult,
  SpellingFlipAdminStats,
  SpellingFlipLevel
} from '@/types/spellingFlipCard';
import { supabase } from '@/lib/supabase';

class SpellingFlipCardService {
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
        console.warn('[SpellingFlipCardService] Failed to retrieve session:', err);
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
   * Fetches published spelling flip cards for the student feed / game session.
   * Can optionally filter by specific level ('easy', 'intermediate', 'hard').
   */
  async getFeedCards(level?: SpellingFlipLevel, token?: string | null): Promise<SpellingFlipCardItem[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const url = level ? `/api/spelling-flip-cards/feed?level=${level}` : '/api/spelling-flip-cards/feed';
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch spelling flip cards feed`);
      }
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('[SpellingFlipCardService] Feed fetch fallback to direct Supabase query:', err);

      if (supabase) {
        let query = supabase
          .from('spelling_flip_cards')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (level) {
          query = query.eq('level', level);
        }

        const { data, error } = await query.limit(20);
        if (!error && data) {
          return data as SpellingFlipCardItem[];
        }
      }
      return [];
    }
  }

  /**
   * Submits student's spelling flip card answer attempt and awards XP.
   */
  async submitCompletion(
    cardId: string,
    userWord: string,
    timeTakenSeconds?: number,
    token?: string | null
  ): Promise<SpellingFlipAttemptResult> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/spelling-flip-cards/complete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ cardId, userWord, timeTakenSeconds })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit spelling attempt.');
    }

    const json = await res.json();
    return json.data as SpellingFlipAttemptResult;
  }

  /**
   * Admin: Fetches list of all flip cards with filtering & stats.
   */
  async getAdminCards(
    filters?: {
      level?: string;
      category?: string;
      status?: 'all' | 'published' | 'draft';
      search?: string;
      page?: number;
      limit?: number;
    },
    token?: string | null
  ): Promise<{
    cards: SpellingFlipCardItem[];
    stats: SpellingFlipAdminStats;
    total: number;
  }> {
    const headers = await this.getAuthHeaders(token);
    const params = new URLSearchParams();
    if (filters?.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const res = await fetch(`/api/spelling-flip-cards/admin?${params.toString()}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to fetch admin spelling flip cards.`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Batch-imports valid spelling flip card entries.
   */
  async importBatch(
    cards: RawSpellingFlipInput[],
    token?: string | null
  ): Promise<{
    importedCount: number;
    batchId: string;
    cards: SpellingFlipCardItem[];
  }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/spelling-flip-cards/import-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ cards })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to batch-import spelling flip cards.`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Creates a single card.
   */
  async createCard(
    payload: RawSpellingFlipInput,
    token?: string | null
  ): Promise<SpellingFlipCardItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/spelling-flip-cards', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to create spelling flip card.`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Updates an existing card.
   */
  async updateCard(
    id: string,
    payload: Partial<RawSpellingFlipInput>,
    token?: string | null
  ): Promise<SpellingFlipCardItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/spelling-flip-cards/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to update spelling flip card.`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Toggles published status.
   */
  async togglePublish(
    id: string,
    isPublished: boolean,
    token?: string | null
  ): Promise<SpellingFlipCardItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/spelling-flip-cards/${id}/publish`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_published: isPublished })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to update published status.`);
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Deletes a card.
   */
  async deleteCard(id: string, token?: string | null): Promise<boolean> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/spelling-flip-cards/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}: Failed to delete spelling flip card.`);
    }

    return true;
  }
}

export const spellingFlipCardService = new SpellingFlipCardService();
