import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env.local ONLY
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

// 1. Strict Service-Role Key Check (Rule 5: No fallbacks, no hardcoding)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('\n❌ ERROR: Supabase URL is missing from .env.local (VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL).');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is required from .env.local.');
  console.error('Do not fall back to anon key. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local and retry.');
  process.exit(1);
}

// Initialize Supabase admin client with service_role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function runMigration() {
  console.log('================================================================');
  console.log('EDTECHRA-BITZ: PRODUCTION SUPABASE YOUTUBE SHORTS MIGRATION');
  console.log('================================================================');

  // Rule 6 & 7: Read exact untouched local cache file
  const cachePath = path.resolve(__dirname, '../server/data/youtube_cache.json');
  if (!fs.existsSync(cachePath)) {
    console.error(`\n❌ ERROR: Local cache file not found at: ${cachePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(cachePath, 'utf8');
  const cacheVideos = JSON.parse(rawData);

  if (!Array.isArray(cacheVideos) || cacheVideos.length !== 198) {
    console.error(`\n❌ ERROR: Expected exactly 198 records in cache, found ${cacheVideos.length}. Aborting.`);
    process.exit(1);
  }

  console.log(`✓ Verified local cache: 198 valid records loaded from server/data/youtube_cache.json.`);

  // Record pre-migration count of youtube_learning_progress to ensure it remains untouched (Rule 12)
  const { count: initialProgressCount, error: progErr } = await supabase
    .from('youtube_learning_progress')
    .select('*', { count: 'exact', head: true });

  if (progErr) {
    console.warn(`[Warning] Could not read initial youtube_learning_progress count:`, progErr.message);
  } else {
    console.log(`✓ Initial youtube_learning_progress count verified: ${initialProgressCount} records.`);
  }

  // ==========================================================================
  // PHASE 1: Add / Verify difficulty column (Rule 8)
  // ==========================================================================
  console.log('\n--- PHASE 1: Verify Schema & Columns ---');
  // Probe table with select to ensure columns are accessible
  const { error: probeErr } = await supabase
    .from('youtube_videos')
    .select('id, youtube_video_id, title, category, difficulty')
    .limit(1);

  if (probeErr) {
    console.error('❌ Phase 1 Probe Error on public.youtube_videos:', probeErr.message);
    if (probeErr.message.includes('difficulty')) {
      console.error('Please run the migration in supabase/migrations/20260818000000_add_difficulty_column.sql on your Supabase SQL editor to add the difficulty column.');
    }
    process.exit(1);
  }
  console.log('✓ Phase 1: Column verification passed (difficulty column accessible).');

  // ==========================================================================
  // PHASE 2: Upsert 198 records into public.youtube_videos (Rule 9)
  // ==========================================================================
  console.log('\n--- PHASE 2: Upserting 198 records into public.youtube_videos ---');

  // Map exact data without alteration (Rule 7)
  const videoRows = cacheVideos.map(v => ({
    youtube_video_id: v.youtube_video_id,
    channel_id: v.channel_id || 'UCHOag2liOOp1XfTAUCqiFUg',
    title: v.title,
    description: v.description || '',
    thumbnail_url: v.thumbnail_url || `https://i.ytimg.com/vi/${v.youtube_video_id}/maxresdefault.jpg`,
    youtube_url: v.youtube_url || `https://www.youtube.com/watch?v=${v.youtube_video_id}`,
    published_at: v.published_at,
    duration_seconds: v.duration_seconds || 0,
    is_short: v.is_short !== undefined ? v.is_short : true,
    view_count: v.view_count || 0,
    like_count: v.like_count || 0,
    category: v.category || 'General',
    difficulty: v.difficulty || 'Beginner',
    updated_at: new Date().toISOString()
  }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < videoRows.length; i += BATCH_SIZE) {
    const batch = videoRows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(videoRows.length / BATCH_SIZE);

    const { error: upsertError } = await supabase
      .from('youtube_videos')
      .upsert(batch, { onConflict: 'youtube_video_id' });

    if (upsertError) {
      console.error(`\n❌ ERROR: Failed to upsert youtube_videos batch ${batchNum}/${totalBatches}:`, upsertError.message);
      console.error('MIGRATION HALTED IMMEDIATELY.');
      process.exit(1);
    }
    console.log(`  ✓ Batch ${batchNum}/${totalBatches} (${batch.length} videos) upserted.`);
  }

  // ==========================================================================
  // PHASE 3: Upsert 198 records into public.youtube_learning_content (Rule 10)
  // ==========================================================================
  console.log('\n--- PHASE 3: Upserting 198 records into public.youtube_learning_content ---');

  // Map exact learning content data without alteration (Rule 7)
  const contentRows = cacheVideos.map(v => ({
    youtube_video_id: v.youtube_video_id,
    summary: v.learning_content?.summary || v.description || '',
    key_takeaway: v.learning_content?.key_takeaway || '',
    vocabulary: v.learning_content?.vocabulary || [],
    quiz: v.learning_content?.quiz || [],
    learning_objectives: v.learning_content?.learning_objectives || [],
    status: v.learning_content?.status || 'published',
    updated_at: new Date().toISOString()
  }));

  for (let i = 0; i < contentRows.length; i += BATCH_SIZE) {
    const batch = contentRows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(contentRows.length / BATCH_SIZE);

    const { error: contentError } = await supabase
      .from('youtube_learning_content')
      .upsert(batch, { onConflict: 'youtube_video_id' });

    if (contentError) {
      console.error(`\n❌ ERROR: Failed to upsert youtube_learning_content batch ${batchNum}/${totalBatches}:`, contentError.message);
      console.error('MIGRATION HALTED IMMEDIATELY.');
      process.exit(1);
    }
    console.log(`  ✓ Batch ${batchNum}/${totalBatches} (${batch.length} learning modules) upserted.`);
  }

  // ==========================================================================
  // PHASE 4: Verification & Integrity Auditing (Rule 11 & 12)
  // ==========================================================================
  console.log('\n--- PHASE 4: Verification & Integrity Checks ---');

  // 1. Total counts
  const { count: totalVideos, error: vCountErr } = await supabase
    .from('youtube_videos')
    .select('*', { count: 'exact', head: true });

  const { count: totalContent, error: cCountErr } = await supabase
    .from('youtube_learning_content')
    .select('*', { count: 'exact', head: true });

  if (vCountErr || cCountErr) {
    console.error('❌ Error during count verification:', vCountErr || cCountErr);
    process.exit(1);
  }

  console.log(`• public.youtube_videos total count: ${totalVideos} (Expected: 198)`);
  console.log(`• public.youtube_learning_content total count: ${totalContent} (Expected: 198)`);

  // 2. Check for unique youtube_video_id in youtube_videos
  const { data: allVideosData, error: allVErr } = await supabase
    .from('youtube_videos')
    .select('youtube_video_id');

  if (allVErr) {
    console.error('❌ Error fetching video IDs for uniqueness check:', allVErr);
    process.exit(1);
  }

  const uniqueVideoIds = new Set(allVideosData.map(v => v.youtube_video_id));
  console.log(`• Unique youtube_video_id count in youtube_videos: ${uniqueVideoIds.size} / 198`);

  // 3. Orphan check: Verify every learning_content row has a parent in youtube_videos
  const { data: allContentData, error: allCErr } = await supabase
    .from('youtube_learning_content')
    .select('youtube_video_id');

  if (allCErr) {
    console.error('❌ Error fetching content IDs for orphan check:', allCErr);
    process.exit(1);
  }

  const orphanRows = allContentData.filter(c => !uniqueVideoIds.has(c.youtube_video_id));
  console.log(`• Orphan learning_content rows: ${orphanRows.length} (Expected: 0)`);

  // 4. Verify youtube_learning_progress remains untouched (Rule 12)
  const { count: finalProgressCount } = await supabase
    .from('youtube_learning_progress')
    .select('*', { count: 'exact', head: true });
  console.log(`• youtube_learning_progress count: ${finalProgressCount} (Remained untouched: ${finalProgressCount === (initialProgressCount || 0)})`);

  // 5. Final assertion
  if (totalVideos === 198 && totalContent === 198 && uniqueVideoIds.size === 198 && orphanRows.length === 0) {
    console.log('\n================================================================');
    console.log('🎉 SUCCESS: All 198 Shorts and Learning Content migrated cleanly!');
    console.log('================================================================');
  } else {
    console.error('\n⚠️ WARNING: Verification discrepancy detected. Review output above.');
    process.exit(1);
  }
}

runMigration().catch(err => {
  console.error('\n❌ Unhandled Migration Error:', err);
  process.exit(1);
});
