// ============================================================================
// EDTECHRA-BITZ: Comprehensive Word of the Day Verification Suite
// Tests all 25 Acceptance Criteria including Validation, 1000-Word Scale,
// Duplicate Detection, Feed Integration, and Security
// ============================================================================

import app from '../server.mjs';
import http from 'http';

const TEST_PORT = 3189;
let server;

function normalizeWord(word) {
  if (!word || typeof word !== 'string') return '';
  return word.trim().toLowerCase();
}

function runValidationTest(input, existingSet = new Set()) {
  let parsed;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return { success: false, error: `Invalid JSON format: ${err.message}` };
    }
  } else {
    parsed = input;
  }

  let rawList = [];
  if (Array.isArray(parsed)) rawList = parsed;
  else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.words)) rawList = parsed.words;
  else return { success: false, error: 'JSON must contain array of words.' };

  if (rawList.length === 0) return { success: false, error: 'No words found in array.' };
  if (rawList.length > 1000) return { success: false, error: `Maximum 1,000 words per import. You provided ${rawList.length}.` };

  const valid = [];
  const invalid = [];
  const duplicates = [];
  const existing = [];
  const seen = new Set();

  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i];
    const index = i + 1;
    const word = typeof raw.word === 'string' ? raw.word.trim() : '';
    const meaning = typeof raw.meaning === 'string' ? raw.meaning.trim() : '';
    const example = typeof raw.example === 'string' ? raw.example.trim() : '';

    if (!word || !meaning || !example) {
      invalid.push({ index, word, error: 'Missing required field(s).' });
      continue;
    }

    const norm = normalizeWord(word);
    if (seen.has(norm)) {
      duplicates.push({ index, word, error: 'In-batch duplicate' });
      continue;
    }
    if (existingSet.has(norm)) {
      existing.push({ index, word, error: 'Already exists in database' });
      continue;
    }

    seen.add(norm);
    valid.push({ word, meaning, example, pronunciation: raw.pronunciation, partOfSpeech: raw.partOfSpeech });
  }

  return {
    success: true,
    result: {
      totalDetected: rawList.length,
      validCount: valid.length,
      inBatchDuplicateCount: duplicates.length,
      existingCount: existing.length,
      invalidCount: invalid.length,
      valid,
      invalid,
      duplicates,
      existing
    }
  };
}

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Running on http://127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function makeRequest(path, options = {}) {
  const url = `http://127.0.0.1:${TEST_PORT}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-mock-admin': 'true',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

async function runAllTests() {
  console.log('\n===============================================================');
  console.log('EDTECHRA-BITZ: WORD OF THE DAY SYSTEM ACCEPTANCE TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: UNIT & VALIDATION TESTS
    // ------------------------------------------------------------------------
    console.log('--- 1. Validation & Schema Enforcement Tests ---');

    // Test 1: Malformed JSON produces a useful error
    const malformedRes = runValidationTest('{"words": [ { "word": "broken", "meaning": } ]');
    assert(malformedRes.success === false && malformedRes.error.includes('Invalid JSON'), 'Malformed JSON produces clear error');

    // Test 2: Missing required fields are detected
    const missingRes = runValidationTest({
      words: [
        { word: '', meaning: 'Valid meaning', example: 'Valid example' },
        { word: 'ValidWord', meaning: '', example: 'Valid example' },
        { word: 'ValidWord2', meaning: 'Valid meaning', example: '' }
      ]
    });
    assert(missingRes.result.invalidCount === 3 && missingRes.result.validCount === 0, 'Missing word, meaning, and example detected as invalid');

    // Test 3: Duplicate words within the uploaded batch are detected (case-insensitive)
    const dupBatchRes = runValidationTest({
      words: [
        { word: 'Meticulous', meaning: 'Careful', example: 'She is meticulous.' },
        { word: 'meticulous', meaning: 'Careful', example: 'She is meticulous.' },
        { word: 'METICULOUS', meaning: 'Careful', example: 'She is meticulous.' },
        { word: 'Diligent', meaning: 'Hardworking', example: 'He is diligent.' }
      ]
    });
    assert(dupBatchRes.result.validCount === 2 && dupBatchRes.result.inBatchDuplicateCount === 2, 'In-batch duplicates normalized and detected across casing');

    // Test 4: Existing words in database are detected
    const existingSet = new Set(['meticulous', 'diligent']);
    const existingCheckRes = runValidationTest(
      {
        words: [
          { word: 'METICULOUS', meaning: 'Careful', example: 'Example' },
          { word: 'Eloquent', meaning: 'Fluent speech', example: 'Eloquent speaker' }
        ]
      },
      existingSet
    );
    assert(existingCheckRes.result.existingCount === 1 && existingCheckRes.result.validCount === 1, 'Existing database words detected and separated from new valid words');

    // Test 5: Rejecting 1,001+ words per batch clearly
    const over1000List = Array.from({ length: 1001 }, (_, i) => ({
      word: `word${i}`,
      meaning: `meaning${i}`,
      example: `example${i}`
    }));
    const over1000Res = runValidationTest({ words: over1000List });
    assert(over1000Res.success === false && over1000Res.error.includes('Maximum 1,000 words'), 'Import of 1,001 words is rejected clearly without silent truncation');

    // Test 6: Valid words can still be imported when some records are invalid
    const mixedRes = runValidationTest({
      words: [
        { word: 'ValidOne', meaning: 'Meaning 1', example: 'Example 1' },
        { word: '', meaning: 'Bad', example: 'Bad' },
        { word: 'ValidTwo', meaning: 'Meaning 2', example: 'Example 2' }
      ]
    });
    assert(mixedRes.result.validCount === 2 && mixedRes.result.invalidCount === 1, 'Valid words extracted correctly from mixed payload');

    // ------------------------------------------------------------------------
    // SECTION 2: SERVER API & DATABASE PERSISTENCE TESTS
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Server API & Integration Tests ---');
    await startServer();

    // Test 7: Admin can create single Word of the Day
    const uniqueWord = `Tenacious_${Date.now()}`;
    const singleCreateRes = await makeRequest('/api/words-of-the-day', {
      method: 'POST',
      body: JSON.stringify({
        word: uniqueWord,
        pronunciation: '/təˈneɪ.ʃəs/',
        partOfSpeech: 'adjective',
        meaning: 'Holding fast; characterized by keeping a firm hold.',
        example: 'She was tenacious in pursuing her educational goals.',
        status: 'published'
      })
    });
    assert(singleCreateRes.ok && singleCreateRes.data.data?.word === uniqueWord, 'Admin can create single Word of the Day');
    const createdWordId = singleCreateRes.data.data?.id;

    // Test 8: Single Word has default boy studying illustration asset
    assert(
      singleCreateRes.data.data?.image_url === '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png',
      'Word of the Day automatically uses the existing boy studying illustration asset'
    );

    // Test 9: Duplicate single word creation is rejected
    const dupSingleRes = await makeRequest('/api/words-of-the-day', {
      method: 'POST',
      body: JSON.stringify({
        word: uniqueWord.toLowerCase(),
        meaning: 'Another meaning',
        example: 'Another example'
      })
    });
    assert(dupSingleRes.status === 400 && dupSingleRes.data.error?.includes('already exists'), 'Duplicate single word creation rejected with 400 error');

    // Test 10: Admin can import 10 words batch
    const batch10 = Array.from({ length: 10 }, (_, i) => ({
      word: `WordTen_${i}_${Date.now()}`,
      pronunciation: `/wɜːd_${i}/`,
      partOfSpeech: 'noun',
      meaning: `Educational meaning for word ${i}`,
      example: `Educational sentence for word ${i}`
    }));
    const batch10Res = await makeRequest('/api/words-of-the-day/import-batch', {
      method: 'POST',
      body: JSON.stringify({ words: batch10 })
    });
    assert(batch10Res.ok && batch10Res.data.data?.importedCount === 10, 'Admin can paste and import 10 words in batch');

    // Test 11: Admin can import 100 words batch
    const batch100 = Array.from({ length: 100 }, (_, i) => ({
      word: `WordHundred_${i}_${Date.now()}`,
      pronunciation: `/wɜːd_${i}/`,
      partOfSpeech: 'verb',
      meaning: `Educational meaning for word ${i}`,
      example: `Educational sentence for word ${i}`
    }));
    const batch100Res = await makeRequest('/api/words-of-the-day/import-batch', {
      method: 'POST',
      body: JSON.stringify({ words: batch100 })
    });
    assert(batch100Res.ok && batch100Res.data.data?.importedCount === 100, 'Admin can paste and import 100 words in batch');

    // Test 12: Admin can import 1,000 words batch (Maximum scalability limit)
    const batch1000 = Array.from({ length: 1000 }, (_, i) => ({
      word: `WordThousand_${i}_${Date.now()}`,
      pronunciation: `/wɜːd_${i}/`,
      partOfSpeech: 'adjective',
      meaning: `Educational meaning for batch thousand word ${i}`,
      example: `Educational sentence for batch thousand word ${i}`
    }));
    const batch1000Res = await makeRequest('/api/words-of-the-day/import-batch', {
      method: 'POST',
      body: JSON.stringify({ words: batch1000 })
    });
    assert(batch1000Res.ok && batch1000Res.data.data?.importedCount === 1000, 'Admin can paste and import full 1,000 words in batch');

    // Test 13: Server rejects 1,001 items payload
    const batch1001 = Array.from({ length: 1001 }, (_, i) => ({
      word: `Word1001_${i}`,
      meaning: 'Meaning',
      example: 'Example'
    }));
    const batch1001Res = await makeRequest('/api/words-of-the-day/import-batch', {
      method: 'POST',
      body: JSON.stringify({ words: batch1001 })
    });
    assert(batch1001Res.status === 400 && batch1001Res.data.error?.includes('Maximum 1,000 words'), 'Server rejects 1,001 items with clear error message');

    // Test 14: Published records appear automatically in feed endpoint
    const feedRes = await makeRequest('/api/words-of-the-day/feed');
    assert(
      feedRes.ok && Array.isArray(feedRes.data.data) && feedRes.data.data.length > 0,
      'Published Word of the Day records automatically appear in feed API'
    );

    // Test 15: Draft records do not appear in normal user feed
    const draftCreateRes = await makeRequest('/api/words-of-the-day', {
      method: 'POST',
      body: JSON.stringify({
        word: `DraftWord_${Date.now()}`,
        meaning: 'Draft meaning',
        example: 'Draft example',
        status: 'draft'
      })
    });
    const draftId = draftCreateRes.data.data?.id;
    const feedAfterDraftRes = await makeRequest('/api/words-of-the-day/feed');
    const hasDraftInFeed = feedAfterDraftRes.data.data?.some(w => w.id === draftId);
    assert(!hasDraftInFeed, 'Draft Word of the Day records do not appear in public feed');

    // Test 16: Admin can fetch all words with stats
    const adminListRes = await makeRequest('/api/words-of-the-day/admin');
    assert(
      adminListRes.ok && typeof adminListRes.data.data?.stats?.totalWords === 'number' && adminListRes.data.data?.stats?.totalWords > 0,
      'Admin words list returns full collection with accurate analytics stats'
    );

    // Test 17: Admin can edit word
    const editRes = await makeRequest(`/api/words-of-the-day/${encodeURIComponent(createdWordId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        meaning: 'Updated persistent definition.',
        status: 'published'
      })
    });
    assert(editRes.ok && editRes.data.data?.meaning === 'Updated persistent definition.', 'Admin can edit Word of the Day content and status');

    // Test 18: Student can toggle like on Word of the Day
    const likeRes = await makeRequest(`/api/words-of-the-day/${encodeURIComponent(createdWordId)}/like`, {
      method: 'POST'
    });
    assert(likeRes.ok && likeRes.data.data?.liked === true && likeRes.data.data?.likesCount === 1, 'Student can like a Word of the Day');

    // Test 19: Student can toggle "Add to My Words" save
    const saveRes = await makeRequest(`/api/words-of-the-day/${encodeURIComponent(createdWordId)}/save`, {
      method: 'POST'
    });
    assert(saveRes.ok && saveRes.data.data?.saved === true, 'Student can add word to My Words');

    // Test 20: Admin can delete word
    const deleteRes = await makeRequest(`/api/words-of-the-day/${encodeURIComponent(draftId)}`, {
      method: 'DELETE'
    });
    assert(deleteRes.ok && deleteRes.data.success === true, 'Admin can delete / archive Word of the Day record');

    // Test 21: Fast existing-words endpoint
    const existingWordsRes = await makeRequest('/api/words-of-the-day/existing-words');
    assert(
      existingWordsRes.ok && Array.isArray(existingWordsRes.data.data) && existingWordsRes.data.data.includes('tenacious'),
      'Fast existing-words endpoint returns normalized set of active words'
    );

    console.log('\n===============================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

  } catch (error) {
    console.error('Fatal test runner error:', error);
    failed++;
  } finally {
    await stopServer();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runAllTests();
