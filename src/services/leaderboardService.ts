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
   * Fetches top 10 learners and current user rank for a given period with automatic Supabase fallback
   */
  async getLeaderboard(period: LeaderboardPeriod = 'week', token?: string | null): Promise<LeaderboardResponse> {
    // 1. Primary: Server API
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch(`/api/leaderboard?period=${encodeURIComponent(period)}`, { headers });

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          return json.data as LeaderboardResponse;
        }
      }
    } catch (err: any) {
      console.warn('[LeaderboardService] Primary /api/leaderboard fetch notice, trying direct Supabase fallback:', err.message);
    }

    // 2. Direct Supabase Fallback using RPC get_top_learners
    if (supabase) {
      try {
        let currentUserId: string | null = null;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          currentUserId = session?.user?.id || null;
        } catch {}

        const { data: rpcData, error: rpcError } = await supabase.rpc('get_top_learners', {
          p_period: period,
          p_current_user_id: currentUserId
        });

        if (!rpcError && rpcData) {
          if (Array.isArray(rpcData.top10) && rpcData.top10.length > 0) {
            return {
              period,
              top10: rpcData.top10,
              currentUser: rpcData.currentUser || null,
              lastUpdated: rpcData.lastUpdated || new Date().toISOString()
            };
          }
        }
      } catch (sbErr) {
        console.warn('[LeaderboardService] Direct Supabase RPC fallback notice:', sbErr);
      }

      // 3. Direct Profiles Query Fallback (Show registered student learners)
      try {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, role, created_at')
          .eq('role', 'student')
          .order('created_at', { ascending: true })
          .limit(10);

        if (!pErr && Array.isArray(profiles) && profiles.length > 0) {
          const top10 = profiles.map((p, idx) => ({
            rank: idx + 1,
            userId: p.id,
            displayName: p.full_name?.trim() || (p.email ? p.email.split('@')[0] : 'Learner'),
            avatarUrl: p.avatar_url || null,
            xp: 100,
            level: 1
          }));

          return {
            period,
            top10,
            currentUser: null,
            lastUpdated: new Date().toISOString()
          };
        }
      } catch (profErr) {
        console.warn('[LeaderboardService] Profiles fallback notice:', profErr);
      }
    }

    return {
      period,
      top10: [],
      currentUser: null,
      lastUpdated: new Date().toISOString()
    };
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
