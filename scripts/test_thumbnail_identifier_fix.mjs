import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pftoxxutppwzcvkrtkgr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testThumbnailIdentifierMapping() {
  console.log('--- 1. Probing Level 1 Video in Supabase (public.youtube_videos) ---');
  const level1YtId = 'Xj3gbHlFQEo';
  const { data: initialRecord, error: probeErr } = await supabase
    .from('youtube_videos')
    .select('id, youtube_video_id, title, thumbnail_url')
    .eq('youtube_video_id', level1YtId)
    .maybeSingle();

  if (probeErr || !initialRecord) {
    console.error('❌ Failed to find Level 1 video record:', probeErr);
    return;
  }

  console.log('✓ Found Level 1 Record:');
  console.log('  Database UUID (id):', initialRecord.id);
  console.log('  YouTube Video ID (youtube_video_id):', initialRecord.youtube_video_id);
  console.log('  Title:', initialRecord.title);
  console.log('  Current thumbnail_url:', initialRecord.thumbnail_url);

  // --- 2. Test updating via YouTube Video ID (TEXT) ---
  console.log('\n--- 2. Testing Update via YouTube Video ID (TEXT: "Xj3gbHlFQEo") ---');
  const testUrlYt = 'https://pub-2d88815ca79e49c7b41e39a3f2c5eb24.r2.dev/thumbnails/Xj3gbHlFQEo/test_1.png';

  const isUuid1 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(level1YtId);
  let q1 = supabase.from('youtube_videos').update({
    thumbnail_url: testUrlYt,
    updated_at: new Date().toISOString()
  });
  if (isUuid1) {
    q1 = q1.eq('id', level1YtId);
  } else {
    q1 = q1.eq('youtube_video_id', level1YtId);
  }

  const { data: updated1, error: err1 } = await q1.select('id, youtube_video_id, thumbnail_url');
  if (err1) {
    console.error('❌ Error updating via youtube_video_id:', err1);
    return;
  }
  console.log('✓ Update by youtube_video_id succeeded without UUID syntax error:', updated1);

  // --- 3. Test updating via Database UUID ---
  console.log('\n--- 3. Testing Update via Database UUID ("' + initialRecord.id + '") ---');
  const testUrlUuid = 'https://pub-2d88815ca79e49c7b41e39a3f2c5eb24.r2.dev/thumbnails/Xj3gbHlFQEo/test_2.png';

  const isUuid2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(initialRecord.id);
  let q2 = supabase.from('youtube_videos').update({
    thumbnail_url: testUrlUuid,
    updated_at: new Date().toISOString()
  });
  if (isUuid2) {
    q2 = q2.eq('id', initialRecord.id);
  } else {
    q2 = q2.eq('youtube_video_id', initialRecord.id);
  }

  const { data: updated2, error: err2 } = await q2.select('id, youtube_video_id, thumbnail_url');
  if (err2) {
    console.error('❌ Error updating via UUID id:', err2);
    return;
  }
  console.log('✓ Update by UUID id succeeded:', updated2);

  // --- 4. Revert to original thumbnail ---
  console.log('\n--- 4. Restoring Level 1 thumbnail_url ---');
  const restoreUrl = initialRecord.thumbnail_url || `https://i.ytimg.com/vi/${level1YtId}/maxresdefault.jpg`;
  await supabase
    .from('youtube_videos')
    .update({ thumbnail_url: restoreUrl, updated_at: new Date().toISOString() })
    .eq('youtube_video_id', level1YtId);

  console.log('✓ Reverted Level 1 thumbnail_url to:', restoreUrl);
  console.log('\n🎉 ALL IDENTIFIER MAPPING TESTS PASSED!');
}

testThumbnailIdentifierMapping();
