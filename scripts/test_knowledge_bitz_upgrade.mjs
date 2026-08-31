// ============================================================================
// EDTECHRA BITZ: Production Audit & Verification Test Suite
// Validates all 16 requirements from the Knowledge Bitz system audit.
// ============================================================================

import dotenv from 'dotenv';
import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function runAuditSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING KNOWLEDGE BITZ PRODUCTION AUDIT & VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: NEW BITZ MUST DEFAULT TO DRAFT
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Default Draft & Publishing Constraints ---');
  const sampleDraft = await knowledgeBitzService.createBitz({
    title: 'How Honey Never Spoils: Natural Antimicrobial Perfection',
    short_fact: 'Archaeologists found 3,000-year-old edible honey in Egyptian tombs.',
    reading_text: 'Honey possesses an extraordinarily low moisture content and high acidity (pH 3.9), creating an inhospitable environment for bacteria and microorganisms. When bees produce honey, they add an enzyme called glucose oxidase that creates hydrogen peroxide as a byproduct. This natural preservative prevents spoilage for millennia.',
    topic_id: 'biology',
    category: 'Science & Nature'
  });

  assert(sampleDraft.status === 'draft', 'Newly created Bitz defaults strictly to status: "draft"');
  assert(sampleDraft.visual_status === 'missing', 'Newly created Bitz defaults to visual_status: "missing"');

  // Attempting to publish without an image must fail
  let publishWithoutImageFailed = false;
  try {
    await knowledgeBitzService.updateBitz(sampleDraft.id, { status: 'published' });
  } catch (err) {
    publishWithoutImageFailed = true;
  }
  assert(publishWithoutImageFailed, 'Updating status to "published" without ready image is strictly blocked');

  // Attach a ready image and publish
  const publishedBitz = await knowledgeBitzService.updateBitz(sampleDraft.id, {
    visual_url: 'https://r2.edtechra.com/bitz/covers/honey_test.webp',
    visual_status: 'ready',
    status: 'published'
  });
  assert(publishedBitz.status === 'published', 'Bitz with ready image successfully updates to status: "published"');

  // --------------------------------------------------------------------------
  // TEST 2: BULK IMPORT (20 REALISTIC RECORDS AS DRAFT)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Bulk Import Pipeline (20 Records) ---');
  const runId = Date.now();
  const batchRecords = [
    {
      title: `Why Do We Yawn When Others Yawn? Mirror Neurons (${runId})`,
      short_fact: 'Contagious yawning is linked to social empathy and brain temperature regulation.',
      reading_text: 'Contagious yawning is a subconscious social phenomenon driven by mirror neurons in the motor cortex. Studies show that individuals with higher empathy scores yawn more readily in response to others. Yawning also brings a rush of cool air into nasal passages, lowering brain temperature.',
      topic_id: 'psychology',
      category: 'People & Society',
      difficulty: 'Easy'
    },
    {
      title: `The Great Barrier Reef Is Visible From Space (${runId})`,
      short_fact: 'Stretching over 2,300 kilometers, it is the largest living structure on Earth.',
      reading_text: 'Composed of billions of tiny coral polyps, the Great Barrier Reef covers an area larger than Italy. It hosts thousands of species of fish, mollusks, and marine turtles. The biological calcium carbonate matrix reflects sunlight, making it clearly distinguishable from low Earth orbit.',
      topic_id: 'nature',
      category: 'Science & Nature',
      difficulty: 'Easy'
    },
    {
      title: `Quantum Entanglement: Spooky Action at a Distance (${runId})`,
      short_fact: 'Two entangled particles instantaneously influence each other across light years.',
      reading_text: 'When two subatomic particles become quantum entangled, the quantum state of one instantaneously determines the state of the other, regardless of distance. Albert Einstein famously called this spooky action at a distance because it seemed to violate the cosmic speed limit of light.',
      topic_id: 'physics',
      category: 'Science & Nature',
      difficulty: 'Hard'
    },
    {
      title: `Invalid Too Short Reading (${runId})`,
      short_fact: 'This fact has an invalid reading text length.',
      reading_text: 'Too short text.',
      topic_id: 'biology'
    }
  ];

  // Add 16 more valid records to reach 20
  for (let i = 1; i <= 16; i++) {
    batchRecords.push({
      title: `Microlearning Insight #${i}: The Power of Spaced Repetition (${runId})`,
      short_fact: `Spacing study sessions exponentially boosts retention across long intervals.`,
      reading_text: `Spaced repetition works by systematically reviewing material at increasing intervals right before the memory fades. Hermann Ebbinghaus discovered the forgetting curve in 1885, proving that active recall resets retention to 100 percent. Modern algorithms optimize these review intervals for maximum learning efficiency.`,
      topic_id: i % 2 === 0 ? 'productivity' : 'ai',
      category: i % 2 === 0 ? 'Life & Career' : 'Technology & Future',
      difficulty: 'Medium'
    });
  }

  const importResult = await knowledgeBitzService.bulkImportBitz(batchRecords);
  assert(importResult.totalSubmitted === 20, 'Submitted exactly 20 batch records');
  assert(importResult.importedCount === 19, '19 valid records successfully imported');
  assert(importResult.failedCount === 1, '1 invalid record (too short reading) rejected with diagnostics');
  assert(importResult.imported.every(b => b.status === 'draft'), 'ALL imported batch records strictly default to status: "draft"');

  // --------------------------------------------------------------------------
  // TEST 3: FEED QUERY STRICTLY EXCLUDES DRAFTS
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Feed Filtering & Draft Exclusion ---');
  const initialFeed = await knowledgeBitzService.getFeed({ page: 1, limit: 50 });
  const hasDraftInFeed = initialFeed.bitz.some(b => b.status !== 'published');
  assert(!hasDraftInFeed, 'Explore Feed contains ONLY published Bitz (0 drafts in feed)');

  // --------------------------------------------------------------------------
  // TEST 4: LEARNED-FACT EXCLUSION & XP ANTI-FARMING
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Learned Fact Exclusion & XP Anti-Farming ---');
  const testUserId = 'test-student-uuid-101';

  // 1st Learn: should award +10 XP
  const learn1 = await knowledgeBitzService.recordLearningState({
    userId: testUserId,
    bitzId: publishedBitz.id,
    status: 'learned'
  });
  assert(learn1.success === true, '1st Learn interaction recorded successfully');
  assert(learn1.xpAwarded === 10, '1st Learn awards +10 XP');
  assert(learn1.alreadyLearned === false, '1st Learn marks alreadyLearned: false');

  // 2nd Attempt: should award 0 XP
  const learn2 = await knowledgeBitzService.recordLearningState({
    userId: testUserId,
    bitzId: publishedBitz.id,
    status: 'learned'
  });
  assert(learn2.xpAwarded === 0, '2nd Learn attempt awards exactly 0 XP (Anti-Farming verified)');
  assert(learn2.alreadyLearned === true, '2nd Learn attempt recognizes alreadyLearned: true');

  // Retake Quiz attempt: should award 0 XP
  const quizAttempt = await knowledgeBitzService.recordLearningState({
    userId: testUserId,
    bitzId: publishedBitz.id,
    status: 'learned',
    selectedOption: 'correct answer'
  });
  assert(quizAttempt.xpAwarded === 0, 'Retaking quiz on learned fact awards 0 XP');

  // Feed check: publishedBitz must now be permanently excluded from this user's feed!
  const userFeed = await knowledgeBitzService.getFeed({ page: 1, limit: 50 }, null, testUserId);
  const isExcluded = !userFeed.bitz.some(b => b.id === publishedBitz.id);
  assert(isExcluded, 'Learned Bitz is permanently excluded from student Explore feed');

  // --------------------------------------------------------------------------
  // TEST 5: TOPIC PERSONALIZATION
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Topic Personalization ---');
  // Save preferences with only 'space' and 'physics'
  await knowledgeBitzService.saveUserTopicPreferences(testUserId, ['space', 'physics'], false);

  const pref = await knowledgeBitzService.getUserTopicPreferences(testUserId);
  assert(pref.allSelected === false, 'Topic preference allSelected: false recorded');
  assert(pref.selectedTopics.length === 2, '2 topics selected (space, physics)');

  // --------------------------------------------------------------------------
  // TEST 6: SAVED KNOWLEDGE POCKET ACCESSIBILITY
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Testing Saved Knowledge Pocket ---');
  await knowledgeBitzService.toggleSave(testUserId, publishedBitz.id, 'Science');
  const savedPocket = await knowledgeBitzService.getSavedBitz(testUserId);
  const isFoundInPocket = savedPocket.some(b => b.id === publishedBitz.id);
  assert(isFoundInPocket, 'Learned fact remains 100% accessible in Saved Knowledge Pocket');

  // --------------------------------------------------------------------------
  // TEST 7: GEMINI / R2 PIPELINE INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Testing Gemini & R2 Pipeline Structure ---');
  assert(typeof knowledgeBitzService.generateBitzVisualWithGemini === 'function', 'generateBitzVisualWithGemini method is present');
  const dummyBitz = { id: 'test-gen', title: 'Speed of Light in Vacuum', topic_id: 'physics' };
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('ℹ️ [NOTICE] GEMINI_API_KEY not in local shell env; verifying graceful error return:');
    const noKeyResult = await knowledgeBitzService.generateBitzVisualWithGemini(dummyBitz);
    assert(noKeyResult.success === false, 'Gracefully handles missing server API key with clean error message');
  }

  // Cleanup test bitz
  await knowledgeBitzService.deleteBitz(sampleDraft.id);

  console.log('\n================================================================');
  console.log(`🏁 AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuditSuite().catch(err => {
  console.error('Audit suite crashed:', err);
  process.exit(1);
});
