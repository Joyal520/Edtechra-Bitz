// ============================================================================
// EDTECHRA-BITZ: Universal User Activity Interaction Service
// ============================================================================

import { supabase } from '@/lib/supabase';

class ActivityService {
  private async getValidAuthToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken) return explicitToken;
    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.access_token) {
          return session.access_token;
        }
      } catch (err) {
        console.warn('[ActivityService] Error getting session:', err);
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
   * Idempotently records an activity interaction (e.g. watched, completed, voted)
   * for server-side feed deduplication.
   */
  async recordInteraction(
    activityId: string,
    activityType: 'quiz' | 'spelling_scramble' | 'youtube_short' | 'poll' | 'reorder' | 'reading' | 'lesson' | 'game' | 'flashcard' | 'word_of_the_day' | 'bubble_pop',
    interactionType: 'completed' | 'watched' | 'voted' | 'answered' | 'played' | 'opened' = 'completed',
    token?: string | null
  ): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders(token);
      if (!headers['Authorization']) {
        return false; // Skip for unauthenticated guest
      }

      const res = await fetch('/api/activity/interact', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          activityId,
          activityType,
          interactionType
        })
      });

      return res.ok;
    } catch (err) {
      console.warn('[ActivityService] recordInteraction notice:', err);
      return false;
    }
  }
}

export const activityService = new ActivityService();
