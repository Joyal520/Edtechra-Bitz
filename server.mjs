import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
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
  sanitizeSegment
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

// Server Initialization Diagnostics (logged once at startup)
console.log('[Server Init] Environment diagnostics:');
console.log(`  SUPABASE_URL: ${supabaseUrl ? '✓ configured' : '✗ MISSING'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ configured' : '✗ MISSING (falling back to anon key)'}`);
console.log(`  VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✓ configured' : '✗ MISSING'}`);
console.log(`  serverSupabase initialized: ${serverSupabase ? '✓ yes' : '✗ NO — all auth will fail'}`);
console.log(`  R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? '✓ configured' : '✗ MISSING'}`);
console.log(`  R2_BUCKET: ${process.env.R2_BUCKET ? '✓ configured' : '✗ MISSING'}`);
console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ configured' : '✗ MISSING'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

// Helper: Verify Supabase User Token from Request Authorization Header
async function verifyAuthUser(req) {
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

export default app;

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.mjs') || process.env.SERVE_STANDALONE === 'true');
const isTestRunner = process.argv.some(arg => arg.includes('test'));

if (isDirectRun && !isTestRunner && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`EdTechra-Bitz API Server listening on port ${PORT}`);
  });
}
