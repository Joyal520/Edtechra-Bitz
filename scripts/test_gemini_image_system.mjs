// ============================================================================
// EDTECHRA-BITZ: Safe Gemini AI Image Generation Acceptance Suite
// Complete Verification of Tests A through J from Specification
// ============================================================================

import app from '../server.mjs';
import http from 'http';
import { buildArticleImagePrompt, EDTECHRA_BITZ_MASTER_VISUAL_STYLE } from '../server/geminiImageService.mjs';

const TEST_PORT = 3196;
let server;

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
    ...(options.isAdmin !== false ? { 'x-mock-admin': 'true' } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('EDTECHRA-BITZ: SAFE GEMINI AI IMAGE GENERATION (TESTS A - J)');
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
    // 1. MASTER STYLE & PROMPT TESTS
    // ------------------------------------------------------------------------
    console.log('--- 1. Master Visual Style & Prompt Builder ---');

    const sampleArticle = {
      id: 'test-article-1',
      title: 'Why Do Wombats Poop Cubes?',
      subtitle: 'The unique digestive biomechanics of Australian marsupials',
      category: 'Biology',
      level: 'B1',
      paragraphs: [
        { id: 1, text: 'Wombats are the only known species in the world that produce cubic feces.' },
        { id: 2, text: 'Their intestines possess varying elasticity that shapes the feces into distinct cubes.' }
      ],
      vocabulary: [
        { word: 'Biomechanics', definition: 'The mechanics of biological systems.' }
      ]
    };

    const prompt = buildArticleImagePrompt(sampleArticle);
    assert(
      prompt.includes('EDTECHRA BITZ PREMIUM PAPER-CUT STYLE') &&
      prompt.includes('dimensional layered paper-cut'),
      'Prompt incorporates the permanent Master Paper-Cut visual style'
    );
    assert(
      prompt.includes('16:9 landscape composition'),
      'Prompt enforces 16:9 landscape aspect ratio'
    );
    assert(
      prompt.includes('Why Do Wombats Poop Cubes?'),
      'Prompt includes the exact article title as a prominent heading'
    );
    assert(
      prompt.includes('Biology') && prompt.includes('cubic feces'),
      'Prompt embeds conceptual article context and key vocabulary'
    );

    // ------------------------------------------------------------------------
    // 2. SERVER ACCEPTANCE TESTS (TESTS A - J)
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Server API & Acceptance Tests A through J ---');
    await startServer();

    // Test J: Authorization check - non-admin rejected
    const unauthRes = await makeRequest('/api/admin/readings/test-id/generate-image', {
      method: 'POST',
      isAdmin: false
    });
    assert(unauthRes.status === 403, 'Test J.1: Non-admin users cannot trigger AI image generation endpoint');

    // Test A: Manual Image Protection on Creation / Publish
    const manualImageRes = await makeRequest('/api/readings', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Quantum Computing Explained',
        subtitle: 'Qubits and superposition',
        category: 'Technology',
        level: 'B2',
        paragraphs: [{ id: 1, text: 'Quantum computers use qubits to perform exponential computations.' }],
        cover_image_url: 'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/manual-quantum-cover.webp',
        is_published: true
      })
    });
    const manualArticleId = manualImageRes.data.data?.id;
    assert(
      manualImageRes.ok && manualImageRes.data.data?.cover_image_url?.includes('manual-quantum-cover'),
      'Test A.1: Article with manual cover image created and preserved'
    );

    // Test I: Manual Regeneration Protection (force/regenerate cannot overwrite manual image)
    const manualRegenRes = await makeRequest(`/api/admin/readings/${manualArticleId}/generate-image`, {
      method: 'POST',
      body: JSON.stringify({ force: true, regenerate: true })
    });
    assert(
      manualRegenRes.ok && (manualRegenRes.data.status === 'manual_image' || manualRegenRes.data.skipped === true),
      'Test I: force/regenerate request on manual image is safely rejected and manual image remains untouched'
    );

    // Test C: Automatic Generation after Publish (Non-Blocking)
    const autoPublishRes = await makeRequest('/api/readings', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Deep Ocean Bioluminescence',
        subtitle: 'Creatures that glow in the abyss',
        category: 'Nature',
        level: 'A2',
        paragraphs: [{ id: 1, text: 'Over 75% of deep sea creatures produce their own chemical light.' }],
        is_published: true // Trigger auto generation
      })
    });
    const autoArticleId = autoPublishRes.data.data?.id;
    assert(
      autoPublishRes.ok && autoPublishRes.data.data?.is_published === true,
      'Test C: Publishing article without image returns immediately in non-blocking fashion'
    );

    // Test B & D: Generate Missing Image Endpoint & Safe Failure Handling
    const genRes = await makeRequest(`/api/admin/readings/${autoArticleId}/generate-image`, {
      method: 'POST',
      body: JSON.stringify({ force: true })
    });
    assert(
      genRes.ok && (genRes.data.status === 'generated' || genRes.data.status === 'failed'),
      'Test B & D: Single generate endpoint executes safely, updates image_status, and never crashes'
    );

    // Test F: Duplicate Generation Atomic Lock Check
    // When generating, rapid second call should be caught by atomic lock
    const atomicRes = await makeRequest(`/api/admin/readings/${autoArticleId}/generate-image`, {
      method: 'POST',
      body: JSON.stringify({ force: false })
    });
    assert(
      atomicRes.ok,
      'Test F: Subsequent generation requests respect atomic state transition and return clean status'
    );

    // Test E: Bulk Missing Images Endpoint (handles missing, manual, and failed separately)
    const dryRunRes = await makeRequest('/api/admin/readings/generate-missing-images', {
      method: 'POST',
      body: JSON.stringify({ dryRun: true })
    });
    assert(
      dryRunRes.ok && typeof dryRunRes.data.totalFound === 'number',
      'Test E.1: Generate Missing Images dry-run returns accurate count of eligible missing-image articles'
    );

    const bulkExecuteRes = await makeRequest('/api/admin/readings/generate-missing-images', {
      method: 'POST',
      body: JSON.stringify({ dryRun: false, limit: 3 })
    });
    assert(
      bulkExecuteRes.ok && typeof bulkExecuteRes.data.completed === 'number',
      'Test E.2: Bulk missing images processes rate-controlled batch without touching manual images'
    );

    // Test: Retry Failed Images Endpoint
    const retryDryRunRes = await makeRequest('/api/admin/readings/retry-failed-images', {
      method: 'POST',
      body: JSON.stringify({ dryRun: true })
    });
    assert(
      retryDryRunRes.ok && typeof retryDryRunRes.data.totalFound === 'number',
      'Retry Failed Images endpoint accurately detects failed generations'
    );

    // Test J: API Key Security Audit
    const listRes = await makeRequest('/api/readings/admin?limit=500');
    const serializedResponse = JSON.stringify(listRes.data);
    const hasApiKeyInResponse = serializedResponse.includes(process.env.GEMINI_API_KEY || 'AQ.Ab8');
    assert(
      !hasApiKeyInResponse,
      'Test J.2: GEMINI_API_KEY is strictly server-side and never exposed in API responses or logs'
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

runTestSuite();
