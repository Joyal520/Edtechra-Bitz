// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Server Service
// Complete implementation of Feed Discovery, Personalization, Diversity,
// Learning History, Gemini Image Generation, and R2 Storage.
// ============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { putBinaryContent, sanitizeSegment } from './r2Service.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const BITZ_CACHE_FILE = path.join(DATA_DIR, 'knowledge_bitz_cache.json');
const PREFS_CACHE_FILE = path.join(DATA_DIR, 'user_topic_prefs_cache.json');
const BOOKMARKS_CACHE_FILE = path.join(DATA_DIR, 'bitz_bookmarks_cache.json');
const LIKES_CACHE_FILE = path.join(DATA_DIR, 'bitz_likes_cache.json');
const HISTORY_CACHE_FILE = path.join(DATA_DIR, 'bitz_history_cache.json');

// Ensure data directory exists (safely catch on read-only serverless filesystems)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem (e.g. Vercel serverless environment)
}

// Production clean initialization: No mock/demo facts. Supabase is source of truth.
const INITIAL_SEED_BITZ = [];

// In-memory memory store for serverless/read-only filesystems
const inMemoryStore = new Map();

// Helper: Read JSON cache
function readJson(file, defaultData = []) {
  if (inMemoryStore.has(file)) {
    return inMemoryStore.get(file);
  }
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(data);
      inMemoryStore.set(file, parsed);
      return parsed;
    }
  } catch (e) {
    console.warn(`[KnowledgeBitzService] Error reading ${file}:`, e.message);
  }
  return defaultData;
}

// Helper: Write JSON cache
function writeJson(file, data) {
  inMemoryStore.set(file, data);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // Expected on read-only environments like Vercel serverless
  }
}

// Initialize clean empty cache if not exists
try {
  if (!fs.existsSync(BITZ_CACHE_FILE)) {
    writeJson(BITZ_CACHE_FILE, []);
  }
} catch (e) {
  inMemoryStore.set(BITZ_CACHE_FILE, []);
}

class KnowledgeBitzService {
  /**
   * Retrieves all local Bitz from cache
   */
  getLocalBitz() {
    const items = readJson(BITZ_CACHE_FILE, []);
    return Array.isArray(items) ? items : [];
  }

  saveLocalBitz(items) {
    writeJson(BITZ_CACHE_FILE, items);
  }

  // --------------------------------------------------------------------------
  // USER TOPIC PREFERENCES
  // --------------------------------------------------------------------------
  async getUserPreferences(userId, supabaseClient = null) {
    if (!userId || userId === 'guest') {
      return { userId: 'guest', selectedTopics: [], isAllTopicsSelected: true, updatedAt: new Date().toISOString() };
    }

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('user_topic_preferences')
          .select('topic_id')
          .eq('user_id', userId);

        if (!error && data) {
          const selectedTopics = data.map(d => d.topic_id);
          const isAll = selectedTopics.length === 0;
          return {
            userId,
            selectedTopics,
            allSelected: isAll,
            isAllTopicsSelected: isAll,
            updatedAt: new Date().toISOString()
          };
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase get preferences notice:', e.message);
      }
    }

    // Local JSON cache fallback
    const allPrefs = readJson(PREFS_CACHE_FILE, {});
    const userPref = allPrefs[userId];
    if (userPref && Array.isArray(userPref.selectedTopics)) {
      const isAll = userPref.allSelected !== undefined ? userPref.allSelected : userPref.selectedTopics.length === 0;
      return {
        userId,
        selectedTopics: userPref.selectedTopics,
        allSelected: isAll,
        isAllTopicsSelected: isAll,
        updatedAt: userPref.updatedAt || new Date().toISOString()
      };
    }

