// ============================================================================
// EDTECHRA-BITZ: Unified Vocabulary Content System API Service (Client-Side)
// Supports Words, Collocations, Phrasal Verbs, and Idioms
// ============================================================================

import {
  VocabularyItem,
  RawVocabularyInput,
  VocabularyContentType,
  VocabularyAdminStats,
  VocabularyValidationResult,
  VocabularyImportBatchResult,
  VocabularyPublishingQueueItem,
  VocabularyImportHistoryItem,
  GeminiStatusInfo
} from '@/types/vocabulary';
import { supabase } from '@/lib/supabase';

const SAVED_VOCABULARY_LOCAL_KEY = 'edtechra_saved_words_v1';

class VocabularyService {
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
        console.warn('[VocabularyService] Failed to retrieve session:', err);
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
   * Fetches published vocabulary items for the student feed.
   */
  async getFeedVocabulary(type?: string | null, token?: string | null): Promise<VocabularyItem[]> {
    const localSaved = this.getLocalSavedWordIds();

    try {
      const headers = await this.getAuthHeaders(token);
      const query = type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : '';
      const res = await fetch(`/api/vocabulary/feed${query}`, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = (json.data || []) as VocabularyItem[];
        return items.filter((w) => !w.is_saved_by_me && !localSaved.has(w.id));
      }
    } catch (err) {
      console.warn('[VocabularyService] Feed fetch fallback to direct Supabase query:', err);
    }

    if (supabase) {
      try {
        let query = supabase
          .from('words_of_the_day')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(30);

        if (type && type !== 'all') {
          query = query.eq('content_type', type);
        }

        const { data, error } = await query;
        if (!error && data) {
          return data
            .filter((item: any) => !localSaved.has(item.id))
            .map((item: any) => ({
              ...item,
              title: item.title || item.word,
              content_type: item.content_type || 'word',
              is_saved_by_me: false
            })) as VocabularyItem[];
        }
      } catch (e) {}
    }
    return [];
  }

  /**
   * Backward compatibility alias — fetches all published vocabulary items
   */
  async getFeedWords(token?: string | null): Promise<VocabularyItem[]> {
    return this.getFeedVocabulary('all', token);
  }

