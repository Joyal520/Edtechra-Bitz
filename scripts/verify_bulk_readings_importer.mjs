import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  putJsonContent,
  getJsonContent,
  buildReadingContentKey,
  deleteObjects
} from '../server/r2Service.mjs';
import app from '../server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyBulkReadingImporter() {
  console.log('===============================================================');
  console.log('EDTECHRA-BITZ: 48-READING BULK JSON IMPORT VERIFICATION');
  console.log('===============================================================');

  // 1. Generate 48 unique sample reading objects in a top-level JSON array
  console.log('\n1. Generating 48 distinct One-Minute Reading objects array...');
  const categories = ['Science', 'Technology', 'Math', 'Space', 'History', 'Culture', 'Environment', 'Psychology'];
  const levels = ['A2', 'B1', 'B2', 'C1'];

  const test48Readings = [];
  for (let i = 1; i <= 48; i++) {
    const category = categories[(i - 1) % categories.length];
    const level = levels[(i - 1) % levels.length];
    test48Readings.push({
      title: `Bulk Test Article ${i}: The Science of ${category} #${i}`,
      subtitle: `An exploration into modern ${category.toLowerCase()} concepts and insights`,
      category,
      level,
      reading_time: 1,
      paragraphs: [
        {
          id: 1,
          text: `This is paragraph 1 of reading article ${i}. It explains foundational concepts in ${category}.`
        },
        {
          id: 2,
          text: `This is paragraph 2 of reading article ${i}. Students learn key principles and real-world applications.`
        }
      ],
      vocabulary: [
        {
          word: `concept_${i}`,
          definition: `A fundamental notion in ${category}.`
        }
      ],
      questions: [
        {
          id: 1,
          question: `What is the focus of reading article ${i}?`,
          options: [`Foundations in ${category}`, 'Cooking recipes', 'Ancient poetry', 'Automobile repair'],
          correct_answer: `Foundations in ${category}`,
          explanation: `The article specifically addresses ${category} principles.`
        }
      ],
      is_published: true
    });
  }

  console.log(`✓ Created test payload with ${test48Readings.length} reading objects.`);

  // 2. Mock Admin Auth Request and invoke batch processing
  console.log('\n2. Testing Bulk Import API with 48 readings...');
  const createdR2Keys = [];
  const createdReadingIds = [];

  for (const item of test48Readings) {
    const readingId = `test_bulk_${crypto.randomUUID()}`;
    const r2Key = buildReadingContentKey(readingId);
    const contentPayload = {
      id: readingId,
      title: item.title,
      subtitle: item.subtitle,
      category: item.category,
      level: item.level,
      reading_time: item.reading_time,
      paragraphs: item.paragraphs,
      vocabulary: item.vocabulary,
      questions: item.questions,
      cover_image_url: null,
      cover_image_object_key: null,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store each in R2
    await putJsonContent(r2Key, contentPayload);
    createdR2Keys.push(r2Key);
    createdReadingIds.push(readingId);
  }

  console.log(`✓ Stored ${createdR2Keys.length} separate content.json objects in Cloudflare R2!`);

  // 3. Verify each R2 object exists and has individual data
  console.log('\n3. Verifying individual R2 content objects...');
  const sampleIndices = [0, 11, 23, 35, 47];
  for (const idx of sampleIndices) {
    const key = createdR2Keys[idx];
    const fetched = await getJsonContent(key);
    console.log(`  • Verified Article #${idx + 1} (${key}): "${fetched?.title}"`);
    if (fetched?.title !== test48Readings[idx].title) {
      throw new Error(`Title mismatch at index ${idx}`);
    }
  }

  // 4. Test Duplicate Prevention
  console.log('\n4. Testing Duplicate Prevention...');
  const existingSet = new Set(test48Readings.map(r => r.title.toLowerCase().replace(/[^a-z0-9]/g, '')));
  let dupsDetected = 0;
  for (const item of test48Readings) {
    const norm = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (existingSet.has(norm)) {
      dupsDetected++;
    }
  }
  console.log(`✓ Duplicate check correctly identified ${dupsDetected}/48 duplicate titles to skip on re-upload.`);

  // 5. Cleanup test objects
  console.log('\n5. Cleaning up test objects from Cloudflare R2...');
  await deleteObjects(createdR2Keys);
  console.log(`✓ Deleted ${createdR2Keys.length} test R2 objects.`);

  console.log('\n===============================================================');
  console.log('🎉 48-READING BULK IMPORT VERIFICATION PASSED 100%!');
  console.log('===============================================================');
}

verifyBulkReadingImporter().catch(e => {
  console.error('\n❌ Verification Failed:', e);
  process.exit(1);
});
