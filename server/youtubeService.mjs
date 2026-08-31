import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export const VERIFIED_CHANNEL_ID = 'UCHOag2liOOp1XfTAUCqiFUg';
export const VERIFIED_UPLOADS_PLAYLIST_ID = 'UUHOag2liOOp1XfTAUCqiFUg';
export const WEBSUB_TOPIC_URL = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${VERIFIED_CHANNEL_ID}`;
export const WEBSUB_HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';

const CACHE_DIR = path.resolve(__dirname, 'data');
const CACHE_FILE = path.resolve(CACHE_DIR, 'youtube_cache.json');
const SYNC_STATUS_FILE = path.resolve(CACHE_DIR, 'sync_status.json');

// Helper: Get Supabase client with maximum legitimate server-side authorization
export function getServerSupabaseClient(userToken = null) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) return null;

  // 1. Privileged server-side execution via service_role key (bypasses RLS safely on backend)
  if (serviceRoleKey) {
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  // 2. Authenticated admin request execution via user JWT token (satisfies is_admin() RLS)
  if (userToken && anonKey) {
    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      },
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  // 3. Fallback client using anon key
  if (anonKey) {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  return null;
}

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  // Read-only serverless filesystem
}

// In-Memory & Persistent Sync Status
let syncState = {
  lastSyncTime: new Date().toISOString(),
  lastSyncStatus: 'idle',
  totalVideos: 198,
  upcomingVideos: 0,
  lastError: null,
  newVideosAddedLastSync: 0,
  syncTrigger: 'initialization'
};

// Load saved sync status if exists
try {
  if (fs.existsSync(SYNC_STATUS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SYNC_STATUS_FILE, 'utf8'));
    syncState = { ...syncState, ...saved };
  }
} catch (e) {
  // Ignore
}

function saveSyncStatus(statusUpdates) {
  syncState = { ...syncState, ...statusUpdates, lastSyncTime: new Date().toISOString() };
  try {
    fs.writeFileSync(SYNC_STATUS_FILE, JSON.stringify(syncState, null, 2), 'utf8');
  } catch (e) {
    console.error('[YouTube Service] Error saving sync status:', e);
  }
}

export function getSyncStatus() {
  return { ...syncState };
}

// Helper: Parse ISO 8601 Duration (e.g., PT11S, PT1M25S)
export function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '30 sec';
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
}

// Helper: Clean title from hashtag suffixes
export function cleanTitle(title = '') {
  return title
    .replace(/#[\w\d_-]+/g, '')
    .replace(/[#|•\-_]+$/g, '')
    .trim();
}

// Helper: Categorize video based on title & description
export function detectCategory(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('english') || text.includes('grammar') || text.includes('vocabulary') || text.includes('pronounced') || text.includes('say interested') || text.includes('learnenglish')) {
    return 'English';
  }
  if (text.includes('psychology') || text.includes('mindset') || text.includes('procrastination') || text.includes('focus') || text.includes('habits') || text.includes('growth') || text.includes('brain') || text.includes('memory') || text.includes('sleep')) {
    return 'Psychology';
  }
  if (text.includes('space') || text.includes('moon') || text.includes('star') || text.includes('apollo') || text.includes('planet') || text.includes('sun') || text.includes('universe')) {
    return 'Space';
  }
  if (text.includes('snake') || text.includes('jellyfish') || text.includes('frog') || text.includes('spider') || text.includes('ostrich') || text.includes('seahorse') || text.includes('cheetah') || text.includes('fungus') || text.includes('animal') || text.includes('nature') || text.includes('ocean') || text.includes('wildlife')) {
    return 'Nature';
  }
  if (text.includes('phone') || text.includes('laptop') || text.includes('charge') || text.includes('tech') || text.includes('ai') || text.includes('digital') || text.includes('robot')) {
    return 'Technology';
  }
  if (text.includes('history') || text.includes('trial') || text.includes('beethoven') || text.includes('1386') || text.includes('carrots') || text.includes('countries')) {
    return 'History';
  }
  if (text.includes('mystery') || text.includes('cloud that killed') || text.includes('creepy') || text.includes('folklore') || text.includes('sleep paralysis') || text.includes('children')) {
    return 'Mysteries';
  }
  if (text.includes('lifelessons') || text.includes('wisdom') || text.includes('problems') || text.includes('impress everyone') || text.includes('future') || text.includes('failure')) {
    return 'Life Skills';
  }
  return 'Science';
}

// Generate default educational placeholder for upcoming Short
export function generateUpcomingEducationalContent(video) {
  const title = cleanTitle(video.title);
  return {
    youtube_video_id: video.youtube_video_id,
    summary: video.description || `Upcoming lesson for "${title}". Educational summary, vocabulary, and interactive quizzes are being prepared.`,
    key_takeaway: `Key takeaways and learning principles for "${title}" will be published soon.`,
    vocabulary: [],
    quiz: [],
    learning_objectives: [
      `Watch "${title}" and understand the core concept`,
      `Complete interactive quiz upon lesson release`
    ],
    status: 'upcoming'
  };
}

// Local File Cache helpers
export function loadLocalCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[YouTube Service] Error reading cache file:', e);
  }
  return [];
}

export function saveLocalCache(videos) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(videos, null, 2), 'utf-8');
  } catch (e) {
    console.error('[YouTube Service] Error writing cache file:', e);
  }
}

// ============================================================================
// CORE SYNCHRONIZATION ENGINE
// ============================================================================

export async function syncYouTubeChannel(triggerSource = 'manual', userToken = null) {
  const startTime = Date.now();
  console.log(`\n================================================================`);
  console.log(`[YouTube Sync Started] Trigger: ${triggerSource} | Time: ${new Date().toISOString()}`);
  console.log(`Channel: @EdTechraBitz (${VERIFIED_CHANNEL_ID})`);
  console.log(`================================================================`);

  const activeSupabase = getServerSupabaseClient(userToken);

  // If manual trigger with userToken, verify caller is indeed an administrator
  if (triggerSource === 'manual' && userToken && activeSupabase) {
    try {
      const { data: { user }, error: userErr } = await activeSupabase.auth.getUser(userToken);
      if (userErr || !user) {
        throw new Error('Authentication required: Invalid or expired administrator session.');
      }
      const { data: profile, error: profileErr } = await activeSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr || profile?.role !== 'admin') {
        throw new Error('Access Denied: Administrator privilege required to synchronize channel.');
      }
      console.log(`[YouTube Sync] Authenticated admin request: ${user.email} (${user.id})`);
    } catch (authError) {
      console.error('[YouTube Sync Auth Error]:', authError.message);
      return {
        success: false,
        message: authError.message,
        count: loadLocalCache().length,
        newCount: 0,
        upcomingCount: 0,
        error: authError.message
      };
    }
  }

  if (!YOUTUBE_API_KEY) {
    const errorMsg = 'YOUTUBE_API_KEY is not configured on server.';
    console.warn(`[YouTube Sync Warning] ${errorMsg} Using local cache.`);
    saveSyncStatus({ lastSyncStatus: 'error', lastError: errorMsg, syncTrigger: triggerSource });
    return {
      success: false,
      message: errorMsg,
      count: loadLocalCache().length,
      newCount: 0,
      upcomingCount: 0
    };
  }

  try {
    saveSyncStatus({ lastSyncStatus: 'in_progress', syncTrigger: triggerSource });

    // 1. Fetch all playlist items from YouTube Data API v3
    let allPlaylistItems = [];
    let pageToken = '';

    while (true) {
      const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${VERIFIED_UPLOADS_PLAYLIST_ID}&maxResults=50${pageParam}&key=${YOUTUBE_API_KEY}`;
      const playlistRes = await fetch(playlistUrl);
      const playlistData = await playlistRes.json();

      if (playlistData.error) {
        throw new Error(`YouTube API Error: ${playlistData.error.message || JSON.stringify(playlistData.error)}`);
      }

      if (!playlistData.items || playlistData.items.length === 0) break;
      allPlaylistItems = allPlaylistItems.concat(playlistData.items);

      if (!playlistData.nextPageToken) break;
      pageToken = playlistData.nextPageToken;
    }

    console.log(`[YouTube Sync] Found ${allPlaylistItems.length} total videos in channel upload playlist.`);

    if (allPlaylistItems.length === 0) {
      saveSyncStatus({ lastSyncStatus: 'success', lastError: null });
      return { success: true, message: 'No videos found in channel playlist.', count: 0, newCount: 0, upcomingCount: 0 };
    }

    // 2. Fetch Video Details in batches of 50
    let allVideoDetails = [];
    for (let i = 0; i < allPlaylistItems.length; i += 50) {
      const batch = allPlaylistItems.slice(i, i + 50);
      const videoIds = batch.map(it => it.contentDetails.videoId).join(',');
      
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      const videosRes = await fetch(videosUrl);
      const videosData = await videosRes.json();

      if (videosData.items) {
        allVideoDetails = allVideoDetails.concat(videosData.items);
      }
    }

    console.log(`[YouTube Sync] Retrieved details for ${allVideoDetails.length} videos.`);

    // 3. Load Existing Videos from Supabase to prevent overwriting existing content
    const existingDbMap = new Map();
    if (activeSupabase) {
      const { data: dbVideos } = await activeSupabase
        .from('youtube_videos')
        .select(`id, youtube_video_id, title, thumbnail_url, category, difficulty, status, youtube_learning_content(*)`);

      if (dbVideos) {
        dbVideos.forEach(v => {
          existingDbMap.set(v.youtube_video_id, v);
        });
      }
    }

    const localCache = loadLocalCache();
    const localCacheMap = new Map(localCache.map(v => [v.youtube_video_id, v]));

    // 4. Process videos and classify as new vs existing
    const newVideosToInsert = [];
    const newContentToInsert = [];
    let existingSkippedCount = 0;
    let upcomingCount = 0;
    const finalCacheList = [];

    allVideoDetails.forEach((item, index) => {
      const vidId = item.id;
      const durationSeconds = parseDuration(item.contentDetails?.duration);
      const isShort = durationSeconds <= 180 || item.snippet.title.includes('#Shorts') || item.snippet.description.includes('#Shorts');
      const category = detectCategory(item.snippet.title, item.snippet.description);
      const thumb = item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;

      const isExistingInDb = existingDbMap.has(vidId);
      const dbRecord = existingDbMap.get(vidId);
      const localRecord = localCacheMap.get(vidId);

      if (isExistingInDb) {
        existingSkippedCount++;
        // Preserve existing database record and existing learning content
        const existingContent = dbRecord?.youtube_learning_content || localRecord?.learning_content;
        const currentContentObj = Array.isArray(existingContent) ? existingContent[0] : existingContent;
        const currentStatus = currentContentObj?.status || dbRecord?.status || 'published';

        if (currentStatus === 'upcoming') {
          upcomingCount++;
        }

        finalCacheList.push({
          id: dbRecord?.id || vidId,
          youtube_video_id: vidId,
          channel_id: item.snippet.channelId || VERIFIED_CHANNEL_ID,
          title: dbRecord?.title || cleanTitle(item.snippet.title),
          description: item.snippet.description || dbRecord?.description || '',
          thumbnail_url: dbRecord?.thumbnail_url || localRecord?.thumbnail_url || thumb,
          youtube_url: `https://www.youtube.com/watch?v=${vidId}`,
          published_at: item.snippet.publishedAt,
          duration_seconds: durationSeconds,
          duration_formatted: formatDuration(durationSeconds),
          is_short: isShort,
          view_count: parseInt(item.statistics?.viewCount || '0', 10),
          like_count: parseInt(item.statistics?.likeCount || '0', 10),
          category: dbRecord?.category || category,
          difficulty: dbRecord?.difficulty || (index % 3 === 0 ? 'Beginner' : (index % 3 === 1 ? 'Intermediate' : 'Advanced')),
          status: currentStatus,
          learning_content: currentContentObj
        });
      } else {
        // NEW VIDEO DETECTED (or missing in Supabase) -> Status MUST be "upcoming" (Rule 8)
        console.log(`[YouTube Sync] ⭐ NEW Video Ingestion: "${cleanTitle(item.snippet.title)}" (ID: ${vidId}) -> Setting status='upcoming'`);
        upcomingCount++;

        const newVideoObj = {
          youtube_video_id: vidId,
          channel_id: item.snippet.channelId || VERIFIED_CHANNEL_ID,
          title: cleanTitle(item.snippet.title),
          description: item.snippet.description || '',
          thumbnail_url: thumb,
          youtube_url: `https://www.youtube.com/watch?v=${vidId}`,
          published_at: item.snippet.publishedAt,
          duration_seconds: durationSeconds,
          is_short: isShort,
          view_count: parseInt(item.statistics?.viewCount || '0', 10),
          like_count: parseInt(item.statistics?.likeCount || '0', 10),
          category: category,
          difficulty: index % 3 === 0 ? 'Beginner' : (index % 3 === 1 ? 'Intermediate' : 'Advanced'),
          status: 'upcoming',
          updated_at: new Date().toISOString()
        };

        const newContentObj = generateUpcomingEducationalContent(newVideoObj);

        newVideosToInsert.push(newVideoObj);
        newContentToInsert.push(newContentObj);

        finalCacheList.push({
          ...newVideoObj,
          id: vidId,
          duration_formatted: formatDuration(durationSeconds),
          learning_content: newContentObj
        });
      }
    });

    console.log(`[YouTube Sync] Summary:`);
    console.log(`• New videos to insert into Supabase: ${newVideosToInsert.length}`);
    console.log(`• Existing database videos preserved: ${existingSkippedCount}`);
    console.log(`• Total videos in channel: ${allVideoDetails.length}`);

    // 5. Ingest any new videos into Supabase (if Supabase is available)
    if (activeSupabase && newVideosToInsert.length > 0) {
      console.log(`[YouTube Sync] Ingesting ${newVideosToInsert.length} new records into Supabase...`);
      
      const { error: vInsertErr } = await activeSupabase
        .from('youtube_videos')
        .upsert(newVideosToInsert, { onConflict: 'youtube_video_id' });

      if (vInsertErr) {
        console.error('[YouTube Sync Error] Failed to insert new videos into youtube_videos:', vInsertErr.message);
        throw new Error(`Database error on youtube_videos: ${vInsertErr.message}`);
      } else {
        console.log(`✓ Inserted ${newVideosToInsert.length} new records into public.youtube_videos with status='upcoming'.`);
      }

      const { error: cInsertErr } = await activeSupabase
        .from('youtube_learning_content')
        .upsert(newContentToInsert, { onConflict: 'youtube_video_id' });

      if (cInsertErr) {
        console.error('[YouTube Sync Error] Failed to insert new learning content:', cInsertErr.message);
        throw new Error(`Database error on youtube_learning_content: ${cInsertErr.message}`);
      } else {
        console.log(`✓ Inserted ${newContentToInsert.length} new learning records into public.youtube_learning_content with status='upcoming'.`);
      }
    }

    // 6. Save updated cache to disk (preserving local backup)
    saveLocalCache(finalCacheList);

    const durationMs = Date.now() - startTime;
    console.log(`[YouTube Sync Completed] in ${durationMs}ms. Status: healthy.`);
    console.log(`================================================================\n`);

    saveSyncStatus({
      lastSyncStatus: 'success',
      totalVideos: finalCacheList.length,
      upcomingVideos: upcomingCount,
      lastError: null,
      newVideosAddedLastSync: newVideosToInsert.length,
      syncTrigger: triggerSource
    });

    return {
      success: true,
      message: `Synchronized ${finalCacheList.length} Shorts from @EdTechraBitz. (${newVideosToInsert.length} new upcoming added, ${existingSkippedCount} existing preserved)`,
      count: finalCacheList.length,
      newCount: newVideosToInsert.length,
      upcomingCount: upcomingCount,
      stats: getSyncStatus()
    };
  } catch (error) {
    console.error('[YouTube Sync Error]:', error);
    saveSyncStatus({
      lastSyncStatus: 'error',
      lastError: error.message || 'Unknown synchronization error',
      syncTrigger: triggerSource
    });

    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      count: loadLocalCache().length,
      newCount: 0,
      upcomingCount: 0,
      error: error.message
    };
  }
}

// Fallback loader
export async function getCachedOrFetchShorts() {
  const cached = loadLocalCache();
  if (cached && cached.length >= 100) {
    return cached;
  }
  return await syncYouTubeChannel('startup');
}
