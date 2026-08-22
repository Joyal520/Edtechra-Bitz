import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  getCachedOrFetchShorts,
  syncYouTubeChannel,
  getSyncStatus,
  loadLocalCache,
  saveLocalCache,
  VERIFIED_CHANNEL_ID,
  WEBSUB_TOPIC_URL,
  WEBSUB_HUB_URL
} from './server/youtubeService.mjs';
import crypto from 'crypto';
import {
  buildPresignedUpload,
  buildObjectKey,
  buildPublicUrl,
  deleteObjects,
  validateImageUpload,
  sanitizeSegment,
  putJsonContent,
  getJsonContent,
  listObjects,
  getStorageStats,
  testR2Connection,
  buildReadingContentKey,
  buildQuizContentKey,
  buildPollContentKey,
  buildReorderContentKey,
  buildSpellingScrambleContentKey,
  buildAvatarObjectKey
} from './server/r2Service.mjs';
import { getR2Config } from './server/r2Config.mjs';
import { moderatePostContent } from './server/moderationService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
// Accept raw Atom XML from YouTube PubSubHubbub webhooks, as well as JSON
app.use(express.text({ type: ['application/atom+xml', 'application/xml', 'text/xml', 'text/plain'] }));
app.use(express.json({ limit: '20mb' }));

// Helper: Strip invisible BOM (Byte Order Mark) and whitespace from env var values.
// BOM characters (U+FEFF) can be silently introduced when pasting values into hosting
// dashboards (e.g. Vercel) and corrupt HTTP headers, causing auth failures.
function cleanEnv(value) {
  return (value || '').replace(/^\uFEFF/, '').trim();
}

// Initialize server-side Supabase client
const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.VITE_SUPABASE_ANON_KEY);
const serverSupabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize server-side OpenAI client
const openaiApiKey = cleanEnv(process.env.OPENAI_API_KEY);
const serverOpenAI = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// Server Initialization Diagnostics (logged once at startup)
console.log('[Server Init] Environment diagnostics:');
console.log(`  SUPABASE_URL: ${supabaseUrl ? '✓ configured' : '✗ MISSING'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ configured' : '✗ MISSING (falling back to anon key)'}`);
console.log(`  VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✓ configured' : '✗ MISSING'}`);
console.log(`  serverSupabase initialized: ${serverSupabase ? '✓ yes' : '✗ NO — all auth will fail'}`);
console.log(`  R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? '✓ configured' : '✗ MISSING'}`);
console.log(`  R2_BUCKET: ${process.env.R2_BUCKET ? '✓ configured' : '✗ MISSING'}`);
console.log(`  OPENAI_API_KEY: ${openaiApiKey ? '✓ configured' : '✗ MISSING'}`);
console.log(`  serverOpenAI initialized: ${serverOpenAI ? '✓ yes' : '✗ NO — will use smart rule fallback'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

// Helper: Verify Supabase User Token from Request Authorization Header
async function verifyAuthUser(req) {
  // Allow development / test mock admin header in non-production environments
  if (process.env.NODE_ENV !== 'production' && req.headers['x-mock-admin'] === 'true') {
    return {
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'admin-test@edtechra.com' },
      profile: { id: '00000000-0000-0000-0000-000000000001', email: 'admin-test@edtechra.com', role: 'admin' }
    };
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  if (!token) {
    console.warn('[verifyAuthUser] No Bearer token in Authorization header');
    return null;
  }
  if (!serverSupabase) {
    console.error('[verifyAuthUser] serverSupabase client is NOT initialized — check env vars VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  try {
    const { data: { user }, error } = await serverSupabase.auth.getUser(token);
    if (error || !user) {
      console.warn('[verifyAuthUser] Supabase getUser rejected token:', error?.message || 'Invalid or expired session');
      return null;
    }

    // Retrieve user profile
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      user,
      profile: profile || {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student',
        email: user.email || '',
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        role: user.email === 'roshanjoyal520@gmail.com' ? 'admin' : 'student'
      }
    };
  } catch (err) {
    console.error('[verifyAuthUser error]:', err);
    return null;
  }
}

// In-memory / file-based student posts store for resilient persistence
const POSTS_FILE = path.resolve(__dirname, 'server/data/posts_cache.json');
const LIKES_FILE = path.resolve(__dirname, 'server/data/likes_cache.json');

function loadPostsCache() {
  try {
    if (fs.existsSync(POSTS_FILE)) {
      return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading posts cache:', e);
  }
  return [];
}

function savePostsCache(posts) {
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving posts cache:', e);
  }
}

function loadLikesCache() {
  try {
    if (fs.existsSync(LIKES_FILE)) {
      return JSON.parse(fs.readFileSync(LIKES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading likes cache:', e);
  }
  return {};
}

function saveLikesCache(likes) {
  try {
    fs.writeFileSync(LIKES_FILE, JSON.stringify(likes, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving likes cache:', e);
  }
}

// In-memory / file-based student progress store for resilient persistence
const PROGRESS_FILE = path.resolve(__dirname, 'server/data/progress_cache.json');
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading progress cache:', e);
  }
  return {};
}

function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving progress cache:', e);
  }
}

// In-memory / file-based quiz store for resilient persistence
const QUIZ_FILE = path.resolve(__dirname, 'server/data/quiz_cache.json');
const QUIZ_ATTEMPTS_FILE = path.resolve(__dirname, 'server/data/quiz_attempts_cache.json');

function loadQuizCache() {
  try {
    if (fs.existsSync(QUIZ_FILE)) {
      return JSON.parse(fs.readFileSync(QUIZ_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading quiz cache:', e);
  }
  return [];
}

function saveQuizCache(quizzes) {
  try {
    fs.writeFileSync(QUIZ_FILE, JSON.stringify(quizzes, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving quiz cache:', e);
  }
}

function loadQuizAttemptsCache() {
  try {
    if (fs.existsSync(QUIZ_ATTEMPTS_FILE)) {
      return JSON.parse(fs.readFileSync(QUIZ_ATTEMPTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading quiz attempts cache:', e);
  }
  return [];
}

function saveQuizAttemptsCache(attempts) {
  try {
    fs.writeFileSync(QUIZ_ATTEMPTS_FILE, JSON.stringify(attempts, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving quiz attempts cache:', e);
  }
}

// In-memory / file-based YouTube Shorts library store
const YOUTUBE_SHORTS_FILE = path.resolve(__dirname, 'server/data/youtube_shorts_cache.json');

function loadShortsCache() {
  try {
    if (fs.existsSync(YOUTUBE_SHORTS_FILE)) {
      return JSON.parse(fs.readFileSync(YOUTUBE_SHORTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading YouTube Shorts cache:', e);
  }
  return [];
}

function saveShortsCache(shorts) {
  try {
    fs.writeFileSync(YOUTUBE_SHORTS_FILE, JSON.stringify(shorts, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving YouTube Shorts cache:', e);
  }
}

// In-memory / file-based One-Minute Reading library store
const READINGS_FILE = path.resolve(__dirname, 'server/data/readings_cache.json');
const READING_COMPLETIONS_FILE = path.resolve(__dirname, 'server/data/reading_completions_cache.json');

function loadReadingsCache() {
  try {
    if (fs.existsSync(READINGS_FILE)) {
      return JSON.parse(fs.readFileSync(READINGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading readings cache:', e);
  }
  return [];
}

function saveReadingsCache(readings) {
  try {
    fs.writeFileSync(READINGS_FILE, JSON.stringify(readings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving readings cache:', e);
  }
}

function loadReadingCompletionsCache() {
  try {
    if (fs.existsSync(READING_COMPLETIONS_FILE)) {
      return JSON.parse(fs.readFileSync(READING_COMPLETIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading reading completions cache:', e);
  }
  return [];
}

function saveReadingCompletionsCache(completions) {
  try {
    fs.writeFileSync(READING_COMPLETIONS_FILE, JSON.stringify(completions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving reading completions cache:', e);
  }
}

// In-memory / file-based Polls store
const POLLS_FILE = path.resolve(__dirname, 'server/data/polls_cache.json');
const POLL_VOTES_FILE = path.resolve(__dirname, 'server/data/poll_votes_cache.json');

function loadPollsCache() {
  try {
    if (fs.existsSync(POLLS_FILE)) {
      return JSON.parse(fs.readFileSync(POLLS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading polls cache:', e);
  }
  return [];
}

function savePollsCache(polls) {
  try {
    fs.writeFileSync(POLLS_FILE, JSON.stringify(polls, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving polls cache:', e);
  }
}

function loadPollVotesCache() {
  try {
    if (fs.existsSync(POLL_VOTES_FILE)) {
      return JSON.parse(fs.readFileSync(POLL_VOTES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading poll votes cache:', e);
  }
  return [];
}

function savePollVotesCache(votes) {
  try {
    fs.writeFileSync(POLL_VOTES_FILE, JSON.stringify(votes, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving poll votes cache:', e);
  }
}

// In-memory / file-based Sentence Reorder store
const REORDERS_FILE = path.resolve(__dirname, 'server/data/reorders_cache.json');
const REORDER_COMPLETIONS_FILE = path.resolve(__dirname, 'server/data/reorder_completions_cache.json');

function loadReordersCache() {
  try {
    if (fs.existsSync(REORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(REORDERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading reorders cache:', e);
  }
  return [];
}

function saveReordersCache(reorders) {
  try {
    fs.writeFileSync(REORDERS_FILE, JSON.stringify(reorders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving reorders cache:', e);
  }
}

function loadReorderCompletionsCache() {
  try {
    if (fs.existsSync(REORDER_COMPLETIONS_FILE)) {
      return JSON.parse(fs.readFileSync(REORDER_COMPLETIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading reorder completions cache:', e);
  }
  return [];
}

function saveReorderCompletionsCache(completions) {
  try {
    fs.writeFileSync(REORDER_COMPLETIONS_FILE, JSON.stringify(completions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving reorder completions cache:', e);
  }
}

// Helper: Extract YouTube video ID from URL or raw ID
function extractVideoId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/|youtu\.be\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) return youtuBeMatch[1];

  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  const embedMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  return null;
}

// ============================================================================
// API ROUTES: YOUTUBE & LEARNING
// ============================================================================

// 1. GET /api/youtube/shorts - Retrieve synchronized Shorts feed with filters
app.get('/api/youtube/shorts', async (req, res) => {
  try {
    const { category, search, difficulty, status = 'published' } = req.query;
    let shorts = await getCachedOrFetchShorts();

    // Filter by content status
    if (status !== 'all') {
      shorts = shorts.filter(s => (s.learning_content?.status || 'published') === status);
    }

    // Filter by category
    if (category && category !== 'All') {
      shorts = shorts.filter(s => s.category?.toLowerCase() === category.toLowerCase());
    }

    // Filter by difficulty
    if (difficulty && difficulty !== 'All') {
      shorts = shorts.filter(s => s.difficulty === difficulty);
    }

    // Filter by search query (title, description, category, vocabulary)
    if (search && search.trim()) {
      const q = search.toLowerCase();
      shorts = shorts.filter(s => {
        const titleMatch = s.title?.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q);
        const catMatch = s.category?.toLowerCase().includes(q);
        const vocabMatch = s.learning_content?.vocabulary?.some(v => v.word?.toLowerCase().includes(q));
        return titleMatch || descMatch || catMatch || vocabMatch;
      });
    }

    res.json({
      success: true,
      count: shorts.length,
      data: shorts
    });
  } catch (error) {
    console.error('Error in /api/youtube/shorts:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve learning Shorts' });
  }
});

// 2. GET /api/youtube/video/:id - Retrieve single Short with full learning content
app.get('/api/youtube/video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shorts = await getCachedOrFetchShorts();
    const video = shorts.find(s => s.youtube_video_id === id || s.id === id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Learning video not found' });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Error in /api/youtube/video/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve video details' });
  }
});

// 3. POST /api/youtube/sync - Trigger sync with @EdTechraBitz YouTube channel
app.post('/api/youtube/sync', async (req, res) => {
  try {
    console.log('[API] Triggering channel synchronization from @EdTechraBitz...');
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const result = await syncYouTubeChannel('manual', token);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in /api/youtube/sync:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync with YouTube' });
  }
});

// 4. GET /api/youtube/sync-status - Retrieve synchronization metrics for Admin Panel
app.get('/api/youtube/sync-status', (req, res) => {
  res.json({
    success: true,
    stats: getSyncStatus(),
    channelId: VERIFIED_CHANNEL_ID,
    webSubTopic: WEBSUB_TOPIC_URL,
    webSubHub: WEBSUB_HUB_URL
  });
});

// 5. WEBSUB / PUBSUBHUBBUB WEBHOOK ENDPOINT FOR REAL-TIME DETECTION
// GET /api/youtube/webhook - Google Hub verification challenge
app.get('/api/youtube/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const topic = req.query['hub.topic'];
  const challenge = req.query['hub.challenge'];

  console.log(`[WebSub Webhook Verification] mode=${mode}, topic=${topic}`);
  if (challenge) {
    console.log(`[WebSub Webhook Verification] Challenge accepted, returning 200.`);
    return res.status(200).send(challenge);
  }
  res.status(200).send('EdTechra-Bitz WebSub Webhook Endpoint Active');
});

// POST /api/youtube/webhook - Incoming push notification from YouTube upon new upload
app.post('/api/youtube/webhook', async (req, res) => {
  console.log(`\n[WebSub Webhook Notification] Received at ${new Date().toISOString()}`);
  
  // Acknowledge immediately to Google PubSubHubbub with 200 OK
  res.status(200).send('Notification received');

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const videoIdMatch = rawBody.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (videoId) {
      console.log(`[WebSub Webhook] New video published: ${videoId}`);
    } else {
      console.log('[WebSub Webhook] Feed update notification received.');
    }

    // Trigger automatic synchronization to discover & ingest the new video
    await syncYouTubeChannel('webhook');
  } catch (err) {
    console.error('[WebSub Webhook Notification Error]:', err);
  }
});

// 6. SCHEDULED BACKUP CRON ENDPOINT
// GET /api/youtube/cron-sync - For Vercel Cron, external crons, or background triggers
app.all('/api/youtube/cron-sync', async (req, res) => {
  try {
    console.log(`[Cron Sync] Triggered at ${new Date().toISOString()}`);
    const result = await syncYouTubeChannel('cron');
    res.json(result);
  } catch (err) {
    console.error('[Cron Sync Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. PUT /api/youtube/content/:id - Admin edit vocabulary, quiz, or status
app.put('/api/youtube/content/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { vocabulary, quiz, summary, key_takeaway, status } = req.body;
    const cache = loadLocalCache();
    const videoIndex = cache.findIndex(v => v.youtube_video_id === id || v.id === id);

    if (videoIndex === -1) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    if (vocabulary) cache[videoIndex].learning_content.vocabulary = vocabulary;
    if (quiz) cache[videoIndex].learning_content.quiz = quiz;
    if (summary) cache[videoIndex].learning_content.summary = summary;
    if (key_takeaway) cache[videoIndex].learning_content.key_takeaway = key_takeaway;
    if (status) cache[videoIndex].learning_content.status = status;

    saveLocalCache(cache);
    res.json({ success: true, data: cache[videoIndex] });
  } catch (error) {
    console.error('Error in /api/youtube/content/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to update learning content' });
  }
});

// 7b. POST /api/youtube/thumbnail-presign - Generate secure presigned URL for lesson thumbnail upload
app.post('/api/youtube/thumbnail-presign', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (authData.profile.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Administrator privilege required to manage video thumbnails.' });
    }

    const { videoId, filename, contentType = 'image/webp', size } = req.body;
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Video/Lesson ID is required.' });
    }

    try {
      validateImageUpload({ contentType, size });
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    let ext = 'webp';
    if (contentType === 'image/png' || filename?.toLowerCase().endsWith('.png')) ext = 'png';
    else if (contentType === 'image/jpeg' || contentType === 'image/jpg' || filename?.toLowerCase().endsWith('.jpg') || filename?.toLowerCase().endsWith('.jpeg')) ext = 'jpg';

    const cleanVideoId = sanitizeSegment(videoId) || 'video';
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const objectKey = `thumbnails/${cleanVideoId}/${timestamp}_${randomSuffix}.${ext}`;

    const presigned = buildPresignedUpload({
      objectKey,
      contentType
    });

    res.json({
      success: true,
      data: presigned
    });
  } catch (error) {
    console.error('Error in /api/youtube/thumbnail-presign:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate thumbnail upload URL' });
  }
});

// 7c. PUT /api/youtube/video/:id/thumbnail - Save thumbnail URL to Supabase and refresh cache
app.put('/api/youtube/video/:id/thumbnail', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (authData.profile.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Administrator privilege required to manage video thumbnails.' });
    }

    const { id } = req.params;
    const { thumbnailUrl } = req.body;

    if (!thumbnailUrl || typeof thumbnailUrl !== 'string' || !thumbnailUrl.startsWith('http')) {
      return res.status(400).json({ success: false, error: 'A valid thumbnail URL is required.' });
    }

    // 1. Authoritative Update in Supabase public.youtube_videos
    if (serverSupabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let updateQuery = serverSupabase
        .from('youtube_videos')
        .update({
          thumbnail_url: thumbnailUrl,
          updated_at: new Date().toISOString()
        });

      if (isUuid) {
        updateQuery = updateQuery.eq('id', id);
      } else {
        updateQuery = updateQuery.eq('youtube_video_id', id);
      }

      const { data: updatedRows, error: dbErr } = await updateQuery.select('id, youtube_video_id, thumbnail_url');

      if (dbErr) {
        console.error('[Supabase update thumbnail error]:', dbErr);
        return res.status(500).json({ success: false, error: 'Database update failed: ' + dbErr.message });
      }

      console.log(`[Supabase Thumbnail Update] Successfully updated video (${id}):`, updatedRows);
    }

    // 2. Synchronize local cache
    const cache = loadLocalCache();
    const videoIndex = cache.findIndex(v => v.youtube_video_id === id || v.id === id);
    if (videoIndex !== -1) {
      cache[videoIndex].thumbnail_url = thumbnailUrl;
      cache[videoIndex].updated_at = new Date().toISOString();
      saveLocalCache(cache);
    }

    res.json({
      success: true,
      message: 'Thumbnail updated successfully.',
      thumbnailUrl
    });
  } catch (error) {
    console.error('Error in PUT /api/youtube/video/:id/thumbnail:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update video thumbnail' });
  }
});

// 8. POST /api/youtube/progress - Save student progress
app.post('/api/youtube/progress', (req, res) => {
  try {
    const { userId = 'guest-user', videoId, watched, watchProgress, quizCompleted, quizScore, quizTotal, completed } = req.body;
    const progressMap = loadProgress();

    if (!progressMap[userId]) {
      progressMap[userId] = {};
    }

    const prev = progressMap[userId][videoId] || {};
    const newScore = quizScore !== undefined ? quizScore : prev.quiz_score || 0;
    const bestScore = Math.max(prev.best_quiz_score || 0, newScore);
    const attempts = (prev.attempts_count || 0) + (quizScore !== undefined ? 1 : 0);

    progressMap[userId][videoId] = {
      user_id: userId,
      youtube_video_id: videoId,
      watched: watched !== undefined ? watched : prev.watched || false,
      watch_progress: watchProgress !== undefined ? watchProgress : prev.watch_progress || 0,
      quiz_completed: quizCompleted !== undefined ? quizCompleted : prev.quiz_completed || false,
      quiz_score: newScore,
      best_quiz_score: bestScore,
      attempts_count: attempts,
      quiz_total: quizTotal !== undefined ? quizTotal : prev.quiz_total || 3,
      completed: completed !== undefined ? completed : prev.completed || false,
      last_watched_at: new Date().toISOString()
    };

    saveProgress(progressMap);
    res.json({ success: true, data: progressMap[userId][videoId] });
  } catch (error) {
    console.error('Error in /api/youtube/progress:', error);
    res.status(500).json({ success: false, error: 'Failed to save progress' });
  }
});

// 8b. GET /api/youtube/progress-map/:userId - Retrieve raw progress map for level locking logic
app.get('/api/youtube/progress-map/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const progressMap = loadProgress();
    res.json({
      success: true,
      data: progressMap[userId] || {}
    });
  } catch (error) {
    console.error('Error in /api/youtube/progress-map/:userId:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve progress map' });
  }
});

// 9. GET /api/youtube/progress/:userId - Get progress stats for dashboard
app.get('/api/youtube/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const progressMap = loadProgress();
    const userProgress = progressMap[userId] || {};

    const progressList = Object.values(userProgress);
    const shorts = await getCachedOrFetchShorts();
    const shortsMap = new Map(shorts.map(s => [s.youtube_video_id, s]));

    const shortsWatched = progressList.filter(p => p.watched).length;
    const quizzesCompleted = progressList.filter(p => p.quiz_completed).length;
    const totalQuizScore = progressList.reduce((acc, p) => acc + (p.quiz_score || 0), 0);
    const totalQuizPossible = progressList.reduce((acc, p) => acc + (p.quiz_total || 3), 0);
    const averageQuizScore = totalQuizPossible > 0 ? Math.round((totalQuizScore / totalQuizPossible) * 100) : 0;
    const vocabularyLearned = progressList.filter(p => p.completed).length * 3;
    const totalCompleted = progressList.filter(p => p.completed).length;
    const learningProgressPercent = Math.min(100, Math.round((totalCompleted / Math.max(1, shorts.length)) * 100));

    const recentHistory = progressList
      .filter(p => p.last_watched_at)
      .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())
      .slice(0, 5)
      .map(p => {
        const vid = shortsMap.get(p.youtube_video_id);
        return {
          id: p.youtube_video_id,
          title: vid ? vid.title : 'Microlearning Bit',
          category: vid ? vid.category : 'General',
          score: `${p.quiz_score || 0}/${p.quiz_total || 3}`,
          completed: p.completed || false,
          date: p.last_watched_at
        };
      });

    res.json({
      success: true,
      stats: {
        shortsWatched,
        quizzesCompleted,
        averageQuizScore,
        learningProgressPercent,
        vocabularyLearned,
        totalCompleted,
        recentHistory
      }
    });
  } catch (error) {
    console.error('Error in /api/youtube/progress/:userId:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve user progress' });
  }
});

// Periodic background backup sync (runs every 60 minutes if server daemon is active)
const BACKUP_SYNC_INTERVAL = 60 * 60 * 1000;
setInterval(() => {
  console.log('[Daemon Scheduler] Running periodic backup YouTube synchronization...');
  syncYouTubeChannel('scheduled_backup').catch(err => {
    console.error('[Daemon Scheduler Error]:', err.message);
  });
}, BACKUP_SYNC_INTERVAL);

// ============================================================================
// API ROUTES: STUDENT POST FEED & CLOUDFLARE R2 STORAGE
// ============================================================================

// 1. POST /api/posts/presign-upload - Generate secure presigned upload URL for direct R2 upload
app.post('/api/posts/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to upload media.' });
    }

    const { filename, contentType = 'image/webp', size } = req.body;

    try {
      validateImageUpload({ contentType, size });
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    const objectKey = buildObjectKey({
      userId: authData.user.id,
      filename,
      contentType
    });

    const presigned = buildPresignedUpload({
      objectKey,
      contentType
    });

    res.json({
      success: true,
      data: presigned
    });
  } catch (error) {
    console.error('Error in /api/posts/presign-upload:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate upload URL' });
  }
});

// POST /api/profile/presign-avatar - Generate presigned upload URL for user avatar
app.post('/api/profile/presign-avatar', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to update avatar.' });
    }

    const { contentType = 'image/webp', size } = req.body;

    try {
      validateImageUpload({ contentType, size });
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    const objectKey = buildAvatarObjectKey({
      userId: authData.user.id,
      contentType
    });

    const presigned = buildPresignedUpload({
      objectKey,
      contentType
    });

    res.json({
      success: true,
      data: presigned
    });
  } catch (error) {
    console.error('Error in /api/profile/presign-avatar:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate avatar upload URL' });
  }
});

// 2. POST /api/posts - Create student post record
app.post('/api/posts', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to create a post.' });
    }

    const {
      caption,
      image_url,
      image_object_key,
      storage_provider = 'r2',
      image_width,
      image_height,
      image_size_bytes,
      image_format = 'webp'
    } = req.body;

    if (!caption || !caption.trim()) {
      return res.status(400).json({ success: false, error: 'Post caption is required.' });
    }

    if (!image_url || !image_object_key) {
      return res.status(400).json({ success: false, error: 'Uploaded square image is required.' });
    }

    const now = new Date().toISOString();
    const newPost = {
      id: crypto.randomUUID(),
      user_id: authData.user.id,
      caption: caption.trim(),
      image_url,
      image_object_key,
      storage_provider,
      status: 'pending',
      moderation_status: 'pending',
      moderation_reason: null,
      moderated_at: null,
      likes_count: 0,
      comments_count: 0,
      image_width: image_width ? Number(image_width) : null,
      image_height: image_height ? Number(image_height) : null,
      image_size_bytes: image_size_bytes ? Number(image_size_bytes) : null,
      image_format,
      created_at: now,
      updated_at: now
    };

    // 2. Perform Automated AI Moderation via OpenAI omni-moderation-latest
    const moderation = await moderatePostContent({
      postId: newPost.id,
      imageUrl: image_url,
      caption: newPost.caption
    });

    const postWithAuthor = {
      ...newPost,
      author: authData.profile
    };

    // Case 1: AI Rejected -> Delete R2 file, update status to rejected, return guidelines error
    if (moderation.status === 'rejected') {
      console.log(`[Moderation] Post ${newPost.id} REJECTED by AI. Reason: ${moderation.reason}. Deleting R2 media...`);
      newPost.status = 'rejected';
      newPost.moderation_status = 'rejected';
      newPost.moderation_reason = moderation.reason;
      newPost.moderated_at = new Date().toISOString();

      // Delete the R2 image object immediately to prevent orphaned storage
      try {
        await deleteObjects([image_object_key]);
      } catch (delErr) {
        console.error('[R2 Cleanup Warning] Failed to delete rejected post image:', delErr.message);
      }

      // Save rejected record to cache for auditing
      const postsCache = loadPostsCache();
      postsCache.unshift(newPost);
      savePostsCache(postsCache);

      if (serverSupabase) {
        try {
          await serverSupabase.from('student_posts').insert([newPost]);
        } catch (sbErr) {
          // Ignore
        }
      }

      return res.status(422).json({
        success: false,
        error: "This image cannot be published because it does not meet EdTechra's community guidelines.",
        moderation: {
          status: 'rejected',
          reason: moderation.reason
        }
      });
    }

    // Case 2: AI Uncertain / API Error -> Mark for manual admin review (DO NOT publish)
    if (moderation.status === 'review') {
      console.log(`[Moderation] Post ${newPost.id} marked for ADMIN REVIEW. Reason: ${moderation.reason}`);
      newPost.status = 'review';
      newPost.moderation_status = 'review';
      newPost.moderation_reason = moderation.reason;
      newPost.moderated_at = new Date().toISOString();

      const postsCache = loadPostsCache();
      postsCache.unshift(newPost);
      savePostsCache(postsCache);

      if (serverSupabase) {
        try {
          await serverSupabase.from('student_posts').insert([newPost]);
        } catch (sbErr) {
          console.warn('[Supabase student_posts insert notice]:', sbErr.message);
        }
      }

      return res.status(202).json({
        success: true,
        message: 'Your post is waiting for review.',
        data: {
          ...newPost,
          author: authData.profile
        },
        moderation: {
          status: 'review',
          reason: moderation.reason
        }
      });
    }

    // Case 3: AI Approved -> Mark approved and publish to public feed
    newPost.status = 'approved';
    newPost.moderation_status = 'approved';
    newPost.moderation_reason = moderation.reason;
    newPost.moderated_at = new Date().toISOString();

    // Save to resilient local posts cache
    const postsCache = loadPostsCache();
    postsCache.unshift(newPost);
    savePostsCache(postsCache);

    // Save to Supabase student_posts table if available
    if (serverSupabase) {
      try {
        const { error: sbErr } = await serverSupabase.from('student_posts').insert([newPost]);
        if (sbErr) {
          console.error('[Supabase student_posts insert error]:', sbErr.message, sbErr.code);
        } else {
          console.log('[Supabase student_posts] Post created in database successfully:', newPost.id);
        }
      } catch (sbErr) {
        console.error('[Supabase student_posts insert exception]:', sbErr.message);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...newPost,
        author: authData.profile
      },
      moderation: {
        status: 'approved'
      }
    });
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create student post' });
  }
});

// 3. GET /api/posts - Retrieve paginated student posts ordered newest -> oldest (APPROVED ONLY)
app.get('/api/posts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const sort = req.query.sort || 'newest';

    const authData = await verifyAuthUser(req);
    const currentUserId = authData?.user?.id || null;

    let allPosts = loadPostsCache();
    const likesMap = loadLikesCache();

    // If Supabase is available, attempt to query latest records
    if (serverSupabase) {
      try {
        const { data: dbPosts, error: dbErr } = await serverSupabase
          .from('student_posts')
          .select('*, profiles(id, full_name, email, avatar_url, role)')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (dbErr) {
          console.warn('[Supabase GET student_posts error]:', dbErr.message);
        } else if (Array.isArray(dbPosts)) {
          allPosts = dbPosts.map(p => ({
            ...p,
            author: p.profiles || {
              id: p.user_id,
              full_name: 'Student',
              email: '',
              role: 'student'
            }
          }));
          savePostsCache(allPosts);
        }
      } catch (e) {
        console.error('[Supabase GET student_posts exception]:', e);
      }
    }

    // Attach profile info from profiles cache / metadata for cached items
    if (serverSupabase && allPosts.length > 0 && !allPosts[0].author) {
      try {
        const userIds = Array.from(new Set(allPosts.map(p => p.user_id)));
        const { data: profiles } = await serverSupabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, role')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(pr => [pr.id, pr]));
        allPosts = allPosts.map(p => ({
          ...p,
          author: profileMap.get(p.user_id) || {
            id: p.user_id,
            full_name: 'EdTechra Student',
            email: '',
            role: 'student'
          }
        }));
      } catch (e) {
        // Keep existing
      }
    }

    // STRICT FEED FILTER: Only approved posts appear in the public feed
    allPosts = allPosts.filter(p => p.status === 'approved');

    // Sorting
    if (sort === 'popular') {
      allPosts.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else {
      // Default: Newest first (created_at DESC, secondary id tiebreaker)
      allPosts.sort((a, b) => {
        const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (timeDiff !== 0) return timeDiff;
        return String(b.id).localeCompare(String(a.id));
      });
    }

    const total = allPosts.length;
    const startIndex = (page - 1) * limit;
    const paginated = allPosts.slice(startIndex, startIndex + limit);

    // Attach per-user like state
    const formattedPosts = paginated.map(p => {
      const postLikes = likesMap[p.id] || [];
      const isLiked = currentUserId ? postLikes.includes(currentUserId) : false;
      const actualCount = Math.max(p.likes_count || 0, postLikes.length);
      return {
        ...p,
        likes_count: actualCount,
        is_liked_by_me: isLiked
      };
    });

    res.json({
      success: true,
      posts: formattedPosts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: startIndex + limit < total
    });
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve post feed' });
  }
});

// 4. DELETE /api/posts/:id - Permanently delete student post & delete associated R2 object
app.delete('/api/posts/:id', async (req, res) => {
  try {
    // 1. Authenticate requester
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to delete posts.' });
    }

    const { id } = req.params;
    const postsCache = loadPostsCache();
    let post = postsCache.find(p => p.id === id);

    // 2. Query Supabase for the post to ensure existence and verify ownership
    if (serverSupabase) {
      try {
        const { data: dbPost, error: fetchErr } = await serverSupabase
          .from('student_posts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (dbPost) {
          post = dbPost;
        } else if (fetchErr) {
          console.warn('[Supabase fetch student_posts notice]:', fetchErr.message);
        }
      } catch (err) {
        console.error('[Supabase fetch student_posts exception]:', err);
      }
    }

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found or already deleted.' });
    }

    // 3. Verify owner/admin authorization
    const isOwner = post.user_id === authData.user.id;
    const isAdmin = authData.profile?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Permission denied: You cannot delete another student\'s post.' });
    }

    // 4. Delete from Supabase student_posts table (source of truth)
    if (serverSupabase) {
      try {
        const { error: sbDeleteErr } = await serverSupabase
          .from('student_posts')
          .delete()
          .eq('id', id);

        if (sbDeleteErr) {
          console.error('[Supabase delete student_posts error]:', sbDeleteErr.message);
          return res.status(500).json({ success: false, error: 'Failed to delete post from database: ' + sbDeleteErr.message });
        }
      } catch (sbErr) {
        console.error('[Supabase delete student_posts exception]:', sbErr);
        return res.status(500).json({ success: false, error: 'Database deletion error: ' + sbErr.message });
      }
    }

    // 5. Remove from in-memory / local JSON posts cache
    const updatedCache = postsCache.filter(p => p.id !== id);
    savePostsCache(updatedCache);

    // 6. Remove from likes cache
    try {
      const likesMap = loadLikesCache();
      if (likesMap[id]) {
        delete likesMap[id];
        saveLikesCache(likesMap);
      }
    } catch (e) {
      // Non-critical
    }

    // 7. Delete associated media object from Cloudflare R2 bucket (safe cleanup)
    if (post.image_object_key) {
      try {
        await deleteObjects([post.image_object_key]);
        console.log(`[R2] Cleaned up media object: ${post.image_object_key}`);
      } catch (r2Err) {
        console.error('[R2 Cleanup Notice]:', r2Err.message);
      }
    }

    // 8. Return success confirmation with deletedId
    res.json({
      success: true,
      deletedId: id,
      message: 'Post and media permanently deleted.'
    });
  } catch (error) {
    console.error('Error in DELETE /api/posts/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete post' });
  }
});

// 5. POST /api/posts/:id/like - Toggle like on post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to like posts.' });
    }

    const { id } = req.params;
    const userId = authData.user.id;

    const likesMap = loadLikesCache();
    if (!likesMap[id]) {
      likesMap[id] = [];
    }

    const userLikedIndex = likesMap[id].indexOf(userId);
    let liked = false;

    if (userLikedIndex >= 0) {
      likesMap[id].splice(userLikedIndex, 1);
      liked = false;
    } else {
      likesMap[id].push(userId);
      liked = true;
    }

    saveLikesCache(likesMap);

    // Update posts cache count
    const postsCache = loadPostsCache();
    const pIdx = postsCache.findIndex(p => p.id === id);
    if (pIdx >= 0) {
      postsCache[pIdx].likes_count = likesMap[id].length;
      savePostsCache(postsCache);
    }

    res.json({
      success: true,
      data: {
        liked,
        likesCount: likesMap[id].length
      }
    });
  } catch (error) {
    console.error('Error in /api/posts/:id/like:', error);
    res.status(500).json({ success: false, error: 'Failed to update like status' });
  }
});

// 6. POST /api/posts/rollback-upload - Rollback orphaned R2 object if post creation failed
app.post('/api/posts/rollback-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const { objectKey } = req.body;
    if (objectKey && typeof objectKey === 'string') {
      await deleteObjects([objectKey]);
      console.log(`[R2 Rollback] Cleaned up orphaned object: ${objectKey}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /api/posts/rollback-upload:', error);
    res.status(500).json({ success: false, error: 'Rollback failed' });
  }
});

