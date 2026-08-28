// ============================================================================
// EDTECHRA-BITZ: Bubble Pop Game Client Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { loadBubblePopProgress, saveBubblePopProgress } from '@/components/games/BubblePopGame';

export interface BubblePopCompletionResult {
  is_completed: boolean;
  level: number;
  score: number;
  target_score: number;
  xp_awarded: number;
  already_completed: boolean;
  completed_at?: string;
}

export interface BubblePopProgressResponse {
  highestCompletedLevel: number;
  highestUnlockedLevel: number;
  totalXP: number;
  completedLevels: {
    level: number;
    score: number;
    target_score: number;
    xp_awarded: number;
    completed_at: string;
  }[];
}

class BubblePopService {
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
        console.warn('[BubblePopService] Error getting session:', err);
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
   * Submits a completed Bubble Pop level attempt to persist score, record completion,
   * and award XP exactly once.
   */
  async submitCompletion(
    level: number,
    score: number,
    targetScore: number,
    durationSeconds = 30,
    token?: string | null
  ): Promise<BubblePopCompletionResult> {
    // 1. Try Backend API
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/bubble-pop/complete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          level,
          score,
          targetScore,
          durationSeconds
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          const result = json.data as BubblePopCompletionResult;
          this.saveLocalCompletedLevel(level, result);

          // Update local progress so highestUnlockedLevel advances immediately
          const currentProgress = loadBubblePopProgress();
          if (level >= currentProgress.highestUnlockedLevel && level < 100) {
            saveBubblePopProgress({
              ...currentProgress,
              highestUnlockedLevel: level + 1,
              totalXP: currentProgress.totalXP + (result.xp_awarded || 0)
            });
          }

          return result;
        }
      }
    } catch (err: any) {
      console.warn('[BubblePopService] Server complete endpoint notice, using fallback:', err.message);
    }

    // 2. Direct Supabase Fallback
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (userId) {
          // Check if already completed
          const { data: existing } = await supabase
            .from('bubble_pop_completions')
            .select('id, level, score, xp_awarded')
            .eq('user_id', userId)
            .eq('level', level)
            .maybeSingle();

          const alreadyCompleted = Boolean(existing);
          const xpAwarded = alreadyCompleted ? 0 : 10;

          if (!alreadyCompleted) {
            await supabase.from('bubble_pop_completions').upsert({
              user_id: userId,
              level,
              score,
              target_score: targetScore,
              xp_awarded: xpAwarded,
              duration_seconds: durationSeconds,
              completed_at: new Date().toISOString()
            });

            await supabase.from('user_activity_interactions').upsert({
              user_id: userId,
              activity_id: `bubble_pop_${level}`,
              activity_type: 'bubble_pop',
              interaction_type: 'completed',
              completed_at: new Date().toISOString()
            });
          }

          const result: BubblePopCompletionResult = {
            is_completed: true,
            level,
            score,
            target_score: targetScore,
            xp_awarded: xpAwarded,
            already_completed: alreadyCompleted,
            completed_at: new Date().toISOString()
          };

          this.saveLocalCompletedLevel(level, result);

          // Update local progress
          const currentProgress = loadBubblePopProgress();
          if (level >= currentProgress.highestUnlockedLevel && level < 100) {
            saveBubblePopProgress({
              ...currentProgress,
              highestUnlockedLevel: level + 1,
              totalXP: currentProgress.totalXP + result.xp_awarded
            });
          }

          return result;
        }
      } catch (sbErr) {
        console.warn('[BubblePopService] Direct Supabase fallback notice:', sbErr);
      }
    }

    // 3. Local Storage Fallback
    const existing = this.getLocalCompletedLevel(level);
    const alreadyCompleted = Boolean(existing);
    const result: BubblePopCompletionResult = {
      is_completed: true,
      level,
      score,
      target_score: targetScore,
      xp_awarded: alreadyCompleted ? 0 : 10,
      already_completed: alreadyCompleted,
      completed_at: new Date().toISOString()
    };

    this.saveLocalCompletedLevel(level, result);

    // Update highest unlocked level in local progress
    const currentProgress = loadBubblePopProgress();
    if (level >= currentProgress.highestUnlockedLevel && level < 100) {
      saveBubblePopProgress({
        ...currentProgress,
        highestUnlockedLevel: level + 1,
        totalXP: currentProgress.totalXP + result.xp_awarded
      });
    }

    return result;
  }

  /**
   * Retrieves overall progress across all levels
   */
  async getProgress(token?: string | null): Promise<BubblePopProgressResponse> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/bubble-pop/progress', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          return json.data as BubblePopProgressResponse;
        }
      }
    } catch (err) {
      console.warn('[BubblePopService] Failed to load progress from server:', err);
    }

    // Fallback: local progress
    const local = loadBubblePopProgress();
    return {
      highestCompletedLevel: Math.max(0, local.highestUnlockedLevel - 1),
      highestUnlockedLevel: local.highestUnlockedLevel,
      totalXP: local.totalXP,
      completedLevels: []
    };
  }

  /**
   * Reads persistent completed level record from localStorage
   */
  getLocalCompletedLevel(level: number): BubblePopCompletionResult | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`edtechra_completed_bubble_pop_${level}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  /**
   * Saves persistent completed level record to localStorage
   */
  saveLocalCompletedLevel(level: number, result: BubblePopCompletionResult): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`edtechra_completed_bubble_pop_${level}`, JSON.stringify(result));
    } catch (e) {}
  }
}

export const bubblePopService = new BubblePopService();
