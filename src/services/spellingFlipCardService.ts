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

export const INITIAL_SEED_CARDS: SpellingFlipCardItem[] = [
  // Easy (3–5 letters, 30s, +10 XP)
  { id: 'flip_seed_1', word: 'HOUSE', level: 'easy', category: 'Everyday Objects', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_2', word: 'WATER', level: 'easy', category: 'Nature', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_3', word: 'TIGER', level: 'easy', category: 'Animals', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_4', word: 'LIGHT', level: 'easy', category: 'Science', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_5', word: 'BREAD', level: 'easy', category: 'Food', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_6', word: 'APPLE', level: 'easy', category: 'Fruit', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_7', word: 'CLOCK', level: 'easy', category: 'Everyday Objects', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_8', word: 'PLANT', level: 'easy', category: 'Nature', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_9', word: 'TRAIN', level: 'easy', category: 'Transport', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_10', word: 'SMILE', level: 'easy', category: 'Emotion', memorize_seconds: 30, xp: 10, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Intermediate (6–8 letters, 20s, +15 XP)
  { id: 'flip_seed_11', word: 'PENCIL', level: 'intermediate', category: 'Everyday Objects', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_12', word: 'BOTTLE', level: 'intermediate', category: 'Everyday Objects', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_13', word: 'ELEPHANT', level: 'intermediate', category: 'Animals', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_14', word: 'COMPUTER', level: 'intermediate', category: 'Technology', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_15', word: 'DOLPHIN', level: 'intermediate', category: 'Animals', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_16', word: 'PYRAMID', level: 'intermediate', category: 'History', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_17', word: 'DIAMOND', level: 'intermediate', category: 'Science', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_18', word: 'JOURNEY', level: 'intermediate', category: 'General', memorize_seconds: 20, xp: 15, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

  // Hard (9–20 letters, 10s, +20 XP)
  { id: 'flip_seed_19', word: 'ENVIRONMENT', level: 'hard', category: 'Science', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_20', word: 'PHOTOSYNTHESIS', level: 'hard', category: 'Science', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_21', word: 'MICROPROCESSOR', level: 'hard', category: 'Technology', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_22', word: 'RESPONSIBILITY', level: 'hard', category: 'Life Skills', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_23', word: 'CHAMELEON', level: 'hard', category: 'Animals', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_24', word: 'HIPPOPOTAMUS', level: 'hard', category: 'Animals', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_25', word: 'REFRIGERATOR', level: 'hard', category: 'Technology', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'flip_seed_26', word: 'ELECTRICITY', level: 'hard', category: 'Science', memorize_seconds: 10, xp: 20, is_published: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

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
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[SpellingFlipCardService] Feed fetch fallback to direct Supabase query:', err);
    }

    if (supabase) {
      try {
        let query = supabase
          .from('spelling_flip_cards')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (level) {
          query = query.eq('level', level);
        }

        const { data, error } = await query.limit(30);
        if (!error && Array.isArray(data) && data.length > 0) {
          return data as SpellingFlipCardItem[];
        }
      } catch (e) {}
    }

    // Filter seed cards by level if requested
    if (level) {
      return INITIAL_SEED_CARDS.filter(c => c.level === level);
    }
    return INITIAL_SEED_CARDS;
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
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/spelling-flip-cards/complete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ cardId, userWord, timeTakenSeconds })
      });

      if (res.ok) {
        const json = await res.json();
        return json.data as SpellingFlipAttemptResult;
      }
    } catch (e) {
      console.warn('[SpellingFlipCardService] Backend complete unreachable, fallback grading:', e);
    }

    // Resilient local fallback evaluation
    const seed = INITIAL_SEED_CARDS.find(c => c.id === cardId);
    const targetWord = seed ? seed.word : userWord.trim().toUpperCase();
    const isCorrect = userWord.trim().toUpperCase() === targetWord;
    const xp = isCorrect ? (seed?.xp || 10) : 0;

    return {
      is_correct: isCorrect,
      correct_word: targetWord,
      xp_awarded: xp,
      already_completed: false,
      level: seed?.level || 'easy',
      time_taken_seconds: timeTakenSeconds || 0
    };
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