// 7. GET /api/posts/r2-status - Safe diagnostic endpoint for R2 configuration
app.get('/api/posts/r2-status', (req, res) => {
  const config = getR2Config();
  res.json({
    success: true,
    isConfigured: config.isConfigured,
    bucket: config.bucket,
    publicBaseUrl: config.publicBaseUrl,
    endpointHost: config.endpoint ? new URL(config.endpoint).host : null
  });
});

// HEALTH CHECK: GET /api/health - Shows which environment variables are configured (no secrets leaked)
app.get('/api/health', (req, res) => {
  const checks = {
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    R2_ENDPOINT: !!process.env.R2_ENDPOINT,
    R2_BUCKET: !!process.env.R2_BUCKET,
    R2_PUBLIC_URL: !!process.env.R2_PUBLIC_URL,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY
  };

  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const serverSupabaseReady = !!serverSupabase;

  res.json({
    status: missing.length === 0 ? 'healthy' : 'unhealthy',
    serverSupabaseInitialized: serverSupabaseReady,
    env: checks,
    missing,
    message: missing.length === 0
      ? 'All environment variables are configured.'
      : `MISSING environment variables: ${missing.join(', ')}. Add them in Vercel Dashboard → Settings → Environment Variables, then redeploy.`,
    nodeEnv: process.env.NODE_ENV || 'undefined',
    timestamp: new Date().toISOString()
  });
});

// 8. GET /api/admin/moderation/posts - Admin-only queue for review / pending / rejected posts
app.get('/api/admin/moderation/posts', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin authorization required.' });
    }

    const filterStatus = req.query.status || 'review'; // 'review' | 'pending' | 'rejected' | 'all'
    let allPosts = loadPostsCache();

    if (serverSupabase) {
      try {
        let query = serverSupabase
          .from('student_posts')
          .select('*, profiles(id, full_name, email, avatar_url, role)')
          .order('created_at', { ascending: false });

        if (filterStatus !== 'all') {
          query = query.eq('status', filterStatus);
        }

        const { data: dbPosts, error: dbErr } = await query;
        if (!dbErr && Array.isArray(dbPosts)) {
          allPosts = dbPosts.map(p => ({
            ...p,
            author: p.profiles || {
              id: p.user_id,
              full_name: 'Student',
              email: '',
              role: 'student'
            }
          }));
        }
      } catch (e) {
        // Fallback to cache
      }
    }

    if (filterStatus !== 'all') {
      allPosts = allPosts.filter(p => p.status === filterStatus);
    }

    res.json({
      success: true,
      posts: allPosts,
      total: allPosts.length
    });
  } catch (error) {
    console.error('Error in GET /api/admin/moderation/posts:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve moderation queue.' });
  }
});

