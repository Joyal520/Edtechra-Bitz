// ============================================================================
// EDTECHRA-BITZ: Sentence Reorder API Service (Client-Side)
// ============================================================================

import {
  ReorderActivity,
  RawReorderInput,
  ReorderAttemptResult,
  ReorderAdminStats
} from '@/types/reorder';
import { supabase } from '@/lib/supabase';

class ReorderService {
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
        console.warn('[ReorderService] Failed to retrieve session:', err);
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
  async getFeedReorders(token?: string | null): Promise<ReorderActivity[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/reorders/feed', { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch reorder feed`);
      }
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('[ReorderService] Feed fetch fallback to Supabase direct query:', err);

      if (supabase) {
        const { data, error } = await supabase
          .from('reorder_activities')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(15);

        if (!error && data) {
          return data as ReorderActivity[];
        }
      }
      return [];
    }
  }

  /**
   * Submits student's sentence reorder completion attempt
   */
  async submitCompletion(
    activityId: string,
    userOrder: string[],
    usedHint: boolean = false,
    token?: string | null
  ): Promise<ReorderAttemptResult> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/reorders/complete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ activityId, userOrder, usedHint })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit sentence completion.');
    }

    const json = await res.json();
    return json.data as ReorderAttemptResult;
  }

  /**
   * Admin: Fetches list of activities with filtering & stats
   */
  async getAdminActivities(
    filters?: { search?: string; category?: string; level?: string; published?: string },
    token?: string | null
  ): Promise<{ activities: ReorderActivity[]; stats: ReorderAdminStats; total: number }> {
    const headers = await this.getAuthHeaders(token);
    const query = new URLSearchParams();
    if (filters?.search) query.set('search', filters.search);
    if (filters?.category && filters.category !== 'all') query.set('category', filters.category);
    if (filters?.level && filters.level !== 'all') query.set('level', filters.level);
    if (filters?.published && filters.published !== 'all') query.set('published', filters.published);

    const res = await fetch(`/api/reorders/admin?${query.toString()}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin activities.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Creates single activity or batch array
   */
  async createActivity(
    input: RawReorderInput | RawReorderInput[],
    token?: string | null
  ): Promise<ReorderActivity | ReorderActivity[]> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/reorders', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create sentence reorder activity.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Batch imports array of activities
   */
  async importBatch(
    activities: RawReorderInput[],
    token?: string | null
  ): Promise<{ importedCount: number; failedCount: number; batchId: string; activities: ReorderActivity[] }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/reorders/import-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ activities })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to batch import activities.');
    }

    return await res.json();
  }

  /**
   * Admin: Updates activity
   */
  async updateActivity(
    id: string,
    updates: Partial<RawReorderInput>,
    token?: string | null
  ): Promise<ReorderActivity> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/reorders/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update activity.');
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
    const res = await fetch(`/api/reorders/${id}/publish`, {
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
  async deleteActivity(id: string, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/reorders/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete activity.');
    }
  }
}

export const reorderService = new ReorderService();
