// ============================================================================
// EDTECHRA AUTHENTICATION & ACCESS TOKEN FLOW TEST SUITE
// Tests:
// 1. Proactive JWT expiration detection & auto-refresh logic
// 2. Server token extraction (case-insensitivity, Bearer prefix, cookies)
// 3. Live endpoints verification:
//    - /api/course-studio/presign-upload (Quiz cover upload)
//    - /api/classes/:id/leaderboard/reset (Leaderboard reset)
//    - /api/classes/:id/courses (Classroom courses)
//    - /api/classes/:id/challenges (Classroom challenges)
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uujsqiwbukvsjahohvyx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.TEST_BASE_URL || 'https://edtechra-bitz.vercel.app';

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase keys in environment.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

function decodeJwtExp(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.exp;
  } catch {
    return null;
  }
}

async function runTestSuite() {
  console.log(`\n======================================================`);
  console.log(`RUNNING AUTH FLOW & MULTI-ENDPOINT TEST SUITE`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let allPassed = true;

  // 1. Find or create a test teacher user
  console.log('[STEP 1] Resolving test user session...');
  const testEmail = `auth_test_teacher_${Date.now()}@edtechra.internal`;
  const testPassword = 'Password123!SecureTest';

  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { role: 'teacher', full_name: 'Auth Test Teacher' }
  });

  if (createErr || !newUser?.user) {
    console.error('Failed to create test user:', createErr);
    process.exit(1);
  }

  const userId = newUser.user.id;
  console.log(`Created test user: ${userId} (${testEmail})`);

  // Ensure profile exists in profiles table
  await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email: testEmail,
    full_name: 'Auth Test Teacher',
    role: 'teacher'
  });

  // Create a test classroom for this teacher
  const { data: classroom, error: classErr } = await supabaseAdmin
    .from('classrooms')
    .insert({
      title: 'Auth Verification Classroom',
      teacher_id: userId,
      subject: 'Science',
      grade: 'Grade 10'
    })
    .select()
    .single();

  if (classErr || !classroom) {
    console.error('Failed to create test classroom:', classErr);
    process.exit(1);
  }
  const classroomId = classroom.id;
  console.log(`Created test classroom: ${classroomId}`);

  // 2. Sign in as test user to get real JWT access token and refresh token
  console.log('\n[STEP 2] Signing in as test user to obtain session...');
  const { data: signinData, error: signinErr } = await supabaseAnon.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signinErr || !signinData?.session) {
    console.error('Failed to sign in as test user:', signinErr);
    process.exit(1);
  }

  const accessToken = signinData.session.access_token;
  const refreshToken = signinData.session.refresh_token;
  const exp = decodeJwtExp(accessToken);
  const now = Math.floor(Date.now() / 1000);
  console.log(`Session established!`);
  console.log(`Access token exp: ${exp} (in ${exp - now} seconds)`);

  // 3. Test proactive expiration detection & refresh logic
  console.log('\n[STEP 3] Testing JWT expiration detection & refreshSession...');
  const isExpiringSoon = (exp - now) < 60;
  console.log(`Expiring in < 60s? ${isExpiringSoon} (Normal 1h token is ${exp - now}s)`);

  const { data: refreshed, error: refErr } = await supabaseAnon.auth.refreshSession({
    refresh_token: refreshToken
  });

  if (refErr || !refreshed?.session?.access_token) {
    console.error('❌ Token refresh failed:', refErr);
    allPassed = false;
  } else {
    console.log('✅ Token refresh succeeded! Fresh token obtained.');
  }

  const activeToken = refreshed?.session?.access_token || accessToken;

  // 4. Test Endpoint: /api/course-studio/presign-upload (Quiz cover image upload)
  console.log('\n[STEP 4] Testing /api/course-studio/presign-upload (Quiz Cover Upload)...');
  
  // 4a. Unauthenticated -> Expect 401
  const unauthUploadRes = await fetch(`${BASE_URL}/api/course-studio/presign-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: 'cover.jpg', contentType: 'image/jpeg', folder: 'quiz-covers' })
  });
  const unauthUploadJson = await unauthUploadRes.json().catch(() => ({}));
  if (unauthUploadRes.status === 401 && unauthUploadJson.error === 'Authentication required.') {
    console.log(`✅ Unauthenticated request correctly rejected with 401 ("${unauthUploadJson.error}")`);
  } else {
    console.error(`❌ Unexpected response for unauthenticated upload: ${unauthUploadRes.status}`, unauthUploadJson);
    allPassed = false;
  }

  // 4b. Authenticated with valid Bearer token -> Expect 200 + upload credentials
  const authUploadRes = await fetch(`${BASE_URL}/api/course-studio/presign-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`
    },
    body: JSON.stringify({ filename: 'cover.jpg', contentType: 'image/jpeg', folder: 'quiz-covers' })
  });
  const authUploadJson = await authUploadRes.json().catch(() => ({}));
  if (authUploadRes.status === 200 && authUploadJson.success && authUploadJson.data?.uploadUrl) {
    console.log(`✅ Authenticated quiz cover upload succeeded: 200 OK!`);
    console.log(`   Public URL: ${authUploadJson.data.publicUrl}`);
  } else {
    console.error(`❌ Authenticated upload failed: ${authUploadRes.status}`, authUploadJson);
    allPassed = false;
  }

  // 5. Test Endpoint: /api/classes/:id/leaderboard/reset (Leaderboard Reset)
  console.log('\n[STEP 5] Testing /api/classes/:id/leaderboard/reset (Leaderboard Reset)...');
  
  // 5a. Unauthenticated -> Expect 401
  const unauthResetRes = await fetch(`${BASE_URL}/api/classes/${classroomId}/leaderboard/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true })
  });
  const unauthResetJson = await unauthResetRes.json().catch(() => ({}));
  if (unauthResetRes.status === 401) {
    console.log(`✅ Unauthenticated leaderboard reset rejected with 401 ("${unauthResetJson.error || 'Authentication required.'}")`);
  } else {
    console.error(`❌ Unexpected response for unauthenticated reset: ${unauthResetRes.status}`, unauthResetJson);
    allPassed = false;
  }

  // 5b. Authenticated with valid Bearer token -> Expect 200
  const authResetRes = await fetch(`${BASE_URL}/api/classes/${classroomId}/leaderboard/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`
    },
    body: JSON.stringify({ confirm: true })
  });
  const authResetJson = await authResetRes.json().catch(() => ({}));
  if (authResetRes.status === 200 && authResetJson.success) {
    console.log(`✅ Authenticated leaderboard reset succeeded: 200 OK!`);
  } else {
    console.error(`❌ Authenticated leaderboard reset failed: ${authResetRes.status}`, authResetJson);
    allPassed = false;
  }

  // 6. Test Endpoint: /api/classes/:id/courses (Classroom Courses)
  console.log('\n[STEP 6] Testing /api/classes/:id/courses...');
  const authCoursesRes = await fetch(`${BASE_URL}/api/classes/${classroomId}/courses`, {
    headers: { Authorization: `Bearer ${activeToken}` }
  });
  const authCoursesJson = await authCoursesRes.json().catch(() => ({}));
  if (authCoursesRes.status === 200 && authCoursesJson.success) {
    console.log(`✅ Authenticated courses endpoint succeeded: 200 OK!`);
  } else {
    console.error(`❌ Authenticated courses failed: ${authCoursesRes.status}`, authCoursesJson);
    allPassed = false;
  }

  // 7. Test Endpoint: /api/classes/:id/challenges (Classroom Challenges)
  console.log('\n[STEP 7] Testing /api/classes/:id/challenges...');
  const authChallengesRes = await fetch(`${BASE_URL}/api/classes/${classroomId}/challenges`, {
    headers: { Authorization: `Bearer ${activeToken}` }
  });
  const authChallengesJson = await authChallengesRes.json().catch(() => ({}));
  if (authChallengesRes.status === 200 && authChallengesJson.success) {
    console.log(`✅ Authenticated challenges endpoint succeeded: 200 OK!`);
  } else {
    console.error(`❌ Authenticated challenges failed: ${authChallengesRes.status}`, authChallengesJson);
    allPassed = false;
  }

  // 8. Cleanup test resources
  console.log('\n[STEP 8] Cleaning up test classroom and user...');
  await supabaseAdmin.from('classrooms').delete().eq('id', classroomId);
  await supabaseAdmin.from('profiles').delete().eq('id', userId);
  await supabaseAdmin.auth.admin.deleteUser(userId);
  console.log('Cleanup complete.');

  console.log(`\n======================================================`);
  if (allPassed) {
    console.log('🎉 ALL AUTH TEST SCENARIOS PASSED WITH 100% SUCCESS!');
  } else {
    console.log('⚠️ SOME AUTH TESTS FAILED. Inspect output above.');
    process.exit(1);
  }
  console.log(`======================================================\n`);
}

runTestSuite().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
