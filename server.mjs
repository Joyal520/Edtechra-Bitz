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
app.use(express.json());

// Initialize server-side Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serverSupabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

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
    const result = await syncYouTubeChannel('manual');
    res.json(result);
  } catch (error) {
    console.error('Error in /api/youtube/sync:', error);
    res.status(500).json({ success: false, error: 'Failed to sync with YouTube' });
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
    progressMap[userId][videoId] = {
      user_id: userId,
      youtube_video_id: videoId,
      watched: watched !== undefined ? watched : prev.watched || false,
      watch_progress: watchProgress !== undefined ? watchProgress : prev.watch_progress || 0,
      quiz_completed: quizCompleted !== undefined ? quizCompleted : prev.quiz_completed || false,
      quiz_score: quizScore !== undefined ? quizScore : prev.quiz_score || 0,
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

export default app;

if (process.env.NODE_ENV !== 'production' || process.env.SERVE_STANDALONE === 'true') {
  app.listen(PORT, () => {
    console.log(`EdTechra-Bitz API Server listening on port ${PORT}`);
  });
}