  /**
   * Admin: Fetches list of vocabulary with multi-criteria filtering, search & stats
   */
  async getAdminVocabulary(
    filters?: {
      search?: string;
      status?: string;
      type?: string;
      validationStatus?: string;
      partOfSpeech?: string;
      page?: number;
      limit?: number;
    },
    token?: string | null
  ): Promise<{ items: VocabularyItem[]; words: VocabularyItem[]; stats: VocabularyAdminStats; total: number }> {
    const headers = await this.getAuthHeaders(token);
    const query = new URLSearchParams();
    if (filters?.search) query.set('search', filters.search);
    if (filters?.status && filters.status !== 'all') query.set('status', filters.status);
    if (filters?.type && filters.type !== 'all') query.set('type', filters.type);
    if (filters?.validationStatus && filters.validationStatus !== 'all') query.set('validationStatus', filters.validationStatus);
    if (filters?.partOfSpeech && filters.partOfSpeech !== 'all') query.set('partOfSpeech', filters.partOfSpeech);
    if (filters?.page) query.set('page', String(filters.page));
    if (filters?.limit) query.set('limit', String(filters.limit));

    const res = await fetch(`/api/vocabulary/admin?${query.toString()}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch admin vocabulary.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Backward compatibility alias
   */
  async getAdminWords(
    filters?: { search?: string; status?: string; partOfSpeech?: string; page?: number; limit?: number },
    token?: string | null
  ): Promise<{ words: VocabularyItem[]; stats: any; total: number }> {
    const res = await this.getAdminVocabulary({ ...filters, type: 'all' }, token);
    return {
      words: res.items || res.words,
      stats: res.stats,
      total: res.total
    };
  }

  /**
   * Fast retrieval of all normalized titles in DB for instantaneous client duplicate detection
   */
  async getExistingTitles(token?: string | null): Promise<string[]> {
    try {
      const headers = await this.getAuthHeaders(token);
      const res = await fetch('/api/vocabulary/existing', { headers });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch (err) {
      console.warn('[VocabularyService] Existing titles lookup notice:', err);
    }

    if (supabase) {
      try {
        const { data } = await supabase.from('words_of_the_day').select('word_normalized, title');
        if (data) {
          return data.map((r: any) => r.word_normalized || r.title?.toLowerCase()).filter(Boolean);
        }
      } catch (e) {}
    }

    return [];
  }

  /**
   * Backward compatibility alias
   */
  async getExistingWords(token?: string | null): Promise<string[]> {
    return this.getExistingTitles(token);
  }

  /**
   * Admin: Creates a single Vocabulary item
   */
  async createVocabulary(
    input: RawVocabularyInput,
    token?: string | null
  ): Promise<VocabularyItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/vocabulary', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create vocabulary item.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Backward compatibility alias
   */
  async createWord(
    input: RawVocabularyInput,
    token?: string | null
  ): Promise<VocabularyItem> {
    return this.createVocabulary({ ...input, content_type: 'word' }, token);
  }

  /**
   * Admin: Validates a batch using Gemini AI with automatic local fallback
   */
  async validateBatch(
    items: RawVocabularyInput[],
    defaultType: VocabularyContentType = 'word',
    validationMode: 'gemini' | 'basic' = 'gemini',
    token?: string | null
  ): Promise<VocabularyValidationResult> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/vocabulary/validate-batch', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items,
        defaultType,
        validationMode
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to validate batch.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Safely chunk-imports vocabulary items in sub-batches
   */
  async importBatch(
    items: RawVocabularyInput[],
    options?: {
      onProgress?: (current: number, total: number) => void;
      defaultType?: VocabularyContentType;
      duplicateAction?: 'skip' | 'replace';
      fileName?: string;
    },
    token?: string | null
  ): Promise<VocabularyImportBatchResult> {
    const headers = await this.getAuthHeaders(token);
    const total = items.length;
    const defaultType = options?.defaultType || 'word';
    const duplicateAction = options?.duplicateAction || 'skip';
    const fileName = options?.fileName || 'bulk_import.json';

    if (total === 0) {
      return {
        success: true,
        batchId: '',
        totalSubmitted: 0,
        importedCount: 0,
        failedCount: 0,
        duplicateCount: 0,
        validationProvider: 'manual',
        imported: [],
        failed: []
      };
    }

    const CHUNK_SIZE = 200;
    const allImported: VocabularyItem[] = [];
    const allFailed: any[] = [];
    let mainBatchId = `batch_${Date.now()}`;
    let totalDuplicates = 0;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const res = await fetch('/api/vocabulary/import-batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: chunk,
          batchId: mainBatchId,
          defaultType,
          duplicateAction,
          fileName
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to import batch chunk (${i + 1}-${i + chunk.length}).`);
      }

      const json = await res.json();
      if (json.data?.batchId) mainBatchId = json.data.batchId;
      if (Array.isArray(json.data?.imported)) allImported.push(...json.data.imported);
      if (Array.isArray(json.data?.failed)) allFailed.push(...json.data.failed);
      if (typeof json.data?.duplicateCount === 'number') totalDuplicates += json.data.duplicateCount;

