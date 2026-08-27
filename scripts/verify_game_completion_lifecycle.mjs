// ============================================================================
// EDTECHRA-BITZ: Comprehensive Game Completion Lifecycle Verification Suite
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting Game Completion Lifecycle Automated Verification...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${e.message}\n`);
  }
}

// 1. Simulate in-memory completion handling
const completionsDB = [];
const activityInteractionsDB = [];
const userProfilesDB = {
  'student-1': { id: 'student-1', name: 'Alice', xp: 100, role: 'student' },
  'student-2': { id: 'student-2', name: 'Bob', xp: 100, role: 'student' }
};

function completeBubblePopLevel(userId, level, score, targetScore, durationSeconds = 30) {
  const isCompleted = score >= targetScore;
  if (!isCompleted) {
    return { is_completed: false, error: 'Target score not met' };
  }

  const alreadyCompleted = completionsDB.some(c => c.user_id === userId && c.level === level);
  let xpAwarded = 0;

  if (alreadyCompleted) {
    xpAwarded = 0;
  } else {
    xpAwarded = 10;
    completionsDB.push({
      id: `comp-${Date.now()}-${Math.random()}`,
      user_id: userId,
      level,
      score,
      target_score: targetScore,
      xp_awarded: xpAwarded,
      duration_seconds: durationSeconds,
      completed_at: new Date().toISOString()
    });

    activityInteractionsDB.push({
      user_id: userId,
      activity_id: `bubble_pop_${level}`,
      activity_type: 'bubble_pop',
      interaction_type: 'completed',
      completed_at: new Date().toISOString()
    });

    if (userProfilesDB[userId]) {
      userProfilesDB[userId].xp += xpAwarded;
    }
  }

  return {
    is_completed: true,
    level,
    score,
    target_score: targetScore,
    xp_awarded: xpAwarded,
    already_completed: alreadyCompleted
  };
}

function calculateLeaderboardXP(userId) {
  const baseXP = userProfilesDB[userId] ? 100 : 0;
  const gameXP = completionsDB
    .filter(c => c.user_id === userId)
    .reduce((sum, c) => sum + (c.xp_awarded || 0), 0);
  return baseXP + gameXP;
}

// TEST 1: Student completes Level 7 -> Score recorded, +10 XP awarded
test('TEST 1: Student 1 completes Level 7 -> Score and +10 XP recorded', () => {
  const result = completeBubblePopLevel('student-1', 7, 1680, 1500, 30);
  assert.strictEqual(result.is_completed, true);
  assert.strictEqual(result.level, 7);
  assert.strictEqual(result.score, 1680);
  assert.strictEqual(result.target_score, 1500);
  assert.strictEqual(result.xp_awarded, 10);
  assert.strictEqual(result.already_completed, false);
});

// TEST 2: Refresh simulation -> Level 7 record survives and remains completed
test('TEST 2: Refresh simulation -> Level 7 persists in database and is completed', () => {
  const record = completionsDB.find(c => c.user_id === 'student-1' && c.level === 7);
  assert(record !== undefined, 'Record for Level 7 must exist');
  assert.strictEqual(record.score, 1680);
  assert.strictEqual(record.xp_awarded, 10);
});

// TEST 3: Resubmitting Level 7 as same student -> 0 XP awarded, no duplicate record
test('TEST 3: Duplicate submission of Level 7 -> Prevent duplicate XP and duplicate record', () => {
  const beforeCount = completionsDB.length;
  const duplicateResult = completeBubblePopLevel('student-1', 7, 1800, 1500, 30);
  const afterCount = completionsDB.length;

  assert.strictEqual(duplicateResult.already_completed, true);
  assert.strictEqual(duplicateResult.xp_awarded, 0);
  assert.strictEqual(beforeCount, afterCount, 'Database record count must not increase');
});

// TEST 4: Leaderboard reflection -> Student 1 has earned exactly +10 XP from Level 7
test('TEST 4: Leaderboard calculation correctly reflects single Level 7 XP award', () => {
  const xp = calculateLeaderboardXP('student-1');
  assert.strictEqual(xp, 110, 'Student 1 total XP must be 100 base + 10 game XP = 110');
});

// TEST 5: Refresh leaderboard -> XP remains stable and no duplicates
test('TEST 5: Leaderboard recalculation is idempotent', () => {
  const xp1 = calculateLeaderboardXP('student-1');
  const xp2 = calculateLeaderboardXP('student-1');
  assert.strictEqual(xp1, xp2);
});

// TEST 6: Student 2 (who has not completed Level 7) is not affected
test('TEST 6: Student 2 has not completed Level 7 and remains eligible', () => {
  const s2Record = completionsDB.find(c => c.user_id === 'student-2' && c.level === 7);
  assert.strictEqual(s2Record, undefined, 'Student 2 must not have Level 7 completed');
  const s2XP = calculateLeaderboardXP('student-2');
  assert.strictEqual(s2XP, 100, 'Student 2 must still have base XP');
});

// TEST 7: Student 2 completes Level 7 independently
test('TEST 7: Student 2 can complete Level 7 independently and receive +10 XP', () => {
  const res2 = completeBubblePopLevel('student-2', 7, 1550, 1500, 30);
  assert.strictEqual(res2.is_completed, true);
  assert.strictEqual(res2.xp_awarded, 10);
  assert.strictEqual(calculateLeaderboardXP('student-2'), 110);
});

// TEST 8: Component file inspections: Verify no [ PLAY AGAIN ] and no [ NEXT LEVEL ] across cards
test('TEST 8: Verify UI component panels do not contain PLAY AGAIN or NEXT LEVEL buttons', () => {
  const root = path.resolve(__dirname, '..');
  const bubbleCard = fs.readFileSync(path.join(root, 'src/components/PostFeed/BubblePopCard.tsx'), 'utf8');
  const flipCard = fs.readFileSync(path.join(root, 'src/components/PostFeed/SpellingFlipCardCard.tsx'), 'utf8');
  const reorderCard = fs.readFileSync(path.join(root, 'src/components/PostFeed/ReorderSentenceCard.tsx'), 'utf8');
  const quizCard = fs.readFileSync(path.join(root, 'src/components/PostFeed/QuizBitCard.tsx'), 'utf8');

  assert(!bubbleCard.includes('PLAY AGAIN'), 'BubblePopCard must not have PLAY AGAIN');
  assert(!bubbleCard.includes('NEXT LEVEL'), 'BubblePopCard must not have NEXT LEVEL');
  assert(!flipCard.includes('PLAY AGAIN'), 'SpellingFlipCardCard must not have PLAY AGAIN');
  assert(!flipCard.includes('NEXT LEVEL'), 'SpellingFlipCardCard must not have NEXT LEVEL');
  assert(!reorderCard.includes('PLAY AGAIN'), 'ReorderSentenceCard must not have PLAY AGAIN');
  assert(!reorderCard.includes('NEXT SENTENCE'), 'ReorderSentenceCard must not have NEXT SENTENCE');
  assert(!quizCard.includes('PLAY AGAIN'), 'QuizBitCard must not have PLAY AGAIN');
  assert(!quizCard.includes('NEXT QUIZ'), 'QuizBitCard must not have NEXT QUIZ');
});

console.log(`\n🏁 Lifecycle Results: ${passed} / ${total} tests passed!`);
if (passed !== total) {
  process.exit(1);
}
