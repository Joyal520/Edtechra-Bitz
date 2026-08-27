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
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.VITE_SUPABASE_ANON_KEY);

console.log('Connecting to Supabase:', supabaseUrl ? 'URL OK' : 'NO URL', supabaseKey ? 'KEY OK' : 'NO KEY');

if (!supabaseUrl || !supabaseKey) {
  console.log('Cannot initialize Supabase client - missing URL or Key in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    // 1. Count all student_posts
    const { count, error: countErr } = await supabase
      .from('student_posts')
      .select('*', { count: 'exact', head: true });
    
    console.log('Total student_posts in DB:', count, 'Error:', countErr?.message);

    // 2. Fetch all student_posts rows with all fields
    const { data: allPosts, error: fetchErr } = await supabase
      .from('student_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (fetchErr) {
      console.log('Error fetching all posts:', fetchErr.message);
    } else {
      console.log(`Fetched ${allPosts?.length || 0} posts from student_posts table`);
      
      const statusCounts = {};
      const moderationCounts = {};
      allPosts?.forEach(p => {
        const s = p.status ?? 'NULL';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
        const m = p.moderation_status ?? 'NULL';
        moderationCounts[m] = (moderationCounts[m] || 0) + 1;
      });
      console.log('Status breakdown:', JSON.stringify(statusCounts, null, 2));
      console.log('Moderation status breakdown:', JSON.stringify(moderationCounts, null, 2));

      allPosts?.slice(0, 10).forEach((p, idx) => {
        console.log(`\n[Post ${idx + 1}]`);
        console.log(`  id: ${p.id}`);
        console.log(`  user_id: ${p.user_id}`);
        console.log(`  caption: ${p.caption}`);
        console.log(`  status: ${p.status}`);
        console.log(`  moderation_status: ${p.moderation_status}`);
        console.log(`  image_url: ${p.image_url}`);
        console.log(`  created_at: ${p.created_at}`);
        console.log(`  likes_count: ${p.likes_count}`);
        console.log(`  xp_awarded: ${p.xp_awarded}`);
      });
    }

    // 3. Test profiles relationship query (the one used in GET /api/posts)
    const { data: joinedPosts, error: joinErr } = await supabase
      .from('student_posts')
      .select('*, profiles(id, full_name, email, avatar_url, role)')
      .order('created_at', { ascending: false });
    
    console.log('\nProfiles join test:');
    console.log('  Joined posts returned:', joinedPosts?.length);
    console.log('  Join error:', joinErr?.message);

  } catch (err) {
    console.error('Exception during inspection:', err);
  }
}

inspect();
