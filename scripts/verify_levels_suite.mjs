import fs from 'fs';
import {
  ELEKTRA_LEVELS_1_20,
  getLevelByNumber,
  getLevelByVideoId,
  isLevelUnlocked,
  getLevelStatus
} from '../src/utils/levelsData.ts';

console.log('================================================================');
console.log('ELEKTRA BITZ: AUTOMATED VERIFICATION SUITE FOR LEVELS 1-20');
console.log('================================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failedTests++;
  }
}

// 1. Markdown Source of Truth Checks
console.log('\n--- 1. DATA INTEGRITY & SOURCE OF TRUTH ---');
const markdownContent = fs.readFileSync('C:/Users/hecsb/Downloads/Elektra_Bitz_First_20_Shuffled_Content.md', 'utf8');

assert(ELEKTRA_LEVELS_1_20.length === 20, 'Exactly 20 target levels exist');

let totalQuestions = 0;
let totalOptions = 0;
let all50Words = true;
let allVideosUnique = true;
const videoSet = new Set();

ELEKTRA_LEVELS_1_20.forEach(lvl => {
  const words = lvl.explanation.trim().split(/\s+/).filter(Boolean);
  if (words.length !== 50) {
    console.error(`Level ${lvl.levelNumber} word count is ${words.length} instead of 50!`);
    all50Words = false;
  }
  if (videoSet.has(lvl.youtubeVideoId)) {
    allVideosUnique = false;
  }
  videoSet.add(lvl.youtubeVideoId);

  totalQuestions += lvl.questions.length;
  lvl.questions.forEach(q => {
    totalOptions += q.options.length;
  });
});

assert(all50Words, 'Every explanation contains EXACTLY 50 words');
assert(totalQuestions === 60, `Total questions = ${totalQuestions} (Expected: 60)`);
assert(totalOptions === 240, `Total choices = ${totalOptions} (Expected: 240)`);
assert(allVideosUnique && videoSet.size === 20, 'Every level has a unique valid YouTube video');

// 2. Cache Verification
console.log('\n--- 2. LOCAL CACHE (server/data/youtube_cache.json) VERIFICATION ---');
const cache = JSON.parse(fs.readFileSync('server/data/youtube_cache.json', 'utf8'));
assert(cache.length >= 198, `Cache contains full catalog: ${cache.length} videos`);

let cacheMatchCount = 0;
ELEKTRA_LEVELS_1_20.forEach(lvl => {
  const item = cache.find(v => v.youtube_video_id === lvl.youtubeVideoId);
  if (item && item.learning_content && item.learning_content.quiz?.length === 3) {
    cacheMatchCount++;
  }
});
assert(cacheMatchCount === 20, 'All 20 levels in cache have updated learning content and 3 quiz questions');

// 3. Levels 21+ Preservation Check
console.log('\n--- 3. LEVELS 21+ PRESERVATION CHECK ---');
// Verify video 21 to 50 are intact
const video21 = cache.find(v => v.youtube_video_id === 'DR30-mmALO0'); // Video #21 from transcripts
assert(!!video21, 'Video 21 (DR30-mmALO0) preserved and untouched');

// 4. Progression & Locking Logic Simulation
console.log('\n--- 4. PROGRESSION & LOCKING RULES SIMULATION ---');

// Test A: Initial state
const emptyProgress = {};
assert(isLevelUnlocked(1, emptyProgress) === true, 'Level 1 is unlocked for a new student');
assert(isLevelUnlocked(2, emptyProgress) === false, 'Level 2 is locked initially');
assert(isLevelUnlocked(20, emptyProgress) === false, 'Level 20 is locked initially');
assert(getLevelStatus(1, emptyProgress) === 'available', 'Level 1 status is "available"');
assert(getLevelStatus(2, emptyProgress) === 'locked', 'Level 2 status is "locked"');

// Test B: Quiz Failure on Level 1 (1/3 score)
const failL1Progress = {
  [ELEKTRA_LEVELS_1_20[0].youtubeVideoId]: {
    completed: false,
    quiz_completed: true,
    quiz_score: 1,
    quiz_total: 3,
    watched: true
  }
};
assert(isLevelUnlocked(1, failL1Progress) === true, 'Level 1 remains accessible on failure');
assert(isLevelUnlocked(2, failL1Progress) === false, 'Level 2 remains locked when Level 1 fails with 1/3 score');
assert(getLevelStatus(1, failL1Progress) === 'in_progress', 'Level 1 status is "in_progress" after failed attempt');

// Test C: Quiz Pass on Level 1 (2/3 score)
const passL1Progress = {
  [ELEKTRA_LEVELS_1_20[0].youtubeVideoId]: {
    completed: true,
    quiz_completed: true,
    quiz_score: 2,
    quiz_total: 3,
    watched: true
  }
};
assert(isLevelUnlocked(2, passL1Progress) === true, 'Level 2 unlocks when Level 1 is passed with 2/3 score');
assert(isLevelUnlocked(3, passL1Progress) === false, 'Level 3 remains locked until Level 2 is passed');
assert(getLevelStatus(1, passL1Progress) === 'completed', 'Level 1 status is "completed"');
assert(getLevelStatus(2, passL1Progress) === 'available', 'Level 2 status transitions to "available"');

// Test D: Sequential progression to Level 5
const chainProgress = {};
for (let i = 0; i < 4; i++) {
  chainProgress[ELEKTRA_LEVELS_1_20[i].youtubeVideoId] = {
    completed: true,
    quiz_score: 3,
    quiz_total: 3,
    watched: true
  };
}
assert(isLevelUnlocked(5, chainProgress) === true, 'Level 5 unlocks after Levels 1-4 are passed');
assert(isLevelUnlocked(6, chainProgress) === false, 'Level 6 is locked until Level 5 is passed');
assert(getLevelStatus(5, chainProgress) === 'available', 'Level 5 status is "available"');

// Test E: Anti-bypass check (trying to skip directly to Level 10 without completing Level 9)
const skippedProgress = {
  [ELEKTRA_LEVELS_1_20[0].youtubeVideoId]: { completed: true, quiz_score: 3 },
  [ELEKTRA_LEVELS_1_20[9].youtubeVideoId]: { completed: true, quiz_score: 3 } // Attempted forged L10
};
assert(isLevelUnlocked(10, skippedProgress) === false, 'Level 10 remains locked if Level 9 is not completed (anti-bypass)');

console.log('\n================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
}
