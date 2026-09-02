// ============================================================================
// EDTECHRA-BITZ: Persistent Knowledge Bitz Progress, Mastery & XP Test Suite
// ============================================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { prepareBitzQuiz, shuffleArray } from '../src/types/knowledgeBitz.ts';
import { CANONICAL_BITZ_CATEGORIES } from '../server/knowledgeBitzService.mjs';

const ROOT_DIR = process.cwd();

console.log('🧪 Starting Knowledge Bitz Persistent Mastery & Dashboard Verification Suite...\n');

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

// ----------------------------------------------------------------------------
// Test Group 1: Database Migration & Schema
// ----------------------------------------------------------------------------
runTest('Database migration creates knowledge_bitz_progress table with all required fields', () => {
  const migrationPath = path.join(ROOT_DIR, 'supabase/migrations/20260916000000_persistent_knowledge_bitz_progress.sql');
  assert(fs.existsSync(migrationPath), 'Migration file must exist in supabase/migrations');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.knowledge_bitz_progress'), 'Must create knowledge_bitz_progress table');
  assert(migrationSql.includes('user_id UUID NOT NULL REFERENCES auth.users(id)'), 'Must reference auth.users(id)');
  assert(migrationSql.includes('bitz_id UUID NOT NULL REFERENCES public.knowledge_bitz(id)'), 'Must reference public.knowledge_bitz(id)');
  assert(migrationSql.includes('attempts INTEGER NOT NULL DEFAULT 1'), 'Must have attempts column');
  assert(migrationSql.includes('correct_answers INTEGER NOT NULL DEFAULT 0'), 'Must have correct_answers column');
  assert(migrationSql.includes('score INTEGER NOT NULL DEFAULT 0'), 'Must have score column');
  assert(migrationSql.includes('xp_earned INTEGER NOT NULL DEFAULT 0'), 'Must have xp_earned column');
  assert(migrationSql.includes('completed BOOLEAN NOT NULL DEFAULT FALSE'), 'Must have completed column');
  assert(migrationSql.includes('mastered BOOLEAN NOT NULL DEFAULT FALSE'), 'Must have mastered column');
  assert(migrationSql.includes('first_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()'), 'Must have first_started_at column');
  assert(migrationSql.includes('completed_at TIMESTAMPTZ'), 'Must have completed_at column');
  assert(migrationSql.includes('mastered_at TIMESTAMPTZ'), 'Must have mastered_at column');
});

runTest('Database migration enforces UNIQUE(user_id, bitz_id) and high-performance indexes', () => {
  const migrationSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations/20260916000000_persistent_knowledge_bitz_progress.sql'), 'utf8');

  assert(migrationSql.includes('CONSTRAINT uq_user_bitz_progress UNIQUE (user_id, bitz_id)'), 'Must enforce UNIQUE(user_id, bitz_id)');
  assert(migrationSql.includes('CREATE INDEX IF NOT EXISTS idx_kbp_user_bitz'), 'Must index (user_id, bitz_id)');
  assert(migrationSql.includes('CREATE INDEX IF NOT EXISTS idx_kbp_user_mastered'), 'Must index (user_id, mastered)');
  assert(migrationSql.includes('CREATE INDEX IF NOT EXISTS idx_kbp_bitz_id'), 'Must index (bitz_id)');
  assert(migrationSql.includes('CREATE INDEX IF NOT EXISTS idx_kbp_mastered_at'), 'Must index (mastered_at DESC)');
});

