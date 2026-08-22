// ============================================================================
// EDTECHRA-BITZ: Word of the Day API Service (Client-Side)
// ============================================================================

import {
  WordOfTheDay,
  RawWordInput,
  WordAdminStats,
  WordImportBatchResult
} from '@/types/wordOfTheDay';
import { supabase } from '@/lib/supabase';

const SAVED_WORDS_LOCAL_KEY = 'edtechra_saved_words_v1';

class WordOfTheDayService {
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
        console.warn('[WordOfTheDayService] Failed to retrieve session:', err);
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
   * Fetches published words of the day for the student feed.
   */
  async getFeedWords(token?: string | null): Promise<WordOfTheDay[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/words-of-the-day/feed', { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch words feed`);
      }
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.warn('[WordOfTheDayService] Feed fetch fallback to direct Supabase query:', err);

      if (supabase) {
        const { data, error } = await supabase
          .from('words_of_the_day')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(30);

        if (!error && data) {
          const localSaved = this.getLocalSavedWordIds();
          return data.map((item: any) => ({
            ...item,
            is_saved_by_me: localSaved.has(item.id)
          })) as WordOfTheDay[];
        }
      }
      return [];
    }
  }

  /**
   * Admin: Fetches list of words with filtering, search & stats
   */
  async getAdminWords(
    filters?: { search?: string; status?: string; partOfSpeech?: string; page?: number; limit?: number },
    token?: string | null
  ): Promise<{ words: WordOfTheDay[]; stats: WordAdminStats; total: number }> {
    const headers = await this.getAuthHeaders(token);
    const query = new URLSearchParams();
    if (filters?.search) query.set('search', filters.search);
    if (filters?.status && filters.status !== 'all') query.set('status', filters.status);
    if (filters?.partOfSpeech && filters.partOfSpeech !== 'all') query.set('partOfSpeech', filters.partOfSpeech);
    if (filters?.page) query.set('page', String(filters.page));
    if (filters?.limit) query.set('limit', String(filters.limit));

    const res = await fetch(`/api/words-of-the-day/admin?${query.toString()}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin words of the day.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Fast retrieval of all normalized words in DB for instantaneous client duplicate detection
   */
  async getExistingWords(token?: string | null): Promise<string[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/words-of-the-day/existing-words', { headers });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (err) {
      console.warn('[WordOfTheDayService] Existing words lookup notice:', err);
    }

    if (supabase) {
      try {
        const { data } = await supabase.from('words_of_the_day').select('word_normalized');
        if (data) {
          return data.map((r: any) => r.word_normalized).filter(Boolean);
        }
      } catch (e) {}
    }

    return [];
  }

  /**
   * Admin: Creates single Word of the Day
   */
  async createWord(
    input: RawWordInput,
    token?: string | null
  ): Promise<WordOfTheDay> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/words-of-the-day', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create word of the day.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Safely chunk-imports up to 1,000 words in sub-batches, updating progress.
   */
  async importBatch(
    words: RawWordInput[],
    onProgress?: (current: number, total: number) => void,
    token?: string | null
  ): Promise<WordImportBatchResult> {
    const headers = await this.getAuthHeaders(token);
    const total = words.length;

    if (total === 0) {
      return {
        success: true,
        batchId: '',
        totalSubmitted: 0,
        importedCount: 0,
        failedCount: 0,
        imported: [],
        failed: []
      };
    }

    // Process in safe sub-batches of 200 items to avoid payload limits and browser stalls
    const CHUNK_SIZE = 200;
    const allImported: WordOfTheDay[] = [];
    const allFailed: any[] = [];
    let mainBatchId = `batch_${Date.now()}`;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = words.slice(i, i + CHUNK_SIZE);
      const res = await fetch('/api/words-of-the-day/import-batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ words: chunk, batchId: mainBatchId })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to import batch chunk (${i + 1}-${i + chunk.length}).`);
      }

      const json = await res.json();
      if (json.data?.batchId) mainBatchId = json.data.batchId;
      if (Array.isArray(json.data?.imported)) allImported.push(...json.data.imported);
      if (Array.isArray(json.data?.failed)) allFailed.push(...json.data.failed);

      const currentProgress = Math.min(i + CHUNK_SIZE, total);
      if (onProgress) {
        onProgress(currentProgress, total);
      }
    }

    return {
      success: true,
      batchId: mainBatchId,
      totalSubmitted: total,
      importedCount: allImported.length,
      failedCount: allFailed.length,
      imported: allImported,
      failed: allFailed
    };
  }

  /**
   * Admin: Edits an existing Word of the Day
   */
  async updateWord(
    id: string,
    updates: Partial<WordOfTheDay>,
    token?: string | null
  ): Promise<WordOfTheDay> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/words-of-the-day/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update word of the day.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Deletes a Word of the Day
   */
  async deleteWord(id: string, token?: string | null): Promise<boolean> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/words-of-the-day/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete word of the day.');
    }

    return true;
  }

  /**
   * Student: Toggles like on a word
   */
  async toggleLike(id: string, token?: string | null): Promise<{ liked: boolean; likesCount: number }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/words-of-the-day/${encodeURIComponent(id)}/like`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to toggle like.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Student: Toggles "Add to My Words" save state
   */
  async toggleSave(id: string, token?: string | null): Promise<{ saved: boolean }> {
    // 1. Optimistic LocalStorage update
    const currentSaved = this.getLocalSavedWordIds();
    const willBeSaved = !currentSaved.has(id);
    if (willBeSaved) {
      currentSaved.add(id);
    } else {
      currentSaved.delete(id);
    }
    this.setLocalSavedWordIds(currentSaved);

    // 2. Server persistence if authenticated
    try {
      const headers = await this.getAuthHeaders(token);
      if (headers['Authorization']) {
        const res = await fetch(`/api/words-of-the-day/${encodeURIComponent(id)}/save`, {
          method: 'POST',
          headers
        });
        if (res.ok) {
          const json = await res.json();
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[WordOfTheDayService] Server save notice:', err);
    }

    return { saved: willBeSaved };
  }

  private getLocalSavedWordIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(SAVED_WORDS_LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (e) {}
    return new Set();
  }

  private setLocalSavedWordIds(set: Set<string>) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SAVED_WORDS_LOCAL_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {}
  }
}

export const wordOfTheDayService = new WordOfTheDayService();
