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
const anonKey = cleanEnv(process.env.VITE_SUPABASE_ANON_KEY);

console.log('Testing anon key query on student_posts...');
console.log('Supabase URL:', supabaseUrl ? 'OK' : 'MISSING');
console.log('Anon Key:', anonKey ? 'OK' : 'MISSING');

if (!supabaseUrl || !anonKey) {
  console.log('Missing anon credentials');
  process.exit(1);
}

const anonSupabase = createClient(supabaseUrl, anonKey);

async function testAnon() {
  try {
    const { data, error, count } = await anonSupabase
      .from('student_posts')
      .select('id, caption, status, created_at, profiles(id, full_name, role)', { count: 'exact' })
      .eq('status', 'approved')
      .limit(5);
    
    console.log('Anon query result:');
    console.log('  Count:', count);
    console.log('  Rows returned:', data?.length);
    console.log('  Error:', error?.message || 'NONE');
    if (data && data.length > 0) {
      console.log('  Sample post:', JSON.stringify(data[0], null, 2));
    }
  } catch (e) {
    console.error('Anon query exception:', e);
  }
}

testAnon();
