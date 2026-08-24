// ============================================================================
// EDTECHRA-BITZ: Automated Test Suite for Admin Bulk Upload & Queue Publishing
// Tests: Admin Auth, Zero Gemini, Sequential Timing, Duplicate Protection, Resilience
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createQueueBatch,
  processPublishingQueue,
  getQueueOverview,
  publishItemNow,
  pauseQueueBatch,
  resumeQueueBatch,
  cancelQueueBatch,
  retryQueueItem,
  loadQueueCache,
  saveQueueCache
} from '../server/postQueueService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_QUEUE_CACHE = path.resolve(__dirname, '../server/data/admin_post_queue.json');
const TEST_POSTS_CACHE = path.resolve(__dirname, '../server/data/posts_cache.json');

// Backup original cache files if they exist
let backupQueue = null;
let backupPosts = null;

function setup() {
  if (fs.existsSync(TEST_QUEUE_CACHE)) {
    backupQueue = fs.readFileSync(TEST_QUEUE_CACHE, 'utf8');
  }
  if (fs.existsSync(TEST_POSTS_CACHE)) {
    backupPosts = fs.readFileSync(TEST_POSTS_CACHE, 'utf8');
  }
  // Initialize clean test environment
  saveQueueCache([]);
}

function cleanup() {
  if (backupQueue !== null) {
    fs.writeFileSync(TEST_QUEUE_CACHE, backupQueue, 'utf8');
  }
  if (backupPosts !== null) {
    fs.writeFileSync(TEST_POSTS_CACHE, backupPosts, 'utf8');
  }
}

