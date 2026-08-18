import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedQuery() {
  const targetId = 'SoMXlCd31Yk';
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

  let query = supabase.from('youtube_videos').select('*, youtube_learning_content(*)');
  if (isUuid) {
    query = query.or(`youtube_video_id.eq.${targetId},id.eq.${targetId}`);
  } else {
    query = query.eq('youtube_video_id', targetId);
  }

  const { data, error } = await query.maybeSingle();
  console.log('Fixed query result for', targetId, ':', data ? `FOUND: ${data.title}` : 'NOT FOUND IN DB');
  if (error) console.error('Error:', error);

  const l1Id = 'Xj3gbHlFQEo';
  const { data: l1Data } = await supabase.from('youtube_videos').select('*, youtube_learning_content(*)').eq('youtube_video_id', l1Id).maybeSingle();
  console.log('Fixed query result for Level 1 (Xj3gbHlFQEo):', l1Data ? `FOUND: ${l1Data.title}` : 'NOT FOUND IN DB');
}

testFixedQuery();
