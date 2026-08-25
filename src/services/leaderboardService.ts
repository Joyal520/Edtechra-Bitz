// ============================================================================
// EDTECHRA-BITZ: Leaderboard Client Service
// ============================================================================

import { LeaderboardPeriod, LeaderboardResponse } from '@/types/leaderboard';
import { supabase } from '@/lib/supabase';

class LeaderboardService {
  /**
   * Resolves valid authentication token from active Supabase session
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
        console.warn('[LeaderboardService] Error getting session:', err);
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
   * Fetches top 10 learners and current user rank for a given period
   */
  async getLeaderboard(period: LeaderboardPeriod = 'week', token?: string | null): Promise<LeaderboardResponse> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch(`/api/leaderboard?period=${encodeURIComponent(period)}`, { headers });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch leaderboard');
      }

      const json = await res.json();
      return json.data as LeaderboardResponse;
    } catch (err: any) {
      console.warn('[LeaderboardService] getLeaderboard fallback notice:', err.message);
      return {
        period,
        top10: [],
        currentUser: null,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Admin API: Safely resets a competition period boundary without deleting data
   */
  async resetLeaderboard(
    period: 'today' | 'week' | 'month',
    token?: string | null
  ): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders(token);

    if (!headers['Authorization']) {
      throw new Error('Administrator session required.');
    }

    const res = await fetch('/api/leaderboard/reset', {
      method: 'POST',
      headers,
      body: JSON.stringify({ period })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to reset leaderboard.');
    }

    return {
      success: true,
      message: json.message || `Leaderboard for ${period} successfully reset.`
    };
  }

  /**
   * Admin API: Retrieves Leaderboard Settings (reset frequency)
   */
  async getLeaderboardSettings(token?: string | null): Promise<{ reset_frequency: 'weekly' | 'monthly' | 'never' }> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/admin/leaderboard/settings', { headers });
      if (!res.ok) {
        return { reset_frequency: 'weekly' };
      }
      const json = await res.json();
      return json.data || { reset_frequency: 'weekly' };
    } catch {
      return { reset_frequency: 'weekly' };
    }
  }

  /**
   * Admin API: Updates Leaderboard Reset Frequency (Weekly / Monthly / Never)
   */
  async updateLeaderboardSettings(
    frequency: 'weekly' | 'monthly' | 'never',
    token?: string | null
  ): Promise<{ success: boolean; message: string; data: any }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/admin/leaderboard/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ reset_frequency: frequency })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Failed to update leaderboard settings.');
    }

    return json;
  }
}

export const leaderboardService = new LeaderboardService();
