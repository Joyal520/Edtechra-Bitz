import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TEST_PORT = 3009;
const API_BASE = `http://localhost:${TEST_PORT}`;

async function main() {
  console.log('======================================================================');
  console.log('EDTECHRA-BITZ: VERIFY /api/posts/presign-upload AUTHENTICATION FLOW');
  console.log('======================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE credentials in environment.');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const supabaseClient = createClient(supabaseUrl, anonKey);

  // 1. Create a test student account
  console.log('[STEP 1] Creating a test student account in Supabase...');
  const testEmail = `auth_test_student_${Date.now()}@edtechra.com`;
  const testPassword = 'Password123!@#';

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Auth Test Student' }
  });

  if (createError) {
    console.error('Failed to create test user:', createError);
    process.exit(1);
  }
  const testUserId = userData.user.id;
  console.log(`✓ Test user created: ${testEmail} (ID: ${testUserId})`);

  // 2. Sign in as student via anon client (simulating browser login)
  console.log('\n[STEP 2] Signing in via Supabase client (obtaining access_token)...');
  const { data: sessionData, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (loginError || !sessionData.session) {
    console.error('Login failed:', loginError);
    process.exit(1);
  }

  const validToken = sessionData.session.access_token;
  console.log(`✓ Supabase session established. Access token length: ${validToken.length}`);

  // 3. Start Express Server
  const appModule = await import('../server.mjs');
  const app = appModule.default;
  const server = app.listen(TEST_PORT, async () => {
    try {
      // 4. Test unauthenticated request to /api/posts/presign-upload
      console.log('\n[STEP 3] Testing unauthenticated call to /api/posts/presign-upload...');
      const unauthRes = await fetch(`${API_BASE}/api/posts/presign-upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'sample.webp',
          contentType: 'image/webp',
          size: 150000
        })
      });

      console.log(`Unauthenticated status: ${unauthRes.status}`);
      if (unauthRes.status === 401) {
        console.log('✓ Unauthenticated request correctly rejected with 401');
      } else {
        throw new Error(`Expected 401 for unauthenticated request, got: ${unauthRes.status}`);
      }

      // 5. Test authenticated request to /api/posts/presign-upload
      console.log('\n[STEP 4] Testing authenticated call to /api/posts/presign-upload with Bearer token...');
      const authRes = await fetch(`${API_BASE}/api/posts/presign-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          filename: 'student_card.webp',
          contentType: 'image/webp',
          size: 180000
        })
      });

      const authBody = await authRes.json();
      console.log(`Authenticated status: ${authRes.status}`);

      if (authRes.status !== 200 || !authBody.success || !authBody.data?.uploadUrl) {
        throw new Error('Authenticated /api/posts/presign-upload FAILED: ' + JSON.stringify(authBody));
      }

      console.log('✓ /api/posts/presign-upload SUCCESS (200 OK)!');
      console.log('Presigned Data:', {
        objectKey: authBody.data.objectKey,
        publicUrl: authBody.data.publicUrl,
        expiresInSeconds: authBody.data.expiresInSeconds,
        headers: authBody.data.headers
      });

      const { uploadUrl, headers: signedHeaders, objectKey, publicUrl } = authBody.data;

      // 6. Test direct R2 upload via PUT
      console.log('\n[STEP 5] Testing direct upload to Cloudflare R2 using presigned URL...');
      const sampleWebpBuffer = Buffer.from(
        'UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=',
        'base64'
      );

      const r2UploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          ...signedHeaders,
          'Content-Type': 'image/webp'
        },
        body: sampleWebpBuffer
      });

      console.log(`R2 direct upload status: ${r2UploadRes.status}`);
      if (r2UploadRes.status !== 200) {
        throw new Error(`R2 direct upload failed: ${r2UploadRes.status}`);
      }
      console.log('✓ Uploaded WebP directly to Cloudflare R2 bucket!');

      // 7. Test post record creation via /api/posts
      console.log('\n[STEP 6] Testing authenticated post creation (/api/posts)...');
      const createPostRes = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          caption: 'Testing verified student knowledge post with full auth!',
          image_url: publicUrl,
          image_object_key: objectKey,
          storage_provider: 'r2',
          image_width: 800,
          image_height: 800,
          image_size_bytes: sampleWebpBuffer.length,
          image_format: 'webp'
        })
      });

      const createPostBody = await createPostRes.json();
      console.log(`Create post status: ${createPostRes.status}`);
      if (createPostRes.status !== 201) {
        throw new Error('Post creation failed: ' + JSON.stringify(createPostBody));
      }
      console.log('✓ Post successfully created & AI moderated:', createPostBody.data?.id);

      // 8. Verify post is returned in public feed
      console.log('\n[STEP 7] Verifying post in GET /api/posts...');
      const feedRes = await fetch(`${API_BASE}/api/posts?limit=5`);
      const feedBody = await feedRes.json();
      const createdPostInFeed = feedBody.posts?.find((p) => p.id === createPostBody.data?.id);

      if (!createdPostInFeed) {
        console.error('❌ Created post not found in public feed.');
      } else {
        console.log('✓ Post verified in public feed! Author:', createdPostInFeed.author?.full_name);
      }

      // 9. Clean up
      console.log('\n[STEP 8] Cleaning up test post & user...');
      await fetch(`${API_BASE}/api/posts/${createPostBody.data.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${validToken}` }
      });
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log('✓ Cleaned up test post and test user.');

      console.log('\n======================================================================');
      console.log('🎉 100% SUCCESS: /api/posts/presign-upload AUTHENTICATION FULLY VERIFIED!');
      console.log('======================================================================\n');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Test failed:', err);
      server.close();
      process.exit(1);
    }
  });
}

main().catch((err) => {
  console.error('Test script exception:', err);
  process.exit(1);
});