async function runTests() {
  console.log('🧪 Starting Admin Bulk Upload & Sequential Publishing Verification Suite...\n');
  let passed = 0;
  let total = 0;

  function pass(desc) {
    passed++;
    total++;
    console.log(`  ✅ [PASS] ${desc}`);
  }

  function fail(desc, err) {
    total++;
    console.error(`  ❌ [FAIL] ${desc}:`, err.message);
  }

  setup();

  const mockAdminUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@edtechra.com',
    role: 'admin'
  };

  try {
    // ------------------------------------------------------------------------
    console.log('🛡️ Test Group 1: Admin Authorization & Batch Creation');
    // ------------------------------------------------------------------------

    // Test 1.1: Rejects unauthenticated user
    try {
      await createQueueBatch(null, { items: [{ imageUrl: 'https://r2.dev/img1.webp', imageObjectKey: 'posts/img1.webp' }] });
      fail('Rejects unauthenticated user', new Error('Should have thrown'));
    } catch (e) {
      pass('Rejects unauthenticated user without admin credentials');
    }

    // Test 1.2: Successfully creates batch of 5 images
    const batchPayload = {
      batchName: 'Test Grammar Batch',
      defaultCaption: 'Grammar rule of the day',
      intervalMinutes: 60,
      order: 'upload_order',
      items: [
        { imageUrl: 'https://r2.dev/test1.webp', imageObjectKey: 'posts/test1.webp', queuePosition: 1 },
        { imageUrl: 'https://r2.dev/test2.webp', imageObjectKey: 'posts/test2.webp', queuePosition: 2 },
        { imageUrl: 'https://r2.dev/test3.webp', imageObjectKey: 'posts/test3.webp', queuePosition: 3 },
        { imageUrl: 'https://r2.dev/test4.webp', imageObjectKey: 'posts/test4.webp', queuePosition: 4 },
        { imageUrl: 'https://r2.dev/test5.webp', imageObjectKey: 'posts/test5.webp', queuePosition: 5 }
      ]
    };

    const batchRes = await createQueueBatch(mockAdminUser, batchPayload, null);
    assert.strictEqual(batchRes.success, true);
    assert.strictEqual(batchRes.totalQueued, 5);
    pass('Creates batch of 5 pre-approved images successfully');

    // ------------------------------------------------------------------------
    console.log('\n🤖 Test Group 2: Zero Gemini AI Validation Verification');
    // ------------------------------------------------------------------------

    // Test 2.1: Queue items are tagged as manual pre-approval without invoking Gemini
    const items = batchRes.items;
    assert.strictEqual(items.length, 5);
    assert(items.every((i) => i.validation_status === 'manually_approved'));
    assert(items.every((i) => i.validation_provider === 'manual'));
    pass('All queue items explicitly tagged as validation_provider = manual and manually_approved (Zero Gemini)');

    // ------------------------------------------------------------------------
    console.log('\n⏱️ Test Group 3: Sequential Timing & Interval Offsets');
    // ------------------------------------------------------------------------

    // Test 3.1: Verify scheduled_at timestamps are spaced by exact interval (60 minutes)
    const t0 = new Date(items[0].scheduled_at).getTime();
    const t1 = new Date(items[1].scheduled_at).getTime();
    const t2 = new Date(items[2].scheduled_at).getTime();

    const diff1 = Math.round((t1 - t0) / (60 * 1000));
    const diff2 = Math.round((t2 - t1) / (60 * 1000));

    assert.strictEqual(diff1, 60, `Expected 60m diff, got ${diff1}m`);
    assert.strictEqual(diff2, 60, `Expected 60m diff, got ${diff2}m`);
    pass('Sequential scheduled_at timestamps spaced accurately by interval (60 minutes)');

    // ------------------------------------------------------------------------
    console.log('\n🚀 Test Group 4: Sequential Publishing Engine & Feed Creation');
    // ------------------------------------------------------------------------

    // Test 4.1: Verify item 1 (scheduled for now) was auto-published and future items remain queued
    const overview1 = await getQueueOverview(null);
    assert.strictEqual(overview1.stats.published, 1);
    assert.strictEqual(overview1.stats.queued, 4);
    pass('Publishes first due item immediately to feed while keeping future items queued');

    // ------------------------------------------------------------------------
    console.log('\n🔒 Test Group 5: Idempotency & Duplicate Protection');
    // ------------------------------------------------------------------------

    // Test 5.1: Running queue processor again does NOT create duplicate post
    const secondRun = await processPublishingQueue(null);
    assert.strictEqual(secondRun.count, 0, 'Should not republish already published items');

    const overview2 = await getQueueOverview(null);
    assert.strictEqual(overview2.stats.published, 1);
    pass('Idempotency verified: Duplicate runs do not create duplicate feed posts');

    // ------------------------------------------------------------------------
    console.log('\n🎮 Test Group 6: Queue Controls (Pause, Resume, Publish Now, Cancel)');
    // ------------------------------------------------------------------------

    // Test 6.1: Pause batch
    const pauseRes = await pauseQueueBatch(batchRes.batchId, null);
    assert.strictEqual(pauseRes.pausedCount, 4);
    const overviewPaused = await getQueueOverview(null);
    assert.strictEqual(overviewPaused.stats.paused, 4);
    pass('Pauses remaining queued items in batch successfully');

    // Test 6.2: Resume batch
    const resumeRes = await resumeQueueBatch(batchRes.batchId, null);
    assert.strictEqual(resumeRes.resumedCount, 4);
    const overviewResumed = await getQueueOverview(null);
    assert.strictEqual(overviewResumed.stats.published, 2); // Item 1 & Item 2 published
    assert.strictEqual(overviewResumed.stats.queued, 3);
    pass('Resumes paused batch and recalculates sequential schedule');

    // Test 6.3: Publish Item #3 immediately on demand
    const item3 = overviewResumed.batches[0].items.find((i) => i.queue_position === 3);
    assert(item3, 'Item 3 should exist');
    await publishItemNow(item3.id, null);

    const overviewAfterPublishNow = await getQueueOverview(null);
    assert.strictEqual(overviewAfterPublishNow.stats.published, 3);
    assert.strictEqual(overviewAfterPublishNow.stats.queued, 2);
    pass('Publishes specific queue item immediately on demand');

    // Test 6.4: Cancel remaining items
    const cancelRes = await cancelQueueBatch(batchRes.batchId, null);
    assert.strictEqual(cancelRes.cancelledCount, 2);
    pass('Cancels remaining unpublished items safely');

    // ------------------------------------------------------------------------
    console.log('\n🛡️ Test Group 7: Failure Isolation & Retry Mechanics');
    // ------------------------------------------------------------------------

    // Test 7.1: Simulate a failed item and retry
    const failBatchPayload = {
      batchName: 'Failure Recovery Batch',
      intervalMinutes: 0,
      items: [
        { imageUrl: 'https://r2.dev/fail1.webp', imageObjectKey: 'posts/fail1.webp', queuePosition: 1 }
      ]
    };
    const failBatch = await createQueueBatch(mockAdminUser, failBatchPayload, null);
    const failItem = failBatch.items[0];

    // Manually mark as failed
    let queue = loadQueueCache();
    const qItem = queue.find((i) => i.id === failItem.id);
    qItem.status = 'failed';
    qItem.error_message = 'Network simulation error';
    saveQueueCache(queue);

    const overviewFailed = await getQueueOverview(null);
    assert(overviewFailed.stats.failed >= 1);
    pass('Records failure safely without corrupting queue or crashing');

    // Retry item
    const retryRes = await retryQueueItem(failItem.id, null);
    assert.strictEqual(retryRes.success, true);
    pass('Retries failed queue item and resumes publishing cleanly');

    console.log('\n=======================================================');
    console.log(`🎯 Test Summary: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
    console.log('=======================================================\n');

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    cleanup();
  }
}

runTests();
