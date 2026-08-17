import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getCachedOrFetchShorts,
  fetchFromYouTubeAPI,
  loadLocalCache,
  saveLocalCache
} from './server/youtubeService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

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
// API ROUTES
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
      shorts = shorts.filter(s => s.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by difficulty
    if (difficulty && difficulty !== 'All') {
      shorts = shorts.filter(s => s.difficulty === difficulty);
    }

    // Filter by search query (title, description, category, vocabulary)
    if (search && search.trim()) {
      const q = search.toLowerCase();
      shorts = shorts.filter(s => {
        const titleMatch = s.title.toLowerCase().includes(q);
        const descMatch = s.description.toLowerCase().includes(q);
        const catMatch = s.category.toLowerCase().includes(q);
        const vocabMatch = s.learning_content?.vocabulary?.some(v => v.word.toLowerCase().includes(q));
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
    console.log('[API] Syncing latest videos from @EdTechraBitz...');
    const updatedVideos = await fetchFromYouTubeAPI();
    res.json({
      success: true,
      message: `Synchronized ${updatedVideos.length} Shorts from @EdTechraBitz`,
      count: updatedVideos.length,
      lastSync: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/youtube/sync:', error);
    res.status(500).json({ success: false, error: 'Failed to sync with YouTube' });
  }
});

// 4. PUT /api/youtube/content/:id - Admin edit vocabulary, quiz, or status
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

// 5. POST /api/youtube/progress - Save student progress
app.post('/api/youtube/progress', (req, res) => {
  try {
    const { userId = 'alex-walker', videoId, watched, watchProgress, quizCompleted, quizScore, quizTotal, completed } = req.body;
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
      completed: completed !== undefined ? completed : (prev.completed || (watched && quizCompleted)),
      last_watched_at: new Date().toISOString()
    };

    saveProgress(progressMap);
    res.json({ success: true, data: progressMap[userId][videoId] });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ success: false, error: 'Failed to save progress' });
  }
});

// 6. GET /api/youtube/progress/:userId - Get progress summary for Dashboard
app.get('/api/youtube/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const progressMap = loadProgress();
    const userProgress = progressMap[userId] || {};
    const progressList = Object.values(userProgress);

    const shorts = await getCachedOrFetchShorts();
    const shortsMap = new Map(shorts.map(s => [s.youtube_video_id, s]));

    const completedList = progressList.filter(p => p.completed);
    const quizList = progressList.filter(p => p.quiz_completed);
    const totalQuizScore = quizList.reduce((acc, curr) => acc + (curr.quiz_score / curr.quiz_total), 0);
    const avgQuizScore = quizList.length > 0 ? Math.round((totalQuizScore / quizList.length) * 100) : 0;

    let vocabLearnedCount = 0;
    completedList.forEach(p => {
      const vid = shortsMap.get(p.youtube_video_id);
      if (vid?.learning_content?.vocabulary) {
        vocabLearnedCount += vid.learning_content.vocabulary.length;
      }
    });

    const recentHistory = progressList
      .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime())
      .slice(0, 5)
      .map(p => {
        const vid = shortsMap.get(p.youtube_video_id);
        return {
          id: p.youtube_video_id,
          title: vid?.title || 'Educational Short',
          category: vid?.category || 'Science',
          score: `${p.quiz_score}/${p.quiz_total}`,
          completed: p.completed,
          date: p.last_watched_at
        };
      });

    res.json({
      success: true,
      stats: {
        shortsWatched: progressList.filter(p => p.watched).length,
        quizzesCompleted: quizList.length,
        averageQuizScore: avgQuizScore,
        learningProgressPercent: shorts.length > 0 ? Math.round((completedList.length / shorts.length) * 100) : 0,
        vocabularyLearned: vocabLearnedCount,
        totalCompleted: completedList.length,
        recentHistory
      }
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve progress' });
  }
});

// ============================================================================
// PRODUCTION STATIC ASSET SERVING & SPA FALLBACK
// ============================================================================
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// Warm up initial cache on start
if (process.env.VERCEL !== '1') {
  getCachedOrFetchShorts()
    .then(shorts => console.log(`[Server] Initialized with ${shorts.length} @EdTechraBitz Shorts.`))
    .catch(err => console.error('[Server Init Warning]:', err.message));

  app.listen(PORT, () => {
    console.log(`[Server] EdTechra-Bitz API Server running on port ${PORT}`);
  });
}

export default app;

