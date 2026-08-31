// ============================================================================
// EDTECHRA-BITZ: Client Knowledge Bitz API Service
// Handles feed fetching, pagination, user topic preferences, learning history,
// likes, saves, quiz attempts, and admin operations.
// ============================================================================

import { supabase } from '@/lib/supabase';
import {
  KnowledgeBitzItem,
  BitzFeedResponse,
  BitzUserTopicPreferences,
  BitzLearningStateResult,
  BitzBulkImportResult,
  BitzAdminStats,
  CreateKnowledgeBitzInput,
  BitzDifficulty
} from '@/types';

const API_BASE = '/api/bitz';
const ADMIN_API_BASE = '/api/admin/bitz';

export const knowledgeBitzService = {
  /**
   * Fetches personalized, ranked, and diversified Knowledge Bitz feed
   */
  async getFeed(params: {
    page?: number;
    limit?: number;
    topic?: string | null;
    difficulty?: BitzDifficulty | 'all' | null;
    search?: string;
    tab?: 'for_you' | 'trending' | 'new';
  } = {}, token?: string | null): Promise<BitzFeedResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.topic && params.topic !== 'all') query.set('topic', params.topic);
    if (params.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty);
    if (params.search) query.set('search', params.search);
    if (params.tab) query.set('tab', params.tab);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/feed?${query.toString()}`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[KnowledgeBitzService] API fetch error, checking Supabase fallback:', err);
    }

    // Direct Supabase Fallback
    if (supabase) {
      try {
        let sbQuery = supabase
          .from('knowledge_bitz')
          .select('*')
          .eq('status', 'published');

        if (params.topic && params.topic !== 'all') {
          sbQuery = sbQuery.eq('topic_id', params.topic);
        }
        if (params.difficulty && params.difficulty !== 'all') {
          sbQuery = sbQuery.eq('difficulty', params.difficulty);
        }

        const { data, error } = await sbQuery;
        if (!error && Array.isArray(data)) {
          let items = data as KnowledgeBitzItem[];
          if (params.search) {
            const q = params.search.toLowerCase();
            items = items.filter(b => 
              b.title?.toLowerCase().includes(q) ||
              b.short_fact?.toLowerCase().includes(q)
            );
          }
          const page = params.page || 1;
          const limit = params.limit || 10;
          const startIndex = (page - 1) * limit;
          const paginated = items.slice(startIndex, startIndex + limit);

          return {
            success: true,
            bitz: paginated,
            total: items.length,
            page,
            limit,
            hasMore: startIndex + limit < items.length,
            allLearnedNotice: false
          };
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase fallback error:', e);
      }
    }

    return {
      success: true,
      bitz: [],
      total: 0,
      page: 1,
      limit: 10,
      hasMore: false,
      allLearnedNotice: false
    };
  },

  /**
   * Retrieves single Knowledge Bitz by ID or Code (for shareable links)
   */
  async getBitzById(id: string, token?: string | null): Promise<KnowledgeBitzItem | null> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.bitz || null;
      }
    } catch (e) {}

    if (supabase) {
      const { data } = await supabase
        .from('knowledge_bitz')
        .select('*')
        .or(`id.eq.${id},bitz_code.eq.${id}`)
        .maybeSingle();
      return (data as KnowledgeBitzItem) || null;
    }
    return null;
  },

  /**
   * Fetches user topic preferences
   */
  async getUserPreferences(token?: string | null): Promise<BitzUserTopicPreferences> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/preferences`, { headers });
      if (res.ok) return await res.json();
    } catch (e) {}

    return {
      userId: 'guest',
      selectedTopics: [],
      isAllTopicsSelected: true,
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Saves user topic preferences
   */
  async saveUserPreferences(selectedTopics: string[], token?: string | null): Promise<{ success: boolean }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/preferences`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ selectedTopics })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    return { success: true };
  },

  /**
   * Records learning interaction: seen, opened, read, or learned
   */
  async recordInteraction(
    bitzId: string,
    status: 'seen' | 'opened' | 'read' | 'learned',
    selectedOption?: string,
    questionIndex?: number,
    token?: string | null
  ): Promise<BitzLearningStateResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/interact`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ bitzId, status, selectedOption, questionIndex })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Fallback response
    return {
      success: true,
      bitzId,
      status,
      xpAwarded: status === 'learned' ? 10 : 0,
      alreadyLearned: false
    };
  },

  /**
   * Submits Quiz Check for a Bitz (supports multi-question by questionIndex)
   */
  async submitQuizAttempt(
    bitzId: string,
    selectedOption: string,
    questionIndex?: number,
    token?: string | null
  ): Promise<BitzLearningStateResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/${bitzId}/quiz-attempt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ selectedOption, questionIndex })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    return {
      success: true,
      bitzId,
      status: 'learned',
      isCorrect: true,
      xpAwarded: 2,
      alreadyLearned: false,
      questionIndex
    };
  },

  /**
   * Toggles Like on a Bitz
   */
  async toggleLike(bitzId: string, token?: string | null): Promise<{ liked: boolean; likesCount: number }> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/${bitzId}/like`, { method: 'POST', headers });
      if (res.ok) return await res.json();
    } catch (e) {}

    return { liked: true, likesCount: 1 };
  },

  /**
   * Toggles Bookmark/Save on a Bitz
   */
  async toggleSave(bitzId: string, category?: string, token?: string | null): Promise<{ saved: boolean; savesCount: number }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/${bitzId}/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ category })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    return { saved: true, savesCount: 1 };
  },

  /**
   * Gets Saved Bitz
   */
  async getSavedBitz(token?: string | null): Promise<KnowledgeBitzItem[]> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/saved`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.bitz || [];
      }
    } catch (e) {}

    return [];
  },

  // --------------------------------------------------------------------------
  // ADMIN API CALLS
  // --------------------------------------------------------------------------
  async getAdminBitz(filters: {
    search?: string;
    topic?: string;
    category?: string;
    subtopic?: string;
    status?: string;
    visualStatus?: string;
    cefrLevel?: string;
    page?: number;
    limit?: number;
  } = {}, token?: string | null): Promise<{
    success: boolean;
    bitz: KnowledgeBitzItem[];
    stats: BitzAdminStats;
    total: number;
  }> {
    const query = new URLSearchParams();
    if (filters.search) query.set('search', filters.search);
    if (filters.topic) query.set('topic', filters.topic);
    if (filters.category && filters.category !== 'all') query.set('category', filters.category);
    if (filters.subtopic && filters.subtopic !== 'all') query.set('subtopic', filters.subtopic);
    if (filters.status) query.set('status', filters.status);
    if (filters.visualStatus) query.set('visualStatus', filters.visualStatus);
    if (filters.cefrLevel && filters.cefrLevel !== 'all') query.set('cefrLevel', filters.cefrLevel);
    if (filters.page) query.set('page', String(filters.page));
    if (filters.limit) query.set('limit', String(filters.limit));

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}?${query.toString()}`, { headers });
    if (!res.ok) {
      let serverErrorMsg = 'Failed to load admin Knowledge Bitz catalogue.';
      try {
        const errJson = await res.json();
        if (errJson?.error) serverErrorMsg = errJson.error;
      } catch (e) {}
      throw new Error(serverErrorMsg);
    }
    return await res.json();
  },

  async createBitz(input: CreateKnowledgeBitzInput, token?: string | null): Promise<KnowledgeBitzItem> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(ADMIN_API_BASE, {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to create Knowledge Bitz.');
    return json.bitz;
  },

  async updateBitz(id: string, updates: Partial<KnowledgeBitzItem>, token?: string | null): Promise<KnowledgeBitzItem> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update Knowledge Bitz.');
    return json.bitz;
  },

  async deleteBitz(id: string, token?: string | null): Promise<boolean> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/${id}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error('Failed to delete Knowledge Bitz.');
    return true;
  },

  async bulkImport(items: any[], token?: string | null, cefrLevel?: string): Promise<BitzBulkImportResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/bulk-import`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, cefrLevel })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to bulk import facts.');
    return json;
  },

  async generateGeminiImage(bitzId: string, customPrompt?: string, token?: string | null): Promise<{
    success: boolean;
    publicUrl: string;
    objectKey?: string;
    prompt?: string;
    model?: string;
    isLocalPreview?: boolean;
    error?: string;
  }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/${bitzId}/generate-image`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ customPrompt })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Gemini AI image generation failed.');
    return json;
  },

  async getPresignedUpload(bitzId: string, contentType = 'image/webp', token?: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/presign-upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bitzId, contentType })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to get upload URL.');
    return json;
  }
};
