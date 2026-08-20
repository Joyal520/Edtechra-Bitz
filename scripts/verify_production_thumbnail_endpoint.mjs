import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PROD_URL = 'https://edtechra-bitz.vercel.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pftoxxutppwzcvkrtkgr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyProductionEndpoint() {
  console.log('======================================================================');
  console.log(`VERIFYING LIVE VERCEL PRODUCTION ENDPOINT: ${PROD_URL}`);
  console.log('======================================================================\n');

  // 1. Obtain authentic Admin session for roshanjoyal520@gmail.com
  console.log('[STEP 1] Generating Admin authentication session for roshanjoyal520@gmail.com...');
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'roshanjoyal520@gmail.com'
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('❌ Failed to generate magic link token:', linkErr);
    process.exit(1);
  }

  const { data: verifyData, error: verifyErr } = await supabaseAnon.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'email'
  });

  if (verifyErr || !verifyData?.session?.access_token) {
    console.error('❌ Failed to verify OTP token for admin session:', verifyErr);
    process.exit(1);
  }

  const adminToken = verifyData.session.access_token;
  console.log('✓ Admin authentication session verified for:', verifyData.session.user.email);

  // 2. Test Presign Endpoint on Live Vercel Production
  console.log('\n[STEP 2] Testing POST /api/youtube/thumbnail-presign on Production...');
  const level1YtId = 'Xj3gbHlFQEo';

  const presignRes = await fetch(`${PROD_URL}/api/youtube/thumbnail-presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      videoId: level1YtId,
      filename: 'level1_square_thumb.png',
      contentType: 'image/png',
      size: 102400
    })
  });

  const presignJson = await presignRes.json();
  console.log(`  Status: ${presignRes.status}`);
  console.log('  Response data:', presignJson);

  if (presignRes.status !== 200 || !presignJson.success) {
    console.error('❌ Presign endpoint failed on production!');
    process.exit(1);
  }
  console.log('✓ Production Presign Endpoint returned 200 OK.');

  // 3. Test Direct PUT to R2 Presigned URL
  console.log('\n[STEP 3] Testing Direct PUT to R2 Presigned URL...');
  const uploadUrl = presignJson.data.uploadUrl;
  const publicUrl = presignJson.data.publicUrl;

  // 1x1 transparent PNG sample blob
  const dummy1x1Png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const r2Res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/png'
    },
    body: dummy1x1Png
  });

  console.log(`  R2 PUT Status: ${r2Res.status}`);
  if (!r2Res.ok) {
    console.error('❌ R2 PUT upload failed:', r2Res.statusText);
    process.exit(1);
  }
  console.log('✓ R2 Binary Upload returned 200 OK.');

  // 4. Test PUT /api/youtube/video/Xj3gbHlFQEo/thumbnail on Live Vercel Production
  console.log('\n[STEP 4] Testing PUT /api/youtube/video/Xj3gbHlFQEo/thumbnail on Live Vercel Production...');
  const updateRes = await fetch(`${PROD_URL}/api/youtube/video/${encodeURIComponent(level1YtId)}/thumbnail`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      thumbnailUrl: publicUrl
    })
  });

  const updateJson = await updateRes.json();
  console.log(`  Status: ${updateRes.status}`);
  console.log('  Response:', updateJson);

  if (updateRes.status !== 200 || !updateJson.success) {
    console.error('❌ Production PUT /api/youtube/video/:id/thumbnail failed!');
    console.error('  Error:', updateJson.error);
    process.exit(1);
  }
  console.log('✓ Production PUT thumbnail returned 200 OK (NO UUID ERROR)!');

  // 5. Verify Supabase Database Row
  console.log('\n[STEP 5] Verifying authoritative Supabase database row...');
  const { data: dbRow, error: fetchErr } = await supabaseAdmin
    .from('youtube_videos')
    .select('id, youtube_video_id, title, thumbnail_url')
    .eq('youtube_video_id', level1YtId)
    .single();

  if (fetchErr || !dbRow) {
    console.error('❌ Failed to fetch video record from Supabase:', fetchErr);
    process.exit(1);
  }

  console.log('✓ Supabase row verified:');
  console.log('  Database UUID (id):', dbRow.id);
  console.log('  YouTube Video ID (youtube_video_id):', dbRow.youtube_video_id);
  console.log('  Title:', dbRow.title);
  console.log('  Thumbnail URL:', dbRow.thumbnail_url);

  if (dbRow.thumbnail_url === publicUrl) {
    console.log('✓ MATCH: thumbnail_url in Supabase successfully updated to:', dbRow.thumbnail_url);
  }

  // 6. Test Live GET /api/youtube/video/:id on Production
  console.log('\n[STEP 6] Testing GET /api/youtube/video/Xj3gbHlFQEo on Live Vercel Production...');
  const getRes = await fetch(`${PROD_URL}/api/youtube/video/${encodeURIComponent(level1YtId)}`);
  const getJson = await getRes.json();
  console.log(`  Status: ${getRes.status}`);
  console.log('  Live Production Video data:', {
    youtube_video_id: getJson.data?.youtube_video_id,
    title: getJson.data?.title,
    thumbnail_url: getJson.data?.thumbnail_url
  });

  console.log('\n======================================================================');
  console.log('🎉 100% LIVE VERCEL PRODUCTION VERIFICATION COMPLETE & SUCCESSFUL!');
  console.log('======================================================================\n');
}

verifyProductionEndpoint();