    return { userId, selectedTopics: [], allSelected: true, isAllTopicsSelected: true, updatedAt: new Date().toISOString() };
  }

  async saveUserPreferences(userId, selectedTopics = [], allSelected = false, supabaseClient = null) {
    if (!userId || userId === 'guest') return { success: true, selectedTopics: [], allSelected: true };

    const cleanTopics = Array.isArray(selectedTopics) ? Array.from(new Set(selectedTopics.filter(Boolean))) : [];
    const isAll = allSelected === true || cleanTopics.length === 0;

    if (supabaseClient) {
      try {
        await supabaseClient.from('user_topic_preferences').delete().eq('user_id', userId);
        if (cleanTopics.length > 0) {
          const rows = cleanTopics.map(topic_id => ({ user_id: userId, topic_id }));
          await supabaseClient.from('user_topic_preferences').insert(rows);
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase save preferences notice:', e.message);
      }
    }

    // Save to local cache
    const allPrefs = readJson(PREFS_CACHE_FILE, {});
    allPrefs[userId] = {
      userId,
      selectedTopics: cleanTopics,
      allSelected: isAll,
      isAllTopicsSelected: isAll,
      updatedAt: new Date().toISOString()
    };
    writeJson(PREFS_CACHE_FILE, allPrefs);

    return { success: true, selectedTopics: cleanTopics, allSelected: isAll, isAllTopicsSelected: isAll };
  }

  // --------------------------------------------------------------------------
  // USER LEARNING HISTORY (SEEN, OPENED, READ, LEARNED)
  // --------------------------------------------------------------------------
  getUserLearnedBitzIds(userId) {
    if (!userId || userId === 'guest') return new Set();
    const history = readJson(HISTORY_CACHE_FILE, {});
    const userHistory = history[userId] || {};
    const learnedIds = new Set();

    Object.entries(userHistory).forEach(([bitzId, entry]) => {
      if (entry && (entry.status === 'learned' || entry.hasLearned)) {
        learnedIds.add(bitzId);
      }
    });

    return learnedIds;
  }

  getUserHistoryMap(userId) {
    if (!userId || userId === 'guest') return {};
    const history = readJson(HISTORY_CACHE_FILE, {});
    return history[userId] || {};
  }

  async recordLearningState({ userId, bitzId, status, selectedOption = null, questionIndex = null, supabaseClient = null }) {
    if (!bitzId) throw new Error('bitzId is required');

    let isCorrect = null;
    let xpAwarded = 0;
    let alreadyLearned = false;
    let explanation = undefined;

    // 1. Try Supabase RPC if available
    if (supabaseClient && userId && userId !== 'guest') {
      try {
        const rpcParams = {
          p_bitz_id: bitzId,
          p_new_status: status,
          p_selected_quiz_option: selectedOption
        };
        if (questionIndex !== null && questionIndex !== undefined) {
          rpcParams.p_question_index = parseInt(questionIndex, 10);
        }

        const { data, error } = await supabaseClient.rpc('record_bitz_learning_state', rpcParams);

        if (!error && data && data.success) {
          // Sync to local cache
          this.syncLocalHistory(userId, bitzId, data.status, data.xpAwarded);
          return data;
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase RPC record learning notice:', e.message);
      }
    }

    // 2. Evaluation
    const bitz = await this.getBitzById(bitzId, supabaseClient);
    if (!bitz) throw new Error('Knowledge Bitz not found');

    const history = readJson(HISTORY_CACHE_FILE, {});
    let totalAnswered = 0;

    if (userId) {
      if (!history[userId]) history[userId] = {};
      const userEntry = history[userId][bitz.id] || {};
      alreadyLearned = Boolean(userEntry.status === 'learned');
      const quizAnswers = userEntry.quiz_answers || {};

      const isQuizArray = Array.isArray(bitz.quiz);
      const qIdx = questionIndex !== null && questionIndex !== undefined ? parseInt(questionIndex, 10) : null;

      if (selectedOption && bitz.quiz) {
        if (isQuizArray && qIdx !== null && bitz.quiz[qIdx]) {
          const qObj = bitz.quiz[qIdx];
          const correctAns = qObj.correct_answer || qObj.correctAnswer;
          explanation = qObj.explanation;
          isCorrect = selectedOption.trim().toLowerCase() === String(correctAns).trim().toLowerCase();

          // If not previously answered this specific question
          if (!quizAnswers[String(qIdx)]) {
            quizAnswers[String(qIdx)] = isCorrect;
            if (isCorrect && !alreadyLearned) {
              xpAwarded = 2; // 2 XP per correct answer
            }
          }

          totalAnswered = Object.keys(quizAnswers).length;
          if (totalAnswered >= bitz.quiz.length && !alreadyLearned) {
            status = 'learned';
          }
        } else {
          // Legacy single quiz
          const quizObj = isQuizArray ? bitz.quiz[0] : bitz.quiz;
          const correctAns = quizObj?.correct_answer || quizObj?.correctAnswer;
          explanation = quizObj?.explanation;
          isCorrect = selectedOption.trim().toLowerCase() === String(correctAns).trim().toLowerCase();
          if (isCorrect && !alreadyLearned) {
            xpAwarded = bitz.xp_value || 10;
            status = 'learned';
          }
        }
      } else if (status === 'learned' && !alreadyLearned) {
        xpAwarded = bitz.xp_value || 10;
      }

      history[userId][bitz.id] = {
        bitzId: bitz.id,
        status: alreadyLearned ? 'learned' : status,
        first_seen_at: userEntry.first_seen_at || new Date().toISOString(),
        opened_at: status === 'opened' || status === 'read' || status === 'learned' ? (userEntry.opened_at || new Date().toISOString()) : userEntry.opened_at,
        read_at: status === 'read' || status === 'learned' ? (userEntry.read_at || new Date().toISOString()) : userEntry.read_at,
        learned_at: status === 'learned' ? (userEntry.learned_at || new Date().toISOString()) : userEntry.learned_at,
        quiz_answers: quizAnswers,
        xp_awarded: (userEntry.xp_awarded || 0) + xpAwarded,
        updated_at: new Date().toISOString()
      };

      writeJson(HISTORY_CACHE_FILE, history);
    }

    if (xpAwarded > 0 && status === 'learned' && !alreadyLearned) {
      bitz.completions_count = (bitz.completions_count || 0) + 1;
      const allBitz = this.getLocalBitz();
      const localIdx = allBitz.findIndex(b => b.id === bitz.id);
      if (localIdx >= 0) {
        allBitz[localIdx] = bitz;
        this.saveLocalBitz(allBitz);
      }
      if (supabaseClient) {
        try {
          await supabaseClient.from('knowledge_bitz').update({ completions_count: bitz.completions_count }).eq('id', bitz.id);
        } catch (e) {}
      }
    }

    return {
      success: true,
      bitzId: bitz.id,
      status: alreadyLearned ? 'learned' : status,
      isCorrect,
      xpAwarded,
      alreadyLearned,
      questionIndex,
      totalQuestionsAnswered: totalAnswered,
      explanation
    };
  }

  syncLocalHistory(userId, bitzId, status, xpAwarded = 0) {
    if (!userId || userId === 'guest') return;
    const history = readJson(HISTORY_CACHE_FILE, {});
    if (!history[userId]) history[userId] = {};
    const existing = history[userId][bitzId] || {};
    history[userId][bitzId] = {
      ...existing,
      bitzId,
      status,
      xp_awarded: (existing.xp_awarded || 0) + xpAwarded,
      updated_at: new Date().toISOString()
    };
    writeJson(HISTORY_CACHE_FILE, history);
  }

  async getFeed(params = {}, supabaseClient = null, explicitUserId = null) {
    return this.getPersonalizedFeed({
      ...params,
      userId: explicitUserId || params.userId || 'guest',
      supabaseClient
    });
  }

  async getUserTopicPreferences(userId, supabaseClient = null) {
    return this.getUserPreferences(userId, supabaseClient);
  }

  async saveUserTopicPreferences(userId, selectedTopics, allSelected = false, supabaseClient = null) {
    return this.saveUserPreferences(userId, selectedTopics, allSelected, supabaseClient);
  }

  // --------------------------------------------------------------------------
  // PERSONALIZED EXPLORE FEED (SERVER-SIDE FILTERING, DIVERSITY, PAGINATION)
  // --------------------------------------------------------------------------
  async getPersonalizedFeed({
    userId = 'guest',
    page = 1,
    limit = 10,
    topic = null,
    difficulty = null,
    search = '',
    tab = 'for_you',
    supabaseClient = null
  }) {
    // 1. Get user preferences and learned IDs from Supabase
    const userPref = await this.getUserPreferences(userId, supabaseClient);
    
    let learnedIds = new Set();
    if (supabaseClient && userId && userId !== 'guest') {
      try {
        const { data: learnedRows } = await supabaseClient
          .from('bitz_learning_history')
          .select('bitz_id')
          .eq('user_id', userId)
          .eq('status', 'learned');

        if (Array.isArray(learnedRows)) {
          learnedRows.forEach(r => {
            if (r.bitz_id) learnedIds.add(r.bitz_id);
          });
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase learned history fetch notice:', e.message);
      }
    }
    
    // Also include local cache history for guest/local mode
    const localLearned = this.getUserLearnedBitzIds(userId);
    localLearned.forEach(id => learnedIds.add(id));

    const userHistory = this.getUserHistoryMap(userId);
    const likesMap = readJson(LIKES_CACHE_FILE, {});
    const bookmarksMap = readJson(BOOKMARKS_CACHE_FILE, {});
    const userLikes = new Set(likesMap[userId] || []);
    const userBookmarks = new Set(bookmarksMap[userId] || []);

    let pool = [];

    // 2. Fetch candidate Bitz (Supabase or Local)
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('knowledge_bitz')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          pool = data;
        } else if (error) {
          console.error('[KnowledgeBitzService] Supabase get feed query error:', error);
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase get feed notice:', e.message);
      }
    } else {
      // Local fallback ONLY when supabaseClient is completely absent
      pool = this.getLocalBitz().filter(b => b.status === 'published');
    }

    // 3. Robust Topic & Category Matching Helper
    const matchesTopicOrCategory = (b, targetTopic) => {
      if (!targetTopic || targetTopic === 'all') return true;
      const t = targetTopic.toLowerCase().trim();
      const bCat = (b.category || '').toLowerCase().trim();
      const bTopic = (b.topic_id || '').toLowerCase().trim();
      const bSub = (b.sub_topic || '').toLowerCase().trim();

      if (bCat === t || bTopic === t || bSub === t) return true;

      // Normalized comparison (remove punctuation, spaces, underscores, ampersands)
      const norm = (str) => str.replace(/[^a-z0-9]/g, '');
      const tN = norm(t);
      const bCatN = norm(bCat);
      const bTopicN = norm(bTopic);
      const bSubN = norm(bSub);

      if (bCatN === tN || bTopicN === tN || bSubN === tN) return true;
      if (bCatN.includes(tN) || tN.includes(bCatN)) return true;
      if (bTopicN.includes(tN) || tN.includes(bTopicN)) return true;

      return false;
    };

    // Filter by Topic Rail Selection
    if (topic && topic !== 'all') {
      pool = pool.filter(b => matchesTopicOrCategory(b, topic));
    } else if (!userPref.isAllTopicsSelected && Array.isArray(userPref.selectedTopics) && userPref.selectedTopics.length > 0) {
      pool = pool.filter(b => userPref.selectedTopics.some(sel => matchesTopicOrCategory(b, sel)));
    }

    // Filter by Difficulty
    if (difficulty && difficulty !== 'all') {
      pool = pool.filter(b => (b.difficulty || '').toLowerCase() === difficulty.toLowerCase());
    }

    // 4. Search Filter
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      pool = pool.filter(b => 
        (b.title || '').toLowerCase().includes(q) ||
        (b.short_fact || '').toLowerCase().includes(q) ||
        (b.reading_text || '').toLowerCase().includes(q) ||
        (b.category || '').toLowerCase().includes(q) ||
        (b.sub_topic || '').toLowerCase().includes(q) ||
        (b.topic_id || '').toLowerCase().includes(q)
      );
    }

    // 5. CRITICAL PRODUCT RULE: NEVER SHOW LEARNED FACTS AGAIN FOR THIS USER
    const unlearnedPool = pool.filter(b => !learnedIds.has(b.id) && !learnedIds.has(b.bitz_code));
    const allLearnedNotice = unlearnedPool.length === 0 && pool.length > 0;

    // 6. Score & Rank Unlearned Candidates
    const scoredPool = unlearnedPool.map(b => {
      let score = 0;
      const ageHours = (Date.now() - new Date(b.created_at || Date.now()).getTime()) / 3600000;
      score += Math.max(0, 40 - ageHours * 0.5);

      const pop = (Number(b.likes_count) || 0) * 1.5 + (Number(b.saves_count) || 0) * 2.5;
      score += Math.min(30, pop);

      const hist = userHistory[b.id];
      if (!hist) {
        score += 25;
      } else if (hist.status === 'seen') {
        score += 15;
      } else if (hist.status === 'opened') {
        score += 10;
      }

      if (tab === 'trending') {
        score = pop * 2 + Math.max(0, 30 - ageHours);
      } else if (tab === 'new') {
        score = Math.max(0, 100 - ageHours);
      }

      return {
        ...b,
        _score: score,
        is_liked_by_me: userLikes.has(b.id),
        is_saved_by_me: userBookmarks.has(b.id),
        learning_status: hist?.status || 'unseen',
        has_learned: false
      };
    });

    scoredPool.sort((a, b) => b._score - a._score);

    // 7. Topic Diversity Interleaving (Prevent Science -> Science -> Science clustering)
    const diversePool = this.applyTopicDiversity(scoredPool);

    // 8. Paginate
    const startIndex = (page - 1) * limit;
    const paginatedItems = diversePool.slice(startIndex, startIndex + limit);
    const total = diversePool.length;
    const hasMore = startIndex + limit < total;

    return {
      success: true,
      bitz: paginatedItems,
      total,
      page,
      limit,
      hasMore,
      allLearnedNotice,
      selectedTopicsCount: userPref.selectedTopics.length
    };
  }

  /**
   * Anti-clustering algorithm: ensures consecutive items do not share the exact same topic_id
   */
  applyTopicDiversity(items) {
    if (items.length <= 2) return items;

    const result = [];
    const pool = [...items];
    let lastTopic = null;

    while (pool.length > 0) {
      // Find top scoring item with a different topic
      let matchIdx = pool.findIndex(item => item.topic_id !== lastTopic);
      if (matchIdx === -1) {
        matchIdx = 0; // Fallback if all remaining items have same topic
      }
      const [selected] = pool.splice(matchIdx, 1);
      result.push(selected);
      lastTopic = selected.topic_id;
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // LIKES & SAVES / BOOKMARKS
  // --------------------------------------------------------------------------
  async toggleLike(userId, bitzId, supabaseClient = null) {
    if (!bitzId) throw new Error('bitzId is required');

    const bitz = await this.getBitzById(bitzId, supabaseClient);
    if (!bitz) throw new Error('Knowledge Bitz not found');

    const allBitz = this.getLocalBitz();
    const likesMap = readJson(LIKES_CACHE_FILE, {});
    if (!likesMap[userId]) likesMap[userId] = [];
    const userLikes = new Set(likesMap[userId]);
    const nextLiked = !userLikes.has(bitz.id);

    if (nextLiked) {
      userLikes.add(bitz.id);
      bitz.likes_count = (bitz.likes_count || 0) + 1;
    } else {
      userLikes.delete(bitz.id);
      bitz.likes_count = Math.max(0, (bitz.likes_count || 0) - 1);
    }

    likesMap[userId] = Array.from(userLikes);
    writeJson(LIKES_CACHE_FILE, likesMap);

    const localIdx = allBitz.findIndex(b => b.id === bitz.id);
    if (localIdx >= 0) {
      allBitz[localIdx] = bitz;
      this.saveLocalBitz(allBitz);
    }

    if (supabaseClient && userId && userId !== 'guest') {
      try {
        if (nextLiked) {
          await supabaseClient.from('bitz_likes').insert({ user_id: userId, bitz_id: bitz.id });
          await supabaseClient.from('knowledge_bitz').update({ likes_count: bitz.likes_count }).eq('id', bitz.id);
        } else {
          await supabaseClient.from('bitz_likes').delete().eq('user_id', userId).eq('bitz_id', bitz.id);
          await supabaseClient.from('knowledge_bitz').update({ likes_count: bitz.likes_count }).eq('id', bitz.id);
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase toggle like notice:', e.message);
      }
    }

    return { liked: nextLiked, likesCount: bitz.likes_count };
  }

  async toggleSave(userId, bitzId, category = 'General', supabaseClient = null) {
    if (!bitzId) throw new Error('bitzId is required');

    const bitz = await this.getBitzById(bitzId, supabaseClient);
    if (!bitz) throw new Error('Knowledge Bitz not found');

    const allBitz = this.getLocalBitz();
    const bookmarksMap = readJson(BOOKMARKS_CACHE_FILE, {});
    if (!bookmarksMap[userId]) bookmarksMap[userId] = [];
    const userBookmarks = new Set(bookmarksMap[userId]);
    const nextSaved = !userBookmarks.has(bitz.id);

    if (nextSaved) {
      userBookmarks.add(bitz.id);
      bitz.saves_count = (bitz.saves_count || 0) + 1;
    } else {
      userBookmarks.delete(bitz.id);
      bitz.saves_count = Math.max(0, (bitz.saves_count || 0) - 1);
    }

    bookmarksMap[userId] = Array.from(userBookmarks);
    writeJson(BOOKMARKS_CACHE_FILE, bookmarksMap);

    const localIdx = allBitz.findIndex(b => b.id === bitz.id);
    if (localIdx >= 0) {
      allBitz[localIdx] = bitz;
      this.saveLocalBitz(allBitz);
    }

    if (supabaseClient && userId && userId !== 'guest') {
      try {
        if (nextSaved) {
          await supabaseClient.from('user_bookmarks').insert({
            user_id: userId,
            item_id: bitz.id,
            item_type: 'bitz',
            category: bitz.category || category
          });
          await supabaseClient.from('knowledge_bitz').update({ saves_count: bitz.saves_count }).eq('id', bitz.id);
        } else {
          await supabaseClient.from('user_bookmarks').delete().eq('user_id', userId).eq('item_id', bitz.id);
          await supabaseClient.from('knowledge_bitz').update({ saves_count: bitz.saves_count }).eq('id', bitz.id);
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase toggle save notice:', e.message);
      }
    }

    return { saved: nextSaved, savesCount: bitz.saves_count };
  }

  async getSavedBitz(userId, supabaseClient = null) {
    if (!userId || userId === 'guest') return [];

    const bookmarksMap = readJson(BOOKMARKS_CACHE_FILE, {});
    const userBookmarks = new Set(bookmarksMap[userId] || []);

    if (supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from('user_bookmarks')
          .select('item_id')
          .eq('user_id', userId)
          .eq('item_type', 'bitz');

        if (data) {
          data.forEach(d => userBookmarks.add(d.item_id));
        }

        const idsArray = Array.from(userBookmarks);
        if (idsArray.length > 0) {
          const { data: dbBitz } = await supabaseClient
            .from('knowledge_bitz')
            .select('*')
            .in('id', idsArray);

          if (dbBitz && dbBitz.length > 0) {
            return dbBitz.map(b => ({
              ...b,
              is_liked_by_me: false,
              is_saved_by_me: true
            }));
          }
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase getSavedBitz notice:', e.message);
      }
    }

    const allBitz = this.getLocalBitz();
    const savedItems = allBitz.filter(b => userBookmarks.has(b.id));
    return savedItems.map(b => ({
      ...b,
      is_liked_by_me: false,
      is_saved_by_me: true
    }));
  }

  // --------------------------------------------------------------------------
  // GEMINI AI IMAGE GENERATION FOR KNOWLEDGE BITZ
  // --------------------------------------------------------------------------
  async generateBitzVisualWithGemini(bitz, options = {}, supabaseClient = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return { success: false, error: 'GEMINI_API_KEY is not configured in server environment.' };
    }

    const title = (bitz.title || 'Educational Fact').trim();
    const shortFact = (bitz.short_fact || '').trim();
    const category = (bitz.category || 'Science').trim();
    const topic = (bitz.topic_id || 'General').trim();

    const customPrompt = options.customPrompt || `
EDTECHRA BITZ PREMIUM EDUCATIONAL ARTWORK
Create a high-impact, scientifically accurate, visually memorable editorial illustration for EdTechra Bitz.

FACT HEADLINE: "${title}"
TOPIC & CATEGORY: ${category} — ${topic}
SUMMARY FACT: "${shortFact}"

ART DIRECTION:
- Sophisticated, modern, polished educational illustration in EdTechra's signature layered paper-cut art style.
- Layered foreground, mid-ground, and background with realistic paper texture, dimensional depth, and cast shadows.
- Bright, vivid, harmonious color palette with strong visual contrast.
- 16:9 landscape composition with one dominant visual focal point and clean framing.

STRICT RESTRICTIONS:
- Strictly NO text, NO words, NO labels, and NO letters inside the artwork.
- Strictly NO childish cartoon styling, nursery graphics, or emojis.
- Scientifically and factually authentic representation.
`.trim();

    const candidateModels = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
      'gemini-3.1-flash-lite-image',
      'imagen-3.0-generate-002'
    ];

    let rawBuffer = null;
    let usedModel = '';
    let lastError = '';

    for (const modelName of candidateModels) {
      try {
        if (modelName.startsWith('imagen')) {
          // Google Imagen 3 Predict API endpoint
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: customPrompt }],
              parameters: {
                sampleCount: 1,
                aspectRatio: '16:9',
                outputMimeType: 'image/jpeg'
              }
            })
          });

          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            lastError = json.error?.message || `HTTP ${response.status} from ${modelName}`;
            continue;
          }

          const prediction = json.predictions?.[0];
          if (prediction?.bytesBase64Encoded) {
            rawBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
            usedModel = modelName;
            break;
          }
        } else {
          // Google Gemini Multimodal GenerateContent API endpoint
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: customPrompt }] }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                imageConfig: { aspectRatio: '16:9' }
              }
            })
          });

          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            lastError = json.error?.message || `HTTP ${response.status} from ${modelName}`;
            continue;
          }

          const candidate = json.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              rawBuffer = Buffer.from(part.inlineData.data, 'base64');
              usedModel = modelName;
              break;
            }
          }

          if (rawBuffer && rawBuffer.length > 0) break;
        }
      } catch (err) {
        lastError = err.message || `Error calling ${modelName}`;
      }
    }

    if (!rawBuffer) {
      return { success: false, error: lastError || 'Failed to generate image with Gemini API.' };
    }

    // Process & compress with Sharp (16:9 Landscape 1024x576 high-efficiency WebP)
    let optimizedBuffer = rawBuffer;
    try {
      const sharpModule = await import('sharp');
      const sharpInstance = sharpModule.default || sharpModule;
      optimizedBuffer = await sharpInstance(rawBuffer)
        .resize({ width: 1024, height: 576, fit: 'cover', position: 'center' })
        .webp({ quality: 88, effort: 4 })
        .toBuffer();
    } catch (e) {
      console.warn('[KnowledgeBitzService] Sharp resize notice:', e.message);
    }

    // Upload directly to Cloudflare R2
    const cleanId = sanitizeSegment(bitz.id || bitz.bitz_code || 'bitz');
    const objectKey = `bitz/covers/${cleanId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.webp`;

    try {
      const uploadResult = await putBinaryContent(objectKey, optimizedBuffer, 'image/webp');

      // If supabaseClient is available, persist visual_url and visual_status to Supabase
      if (supabaseClient && bitz.id) {
        try {
          await supabaseClient
            .from('knowledge_bitz')
            .update({
              visual_url: uploadResult.publicUrl,
              visual_object_key: objectKey,
              visual_status: 'ready',
              updated_at: new Date().toISOString()
            })
            .eq('id', bitz.id);
        } catch (dbErr) {
          console.warn('[KnowledgeBitzService] Could not update Supabase with generated visual:', dbErr.message);
        }
      }

      // Also update local cache
      const allBitz = this.getLocalBitz();
      const idx = allBitz.findIndex(b => b.id === bitz.id || b.bitz_code === bitz.bitz_code);
      if (idx !== -1) {
        allBitz[idx].visual_url = uploadResult.publicUrl;
        allBitz[idx].visual_object_key = objectKey;
        allBitz[idx].visual_status = 'ready';
        allBitz[idx].updated_at = new Date().toISOString();
        this.saveLocalBitz(allBitz);
      }

      return {
        success: true,
        publicUrl: uploadResult.publicUrl,
        objectKey,
        prompt: customPrompt,
        model: usedModel
      };
    } catch (r2Err) {
      console.error('[KnowledgeBitzService] Cloudflare R2 upload error:', r2Err.message);
      return {
        success: false,
        error: `Generated image successfully but R2 storage upload failed: ${r2Err.message}`
      };
    }
  }

  // --------------------------------------------------------------------------
  // ADMIN CRUD, GET BY ID & BULK FACT IMPORT
  // --------------------------------------------------------------------------
  async getBitzById(id, supabaseClient = null) {
    if (!id) return null;

    if (supabaseClient) {
      try {
        // Try UUID match or bitz_code match
        let query = supabaseClient.from('knowledge_bitz').select('*');
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          query = query.eq('id', id);
        } else {
          query = query.eq('bitz_code', id);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase getBitzById notice:', e.message);
      }
    }

    const all = this.getLocalBitz();
    return all.find(b => b.id === id || b.bitz_code === id) || null;
  }

  async getAdminBitz(params = {}) {
    const search = params.search ? String(params.search).trim() : '';
    const rawTopic = params.topic ?? params.topic_id ?? 'all';
    const rawStatus = params.status ?? 'all';
    const rawVisualStatus = params.visualStatus ?? params.visual_status ?? params.imageStatus ?? params.image_status ?? 'all';
    const rawCefrLevel = params.cefrLevel ?? params.cefr_level ?? 'all';

    const topic = (rawTopic && rawTopic !== 'all') ? String(rawTopic).trim() : null;
    const rawCategory = params.category ?? 'all';
    const category = (rawCategory && rawCategory !== 'all') ? String(rawCategory).trim() : null;
    const rawSubtopic = params.subtopic ?? params.sub_topic ?? 'all';
    const subtopic = (rawSubtopic && rawSubtopic !== 'all') ? String(rawSubtopic).trim() : null;
    const status = (rawStatus && rawStatus !== 'all') ? String(rawStatus).trim() : null;
    const visualStatus = (rawVisualStatus && rawVisualStatus !== 'all') ? String(rawVisualStatus).trim() : null;
    const cefrLevel = (rawCefrLevel && rawCefrLevel !== 'all') ? String(rawCefrLevel).trim() : null;

    const pageNum = Math.max(1, parseInt(params.page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(params.limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;
    const supabaseClient = params.supabaseClient || null;

    if (supabaseClient) {
      try {
        let query = supabaseClient
          .from('knowledge_bitz')
          .select('*', { count: 'exact' });

        if (status) {
          query = query.eq('status', status);
        }

        if (category) {
          query = query.eq('category', category);
        } else if (topic) {
          query = query.or(`topic_id.eq.${topic},category.ilike.%${topic}%`);
        }

        if (subtopic) {
          query = query.eq('sub_topic', subtopic);
        }

        if (visualStatus) {
          query = query.eq('visual_status', visualStatus);
        }

        if (cefrLevel) {
          query = query.eq('cefr_level', cefrLevel);
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,short_fact.ilike.%${search}%,bitz_code.ilike.%${search}%,category.ilike.%${search}%,reading_text.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

        const { data: bitzData, count: totalCount, error: bitzError } = await query;

        if (bitzError) {
          console.error('[KnowledgeBitzService] Supabase getAdminBitz query error:', bitzError);
          throw bitzError;
        }

        // Compute admin stats via Supabase exact counts with safe fallback
        const [
          totalRes,
          pubRes,
          draftRes,
          readyImgRes,
          missingImgRes,
          genImgRes,
          failedImgRes,
          aggregatesRes
        ] = await Promise.all([
          supabaseClient.from('knowledge_bitz').select('id', { count: 'exact', head: true }),
          supabaseClient.from('knowledge_bitz').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabaseClient.from('knowledge_bitz').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
          supabaseClient.from('knowledge_bitz').select('id', { count: 'exact', head: true }).eq('visual_status', 'ready'),
          supabaseClient.from('knowledge_bitz').select('id', { count: 'exact', head: true }).eq('visual_status', 'missing'),
          supabaseClient.from('knowledge_bitz').select('id', { count: 'exact', head: true }).eq('visual_status', 'generating'),
          supabaseClient.from('knowledge_bitz').select('id', { count: 'exact', head: true }).eq('visual_status', 'failed'),
          supabaseClient.from('knowledge_bitz').select('completions_count, likes_count, saves_count')
        ]).catch(err => {
          console.warn('[KnowledgeBitzService] Stats aggregation notice:', err?.message || err);
          return [{}, {}, {}, {}, {}, {}, {}, { data: [] }];
        });

        let totalCompletions = 0;
        let totalLikes = 0;
        let totalSaves = 0;
        if (aggregatesRes?.data && Array.isArray(aggregatesRes.data)) {
          for (const row of aggregatesRes.data) {
            totalCompletions += Number(row.completions_count) || 0;
            totalLikes += Number(row.likes_count) || 0;
            totalSaves += Number(row.saves_count) || 0;
          }
        }

        const stats = {
          totalBitz: totalRes?.count ?? 0,
          publishedCount: pubRes?.count ?? 0,
          draftCount: draftRes?.count ?? 0,
          readyImageCount: readyImgRes?.count ?? 0,
          missingImageCount: missingImgRes?.count ?? 0,
          generatingImageCount: genImgRes?.count ?? 0,
          failedImageCount: failedImgRes?.count ?? 0,
          totalCompletions,
          totalLikes,
          totalSaves
        };

        return {
          success: true,
          bitz: bitzData || [],
          stats,
          total: totalCount !== null && totalCount !== undefined ? totalCount : (bitzData?.length || 0),
          page: pageNum,
          limit: limitNum
        };
      } catch (err) {
        console.error('[KnowledgeBitzService] Supabase getAdminBitz error:', err.message || err);
        throw err;
      }
    }

    // Local in-memory / JSON fallback
    let items = this.getLocalBitz();

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      items = items.filter(b => 
        b.title?.toLowerCase().includes(q) ||
        b.short_fact?.toLowerCase().includes(q) ||
        b.bitz_code?.toLowerCase().includes(q) ||
        b.topic_id?.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      items = items.filter(b => b.category === category);
    } else if (topic && topic !== 'all') {
      items = items.filter(b => b.topic_id === topic || b.category?.toLowerCase() === topic.toLowerCase());
    }

    if (subtopic && subtopic !== 'all') {
      items = items.filter(b => b.sub_topic === subtopic);
    }

    if (status && status !== 'all') {
      items = items.filter(b => b.status === status);
    }

    if (visualStatus && visualStatus !== 'all') {
      items = items.filter(b => b.visual_status === visualStatus);
    }

    if (cefrLevel && cefrLevel !== 'all') {
      items = items.filter(b => b.cefr_level === cefrLevel);
    }

    const total = items.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = items.slice(startIndex, startIndex + limitNum);

    // Compute admin stats
    const allItems = this.getLocalBitz();
    const stats = {
      totalBitz: allItems.length,
      publishedCount: allItems.filter(b => b.status === 'published').length,
      draftCount: allItems.filter(b => b.status === 'draft').length,
      readyImageCount: allItems.filter(b => b.visual_status === 'ready').length,
      missingImageCount: allItems.filter(b => b.visual_status === 'missing').length,
      generatingImageCount: allItems.filter(b => b.visual_status === 'generating').length,
      failedImageCount: allItems.filter(b => b.visual_status === 'failed').length,
      totalCompletions: allItems.reduce((sum, b) => sum + (Number(b.completions_count) || 0), 0),
      totalLikes: allItems.reduce((sum, b) => sum + (Number(b.likes_count) || 0), 0),
      totalSaves: allItems.reduce((sum, b) => sum + (Number(b.saves_count) || 0), 0)
    };

    return {
      success: true,
      bitz: paginated,
      stats,
      total,
      page: pageNum,
      limit: limitNum
    };
  }

  async createBitz(input, userId = null, supabaseClient = null) {
    if (!input.title || !input.short_fact || !input.reading_text) {
      throw new Error('Title, Short Fact, and Reading Text are strictly required.');
    }

    const readingWords = input.reading_text.trim().split(/\s+/).filter(Boolean).length;
    if (readingWords < 40 || readingWords > 250) {
      throw new Error(`Reading explanation must be approx 80-120 words (received ${readingWords} words).`);
    }

    const targetStatus = input.status || 'draft';
    const visualStatus = input.visual_url ? 'ready' : (input.visual_status || 'missing');

    // Strict validation: Bitz without ready image CANNOT be published
    if (targetStatus === 'published') {
      if (visualStatus !== 'ready' || !input.visual_url) {
        throw new Error('Cannot publish Knowledge Bitz without a ready image. Save as Draft first.');
      }
    }

    const validCefr = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const cefrLevel = input.cefr_level && validCefr.includes(input.cefr_level) ? input.cefr_level : 'B1';
    const hashInput = `${input.title.trim().toLowerCase()}|${input.short_fact.trim().toLowerCase()}`;
    const contentHash = await this._computeHash(hashInput);

    const id = input.id || crypto.randomUUID();

    const newBitz = {
      id,
      title: input.title.trim(),
      short_fact: input.short_fact.trim(),
      reading_text: input.reading_text.trim(),
      topic_id: input.topic_id || 'science',
      category: input.category || 'Science & Nature',
      sub_topic: input.sub_topic || '',
      difficulty: input.difficulty || 'Easy',
      cefr_level: cefrLevel,
      content_hash: contentHash,
      reading_time_sec: Number(input.reading_time_sec) || 30,
      visual_url: input.visual_url || null,
      visual_object_key: input.visual_object_key || null,
      visual_status: visualStatus,
      audio_url: input.audio_url || null,
      quiz: input.quiz || null,
      vocabulary: Array.isArray(input.vocabulary) ? input.vocabulary : [],
      source_citation: input.source_citation || null,
      xp_value: Number(input.xp_value) || 10,
      likes_count: 0,
      saves_count: 0,
      shares_count: 0,
      views_count: 0,
      completions_count: 0,
      status: targetStatus,
      created_by: userId || null,
      published_at: targetStatus === 'published' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (input.bitz_code) {
      newBitz.bitz_code = input.bitz_code;
    }

    if (supabaseClient) {
      let { data, error } = await supabaseClient
        .from('knowledge_bitz')
        .insert([newBitz])
        .select()
        .single();

      if (error && error.code === '23503') {
        // Foreign key violation on created_by (e.g. mock admin or test user): retry with created_by null
        newBitz.created_by = null;
        const retry = await supabaseClient
          .from('knowledge_bitz')
          .insert([newBitz])
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('[KnowledgeBitzService] Supabase insert error:', error);
        throw new Error(error.message || 'Failed to insert Knowledge Bitz into Supabase.');
      }
      return data;
    }

    // Local fallback
    const allBitz = this.getLocalBitz();
    if (!newBitz.bitz_code) {
      newBitz.bitz_code = `B${String(allBitz.length + 1).padStart(6, '0')}`;
    }
    allBitz.unshift(newBitz);
    this.saveLocalBitz(allBitz);
    return newBitz;
  }

  async updateBitz(id, updates, supabaseClient = null) {
    if (supabaseClient) {
      // Fetch existing record
      let targetId = id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      let query = supabaseClient.from('knowledge_bitz').select('*');
      if (isUuid) {
        query = query.eq('id', id);
      } else {
        query = query.eq('bitz_code', id);
      }

      const { data: current, error: fetchErr } = await query.maybeSingle();
      if (fetchErr || !current) {
        throw new Error('Knowledge Bitz not found.');
      }
      targetId = current.id;

      const targetStatus = updates.status || current.status;
      const effectiveVisualStatus = updates.visual_url 
        ? 'ready' 
        : (updates.visual_status !== undefined ? updates.visual_status : current.visual_status);
      const effectiveVisualUrl = updates.visual_url !== undefined ? updates.visual_url : current.visual_url;

      const cleanUpdates = {
        ...updates,
        visual_status: effectiveVisualStatus,
        published_at: targetStatus === 'published' && !current.published_at ? new Date().toISOString() : (updates.published_at !== undefined ? updates.published_at : current.published_at),
        updated_at: new Date().toISOString()
      };

      const { data: updated, error: updateErr } = await supabaseClient
        .from('knowledge_bitz')
        .update(cleanUpdates)
        .eq('id', targetId)
        .select()
        .single();

      if (updateErr) {
        console.error('[KnowledgeBitzService] Supabase update error:', updateErr);
        throw new Error(updateErr.message || 'Failed to update Knowledge Bitz in Supabase.');
      }

      return updated;
    }

    // Local fallback
    const allBitz = this.getLocalBitz();
    const idx = allBitz.findIndex(b => b.id === id || b.bitz_code === id);
    if (idx === -1) throw new Error('Knowledge Bitz not found.');

    const current = allBitz[idx];
    const targetStatus = updates.status || current.status;
    const effectiveVisualStatus = updates.visual_url 
      ? 'ready' 
      : (updates.visual_status !== undefined ? updates.visual_status : current.visual_status);
    const effectiveVisualUrl = updates.visual_url !== undefined ? updates.visual_url : current.visual_url;

    const updated = {
      ...current,
      ...updates,
      visual_status: effectiveVisualStatus,
      published_at: targetStatus === 'published' && !current.published_at ? new Date().toISOString() : current.published_at,
      updated_at: new Date().toISOString()
    };

    allBitz[idx] = updated;
    this.saveLocalBitz(allBitz);
    return updated;
  }

  async deleteBitz(id, supabaseClient = null) {
    if (supabaseClient) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let deleteQuery = supabaseClient.from('knowledge_bitz').delete();
      if (isUuid) {
        deleteQuery = deleteQuery.eq('id', id);
      } else {
        deleteQuery = deleteQuery.eq('bitz_code', id);
      }

      const { error } = await deleteQuery;
      if (error) {
        console.error('[KnowledgeBitzService] Supabase delete error:', error);
        throw new Error(error.message || 'Failed to delete Knowledge Bitz.');
      }
      return true;
    }

    let allBitz = this.getLocalBitz();
    allBitz = allBitz.filter(b => b.id !== id && b.bitz_code !== id);
    this.saveLocalBitz(allBitz);
    return true;
  }

  /**
   * Bulk Fact Import supporting 1,000+ records with rigorous validation & failure diagnostics
   * All imported records default strictly to DRAFT
   */
  async bulkImportBitz(arg1 = [], arg2 = null, arg3 = null, arg4 = null) {
    const isOptionsObj = typeof arg1 === 'object' && !Array.isArray(arg1) && arg1 !== null;
    const items = isOptionsObj ? (arg1.items || []) : (Array.isArray(arg1) ? arg1 : []);
    const userId = isOptionsObj ? arg1.userId : arg2;
    const supabaseClient = isOptionsObj ? arg1.supabaseClient : arg3;
    const cefrLevel = isOptionsObj ? arg1.cefrLevel : arg4;

    if (!Array.isArray(items) || items.length === 0) {
      return { totalSubmitted: 0, importedCount: 0, failedCount: 0, errors: [], imported: [] };
    }

    const imported = [];
    const errors = [];
    const batchHashes = new Set();

    // Fetch existing hashes from Supabase or local to prevent duplicate insertions
    let existingHashes = new Set();
    if (supabaseClient) {
      try {
        const { data: hashRows } = await supabaseClient
          .from('knowledge_bitz')
          .select('content_hash')
          .not('content_hash', 'is', null);

        if (hashRows && Array.isArray(hashRows)) {
          existingHashes = new Set(hashRows.map(r => r.content_hash).filter(Boolean));
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Could not fetch existing hashes from Supabase:', e.message);
      }
    } else {
      const allBitz = this.getLocalBitz();
      existingHashes = new Set(allBitz.filter(b => b.content_hash).map(b => b.content_hash));
    }

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row || typeof row !== 'object') {
        errors.push({ index: i + 1, title: 'Unknown', reason: 'Record must be a valid JSON object.' });
        continue;
      }

      const title = String(row.title || '').trim();
      if (!title || title.length < 5) {
        errors.push({ index: i + 1, title: title || 'Missing Title', reason: 'Title must be at least 5 characters.' });
        continue;
      }

      const shortFact = String(row.short_fact || row.shortFact || row.summary || row.fact || '').trim();
      if (!shortFact || shortFact.length < 10) {
        errors.push({ index: i + 1, title, reason: 'Short fact (short_fact) is missing or too short.' });
        continue;
      }

      const readingText = String(row.reading_text || row.reading || row.reading_content || row.content || '').trim();
      if (!readingText || readingText.length < 10) {
        errors.push({
          index: i + 1,
          title,
          reason: 'Reading text (reading_text) is missing or empty (received 0 words).'
        });
        continue;
      }

      const wordCount = readingText.split(/\s+/).filter(token => /[a-zA-Z0-9]/.test(token)).length;
      if (wordCount < 60 || wordCount > 200) {
        errors.push({
          index: i + 1,
          title,
          reason: `Reading length must be approximately 100 words (90–110 words target, received ${wordCount} words).`
        });
        continue;
      }

      const hashInput = `${title.toLowerCase()}|${shortFact.toLowerCase()}`;
      const contentHash = await this._computeHash(hashInput);

      if (existingHashes.has(contentHash) || batchHashes.has(contentHash)) {
        errors.push({
          index: i + 1,
          title,
          reason: 'Duplicate content detected — this Bitz already exists or appears earlier in this batch.'
        });
        continue;
      }
      batchHashes.add(contentHash);

      const validCefr = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const rawCefr = String(row.cefr_level || row.level || row.cefrLevel || '').toUpperCase().trim();
      const recordCefr = rawCefr && validCefr.includes(rawCefr) ? rawCefr : null;
      const resolvedCefr = recordCefr || (cefrLevel && validCefr.includes(cefrLevel) ? cefrLevel : 'B1');

      let normalizedQuiz = null;
      if (Array.isArray(row.quiz)) {
        normalizedQuiz = row.quiz.filter(q => q && q.question && (Array.isArray(q.options) || Array.isArray(q.choices))).map(q => {
          const options = (q.options || q.choices).map(opt => String(opt || '').trim());
          const correct = String(q.correct_answer || q.correctAnswer || q.answer || options[0] || '').trim();
          return {
            question: String(q.question).trim(),
            options,
            correct_answer: correct,
            explanation: String(q.explanation || 'Verified answer.').trim(),
            xp: 2
          };
        });
        if (normalizedQuiz.length === 0) normalizedQuiz = null;
      } else if (row.quiz && row.quiz.question && Array.isArray(row.quiz.options)) {
        const options = row.quiz.options.map(opt => String(opt || '').trim());
        const correct = String(row.quiz.correct_answer || row.quiz.correctAnswer || row.quiz.answer || options[0] || '').trim();
        normalizedQuiz = [{
          question: String(row.quiz.question).trim(),
          options,
          correct_answer: correct,
          explanation: String(row.quiz.explanation || 'Verified answer.').trim(),
          xp: 2
        }];
      }

      const newBitz = {
        id: crypto.randomUUID(),
        title,
        short_fact: shortFact,
        reading_text: readingText,
        topic_id: String(row.topic_id || 'science').toLowerCase().trim(),
        category: row.category || row.category_id || row.categoryGroup || 'Science & Nature',
        sub_topic: row.sub_topic || row.subtopic || 'General',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(row.difficulty) ? row.difficulty : 'Easy',
        cefr_level: resolvedCefr,
        content_hash: contentHash,
        reading_time_sec: Number(row.reading_time_sec) || 30,
        visual_url: row.visual_url || null,
        visual_object_key: row.visual_object_key || null,
        visual_status: row.visual_url ? 'ready' : 'missing',
        source_citation: row.source_citation || row.sourceCitation || row.source || null,
        quiz: normalizedQuiz,
        vocabulary: Array.isArray(row.vocabulary) ? row.vocabulary : [],
        xp_value: normalizedQuiz ? normalizedQuiz.length * 2 : 10,
        likes_count: 0,
        saves_count: 0,
        shares_count: 0,
        views_count: 0,
        completions_count: 0,
        status: 'draft', // Strictly draft on import
        created_by: userId,
        published_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      imported.push(newBitz);
      existingHashes.add(contentHash);
    }

    if (supabaseClient && imported.length > 0) {
      let { data: insertedData, error: insertError } = await supabaseClient
        .from('knowledge_bitz')
        .insert(imported)
        .select();

      if (insertError && insertError.code === '23503') {
        // Retry with created_by null in case mock admin / test user ID is not in auth.users
        imported.forEach(b => { b.created_by = null; });
        const retry = await supabaseClient
          .from('knowledge_bitz')
          .insert(imported)
          .select();
        insertedData = retry.data;
        insertError = retry.error;
      }

      if (insertError) {
        console.error('[KnowledgeBitzService] Supabase bulk insert error:', insertError);
        throw new Error(insertError.message || 'Failed to bulk insert Knowledge Bitz into Supabase.');
      }

      return {
        totalSubmitted: items.length,
        importedCount: insertedData ? insertedData.length : imported.length,
        failedCount: errors.length,
        errors,
        imported: insertedData || imported
      };
    }

    // Local in-memory fallback
    const allBitz = this.getLocalBitz();
    let currentSeq = allBitz.length + 1;
    for (const b of imported) {
      b.bitz_code = `B${String(currentSeq++).padStart(6, '0')}`;
      allBitz.push(b);
    }
    this.saveLocalBitz(allBitz);

    return {
      totalSubmitted: items.length,
      importedCount: imported.length,
      failedCount: errors.length,
      errors,
      imported
    };
  }

  /**
   * Compute a simple hash for content deduplication (server-side).
   * Uses Node.js crypto module.
   */
  async _computeHash(input) {
    const { createHash } = await import('crypto');
    return createHash('sha256').update(input).digest('hex');
  }
}

export const knowledgeBitzService = new KnowledgeBitzService();