      const currentProgress = Math.min(i + CHUNK_SIZE, total);
      if (options?.onProgress) {
        options.onProgress(currentProgress, total);
      }
    }

    return {
      success: true,
      batchId: mainBatchId,
      totalSubmitted: total,
      importedCount: allImported.length,
      failedCount: allFailed.length,
      duplicateCount: totalDuplicates,
      validationProvider: 'local_fallback',
      imported: allImported,
      failed: allFailed
    };
  }

  /**
   * Admin: Schedules bulk uploaded images to R2 (marked as manual validation)
   */
  async scheduleBulkImages(
    payload: {
      images: { filename: string; publicUrl: string; title?: string; meaning?: string; example?: string }[];
      contentType: VocabularyContentType;
      scheduleMode: 'immediate' | 'schedule';
      startDate?: string;
      startTime?: string;
      intervalHours?: number;
    },
    token?: string | null
  ): Promise<{ totalScheduled: number; items: VocabularyItem[] }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/vocabulary/bulk-images', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to schedule images.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Fetches the centralized publishing queue
   */
  async getPublishingQueue(token?: string | null): Promise<{
    scheduled: VocabularyPublishingQueueItem[];
    published: VocabularyPublishingQueueItem[];
    draft: VocabularyPublishingQueueItem[];
    totalScheduled: number;
    totalPublished: number;
  }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/vocabulary/queue', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch publishing queue.');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Publishes a scheduled item immediately
   */
  async publishNow(id: string, token?: string | null): Promise<VocabularyItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/vocabulary/queue/${encodeURIComponent(id)}/publish-now`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to publish item.');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Reschedules an item
   */
  async reschedule(id: string, scheduledAt: string, token?: string | null): Promise<VocabularyItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/vocabulary/queue/${encodeURIComponent(id)}/reschedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scheduled_at: scheduledAt })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reschedule item.');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Cancels a scheduled publish (moves back to draft)
   */
  async cancelSchedule(id: string, token?: string | null): Promise<VocabularyItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/vocabulary/queue/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to cancel schedule.');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Fetches Gemini configuration and connection status
   */
  async getGeminiStatus(token?: string | null): Promise<GeminiStatusInfo> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/vocabulary/gemini-status', { headers });
    if (!res.ok) {
      return {
        isConfigured: false,
        isConnected: false,
        provider: 'Gemini',
        status: 'unavailable',
        message: 'Could not connect to server status endpoint.'
      };
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Performs active server-side Gemini connection test
   */
  async testGeminiConnection(token?: string | null): Promise<GeminiStatusInfo> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/vocabulary/test-gemini', {
      method: 'POST',
      headers
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to test Gemini connection.');
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Admin: Fetches import history audit records
   */
  async getImportHistory(token?: string | null): Promise<VocabularyImportHistoryItem[]> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch('/api/vocabulary/import-history', { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch import history.');
    }
    const json = await res.json();
    return json.data || [];
  }

  /**
   * Admin: Edits an existing Vocabulary Item
   */
  async updateVocabulary(
    id: string,
    updates: Partial<VocabularyItem>,
    token?: string | null
  ): Promise<VocabularyItem> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/vocabulary/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update vocabulary item.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * Backward compatibility alias
   */
  async updateWord(
    id: string,
    updates: Partial<VocabularyItem>,
    token?: string | null
  ): Promise<VocabularyItem> {
    return this.updateVocabulary(id, updates, token);
  }

  /**
   * Admin: Deletes a Vocabulary Item
   */
  async deleteVocabulary(id: string, token?: string | null): Promise<boolean> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/vocabulary/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete vocabulary item.');
    }

    return true;
  }

  /**
   * Backward compatibility alias
   */
  async deleteWord(id: string, token?: string | null): Promise<boolean> {
    return this.deleteVocabulary(id, token);
  }

  /**
   * Student: Toggles like on an item
   */
  async toggleLike(id: string, token?: string | null): Promise<{ liked: boolean; likesCount: number }> {
    const headers = await this.getAuthHeaders(token);
    const res = await fetch(`/api/vocabulary/${encodeURIComponent(id)}/like`, {
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
    const currentSaved = this.getLocalSavedWordIds();
    const willBeSaved = !currentSaved.has(id);
    if (willBeSaved) {
      currentSaved.add(id);
    } else {
      currentSaved.delete(id);
    }
    this.setLocalSavedWordIds(currentSaved);

    try {
      const headers = await this.getAuthHeaders(token);
      if (headers['Authorization']) {
        const res = await fetch(`/api/vocabulary/${encodeURIComponent(id)}/save`, {
          method: 'POST',
          headers
        });
        if (res.ok) {
          const json = await res.json();
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[VocabularyService] Server save notice:', err);
    }

    return { saved: willBeSaved };
  }

  public getLocalSavedWordIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(SAVED_VOCABULARY_LOCAL_KEY);
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
      localStorage.setItem(SAVED_VOCABULARY_LOCAL_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {}
  }
}

export const vocabularyService = new VocabularyService();
