// ============================================================================
// EDTECHRA-BITZ: Feed Game / Quiz Experience Automated Verification Suite
// ============================================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = process.cwd();

console.log('🧪 Starting EdTechra Feed Game/Quiz Experience Test Suite...\n');

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
// Test 1: SpellingFlipCardCard & SpellingFlipGame In-Panel Transformation
// ----------------------------------------------------------------------------
runTest('SpellingFlipCardCard renders transformed post-game panel with PLAY AGAIN & NEXT LEVEL', () => {
  const cardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/SpellingFlipCardCard.tsx'), 'utf8');
  const gameFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/games/SpellingFlipGame.tsx'), 'utf8');

  // Verify result state metrics & badges
  assert(cardFile.includes('✓ Challenge Complete'), 'Must show Challenge Complete badge');
  assert(cardFile.includes('+{lastResult.totalXp} XP'), 'Must show XP awarded');
  assert(cardFile.includes('Score'), 'Must show score');
  assert(cardFile.includes('Best Score'), 'Must show best score');

  // Verify action buttons in card
  assert(cardFile.includes('PLAY AGAIN'), 'Card must have PLAY AGAIN action');
  assert(cardFile.includes('NEXT LEVEL'), 'Card must have NEXT LEVEL action');
  assert(cardFile.includes('handlePlayAgain'), 'Must have handlePlayAgain handler');
  assert(cardFile.includes('handleNextLevel'), 'Must have handleNextLevel handler');

  // Verify persistence in localStorage
  assert(cardFile.includes('edtechra_completed_flip_'), 'Must persist completion in localStorage');

  // Verify game summary phase buttons
  assert(gameFile.includes('PLAY AGAIN'), 'SpellingFlipGame must offer PLAY AGAIN in summary phase');
  assert(gameFile.includes('NEXT LEVEL'), 'SpellingFlipGame must offer NEXT LEVEL in summary phase');
});

// ----------------------------------------------------------------------------
// Test 2: SpellingScrambleCard In-Panel Transformation
// ----------------------------------------------------------------------------
runTest('SpellingScrambleCard renders transformed post-game panel with PLAY AGAIN & NEXT LEVEL', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/SpellingScrambleCard.tsx'), 'utf8');

  assert(file.includes('✓ Challenge Complete!'), 'Must display Challenge Complete upon completion');
  assert(file.includes('PLAY AGAIN'), 'Must contain PLAY AGAIN button');
  assert(file.includes('NEXT LEVEL'), 'Must contain NEXT LEVEL button');
  assert(file.includes('handlePlayAgain'), 'Must define handlePlayAgain handler');
  assert(file.includes('handleNextLevel'), 'Must define handleNextLevel handler');
  assert(file.includes('generateShuffledTiles'), 'Must support reshuffling tiles for play again');
  assert(file.includes('edtechra_completed_scramble_'), 'Must persist completion in localStorage');
});

// ----------------------------------------------------------------------------
// Test 3: ReorderSentenceCard In-Panel Transformation
// ----------------------------------------------------------------------------
runTest('ReorderSentenceCard renders transformed post-game panel with PLAY AGAIN & NEXT SENTENCE', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/ReorderSentenceCard.tsx'), 'utf8');

  assert(file.includes('✓ Sentence Complete!'), 'Must display Sentence Complete header');
  assert(file.includes('PLAY AGAIN'), 'Must contain PLAY AGAIN button');
  assert(file.includes('NEXT SENTENCE'), 'Must contain NEXT SENTENCE button');
  assert(file.includes('handlePlayAgain'), 'Must define handlePlayAgain handler');
  assert(file.includes('handleNextLevel'), 'Must define handleNextLevel handler');
  assert(file.includes('generateWordTiles'), 'Must support reshuffling word tiles for play again');
  assert(file.includes('edtechra_completed_reorder_'), 'Must persist completion in localStorage');
});

// ----------------------------------------------------------------------------
// Test 4: QuizBitCard In-Panel Transformation
// ----------------------------------------------------------------------------
runTest('QuizBitCard renders transformed post-quiz panel with PLAY AGAIN & NEXT QUIZ', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/QuizBitCard.tsx'), 'utf8');

  assert(file.includes('PLAY AGAIN'), 'Must contain PLAY AGAIN button');
  assert(file.includes('NEXT QUIZ'), 'Must contain NEXT QUIZ button');
  assert(file.includes('handlePlayAgain'), 'Must define handlePlayAgain handler');
  assert(file.includes('handleNextQuiz'), 'Must define handleNextQuiz handler');
  assert(file.includes('activeQuiz'), 'Must manage activeQuiz state');
  assert(file.includes('edtechra_completed_quiz_'), 'Must persist completion in localStorage');
});

// ----------------------------------------------------------------------------
// Test 5: BubblePopCard In-Panel Transformation
// ----------------------------------------------------------------------------
runTest('BubblePopCard renders transformed completion panel with PLAY AGAIN & NEXT LEVEL', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/BubblePopCard.tsx'), 'utf8');

  assert(file.includes('✓ Break Completed'), 'Must display Break Completed badge');
  assert(file.includes('PLAY AGAIN'), 'Must contain PLAY AGAIN button');
  assert(file.includes('NEXT LEVEL'), 'Must contain NEXT LEVEL button');
  assert(file.includes('handlePlayAgain'), 'Must define handlePlayAgain handler');
  assert(file.includes('handleNextLevel'), 'Must define handleNextLevel handler');
});

// ----------------------------------------------------------------------------
// Test 6: PostFeed Interleaving and Pool Forwarding
// ----------------------------------------------------------------------------
runTest('PostFeed passes pool arrays to all interactive cards for seamless next level transitions', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/PostFeed.tsx'), 'utf8');

  assert(file.includes('allQuizzes={quizzes}'), 'Must pass quizzes pool to QuizBitCard');
  assert(file.includes('allScrambles={scrambles}'), 'Must pass scrambles pool to SpellingScrambleCard');
  assert(file.includes('allReorders={reorders}'), 'Must pass reorders pool to ReorderSentenceCard');
  assert(file.includes('allCards={flipCards}'), 'Must pass flipCards pool to SpellingFlipCardCard');
});

// ----------------------------------------------------------------------------
// Test 7: Mobile Responsiveness & Button Height Constraints
// ----------------------------------------------------------------------------
runTest('All action buttons satisfy mobile touch-target accessibility (min-h >= 42px)', () => {
  const flipCard = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/SpellingFlipCardCard.tsx'), 'utf8');
  const scramble = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/SpellingScrambleCard.tsx'), 'utf8');
  const reorder = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/ReorderSentenceCard.tsx'), 'utf8');
  const quiz = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/QuizBitCard.tsx'), 'utf8');
  const bubble = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/BubblePopCard.tsx'), 'utf8');

  assert(flipCard.includes('min-h-[44px]'), 'SpellingFlipCardCard buttons must have min-h >= 44px');
  assert(scramble.includes('min-h-[44px]'), 'SpellingScrambleCard buttons must have min-h >= 44px');
  assert(reorder.includes('min-h-[44px]'), 'ReorderSentenceCard buttons must have min-h >= 44px');
  assert(quiz.includes('min-h-[42px]'), 'QuizBitCard buttons must have min-h >= 42px');
  assert(bubble.includes('min-h-[44px]'), 'BubblePopCard buttons must have min-h >= 44px');
});

console.log(`\n🏁 Test Results: ${testsPassed} / ${testsTotal} tests passed!`);
if (testsPassed !== testsTotal) {
  process.exit(1);
}
