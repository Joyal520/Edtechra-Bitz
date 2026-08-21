import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  putJsonContent,
  getJsonContent,
  listObjects,
  getStorageStats,
  testR2Connection,
  buildReadingContentKey,
  deleteObjects
} from '../server/r2Service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verify() {
  console.log('--- 1. Testing R2 Diagnostics ---');
  const diag = await testR2Connection();
  console.log('Diagnostic result:', diag);

  console.log('\n--- 2. Testing Content JSON Put & Get ---');
  const sampleKey = buildReadingContentKey('test-sample-reading');
  const sampleData = {
    title: 'Test Sample Reading',
    paragraphs: [{ id: 1, text: 'Hello Cloudflare R2' }],
    vocabulary: [{ word: 'test', definition: 'a procedure intended to establish quality' }]
  };

  const putResult = await putJsonContent(sampleKey, sampleData);
  console.log('Put result:', putResult);

  const getResult = await getJsonContent(sampleKey);
  console.log('Get result title:', getResult?.title);

  console.log('\n--- 3. Testing Storage Stats ---');
  const stats = await getStorageStats();
  console.log('Storage stats:', stats);

  console.log('\n--- 4. Cleanup ---');
  await deleteObjects([sampleKey]);
  console.log('✓ Cleaned up test key.');
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