// 9. POST /api/admin/moderation/posts/:id/action - Admin approve or reject action
app.post('/api/admin/moderation/posts/:id/action', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin authorization required.' });
    }

    const { id } = req.params;
    const { action, reason = '' } = req.body; // action: 'approve' | 'reject'

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, error: 'Invalid action. Must be approve or reject.' });
    }

    const postsCache = loadPostsCache();
    const postIndex = postsCache.findIndex(p => p.id === id);

    if (postIndex === -1) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const post = postsCache[postIndex];
    const now = new Date().toISOString();

    if (action === 'approve') {
      post.status = 'approved';
      post.moderation_status = 'approved';
      post.moderation_reason = reason || 'Manually approved by admin.';
      post.moderated_at = now;
      post.updated_at = now;
    } else {
      post.status = 'rejected';
      post.moderation_status = 'rejected';
      post.moderation_reason = reason || 'Manually rejected by admin.';
      post.moderated_at = now;
      post.updated_at = now;

      // Clean up R2 media object
      if (post.image_object_key) {
        try {
          await deleteObjects([post.image_object_key]);
          console.log(`[Admin Action] Deleted rejected R2 object: ${post.image_object_key}`);
        } catch (r2Err) {
          console.error('[Admin Action R2 Delete Warning]:', r2Err.message);
        }
      }
    }

    postsCache[postIndex] = post;
    savePostsCache(postsCache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('student_posts')
          .update({
            status: post.status,
            moderation_status: post.moderation_status,
            moderation_reason: post.moderation_reason,
            moderated_at: post.moderated_at,
            updated_at: post.updated_at
          })
          .eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase update moderation notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: `Post ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      data: post
    });
  } catch (error) {
    console.error('Error in POST /api/admin/moderation/posts/:id/action:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process moderation action.' });
  }
});

// ============================================================================
// API ROUTES: INTERACTIVE QUIZ BITS
// ============================================================================

// Helper: Fisher-Yates array shuffle
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 1. POST /api/quiz/import - Admin batch import quizzes with server-side validation
app.post('/api/quiz/import', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required to import quizzes.' });
    }

    const { quizzes } = req.body;
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid payload: "quizzes" must be a non-empty array.' });
    }

    const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    const validQuizzes = [];
    const errors = [];
    const seenBatchQuestions = new Set();

    quizzes.forEach((item, index) => {
      const itemErrors = [];
      const question = typeof item?.question === 'string' ? item.question.trim() : '';

      if (!question) {
        itemErrors.push('Question text is missing or empty.');
      } else {
        const normQ = question.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenBatchQuestions.has(normQ)) {
          itemErrors.push('Duplicate question in this import batch.');
        } else {
          seenBatchQuestions.add(normQ);
        }
      }

      const options = Array.isArray(item?.options) ? item.options.map(opt => String(opt ?? '').trim()) : [];
      if (!Array.isArray(item?.options) || options.length !== 4) {
        itemErrors.push(`Options must be an array of exactly 4 items (found ${options.length}).`);
      } else {
        if (options.some(opt => opt.length === 0)) {
          itemErrors.push('All 4 options must be non-empty strings.');
        }
        const uniqueOptSet = new Set(options.map(o => o.toLowerCase()));
        if (uniqueOptSet.size < 4) {
          itemErrors.push('All 4 options must be unique.');
        }
      }

      const rawCorrect = item?.correctAnswer ?? item?.correct_answer;
      const correctAnswer = typeof rawCorrect === 'string' ? rawCorrect.trim() : String(rawCorrect ?? '').trim();
      if (!correctAnswer) {
        itemErrors.push('correctAnswer is required.');
      } else if (options.length === 4) {
        const match = options.find(opt => opt === correctAnswer);
        if (!match) {
          itemErrors.push(`correctAnswer "${correctAnswer}" does not match any of the 4 options: [${options.join(', ')}].`);
        }
      }

      const explanation = typeof item?.explanation === 'string' ? item.explanation.trim() : '';
      if (!explanation) {
        itemErrors.push('Explanation text is missing or empty.');
      }

      const category = typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : 'General';
      const difficulty = typeof item?.difficulty === 'string' && ['Easy', 'Medium', 'Hard'].includes(item.difficulty.trim())
        ? item.difficulty.trim()
        : 'Easy';

      let xp = typeof item?.xp === 'number' ? item.xp : parseInt(item?.xp, 10);
      if (isNaN(xp) || xp <= 0) xp = 10;

      if (itemErrors.length > 0) {
        errors.push({
          index: index + 1,
          question: question ? question.substring(0, 60) : `Quiz #${index + 1}`,
          errors: itemErrors
        });
      } else {
        validQuizzes.push({
          id: crypto.randomUUID(),
          question,
          options,
          correct_answer: correctAnswer,
          explanation,
          category,
          difficulty,
          xp,
          is_published: true, // Imported quizzes default to published
          created_by: authData.user.id,
          import_batch_id: batchId,
          created_at: now,
          updated_at: now
        });
      }
    });

    if (validQuizzes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid quizzes found in batch.',
        data: { importedCount: 0, failedCount: errors.length, batchId, errors }
      });
    }

    // Persist to local cache
    const currentQuizCache = loadQuizCache();
    const updatedCache = [...validQuizzes, ...currentQuizCache];
    saveQuizCache(updatedCache);

    // Persist to Supabase if connected
    if (serverSupabase) {
      try {
        const { error: sbInsertErr } = await serverSupabase
          .from('quiz_bits')
          .insert(validQuizzes);
        if (sbInsertErr) {
          console.warn('[Supabase quiz_bits insert warning]:', sbInsertErr.message);
        }
      } catch (sbErr) {
        console.warn('[Supabase quiz_bits batch insert notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${validQuizzes.length} quiz bit${validQuizzes.length === 1 ? '' : 's'}.`,
      data: {
        importedCount: validQuizzes.length,
        failedCount: errors.length,
        batchId,
        quizzes: validQuizzes,
        errors
      }
    });
  } catch (error) {
    console.error('Error in POST /api/quiz/import:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to import quiz batch.' });
  }
});

// 2. GET /api/quiz/admin - Retrieve all quizzes with filters & stats for admin
app.get('/api/quiz/admin', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { search, category, difficulty, published, page = 1, limit = 50 } = req.query;
    let allQuizzes = loadQuizCache();

    // Query Supabase for latest records if available
    if (serverSupabase) {
      try {
        const { data: sbQuizzes, error: sbErr } = await serverSupabase
          .from('quiz_bits')
          .select('*')
          .order('created_at', { ascending: false });
        if (!sbErr && sbQuizzes && sbQuizzes.length > 0) {
          allQuizzes = sbQuizzes;
          saveQuizCache(allQuizzes);
        }
      } catch (sbErr) {
        console.warn('[Supabase load quizzes notice]:', sbErr.message);
      }
    }

    // Attach attempt counts
    const attempts = loadQuizAttemptsCache();
    const attemptsCountMap = {};
    attempts.forEach(a => {
      attemptsCountMap[a.quiz_id] = (attemptsCountMap[a.quiz_id] || 0) + 1;
    });

    allQuizzes = allQuizzes.map(q => ({
      ...q,
      attempt_count: attemptsCountMap[q.id] || 0
    }));

    // Compute stats
    const totalQuizzes = allQuizzes.length;
    const publishedQuizzes = allQuizzes.filter(q => q.is_published).length;
    const unpublishedQuizzes = totalQuizzes - publishedQuizzes;
    const totalAttempts = attempts.length;
    const totalXpAwarded = attempts.reduce((sum, a) => sum + (a.xp_awarded || 0), 0);
    const uniqueBatches = new Set(allQuizzes.map(q => q.import_batch_id).filter(Boolean));

    const stats = {
      totalQuizzes,
      publishedQuizzes,
      unpublishedQuizzes,
      totalAttempts,
      totalXpAwarded,
      totalBatches: uniqueBatches.size
    };

    // Apply filters
    let filtered = [...allQuizzes];

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(quiz =>
        quiz.question?.toLowerCase().includes(q) ||
        quiz.explanation?.toLowerCase().includes(q) ||
        quiz.category?.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(quiz =>
        quiz.category?.toLowerCase() === String(category).toLowerCase()
      );
    }

    if (difficulty && difficulty !== 'all') {
      filtered = filtered.filter(quiz =>
        quiz.difficulty?.toLowerCase() === String(difficulty).toLowerCase()
      );
    }

    if (published && published !== 'all') {
      const isPub = published === 'published' || published === 'true';
      filtered = filtered.filter(quiz => Boolean(quiz.is_published) === isPub);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        quizzes: paginated,
        stats,
        total: filtered.length,
        page: pageNum,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error in GET /api/quiz/admin:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch admin quizzes.' });
  }
});

// 3. PUT /api/quiz/:id - Update an existing quiz bit
app.put('/api/quiz/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { question, options, correct_answer, explanation, category, difficulty, xp, is_published } = req.body;

    const quizCache = loadQuizCache();
    const index = quizCache.findIndex(q => q.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Quiz bit not found.' });
    }

    const existing = quizCache[index];
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      question: question !== undefined ? String(question).trim() : existing.question,
      options: Array.isArray(options) && options.length === 4 ? options.map(o => String(o).trim()) : existing.options,
      correct_answer: correct_answer !== undefined ? String(correct_answer).trim() : existing.correct_answer,
      explanation: explanation !== undefined ? String(explanation).trim() : existing.explanation,
      category: category !== undefined ? String(category).trim() : existing.category,
      difficulty: difficulty !== undefined ? String(difficulty).trim() : existing.difficulty,
      xp: xp !== undefined ? Number(xp) : existing.xp,
      is_published: is_published !== undefined ? Boolean(is_published) : existing.is_published,
      updated_at: now
    };

    quizCache[index] = updated;
    saveQuizCache(quizCache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('quiz_bits')
          .update({
            question: updated.question,
            options: updated.options,
            correct_answer: updated.correct_answer,
            explanation: updated.explanation,
            category: updated.category,
            difficulty: updated.difficulty,
            xp: updated.xp,
            is_published: updated.is_published,
            updated_at: updated.updated_at
          })
          .eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase quiz update notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Quiz updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Error in PUT /api/quiz/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update quiz.' });
  }
});

// 4. DELETE /api/quiz/:id - Delete a quiz bit
app.delete('/api/quiz/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    let quizCache = loadQuizCache();
    quizCache = quizCache.filter(q => q.id !== id);
    saveQuizCache(quizCache);

    // Also remove attempts
    let attemptsCache = loadQuizAttemptsCache();
    attemptsCache = attemptsCache.filter(a => a.quiz_id !== id);
    saveQuizAttemptsCache(attemptsCache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('quiz_bits').delete().eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase quiz delete notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /api/quiz/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete quiz.' });
  }
});

// 5. PUT /api/quiz/:id/publish - Toggle single quiz published state
app.put('/api/quiz/:id/publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { is_published } = req.body;

    const quizCache = loadQuizCache();
    const index = quizCache.findIndex(q => q.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Quiz not found.' });
    }

    const newPub = is_published !== undefined ? Boolean(is_published) : !quizCache[index].is_published;
    quizCache[index].is_published = newPub;
    quizCache[index].updated_at = new Date().toISOString();
    saveQuizCache(quizCache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('quiz_bits')
          .update({ is_published: newPub, updated_at: quizCache[index].updated_at })
          .eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase toggle publish notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: `Quiz ${newPub ? 'published' : 'unpublished'} successfully.`,
      data: quizCache[index]
    });
  } catch (error) {
    console.error('Error in PUT /api/quiz/:id/publish:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to toggle publication.' });
  }
});

// 6. PUT /api/quiz/batch-publish - Batch toggle published state
app.put('/api/quiz/batch-publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { ids, is_published } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of quiz IDs required.' });
    }

    const targetStatus = Boolean(is_published);
    const now = new Date().toISOString();
    const idSet = new Set(ids);

    const quizCache = loadQuizCache();
    quizCache.forEach(q => {
      if (idSet.has(q.id)) {
        q.is_published = targetStatus;
        q.updated_at = now;
      }
    });
    saveQuizCache(quizCache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('quiz_bits')
          .update({ is_published: targetStatus, updated_at: now })
          .in('id', ids);
      } catch (sbErr) {
        console.warn('[Supabase batch publish notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: `Updated publication status for ${ids.length} quizzes.`
    });
  } catch (error) {
    console.error('Error in PUT /api/quiz/batch-publish:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update batch publication.' });
  }
});

// 7. GET /api/quiz/feed - Get a randomized pool of published quizzes for feed insertion
app.get('/api/quiz/feed', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;

    let allQuizzes = loadQuizCache();

    // Query Supabase for latest published quizzes if available
    if (serverSupabase) {
      try {
        const { data: sbQuizzes, error: sbErr } = await serverSupabase
          .from('quiz_bits')
          .select('*')
          .eq('is_published', true);
        if (!sbErr && sbQuizzes && sbQuizzes.length > 0) {
          allQuizzes = sbQuizzes;
          // Refresh published entries in local cache
          const existing = loadQuizCache();
          const merged = [...sbQuizzes];
          existing.forEach(e => {
            if (!merged.some(m => m.id === e.id)) merged.push(e);
          });
          saveQuizCache(merged);
        }
      } catch (sbErr) {
        console.warn('[Supabase load feed quizzes notice]:', sbErr.message);
      }
    }

    let publishedQuizzes = allQuizzes.filter(q => q.is_published);

    if (publishedQuizzes.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Filter out quizzes user already completed correctly
    let candidatePool = publishedQuizzes;

    if (userId) {
      let userAttempts = [];
      if (serverSupabase) {
        try {
          const { data: sbAttempts } = await serverSupabase
            .from('quiz_attempts')
            .select('quiz_id, is_correct')
            .eq('user_id', userId)
            .eq('is_correct', true);
          if (sbAttempts) userAttempts = sbAttempts;
        } catch (e) {
          console.warn('[Supabase user attempts notice]:', e.message);
        }
      }

      if (userAttempts.length === 0) {
        const cachedAttempts = loadQuizAttemptsCache();
        userAttempts = cachedAttempts.filter(a => a.user_id === userId && a.is_correct);
      }

      const completedQuizIds = new Set(userAttempts.map(a => a.quiz_id));
      const unattempted = publishedQuizzes.filter(q => !completedQuizIds.has(q.id));

      // Prefer uncompleted quizzes; if all are completed, fall back to the full published pool
      if (unattempted.length > 0) {
        candidatePool = unattempted;
      }
    }

    // Shuffle and pick up to 12 quizzes
    const shuffled = shuffleArray(candidatePool);
    const feedPool = shuffled.slice(0, 12);

    res.json({
      success: true,
      data: feedPool
    });
  } catch (error) {
    console.error('Error in GET /api/quiz/feed:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve quiz feed pool.' });
  }
});

// 8. POST /api/quiz/attempt - Validate answer server-side and record attempt + XP
app.post('/api/quiz/attempt', async (req, res) => {
  try {
    const { quizId, selectedAnswer } = req.body;

    if (!quizId || selectedAnswer === undefined || selectedAnswer === null) {
      return res.status(400).json({ success: false, error: 'quizId and selectedAnswer are required.' });
    }

    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';

    // Find target quiz from Supabase or cache
    let quiz = null;
    if (serverSupabase) {
      try {
        const { data: sbQuiz, error: sbErr } = await serverSupabase
          .from('quiz_bits')
          .select('*')
          .eq('id', quizId)
          .maybeSingle();
        if (!sbErr && sbQuiz) {
          quiz = sbQuiz;
        }
      } catch (sbErr) {
        console.warn('[Supabase find quiz notice]:', sbErr.message);
      }
    }

    if (!quiz) {
      const quizCache = loadQuizCache();
      quiz = quizCache.find(q => q.id === quizId);
    }

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz bit not found.' });
    }

    // Compare answer
    const isCorrect = String(selectedAnswer).trim().toLowerCase() === String(quiz.correct_answer).trim().toLowerCase();

    // Check if XP was already awarded to this user for this quiz
    let alreadyAwarded = false;

    if (userId && userId !== 'guest_user') {
      if (serverSupabase) {
        try {
          const { data: previousAttempts } = await serverSupabase
            .from('quiz_attempts')
            .select('id, is_correct, xp_awarded')
            .eq('user_id', userId)
            .eq('quiz_id', quizId)
            .eq('is_correct', true);
          if (previousAttempts && previousAttempts.some(a => (a.xp_awarded || 0) > 0)) {
            alreadyAwarded = true;
          }
        } catch (e) {
          console.warn('[Supabase check previous attempt notice]:', e.message);
        }
      }

      if (!alreadyAwarded) {
        const cachedAttempts = loadQuizAttemptsCache();
        alreadyAwarded = cachedAttempts.some(
          a => a.user_id === userId && a.quiz_id === quizId && a.is_correct && (a.xp_awarded || 0) > 0
        );
      }
    }

    let xpAwarded = 0;
    let alreadyAttempted = false;

    if (isCorrect) {
      if (alreadyAwarded) {
        xpAwarded = 0;
        alreadyAttempted = true;
      } else {
        xpAwarded = quiz.xp || 10;
        alreadyAttempted = false;
      }
    } else {
      xpAwarded = 0;
      alreadyAttempted = false;
    }

    // Record attempt
    const attemptRecord = {
      id: crypto.randomUUID(),
      quiz_id: quizId,
      user_id: userId,
      selected_answer: String(selectedAnswer).trim(),
      is_correct: isCorrect,
      xp_awarded: xpAwarded,
      created_at: new Date().toISOString()
    };

    const attemptsCache = loadQuizAttemptsCache();
    attemptsCache.push(attemptRecord);
    saveQuizAttemptsCache(attemptsCache);

    if (serverSupabase && userId && userId !== 'guest_user') {
      try {
        await serverSupabase.from('quiz_attempts').insert({
          id: attemptRecord.id,
          quiz_id: attemptRecord.quiz_id,
          user_id: attemptRecord.user_id,
          selected_answer: attemptRecord.selected_answer,
          is_correct: attemptRecord.is_correct,
          xp_awarded: attemptRecord.xp_awarded,
          created_at: attemptRecord.created_at
        });
      } catch (sbErr) {
        console.warn('[Supabase save attempt notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_answer: quiz.correct_answer,
        explanation: quiz.explanation,
        xp_awarded: xpAwarded,
        already_attempted: alreadyAttempted
      }
    });
  } catch (error) {
    console.error('Error in POST /api/quiz/attempt:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit quiz attempt.' });
  }
});

// 9. GET /api/quiz/user-xp/:userId - Get total Quiz XP and correct completions count for student
app.get('/api/quiz/user-xp/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.json({ success: true, data: { totalXp: 0, completedCount: 0 } });
    }

    let attempts = [];
    if (serverSupabase) {
      try {
        const { data: sbAttempts } = await serverSupabase
          .from('quiz_attempts')
          .select('quiz_id, is_correct, xp_awarded')
          .eq('user_id', userId)
          .eq('is_correct', true);
        if (sbAttempts) attempts = sbAttempts;
      } catch (e) {
        console.warn('[Supabase user-xp notice]:', e.message);
      }
    }

    if (attempts.length === 0) {
      const cached = loadQuizAttemptsCache();
      attempts = cached.filter(a => a.user_id === userId && a.is_correct);
    }

    // Calculate total XP and unique completed quiz count
    const totalXp = attempts.reduce((sum, a) => sum + (a.xp_awarded || 0), 0);
    const uniqueQuizzes = new Set(attempts.map(a => a.quiz_id));

    res.json({
      success: true,
      data: {
        totalXp,
        completedCount: uniqueQuizzes.size
      }
    });
  } catch (error) {
    console.error('Error in GET /api/quiz/user-xp/:userId:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to compute user quiz stats.' });
  }
});

// ============================================================================
// API ROUTES: TOP 10 LEARNERS LEADERBOARD & SAFE RESETS
// ============================================================================

// In-memory fallback reset store if Supabase resets table is syncing
const inMemoryLeaderboardResets = {
  today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  month: new Date(new Date().setDate(1)).toISOString()
};

