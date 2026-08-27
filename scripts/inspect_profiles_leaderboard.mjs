import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(rootDir, '.env.local') });
dotenv.config({ path: path.resolve(rootDir, '.env') });

function cleanEnv(value) {
  return (value || '').replace(/^\uFEFF/, '').trim();
}

const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.VITE_SUPABASE_ANON_KEY);

const supabase = createClient(supabaseUrl, serviceKey);

async function inspectProfilesAndLeaderboard() {
  console.log('=== Inspecting Profiles Table ===');
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at');

  if (pErr) {
    console.error('Error fetching profiles:', pErr.message);
  } else {
    console.log(`Total profiles: ${profiles?.length}`);
    const roles = {};
    profiles?.forEach(p => {
      const r = p.role ?? 'NULL';
      roles[r] = (roles[r] || 0) + 1;
    });
    console.log('Role distribution in profiles:', JSON.stringify(roles, null, 2));
    profiles?.forEach(p => {
      console.log(`  id=${p.id} role=${p.role} name=${p.full_name} email=${p.email}`);
    });
  }

  console.log('\n=== Testing get_top_learners RPC for all periods ===');
  for (const period of ['today', 'week', 'month', 'all_time']) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_top_learners', {
      p_period: period,
      p_current_user_id: null
    });
    console.log(`Period [${period}]:`, 'Error:', rpcErr?.message || 'NONE', 'Top10 count:', rpcData?.top10?.length || 0);
    if (rpcData?.top10?.length > 0) {
      console.log('  Top entry:', JSON.stringify(rpcData.top10[0]));
    }
  }

  console.log('\n=== Checking Topic Progress Endpoint / Tables ===');
  const [readings, quizzes, reorders, scrambles, flips, videos] = await Promise.all([
    supabase.from('readings').select('id, category, is_published'),
    supabase.from('quiz_bits').select('id, category, is_published'),
    supabase.from('reorder_activities').select('id, category, is_published'),
    supabase.from('spelling_scrambles').select('id, category, is_published'),
    supabase.from('spelling_flip_cards').select('id, category, is_published'),
    supabase.from('youtube_videos').select('id, category, status')
  ]);

  console.log('Readings count:', readings.data?.length, 'error:', readings.error?.message);
  console.log('Quizzes count:', quizzes.data?.length, 'error:', quizzes.error?.message);
  console.log('Reorders count:', reorders.data?.length, 'error:', reorders.error?.message);
  console.log('Scrambles count:', scrambles.data?.length, 'error:', scrambles.error?.message);
  console.log('Flips count:', flips.data?.length, 'error:', flips.error?.message);
  console.log('Videos count:', videos.data?.length, 'error:', videos.error?.message);
}

inspectProfilesAndLeaderboard();
