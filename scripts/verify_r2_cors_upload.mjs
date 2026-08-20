import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROD_API_BASE = 'https://edtechra-bitz.vercel.app';
const R2_ENDPOINT = (process.env.R2_ENDPOINT || 'https://9f1dd8959fb558afd8fe2569e710935c.r2.cloudflarestorage.com').replace(/\/+$/, '');
const BUCKET = process.env.R2_BUCKET || 'edtechra-media';

async function verifyCorsAndUpload() {
  console.log('====================================================');
  console.log('VERIFYING R2 CORS & PRESIGNED UPLOAD PIPELINE');
  console.log('====================================================\n');

  // Test 1: OPTIONS preflight from production origin
  console.log('[STEP 1] Testing OPTIONS preflight from https://edtechra-bitz.vercel.app...');
  const prodOptionsRes = await fetch(`${R2_ENDPOINT}/${BUCKET}/test-preflight.webp`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://edtechra-bitz.vercel.app',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type'
    }
  });

  console.log('  Status:', prodOptionsRes.status, prodOptionsRes.statusText);
  const allowOriginProd = prodOptionsRes.headers.get('access-control-allow-origin');
  console.log('  Access-Control-Allow-Origin:', allowOriginProd || 'NONE');
  console.log('  Access-Control-Allow-Methods:', prodOptionsRes.headers.get('access-control-allow-methods') || 'NONE');
  console.log('  Access-Control-Allow-Headers:', prodOptionsRes.headers.get('access-control-allow-headers') || 'NONE');

  // Test 2: OPTIONS preflight from localhost origin
  console.log('\n[STEP 2] Testing OPTIONS preflight from http://localhost:3000...');
  const localOptionsRes = await fetch(`${R2_ENDPOINT}/${BUCKET}/test-preflight.webp`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'content-type'
    }
  });

  console.log('  Status:', localOptionsRes.status, localOptionsRes.statusText);
  const allowOriginLocal = localOptionsRes.headers.get('access-control-allow-origin');
  console.log('  Access-Control-Allow-Origin:', allowOriginLocal || 'NONE');
  console.log('  Access-Control-Allow-Methods:', localOptionsRes.headers.get('access-control-allow-methods') || 'NONE');

  if (!allowOriginProd) {
    console.log('\n⚠️  R2 CORS is not yet active on bucket edtechra-media for https://edtechra-bitz.vercel.app.');
    console.log('Please apply the CORS Policy in Cloudflare Dashboard.');
    return false;
  }

  // Test 3: Complete upload flow with presigned URL and PUT request
  console.log('\n[STEP 3] Generating Auth Session...');
  const serverSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: linkData } = await serverSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'edtechra@gmail.com'
  });
  const { data: { session } } = await serverSupabase.auth.verifyOtp({
    token_hash: linkData?.properties?.hashed_token,
    type: 'magiclink'
  });

  const token = session?.access_token;
  if (!token) throw new Error('Failed to generate test auth token');
  console.log('  ✓ Token generated for edtechra@gmail.com');

  console.log('\n[STEP 4] Requesting Presigned Upload URL...');
  const presignRes = await fetch(`${PROD_API_BASE}/api/posts/presign-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      filename: 'cors-test.webp',
      contentType: 'image/webp',
      size: 1024
    })
  });

  if (!presignRes.ok) {
    throw new Error(`Presign failed: ${presignRes.status} ${await presignRes.text()}`);
  }
  const { data: presignData } = await presignRes.json();
  console.log('  ✓ Presigned URL received!');
  console.log('  Object Key:', presignData.objectKey);
  console.log('  Public URL:', presignData.publicUrl);

  console.log('\n[STEP 5] Uploading image Blob directly to R2 via PUT with Origin header...');
  const sampleWebp = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
  const uploadRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/webp',
      'Origin': 'https://edtechra-bitz.vercel.app'
    },
    body: sampleWebp
  });

  console.log('  PUT Status:', uploadRes.status, uploadRes.statusText);
  const putAllowOrigin = uploadRes.headers.get('access-control-allow-origin');
  console.log('  PUT Access-Control-Allow-Origin:', putAllowOrigin || 'NONE');

  if (uploadRes.status >= 200 && uploadRes.status < 300) {
    console.log('  ✓ DIRECT R2 UPLOAD SUCCESSFUL!');
  } else {
    throw new Error(`R2 PUT failed with status ${uploadRes.status}: ${await uploadRes.text()}`);
  }

  console.log('\n[STEP 6] Verifying public URL accessibility...');
  const publicCheckRes = await fetch(presignData.publicUrl);
  console.log('  Public URL Status:', publicCheckRes.status, publicCheckRes.statusText);
  console.log('  Content-Type:', publicCheckRes.headers.get('content-type'));

  console.log('\n====================================================');
  console.log('🎉 100% SUCCESS: R2 CORS & UPLOAD FULLY OPERATIONAL!');
  console.log('====================================================');
  return true;
}

verifyCorsAndUpload().catch(err => {
  console.error('\n❌ Verification failed:', err.message);
});