// 1. GET /api/leaderboard - Retrieve Top 10 Learners and Current User Ranking
app.get('/api/leaderboard', async (req, res) => {
  try {
    const period = String(req.query.period || 'week').toLowerCase().trim();
    const validPeriods = new Set(['today', 'week', 'month', 'all_time']);
    const selectedPeriod = validPeriods.has(period) ? period : 'week';

    // Optional user authentication for personal rank resolution
    const authData = await verifyAuthUser(req);
    const currentUserId = authData?.user?.id || null;

    if (serverSupabase) {
      try {
        const { data: rpcData, error: rpcError } = await serverSupabase.rpc('get_top_learners', {
          p_period: selectedPeriod,
          p_current_user_id: currentUserId
        });

        if (!rpcError && rpcData) {
          return res.json({
            success: true,
            data: rpcData
          });
        }
      } catch (rpcErr) {
        console.warn('[Leaderboard RPC fallback notice]:', rpcErr.message);
      }
    }

    // Resilient fallback aggregation if RPC is not yet applied
    let resetBoundary = null;
    if (selectedPeriod !== 'all_time') {
      if (serverSupabase) {
        const { data: resetRecord } = await serverSupabase
          .from('leaderboard_resets')
          .select('reset_at')
          .eq('period_type', selectedPeriod)
          .single();
        if (resetRecord?.reset_at) {
          resetBoundary = resetRecord.reset_at;
        }
      }
      if (!resetBoundary) {
        resetBoundary = inMemoryLeaderboardResets[selectedPeriod] || new Date(0).toISOString();
      }
    }

    const sinceDate = resetBoundary || '1970-01-01T00:00:00.000Z';

    // Fetch all profiles
    let profiles = [];
    if (serverSupabase) {
      const { data: sbProfiles } = await serverSupabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, created_at');
      if (sbProfiles) profiles = sbProfiles;
    }

    // Compute user XP map
    const userXpMap = new Map();

    // Starter bonus for all-time
    if (selectedPeriod === 'all_time') {
      profiles.forEach(p => {
        userXpMap.set(p.id, 100);
      });
    }

    // 1. Quiz Attempts XP
    if (serverSupabase) {
      const { data: qAttempts } = await serverSupabase
        .from('quiz_attempts')
        .select('user_id, xp_awarded')
        .eq('is_correct', true)
        .gte('created_at', sinceDate);
      (qAttempts || []).forEach(a => {
        const cur = userXpMap.get(a.user_id) || 0;
        userXpMap.set(a.user_id, cur + (a.xp_awarded || 10));
      });

      // 2. Sentence Reorders XP
      const { data: rCompletions } = await serverSupabase
        .from('reorder_completions')
        .select('user_id, xp_awarded')
        .eq('is_correct', true)
        .gte('completed_at', sinceDate);
      (rCompletions || []).forEach(c => {
        const cur = userXpMap.get(c.user_id) || 0;
        userXpMap.set(c.user_id, cur + (c.xp_awarded || 10));
      });

      // 3. Spelling Scrambles XP
      const { data: sCompletions } = await serverSupabase
        .from('spelling_scramble_completions')
        .select('user_id, xp_awarded')
        .eq('is_correct', true)
        .gte('completed_at', sinceDate);
      (sCompletions || []).forEach(c => {
        const cur = userXpMap.get(c.user_id) || 0;
        userXpMap.set(c.user_id, cur + (c.xp_awarded || 10));
      });

      // 4. Reading Completions XP
      const { data: readCompletions } = await serverSupabase
        .from('reading_completions')
        .select('user_id')
        .gte('completed_at', sinceDate);
      (readCompletions || []).forEach(c => {
        const cur = userXpMap.get(c.user_id) || 0;
        userXpMap.set(c.user_id, cur + 15);
      });

      // 5. Video Lessons XP
      const { data: vidProgress } = await serverSupabase
        .from('youtube_learning_progress')
        .select('user_id, last_watched_at, updated_at')
        .eq('completed', true);
      (vidProgress || []).forEach(v => {
        const vDate = v.last_watched_at || v.updated_at;
        if (!sinceDate || !vDate || new Date(vDate) >= new Date(sinceDate)) {
          const cur = userXpMap.get(v.user_id) || 0;
          userXpMap.set(v.user_id, cur + 40);
        }
      });
    }

    // Build ranked array
    const rankedList = profiles.map(p => {
      const xp = userXpMap.get(p.id) || (selectedPeriod === 'all_time' ? 100 : 0);
      const level = Math.max(1, Math.min(20, 1 + Math.floor(xp / 100)));
      const displayName = p.full_name?.trim() || (p.email ? p.email.split('@')[0] : 'Learner');
      return {
        userId: p.id,
        displayName,
        avatarUrl: p.avatar_url || null,
        xp,
        level,
        createdAt: p.created_at || new Date().toISOString()
      };
    })
    .filter(u => u.xp > 0 || selectedPeriod === 'all_time')
    .sort((a, b) => b.xp - a.xp || new Date(a.createdAt) - new Date(b.createdAt))
    .map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      displayName: item.displayName,
      avatarUrl: item.avatarUrl,
      xp: item.xp,
      level: item.level
    }));

    const top10 = rankedList.slice(0, 10);
    let currentUserRank = null;

    if (currentUserId) {
      const found = rankedList.find(u => u.userId === currentUserId);
      if (found) {
        currentUserRank = {
          ...found,
          isInTop10: found.rank <= 10
        };
      } else {
        const profile = profiles.find(p => p.id === currentUserId);
        const displayName = profile?.full_name?.trim() || (authData?.user?.email ? authData.user.email.split('@')[0] : 'Learner');
        currentUserRank = {
          rank: rankedList.length + 1,
          userId: currentUserId,
          displayName,
          avatarUrl: profile?.avatar_url || null,
          xp: selectedPeriod === 'all_time' ? 100 : 0,
          level: 1,
          isInTop10: false
        };
      }
    }

    res.json({
      success: true,
      data: {
        period: selectedPeriod,
        top10,
        currentUser: currentUserRank,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in GET /api/leaderboard:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch leaderboard.' });
  }
});

// 2. POST /api/leaderboard/reset - Safe Time-Period Reset (Strict Admin Authorization)
app.post('/api/leaderboard/reset', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userEmail = (authData?.user?.email || '').toLowerCase().trim();
    const userRole = authData?.profile?.role;
    const isAuthorizedAdmin = userEmail === 'roshanjoyal520@gmail.com' || userRole === 'admin';

    if (!authData || !isAuthorizedAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Administrator privilege required to reset leaderboard.'
      });
    }

    const { period } = req.body;
    if (!period || !['today', 'week', 'month'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be today, week, or month.'
      });
    }

    const now = new Date().toISOString();
    inMemoryLeaderboardResets[period] = now;

    if (serverSupabase) {
      try {
        const { error: rpcError } = await serverSupabase.rpc('reset_leaderboard_period', {
          p_period: period
        });

        if (rpcError) {
          console.warn('[Leaderboard RPC reset notice]:', rpcError.message);
          // Direct table upsert fallback
          await serverSupabase
            .from('leaderboard_resets')
            .upsert(
              {
                period_type: period,
                reset_at: now,
                reset_by: authData.user.id,
                updated_at: now
              },
              { onConflict: 'period_type' }
            );
        }
      } catch (dbErr) {
        console.warn('[Leaderboard reset database fallback notice]:', dbErr);
      }
    }

    res.json({
      success: true,
      message: `Leaderboard for ${period} successfully reset. Historical XP and learning records remain safe.`,
      period,
      resetAt: now
    });
  } catch (error) {
    console.error('Error in POST /api/leaderboard/reset:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reset leaderboard.' });
  }
});

// ============================================================================
// API ROUTES: YOUTUBE SHORTS FEED INTEGRATION & LIBRARY
// ============================================================================

// 1. POST /api/youtube/shorts - Create a new Short (Admin only)
app.post('/api/youtube/shorts', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin authorization required.' });
    }

    const { youtube_url, title, description, category, duration, linked_quiz_id, is_published } = req.body;

    if (!youtube_url || typeof youtube_url !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid YouTube URL is required.' });
    }

    const videoId = extractVideoId(youtube_url);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL or Video ID. Please enter a valid YouTube Shorts, watch, or youtu.be link.'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Short title is required.' });
    }

    // Duplicate Check: Supabase & Cache
    let existingShort = null;
    const currentShortsCache = loadShortsCache();
    existingShort = currentShortsCache.find(s => s.youtube_video_id === videoId);

    if (!existingShort && serverSupabase) {
      try {
        const { data: dbExisting } = await serverSupabase
          .from('youtube_shorts')
          .select('id, youtube_video_id')
          .eq('youtube_video_id', videoId)
          .maybeSingle();
        if (dbExisting) existingShort = dbExisting;
      } catch (e) {
        // Cache fallback already checked
      }
    }

    if (existingShort) {
      return res.status(409).json({
        success: false,
        error: `A YouTube Short with video ID '${videoId}' has already been added to the library.`
      });
    }

    const now = new Date().toISOString();
    const durationVal = Number(duration) > 0 ? Number(duration) : 30;
    const newShort = {
      id: crypto.randomUUID(),
      youtube_video_id: videoId,
      youtube_url: `https://www.youtube.com/shorts/${videoId}`,
      title: title.trim(),
      description: description ? description.trim() : null,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      category: category ? category.trim() : 'General',
      duration: durationVal,
      duration_formatted: `${durationVal}s`,
      is_published: Boolean(is_published),
      sort_order: 0,
      linked_quiz_id: linked_quiz_id || null,
      created_by: authData.user.id,
      created_at: now,
      updated_at: now
    };

    // Update local cache
    const updatedCache = [newShort, ...currentShortsCache];
    saveShortsCache(updatedCache);

    // Insert into Supabase if connected
    if (serverSupabase) {
      try {
        const { error: sbErr } = await serverSupabase
          .from('youtube_shorts')
          .insert([newShort]);
        if (sbErr) {
          console.warn('[Supabase youtube_shorts insert warning]:', sbErr.message);
        }
      } catch (sbEx) {
        console.warn('[Supabase youtube_shorts insert notice]:', sbEx.message);
      }
    }

    res.json({
      success: true,
      message: 'YouTube Short created successfully.',
      data: newShort
    });
  } catch (error) {
    console.error('Error in POST /api/youtube/shorts:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create YouTube Short.' });
  }
});

