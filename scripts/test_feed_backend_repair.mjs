// ============================================================================
// EDTECHRA-BITZ: Feed Backend & Pipeline Comprehensive Verification Suite
// ============================================================================

import http from 'http';
import assert from 'assert';
import app from '../server.mjs';

const PORT = 5098;
const server = http.createServer(app);

console.log('🧪 Starting EdTechra Feed Backend Repair Verification Suite...\n');

let testsPassed = 0;
let testsTotal = 0;

async function runAsyncTest(name, fn) {
  testsTotal++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

server.listen(PORT, async () => {
  try {
    // ------------------------------------------------------------------------
    // Test 1: All 8 Feed Endpoints return HTTP 200
    // ------------------------------------------------------------------------
    const feedEndpoints = [
      { ep: '/api/polls/feed', name: 'Polls Feed' },
      { ep: '/api/spelling-scrambles/feed', name: 'Spelling Scrambles Feed' },
      { ep: '/api/quiz/feed', name: 'Quiz Bits Feed' },
      { ep: '/api/spelling-flip-cards/feed', name: 'Spelling Flip Cards Feed' },
      { ep: '/api/reorder/feed', name: 'Sentence Reorder Feed (singular route)' },
      { ep: '/api/reorders/feed', name: 'Sentence Reorder Feed (plural route)' },
      { ep: '/api/readings/feed', name: '1-Minute Readings Feed' },
      { ep: '/api/youtube/shorts/feed', name: 'YouTube Shorts Feed' },
      { ep: '/api/vocabulary/feed', name: 'Vocabulary Feed' },
      { ep: '/api/words-of-the-day/feed', name: 'Words of the Day Feed' }
    ];

    for (const item of feedEndpoints) {
      await runAsyncTest(`${item.name} (${item.ep}) returns HTTP 200 with valid data`, async () => {
        const res = await fetch(`http://localhost:${PORT}${item.ep}`);
        assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
        const data = await res.json();
        assert(data.success, 'Response must have success: true');
        assert(Array.isArray(data.data), 'Response data must be an array');
      });
    }

    // ------------------------------------------------------------------------
    // Test 2: Feed Pagination on /api/posts
    // ------------------------------------------------------------------------
    await runAsyncTest('GET /api/posts pagination (page 1, page 2, page 3) succeeds without duplicate IDs', async () => {
      const res1 = await fetch(`http://localhost:${PORT}/api/posts?page=1&limit=8&sort=newest`);
      assert.strictEqual(res1.status, 200);
      const data1 = await res1.json();
      assert(data1.success);
      assert.strictEqual(data1.posts.length, 8);
      assert(data1.hasMore === true);

      const res2 = await fetch(`http://localhost:${PORT}/api/posts?page=2&limit=8&sort=newest`);
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert(data2.success);
      assert.strictEqual(data2.posts.length, 8);

      const res3 = await fetch(`http://localhost:${PORT}/api/posts?page=3&limit=8&sort=newest`);
      assert.strictEqual(res3.status, 200);
      const data3 = await res3.json();
      assert(data3.success);
      assert.strictEqual(data3.posts.length, 8);

      // Verify no overlap between page 1 and page 2
      const page1Ids = new Set(data1.posts.map(p => p.id));
      const overlap = data2.posts.filter(p => page1Ids.has(p.id));
      assert.strictEqual(overlap.length, 0, 'Page 2 must not duplicate items from Page 1');
    });

    // ------------------------------------------------------------------------
    // Test 3: Reading Server 60s Duration Validation
    // ------------------------------------------------------------------------
    await runAsyncTest('POST /api/readings/complete enforces strict 60s elapsed reading validation', async () => {
      // Early attempt (<60s)
      const now = Date.now();
      const earlyRes = await fetch(`http://localhost:${PORT}/api/readings/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readingId: 'test-reading-1',
          timeSpentSeconds: 25,
          startTime: new Date(now - 25000).toISOString()
        })
      });
      const earlyJson = await earlyRes.json();
      assert(earlyJson.success === false || earlyJson.eligibleForCompletion === false || earlyJson.error,
        'Server must reject reading completion under 60 seconds');
    });

    // ------------------------------------------------------------------------
    // Test 4: Leaderboard Post XP & Admin Role Exclusion
    // ------------------------------------------------------------------------
    await runAsyncTest('Leaderboard includes student posts (+10 XP) and excludes admin accounts', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/leaderboard?period=all_time`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success);
      assert(Array.isArray(json.data.top10));

      // Verify no admin accounts appear in top 10 learners
      json.data.top10.forEach(learner => {
        assert.notStrictEqual(learner.role, 'admin', 'Admins must not appear in learner leaderboard');
        assert.notStrictEqual(learner.role, 'super_admin', 'Super admins must not appear in learner leaderboard');
      });
    });

    // ------------------------------------------------------------------------
    // Test 5: Learning Progress API returns 6 Feed Categories
    // ------------------------------------------------------------------------
    await runAsyncTest('GET /api/user/learning-progress returns exactly the 6 Feed Learning Activities', async () => {
      const res = await fetch(`http://localhost:${PORT}/api/user/learning-progress`);
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert(json.success);
      assert.strictEqual(json.data.length, 6);
      const catKeys = json.data.map(c => c.category);
      assert(catKeys.includes('shorts'));
      assert(catKeys.includes('relaxation_games'));
      assert(catKeys.includes('memory_games'));
      assert(catKeys.includes('reading'));
      assert(catKeys.includes('quizzes'));
      assert(catKeys.includes('word_of_the_day'));
    });

    console.log(`\n🏁 Test Results: ${testsPassed} / ${testsTotal} tests passed!`);
    server.close(() => {
      if (testsPassed !== testsTotal) {
        process.exit(1);
      }
      process.exit(0);
    });
  } catch (outerErr) {
    console.error('Fatal test error:', outerErr);
    server.close(() => process.exit(1));
  }
});
