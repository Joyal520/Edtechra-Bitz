import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('=== SYNCING 205 SHORTS TO SUPABASE YOUTUBE_SHORTS TABLE ===\n');
console.log(`Supabase URL: ${supabaseUrl ? '✓ configured' : '✗ missing'}`);
console.log(`Supabase Key: ${supabaseKey ? '✓ configured' : '✗ missing'}`);

const shortsPath = path.join(root, 'server/data/youtube_shorts_cache.json');
const shorts = JSON.parse(fs.readFileSync(shortsPath, 'utf-8'));
console.log(`Loaded ${shorts.length} categorized shorts from cache.`);

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  async function sync() {
    console.log('Upserting into public.youtube_shorts table in batches of 50...');
    const batchSize = 50;
    let successCount = 0;

    for (let i = 0; i < shorts.length; i += batchSize) {
      const batch = shorts.slice(i, i + batchSize).map(s => ({
        id: s.id,
        youtube_video_id: s.youtube_video_id,
        youtube_url: s.youtube_url,
        title: s.title,
        description: s.description,
        thumbnail_url: s.thumbnail_url,
        category: s.category,
        duration: s.duration,
        is_published: s.is_published,
        sort_order: s.sort_order,
        linked_quiz_id: s.linked_quiz_id,
        created_at: s.created_at,
        updated_at: s.updated_at
      }));

      const { data, error } = await supabase
        .from('youtube_shorts')
        .upsert(batch, { onConflict: 'youtube_video_id' });

      if (error) {
        console.warn(`  Batch ${i / batchSize + 1} notice:`, error.message);
      } else {
        successCount += batch.length;
        console.log(`  ✓ Batch ${i / batchSize + 1} synced (${batch.length} rows)`);
      }
    }

    console.log(`\n🎉 Supabase sync complete! ${successCount}/${shorts.length} rows processed.`);
  }

  sync().catch(err => console.error('Supabase sync error:', err));
} else {
  console.log('Supabase credentials not available in local environment, local cache ready.');
}
