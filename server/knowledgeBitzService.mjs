// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Server Service
// Complete implementation of Feed Discovery, Personalization, Diversity,
// Learning History, Gemini Image Generation, and R2 Storage.
// ============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default seed Bitz for instantaneous local availability
const INITIAL_SEED_BITZ = [
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    bitz_code: 'B000001',
    title: 'Octopuses Have Three Hearts and Blue Blood',
    short_fact: 'Two hearts pump blood to the gills, while a third circulates it to the body. Their blood is blue because it uses copper instead of iron.',
    reading_text: 'An octopus has three distinct hearts that work in harmony. Two branchial hearts pump blood through each of the animal\'s two gills, where oxygen is absorbed. The third systemic heart pumps oxygenated blood throughout the rest of the body. Interestingly, when an octopus swims, the systemic heart stops beating, which is why octopuses tire quickly and prefer crawling along the sea floor. Furthermore, octopus blood is copper-based (using hemocyanin) rather than iron-based (hemoglobin), making their blood blue and highly efficient in cold, low-oxygen ocean waters.',
    topic_id: 'biology',
    category: 'Science & Nature',
    sub_topic: 'Biology',
    difficulty: 'Easy',
    reading_time_sec: 30,
    visual_url: '/assets/ChatGPT Image May 14, 2026, 08_52_51 PM (1).png',
    visual_status: 'ready',
    source_citation: 'Smithsonian National Zoo & Marine Biology Institute',
    xp_value: 10,
    likes_count: 142,
    saves_count: 89,
    shares_count: 24,
    views_count: 890,
    completions_count: 65,
    quiz: {
      question: 'Why is octopus blood blue instead of red?',
      options: ['It contains copper-based hemocyanin', 'It contains high levels of nitrogen', 'It has zero red blood cells', 'It absorbs blue light underwater'],
      correct_answer: 'It contains copper-based hemocyanin',
      explanation: 'Octopus blood uses hemocyanin, a copper-rich protein, to transport oxygen in cold and deep water, giving it a distinctive blue tint.'
    },
    vocabulary: [
      { word: 'Hemocyanin', definition: 'A copper-containing protein that carries oxygen in the blood of mollusks and crustaceans.' },
      { word: 'Branchial', definition: 'Relating to the gills of aquatic animals.' }
    ],
    status: 'published',
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000002',
    bitz_code: 'B000002',
    title: 'Why Mars Appears Red: Planetary Rust',
    short_fact: 'Mars looks red because its surface soil contains vast amounts of iron oxide — the exact same chemical compound found in household rust.',
    reading_text: 'The iconic reddish-orange glow of the Red Planet is caused by iron oxide, commonly known as rust. Billions of years ago, when Mars had liquid water and a denser atmosphere, iron contained in surface basaltic rocks reacted with atmospheric oxygen and moisture. Over geological epochs, solar ultraviolet radiation broke down trace water vapor, creating oxygen molecules that oxidized the iron. Today, relentless Martian dust storms continually grind these oxidized rocks into fine particles and loft them into the thin atmosphere, cloaking the entire planet in an ethereal rusty veil.',
    topic_id: 'space',
    category: 'Science & Nature',
    sub_topic: 'Space & Astronomy',
    difficulty: 'Easy',
    reading_time_sec: 30,
    visual_url: '/assets/ChatGPT Image May 17, 2026, 09_51_10 PM.webp',
    visual_status: 'ready',
    source_citation: 'NASA Planetary Science Division',
    xp_value: 10,
    likes_count: 198,
    saves_count: 120,
    shares_count: 45,
    views_count: 1240,
    completions_count: 94,
    quiz: {
      question: 'What chemical compound gives Mars its distinctive reddish color?',
      options: ['Copper sulfate', 'Iron oxide (rust)', 'Methane crystals', 'Sulfur dioxide'],
      correct_answer: 'Iron oxide (rust)',
      explanation: 'Iron oxide on the Martian surface absorbs blue and green wavelengths of sunlight and reflects red wavelengths, giving Mars its color.'
    },
    vocabulary: [
      { word: 'Oxidation', definition: 'The chemical reaction between a substance and oxygen, often forming oxides like rust.' },
      { word: 'Basaltic', definition: 'Relating to dark, dense igneous rock formed from the cooling of lava.' }
    ],
    status: 'published',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000003',
    bitz_code: 'B000003',
    title: 'Why Does Popcorn Pop? Steam Pressure Explosion',
    short_fact: 'Each popcorn kernel holds a tiny droplet of water sealed inside a hard starch hull. When heated, the water explodes into steam, flipping the kernel inside out.',
    reading_text: 'Unlike standard sweet corn, popcorn kernels possess a unique, hard, moisture-sealed outer hull (pericarp) surrounding a core of dense starch and about 14% water. When the kernel is heated past 180°C (356°F), the trapped water turns into superheated pressurized steam, turning the hard starch into a molten, gelatinous mass. The pressure inside climbs to over 135 pounds per square inch (psi) until the hull violently ruptures. As the steam escapes instantly, the gelatinized starch expands into a frothy white foam that cools almost immediately into a crispy puff.',
    topic_id: 'physics',
    category: 'Science & Nature',
    sub_topic: 'Physics & Chemistry',
    difficulty: 'Easy',
    reading_time_sec: 30,
    visual_url: '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png',
    visual_status: 'ready',
    source_citation: 'American Chemical Society',
    xp_value: 10,
    likes_count: 165,
    saves_count: 94,
    shares_count: 32,
    views_count: 980,
    completions_count: 78,
    quiz: {
      question: 'What causes the popcorn kernel to suddenly pop?',
      options: ['Pressurized steam bursting the hull', 'Chemical fermentation of corn oil', 'Rapid freezing of internal sugars', 'Melting of the outer kernel skin'],
      correct_answer: 'Pressurized steam bursting the hull',
      explanation: 'Superheated water trapped inside the kernel turns into high-pressure steam, forcing the hard hull to burst and releasing expanded starch.'
    },
    vocabulary: [
      { word: 'Pericarp', definition: 'The hard outer wall or hull of a plant seed kernel.' },
      { word: 'Gelatinize', definition: 'To transform starch into a soft, jelly-like form through heat and moisture.' }
    ],
    status: 'published',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000004',
    bitz_code: 'B000004',
    title: 'The Zeigarnik Effect: Why Your Brain Hates Unfinished Tasks',
    short_fact: 'Our brains remember unfinished or interrupted tasks far better than completed ones, creating mental tension until they are resolved.',
    reading_text: 'In the late 1920s, psychologist Bluma Zeigarnik noticed that restaurant waiters had flawless memory of unpaid, active orders, but completely forgot the details once the bill was settled. Her subsequent laboratory experiments proved that when an individual starts a task, the human brain creates a state of cognitive tension. This tension keeps the information readily accessible in working memory. Once the task is completed, the cognitive tension dissipates. Writers and filmmakers intentionally use this psychological phenomenon through cliffhangers, and students can harness it to combat procrastination by simply starting for five minutes.',
    topic_id: 'psychology',
    category: 'People & Society',
    sub_topic: 'Psychology',
    difficulty: 'Medium',
    reading_time_sec: 35,
    visual_url: '/assets/ChatGPT Image Aug 23, 2026, 08_44_06 PM.png',
    visual_status: 'ready',
    source_citation: 'Journal of Experimental Psychology',
    xp_value: 10,
    likes_count: 210,
    saves_count: 156,
    shares_count: 67,
    views_count: 1560,
    completions_count: 112,
    quiz: {
      question: 'What does the Zeigarnik Effect describe in human psychology?',
      options: ['Better memory retention of unfinished tasks', 'Forgetting names immediately after introductions', 'Fear of public speaking in large crowds', 'Decreased productivity under high stress'],
      correct_answer: 'Better memory retention of unfinished tasks',
      explanation: 'The Zeigarnik effect states that uncompleted actions create cognitive tension that keeps them active in working memory until resolved.'
    },
    vocabulary: [
      { word: 'Cognitive', definition: 'Relating to conscious mental activities such as thinking, remembering, and learning.' },
      { word: 'Dissipate', definition: 'To gradually disappear, scatter, or diminish in strength.' }
    ],
    status: 'published',
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000005',
    bitz_code: 'B000005',
    title: 'Neural Networks: How AI Learns from Connections',
    short_fact: 'Artificial neural networks mimic the human brain by adjusting mathematical connection weights between layers of artificial neurons.',
    reading_text: 'Modern Artificial Intelligence models are built on artificial neural networks inspired by biological brains. In a neural network, input data (like pixels of an image or words in a sentence) is passed through multiple interconnected layers of mathematical nodes called neurons. Each connection between nodes has a numerical weight that determines its importance. During training, the network makes predictions, measures its mistakes via a loss function, and uses an algorithm called backpropagation to adjust millions of weights backwards through the network. Over millions of iterations, the network becomes exceptionally accurate at recognizing patterns.',
    topic_id: 'ai',
    category: 'Technology & Future',
    sub_topic: 'Artificial Intelligence',
    difficulty: 'Medium',
    reading_time_sec: 35,
    visual_url: '/assets/ChatGPT Image May 14, 2026, 08_52_51 PM (1).png',
    visual_status: 'ready',
    source_citation: 'Stanford Artificial Intelligence Laboratory',
    xp_value: 10,
    likes_count: 284,
    saves_count: 180,
    shares_count: 82,
    views_count: 1980,
    completions_count: 145,
    quiz: {
      question: 'What algorithm is used to calculate and update weights backwards in a neural network?',
      options: ['Backpropagation', 'Binary search tree', 'Breadth-first search', 'Bubble sorting algorithm'],
      correct_answer: 'Backpropagation',
      explanation: 'Backpropagation calculates the gradient of the error function with respect to the network weights, allowing neural networks to learn from mistakes.'
    },
    vocabulary: [
      { word: 'Backpropagation', definition: 'An algorithm used to train neural networks by propagating errors backwards to tune weights.' },
      { word: 'Iteration', definition: 'A single cycle of running a process or calculation.' }
    ],
    status: 'published',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000006',
    bitz_code: 'B000006',
    title: 'Why Oxford Has Older Roots Than the Aztec Empire',
    short_fact: 'Teaching at Oxford University existed by 1096 CE, centuries before the Aztec Empire was founded in 1428 CE.',
    reading_text: 'While we often perceive the Aztec civilization as ancient history and European universities as modern institutions, historical timelines challenge our intuition. Records show that active teaching at the University of Oxford in England was already taking place as early as 1096 CE, and it rapidly expanded after King Henry II banned English students from attending the University of Paris in 1167. In contrast, the Aztec Empire was founded with the Triple Alliance of Tenochtitlan, Texcoco, and Tlacopan in 1428 CE — more than 330 years after Oxford professors were already lecturing students.',
    topic_id: 'history',
    category: 'People & Society',
    sub_topic: 'History',
    difficulty: 'Easy',
    reading_time_sec: 30,
    visual_url: '/assets/ChatGPT Image May 17, 2026, 09_51_10 PM.webp',
    visual_status: 'ready',
    source_citation: 'Oxford Historical Society & Britannica',
    xp_value: 10,
    likes_count: 315,
    saves_count: 210,
    shares_count: 105,
    views_count: 2400,
    completions_count: 180,
    quiz: {
      question: 'When did documented teaching begin at the University of Oxford?',
      options: ['1096 CE', '1492 CE', '1776 CE', '1850 CE'],
      correct_answer: '1096 CE',
      explanation: 'Documented teaching at Oxford dates back to 1096 CE, making it the oldest university in the English-speaking world and older than the Aztec Empire.'
    },
    vocabulary: [
      { word: 'Alliance', definition: 'A union or association formed for mutual benefit between countries or organizations.' },
      { word: 'Intuition', definition: 'The ability to understand something instinctively without the need for conscious reasoning.' }
    ],
    status: 'published',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'a0000001-0000-0000-0000-000000000007',
    bitz_code: 'B000007',
    title: 'Serendipity: The Art of Happy Accidents',
    short_fact: 'Serendipity means finding valuable or agreeable things not sought for — like the accidental discovery of penicillin or microwave ovens.',
    reading_text: 'The word "serendipity" was coined by English writer Horace Walpole in a 1754 letter, inspired by the Persian fairy tale "The Three Princes of Serendip." In the story, the heroes were always making discoveries by accident and sagacity of things they were not in quest of. In scientific history, serendipity has driven some of humanity\'s greatest breakthroughs: Alexander Fleming discovered penicillin when mold contaminated his petri dish, Percy Spencer invented the microwave after a radar magnetron melted a chocolate bar in his pocket, and post-it notes arose from an adhesive deemed too weak.',
    topic_id: 'english',
    category: 'English',
    sub_topic: 'Vocabulary & Etymology',
    difficulty: 'Easy',
    reading_time_sec: 30,
    visual_url: '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png',
    visual_status: 'ready',
    source_citation: 'Oxford English Dictionary Etymology Archives',
    xp_value: 10,
    likes_count: 180,
    saves_count: 135,
    shares_count: 48,
    views_count: 1120,
    completions_count: 88,
    quiz: {
      question: 'What does the word "Serendipity" describe?',
      options: ['Finding valuable things by pleasant accident', 'A severe and continuous headache', 'Extreme physical strength under pressure', 'Fear of deep and dark water'],
      correct_answer: 'Finding valuable things by pleasant accident',
      explanation: 'Serendipity refers to the occurrence and development of events by chance in a happy or beneficial way.'
    },
    vocabulary: [
      { word: 'Serendipity', definition: 'The occurrence of discovering valuable or agreeable things by chance.' },
      { word: 'Sagacity', definition: 'The quality of having or showing keen mental discernment and good judgment.' }
    ],
    status: 'published',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Helper: Read JSON cache
function readJson(file, defaultData = []) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn(`[KnowledgeBitzService] Error reading ${file}:`, e.message);
  }
  return defaultData;
}

