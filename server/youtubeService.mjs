import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local / .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const VERIFIED_CHANNEL_ID = 'UCHOag2liOOp1XfTAUCqiFUg';
const VERIFIED_UPLOADS_PLAYLIST_ID = 'UUHOag2liOOp1XfTAUCqiFUg';

const CACHE_DIR = path.resolve(__dirname, 'data');
const CACHE_FILE = path.resolve(CACHE_DIR, 'youtube_cache.json');

// Supabase server client (if configured)
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
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

// Helper: Categorize video based on title, description & tags
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

// Clean title from hashtag suffixes for clean UI display
export function cleanTitle(title = '') {
  return title
    .replace(/#[\w\d_-]+/g, '')
    .replace(/[#|•\-_]+$/g, '')
    .trim();
}

// Generate structured educational vocabulary and quiz for a Short
export function generateEducationalContent(video) {
  const title = cleanTitle(video.title);
  const category = video.category || detectCategory(video.title, video.description);
  
  const contentMap = {
    'gravity': {
      summary: 'Gravity is the fundamental force of attraction between physical objects. Without Earth’s gravitational force, all atmosphere, water, and objects would be flung into space at extreme speeds.',
      keyTakeaway: 'Gravity keeps our atmosphere and oceans tethered to Earth.',
      vocabulary: [
        { word: 'Gravitational Force', pronunciation: '/ˌɡræv.əˈteɪ.ʃən.əl/', part_of_speech: 'noun', definition: 'The universal force of attraction acting between all matter.', example: 'Gravity pulls objects toward the center of the Earth.' },
        { word: 'Atmospheric Pressure', pronunciation: '/ˌæt.məsˈfer.ɪk/', part_of_speech: 'noun', definition: 'The force exerted by the weight of air molecules on surfaces.', example: 'Without gravity, atmospheric pressure vanishes instantly.' },
        { word: 'Rotational Velocity', pronunciation: '/roʊˈteɪ.ʃən.əl/', part_of_speech: 'noun', definition: 'The speed at which an object spins around its axis.', example: 'Earth spins with high rotational velocity at the equator.' }
      ],
      quiz: [
        { id: 'q1', type: 'mcq', question: 'What prevents Earth\'s atmosphere from drifting into outer space?', options: [{ id: 'a', text: 'Gravitational attraction', isCorrect: true }, { id: 'b', text: 'Cloud layers', isCorrect: false }, { id: 'c', text: 'Magnetic north', isCorrect: false }, { id: 'd', text: 'Cold temperatures', isCorrect: false }], explanation: 'Earth’s gravity pulls air molecules downward, holding the atmosphere in place.' },
        { id: 'q2', type: 'true_false', question: 'True or False: Without gravity, oceans would float gently without moving.', options: [{ id: 'a', text: 'True', isCorrect: false }, { id: 'b', text: 'False', isCorrect: true }], explanation: 'False. Due to Earth\'s 1,000 mph rotation, water and unbound objects would be flung violently.' },
        { id: 'q3', type: 'vocab', question: 'What does "Gravitational Force" mean?', options: [{ id: 'a', text: 'The force attracting all matter together', isCorrect: true }, { id: 'b', text: 'Wind speed during a storm', isCorrect: false }, { id: 'c', text: 'Energy inside sunlight', isCorrect: false }, { id: 'd', text: 'Magnetic repulsion of rocks', isCorrect: false }], explanation: 'Gravitational force is the natural attraction between masses.' }
      ]
    },
    'english': {
      summary: 'English vocabulary and pronunciation often contain rich historical quirks and rules that differentiate native usage and prevent common grammatical misinterpretations.',
      keyTakeaway: 'Understanding the origins of English words clarifies tricky pronunciation and prepositions.',
      vocabulary: [
        { word: 'Etymology', pronunciation: '/ˌet̬.əˈmɑː.lə.dʒi/', part_of_speech: 'noun', definition: 'The study of the origin of words and how their meanings have evolved.', example: 'Etymology explains why silent letters exist in English.' },
        { word: 'Preposition', pronunciation: '/ˌprep.əˈzɪʃ.ən/', part_of_speech: 'noun', definition: 'A word governing a noun or pronoun expressing a relation to another word.', example: 'In English, we say "interested in" rather than "interested on".' },
        { word: 'Pronunciation', pronunciation: '/prəˌnʌn.siˈeɪ.ʃən/', part_of_speech: 'noun', definition: 'The correct way in which a word or language is spoken.', example: 'The word "colonel" has an unusual French and Spanish phonetic history.' }
      ],
      quiz: [
        { id: 'q1', type: 'mcq', question: 'Which preposition is grammatically correct with "interested"?', options: [{ id: 'a', text: 'Interested in', isCorrect: true }, { id: 'b', text: 'Interested on', isCorrect: false }, { id: 'c', text: 'Interested at', isCorrect: false }, { id: 'd', text: 'Interested to', isCorrect: false }], explanation: 'The standard English collocation is "interested in".' },
        { id: 'q2', type: 'true_false', question: 'True or False: English spelling always matches modern phonetic sounds.', options: [{ id: 'a', text: 'True', isCorrect: false }, { id: 'b', text: 'False', isCorrect: true }], explanation: 'False. Many words preserve historical French, Latin, or Old English spellings.' },
        { id: 'q3', type: 'mcq', question: 'Why does "queue" sound identical to the single letter "Q"?', options: [{ id: 'a', text: 'The extra letters were added for French spelling conventions', isCorrect: true }, { id: 'b', text: 'It was a printer typo in the 1800s', isCorrect: false }, { id: 'c', text: 'It originally meant five things', isCorrect: false }, { id: 'd', text: 'It has no historical reason', isCorrect: false }], explanation: '"Queue" originates from the French word for "tail", retaining French orthography.' }
      ]
    },
    'psychology': {
      summary: 'Our daily habits, focus levels, and emotional reactions are heavily shaped by subconscious cognitive biases and neurological feedback loops.',
      keyTakeaway: 'Small consistent daily actions yield compound results over time.',
      vocabulary: [
        { word: 'Dopamine', pronunciation: '/ˈdoʊ.pə.miːn/', part_of_speech: 'noun', definition: 'A neurotransmitter involved in reward, motivation, and habit reinforcement.', example: 'Checking your phone first thing in the morning floods the brain with rapid dopamine.' },
        { word: 'Neuroplasticity', pronunciation: '/ˌnʊr.oʊ.plæsˈtɪs.ə.t̬i/', part_of_speech: 'noun', definition: 'The brain\'s ability to reorganize itself by forming new neural connections.', example: 'You can rewire old habits through conscious daily practice.' },
        { word: 'Cognitive Bias', pronunciation: '/ˈkɑːɡ.nə.t̬ɪv ˈbaɪ.əs/', part_of_speech: 'noun', definition: 'A systematic pattern of deviation from norm or rationality in judgment.', example: 'Procrastination is often driven by present bias.' }
      ],
      quiz: [
        { id: 'q1', type: 'mcq', question: 'How does checking your phone immediately after waking impact your focus?', options: [{ id: 'a', text: 'It puts the brain into reactive mode and impairs deep focus', isCorrect: true }, { id: 'b', text: 'It permanently boosts memory', isCorrect: false }, { id: 'c', text: 'It replaces the need for sleep', isCorrect: false }, { id: 'd', text: 'It has no physiological effect', isCorrect: false }], explanation: 'Morning phone use immediately triggers high-arousal stress and distraction cycles.' },
        { id: 'q2', type: 'true_false', question: 'True or False: Failure is proof of inability rather than feedback.', options: [{ id: 'a', text: 'True', isCorrect: false }, { id: 'b', text: 'False', isCorrect: true }], explanation: 'False. In a growth mindset, failure is valuable diagnostic data for improvement.' },
        { id: 'q3', type: 'mcq', question: 'What principle describes how tiny improvements compound over time?', options: [{ id: 'a', text: 'The Compound Effect / Atomic Habits', isCorrect: true }, { id: 'b', text: 'Instant Gratification Rule', isCorrect: false }, { id: 'c', text: 'The Zero Sum Theorem', isCorrect: false }, { id: 'd', text: 'The Inertia Law', isCorrect: false }], explanation: '1% improvement every day results in a 37x increase over a year.' }
      ]
    }
  };

  let selected = contentMap.gravity;
  if (category === 'English') selected = contentMap.english;
  else if (category === 'Psychology' || category === 'Life Skills') selected = contentMap.psychology;
  else {
    selected = {
      summary: `${title} explores a remarkable scientific insight into how the natural world and human knowledge operate. By examining core mechanisms, we discover why everyday phenomena behave in surprising ways.`,
      keyTakeaway: 'Observing everyday science and nature reveals profound principles of biology and physics.',
      vocabulary: [
        { word: 'Adaptation', pronunciation: '/ˌæd.æpˈteɪ.ʃən/', part_of_speech: 'noun', definition: 'A change by which an organism or species becomes better suited to its environment.', example: 'The unique features of this organism are an evolutionary adaptation.' },
        { word: 'Physiology', pronunciation: '/ˌfɪz.iˈɑː.lə.dʒi/', part_of_speech: 'noun', definition: 'The branch of biology dealing with the normal functions of living organisms and their parts.', example: 'The human body maintains protective physiological barriers continuously.' },
        { word: 'Phenomenon', pronunciation: '/fəˈnɑː.mə.nɑːn/', part_of_speech: 'noun', definition: 'A fact or situation that is observed to exist or happen, especially one whose cause is in question.', example: 'Scientists studied this unusual optical phenomenon under controlled conditions.' }
      ],
      quiz: [
        { id: 'q1', type: 'mcq', question: `What is the core takeaway explained in "${title}"?`, options: [{ id: 'a', text: 'Natural systems exhibit specialized mechanisms to maintain balance and survival', isCorrect: true }, { id: 'b', text: 'The phenomenon has no biological or physical explanation', isCorrect: false }, { id: 'c', text: 'It occurs only under artificial laboratory conditions', isCorrect: false }, { id: 'd', text: 'It was completely debunked in modern times', isCorrect: false }], explanation: 'The video illustrates how scientific principles explain remarkable real-world observations.' },
        { id: 'q2', type: 'true_false', question: 'True or False: Microlearning allows learners to master key ideas in under 2 minutes.', options: [{ id: 'a', text: 'True', isCorrect: true }, { id: 'b', text: 'False', isCorrect: false }], explanation: 'True. Focused micro-lessons boost retention through targeted retrieval practice.' },
        { id: 'q3', type: 'mcq', question: 'What does "Adaptation" mean in biological contexts?', options: [{ id: 'a', text: 'A beneficial trait suited to the environment', isCorrect: true }, { id: 'b', text: 'A random temporary glitch', isCorrect: false }, { id: 'c', text: 'A manufactured material', isCorrect: false }, { id: 'd', text: 'The total absence of change', isCorrect: false }], explanation: 'Adaptation is a characteristic that enhances an organism’s survival.' }
      ]
    };
  }

  return {
    youtube_video_id: video.youtube_video_id,
    summary: selected.summary,
    key_takeaway: selected.keyTakeaway,
    vocabulary: selected.vocabulary,
    quiz: selected.quiz,
    learning_objectives: [
      `Understand the core concept of "${title}"`,
      `Learn 3 essential vocabulary terms`,
      `Pass the 3-question mastery check`
    ],
    status: 'published'
  };
}

// Fetch ALL Channel Videos from YouTube Data API v3 (Full Pagination)
export async function fetchFromYouTubeAPI() {
  if (!YOUTUBE_API_KEY) {
    console.warn('[YouTube Service] YOUTUBE_API_KEY is not set. Using cached data.');
    return loadLocalCache();
  }

  try {
    console.log(`[YouTube Service] Fetching ALL uploads from playlist ${VERIFIED_UPLOADS_PLAYLIST_ID}...`);
    
    // 1. Paginate through all playlist items
    let allPlaylistItems = [];
    let pageToken = '';

    while (true) {
      const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${VERIFIED_UPLOADS_PLAYLIST_ID}&maxResults=50${pageParam}&key=${YOUTUBE_API_KEY}`;
      const playlistRes = await fetch(playlistUrl);
      const playlistData = await playlistRes.json();

      if (!playlistData.items || playlistData.items.length === 0) break;
      allPlaylistItems = allPlaylistItems.concat(playlistData.items);

      if (!playlistData.nextPageToken) break;
      pageToken = playlistData.nextPageToken;
    }

    console.log(`[YouTube Service] Found ${allPlaylistItems.length} total videos in channel.`);

    if (allPlaylistItems.length === 0) {
      return loadLocalCache();
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

    console.log(`[YouTube Service] Retrieved details for ${allVideoDetails.length} videos.`);

    // 3. Process & Identify Shorts
    const existingCache = loadLocalCache();
    const existingMap = new Map(existingCache.map(v => [v.youtube_video_id, v]));

    const processedVideos = allVideoDetails.map((item, index) => {
      const durationSeconds = parseDuration(item.contentDetails?.duration);
      const isShort = durationSeconds <= 180 || item.snippet.title.includes('#Shorts') || item.snippet.description.includes('#Shorts');
      const category = detectCategory(item.snippet.title, item.snippet.description);
      const thumb = item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;

      const videoObj = {
        id: item.id,
        youtube_video_id: item.id,
        channel_id: item.snippet.channelId || VERIFIED_CHANNEL_ID,
        title: cleanTitle(item.snippet.title),
        description: item.snippet.description || '',
        thumbnail_url: thumb,
        youtube_url: `https://www.youtube.com/watch?v=${item.id}`,
        published_at: item.snippet.publishedAt,
        duration_seconds: durationSeconds,
        duration_formatted: formatDuration(durationSeconds),
        is_short: isShort,
        view_count: parseInt(item.statistics?.viewCount || '0', 10),
        like_count: parseInt(item.statistics?.likeCount || '0', 10),
        category: category,
        difficulty: index % 3 === 0 ? 'Beginner' : (index % 3 === 1 ? 'Intermediate' : 'Advanced')
      };

      // Preserve existing custom learning content if present
      const existing = existingMap.get(item.id);
      if (existing?.learning_content && existing.learning_content.vocabulary?.length > 0) {
        videoObj.learning_content = existing.learning_content;
      } else {
        videoObj.learning_content = generateEducationalContent(videoObj);
      }

      return videoObj;
    });

    console.log(`[YouTube Service] Successfully embedded ${processedVideos.length} total @EdTechraBitz Shorts.`);
    
    // Save to local cache file
    saveLocalCache(processedVideos);

    // Save to Supabase in the background if configured
    syncToSupabase(processedVideos).catch(err => console.error('[Supabase Sync Error]:', err.message));

    return processedVideos;
  } catch (error) {
    console.error('[YouTube Service] API Request error:', error);
    return loadLocalCache();
  }
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

// Background sync to Supabase database
async function syncToSupabase(videos) {
  if (!supabase) return;
  try {
    const videoRows = videos.map(v => ({
      youtube_video_id: v.youtube_video_id,
      channel_id: v.channel_id,
      title: v.title,
      description: v.description,
      thumbnail_url: v.thumbnail_url,
      youtube_url: v.youtube_url,
      published_at: v.published_at,
      duration_seconds: v.duration_seconds,
      is_short: v.is_short,
      view_count: v.view_count,
      like_count: v.like_count,
      category: v.category,
      updated_at: new Date().toISOString()
    }));

    const { error: videoError } = await supabase
      .from('youtube_videos')
      .upsert(videoRows, { onConflict: 'youtube_video_id' });

    if (videoError) return;

    const contentRows = videos.map(v => ({
      youtube_video_id: v.youtube_video_id,
      summary: v.learning_content.summary,
      key_takeaway: v.learning_content.key_takeaway,
      vocabulary: v.learning_content.vocabulary,
      quiz: v.learning_content.quiz,
      learning_objectives: v.learning_content.learning_objectives,
      status: v.learning_content.status || 'published',
      updated_at: new Date().toISOString()
    }));

    await supabase
      .from('youtube_learning_content')
      .upsert(contentRows, { onConflict: 'youtube_video_id' });
      
    console.log('[YouTube Service] Synced all metadata to Supabase successfully.');
  } catch (err) {
    // Silently continue
  }
}

// Initialize cache with immediate fetch on startup
export async function getCachedOrFetchShorts() {
  const cached = loadLocalCache();
  if (cached && cached.length >= 100) {
    return cached;
  }
  return await fetchFromYouTubeAPI();
}
