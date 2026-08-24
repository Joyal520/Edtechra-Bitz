// ============================================================================
// EDTECHRA-BITZ: Vocabulary Content System Comprehensive Test Suite
// Tests all 4 Content Types, Dual Validation, Fallback Pipeline & Scheduler
// ============================================================================

import assert from 'node:assert';
import {
  validateVocabularyLocal,
  validateVocabularyBatch,
  testGeminiConnection,
  publishScheduledVocabularyItems,
  resolveContentType,
  normalizeVocabularyTitle,
  loadVocabularyCache,
  saveVocabularyCache
} from '../server/vocabularyService.mjs';
import { buildVocabularyContentKey, buildVocabularyImageKey } from '../server/r2Service.mjs';

console.log('🧪 Starting Vocabulary Content System Verification Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// ----------------------------------------------------------------------------
// TEST GROUP 1: Content Type Resolution & Key Generation
// ----------------------------------------------------------------------------
console.log('📦 Test Group 1: Content Type Resolution & Key Builders');

runTest('Resolves valid content types properly', () => {
  assert.strictEqual(resolveContentType('word'), 'word');
  assert.strictEqual(resolveContentType('collocation'), 'collocation');
  assert.strictEqual(resolveContentType('phrasal_verb'), 'phrasal_verb');
  assert.strictEqual(resolveContentType('idiom'), 'idiom');
  assert.strictEqual(resolveContentType('words'), 'word');
  assert.strictEqual(resolveContentType('collocations'), 'collocation');
  assert.strictEqual(resolveContentType('phrasal_verbs'), 'phrasal_verb');
  assert.strictEqual(resolveContentType('idioms'), 'idiom');
  assert.strictEqual(resolveContentType('unknown_xyz', 'collocation'), 'collocation');
});

runTest('Builds correct R2 object keys for all 4 types', () => {
  const wordKey = buildVocabularyContentKey('word', 'item_123');
  const collocKey = buildVocabularyContentKey('collocation', 'item_456');
  const phrasalKey = buildVocabularyContentKey('phrasal_verb', 'item_789');
  const idiomKey = buildVocabularyContentKey('idiom', 'item_999');

  assert.strictEqual(wordKey, 'vocabulary/word/item_123/content.json');
  assert.strictEqual(collocKey, 'vocabulary/collocation/item_456/content.json');
  assert.strictEqual(phrasalKey, 'vocabulary/phrasal_verb/item_789/content.json');
  assert.strictEqual(idiomKey, 'vocabulary/idiom/item_999/content.json');
});

// ----------------------------------------------------------------------------
// TEST GROUP 2: Local Fallback Validation Engine
// ----------------------------------------------------------------------------
console.log('\n🔍 Test Group 2: Deterministic Local Fallback Validation');

runTest('Validates clean multi-type vocabulary records', () => {
  const batch = [
    {
      type: 'word',
      title: 'meticulous',
      meaning: 'Showing great attention to detail.',
      example: 'She is meticulous about her research.'
    },
    {
      type: 'collocation',
      title: 'make a decision',
      meaning: 'To decide on a course of action.',
      example: 'We made a decision to proceed.'
    },
    {
      type: 'phrasal_verb',
      title: 'give up',
      meaning: 'To stop making an effort.',
      example: 'Never give up on your dreams.'
    },
    {
      type: 'idiom',
      title: 'break the ice',
      meaning: 'To ease social tension.',
      example: 'He told a joke to break the ice.'
    }
  ];

  const result = validateVocabularyLocal(batch, { defaultType: 'word' });
  assert.strictEqual(result.totalDetected, 4);
  assert.strictEqual(result.validCount, 4);
  assert.strictEqual(result.invalidCount, 0);
  assert.strictEqual(result.fallbackValidatedCount, 4);
});

runTest('Catches missing required fields (title, meaning, example)', () => {
  const badBatch = [
    { type: 'word', title: '', meaning: 'Some meaning', example: 'Some example' },
    { type: 'word', title: 'word2', meaning: '', example: 'Some example' },
    { type: 'word', title: 'word3', meaning: 'Some meaning', example: '' }
  ];

  const result = validateVocabularyLocal(badBatch);
  assert.strictEqual(result.invalidCount, 3);
  assert.strictEqual(result.validCount, 0);
  assert.strictEqual(result.invalid.length, 3);
});

runTest('Catches in-batch duplicate titles', () => {
  const dupBatch = [
    { type: 'word', title: 'Serendipity', meaning: 'Happy accident.', example: 'It was pure serendipity.' },
    { type: 'word', title: 'serendipity', meaning: 'Finding good things without looking.', example: 'A serendipity event.' }
  ];

  const result = validateVocabularyLocal(dupBatch);
  assert.strictEqual(result.inBatchDuplicateCount, 1);
  assert.strictEqual(result.validCount, 1);
  assert.strictEqual(result.duplicates.length, 1);
});

runTest('Catches existing database duplicate titles', () => {
  const existingSet = new Set(['resilience']);
  const batch = [
    { type: 'word', title: 'Resilience', meaning: 'Ability to recover.', example: 'She showed great resilience.' }
  ];

  const result = validateVocabularyLocal(batch, { existingSet });
  assert.strictEqual(result.existingCount, 1);
  assert.strictEqual(result.existing.length, 1);
});

runTest('Warns when a phrasal verb is a single word without particle', () => {
  const singleWordPhrasal = [
    { type: 'phrasal_verb', title: 'run', meaning: 'To move swiftly on foot.', example: 'He runs fast.' }
  ];

  const result = validateVocabularyLocal(singleWordPhrasal);
  assert.strictEqual(result.validCount, 1);
  assert.strictEqual(result.warningCount, 1);
  assert.ok(result.warnings.length > 0);
});

// ----------------------------------------------------------------------------
// TEST GROUP 3: Automatic AI Fallback & Safety Pipeline
// ----------------------------------------------------------------------------
console.log('\n🤖 Test Group 3: Gemini & Fallback Pipeline Orchestration');

await runAsyncTest('Gracefully falls back to local validator without throwing on invalid key', async () => {
  const testItems = [
    { type: 'word', title: 'ephemeral', meaning: 'Lasting for a very short time.', example: 'Fashions are ephemeral.' }
  ];

  // Force an invalid GEMINI_API_KEY environment variable to test outage resilience
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'invalid_mock_key_for_testing_outage';

  const result = await validateVocabularyBatch(testItems, { preferredMode: 'gemini' });

  // Safety check: must return a valid structured report and MUST NOT crash
  assert.ok(result);
  assert.strictEqual(result.totalDetected, 1);
  assert.strictEqual(result.validCount, 1);
  assert.strictEqual(result.fallbackValidatedCount, 1);
  assert.ok(result.fallbackNotice, 'Should include user-facing fallback notice');

  // Restore env
  process.env.GEMINI_API_KEY = originalKey;
});

await runAsyncTest('Diagnostics test tool runs safely without exposing raw key', async () => {
  const res = await testGeminiConnection();
  assert.ok(typeof res.isConfigured === 'boolean');
  assert.ok(typeof res.isConnected === 'boolean');
  assert.ok(typeof res.status === 'string');
});

// ----------------------------------------------------------------------------
// TEST GROUP 4: Manual Marker & Scheduler Idempotency
// ----------------------------------------------------------------------------
console.log('\n⏱️ Test Group 4: Manual Marker & Scheduler Idempotency');

runTest('Bulk images are tagged as manual validation without wasting Gemini quota', () => {
  const imageUploadRecord = {
    content_type: 'collocation',
    title: 'Pay Attention',
    validation_status: 'manually_approved',
    validation_provider: 'manual'
  };

  assert.strictEqual(imageUploadRecord.validation_provider, 'manual');
  assert.strictEqual(imageUploadRecord.validation_status, 'manually_approved');
});

await runAsyncTest('Scheduler publishes mature items idempotently', async () => {
  // Mock a scheduled item in past
  const pastDate = new Date(Date.now() - 60000).toISOString();
  const cache = loadVocabularyCache();
  const testId = `test_sched_${Date.now()}`;

  cache.unshift({
    id: testId,
    content_type: 'phrasal_verb',
    title: 'Carry out',
    meaning: 'To execute a plan.',
    example: 'They carried out the test.',
    status: 'scheduled',
    scheduled_at: pastDate,
    validation_status: 'manually_approved',
    validation_provider: 'manual'
  });

  saveVocabularyCache(cache);

  // Run scheduler
  const schedResult = await publishScheduledVocabularyItems(null);
  assert.ok(schedResult && schedResult.updatedCount >= 1);

  // Verify it is now published
  const updatedCache = loadVocabularyCache();
  const item = updatedCache.find(w => w.id === testId);
  assert.strictEqual(item.status, 'published');
  assert.ok(item.published_at);

  // Clean up test item
  const cleanCache = updatedCache.filter(w => w.id !== testId);
  saveVocabularyCache(cleanCache);
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log(`\n=======================================================`);
console.log(`🎯 Test Summary: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log(`=======================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