// Helper: Write JSON cache
function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[KnowledgeBitzService] Error writing ${file}:`, e.message);
  }
}

// Initialize seed data if cache file is empty
if (!fs.existsSync(BITZ_CACHE_FILE)) {
  writeJson(BITZ_CACHE_FILE, INITIAL_SEED_BITZ);
}

class KnowledgeBitzService {
  /**
   * Retrieves all local Bitz from cache or initializes them
   */
  getLocalBitz() {
    let items = readJson(BITZ_CACHE_FILE, []);
    if (!Array.isArray(items) || items.length === 0) {
      items = [...INITIAL_SEED_BITZ];
      writeJson(BITZ_CACHE_FILE, items);
    }
    return items;
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

  async recordLearningState({ userId, bitzId, status, selectedOption = null, supabaseClient = null }) {
    if (!bitzId) throw new Error('bitzId is required');

    let isCorrect = null;
    let xpAwarded = 0;
    let alreadyLearned = false;

    // 1. Try Supabase RPC if available
    if (supabaseClient && userId && userId !== 'guest') {
      try {
        const { data, error } = await supabaseClient.rpc('record_bitz_learning_state', {
          p_bitz_id: bitzId,
          p_new_status: status,
          p_selected_quiz_option: selectedOption
        });

        if (!error && data && data.success) {
          // Sync to local cache
          this.syncLocalHistory(userId, bitzId, data.status, data.xpAwarded);
          return data;
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase RPC record learning notice:', e.message);
      }
    }

    // 2. Local Fallback Evaluation
    const allBitz = this.getLocalBitz();
    const bitz = allBitz.find(b => b.id === bitzId || b.bitz_code === bitzId);
    if (!bitz) throw new Error('Knowledge Bitz not found');

    const history = readJson(HISTORY_CACHE_FILE, {});
    if (userId) {
      if (!history[userId]) history[userId] = {};
      const userEntry = history[userId][bitz.id] || {};
      alreadyLearned = Boolean(userEntry.status === 'learned');

      if (selectedOption && bitz.quiz) {
        const correctAns = bitz.quiz.correct_answer || bitz.quiz.correctAnswer;
        isCorrect = selectedOption.trim() === String(correctAns).trim();
        if (isCorrect && !alreadyLearned) {
          xpAwarded = bitz.xp_value || 10;
          status = 'learned';
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
        xp_awarded: (userEntry.xp_awarded || 0) + xpAwarded,
        updated_at: new Date().toISOString()
      };

      writeJson(HISTORY_CACHE_FILE, history);
    }

    if (xpAwarded > 0) {
      bitz.completions_count = (bitz.completions_count || 0) + 1;
      this.saveLocalBitz(allBitz);
    }

    return {
      success: true,
      bitzId: bitz.id,
      status: alreadyLearned ? 'learned' : status,
      isCorrect,
      xpAwarded,
      alreadyLearned,
      explanation: bitz.quiz?.explanation
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
    // 1. Get user preferences and learned IDs
    const userPref = await this.getUserPreferences(userId, supabaseClient);
    const learnedIds = this.getUserLearnedBitzIds(userId);
    const userHistory = this.getUserHistoryMap(userId);
    const likesMap = readJson(LIKES_CACHE_FILE, {});
    const bookmarksMap = readJson(BOOKMARKS_CACHE_FILE, {});
    const userLikes = new Set(likesMap[userId] || []);
    const userBookmarks = new Set(bookmarksMap[userId] || []);

    let pool = [];

    // 2. Fetch candidate Bitz (Supabase or Local)
    if (supabaseClient) {
      try {
        let query = supabaseClient
          .from('knowledge_bitz')
          .select('*')
          .eq('status', 'published');

        if (topic && topic !== 'all') {
          query = query.eq('topic_id', topic);
        } else if (!userPref.isAllTopicsSelected && userPref.selectedTopics.length > 0) {
          query = query.in('topic_id', userPref.selectedTopics);
        }

        if (difficulty && difficulty !== 'all') {
          query = query.eq('difficulty', difficulty);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          pool = data;
        }
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase get feed notice:', e.message);
      }
    }

    if (pool.length === 0) {
      pool = this.getLocalBitz().filter(b => b.status === 'published');
      if (topic && topic !== 'all') {
        pool = pool.filter(b => b.topic_id === topic || b.category?.toLowerCase() === topic.toLowerCase());
      } else if (!userPref.isAllTopicsSelected && userPref.selectedTopics.length > 0) {
        const allowed = new Set(userPref.selectedTopics);
        pool = pool.filter(b => allowed.has(b.topic_id));
      }

      if (difficulty && difficulty !== 'all') {
        pool = pool.filter(b => b.difficulty?.toLowerCase() === difficulty.toLowerCase());
      }
    }

    // 3. Search Filter
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      pool = pool.filter(b => 
        b.title?.toLowerCase().includes(q) ||
        b.short_fact?.toLowerCase().includes(q) ||
        b.reading_text?.toLowerCase().includes(q) ||
        b.topic_id?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.sub_topic?.toLowerCase().includes(q)
      );
    }

    // 4. CRITICAL PRODUCT RULE: NEVER SHOW LEARNED FACTS AGAIN
    const unlearnedPool = pool.filter(b => !learnedIds.has(b.id) && !learnedIds.has(b.bitz_code));

    // Check if user has learned everything available in their selection
    const allLearnedNotice = unlearnedPool.length === 0 && pool.length > 0;

    // 5. Score & Rank Unlearned Candidates
    const scoredPool = unlearnedPool.map(b => {
      let score = 0;
      // Freshness (0 - 40 pts)
      const ageHours = (Date.now() - new Date(b.created_at || Date.now()).getTime()) / 3600000;
      score += Math.max(0, 40 - ageHours * 0.5);

      // Popularity (0 - 30 pts)
      const pop = (Number(b.likes_count) || 0) * 1.5 + (Number(b.saves_count) || 0) * 2.5;
      score += Math.min(30, pop);

      // Unseen bonus (+25 pts if never seen or opened)
      const hist = userHistory[b.id];
      if (!hist) {
        score += 25;
      } else if (hist.status === 'seen') {
        score += 15;
      } else if (hist.status === 'opened') {
        score += 10;
      }

      // Tab modifier
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

    // 6. Topic Diversity Interleaving (Prevent Science -> Science -> Science clustering)
    const diversePool = this.applyTopicDiversity(scoredPool);

    // 7. Paginate
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

    const allBitz = this.getLocalBitz();
    const bitz = allBitz.find(b => b.id === bitzId || b.bitz_code === bitzId);
    if (!bitz) throw new Error('Knowledge Bitz not found');

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
    this.saveLocalBitz(allBitz);

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

    const allBitz = this.getLocalBitz();
    const bitz = allBitz.find(b => b.id === bitzId || b.bitz_code === bitzId);
    if (!bitz) throw new Error('Knowledge Bitz not found');

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
    this.saveLocalBitz(allBitz);

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
    const allBitz = this.getLocalBitz();

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
      } catch (e) {}
    }

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
  async generateBitzVisualWithGemini(bitz, options = {}) {
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
      optimizedBuffer = await sharp(rawBuffer)
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
  // ADMIN CRUD & BULK FACT IMPORT
  // --------------------------------------------------------------------------
  async getAdminBitz({ search = '', topic = 'all', status = 'all', visualStatus = 'all', page = 1, limit = 50 }) {
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

    if (topic && topic !== 'all') {
      items = items.filter(b => b.topic_id === topic);
    }

    if (status && status !== 'all') {
      items = items.filter(b => b.status === status);
    }

    if (visualStatus && visualStatus !== 'all') {
      items = items.filter(b => b.visual_status === visualStatus);
    }

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginated = items.slice(startIndex, startIndex + limit);

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
      page,
      limit
    };
  }

  async createBitz(input, userId = null, supabaseClient = null) {
    if (!input.title || !input.short_fact || !input.reading_text) {
      throw new Error('Title, Short Fact, and Reading Text are strictly required.');
    }

    const readingWords = input.reading_text.trim().split(/\s+/).length;
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

    const allBitz = this.getLocalBitz();
    const nextSeq = allBitz.length + 1;
    const bitzCode = input.bitz_code || `B${String(nextSeq).padStart(6, '0')}`;
    const id = crypto.randomUUID();

    const newBitz = {
      id,
      bitz_code: bitzCode,
      title: input.title.trim(),
      short_fact: input.short_fact.trim(),
      reading_text: input.reading_text.trim(),
      topic_id: input.topic_id || 'science',
      category: input.category || 'Science & Nature',
      sub_topic: input.sub_topic || '',
      difficulty: input.difficulty || 'Easy',
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
      created_by: userId,
      published_at: targetStatus === 'published' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    allBitz.unshift(newBitz);
    this.saveLocalBitz(allBitz);

    if (supabaseClient) {
      try {
        await supabaseClient.from('knowledge_bitz').insert([newBitz]);
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase insert notice:', e.message);
      }
    }

    return newBitz;
  }

  async updateBitz(id, updates, supabaseClient = null) {
    const allBitz = this.getLocalBitz();
    const idx = allBitz.findIndex(b => b.id === id || b.bitz_code === id);
    if (idx === -1) throw new Error('Knowledge Bitz not found.');

    const current = allBitz[idx];
    const targetStatus = updates.status || current.status;
    const effectiveVisualStatus = updates.visual_url 
      ? 'ready' 
      : (updates.visual_status !== undefined ? updates.visual_status : current.visual_status);
    const effectiveVisualUrl = updates.visual_url !== undefined ? updates.visual_url : current.visual_url;

    // Strict validation: Bitz without ready image CANNOT be published
    if (targetStatus === 'published') {
      if (effectiveVisualStatus !== 'ready' || !effectiveVisualUrl) {
        throw new Error('Cannot publish Knowledge Bitz without a ready image. Attach an image first.');
      }
    }

    const updated = {
      ...current,
      ...updates,
      visual_status: effectiveVisualStatus,
      published_at: targetStatus === 'published' && !current.published_at ? new Date().toISOString() : current.published_at,
      updated_at: new Date().toISOString()
    };

    allBitz[idx] = updated;
    this.saveLocalBitz(allBitz);

    if (supabaseClient) {
      try {
        await supabaseClient.from('knowledge_bitz').update(updated).eq('id', current.id);
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase update notice:', e.message);
      }
    }

    return updated;
  }

  async deleteBitz(id, supabaseClient = null) {
    let allBitz = this.getLocalBitz();
    const target = allBitz.find(b => b.id === id || b.bitz_code === id);
    allBitz = allBitz.filter(b => b.id !== id && b.bitz_code !== id);
    this.saveLocalBitz(allBitz);

    if (supabaseClient && target) {
      try {
        await supabaseClient.from('knowledge_bitz').delete().eq('id', target.id);
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase delete notice:', e.message);
      }
    }

    return true;
  }

  /**
   * Bulk Fact Import supporting 1,000+ records with rigorous validation & failure diagnostics
   * All imported records default strictly to DRAFT
   */
  async bulkImportBitz(items = [], userId = null, supabaseClient = null) {
    if (!Array.isArray(items) || items.length === 0) {
      return { totalSubmitted: 0, importedCount: 0, failedCount: 0, errors: [], imported: [] };
    }

    const imported = [];
    const errors = [];
    const allBitz = this.getLocalBitz();
    let currentSeq = allBitz.length + 1;

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row || typeof row !== 'object') {
        errors.push({ index: i + 1, title: 'Unknown', reason: 'Record must be a valid JSON object.' });
        continue;
      }

      if (!row.title || String(row.title).trim().length < 5) {
        errors.push({ index: i + 1, title: 'Missing Title', reason: 'Title must be at least 5 characters.' });
        continue;
      }

      if (!row.short_fact || String(row.short_fact).trim().length < 10) {
        errors.push({ index: i + 1, title: row.title, reason: 'Short fact must be at least 10 characters.' });
        continue;
      }

      const readingText = String(row.reading_text || '').trim();
      const wordCount = readingText.split(/\s+/).filter(Boolean).length;
      if (wordCount < 40 || wordCount > 250) {
        errors.push({
          index: i + 1,
          title: row.title,
          reason: `Reading length must be ~80-120 words (received ${wordCount} words).`
        });
        continue;
      }

      const bitzCode = `B${String(currentSeq++).padStart(6, '0')}`;
      const newBitz = {
        id: crypto.randomUUID(),
        bitz_code: bitzCode,
        title: String(row.title).trim(),
        short_fact: String(row.short_fact).trim(),
        reading_text: readingText,
        topic_id: String(row.topic_id || 'science').toLowerCase().trim(),
        category: row.category || 'Science & Nature',
        sub_topic: row.sub_topic || '',
        difficulty: ['Easy', 'Medium', 'Hard'].includes(row.difficulty) ? row.difficulty : 'Easy',
        reading_time_sec: Number(row.reading_time_sec) || 30,
        visual_url: row.visual_url || null,
        visual_object_key: row.visual_object_key || null,
        visual_status: row.visual_url ? 'ready' : 'missing',
        source_citation: row.source_citation || null,
        quiz: row.quiz && row.quiz.question && Array.isArray(row.quiz.options) ? row.quiz : null,
        vocabulary: Array.isArray(row.vocabulary) ? row.vocabulary : [],
        xp_value: 10,
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

      allBitz.push(newBitz);
      imported.push(newBitz);
    }

    this.saveLocalBitz(allBitz);

    if (supabaseClient && imported.length > 0) {
      try {
        await supabaseClient.from('knowledge_bitz').insert(imported);
      } catch (e) {
        console.warn('[KnowledgeBitzService] Supabase bulk insert notice:', e.message);
      }
    }

    return {
      totalSubmitted: items.length,
      importedCount: imported.length,
      failedCount: errors.length,
      errors,
      imported
    };
  }
}

export const knowledgeBitzService = new KnowledgeBitzService();

