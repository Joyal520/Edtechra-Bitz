// ============================================================================
// EDTECHRA-BITZ: YouTube Shorts API Client Service
// ============================================================================

import { YouTubeShort, CreateYouTubeShortInput, YouTubeShortAdminStats } from '@/types';
import { supabase } from '@/lib/supabase';

class YouTubeShortsService {
  /**
   * Resolves a fresh, valid Supabase JWT access token.
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
        console.warn('[YouTubeShortsService] Failed to retrieve session:', err);
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
   * Student Feed API: Fetches published shorts pool for feed interleaving
   */
  async getFeedShorts(token?: string | null): Promise<YouTubeShort[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/youtube/shorts/feed', { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('[YouTubeShortsService] getFeedShorts non-ok status:', res.status, json.error);
        return [];
      }

      return (json.data || []) as YouTubeShort[];
    } catch (err) {
      console.warn('[YouTubeShortsService] getFeedShorts error:', err);
      return [];
    }
  }

  /**
   * Admin API: Fetches all shorts with filtering, search, and statistics
   */
  async getAdminShorts(
    params: {
      search?: string;
      category?: string;
      status?: 'all' | 'published' | 'draft';
      page?: number;
      limit?: number;
    } = {},
    token?: string | null
  ): Promise<{ shorts: YouTubeShort[]; stats: YouTubeShortAdminStats; total: number }> {
    const defaultStats: YouTubeShortAdminStats = {
      totalShorts: 0,
      publishedShorts: 0,
      draftShorts: 0,
      linkedQuizShorts: 0
    };

    try {
      const headers = await this.getAuthHeaders(token);
      const query = new URLSearchParams();

      if (params.search) query.set('search', params.search);
      if (params.category && params.category !== 'all') query.set('category', params.category);
      if (params.status && params.status !== 'all') query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await fetch(`/api/youtube/shorts/admin?${query.toString()}`, { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('[YouTubeShortsService] getAdminShorts non-ok status:', res.status, json.error);
        return { shorts: [], stats: defaultStats, total: 0 };
      }

      return {
        shorts: json.data?.shorts || [],
        stats: json.data?.stats || defaultStats,
        total: json.data?.total || 0
      };
    } catch (err) {
      console.warn('[YouTubeShortsService] getAdminShorts error:', err);
      return { shorts: [], stats: defaultStats, total: 0 };
    }
  }

  /**
   * Admin API: Creates a new YouTube Short
   */
  async createShort(
    input: CreateYouTubeShortInput,
    token?: string | null
  ): Promise<YouTubeShort> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch('/api/youtube/shorts', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to create YouTube Short.');
    }

    return json.data as YouTubeShort;
  }

  /**
   * Admin API: Updates a YouTube Short
   */
  async updateShort(
    id: string,
    updates: Partial<CreateYouTubeShortInput>,
    token?: string | null
  ): Promise<YouTubeShort> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/youtube/shorts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update YouTube Short.');
    }

    return json.data as YouTubeShort;
  }

  /**
   * Admin API: Deletes a YouTube Short permanently
   */
  async deleteShort(id: string, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/youtube/shorts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to delete YouTube Short.');
    }
  }

  /**
   * Admin API: Toggles publication status of a YouTube Short
   */
  async togglePublish(
    id: string,
    isPublished: boolean,
    token?: string | null
  ): Promise<YouTubeShort> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/youtube/shorts/${encodeURIComponent(id)}/publish`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_published: isPublished })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update publication status.');
    }

    return json.data as YouTubeShort;
  }

  /**
   * Admin API: Imports and auto-categorizes existing channel shorts into the feed library
   */
  async importExistingShorts(token?: string | null): Promise<{
    success: boolean;
    message: string;
    found: number;
    imported: number;
    duplicates: number;
    categorized: number;
    failed: number;
  }> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch('/api/youtube/shorts/import-existing', {
      method: 'POST',
      headers
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to import existing shorts.');
    }

    return json;
  }
}

export const youtubeShortsService = new YouTubeShortsService();
