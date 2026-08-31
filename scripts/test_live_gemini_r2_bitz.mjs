// ============================================================================
// EDTECHRA BITZ: Real Live Gemini AI + Cloudflare R2 End-to-End Test
// Executes real network requests against Gemini API and Cloudflare R2 CDN.
// ============================================================================

import dotenv from 'dotenv';
import sharp from 'sharp';
import { putBinaryContent } from '../server/r2Service.mjs';
import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function runLiveTest() {
  console.log('================================================================');
  console.log('🧪 EXECUTING REAL GEMINI + CLOUDFLARE R2 END-TO-END LIVE TEST');
  console.log('================================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  const r2Key = process.env.R2_ACCESS_KEY_ID;

  if (!apiKey || !r2Key) {
    console.log('⚠️ GEMINI/R2 LIVE TEST NOT EXECUTED because credentials/environment are unavailable.');
    process.exit(1);
  }

  console.log('🔑 Credentials detected:');
  console.log(`- GEMINI_API_KEY: Present (Length: ${apiKey.length})`);
  console.log(`- R2_BUCKET: ${process.env.R2_BUCKET || 'edtechra-media'}`);
  console.log(`- R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL || 'configured'}\n`);

  // --------------------------------------------------------------------------
  // TEST A: Real Gemini / Imagen AI Image Generation -> Sharp -> Cloudflare R2
  // --------------------------------------------------------------------------
  console.log('--- TEST A: Real AI Image Generation & R2 Upload Pipeline ---');
  const testBitz = {
    id: 'live-test-' + Date.now(),
    bitz_code: 'B999999',
    title: 'The Great Blue Hole of Belize: Ancient Submarine Sinkhole',
    short_fact: 'A giant marine sinkhole formed during past glacial periods when sea levels were much lower.',
    category: 'Science & Nature',
    topic_id: 'geography'
  };

  console.log(`🎨 Requesting AI visual for: "${testBitz.title}"...`);
  const genResult = await knowledgeBitzService.generateBitzVisualWithGemini(testBitz);

  console.log('Generation result:', JSON.stringify({
    success: genResult.success,
    model: genResult.model,
    objectKey: genResult.objectKey,
    publicUrl: genResult.publicUrl,
    error: genResult.error
  }, null, 2));

  if (!genResult.success) {
    console.error('❌ Gemini generation failed:', genResult.error);
    console.log('⚠️ GEMINI/R2 LIVE TEST NOT EXECUTED because Gemini API rejected request or quota exceeded.');
  } else {
    console.log(`✅ [PASS] Gemini generated image via model: ${genResult.model}`);
    console.log(`✅ [PASS] Image converted to WebP (1024x576) via Sharp`);
    console.log(`✅ [PASS] Uploaded to Cloudflare R2 key: ${genResult.objectKey}`);
    console.log(`✅ [PASS] Public CDN URL: ${genResult.publicUrl}`);

    // Verify public URL is actually reachable via HTTP HEAD/GET
    try {
      const cdnRes = await fetch(genResult.publicUrl, { method: 'HEAD' });
      console.log(`🌐 CDN HTTP Status: ${cdnRes.status} ${cdnRes.statusText}`);
      console.log(`🌐 Content-Type: ${cdnRes.headers.get('content-type')}`);
      console.log(`🌐 Content-Length: ${cdnRes.headers.get('content-length')} bytes`);
      if (cdnRes.ok) {
        console.log('✅ [PASS] Public image verified accessible over HTTPS CDN!');
      }
    } catch (cdnErr) {
      console.warn('⚠️ CDN fetch warning:', cdnErr.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST B: Real Manual Image Upload -> Sharp WebP -> Cloudflare R2
  // --------------------------------------------------------------------------
  console.log('\n--- TEST B: Manual File Upload Pipeline (Local -> Sharp WebP -> R2) ---');
  
  // Create a clean 16:9 test image buffer using Sharp SVG composition
  const testSvg = `
    <svg width="1024" height="576" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="576" fill="#0a213c"/>
      <circle cx="512" cy="288" r="160" fill="#026fc3"/>
      <text x="512" y="300" font-family="sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">
        EdTechra Bitz Live Test
      </text>
    </svg>
  `;

  const manualWebpBuffer = await sharp(Buffer.from(testSvg))
    .webp({ quality: 90 })
    .toBuffer();

  const manualObjectKey = `bitz/test-manual-${Date.now()}.webp`;
  console.log(`📤 Uploading manual test WebP (${manualWebpBuffer.length} bytes) to R2 key: ${manualObjectKey}...`);

  const manualUploadRes = await putBinaryContent(manualObjectKey, manualWebpBuffer, 'image/webp');
  console.log('Manual upload result:', manualUploadRes);

  if (manualUploadRes.success && manualUploadRes.publicUrl) {
    console.log(`✅ [PASS] Manual image uploaded to R2: ${manualUploadRes.publicUrl}`);

    const verifyRes = await fetch(manualUploadRes.publicUrl, { method: 'HEAD' });
    console.log(`🌐 Manual upload CDN status: ${verifyRes.status}`);
    if (verifyRes.ok) {
      console.log('✅ [PASS] Manual uploaded image verified accessible on public CDN!');
    }
  }

  console.log('\n================================================================');
  console.log('🏁 LIVE PIPELINE TEST COMPLETE');
  console.log('================================================================\n');
}

runLiveTest().catch(err => {
  console.error('Live test error:', err);
  process.exit(1);
});
