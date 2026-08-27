// ============================================================================
// EDTECHRA-BITZ: Live Server Feed Endpoints Tester
// ============================================================================

import app from '../server.mjs';
import http from 'http';

const PORT = 5099;
const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  const endpoints = [
    '/api/polls/feed',
    '/api/spelling-scrambles/feed',
    '/api/quiz/feed',
    '/api/spelling-flip-cards/feed',
    '/api/reorder/feed',
    '/api/reorders/feed',
    '/api/readings/feed',
    '/api/youtube/shorts/feed',
    '/api/vocabulary/feed',
    '/api/words-of-the-day/feed',
    '/api/posts?page=1&limit=8&sort=newest',
    '/api/posts?page=2&limit=8&sort=newest',
    '/api/posts?page=3&limit=8&sort=newest',
    '/api/user/learning-progress',
    '/api/user/topic-progress'
  ];

  console.log('\n--- Testing Endpoints ---');

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:${PORT}${ep}`);
      const status = res.status;
      const rawText = await res.text();
      let body;
      try {
        body = JSON.parse(rawText);
      } catch (e) {
        body = rawText;
      }

      if (status === 200) {
        const count = Array.isArray(body?.data) ? body.data.length : (Array.isArray(body?.posts) ? body.posts.length : (body?.data ? 'object' : 'ok'));
        console.log(`✅ [${status}] ${ep} -> items: ${count}`);
      } else {
        console.error(`❌ [${status}] ${ep} -> ERROR:`, typeof body === 'object' ? JSON.stringify(body) : body);
      }
    } catch (err) {
      console.error(`❌ [NETWORK/FAIL] ${ep} ->`, err.message);
    }
  }

  server.close(() => {
    console.log('\nTest server stopped.');
    process.exit(0);
  });
});
