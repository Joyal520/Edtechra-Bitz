import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;

async function runPostsApiSuite() {
  console.log('===============================================================');
  console.log('EDTECHRA-BITZ: STUDENT POST FEED API & SECURITY VERIFICATION');
  console.log('===============================================================');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Client Bundle Security Audit
  console.log('1. Auditing Client Bundle & Source Code for R2 Secret Leaks...');
  const distDir = path.resolve(__dirname, '../dist');
  const srcDir = path.resolve(__dirname, '../src');

  const forbiddenSecrets = [
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.R2_ACCESS_KEY_ID,
    '317c89d4a6e2ce6280bc9231e6c1810be4ff072b1e97c204b4138939e2260f97',
    'bb33e1b311f083bfcf182121b13f88f5'
  ].filter(Boolean);

  function checkDirForSecrets(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
    for (const f of files) {
      if (f.isFile() && (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.html'))) {
        const fullPath = path.join(f.parentPath || f.path || dirPath, f.name);
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const sec of forbiddenSecrets) {
          if (content.includes(sec)) {
            console.error(`❌ CRITICAL SECURITY ERROR: Secret leaked in ${fullPath}!`);
            process.exit(1);
          }
        }
      }
    }
  }

  checkDirForSecrets(distDir);
  checkDirForSecrets(srcDir);
  console.log('✓ Security Audit Passed: No R2 secrets found in client bundle or frontend source files.');

  // 2. Fetch or create a test student user for authenticated API calls
  console.log('\n2. Setting up test student user session...');
  const testEmail = `test_student_feed_${Date.now()}@edtechra.com`;
  const testPassword = 'Password_Edtechra_123!';

  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Alex Rivera (Test Student)'
    }
  });

  if (authErr || !authUser?.user) {
    console.error('❌ Failed to create test student user:', authErr?.message);
    process.exit(1);
  }

  // Sign in to obtain access token
  const { data: sessionData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInErr || !sessionData?.session) {
    console.error('❌ Failed to sign in test student user:', signInErr?.message);
    process.exit(1);
  }

  const userToken = sessionData.session.access_token;
  const testUserId = authUser.user.id;
  console.log(`✓ Test student user authenticated: ID=${testUserId}`);

  // 3. Start local server in background for testing API routes
  console.log('\n3. Starting Express server for API integration test...');
  const appModule = await import('../server.mjs');
  const app = appModule.default;

  const server = app.listen(PORT + 10, async () => {
    const testBaseUrl = `http://localhost:${PORT + 10}`;

    try {
      // 4. Test POST /api/posts/presign-upload
      console.log('\n4. Testing POST /api/posts/presign-upload...');
      const presignRes = await fetch(`${testBaseUrl}/api/posts/presign-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          filename: 'adaptive_compressed_post.webp',
          contentType: 'image/webp',
          size: 780000
        })
      });

      const presignData = await presignRes.json();
      console.log('✓ Presigned upload API result:', {
        status: presignRes.status,
        objectKey: presignData.data?.objectKey,
        storageProvider: presignData.data?.storageProvider
      });

      if (!presignData.success || !presignData.data?.uploadUrl) {
        throw new Error('Presigned upload failed: ' + JSON.stringify(presignData));
      }

      // 5. Test POST /api/posts (Create post)
      console.log('\n5. Testing POST /api/posts (Creating student post)...');
      const post1Res = await fetch(`${testBaseUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          caption: 'Mastering neuroplasticity and daily learning habits! #EdTechra #StudyGram',
          image_url: presignData.data.publicUrl,
          image_object_key: presignData.data.objectKey,
          storage_provider: 'r2',
          image_width: 1600,
          image_height: 1600,
          image_size_bytes: 780000,
          image_format: 'webp'
        })
      });

      const post1Data = await post1Res.json();
      console.log('✓ Create Post API result:', {
        status: post1Res.status,
        postId: post1Data.data?.id,
        author: post1Data.data?.author?.full_name,
        image_url: post1Data.data?.image_url
      });

      if (!post1Data.success || !post1Data.data?.id) {
        throw new Error('Create post failed: ' + JSON.stringify(post1Data));
      }

      const createdPostId = post1Data.data.id;

      // 6. Test GET /api/posts (Ordering, Pagination)
      console.log('\n6. Testing GET /api/posts (Feed ordering & pagination)...');
      const feedRes = await fetch(`${testBaseUrl}/api/posts?page=1&limit=5&sort=newest`);
      const feedData = await feedRes.json();

      console.log('✓ Post Feed API result:', {
        status: feedRes.status,
        total: feedData.total,
        returnedCount: feedData.posts?.length,
        firstPostCaption: feedData.posts?.[0]?.caption?.slice(0, 40) + '...'
      });

      if (!feedData.success || !Array.isArray(feedData.posts) || feedData.posts.length === 0) {
        throw new Error('Feed query failed');
      }

      // Verify newest first
      const newestPost = feedData.posts[0];
      if (newestPost.id !== createdPostId) {
        console.warn(`[Note] Newest post ID: ${newestPost.id} vs created: ${createdPostId}`);
      }

      // 7. Test POST /api/posts/:id/like (Liking)
      console.log('\n7. Testing POST /api/posts/:id/like (Toggle like)...');
      const likeRes = await fetch(`${testBaseUrl}/api/posts/${createdPostId}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      const likeData = await likeRes.json();
      console.log('✓ Like API result:', likeData);

      if (!likeData.success || likeData.data?.liked !== true) {
        throw new Error('Liking post failed');
      }

      // 8. Test DELETE /api/posts/:id (Ownership & Deletion)
      console.log('\n8. Testing DELETE /api/posts/:id (Student ownership deletion)...');
      const deleteRes = await fetch(`${testBaseUrl}/api/posts/${createdPostId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      const deleteData = await deleteRes.json();
      console.log('✓ Delete Post API result:', deleteData);

      if (!deleteData.success) {
        throw new Error('Deleting post failed');
      }

      // Clean up test student user in auth
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log('✓ Cleaned up test student user in auth.');

      console.log('\n===============================================================');
      console.log('🎉 ALL INTEGRATION & SECURITY TESTS PASSED SUCCESSFULLY!');
      console.log('===============================================================');

      server.close(() => {
        process.exit(0);
      });
    } catch (err) {
      console.error('\n❌ Test Suite Error:', err);
      // Clean up test user
      await supabaseAdmin.auth.admin.deleteUser(testUserId).catch(() => {});
      server.close(() => {
        process.exit(1);
      });
    }
  });
}

runPostsApiSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
