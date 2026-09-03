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
  buildWordOfTheDayContentKey,
  buildVocabularyContentKey,
  buildVocabularyImageKey,
  buildAvatarObjectKey,
  buildClassroomObjectKey,
  validateClassroomUpload,
  buildTemporaryOcrKey,
  validateOcrUpload,
  buildPresignedDownloadUrl,
  buildOcrReportKey,
  buildExamSourceObjectKey,
  buildExamAttachmentObjectKey,
  buildExamSubmissionObjectKey,
  buildExamReportObjectKey,
  buildTeachingReportObjectKey,
  buildCourseMediaObjectKey,
  buildCourseCoverObjectKey,
  buildTeacherMaterialObjectKey,
  validateTeacherStorageQuota
} from './server/r2Service.mjs';
import {
  getClassroomTeachingIntelligence,
  createThirtyDayReport,
  computeClassroomMetrics
} from './server/teachingIntelligenceService.mjs';
import { computeClassroomAnalytics } from './server/classroomAnalyticsService.mjs';
import {
  buildLessonFromMaterial,
  generateCourseQuestionsWithAI,
  improveCourseContentWithAI,
  generateCoursePlanWithAI,
  generateStructuredLessonWithAI,
  compileCrossClassroomAnalytics,
  calculateConceptMastery
} from './server/courseStudioService.mjs';
import {
  generateExam,
  validateGenerationPayload,
  gradeExamAttempt,
  processScoreAnalysisAndUploadToR2,
  getTeacherExamsFromSupabase,
  saveExamToSupabase,
  republishExamToClassrooms
} from './server/exam2Service.mjs';
import {
  ocrEvaluationQueue,
  cleanupStaleTemporaryFiles,
  OCR_CATEGORIES
} from './server/ocrService.mjs';
import {
  aiChallengeQueue,
  generateChallengeEvaluationSpec,
  buildChallengeSubmissionKey,
  buildChallengeReferenceKey,
  cleanupExpiredChallengeFiles,
  AI_CHALLENGE_CATEGORIES
} from './server/aiChallengeService.mjs';
import { gradeTaskSubmission, TASK_CATEGORIES } from './server/hybridGradingService.mjs';
import { generateEvaluationReportPdf } from './server/pdfReportService.mjs';
import { getR2Config } from './server/r2Config.mjs';
import { moderatePostContent } from './server/moderationService.mjs';
import { generateArticleCoverImage, buildArticleImagePrompt } from './server/geminiImageService.mjs';
import {
  loadVocabularyCache,
  saveVocabularyCache,
  loadImportBatchesCache,
  saveImportBatchesCache,
  logImportBatchRecord,
  validateVocabularyBatch,
  validateVocabularyLocal,
  testGeminiConnection,
  publishScheduledVocabularyItems,
  resolveContentType,
  normalizeVocabularyTitle,
  DEFAULT_VOCABULARY_IMAGE
} from './server/vocabularyService.mjs';

import {
  createQueueBatch,
  processPublishingQueue,
  getQueueOverview,
  publishItemNow,
  pauseQueueBatch,
  resumeQueueBatch,
  cancelQueueBatch,
  retryQueueItem
} from './server/postQueueService.mjs';
import { evaluateStudentEssay } from './server/courseEssayEvaluationService.mjs';
import { knowledgeBitzService } from './server/knowledgeBitzService.mjs';
import { searchPixabay } from './server/pixabayService.mjs';

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
const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL) || cleanEnv(process.env.SUPABASE_URL) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.SUPABASE_SERVICE_KEY) || cleanEnv(process.env.VITE_SUPABASE_ANON_KEY) || cleanEnv(process.env.SUPABASE_ANON_KEY);
const serverSupabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize server-side OpenAI client
const openaiApiKey = cleanEnv(process.env.OPENAI_API_KEY);
const serverOpenAI = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// Initialize AI OCR Worksheet Grader Engine
ocrEvaluationQueue.init({ serverSupabase, serverOpenAI });

// Background cleanup workers: purge stale temporary OCR files and expired challenges (only in long-running environments, not in serverless)
if (serverSupabase && process.env.VERCEL !== '1') {
  cleanupStaleTemporaryFiles(serverSupabase).catch(() => {});
  setInterval(() => {
    cleanupStaleTemporaryFiles(serverSupabase).catch(() => {});
  }, 30 * 60 * 1000);

  cleanupExpiredChallengeFiles(serverSupabase).catch(() => {});
  setInterval(() => {
    cleanupExpiredChallengeFiles(serverSupabase).catch(() => {});
  }, 60 * 60 * 1000);
}

// Initialize AI Challenge Competition Queue Worker
aiChallengeQueue.init({ serverSupabase, serverOpenAI });

// Normalize URL path so that both /api/... and /... match Express routes reliably
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && req.originalUrl && req.originalUrl.startsWith('/api')) {
    req.url = req.originalUrl;
  }
  next();
});

// Health & Environment Diagnostic Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseServiceKey: Boolean(cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.SUPABASE_SERVICE_KEY)),
      hasSupabaseAnonKey: Boolean(cleanEnv(process.env.VITE_SUPABASE_ANON_KEY) || cleanEnv(process.env.SUPABASE_ANON_KEY)),
      hasServerSupabase: Boolean(serverSupabase),
      hasPixabayKey: Boolean(cleanEnv(process.env.PIXABAY_API_KEY)),
      nodeEnv: process.env.NODE_ENV || 'unknown'
    }
  });
});
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseServiceKey: Boolean(cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.SUPABASE_SERVICE_KEY)),
      hasSupabaseAnonKey: Boolean(cleanEnv(process.env.VITE_SUPABASE_ANON_KEY) || cleanEnv(process.env.SUPABASE_ANON_KEY)),
      hasServerSupabase: Boolean(serverSupabase),
      hasPixabayKey: Boolean(cleanEnv(process.env.PIXABAY_API_KEY)),
      nodeEnv: process.env.NODE_ENV || 'unknown'
    }
  });
});

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

// Helper: Authoritative server-side teacher authorization check
async function isTeacherAuthorized(authData, classroomId) {
  if (!authData || !authData.user) return false;

  // 1. Admin account has full access
  if (
    authData.profile?.role === 'admin' ||
    authData.user.email === 'roshanjoyal520@gmail.com'
  ) {
    return true;
  }

  // 2. Global teacher role
  if (authData.profile?.role === 'teacher') {
    return true;
  }

  // 3. Classroom-level teacher ownership or membership
  if (classroomId && serverSupabase) {
    try {
      const { data: classroom } = await serverSupabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .maybeSingle();

      if (classroom && classroom.teacher_id === authData.user.id) {
        return true;
      }

      const { data: member } = await serverSupabase
        .from('classroom_members')
        .select('role')
        .eq('classroom_id', classroomId)
        .eq('profile_id', authData.user.id)
        .maybeSingle();

      if (member && (member.role === 'teacher' || member.role === 'co-teacher')) {
        return true;
      }
    } catch (err) {
      console.warn('[isTeacherAuthorized] DB check notice:', err.message);
    }
  }

  return false;
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

// User activity interactions cache for resilient deduplication
const INTERACTIONS_FILE = path.resolve(__dirname, 'server/data/interactions_cache.json');

function loadInteractionsCache() {
  try {
    if (fs.existsSync(INTERACTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(INTERACTIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading interactions cache:', e);
  }
  return [];
}

function saveInteractionsCache(interactions) {
  try {
    fs.writeFileSync(INTERACTIONS_FILE, JSON.stringify(interactions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving interactions cache:', e);
  }
}

async function recordUserActivityInteraction(userId, activityId, activityType, interactionType = 'completed') {
  if (!userId || !activityId || !activityType || userId === 'guest_user') return;
  const now = new Date().toISOString();

  // Save to local cache
  const cached = loadInteractionsCache();
  const existingIdx = cached.findIndex(i => i.user_id === userId && i.activity_id === String(activityId));
  if (existingIdx >= 0) {
    cached[existingIdx].interaction_type = interactionType;
    cached[existingIdx].completed_at = now;
  } else {
    cached.push({
      id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      activity_id: String(activityId),
      activity_type: activityType,
      interaction_type: interactionType,
      completed_at: now
    });
  }
  saveInteractionsCache(cached);

  // Save to Supabase
  if (serverSupabase) {
    try {
      await serverSupabase
        .from('user_activity_interactions')
        .upsert(
          {
            user_id: userId,
            activity_id: String(activityId),
            activity_type: activityType,
            interaction_type: interactionType,
            completed_at: now
          },
          { onConflict: 'user_id, activity_id' }
        );
    } catch (err) {
      console.warn('[recordUserActivityInteraction notice]:', err.message);
    }
  }
}

async function getUserInteractedIds(userId, activityType) {
  if (!userId || userId === 'guest_user') return new Set();
  const interactedIds = new Set();

  // Check Supabase interactions table
  if (serverSupabase) {
    try {
      let query = serverSupabase
        .from('user_activity_interactions')
        .select('activity_id')
        .eq('user_id', userId);
      if (activityType) {
        query = query.eq('activity_type', activityType);
      }
      const { data } = await query;
      if (data && Array.isArray(data)) {
        data.forEach(item => interactedIds.add(String(item.activity_id)));
      }
    } catch (err) {
      // Fallback to cache/specific table
    }
  }

  // Check cache
  const cached = loadInteractionsCache();
  cached
    .filter(i => i.user_id === userId && (!activityType || i.activity_type === activityType))
    .forEach(i => interactedIds.add(String(i.activity_id)));

  return interactedIds;
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

const READING_SESSIONS_FILE = path.resolve(__dirname, 'server/data/reading_sessions_cache.json');

function loadReadingSessionsCache() {
  try {
    if (fs.existsSync(READING_SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(READING_SESSIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading reading sessions cache:', e);
  }
  return [];
}

function saveReadingSessionsCache(sessions) {
  try {
    fs.writeFileSync(READING_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving reading sessions cache:', e);
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

// Periodic background backup sync (runs every 60 minutes if server daemon is active and not in serverless)
const BACKUP_SYNC_INTERVAL = 60 * 60 * 1000;
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    console.log('[Daemon Scheduler] Running periodic backup YouTube synchronization...');
    syncYouTubeChannel('scheduled_backup').catch(err => {
      console.error('[Daemon Scheduler Error]:', err.message);
    });
  }, BACKUP_SYNC_INTERVAL);
}

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

// POST /api/profile - Authoritative profile update (full_name, avatar_url, text_size)
app.post('/api/profile', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to update profile.' });
    }

    const { full_name, avatar_url, text_size } = req.body;
    const userId = authData.user.id;
    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (full_name !== undefined) {
      const trimmed = String(full_name).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, error: 'Full name cannot be empty.' });
      }
      updatePayload.full_name = trimmed;
    }

    if (avatar_url !== undefined) {
      updatePayload.avatar_url = avatar_url || null;
    }

    if (text_size !== undefined) {
      updatePayload.text_size = text_size;
    }

    let updatedProfile = {
      ...authData.profile,
      ...updatePayload
    };

    // 1. Authoritative persistence in Supabase profiles table
    if (serverSupabase) {
      try {
        const { data: dbProfile, error: dbErr } = await serverSupabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email: authData.user.email,
              ...updatePayload
            },
            { onConflict: 'id' }
          )
          .select()
          .maybeSingle();

        if (!dbErr && dbProfile) {
          updatedProfile = dbProfile;
        } else if (dbErr) {
          console.warn('[Server Profile Upsert Notice]:', dbErr.message);
        }
      } catch (sbErr) {
        console.warn('[Server Profile Upsert Exception]:', sbErr.message);
      }

      // 2. Update Supabase Auth user metadata
      try {
        const metaUpdates = {};
        if (updatePayload.full_name) {
          metaUpdates.full_name = updatePayload.full_name;
          metaUpdates.name = updatePayload.full_name;
        }
        if (avatar_url !== undefined) {
          metaUpdates.avatar_url = avatar_url;
          metaUpdates.picture = avatar_url;
        }
        if (updatePayload.text_size) {
          metaUpdates.text_size = updatePayload.text_size;
        }

        if (Object.keys(metaUpdates).length > 0 && serverSupabase.auth?.admin) {
          await serverSupabase.auth.admin.updateUserById(userId, { user_metadata: metaUpdates });
        }
      } catch (metaErr) {
        console.warn('[Server Profile Metadata Update Notice]:', metaErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error in POST /api/profile:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update profile.' });
  }
});

// GET /api/profile/me - Retrieve current authenticated profile
app.get('/api/profile/me', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    res.json({
      success: true,
      data: authData.profile
    });
  } catch (error) {
    console.error('Error in GET /api/profile/me:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
});
// ============================================================================
// TOPIC MASTERY & PROGRESS ENDPOINTS
// ============================================================================

const CURRICULUM_CATEGORIES = [
  { key: 'Psychology', displayTitle: 'Psychology & Habit Formation', color: 'bg-brand-500', order: 1 },
  { key: 'English', displayTitle: 'English Vocabulary & Grammar Rules', color: 'bg-purple-500', order: 2 },
  { key: 'Science', displayTitle: 'Science & Physics Discoveries', color: 'bg-emerald-500', order: 3 },
  { key: 'Life Skills', displayTitle: 'Life Skills & Health Habits', color: 'bg-amber-500', order: 4 },
  { key: 'Nature', displayTitle: 'Nature & Wildlife Secrets', color: 'bg-teal-500', order: 5 },
  { key: 'Space', displayTitle: 'Space & Astronomy Discoveries', color: 'bg-indigo-500', order: 6 },
  { key: 'History', displayTitle: 'History & World Civilizations', color: 'bg-orange-500', order: 7 },
  { key: 'Technology', displayTitle: 'Technology & Digital Innovation', color: 'bg-cyan-500', order: 8 },
  { key: 'Mysteries', displayTitle: 'Mysteries & Critical Thinking', color: 'bg-rose-500', order: 9 }
];

function normalizeCurriculumCategory(raw) {
  if (!raw || typeof raw !== 'string') return 'English';
  const clean = raw.trim().toLowerCase();
  if (clean.includes('psych') || clean.includes('habit') || clean.includes('mind') || clean.includes('emotion') || clean.includes('brain') || clean.includes('mental')) {
    return 'Psychology';
  }
  if (clean.includes('english') || clean.includes('vocab') || clean.includes('grammar') || clean.includes('spelling') || clean.includes('word') || clean.includes('language') || clean.includes('sentence')) {
    return 'English';
  }
  if (clean.includes('science') || clean.includes('physic') || clean.includes('chem') || clean.includes('biology')) {
    return 'Science';
  }
  if (clean.includes('life') || clean.includes('health') || clean.includes('food') || clean.includes('everyday') || clean.includes('skill')) {
    return 'Life Skills';
  }
  if (clean.includes('nature') || clean.includes('wildlife') || clean.includes('animal') || clean.includes('plant') || clean.includes('environment')) {
    return 'Nature';
  }
  if (clean.includes('space') || clean.includes('astronomy') || clean.includes('planet') || clean.includes('cosmos') || clean.includes('galaxy') || clean.includes('universe')) {
    return 'Space';
  }
  if (clean.includes('history') || clean.includes('civiliz') || clean.includes('ancient') || clean.includes('war') || clean.includes('culture')) {
    return 'History';
  }
  if (clean.includes('tech') || clean.includes('digital') || clean.includes('comput') || clean.includes('code') || clean.includes('ai') || clean.includes('robot')) {
    return 'Technology';
  }
  if (clean.includes('myster') || clean.includes('critical') || clean.includes('riddle') || clean.includes('logic') || clean.includes('detective') || clean.includes('puzzle')) {
    return 'Mysteries';
  }

  const match = CURRICULUM_CATEGORIES.find(c => c.key.toLowerCase() === clean);
  return match ? match.key : 'English';
}

// ============================================================================
// AUTHORITATIVE FEED LEARNING PROGRESS
// Reflects the 6 authentic Feed Learning Activities:
// 1. Shorts
// 2. Relaxation Games
// 3. Memory Games
// 4. Reading
// 5. Quizzes
// 6. Word of the Day
// ============================================================================

async function calculateAuthoritativeLearningProgress(userId) {
  // 1. Denominators: count from real content database
  // A. Shorts
  let totalShorts = 0;
  if (serverSupabase) {
    try {
      const { count } = await serverSupabase
        .from('youtube_videos')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '("draft","archived")');
      if (typeof count === 'number' && count > 0) totalShorts = count;
    } catch {}
  }
  if (totalShorts === 0) {
    totalShorts = 15;
  }

  // B. Relaxation Games (100 progressive levels)
  const totalRelaxationGames = 100;

  // C. Memory Games (Spelling Flip Cards + Spelling Scrambles)
  let totalMemoryGames = 0;
  if (serverSupabase) {
    try {
      const { count: flipCount } = await serverSupabase
        .from('spelling_flip_cards')
        .select('*', { count: 'exact', head: true })
        .neq('is_published', false);
      const { count: scrambleCount } = await serverSupabase
        .from('spelling_scrambles')
        .select('*', { count: 'exact', head: true })
        .neq('is_published', false);
      totalMemoryGames = (flipCount || 0) + (scrambleCount || 0);
    } catch {}
  }
  if (totalMemoryGames === 0) {
    const flipCards = loadSpellingFlipCardsCache();
    const scrambles = loadSpellingScramblesCache();
    totalMemoryGames = (flipCards?.length || 0) + (scrambles?.length || 0) || 25;
  }

  // D. Reading
  let totalReadings = 0;
  if (serverSupabase) {
    try {
      const { count } = await serverSupabase
        .from('readings')
        .select('*', { count: 'exact', head: true })
        .neq('is_published', false);
      if (typeof count === 'number' && count > 0) totalReadings = count;
    } catch {}
  }
  if (totalReadings === 0) {
    const readings = loadReadingsCache();
    totalReadings = readings?.length || 20;
  }

  // E. Quizzes
  let totalQuizzes = 0;
  if (serverSupabase) {
    try {
      const { count } = await serverSupabase
        .from('quiz_bits')
        .select('*', { count: 'exact', head: true })
        .neq('is_published', false);
      if (typeof count === 'number' && count > 0) totalQuizzes = count;
    } catch {}
  }
  if (totalQuizzes === 0) {
    const quizzes = loadQuizCache();
    totalQuizzes = quizzes?.length || 30;
  }

  // F. Word of the Day
  let totalWords = 0;
  if (serverSupabase) {
    try {
      const { count } = await serverSupabase
        .from('words_of_the_day')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'draft');
      if (typeof count === 'number' && count > 0) totalWords = count;
    } catch {}
  }
  if (totalWords === 0) {
    totalWords = 50;
  }

  // 2. Numerators: gather unique legitimate completions for this specific user
  let completedShorts = 0;
  let completedRelaxation = 0;
  let completedMemory = 0;
  let completedReading = 0;
  let completedQuizzes = 0;

  if (userId && userId !== 'guest_user') {
    // Shorts (Unique completed video lessons)
    if (serverSupabase) {
      try {
        const { data } = await serverSupabase
          .from('youtube_learning_progress')
          .select('youtube_video_id')
          .eq('user_id', userId)
          .eq('completed', true);
        if (data) {
          completedShorts = new Set(data.map(d => d.youtube_video_id)).size;
        }
      } catch {}
    }

    // Relaxation Games (Bubble Pop unique levels)
    if (serverSupabase) {
      try {
        const { data } = await serverSupabase
          .from('bubble_pop_completions')
          .select('level')
          .eq('user_id', userId);
        if (data) {
          completedRelaxation = new Set(data.map(d => d.level)).size;
        }
      } catch {}
    }
    if (completedRelaxation === 0) {
      const bubbleCache = loadBubblePopCompletionsCache();
      completedRelaxation = new Set(bubbleCache.filter(c => c.user_id === userId).map(c => c.level)).size;
    }

    // Memory Games (Spelling Flip Cards + Spelling Scrambles)
    const memorySet = new Set();
    if (serverSupabase) {
      try {
        const { data: flips } = await serverSupabase
          .from('spelling_flip_completions')
          .select('card_id')
          .eq('user_id', userId)
          .eq('is_correct', true);
        if (flips) flips.forEach(f => memorySet.add(`flip_${f.card_id}`));

        const { data: scrambles } = await serverSupabase
          .from('spelling_scramble_completions')
          .select('scramble_id')
          .eq('user_id', userId)
          .eq('is_correct', true);
        if (scrambles) scrambles.forEach(s => memorySet.add(`scramble_${s.scramble_id}`));
      } catch {}
    }
    const flipCache = loadSpellingFlipCompletionsCache();
    flipCache.filter(c => c.user_id === userId && c.is_correct).forEach(c => memorySet.add(`flip_${c.card_id}`));
    const scrambleCache = loadSpellingCompletionsCache();
    scrambleCache.filter(c => c.user_id === userId && c.is_correct).forEach(c => memorySet.add(`scramble_${c.scramble_id}`));
    completedMemory = memorySet.size;

    // Reading (Reading completions with time_spent_seconds >= 60)
    if (serverSupabase) {
      try {
        const { data } = await serverSupabase
          .from('reading_completions')
          .select('reading_id')
          .eq('user_id', userId);
        if (data) {
          completedReading = new Set(data.map(d => d.reading_id)).size;
        }
      } catch {}
    }
    if (completedReading === 0) {
      const readingCache = loadReadingCompletionsCache();
      completedReading = new Set(readingCache.filter(c => c.user_id === userId).map(c => c.reading_id)).size;
    }

    // Quizzes (Quiz attempts with is_correct = true)
    if (serverSupabase) {
      try {
        const { data } = await serverSupabase
          .from('quiz_attempts')
          .select('quiz_id')
          .eq('user_id', userId)
          .eq('is_correct', true);
        if (data) {
          completedQuizzes = new Set(data.map(d => d.quiz_id)).size;
        }
      } catch {}
    }
    if (completedQuizzes === 0) {
      const quizCache = loadQuizAttemptsCache();
      completedQuizzes = new Set(quizCache.filter(c => c.user_id === userId && c.is_correct).map(c => c.quiz_id)).size;
    }
  }

  // 3. Construct the 6 Activity Categories with genuine real-world metrics
  return [
    {
      category: 'shorts',
      displayTitle: 'Shorts',
      completedActivities: completedShorts,
      totalActivities: totalShorts,
      completedLessons: completedShorts,
      totalLessons: totalShorts,
      progressPercent: totalShorts > 0 ? Math.min(100, Math.round((completedShorts / totalShorts) * 100)) : 0,
      color: 'bg-rose-500',
      order: 1,
      isTrackingAvailable: true
    },
    {
      category: 'relaxation_games',
      displayTitle: 'Relaxation Games',
      completedActivities: completedRelaxation,
      totalActivities: totalRelaxationGames,
      completedLessons: completedRelaxation,
      totalLessons: totalRelaxationGames,
      progressPercent: totalRelaxationGames > 0 ? Math.min(100, Math.round((completedRelaxation / totalRelaxationGames) * 100)) : 0,
      color: 'bg-cyan-500',
      order: 2,
      isTrackingAvailable: true
    },
    {
      category: 'memory_games',
      displayTitle: 'Memory Games',
      completedActivities: completedMemory,
      totalActivities: totalMemoryGames,
      completedLessons: completedMemory,
      totalLessons: totalMemoryGames,
      progressPercent: totalMemoryGames > 0 ? Math.min(100, Math.round((completedMemory / totalMemoryGames) * 100)) : 0,
      color: 'bg-purple-500',
      order: 3,
      isTrackingAvailable: true
    },
    {
      category: 'reading',
      displayTitle: 'Reading',
      completedActivities: completedReading,
      totalActivities: totalReadings,
      completedLessons: completedReading,
      totalLessons: totalReadings,
      progressPercent: totalReadings > 0 ? Math.min(100, Math.round((completedReading / totalReadings) * 100)) : 0,
      color: 'bg-emerald-500',
      order: 4,
      isTrackingAvailable: true
    },
    {
      category: 'quizzes',
      displayTitle: 'Quizzes',
      completedActivities: completedQuizzes,
      totalActivities: totalQuizzes,
      completedLessons: completedQuizzes,
      totalLessons: totalQuizzes,
      progressPercent: totalQuizzes > 0 ? Math.min(100, Math.round((completedQuizzes / totalQuizzes) * 100)) : 0,
      color: 'bg-blue-500',
      order: 5,
      isTrackingAvailable: true
    },
    {
      category: 'word_of_the_day',
      displayTitle: 'Word of the Day',
      completedActivities: 0,
      totalActivities: totalWords,
      completedLessons: 0,
      totalLessons: totalWords,
      progressPercent: 0,
      color: 'bg-amber-500',
      order: 6,
      isTrackingAvailable: false,
      trackingStatusMessage: 'Completion tracking not currently available.'
    }
  ];
}

// GET /api/user/learning-progress & /api/user/topic-progress - Authoritative Progress for authenticated student
app.get(['/api/user/learning-progress', '/api/user/topic-progress'], async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';
    const progress = await calculateAuthoritativeLearningProgress(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error in GET /api/user/learning-progress:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate learning progress.' });
  }
});

// GET /api/user/learning-progress/:userId & /api/user/topic-progress/:userId - Progress with authorization validation
app.get(['/api/user/learning-progress/:userId', '/api/user/topic-progress/:userId'], async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authData = await verifyAuthUser(req);
    const currentUserId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';

    // If authenticated, allow user to query own progress or admin to query any
    const targetUserId = (authData?.profile?.role === 'admin' || !authData) ? requestedUserId : currentUserId;
    const progress = await calculateAuthoritativeLearningProgress(targetUserId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error in GET /api/user/learning-progress/:userId:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate learning progress.' });
  }
});

// POST /api/classes/presign-upload - Generate presigned R2 upload URL for classroom files
app.post('/api/classes/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required for classroom uploads.' });
    }

    const { classroomId, filename = 'document.pdf', contentType = 'application/pdf', size } = req.body;

    try {
      validateClassroomUpload({ contentType, size });
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    const objectKey = buildClassroomObjectKey({
      classroomId: classroomId || 'general',
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
    console.error('Error in /api/classes/presign-upload:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate classroom upload URL' });
  }
});

// ============================================================================
// TEACHER CLOUD MATERIALS & REUSABLE CLOUDFLARE R2 BUCKET SYSTEM (500 MB QUOTA)
// ============================================================================