// 2. GET /api/youtube/shorts/admin - Retrieve all shorts with filters & stats for admin
app.get('/api/youtube/shorts/admin', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { search, category, status, page = 1, limit = 50 } = req.query;
    let allShorts = loadShortsCache();

    if (serverSupabase) {
      try {
        let query = serverSupabase
          .from('youtube_shorts')
          .select('*, quiz_bits:linked_quiz_id(id, question, options, correct_answer, explanation, category, difficulty, xp)')
          .order('created_at', { ascending: false });

        if (category && category !== 'all') {
          query = query.ilike('category', category);
        }
        if (status === 'published') {
          query = query.eq('is_published', true);
        } else if (status === 'draft') {
          query = query.eq('is_published', false);
        }
        if (search && search.trim()) {
          const q = search.trim();
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%,youtube_video_id.ilike.%${q}%`);
        }

        const { data: sbShorts, error: sbErr } = await query;
        if (!sbErr && Array.isArray(sbShorts)) {
          allShorts = sbShorts.map(s => ({
            ...s,
            linked_quiz: s.quiz_bits || null,
            duration_formatted: `${s.duration || 30}s`
          }));
          saveShortsCache(allShorts);
        }
      } catch (e) {
        console.warn('[Supabase admin shorts query fallback]:', e.message);
      }
    }

    // In-memory quiz lookup helper for cache fallback
    const allQuizzes = loadQuizCache();
    const quizMap = new Map(allQuizzes.map(q => [q.id, q]));

    allShorts = allShorts.map(s => ({
      ...s,
      linked_quiz: s.linked_quiz || (s.linked_quiz_id ? quizMap.get(s.linked_quiz_id) || null : null),
      duration_formatted: `${s.duration || 30}s`
    }));

    // Filter in-memory if Supabase was bypassed
    let filtered = [...allShorts];
    if (category && category !== 'all') {
      filtered = filtered.filter(s => s.category?.toLowerCase() === category.toLowerCase());
    }
    if (status === 'published') {
      filtered = filtered.filter(s => s.is_published === true);
    } else if (status === 'draft') {
      filtered = filtered.filter(s => s.is_published === false);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.youtube_video_id?.toLowerCase().includes(q)
      );
    }

    // Compute statistics
    const stats = {
      totalShorts: allShorts.length,
      publishedShorts: allShorts.filter(s => s.is_published).length,
      draftShorts: allShorts.filter(s => !s.is_published).length,
      linkedQuizShorts: allShorts.filter(s => Boolean(s.linked_quiz_id)).length
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const total = filtered.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        shorts: paginated,
        stats,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/youtube/shorts/admin:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to load YouTube Shorts.' });
  }
});

// 3. PUT /api/youtube/shorts/:id - Update Short metadata
app.put('/api/youtube/shorts/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { title, description, category, duration, linked_quiz_id, is_published } = req.body;

    const shortsCache = loadShortsCache();
    const shortIndex = shortsCache.findIndex(s => s.id === id);

    if (shortIndex === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Short not found.' });
    }

    const existing = shortIndex !== -1 ? shortsCache[shortIndex] : null;
    const now = new Date().toISOString();
    const durationVal = duration !== undefined ? (Number(duration) > 0 ? Number(duration) : 30) : existing?.duration || 30;

    const updated = {
      ...(existing || {}),
      id,
      title: title !== undefined ? title.trim() : existing?.title,
      description: description !== undefined ? (description ? description.trim() : null) : existing?.description,
      category: category !== undefined ? category.trim() : existing?.category || 'General',
      duration: durationVal,
      duration_formatted: `${durationVal}s`,
      linked_quiz_id: linked_quiz_id !== undefined ? (linked_quiz_id || null) : existing?.linked_quiz_id || null,
      is_published: is_published !== undefined ? Boolean(is_published) : existing?.is_published ?? false,
      updated_at: now
    };

    if (shortIndex !== -1) {
      shortsCache[shortIndex] = updated;
    } else {
      shortsCache.unshift(updated);
    }
    saveShortsCache(shortsCache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('youtube_shorts')
          .update({
            title: updated.title,
            description: updated.description,
            category: updated.category,
            duration: updated.duration,
            linked_quiz_id: updated.linked_quiz_id,
            is_published: updated.is_published,
            updated_at: updated.updated_at
          })
          .eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase update short notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'YouTube Short updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Error in PUT /api/youtube/shorts/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update Short.' });
  }
});

// 4. DELETE /api/youtube/shorts/:id - Delete Short permanently
app.delete('/api/youtube/shorts/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const shortsCache = loadShortsCache();
    const updatedCache = shortsCache.filter(s => s.id !== id);
    saveShortsCache(updatedCache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('youtube_shorts').delete().eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase delete short notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      deletedId: id,
      message: 'YouTube Short deleted permanently.'
    });
  } catch (error) {
    console.error('Error in DELETE /api/youtube/shorts/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete Short.' });
  }
});

// 5. PUT /api/youtube/shorts/:id/publish - Toggle publication status
app.put('/api/youtube/shorts/:id/publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { is_published } = req.body;

    const shortsCache = loadShortsCache();
    const shortIndex = shortsCache.findIndex(s => s.id === id);

    let updatedShort = null;
    if (shortIndex !== -1) {
      shortsCache[shortIndex].is_published = Boolean(is_published);
      shortsCache[shortIndex].updated_at = new Date().toISOString();
      updatedShort = shortsCache[shortIndex];
      saveShortsCache(shortsCache);
    }

    if (serverSupabase) {
      try {
        const { data: sbUpdated } = await serverSupabase
          .from('youtube_shorts')
          .update({ is_published: Boolean(is_published), updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .maybeSingle();
        if (sbUpdated) updatedShort = sbUpdated;
      } catch (sbErr) {
        console.warn('[Supabase publish short notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: `Short ${is_published ? 'published' : 'unpublished'} successfully.`,
      data: updatedShort
    });
  } catch (error) {
    console.error('Error in PUT /api/youtube/shorts/:id/publish:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to toggle publication state.' });
  }
});

// 6. GET /api/youtube/shorts/feed - Feed pool of published shorts for students
app.get('/api/youtube/shorts/feed', async (req, res) => {
  try {
    let publishedShorts = [];

    if (serverSupabase) {
      try {
        const { data: dbShorts, error: sbErr } = await serverSupabase
          .from('youtube_shorts')
          .select('*, quiz_bits:linked_quiz_id(*)')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!sbErr && Array.isArray(dbShorts) && dbShorts.length > 0) {
          publishedShorts = dbShorts.map(s => ({
            ...s,
            linked_quiz: s.quiz_bits || null,
            duration_formatted: `${s.duration || 30}s`
          }));
        }
      } catch (e) {
        console.warn('[Supabase getFeedShorts notice]:', e.message);
      }
    }

    if (publishedShorts.length === 0) {
      const cached = loadShortsCache();
      const allQuizzes = loadQuizCache();
      const quizMap = new Map(allQuizzes.map(q => [q.id, q]));

      publishedShorts = cached
        .filter(s => s.is_published === true)
        .map(s => ({
          ...s,
          linked_quiz: s.linked_quiz || (s.linked_quiz_id ? quizMap.get(s.linked_quiz_id) || null : null),
          duration_formatted: `${s.duration || 30}s`
        }));
    }

    res.json({
      success: true,
      data: publishedShorts
    });
  } catch (error) {
    console.error('Error in GET /api/youtube/shorts/feed:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve YouTube Shorts feed.' });
  }
});

// 7. POST /api/youtube/shorts/import-existing - Discover and import existing 205 channel shorts into youtube_shorts
app.post('/api/youtube/shorts/import-existing', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    // 1. Discover existing shorts from youtube_cache.json or Supabase youtube_videos
    let rawShorts = [];
    const ytCacheFile = path.resolve(__dirname, 'server/data/youtube_cache.json');
    if (fs.existsSync(ytCacheFile)) {
      rawShorts = JSON.parse(fs.readFileSync(ytCacheFile, 'utf-8'));
    }

    if (serverSupabase && rawShorts.length === 0) {
      try {
        const { data: dbVideos } = await serverSupabase.from('youtube_videos').select('*');
        if (dbVideos) rawShorts = dbVideos;
      } catch (e) {
        // Fallback
      }
    }

    if (rawShorts.length === 0) {
      return res.json({
        success: true,
        message: 'No existing shorts found to import.',
        found: 0,
        imported: 0,
        duplicates: 0,
        categorized: 0,
        failed: 0
      });
    }

    const currentShortsCache = loadShortsCache();
    const existingVideoIdSet = new Set(currentShortsCache.map(s => s.youtube_video_id));

    let importedCount = 0;
    let duplicateCount = 0;
    const newRecords = [];

    for (const raw of rawShorts) {
      const videoId = raw.youtube_video_id || raw.id;
      if (!videoId) continue;

      if (existingVideoIdSet.has(videoId)) {
        duplicateCount++;
        continue;
      }

      // Auto-categorize
      const category = raw.category || 'General';
      const duration = Number(raw.duration_seconds) > 0 ? Number(raw.duration_seconds) : 30;
      const record = {
        id: crypto.randomUUID(),
        youtube_video_id: videoId,
        youtube_url: raw.youtube_url || `https://www.youtube.com/shorts/${videoId}`,
        title: raw.title || 'Educational Short',
        description: raw.description || null,
        thumbnail_url: raw.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        category,
        duration,
        duration_formatted: `${duration}s`,
        is_published: true, // Existing shorts are made published and ready for feed
        sort_order: 0,
        linked_quiz_id: null,
        created_by: authData.user.id,
        created_at: raw.published_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      existingVideoIdSet.add(videoId);
      newRecords.push(record);
      importedCount++;
    }

    if (newRecords.length > 0) {
      const updatedCache = [...currentShortsCache, ...newRecords];
      saveShortsCache(updatedCache);

      if (serverSupabase) {
        try {
          await serverSupabase.from('youtube_shorts').upsert(newRecords, { onConflict: 'youtube_video_id' });
        } catch (sbErr) {
          console.warn('[Supabase import existing shorts notice]:', sbErr.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully processed existing shorts: ${importedCount} imported, ${duplicateCount} already existed.`,
      found: rawShorts.length,
      imported: importedCount,
      duplicates: duplicateCount,
      categorized: rawShorts.length,
      failed: 0
    });
  } catch (error) {
    console.error('Error in POST /api/youtube/shorts/import-existing:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to import existing shorts.' });
  }
});

// ============================================================================
// API ROUTES: ONE-MINUTE READINGS
// ============================================================================

// 1. POST /api/readings/presign-upload - Presigned URL for Reading Cover Image
app.post('/api/readings/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required to upload cover images.' });
    }

    const { readingId = 'reading', filename, contentType = 'image/webp', size } = req.body;

    try {
      validateImageUpload({ contentType, size });
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    let ext = 'webp';
    if (contentType === 'image/png' || filename?.toLowerCase().endsWith('.png')) ext = 'png';
    else if (contentType === 'image/jpeg' || contentType === 'image/jpg' || filename?.toLowerCase().endsWith('.jpg') || filename?.toLowerCase().endsWith('.jpeg')) ext = 'jpg';

    const cleanReadingId = sanitizeSegment(readingId) || 'reading';
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const objectKey = `readings/${cleanReadingId}/${timestamp}_${randomSuffix}.${ext}`;

    const presigned = buildPresignedUpload({
      objectKey,
      contentType
    });

    res.json({
      success: true,
      data: presigned
    });
  } catch (error) {
    console.error('Error in POST /api/readings/presign-upload:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate cover upload URL' });
  }
});

// Helper: Check if string is a valid UUID
function isValidUUID(val) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));
}

// Helper: Process and save a batch of readings individually to R2 and Supabase
async function processBatchReadings(rawList, authUserId) {
  const now = new Date().toISOString();
  const currentCache = loadReadingsCache();
  const existingTitleSet = new Set(
    currentCache.map(r => (r.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean)
  );

  const validReadings = [];
  const errors = [];
  const seenBatchTitles = new Set();
  let duplicateCount = 0;
  const cleanCreatedBy = isValidUUID(authUserId) ? authUserId : null;

  // 1. Validate and prepare all records
  for (let index = 0; index < rawList.length; index++) {
    const item = rawList[index];
    const title = typeof item?.title === 'string' ? item.title.trim() : '';
    if (!title) {
      errors.push({ index: index + 1, error: 'Missing title' });
      continue;
    }

    const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenBatchTitles.has(normTitle) || existingTitleSet.has(normTitle)) {
      duplicateCount++;
      continue;
    }
    seenBatchTitles.add(normTitle);

    const paragraphsRaw = Array.isArray(item.paragraphs) ? item.paragraphs : [];
    const paragraphs = paragraphsRaw.map((p, pIdx) => ({
      id: typeof p?.id === 'number' ? p.id : pIdx + 1,
      text: typeof p === 'string' ? p.trim() : (p?.text || '').trim()
    })).filter(p => p.text.length > 0);

    if (paragraphs.length === 0) {
      errors.push({ index: index + 1, title, error: 'Missing or empty paragraphs' });
      continue;
    }

    const readingId = crypto.randomUUID();
    const r2ContentKey = buildReadingContentKey(readingId);
    const readingContent = {
      id: readingId,
      title,
      subtitle: item.subtitle ? String(item.subtitle).trim() : null,
      category: item.category ? String(item.category).trim() : 'General',
      level: item.level ? String(item.level).trim() : 'A2',
      reading_time: Number(item.reading_time) > 0 ? Number(item.reading_time) : 1,
      paragraphs,
      vocabulary: Array.isArray(item.vocabulary) ? item.vocabulary : [],
      questions: Array.isArray(item.questions) ? item.questions : [],
      cover_image_url: item.cover_image_url || null,
      cover_image_object_key: item.cover_image_object_key || null,
      is_published: item.is_published !== undefined ? Boolean(item.is_published) : true,
      created_at: now,
      updated_at: now
    };

    validReadings.push({
      ...readingContent,
      r2_content_key: r2ContentKey,
      created_by: cleanCreatedBy
    });
  }

  // 2. Upload to Cloudflare R2 in parallel chunks of 8 for fast, non-blocking execution
  if (validReadings.length > 0) {
    const CHUNK_SIZE = 8;
    for (let i = 0; i < validReadings.length; i += CHUNK_SIZE) {
      const chunk = validReadings.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (reading) => {
        try {
          await putJsonContent(reading.r2_content_key, reading);
        } catch (r2Err) {
          console.warn(`[R2 Content Storage Warning for ${reading.id}]:`, r2Err.message);
        }
      }));
    }

    // 3. Save to local cache immediately
    const updatedCache = [...validReadings, ...currentCache];
    saveReadingsCache(updatedCache);

    // 4. Save to Supabase
    if (serverSupabase) {
      try {
        const { error: sbErr } = await serverSupabase.from('readings').insert(validReadings);
        if (sbErr) {
          console.warn('[Supabase batch readings insert error]:', sbErr.message);
          // If insert failed due to column, try fallback
          if (sbErr.message && sbErr.message.includes('r2_content_key')) {
            const fallbackPayload = validReadings.map(({ r2_content_key, ...rest }) => rest);
            await serverSupabase.from('readings').insert(fallbackPayload);
          }
        }
      } catch (e) {
        console.warn('[Supabase batch readings insert notice]:', e.message);
      }
    }
  }

  return {
    validReadings,
    duplicateCount,
    errors
  };
}

// 2. POST /api/readings - Create new One-Minute Reading (Supports Single or Bulk Array)
app.post('/api/readings', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    // Seamlessly support bulk payload sent to POST /api/readings
    if (Array.isArray(req.body) || Array.isArray(req.body?.readings)) {
      const list = Array.isArray(req.body) ? req.body : req.body.readings;
      const { validReadings, duplicateCount, errors } = await processBatchReadings(list, authData.user.id);
      return res.json({
        success: true,
        message: `Successfully processed ${list.length} readings: ${validReadings.length} created, ${duplicateCount} duplicates skipped.`,
        importedCount: validReadings.length,
        duplicateCount,
        failedCount: errors.length,
        data: validReadings,
        errors
      });
    }

    const {
      title,
      subtitle = null,
      category = 'General',
      level = 'A2',
      reading_time = 1,
      paragraphs,
      vocabulary = [],
      questions = [],
      cover_image_url = null,
      cover_image_object_key = null,
      is_published = true
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Reading title is required.' });
    }

    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one paragraph is required.' });
    }

    // Format paragraphs
    const formattedParagraphs = paragraphs.map((p, idx) => ({
      id: typeof p?.id === 'number' ? p.id : idx + 1,
      text: typeof p === 'string' ? p.trim() : (p?.text || '').trim()
    })).filter(p => p.text.length > 0);

    if (formattedParagraphs.length === 0) {
      return res.status(400).json({ success: false, error: 'Paragraphs cannot be empty.' });
    }

    const now = new Date().toISOString();
    const readingId = crypto.randomUUID();
    const r2ContentKey = buildReadingContentKey(readingId);
    const readingContent = {
      id: readingId,
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : null,
      category: category ? category.trim() : 'General',
      level: level ? level.trim() : 'A2',
      reading_time: Number(reading_time) > 0 ? Number(reading_time) : 1,
      paragraphs: formattedParagraphs,
      vocabulary: Array.isArray(vocabulary) ? vocabulary : [],
      questions: Array.isArray(questions) ? questions : [],
      cover_image_url: cover_image_url || null,
      cover_image_object_key: cover_image_object_key || null,
      is_published: Boolean(is_published),
      created_at: now,
      updated_at: now
    };

    // Upload individual content JSON to Cloudflare R2
    try {
      await putJsonContent(r2ContentKey, readingContent);
    } catch (r2Err) {
      console.warn(`[R2 Reading Content Notice for ${readingId}]:`, r2Err.message);
    }

    const newReading = {
      ...readingContent,
      r2_content_key: r2ContentKey,
      created_by: authData.user.id
    };

    // Save to local cache
    const cache = loadReadingsCache();
    cache.unshift(newReading);
    saveReadingsCache(cache);

    // Save to Supabase if connected
    if (serverSupabase) {
      try {
        const { error: sbErr } = await serverSupabase.from('readings').insert([newReading]);
        if (sbErr) console.warn('[Supabase readings insert warning]:', sbErr.message);
      } catch (e) {
        console.warn('[Supabase readings insert notice]:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'One-Minute Reading created successfully.',
      data: newReading
    });
  } catch (error) {
    console.error('Error in POST /api/readings:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create reading.' });
  }
});

// 3. POST /api/readings/import-batch - Batch import readings from JSON array (Admin only)
app.post('/api/readings/import-batch', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { readings } = req.body;
    const rawList = Array.isArray(readings) ? readings : (Array.isArray(req.body) ? req.body : (readings ? [readings] : []));

    if (rawList.length === 0) {
      return res.status(400).json({ success: false, error: 'Valid array of readings is required.' });
    }

    const { validReadings, duplicateCount, errors } = await processBatchReadings(rawList, authData.user.id);

    if (validReadings.length === 0 && duplicateCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid readings found in payload.',
        errors
      });
    }

    res.json({
      success: true,
      message: `Successfully processed ${rawList.length} readings: ${validReadings.length} created, ${duplicateCount} duplicates skipped.`,
      importedCount: validReadings.length,
      duplicateCount,
      failedCount: errors.length,
      data: validReadings,
      errors
    });
  } catch (error) {
    console.error('Error in POST /api/readings/import-batch:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to import readings.' });
  }
});

// 4. GET /api/readings/admin - Admin list with filtering & stats
app.get('/api/readings/admin', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { search, category, level, published, page = 1, limit = 50 } = req.query;
    let allReadings = loadReadingsCache();

    if (serverSupabase) {
      try {
        const { data: dbReadings, error: sbErr } = await serverSupabase
          .from('readings')
          .select('*')
          .order('created_at', { ascending: false });

        if (!sbErr && Array.isArray(dbReadings) && dbReadings.length > 0) {
          const dbMap = new Map(dbReadings.map(r => [r.id, r]));
          const merged = [...dbReadings];
          for (const cached of allReadings) {
            if (!dbMap.has(cached.id)) {
              merged.push(cached);
            }
          }
          allReadings = merged;
          saveReadingsCache(allReadings);
        }
      } catch (e) {
        console.warn('[Supabase admin readings notice]:', e.message);
      }
    }

    // Stats
    const totalReadings = allReadings.length;
    const publishedReadings = allReadings.filter(r => r.is_published).length;
    const draftReadings = totalReadings - publishedReadings;
    const readingsWithImages = allReadings.filter(r => Boolean(r.cover_image_url)).length;
    const readingsWithoutImages = totalReadings - readingsWithImages;

    const stats = {
      totalReadings,
      publishedReadings,
      draftReadings,
      readingsWithImages,
      readingsWithoutImages
    };

    // Filter
    let filtered = [...allReadings];

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.subtitle?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(r => r.category?.toLowerCase() === category.toLowerCase());
    }

    if (level && level !== 'all') {
      filtered = filtered.filter(r => r.level?.toLowerCase() === level.toLowerCase());
    }

    if (published && published !== 'all') {
      const isPub = published === 'published' || published === 'true';
      filtered = filtered.filter(r => Boolean(r.is_published) === isPub);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const total = filtered.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        readings: paginated,
        stats,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/readings/admin:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch readings.' });
  }
});

// 5. GET /api/readings/feed - Student Feed pool of published readings
app.get('/api/readings/feed', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;

    let allReadings = loadReadingsCache();

    if (serverSupabase) {
      try {
        const { data: dbReadings, error: sbErr } = await serverSupabase
          .from('readings')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!sbErr && Array.isArray(dbReadings) && dbReadings.length > 0) {
          allReadings = dbReadings;
        }
      } catch (e) {
        console.warn('[Supabase feed readings notice]:', e.message);
      }
    }

    let published = allReadings.filter(r => r.is_published);
    if (published.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Filter completions if authenticated
    let candidatePool = published;
    if (userId) {
      let completions = [];
      if (serverSupabase) {
        try {
          const { data: dbCompletions } = await serverSupabase
            .from('reading_completions')
            .select('reading_id')
            .eq('user_id', userId);
          if (dbCompletions) completions = dbCompletions;
        } catch (e) {
          // Ignore
        }
      }
      if (completions.length === 0) {
        const cachedCompletions = loadReadingCompletionsCache();
        completions = cachedCompletions.filter(c => c.user_id === userId);
      }

      const completedIds = new Set(completions.map(c => c.reading_id));
      const uncompleted = published.filter(r => !completedIds.has(r.id));
      if (uncompleted.length > 0) {
        candidatePool = uncompleted;
      }
    }

    const shuffled = shuffleArray(candidatePool);
    const feedPool = shuffled.slice(0, 10);

    res.json({
      success: true,
      data: feedPool
    });
  } catch (error) {
    console.error('Error in GET /api/readings/feed:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve readings feed.' });
  }
});

// 6. GET /api/readings/:id - Get single reading
app.get('/api/readings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let reading = null;

    if (serverSupabase) {
      try {
        const { data: dbReading } = await serverSupabase
          .from('readings')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (dbReading) reading = dbReading;
      } catch (e) {
        // Fallback
      }
    }

    if (!reading) {
      const cache = loadReadingsCache();
      reading = cache.find(r => r.id === id);
    }

    if (!reading) {
      return res.status(404).json({ success: false, error: 'Reading not found.' });
    }

    res.json({ success: true, data: reading });
  } catch (error) {
    console.error('Error in GET /api/readings/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reading.' });
  }
});

// 7. PUT /api/readings/:id - Update reading content (Admin only)
app.put('/api/readings/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const {
      title,
      subtitle,
      category,
      level,
      reading_time,
      paragraphs,
      vocabulary,
      questions,
      is_published
    } = req.body;

    const cache = loadReadingsCache();
    const index = cache.findIndex(r => r.id === id);

    if (index === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Reading not found.' });
    }

    const existing = index !== -1 ? cache[index] : null;
    const now = new Date().toISOString();

    const formattedParagraphs = Array.isArray(paragraphs)
      ? paragraphs.map((p, idx) => ({
          id: typeof p?.id === 'number' ? p.id : idx + 1,
          text: typeof p === 'string' ? p.trim() : (p?.text || '').trim()
        })).filter(p => p.text.length > 0)
      : existing?.paragraphs || [];

    const updated = {
      ...(existing || {}),
      id,
      title: title !== undefined ? title.trim() : existing?.title,
      subtitle: subtitle !== undefined ? (subtitle ? subtitle.trim() : null) : existing?.subtitle,
      category: category !== undefined ? category.trim() : existing?.category || 'General',
      level: level !== undefined ? level.trim() : existing?.level || 'A2',
      reading_time: reading_time !== undefined ? (Number(reading_time) > 0 ? Number(reading_time) : 1) : existing?.reading_time || 1,
      paragraphs: formattedParagraphs,
      vocabulary: vocabulary !== undefined ? vocabulary : existing?.vocabulary || [],
      questions: questions !== undefined ? questions : existing?.questions || [],
      is_published: is_published !== undefined ? Boolean(is_published) : existing?.is_published ?? true,
      updated_at: now
    };

    if (index !== -1) {
      cache[index] = updated;
    } else {
      cache.unshift(updated);
    }
    saveReadingsCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('readings')
          .update({
            title: updated.title,
            subtitle: updated.subtitle,
            category: updated.category,
            level: updated.level,
            reading_time: updated.reading_time,
            paragraphs: updated.paragraphs,
            vocabulary: updated.vocabulary,
            questions: updated.questions,
            is_published: updated.is_published,
            updated_at: updated.updated_at
          })
          .eq('id', id);
      } catch (e) {
        console.warn('[Supabase update reading notice]:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Reading updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Error in PUT /api/readings/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update reading.' });
  }
});

// 8. PUT /api/readings/:id/cover - Add or replace cover image for existing reading
app.put('/api/readings/:id/cover', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { cover_image_url, cover_image_object_key } = req.body;

    const cache = loadReadingsCache();
    const index = cache.findIndex(r => r.id === id);

    if (index === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Reading not found.' });
    }

    const existing = index !== -1 ? cache[index] : null;
    const oldObjectKey = existing?.cover_image_object_key;
    const now = new Date().toISOString();

    const updated = {
      ...(existing || {}),
      id,
      cover_image_url: cover_image_url || null,
      cover_image_object_key: cover_image_object_key || null,
      updated_at: now
    };

    if (index !== -1) {
      cache[index] = updated;
    } else {
      cache.unshift(updated);
    }
    saveReadingsCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('readings')
          .update({
            cover_image_url: updated.cover_image_url,
            cover_image_object_key: updated.cover_image_object_key,
            updated_at: updated.updated_at
          })
          .eq('id', id);
      } catch (e) {
        console.warn('[Supabase update reading cover notice]:', e.message);
      }
    }

    // Clean up old R2 image object if it was replaced and different
    if (oldObjectKey && oldObjectKey !== cover_image_object_key) {
      try {
        await deleteObjects([oldObjectKey]);
      } catch (e) {
        console.warn('[R2 cleanup notice]:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Cover image updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Error in PUT /api/readings/:id/cover:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update cover image.' });
  }
});

// 9. PUT /api/readings/:id/publish - Toggle reading publication status
app.put('/api/readings/:id/publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { is_published } = req.body;

    const cache = loadReadingsCache();
    const index = cache.findIndex(r => r.id === id);

    if (index === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Reading not found.' });
    }

    const targetPub = is_published !== undefined ? Boolean(is_published) : !cache[index]?.is_published;
    const now = new Date().toISOString();

    if (index !== -1) {
      cache[index].is_published = targetPub;
      cache[index].updated_at = now;
      saveReadingsCache(cache);
    }

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('readings')
          .update({ is_published: targetPub, updated_at: now })
          .eq('id', id);
      } catch (e) {
        console.warn('[Supabase toggle publish reading notice]:', e.message);
      }
    }

    res.json({
      success: true,
      message: `Reading ${targetPub ? 'published' : 'unpublished'} successfully.`,
      is_published: targetPub
    });
  } catch (error) {
    console.error('Error in PUT /api/readings/:id/publish:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to toggle publication.' });
  }
});

// 10. DELETE /api/readings/:id - Delete reading & clean up R2 cover
app.delete('/api/readings/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const cache = loadReadingsCache();
    const target = cache.find(r => r.id === id);
    const updated = cache.filter(r => r.id !== id);
    saveReadingsCache(updated);

    if (serverSupabase) {
      try {
        await serverSupabase.from('readings').delete().eq('id', id);
      } catch (e) {
        console.warn('[Supabase delete reading notice]:', e.message);
      }
    }

    if (target?.cover_image_object_key) {
      try {
        await deleteObjects([target.cover_image_object_key]);
      } catch (e) {
        console.warn('[R2 delete cover notice]:', e.message);
      }
    }

    res.json({
      success: true,
      deletedId: id,
      message: 'Reading permanently deleted.'
    });
  } catch (error) {
    console.error('Error in DELETE /api/readings/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete reading.' });
  }
});

// 11. POST /api/readings/complete - Record student reading completion
app.post('/api/readings/complete', async (req, res) => {
  try {
    const { readingId } = req.body;
    if (!readingId) {
      return res.status(400).json({ success: false, error: 'readingId is required.' });
    }

    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';

    const completions = loadReadingCompletionsCache();
    const alreadyCompleted = completions.some(c => c.reading_id === readingId && c.user_id === userId);

    if (!alreadyCompleted) {
      const record = {
        id: crypto.randomUUID(),
        reading_id: readingId,
        user_id: userId,
        completed_at: new Date().toISOString()
      };
      completions.push(record);
      saveReadingCompletionsCache(completions);

      if (serverSupabase && userId !== 'guest_user') {
        try {
          await serverSupabase.from('reading_completions').insert([record]);
        } catch (e) {
          // Ignore duplicate
        }
      }
    }

    res.json({ success: true, readingId, completed: true });
  } catch (error) {
    console.error('Error in POST /api/readings/complete:', error);
    res.status(500).json({ success: false, error: 'Failed to record completion.' });
  }
});

// ============================================================================
// API ROUTES: AI-PROMPT POLLS
// ============================================================================

// 1. POST /api/polls/generate-ai - Generate structured poll from admin prompt (Admin only)
app.post('/api/polls/generate-ai', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Natural language prompt is required.' });
    }

    const cleanPrompt = prompt.trim();
    console.log(`[AI Poll Generation] Received prompt: "${cleanPrompt}"`);

    let generatedPoll = null;

    // 1. Try OpenAI if API Key is available
    if (serverOpenAI) {
      try {
        const completion = await serverOpenAI.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an educational AI assistant for EdTechra. When given an instructional prompt, create an engaging, classroom-appropriate poll for students.
Return a clean, valid JSON object with the following schema:
{
  "question": "A clear, compelling poll question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "category": "Science" | "Technology" | "Space" | "English" | "Math" | "General" | "Life Skills",
  "allow_multiple": false,
  "show_results_after_vote": true
}
Ensure exactly 4 distinct, concise, student-friendly options.`
            },
            {
              role: 'user',
              content: cleanPrompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 500
        });

        const rawJson = completion.choices?.[0]?.message?.content;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (parsed.question && Array.isArray(parsed.options) && parsed.options.length >= 2) {
            generatedPoll = {
              question: parsed.question.trim(),
              options: parsed.options.map(o => String(o).trim()).filter(Boolean),
              category: parsed.category || 'General',
              allow_multiple: Boolean(parsed.allow_multiple),
              show_results_after_vote: parsed.show_results_after_vote !== undefined ? Boolean(parsed.show_results_after_vote) : true,
              prompt: cleanPrompt
            };
          }
        }
      } catch (aiErr) {
        console.warn('[AI Poll Generation Warning] OpenAI call failed, using intelligent rule generator:', aiErr.message);
      }
    }

    // 2. Intelligent Educational Fallback Template if OpenAI is unconfigured or failed
    if (!generatedPoll) {
      const lower = cleanPrompt.toLowerCase();
      let category = 'General';
      let question = cleanPrompt;
      let options = ['Option A', 'Option B', 'Option C', 'Option D'];

      if (lower.includes('science') || lower.includes('experiment') || lower.includes('biology') || lower.includes('physics')) {
        category = 'Science';
        question = cleanPrompt.replace(/^(create|make|give me|generate)\s+(a\s+)?(poll|question)\s+(about|for)?\s*/i, '').trim();
        if (!question.endsWith('?')) question = `How do you best learn science topics?`;
        options = ['Hands-on experiments', 'Interactive video demonstrations', 'Illustrated reading guides', 'Concept quizzes & challenges'];
      } else if (lower.includes('tech') || lower.includes('ai') || lower.includes('code') || lower.includes('computer')) {
        category = 'Technology';
        question = cleanPrompt.replace(/^(create|make|give me|generate)\s+(a\s+)?(poll|question)\s+(about|for)?\s*/i, '').trim();
        if (!question.endsWith('?')) question = `Which technology skill would you most like to master?`;
        options = ['Artificial Intelligence & Prompts', 'Web & App Building', 'Game Development', 'Cybersecurity & Ethics'];
      } else if (lower.includes('space') || lower.includes('planet') || lower.includes('universe')) {
        category = 'Space';
        question = `Which mystery of deep space fascinates you the most?`;
        options = ['Black Holes & Event Horizons', 'Search for Extraterrestrial Life', 'Mars Colonization & Habitats', 'Origins of the Big Bang'];
      } else {
        question = cleanPrompt.replace(/^(create|make|give me|generate)\s+(a\s+)?(poll|question)\s+(about|for)?\s*/i, '').trim();
        if (!question.endsWith('?')) question = `${question}?`;
        options = ['Option A: Practical applications', 'Option B: Visual step-by-step videos', 'Option C: Interactive community discussions', 'Option D: Quick daily review bits'];
      }

      // Capitalize question
      question = question.charAt(0).toUpperCase() + question.slice(1);

      generatedPoll = {
        question,
        options,
        category,
        allow_multiple: false,
        show_results_after_vote: true,
        prompt: cleanPrompt
      };
    }

    res.json({
      success: true,
      message: 'AI Poll generated successfully. Review and approve before publishing.',
      data: generatedPoll
    });
  } catch (error) {
    console.error('Error in POST /api/polls/generate-ai:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate poll.' });
  }
});

