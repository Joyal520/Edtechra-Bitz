import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCache() {
  const { data: dbPosts, error } = await supabase
    .from('student_posts')
    .select('*, profiles(id, full_name, email, avatar_url, role)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error.message);
    return;
  }

  const mappedPosts = dbPosts.map(p => ({
    ...p,
    author: p.profiles || {
      id: p.user_id,
      full_name: 'Student',
      email: '',
      role: 'student'
    }
  }));

  const cacheFile = path.resolve(rootDir, 'server/data/posts_cache.json');
  fs.writeFileSync(cacheFile, JSON.stringify(mappedPosts, null, 2), 'utf-8');
  console.log(`Successfully synced ${mappedPosts.length} posts to ${cacheFile}`);
}

syncCache();