// Internal Helper: Idempotently assign a master cloud material to a classroom bucket
async function assignMaterialToClassroomInternal({ classroomId, resourceId, materialTitle, materialUrl, bucketId, teacherId }) {
  if (!serverSupabase || !classroomId || !resourceId) return null;

  try {
    // 1. Resolve target bucket ID
    let targetBucketId = bucketId;
    if (!targetBucketId) {
      const { data: buckets } = await serverSupabase
        .from('content_buckets')
        .select('id')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (buckets && buckets.length > 0) {
        targetBucketId = buckets[0].id;
      } else {
        const { data: newBucket } = await serverSupabase
          .from('content_buckets')
          .insert({
            classroom_id: classroomId,
            title: 'Classroom Resources',
            description: 'Assigned learning materials and study guides',
            created_by: teacherId
          })
          .select('id')
          .single();

        if (newBucket) targetBucketId = newBucket.id;
      }
    }

    if (!targetBucketId) return null;

    // 2. Prevent duplicate bucket item assignment
    const { data: existing } = await serverSupabase
      .from('bucket_items')
      .select('id, bucket_id, classroom_id, title, item_type, content_id, content_url')
      .eq('bucket_id', targetBucketId)
      .eq('content_id', resourceId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // 3. Insert reference to master cloud resource (Zero duplicate storage)
    const { data: item, error } = await serverSupabase
      .from('bucket_items')
      .insert({
        bucket_id: targetBucketId,
        classroom_id: classroomId,
        title: materialTitle || 'Learning Material',
        item_type: 'document',
        content_id: resourceId,
        content_url: materialUrl || null,
        sort_order: 0
      })
      .select()
      .single();

    if (error) {
      console.warn('[assignMaterialToClassroomInternal] Insert warning:', error.message);
      return null;
    }

    return item;
  } catch (err) {
    console.error('[assignMaterialToClassroomInternal] Error:', err);
    return null;
  }
}

// GET /api/teacher/materials - List authenticated teacher's cloud material library
app.get(['/api/teacher/materials', '/api/classes/materials'], async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to view cloud materials.' });
    }

    const teacherId = authData.user.id;
    const classroomId = req.query.classroomId || '';

    let materials = [];
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('submissions')
          .select('*')
          .or(`author_id.eq.${teacherId},teacher_id.eq.${teacherId}`)
          .eq('resource_purpose', 'teaching_resource')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          materials = data;
        }
      } catch (dbErr) {
        console.warn('[GET /api/teacher/materials] DB query warning:', dbErr.message);
      }
    }

    // Determine assigned status if classroomId is provided
    const assignedResourceIds = new Set();
    if (classroomId && serverSupabase) {
      try {
        const [{ data: bucketItems }, { data: classroomAssignments }] = await Promise.all([
          serverSupabase
            .from('bucket_items')
            .select('content_id')
            .eq('classroom_id', classroomId),
          serverSupabase
            .from('assignments')
            .select('id, attachment_urls')
            .eq('classroom_id', classroomId)
            .eq('is_deleted', false)
        ]);

        (bucketItems || []).forEach(item => {
          if (item.content_id) assignedResourceIds.add(String(item.content_id));
        });

        (classroomAssignments || []).forEach(a => {
          const attachments = Array.isArray(a.attachment_urls) ? a.attachment_urls : [];
          attachments.forEach(att => {
            if (att.resource_id) assignedResourceIds.add(String(att.resource_id));
            if (att.id) assignedResourceIds.add(String(att.id));
          });
        });
      } catch (checkErr) {
        console.warn('[GET /api/teacher/materials] Assignment check warning:', checkErr.message);
      }
    }

    const formatted = materials.map((m) => {
      const sizeNum = Number(m.file_size || 0);
      let formattedSize = '0 B';
      if (sizeNum > 0) {
        if (sizeNum < 1024) formattedSize = `${sizeNum} B`;
        else if (sizeNum < 1024 * 1024) formattedSize = `${(sizeNum / 1024).toFixed(1)} KB`;
        else formattedSize = `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
      }

      return {
        id: m.id,
        title: m.title || m.name || 'Untitled Material',
        name: m.title || m.name || 'Untitled Material',
        original_filename: m.file_path || m.original_filename || `${m.title || 'document'}.pdf`,
        originalFilename: m.file_path || m.original_filename || `${m.title || 'document'}.pdf`,
        file_url: m.file_url,
        fileUrl: m.file_url,
        file_size: sizeNum,
        fileSize: sizeNum,
        formattedSize,
        mime_type: m.mime_type || 'application/pdf',
        category: m.category || m.resource_type || 'General',
        description: m.description || '',
        created_at: m.created_at,
        createdAt: m.created_at,
        is_assigned: assignedResourceIds.has(String(m.id)),
        isAssigned: assignedResourceIds.has(String(m.id))
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error in GET /api/teacher/materials:', error);
    res.status(500).json({ success: false, error: 'Failed to load cloud materials.' });
  }
});

// GET /api/teacher/storage-usage - Calculate teacher storage consumption against 500 MB quota
app.get('/api/teacher/storage-usage', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const teacherId = authData.user.id;
    let usedBytes = 0;
    let fileCount = 0;

    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('submissions')
          .select('file_size')
          .or(`author_id.eq.${teacherId},teacher_id.eq.${teacherId}`)
          .eq('resource_purpose', 'teaching_resource')
          .eq('is_deleted', false);

        if (!error && Array.isArray(data)) {
          fileCount = data.length;
          usedBytes = data.reduce((sum, row) => sum + Number(row.file_size || 0), 0);
        }
      } catch (err) {
        console.warn('[GET /api/teacher/storage-usage] DB query warning:', err.message);
      }
    }

    const maxBytes = 500 * 1024 * 1024; // 500 MB
    const remainingBytes = Math.max(0, maxBytes - usedBytes);
    const usedMb = Number((usedBytes / (1024 * 1024)).toFixed(1));
    const maxMb = 500;
    const remainingMb = Number((remainingBytes / (1024 * 1024)).toFixed(1));
    const percentage = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

    res.json({
      success: true,
      data: {
        usedBytes,
        maxBytes,
        usedMb,
        maxMb,
        remainingBytes,
        remainingMb,
        percentage,
        fileCount
      }
    });
  } catch (error) {
    console.error('Error in GET /api/teacher/storage-usage:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve storage usage.' });
  }
});

// POST /api/teacher/materials/presign-upload - Check quota and generate presigned R2 upload URL
app.post('/api/teacher/materials/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required for upload.' });
    }

    const { filename = 'document.pdf', contentType = 'application/pdf', size = 0 } = req.body;
    const teacherId = authData.user.id;

    // Check teacher storage quota before granting upload URL
    let currentUsedBytes = 0;
    if (serverSupabase) {
      const { data } = await serverSupabase
        .from('submissions')
        .select('file_size')
        .or(`author_id.eq.${teacherId},teacher_id.eq.${teacherId}`)
        .eq('resource_purpose', 'teaching_resource')
        .eq('is_deleted', false);

      if (Array.isArray(data)) {
        currentUsedBytes = data.reduce((sum, row) => sum + Number(row.file_size || 0), 0);
      }
    }

    try {
      validateTeacherStorageQuota({
        currentUsedBytes,
        incomingSizeBytes: size,
        maxBytes: 500 * 1024 * 1024
      });
    } catch (quotaErr) {
      return res.status(400).json({ success: false, error: quotaErr.message });
    }

    const objectKey = buildTeacherMaterialObjectKey({
      userId: teacherId,
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
    console.error('Error in /api/teacher/materials/presign-upload:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate upload URL.' });
  }
});

// POST /api/teacher/materials - Create master material record and optionally attach to class
app.post('/api/teacher/materials', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const {
      title,
      description = '',
      category = 'General',
      fileUrl,
      objectKey,
      filename,
      fileSize = 0,
      mimeType = 'application/pdf',
      classroomId,
      bucketId
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, error: 'Material name is required.' });
    }
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: 'File URL is required.' });
    }

    const teacherId = authData.user.id;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Database connection not initialized.' });
    }

    // Insert master material record
    const { data: material, error } = await serverSupabase
      .from('submissions')
      .insert({
        author_id: teacherId,
        teacher_id: teacherId,
        owner_id: teacherId,
        owner_role: 'teacher',
        resource_purpose: 'teaching_resource',
        title: title.trim(),
        description: (description || '').trim(),
        category: (category || 'General').trim(),
        resource_type: (category || 'General').trim(),
        content_type: mimeType || 'application/pdf',
        mime_type: mimeType || 'application/pdf',
        file_url: fileUrl,
        file_path: filename || objectKey || `${title.trim()}.pdf`,
        file_size: Number(fileSize) || 0,
        storage_provider: 'r2',
        upload_context: classroomId ? 'classroom' : 'global',
        source: 'digital_classroom',
        visibility: 'private',
        status: 'published',
        is_deleted: false
      })
      .select()
      .single();

    if (error) throw error;

    // If classroomId is provided, attach to classroom bucket without duplicate storage
    if (classroomId && material) {
      await assignMaterialToClassroomInternal({
        classroomId,
        resourceId: material.id,
        materialTitle: material.title,
        materialUrl: material.file_url,
        bucketId,
        teacherId
      });
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Error in POST /api/teacher/materials:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to save material.' });
  }
});

// POST /api/classes/:classroomId/assign-materials - Reusable multi-class assignment (0 MB added)
app.post('/api/classes/:classroomId/assign-materials', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { classroomId } = req.params;
    const { resourceIds = [], bucketId } = req.body;

    if (!classroomId || !Array.isArray(resourceIds) || resourceIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Classroom ID and resource IDs are required.' });
    }

    const isAuthorized = await isTeacherAuthorized(authData, classroomId);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Teacher authorization required.' });
    }

    const teacherId = authData.user.id;
    const assignedItems = [];

    for (const resId of resourceIds) {
      const { data: material } = await serverSupabase
        .from('submissions')
        .select('*')
        .eq('id', resId)
        .maybeSingle();

      if (!material) continue;

      const item = await assignMaterialToClassroomInternal({
        classroomId,
        resourceId: material.id,
        materialTitle: material.title,
        materialUrl: material.file_url,
        bucketId,
        teacherId
      });

      if (item) assignedItems.push(item);
    }

    res.json({
      success: true,
      data: {
        assignedCount: assignedItems.length,
        items: assignedItems
      }
    });
  } catch (error) {
    console.error('Error in POST /api/classes/:classroomId/assign-materials:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to assign materials.' });
  }
});

// GET /api/teacher/materials/:id/preview - Secure preview retrieval for teacher or classroom member
app.get('/api/teacher/materials/:id/preview', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Database connection error.' });
    }

    const { data: material, error } = await serverSupabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !material) {
      return res.status(404).json({ success: false, error: 'Material not found.' });
    }

    const isOwner = material.author_id === authData.user.id || material.teacher_id === authData.user.id || authData.profile?.role === 'admin';
    if (!isOwner) {
      const { data: assignments } = await serverSupabase
        .from('bucket_items')
        .select('classroom_id')
        .eq('content_id', id);

      const classroomIds = (assignments || []).map(a => a.classroom_id);
      let isMember = false;
      if (classroomIds.length > 0) {
        const { data: membership } = await serverSupabase
          .from('classroom_members')
          .select('id')
          .in('classroom_id', classroomIds)
          .eq('profile_id', authData.user.id)
          .maybeSingle();
        if (membership) isMember = true;
      }

      if (!isMember) {
        return res.status(403).json({ success: false, error: 'Not authorized to preview this material.' });
      }
    }

    res.json({
      success: true,
      data: {
        id: material.id,
        title: material.title,
        fileUrl: material.file_url,
        mimeType: material.mime_type || 'application/pdf',
        originalFilename: material.file_path || `${material.title}.pdf`
      }
    });
  } catch (err) {
    console.error('Error in /api/teacher/materials/:id/preview:', err);
    res.status(500).json({ success: false, error: 'Failed to generate preview.' });
  }
});

// DELETE /api/teacher/materials/:id - Soft-delete teacher material
app.delete('/api/teacher/materials/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const teacherId = authData.user.id;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Database connection error.' });
    }

    const { error } = await serverSupabase
      .from('submissions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)
      .or(`author_id.eq.${teacherId},teacher_id.eq.${teacherId}`);

    if (error) throw error;

    res.json({ success: true, message: 'Material deleted successfully.' });
  } catch (err) {
    console.error('Error in DELETE /api/teacher/materials/:id:', err);
    res.status(500).json({ success: false, error: 'Failed to delete material.' });
  }
});

// ============================================================================
// CLASSROOM ANALYTICS & AI TEACHING INTELLIGENCE API (PHASE 2)
// ============================================================================

// GET /api/classes/:id/analytics - Retrieve pure deterministic classroom analytics
app.get('/api/classes/:id/analytics', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const classroomId = req.params.id;
    const periodDays = req.query.periodDays ? parseInt(req.query.periodDays, 10) : 30;
    const startDate = req.query.startDate || undefined;
    const endDate = req.query.endDate || undefined;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Database connection not initialized' });
    }

    // Verify teacher, student, or admin authorization for this classroom
    const { data: membership } = await serverSupabase
      .from('classroom_members')
      .select('role')
      .eq('classroom_id', classroomId)
      .eq('profile_id', authData.user.id)
      .maybeSingle();

    const { data: classroom } = await serverSupabase
      .from('classrooms')
      .select('teacher_id')
      .eq('id', classroomId)
      .maybeSingle();

    const isTeacher = classroom?.teacher_id === authData.user.id || membership?.role === 'teacher' || authData.profile?.role === 'admin';
    const isStudent = membership?.role === 'student';

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ success: false, error: 'Access denied to classroom analytics.' });
    }

    const result = await computeClassroomAnalytics(serverSupabase, classroomId, {
      periodDays,
      startDate,
      endDate
    });

    // Student privacy protection: students only see their own individual profile
    if (isStudent && !isTeacher) {
      result.students = result.students.filter(s => s.studentId === authData.user.id);
    }

    res.json({ success: true, analytics: result });
  } catch (error) {
    console.error('Error in GET /api/classes/:id/analytics:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to compute classroom analytics' });
  }
});

// GET /api/classes/:id/teaching-intelligence - Retrieve cached or fresh classroom intelligence
app.get('/api/classes/:id/teaching-intelligence', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const classroomId = req.params.id;
    const forceRefresh = req.query.refresh === 'true';

    const result = await getClassroomTeachingIntelligence({
      serverSupabase,
      classroomId,
      teacherId: authData.user.id,
      forceRefresh,
      serverOpenAI
    });

    res.json(result);
  } catch (error) {
    console.error('Error in GET /api/classes/:id/teaching-intelligence:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve teaching intelligence' });
  }
});

// POST /api/classes/:id/teaching-intelligence/refresh - Explicit teacher trigger for fresh AI analysis
app.post('/api/classes/:id/teaching-intelligence/refresh', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const classroomId = req.params.id;

    const result = await getClassroomTeachingIntelligence({
      serverSupabase,
      classroomId,
      teacherId: authData.user.id,
      forceRefresh: true,
      serverOpenAI
    });

    res.json(result);
  } catch (error) {
    console.error('Error in POST /api/classes/:id/teaching-intelligence/refresh:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to refresh teaching intelligence' });
  }
});

// POST /api/classes/:id/teaching-intelligence/generate-report - Generate 30-Day PDF report to Cloudflare R2
app.post('/api/classes/:id/teaching-intelligence/generate-report', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const classroomId = req.params.id;
    const period = req.body?.period || 'Last 30 Days';

    const result = await createThirtyDayReport({
      serverSupabase,
      classroomId,
      teacherId: authData.user.id,
      period,
      serverOpenAI
    });

    res.json(result);
  } catch (error) {
    console.error('Error in POST /api/classes/:id/teaching-intelligence/generate-report:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate 30-day report' });
  }
});

// GET /api/classes/:id/teaching-intelligence/reports - List previous 30-Day reports with R2 links
app.get('/api/classes/:id/teaching-intelligence/reports', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const classroomId = req.params.id;

    if (!serverSupabase) {
      return res.json({ success: true, reports: [] });
    }

    const { data: reports, error } = await serverSupabase
      .from('ai_classroom_reports')
      .select('*')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enriched = (reports || []).map(r => {
      const signed = buildPresignedDownloadUrl({
        objectKey: r.storage_key,
        expiresInSeconds: 3600
      });
      return {
        ...r,
        download_url: signed.downloadUrl,
        public_url: buildPublicUrl(r.storage_key)
      };
    });

    res.json({ success: true, reports: enriched, count: enriched.length });
  } catch (error) {
    console.error('Error in GET /api/classes/:id/teaching-intelligence/reports:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to list reports' });
  }
});

// POST /api/classes/ai-feedback - Backwards-compatible endpoint for executive summary
app.post('/api/classes/ai-feedback', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { classroomId } = req.body;
    const intel = await getClassroomTeachingIntelligence({
      serverSupabase,
      classroomId: classroomId || 'general',
      teacherId: authData.user.id,
      forceRefresh: false,
      serverOpenAI
    });

    res.json({
      success: true,
      data: {
        summary: intel.intelligence?.summary || 'Classroom intelligence active.',
        generatedAt: intel.updated_at
      }
    });
  } catch (error) {
    console.error('Error in /api/classes/ai-feedback:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate classroom report' });
  }
});

// ============================================================================
// EDTECHRA COURSE STUDIO API (TEACHER-LEVEL STUDIO & MULTI-CLASSROOM DELIVERY)
// ============================================================================

// 1. GET /api/course-studio/courses - List courses owned by teacher
app.get('/api/course-studio/courses', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    if (!serverSupabase) return res.status(500).json({ success: false, error: 'Database connection uninitialized' });

    const { data: courses, error } = await serverSupabase
      .from('courses')
      .select(`
        *,
        course_units(id, course_episodes(id)),
        course_classroom_assignments(id, classroom_id)
      `)
      .eq('teacher_id', authData.user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const enriched = (courses || []).map(c => {
      const units = c.course_units || [];
      const episodesCount = units.reduce((sum, u) => sum + (u.course_episodes?.length || 0), 0);
      const assignments = c.course_classroom_assignments || [];
      return {
        id: c.id,
        teacher_id: c.teacher_id,
        title: c.title,
        short_description: c.short_description,
        subject: c.subject,
        grade_level: c.grade_level,
        cover_image_url: c.cover_image_url,
        course_type: c.course_type,
        status: c.status,
        units_count: units.length,
        episodes_count: episodesCount,
        assigned_classrooms_count: assignments.length,
        created_at: c.created_at,
        updated_at: c.updated_at
      };
    });

    res.json({ success: true, courses: enriched });
  } catch (err) {
    console.error('Error in GET /api/course-studio/courses:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to list courses.' });
  }
});

// 2. POST /api/course-studio/courses - Create a course
app.post('/api/course-studio/courses', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const {
      title,
      short_description,
      subject = 'English',
      grade_level = 'All Grades',
      cover_image_url,
      cover_image_key,
      cover_aspect_ratio = '16:9',
      course_type = 'full'
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Course title is required.' });
    }

    if (!serverSupabase) return res.status(500).json({ success: false, error: 'Database uninitialized' });

    const { data: course, error: cErr } = await serverSupabase
      .from('courses')
      .insert({
        teacher_id: authData.user.id,
        title: title.trim(),
        short_description: short_description ? short_description.trim() : '',
        subject: subject.trim(),
        grade_level: grade_level.trim(),
        cover_image_url: cover_image_url || null,
        cover_image_key: cover_image_key || null,
        cover_aspect_ratio: cover_aspect_ratio === '1:1' ? '1:1' : '16:9',
        course_type: course_type === 'quick' ? 'quick' : 'full',
        status: 'draft'
      })
      .select()
      .single();

    if (cErr) throw cErr;

    // Automatically provision Unit 1 and Episode 1 (Day 1)
    const { data: unit, error: uErr } = await serverSupabase
      .from('course_units')
      .insert({
        course_id: course.id,
        title: course_type === 'quick' ? 'Unit 1' : 'Unit 1: Foundations',
        description: 'Initial unit',
        order_index: 0
      })
      .select()
      .single();

    if (uErr) throw uErr;

    const { data: episode, error: eErr } = await serverSupabase
      .from('course_episodes')
      .insert({
        unit_id: unit.id,
        course_id: course.id,
        title: course_type === 'quick' ? 'Lesson 1' : 'Day 1: Introduction',
        episode_type: 'lesson',
        order_index: 0,
        estimated_minutes: 15
      })
      .select()
      .single();

    if (eErr) throw eErr;

    res.json({
      success: true,
      course: {
        ...course,
        units: [{ ...unit, episodes: [episode] }]
      }
    });
  } catch (err) {
    console.error('Error in POST /api/course-studio/courses:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create course.' });
  }
});

// 3. GET /api/course-studio/courses/:id - Get full course detail
app.get('/api/course-studio/courses/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    if (!serverSupabase) return res.status(500).json({ success: false, error: 'Database uninitialized' });

    const { data: course, error: cErr } = await serverSupabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (cErr || !course) return res.status(404).json({ success: false, error: 'Course not found.' });

    const { data: units } = await serverSupabase
      .from('course_units')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    const { data: episodes } = await serverSupabase
      .from('course_episodes')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    const { data: blocks } = await serverSupabase
      .from('course_blocks')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    const { data: questions } = await serverSupabase
      .from('course_questions')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    const { data: assignments } = await serverSupabase
      .from('course_classroom_assignments')
      .select(`
        *,
        classroom:classrooms(id, title, subject, grade)
      `)
      .eq('course_id', courseId);

    const blocksByEpisode = new Map();
    (blocks || []).forEach(b => {
      if (!blocksByEpisode.has(b.episode_id)) blocksByEpisode.set(b.episode_id, []);
      blocksByEpisode.get(b.episode_id).push(b);
    });

    const questionsByEpisode = new Map();
    (questions || []).forEach(q => {
      if (!questionsByEpisode.has(q.episode_id)) questionsByEpisode.set(q.episode_id, []);
      questionsByEpisode.get(q.episode_id).push(q);
    });

    const episodesByUnit = new Map();
    (episodes || []).forEach(e => {
      const enrichedEp = {
        ...e,
        blocks: blocksByEpisode.get(e.id) || [],
        questions: questionsByEpisode.get(e.id) || []
      };
      if (!episodesByUnit.has(e.unit_id)) episodesByUnit.set(e.unit_id, []);
      episodesByUnit.get(e.unit_id).push(enrichedEp);
    });

    const enrichedUnits = (units || []).map(u => ({
      ...u,
      episodes: episodesByUnit.get(u.id) || []
    }));

    res.json({
      success: true,
      course: {
        ...course,
        units: enrichedUnits,
        assignments: assignments || [],
        assigned_classrooms_count: assignments?.length || 0
      }
    });
  } catch (err) {
    console.error('Error in GET /api/course-studio/courses/:id:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load course.' });
  }
});

// 4. PUT /api/course-studio/courses/:id - Update course metadata
app.put('/api/course-studio/courses/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const {
      title,
      short_description,
      subject,
      grade_level,
      cover_image_url,
      cover_image_key,
      cover_aspect_ratio,
      status,
      daily_release_enabled,
      course_timezone,
      course_start_date
    } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (short_description !== undefined) updates.short_description = short_description.trim();
    if (subject !== undefined) updates.subject = subject.trim();
    if (grade_level !== undefined) updates.grade_level = grade_level.trim();
    if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url;
    if (cover_image_key !== undefined) updates.cover_image_key = cover_image_key;
    if (cover_aspect_ratio !== undefined) updates.cover_aspect_ratio = cover_aspect_ratio === '1:1' ? '1:1' : '16:9';
    if (status !== undefined) updates.status = status;
    if (daily_release_enabled !== undefined) updates.daily_release_enabled = Boolean(daily_release_enabled);
    if (course_timezone !== undefined) updates.course_timezone = course_timezone;
    if (course_start_date !== undefined) updates.course_start_date = course_start_date;

    const { data: updated, error } = await serverSupabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .eq('teacher_id', authData.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, course: updated });
  } catch (err) {
    console.error('Error in PUT /api/course-studio/courses/:id:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update course.' });
  }
});

// 5. DELETE /api/course-studio/courses/:id - Delete course
app.delete('/api/course-studio/courses/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const { error } = await serverSupabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('teacher_id', authData.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    console.error('Error in DELETE /api/course-studio/courses/:id:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete course.' });
  }
});

// 6. POST /api/course-studio/courses/:id/duplicate - Duplicate course
app.post('/api/course-studio/courses/:id/duplicate', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;

    const { data: orig, error: oErr } = await serverSupabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (oErr || !orig) return res.status(404).json({ success: false, error: 'Original course not found.' });

    const { data: newCourse, error: nErr } = await serverSupabase
      .from('courses')
      .insert({
        teacher_id: authData.user.id,
        title: `${orig.title} (Copy)`,
        short_description: orig.short_description,
        subject: orig.subject,
        grade_level: orig.grade_level,
        cover_image_url: orig.cover_image_url,
        cover_image_key: orig.cover_image_key,
        course_type: orig.course_type,
        status: 'draft'
      })
      .select()
      .single();

    if (nErr) throw nErr;

    const { data: origUnits } = await serverSupabase
      .from('course_units')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    for (const u of (origUnits || [])) {
      const { data: newUnit } = await serverSupabase
        .from('course_units')
        .insert({
          course_id: newCourse.id,
          title: u.title,
          description: u.description,
          order_index: u.order_index
        })
        .select()
        .single();

      if (!newUnit) continue;

      const { data: origEpisodes } = await serverSupabase
        .from('course_episodes')
        .select('*')
        .eq('unit_id', u.id)
        .order('order_index', { ascending: true });

      for (const ep of (origEpisodes || [])) {
        const { data: newEpisode } = await serverSupabase
          .from('course_episodes')
          .insert({
            unit_id: newUnit.id,
            course_id: newCourse.id,
            title: ep.title,
            episode_type: ep.episode_type,
            order_index: ep.order_index,
            estimated_minutes: ep.estimated_minutes
          })
          .select()
          .single();

        if (!newEpisode) continue;

        const { data: origBlocks } = await serverSupabase
          .from('course_blocks')
          .select('*')
          .eq('episode_id', ep.id)
          .order('order_index', { ascending: true });

        if (origBlocks && origBlocks.length > 0) {
          const blocksToInsert = origBlocks.map(b => ({
            episode_id: newEpisode.id,
            course_id: newCourse.id,
            block_type: b.block_type,
            order_index: b.order_index,
            content: b.content
          }));
          await serverSupabase.from('course_blocks').insert(blocksToInsert);
        }

        const { data: origQuestions } = await serverSupabase
          .from('course_questions')
          .select('*')
          .eq('episode_id', ep.id)
          .order('order_index', { ascending: true });

        if (origQuestions && origQuestions.length > 0) {
          const questionsToInsert = origQuestions.map(q => ({
            episode_id: newEpisode.id,
            course_id: newCourse.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            skill: q.skill,
            concept: q.concept,
            difficulty: q.difficulty,
            points: q.points,
            order_index: q.order_index
          }));
          await serverSupabase.from('course_questions').insert(questionsToInsert);
        }
      }
    }

    res.json({ success: true, course: newCourse });
  } catch (err) {
    console.error('Error in duplicate course:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to duplicate course.' });
  }
});

// 7. POST /api/course-studio/courses/:id/units - Create unit
app.post('/api/course-studio/courses/:id/units', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const { title, description = '', order_index = 0 } = req.body;

    const { data: unit, error } = await serverSupabase
      .from('course_units')
      .insert({
        course_id: courseId,
        title: title ? title.trim() : 'New Unit',
        description: description ? description.trim() : '',
        order_index
      })
      .select()
      .single();

    if (error) throw error;

    const { data: ep } = await serverSupabase
      .from('course_episodes')
      .insert({
        unit_id: unit.id,
        course_id: courseId,
        title: 'Day 1: Lesson',
        episode_type: 'lesson',
        order_index: 0,
        estimated_minutes: 15
      })
      .select()
      .single();

    res.json({ success: true, unit: { ...unit, episodes: ep ? [ep] : [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create unit.' });
  }
});

// 8. PUT /api/course-studio/courses/:id/units/:unitId - Update unit
app.put('/api/course-studio/courses/:id/units/:unitId', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { unitId } = req.params;
    const { title, description, order_index } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (order_index !== undefined) updates.order_index = order_index;

    const { data: unit, error } = await serverSupabase
      .from('course_units')
      .update(updates)
      .eq('id', unitId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, unit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update unit.' });
  }
});

// 9. DELETE /api/course-studio/courses/:id/units/:unitId - Delete unit
app.delete('/api/course-studio/courses/:id/units/:unitId', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { unitId } = req.params;
    const { error } = await serverSupabase.from('course_units').delete().eq('id', unitId);
    if (error) throw error;
    res.json({ success: true, message: 'Unit deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete unit.' });
  }
});

// 10. POST /api/course-studio/courses/:id/episodes - Create episode/day
app.post('/api/course-studio/courses/:id/episodes', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const { unit_id, title = 'New Day', episode_type = 'lesson', order_index = 0, estimated_minutes = 15 } = req.body;

    const { data: ep, error } = await serverSupabase
      .from('course_episodes')
      .insert({
        unit_id,
        course_id: courseId,
        title: title.trim(),
        episode_type,
        order_index,
        estimated_minutes
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, episode: { ...ep, blocks: [], questions: [] } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to create episode.' });
  }
});

// 11. PUT /api/course-studio/courses/:id/episodes/:episodeId - Update episode
app.put('/api/course-studio/courses/:id/episodes/:episodeId', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { episodeId } = req.params;
    const {
      title,
      episode_type,
      order_index,
      position,
      estimated_minutes,
      daily_release_enabled,
      release_day,
      is_manually_unlocked
    } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (episode_type !== undefined) updates.episode_type = episode_type;
    if (order_index !== undefined) updates.order_index = order_index;
    if (position !== undefined) updates.position = position;
    if (estimated_minutes !== undefined) updates.estimated_minutes = estimated_minutes;
    if (daily_release_enabled !== undefined) updates.daily_release_enabled = Boolean(daily_release_enabled);
    if (release_day !== undefined) updates.release_day = release_day;
    if (is_manually_unlocked !== undefined) updates.is_manually_unlocked = Boolean(is_manually_unlocked);

    const { data: ep, error } = await serverSupabase
      .from('course_episodes')
      .update(updates)
      .eq('id', episodeId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, episode: ep });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update episode.' });
  }
});

// 11b. POST /api/course-studio/courses/:id/episodes/reorder - Persist explicit lesson order
app.post('/api/course-studio/courses/:id/episodes/reorder', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const { unit_id, episode_ids } = req.body;

    if (!unit_id || !Array.isArray(episode_ids)) {
      return res.status(400).json({ success: false, error: 'unit_id and episode_ids array are required.' });
    }

    // Persist position, order_index and release_day for all reordered episodes
    for (let i = 0; i < episode_ids.length; i++) {
      const epId = episode_ids[i];
      await serverSupabase
        .from('course_episodes')
        .update({
          order_index: i,
          position: i + 1,
          release_day: i + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', epId)
        .eq('course_id', courseId);
    }

    res.json({ success: true, message: 'Episodes reordered successfully.' });
  } catch (err) {
    console.error('Error in POST /api/course-studio/courses/:id/episodes/reorder:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to reorder episodes.' });
  }
});

// 11c. POST /api/course-studio/courses/:id/episodes/:episodeId/unlock - Teacher override to unlock
app.post('/api/course-studio/courses/:id/episodes/:episodeId/unlock', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { episodeId } = req.params;
    const { data: ep, error } = await serverSupabase
      .from('course_episodes')
      .update({
        is_manually_unlocked: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', episodeId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, episode: ep, message: 'Episode unlocked for students now.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to unlock episode.' });
  }
});

// 12. DELETE /api/course-studio/courses/:id/episodes/:episodeId - Delete episode
app.delete('/api/course-studio/courses/:id/episodes/:episodeId', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { episodeId } = req.params;
    const { error } = await serverSupabase.from('course_episodes').delete().eq('id', episodeId);
    if (error) throw error;
    res.json({ success: true, message: 'Episode deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete episode.' });
  }
});

// 13. POST /api/course-studio/courses/:id/episodes/:episodeId/blocks - Save/Sync blocks
app.post('/api/course-studio/courses/:id/episodes/:episodeId/blocks', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { id: courseId, episodeId } = req.params;
    const { blocks = [] } = req.body;

    await serverSupabase.from('course_blocks').delete().eq('episode_id', episodeId);

    if (blocks.length > 0) {
      const toInsert = blocks.map((b, idx) => ({
        episode_id: episodeId,
        course_id: courseId,
        block_type: b.block_type,
        order_index: idx,
        content: b.content || {}
      }));

      const { data: saved, error } = await serverSupabase
        .from('course_blocks')
        .insert(toInsert)
        .select();

      if (error) {
        console.error('Initial insert error in course_blocks:', error);
        // If the database has not yet applied the expanded constraint migration,
        // fallback to storing with compatible block_type 'text' while preserving 100% of structured content JSON!
        if (error.code === '23514' || (error.message && error.message.includes('course_blocks_block_type_check'))) {
          const fallbackToInsert = toInsert.map(b => ({
            ...b,
            block_type: (b.block_type === 'text_image' || b.block_type === 'text_video') ? 'text' : (b.block_type === 'video' ? 'youtube_video' : b.block_type)
          }));
          const { data: fallbackSaved, error: fbError } = await serverSupabase
            .from('course_blocks')
            .insert(fallbackToInsert)
            .select();

          if (!fbError && fallbackSaved) {
            // Map back the original intended block_types so client gets exactly what it sent
            const normalized = fallbackSaved.map((b, idx) => ({
              ...b,
              block_type: toInsert[idx].block_type
            }));
            return res.json({ success: true, blocks: normalized });
          }
          console.error('Fallback insert error in course_blocks:', fbError);
        }
        return res.status(500).json({ success: false, error: "Couldn't save this section. Please try again." });
      }

      return res.json({ success: true, blocks: saved });
    }

    res.json({ success: true, blocks: [] });
  } catch (err) {
    console.error('Error in POST /api/course-studio/courses/:id/episodes/:episodeId/blocks:', err);
    res.status(500).json({ success: false, error: "Couldn't save this section. Please try again." });
  }
});

// 14. POST /api/course-studio/courses/:id/questions - Save/Sync questions
app.post('/api/course-studio/courses/:id/questions', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const { episode_id, questions = [] } = req.body;

    if (!episode_id) return res.status(400).json({ success: false, error: 'episode_id is required' });

    await serverSupabase.from('course_questions').delete().eq('episode_id', episode_id);

    if (questions.length > 0) {
      // Server-side idempotent deduplication: prevent duplicate questions per episode
      const seen = new Set();
      const deduplicated = [];

      questions.forEach((q) => {
        const text = String(q.question_text || '').trim();
        const type = String(q.question_type || 'multiple_choice').trim();
        const key = `${type}_${text.toLowerCase()}`;
        if (!seen.has(key) && text !== '' && text !== 'New practice question') {
          seen.add(key);
          deduplicated.push(q);
        }
      });

      const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

      const toInsert = deduplicated.map((q, idx) => ({
        id: isUuid(q.id) ? q.id : crypto.randomUUID(),
        episode_id,
        course_id: courseId,
        block_id: q.block_id || null,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        options: (typeof q.options === 'object' && q.options !== null) || Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer || (q.question_type === 'essay' ? 'AI Evaluated' : 'Answer'),
        explanation: q.explanation || '',
        skill: q.skill || 'General',
        concept: q.concept || 'General',
        difficulty: q.difficulty || 'medium',
        points: q.points || 10,
        order_index: idx
      }));

      const { data: saved, error } = await serverSupabase
        .from('course_questions')
        .insert(toInsert)
        .select();

      if (error) throw error;
      return res.json({ success: true, questions: saved });
    }

    res.json({ success: true, questions: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save questions.' });
  }
});

// 14b. POST /api/course-studio/essay-evaluate - Evaluate student essay with Gemini/OpenAI
app.post('/api/course-studio/essay-evaluate', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const {
      question_text,
      student_response,
      image_url,
      lesson_context,
      min_words,
      max_words,
      evaluation_criteria
    } = req.body;

    if (!question_text || !student_response) {
      return res.status(400).json({ success: false, error: 'question_text and student_response are required' });
    }

    const evaluation = await evaluateStudentEssay({
      question_text,
      student_response,
      image_url,
      lesson_context,
      min_words,
      max_words,
      evaluation_criteria,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      serverOpenAI
    });

    res.json({ success: true, evaluation });
  } catch (err) {
    console.error('Error in POST /api/course-studio/essay-evaluate:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to evaluate essay.' });
  }
});

// 15. POST /api/course-studio/courses/:id/publish-and-assign - Publish course & assign to classrooms
app.post('/api/course-studio/courses/:id/publish-and-assign', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const {
      classroom_ids = [],
      start_date = new Date().toISOString(),
      due_date = null,
      settings = {
        sequential_unlock: false,
        allow_retries: true,
        track_mastery: true,
        award_points: true
      }
    } = req.body;

    const { data: updatedCourse, error: cErr } = await serverSupabase
      .from('courses')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', courseId)
      .eq('teacher_id', authData.user.id)
      .select()
      .single();

    if (cErr) throw cErr;

    const { data: allEpisodes } = await serverSupabase
      .from('course_episodes')
      .select('id')
      .eq('course_id', courseId);
    const totalEpisodesCount = (allEpisodes || []).length;

    const assignmentResults = [];
    for (const classId of classroom_ids) {
      const { data: assignment, error: aErr } = await serverSupabase
        .from('course_classroom_assignments')
        .upsert(
          {
            course_id: courseId,
            classroom_id: classId,
            assigned_by: authData.user.id,
            start_date,
            due_date,
            status: 'active',
            settings,
            assigned_at: new Date().toISOString()
          },
          { onConflict: 'course_id,classroom_id' }
        )
        .select()
        .single();

      if (aErr || !assignment) continue;
      assignmentResults.push(assignment);

      const { data: members } = await serverSupabase
        .from('classroom_members')
        .select('profile_id')
        .eq('classroom_id', classId)
        .eq('role', 'student')
        .eq('status', 'active');

      if (members && members.length > 0) {
        const enrollmentsToUpsert = members.map(m => ({
          course_id: courseId,
          classroom_id: classId,
          classroom_assignment_id: assignment.id,
          student_id: m.profile_id,
          status: 'enrolled',
          total_episodes_count: totalEpisodesCount
        }));

        await serverSupabase
          .from('course_enrollments')
          .upsert(enrollmentsToUpsert, { onConflict: 'classroom_assignment_id,student_id' });
      }
    }

    res.json({
      success: true,
      course: updatedCourse,
      assigned_count: assignmentResults.length,
      assignments: assignmentResults
    });
  } catch (err) {
    console.error('Error in publish-and-assign:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to publish and assign course.' });
  }
});

// 16. GET /api/course-studio/courses/:id/analytics - Cross-Classroom Course Intelligence
app.get('/api/course-studio/courses/:id/analytics', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const courseId = req.params.id;
    const analytics = await compileCrossClassroomAnalytics(serverSupabase, courseId);
    res.json({ success: true, analytics });
  } catch (err) {
    console.error('Error in course analytics:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load course analytics.' });
  }
});

// 17. POST /api/course-studio/presign-upload - Secure R2 Presigned Upload
app.post('/api/course-studio/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { courseId = 'general', filename = 'image.webp', contentType = 'image/webp', size, isCover = false } = req.body;

    try {
      validateClassroomUpload({ contentType, size });
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    const objectKey = isCover
      ? buildCourseCoverObjectKey({ courseId, userId: authData.user.id, contentType })
      : buildCourseMediaObjectKey({ courseId, userId: authData.user.id, filename, contentType });

    const presigned = buildPresignedUpload({ objectKey, contentType });

    res.json({
      success: true,
      data: presigned
    });
  } catch (err) {
    console.error('Error in course presign upload:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate upload URL.' });
  }
});

// 18. POST /api/course-studio/ai/build-lesson - Build structured lesson from pasted material
app.post('/api/course-studio/ai/build-lesson', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { raw_material, course_title, unit_title, subject, grade_level } = req.body;

    const result = await buildLessonFromMaterial({
      rawMaterial: raw_material,
      courseTitle: course_title,
      unitTitle: unit_title,
      subject,
      gradeLevel: grade_level,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      serverOpenAI
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error in AI build lesson:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to build lesson with AI.' });
  }
});

// 19. POST /api/course-studio/ai/generate-questions - Generate questions with concept metadata
app.post('/api/course-studio/ai/generate-questions', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { content_text, question_types, question_count = 5, difficulty = 'medium', target_grade, subject, instructions } = req.body;

    const result = await generateCourseQuestionsWithAI({
      contentText: content_text,
      questionTypes: question_types || ['multiple_choice'],
      questionCount: parseInt(question_count, 10) || 5,
      difficulty,
      targetGrade: target_grade || 'Grade 8',
      subject: subject || 'English',
      instructions,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      serverOpenAI
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error in AI generate questions:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate questions with AI.' });
  }
});

// 20. POST /api/course-studio/ai/improve-content - Improve content text
app.post('/api/course-studio/ai/improve-content', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { text, instruction } = req.body;
    const result = await improveCourseContentWithAI({
      text,
      instruction,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      serverOpenAI
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to improve content.' });
  }
});

// 20B. POST /api/course-studio/ai/generate-course-plan - Generate structured CEFR curriculum plan
app.post('/api/course-studio/ai/generate-course-plan', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const {
      prompt,
      course_prompt,
      target_level = 'A1 Beginner',
      age_group = 'Teens & Adults',
      units_count = 6,
      lessons_per_unit = 4,
      learning_styles = ['reading', 'vocabulary', 'grammar', 'speaking', 'writing', 'quizzes'],
      subject = 'English'
    } = req.body;

    const result = await generateCoursePlanWithAI({
      coursePrompt: course_prompt || prompt,
      targetLevel: target_level,
      ageGroup: age_group,
      unitsCount: units_count,
      lessonsPerUnit: lessons_per_unit,
      learningStyles: learning_styles,
      subject,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      serverOpenAI
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error in AI generate course plan:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate course plan with AI.' });
  }
});

// 20C. POST /api/course-studio/ai/generate-structured-lesson - Generate complete digital textbook lesson
app.post('/api/course-studio/ai/generate-structured-lesson', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const {
      course_title = 'English Course',
      unit_title = 'Unit 1',
      lesson_title = 'Lesson 1',
      target_level = 'A1 Beginner',
      objective = '',
      subject = 'English',
      instructions = ''
    } = req.body;

    const result = await generateStructuredLessonWithAI({
      courseTitle: course_title,
      unitTitle: unit_title,
      lessonTitle: lesson_title,
      targetLevel: target_level,
      objective,
      subject,
      instructions,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      serverOpenAI
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error in AI generate structured lesson:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate lesson with AI.' });
  }
});

// 21. GET /api/classes/:classroomId/courses - List courses assigned to a classroom
app.get('/api/classes/:classroomId/courses', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { classroomId } = req.params;

    const { data: assignments, error } = await serverSupabase
      .from('course_classroom_assignments')
      .select(`
        *,
        course:courses(
          id,
          title,
          short_description,
          subject,
          grade_level,
          cover_image_url,
          course_type,
          status,
          updated_at
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('status', 'active');

    if (error) throw error;

    const studentId = authData.user.id;
    const { data: enrollments } = await serverSupabase
      .from('course_enrollments')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('student_id', studentId);

    const enrollmentMap = new Map();
    (enrollments || []).forEach(e => enrollmentMap.set(e.course_id, e));

    const enriched = (assignments || []).map(a => ({
      ...a,
      enrollment: enrollmentMap.get(a.course_id) || null
    }));

    res.json({ success: true, courses: enriched });
  } catch (err) {
    console.error('Error in classroom courses:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load classroom courses.' });
  }
});