// 2. POST /api/polls - Create / Approve Poll (Admin only)
app.post('/api/polls', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const {
      question,
      options,
      category = 'General',
      allow_multiple = false,
      show_results_after_vote = true,
      is_published = false,
      prompt = null
    } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Poll question is required.' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 options are required.' });
    }

    const cleanOptions = options.map(o => String(o).trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 non-empty options are required.' });
    }

    const now = new Date().toISOString();
    const newPoll = {
      id: crypto.randomUUID(),
      question: question.trim(),
      options: cleanOptions,
      category: category ? category.trim() : 'General',
      allow_multiple: Boolean(allow_multiple),
      show_results_after_vote: Boolean(show_results_after_vote),
      is_published: Boolean(is_published),
      total_votes: 0,
      prompt: prompt ? String(prompt).trim() : null,
      created_by: authData.user.id,
      created_at: now,
      updated_at: now
    };

    // Save to cache
    const cache = loadPollsCache();
    cache.unshift(newPoll);
    savePollsCache(cache);

    // Save to Supabase
    if (serverSupabase) {
      try {
        await serverSupabase.from('polls').insert([newPoll]);
      } catch (e) {
        console.warn('[Supabase create poll notice]:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Poll ${newPoll.is_published ? 'published' : 'saved as draft'} successfully.`,
      data: newPoll
    });
  } catch (error) {
    console.error('Error in POST /api/polls:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create poll.' });
  }
});

// Helper: Calculate option vote counts and percentages for a poll
function computePollVoteStats(poll, allVotes, userVoteOptions = []) {
  const pollVotes = allVotes.filter(v => v.poll_id === poll.id);
  const totalVotes = pollVotes.length;
  const optionVotes = {};
  poll.options.forEach(opt => {
    optionVotes[opt] = 0;
  });

  pollVotes.forEach(v => {
    const selected = Array.isArray(v.selected_options) ? v.selected_options : [v.selected_options];
    selected.forEach(opt => {
      if (optionVotes[opt] !== undefined) {
        optionVotes[opt]++;
      }
    });
  });

  const optionPercentages = {};
  poll.options.forEach(opt => {
    const count = optionVotes[opt] || 0;
    optionPercentages[opt] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  });

  return {
    total_votes: totalVotes,
    option_votes: optionVotes,
    option_percentages: optionPercentages,
    user_voted_options: userVoteOptions
  };
}

// 3. GET /api/polls/admin - Admin list with filtering & detailed stats
app.get('/api/polls/admin', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { search, category, status, page = 1, limit = 50 } = req.query;
    let allPolls = loadPollsCache();
    let allVotes = loadPollVotesCache();

    if (serverSupabase) {
      try {
        const [dbPollsRes, dbVotesRes] = await Promise.all([
          serverSupabase.from('polls').select('*').order('created_at', { ascending: false }),
          serverSupabase.from('poll_votes').select('*')
        ]);

        if (!dbPollsRes.error && Array.isArray(dbPollsRes.data)) {
          allPolls = dbPollsRes.data;
          savePollsCache(allPolls);
        }
        if (!dbVotesRes.error && Array.isArray(dbVotesRes.data)) {
          allVotes = dbVotesRes.data;
          savePollVotesCache(allVotes);
        }
      } catch (e) {
        console.warn('[Supabase admin polls notice]:', e.message);
      }
    }

    const enrichedPolls = allPolls.map(p => {
      const stats = computePollVoteStats(p, allVotes);
      return {
        ...p,
        total_votes: stats.total_votes,
        option_votes: stats.option_votes,
        option_percentages: stats.option_percentages
      };
    });

    const totalPolls = enrichedPolls.length;
    const publishedPolls = enrichedPolls.filter(p => p.is_published).length;
    const draftPolls = totalPolls - publishedPolls;
    const totalVotes = allVotes.length;

    const stats = {
      totalPolls,
      publishedPolls,
      draftPolls,
      totalVotes
    };

    let filtered = [...enrichedPolls];

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.question?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.options?.some(o => o.toLowerCase().includes(q))
      );
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (status && status !== 'all') {
      const isPub = status === 'published';
      filtered = filtered.filter(p => Boolean(p.is_published) === isPub);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const total = filtered.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: {
        polls: paginated,
        stats,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/polls/admin:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch admin polls.' });
  }
});

// 4. GET /api/polls/feed - Student Feed pool of published polls
app.get('/api/polls/feed', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';

    let allPolls = loadPollsCache();
    let allVotes = loadPollVotesCache();

    if (serverSupabase) {
      try {
        const { data: dbPolls, error: sbErr } = await serverSupabase
          .from('polls')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!sbErr && Array.isArray(dbPolls) && dbPolls.length > 0) {
          const dbMap = new Map(dbPolls.map(p => [p.id, p]));
          const merged = [...dbPolls];
          for (const cached of allPolls) {
            if (!dbMap.has(cached.id)) {
              merged.push(cached);
            }
          }
          allPolls = merged;
          savePollsCache(allPolls);
        }

        const { data: dbVotes } = await serverSupabase.from('poll_votes').select('*');
        if (dbVotes && Array.isArray(dbVotes)) {
          allVotes = dbVotes;
          savePollVotesCache(allVotes);
        }
      } catch (e) {
        console.warn('[Supabase feed polls notice]:', e.message);
      }
    }

    const published = allPolls.filter(p => p.is_published);
    if (published.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const userVotesMap = new Map();
    allVotes.filter(v => v.user_id === userId).forEach(v => {
      userVotesMap.set(v.poll_id, Array.isArray(v.selected_options) ? v.selected_options : [v.selected_options]);
    });

    const enriched = published.map(p => {
      const userVote = userVotesMap.get(p.id) || [];
      const stats = computePollVoteStats(p, allVotes, userVote);
      return {
        ...p,
        total_votes: stats.total_votes,
        option_votes: stats.option_votes,
        option_percentages: stats.option_percentages,
        user_voted_options: userVote
      };
    });

    const shuffled = shuffleArray(enriched);
    const feedPool = shuffled.slice(0, 10);

    res.json({
      success: true,
      data: feedPool
    });
  } catch (error) {
    console.error('Error in GET /api/polls/feed:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve polls feed.' });
  }
});

// 5. POST /api/polls/vote - Student submits vote
app.post('/api/polls/vote', async (req, res) => {
  try {
    const { pollId, selectedOptions } = req.body;

    if (!pollId || selectedOptions === undefined) {
      return res.status(400).json({ success: false, error: 'pollId and selectedOptions are required.' });
    }

    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';

    const allPolls = loadPollsCache();
    let poll = allPolls.find(p => p.id === pollId);

    // 1. If not found in cache, check Supabase polls table
    if (!poll && serverSupabase) {
      try {
        const { data: dbPoll, error: sbErr } = await serverSupabase
          .from('polls')
          .select('*')
          .eq('id', pollId)
          .maybeSingle();

        if (!sbErr && dbPoll) {
          poll = dbPoll;
          allPolls.push(poll);
          savePollsCache(allPolls);
        }
      } catch (sbErr) {
        console.warn('[Supabase poll vote lookup notice]:', sbErr.message);
      }
    }

    // 2. Secondary fallback: check Cloudflare R2
    if (!poll) {
      try {
        const r2Poll = await getJsonContent(buildPollContentKey(pollId));
        if (r2Poll) {
          poll = r2Poll;
          allPolls.push(poll);
          savePollsCache(allPolls);
        }
      } catch (r2Err) {
        console.warn('[R2 poll lookup notice]:', r2Err.message);
      }
    }

    if (!poll) {
      return res.status(404).json({ success: false, error: 'Poll not found.' });
    }

    const pollOptions = Array.isArray(poll.options) ? poll.options : [];
    const rawSelected = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
    const cleanSelected = rawSelected.map(o => String(o).trim()).filter(o => pollOptions.includes(o));

    if (cleanSelected.length === 0) {
      return res.status(400).json({ success: false, error: 'Selected option is not valid for this poll.' });
    }

    // 3. Load latest votes from cache and Supabase
    let allVotes = loadPollVotesCache();
    if (serverSupabase) {
      try {
        const { data: dbVotes } = await serverSupabase
          .from('poll_votes')
          .select('*')
          .eq('poll_id', pollId);

        if (Array.isArray(dbVotes) && dbVotes.length > 0) {
          const voteIdSet = new Set(allVotes.map(v => v.id));
          for (const v of dbVotes) {
            if (!voteIdSet.has(v.id)) {
              allVotes.push(v);
            }
          }
          savePollVotesCache(allVotes);
        }
      } catch (e) {
        console.warn('[Supabase poll_votes query notice]:', e.message);
      }
    }

    // 4. Check duplicate vote
    const alreadyVoted = allVotes.some(v => v.poll_id === pollId && v.user_id === userId);

    if (alreadyVoted && userId !== 'guest_user') {
      const stats = computePollVoteStats(poll, allVotes, cleanSelected);
      return res.json({
        success: true,
        already_voted: true,
        data: {
          poll_id: pollId,
          selected_options: cleanSelected,
          total_votes: stats.total_votes,
          option_votes: stats.option_votes,
          option_percentages: stats.option_percentages
        }
      });
    }

    const voteRecord = {
      id: crypto.randomUUID(),
      poll_id: pollId,
      user_id: userId,
      selected_options: cleanSelected,
      created_at: new Date().toISOString()
    };

    allVotes.push(voteRecord);
    savePollVotesCache(allVotes);

    // Increment poll total_votes
    const pollIndex = allPolls.findIndex(p => p.id === pollId);
    if (pollIndex !== -1) {
      allPolls[pollIndex].total_votes = (allPolls[pollIndex].total_votes || 0) + 1;
      savePollsCache(allPolls);
    }

    if (serverSupabase && userId !== 'guest_user') {
      try {
        await serverSupabase.from('poll_votes').insert([voteRecord]);
        await serverSupabase
          .from('polls')
          .update({ total_votes: (poll.total_votes || 0) + 1, updated_at: new Date().toISOString() })
          .eq('id', pollId);
      } catch (e) {
        console.warn('[Supabase vote notice]:', e.message);
      }
    }

    const stats = computePollVoteStats(poll, allVotes, cleanSelected);

    res.json({
      success: true,
      data: {
        poll_id: pollId,
        selected_options: cleanSelected,
        total_votes: stats.total_votes,
        option_votes: stats.option_votes,
        option_percentages: stats.option_percentages
      }
    });
  } catch (error) {
    console.error('Error in POST /api/polls/vote:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit vote.' });
  }
});

// 6. PUT /api/polls/:id - Update poll (Admin only)
app.put('/api/polls/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { question, options, category, allow_multiple, show_results_after_vote, is_published } = req.body;

    const cache = loadPollsCache();
    const index = cache.findIndex(p => p.id === id);

    if (index === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Poll not found.' });
    }

    const existing = index !== -1 ? cache[index] : null;
    const now = new Date().toISOString();

    const cleanOptions = Array.isArray(options) && options.length >= 2
      ? options.map(o => String(o).trim()).filter(Boolean)
      : existing?.options || [];

    const updated = {
      ...(existing || {}),
      id,
      question: question !== undefined ? question.trim() : existing?.question,
      options: cleanOptions,
      category: category !== undefined ? category.trim() : existing?.category || 'General',
      allow_multiple: allow_multiple !== undefined ? Boolean(allow_multiple) : existing?.allow_multiple ?? false,
      show_results_after_vote: show_results_after_vote !== undefined ? Boolean(show_results_after_vote) : existing?.show_results_after_vote ?? true,
      is_published: is_published !== undefined ? Boolean(is_published) : existing?.is_published ?? false,
      updated_at: now
    };

    if (index !== -1) {
      cache[index] = updated;
    } else {
      cache.unshift(updated);
    }
    savePollsCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('polls')
          .update({
            question: updated.question,
            options: updated.options,
            category: updated.category,
            allow_multiple: updated.allow_multiple,
            show_results_after_vote: updated.show_results_after_vote,
            is_published: updated.is_published,
            updated_at: updated.updated_at
          })
          .eq('id', id);
      } catch (e) {
        console.warn('[Supabase update poll notice]:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Poll updated successfully.',
      data: updated
    });
  } catch (error) {
    console.error('Error in PUT /api/polls/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update poll.' });
  }
});

// 7. PUT /api/polls/:id/publish - Toggle publication status
app.put('/api/polls/:id/publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { is_published } = req.body;

    const cache = loadPollsCache();
    const index = cache.findIndex(p => p.id === id);

    if (index === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Poll not found.' });
    }

    const targetPub = is_published !== undefined ? Boolean(is_published) : !cache[index]?.is_published;
    const now = new Date().toISOString();

    if (index !== -1) {
      cache[index].is_published = targetPub;
      cache[index].updated_at = now;
      savePollsCache(cache);
    }

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('polls')
          .update({ is_published: targetPub, updated_at: now })
          .eq('id', id);
      } catch (e) {
        console.warn('[Supabase toggle publish poll notice]:', e.message);
      }
    }

    res.json({
      success: true,
      message: `Poll ${targetPub ? 'published' : 'unpublished'} successfully.`,
      is_published: targetPub
    });
  } catch (error) {
    console.error('Error in PUT /api/polls/:id/publish:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to toggle publication.' });
  }
});

// 8. DELETE /api/polls/:id - Delete poll and associated votes
app.delete('/api/polls/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const cache = loadPollsCache();
    const updated = cache.filter(p => p.id !== id);
    savePollsCache(updated);

    const votesCache = loadPollVotesCache();
    const updatedVotes = votesCache.filter(v => v.poll_id !== id);
    savePollVotesCache(updatedVotes);

    if (serverSupabase) {
      try {
        await serverSupabase.from('polls').delete().eq('id', id);
      } catch (e) {
        console.warn('[Supabase delete poll notice]:', e.message);
      }
    }

    res.json({
      success: true,
      deletedId: id,
      message: 'Poll and associated votes deleted successfully.'
    });
  } catch (error) {
    console.error('Error in DELETE /api/polls/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to delete poll.' });
  }
});

// ============================================================================
// API ROUTES: SENTENCE REORDER ACTIVITIES
// ============================================================================

// Helper: Normalize words array and ensure 3 to 6 word limits
function processReorderWords(rawInput) {
  let sentence = String(rawInput.sentence || '').trim();
  let correctOrder = [];
  let scrambledWords = [];

  // Parse words from array or sentence string
  if (Array.isArray(rawInput.correct_order) && rawInput.correct_order.length > 0) {
    correctOrder = rawInput.correct_order.map(w => String(w).trim()).filter(Boolean);
  } else if (Array.isArray(rawInput.correctOrder) && rawInput.correctOrder.length > 0) {
    correctOrder = rawInput.correctOrder.map(w => String(w).trim()).filter(Boolean);
  } else if (Array.isArray(rawInput.words) && rawInput.words.length > 0) {
    correctOrder = rawInput.words.map(w => String(w).trim()).filter(Boolean);
  } else if (sentence) {
    correctOrder = sentence.split(/\s+/).filter(Boolean);
  }

  if (Array.isArray(rawInput.scrambled_words) && rawInput.scrambled_words.length > 0) {
    scrambledWords = rawInput.scrambled_words.map(w => String(w).trim()).filter(Boolean);
  } else if (Array.isArray(rawInput.words) && rawInput.words.length > 0) {
    scrambledWords = [...rawInput.words.map(w => String(w).trim()).filter(Boolean)];
    // Ensure words are scrambled
    if (scrambledWords.join(' ') === correctOrder.join(' ') && scrambledWords.length > 1) {
      scrambledWords.sort(() => Math.random() - 0.5);
    }
  } else {
    scrambledWords = [...correctOrder].sort(() => Math.random() - 0.5);
  }

  if (!sentence && correctOrder.length > 0) {
    sentence = correctOrder.join(' ');
  }

  return { sentence, correctOrder, scrambledWords };
}

