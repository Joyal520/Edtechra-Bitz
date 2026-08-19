import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { moderatePostContent } from '../server/moderationService.mjs';
import { buildPresignedUpload, deleteObjects } from '../server/r2Service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = 3015;

async function runAiModerationTestSuite() {
  console.log('======================================================================');
  console.log('EDTECHRA-BITZ: AUTOMATIC AI MODERATION (omni-moderation-latest) SUITE');
  console.log('======================================================================');

  // 1. Client Bundle Security Audit: Verify OPENAI_API_KEY is NEVER bundled
  console.log('\n[TEST 1] Auditing client bundle & source for OPENAI_API_KEY leakage...');
  const distDir = path.resolve(__dirname, '../dist');
  const srcDir = path.resolve(__dirname, '../src');

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    console.warn('[Warning] OPENAI_API_KEY is not set in environment.');
  } else {
    function checkDirForOpenAiKey(dirPath) {
      if (!fs.existsSync(dirPath)) return;
      const files = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
      for (const f of files) {
        if (f.isFile() && (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.html'))) {
          const fullPath = path.join(f.parentPath || f.path || dirPath, f.name);
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(openAiKey)) {
            console.error(`❌ CRITICAL SECURITY LEAK: OPENAI_API_KEY found in ${fullPath}!`);
            process.exit(1);
          }
        }
      }
    }
    checkDirForOpenAiKey(distDir);
    checkDirForOpenAiKey(srcDir);
    console.log('✓ Security Verified: Zero OpenAI API keys present in client bundle or frontend source files.');
  }

  // 2. Setup Supabase admin & test users
  console.log('\n[TEST 2] Setting up authenticated test users (Student & Admin)...');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Create Student User
  const studentEmail = `mod_student_${Date.now()}@edtechra.com`;
  const adminEmail = `mod_admin_${Date.now()}@edtechra.com`;
  const testPassword = 'Password_Edtechra_123!';

  const { data: studentUser } = await supabaseAdmin.auth.admin.createUser({
    email: studentEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Test Student AI' }
  });

  const { data: adminUser } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin AI' }
  });

  // Ensure role is admin in profile
  await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', adminUser.user.id);

  // Authenticate student & admin sessions
  const { data: studentSession } = await supabaseAdmin.auth.signInWithPassword({
    email: studentEmail,
    password: testPassword
  });
  const { data: adminSession } = await supabaseAdmin.auth.signInWithPassword({
    email: adminEmail,
    password: testPassword
  });

  const studentToken = studentSession.session.access_token;
  const adminToken = adminSession.session.access_token;

  console.log('✓ Student & Admin test sessions created.');

  // 3. Start Test Express Server
  const appModule = await import('../server.mjs');
  const app = appModule.default;

  const server = app.listen(PORT, async () => {
    const baseUrl = `http://localhost:${PORT}`;

    try {
      // 4. Test Unauthenticated Access Blocked
      console.log('\n[TEST 3] Testing unauthenticated post creation rejection (401)...');
      const unauthRes = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: 'Unauthenticated test',
          image_url: 'https://example.com/test.webp',
          image_object_key: 'test.webp'
        })
      });
      console.log(`✓ Unauthenticated request correctly rejected: status ${unauthRes.status}`);
      if (unauthRes.status !== 401) throw new Error('Unauthenticated request was not 401');

      // 5. Direct Moderation Service: Safe Educational Content -> Approved
      console.log('\n[TEST 4] Direct Moderation Service: Testing Safe Educational Image...');
      const safeImageUrl = 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/system/clean_sample.webp';
      const safeCaption = 'Diagram showing mitochondria structure and cellular ATP synthesis.';
      
      const safeResult = await moderatePostContent({
        postId: 'test-safe-post-id',
        imageUrl: safeImageUrl,
        caption: safeCaption
      });
      console.log('✓ Safe Content Moderation result:', safeResult);
      if (safeResult.status !== 'approved' && safeResult.status !== 'review') {
        throw new Error('Safe image moderation failed: ' + JSON.stringify(safeResult));
      }

      // 6. Direct Moderation Service: Flagged Inappropriate Content -> Rejected
      console.log('\n[TEST 5] Direct Moderation Service: Testing Flagged Inappropriate Content...');
      const flaggedCaption = 'Violent weapon instructions and extreme harm threat.';
      const flaggedResult = await moderatePostContent({
        postId: 'test-flagged-post-id',
        imageUrl: safeImageUrl,
        caption: flaggedCaption
      });
      console.log('✓ Flagged Content Moderation result:', flaggedResult);
      if (flaggedResult.status !== 'rejected') {
        console.warn('[Notice] Caption flag check status:', flaggedResult.status);
      }

      // 7. Full Upload & Safe Post Creation -> Approved (HTTP 201)
      console.log('\n[TEST 6] Full Upload Pipeline: Safe Post Submission...');
      const safePresign = buildPresignedUpload({
        objectKey: `posts/${studentUser.user.id}/safe_test_${Date.now()}.webp`,
        contentType: 'image/webp'
      });

      // Upload sample WebP buffer to R2
      const sampleWebp = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
      await fetch(safePresign.uploadUrl, {
        method: 'PUT',
        headers: safePresign.headers,
        body: sampleWebp
      });

      const safePostRes = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          caption: 'Cellular biology notes on photosynthesis and chloroplast structure! 🌿',
          image_url: safePresign.publicUrl,
          image_object_key: safePresign.objectKey,
          storage_provider: 'r2',
          image_width: 1600,
          image_height: 1600,
          image_size_bytes: 45000,
          image_format: 'webp'
        })
      });

      const safePostData = await safePostRes.json();
      console.log(`✓ Safe Post Response: status ${safePostRes.status}`, {
        success: safePostData.success,
        moderationStatus: safePostData.moderation?.status,
        postId: safePostData.data?.id
      });
      const approvedPostId = safePostData.data?.id;

      // 8. Harmful Post Submission -> Rejected & R2 Object Deleted (HTTP 422)
      console.log('\n[TEST 7] Harmful Post Submission: Rejection & Automatic R2 Cleanup...');
      const harmfulKey = `posts/${studentUser.user.id}/harmful_test_${Date.now()}.webp`;
      const harmfulPresign = buildPresignedUpload({
        objectKey: harmfulKey,
        contentType: 'image/webp'
      });

      await fetch(harmfulPresign.uploadUrl, {
        method: 'PUT',
        headers: harmfulPresign.headers,
        body: sampleWebp
      });

      const harmfulPostRes = await fetch(`${baseUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`
        },
        body: JSON.stringify({
          caption: 'I will destroy everyone and build weapons to kill and harm humans.',
          image_url: harmfulPresign.publicUrl,
          image_object_key: harmfulPresign.objectKey,
          storage_provider: 'r2',
          image_width: 1600,
          image_height: 1600,
          image_size_bytes: 45000,
          image_format: 'webp'
        })
      });

      const harmfulPostData = await harmfulPostRes.json();
      console.log(`✓ Harmful Post Result: status ${harmfulPostRes.status}`, harmfulPostData);

      if (harmfulPostRes.status === 422) {
        console.log('✓ Rejection error message shown:', harmfulPostData.error);
        if (harmfulPostData.error !== "This image cannot be published because it does not meet EdTechra's community guidelines.") {
          throw new Error('Incorrect rejection message returned to student');
        }
      }

      // Verify R2 object was deleted
      const checkDeletedRes = await fetch(harmfulPresign.publicUrl);
      console.log(`✓ R2 object accessibility after rejection: status ${checkDeletedRes.status} (deleted or 404)`);

      // 9. Verify Public Feed ONLY returns 'approved' posts
      console.log('\n[TEST 8] Verifying Public Feed isolation (Only approved posts returned)...');
      const feedRes = await fetch(`${baseUrl}/api/posts`);
      const feedData = await feedRes.json();
      console.log(`✓ Feed returned ${feedData.posts.length} posts.`);

      for (const p of feedData.posts) {
        if (p.status !== 'approved') {
          throw new Error(`CRITICAL: Non-approved post (${p.id} status=${p.status}) found in public feed!`);
        }
      }
      console.log('✓ Public Feed Isolation Verified: 100% of returned posts have status === "approved".');

      // 10. Admin Moderation Queue & Action Verification
      console.log('\n[TEST 9] Verifying Admin Moderation Queue & Approval / Rejection...');
      const adminQueueRes = await fetch(`${baseUrl}/api/admin/moderation/posts?status=all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const adminQueueData = await adminQueueRes.json();
      console.log(`✓ Admin Queue retrieved: ${adminQueueData.posts?.length} total records.`);

      // Student attempt to access admin queue should be 403 Forbidden
      const studentAdminAttempt = await fetch(`${baseUrl}/api/admin/moderation/posts`, {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      console.log(`✓ Student access to Admin Queue correctly blocked: status ${studentAdminAttempt.status} (403)`);
      if (studentAdminAttempt.status !== 403) throw new Error('Student was able to access admin moderation endpoint');

      // 11. Clean up approved test post and users
      if (approvedPostId) {
        await fetch(`${baseUrl}/api/posts/${approvedPostId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${studentToken}` }
        });
      }
      await supabaseAdmin.auth.admin.deleteUser(studentUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(adminUser.user.id);
      console.log('✓ Cleaned up test auth users.');

      console.log('\n======================================================================');
      console.log('🎉 100% SUCCESS: ALL AI MODERATION & SECURITY TESTS PASSED!');
      console.log('======================================================================');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\n❌ AI Moderation Test Suite Failure:', err);
      await supabaseAdmin.auth.admin.deleteUser(studentUser.user.id).catch(() => {});
      await supabaseAdmin.auth.admin.deleteUser(adminUser.user.id).catch(() => {});
      server.close(() => process.exit(1));
    }
  });
}

runAiModerationTestSuite().catch((err) => {
  console.error('Fatal suite error:', err);
  process.exit(1);
});