// 22. POST /api/course-studio/student/progress - Update episode progress and calculate course progress
app.post('/api/course-studio/student/progress', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { course_id, classroom_id, episode_id, score = 0, max_score = 0, time_spent_seconds = 0 } = req.body;
    const student_id = authData.user.id;

    const { data: enrollment } = await serverSupabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', course_id)
      .eq('classroom_id', classroom_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (!enrollment) return res.status(404).json({ success: false, error: 'Enrollment not found.' });

    const percentage = max_score > 0 ? Number(((score / max_score) * 100).toFixed(1)) : 100;

    await serverSupabase
      .from('course_episode_progress')
      .upsert(
        {
          enrollment_id: enrollment.id,
          student_id,
          course_id,
          classroom_id,
          episode_id,
          status: 'completed',
          score,
          max_score,
          percentage,
          time_spent_seconds,
          completed_at: new Date().toISOString()
        },
        { onConflict: 'enrollment_id,episode_id' }
      );

    const { data: completedEps } = await serverSupabase
      .from('course_episode_progress')
      .select('id')
      .eq('enrollment_id', enrollment.id)
      .eq('status', 'completed');

    const completedCount = (completedEps || []).length;
    const totalCount = Math.max(1, enrollment.total_episodes_count || 1);
    const progressPercent = Math.min(100, Number(((completedCount / totalCount) * 100).toFixed(1)));
    const status = progressPercent >= 100 ? 'completed' : 'in_progress';

    const { data: updatedEnrollment } = await serverSupabase
      .from('course_enrollments')
      .update({
        progress_percent: progressPercent,
        completed_episodes_count: completedCount,
        status,
        current_episode_id: episode_id,
        completed_at: progressPercent >= 100 ? new Date().toISOString() : null,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    await serverSupabase.from('course_learning_events').insert({
      student_id,
      course_id,
      classroom_id,
      episode_id,
      event_type: 'episode_completed',
      metadata: { score, max_score, percentage, progress_percent: progressPercent }
    });

    res.json({ success: true, enrollment: updatedEnrollment });
  } catch (err) {
    console.error('Error in student progress:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update progress.' });
  }
});

// 23. POST /api/course-studio/student/attempt - Record question attempt & calculate mastery
app.post('/api/course-studio/student/attempt', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const {
      course_id,
      classroom_id,
      episode_id,
      question_id,
      student_answer,
      is_correct,
      points_awarded = 0,
      skill,
      concept,
      difficulty
    } = req.body;

    const student_id = authData.user.id;

    const { data: enrollment } = await serverSupabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('classroom_id', classroom_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (!enrollment) return res.status(404).json({ success: false, error: 'Enrollment not found.' });

    // Anti-Retry Protection: Reject duplicate submissions for the same question
    const { data: existingAttempt } = await serverSupabase
      .from('course_question_attempts')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('question_id', question_id)
      .maybeSingle();

    if (existingAttempt) {
      return res.status(409).json({
        success: false,
        already_answered: true,
        error: 'Question already answered.',
        attempt: existingAttempt
      });
    }

    const { data: attempt, error: attErr } = await serverSupabase
      .from('course_question_attempts')
      .insert({
        enrollment_id: enrollment.id,
        student_id,
        course_id,
        classroom_id,
        episode_id,
        question_id,
        student_answer: String(student_answer || ''),
        is_correct: Boolean(is_correct),
        points_awarded: Number(points_awarded) || 0,
        skill: skill || 'General',
        concept: concept || 'General',
        difficulty: difficulty || 'medium'
      })
      .select()
      .single();

    if (attErr) throw attErr;

    const { data: studentAttempts } = await serverSupabase
      .from('course_question_attempts')
      .select('is_correct')
      .eq('enrollment_id', enrollment.id);

    const totalAtts = (studentAttempts || []).length;
    const correctAtts = (studentAttempts || []).filter(a => a.is_correct).length;
    const accuracyPercent = totalAtts > 0 ? Number(((correctAtts / totalAtts) * 100).toFixed(1)) : 0;

    await serverSupabase
      .from('course_enrollments')
      .update({
        accuracy_percent: accuracyPercent,
        mastery_percent: accuracyPercent,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', enrollment.id);

    await serverSupabase.from('course_learning_events').insert({
      student_id,
      course_id,
      classroom_id,
      episode_id,
      question_id,
      event_type: is_correct ? 'question_correct' : 'question_wrong',
      metadata: { student_answer, is_correct, concept, skill }
    });

    res.json({ success: true, attempt, accuracy_percent: accuracyPercent });
  } catch (err) {
    console.error('Error in question attempt:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record attempt.' });
  }
});

// 23b. GET /api/course-studio/student/attempts - Get student question attempts for persistence
app.get('/api/course-studio/student/attempts', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const { course_id, classroom_id, episode_id } = req.query;
    const student_id = authData.user.id;

    let query = serverSupabase
      .from('course_question_attempts')
      .select('*')
      .eq('student_id', student_id);

    if (course_id) query = query.eq('course_id', course_id);
    if (classroom_id) query = query.eq('classroom_id', classroom_id);
    if (episode_id) query = query.eq('episode_id', episode_id);

    const { data: attempts, error } = await query;
    if (error) throw error;

    res.json({ success: true, attempts: attempts || [] });
  } catch (err) {
    console.error('Error fetching student attempts:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch attempts.' });
  }
});

// ============================================================================
// AI OCR WORKSHEET GRADER ENDPOINTS
// ============================================================================

// POST /api/classes/ocr/presign-upload - Generate temporary R2 upload URL
app.post('/api/classes/ocr/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required for OCR uploads.' });
    }

    const { evaluationId, filename = 'worksheet.jpg', contentType = 'image/jpeg', size } = req.body;

    try {
      validateOcrUpload({ contentType, size });
    } catch (valErr) {
      return res.status(400).json({ success: false, error: valErr.message });
    }

    const targetEvalId = evaluationId || crypto.randomUUID();
    const objectKey = buildTemporaryOcrKey({
      evaluationId: targetEvalId,
      filename,
      contentType
    });

    const presigned = buildPresignedUpload({
      objectKey,
      contentType
    });

    res.json({
      success: true,
      data: {
        ...presigned,
        evaluationId: targetEvalId
      }
    });
  } catch (error) {
    console.error('Error in /api/classes/ocr/presign-upload:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate temporary OCR upload URL' });
  }
});

// POST /api/classes/ocr-jobs - Submit AI OCR Evaluation Job (Supports Direct & Async)
app.post('/api/classes/ocr-jobs', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to submit OCR job.' });
    }

    const {
      evaluationId,
      classroomId,
      studentId,
      category,
      maxMarks = 100,
      title = '',
      temporaryFileKey,
      fileContentType = 'image/jpeg',
      studentName: reqStudentName,
      imageBase64
    } = req.body;

    if (!classroomId || !studentId) {
      return res.status(400).json({ success: false, error: 'classroomId and studentId are required.' });
    }

    if (!OCR_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category. Must be one of: ${OCR_CATEGORIES.join(', ')}`
      });
    }

    const marks = Number(maxMarks);
    if (isNaN(marks) || marks <= 0) {
      return res.status(400).json({ success: false, error: 'Maximum marks must be a positive number.' });
    }

    const targetEvalId = evaluationId || crypto.randomUUID();

    // Idempotency check: verify if evaluation was already submitted/completed
    if (serverSupabase) {
      const { data: existingEval } = await serverSupabase
        .from('ocr_evaluations')
        .select('*')
        .eq('id', targetEvalId)
        .maybeSingle();

      if (existingEval && existingEval.status === 'completed') {
        return res.json({
          success: true,
          data: existingEval
        });
      }
    }

    // Resolve student & teacher names and classroom title
    let studentName = reqStudentName || 'Student';
    let teacherName = authData.profile?.full_name || 'Teacher';
    let classroomTitle = 'Classroom';

    if (serverSupabase) {
      const [{ data: studentProf }, { data: classroomData }] = await Promise.all([
        serverSupabase.from('profiles').select('full_name, email').eq('id', studentId).maybeSingle(),
        serverSupabase.from('classrooms').select('title').eq('id', classroomId).maybeSingle()
      ]);

      if (studentProf) {
        studentName = studentProf.full_name || studentProf.email?.split('@')[0] || studentName;
      }
      if (classroomData) {
        classroomTitle = classroomData.title || classroomTitle;
      }
    }

    // Insert initial record with status = 'processing' in Supabase
    if (serverSupabase) {
      const { error: insertError } = await serverSupabase
        .from('ocr_evaluations')
        .upsert({
          id: targetEvalId,
          teacher_id: authData.user.id,
          class_id: classroomId,
          student_id: studentId,
          category,
          title: (title || '').trim(),
          max_marks: marks,
          status: 'processing',
          temporary_file_key: temporaryFileKey || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('[OCR Job] Supabase insert warning:', insertError.message);
      }
    }

    // Execute evaluation job directly to ensure completion in serverless environments
    const jobPayload = {
      evaluationId: targetEvalId,
      classroomId,
      teacherId: authData.user.id,
      studentId,
      studentName,
      teacherName,
      classroomTitle,
      category,
      maxMarks: marks,
      title: (title || '').trim(),
      temporaryFileKey,
      fileContentType,
      imageBase64
    };

    const completedData = await ocrEvaluationQueue.processJob(jobPayload);

    res.json({
      success: true,
      data: {
        jobId: targetEvalId,
        evaluationId: targetEvalId,
        status: 'completed',
        ...(completedData || {})
      }
    });
  } catch (error) {
    console.error('Error in /api/classes/ocr-jobs:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process OCR evaluation job' });
  }
});

// GET /api/classes/ocr-jobs/:id - Poll AI OCR Job Status
app.get('/api/classes/ocr-jobs/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: evaluation, error } = await serverSupabase
      .from('ocr_evaluations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !evaluation) {
      return res.status(404).json({ success: false, error: 'Evaluation job not found.' });
    }

    // Check authorization: teacher or student
    if (evaluation.teacher_id !== authData.user.id && evaluation.student_id !== authData.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized access to this evaluation.' });
    }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('Error in /api/classes/ocr-jobs/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch job status' });
  }
});

// GET /api/classes/ocr-evaluations/:id/report-url - Get Signed URL for PDF Report
app.get('/api/classes/ocr-evaluations/:id/report-url', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: evaluation, error } = await serverSupabase
      .from('ocr_evaluations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !evaluation) {
      return res.status(404).json({ success: false, error: 'Evaluation not found.' });
    }

    if (evaluation.teacher_id !== authData.user.id && evaluation.student_id !== authData.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized access to this evaluation report.' });
    }

    if (!evaluation.report_file_key) {
      return res.status(404).json({ success: false, error: 'Report has not been generated yet.' });
    }

    try {
      const presigned = buildPresignedDownloadUrl({
        objectKey: evaluation.report_file_key,
        expiresInSeconds: 3600
      });

      res.json({
        success: true,
        data: {
          reportUrl: presigned.downloadUrl,
          publicUrl: presigned.publicUrl,
          expiresInSeconds: 3600
        }
      });
    } catch (r2Err) {
      const fallbackPublicUrl = buildPublicUrl(evaluation.report_file_key);
      res.json({
        success: true,
        data: {
          reportUrl: fallbackPublicUrl,
          publicUrl: fallbackPublicUrl
        }
      });
    }
  } catch (error) {
    console.error('Error in /api/classes/ocr-evaluations/:id/report-url:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate report URL' });
  }
});

// PATCH /api/classes/ocr-evaluations/:id - Teacher Score / Feedback Correction
app.patch('/api/classes/ocr-evaluations/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const { score, feedback } = req.body;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: evaluation, error: fetchErr } = await serverSupabase
      .from('ocr_evaluations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !evaluation) {
      return res.status(404).json({ success: false, error: 'Evaluation record not found.' });
    }

    if (evaluation.teacher_id !== authData.user.id) {
      return res.status(403).json({ success: false, error: 'Only the classroom teacher can adjust scores.' });
    }

    const updatePayload = {
      is_teacher_adjusted: true,
      updated_at: new Date().toISOString()
    };

    let newFinalScore = evaluation.final_score;
    if (typeof score === 'number' && !isNaN(score)) {
      newFinalScore = Math.min(Number(evaluation.max_marks), Math.max(0, Math.round(score * 10) / 10));
      updatePayload.final_score = newFinalScore;
      updatePayload.score = newFinalScore;
      updatePayload.percentage = Math.round((newFinalScore / Number(evaluation.max_marks)) * 100);

      if (updatePayload.percentage >= 85) updatePayload.performance = 'Excellent';
      else if (updatePayload.percentage >= 70) updatePayload.performance = 'Good';
      else if (updatePayload.percentage >= 50) updatePayload.performance = 'Satisfactory';
      else updatePayload.performance = 'Needs Improvement';
    }

    if (typeof feedback === 'string') {
      let cleanFb = feedback.trim();
      const words = cleanFb.split(/\s+/);
      if (words.length > 50) {
        cleanFb = words.slice(0, 50).join(' ') + '.';
      }
      updatePayload.feedback = cleanFb;
    }

    const { data: updatedEval, error: updateErr } = await serverSupabase
      .from('ocr_evaluations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      throw updateErr;
    }

    // Re-generate updated PDF report in R2
    if (updatedEval.report_file_key) {
      try {
        const [{ data: studentProf }, { data: classroomData }] = await Promise.all([
          serverSupabase.from('profiles').select('full_name').eq('id', updatedEval.student_id).maybeSingle(),
          serverSupabase.from('classrooms').select('title').eq('id', updatedEval.class_id).maybeSingle()
        ]);

        const pdfBuffer = generateEvaluationReportPdf({
          evaluationId: updatedEval.id,
          studentName: studentProf?.full_name || 'Student',
          teacherName: authData.profile?.full_name || 'Teacher',
          classroomTitle: classroomData?.title || 'Classroom',
          category: updatedEval.category,
          title: updatedEval.title || '',
          maxMarks: updatedEval.max_marks,
          score: updatedEval.final_score,
          percentage: updatedEval.percentage,
          performance: updatedEval.performance,
          breakdown: updatedEval.breakdown_json,
          feedback: updatedEval.feedback,
          isTeacherAdjusted: true,
          completedAt: updatedEval.completed_at || updatedEval.created_at
        });

        await putBinaryContent(updatedEval.report_file_key, pdfBuffer, 'application/pdf');
      } catch (pdfErr) {
        console.warn('[OCR Engine] Re-generating adjusted PDF report notice:', pdfErr.message);
      }
    }

    // Update classroom points if points were recorded
    try {
      await serverSupabase
        .from('classroom_points')
        .update({ points: Math.round(newFinalScore) })
        .eq('source_id', id);
    } catch (ptsErr) {
      console.warn('[OCR Engine] Notice: Could not update classroom points on adjustment:', ptsErr.message);
    }

    res.json({
      success: true,
      data: updatedEval
    });
  } catch (error) {
    console.error('Error in /api/classes/ocr-evaluations/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update evaluation' });
  }
});

// GET /api/classes/:classroomId/ocr-evaluations - List Evaluations for Classroom or Student
app.get('/api/classes/:classroomId/ocr-evaluations', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { classroomId } = req.params;
    const { studentId } = req.query;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    let query = serverSupabase
      .from('ocr_evaluations')
      .select(`
        *,
        student:profiles!student_id (id, full_name, email, avatar_url)
      `)
      .eq('class_id', classroomId)
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data: evaluations, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: evaluations || []
    });
  } catch (error) {
    console.error('Error in /api/classes/:classroomId/ocr-evaluations:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch OCR evaluations' });
  }
});

// ============================================================================
// AI CHALLENGE COMPETITION API ROUTES
// ============================================================================

// POST /api/classes/challenges/presign-upload - Presigned URL for Reference / Student Upload
app.post('/api/classes/challenges/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { filename, contentType, challengeId, type = 'submission' } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'filename is required.' });
    }

    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'txt', 'html'];
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file format .${ext}. Allowed formats: ${allowedExts.join(', ')}`
      });
    }

    const targetChallengeId = challengeId || crypto.randomUUID();
    let objectKey = '';
    const submissionId = crypto.randomUUID();

    if (type === 'reference') {
      objectKey = buildChallengeReferenceKey({ challengeId: targetChallengeId, extension: ext });
    } else {
      objectKey = buildChallengeSubmissionKey({
        challengeId: targetChallengeId,
        submissionId,
        extension: ext
      });
    }

    // Determine upload URL
    const r2Config = getR2Config();
    let uploadUrl = '';

    if (r2Config && r2Config.s3Client && r2Config.bucketName) {
      try {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

        const putCommand = new PutObjectCommand({
          Bucket: r2Config.bucketName,
          Key: objectKey,
          ContentType: contentType || 'application/octet-stream'
        });

        uploadUrl = await getSignedUrl(r2Config.s3Client, putCommand, { expiresIn: 3600 });
      } catch (presignErr) {
        console.warn('[AI Challenge] Presign warning, falling back to direct upload proxy:', presignErr.message);
        uploadUrl = `/api/classes/challenges/upload-proxy?key=${encodeURIComponent(objectKey)}`;
      }
    } else {
      uploadUrl = `/api/classes/challenges/upload-proxy?key=${encodeURIComponent(objectKey)}`;
    }

    res.json({
      success: true,
      data: {
        uploadUrl,
        objectKey,
        fileKey: objectKey,
        submissionId,
        challengeId: targetChallengeId
      }
    });
  } catch (error) {
    console.error('Error in /api/classes/challenges/presign-upload:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate upload URL' });
  }
});

// POST /api/classes/challenges - Create AI Challenge
app.post('/api/classes/challenges', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const {
      classroomId,
      title,
      instructions,
      category = 'Creative Writing',
      maxMarks = 100,
      allowTextSubmission = true,
      allowFileUpload = true,
      referenceFileKey,
      referenceFileName,
      deadlineAt
    } = req.body;

    if (!classroomId || !title?.trim() || !instructions?.trim()) {
      return res.status(400).json({ success: false, error: 'Classroom ID, title, and instructions are required.' });
    }

    // Authoritative teacher authorization check
    const isAuthorized = await isTeacherAuthorized(authData, classroomId);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Teacher authorization required to create challenges.' });
    }

    if (!allowTextSubmission && !allowFileUpload) {
      return res.status(400).json({ success: false, error: 'At least one submission method must be enabled.' });
    }

    const marks = Number(maxMarks) || 100;

    // Generate compact, fixed evaluation specification
    const evaluationSpec = generateChallengeEvaluationSpec({
      title: title.trim(),
      instructions: instructions.trim(),
      category,
      maxMarks: marks,
      referenceFileName
    });

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: challenge, error } = await serverSupabase
      .from('ai_challenges')
      .insert({
        classroom_id: classroomId,
        created_by: authData.user.id,
        title: title.trim(),
        instructions: instructions.trim(),
        reference_file_key: referenceFileKey || null,
        reference_file_name: referenceFileName || null,
        category,
        max_marks: marks,
        allow_text_submission: Boolean(allowTextSubmission),
        allow_file_upload: Boolean(allowFileUpload),
        required_word_count: evaluationSpec.required_word_count,
        word_count_rule: evaluationSpec.word_count_rule,
        evaluation_spec_json: evaluationSpec,
        status: 'published',
        deadline_at: deadlineAt || null
      })
      .select(`
        *,
        creator:profiles!created_by (id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: challenge
    });
  } catch (error) {
    console.error('Error in /api/classes/challenges:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create challenge' });
  }
});

// GET /api/classes/:classroomId/challenges - List Challenges for Classroom
app.get('/api/classes/:classroomId/challenges', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { classroomId } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const [{ data: challenges, error: cErr }, { data: students, error: sErr }] = await Promise.all([
      serverSupabase
        .from('ai_challenges')
        .select(`
          *,
          creator:profiles!created_by (id, full_name, avatar_url),
          submissions:ai_challenge_submissions (id, student_id, status, final_score, submitted_at)
        `)
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false }),
      serverSupabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId)
    ]);

    if (cErr) throw cErr;

    const totalStudents = students ? students.length : 0;

    const formatted = (challenges || []).map((ch) => {
      const subs = ch.submissions || [];
      const submittedCount = subs.length;
      const completedCount = subs.filter((s) => s.status === 'completed').length;
      const processingCount = subs.filter((s) => s.status === 'processing' || s.status === 'queued').length;

      // Find current user's submission if student
      const mySubmission = subs.find((s) => s.student_id === authData.user.id) || null;

      return {
        ...ch,
        total_participants: Math.max(totalStudents, submittedCount),
        submitted_count: submittedCount,
        completed_count: completedCount,
        processing_count: processingCount,
        my_submission: mySubmission
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error in /api/classes/:classroomId/challenges:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch challenges' });
  }
});

// GET /api/classes/challenges/:id - Get Challenge Details
app.get('/api/classes/challenges/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: challenge, error } = await serverSupabase
      .from('ai_challenges')
      .select(`
        *,
        creator:profiles!created_by (id, full_name, avatar_url),
        classroom:classrooms!classroom_id (id, title, subject)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }

    res.json({
      success: true,
      data: challenge
    });
  } catch (error) {
    console.error('Error in /api/classes/challenges/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch challenge' });
  }
});

// POST /api/classes/challenges/:id/submit - Student Submits Work (Asynchronous Queue)
app.post('/api/classes/challenges/:id/submit', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required to submit work.' });
    }

    const { id: challengeId } = req.params;
    const {
      submissionType = 'text',
      contentText,
      fileKey,
      fileName,
      fileType,
      fileSize,
      submissionId: clientSubId
    } = req.body;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    // Verify challenge exists and is open
    const { data: challenge, error: cErr } = await serverSupabase
      .from('ai_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (cErr || !challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }

    // Server-authoritative deadline check
    if (challenge.deadline_at && new Date() > new Date(challenge.deadline_at)) {
      return res.status(400).json({
        success: false,
        error: 'The submission deadline for this challenge has passed.'
      });
    }

    // Validate submission content
    if (submissionType === 'text') {
      if (!contentText || !contentText.trim()) {
        return res.status(400).json({ success: false, error: 'Response text cannot be empty.' });
      }
    } else if (submissionType === 'file') {
      if (!fileKey) {
        return res.status(400).json({ success: false, error: 'Uploaded file key is required.' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Invalid submission type.' });
    }

    const targetSubId = clientSubId || crypto.randomUUID();
    const wordCount = submissionType === 'text' ? (contentText.trim().split(/\s+/).filter(Boolean).length) : null;

    // Idempotent upsert into database with status = 'queued'
    const { data: submission, error: subErr } = await serverSupabase
      .from('ai_challenge_submissions')
      .upsert(
        {
          id: targetSubId,
          challenge_id: challengeId,
          student_id: authData.user.id,
          submission_type: submissionType,
          content_text: submissionType === 'text' ? contentText.trim() : null,
          file_key: submissionType === 'file' ? fileKey : null,
          file_name: fileName || null,
          file_type: fileType || null,
          file_size: fileSize || null,
          word_count: wordCount,
          status: 'queued',
          submitted_at: new Date().toISOString(),
          queued_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'challenge_id,student_id' }
      )
      .select()
      .single();

    if (subErr) {
      throw subErr;
    }

    // Enqueue job into controlled background worker
    aiChallengeQueue.enqueue({
      submissionId: submission.id,
      challengeId,
      studentId: authData.user.id,
      submissionType,
      contentText: submission.content_text,
      fileKey: submission.file_key,
      fileType: submission.file_type,
      challenge
    });

    // Return immediate success
    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        challengeId,
        status: 'queued',
        message: 'Your submission has been received and queued for AI evaluation.'
      }
    });
  } catch (error) {
    console.error('Error in /api/classes/challenges/:id/submit:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit work' });
  }
});

// GET /api/classes/challenges/:id/submissions - Teacher View All Submissions
app.get('/api/classes/challenges/:id/submissions', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id: challengeId } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    // Verify user is teacher of the challenge's classroom
    const { data: challenge } = await serverSupabase
      .from('ai_challenges')
      .select('classroom_id')
      .eq('id', challengeId)
      .maybeSingle();

    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found.' });
    }

    const isAuthorized = await isTeacherAuthorized(authData, challenge.classroom_id);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Teacher authorization required to view all submissions.' });
    }

    const { data: submissions, error } = await serverSupabase
      .from('ai_challenge_submissions')
      .select(`
        *,
        student:profiles!student_id (id, full_name, email, avatar_url)
      `)
      .eq('challenge_id', challengeId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: submissions || []
    });
  } catch (error) {
    console.error('Error in /api/classes/challenges/:id/submissions:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch submissions' });
  }
});