// 1. POST /api/reorders - Create new activity (Supports Single or Bulk Array)
app.post('/api/reorders', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const payload = req.body;
    const isBulk = Array.isArray(payload) || Array.isArray(payload?.activities);
    const rawItems = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.activities)
      ? payload.activities
      : [payload];

    const results = [];
    const cache = loadReordersCache();
    const batchId = isBulk ? `batch_reorder_${Date.now()}` : null;
    const now = new Date().toISOString();

    for (let idx = 0; idx < rawItems.length; idx++) {
      const item = rawItems[idx];
      const { sentence, correctOrder, scrambledWords } = processReorderWords(item);

      if (!sentence) {
        throw new Error(`Item ${idx + 1}: Sentence cannot be empty.`);
      }

      if (correctOrder.length < 3 || correctOrder.length > 6) {
        throw new Error(`Item ${idx + 1}: Sentence "${sentence}" contains ${correctOrder.length} words. Sentences must contain between 3 and 6 words.`);
      }

      const id = crypto.randomUUID();
      const r2Key = buildReorderContentKey(id);

      const activityRecord = {
        id,
        sentence,
        scrambled_words: scrambledWords,
        correct_order: correctOrder,
        category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Grammar',
        level: typeof item.level === 'string' && item.level.trim() ? item.level.trim() : 'A1',
        xp: Number(item.xp) > 0 ? Number(item.xp) : 10,
        hint: item.hint ? String(item.hint).trim() : null,
        explanation: item.explanation ? String(item.explanation).trim() : null,
        r2_content_key: r2Key,
        is_published: item.is_published !== undefined ? Boolean(item.is_published) : true,
        created_by: authData.user.id,
        import_batch_id: batchId,
        created_at: now,
        updated_at: now
      };

      // 1. Upload full content JSON to Cloudflare R2
      try {
        await putJsonContent(r2Key, {
          id: activityRecord.id,
          sentence: activityRecord.sentence,
          scrambled_words: activityRecord.scrambled_words,
          correct_order: activityRecord.correct_order,
          category: activityRecord.category,
          level: activityRecord.level,
          xp: activityRecord.xp,
          hint: activityRecord.hint,
          explanation: activityRecord.explanation,
          created_at: activityRecord.created_at
        });
      } catch (r2Err) {
        console.warn(`[R2 Reorder Upload Notice] Failed for ${id}:`, r2Err.message);
      }

      // 2. Persist to Supabase if available
      if (serverSupabase) {
        try {
          await serverSupabase.from('reorder_activities').insert([activityRecord]);
        } catch (sbErr) {
          console.warn(`[Supabase Reorder Notice] Insert fallback:`, sbErr.message);
        }
      }

      cache.unshift(activityRecord);
      results.push(activityRecord);
    }

    saveReordersCache(cache);

    if (isBulk) {
      return res.json({
        success: true,
        message: `Successfully imported ${results.length} sentence reorder activities.`,
        data: results,
        count: results.length,
        batchId
      });
    }

    res.json({
      success: true,
      message: 'Sentence reorder activity created successfully.',
      data: results[0]
    });
  } catch (error) {
    console.error('Error in POST /api/reorders:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create activity.' });
  }
});

// 2. POST /api/reorders/import-batch - Admin batch import
app.post('/api/reorders/import-batch', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { activities, batchId: customBatchId } = req.body;
    const rawList = Array.isArray(activities) ? activities : Array.isArray(req.body) ? req.body : [];

    if (rawList.length === 0) {
      return res.status(400).json({ success: false, error: 'No activities provided for batch import.' });
    }

    const cache = loadReordersCache();
    const batchId = customBatchId || `batch_reorder_${Date.now()}`;
    const now = new Date().toISOString();
    const imported = [];
    const errors = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      try {
        const { sentence, correctOrder, scrambledWords } = processReorderWords(item);

        if (!sentence) {
          errors.push({ index: i, error: 'Sentence cannot be empty' });
          continue;
        }

        if (correctOrder.length < 3 || correctOrder.length > 6) {
          errors.push({ index: i, error: `Sentence contains ${correctOrder.length} words. Allowed range: 3-6 words.` });
          continue;
        }

        const id = crypto.randomUUID();
        const r2Key = buildReorderContentKey(id);

        const record = {
          id,
          sentence,
          scrambled_words: scrambledWords,
          correct_order: correctOrder,
          category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Grammar',
          level: typeof item.level === 'string' && item.level.trim() ? item.level.trim() : 'A1',
          xp: Number(item.xp) > 0 ? Number(item.xp) : 10,
          hint: item.hint ? String(item.hint).trim() : null,
          explanation: item.explanation ? String(item.explanation).trim() : null,
          r2_content_key: r2Key,
          is_published: item.is_published !== undefined ? Boolean(item.is_published) : true,
          created_by: authData.user.id,
          import_batch_id: batchId,
          created_at: now,
          updated_at: now
        };

        try {
          await putJsonContent(r2Key, {
            id: record.id,
            sentence: record.sentence,
            scrambled_words: record.scrambled_words,
            correct_order: record.correct_order,
            category: record.category,
            level: record.level,
            xp: record.xp,
            hint: record.hint,
            explanation: record.explanation,
            created_at: record.created_at
          });
        } catch (e) {}

        if (serverSupabase) {
          try {
            await serverSupabase.from('reorder_activities').insert([record]);
          } catch (e) {}
        }

        cache.unshift(record);
        imported.push(record);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    saveReordersCache(cache);

    res.json({
      success: true,
      importedCount: imported.length,
      failedCount: errors.length,
      batchId,
      activities: imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in POST /api/reorders/import-batch:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to import batch.' });
  }
});

// 3. GET /api/reorders/admin - Admin list with filtering & stats
app.get('/api/reorders/admin', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { search, category, level, published } = req.query;
    let allActivities = loadReordersCache();
    const completions = loadReorderCompletionsCache();

    if (serverSupabase) {
      try {
        const { data: dbActivities, error: sbErr } = await serverSupabase
          .from('reorder_activities')
          .select('*')
          .order('created_at', { ascending: false });

        if (!sbErr && Array.isArray(dbActivities) && dbActivities.length > 0) {
          const dbMap = new Map(dbActivities.map(a => [a.id, a]));
          const merged = [...dbActivities];
          for (const cached of allActivities) {
            if (!dbMap.has(cached.id)) {
              merged.push(cached);
            }
          }
          allActivities = merged;
          saveReordersCache(allActivities);
        }
      } catch (e) {
        console.warn('[Supabase admin reorders notice]:', e.message);
      }
    }

    let filtered = [...allActivities];

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(a =>
        a.sentence?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.explanation?.toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(a => a.category?.toLowerCase() === String(category).toLowerCase());
    }

    if (level && level !== 'all') {
      filtered = filtered.filter(a => a.level?.toLowerCase() === String(level).toLowerCase());
    }

    if (published && published !== 'all') {
      const isPub = published === 'published' || published === 'true';
      filtered = filtered.filter(a => Boolean(a.is_published) === isPub);
    }

    const stats = {
      totalActivities: allActivities.length,
      publishedActivities: allActivities.filter(a => a.is_published).length,
      draftActivities: allActivities.filter(a => !a.is_published).length,
      totalCompletions: completions.length,
      totalXpAwarded: completions.reduce((sum, c) => sum + (c.xp_awarded || 0), 0)
    };

    res.json({
      success: true,
      data: {
        activities: filtered,
        stats,
        total: filtered.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/reorders/admin:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch admin activities.' });
  }
});

// 4. GET /api/reorders/feed - Student Feed pool of published activities
app.get('/api/reorders/feed', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';

    let allActivities = loadReordersCache();
    let allCompletions = loadReorderCompletionsCache();

    if (serverSupabase) {
      try {
        const { data: dbActivities, error: sbErr } = await serverSupabase
          .from('reorder_activities')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (!sbErr && Array.isArray(dbActivities) && dbActivities.length > 0) {
          const dbMap = new Map(dbActivities.map(a => [a.id, a]));
          const merged = [...dbActivities];
          for (const cached of allActivities) {
            if (!dbMap.has(cached.id)) {
              merged.push(cached);
            }
          }
          allActivities = merged;
          saveReordersCache(allActivities);
        }

        if (userId !== 'guest_user') {
          const { data: dbCompletions } = await serverSupabase
            .from('reorder_completions')
            .select('*')
            .eq('user_id', userId);

          if (dbCompletions && Array.isArray(dbCompletions)) {
            const compMap = new Map(allCompletions.map(c => [`${c.activity_id}_${c.user_id}`, c]));
            dbCompletions.forEach(c => compMap.set(`${c.activity_id}_${c.user_id}`, c));
            allCompletions = Array.from(compMap.values());
            saveReorderCompletionsCache(allCompletions);
          }
        }
      } catch (e) {
        console.warn('[Supabase feed reorders notice]:', e.message);
      }
    }

    const published = allActivities.filter(a => a.is_published);
    if (published.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const userCompletionsMap = new Map();
    allCompletions.filter(c => c.user_id === userId).forEach(c => {
      userCompletionsMap.set(c.activity_id, c);
    });

    const enriched = published.map(a => {
      const userComp = userCompletionsMap.get(a.id);
      return {
        ...a,
        has_completed: Boolean(userComp?.is_correct),
        user_order: userComp?.user_order || null
      };
    });

    // Sort to prioritize uncompleted activities, then shuffle lightly
    const uncompleted = enriched.filter(a => !a.has_completed).sort(() => Math.random() - 0.5);
    const completed = enriched.filter(a => a.has_completed).sort(() => Math.random() - 0.5);
    const feedPool = [...uncompleted, ...completed].slice(0, 15);

    res.json({
      success: true,
      data: feedPool
    });
  } catch (error) {
    console.error('Error in GET /api/reorders/feed:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve reorders feed.' });
  }
});

// 5. GET /api/reorders/:id - Get single activity
app.get('/api/reorders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let activity = null;

    if (serverSupabase) {
      const { data } = await serverSupabase.from('reorder_activities').select('*').eq('id', id).single();
      if (data) activity = data;
    }

    if (!activity) {
      const cache = loadReordersCache();
      activity = cache.find(a => a.id === id);
    }

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found.' });
    }

    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Error in GET /api/reorders/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. PUT /api/reorders/:id - Update activity content (Admin only)
app.put('/api/reorders/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { sentence, scrambled_words, correct_order, category, level, xp, hint, explanation, is_published } = req.body;

    const cache = loadReordersCache();
    const index = cache.findIndex(a => a.id === id);

    if (index === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Activity not found.' });
    }

    const existing = index !== -1 ? cache[index] : null;
    const now = new Date().toISOString();

    const { sentence: cleanSentence, correctOrder: cleanCorrect, scrambledWords: cleanScrambled } = processReorderWords({
      sentence: sentence !== undefined ? sentence : existing?.sentence,
      correct_order: correct_order !== undefined ? correct_order : existing?.correct_order,
      scrambled_words: scrambled_words !== undefined ? scrambled_words : existing?.scrambled_words
    });

    if (cleanCorrect.length < 3 || cleanCorrect.length > 6) {
      return res.status(400).json({ success: false, error: `Sentence must contain between 3 and 6 words (received ${cleanCorrect.length}).` });
    }

    const updated = {
      ...(existing || {}),
      id,
      sentence: cleanSentence,
      scrambled_words: cleanScrambled,
      correct_order: cleanCorrect,
      category: category !== undefined ? category.trim() : existing?.category || 'Grammar',
      level: level !== undefined ? level.trim() : existing?.level || 'A1',
      xp: Number(xp) > 0 ? Number(xp) : existing?.xp || 10,
      hint: hint !== undefined ? (hint ? String(hint).trim() : null) : existing?.hint,
      explanation: explanation !== undefined ? (explanation ? String(explanation).trim() : null) : existing?.explanation,
      is_published: is_published !== undefined ? Boolean(is_published) : existing?.is_published ?? true,
      r2_content_key: existing?.r2_content_key || buildReorderContentKey(id),
      updated_at: now
    };

    if (index !== -1) {
      cache[index] = updated;
      saveReordersCache(cache);
    }

    // Update R2 content JSON
    try {
      await putJsonContent(updated.r2_content_key, {
        id: updated.id,
        sentence: updated.sentence,
        scrambled_words: updated.scrambled_words,
        correct_order: updated.correct_order,
        category: updated.category,
        level: updated.level,
        xp: updated.xp,
        hint: updated.hint,
        explanation: updated.explanation,
        updated_at: now
      });
    } catch (e) {}

    if (serverSupabase) {
      try {
        await serverSupabase.from('reorder_activities').update(updated).eq('id', id);
      } catch (e) {
        console.warn('[Supabase update reorder notice]:', e.message);
      }
    }

    res.json({ success: true, message: 'Activity updated successfully.', data: updated });
  } catch (error) {
    console.error('Error in PUT /api/reorders/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. PUT /api/reorders/:id/publish - Toggle publish status (Admin only)
app.put('/api/reorders/:id/publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { is_published } = req.body;

    const cache = loadReordersCache();
    const index = cache.findIndex(a => a.id === id);

    if (index === -1 && !serverSupabase) {
      return res.status(404).json({ success: false, error: 'Activity not found.' });
    }

    const targetPub = is_published !== undefined ? Boolean(is_published) : !cache[index]?.is_published;
    const now = new Date().toISOString();

    if (index !== -1) {
      cache[index].is_published = targetPub;
      cache[index].updated_at = now;
      saveReordersCache(cache);
    }

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('reorder_activities')
          .update({ is_published: targetPub, updated_at: now })
          .eq('id', id);
      } catch (e) {
        console.warn('[Supabase publish reorder notice]:', e.message);
      }
    }

    res.json({
      success: true,
      message: `Activity ${targetPub ? 'published' : 'unpublished'} successfully.`,
      is_published: targetPub
    });
  } catch (error) {
    console.error('Error in PUT /api/reorders/:id/publish:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. DELETE /api/reorders/:id - Delete activity (Admin only)
app.delete('/api/reorders/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const cache = loadReordersCache();
    const target = cache.find(a => a.id === id);
    const updated = cache.filter(a => a.id !== id);
    saveReordersCache(updated);

    if (target?.r2_content_key) {
      try {
        await deleteObjects([target.r2_content_key]);
      } catch (e) {}
    }

    if (serverSupabase) {
      try {
        await serverSupabase.from('reorder_activities').delete().eq('id', id);
      } catch (e) {
        console.warn('[Supabase delete reorder notice]:', e.message);
      }
    }

    res.json({ success: true, deletedId: id, message: 'Activity deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/reorders/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. POST /api/reorders/complete - Submit student completion attempt
app.post('/api/reorders/complete', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';
    const { activityId, userOrder, usedHint } = req.body;

    if (!activityId || !Array.isArray(userOrder)) {
      return res.status(400).json({ success: false, error: 'activityId and userOrder array are required.' });
    }

    let activity = null;
    const cache = loadReordersCache();
    activity = cache.find(a => a.id === activityId);

    if (!activity && serverSupabase) {
      const { data } = await serverSupabase.from('reorder_activities').select('*').eq('id', activityId).single();
      if (data) activity = data;
    }

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found.' });
    }

    // Evaluate answer against correct order (case-insensitive string comparison for safety)
    const expected = activity.correct_order.map(w => w.trim().toLowerCase());
    const submitted = userOrder.map(w => String(w).trim().toLowerCase());
    const isCorrect = expected.length === submitted.length && expected.every((w, i) => w === submitted[i]);

    const completions = loadReorderCompletionsCache();
    const existing = completions.find(c => c.activity_id === activityId && c.user_id === userId);
    const alreadyCompleted = Boolean(existing && existing.is_correct);

    // Calculate XP: award once upon first correct completion (deduct 2 XP if hint was used, min 5 XP)
    let xpAwarded = 0;
    if (isCorrect && !alreadyCompleted) {
      const baseXP = Number(activity.xp) || 10;
      xpAwarded = usedHint ? Math.max(5, baseXP - 2) : baseXP;
    }

    if (!existing || (!existing.is_correct && isCorrect)) {
      const record = {
        id: existing?.id || crypto.randomUUID(),
        activity_id: activityId,
        user_id: userId,
        is_correct: isCorrect,
        user_order: userOrder,
        xp_awarded: xpAwarded,
        completed_at: new Date().toISOString()
      };

      if (existing) {
        const idx = completions.findIndex(c => c.id === existing.id);
        completions[idx] = record;
      } else {
        completions.push(record);
      }
      saveReorderCompletionsCache(completions);

      if (serverSupabase && userId !== 'guest_user') {
        try {
          await serverSupabase.from('reorder_completions').upsert([record], { onConflict: 'activity_id,user_id' });
        } catch (e) {
          console.warn('[Supabase completion notice]:', e.message);
        }
      }
    }

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_sentence: activity.sentence,
        explanation: activity.explanation,
        xp_awarded: xpAwarded,
        already_completed: alreadyCompleted
      }
    });
  } catch (error) {
    console.error('Error in POST /api/reorders/complete:', error);
    res.status(500).json({ success: false, error: 'Failed to record completion.' });
  }
});

// ============================================================================
// API ROUTES: SPELLING SCRAMBLE MICROLEARNING ACTIVITIES
// ============================================================================

const SPELLING_SCRAMBLES_CACHE_FILE = path.resolve(__dirname, 'server/data/spelling_scrambles_cache.json');
const SPELLING_COMPLETIONS_CACHE_FILE = path.resolve(__dirname, 'server/data/spelling_completions_cache.json');

function loadSpellingScramblesCache() {
  try {
    if (fs.existsSync(SPELLING_SCRAMBLES_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(SPELLING_SCRAMBLES_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Spelling Scrambles Cache Read Error]:', err.message);
  }
  return [];
}

function saveSpellingScramblesCache(data) {
  try {
    const dir = path.dirname(SPELLING_SCRAMBLES_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SPELLING_SCRAMBLES_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Spelling Scrambles Cache Write Error]:', err.message);
  }
}

function loadSpellingCompletionsCache() {
  try {
    if (fs.existsSync(SPELLING_COMPLETIONS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(SPELLING_COMPLETIONS_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Spelling Completions Cache Read Error]:', err.message);
  }
  return [];
}

function saveSpellingCompletionsCache(data) {
  try {
    const dir = path.dirname(SPELLING_COMPLETIONS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SPELLING_COMPLETIONS_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Spelling Completions Cache Write Error]:', err.message);
  }
}

// 1. GET /api/spelling-scrambles/feed - Student Feed Pool
app.get('/api/spelling-scrambles/feed', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;

    let scrambles = [];
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('spelling_scrambles')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data && data.length > 0) {
          scrambles = data;
        }
      } catch (err) {
        console.warn('[Supabase feed query fallback]:', err.message);
      }
    }

    if (scrambles.length === 0) {
      scrambles = loadSpellingScramblesCache().filter(s => s.is_published !== false);
    }

    // Attach completion status if user is authenticated
    let userCompletions = new Set();
    if (userId) {
      if (serverSupabase) {
        try {
          const { data } = await serverSupabase
            .from('spelling_scramble_completions')
            .select('scramble_id')
            .eq('user_id', userId);
          if (data) {
            data.forEach(c => userCompletions.add(c.scramble_id));
          }
        } catch {}
      } else {
        const completions = loadSpellingCompletionsCache();
        completions.filter(c => c.user_id === userId).forEach(c => userCompletions.add(c.scramble_id));
      }
    }

    const payload = scrambles.map(s => ({
      ...s,
      has_completed: userCompletions.has(s.id)
    }));

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error in GET /api/spelling-scrambles/feed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch spelling scrambles feed.' });
  }
});

