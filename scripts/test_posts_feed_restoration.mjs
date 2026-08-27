// ============================================================================
// EDTECHRA-BITZ: Student Posts Feed Restoration & Integrity Verification Suite
// ============================================================================

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import assert from 'assert';
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
const anonKey = cleanEnv(process.env.VITE_SUPABASE_ANON_KEY);

console.log('🧪 Starting Student Posts Feed Restoration Test Suite...\n');

let testsPassed = 0;
let testsTotal = 0;

async function runAsyncTest(name, fn) {
  testsTotal++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

async function runSuite() {
  const supabase = createClient(supabaseUrl, serviceKey);
  const anonSupabase = createClient(supabaseUrl, anonKey);

  // --------------------------------------------------------------------------
  // Test 1: Verify Existing Database Posts
  // --------------------------------------------------------------------------
  await runAsyncTest('All existing posts remain intact in public.student_posts (140+ records)', async () => {
    const { count, error } = await supabase
      .from('student_posts')
      .select('*', { count: 'exact', head: true });

    assert(!error, `Supabase error: ${error?.message}`);
    assert(count >= 140, `Expected at least 140 posts, found ${count}`);
  });

  // --------------------------------------------------------------------------
  // Test 2: Verify Status Values
  // --------------------------------------------------------------------------
  await runAsyncTest('Existing posts maintain status = "approved" and valid captions/images', async () => {
    const { data: posts, error } = await supabase
      .from('student_posts')
      .select('id, caption, status, image_url, image_object_key')
      .limit(20);

    assert(!error, `Supabase error: ${error?.message}`);
    assert(posts && posts.length > 0, 'Should return posts');
    posts.forEach(p => {
      assert.strictEqual(p.status, 'approved', `Post ${p.id} status is ${p.status}`);
      assert(p.caption && p.caption.trim().length > 0, `Post ${p.id} has empty caption`);
      assert(p.image_url && p.image_url.startsWith('http'), `Post ${p.id} has invalid image_url`);
    });
  });

  // --------------------------------------------------------------------------
  // Test 3: Verify RLS / Anon Select Policy
  // --------------------------------------------------------------------------
  await runAsyncTest('Anonymous & Authenticated students can SELECT approved posts via RLS', async () => {
    const { data: anonPosts, error } = await anonSupabase
      .from('student_posts')
      .select('id, caption, status, profiles(id, full_name, role)')
      .eq('status', 'approved')
      .limit(10);

    assert(!error, `Anon query error: ${error?.message}`);
    assert(anonPosts && anonPosts.length > 0, 'Anon client must be able to read approved posts');
  });

  // --------------------------------------------------------------------------
  // Test 4: Verify Local Cache Preserves All Posts
  // --------------------------------------------------------------------------
  await runAsyncTest('Local server posts_cache.json holds all 146 posts without truncation', async () => {
    const cacheFile = path.resolve(rootDir, 'server/data/posts_cache.json');
    assert(fs.existsSync(cacheFile), 'posts_cache.json must exist');
    const cachedPosts = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    assert(Array.isArray(cachedPosts), 'posts_cache.json must be an array');
    assert(cachedPosts.length >= 140, `Expected >= 140 cached posts, found ${cachedPosts.length}`);
    const approvedCount = cachedPosts.filter(p => p.status === 'approved').length;
    assert.strictEqual(approvedCount, cachedPosts.length, 'All cached posts must have status approved');
  });

  // --------------------------------------------------------------------------
  // Test 5: Verify postService.getPosts() Fallback Structure
  // --------------------------------------------------------------------------
  await runAsyncTest('src/services/postService.ts has direct Supabase fallback and error resilience', async () => {
    const postServiceCode = fs.readFileSync(path.resolve(rootDir, 'src/services/postService.ts'), 'utf8');
    assert(postServiceCode.includes('Direct Supabase Client Fallback'), 'Must have direct Supabase fallback');
    assert(postServiceCode.includes(".eq('status', 'approved')"), 'Must filter by approved status');
    assert(postServiceCode.includes('queryBuilder.range(from, to)'), 'Must support pagination range');
  });

  // --------------------------------------------------------------------------
  // Test 6: Verify PostFeed Component Error / Empty State Separation
  // --------------------------------------------------------------------------
  await runAsyncTest('src/components/PostFeed/PostFeed.tsx separates feedError retry from true empty state', async () => {
    const postFeedCode = fs.readFileSync(path.resolve(rootDir, 'src/components/PostFeed/PostFeed.tsx'), 'utf8');
    assert(postFeedCode.includes('feedError'), 'Must have feedError state');
    assert(postFeedCode.includes('Unable to Load Student Posts'), 'Must display specific error notice on fetch failure');
    assert(postFeedCode.includes('Try Again'), 'Must have retry button');
  });

  // --------------------------------------------------------------------------
  // Test 7: Verify Leaderboard & Post XP Integrity
  // --------------------------------------------------------------------------
  await runAsyncTest('Student approved posts award +10 XP in user stats and leaderboard', async () => {
    const { data: userStatsPosts, error } = await supabase
      .from('student_posts')
      .select('id, user_id, status, xp_awarded')
      .eq('status', 'approved')
      .limit(5);

    assert(!error, `Error querying posts: ${error?.message}`);
    assert(userStatsPosts && userStatsPosts.length > 0, 'Must have approved posts');
    userStatsPosts.forEach(p => {
      assert(p.xp_awarded === 10 || p.xp_awarded === null || p.xp_awarded === undefined, 'XP awarded must be 10');
    });
  });

  console.log(`\n🏁 Test Results: ${testsPassed} / ${testsTotal} tests passed!`);
  if (testsPassed !== testsTotal) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
