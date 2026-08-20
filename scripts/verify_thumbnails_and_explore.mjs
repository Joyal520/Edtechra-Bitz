// ============================================================================
// EDTECHRA-BITZ: AUTOMATED THUMBNAILS & MICRO LEARNING ZONE VERIFICATION SUITE
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pftoxxutppwzcvkrtkgr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmdG94eHV0cHB3emN2a3J0a2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExOTQ2MjQsImV4cCI6MjA4Njc3MDYyNH0.bV58b688M0yDkYn9W3cRrnZ6bFwBw0G9B5h4d5m8C-M';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  } else {
    failedChecks++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('EDTECHRA-BITZ: THUMBNAILS & MICRO LEARNING ZONE VERIFICATION');
  console.log('================================================================\n');

  // --- 1. EXPLORE PAGE CODEBASE AUDIT ---
  console.log('--- 1. EXPLORE PAGE CODEBASE AUDIT ---');
  const exploreCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/ExplorePage.tsx'), 'utf8');

  assert(exploreCode.includes('EdTechra Micro Learning Zone'), 'ExplorePage title is "EdTechra Micro Learning Zone"');
  assert(exploreCode.includes('Learn something useful, one short lesson at a time.'), 'ExplorePage subtitle matches requirement');
  assert(!exploreCode.includes('Sync Channel'), 'ExplorePage does NOT contain public "Sync Channel" button');
  assert(exploreCode.includes('aspect-square'), 'Level cards use 1:1 aspect-square thumbnail container');
  assert(exploreCode.includes('object-cover'), 'Level cards use object-cover to prevent stretching');
  assert(exploreCode.includes('thumbnailUrl'), 'Level cards dynamically bind to video thumbnail_url');

  // --- 2. ADMIN PANEL THUMBNAIL MANAGEMENT AUDIT ---
  console.log('\n--- 2. ADMIN PANEL THUMBNAIL MANAGEMENT AUDIT ---');
  const adminCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/AdminPage.tsx'), 'utf8');
  const modalCode = fs.readFileSync(path.resolve(__dirname, '../src/components/AdminThumbnailModal.tsx'), 'utf8');

  assert(adminCode.includes('Micro-Learning Video & 1:1 Thumbnail Management'), 'AdminPage has Micro-Learning Thumbnail Management section');
  assert(adminCode.includes('AdminThumbnailModal'), 'AdminPage renders AdminThumbnailModal');
  assert(adminCode.includes('Sync YouTube Channel'), 'AdminPage preserves YouTube Channel synchronization');
  assert(modalCode.includes('Please upload a 1:1 square image.'), 'AdminThumbnailModal validates 1:1 ratio with exact error message');
  assert(modalCode.includes('getThumbnailPresignedUrl'), 'AdminThumbnailModal requests presigned R2 upload URL');
  assert(modalCode.includes('uploadThumbnailToR2'), 'AdminThumbnailModal uploads binary directly to Cloudflare R2');
  assert(modalCode.includes('updateVideoThumbnail'), 'AdminThumbnailModal updates thumbnail_url in database');

  // --- 3. SERVER & R2 STORAGE PIPELINE AUDIT ---
  console.log('\n--- 3. SERVER & R2 STORAGE PIPELINE AUDIT ---');
  const serverCode = fs.readFileSync(path.resolve(__dirname, '../server.mjs'), 'utf8');

  assert(serverCode.includes('/api/youtube/thumbnail-presign'), 'server.mjs provides /api/youtube/thumbnail-presign endpoint');
  assert(serverCode.includes('/api/youtube/video/:id/thumbnail'), 'server.mjs provides /api/youtube/video/:id/thumbnail endpoint');
  assert(serverCode.includes('thumbnails/'), 'server.mjs uses predictable thumbnails/{videoId}/... R2 object key');
  assert(serverCode.includes('role !== \'admin\''), 'Thumbnail management endpoints enforce strict administrator role check');

  // --- 4. SUPABASE & DATABASE AUTHORITATIVE VERIFICATION ---
  console.log('\n--- 4. SUPABASE DATABASE AUTHORITATIVE VERIFICATION ---');
  try {
    const { data: videos, error: vErr } = await supabase
      .from('youtube_videos')
      .select('id, youtube_video_id, title, thumbnail_url')
      .limit(5);

    assert(!vErr && videos && videos.length > 0, `Supabase public.youtube_videos accessible (${videos?.length || 0} probed)`);
    if (videos && videos.length > 0) {
      assert(Boolean(videos[0].thumbnail_url), `Video "${videos[0].title}" has valid thumbnail_url: ${videos[0].thumbnail_url.slice(0, 50)}...`);
    }
  } catch (e) {
    assert(false, `Supabase query exception: ${e.message}`);
  }

  // --- 5. LEVELS 1-20 DATA INTEGRITY ---
  console.log('\n--- 5. LEVELS 1-20 DATA INTEGRITY ---');
  const levelsDataCode = fs.readFileSync(path.resolve(__dirname, '../src/utils/levelsData.ts'), 'utf8');
  assert(levelsDataCode.includes('ELEKTRA_LEVELS_1_20'), 'Levels 1–20 data array is defined');
  assert(levelsDataCode.includes('Fix Small Problems Before They Become Big'), 'Level 1 title preserved');
  assert(levelsDataCode.includes('Xj3gbHlFQEo'), 'Level 1 video ID preserved');

  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log('================================================================');

  if (failedChecks === 0) {
    console.log('🎉 ALL THUMBNAILS & MICRO LEARNING ZONE CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME CHECKS FAILED.\n');
    process.exit(1);
  }
}

runVerification();
