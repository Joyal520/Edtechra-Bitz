import express from 'express';
import app from '../server.mjs';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

let server;
let baseUrl;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[Test Server] Running on ${baseUrl}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

async function runTests() {
  await startServer();
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✗ ${name}`);
      failed++;
    }
  }

  try {
    console.log('\n--- 1. Testing /api/health ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    const healthJson = await healthRes.json();
    assert(healthJson.status === 'healthy', 'Health status is "healthy"');
    assert(healthJson.env?.hasServerSupabase === true, 'serverSupabase is initialized');

    console.log('\n--- 2. Testing /api/admin/bitz (Unauthorized) ---');
    const unauthRes = await fetch(`${baseUrl}/api/admin/bitz`);
    assert(unauthRes.status === 401, 'Unauthenticated request returns HTTP 401 (Not 500!)');

    console.log('\n--- 3. Testing /api/admin/bitz (Mock Admin) ---');
    const adminRes = await fetch(`${baseUrl}/api/admin/bitz?status=all&page=1&limit=50`, {
      headers: { 'x-mock-admin': 'true' }
    });
    assert(adminRes.status === 200, 'GET /api/admin/bitz returns HTTP 200');
    const adminJson = await adminRes.json();
    assert(adminJson.success === true, 'Response has success=true');
    assert(Array.isArray(adminJson.bitz), 'Response contains bitz array');
    assert(adminJson.bitz.length === 19, `Catalogue contains all 19 Supabase Bitz (got ${adminJson.bitz.length})`);
    assert(adminJson.stats?.totalBitz === 19, 'Stats totalBitz is 19');
    assert(adminJson.bitz[0]?.visual_url !== undefined, 'First bitz has visual_url');
    assert(adminJson.bitz[0]?.image_url !== undefined, 'First bitz has image_url alias');

    console.log('\n--- 4. Testing /api/admin/pixabay/test (Diagnostic) ---');
    const pixabayTestRes = await fetch(`${baseUrl}/api/admin/pixabay/test`, {
      method: 'POST',
      headers: { 'x-mock-admin': 'true', 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'science biology' })
    });
    assert(pixabayTestRes.status === 200, 'POST /api/admin/pixabay/test returns HTTP 200');
    const pixTestJson = await pixabayTestRes.json();
    assert(pixTestJson.configured === true, 'Pixabay API key is configured');
    assert(pixTestJson.apiReachable === true, 'Pixabay API is reachable');
    assert(pixTestJson.candidatesCount > 0, `Returned ${pixTestJson.candidatesCount} candidate images`);
    assert(pixTestJson.candidateSample?.previewUrl !== undefined, 'Sample candidate has preview URL');

    console.log('\n--- 5. Testing /api/bitz/feed (Public/Student Feed) ---');
    const feedRes = await fetch(`${baseUrl}/api/bitz/feed?page=1&limit=10`);
    assert(feedRes.status === 200, 'GET /api/bitz/feed returns HTTP 200');
    const feedJson = await feedRes.json();
    assert(feedJson.success === true, 'Feed response has success=true');
    assert(feedJson.bitz?.length > 0, `Feed contains ${feedJson.bitz?.length} items`);
    assert(feedJson.bitz[0]?.title !== undefined, 'Feed item has valid title');

    console.log(`\n========================================`);
    console.log(`Tests Passed: ${passed} | Failed: ${failed}`);
    console.log(`========================================\n`);

  } finally {
    await stopServer();
  }

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
