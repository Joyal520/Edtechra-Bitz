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
import {
  buildPresignedUpload,
  buildObjectKey,
  buildPublicUrl,
  deleteObjects,
  validateImageUpload
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

// Initialize server-side Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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
// TEMPORARY DIAGNOSTIC: Auth configuration check (REMOVE after debugging)
// ============================================================================
app.post('/api/debug/auth-check', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'SET (' + process.env.VITE_SUPABASE_URL.substring(0, 30) + '...)' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET (' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...)' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (starts: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...)' : 'MISSING',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'SET (starts: ' + process.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + '...)' : 'MISSING',
      resolvedUrl: supabaseUrl || 'NULL',
      resolvedKey: supabaseKey ? 'SET (starts: ' + supabaseKey.substring(0, 10) + '...)' : 'NULL'
    },
    serverSupabase: serverSupabase ? 'INITIALIZED' : 'NULL — ALL AUTH WILL FAIL',
    authHeaderPresent: !!(req.headers.authorization),
    authHeaderFormat: req.headers.authorization ? req.headers.authorization.substring(0, 15) + '...' : 'NONE'
  };

  // If a token is provided, try to validate it
  if (req.headers.authorization && serverSupabase) {
    const token = req.headers.authorization.startsWith('Bearer ') 
      ? req.headers.authorization.substring(7).trim() 
      : null;
    if (token) {
      try {
        const { data: { user }, error } = await serverSupabase.auth.getUser(token);
        diagnostics.tokenValidation = {
          success: !!user,
          userId: user?.id || null,
          userEmail: user?.email || null,
          error: error?.message || null,
          errorStatus: error?.status || null
        };
      } catch (e) {
        diagnostics.tokenValidation = { success: false, error: e.message };
      }
    }
  }

  res.json({ success: true, diagnostics });
});

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
        await serverSupabase.from('student_posts').insert([newPost]);
      } catch (sbErr) {
        console.warn('[Supabase student_posts insert notice]:', sbErr.message);
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

        if (!dbErr && Array.isArray(dbPosts) && dbPosts.length > 0) {
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
        // Fallback to cache
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

// 4. DELETE /api/posts/:id - Delete student post & delete associated R2 object
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to delete posts.' });
    }

    const { id } = req.params;
    const postsCache = loadPostsCache();
    const postIndex = postsCache.findIndex(p => p.id === id);

    if (postIndex === -1) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const post = postsCache[postIndex];

    // Ownership & Admin verification
    const isOwner = post.user_id === authData.user.id;
    const isAdmin = authData.profile.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Permission denied: You cannot delete another student\'s post.' });
    }

    // 1. Delete associated media object from Cloudflare R2 bucket
    if (post.image_object_key) {
      try {
        await deleteObjects([post.image_object_key]);
        console.log(`[R2] Deleted object: ${post.image_object_key}`);
      } catch (r2Err) {
        console.error('[R2 Delete Warning]:', r2Err.message);
      }
    }

    // 2. Remove from local cache
    postsCache.splice(postIndex, 1);
    savePostsCache(postsCache);

    // 3. Remove from Supabase student_posts table
    if (serverSupabase) {
      try {
        await serverSupabase.from('student_posts').delete().eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase delete student_posts notice]:', sbErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Post and media deleted successfully.'
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

export default app;

if (process.env.NODE_ENV !== 'production' || process.env.SERVE_STANDALONE === 'true') {
  app.listen(PORT, () => {
    console.log(`EdTechra-Bitz API Server listening on port ${PORT}`);
  });
}