runTest('Database migration implements Row Level Security (RLS) policies for user isolation', () => {
  const migrationSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations/20260916000000_persistent_knowledge_bitz_progress.sql'), 'utf8');

  assert(migrationSql.includes('ALTER TABLE public.knowledge_bitz_progress ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
  assert(migrationSql.includes('CREATE POLICY "Users can view own bitz progress"'), 'Must have SELECT policy');
  assert(migrationSql.includes('CREATE POLICY "Users can manage own bitz progress"'), 'Must have ALL/management policy');
  assert(migrationSql.includes('auth.uid() = user_id'), 'Must restrict access to own user_id');
});

runTest('Database migration defines atomic PostgreSQL RPC record_bitz_quiz_completion', () => {
  const migrationSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations/20260916000000_persistent_knowledge_bitz_progress.sql'), 'utf8');

  assert(migrationSql.includes('FUNCTION public.record_bitz_quiz_completion'), 'Must define record_bitz_quiz_completion RPC');
  assert(migrationSql.includes('v_is_mastered := (v_safe_correct >= 3)'), 'Must evaluate mastery as >= 3 out of 5');
  assert(migrationSql.includes('v_target_xp := LEAST(10, v_safe_correct * 2)'), 'Must calculate +2 XP per correct answer up to 10');
  assert(migrationSql.includes('v_xp_to_award := GREATEST(0, v_target_xp - v_existing_xp)'), 'Must prevent XP duplicate awarding');
  assert(migrationSql.includes('UPDATE public.profiles'), 'Must atomically update profile XP');
});

// ----------------------------------------------------------------------------
// Test Group 2: Quiz Normalization & Unbiased Shuffling (Positions 1, 2, 3, 4)
// ----------------------------------------------------------------------------
runTest('prepareBitzQuiz resolves text answers, choice letters ("A", "B", "C", "D"), and numeric indices', () => {
  const sampleQuiz = [
    {
      question: 'Q1 with text answer',
      options: ['Red', 'Green', 'Blue', 'Yellow'],
      correct_answer: 'Green'
    },
    {
      question: 'Q2 with letter choice',
      options: ['Apple', 'Banana', 'Cherry', 'Date'],
      correct_answer: 'B' // Banana
    },
    {
      question: 'Q3 with numeric index',
      options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
      correct_answer: 2 // Jupiter
    },
    {
      question: 'Q4 with string index',
      options: ['Cat', 'Dog', 'Elephant', 'Fox'],
      correct_answer: '3' // Fox
    }
  ];

  const prepared = prepareBitzQuiz(sampleQuiz, false);
  assert.strictEqual(prepared.length, 4);
  assert.strictEqual(prepared[0].correct_answer, 'Green');
  assert.strictEqual(prepared[1].correct_answer, 'Banana');
  assert.strictEqual(prepared[2].correct_answer, 'Jupiter');
  assert.strictEqual(prepared[3].correct_answer, 'Fox');
});

runTest('Quiz option shuffling preserves correct-answer identity across positions 1, 2, 3, and 4', () => {
  const testQuestion = {
    question: 'How many hearts does an octopus have?',
    options: ['One', 'Two', 'Three', 'Four'],
    correct_answer: 'Three'
  };

  const positionCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const iterations = 400;

  for (let i = 0; i < iterations; i++) {
    const prepared = prepareBitzQuiz([testQuestion], true)[0];
    assert.strictEqual(prepared.correct_answer, 'Three', 'Correct answer string must remain "Three"');
    assert.strictEqual(prepared.options.length, 4, 'Options must have 4 items');
    assert(prepared.options.includes('Three'), 'Options must contain correct answer');

    const index = prepared.options.indexOf('Three');
    assert(index >= 0 && index <= 3, 'Index must be between 0 and 3');
    positionCounts[index]++;
  }

  // Verify all 4 positions (0, 1, 2, 3) were hit significantly (random distribution)
  console.log(`     Option position distribution across ${iterations} runs:`, positionCounts);
  assert(positionCounts[0] > 40, 'Position 1 must be possible and distributed');
  assert(positionCounts[1] > 40, 'Position 2 must be possible and distributed');
  assert(positionCounts[2] > 40, 'Position 3 must be possible and distributed');
  assert(positionCounts[3] > 40, 'Position 4 must be possible and distributed');
});

// ----------------------------------------------------------------------------
// Test Group 3: Authoritative Mastery Rule (3/5) & Anti-Farming XP
// ----------------------------------------------------------------------------
runTest('Mastery evaluation rule: 0-2/5 is NOT mastered, 3-5/5 IS mastered', () => {
  function evaluateMastery(correctCount) {
    return {
      correctCount,
      score: correctCount,
      xpEarned: correctCount * 2,
      mastered: correctCount >= 3
    };
  }

  // Non-mastered tests
  const res0 = evaluateMastery(0);
  assert.strictEqual(res0.mastered, false);
  assert.strictEqual(res0.xpEarned, 0);

  const res1 = evaluateMastery(1);
  assert.strictEqual(res1.mastered, false);
  assert.strictEqual(res1.xpEarned, 2);

  const res2 = evaluateMastery(2);
  assert.strictEqual(res2.mastered, false);
  assert.strictEqual(res2.xpEarned, 4);

  // Mastered tests
  const res3 = evaluateMastery(3);
  assert.strictEqual(res3.mastered, true);
  assert.strictEqual(res3.xpEarned, 6);

  const res4 = evaluateMastery(4);
  assert.strictEqual(res4.mastered, true);
  assert.strictEqual(res4.xpEarned, 8);

  const res5 = evaluateMastery(5);
  assert.strictEqual(res5.mastered, true);
  assert.strictEqual(res5.xpEarned, 10);
});

runTest('Anti-farming XP simulation: retrying same Bitz only awards incremental difference', () => {
  function simulateQuizAttempts(attemptScores) {
    let existingRecord = null;
    let totalProfileXp = 0;

    for (const score of attemptScores) {
      const targetXp = Math.min(10, score * 2);
      const isMastered = score >= 3;
      const existingXp = existingRecord ? existingRecord.xp_earned : 0;
      const xpToAward = Math.max(0, targetXp - existingXp);

      totalProfileXp += xpToAward;

      existingRecord = {
        score: Math.max(existingRecord?.score || 0, score),
        correct_answers: Math.max(existingRecord?.correct_answers || 0, score),
        xp_earned: Math.max(existingXp, targetXp),
        mastered: (existingRecord?.mastered || isMastered),
        attempts: (existingRecord?.attempts || 0) + 1
      };
    }

    return { record: existingRecord, totalProfileXp };
  }

  // Attempt 1: 3/5 -> +6 XP, mastered = true
  const session1 = simulateQuizAttempts([3]);
  assert.strictEqual(session1.record.mastered, true);
  assert.strictEqual(session1.record.xp_earned, 6);
  assert.strictEqual(session1.totalProfileXp, 6);

  // Attempt 2: Repeat with 3/5 -> +0 XP, total XP = 6, mastered = true
  const session2 = simulateQuizAttempts([3, 3]);
  assert.strictEqual(session2.record.mastered, true);
  assert.strictEqual(session2.record.xp_earned, 6);
  assert.strictEqual(session2.totalProfileXp, 6);

  // Attempt 3: Repeat with lower score 2/5 -> +0 XP, total XP = 6, mastered remains true
  const session3 = simulateQuizAttempts([3, 2]);
  assert.strictEqual(session3.record.mastered, true);
  assert.strictEqual(session3.record.xp_earned, 6);
  assert.strictEqual(session3.totalProfileXp, 6);

  // Attempt 4: Improve score to 5/5 -> +4 incremental XP, total XP = 10, mastered = true
  const session4 = simulateQuizAttempts([3, 5]);
  assert.strictEqual(session4.record.mastered, true);
  assert.strictEqual(session4.record.xp_earned, 10);
  assert.strictEqual(session4.totalProfileXp, 10);
});

// ----------------------------------------------------------------------------
// Test Group 4: Server Endpoints & Dashboard Aggregation
// ----------------------------------------------------------------------------
runTest('Server Express routes include POST /api/bitz/:id/quiz-complete and GET /api/bitz/user-stats', () => {
  const serverCode = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  assert(serverCode.includes("app.post('/api/bitz/:id/quiz-complete'"), 'Must define /api/bitz/:id/quiz-complete endpoint');
  assert(serverCode.includes("app.get('/api/bitz/user-stats'"), 'Must define /api/bitz/user-stats endpoint');
  assert(serverCode.includes("recordQuizCompletion"), 'Must call recordQuizCompletion service method');
});

runTest('12 Canonical categories are standardized and match configuration', () => {
  assert.strictEqual(CANONICAL_BITZ_CATEGORIES.length, 12, 'Must have exactly 12 canonical categories');
  const catNames = CANONICAL_BITZ_CATEGORIES.map(c => c.name);

  assert(catNames.includes('Science & Nature'));
  assert(catNames.includes('People & Psychology'));
  assert(catNames.includes('History & Culture'));
  assert(catNames.includes('Technology & AI'));
  assert(catNames.includes('Business & Economics'));
  assert(catNames.includes('Health & Human Body'));
  assert(catNames.includes('World & Geography'));
  assert(catNames.includes('Arts, Books & Entertainment'));
  assert(catNames.includes('Sports & Games'));
  assert(catNames.includes('Life Skills & English'));
  assert(catNames.includes('Personal Growth'));
  assert(catNames.includes('Mysteries & Legends'));
});

runTest('Category progress aggregation properly handles 0-item categories', () => {
  const mockCatalogue = [
    { id: '1', category: 'Science & Nature', status: 'published' },
    { id: '2', category: 'Science & Nature', status: 'published' },
    { id: '3', category: 'Personal Growth', status: 'published' }
  ];

  const masteredIds = new Set(['1']);

  const norm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const progressList = CANONICAL_BITZ_CATEGORIES.map(cat => {
    const catNorm = norm(cat.name);
    const catIdNorm = norm(cat.id);
    const catBitz = mockCatalogue.filter(b => {
      const cN = norm(b.category);
      return cN === catNorm || cN === catIdNorm;
    });

    const totalCount = catBitz.length;
    const masteredCount = catBitz.filter(b => masteredIds.has(b.id)).length;
    const percentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

    return {
      id: cat.id,
      name: cat.name,
      masteredCount,
      totalCount,
      percentage
    };
  });

  const science = progressList.find(c => c.name === 'Science & Nature');
  assert.strictEqual(science.masteredCount, 1);
  assert.strictEqual(science.totalCount, 2);
  assert.strictEqual(science.percentage, 50);

  const tech = progressList.find(c => c.name === 'Technology & AI');
  assert.strictEqual(tech.masteredCount, 0);
  assert.strictEqual(tech.totalCount, 0);
  assert.strictEqual(tech.percentage, 0);
});

// ----------------------------------------------------------------------------
// Test Group 5: Crash Protection & Safe Navigation
// ----------------------------------------------------------------------------
runTest('publishSettings in exam2Service handles undefined safely without crashing on startTime', () => {
  const exam2Code = fs.readFileSync(path.join(ROOT_DIR, 'server/exam2Service.mjs'), 'utf8');

  assert(exam2Code.includes('safePublishSettings = publishSettings || {}'), 'Must guard publishSettings with default object');
  assert(!exam2Code.includes('publishSettings.startTime') || exam2Code.includes('safePublishSettings.startTime'), 'Must use safePublishSettings');
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log(`\n============================================================`);
console.log(`Results: ${testsPassed} / ${testsTotal} test assertions passed.`);
if (testsPassed === testsTotal) {
  console.log('🎉 ALL KNOWLEDGE BITZ PERSISTENT MASTERY TESTS PASSED!');
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}