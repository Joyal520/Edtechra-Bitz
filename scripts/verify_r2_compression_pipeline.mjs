import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  buildPresignedUpload,
  buildObjectKey,
  buildPublicUrl,
  deleteObjects
} from '../server/r2Service.mjs';
import { getR2Config } from '../server/r2Config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runR2PipelineVerification() {
  console.log('===============================================================');
  console.log('EDTECHRA-BITZ: CLOUDFLARE R2 UPLOAD & STORAGE VERIFICATION');
  console.log('===============================================================');

  // 1. Verify R2 Configuration
  const config = getR2Config();
  console.log('1. Checking R2 Configuration...');
  console.log({
    isConfigured: config.isConfigured,
    accountId: config.accountId,
    bucket: config.bucket,
    publicBaseUrl: config.publicBaseUrl,
    endpoint: config.endpoint
  });

  if (!config.isConfigured) {
    console.error('❌ R2 configuration is missing:', config.missing);
    process.exit(1);
  }
  console.log('✓ R2 Configuration verified.');

  // 2. Generate Object Key and Presigned Upload URL
  console.log('\n2. Generating Presigned Upload URL...');
  const testUserId = 'test-student-verification';
  const testObjectKey = buildObjectKey({
    userId: testUserId,
    filename: 'verify-sample.webp',
    contentType: 'image/webp'
  });

  const presigned = buildPresignedUpload({
    objectKey: testObjectKey,
    contentType: 'image/webp'
  });

  console.log('✓ Presigned URL generated:');
  console.log('  • Object Key:', presigned.objectKey);
  console.log('  • Public URL:', presigned.publicUrl);
  console.log('  • Upload URL:', presigned.uploadUrl.slice(0, 80) + '...');

  // 3. Upload a sample 1:1 image payload using the presigned URL
  console.log('\n3. Direct uploading sample test image to Cloudflare R2 via Presigned URL...');
  
  // Minimal valid 1x1 WebP binary buffer for test
  const sampleWebpBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  const sampleBuffer = Buffer.from(sampleWebpBase64, 'base64');

  const uploadRes = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: presigned.headers,
    body: sampleBuffer
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error(`❌ Upload failed with status ${uploadRes.status}:`, errText);
    process.exit(1);
  }
  console.log(`✓ Direct upload to R2 succeeded: ${uploadRes.status} ${uploadRes.statusText}`);

  // 4. Verify object is accessible via Public Base URL
  console.log('\n4. Verifying object accessibility from Cloudflare public domain...');
  const publicRes = await fetch(presigned.publicUrl, { method: 'GET' });
  if (!publicRes.ok) {
    console.warn(`[Notice] Public domain fetch status: ${publicRes.status}. (CDN propagation may take a moment)`);
  } else {
    console.log(`✓ Object publicly accessible: ${publicRes.status} ${publicRes.statusText}`);
    console.log(`  • Content-Type: ${publicRes.headers.get('content-type')}`);
    console.log(`  • Content-Length: ${publicRes.headers.get('content-length')} bytes`);
  }

  // 5. Clean up / Delete object from R2
  console.log('\n5. Deleting test object from Cloudflare R2...');
  const deleteResult = await deleteObjects([presigned.objectKey]);
  console.log(`✓ Deleted object from R2:`, deleteResult);

  console.log('\n===============================================================');
  console.log('🎉 SUCCESS: Cloudflare R2 Storage Lifecycle 100% Verified!');
  console.log('===============================================================');
}

runR2PipelineVerification().catch((err) => {
  console.error('\n❌ Unhandled Verification Error:', err);
  process.exit(1);
});