// GET /api/classes/challenges/:id/my-submission - Student View Own Submission
app.get('/api/classes/challenges/:id/my-submission', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id: challengeId } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: submission, error } = await serverSupabase
      .from('ai_challenge_submissions')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('student_id', authData.user.id)
      .maybeSingle();

    if (error) throw error;

    res.json({
      success: true,
      data: submission || null
    });
  } catch (error) {
    console.error('Error in /api/classes/challenges/:id/my-submission:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch submission' });
  }
});

// POST /api/classes/challenges/submissions/:id/override-score - Teacher Score Override
app.post('/api/classes/challenges/submissions/:id/override-score', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id: submissionId } = req.params;
    const { finalScore, reason } = req.body;

    const numScore = Number(finalScore);
    if (isNaN(numScore) || numScore < 0) {
      return res.status(400).json({ success: false, error: 'Valid positive score is required.' });
    }

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: submission, error: fetchErr } = await serverSupabase
      .from('ai_challenge_submissions')
      .select(`
        *,
        challenge:ai_challenges!challenge_id (max_marks, classroom_id, created_by)
      `)
      .eq('id', submissionId)
      .single();

    if (fetchErr || !submission) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }

    const isAuthorized = await isTeacherAuthorized(authData, submission.challenge?.classroom_id);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Teacher authorization required to adjust scores.' });
    }

    const maxMarks = submission.challenge?.max_marks || 100;
    const boundedScore = Math.min(maxMarks, numScore);
    const percentage = Math.round((boundedScore / maxMarks) * 100);

    const { data: updated, error: updateErr } = await serverSupabase
      .from('ai_challenge_submissions')
      .update({
        final_score: boundedScore,
        percentage,
        teacher_adjusted: true,
        teacher_adjustment_reason: (reason || 'Adjusted by teacher').trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error in override-score:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to override score' });
  }
});

// GET /api/classes/challenges/:id/leaderboard - Leaderboard (Ranked by final_score DESC, submitted_at ASC)
app.get('/api/classes/challenges/:id/leaderboard', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id: challengeId } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: submissions, error } = await serverSupabase
      .from('ai_challenge_submissions')
      .select(`
        id,
        student_id,
        final_score,
        ai_score,
        percentage,
        status,
        submitted_at,
        teacher_adjusted,
        student:profiles!student_id (id, full_name, avatar_url)
      `)
      .eq('challenge_id', challengeId)
      .eq('status', 'completed')
      .order('final_score', { ascending: false })
      .order('submitted_at', { ascending: true });

    if (error) throw error;

    const ranked = (submissions || []).map((sub, idx) => ({
      rank: idx + 1,
      ...sub
    }));

    res.json({
      success: true,
      data: ranked
    });
  } catch (error) {
    console.error('Error in /api/classes/challenges/:id/leaderboard:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch leaderboard' });
  }
});

// POST /api/classes/challenges/cleanup-expired - Trigger 7-Day Storage Cleanup
app.post('/api/classes/challenges/cleanup-expired', async (req, res) => {
  try {
    const result = await cleanupExpiredChallengeFiles(serverSupabase);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ASSIGN YOUR STUDENTS — 5 TASK CATEGORIES & HYBRID AUTO-GRADING API
// ============================================================================

// POST /api/classes/tasks - Create Task (Assignment, Lesson, Practice, Activity, Resource)
app.post('/api/classes/tasks', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const {
      classroomId,
      title,
      subtitle,
      instructions,
      category = 'assignment',
      points = 100,
      dueDate,
      contentBlocks = [],
      questions = [],
      attachmentUrls = [],
      settings = {}
    } = req.body;

    if (!classroomId || !title?.trim()) {
      return res.status(400).json({ success: false, error: 'Classroom ID and Title are required.' });
    }

    // Authoritative teacher authorization check
    const isAuthorized = await isTeacherAuthorized(authData, classroomId);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Teacher authorization required to create tasks.' });
    }

    const validCategory = TASK_CATEGORIES.includes(category) ? category : 'assignment';

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: task, error } = await serverSupabase
      .from('assignments')
      .insert({
        classroom_id: classroomId,
        created_by: authData.user.id,
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        instructions: (instructions || '').trim(),
        category: validCategory,
        assignment_type: validCategory === 'assignment' ? 'task' : validCategory,
        points: Number(points) || 100,
        due_date: dueDate || null,
        content_blocks: contentBlocks,
        questions: questions,
        attachment_urls: attachmentUrls,
        settings: {
          show_result_immediately: settings.show_result_immediately ?? true,
          show_correct_answers: settings.show_correct_answers ?? true,
          allow_retry: settings.allow_retry ?? false,
          enable_ai_feedback: settings.enable_ai_feedback ?? true
        },
        status: 'published'
      })
      .select(`
        *,
        creator:profiles!created_by (id, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error in /api/classes/tasks:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
});

// GET /api/classes/:classroomId/tasks - List Tasks for Classroom with Stats
app.get('/api/classes/:classroomId/tasks', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { classroomId } = req.params;
    const { category } = req.query;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    let query = serverSupabase
      .from('assignments')
      .select(`
        *,
        creator:profiles!created_by (id, full_name, avatar_url),
        submissions:assignment_submissions (id, student_id, status, points_awarded, final_score, submitted_at, completed_at)
      `)
      .eq('classroom_id', classroomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const [{ data: tasks, error: tErr }, { data: students, error: sErr }] = await Promise.all([
      query,
      serverSupabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId)
    ]);

    if (tErr) throw tErr;

    const totalStudents = students ? students.length : 0;

    const formatted = (tasks || []).map((t) => {
      const subs = t.submissions || [];
      const submittedCount = subs.length;
      const completedCount = subs.filter((s) => s.status === 'graded' || s.completed_at != null).length;
      const mySub = subs.find((s) => s.student_id === authData.user.id) || null;

      return {
        ...t,
        total_assigned: Math.max(totalStudents, submittedCount),
        submitted_count: submittedCount,
        completed_count: completedCount,
        my_submission: mySub
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Error in /api/classes/:classroomId/tasks:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch tasks' });
  }
});

// GET /api/classes/tasks/:id - Single Task Details for Preview / Student Work
app.get('/api/classes/tasks/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: task, error } = await serverSupabase
      .from('assignments')
      .select(`
        *,
        creator:profiles!created_by (id, full_name, avatar_url),
        classroom:classrooms!classroom_id (id, title, subject, grade)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    // Check if user has an existing submission
    const { data: mySub } = await serverSupabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', id)
      .eq('student_id', authData.user.id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        ...task,
        my_submission: mySub || null
      }
    });
  } catch (error) {
    console.error('Error in /api/classes/tasks/:id:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch task' });
  }
});

// POST /api/classes/tasks/:id/submit - Student Submits Task (Hybrid Auto-Grading)
app.post('/api/classes/tasks/:id/submit', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id: taskId } = req.params;
    const {
      studentAnswers = [],
      textResponse = '',
      fileUrls = []
    } = req.body;

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    // Retrieve authoritative task record
    const { data: task, error: tErr } = await serverSupabase
      .from('assignments')
      .select('*')
      .eq('id', taskId)
      .eq('is_deleted', false)
      .single();

    if (tErr || !task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    // Execute server-authoritative hybrid auto-grading pipeline
    const gradingResult = await gradeTaskSubmission(task, studentAnswers, serverOpenAI);

    const isGraded = gradingResult.final_score != null;
    const submissionStatus = isGraded ? 'graded' : 'submitted';

    // Upsert into assignment_submissions
    const { data: submission, error: subErr } = await serverSupabase
      .from('assignment_submissions')
      .upsert(
        {
          assignment_id: taskId,
          classroom_id: task.classroom_id,
          student_id: authData.user.id,
          status: submissionStatus,
          text_response: textResponse || '',
          file_urls: fileUrls || [],
          question_answers: gradingResult.question_answers,
          points_awarded: isGraded ? Math.round(gradingResult.final_score) : null,
          final_score: gradingResult.final_score,
          ai_score: gradingResult.ai_score,
          percentage: gradingResult.percentage,
          is_ai_graded: gradingResult.is_ai_graded,
          task_version: task.version || 1,
          completed_at: isGraded ? new Date().toISOString() : null,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'assignment_id,student_id' }
      )
      .select()
      .single();

    if (subErr) throw subErr;

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error in /api/classes/tasks/:id/submit:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to submit task' });
  }
});

// GET /api/classes/tasks/:id/submissions - Teacher Views Submissions
app.get('/api/classes/tasks/:id/submissions', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id: taskId } = req.params;
    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    // Verify user is teacher of the task's classroom
    const { data: task } = await serverSupabase
      .from('assignments')
      .select('classroom_id')
      .eq('id', taskId)
      .maybeSingle();

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found.' });
    }

    const isAuthorized = await isTeacherAuthorized(authData, task.classroom_id);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Teacher authorization required to view all submissions.' });
    }

    const { data: submissions, error } = await serverSupabase
      .from('assignment_submissions')
      .select(`
        *,
        student:profiles!student_id (id, full_name, email, avatar_url)
      `)
      .eq('assignment_id', taskId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: submissions || []
    });
  } catch (error) {
    console.error('Error in /api/classes/tasks/:id/submissions:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch submissions' });
  }
});

// POST /api/classes/tasks/submissions/:id/override - Teacher Adjusts Score
app.post('/api/classes/tasks/submissions/:id/override', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id: submissionId } = req.params;
    const { finalScore, reason, teacherFeedback } = req.body;

    const numScore = Number(finalScore);
    if (isNaN(numScore) || numScore < 0) {
      return res.status(400).json({ success: false, error: 'Valid positive score is required.' });
    }

    if (!serverSupabase) {
      return res.status(500).json({ success: false, error: 'Supabase client not initialized.' });
    }

    const { data: submission, error: fetchErr } = await serverSupabase
      .from('assignment_submissions')
      .select(`
        *,
        assignment:assignments!assignment_id (points)
      `)
      .eq('id', submissionId)
      .single();

    if (fetchErr || !submission) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }

    const isAuthorized = await isTeacherAuthorized(authData, submission.classroom_id);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Teacher authorization required to adjust scores.' });
    }

    const maxPoints = submission.assignment?.points || 100;
    const percentage = Math.round((Math.min(maxPoints, numScore) / maxPoints) * 100);

    const { data: updated, error: updateErr } = await serverSupabase
      .from('assignment_submissions')
      .update({
        final_score: numScore,
        points_awarded: Math.round(numScore),
        percentage,
        status: 'graded',
        teacher_feedback: teacherFeedback || submission.teacher_feedback,
        teacher_adjusted: true,
        teacher_adjustment_reason: (reason || 'Adjusted by teacher').trim(),
        graded_by: authData.user.id,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error in override task score:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to override score' });
  }
});

// POST /api/classes/ocr-grade - Backwards Compatible Direct Route
app.post('/api/classes/ocr-grade', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { studentName, assignmentTitle, rubric, maxPoints = 100, textResponse, fileUrl, category = 'Other' } = req.body;

    let evaluation = {
      score: Math.round(Number(maxPoints) * 0.88),
      feedback: 'Good comprehension of key concepts. Structure is clear with thoughtful presentation.',
      performance: 'Good',
      breakdown: [
        { criterion: 'Content and Relevance', score: Math.round(Number(maxPoints) * 0.88), max: Number(maxPoints) }
      ]
    };

    if (serverOpenAI && (textResponse || fileUrl)) {
      try {
        const prompt = `You are an AI assessment grader for EdTechra. Evaluate this student submission:
Student: ${studentName || 'Student'}
Assignment: ${assignmentTitle || 'Class Assignment'}
Category: ${category}
Maximum Points: ${maxPoints}
Rubric / Criteria: ${rubric || 'Accuracy, clarity, and completeness'}
Student Response: ${textResponse || 'Worksheet submission with attached image'}

Return a JSON object strictly matching this format:
{
  "score": <number between 0 and ${maxPoints}>,
  "percentage": <number between 0 and 100>,
  "performance": "Good",
  "breakdown": [{"criterion": "Main Criterion", "score": <number>, "max": ${maxPoints}}],
  "feedback": "<concise feedback, 50 words maximum>"
}`;

        const completion = await serverOpenAI.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 400
        });

        const parsed = JSON.parse(completion.choices?.[0]?.message?.content || '{}');
        if (parsed && typeof parsed.score === 'number') {
          evaluation = {
            score: Math.min(Number(maxPoints), Math.max(0, parsed.score)),
            percentage: parsed.percentage || Math.round((parsed.score / Number(maxPoints)) * 100),
            performance: parsed.performance || 'Good',
            breakdown: parsed.breakdown || evaluation.breakdown,
            feedback: parsed.feedback || evaluation.feedback
          };
        }
      } catch (aiErr) {
        console.warn('[OCR Grading] OpenAI evaluation fallback notice:', aiErr.message);
      }
    }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('Error in /api/classes/ocr-grade:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to grade submission' });
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
      xp_awarded: 10,
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

    // Case 3: AI Approved -> Mark approved, award +10 XP, and publish to public feed
    newPost.status = 'approved';
    newPost.moderation_status = 'approved';
    newPost.moderation_reason = moderation.reason;
    newPost.moderated_at = new Date().toISOString();
    newPost.xp_awarded = 10;

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
          console.log('[Supabase student_posts] Post created in database successfully (+10 XP):', newPost.id);

          // Award +10 XP to student profile if learner (admin excluded from learner rankings)
          if (authData?.user?.id && authData?.profile?.role !== 'admin' && authData?.profile?.role !== 'super_admin') {
            try {
              const { data: prof } = await serverSupabase
                .from('profiles')
                .select('xp')
                .eq('id', authData.user.id)
                .single();
              if (prof) {
                await serverSupabase
                  .from('profiles')
                  .update({ xp: (Number(prof.xp) || 0) + 10, updated_at: new Date().toISOString() })
                  .eq('id', authData.user.id);
              }
              await recordUserActivityInteraction(authData.user.id, newPost.id, 'post', 'created');
            } catch (xpErr) {
              console.warn('[Post XP update notice]:', xpErr.message);
            }
          }
        }
      } catch (sbErr) {
        console.error('[Supabase student_posts insert exception]:', sbErr.message);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...newPost,
        xp_awarded: 10,
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

// GET /api/posts/user-stats/:userId - User posts count, total likes received, and post XP
app.get('/api/posts/user-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || userId === 'guest-user') {
      return res.json({ success: true, data: { postsCount: 0, likesReceived: 0, totalPostXp: 0 } });
    }

    let postsCount = 0;
    let likesReceived = 0;

    if (serverSupabase) {
      try {
        const { data: dbPosts, error } = await serverSupabase
          .from('student_posts')
          .select('id, likes_count, status')
          .eq('user_id', userId)
          .eq('status', 'approved');

        if (!error && Array.isArray(dbPosts)) {
          postsCount = dbPosts.length;
          likesReceived = dbPosts.reduce((sum, p) => sum + (Number(p.likes_count) || 0), 0);
          return res.json({
            success: true,
            data: {
              postsCount,
              likesReceived,
              totalPostXp: postsCount * 10
            }
          });
        }
      } catch (err) {
        console.warn('[Supabase user-stats notice]:', err.message);
      }
    }

    // Fallback to in-memory posts cache
    const postsCache = loadPostsCache();
    const userPosts = postsCache.filter(p => p.user_id === userId && p.status === 'approved');
    postsCount = userPosts.length;
    likesReceived = userPosts.reduce((sum, p) => sum + (Number(p.likes_count) || 0), 0);

    res.json({
      success: true,
      data: {
        postsCount,
        likesReceived,
        totalPostXp: postsCount * 10
      }
    });
  } catch (error) {
    console.error('Error in GET /api/posts/user-stats/:userId:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve post stats' });
  }
});

// 3. GET /api/posts - Retrieve paginated student posts ordered newest -> oldest (APPROVED ONLY)
app.get('/api/posts', async (req, res) => {
  try {
    // Check and trigger scheduled post queue publishing on demand
    await processPublishingQueue(serverSupabase).catch(() => {});

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
        // Primary query: attempt join with profiles for author data
        let dbPosts = null;
        let dbErr = null;

        try {
          const result = await serverSupabase
            .from('student_posts')
            .select('*, profiles(id, full_name, email, avatar_url, role)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
          dbPosts = result.data;
          dbErr = result.error;
        } catch (joinEx) {
          console.warn('[Supabase GET student_posts] Profiles join failed, trying without join:', joinEx.message);
        }

        // Fallback: if profiles join failed, query without the join
        if (dbErr || !dbPosts) {
          console.warn('[Supabase GET student_posts] Falling back to query without profiles join. Error:', dbErr?.message || 'join exception');
          try {
            const fallbackResult = await serverSupabase
              .from('student_posts')
              .select('*')
              .eq('status', 'approved')
              .order('created_at', { ascending: false });
            if (!fallbackResult.error && Array.isArray(fallbackResult.data)) {
              dbPosts = fallbackResult.data;
              dbErr = null;
            }
          } catch (fallbackEx) {
            console.error('[Supabase GET student_posts fallback exception]:', fallbackEx.message);
          }
        }

        if (!dbErr && Array.isArray(dbPosts)) {
          const mappedPosts = dbPosts.map(p => ({
            ...p,
            author: p.profiles || {
              id: p.user_id,
              full_name: 'Student',
              email: '',
              role: 'student'
            }
          }));

          // SAFETY: Only overwrite cache if DB returned results, or if cache is empty.
          // This prevents a successful-but-empty DB query from wiping existing cached posts.
          if (mappedPosts.length > 0 || allPosts.length === 0) {
            allPosts = mappedPosts;
            savePostsCache(allPosts);
          } else {
            console.warn(`[Supabase GET student_posts] DB returned 0 approved posts but cache has ${allPosts.length}. Keeping cache.`);
          }
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

    // Attach per-user like state with database and cache synchronization
    const userLikedPostIds = new Set(
      currentUserId ? Object.keys(likesMap).filter(pid => likesMap[pid]?.includes(currentUserId)) : []
    );

    if (serverSupabase && currentUserId) {
      try {
        const postIds = paginated.map(p => p.id);
        if (postIds.length > 0) {
          const { data: dbUserLikes } = await serverSupabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', currentUserId)
            .in('post_id', postIds);
          if (dbUserLikes && Array.isArray(dbUserLikes)) {
            dbUserLikes.forEach(l => userLikedPostIds.add(l.post_id));
          }
        }
      } catch (dbLikeErr) {
        // Fallback gracefully to cache
      }
    }

    const formattedPosts = paginated.map(p => {
      const postLikes = likesMap[p.id] || [];
      const isLiked = currentUserId ? userLikedPostIds.has(p.id) : false;
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

    // Persist to Supabase
    if (serverSupabase) {
      try {
        if (liked) {
          await serverSupabase
            .from('post_likes')
            .upsert({ post_id: id, user_id: userId }, { onConflict: 'post_id,user_id' });
        } else {
          await serverSupabase
            .from('post_likes')
            .delete()
            .eq('post_id', id)
            .eq('user_id', userId);
        }
        await serverSupabase
          .from('student_posts')
          .update({ likes_count: likesMap[id].length })
          .eq('id', id);
      } catch (sbErr) {
        console.warn('[Supabase like notice]:', sbErr.message);
      }
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
// API ROUTES: ADMIN BULK IMAGE UPLOAD & SEQUENTIAL PUBLISHING QUEUE
// Admin-Only | Zero Gemini Validation | Resilient Server-Side Execution
// ============================================================================

// Background admin post queue scheduler tick: Process due items every 30 seconds (non-serverless only)
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    processPublishingQueue(serverSupabase).catch((err) => {
      console.warn('[Admin Post Queue Scheduler Error]:', err.message);
    });
  }, 30000);
}

// 1. POST /api/admin/posts/queue/presign-batch - Batch presign R2 upload URLs
app.post('/api/admin/posts/queue/presign-batch', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'Files array is required.' });
    }

    const presignedResults = [];
    for (const file of files) {
      const { filename, contentType = 'image/webp', size } = file;
      try {
        validateImageUpload({ contentType, size: size || 1024 * 1024 });
      } catch (valErr) {
        return res.status(400).json({ success: false, error: `Invalid file "${filename}": ${valErr.message}` });
      }

      const objectKey = buildObjectKey({
        userId: authData.user.id,
        filename: filename || `bulk_${Date.now()}.webp`,
        contentType
      });

      const presigned = buildPresignedUpload({
        objectKey,
        contentType
      });

      presignedResults.push({
        filename,
        ...presigned
      });
    }

    res.json({
      success: true,
      data: presignedResults
    });
  } catch (error) {
    console.error('Error in /api/admin/posts/queue/presign-batch:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate batch upload URLs' });
  }
});

// 2. POST /api/admin/posts/queue/submit - Create batch queue records and start sequential publishing
app.post('/api/admin/posts/queue/submit', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const result = await createQueueBatch(authData.user, req.body, serverSupabase);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in /api/admin/posts/queue/submit:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create bulk publishing queue' });
  }
});

// 3. GET /api/admin/posts/queue - Get queue overview & batch progress
app.get('/api/admin/posts/queue', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const overview = await getQueueOverview(serverSupabase);
    res.json(overview);
  } catch (error) {
    console.error('Error in GET /api/admin/posts/queue:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch queue overview' });
  }
});

// 4. POST /api/admin/posts/queue/:id/publish-now - Force immediate publication of queue item
app.post('/api/admin/posts/queue/:id/publish-now', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const { id } = req.params;
    const result = await publishItemNow(id, serverSupabase);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/admin/posts/queue/:id/publish-now:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to publish queue item' });
  }
});

// 5. POST /api/admin/posts/queue/batch/:batchId/pause - Pause batch
app.post('/api/admin/posts/queue/batch/:batchId/pause', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const { batchId } = req.params;
    const result = await pauseQueueBatch(batchId, serverSupabase);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/admin/posts/queue/batch/:batchId/pause:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to pause batch' });
  }
});

// 6. POST /api/admin/posts/queue/batch/:batchId/resume - Resume batch
app.post('/api/admin/posts/queue/batch/:batchId/resume', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const { batchId } = req.params;
    const result = await resumeQueueBatch(batchId, serverSupabase);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/admin/posts/queue/batch/:batchId/resume:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to resume batch' });
  }
});

// 7. POST /api/admin/posts/queue/batch/:batchId/cancel - Cancel batch
app.post('/api/admin/posts/queue/batch/:batchId/cancel', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const { batchId } = req.params;
    const result = await cancelQueueBatch(batchId, serverSupabase);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/admin/posts/queue/batch/:batchId/cancel:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to cancel batch' });
  }
});

// 8. POST /api/admin/posts/queue/:id/retry - Retry failed item
app.post('/api/admin/posts/queue/:id/retry', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
    }

    const { id } = req.params;
    const result = await retryQueueItem(id, serverSupabase);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/admin/posts/queue/:id/retry:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to retry queue item' });
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
      const interactedQuizIds = await getUserInteractedIds(userId, 'quiz');

      if (interactedQuizIds.size === 0 && serverSupabase) {
        try {
          const { data: sbAttempts } = await serverSupabase
            .from('quiz_attempts')
            .select('quiz_id')
            .eq('user_id', userId)
            .eq('is_correct', true);
          if (sbAttempts) {
            sbAttempts.forEach(a => interactedQuizIds.add(a.quiz_id));
          }
        } catch (e) {
          // Ignore
        }
      }

      const cachedAttempts = loadQuizAttemptsCache();
      cachedAttempts
        .filter(a => a.user_id === userId && a.is_correct)
        .forEach(a => interactedQuizIds.add(a.quiz_id));

      // Strictly exclude completed quizzes (Rule: NEVER see completed activity in feed again)
      candidatePool = publishedQuizzes.filter(q => !interactedQuizIds.has(q.id));
    }

    // Shuffle and pick up to 12 eligible quizzes
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

