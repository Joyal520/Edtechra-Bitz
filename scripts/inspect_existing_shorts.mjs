import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('=== INSPECTING EXISTING SHORTS SOURCES ===\n');

// 1. youtube_cache.json
const ytCacheFile = path.join(root, 'server/data/youtube_cache.json');
if (fs.existsSync(ytCacheFile)) {
  const content = JSON.parse(fs.readFileSync(ytCacheFile, 'utf-8'));
  console.log(`1. youtube_cache.json:`);
  console.log(`   - Total items: ${content.length}`);
  const sample = content[0];
  console.log(`   - Sample fields: ${Object.keys(sample).join(', ')}`);
  console.log(`   - Sample video ID: ${sample.youtube_video_id || sample.id}`);
  console.log(`   - Sample title: "${sample.title}"`);
  console.log(`   - Sample category: "${sample.category}"`);
  console.log(`   - Sample status: "${sample.status}"`);
  
  // Category distribution in youtube_cache.json
  const cats = {};
  content.forEach(v => {
    const c = v.category || 'Uncategorized';
    cats[c] = (cats[c] || 0) + 1;
  });
  console.log(`   - Category breakdown:`, JSON.stringify(cats, null, 2));
}

// 2. raw_videos_for_classification.json
const rawFile = path.join(root, 'server/data/raw_videos_for_classification.json');
if (fs.existsSync(rawFile)) {
  const content = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
  console.log(`\n2. raw_videos_for_classification.json:`);
  console.log(`   - Total items: ${content.length}`);
  if (content.length > 0) {
    console.log(`   - Sample title: "${content[0].title}"`);
  }
}

// 3. classification_verified_plan.json
const planFile = path.join(root, 'server/data/classification_verified_plan.json');
if (fs.existsSync(planFile)) {
  const content = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
  console.log(`\n3. classification_verified_plan.json:`);
  console.log(`   - Total items: ${Array.isArray(content) ? content.length : Object.keys(content).length}`);
}

// 4. sync_status.json
const syncFile = path.join(root, 'server/data/sync_status.json');
if (fs.existsSync(syncFile)) {
  const content = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
  console.log(`\n4. sync_status.json:`);
  console.log(`   - Total videos in sync status: ${content.totalVideos}`);
  console.log(`   - Content:`, JSON.stringify(content, null, 2));
}
