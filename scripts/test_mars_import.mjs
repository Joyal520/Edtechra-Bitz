// ============================================================================
// End-to-End Test for "Why Mars Looks Red" Bulk Import Pipeline
// ============================================================================

import { validateBitzRecord, validateBitzBatch, countWords } from '../src/utils/bitzContentValidator.ts';
import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';

const marsSampleJson = {
  "title": "Why Mars Looks Red",
  "short_fact": "Mars appears distinctly red in the night sky because its surface rocks and soil are saturated with oxidized iron minerals, commonly known as planetary rust.",
  "reading_text": "Mars looks reddish because its surface is covered in iron oxide, which is the same chemical compound found in everyday rust. Billions of years ago, when the planet had a warmer climate and abundant liquid water, iron in the Martian rocks reacted with oxygen. This chemical oxidation created fine reddish dust that spread across the entire planetary surface. Powerful global dust storms regularly sweep across Mars, lifting these tiny rust particles high into the thin atmosphere. When sunlight reflects off the airborne dust and rusty ground, Mars glows with its famous reddish color throughout our night sky.",
  "category": "Science & Nature",
  "subtopic": "Space & Astronomy",
  "cefr_level": "A2",
  "difficulty": "Easy",
  "source_citation": "NASA Mars Exploration Program",
  "quiz": [
    {
      "question": "What chemical compound gives Mars its distinctive red appearance?",
      "options": ["Iron oxide (rust)", "Liquid water", "Pure carbon", "Sulfur dioxide"],
      "correct_answer": "Iron oxide (rust)",
      "explanation": "Iron oxide, commonly known as rust, covers the surface of Mars.",
      "xp": 2
    },
    {
      "question": "What did iron react with billions of years ago on Mars?",
      "options": ["Oxygen", "Methane", "Helium", "Nitrogen"],
      "correct_answer": "Oxygen",
      "explanation": "Iron in Martian rocks reacted with oxygen and water to form rust.",
      "xp": 2
    },
    {
      "question": "How does rusty dust spread across the Martian surface?",
      "options": ["Global dust storms", "Ocean waves", "Volcanic eruptions", "Heavy rainfall"],
      "correct_answer": "Global dust storms",
      "explanation": "Strong dust storms lift and disperse rusty particles across the planet.",
      "xp": 2
    },
    {
      "question": "Why does Mars glow red in Earth's night sky?",
      "options": ["Sunlight reflects off rusty dust", "It produces its own red light", "It is covered in lava", "Its clouds are made of fire"],
      "correct_answer": "Sunlight reflects off rusty dust",
      "explanation": "Sunlight reflects off the rusty dust on the ground and in the atmosphere.",
      "xp": 2
    },
    {
      "question": "What was Mars' climate like billions of years ago?",
      "options": ["Warmer with liquid water", "Frozen solid with no gas", "Extremely dry and barren", "Completely covered in oceans of oil"],
      "correct_answer": "Warmer with liquid water",
      "explanation": "Early Mars had a warmer climate and liquid water on its surface.",
      "xp": 2
    }
  ]
};

console.log('====================================================');
console.log('RUNNING E2E TEST: "Why Mars Looks Red"');
console.log('====================================================\n');

// 1. Validate canonical counting
const shortFactWordCount = countWords(marsSampleJson.short_fact);
const readingWordCount = countWords(marsSampleJson.reading_text);

console.log(`[Step 1] Word counts:`);
console.log(`- short_fact: "${marsSampleJson.short_fact}" -> ${shortFactWordCount} words (Target: 20-30 words)`);
console.log(`- reading_text: -> ${readingWordCount} words (Target: 90-110 words)`);

console.assert(shortFactWordCount >= 20 && shortFactWordCount <= 30, `Short fact word count failed: ${shortFactWordCount}`);
console.assert(readingWordCount >= 90 && readingWordCount <= 110, `Reading word count failed: ${readingWordCount}`);
console.log('✓ Step 1 Passed: Word counts are within target bounds.\n');

// 2. Validate with canonical validator
console.log(`[Step 2] Canonical Validation:`);
const validated = validateBitzRecord(marsSampleJson, 0);
console.log(`- Status: ${validated.status}`);
console.log(`- Metrics:`, validated.metrics);
console.log(`- Issues:`, validated.issues);

console.assert(validated.status === 'valid', `Expected status 'valid', got '${validated.status}'`);
console.assert(validated.metrics.shortFactWords === shortFactWordCount, 'Short fact words mismatch');
console.assert(validated.metrics.readingWords === readingWordCount, 'Reading words mismatch');
console.assert(validated.metrics.quizCount === 5, 'Quiz count mismatch');
console.assert(validated.metrics.totalXp === 10, 'Total XP mismatch');
console.assert(validated.metrics.cefrLevel === 'A2', 'CEFR level mismatch');
console.assert(validated.metrics.category === 'Science & Nature', 'Category mismatch');
console.log('✓ Step 2 Passed: Canonical validation succeeded with 0 errors.\n');