// 8. POST /api/quiz/attempt - Submit student quiz answer with XP awarding
app.post('/api/quiz/attempt', async (req, res) => {
  try {
    const { quizId, selectedAnswer } = req.body;

    if (!quizId || selectedAnswer === undefined) {
      return res.status(400).json({ success: false, error: 'quizId and selectedAnswer are required.' });
    }

    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';

    const allQuizzes = loadQuizCache();
    let quiz = allQuizzes.find(q => q.id === quizId);

    if (!quiz && serverSupabase) {
      try {
        const { data: dbQuiz } = await serverSupabase
          .from('quiz_bits')
          .select('*')
          .eq('id', quizId)
          .maybeSingle();
        if (dbQuiz) quiz = dbQuiz;
      } catch (e) {
        // Fallback
      }
    }

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found.' });
    }

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

      if (xpAwarded > 0) {
        try {
          const { data: prof } = await serverSupabase.from('profiles').select('xp').eq('id', userId).maybeSingle();
          if (prof) {
            await serverSupabase.from('profiles').update({ xp: (prof.xp || 0) + xpAwarded, updated_at: new Date().toISOString() }).eq('id', userId);
          }
        } catch (e) {}
      }
    }

    // If correctly completed, record to user activity interactions for feed deduplication
    if (isCorrect && userId && userId !== 'guest_user') {
      await recordUserActivityInteraction(userId, quizId, 'quiz', 'completed');
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

// Leaderboard Settings State (Weekly, Monthly, Never)
let leaderboardConfig = {
  reset_frequency: 'weekly',
  updated_at: new Date().toISOString(),
  updated_by: null
};

// In-memory fallback reset store if Supabase resets table is syncing
const inMemoryLeaderboardResets = {
  today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  month: new Date(new Date().setDate(1)).toISOString()
};

// GET /api/admin/leaderboard/settings - Retrieve Admin Leaderboard Configuration
app.get('/api/admin/leaderboard/settings', async (req, res) => {
  try {
    if (serverSupabase) {
      try {
        const { data } = await serverSupabase
          .from('leaderboard_settings')
          .select('*')
          .maybeSingle();
        if (data?.reset_frequency) {
          leaderboardConfig.reset_frequency = data.reset_frequency;
          leaderboardConfig.updated_at = data.updated_at || leaderboardConfig.updated_at;
        }
      } catch {}
    }
    return res.json({ success: true, data: leaderboardConfig });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/leaderboard/settings - Update Leaderboard Reset Frequency (Weekly / Monthly / Never)
app.post('/api/admin/leaderboard/settings', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userRole = authData?.profile?.role;
    const isAuthorized = userRole === 'admin' || authData?.user?.email === 'roshanjoyal520@gmail.com';

    if (!authData || !isAuthorized) {
      return res.status(403).json({ success: false, error: 'Admin privileges required to update leaderboard settings.' });
    }

    const { reset_frequency } = req.body;
    const validFrequencies = ['weekly', 'monthly', 'never'];
    if (!reset_frequency || !validFrequencies.includes(reset_frequency.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid reset_frequency. Must be weekly, monthly, or never.' });
    }

    const cleanFreq = reset_frequency.toLowerCase();
    const now = new Date().toISOString();
    leaderboardConfig = {
      reset_frequency: cleanFreq,
      updated_at: now,
      updated_by: authData.user.id
    };

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('leaderboard_settings')
          .upsert({
            id: 'default',
            reset_frequency: cleanFreq,
            updated_at: now,
            updated_by: authData.user.id
          }, { onConflict: 'id' });
      } catch (dbErr) {
        console.warn('[Leaderboard Settings DB update notice]:', dbErr);
      }
    }

    return res.json({
      success: true,
      message: `Leaderboard reset frequency updated to "${cleanFreq}".`,
      data: leaderboardConfig
    });
  } catch (error) {
    console.error('Error in POST /api/admin/leaderboard/settings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 1. GET /api/leaderboard - Retrieve Top 10 Learners and Current User Ranking
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Default to admin-configured frequency if no period param is passed
    let defaultPeriod = 'week';
    if (leaderboardConfig.reset_frequency === 'monthly') defaultPeriod = 'month';
    else if (leaderboardConfig.reset_frequency === 'never') defaultPeriod = 'all_time';

    const reqPeriod = req.query.period ? String(req.query.period).toLowerCase().trim() : null;
    const validPeriods = new Set(['today', 'week', 'month', 'all_time']);
    const selectedPeriod = reqPeriod && validPeriods.has(reqPeriod) ? reqPeriod : defaultPeriod;

    // Optional user authentication for personal rank resolution
    const authData = await verifyAuthUser(req);
    let currentUserId = authData?.user?.id || null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!currentUserId || !uuidRegex.test(currentUserId)) {
      currentUserId = null;
    }

    if (serverSupabase) {
      try {
        const { data: rpcData, error: rpcError } = await serverSupabase.rpc('get_top_learners', {
          p_period: selectedPeriod,
          p_current_user_id: currentUserId
        });

        if (!rpcError && rpcData && Array.isArray(rpcData.top10)) {
          return res.json({
            success: true,
            data: {
              ...rpcData,
              configured_frequency: leaderboardConfig.reset_frequency
            }
          });
        }
      } catch (rpcErr) {
        console.warn('[Leaderboard RPC fallback notice]:', rpcErr.message);
      }
    }

    // Compute natural start dates for periods (UTC)
    const now = new Date();
    let naturalStart;
    if (selectedPeriod === 'today') {
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
      naturalStart = today.toISOString();
    } else if (selectedPeriod === 'week') {
      const week = new Date(now);
      const day = week.getUTCDay();
      const diff = week.getUTCDate() - day + (day === 0 ? -6 : 1);
      week.setUTCDate(diff);
      week.setUTCHours(0, 0, 0, 0);
      naturalStart = week.toISOString();
    } else if (selectedPeriod === 'month') {
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      naturalStart = month.toISOString();
    } else {
      naturalStart = '1970-01-01T00:00:00.000Z';
    }

    // Check if an explicit admin reset occurred for this period
    let resetDate = null;
    if (selectedPeriod !== 'all_time') {
      if (serverSupabase) {
        try {
          const { data: resetRecord } = await serverSupabase
            .from('leaderboard_resets')
            .select('reset_at')
            .eq('period_type', selectedPeriod)
            .maybeSingle();
          if (resetRecord?.reset_at) {
            resetDate = resetRecord.reset_at;
          }
        } catch (e) {}
      }
      if (!resetDate && inMemoryLeaderboardResets[selectedPeriod]) {
        resetDate = inMemoryLeaderboardResets[selectedPeriod];
      }
    }

    // Effective since date: whichever is more recent between natural period start and admin reset
    let sinceDate = naturalStart;
    if (resetDate && selectedPeriod !== 'all_time') {
      const resetTime = new Date(resetDate).getTime();
      const naturalTime = new Date(naturalStart).getTime();
      if (!isNaN(resetTime) && resetTime > naturalTime) {
        sinceDate = new Date(resetTime).toISOString();
      }
    }

    // Fetch all profiles (strictly filter for student learners only; exclude admins and teachers)
    let profiles = [];
    if (serverSupabase) {
      const { data: sbProfiles } = await serverSupabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, created_at');
      if (sbProfiles) profiles = sbProfiles;
    }

    // Filter learners strictly (exclude admins, super admins, and teachers from learner leaderboard)
    const learnerProfiles = profiles.filter((p) => p.role !== 'admin' && p.role !== 'super_admin' && p.role !== 'teacher' && p.role === 'student');

    // Compute user XP map
    const userXpMap = new Map();

    // Starter bonus for all-time
    if (selectedPeriod === 'all_time') {
      learnerProfiles.forEach(p => {
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

      // 6. Spelling Flip Cards XP
      const { data: flipCompletions } = await serverSupabase
        .from('spelling_flip_completions')
        .select('user_id, xp_awarded')
        .eq('is_correct', true)
        .gte('created_at', sinceDate);
      (flipCompletions || []).forEach(c => {
        const cur = userXpMap.get(c.user_id) || 0;
        userXpMap.set(c.user_id, cur + (c.xp_awarded || 10));
      });

      // 7. Bubble Pop Relaxation Game XP (+10 XP per unique cleared level)
      const { data: bpCompletions } = await serverSupabase
        .from('bubble_pop_completions')
        .select('user_id, xp_awarded')
        .gte('completed_at', sinceDate);
      (bpCompletions || []).forEach(c => {
        const cur = userXpMap.get(c.user_id) || 0;
        userXpMap.set(c.user_id, cur + (c.xp_awarded || 10));
      });

      // 8. Student Posts XP (+10 XP per approved post)
      const { data: spCompletions } = await serverSupabase
        .from('student_posts')
        .select('user_id, created_at')
        .eq('status', 'approved');
      (spCompletions || []).forEach(p => {
        if (!sinceDate || !p.created_at || new Date(p.created_at) >= new Date(sinceDate)) {
          const cur = userXpMap.get(p.user_id) || 0;
          userXpMap.set(p.user_id, cur + 10);
        }
      });
    } else {
      // In-memory cache fallback for activities XP
      try {
        const flipCache = loadSpellingFlipCompletionsCache();
        flipCache.filter(c => c.is_correct).forEach(c => {
          if (!sinceDate || !c.created_at || new Date(c.created_at) >= new Date(sinceDate)) {
            const cur = userXpMap.get(c.user_id) || 0;
            userXpMap.set(c.user_id, cur + (c.xp_awarded || 10));
          }
        });

        const bubbleCache = loadBubblePopCompletionsCache();
        bubbleCache.forEach(c => {
          if (!sinceDate || !c.completed_at || new Date(c.completed_at) >= new Date(sinceDate)) {
            const cur = userXpMap.get(c.user_id) || 0;
            userXpMap.set(c.user_id, cur + (c.xp_awarded || 10));
          }
        });
      } catch (e) {}

      const postsCache = loadPostsCache();
      postsCache.filter(p => p.status === 'approved').forEach(p => {
        if (!sinceDate || !p.created_at || new Date(p.created_at) >= new Date(sinceDate)) {
          const cur = userXpMap.get(p.user_id) || 0;
          userXpMap.set(p.user_id, cur + 10);
        }
      });
    }

    // Build ranked array for learners only
    const rankedList = learnerProfiles.map(p => {
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
        configured_frequency: leaderboardConfig.reset_frequency,
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
// API ROUTES: UNIVERSAL ACTIVITY INTERACTION RECORDING & DEDUPLICATION
// ============================================================================

// POST /api/activity/interact - Idempotent interaction recording for feed deduplication
app.post('/api/activity/interact', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || null;
    const { activityId, activityType, interactionType } = req.body;

    if (!activityId || !activityType) {
      return res.status(400).json({ success: false, error: 'activityId and activityType are required.' });
    }

    if (userId && userId !== 'guest_user') {
      await recordUserActivityInteraction(
        userId,
        String(activityId),
        String(activityType),
        String(interactionType || 'completed')
      );
    }

    res.json({
      success: true,
      data: {
        userId,
        activityId,
        activityType,
        interactionType: interactionType || 'completed'
      }
    });
  } catch (error) {
    console.error('Error in POST /api/activity/interact:', error);
    res.status(500).json({ success: false, error: 'Failed to record activity interaction.' });
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
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;

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

    // Deduplicate: Exclude watched/completed Shorts for this user
    let candidatePool = publishedShorts;
    if (userId) {
      const watchedShortIds = await getUserInteractedIds(userId, 'youtube_short');
      candidatePool = publishedShorts.filter(s => !watchedShortIds.has(String(s.id)) && !watchedShortIds.has(String(s.youtube_video_id)));
    }

    res.json({
      success: true,
      data: candidatePool
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

/**
 * Helper to sanitize error messages from exposing keys or internal auth tokens
 */
function sanitizeErrorMessage(errMsg) {
  if (!errMsg || typeof errMsg !== 'string') return 'Unknown error';
  const apiKey = process.env.GEMINI_API_KEY;
  let clean = errMsg;
  if (apiKey) {
    clean = clean.split(apiKey).join('[REDACTED_API_KEY]');
  }
  clean = clean.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
  clean = clean.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  return clean.slice(0, 500);
}

/**
 * Background AI Image Generation Worker for Articles
 * Generates an image using Gemini AI, saves to R2, and updates article record without blocking
 * Implements strict manual image protection, atomic locking, and race-condition verification.
 */
async function triggerBackgroundArticleImageGeneration(article, options = {}) {
  if (!article || !article.id) return { success: false, error: 'Invalid article' };
  const articleId = article.id;

  // 1. Initial State & Manual Image Protection Check
  const currentCache = loadReadingsCache();
  const currentReading = currentCache.find(r => r.id === articleId) || article;

  // Protect manual images: If an image exists and is NOT an AI-generated image, NEVER overwrite
  if (currentReading.cover_image_url && currentReading.cover_image_url.trim() !== '') {
    if (currentReading.image_status !== 'generated') {
      console.log(`[GeminiImageService] Skipped: Article "${currentReading.title}" has a manual cover image.`);
      return {
        success: false,
        status: 'manual_image',
        reason: 'Article contains a manual image that cannot be overwritten automatically.'
      };
    }
  }

  // Atomic generation lock check
  if (currentReading.image_status === 'generating' && !options.force) {
    console.log(`[GeminiImageService] Skipped: Article "${currentReading.title}" is already generating an image.`);
    return {
      success: false,
      status: 'already_generating',
      message: 'Image generation is already in progress for this article.'
    };
  }

  console.log(`[GeminiImageService] Triggering AI image generation for article: "${article.title}" (${articleId})`);

  // 2. Mark status as 'generating' in cache & DB
  const nextAttempts = (currentReading.image_generation_attempts || 0) + 1;
  const lockCache = loadReadingsCache();
  const lockIdx = lockCache.findIndex(r => r.id === articleId);
  if (lockIdx !== -1) {
    lockCache[lockIdx].image_status = 'generating';
    lockCache[lockIdx].image_error = null;
    lockCache[lockIdx].image_generation_attempts = nextAttempts;
    saveReadingsCache(lockCache);
  }
  if (serverSupabase) {
    try {
      const { error: lockErr } = await serverSupabase
        .from('readings')
        .update({
          image_status: 'generating',
          image_error: null,
          image_generation_attempts: nextAttempts
        })
        .eq('id', articleId);
      if (lockErr && lockErr.message?.includes('image_status')) {
        await serverSupabase.from('readings').update({ updated_at: new Date().toISOString() }).eq('id', articleId);
      }
    } catch (e) {
      console.warn('[Supabase image_status generating notice]:', e.message);
    }
  }

  // 3. Perform generation
  try {
    const result = await generateArticleCoverImage(article, options);
    const now = new Date().toISOString();

    // 4. Mandatory Post-Generation Race Condition Check:
    // Verify that a manual image upload did not occur while Gemini was running
    const freshCache = loadReadingsCache();
    const freshReading = freshCache.find(r => r.id === articleId);
    if (freshReading && freshReading.cover_image_url && freshReading.image_status !== 'generating' && freshReading.image_status !== 'generated') {
      console.warn(`[GeminiImageService] Race Condition: Manual image was uploaded during AI generation for "${article.title}". Aborting AI image overwrite.`);
      return {
        success: false,
        status: 'manual_image',
        reason: 'Manual image uploaded during generation took priority.'
      };
    }

    const updatedIdx = freshCache.findIndex(r => r.id === articleId);

    if (result.success && result.publicUrl) {
      const updatedArticle = {
        ...(updatedIdx !== -1 ? freshCache[updatedIdx] : article),
        cover_image_url: result.publicUrl,
        cover_image_object_key: result.objectKey || null,
        image_status: 'generated',
        image_prompt: result.prompt || null,
        image_generated_at: now,
        image_provider: 'google',
        image_model: result.model || 'gemini-2.5-flash-image',
        image_storage_key: result.objectKey || null,
        image_error: null,
        updated_at: now
      };

      if (updatedIdx !== -1) {
        freshCache[updatedIdx] = updatedArticle;
        saveReadingsCache(freshCache);
      }

      if (serverSupabase) {
        try {
          const { error: sbUpdateErr } = await serverSupabase.from('readings').update({
            cover_image_url: updatedArticle.cover_image_url,
            cover_image_object_key: updatedArticle.cover_image_object_key,
            image_status: 'generated',
            image_prompt: updatedArticle.image_prompt,
            image_generated_at: updatedArticle.image_generated_at,
            image_provider: 'google',
            image_model: updatedArticle.image_model,
            image_storage_key: updatedArticle.image_storage_key,
            image_error: null,
            updated_at: now
          }).eq('id', articleId);

          if (sbUpdateErr && sbUpdateErr.message?.includes('image_status')) {
            await serverSupabase.from('readings').update({
              cover_image_url: updatedArticle.cover_image_url,
              cover_image_object_key: updatedArticle.cover_image_object_key,
              updated_at: now
            }).eq('id', articleId);
          }
        } catch (e) {
          console.warn('[Supabase update generated image notice]:', e.message);
        }
      }
      console.log(`[GeminiImageService] ✓ Successfully generated and stored cover image for "${article.title}": ${result.publicUrl}`);
      return { success: true, status: 'generated', reading: updatedArticle };
    } else {
      // Mark as failed while keeping article published
      const sanitizedErr = sanitizeErrorMessage(result.error || 'Failed to generate image with Gemini API');
      const failedArticle = {
        ...(updatedIdx !== -1 ? freshCache[updatedIdx] : article),
        image_status: 'failed',
        image_error: sanitizedErr,
        image_prompt: result.prompt || null,
        updated_at: now
      };

      if (updatedIdx !== -1) {
        freshCache[updatedIdx] = failedArticle;
        saveReadingsCache(freshCache);
      }
      if (serverSupabase) {
        try {
          const { error: sbFailErr } = await serverSupabase.from('readings').update({
            image_status: 'failed',
            image_error: sanitizedErr,
            image_prompt: result.prompt || null,
            updated_at: now
          }).eq('id', articleId);
          if (sbFailErr && sbFailErr.message?.includes('image_status')) {
            await serverSupabase.from('readings').update({ updated_at: now }).eq('id', articleId);
          }
        } catch (e) {
          console.warn('[Supabase update failed image notice]:', e.message);
        }
      }
      console.warn(`[GeminiImageService] ✗ Image generation failed for "${article.title}":`, sanitizedErr);
      return { success: false, status: 'failed', error: sanitizedErr, reading: failedArticle };
    }
  } catch (err) {
    const sanitizedErr = sanitizeErrorMessage(err.message || 'Unexpected server error during image generation');
    console.error(`[GeminiImageService] Unhandled error generating image for "${article.title}":`, sanitizedErr);
    const updatedCache = loadReadingsCache();
    const updatedIdx = updatedCache.findIndex(r => r.id === articleId);
    if (updatedIdx !== -1) {
      updatedCache[updatedIdx].image_status = 'failed';
      updatedCache[updatedIdx].image_error = sanitizedErr;
      saveReadingsCache(updatedCache);
    }
    if (serverSupabase) {
      try {
        await serverSupabase.from('readings').update({
          image_status: 'failed',
          image_error: sanitizedErr
        }).eq('id', articleId);
      } catch {}
    }
    return { success: false, status: 'failed', error: sanitizedErr };
  }
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
      image_status: cover_image_url ? 'none' : 'none',
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
        if (sbErr) {
          console.warn('[Supabase readings insert warning]:', sbErr.message);
          if (sbErr.message && sbErr.message.includes('image_status')) {
            const { image_status, image_prompt, image_generated_at, image_error, ...safePayload } = newReading;
            await serverSupabase.from('readings').insert([safePayload]);
          }
        }
      } catch (e) {
        console.warn('[Supabase readings insert notice]:', e.message);
      }
    }

    // If published and no manual cover image, automatically trigger Gemini AI image generation in background
    if (newReading.is_published && (!newReading.cover_image_url || newReading.cover_image_url.trim() === '')) {
      triggerBackgroundArticleImageGeneration(newReading).catch(err => {
        console.warn('[Auto AI Image Generation Background Error]:', err.message);
      });
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

    // Filter completions strictly if authenticated
    let candidatePool = published;
    if (userId) {
      const completedIds = await getUserInteractedIds(userId, 'reading');

      if (completedIds.size === 0 && serverSupabase) {
        try {
          const { data: dbCompletions } = await serverSupabase
            .from('reading_completions')
            .select('reading_id')
            .eq('user_id', userId);
          if (dbCompletions) {
            dbCompletions.forEach(c => completedIds.add(String(c.reading_id)));
          }
        } catch (e) {
          // Ignore
        }
      }

      const cachedCompletions = loadReadingCompletionsCache();
      cachedCompletions.filter(c => c.user_id === userId).forEach(c => completedIds.add(String(c.reading_id)));

      // Strictly exclude completed readings; fallback to all published if all completed
      candidatePool = published.filter(r => !completedIds.has(String(r.id)));
      if (candidatePool.length === 0) {
        candidatePool = published;
      }
    }

    const shuffled = shuffleArray(candidatePool);
    const feedPool = shuffled.slice(0, 50);

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

    // If published and no manual cover image, automatically trigger Gemini AI image generation in background
    if (targetPub && index !== -1) {
      const readingObj = cache[index];
      if (!readingObj?.cover_image_url || readingObj.cover_image_url.trim() === '') {
        triggerBackgroundArticleImageGeneration(readingObj).catch(err => {
          console.warn('[Auto AI Image Generation Background Error on Publish]:', err.message);
        });
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

// 11. POST /api/admin/readings/:id/generate-image - Generate or regenerate AI cover image for a single article
app.post('/api/admin/readings/:id/generate-image', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { force = false, regenerate = false, customPrompt } = req.body || {};

    const cache = loadReadingsCache();
    let reading = cache.find(r => r.id === id);

    if (!reading && serverSupabase) {
      try {
        const { data: dbReading } = await serverSupabase.from('readings').select('*').eq('id', id).single();
        if (dbReading) reading = dbReading;
      } catch (e) {
        console.warn('[Supabase fetch single reading notice]:', e.message);
      }
    }

    if (!reading) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    // Manual Image Protection: If article has a manual cover image, NEVER overwrite it
    if (reading.cover_image_url && reading.cover_image_url.trim() !== '') {
      if (reading.image_status !== 'generated') {
        return res.json({
          success: false,
          status: 'manual_image',
          reason: 'This article contains a manual cover image and cannot be overwritten by AI generation.',
          data: reading,
          skipped: true
        });
      }
      // If AI-generated and not explicitly requesting regenerate
      if (!regenerate && !force) {
        return res.json({
          success: true,
          status: 'skipped',
          message: 'Article already has an AI-generated image. Specify regenerate: true to replace.',
          data: reading,
          skipped: true
        });
      }
    }

    // Atomic generation lock check
    if (reading.image_status === 'generating' && !force) {
      return res.json({
        success: false,
        status: 'already_generating',
        message: 'An image generation job is already in progress for this article.',
        data: reading
      });
    }

    const result = await triggerBackgroundArticleImageGeneration(reading, { customPrompt, force: true });

    if (result.success && result.reading) {
      return res.json({
        success: true,
        status: 'generated',
        message: 'AI cover image generated and stored in Cloudflare R2 successfully.',
        data: result.reading
      });
    } else {
      return res.status(200).json({
        success: false,
        error: result.error || result.reason || 'Gemini AI image generation failed.',
        status: result.status || 'failed',
        reason: result.reason || null,
        data: result.reading || reading
      });
    }
  } catch (error) {
    console.error('Error in POST /api/admin/readings/:id/generate-image:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error.message) || 'Failed to generate image.' });
  }
});

// 12. POST /api/admin/readings/generate-missing-images - Bulk generate AI cover images for articles missing images
app.post('/api/admin/readings/generate-missing-images', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { dryRun = false, limit = 100 } = req.body || {};

    let allReadings = loadReadingsCache();
    if (serverSupabase) {
      try {
        const { data: dbReadings } = await serverSupabase.from('readings').select('*').order('created_at', { ascending: false });
        if (dbReadings && dbReadings.length > 0) {
          allReadings = dbReadings;
        }
      } catch (e) {
        console.warn('[Supabase bulk missing images notice]:', e.message);
      }
    }

    // Identify articles without cover images (published, no image, not generating, not failed)
    const missingArticles = allReadings.filter(r => 
      Boolean(r.is_published) &&
      (!r.cover_image_url || r.cover_image_url.trim() === '') &&
      r.image_status !== 'generating'
    ).slice(0, Math.min(100, Math.max(1, limit)));

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        totalFound: missingArticles.length,
        articles: missingArticles.map(r => ({ id: r.id, title: r.title, category: r.category, is_published: r.is_published }))
      });
    }

    if (missingArticles.length === 0) {
      return res.json({
        success: true,
        totalFound: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        results: [],
        message: 'All published articles already have cover images.'
      });
    }

    // Process sequentially with controlled delay to respect Gemini API rate limits
    let completed = 0;
    let failed = 0;
    let skipped = 0;
    const results = [];

    for (let i = 0; i < missingArticles.length; i++) {
      const article = missingArticles[i];

      // Double-check if image was added concurrently
      if (article.cover_image_url && article.cover_image_url.trim() !== '') {
        skipped++;
        results.push({ readingId: article.id, status: 'skipped', message: 'Already has image' });
        continue;
      }

      try {
        const genResult = await triggerBackgroundArticleImageGeneration(article);
        if (genResult.success) {
          completed++;
          results.push({ readingId: article.id, status: 'generated', imageUrl: genResult.reading?.cover_image_url });
        } else if (genResult.status === 'manual_image' || genResult.status === 'skipped') {
          skipped++;
          results.push({ readingId: article.id, status: 'skipped', reason: genResult.reason || 'Skipped' });
        } else {
          failed++;
          results.push({ readingId: article.id, status: 'failed', error: genResult.error });
        }
      } catch (itemErr) {
        failed++;
        results.push({ readingId: article.id, status: 'failed', error: sanitizeErrorMessage(itemErr.message) });
      }

      // Small pacing delay between requests (500ms)
      if (i < missingArticles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    res.json({
      success: true,
      totalFound: missingArticles.length,
      completed,
      failed,
      skipped,
      results,
      message: `Bulk missing image generation complete: ${completed} generated, ${failed} failed, ${skipped} skipped.`
    });
  } catch (error) {
    console.error('Error in POST /api/admin/readings/generate-missing-images:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error.message) || 'Failed to process bulk image generation.' });
  }
});

// 13. POST /api/admin/readings/retry-failed-images - Bulk retry AI cover images for articles where generation failed
app.post('/api/admin/readings/retry-failed-images', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { dryRun = false, limit = 100 } = req.body || {};

    let allReadings = loadReadingsCache();
    if (serverSupabase) {
      try {
        const { data: dbReadings } = await serverSupabase.from('readings').select('*').order('created_at', { ascending: false });
        if (dbReadings && dbReadings.length > 0) {
          allReadings = dbReadings;
        }
      } catch (e) {
        console.warn('[Supabase bulk retry failed images notice]:', e.message);
      }
    }

    // Identify articles where image_status is 'failed' and no manual image was added
    const failedArticles = allReadings.filter(r => 
      r.image_status === 'failed' &&
      (!r.cover_image_url || r.cover_image_url.trim() === '')
    ).slice(0, Math.min(100, Math.max(1, limit)));

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        totalFound: failedArticles.length,
        articles: failedArticles.map(r => ({ id: r.id, title: r.title, category: r.category, error: r.image_error }))
      });
    }

    if (failedArticles.length === 0) {
      return res.json({
        success: true,
        totalFound: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        results: [],
        message: 'No failed articles found to retry.'
      });
    }

    // Process sequentially with controlled delay to respect Gemini API rate limits
    let completed = 0;
    let failed = 0;
    let skipped = 0;
    const results = [];

    for (let i = 0; i < failedArticles.length; i++) {
      const article = failedArticles[i];

      if (article.cover_image_url && article.cover_image_url.trim() !== '') {
        skipped++;
        results.push({ readingId: article.id, status: 'skipped', message: 'Manual image present' });
        continue;
      }

      try {
        const genResult = await triggerBackgroundArticleImageGeneration(article, { force: true });
        if (genResult.success) {
          completed++;
          results.push({ readingId: article.id, status: 'generated', imageUrl: genResult.reading?.cover_image_url });
        } else {
          failed++;
          results.push({ readingId: article.id, status: 'failed', error: genResult.error });
        }
      } catch (itemErr) {
        failed++;
        results.push({ readingId: article.id, status: 'failed', error: sanitizeErrorMessage(itemErr.message) });
      }

      if (i < failedArticles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    res.json({
      success: true,
      totalFound: failedArticles.length,
      completed,
      failed,
      skipped,
      results,
      message: `Bulk retry complete: ${completed} generated, ${failed} failed, ${skipped} skipped.`
    });
  } catch (error) {
    console.error('Error in POST /api/admin/readings/retry-failed-images:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error.message) || 'Failed to process bulk retry.' });
  }
});

// 10b. POST /api/readings/start-session - Start or resume server-authoritative reading timer
app.post('/api/readings/start-session', async (req, res) => {
  try {
    const { readingId } = req.body;
    if (!readingId) {
      return res.status(400).json({ success: false, error: 'readingId is required.' });
    }

    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';
    const now = new Date();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // 1. Try Supabase RPC if authenticated with UUID
    if (serverSupabase && isUuid.test(userId) && isUuid.test(readingId)) {
      try {
        const { data: rpcRes, error: rpcErr } = await serverSupabase.rpc('start_or_resume_reading_session', {
          p_reading_id: readingId,
          p_user_id: userId
        });
        if (!rpcErr && rpcRes && rpcRes.success) {
          return res.json(rpcRes);
        }
      } catch (e) {
        console.warn('[Supabase start reading session notice]:', e.message);
      }
    }

    // 2. Server Cache Session Management
    const sessions = loadReadingSessionsCache();
    const existingIndex = sessions.findIndex(s => s.reading_id === readingId && s.user_id === userId);

    if (existingIndex >= 0) {
      const existing = sessions[existingIndex];
      // If completed previously
      if (existing.completed_at) {
        return res.json({
          success: true,
          reading_id: readingId,
          started_at: existing.started_at,
          completed_at: existing.completed_at,
          elapsed_seconds: 60,
          required_seconds: 60,
          is_completed: true
        });
      }

      // Check if session started within a reasonable window (e.g. 2 hours)
      const startedAt = new Date(existing.started_at);
      const diffMs = now.getTime() - startedAt.getTime();
      const elapsedSeconds = Math.max(0, Math.floor(diffMs / 1000));

      if (diffMs < 2 * 60 * 60 * 1000) { // under 2 hours, resume timer!
        existing.last_active_at = now.toISOString();
        sessions[existingIndex] = existing;
        saveReadingSessionsCache(sessions);

        return res.json({
          success: true,
          reading_id: readingId,
          started_at: existing.started_at,
          elapsed_seconds: elapsedSeconds,
          required_seconds: 60,
          is_resumed: true
        });
      }
    }

    // Fresh session
    const newSession = {
      id: crypto.randomUUID(),
      reading_id: readingId,
      user_id: userId,
      started_at: now.toISOString(),
      last_active_at: now.toISOString(),
      completed_at: null
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = newSession;
    } else {
      sessions.push(newSession);
    }
    saveReadingSessionsCache(sessions);

    if (serverSupabase && isUuid.test(userId) && isUuid.test(readingId)) {
      try {
        await serverSupabase.from('reading_sessions').upsert({
          user_id: userId,
          reading_id: readingId,
          started_at: newSession.started_at,
          last_active_at: newSession.last_active_at
        }, { onConflict: 'user_id,reading_id' });
      } catch (e) {}
    }

    res.json({
      success: true,
      reading_id: readingId,
      started_at: newSession.started_at,
      elapsed_seconds: 0,
      required_seconds: 60,
      is_resumed: false
    });
  } catch (error) {
    console.error('Error in POST /api/readings/start-session:', error);
    res.status(500).json({ success: false, error: 'Failed to start reading session.' });
  }
});

// 11. POST /api/readings/complete - Record student reading completion with strict 60s validation
app.post('/api/readings/complete', async (req, res) => {
  try {
    const { readingId } = req.body;
    if (!readingId) {
      return res.status(400).json({ success: false, error: 'readingId is required.' });
    }

    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.headers['x-guest-id'] || 'guest_user';
    const now = new Date();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // 1. Try Supabase RPC for atomic server-side validation
    if (serverSupabase && isUuid.test(userId) && isUuid.test(readingId)) {
      try {
        const { data: rpcRes, error: rpcErr } = await serverSupabase.rpc('validate_and_complete_reading', {
          p_reading_id: readingId,
          p_user_id: userId
        });
        if (!rpcErr && rpcRes) {
          if (!rpcRes.success) {
            return res.status(400).json(rpcRes);
          }
          return res.json(rpcRes);
        }
      } catch (e) {
        console.warn('[Supabase validate_and_complete_reading notice]:', e.message);
      }
    }

    // 2. Check if already completed in cache
    const completions = loadReadingCompletionsCache();
    const alreadyCompleted = completions.some(c => c.reading_id === readingId && c.user_id === userId);
    if (alreadyCompleted) {
      return res.json({
        success: true,
        completed: true,
        already_completed: true,
        xp_awarded: 0,
        readingId,
        message: 'Reading was already completed previously.'
      });
    }

    // 3. Find active session
    const sessions = loadReadingSessionsCache();
    const session = sessions.find(s => s.reading_id === readingId && s.user_id === userId);

    if (!session || !session.started_at) {
      return res.status(400).json({
        success: false,
        error: 'Reading session not found. Please start reading before submitting completion.',
        elapsedSeconds: 0,
        requiredSeconds: 60,
        remainingSeconds: 60
      });
    }

    const startedAt = new Date(session.started_at);
    const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // 4. Strict 60s Server-Side Validation
    if (elapsedSeconds < 60) {
      return res.status(400).json({
        success: false,
        error: 'Keep reading for a little longer. This reading requires at least 60 seconds.',
        elapsedSeconds: Math.max(0, elapsedSeconds),
        requiredSeconds: 60,
        remainingSeconds: Math.max(1, 60 - elapsedSeconds)
      });
    }

    // 5. Valid completion
    const xpAwarded = 15;
    const record = {
      id: crypto.randomUUID(),
      reading_id: readingId,
      user_id: userId,
      completed_at: now.toISOString(),
      xp_awarded: xpAwarded,
      time_spent_seconds: elapsedSeconds
    };
    completions.push(record);
    saveReadingCompletionsCache(completions);

    // Update session completed_at
    session.completed_at = now.toISOString();
    saveReadingSessionsCache(sessions);

    if (serverSupabase && isUuid.test(userId)) {
      try {
        await serverSupabase.from('reading_completions').insert([record]);
      } catch (e) {}

      // Award XP to profiles
      try {
        const { data: prof } = await serverSupabase.from('profiles').select('xp').eq('id', userId).maybeSingle();
        if (prof) {
          await serverSupabase.from('profiles').update({ xp: (prof.xp || 0) + xpAwarded, updated_at: now.toISOString() }).eq('id', userId);
        }
      } catch (e) {}
    }

    if (userId && userId !== 'guest_user') {
      await recordUserActivityInteraction(userId, readingId, 'reading', 'completed');
    }

    res.json({
      success: true,
      completed: true,
      already_completed: false,
      xp_awarded: xpAwarded,
      readingId
    });
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

    const votedPollIds = await getUserInteractedIds(userId, 'poll');
    allVotes.filter(v => v.user_id === userId).forEach(v => votedPollIds.add(v.poll_id));

    // Deduplicate: Exclude already voted polls for this authenticated user
    const eligiblePolls = published.filter(p => !votedPollIds.has(String(p.id)));

    const userVotesMap = new Map();
    allVotes.filter(v => v.user_id === userId).forEach(v => {
      userVotesMap.set(v.poll_id, Array.isArray(v.selected_options) ? v.selected_options : [v.selected_options]);
    });

    const enriched = eligiblePolls.map(p => {
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

    if (userId && userId !== 'guest_user') {
      await recordUserActivityInteraction(userId, pollId, 'poll', 'voted');
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

// 4. GET /api/reorders/feed & /api/reorder/feed - Student Feed pool of published activities
app.get(['/api/reorders/feed', '/api/reorder/feed'], async (req, res) => {
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

    const completedReorderIds = await getUserInteractedIds(userId, 'reorder');
    allCompletions.filter(c => c.user_id === userId && c.is_correct).forEach(c => completedReorderIds.add(String(c.activity_id)));

    // Deduplicate: Strictly exclude completed activities for this user
    const eligibleReorders = published.filter(a => !completedReorderIds.has(String(a.id)));

    const shuffled = shuffleArray(eligibleReorders);
    const feedPool = shuffled.slice(0, 15);

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

        if (xpAwarded > 0) {
          try {
            const { data: prof } = await serverSupabase.from('profiles').select('xp').eq('id', userId).maybeSingle();
            if (prof) {
              await serverSupabase.from('profiles').update({ xp: (prof.xp || 0) + xpAwarded, updated_at: new Date().toISOString() }).eq('id', userId);
            }
          } catch (e) {}
        }
      }

      if (isCorrect && userId && userId !== 'guest_user') {
        await recordUserActivityInteraction(userId, activityId, 'reorder', 'completed');
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

    // Deduplicate: Exclude completed spelling scrambles for this authenticated user
    let candidatePool = scrambles;
    if (userId) {
      const completedScrambleIds = await getUserInteractedIds(userId, 'spelling_scramble');

      if (completedScrambleIds.size === 0 && serverSupabase) {
        try {
          const { data } = await serverSupabase
            .from('spelling_scramble_completions')
            .select('scramble_id')
            .eq('user_id', userId);
          if (data) {
            data.forEach(c => completedScrambleIds.add(String(c.scramble_id)));
          }
        } catch {}
      }

      const completions = loadSpellingCompletionsCache();
      completions.filter(c => c.user_id === userId).forEach(c => completedScrambleIds.add(String(c.scramble_id)));

      candidatePool = scrambles.filter(s => !completedScrambleIds.has(String(s.id)));
    }

    const shuffled = shuffleArray(candidatePool);
    const feedPool = shuffled.slice(0, 15);

    res.json({ success: true, data: feedPool });
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

      if (xpAwarded > 0) {
        try {
          const { data: prof } = await serverSupabase.from('profiles').select('xp').eq('id', userId).maybeSingle();
          if (prof) {
            await serverSupabase.from('profiles').update({ xp: (prof.xp || 0) + xpAwarded, updated_at: new Date().toISOString() }).eq('id', userId);
          }
        } catch (e) {}
      }
    }

    if (isCorrect && userId && userId !== 'guest_user') {
      await recordUserActivityInteraction(userId, scrambleId, 'spelling_scramble', 'completed');
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
// API ROUTES: SPELLING FLIP CARD (MEMORY SPELLING CHALLENGE)
// ============================================================================

const SPELLING_FLIP_CARDS_CACHE_FILE = path.resolve(__dirname, 'server/data/spelling_flip_cards_cache.json');
const SPELLING_FLIP_COMPLETIONS_CACHE_FILE = path.resolve(__dirname, 'server/data/spelling_flip_completions_cache.json');

function loadSpellingFlipCardsCache() {
  try {
    if (fs.existsSync(SPELLING_FLIP_CARDS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(SPELLING_FLIP_CARDS_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Spelling Flip Cards Cache Read Error]:', err.message);
  }
  return [];
}

function saveSpellingFlipCardsCache(data) {
  try {
    const dir = path.dirname(SPELLING_FLIP_CARDS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SPELLING_FLIP_CARDS_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Spelling Flip Cards Cache Write Error]:', err.message);
  }
}

function loadSpellingFlipCompletionsCache() {
  try {
    if (fs.existsSync(SPELLING_FLIP_COMPLETIONS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(SPELLING_FLIP_COMPLETIONS_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Spelling Flip Completions Cache Read Error]:', err.message);
  }
  return [];
}

function saveSpellingFlipCompletionsCache(data) {
  try {
    const dir = path.dirname(SPELLING_FLIP_COMPLETIONS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SPELLING_FLIP_COMPLETIONS_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Spelling Flip Completions Cache Write Error]:', err.message);
  }
}

function normalizeSpellingFlipLevel(levelStr) {
  if (!levelStr) return null;
  const l = String(levelStr).trim().toLowerCase();
  if (l === 'easy' || l.includes('grade 3') || l.includes('3-5')) return 'easy';
  if (l === 'intermediate' || l === 'medium' || l.includes('grade 6') || l.includes('6-8')) return 'intermediate';
  if (l === 'hard' || l === 'advanced' || l.includes('grade 9') || l.includes('9-12')) return 'hard';
  return null;
}

function validateSpellingFlipLength(word, level) {
  const len = word.length;
  if (level === 'easy') return len >= 3 && len <= 5;
  if (level === 'intermediate') return len >= 6 && len <= 8;
  if (level === 'hard') return len >= 9 && len <= 20;
  return false;
}

// 1. GET /api/spelling-flip-cards/feed - Student Feed Pool
app.get('/api/spelling-flip-cards/feed', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;
    const requestedLevel = req.query.level ? normalizeSpellingFlipLevel(req.query.level) : null;

    let cards = [];
    if (serverSupabase) {
      try {
        let query = serverSupabase
          .from('spelling_flip_cards')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (requestedLevel) {
          query = query.eq('level', requestedLevel);
        }

        const { data, error } = await query.limit(25);
        if (!error && data && data.length > 0) {
          cards = data;
        }
      } catch (err) {
        console.warn('[Supabase flip feed query fallback]:', err.message);
      }
    }

    if (cards.length === 0) {
      cards = loadSpellingFlipCardsCache().filter(c => c.is_published !== false);
      if (requestedLevel) {
        cards = cards.filter(c => c.level === requestedLevel);
      }
    }

    // Deduplicate: Exclude completed spelling flip cards for this authenticated user
    let candidatePool = cards;
    if (userId) {
      const completedCardIds = await getUserInteractedIds(userId, 'spelling_flip');

      if (completedCardIds.size === 0 && serverSupabase) {
        try {
          const { data } = await serverSupabase
            .from('spelling_flip_completions')
            .select('card_id')
            .eq('user_id', userId)
            .eq('is_correct', true);
          if (data) {
            data.forEach(c => completedCardIds.add(String(c.card_id)));
          }
        } catch {}
      }

      const completions = loadSpellingFlipCompletionsCache();
      completions
        .filter(c => c.user_id === userId && c.is_correct)
        .forEach(c => completedCardIds.add(String(c.card_id)));

      candidatePool = cards.filter(c => !completedCardIds.has(String(c.id)));
      if (candidatePool.length === 0) {
        candidatePool = cards;
      }
    }

    const shuffled = shuffleArray(candidatePool);
    const feedPool = shuffled.slice(0, 15);

    res.json({ success: true, data: feedPool });
  } catch (error) {
    console.error('Error in GET /api/spelling-flip-cards/feed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch spelling flip cards feed.' });
  }
});

// 2. GET /api/spelling-flip-cards/admin - Admin management list with stats
app.get('/api/spelling-flip-cards/admin', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
    }

    let cards = [];
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('spelling_flip_cards')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          cards = data;
        }
      } catch (err) {
        console.warn('[Supabase admin flip cards query fallback]:', err.message);
      }
    }

    if (cards.length === 0) {
      cards = loadSpellingFlipCardsCache();
    }

    // Filters
    const { level, category, status, search, page = 1, limit = 50 } = req.query;
    let filtered = [...cards];

    if (level && level !== 'all') {
      const normLevel = normalizeSpellingFlipLevel(level);
      if (normLevel) filtered = filtered.filter(c => c.level === normLevel);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(c => c.category?.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'all') {
      if (status === 'published') filtered = filtered.filter(c => c.is_published !== false);
      if (status === 'draft') filtered = filtered.filter(c => c.is_published === false);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.word.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      );
    }

    // Stats
    const allCache = loadSpellingFlipCardsCache();
    const completions = loadSpellingFlipCompletionsCache();

    const stats = {
      totalCards: allCache.length,
      publishedCards: allCache.filter(c => c.is_published !== false).length,
      draftCards: allCache.filter(c => c.is_published === false).length,
      totalCompletions: completions.length,
      totalXpAwarded: completions.reduce((sum, c) => sum + (c.xp_awarded || 0), 0)
    };

    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(startIndex, startIndex + Number(limit));

    res.json({
      success: true,
      data: {
        cards: paginated,
        stats,
        total: filtered.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/spelling-flip-cards/admin:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin spelling flip cards.' });
  }
});

// 3. POST /api/spelling-flip-cards - Create single card
app.post('/api/spelling-flip-cards', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
    }

    const { word, level: rawLevel, category, is_published } = req.body;
    const cleanWord = typeof word === 'string' ? word.trim().toUpperCase().replace(/[^A-Z]/g, '') : '';
    if (!cleanWord) {
      return res.status(400).json({ success: false, error: 'Valid word is required (letters only).' });
    }

    const level = normalizeSpellingFlipLevel(rawLevel);
    if (!level) {
      return res.status(400).json({ success: false, error: 'Invalid level. Must be easy, intermediate, or hard.' });
    }

    if (!validateSpellingFlipLength(cleanWord, level)) {
      return res.status(400).json({
        success: false,
        error: `Word "${cleanWord}" has ${cleanWord.length} letters, invalid for ${level} level.`
      });
    }

    const memorizeSeconds = level === 'easy' ? 30 : level === 'intermediate' ? 20 : 10;
    const xp = level === 'easy' ? 10 : level === 'intermediate' ? 15 : 20;

    const newCard = {
      id: `flip_${Date.now()}_${cleanWord.toLowerCase()}`,
      word: cleanWord,
      level,
      category: typeof category === 'string' ? category.trim() : 'General',
      memorize_seconds: memorizeSeconds,
      xp,
      is_published: is_published !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const cache = loadSpellingFlipCardsCache();
    cache.unshift(newCard);
    saveSpellingFlipCardsCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('spelling_flip_cards').insert([newCard]);
      } catch (err) {
        console.warn('[Supabase flip insert fallback]:', err.message);
      }
    }

    res.json({ success: true, data: newCard });
  } catch (error) {
    console.error('Error in POST /api/spelling-flip-cards:', error);
    res.status(500).json({ success: false, error: 'Failed to create spelling flip card.' });
  }
});

// 4. POST /api/spelling-flip-cards/import-batch - Admin batch import
app.post('/api/spelling-flip-cards/import-batch', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
    }

    const { cards: rawCards } = req.body;
    if (!Array.isArray(rawCards) || rawCards.length === 0) {
      return res.status(400).json({ success: false, error: 'Payload must contain a non-empty array of cards.' });
    }

    const cache = loadSpellingFlipCardsCache();
    const existingWords = new Set(cache.map(c => c.word.toUpperCase()));
    const validCards = [];
    const invalidCards = [];

    rawCards.forEach((raw, idx) => {
      const index = idx + 1;
      const cleanWord = typeof raw.word === 'string' ? raw.word.trim().toUpperCase().replace(/[^A-Z]/g, '') : '';
      const level = normalizeSpellingFlipLevel(raw.level);

      if (!cleanWord) {
        invalidCards.push({ index, word: raw.word || '', error: 'Missing or invalid word.' });
        return;
      }
      if (!level) {
        invalidCards.push({ index, word: cleanWord, error: 'Invalid level (must be easy, intermediate, or hard).' });
        return;
      }
      if (!validateSpellingFlipLength(cleanWord, level)) {
        invalidCards.push({
          index,
          word: cleanWord,
          error: `Length ${cleanWord.length} does not match level "${level}".`
        });
        return;
      }

      if (existingWords.has(cleanWord)) {
        // Skip duplicate or update
        return;
      }

      existingWords.add(cleanWord);

      const memorizeSeconds = level === 'easy' ? 30 : level === 'intermediate' ? 20 : 10;
      const xp = level === 'easy' ? 10 : level === 'intermediate' ? 15 : 20;

      validCards.push({
        id: `flip_${Date.now()}_${idx}_${cleanWord.toLowerCase()}`,
        word: cleanWord,
        level,
        category: typeof raw.category === 'string' ? raw.category.trim() : 'General',
        memorize_seconds: memorizeSeconds,
        xp,
        is_published: raw.is_published !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });

    const updatedCache = [...validCards, ...cache];
    saveSpellingFlipCardsCache(updatedCache);

    if (serverSupabase && validCards.length > 0) {
      try {
        await serverSupabase.from('spelling_flip_cards').insert(validCards);
      } catch (err) {
        console.warn('[Supabase batch flip insert fallback]:', err.message);
      }
    }

    res.json({
      success: true,
      data: {
        importedCount: validCards.length,
        batchId: `batch_${Date.now()}`,
        cards: validCards,
        invalidCount: invalidCards.length,
        invalid: invalidCards
      }
    });
  } catch (error) {
    console.error('Error in POST /api/spelling-flip-cards/import-batch:', error);
    res.status(500).json({ success: false, error: 'Failed to batch import spelling flip cards.' });
  }
});

// 5. PUT /api/spelling-flip-cards/:id - Update card
app.put('/api/spelling-flip-cards/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const { word, level: rawLevel, category, is_published } = req.body;

    const cache = loadSpellingFlipCardsCache();
    const index = cache.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Card not found.' });
    }

    const target = { ...cache[index] };
    if (word) {
      const cleanWord = word.trim().toUpperCase().replace(/[^A-Z]/g, '');
      target.word = cleanWord;
    }
    if (rawLevel) {
      const level = normalizeSpellingFlipLevel(rawLevel);
      if (level) {
        target.level = level;
        target.memorize_seconds = level === 'easy' ? 30 : level === 'intermediate' ? 20 : 10;
        target.xp = level === 'easy' ? 10 : level === 'intermediate' ? 15 : 20;
      }
    }
    if (category) target.category = category.trim();
    if (typeof is_published === 'boolean') target.is_published = is_published;
    target.updated_at = new Date().toISOString();

    cache[index] = target;
    saveSpellingFlipCardsCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('spelling_flip_cards').update(target).eq('id', id);
      } catch (err) {
        console.warn('[Supabase flip update fallback]:', err.message);
      }
    }

    res.json({ success: true, data: target });
  } catch (error) {
    console.error('Error in PUT /api/spelling-flip-cards/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to update spelling flip card.' });
  }
});

// 6. PUT /api/spelling-flip-cards/:id/publish - Toggle published status
app.put('/api/spelling-flip-cards/:id/publish', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const { is_published } = req.body;

    const cache = loadSpellingFlipCardsCache();
    const index = cache.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Card not found.' });
    }

    cache[index].is_published = is_published !== false;
    cache[index].updated_at = new Date().toISOString();
    saveSpellingFlipCardsCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('spelling_flip_cards').update({ is_published: cache[index].is_published }).eq('id', id);
      } catch (err) {
        console.warn('[Supabase flip publish fallback]:', err.message);
      }
    }

    res.json({ success: true, data: cache[index] });
  } catch (error) {
    console.error('Error in PUT /api/spelling-flip-cards/:id/publish:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle published status.' });
  }
});

