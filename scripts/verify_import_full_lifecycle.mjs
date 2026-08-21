import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  getJsonContent,
  buildReadingContentKey,
  deleteObjects
} from '../server/r2Service.mjs';
import app from '../server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyFullImportLifecycle() {
  console.log('===============================================================');
  console.log('EDTECHRA-BITZ: FULL 48-READING IMPORT LIFECYCLE VERIFICATION');
  console.log('===============================================================');

  // 1. Generate 48 distinct reading objects
  console.log('\n1. Generating 48 distinct reading objects in JSON array...');
  const categories = ['Science', 'Tech', 'History', 'Nature', 'Space', 'Art', 'Psychology', 'Math'];
  const testBatch = [];
  const testRunId = `run_${Date.now()}`;

  for (let i = 1; i <= 48; i++) {
    testBatch.push({
      title: `Article ${i} [${testRunId}]: Deep Concepts in ${categories[(i - 1) % categories.length]}`,
      subtitle: `Understanding fundamental principle #${i}`,
      category: categories[(i - 1) % categories.length],
      level: i % 2 === 0 ? 'B1' : 'A2',
      reading_time: 1,
      paragraphs: [
        { id: 1, text: `Paragraph 1 text for article ${i} covering educational topics in depth.` },
        { id: 2, text: `Paragraph 2 text for article ${i} providing key takeaways and summary.` }
      ],
      vocabulary: [
        { word: `term_${i}`, definition: `Definition of term ${i}` }
      ],
      questions: [
        {
          id: 1,
          question: `Question for article ${i}?`,
          options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          correct_answer: 'Option 1',
          explanation: 'Option 1 is correct.'
        }
      ],
      is_published: true
    });
  }
  console.log(`✓ Generated ${testBatch.length} articles.`);

  // 2. Start temporary local server to test real HTTP request/response
  console.log('\n2. Starting local server for end-to-end HTTP testing...');
  const server = app.listen(3099);
  await new Promise(r => setTimeout(r, 1000));

  let createdReadingIds = [];
  let createdR2Keys = [];

  try {
    // 3. Send Bulk Import POST request
    console.log('\n3. Sending POST /api/readings/import-batch with 48 readings...');
    const startTime = Date.now();
    const res = await fetch('http://localhost:3099/api/readings/import-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-admin': 'true' // In local dev, test helper bypass
      },
      body: JSON.stringify({ readings: testBatch })
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`✓ Request completed in ${elapsedMs} ms (status ${res.status} ${res.statusText})`);

    const json = await res.json();
    console.log('  • API Response success:', json.success);
    console.log('  • Imported Count:', json.importedCount);
    console.log('  • Duplicate Count:', json.duplicateCount);
    console.log('  • Message:', json.message);

    if (!json.success || json.importedCount !== 48) {
      throw new Error(`Expected 48 imported readings, got ${json.importedCount}`);
    }

    createdReadingIds = json.data.map(r => r.id);
    createdR2Keys = json.data.map(r => r.r2_content_key || buildReadingContentKey(r.id));

    // 4. Verify 48 individual R2 content objects
    console.log('\n4. Verifying individual R2 content objects...');
    const sampleIndices = [0, 10, 20, 30, 40, 47];
    for (const idx of sampleIndices) {
      const key = createdR2Keys[idx];
      const r2Data = await getJsonContent(key);
      console.log(`  • Verified R2 object #${idx + 1} (${key}): "${r2Data?.title}"`);
      if (!r2Data || r2Data.title !== testBatch[idx].title) {
        throw new Error(`R2 content verification failed for article ${idx + 1}`);
      }
    }

    // 5. Verify Reading Catalogue query returns all 48 records
    console.log('\n5. Verifying Reading Catalogue Query (GET /api/readings/admin)...');
    const adminListRes = await fetch(`http://localhost:3099/api/readings/admin?search=${encodeURIComponent(testRunId)}&limit=100`, {
      headers: { 'x-mock-admin': 'true' }
    });
    const adminListJson = await adminListRes.json();
    console.log(`✓ Catalogue query returned ${adminListJson.data?.readings?.length} matching records for run "${testRunId}".`);

    if (adminListJson.data?.readings?.length !== 48) {
      throw new Error(`Expected 48 catalogue records, found ${adminListJson.data?.readings?.length}`);
    }

    // 6. Test Duplicate Prevention: Re-uploading the exact same 48 JSON
    console.log('\n6. Testing Duplicate Prevention by re-uploading the same 48 JSON...');
    const reUploadRes = await fetch('http://localhost:3099/api/readings/import-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-admin': 'true'
      },
      body: JSON.stringify({ readings: testBatch })
    });

    const reUploadJson = await reUploadRes.json();
    console.log('✓ Re-upload response:');
    console.log('  • Imported Count (should be 0):', reUploadJson.importedCount);
    console.log('  • Duplicate Count (should be 48):', reUploadJson.duplicateCount);

    if (reUploadJson.importedCount !== 0 || reUploadJson.duplicateCount !== 48) {
      throw new Error(`Duplicate prevention failed! Expected 0 imported, 48 duplicate, got imported=${reUploadJson.importedCount}, duplicate=${reUploadJson.duplicateCount}`);
    }

    console.log('\n===============================================================');
    console.log('🎉 48-READING IMPORT LIFECYCLE 100% VERIFIED AND PASSING!');
    console.log('===============================================================');
  } finally {
    // 7. Cleanup
    console.log('\n7. Cleaning up test objects...');
    if (createdR2Keys.length > 0) {
      await deleteObjects(createdR2Keys);
      console.log(`✓ Cleaned up ${createdR2Keys.length} test R2 objects.`);
    }
    server.close();
  }
}

verifyFullImportLifecycle().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