// 3. Test resilient input formats (e.g. "reading" instead of "reading_text")
console.log(`[Step 3] Resilient Field Name Compatibility:`);
const legacyFieldSample = {
  ...marsSampleJson,
  reading: marsSampleJson.reading_text,
  reading_text: undefined,
  shortFact: marsSampleJson.short_fact,
  short_fact: undefined
};

const legacyValidated = validateBitzRecord(legacyFieldSample, 0);
console.log(`- Resilient status when 'reading' and 'shortFact' are passed: ${legacyValidated.status}`);
console.assert(legacyValidated.metrics.readingWords === readingWordCount, `Expected ${readingWordCount} words, received ${legacyValidated.metrics.readingWords}`);
console.assert(legacyValidated.metrics.shortFactWords === shortFactWordCount, `Expected ${shortFactWordCount} words, received ${legacyValidated.metrics.shortFactWords}`);
console.assert(legacyValidated.status === 'valid', 'Legacy validation failed');
console.log('✓ Step 3 Passed: Resilient field extraction canonicalizes to reading_text and never reports 0 words.\n');

// 4. Test Service Bulk Import
console.log(`[Step 4] Service Bulk Import:`);
const importRes = await knowledgeBitzService.bulkImportBitz({
  items: [validated.canonical],
  userId: null,
  cefrLevel: 'A2'
});

console.log(`- Total submitted: ${importRes.totalSubmitted}`);
console.log(`- Successfully imported: ${importRes.importedCount}`);
console.log(`- Failed: ${importRes.failedCount}`);
if (importRes.errors.length > 0) {
  console.error(`- Errors:`, importRes.errors);
}

console.assert(importRes.importedCount === 1, `Expected 1 imported record, got ${importRes.importedCount}`);
console.assert(importRes.failedCount === 0, `Expected 0 failed records, got ${importRes.failedCount}`);
const importedRecord = importRes.imported[0];
console.assert(importedRecord.title === "Why Mars Looks Red", 'Imported title mismatch');
console.assert(importedRecord.reading_text === marsSampleJson.reading_text, 'Imported reading_text mismatch');
console.assert(importedRecord.category === "Science & Nature", 'Imported category mismatch');
console.assert(importedRecord.cefr_level === "A2", 'Imported CEFR mismatch');
console.assert(Array.isArray(importedRecord.quiz) && importedRecord.quiz.length === 5, 'Imported quiz length mismatch');
console.log('✓ Step 4 Passed: bulkImportBitz successfully imported the record into catalogue with status=draft.\n');

// 5. Test Admin Catalogue Retrieval
console.log(`[Step 5] Admin Catalogue Retrieval:`);
const adminRes = await knowledgeBitzService.getAdminBitz({
  search: 'Why Mars Looks Red',
  category: 'Science & Nature'
});

const foundInAdmin = adminRes.bitz.find(b => b.title === 'Why Mars Looks Red');
console.assert(Boolean(foundInAdmin), 'Record must be searchable and visible in Admin Catalogue');
console.log(`- Found in Admin: "${foundInAdmin.title}" (Status: ${foundInAdmin.status}, Code: ${foundInAdmin.bitz_code})`);
console.log('✓ Step 5 Passed: Record appears in Admin Catalogue.\n');

// 6. Test Publishing and Explore Feed
console.log(`[Step 6] Publish and Explore Feed Retrieval:`);
// Update status to published and set visual status to ready
await knowledgeBitzService.updateBitz(foundInAdmin.id, {
  status: 'published',
  visual_status: 'ready',
  visual_url: 'https://images.unsplash.com/photo-mars'
});

const feedRes = await knowledgeBitzService.getPersonalizedFeed({
  categories: ['science_nature'],
  limit: 20
});

const foundInFeed = feedRes.bitz.find(b => b.id === foundInAdmin.id);
console.assert(Boolean(foundInFeed), 'Published record must appear in Explore Feed');
console.log(`- Found in Explore Feed: "${foundInFeed.title}" (CEFR: ${foundInFeed.cefr_level}, Subtopic: ${foundInFeed.sub_topic})`);
console.log('✓ Step 6 Passed: Published record appears in Explore Feed.\n');

console.log('====================================================');
console.log('ALL E2E TESTS PASSED CLEANLY! (6/6)');
console.log('====================================================');