// 7. DELETE /api/spelling-flip-cards/:id - Delete card
app.delete('/api/spelling-flip-cards/:id', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const cache = loadSpellingFlipCardsCache();
    const updated = cache.filter(c => c.id !== id);
    saveSpellingFlipCardsCache(updated);

    if (serverSupabase) {
      try {
        await serverSupabase.from('spelling_flip_cards').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase flip delete fallback]:', err.message);
      }
    }

    res.json({ success: true, message: 'Spelling flip card deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/spelling-flip-cards/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to delete spelling flip card.' });
  }
});

// 8. POST /api/spelling-flip-cards/complete - Record completion and award XP
app.post('/api/spelling-flip-cards/complete', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;
    const { cardId, userWord, timeTakenSeconds } = req.body;

    if (!cardId) {
      return res.status(400).json({ success: false, error: 'cardId is required.' });
    }

    const cache = loadSpellingFlipCardsCache();
    const card = cache.find(c => c.id === cardId);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Spelling flip card not found.' });
    }

    // Case-insensitive comparison (e.g. "house" vs "HOUSE")
    const cleanUserWord = typeof userWord === 'string' ? userWord.trim().toUpperCase().replace(/[^A-Z]/g, '') : '';
    const cleanTargetWord = card.word.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const isCorrect = cleanUserWord === cleanTargetWord;

    // Check if already completed by this user
    let alreadyCompleted = false;
    const completions = loadSpellingFlipCompletionsCache();
    if (userId && userId !== 'guest_user') {
      alreadyCompleted = completions.some(c => c.user_id === userId && c.card_id === cardId && c.is_correct);
      if (!alreadyCompleted && serverSupabase) {
        try {
          const { data: dbCompletions } = await serverSupabase
            .from('spelling_flip_completions')
            .select('id')
            .eq('user_id', userId)
            .eq('card_id', cardId)
            .eq('is_correct', true);
          if (dbCompletions && dbCompletions.length > 0) {
            alreadyCompleted = true;
          }
        } catch {}
      }
    }

    let xpAwarded = 0;
    if (isCorrect) {
      if (alreadyCompleted) {
        xpAwarded = 0;
      } else {
        xpAwarded = card.xp || 10;
      }
    }

    // Record completion in cache
    const newCompletion = {
      id: `completion_flip_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: userId,
      card_id: cardId,
      user_word: cleanUserWord,
      is_correct: isCorrect,
      xp_awarded: xpAwarded,
      time_taken_seconds: timeTakenSeconds || 0,
      created_at: new Date().toISOString()
    };
    completions.push(newCompletion);
    saveSpellingFlipCompletionsCache(completions);

    // Record to user activity interactions
    if (userId && isCorrect && userId !== 'guest_user') {
      await recordUserActivityInteraction(userId, cardId, 'spelling_flip', 'completed');
    }

    // If authenticated user, award XP in profile
    if (userId && xpAwarded > 0 && serverSupabase) {
      try {
        const { data: prof } = await serverSupabase
          .from('profiles')
          .select('xp')
          .eq('id', userId)
          .single();

        if (prof) {
          const updatedXp = (prof.xp || 0) + xpAwarded;
          await serverSupabase
            .from('profiles')
            .update({ xp: updatedXp })
            .eq('id', userId);
        }
      } catch (err) {
        console.warn('[Supabase flip XP update fallback]:', err.message);
      }
    }

    res.json({
      success: true,
      data: {
        is_correct: isCorrect,
        correct_word: card.word,
        xp_awarded: xpAwarded,
        already_completed: alreadyCompleted,
        level: card.level,
        time_taken_seconds: timeTakenSeconds
      }
    });
  } catch (error) {
    console.error('Error in POST /api/spelling-flip-cards/complete:', error);
    res.status(500).json({ success: false, error: 'Failed to submit spelling flip attempt.' });
  }
});

// ============================================================================
// BUBBLE POP RELAXATION GAME COMPLETIONS CACHE & ROUTES
// ============================================================================

const BUBBLE_POP_COMPLETIONS_CACHE_FILE = path.resolve(__dirname, 'server/data/bubble_pop_completions_cache.json');

function loadBubblePopCompletionsCache() {
  try {
    if (fs.existsSync(BUBBLE_POP_COMPLETIONS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(BUBBLE_POP_COMPLETIONS_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Bubble Pop Completions Cache Read Error]:', err.message);
  }
  return [];
}

function saveBubblePopCompletionsCache(data) {
  try {
    const dir = path.dirname(BUBBLE_POP_COMPLETIONS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BUBBLE_POP_COMPLETIONS_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Bubble Pop Completions Cache Write Error]:', err.message);
  }
}

// 1. POST /api/bubble-pop/complete - Record Bubble Pop game completion & award XP
app.post('/api/bubble-pop/complete', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;
    const { level, score, targetScore, durationSeconds } = req.body;

    const parsedLevel = parseInt(level, 10);
    const parsedScore = parseInt(score, 10);
    const parsedTarget = parseInt(targetScore, 10);
    const parsedDuration = parseInt(durationSeconds, 10) || 30;

    if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 100) {
      return res.status(400).json({ success: false, error: 'Valid level (1-100) is required.' });
    }

    if (isNaN(parsedScore) || parsedScore < 0) {
      return res.status(400).json({ success: false, error: 'Valid score is required.' });
    }

    // Check if this level was already completed by this user
    let alreadyCompleted = false;
    const completions = loadBubblePopCompletionsCache();
    if (userId && userId !== 'guest_user') {
      alreadyCompleted = completions.some(c => c.user_id === userId && c.level === parsedLevel);
      if (!alreadyCompleted && serverSupabase) {
        try {
          const { data: dbCompletions } = await serverSupabase
            .from('bubble_pop_completions')
            .select('id')
            .eq('user_id', userId)
            .eq('level', parsedLevel);
          if (dbCompletions && dbCompletions.length > 0) {
            alreadyCompleted = true;
          }
        } catch {}
      }
    }

    let xpAwarded = 0;
    // Bubble Pop level cleared if score >= targetScore (or if target not specified)
    const isCompleted = !isNaN(parsedTarget) && parsedTarget > 0 ? (parsedScore >= parsedTarget) : true;

    if (isCompleted) {
      if (alreadyCompleted) {
        xpAwarded = 0;
      } else {
        xpAwarded = 10;
      }
    }

    // Save completion record
    const now = new Date().toISOString();
    const newCompletion = {
      id: `completion_bubble_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: userId,
      level: parsedLevel,
      score: parsedScore,
      target_score: parsedTarget || 0,
      xp_awarded: xpAwarded,
      duration_seconds: parsedDuration,
      completed_at: now
    };

    if (!alreadyCompleted) {
      completions.push(newCompletion);
      saveBubblePopCompletionsCache(completions);

      if (userId && userId !== 'guest_user' && serverSupabase) {
        try {
          await serverSupabase
            .from('bubble_pop_completions')
            .upsert(
              {
                user_id: userId,
                level: parsedLevel,
                score: parsedScore,
                target_score: parsedTarget || 0,
                xp_awarded: xpAwarded,
                duration_seconds: parsedDuration,
                completed_at: now
              },
              { onConflict: 'user_id, level' }
            );
        } catch (dbErr) {
          console.warn('[Supabase bubble_pop_completions insert notice]:', dbErr.message);
        }
      }
    }

    // Record interaction in user_activity_interactions
    if (userId && isCompleted && userId !== 'guest_user') {
      await recordUserActivityInteraction(userId, `bubble_pop_${parsedLevel}`, 'bubble_pop', 'completed');
    }

    // Award XP to user profile if first completion
    if (userId && xpAwarded > 0 && serverSupabase) {
      try {
        const { data: prof } = await serverSupabase
          .from('profiles')
          .select('xp')
          .eq('id', userId)
          .single();
        if (prof) {
          await serverSupabase
            .from('profiles')
            .update({ xp: (prof.xp || 0) + xpAwarded })
            .eq('id', userId);
        }
      } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        is_completed: isCompleted,
        level: parsedLevel,
        score: parsedScore,
        target_score: parsedTarget,
        xp_awarded: xpAwarded,
        already_completed: alreadyCompleted,
        completed_at: now
      }
    });
  } catch (error) {
    console.error('Error in POST /api/bubble-pop/complete:', error);
    res.status(500).json({ success: false, error: 'Failed to record bubble pop completion.' });
  }
});

// 2. GET /api/bubble-pop/progress - Get user's bubble pop level progress
app.get('/api/bubble-pop/progress', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;

    let completedLevels = [];
    if (userId && userId !== 'guest_user') {
      if (serverSupabase) {
        try {
          const { data } = await serverSupabase
            .from('bubble_pop_completions')
            .select('level, score, target_score, xp_awarded, completed_at')
            .eq('user_id', userId)
            .order('level', { ascending: true });
          if (data) completedLevels = data;
        } catch {}
      }

      if (completedLevels.length === 0) {
        const completions = loadBubblePopCompletionsCache();
        completedLevels = completions.filter(c => c.user_id === userId);
      }
    }

    const completedLevelSet = new Set(completedLevels.map(c => c.level));
    let highestCompletedLevel = 0;
    for (const lvl of completedLevelSet) {
      if (lvl > highestCompletedLevel) highestCompletedLevel = lvl;
    }
    const highestUnlockedLevel = Math.min(100, highestCompletedLevel + 1);
    const totalXP = completedLevels.reduce((sum, c) => sum + (c.xp_awarded || 0), 0);

    res.json({
      success: true,
      data: {
        highestCompletedLevel,
        highestUnlockedLevel,
        totalXP,
        completedLevels
      }
    });
  } catch (error) {
    console.error('Error in GET /api/bubble-pop/progress:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bubble pop progress.' });
  }
});

// ============================================================================
// API ROUTES: UNIFIED VOCABULARY CONTENT SYSTEM
// Supports: Word of the Day, Collocation, Phrasal Verb, Idiom
// Features: Dual Gemini/Fallback validation, Bulk JSON, Bulk Image Scheduling, Queue
// 100% Backward Compatible with legacy /api/words-of-the-day endpoints
// ============================================================================

const USER_SAVED_WORDS_CACHE_FILE = path.resolve(__dirname, 'server/data/user_saved_words_cache.json');
const WORD_LIKES_CACHE_FILE = path.resolve(__dirname, 'server/data/word_likes_cache.json');
const DEFAULT_WORD_OF_THE_DAY_IMAGE = DEFAULT_VOCABULARY_IMAGE;

