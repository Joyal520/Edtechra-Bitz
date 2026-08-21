// ============================================================================
// EDTECHRA-BITZ: Poll API Service (Client-Side)
// ============================================================================

import {
  PollBit,
  CreatePollInput,
  PollVoteResult,
  PollAdminStats,
  AIPollGenerationResult
} from '@/types';
import { supabase } from '@/lib/supabase';

class PollService {
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
        console.warn('[PollService] Failed to retrieve session:', err);
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
   * Admin API: Uses natural language prompt to generate structured poll using AI
   */
  async generatePollFromPrompt(
    prompt: string,
    token?: string | null
  ): Promise<AIPollGenerationResult> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required to generate AI polls.');
    }

    const res = await fetch('/api/polls/generate-ai', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to generate poll with AI.');
    }

    return json.data as AIPollGenerationResult;
  }

  /**
   * Fetches published polls pool for student feed interleaving
   */
  async getFeedPolls(token?: string | null): Promise<PollBit[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/polls/feed', { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('[PollService] getFeedPolls error:', json.error);
        return [];
      }

      return (json.data || []) as PollBit[];
    } catch (err) {
      console.warn('[PollService] getFeedPolls fetch error:', err);
      return [];
    }
  }

  /**
   * Submits a student's vote on a poll
   */
  async submitVote(
    pollId: string,
    selectedOptions: string | string[],
    token?: string | null
  ): Promise<PollVoteResult> {
    const headers = await this.getAuthHeaders(token);

    const res = await fetch('/api/polls/vote', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pollId, selectedOptions })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to submit vote.');
    }

    return json.data as PollVoteResult;
  }

  /**
   * Admin API: Fetches all polls with analytics
   */
  async getAdminPolls(
    params: {
      search?: string;
      category?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
    token?: string | null
  ): Promise<{ polls: PollBit[]; stats: PollAdminStats; total: number }> {
    const defaultStats: PollAdminStats = {
      totalPolls: 0,
      publishedPolls: 0,
      draftPolls: 0,
      totalVotes: 0
    };

    try {
      const headers = await this.getAuthHeaders(token);
      const query = new URLSearchParams();

      if (params.search) query.set('search', params.search);
      if (params.category && params.category !== 'all') query.set('category', params.category);
      if (params.status && params.status !== 'all') query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await fetch(`/api/polls/admin?${query.toString()}`, { headers });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { polls: [], stats: defaultStats, total: 0 };
      }

      return {
        polls: json.data?.polls || [],
        stats: json.data?.stats || defaultStats,
        total: json.data?.total || 0
      };
    } catch (err) {
      console.warn('[PollService] getAdminPolls fetch error:', err);
      return { polls: [], stats: defaultStats, total: 0 };
    }
  }

  /**
   * Admin API: Creates or approves a poll
   */
  async createPoll(
    input: CreatePollInput,
    token?: string | null
  ): Promise<PollBit> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch('/api/polls', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to create poll.');
    }

    return json.data as PollBit;
  }

  /**
   * Admin API: Updates a poll
   */
  async updatePoll(
    id: string,
    updates: Partial<CreatePollInput>,
    token?: string | null
  ): Promise<PollBit> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/polls/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update poll.');
    }

    return json.data as PollBit;
  }

  /**
   * Admin API: Toggles publication status
   */
  async togglePublish(
    id: string,
    isPublished: boolean,
    token?: string | null
  ): Promise<boolean> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/polls/${encodeURIComponent(id)}/publish`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_published: isPublished })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to toggle publication status.');
    }

    return Boolean(json.is_published);
  }

  /**
   * Admin API: Deletes a poll
   */
  async deletePoll(id: string, token?: string | null): Promise<void> {
    const headers = await this.getAuthHeaders(token);
    if (!headers['Authorization']) {
      throw new Error('Admin authorization required.');
    }

    const res = await fetch(`/api/polls/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to delete poll.');
    }
  }
}

export const pollService = new PollService();
