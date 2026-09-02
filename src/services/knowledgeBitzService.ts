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
  BitzDifficulty,
  BitzQuizCompletionPayload,
  BitzQuizCompletionResult
} from '@/types';

const API_BASE = '/api/bitz';
const ADMIN_API_BASE = '/api/admin/bitz';

const CANONICAL_CATEGORIES = [
  { id: 'science_nature', name: 'Science & Nature' },
  { id: 'people_psychology', name: 'People & Psychology' },
  { id: 'history_culture', name: 'History & Culture' },
  { id: 'technology_ai', name: 'Technology & AI' },
  { id: 'business_economics', name: 'Business & Economics' },
  { id: 'health_body', name: 'Health & Human Body' },
  { id: 'world_geography', name: 'World & Geography' },
  { id: 'arts_entertainment', name: 'Arts, Books & Entertainment' },
  { id: 'sports_games', name: 'Sports & Games' },
  { id: 'life_skills_english', name: 'Life Skills & English' },
  { id: 'personal_growth', name: 'Personal Growth' },
  { id: 'mysteries_legends', name: 'Mysteries & Legends' }
];

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
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        const { data, error } = await sbQuery;
        if (!error && Array.isArray(data)) {
          let items = data as KnowledgeBitzItem[];

          // Flexible topic/category matching
          if (params.topic && params.topic !== 'all') {
            const t = params.topic.toLowerCase().trim();
            const norm = (s: string) => s.replace(/[^a-z0-9]/g, '');
            const tN = norm(t);
            items = items.filter(b => {
              const bCat = (b.category || '').toLowerCase().trim();
              const bTopic = (b.topic_id || '').toLowerCase().trim();
              const bSub = (b.sub_topic || '').toLowerCase().trim();
              if (bCat === t || bTopic === t || bSub === t) return true;
              const bCatN = norm(bCat);
              const bTopicN = norm(bTopic);
              const bSubN = norm(bSub);
              return bCatN === tN || bTopicN === tN || bSubN === tN || bCatN.includes(tN) || tN.includes(bCatN);
            });
          }

          if (params.difficulty && params.difficulty !== 'all') {
            items = items.filter(b => (b.difficulty || '').toLowerCase() === params.difficulty?.toLowerCase());
          }

          if (params.search) {
            const q = params.search.toLowerCase();
            items = items.filter(b => 
              b.title?.toLowerCase().includes(q) ||
              b.short_fact?.toLowerCase().includes(q) ||
              b.reading_text?.toLowerCase().includes(q) ||
              b.category?.toLowerCase().includes(q)
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
   * Submits final quiz score and authoritative mastery persistence
   */
  async submitQuizCompletion(
    bitzId: string,
    payload: BitzQuizCompletionPayload,
    token?: string | null
  ): Promise<BitzQuizCompletionResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/${bitzId}/quiz-complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn('[KnowledgeBitzService] API quiz-complete error, checking Supabase fallback:', e);
    }

    // Direct Supabase RPC Fallback
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase.rpc('record_bitz_quiz_completion', {
            p_bitz_id: bitzId,
            p_correct_answers: payload.correctAnswers,
            p_total_questions: payload.totalQuestions || 5,
            p_quiz_answers: payload.quizAnswers || {},
            p_user_id: user.id
          });
          if (!error && data) return data as BitzQuizCompletionResult;
        }
      } catch (sbErr) {
        console.warn('[KnowledgeBitzService] Direct Supabase RPC quiz-complete notice:', sbErr);
      }
    }

    return {
      success: true,
      bitzId,
      score: payload.score,
      correctAnswers: payload.correctAnswers,
      totalQuestions: payload.totalQuestions || 5,
      xpEarned: payload.xpEarned,
      xpAwardedNow: payload.xpEarned,
      mastered: payload.mastered,
      completed: true
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

  /**
   * Retrieves comprehensive Knowledge Bitz user dashboard stats (mastery, category progress, XP, continue learning)
   */
  async getUserDashboardStats(token?: string | null): Promise<{
    success: boolean;
    totalBitzXp: number;
    masteredCount: number;
    totalPublishedBitz: number;
    completedCount: number;
    savedCount: number;
    categoryProgress: {
      id: string;
      name: string;
      masteredCount: number;
      totalCount: number;
      percentage: number;
    }[];
    recentlyMastered: KnowledgeBitzItem[];
    continueLearning: KnowledgeBitzItem | null;
  }> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // 1. Try backend endpoint
    try {
      const res = await fetch(`${API_BASE}/user-stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          return data;
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBitzService] Error fetching user dashboard stats from API, using Supabase fallback:', e);
    }

    // 2. Direct Supabase Query Fallback
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        // Fetch published bitz
        const { data: bitzData } = await supabase
          .from('knowledge_bitz')
          .select('id,bitz_code,title,short_fact,reading_text,category,sub_topic,difficulty,cefr_level,visual_url,status,created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        const publishedBitz: KnowledgeBitzItem[] = (bitzData as any as KnowledgeBitzItem[]) || [];
        const publishedIdSet = new Set(publishedBitz.map(b => b.id));

        let progressRows: any[] = [];
        if (userId) {
          const { data: kbpData } = await supabase
            .from('knowledge_bitz_progress')
            .select('bitz_id,attempts,correct_answers,score,xp_earned,completed,mastered,quiz_answers,completed_at,mastered_at,updated_at')
            .eq('user_id', userId);

          if (Array.isArray(kbpData) && kbpData.length > 0) {
            progressRows = kbpData;
          } else {
            const { data: blhData } = await supabase
              .from('bitz_learning_history')
              .select('bitz_id,status,quiz_attempted,quiz_correct,quiz_answers,xp_awarded,learned_at,last_interaction_at,updated_at')
              .eq('user_id', userId);
            if (Array.isArray(blhData)) progressRows = blhData;
          }
        }

        const masteredBitzIds = new Set<string>();
        const completedBitzIds = new Set<string>();
        let totalBitzXp = 0;

        progressRows.forEach((row: any) => {
          const bId = row.bitz_id;
          totalBitzXp += (row.xp_earned || row.xp_awarded || 0);

          let isMastered = row.mastered === true;
          if (!isMastered && (row.status === 'learned' || (row.correct_answers !== undefined && row.correct_answers >= 3) || (row.score !== undefined && row.score >= 3))) {
            isMastered = true;
          }
          if (!isMastered && row.quiz_answers && typeof row.quiz_answers === 'object') {
            const correctCount = Object.values(row.quiz_answers).filter(Boolean).length;
            if (correctCount >= 3) isMastered = true;
          }

          if (isMastered && publishedIdSet.has(bId)) {
            masteredBitzIds.add(bId);
          }
          if ((row.completed === true || row.status === 'read' || row.status === 'learned') && publishedIdSet.has(bId)) {
            completedBitzIds.add(bId);
          }
        });

        // 12 Canonical Categories Progress
        const norm = (str: string) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const categoryProgress = CANONICAL_CATEGORIES.map(cat => {
          const catNorm = norm(cat.name);
          const catIdNorm = norm(cat.id);

          const catBitz = publishedBitz.filter(b => {
            const cN = norm(b.category || '');
            const tN = norm(b.topic_id || '');
            return cN === catNorm || cN === catIdNorm || tN === catNorm || tN === catIdNorm;
          });

          const totalCount = catBitz.length;
          const masteredCount = catBitz.filter(b => masteredBitzIds.has(b.id)).length;
          const percentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

          return {
            id: cat.id,
            name: cat.name,
            masteredCount,
            totalCount,
            percentage
          };
        });

        // Recently Mastered
        const recentlyMastered: KnowledgeBitzItem[] = [];
        const sortedLearnedRows = [...progressRows]
          .filter(r => masteredBitzIds.has(r.bitz_id))
          .sort((a, b) => new Date(b.mastered_at || b.learned_at || b.updated_at || 0).getTime() - new Date(a.mastered_at || a.learned_at || a.updated_at || 0).getTime());

        sortedLearnedRows.slice(0, 5).forEach(row => {
          const bitz = publishedBitz.find(b => b.id === row.bitz_id);
          if (bitz) {
            recentlyMastered.push({
              ...bitz,
              learned_at: row.mastered_at || row.learned_at || row.updated_at
            });
          }
        });

        // Continue Learning
        let continueLearning: KnowledgeBitzItem | null = null;
        const inProgressRow = progressRows.find(r => !masteredBitzIds.has(r.bitz_id) && (r.status === 'opened' || r.status === 'read' || r.attempts > 0 || r.quiz_attempted));
        if (inProgressRow) {
          continueLearning = publishedBitz.find(b => b.id === inProgressRow.bitz_id) || null;
        } else {
          continueLearning = publishedBitz.find(b => !masteredBitzIds.has(b.id)) || null;
        }

        return {
          success: true,
          totalBitzXp,
          masteredCount: masteredBitzIds.size,
          totalPublishedBitz: publishedBitz.length,
          completedCount: completedBitzIds.size,
          savedCount: 0,
          categoryProgress,
          recentlyMastered,
          continueLearning
        };
      } catch (err) {
        console.warn('[KnowledgeBitzService] Direct Supabase dashboard stats fallback error:', err);
      }
    }

    return {
      success: true,
      totalBitzXp: 0,
      masteredCount: 0,
      totalPublishedBitz: 0,
      completedCount: 0,
      savedCount: 0,
      categoryProgress: CANONICAL_CATEGORIES.map(c => ({ id: c.id, name: c.name, masteredCount: 0, totalCount: 0, percentage: 0 })),
      recentlyMastered: [],
      continueLearning: null
    };
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

  /**
   * Fetches ALL Knowledge Bitz records in the database catalogue for export.
   * Paginates through all pages in batches to retrieve 100% of facts.
   */
  async getAllAdminBitz(token?: string | null): Promise<KnowledgeBitzItem[]> {
    const allBitz: KnowledgeBitzItem[] = [];
    let currentPage = 1;
    const limit = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const res = await this.getAdminBitz(
          {
            page: currentPage,
            limit,
            status: 'all',
            visualStatus: 'all',
            category: 'all',
            subtopic: 'all',
            cefrLevel: 'all',
            search: ''
          },
          token
        );

        if (res.success && Array.isArray(res.bitz)) {
          allBitz.push(...res.bitz);
          if (allBitz.length >= res.total || res.bitz.length < limit || res.bitz.length === 0) {
            hasMore = false;
          } else {
            currentPage += 1;
          }
        } else {
          hasMore = false;
        }
      }
    } catch (err) {
      console.warn('[KnowledgeBitzService] Admin API getAllAdminBitz fallback:', err);
      // Supabase direct fallback if API is unreachable
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('knowledge_bitz')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && Array.isArray(data)) {
            return data.map((b: any) => ({
              ...b,
              image_url: b.visual_url || b.image_url || null,
              visual_url: b.visual_url || b.image_url || null,
              image_source: b.image_source || (b.visual_url ? 'custom' : 'none')
            }));
          }
        } catch (e) {}
      }
      throw err;
    }

    return allBitz;
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
  },

  async searchPixabayImages(query: string, category?: string, perPage = 5, token?: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/images/pixabay-search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, category, per_page: perPage })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Pixabay search failed.');
    return json;
  },

  async fetchPixabayImageForBitz(bitzId: string, query?: string, token?: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/${bitzId}/fetch-pixabay`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch Pixabay image.');
    return json;
  },

  async removeBitzImage(bitzId: string, token?: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/${bitzId}/remove-image`, {
      method: 'POST',
      headers
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to remove image.');
    return json;
  },

  async testPixabayIntegration(query = 'science nature', token?: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/pixabay/test', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });
    return await res.json();
  },

  async autoImageBackfill(token?: string | null) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ADMIN_API_BASE}/auto-image-backfill`, {
      method: 'POST',
      headers
    });
    return await res.json();
  },

  async getMissingImagesQueue(limit = 100, token?: string | null): Promise<{ success: boolean; bitz: KnowledgeBitzItem[]; totalMissing: number }> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${ADMIN_API_BASE}/missing-images?limit=${limit}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json;
      }
    } catch (e) {
      console.warn('[KnowledgeBitzService] Missing images queue fetch notice:', e);
    }

    // Direct Supabase fallback
    if (supabase) {
      try {
        const { data, count, error } = await supabase
          .from('knowledge_bitz')
          .select('*', { count: 'exact' })
          .or('visual_url.is.null,visual_url.eq.""')
          .order('created_at', { ascending: true })
          .limit(limit);

        if (!error && Array.isArray(data)) {
          return {
            success: true,
            bitz: data as KnowledgeBitzItem[],
            totalMissing: count ?? data.length
          };
        }
      } catch (dbErr) {
        console.warn('[KnowledgeBitzService] Fallback db query error:', dbErr);
      }
    }

    return { success: true, bitz: [], totalMissing: 0 };
  },

  async uploadBitzManualImage(
    bitzId: string,
    imageSource: File | Blob | string,
    token?: string | null
  ): Promise<{ success: boolean; bitz: KnowledgeBitzItem; publicUrl: string }> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let body: BodyInit;

    if (typeof imageSource === 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ imageData: imageSource });
    } else {
      headers['Content-Type'] = imageSource.type || 'application/octet-stream';
      body = imageSource;
    }

    const res = await fetch(`${ADMIN_API_BASE}/${bitzId}/upload-image`, {
      method: 'POST',
      headers,
      body
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to upload and save image.');
    }
    return json;
  }
};