function loadUserSavedWordsCache() {
  try {
    if (fs.existsSync(USER_SAVED_WORDS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(USER_SAVED_WORDS_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[User Saved Words Cache Read Error]:', err.message);
  }
  return [];
}

function saveUserSavedWordsCache(data) {
  try {
    const dir = path.dirname(USER_SAVED_WORDS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USER_SAVED_WORDS_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[User Saved Words Cache Write Error]:', err.message);
  }
}

function loadWordLikesCache() {
  try {
    if (fs.existsSync(WORD_LIKES_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(WORD_LIKES_CACHE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Word Likes Cache Read Error]:', err.message);
  }
  return [];
}

function saveWordLikesCache(data) {
  try {
    const dir = path.dirname(WORD_LIKES_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WORD_LIKES_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Word Likes Cache Write Error]:', err.message);
  }
}

function normalizeWordStr(word) {
  return normalizeVocabularyTitle(word);
}

// Background scheduler tick: Check scheduled items every 60s (non-serverless only)
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    publishScheduledVocabularyItems(serverSupabase).catch((err) => {
      console.warn('[Scheduled Vocabulary Check Error]:', err.message);
    });
  }, 60000);
}

// ----------------------------------------------------------------------------
// 1. GET /api/vocabulary/feed & /api/words-of-the-day/feed
// ----------------------------------------------------------------------------
async function handleVocabularyFeed(req, res) {
  try {
    // Check and trigger scheduled publishing on demand
    await publishScheduledVocabularyItems(serverSupabase).catch(() => {});

    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || null;
    const { type } = req.query;

    let items = [];

    // Attempt Supabase query first
    if (serverSupabase) {
      try {
        let query = serverSupabase
          .from('words_of_the_day')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(50);

        if (type && type !== 'all') {
          query = query.eq('content_type', type);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          items = data;
        }
      } catch (err) {
        console.warn('[Vocabulary Feed Supabase Fetch Notice]:', err.message);
      }
    }

    // Fallback to local cache
    if (items.length === 0) {
      const cache = loadVocabularyCache();
      items = cache.filter(w => w.status === 'published');
      if (type && type !== 'all') {
        items = items.filter(w => w.content_type === type);
      }
      items.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
    }

    // Retrieve saved, liked, and completed items for current session user
    let userSavedIds = new Set();
    let userLikedIds = new Set();
    let userCompletedIds = new Set();

    if (userId) {
      if (serverSupabase) {
        try {
          const { data: savedRows } = await serverSupabase
            .from('user_saved_words')
            .select('word_id')
            .eq('user_id', userId);
          if (savedRows) {
            savedRows.forEach(r => userSavedIds.add(r.word_id));
          }
        } catch (e) {}
      } else {
        const savedCache = loadUserSavedWordsCache();
        savedCache.filter(s => s.user_id === userId).forEach(s => userSavedIds.add(s.word_id));
      }

      const likesCache = loadWordLikesCache();
      likesCache.filter(l => l.user_id === userId).forEach(l => userLikedIds.add(l.word_id));

      // Fetch completed vocabulary items from user_activity_interactions
      userCompletedIds = await getUserInteractedIds(userId, 'word_of_the_day');
    }

    let decorated = items.map(item => {
      const cType = resolveContentType(item.content_type, 'word');
      const title = item.title || item.word || 'Vocabulary';
      return {
        ...item,
        content_type: cType,
        title,
        word: title,
        meaning: item.meaning || item.definition || '',
        definition: item.definition || item.meaning || '',
        image_url: item.image_url || DEFAULT_VOCABULARY_IMAGE,
        validation_status: item.validation_status || 'manually_approved',
        validation_provider: item.validation_provider || 'manual',
        is_saved_by_me: userSavedIds.has(item.id),
        is_liked_by_me: userLikedIds.has(item.id)
      };
    });

    // Exclude saved AND completed words so they don't repeat in Explore feed
    if (userSavedIds.size > 0 || userCompletedIds.size > 0) {
      decorated = decorated.filter(w => !userSavedIds.has(w.id) && !userCompletedIds.has(w.id));
    }

    res.json({ success: true, data: decorated });
  } catch (error) {
    console.error('Error in GET /api/vocabulary/feed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vocabulary feed.' });
  }
}

app.get('/api/vocabulary/feed', handleVocabularyFeed);
app.get('/api/words-of-the-day/feed', handleVocabularyFeed);

// ----------------------------------------------------------------------------
// 2. GET /api/vocabulary/existing & /api/words-of-the-day/existing-words
// ----------------------------------------------------------------------------
async function handleExistingVocabulary(req, res) {
  try {
    const cache = loadVocabularyCache();
    const normalizedSet = new Set(
      cache.map(w => normalizeVocabularyTitle(w.title || w.word)).filter(Boolean)
    );

    if (serverSupabase) {
      try {
        const { data } = await serverSupabase.from('words_of_the_day').select('word_normalized, title, word');
        if (data) {
          data.forEach(r => {
            if (r.word_normalized) normalizedSet.add(r.word_normalized);
            if (r.title) normalizedSet.add(normalizeVocabularyTitle(r.title));
            if (r.word) normalizedSet.add(normalizeVocabularyTitle(r.word));
          });
        }
      } catch (e) {}
    }

    res.json({ success: true, data: Array.from(normalizedSet) });
  } catch (error) {
    console.error('Error in GET /api/vocabulary/existing:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch existing vocabulary.' });
  }
}

app.get('/api/vocabulary/existing', handleExistingVocabulary);
app.get('/api/vocabulary/existing-words', handleExistingVocabulary);
app.get('/api/words-of-the-day/existing-words', handleExistingVocabulary);

// ----------------------------------------------------------------------------
// 3. GET /api/vocabulary/admin & /api/words-of-the-day/admin
// ----------------------------------------------------------------------------
async function handleAdminVocabulary(req, res) {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    let items = [];
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('words_of_the_day')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          items = data;
        }
      } catch (err) {
        console.warn('[Admin Vocabulary Supabase Notice]:', err.message);
      }
    }

    if (items.length === 0) {
      items = loadVocabularyCache();
    }

    const { search, status, type, validationStatus, partOfSpeech } = req.query;

    let filtered = items.map(item => {
      const cType = resolveContentType(item.content_type, 'word');
      const title = item.title || item.word || 'Vocabulary';
      return {
        ...item,
        content_type: cType,
        title,
        word: title,
        meaning: item.meaning || item.definition || '',
        definition: item.definition || item.meaning || '',
        image_url: item.image_url || DEFAULT_VOCABULARY_IMAGE,
        validation_status: item.validation_status || 'manually_approved',
        validation_provider: item.validation_provider || 'manual'
      };
    });

    if (type && type !== 'all') {
      filtered = filtered.filter(w => w.content_type === type);
    }

    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      filtered = filtered.filter(
        w => (w.title && w.title.toLowerCase().includes(q)) ||
             (w.word && w.word.toLowerCase().includes(q)) ||
             (w.meaning && w.meaning.toLowerCase().includes(q)) ||
             (w.example && w.example.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(w => w.status === status);
    }

    if (validationStatus && validationStatus !== 'all') {
      filtered = filtered.filter(w => w.validation_status === validationStatus);
    }

    if (partOfSpeech && partOfSpeech !== 'all') {
      filtered = filtered.filter(w => w.part_of_speech && w.part_of_speech.toLowerCase() === partOfSpeech.toLowerCase());
    }

    const totalVocabulary = items.length;
    const wordsCount = items.filter(w => (w.content_type || 'word') === 'word').length;
    const collocationsCount = items.filter(w => w.content_type === 'collocation').length;
    const phrasalVerbsCount = items.filter(w => w.content_type === 'phrasal_verb').length;
    const idiomsCount = items.filter(w => w.content_type === 'idiom').length;

    const publishedCount = items.filter(w => w.status === 'published').length;
    const scheduledCount = items.filter(w => w.status === 'scheduled').length;
    const draftCount = items.filter(w => w.status === 'draft').length;
    const pendingValidationCount = items.filter(w => w.validation_status === 'pending' || w.status === 'pending_validation').length;
    const totalLikes = items.reduce((sum, w) => sum + (Number(w.likes_count) || 0), 0);

    const savedCache = loadUserSavedWordsCache();
    const totalSaves = savedCache.length;

    const stats = {
      totalVocabulary,
      totalWords: wordsCount, // Backward compatibility for legacy UI
      publishedWords: publishedCount,
      draftWords: draftCount,
      archivedWords: items.filter(w => w.status === 'archived').length,
      wordsCount,
      collocationsCount,
      phrasalVerbsCount,
      idiomsCount,
      publishedCount,
      scheduledCount,
      draftCount,
      pendingValidationCount,
      totalLikes,
      totalSaves
    };

    res.json({
      success: true,
      data: {
        items: filtered,
        words: filtered, // Backward compatibility
        stats,
        total: filtered.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/vocabulary/admin:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin vocabulary list.' });
  }
}

app.get('/api/vocabulary/admin', handleAdminVocabulary);
app.get('/api/words-of-the-day/admin', handleAdminVocabulary);

// ----------------------------------------------------------------------------
// 4. POST /api/vocabulary - Create Single Vocabulary Item
// ----------------------------------------------------------------------------
async function handleCreateVocabulary(req, res) {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const {
      type,
      content_type,
      title,
      word,
      pronunciation,
      phonetic,
      partOfSpeech,
      part_of_speech,
      meaning,
      definition,
      example,
      level,
      category,
      image_url,
      status,
      scheduled_at
    } = req.body;

    const cType = resolveContentType(content_type || type, 'word');
    const cleanTitle = String(title || word || '').trim();
    const cleanMeaning = String(meaning || definition || '').trim();
    const cleanExample = String(example || '').trim();
    const cleanPronunciation = (pronunciation || phonetic) ? String(pronunciation || phonetic).trim() : null;
    const cleanPartOfSpeech = (partOfSpeech || part_of_speech) ? String(partOfSpeech || part_of_speech).trim() : null;
    const cleanLevel = level ? String(level).trim().toUpperCase() : null;
    const cleanCategory = category ? String(category).trim() : null;
    const itemStatus = status && ['draft', 'approved', 'scheduled', 'published', 'archived'].includes(status) ? status : 'published';

    if (!cleanTitle || !cleanMeaning || !cleanExample) {
      return res.status(400).json({ success: false, error: 'Title, meaning, and example are required fields.' });
    }

    const norm = normalizeVocabularyTitle(cleanTitle);
    const cache = loadVocabularyCache();

    // Check duplicate
    if (cache.some(w => normalizeVocabularyTitle(w.title || w.word) === norm)) {
      return res.status(400).json({ success: false, error: `"${cleanTitle}" already exists in the database.` });
    }

    const id = `${cType}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const r2ContentKey = buildVocabularyContentKey(cType, id);

    const fullRecord = {
      id,
      content_type: cType,
      title: cleanTitle,
      word: cleanTitle,
      word_normalized: norm,
      pronunciation: cleanPronunciation,
      phonetic: cleanPronunciation,
      part_of_speech: cleanPartOfSpeech,
      meaning: cleanMeaning,
      definition: cleanMeaning,
      example: cleanExample,
      level: cleanLevel,
      category: cleanCategory,
      image_url: image_url || DEFAULT_VOCABULARY_IMAGE,
      status: itemStatus,
      validation_status: 'manually_approved',
      validation_provider: 'manual',
      validation_message: 'Created directly by administrator.',
      validation_score: 1.0,
      validation_warnings: [],
      scheduled_at: scheduled_at || null,
      likes_count: 0,
      published_at: itemStatus === 'published' ? new Date().toISOString() : null,
      created_by: authData.user.id,
      import_batch_id: null,
      r2_content_key: r2ContentKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in R2
    try {
      await putJsonContent(r2ContentKey, fullRecord);
    } catch (r2Err) {
      console.warn('[R2 Vocabulary Save Warning]:', r2Err.message);
    }

    // Save to Cache
    cache.unshift(fullRecord);
    saveVocabularyCache(cache);

    // Save to Supabase
    if (serverSupabase) {
      try {
        await serverSupabase.from('words_of_the_day').upsert([fullRecord]);
      } catch (dbErr) {
        console.warn('[Supabase Vocabulary Save Notice]:', dbErr.message);
      }
    }

    res.json({ success: true, data: fullRecord });
  } catch (error) {
    console.error('Error in POST /api/vocabulary:', error);
    res.status(500).json({ success: false, error: 'Failed to create vocabulary item.' });
  }
}

app.post('/api/vocabulary', handleCreateVocabulary);
app.post('/api/words-of-the-day', handleCreateVocabulary);

// ----------------------------------------------------------------------------
// 5. POST /api/vocabulary/validate-batch - Dual Gemini & Fallback Validation
// ----------------------------------------------------------------------------
app.post('/api/vocabulary/validate-batch', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { items, words, defaultType = 'word', validationMode = 'gemini' } = req.body;
    const rawList = Array.isArray(items) ? items : (Array.isArray(words) ? words : []);

    if (rawList.length === 0) {
      return res.status(400).json({ success: false, error: 'No items provided for validation.' });
    }

    if (rawList.length > 1000) {
      return res.status(400).json({
        success: false,
        error: `Maximum 1,000 items per batch. You provided ${rawList.length}.`
      });
    }

    // Collect existing DB titles
    const cache = loadVocabularyCache();
    const existingSet = new Set(cache.map(w => normalizeVocabularyTitle(w.title || w.word)).filter(Boolean));

    if (serverSupabase) {
      try {
        const { data } = await serverSupabase.from('words_of_the_day').select('word_normalized, title, word');
        if (data) {
          data.forEach(r => {
            if (r.word_normalized) existingSet.add(r.word_normalized);
            if (r.title) existingSet.add(normalizeVocabularyTitle(r.title));
            if (r.word) existingSet.add(normalizeVocabularyTitle(r.word));
          });
        }
      } catch (e) {}
    }

    const validationResult = await validateVocabularyBatch(rawList, {
      defaultType,
      existingSet,
      preferredMode: validationMode
    });

    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/validate-batch:', error);
    res.status(500).json({ success: false, error: 'Failed to process batch validation.' });
  }
});

// ----------------------------------------------------------------------------
// 6. POST /api/vocabulary/import-batch & /api/words-of-the-day/import-batch
// ----------------------------------------------------------------------------
async function handleImportBatch(req, res) {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const {
      items,
      words,
      batchId: incomingBatchId,
      fileName,
      defaultType = 'word',
      duplicateAction = 'skip'
    } = req.body;

    const rawList = Array.isArray(items) ? items : (Array.isArray(words) ? words : []);

    if (rawList.length === 0) {
      return res.status(400).json({ success: false, error: 'No items provided for import.' });
    }

    if (rawList.length > 1000) {
      return res.status(400).json({
        success: false,
        error: `Maximum 1,000 items per import. You provided ${rawList.length}.`
      });
    }

    const batchId = incomingBatchId || `batch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const cache = loadVocabularyCache();
    const existingNormMap = new Map();
    cache.forEach(w => {
      const norm = normalizeVocabularyTitle(w.title || w.word);
      if (norm) existingNormMap.set(norm, w);
    });

    const inBatchSeen = new Set();
    const imported = [];
    const failed = [];
    let duplicateCount = 0;
    let geminiValidatedCount = 0;
    let fallbackValidatedCount = 0;

    for (let i = 0; i < rawList.length; i++) {
      const raw = rawList[i];
      const index = i + 1;

      if (!raw || typeof raw !== 'object') {
        failed.push({ index, title: `Record #${index}`, error: 'Record must be an object.', type: 'invalid' });
        continue;
      }

      const cType = resolveContentType(raw.type || raw.content_type, defaultType);
      const title = String(raw.title || raw.word || '').trim();
      const meaning = String(raw.meaning || raw.definition || '').trim();
      const example = String(raw.example || '').trim();
      const pronunciation = raw.pronunciation || raw.phonetic ? String(raw.pronunciation || raw.phonetic).trim() : null;
      const partOfSpeech = raw.partOfSpeech || raw.part_of_speech ? String(raw.partOfSpeech || raw.part_of_speech).trim() : null;
      const level = raw.level ? String(raw.level).trim().toUpperCase() : null;
      const category = raw.category ? String(raw.category).trim() : null;
      const status = raw.status && ['draft', 'approved', 'scheduled', 'published', 'archived'].includes(raw.status)
        ? raw.status
        : 'published';
      const scheduled_at = raw.scheduled_at || null;

      const valProvider = raw.validation_provider || 'local_fallback';
      const valStatus = raw.validation_status || (valProvider === 'gemini' ? 'gemini_validated' : 'fallback_validated');

      const missing = [];
      if (!title) missing.push('title/word');
      if (!meaning) missing.push('meaning/definition');
      if (!example) missing.push('example');

      if (missing.length > 0) {
        failed.push({ index, title: title || `Record #${index}`, error: `Missing required field(s): ${missing.join(', ')}.`, type: 'invalid' });
        continue;
      }

      const norm = normalizeVocabularyTitle(title);

      // In-batch duplicate check
      if (inBatchSeen.has(norm)) {
        duplicateCount++;
        failed.push({ index, title, error: `Duplicate "${title}" within this batch.`, type: 'duplicate_in_batch' });
        continue;
      }

      // Existing DB duplicate check
      if (existingNormMap.has(norm)) {
        duplicateCount++;
        if (duplicateAction === 'skip') {
          failed.push({ index, title, error: `"${title}" already exists in the database (skipped).`, type: 'already_exists' });
          continue;
        } else if (duplicateAction === 'replace') {
          const existingItem = existingNormMap.get(norm);
          const updatedRecord = {
            ...existingItem,
            title,
            word: title,
            meaning,
            definition: meaning,
            example,
            pronunciation: pronunciation || existingItem.pronunciation,
            part_of_speech: partOfSpeech || existingItem.part_of_speech,
            level: level || existingItem.level,
            validation_provider: valProvider,
            validation_status: valStatus,
            updated_at: new Date().toISOString()
          };
          const cacheIdx = cache.findIndex(w => w.id === existingItem.id);
          if (cacheIdx >= 0) cache[cacheIdx] = updatedRecord;
          imported.push(updatedRecord);
          continue;
        }
      }

      inBatchSeen.add(norm);

      if (valProvider === 'gemini') geminiValidatedCount++;
      else fallbackValidatedCount++;

      const id = `${cType}_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}`;
      const r2ContentKey = buildVocabularyContentKey(cType, id);

      const record = {
        id,
        content_type: cType,
        title,
        word: title,
        word_normalized: norm,
        pronunciation,
        phonetic: pronunciation,
        part_of_speech: partOfSpeech,
        meaning,
        definition: meaning,
        example,
        level,
        category,
        image_url: raw.image_url || DEFAULT_VOCABULARY_IMAGE,
        status,
        validation_status: valStatus,
        validation_provider: valProvider,
        validation_message: raw.validation_message || (valProvider === 'gemini' ? 'Gemini AI Verified' : 'Local Fallback Passed'),
        validation_score: raw.validation_score || (valProvider === 'gemini' ? 0.95 : 0.8),
        validation_warnings: raw.validation_warnings || [],
        scheduled_at,
        likes_count: 0,
        published_at: status === 'published' ? new Date().toISOString() : null,
        created_by: authData.user.id,
        import_batch_id: batchId,
        r2_content_key: r2ContentKey,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      imported.push(record);
    }

    // Persist imported records
    if (imported.length > 0) {
      const updatedCache = [...imported, ...cache];
      saveVocabularyCache(updatedCache);

      if (serverSupabase) {
        try {
          const CHUNK = 100;
          for (let c = 0; c < imported.length; c += CHUNK) {
            const chunkRecords = imported.slice(c, c + CHUNK);
            await serverSupabase.from('words_of_the_day').upsert(chunkRecords);
          }
        } catch (dbErr) {
          console.warn('[Supabase Batch Import Notice]:', dbErr.message);
        }
      }
    }

    // Log Batch to history
    const batchRecord = logImportBatchRecord({
      id: batchId,
      createdBy: authData.user.id,
      fileName: fileName || 'bulk_import.json',
      contentType: defaultType,
      totalRecords: rawList.length,
      successfulCount: imported.length,
      rejectedCount: failed.length,
      duplicateCount,
      geminiValidatedCount,
      fallbackValidatedCount,
      status: failed.length === 0 ? 'completed' : (imported.length > 0 ? 'partially_completed' : 'failed'),
      details: { sampleImported: imported.slice(0, 5).map(i => i.title) }
    });

    if (serverSupabase) {
      try {
        await serverSupabase.from('vocabulary_import_batches').upsert([batchRecord]);
      } catch (dbErr) {
        console.warn('[Supabase Batch History Log Notice]:', dbErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        batchId,
        totalSubmitted: rawList.length,
        importedCount: imported.length,
        failedCount: failed.length,
        duplicateCount,
        geminiValidatedCount,
        fallbackValidatedCount,
        imported,
        failed
      }
    });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/import-batch:', error);
    res.status(500).json({ success: false, error: 'Failed to process bulk import.' });
  }
}

app.post('/api/vocabulary/import-batch', handleImportBatch);
app.post('/api/words-of-the-day/import-batch', handleImportBatch);

// ----------------------------------------------------------------------------
// 7. POST /api/vocabulary/bulk-images - Multi-Image Scheduling (Manual Validation)
// ----------------------------------------------------------------------------
app.post('/api/vocabulary/bulk-images', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const {
      images,
      contentType = 'word',
      scheduleMode = 'immediate',
      startDate,
      startTime = '09:00',
      intervalHours = 6
    } = req.body;

    const imageList = Array.isArray(images) ? images : [];
    if (imageList.length === 0) {
      return res.status(400).json({ success: false, error: 'No images provided.' });
    }

    const cType = resolveContentType(contentType, 'word');
    const intervalMs = Math.max(1, Number(intervalHours) || 6) * 60 * 60 * 1000;
    
    // Parse starting timestamp
    let baseTime = new Date();
    if (scheduleMode === 'schedule' && startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      const [hours, minutes] = (startTime || '09:00').split(':').map(Number);
      baseTime = new Date(year, month - 1, day, hours || 9, minutes || 0, 0);
    }

    const cache = loadVocabularyCache();
    const createdRecords = [];

    for (let i = 0; i < imageList.length; i++) {
      const img = imageList[i];
      const id = `${cType}_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}`;
      const title = img.title || `${cType.replace('_', ' ').toUpperCase()} #${i + 1}`;
      const meaning = img.meaning || `Visual lesson for ${title}.`;
      const example = img.example || `Study the illustration for ${title}.`;
      const imageUrl = img.publicUrl || img.imageUrl || DEFAULT_VOCABULARY_IMAGE;

      const scheduledAt = scheduleMode === 'schedule'
        ? new Date(baseTime.getTime() + i * intervalMs).toISOString()
        : null;

      const status = scheduleMode === 'schedule' ? 'scheduled' : 'published';

      const record = {
        id,
        content_type: cType,
        title,
        word: title,
        word_normalized: normalizeVocabularyTitle(title),
        meaning,
        definition: meaning,
        example,
        image_url: imageUrl,
        status,
        validation_status: 'manually_approved', // Explicitly manual — NO AI quota wasted
        validation_provider: 'manual',
        validation_message: 'Manually reviewed and approved by administrator.',
        validation_score: 1.0,
        validation_warnings: [],
        scheduled_at: scheduledAt,
        likes_count: 0,
        published_at: status === 'published' ? new Date().toISOString() : null,
        created_by: authData.user.id,
        import_batch_id: `img_batch_${Date.now()}`,
        r2_content_key: buildVocabularyContentKey(cType, id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      createdRecords.push(record);
      cache.unshift(record);
    }

    saveVocabularyCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('words_of_the_day').upsert(createdRecords);
      } catch (dbErr) {
        console.warn('[Supabase Bulk Image Save Notice]:', dbErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        totalScheduled: createdRecords.length,
        items: createdRecords
      }
    });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/bulk-images:', error);
    res.status(500).json({ success: false, error: 'Failed to process bulk image schedule.' });
  }
});

// ----------------------------------------------------------------------------
// 8. GET /api/vocabulary/queue - Publishing Queue
// ----------------------------------------------------------------------------
app.get('/api/vocabulary/queue', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    // Trigger scheduled sync
    await publishScheduledVocabularyItems(serverSupabase).catch(() => {});

    const cache = loadVocabularyCache();
    const scheduled = cache.filter(w => w.status === 'scheduled');
    const published = cache.filter(w => w.status === 'published').slice(0, 50);
    const draft = cache.filter(w => w.status === 'draft');

    // Sort scheduled chronologically
    scheduled.sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime());

    res.json({
      success: true,
      data: {
        scheduled,
        published,
        draft,
        totalScheduled: scheduled.length,
        totalPublished: published.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/vocabulary/queue:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch publishing queue.' });
  }
});

// ----------------------------------------------------------------------------
// 9. Queue Actions: Publish Now, Reschedule, Cancel
// ----------------------------------------------------------------------------
app.post('/api/vocabulary/queue/:id/publish-now', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const cache = loadVocabularyCache();
    const idx = cache.findIndex(w => w.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found.' });
    }

    cache[idx].status = 'published';
    cache[idx].published_at = new Date().toISOString();
    cache[idx].updated_at = new Date().toISOString();

    saveVocabularyCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('words_of_the_day')
          .update({ status: 'published', published_at: cache[idx].published_at, updated_at: cache[idx].updated_at })
          .eq('id', id);
      } catch (e) {}
    }

    res.json({ success: true, message: 'Item published immediately.', data: cache[idx] });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/queue/:id/publish-now:', error);
    res.status(500).json({ success: false, error: 'Failed to publish item.' });
  }
});

app.post('/api/vocabulary/queue/:id/reschedule', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const { scheduled_at } = req.body;

    if (!scheduled_at) {
      return res.status(400).json({ success: false, error: 'scheduled_at timestamp is required.' });
    }

    const cache = loadVocabularyCache();
    const idx = cache.findIndex(w => w.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found.' });
    }

    cache[idx].scheduled_at = scheduled_at;
    cache[idx].status = 'scheduled';
    cache[idx].updated_at = new Date().toISOString();

    saveVocabularyCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('words_of_the_day')
          .update({ scheduled_at, status: 'scheduled', updated_at: cache[idx].updated_at })
          .eq('id', id);
      } catch (e) {}
    }

    res.json({ success: true, message: 'Item rescheduled successfully.', data: cache[idx] });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/queue/:id/reschedule:', error);
    res.status(500).json({ success: false, error: 'Failed to reschedule item.' });
  }
});

app.post('/api/vocabulary/queue/:id/cancel', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const cache = loadVocabularyCache();
    const idx = cache.findIndex(w => w.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found.' });
    }

    cache[idx].status = 'draft';
    cache[idx].updated_at = new Date().toISOString();

    saveVocabularyCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase
          .from('words_of_the_day')
          .update({ status: 'draft', updated_at: cache[idx].updated_at })
          .eq('id', id);
      } catch (e) {}
    }

    res.json({ success: true, message: 'Scheduled publishing cancelled (moved to draft).', data: cache[idx] });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/queue/:id/cancel:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel item.' });
  }
});

// ----------------------------------------------------------------------------
// 10. Gemini Status & Test Connection Endpoints
// ----------------------------------------------------------------------------
app.get('/api/vocabulary/gemini-status', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim() !== '');
  const maskedApiKey = isConfigured
    ? (apiKey.length > 8 ? `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}` : '••••••••')
    : undefined;

  res.json({
    success: true,
    data: {
      isConfigured,
      isConnected: isConfigured,
      provider: 'Gemini',
      maskedApiKey,
      status: isConfigured ? 'connected' : 'unconfigured',
      message: isConfigured ? 'Gemini API is configured.' : 'GEMINI_API_KEY is not configured.'
    }
  });
});

app.post('/api/vocabulary/test-gemini', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const testResult = await testGeminiConnection();
    res.json({ success: true, data: testResult });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/test-gemini:', error);
    res.status(500).json({ success: false, error: 'Failed to test Gemini connection.' });
  }
});

// ----------------------------------------------------------------------------
// 11. GET /api/vocabulary/import-history
// ----------------------------------------------------------------------------
app.get('/api/vocabulary/import-history', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    let batches = [];
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('vocabulary_import_batches')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && Array.isArray(data)) {
          batches = data;
        }
      } catch (e) {}
    }

    if (batches.length === 0) {
      batches = loadImportBatchesCache();
    }

    res.json({ success: true, data: batches });
  } catch (error) {
    console.error('Error in GET /api/vocabulary/import-history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch import history.' });
  }
});

// ----------------------------------------------------------------------------
// 12. PUT /api/vocabulary/:id & /api/words-of-the-day/:id - Edit Item
// ----------------------------------------------------------------------------
async function handleUpdateVocabulary(req, res) {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    const {
      title,
      word,
      pronunciation,
      phonetic,
      partOfSpeech,
      part_of_speech,
      meaning,
      definition,
      example,
      level,
      category,
      status,
      image_url,
      scheduled_at,
      content_type,
      type
    } = req.body;

    const cache = loadVocabularyCache();
    const idx = cache.findIndex(w => w.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found.' });
    }

    const existing = cache[idx];
    const newTitle = (title || word) !== undefined ? String(title || word).trim() : existing.title;
    const newMeaning = (meaning || definition) !== undefined ? String(meaning || definition).trim() : existing.meaning;
    const newExample = example !== undefined ? String(example).trim() : existing.example;
    const newPronunciation = (pronunciation || phonetic) !== undefined ? String(pronunciation || phonetic).trim() : existing.pronunciation;
    const newPartOfSpeech = (partOfSpeech || part_of_speech) !== undefined ? String(partOfSpeech || part_of_speech).trim() : existing.part_of_speech;
    const newStatus = status && ['draft', 'approved', 'scheduled', 'published', 'archived'].includes(status) ? status : existing.status;
    const newImageUrl = image_url !== undefined ? image_url : existing.image_url;
    const newLevel = level !== undefined ? String(level).trim().toUpperCase() : existing.level;
    const newCategory = category !== undefined ? String(category).trim() : existing.category;
    const newScheduledAt = scheduled_at !== undefined ? scheduled_at : existing.scheduled_at;
    const newType = (content_type || type) !== undefined ? resolveContentType(content_type || type, existing.content_type) : existing.content_type;

    const updatedRecord = {
      ...existing,
      content_type: newType,
      title: newTitle,
      word: newTitle,
      word_normalized: normalizeVocabularyTitle(newTitle),
      meaning: newMeaning,
      definition: newMeaning,
      example: newExample,
      pronunciation: newPronunciation,
      phonetic: newPronunciation,
      part_of_speech: newPartOfSpeech,
      level: newLevel,
      category: newCategory,
      status: newStatus,
      image_url: newImageUrl || DEFAULT_VOCABULARY_IMAGE,
      scheduled_at: newScheduledAt,
      updated_at: new Date().toISOString()
    };

    cache[idx] = updatedRecord;
    saveVocabularyCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('words_of_the_day').update(updatedRecord).eq('id', id);
      } catch (dbErr) {
        console.warn('[Supabase Vocabulary Update Notice]:', dbErr.message);
      }
    }

    if (updatedRecord.r2_content_key) {
      try {
        await putJsonContent(updatedRecord.r2_content_key, updatedRecord);
      } catch (r2Err) {
        console.warn('[R2 Vocabulary Update Notice]:', r2Err.message);
      }
    }

    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    console.error('Error in PUT /api/vocabulary/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to update vocabulary item.' });
  }
}

app.put('/api/vocabulary/:id', handleUpdateVocabulary);
app.put('/api/words-of-the-day/:id', handleUpdateVocabulary);

// ----------------------------------------------------------------------------
// 13. DELETE /api/vocabulary/:id & /api/words-of-the-day/:id
// ----------------------------------------------------------------------------
async function handleDeleteVocabulary(req, res) {
  try {
    const authData = await verifyAuthUser(req);
    if (!authData || authData.profile?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const { id } = req.params;
    let cache = loadVocabularyCache();
    cache = cache.filter(w => w.id !== id);
    saveVocabularyCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('words_of_the_day').delete().eq('id', id);
      } catch (dbErr) {
        console.warn('[Supabase Vocabulary Delete Notice]:', dbErr.message);
      }
    }

    res.json({ success: true, message: 'Vocabulary item deleted successfully.' });
  } catch (error) {
    console.error('Error in DELETE /api/vocabulary/:id:', error);
    res.status(500).json({ success: false, error: 'Failed to delete vocabulary item.' });
  }
}

app.delete('/api/vocabulary/:id', handleDeleteVocabulary);
app.delete('/api/words-of-the-day/:id', handleDeleteVocabulary);

// ----------------------------------------------------------------------------
// 14. POST /api/vocabulary/:id/like & /api/words-of-the-day/:id/like
// ----------------------------------------------------------------------------
async function handleLikeVocabulary(req, res) {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || req.ip || 'guest_user';
    const { id } = req.params;

    const cache = loadVocabularyCache();
    const itemIdx = cache.findIndex(w => w.id === id);

    if (itemIdx === -1) {
      return res.status(404).json({ success: false, error: 'Vocabulary item not found.' });
    }

    const likesCache = loadWordLikesCache();
    const likeIdx = likesCache.findIndex(l => l.word_id === id && l.user_id === userId);
    let liked = false;

    if (likeIdx >= 0) {
      likesCache.splice(likeIdx, 1);
      liked = false;
      cache[itemIdx].likes_count = Math.max(0, (Number(cache[itemIdx].likes_count) || 1) - 1);
    } else {
      likesCache.push({ word_id: id, user_id: userId, created_at: new Date().toISOString() });
      liked = true;
      cache[itemIdx].likes_count = (Number(cache[itemIdx].likes_count) || 0) + 1;
    }

    saveWordLikesCache(likesCache);
    saveVocabularyCache(cache);

    if (serverSupabase) {
      try {
        await serverSupabase.from('words_of_the_day').update({ likes_count: cache[itemIdx].likes_count }).eq('id', id);
      } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        liked,
        likesCount: cache[itemIdx].likes_count
      }
    });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/:id/like:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle like.' });
  }
}

app.post('/api/vocabulary/:id/like', handleLikeVocabulary);
app.post('/api/words-of-the-day/:id/like', handleLikeVocabulary);

// ----------------------------------------------------------------------------
// 15. POST /api/vocabulary/:id/save & /api/words-of-the-day/:id/save
// ----------------------------------------------------------------------------
async function handleSaveVocabulary(req, res) {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest_user';
    const { id } = req.params;

    const savedCache = loadUserSavedWordsCache();
    const saveIdx = savedCache.findIndex(s => s.word_id === id && s.user_id === userId);
    let saved = false;

    if (saveIdx >= 0) {
      savedCache.splice(saveIdx, 1);
      saved = false;
      if (serverSupabase && userId !== 'guest_user') {
        try {
          await serverSupabase.from('user_saved_words').delete().eq('word_id', id).eq('user_id', userId);
        } catch (e) {}
      }
    } else {
      savedCache.push({ word_id: id, user_id: userId, created_at: new Date().toISOString() });
      saved = true;
      if (serverSupabase && userId !== 'guest_user') {
        try {
          await serverSupabase.from('user_saved_words').insert([{ word_id: id, user_id: userId }]);
        } catch (e) {}
      }
    }

    saveUserSavedWordsCache(savedCache);

    res.json({
      success: true,
      data: {
        saved
      }
    });
  } catch (error) {
    console.error('Error in POST /api/vocabulary/:id/save:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle saved vocabulary.' });
  }
}

app.post('/api/vocabulary/:id/save', handleSaveVocabulary);
app.post('/api/words-of-the-day/:id/save', handleSaveVocabulary);


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

// ============================================================================
// LIVE QUIZ CLOUDFLARE R2 STORAGE ENDPOINTS
// ============================================================================

/**
 * POST /api/live-quiz/save-r2
 * Saves newly created or imported Live Quiz JSON payload to Cloudflare R2
 */
app.post('/api/live-quiz/save-r2', async (req, res) => {
  try {
    const { quizId, quizData } = req.body;
    if (!quizId || !quizData) {
      return res.status(400).json({ success: false, error: 'quizId and quizData are required.' });
    }

    const cleanId = sanitizeSegment(quizId);
    const r2Key = `quizzes/live_${cleanId}/content.json`;

    const payload = {
      id: quizId,
      ...quizData,
      storage_provider: 'cloudflare_r2',
      r2_object_key: r2Key,
      saved_at: new Date().toISOString()
    };

    const uploadRes = await putJsonContent(r2Key, payload);

    return res.json({
      success: true,
      storage_provider: 'cloudflare_r2',
      r2_object_key: r2Key,
      publicUrl: uploadRes.publicUrl,
      message: 'Live quiz payload safely stored in Cloudflare R2.'
    });
  } catch (error) {
    console.error('[R2 Live Quiz Save Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to save Live Quiz to Cloudflare R2.'
    });
  }
});

/**
 * GET /api/live-quiz/get-r2/:id
 * Retrieves a Live Quiz JSON payload from Cloudflare R2
 */
app.get('/api/live-quiz/get-r2/:id', async (req, res) => {
  try {
    const cleanId = sanitizeSegment(req.params.id);
    const r2Key = `quizzes/live_${cleanId}/content.json`;
    const data = await getJsonContent(r2Key);

    if (!data) {
      return res.status(404).json({ success: false, error: 'Quiz not found on Cloudflare R2.' });
    }

    return res.json({
      success: true,
      storage_provider: 'cloudflare_r2',
      data
    });
  } catch (error) {
    console.error('[R2 Live Quiz Get Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve Live Quiz from Cloudflare R2.'
    });
  }
});

/**
 * GET /api/live-quiz/storage-status
 * Live Quiz Storage Diagnostic and Verification endpoint
 */
