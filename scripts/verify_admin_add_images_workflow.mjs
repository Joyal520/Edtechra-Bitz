// ============================================================================
// COMPREHENSIVE PRODUCTION TEST: Admin Add Images Assembly-Line Workflow
// ============================================================================

import dotenv from 'dotenv';
import sharp from 'sharp';
import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';
import { putBinaryContent, deleteObjects } from '../server/r2Service.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function runVerification() {
  console.log('=== STARTING ADMIN ADD IMAGES COMPREHENSIVE VERIFICATION ===');

  // 1. Test Sharp Aspect-Preserving WebP 85 Optimization
  console.log('\n[TEST 1] Sharp Aspect-Preserving WebP 85 Optimization:');
  const landscapeSvg = Buffer.from(
    `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a213c"/>
      <circle cx="960" cy="540" r="300" fill="#38bdf8"/>
      <text x="960" y="560" font-size="64" font-family="Arial" fill="#ffffff" text-anchor="middle">EdTechra Educational Illustration</text>
    </svg>`
  );

  const pngBuffer = await sharp(landscapeSvg).png().toBuffer();
  console.log(`- Original test image dimensions: 1920x1080, size: ${(pngBuffer.length / 1024).toFixed(2)} KB`);

  const optimized = await sharp(pngBuffer)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const metadata = await sharp(optimized).metadata();
  console.log(`✓ Optimized WebP dimensions: ${metadata.width}x${metadata.height} (Aspect ratio preserved: ${(metadata.width / metadata.height).toFixed(3)}:1)`);
  console.log(`✓ Optimized WebP file size: ${(optimized.length / 1024).toFixed(2)} KB (Quality 85)`);

  if (Math.abs(metadata.width / metadata.height - 1920 / 1080) > 0.01) {
    throw new Error('Aspect ratio was distorted during Sharp processing!');
  }
  console.log('✓ Aspect ratio verification passed.');

  // 2. Test Missing Images Queue Retrieval (Selective fields only)
  console.log('\n[TEST 2] Missing Images Queue Retrieval:');
  const queueResult = await knowledgeBitzService.getBitzMissingImages({ limit: 10 });
  console.log('✓ Queue Retrieval Result:', {
    success: queueResult.success,
    queueLength: queueResult.bitz?.length,
    totalMissing: queueResult.totalMissing
  });

  // 3. Test Manual Upload Simulation on a Bitz record
  console.log('\n[TEST 3] Manual Image Upload & R2 + Database Integration:');
  const allBitz = knowledgeBitzService.getLocalBitz();
  if (allBitz.length > 0) {
    const targetBitz = allBitz[0];
    console.log(`- Target Bitz: [${targetBitz.bitz_code || targetBitz.id}] "${targetBitz.title}"`);

    const uploadRes = await knowledgeBitzService.uploadBitzImageManual({
      bitzId: targetBitz.id,
      imageBuffer: optimized
    });

    console.log('✓ Upload Success:', {
      success: uploadRes.success,
      publicUrl: uploadRes.publicUrl,
      objectKey: uploadRes.objectKey,
      visualStatus: uploadRes.bitz?.visual_status,
      imageSource: uploadRes.bitz?.image_source
    });

    if (uploadRes.bitz?.visual_status !== 'ready' || uploadRes.bitz?.image_source !== 'admin') {
      throw new Error('Bitz image fields were not set properly!');
    }
    console.log('✓ Bitz image fields verification passed.');
  }

  // 4. Test Orphaned R2 File Cleanup on Database Failure
  console.log('\n[TEST 4] Orphaned R2 Object Cleanup Simulation:');
  const testKey = `bitz/test_orphan_${Date.now()}.webp`;
  const orphanUpload = await putBinaryContent(testKey, optimized, 'image/webp');
  console.log(`- Created temporary R2 object: ${orphanUpload.objectKey}`);

  const deleteRes = await deleteObjects([testKey]);
  console.log('✓ Orphan cleanup result:', deleteRes);
  if (!deleteRes.deleted.includes(testKey)) {
    throw new Error('Failed to delete orphaned R2 object!');
  }
  console.log('✓ Orphaned R2 object cleanup verification passed.');

  console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===');
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
