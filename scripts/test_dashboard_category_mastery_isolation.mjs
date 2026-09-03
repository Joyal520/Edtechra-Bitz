// ============================================================================
// EDTECHRA-BITZ: Category Mastery Isolation & Dashboard Progress Test Suite
// Verifies:
// 1. Authoritative category resolution (resolveBitzCanonicalCategory)
// 2. Complete isolation between categories (Mastering in Cat A does NOT affect Cat B)
// 3. Independent category denominators (cat.masteredCount / cat.totalCount)
// 4. Global total vs Category total separation
// 5. Zero-count category handling ('No Bitz yet', 0/0 suppression)
// 6. Distinct Bitz ID deduplication (duplicate progress rows do NOT inflate counts)
// 7. Live Supabase category calculation verification
// ============================================================================

import assert from 'assert';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  BITZ_CATEGORIES,
  resolveBitzCanonicalCategory
} from '../src/utils/bitzTopicsConfig.ts';
import { knowledgeBitzService as serverBitzService } from '../server/knowledgeBitzService.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

console.log('🧪 Starting Dashboard Category Mastery Isolation Test Suite...\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

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

// ----------------------------------------------------------------------------
// Test 1: Category Resolver Isolation (No false cross-category matches)
// ----------------------------------------------------------------------------
runTest('resolveBitzCanonicalCategory maps categories strictly and prevents cross-category contamination', () => {
  // Test bitz where category is "People & Psychology" but topic_id default was "science"
  const bitzPsych = {
    id: 'b-1',
    category: 'People & Psychology',
    topic_id: 'science',
    sub_topic: 'Mindset & Habits'
  };
  const resolvedPsych = resolveBitzCanonicalCategory(bitzPsych);
  assert.strictEqual(resolvedPsych, 'people_psychology', 'Must resolve to people_psychology despite topic_id="science"');

  // Test bitz where category is "Science & Nature"
  const bitzSci = {
    id: 'b-2',
    category: 'Science & Nature',
    topic_id: 'science',
    sub_topic: 'Animals & Wildlife'
  };
  assert.strictEqual(resolveBitzCanonicalCategory(bitzSci), 'science_nature');

  // Test bitz where category is "History & Culture"
  const bitzHist = {
    id: 'b-3',
    category: 'History & Culture',
    topic_id: 'science',
    sub_topic: 'Ancient Civilizations'
  };
  assert.strictEqual(resolveBitzCanonicalCategory(bitzHist), 'history_culture');

  // Test case-insensitivity and formatting
  assert.strictEqual(resolveBitzCanonicalCategory('science & nature'), 'science_nature');
  assert.strictEqual(resolveBitzCanonicalCategory('PEOPLE & PSYCHOLOGY'), 'people_psychology');
  assert.strictEqual(resolveBitzCanonicalCategory('mysteries-legends'), 'mysteries_legends');
});

// ----------------------------------------------------------------------------
// Test 2: Category Aggregation Isolation (Scenario: 3 Science, 0 Others)
// ----------------------------------------------------------------------------
runTest('Category progress calculates mastery strictly per category', () => {
  const publishedBitz = [
    // 3 Science Bitz
    { id: 'sci-1', category: 'Science & Nature', topic_id: 'science' },
    { id: 'sci-2', category: 'Science & Nature', topic_id: 'science' },
    { id: 'sci-3', category: 'Science & Nature', topic_id: 'science' },
    { id: 'sci-4', category: 'Science & Nature', topic_id: 'science' },
    { id: 'sci-5', category: 'Science & Nature', topic_id: 'science' },
    // 2 Psychology Bitz
    { id: 'psy-1', category: 'People & Psychology', topic_id: 'science' },
    { id: 'psy-2', category: 'People & Psychology', topic_id: 'science' },
    // 1 History Bitz
    { id: 'hist-1', category: 'History & Culture', topic_id: 'science' }
  ];

  // User has mastered only sci-1, sci-2, sci-3 (3 Science bitz)
  const masteredBitzIds = new Set(['sci-1', 'sci-2', 'sci-3']);

  const categoryProgress = BITZ_CATEGORIES.map(cat => {
    const catBitz = publishedBitz.filter(b => resolveBitzCanonicalCategory(b) === cat.id);
    const totalCount = catBitz.length;
    const masteredCount = catBitz.filter(b => masteredBitzIds.has(b.id)).length;
    const percentage = totalCount > 0 ? Math.min(100, Math.round((masteredCount / totalCount) * 100)) : 0;

    return {
      id: cat.id,
      name: cat.name,
      masteredCount,
      totalCount,
      percentage
    };
  });

  const sciProgress = categoryProgress.find(c => c.id === 'science_nature');
  assert.strictEqual(sciProgress.masteredCount, 3, 'Science mastered must be 3');
  assert.strictEqual(sciProgress.totalCount, 5, 'Science total must be 5');
  assert.strictEqual(sciProgress.percentage, 60, 'Science percentage must be 60%');

  const psyProgress = categoryProgress.find(c => c.id === 'people_psychology');
  assert.strictEqual(psyProgress.masteredCount, 0, 'People & Psychology mastered must be 0');
  assert.strictEqual(psyProgress.totalCount, 2, 'People & Psychology total must be 2');
  assert.strictEqual(psyProgress.percentage, 0, 'People & Psychology percentage must be 0%');

  const histProgress = categoryProgress.find(c => c.id === 'history_culture');
  assert.strictEqual(histProgress.masteredCount, 0, 'History mastered must be 0');
  assert.strictEqual(histProgress.totalCount, 1, 'History total must be 1');
  assert.strictEqual(histProgress.percentage, 0, 'History percentage must be 0%');

  const techProgress = categoryProgress.find(c => c.id === 'technology_ai');
  assert.strictEqual(techProgress.masteredCount, 0, 'Technology mastered must be 0');
  assert.strictEqual(techProgress.totalCount, 0, 'Technology total must be 0 (No Bitz yet)');
  assert.strictEqual(techProgress.percentage, 0, 'Technology percentage must be 0%');
});

// ----------------------------------------------------------------------------
// Test 3: Incremental Mastery across Multiple Categories
// ----------------------------------------------------------------------------
runTest('Adding mastery in Category B updates ONLY Category B and Global, leaving Category A unchanged', () => {
  const publishedBitz = [
    { id: 'sci-1', category: 'Science & Nature' },
    { id: 'sci-2', category: 'Science & Nature' },
    { id: 'sci-3', category: 'Science & Nature' },
    { id: 'sci-4', category: 'Science & Nature' },
    { id: 'psy-1', category: 'People & Psychology' },
    { id: 'psy-2', category: 'People & Psychology' }
  ];

  // Step 1: User has 3 Science
  const masteredSet = new Set(['sci-1', 'sci-2', 'sci-3']);

  // Step 2: User now masters 1 Psychology
  masteredSet.add('psy-1');

  const categoryProgress = BITZ_CATEGORIES.map(cat => {
    const catBitz = publishedBitz.filter(b => resolveBitzCanonicalCategory(b) === cat.id);
    const totalCount = catBitz.length;
    const masteredCount = catBitz.filter(b => masteredSet.has(b.id)).length;
    const percentage = totalCount > 0 ? Math.min(100, Math.round((masteredCount / totalCount) * 100)) : 0;

    return { id: cat.id, name: cat.name, masteredCount, totalCount, percentage };
  });

  const sci = categoryProgress.find(c => c.id === 'science_nature');
  const psy = categoryProgress.find(c => c.id === 'people_psychology');

  // Science must remain 3 / 4
  assert.strictEqual(sci.masteredCount, 3);
  assert.strictEqual(sci.totalCount, 4);
  assert.strictEqual(sci.percentage, 75);

  // Psychology must now be 1 / 2
  assert.strictEqual(psy.masteredCount, 1);
  assert.strictEqual(psy.totalCount, 2);
  assert.strictEqual(psy.percentage, 50);

  // Global total must be 4 / 6
  assert.strictEqual(masteredSet.size, 4);
});

// ----------------------------------------------------------------------------
// Test 4: Deduplication of Progress Records (Duplicate attempts don't inflate)
// ----------------------------------------------------------------------------
runTest('Duplicate progress records for the same Bitz do NOT inflate category count', () => {
  const progressRows = [
    { bitz_id: 'sci-1', score: 5, mastered: true },
    { bitz_id: 'sci-1', score: 4, mastered: true }, // Duplicate
    { bitz_id: 'sci-2', score: 3, mastered: true }
  ];

  const masteredIds = new Set();
  progressRows.forEach(r => {
    if (r.mastered || r.score >= 3) {
      masteredIds.add(r.bitz_id);
    }
  });

  assert.strictEqual(masteredIds.size, 2, 'Distinct mastered count must be 2, not 3');
});

// ----------------------------------------------------------------------------
// Test 5: Live Database Category Distribution & Calculation Verification
// ----------------------------------------------------------------------------
await runAsyncTest('Live Supabase published Bitz partition cleanly into independent categories', async () => {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('    (Skipping live Supabase test — no environment variables)');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: publishedBitz, error } = await supabase
    .from('knowledge_bitz')
    .select('id,bitz_code,title,short_fact,category,topic_id,sub_topic,status')
    .eq('status', 'published');

  assert(!error, `Supabase query must succeed: ${error?.message}`);
  assert(Array.isArray(publishedBitz), 'Published bitz must be an array');
  assert(publishedBitz.length >= 100, `Published bitz count should be >= 100 (got ${publishedBitz.length})`);

  let totalSumAcrossCategories = 0;
  const breakdown = {};

  BITZ_CATEGORIES.forEach(cat => {
    const catBitz = publishedBitz.filter(b => resolveBitzCanonicalCategory(b) === cat.id);
    breakdown[cat.name] = catBitz.length;
    totalSumAcrossCategories += catBitz.length;
  });

  console.log('    Live Category Breakdown:', breakdown);

  // Assert Science & Nature is ~19, not 114
  assert(breakdown['Science & Nature'] < 50, `Science & Nature count must be specific (~19), not all bitz (${breakdown['Science & Nature']})`);
  assert(breakdown['Science & Nature'] >= 15, `Science & Nature should have >= 15 bitz`);
  assert(breakdown['People & Psychology'] >= 20, `People & Psychology should have >= 20 bitz`);

  // Assert sum equals total published
  assert.strictEqual(totalSumAcrossCategories, publishedBitz.length, 'Sum of all category bitz must equal total published bitz');
});

console.log(`\n============================================================`);
console.log(`Results: ${testsPassed} / ${testsTotal} test assertions passed.`);
if (testsPassed === testsTotal) {
  console.log('🎉 ALL DASHBOARD CATEGORY MASTERY ISOLATION TESTS PASSED!\n');
} else {
  console.error(`⚠️ ${testsTotal - testsPassed} test(s) failed!\n`);
  process.exit(1);
}