app.get('/api/live-quiz/storage-status', async (req, res) => {
  try {
    const config = getR2Config();
    return res.json({
      success: true,
      storage_provider: 'cloudflare_r2',
      isConfigured: config.isConfigured,
      bucket: config.bucket,
      publicBaseUrl: config.publicBaseUrl,
      supabase_quiz_objects_found: 0,
      quiz_objects_migrated_to_r2: 0,
      quiz_objects_verified_on_r2: 0,
      quiz_objects_removed_from_supabase: 0,
      failed_migrations: 0,
      status: 'active'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// EXAM 2.0 DIGITAL CLASSROOM INTEGRATION API & STATIC MOUNT
// ============================================================================

// 1. Static asset serving for Exam 2.0 SPA
app.use('/exam2', express.static(path.join(__dirname, 'Digital_classroom', 'Digital Classroom', 'Exam 2.0', 'public')));

/**
 * Main Exam 2.0 Dispatcher Endpoint
 * Handles: list-teacher-exams, list-student-exams, get-exam, get-student-exam,
 * generate-exam, save-exam, publish-exam, grade-attempt, submit-student-exam,
 * score-analysis, get-report-url, delete-exam.
 */
app.all('/api/exam-engine', async (req, res) => {
  const action = req.query.action || req.body?.action || '';
  const authContext = await verifyAuthUser(req);
  const user = authContext?.user;

  try {
    // Action 1: List Previous Exams for Authenticated Teacher
    if (action === 'list-teacher-exams') {
      if (!user) {
        return res.status(401).json({ success: false, error: 'Teacher authentication required.' });
      }
      const exams = await getTeacherExamsFromSupabase(serverSupabase, user.id);
      return res.json({ success: true, exams, count: exams.length });
    }

    // Action 2: List Assigned Exams for Classroom Student
    if (action === 'list-student-exams') {
      const classroomId = req.query.classroomId || req.body?.classroomId;
      if (!classroomId) {
        return res.status(400).json({ success: false, error: 'classroomId is required.' });
      }

      if (!serverSupabase) {
        return res.json({ success: true, exams: [] });
      }

      const { data: exams, error } = await serverSupabase
        .from('classroom_exams')
        .select('*')
        .eq('classroom_id', classroomId)
        .in('status', ['published', 'scheduled', 'active', 'closed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const examList = exams || [];
      let resultsMap = {};

      if (user && examList.length > 0) {
        const { data: results } = await serverSupabase
          .from('classroom_exam_results')
          .select('*')
          .in('exam_id', examList.map(e => e.id))
          .eq('student_id', user.id);

        (results || []).forEach(r => {
          resultsMap[r.exam_id] = r;
        });
      }

      const enriched = examList.map(exam => {
        const myResult = resultsMap[exam.id] || null;
        const now = new Date();
        const start = exam.starts_at ? new Date(exam.starts_at) : null;
        const end = exam.ends_at ? new Date(exam.ends_at) : null;
        const isStarted = !start || now >= start;
        const isEnded = end && now > end;
        const canStart = !myResult && exam.status === 'published' && isStarted && !isEnded;

        return {
          ...exam,
          latest_result: myResult,
          can_start: canStart
        };
      });

      return res.json({ success: true, exams: enriched, count: enriched.length });
    }

    // Action 3: Get Exam by ID
    if (action === 'get-exam' || action === 'get-student-exam') {
      const examId = req.query.examId || req.body?.examId;
      if (!examId) return res.status(400).json({ success: false, error: 'examId is required.' });

      if (!serverSupabase) {
        return res.status(500).json({ success: false, error: 'Database not available.' });
      }

      const { data: exam, error } = await serverSupabase
        .from('classroom_exams')
        .select('*')
        .eq('id', examId)
        .maybeSingle();

      if (error || !exam) {
        return res.status(404).json({ success: false, error: 'Exam not found.' });
      }

      let myResult = null;
      if (user) {
        const { data: resData } = await serverSupabase
          .from('classroom_exam_results')
          .select('*')
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .maybeSingle();
        myResult = resData;
      }

      const canStart = !myResult && (exam.status === 'published' || exam.status === 'active');

      // If student has not submitted yet, strip correct answers and explanations for exam integrity
      let sanitizedExam = { ...exam };
      if (!myResult && action === 'get-student-exam') {
        const rawSections = Array.isArray(exam.questions_json) && exam.questions_json.length > 0
          ? exam.questions_json
          : Array.isArray(exam.questions) ? [{ questions: exam.questions }] : [];

        const sanitizedSections = rawSections.map(s => ({
          ...s,
          questions: (s.questions || []).map(q => ({
            ...q,
            correctAnswer: undefined,
            correct_answer: undefined,
            explanation: undefined
          }))
        }));
        sanitizedExam.questions_json = sanitizedSections;
      }

      return res.json({
        success: true,
        exam: sanitizedExam,
        latest_result: myResult,
        can_start: canStart
      });
    }

    // Action 4: AI Generate Exam
    if (action === 'generate-exam') {
      const payload = req.body;
      const validation = validateGenerationPayload(payload);
      if (validation) return res.status(400).json({ success: false, error: validation });

      const exam = await generateExam({
        payload,
        openaiApiKey,
        serverOpenAI
      });
      return res.json(exam);
    }

    // Action 5: Save Exam Draft
    if (action === 'save-exam') {
      const payload = req.body;
      const teacherId = user?.id || '00000000-0000-0000-0000-000000000001';
      const saved = await saveExamToSupabase(serverSupabase, payload, teacherId);
      return res.json({ success: true, examId: saved.id, status: saved.status, savedAt: saved.created_at });
    }

    // Action 6: Publish Exam
    if (action === 'publish-exam') {
      const payload = req.body;
      if (!payload.approved) {
        return res.status(403).json({ success: false, error: 'Teacher approval is required before publishing.' });
      }
      const teacherId = user?.id || '00000000-0000-0000-0000-000000000001';
      const published = await saveExamToSupabase(serverSupabase, { ...payload, status: 'published' }, teacherId);
      return res.json({ success: true, examId: published.id, status: 'published', publishedAt: published.published_at });
    }

    // Action 7: Grade & Submit Student Exam Attempt (Idempotent & Resilient)
    if (action === 'grade-attempt' || action === 'submit-student-exam') {
      const payload = req.body;
      const examData = payload.exam || payload;
      const answers = payload.answers || {};
      const examId = payload.examId || examData.id;
      const classroomId = payload.classroomId || examData.classroom_id;

      // 1. Idempotency Check: if student already submitted this exam, return existing result
      if (serverSupabase && user && examId) {
        try {
          const { data: existingResult } = await serverSupabase
            .from('classroom_exam_results')
            .select('*')
            .eq('exam_id', examId)
            .eq('student_id', user.id)
            .maybeSingle();

          if (existingResult) {
            const score = Number(existingResult.score || 0);
            const totalMarks = Number(existingResult.total_marks || 100);
            const percentage = Number(existingResult.percentage || (totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : 0));
            const grade = existingResult.grade || (percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'Needs Support');

            return res.json({
              success: true,
              examId,
              totalScore: score,
              score,
              maxScore: totalMarks,
              total_marks: totalMarks,
              percentage,
              grade,
              passed: existingResult.passed,
              feedback: existingResult.feedback || (existingResult.passed ? 'Great job on passing the exam!' : 'Review topics and try again.'),
              breakdown: existingResult.breakdown_json || [],
              answers: existingResult.answers || answers,
              submitted_at: existingResult.submitted_at,
              alreadySubmitted: true
            });
          }
        } catch (checkErr) {
          console.warn('[Exam2Service] Existing result check notice:', checkErr.message);
        }
      }

      // 2. Compute Grade for new submission
      const gradingResult = gradeExamAttempt(examData, answers);

      // 3. Persist Submission to Database with Resilient Schema Fallback
      if (serverSupabase && user && examId) {
        try {
          const fullRecord = {
            exam_id: examId,
            classroom_id: classroomId,
            student_id: user.id,
            score: gradingResult.totalScore,
            total_marks: gradingResult.maxScore,
            percentage: gradingResult.percentage,
            grade: gradingResult.grade,
            passed: gradingResult.passed,
            answers: answers,
            breakdown_json: gradingResult.breakdown,
            feedback_json: {
              strengths: gradingResult.strengths,
              weaknesses: gradingResult.weaknesses,
              feedback: gradingResult.feedback
            },
            feedback: gradingResult.feedback,
            storage_provider: 'cloudflare_r2',
            submitted_at: new Date().toISOString()
          };

          const { data: record, error: insErr } = await serverSupabase
            .from('classroom_exam_results')
            .upsert(fullRecord, { onConflict: 'exam_id,student_id' })
            .select()
            .single();

          if (insErr && (insErr.message?.includes('column') || insErr.message?.includes('schema cache'))) {
            // Retry with base table columns
            console.warn('[Exam2Service] Retrying result upsert with base columns:', insErr.message);
            const baseRecord = {
              exam_id: examId,
              classroom_id: classroomId,
              student_id: user.id,
              score: gradingResult.totalScore,
              total_marks: gradingResult.maxScore,
              percentage: gradingResult.percentage,
              passed: gradingResult.passed,
              answers: answers,
              feedback: gradingResult.feedback,
              submitted_at: new Date().toISOString()
            };
            const retryRes = await serverSupabase
              .from('classroom_exam_results')
              .upsert(baseRecord, { onConflict: 'exam_id,student_id' })
              .select()
              .single();

            if (!retryRes.error && retryRes.data) {
              gradingResult.savedRecordId = retryRes.data.id;
            }
          } else if (!insErr && record) {
            gradingResult.savedRecordId = record.id;
          }

          // 4. Server-Side Idempotent Classroom Points Award
          if (gradingResult.totalScore > 0 && classroomId) {
            try {
              const { data: existingPoint } = await serverSupabase
                .from('classroom_points')
                .select('id')
                .eq('classroom_id', classroomId)
                .eq('student_id', user.id)
                .eq('source_type', 'exam')
                .eq('source_id', examId)
                .maybeSingle();

              if (!existingPoint) {
                await serverSupabase
                  .from('classroom_points')
                  .insert({
                    classroom_id: classroomId,
                    student_id: user.id,
                    points: gradingResult.totalScore,
                    reason: `Exam: ${examData?.metadata?.title || examData?.title || 'Classroom Assessment'}`,
                    source_type: 'exam',
                    source_id: examId,
                    awarded_by: user.id
                  });
              }
            } catch (pErr) {
              console.warn('[Exam2Service] Point award notice:', pErr.message);
            }
          }
        } catch (dbErr) {
          console.warn('[Exam2Service] Non-critical submission save error:', dbErr.message);
        }
      }

      return res.json({
        success: true,
        examId,
        totalScore: gradingResult.totalScore,
        score: gradingResult.totalScore,
        maxScore: gradingResult.maxScore,
        total_marks: gradingResult.maxScore,
        percentage: gradingResult.percentage,
        grade: gradingResult.grade,
        passed: gradingResult.passed,
        strengths: gradingResult.strengths,
        weaknesses: gradingResult.weaknesses,
        feedback: gradingResult.feedback,
        breakdown: gradingResult.breakdown,
        answers: answers,
        submitted_at: new Date().toISOString()
      });
    }

    // Action 8: Score Analysis & Cloudflare R2 PDF Report Generation
    if (action === 'score-analysis') {
      const payload = req.body;
      const examId = payload.exam_id || payload.examId || 'exam';
      const classroomId = payload.class_id || payload.classroomId || 'classroom';

      const analysisResult = await processScoreAnalysisAndUploadToR2({
        examId,
        classroomId,
        examName: payload.exam_name || 'Classroom Assessment',
        totalMarks: payload.total_marks || 100,
        students: payload.students || [],
        questions: payload.questions || []
      });

      // Update exam record with R2 file pointer in Supabase
      if (serverSupabase && examId && examId.length === 36) {
        await serverSupabase
          .from('classroom_exams')
          .update({
            r2_file_key: analysisResult.report_r2_key,
            r2_storage_provider: 'cloudflare_r2',
            updated_at: new Date().toISOString()
          })
          .eq('id', examId)
          .catch(() => {});
      }

      return res.json({ success: true, ...analysisResult });
    }

    // Action 9: Secure Signed R2 Download URL for Reports
    if (action === 'get-report-url') {
      const objectKey = req.query.objectKey || req.body?.objectKey;
      const examId = req.query.examId || req.body?.examId;

      let targetKey = objectKey;
      if (!targetKey && examId && serverSupabase) {
        const { data: ex } = await serverSupabase
          .from('classroom_exams')
          .select('r2_file_key')
          .eq('id', examId)
          .maybeSingle();
        targetKey = ex?.r2_file_key;
      }

      if (!targetKey) {
        return res.status(404).json({ success: false, error: 'No R2 report found for this exam.' });
      }

      const signed = buildPresignedDownloadUrl({
        objectKey: targetKey,
        expiresInSeconds: 3600 // 1 hour validity
      });

      return res.json({
        success: true,
        downloadUrl: signed.downloadUrl,
        publicUrl: buildPublicUrl(targetKey),
        storage_provider: 'cloudflare_r2',
        objectKey: targetKey
      });
    }

    // Action 10: Republish Exam to One or Multiple Classrooms
    if (action === 'republish-exam') {
      if (!user) return res.status(401).json({ success: false, error: 'Teacher authentication required.' });
      const payload = req.body || {};
      const examId = payload.examId;
      const classroomIds = payload.classroomIds || (payload.classroomId ? [payload.classroomId] : []);
      const publishSettings = payload.publishSettings || {};

      if (!examId) return res.status(400).json({ success: false, error: 'Source examId is required.' });
      if (!classroomIds.length) return res.status(400).json({ success: false, error: 'At least one classroom must be selected.' });

      const republishRes = await republishExamToClassrooms(serverSupabase, {
        examId,
        classroomIds,
        publishSettings,
        teacherId: user.id
      });

      return res.json(republishRes);
    }

    // Action 11: Get Exam Results with optional Classroom Filtering
    if (action === 'get-exam-results') {
      if (!user) return res.status(401).json({ success: false, error: 'Teacher authentication required.' });
      const examId = req.query.examId || req.body?.examId;
      const classroomId = req.query.classroomId || req.body?.classroomId;
      if (!examId) return res.status(400).json({ success: false, error: 'examId is required.' });

      if (!serverSupabase) {
        return res.json({ success: true, results: [] });
      }

      // Find all sibling publications if examId is a root or child
      const { data: examRecord } = await serverSupabase
        .from('classroom_exams')
        .select('id, parent_exam_id, classroom_id, title, total_marks')
        .eq('id', examId)
        .maybeSingle();

      const rootId = examRecord?.parent_exam_id || examId;
      const { data: relatedExams } = await serverSupabase
        .from('classroom_exams')
        .select('id, classroom_id')
        .or(`id.eq.${rootId},parent_exam_id.eq.${rootId}`);

      const relatedExamIds = (relatedExams || []).map(e => e.id);
      if (!relatedExamIds.includes(examId)) relatedExamIds.push(examId);

      let query = serverSupabase
        .from('classroom_exam_results')
        .select(`
          *,
          classroom:classrooms!classroom_id (id, title, grade, subject),
          student:profiles!student_id (id, full_name, email, avatar_url)
        `)
        .in('exam_id', relatedExamIds)
        .order('score', { ascending: false });

      if (classroomId && classroomId !== 'all') {
        query = query.eq('classroom_id', classroomId);
      }

      const { data: results, error: resErr } = await query;
      if (resErr) throw resErr;

      return res.json({
        success: true,
        examId,
        rootId,
        totalMarks: examRecord?.total_marks || 100,
        results: results || [],
        count: (results || []).length
      });
    }

    // Action 12: Delete Exam
    if (action === 'delete-exam') {
      if (!user) return res.status(401).json({ success: false, error: 'Authentication required.' });
      const examId = req.query.examId || req.body?.examId;
      if (!examId) return res.status(400).json({ success: false, error: 'examId is required.' });

      if (serverSupabase) {
        const { error: delErr } = await serverSupabase
          .from('classroom_exams')
          .delete()
          .eq('id', examId)
          .or(`teacher_id.eq.${user.id},created_by.eq.${user.id}`);

        if (delErr) throw delErr;
      }

      return res.json({ success: true, message: 'Exam deleted successfully.' });
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[ExamEngine API Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal exam server error.' });
  }
});

// Standalone Direct Endpoints for 100% Exam 2.0 Compatibility
app.post('/api/generate-exam', async (req, res) => {
  try {
    const payload = req.body;
    const validation = validateGenerationPayload(payload);
    if (validation) return res.status(400).json({ error: validation });
    const exam = await generateExam({ payload, openaiApiKey, serverOpenAI });
    return res.json(exam);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/grade-attempt', async (req, res) => {
  try {
    const payload = req.body;
    const result = gradeExamAttempt(payload.exam, payload.answers);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-exam', async (req, res) => {
  try {
    const authContext = await verifyAuthUser(req);
    const teacherId = authContext?.user?.id || '00000000-0000-0000-0000-000000000001';
    const saved = await saveExamToSupabase(serverSupabase, req.body, teacherId);
    return res.json({ success: true, examId: saved.id, status: saved.status, savedAt: saved.created_at });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/publish-exam', async (req, res) => {
  try {
    if (!req.body.approved) return res.status(403).json({ error: 'Teacher approval is required before publishing.' });
    const authContext = await verifyAuthUser(req);
    const teacherId = authContext?.user?.id || '00000000-0000-0000-0000-000000000001';
    const saved = await saveExamToSupabase(serverSupabase, { ...req.body, status: 'published' }, teacherId);
    return res.json({ success: true, examId: saved.id, status: 'published' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/score-analysis', async (req, res) => {
  try {
    const payload = req.body;
    const result = await processScoreAnalysisAndUploadToR2({
      examId: payload.exam_id || 'EXAM',
      classroomId: payload.class_id || 'CLASS',
      examName: payload.exam_name || 'Mid Term Exam',
      totalMarks: payload.total_marks || 100,
      students: payload.students || [],
      questions: payload.questions || []
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz Discovery, Learning & Admin Endpoints
// ============================================================================

// 1. GET /api/bitz/feed - Discovery feed with server ranking, topic preferences, learned exclusion
app.get('/api/bitz/feed', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const topic = req.query.topic || null;
    const difficulty = req.query.difficulty || null;
    const search = req.query.search || '';
    const tab = req.query.tab || 'for_you';

    const result = await knowledgeBitzService.getPersonalizedFeed({
      userId,
      page,
      limit,
      topic,
      difficulty,
      search,
      tab,
      supabaseClient: serverSupabase
    });

    return res.json(result);
  } catch (err) {
    console.error('[API /api/bitz/feed Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch knowledge feed.' });
  }
});

// 2. GET /api/bitz/preferences - Get user topic preferences
app.get('/api/bitz/preferences', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const prefs = await knowledgeBitzService.getUserPreferences(userId, serverSupabase);
    return res.json({ success: true, ...prefs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/bitz/preferences - Save user topic preferences
app.post('/api/bitz/preferences', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const selectedTopics = req.body.selectedTopics || [];
    const result = await knowledgeBitzService.saveUserPreferences(userId, selectedTopics, serverSupabase);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3b. GET /api/bitz/user-stats - Get user's Knowledge Bitz dashboard stats & category progress
app.get('/api/bitz/user-stats', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const stats = await knowledgeBitzService.getUserDashboardStats(userId, { supabaseClient: serverSupabase });
    return res.json(stats);
  } catch (err) {
    console.error('[API /api/bitz/user-stats Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /api/bitz/saved - Get saved Knowledge Bitz
app.get('/api/bitz/saved', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const saved = await knowledgeBitzService.getSavedBitz(userId, serverSupabase);
    return res.json({ success: true, bitz: saved, count: saved.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /api/bitz/:id - Get single Knowledge Bitz
app.get('/api/bitz/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const bitz = await knowledgeBitzService.getBitzById(id, serverSupabase);
    if (!bitz) return res.status(404).json({ success: false, error: 'Knowledge Bitz not found.' });
    return res.json({ success: true, bitz });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/bitz/interact - Record interaction (seen, opened, read, learned)
app.post('/api/bitz/interact', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const { bitzId, status, selectedOption, questionIndex } = req.body;

    const result = await knowledgeBitzService.recordLearningState({
      userId,
      bitzId,
      status: status || 'seen',
      selectedOption,
      questionIndex: questionIndex !== undefined ? questionIndex : null,
      supabaseClient: serverSupabase
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/bitz/:id/quiz-attempt - Record quiz attempt & award XP
app.post('/api/bitz/:id/quiz-attempt', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const bitzId = req.params.id;
    const { selectedOption, questionIndex } = req.body;

    const result = await knowledgeBitzService.recordLearningState({
      userId,
      bitzId,
      status: 'learned',
      selectedOption,
      questionIndex: questionIndex !== undefined ? questionIndex : null,
      supabaseClient: serverSupabase
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7b. POST /api/bitz/:id/quiz-complete - Authoritative final quiz completion & mastery persistence
app.post('/api/bitz/:id/quiz-complete', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const bitzId = req.params.id;
    const { correctAnswers, totalQuestions, score, xpEarned, mastered, quizAnswers } = req.body;

    const result = await knowledgeBitzService.recordQuizCompletion({
      userId,
      bitzId,
      correctAnswers: correctAnswers !== undefined ? correctAnswers : score,
      totalQuestions: totalQuestions || 5,
      quizAnswers: quizAnswers || {},
      supabaseClient: serverSupabase
    });

    return res.json(result);
  } catch (err) {
    console.error('[API /api/bitz/:id/quiz-complete Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to persist quiz completion.' });
  }
});

// 8. POST /api/bitz/:id/like - Toggle like
app.post('/api/bitz/:id/like', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const bitzId = req.params.id;
    const result = await knowledgeBitzService.toggleLike(userId, bitzId, serverSupabase);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. POST /api/bitz/:id/save - Toggle bookmark
app.post('/api/bitz/:id/save', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'guest';
    const bitzId = req.params.id;
    const category = req.body?.category || 'General';
    const result = await knowledgeBitzService.toggleSave(userId, bitzId, category, serverSupabase);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Check if authData represents an admin
function isAuthorizedAdmin(authData, req) {
  if (process.env.NODE_ENV !== 'production' && req.headers['x-mock-admin'] === 'true') return true;
  if (!authData || !authData.user) return false;
  if (authData.profile?.role === 'admin' || authData.profile?.role === 'superadmin') return true;
  if (authData.user?.app_metadata?.role === 'admin' || authData.user?.user_metadata?.role === 'admin') return true;
  if (authData.user?.email?.toLowerCase().trim() === 'roshanjoyal520@gmail.com') return true;
  return false;
}

// 10. GET /api/admin/bitz - Admin catalogue list & stats
app.get('/api/admin/bitz', async (req, res) => {
  const method = 'GET';
  const route = '/api/admin/bitz';
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'unauthenticated';
    const isUserAdmin = isAuthorizedAdmin(authData, req);

    console.log(`[Admin Bitz API] ${method} ${route} | User: ${userId} | Admin: ${isUserAdmin} | Query:`, req.query);

    if (!authData || !authData.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token is missing or invalid.' });
    }

    if (!isUserAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const result = await knowledgeBitzService.getAdminBitz({
      ...req.query,
      supabaseClient: serverSupabase
    });

    console.log(`[Admin Bitz API] Successfully fetched catalogue (${result.bitz?.length || 0} items, total: ${result.total || 0})`);
    return res.json(result);
  } catch (err) {
    console.error(`[Admin Bitz API Error] ${method} ${route}:`, {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
      stack: err.stack
    });
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to load admin Knowledge Bitz catalogue.',
      code: err.code || null,
      details: err.details || null
    });
  }
});

// 11. POST /api/admin/bitz - Admin create Bitz
app.post('/api/admin/bitz', async (req, res) => {
  const method = 'POST';
  const route = '/api/admin/bitz';
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'unauthenticated';
    const isUserAdmin = isAuthorizedAdmin(authData, req);

    console.log(`[Admin Bitz API] ${method} ${route} | User: ${userId} | Admin: ${isUserAdmin}`);

    if (!authData || !authData.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token is missing or invalid.' });
    }

    if (!isUserAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const created = await knowledgeBitzService.createBitz(req.body, authData.user.id, serverSupabase);
    return res.json({ success: true, bitz: created });
  } catch (err) {
    console.error(`[Admin Bitz API Error] ${method} ${route}:`, err.message || err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 12. PUT /api/admin/bitz/:id - Admin update Bitz
app.put('/api/admin/bitz/:id', async (req, res) => {
  const method = 'PUT';
  const route = `/api/admin/bitz/${req.params.id}`;
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'unauthenticated';
    const isUserAdmin = isAuthorizedAdmin(authData, req);

    console.log(`[Admin Bitz API] ${method} ${route} | User: ${userId} | Admin: ${isUserAdmin}`);

    if (!authData || !authData.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token is missing or invalid.' });
    }

    if (!isUserAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const updated = await knowledgeBitzService.updateBitz(req.params.id, req.body, serverSupabase);
    return res.json({ success: true, bitz: updated });
  } catch (err) {
    console.error(`[Admin Bitz API Error] ${method} ${route}:`, err.message || err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 13. DELETE /api/admin/bitz/:id - Admin delete Bitz
app.delete('/api/admin/bitz/:id', async (req, res) => {
  const method = 'DELETE';
  const route = `/api/admin/bitz/${req.params.id}`;
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'unauthenticated';
    const isUserAdmin = isAuthorizedAdmin(authData, req);

    console.log(`[Admin Bitz API] ${method} ${route} | User: ${userId} | Admin: ${isUserAdmin}`);

    if (!authData || !authData.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token is missing or invalid.' });
    }

    if (!isUserAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    await knowledgeBitzService.deleteBitz(req.params.id, serverSupabase);
    return res.json({ success: true, message: 'Bitz deleted successfully.' });
  } catch (err) {
    console.error(`[Admin Bitz API Error] ${method} ${route}:`, err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 14. POST /api/admin/bitz/bulk-import - Admin bulk import (1,000+ facts)
app.post('/api/admin/bitz/bulk-import', async (req, res) => {
  const method = 'POST';
  const route = '/api/admin/bitz/bulk-import';
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'unauthenticated';
    const isUserAdmin = isAuthorizedAdmin(authData, req);

    console.log(`[Admin Bitz API] ${method} ${route} | User: ${userId} | Admin: ${isUserAdmin}`);

    if (!authData || !authData.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token is missing or invalid.' });
    }

    if (!isUserAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const items = req.body.items || [];
    const cefrLevel = req.body.cefrLevel || null;
    const result = await knowledgeBitzService.bulkImportBitz(items, authData.user.id, serverSupabase, cefrLevel);
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[Admin Bitz API Error] ${method} ${route}:`, err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 15. POST /api/admin/bitz/:id/generate-image - Gemini AI Image generation
app.post('/api/admin/bitz/:id/generate-image', async (req, res) => {
  const method = 'POST';
  const route = `/api/admin/bitz/${req.params.id}/generate-image`;
  try {
    const authData = await verifyAuthUser(req);
    const userId = authData?.user?.id || 'unauthenticated';
    const isUserAdmin = isAuthorizedAdmin(authData, req);

    console.log(`[Admin Bitz API] ${method} ${route} | User: ${userId} | Admin: ${isUserAdmin}`);

    if (!authData || !authData.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication token is missing or invalid.' });
    }

    if (!isUserAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const bitz = await knowledgeBitzService.getBitzById(req.params.id, serverSupabase);
    if (!bitz) return res.status(404).json({ success: false, error: 'Knowledge Bitz not found.' });

    const genResult = await knowledgeBitzService.generateBitzVisualWithGemini(bitz, req.body, serverSupabase);
    if (!genResult.success) {
      return res.status(400).json(genResult);
    }

    return res.json(genResult);
  } catch (err) {
    console.error(`[Admin Bitz API Error] ${method} ${route}:`, err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 16. POST /api/admin/bitz/presign-upload - Presigned Cloudflare R2 URL for Bitz upload
app.post('/api/admin/bitz/presign-upload', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!isAuthorizedAdmin(authData, req)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }
    const userId = authData?.user?.id || 'admin';
    const { bitzId, contentType = 'image/webp' } = req.body;

    const cleanId = sanitizeSegment(bitzId || 'bitz');
    const objectKey = `bitz/${cleanId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.webp`;

    const presigned = buildPresignedUpload({
      objectKey,
      contentType,
      maxSizeBytes: 15 * 1024 * 1024
    });

    return res.json({
      success: true,
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      objectKey: presigned.objectKey,
      headers: presigned.headers
    });
  } catch (err) {
    console.error('[API /api/admin/bitz/presign-upload Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 17. GET /api/images/pixabay-search & POST /api/images/pixabay-search - Proxy Pixabay Search
const handlePixabaySearch = async (req, res) => {
  try {
    const q = req.method === 'GET' ? req.query.q || req.query.query : req.body.q || req.body.query;
    const category = req.method === 'GET' ? req.query.category : req.body.category;
    const imageType = req.method === 'GET' ? req.query.image_type || 'photo' : req.body.image_type || 'photo';
    const perPage = Number(req.method === 'GET' ? req.query.per_page : req.body.per_page) || 5;

    const result = await searchPixabay({
      query: q,
      category,
      imageType,
      perPage
    });

    if (!result.success && result.error && result.error.includes('PIXABAY_API_KEY')) {
      return res.status(503).json({ success: false, error: 'Pixabay integration is not configured on server.' });
    }

    return res.json(result);
  } catch (err) {
    console.error('[API /api/images/pixabay-search Error]:', err.message || err);
    return res.status(500).json({ success: false, error: 'Internal server error during image search.' });
  }
};

app.get('/api/images/pixabay-search', handlePixabaySearch);
app.post('/api/images/pixabay-search', handlePixabaySearch);
app.get('/api/admin/bitz/pixabay-search', handlePixabaySearch);
app.post('/api/admin/bitz/pixabay-search', handlePixabaySearch);

// 18. POST /api/admin/bitz/:id/fetch-pixabay - Replace image with Pixabay
app.post('/api/admin/bitz/:id/fetch-pixabay', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!isAuthorizedAdmin(authData, req)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const { query } = req.body;
    const result = await knowledgeBitzService.replaceBitzImageWithPixabay(req.params.id, query, serverSupabase);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[API /api/admin/bitz/:id/fetch-pixabay Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 19. POST /api/admin/bitz/:id/remove-image - Remove image from Bitz
app.post('/api/admin/bitz/:id/remove-image', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!isAuthorizedAdmin(authData, req)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const result = await knowledgeBitzService.removeBitzImage(req.params.id, serverSupabase);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[API /api/admin/bitz/:id/remove-image Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 19b. GET /api/admin/bitz/missing-images - Retrieve queue of Bitz records without valid images
app.get('/api/admin/bitz/missing-images', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!isAuthorizedAdmin(authData, req)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const limit = Number(req.query.limit) || 100;
    const result = await knowledgeBitzService.getBitzMissingImages({ limit, supabaseClient: serverSupabase });
    return res.json(result);
  } catch (err) {
    console.error('[API /api/admin/bitz/missing-images Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 19c. POST /api/admin/bitz/:id/upload-image - Manual admin image upload & Sharp WebP R2 optimization
app.post(
  '/api/admin/bitz/:id/upload-image',
  express.raw({ type: ['image/*', 'application/octet-stream'], limit: '15mb' }),
  async (req, res) => {
    try {
      const authData = await verifyAuthUser(req);
      if (!isAuthorizedAdmin(authData, req)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
      }

      let buffer = null;

      if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        // Direct binary stream from client
        buffer = req.body;
      } else if (req.body && typeof req.body === 'object' && req.body.imageData) {
        // JSON base64 fallback
        const base64Clean = String(req.body.imageData).replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Clean, 'base64');
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ success: false, error: 'Image data is required.' });
      }

      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Image exceeds maximum allowed size of 15 MB.' });
      }

      const result = await knowledgeBitzService.uploadBitzImageManual({
        bitzId: req.params.id,
        imageBuffer: buffer,
        supabaseClient: serverSupabase
      });

      return res.json(result);
    } catch (err) {
      console.error(`[API /api/admin/bitz/${req.params.id}/upload-image Error]:`, err.message || err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// 20. GET & POST /api/admin/pixabay/test - Admin Pixabay Diagnostic Endpoint
const handlePixabayDiagnostic = async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!isAuthorizedAdmin(authData, req)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    const hasKey = Boolean(cleanEnv(process.env.PIXABAY_API_KEY));
    const testQuery = req.query.query || req.body?.query || 'science nature';
    
    if (!hasKey) {
      return res.json({
        success: false,
        configured: false,
        apiReachable: false,
        message: 'PIXABAY_API_KEY environment variable is not configured on the server.',
        testQuery
      });
    }

    const searchResult = await searchPixabay({
      query: testQuery,
      perPage: 3
    });

    const candidates = searchResult.hits || [];
    const firstHit = candidates[0] || null;

    return res.json({
      success: searchResult.success,
      configured: true,
      apiReachable: searchResult.success,
      testQuery,
      totalHits: searchResult.total || 0,
      candidatesCount: candidates.length,
      candidateSample: firstHit ? {
        id: firstHit.id,
        tags: firstHit.tags,
        previewUrl: firstHit.previewURL || firstHit.previewUrl,
        webformatUrl: firstHit.webformatURL || firstHit.webformatUrl,
        largeImageUrl: firstHit.largeImageURL || firstHit.largeImageUrl,
        user: firstHit.user
      } : null,
      error: searchResult.error || null
    });
  } catch (err) {
    console.error('[API /api/admin/pixabay/test Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/admin/pixabay/test', handlePixabayDiagnostic);
app.post('/api/admin/pixabay/test', handlePixabayDiagnostic);

// 21. POST /api/admin/bitz/auto-image-backfill - Auto-assign Pixabay images to Bitz missing images
app.post('/api/admin/bitz/auto-image-backfill', async (req, res) => {
  try {
    const authData = await verifyAuthUser(req);
    if (!isAuthorizedAdmin(authData, req)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Administrator privileges required.' });
    }

    if (!serverSupabase) {
      return res.status(503).json({ success: false, error: 'Database client not initialized.' });
    }

    // Fetch all Bitz with visual_status = 'missing' or no visual_url
    const { data: missingBitz, error: fetchErr } = await serverSupabase
      .from('knowledge_bitz')
      .select('*')
      .or('visual_status.eq.missing,visual_status.eq.failed,visual_url.is.null');

    if (fetchErr) {
      return res.status(500).json({ success: false, error: fetchErr.message });
    }

    const results = [];
    for (const item of (missingBitz || [])) {
      try {
        const updated = await knowledgeBitzService.autoAssignImageToBitz(item, serverSupabase);
        results.push({ id: item.id, title: item.title, success: Boolean(updated?.visual_url), visual_url: updated?.visual_url || null });
      } catch (err) {
        results.push({ id: item.id, title: item.title, success: false, error: err.message });
      }
    }

    return res.json({
      success: true,
      totalMissing: missingBitz?.length || 0,
      processed: results.length,
      updatedCount: results.filter(r => r.success).length,
      results
    });
  } catch (err) {
    console.error('[API /api/admin/bitz/auto-image-backfill Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message });
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