// 2. GET /api/spelling-scrambles/admin - Admin management list with stats & filters
app.get('/api/spelling-scrambles/admin', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { search, category, difficulty, published } = req.query;

    let scrambles = [];
    if (serverSupabase) {
      try {
        let query = serverSupabase.from('spelling_scrambles').select('*').order('created_at', { ascending: false });
        if (category && category !== 'all') query = query.eq('category', category);
        if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty);
        if (published === 'published') query = query.eq('is_published', true);
        if (published === 'draft') query = query.eq('is_published', false);
        if (search) {
          query = query.or(`word.ilike.%${search}%,clue.ilike.%${search}%,category.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (!error && data) {
          scrambles = data;
        }
      } catch (err) {
        console.warn('[Supabase admin query fallback]:', err.message);
      }
    }

    if (scrambles.length === 0) {
      scrambles = loadSpellingScramblesCache();
      if (category && category !== 'all') scrambles = scrambles.filter(s => s.category === category);
      if (difficulty && difficulty !== 'all') scrambles = scrambles.filter(s => s.difficulty === difficulty);
      if (published === 'published') scrambles = scrambles.filter(s => s.is_published === true);
      if (published === 'draft') scrambles = scrambles.filter(s => s.is_published === false);
      if (search) {
        const q = search.toLowerCase();
        scrambles = scrambles.filter(s =>
          (s.word && s.word.toLowerCase().includes(q)) ||
          (s.clue && s.clue.toLowerCase().includes(q)) ||
          (s.category && s.category.toLowerCase().includes(q))
        );
      }
    }

    const allCache = loadSpellingScramblesCache();
    const completions = loadSpellingCompletionsCache();

    const stats = {
      totalScrambles: allCache.length,
      publishedScrambles: allCache.filter(s => s.is_published !== false).length,
      draftScrambles: allCache.filter(s => s.is_published === false).length,
      totalCompletions: completions.length,
      totalXpAwarded: completions.reduce((acc, c) => acc + (c.xp_awarded || 0), 0)
    };

    res.json({ success: true, data: { scrambles, stats, total: scrambles.length } });
  } catch (error) {
    console.error('Error in GET /api/spelling-scrambles/admin:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin spelling scrambles.' });
  }
});

// 3. POST /api/spelling-scrambles - Create single activity or array
app.post('/api/spelling-scrambles', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const body = req.body;
    const items = Array.isArray(body) ? body : [body];
    const createdItems = [];
    const cache = loadSpellingScramblesCache();

    for (const item of items) {
      const word = String(item.word || '').trim().toUpperCase();
      if (!word || !/^[A-Z]+$/.test(word) || word.length < 3) {
        return res.status(400).json({
          success: false,
          error: `Invalid word "${word}". Must be at least 3 letters containing only A-Z.`
        });
      }

      let scrambledLetters = Array.isArray(item.scrambled_letters) && item.scrambled_letters.length > 0
        ? item.scrambled_letters.map(l => String(l).toUpperCase().trim()).filter(Boolean)
        : Array.isArray(item.scrambledLetters) && item.scrambledLetters.length > 0
        ? item.scrambledLetters.map(l => String(l).toUpperCase().trim()).filter(Boolean)
        : word.split('').sort(() => Math.random() - 0.5);

      const clue = String(item.clue || '').trim();
      if (!clue) {
        return res.status(400).json({ success: false, error: 'Clue is required for spelling scramble.' });
      }

      let difficulty = 'Easy';
      if (item.difficulty && ['easy', 'medium', 'hard'].includes(String(item.difficulty).toLowerCase())) {
        const d = String(item.difficulty).toLowerCase();
        difficulty = d === 'medium' ? 'Medium' : d === 'hard' ? 'Hard' : 'Easy';
      }

      // Derive timer and default XP strictly from difficulty
      const timerSeconds = difficulty === 'Easy' ? 30 : difficulty === 'Medium' ? 45 : 60;
      const defaultXP = difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 15 : 20;
      const xp = Number(item.xp) > 0 ? Number(item.xp) : defaultXP;
      const category = String(item.category || 'Vocabulary').trim();
      const isPublished = item.is_published !== undefined ? Boolean(item.is_published) : true;

      const id = item.id || `scramble_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const r2ContentKey = buildSpellingScrambleContentKey(id);

      const fullRecord = {
        id,
        word,
        scrambled_letters: scrambledLetters,
        clue,
        category,
        difficulty,
        xp,
        timer_seconds: timerSeconds,
        r2_content_key: r2ContentKey,
        is_published: isPublished,
        created_by: authData.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 1. Write full content JSON to Cloudflare R2
      try {
        await putJsonContent(r2ContentKey, fullRecord);
      } catch (r2Err) {
        console.warn(`[R2 Put Warning for ${r2ContentKey}]:`, r2Err.message);
      }

      // 2. Persist to Supabase if configured
      if (serverSupabase) {
        try {
          await serverSupabase.from('spelling_scrambles').upsert([fullRecord]);
        } catch (dbErr) {
          console.warn('[Supabase Scramble Upsert Warning]:', dbErr.message);
        }
      }

      // 3. Update local cache
      const existingIdx = cache.findIndex(s => s.id === id);
      if (existingIdx >= 0) cache[existingIdx] = fullRecord;
      else cache.unshift(fullRecord);

      createdItems.push(fullRecord);
    }

    saveSpellingScramblesCache(cache);

    res.status(201).json({
      success: true,
      data: Array.isArray(body) ? createdItems : createdItems[0]
    });
  } catch (error) {
    console.error('Error in POST /api/spelling-scrambles:', error);
    res.status(500).json({ success: false, error: 'Failed to create spelling scramble activity.' });
  }
});

// 4. POST /api/spelling-scrambles/import-batch - Admin batch import
app.post('/api/spelling-scrambles/import-batch', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { activities, scrambles } = req.body;
    const rawList = Array.isArray(activities) ? activities : Array.isArray(scrambles) ? scrambles : [];

    if (rawList.length === 0) {
      return res.status(400).json({ success: false, error: 'No spelling scrambles provided for import.' });
    }

    const batchId = `batch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const cache = loadSpellingScramblesCache();
    const imported = [];
    const failed = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      try {
        const word = String(item.word || '').trim().toUpperCase();
        if (!word || !/^[A-Z]+$/.test(word) || word.length < 3) {
          failed.push({ index: i + 1, word, error: 'Invalid word format (3-16 letters A-Z required).' });
          continue;
        }

        let scrambledLetters = Array.isArray(item.scrambledLetters) && item.scrambledLetters.length > 0
          ? item.scrambledLetters.map(l => String(l).toUpperCase().trim()).filter(Boolean)
          : Array.isArray(item.scrambled_letters) && item.scrambled_letters.length > 0
          ? item.scrambled_letters.map(l => String(l).toUpperCase().trim()).filter(Boolean)
          : word.split('').sort(() => Math.random() - 0.5);

        const clue = String(item.clue || '').trim();
        if (!clue) {
          failed.push({ index: i + 1, word, error: 'Clue is missing or empty.' });
          continue;
        }

        let difficulty = 'Easy';
        if (item.difficulty && ['easy', 'medium', 'hard'].includes(String(item.difficulty).toLowerCase())) {
          const d = String(item.difficulty).toLowerCase();
          difficulty = d === 'medium' ? 'Medium' : d === 'hard' ? 'Hard' : 'Easy';
        }

        const timerSeconds = difficulty === 'Easy' ? 30 : difficulty === 'Medium' ? 45 : 60;
        const defaultXP = difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 15 : 20;
        const xp = Number(item.xp) > 0 ? Number(item.xp) : defaultXP;
        const category = String(item.category || 'Vocabulary').trim();
        const isPublished = item.is_published !== undefined ? Boolean(item.is_published) : true;

        const id = `scramble_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}`;
        const r2ContentKey = buildSpellingScrambleContentKey(id);

        const fullRecord = {
          id,
          word,
          scrambled_letters: scrambledLetters,
          clue,
          category,
          difficulty,
          xp,
          timer_seconds: timerSeconds,
          r2_content_key: r2ContentKey,
          is_published: isPublished,
          created_by: authData.user.id,
          import_batch_id: batchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Write to R2
        try {
          await putJsonContent(r2ContentKey, fullRecord);
        } catch (r2Err) {
          console.warn(`[R2 Put Notice for batch item ${id}]:`, r2Err.message);
        }

        imported.push(fullRecord);
      } catch (err) {
        failed.push({ index: i + 1, word: item.word || 'Unknown', error: err.message });
      }
    }

    // Persist to Supabase in bulk
    if (serverSupabase && imported.length > 0) {
      try {
        await serverSupabase.from('spelling_scrambles').upsert(imported);
      } catch (dbErr) {
        console.warn('[Supabase Batch Insert Warning]:', dbErr.message);
      }
    }

    // Update Cache
    cache.unshift(...imported);
    saveSpellingScramblesCache(cache);

    res.json({
      success: true,
      batchId,
      importedCount: imported.length,
      failedCount: failed.length,
      failed,
      scrambles: imported
    });
  } catch (error) {
    console.error('Error in POST /api/spelling-scrambles/import-batch:', error);
    res.status(500).json({ success: false, error: 'Failed to process batch import.' });
  }
});

// 5. PUT /api/spelling-scrambles/:id - Update activity
app.put('/api/spelling-scrambles/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const body = req.body;
    const cache = loadSpellingScramblesCache();
    const existing = cache.find(s => s.id === id);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Spelling scramble not found.' });
    }

    const word = body.word ? String(body.word).trim().toUpperCase() : existing.word;
    const clue = body.clue ? String(body.clue).trim() : existing.clue;
    const category = body.category ? String(body.category).trim() : existing.category;

    let difficulty = existing.difficulty;
    if (body.difficulty && ['easy', 'medium', 'hard'].includes(String(body.difficulty).toLowerCase())) {
      const d = String(body.difficulty).toLowerCase();
      difficulty = d === 'medium' ? 'Medium' : d === 'hard' ? 'Hard' : 'Easy';
    }

    const timerSeconds = difficulty === 'Easy' ? 30 : difficulty === 'Medium' ? 45 : 60;
    const xp = Number(body.xp) > 0 ? Number(body.xp) : existing.xp;
    const isPublished = body.is_published !== undefined ? Boolean(body.is_published) : existing.is_published;

    let scrambledLetters = existing.scrambled_letters;
    if (Array.isArray(body.scrambled_letters) && body.scrambled_letters.length > 0) {
      scrambledLetters = body.scrambled_letters.map(l => String(l).toUpperCase().trim()).filter(Boolean);
    } else if (body.word && body.word !== existing.word) {
      scrambledLetters = word.split('').sort(() => Math.random() - 0.5);
    }

    const updatedRecord = {
      ...existing,
      word,
      scrambled_letters: scrambledLetters,
      clue,
      category,
      difficulty,
      xp,
      timer_seconds: timerSeconds,
      is_published: isPublished,
      updated_at: new Date().toISOString()
    };

    // Update R2
    if (updatedRecord.r2_content_key) {
      try {
        await putJsonContent(updatedRecord.r2_content_key, updatedRecord);
      } catch (r2Err) {
        console.warn(`[R2 Put Warning on update ${id}]:`, r2Err.message);
      }
    }

    // Update Supabase
    if (serverSupabase) {
      try {
        await serverSupabase.from('spelling_scrambles').update(updatedRecord).eq('id', id);
      } catch (dbErr) {
        console.warn('[Supabase Scramble Update Warning]:', dbErr.message);
      }
    }

    // Update local cache
    const idx = cache.findIndex(s => s.id === id);
    if (idx >= 0) cache[idx] = updatedRecord;
    saveSpellingScramblesCache(cache);

    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error('Error in PUT /api/spelling-scrambles/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to update spelling scramble.' });
  }
});

// 6. PUT /api/spelling-scrambles/:id/publish - Toggle published status
app.put('/api/spelling-scrambles/:id/publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { is_published } = req.body;
    const cache = loadSpellingScramblesCache();
    const existing = cache.find(s => s.id === id);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Spelling scramble not found.' });
    }

    const nextPublished = is_published !== undefined ? Boolean(is_published) : !existing.is_published;
    existing.is_published = nextPublished;
    existing.updated_at = new Date().toISOString();

    if (serverSupabase) {
      try {
        await serverSupabase.from('spelling_scrambles').update({ is_published: nextPublished, updated_at: existing.updated_at }).eq('id', id);
      } catch {}
    }

    saveSpellingScramblesCache(cache);
    res.json({ success: true, is_published: nextPublished });
  } catch (error) {
    console.error('Error in PUT /api/spelling-scrambles/:id/publish:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle publish status.' });
  }
});

// 7. DELETE /api/spelling-scrambles/:id - Delete activity + R2 object
app.delete('/api/spelling-scrambles/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const cache = loadSpellingScramblesCache();
    const target = cache.find(s => s.id === id);

    if (target?.r2_content_key) {
      try {
        await deleteObjects([target.r2_content_key]);
      } catch (r2Err) {
        console.warn(`[R2 Delete Warning for ${target.r2_content_key}]:`, r2Err.message);
      }
    }

    if (serverSupabase) {
      try {
        await serverSupabase.from('spelling_scrambles').delete().eq('id', id);
      } catch {}
    }

    const updated = cache.filter(s => s.id !== id);
    saveSpellingScramblesCache(updated);

    res.json({ success: true, message: 'Spelling scramble deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/spelling-scrambles/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to delete spelling scramble.' });
  }
});

// 8. POST /api/spelling-scrambles/complete - Record student completion and award XP
app.post('/api/spelling-scrambles/complete', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest_user';
    const { scrambleId, userWord, timeTakenSeconds } = req.body;

    if (!scrambleId) {
      return res.status(400).json({ success: false, error: 'scrambleId is required.' });
    }

    const cache = loadSpellingScramblesCache();
    const scramble = cache.find(s => s.id === scrambleId);

    if (!scramble) {
      return res.status(404).json({ success: false, error: 'Spelling scramble activity not found.' });
    }

    const isCorrect = String(userWord || '').trim().toUpperCase() === scramble.word.trim().toUpperCase();

    // Check if already completed by this user
    const completions = loadSpellingCompletionsCache();
    const existing = completions.find(c => c.scramble_id === scrambleId && c.user_id === userId);
    const alreadyCompleted = Boolean(existing && existing.is_correct);

    let xpAwarded = 0;
    if (isCorrect && !alreadyCompleted) {
      xpAwarded = scramble.xp || (scramble.difficulty === 'Hard' ? 20 : scramble.difficulty === 'Medium' ? 15 : 10);
    }

    const record = {
      id: existing ? existing.id : `comp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      scramble_id: scrambleId,
      user_id: userId,
      is_correct: isCorrect,
      time_taken_seconds: timeTakenSeconds || null,
      xp_awarded: xpAwarded,
      completed_at: new Date().toISOString()
    };

    if (existing) {
      const idx = completions.findIndex(c => c.id === existing.id);
      completions[idx] = record;
    } else {
      completions.push(record);
    }
    saveSpellingCompletionsCache(completions);

    if (serverSupabase && userId !== 'guest_user') {
      try {
        await serverSupabase.from('spelling_scramble_completions').upsert([record], { onConflict: 'scramble_id,user_id' });
      } catch (e) {
        console.warn('[Supabase scramble completion notice]:', e.message);
      }
    }

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_word: scramble.word,
        clue: scramble.clue,
        xp_awarded: xpAwarded,
        already_completed: alreadyCompleted,
        time_taken_seconds: timeTakenSeconds
      }
    });
  } catch (error) {
    console.error('Error in POST /api/spelling-scrambles/complete:', error);
    res.status(500).json({ success: false, error: 'Failed to record completion.' });
  }
});

// ============================================================================
// API ROUTES: ADMIN STORAGE & CLOUDFLARE R2 CONTROL PANEL
// ============================================================================

// 1. GET /api/admin/storage/status - Get R2 connection & storage statistics
app.get('/api/admin/storage/status', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const stats = await getStorageStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in GET /api/admin/storage/status:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve storage status.' });
  }
});

// 2. POST /api/admin/storage/test-connection - Run connection and lifecycle diagnostic test
app.post('/api/admin/storage/test-connection', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const result = await testR2Connection();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in POST /api/admin/storage/test-connection:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to test R2 connection.' });
  }
});

// 3. POST /api/admin/storage/migrate-legacy - Migrate existing database/cache content to R2 (Idempotent & Resumable)
app.post('/api/admin/storage/migrate-legacy', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    let migratedReadings = 0;
    let migratedQuizzes = 0;
    let migratedPolls = 0;
    const errors = [];

    // 1. Migrate Readings
    const readingsCache = loadReadingsCache();
    for (const reading of readingsCache) {
      if (!reading.r2_content_key) {
        try {
          const r2Key = buildReadingContentKey(reading.id);
          const readingContent = {
            id: reading.id,
            title: reading.title,
            subtitle: reading.subtitle,
            category: reading.category,
            level: reading.level,
            reading_time: reading.reading_time,
            paragraphs: reading.paragraphs,
            vocabulary: reading.vocabulary,
            questions: reading.questions,
            cover_image_url: reading.cover_image_url,
            cover_image_object_key: reading.cover_image_object_key,
            is_published: reading.is_published,
            created_at: reading.created_at,
            updated_at: reading.updated_at
          };

          await putJsonContent(r2Key, readingContent);
          reading.r2_content_key = r2Key;
          migratedReadings++;

          if (serverSupabase) {
            await serverSupabase.from('readings').update({ r2_content_key: r2Key }).eq('id', reading.id);
          }
        } catch (e) {
          errors.push({ type: 'reading', id: reading.id, error: e.message });
        }
      }
    }
    saveReadingsCache(readingsCache);

    // 2. Migrate Quizzes
    const quizCache = loadQuizCache();
    for (const quiz of quizCache) {
      if (!quiz.r2_content_key) {
        try {
          const r2Key = buildQuizContentKey(quiz.id);
          const quizContent = {
            id: quiz.id,
            question: quiz.question,
            options: quiz.options,
            correct_answer: quiz.correct_answer,
            explanation: quiz.explanation,
            category: quiz.category,
            difficulty: quiz.difficulty,
            xp: quiz.xp,
            is_published: quiz.is_published,
            created_at: quiz.created_at,
            updated_at: quiz.updated_at
          };

          await putJsonContent(r2Key, quizContent);
          quiz.r2_content_key = r2Key;
          migratedQuizzes++;

          if (serverSupabase) {
            await serverSupabase.from('quiz_bits').update({ r2_content_key: r2Key }).eq('id', quiz.id);
          }
        } catch (e) {
          errors.push({ type: 'quiz', id: quiz.id, error: e.message });
        }
      }
    }
    saveQuizCache(quizCache);

    // 3. Migrate Polls
    const pollsCache = loadPollsCache();
    for (const poll of pollsCache) {
      if (!poll.r2_content_key) {
        try {
          const r2Key = buildPollContentKey(poll.id);
          const pollContent = {
            id: poll.id,
            question: poll.question,
            options: poll.options,
            category: poll.category,
            allow_multiple: poll.allow_multiple,
            show_results_after_vote: poll.show_results_after_vote,
            is_published: poll.is_published,
            prompt: poll.prompt,
            created_at: poll.created_at,
            updated_at: poll.updated_at
          };

          await putJsonContent(r2Key, pollContent);
          poll.r2_content_key = r2Key;
          migratedPolls++;

          if (serverSupabase) {
            await serverSupabase.from('polls').update({ r2_content_key: r2Key }).eq('id', poll.id);
          }
        } catch (e) {
          errors.push({ type: 'poll', id: poll.id, error: e.message });
        }
      }
    }
    savePollsCache(pollsCache);

    res.json({
      success: true,
      message: `Migration completed: ${migratedReadings} readings, ${migratedQuizzes} quizzes, ${migratedPolls} polls stored in Cloudflare R2.`,
      data: {
        migratedReadings,
        migratedQuizzes,
        migratedPolls,
        errors
      }
    });
  } catch (error) {
    console.error('Error in POST /api/admin/storage/migrate-legacy:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to execute legacy migration.' });
  }
});

export default app;

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.mjs') || process.env.SERVE_STANDALONE === 'true');
const isTestRunner = process.argv.some(arg => arg.includes('test'));

if (isDirectRun && !isTestRunner && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`EdTechra-Bitz API Server listening on port ${PORT}`);
  });
}
