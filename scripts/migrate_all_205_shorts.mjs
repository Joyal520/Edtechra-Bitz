import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const VALID_CATEGORIES = [
  'General',
  'Science',
  'Technology',
  'AI',
  'History',
  'Math',
  'English',
  'Space',
  'Nature',
  'Psychology',
  'Life Skills',
  'Geography',
  'Mysteries'
];

export function categorizeShort(title = '', description = '', existingCategory = '') {
  if (existingCategory) {
    const trimmed = existingCategory.trim();
    const match = VALID_CATEGORIES.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (match && match !== 'General') {
      return match;
    }
  }

  const cleanTitle = title.toLowerCase();

  if (
    cleanTitle.includes('chatgpt') ||
    cleanTitle.includes('openai') ||
    cleanTitle.includes('artificial intelligence') ||
    /\bai\b/.test(cleanTitle) ||
    cleanTitle.includes('machine learning') ||
    cleanTitle.includes('deepseek')
  ) {
    return 'AI';
  }

  if (
    cleanTitle.includes('english') ||
    cleanTitle.includes('pronounce') ||
    cleanTitle.includes('grammar') ||
    cleanTitle.includes('vocabulary') ||
    cleanTitle.includes('idiom') ||
    cleanTitle.includes('mispronounced')
  ) {
    return 'English';
  }

  if (
    cleanTitle.includes('space') ||
    cleanTitle.includes('planet') ||
    cleanTitle.includes('moon') ||
    cleanTitle.includes('sun') ||
    cleanTitle.includes('solar system') ||
    cleanTitle.includes('mars') ||
    cleanTitle.includes('jupiter') ||
    cleanTitle.includes('galaxy') ||
    cleanTitle.includes('star') ||
    cleanTitle.includes('black hole')
  ) {
    return 'Space';
  }

  if (
    cleanTitle.includes('ocean') ||
    cleanTitle.includes('country') ||
    cleanTitle.includes('continent') ||
    cleanTitle.includes('desert') ||
    cleanTitle.includes('mountain') ||
    cleanTitle.includes('river') ||
    cleanTitle.includes('japan') ||
    cleanTitle.includes('antarctica') ||
    cleanTitle.includes('geography')
  ) {
    return 'Geography';
  }

  if (
    cleanTitle.includes('math') ||
    cleanTitle.includes('number') ||
    cleanTitle.includes('equation') ||
    cleanTitle.includes('calculate') ||
    cleanTitle.includes('percentage')
  ) {
    return 'Math';
  }

  if (
    cleanTitle.includes('psychology') ||
    cleanTitle.includes('brain') ||
    cleanTitle.includes('memory') ||
    cleanTitle.includes('sleep') ||
    cleanTitle.includes('dream') ||
    cleanTitle.includes('procrastinat') ||
    cleanTitle.includes('habit') ||
    cleanTitle.includes('mind') ||
    cleanTitle.includes('dopamine')
  ) {
    return 'Psychology';
  }

  if (
    cleanTitle.includes('animal') ||
    cleanTitle.includes('octopus') ||
    cleanTitle.includes('shark') ||
    cleanTitle.includes('whale') ||
    cleanTitle.includes('bird') ||
    cleanTitle.includes('tree') ||
    cleanTitle.includes('insect') ||
    cleanTitle.includes('plant') ||
    cleanTitle.includes('creature') ||
    cleanTitle.includes('species') ||
    cleanTitle.includes('rat') ||
    cleanTitle.includes('spider') ||
    cleanTitle.includes('snake') ||
    cleanTitle.includes('chameleon')
  ) {
    return 'Nature';
  }

  if (
    cleanTitle.includes('mystery') ||
    cleanTitle.includes('unsolved') ||
    cleanTitle.includes('secret') ||
    cleanTitle.includes('vanish') ||
    cleanTitle.includes('disappear') ||
    cleanTitle.includes('bermuda')
  ) {
    return 'Mysteries';
  }

  if (
    cleanTitle.includes('history') ||
    cleanTitle.includes('ancient') ||
    cleanTitle.includes('century') ||
    cleanTitle.includes('war') ||
    cleanTitle.includes('empire') ||
    cleanTitle.includes('king') ||
    cleanTitle.includes('queen') ||
    cleanTitle.includes('egypt') ||
    cleanTitle.includes('pyramid')
  ) {
    return 'History';
  }

  if (
    cleanTitle.includes('technology') ||
    cleanTitle.includes('computer') ||
    cleanTitle.includes('internet') ||
    cleanTitle.includes('robot') ||
    cleanTitle.includes('quantum') ||
    cleanTitle.includes('smartphone')
  ) {
    return 'Technology';
  }

  if (
    cleanTitle.includes('health') ||
    cleanTitle.includes('body') ||
    cleanTitle.includes('bone') ||
    cleanTitle.includes('muscle') ||
    cleanTitle.includes('heart') ||
    cleanTitle.includes('teeth') ||
    cleanTitle.includes('eye') ||
    cleanTitle.includes('blood') ||
    cleanTitle.includes('skin')
  ) {
    return 'Life Skills';
  }

  if (
    cleanTitle.includes('science') ||
    cleanTitle.includes('physics') ||
    cleanTitle.includes('chemistry') ||
    cleanTitle.includes('atom') ||
    cleanTitle.includes('gravity') ||
    cleanTitle.includes('temperature') ||
    cleanTitle.includes('sound') ||
    cleanTitle.includes('light')
  ) {
    return 'Science';
  }

  return 'General';
}

// Generate consistent UUID from string
function generateDeterministicUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// Read youtube_cache.json
const cachePath = path.join(root, 'server/data/youtube_cache.json');
const rawItems = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));

console.log(`Found ${rawItems.length} existing shorts in youtube_cache.json`);

const categorizedShorts = rawItems.map((item, index) => {
  const videoId = item.youtube_video_id || item.id;
  const category = categorizeShort(item.title, item.description, item.category);
  const duration = Number(item.duration_seconds) > 0 ? Number(item.duration_seconds) : 30;

  return {
    id: generateDeterministicUUID(`yt_short_${videoId}`),
    youtube_video_id: videoId,
    youtube_url: item.youtube_url || `https://www.youtube.com/shorts/${videoId}`,
    title: item.title,
    description: item.description || '',
    thumbnail_url: item.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    category,
    duration,
    duration_formatted: `${duration}s`,
    is_published: true, // All 205 existing shorts are active and published for the feed!
    sort_order: index,
    linked_quiz_id: null,
    created_by: null,
    created_at: item.published_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
});

// Category stats
const catStats = {};
categorizedShorts.forEach(s => {
  catStats[s.category] = (catStats[s.category] || 0) + 1;
});

console.log('\n--- Category Distribution across all 205 Shorts ---');
console.log(JSON.stringify(catStats, null, 2));

// Save to server/data/youtube_shorts_cache.json
const targetFile = path.join(root, 'server/data/youtube_shorts_cache.json');
fs.writeFileSync(targetFile, JSON.stringify(categorizedShorts, null, 2), 'utf-8');

console.log(`\n✓ Successfully saved all ${categorizedShorts.length} categorized YouTube Shorts to server/data/youtube_shorts_cache.json!`);
