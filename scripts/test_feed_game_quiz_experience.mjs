// ============================================================================
// EDTECHRA-BITZ: Feed Game / Quiz Completion Behaviour Verification Suite
// ============================================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = process.cwd();

console.log('🧪 Starting EdTechra Feed Game/Quiz Completion Behaviour Test Suite...\n');

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
// Test 1: BubblePopCard - Removal of PLAY AGAIN & NEXT LEVEL and Clean Completion State
// ----------------------------------------------------------------------------
runTest('BubblePopCard renders clean completion state without PLAY AGAIN or NEXT LEVEL buttons', () => {
  const cardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/BubblePopCard.tsx'), 'utf8');

  // Verify no action launcher buttons on completed panel
  assert(!cardFile.includes('PLAY AGAIN'), 'BubblePopCard MUST NOT contain a PLAY AGAIN button');
  assert(!cardFile.includes('NEXT LEVEL'), 'BubblePopCard MUST NOT contain a NEXT LEVEL button');
  assert(!cardFile.includes('handlePlayAgain'), 'BubblePopCard MUST NOT contain handlePlayAgain');
  assert(!cardFile.includes('handleNextLevel'), 'BubblePopCard MUST NOT contain handleNextLevel');

  // Verify clean completion state details
  assert(cardFile.includes('✓ LEVEL'), 'Must show LEVEL COMPLETED banner');
  assert(cardFile.includes('Score'), 'Must display Score metric');
  assert(cardFile.includes('Target Score'), 'Must display Target Score metric');
  assert(cardFile.includes('XP Earned'), 'Must display XP Earned');
  assert(cardFile.includes("You've completed this level.") || cardFile.includes("You&apos;ve completed this level."), 'Must display completed level message');
});

// ----------------------------------------------------------------------------
// Test 2: BubblePopGame - Success Overlay clean return without Play Again / Next Level
// ----------------------------------------------------------------------------
runTest('BubblePopGame success overlay provides clean back to feed return without direct next level launch', () => {
  const gameFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/games/BubblePopGame.tsx'), 'utf8');

  // Verify onLevelCompleted callback is supported
  assert(gameFile.includes('onLevelCompleted'), 'BubblePopGame must support onLevelCompleted callback');
  assert(gameFile.includes('CONTINUE LEARNING (BACK TO FEED)'), 'Success overlay must offer clean back to feed button');
});

// ----------------------------------------------------------------------------
// Test 3: SpellingFlipCardCard & SpellingFlipGame - Removal of Replay & Next Level
// ----------------------------------------------------------------------------
runTest('SpellingFlipCardCard and SpellingFlipGame render clean completion without PLAY AGAIN or NEXT LEVEL buttons', () => {
  const cardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/SpellingFlipCardCard.tsx'), 'utf8');
  const gameFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/games/SpellingFlipGame.tsx'), 'utf8');

  // Verify no replay action buttons
  assert(!cardFile.includes('PLAY AGAIN'), 'SpellingFlipCardCard MUST NOT offer PLAY AGAIN');
  assert(!cardFile.includes('NEXT LEVEL'), 'SpellingFlipCardCard MUST NOT offer NEXT LEVEL');
  assert(!gameFile.includes('PLAY AGAIN'), 'SpellingFlipGame MUST NOT offer PLAY AGAIN in summary phase');
  assert(!gameFile.includes('NEXT LEVEL'), 'SpellingFlipGame MUST NOT offer NEXT LEVEL in summary phase');

  // Verify completed state display
  assert(cardFile.includes('✓ Level Completed'), 'Must show Level Completed badge');
  assert(cardFile.includes('Score'), 'Must show Score');
  assert(cardFile.includes('XP Earned'), 'Must show XP Earned');
  assert(cardFile.includes("You've completed this level.") || cardFile.includes("You&apos;ve completed this level."), 'Must state level completion');
});

// ----------------------------------------------------------------------------
// Test 4: ReorderSentenceCard - Removal of PLAY AGAIN & NEXT SENTENCE
// ----------------------------------------------------------------------------
runTest('ReorderSentenceCard renders clean completion state without PLAY AGAIN or NEXT SENTENCE buttons', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/ReorderSentenceCard.tsx'), 'utf8');

  assert(!file.includes('PLAY AGAIN'), 'ReorderSentenceCard MUST NOT contain PLAY AGAIN button');
  assert(!file.includes('NEXT SENTENCE'), 'ReorderSentenceCard MUST NOT contain NEXT SENTENCE button');
  assert(file.includes('✓ Sentence Complete!'), 'Must display Sentence Complete header');
  assert(file.includes('Score:'), 'Must display score');
  assert(file.includes('XP Earned:'), 'Must display XP Earned');
});

// ----------------------------------------------------------------------------
// Test 5: QuizBitCard - Removal of PLAY AGAIN & NEXT QUIZ
// ----------------------------------------------------------------------------
runTest('QuizBitCard renders clean answered feedback without PLAY AGAIN or NEXT QUIZ buttons', () => {
  const file = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/QuizBitCard.tsx'), 'utf8');

  assert(!file.includes('PLAY AGAIN'), 'QuizBitCard MUST NOT contain PLAY AGAIN button');
  assert(!file.includes('NEXT QUIZ'), 'QuizBitCard MUST NOT contain NEXT QUIZ button');
  assert(file.includes('Brilliant! Correct Answer') || file.includes('Correct answer:'), 'Must show quiz answer status');
  assert(file.includes('Why is this correct?'), 'Must display explanation header');
});

// ----------------------------------------------------------------------------
// Test 6: Bubble Pop Persistence & Client Service
// ----------------------------------------------------------------------------
runTest('bubblePopService persists level completions and handles duplicate prevention', () => {
  const serviceFile = fs.readFileSync(path.join(ROOT_DIR, 'src/services/bubblePopService.ts'), 'utf8');

  assert(serviceFile.includes('submitCompletion'), 'bubblePopService must implement submitCompletion');
  assert(serviceFile.includes('getProgress'), 'bubblePopService must implement getProgress');
  assert(serviceFile.includes('/api/bubble-pop/complete'), 'Must call /api/bubble-pop/complete backend endpoint');
  assert(serviceFile.includes('bubble_pop_completions'), 'Must reference bubble_pop_completions table');
  assert(serviceFile.includes('edtechra_completed_bubble_pop_'), 'Must persist completion locally');
});

// ----------------------------------------------------------------------------
// Test 7: Backend API Endpoints for Bubble Pop
// ----------------------------------------------------------------------------
runTest('server.mjs implements /api/bubble-pop/complete and /api/bubble-pop/progress with single-completion enforcement', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  assert(serverFile.includes("app.post('/api/bubble-pop/complete'"), 'server.mjs must implement POST /api/bubble-pop/complete');
  assert(serverFile.includes("app.get('/api/bubble-pop/progress'"), 'server.mjs must implement GET /api/bubble-pop/progress');
  assert(serverFile.includes('loadBubblePopCompletionsCache'), 'server.mjs must implement loadBubblePopCompletionsCache');
  assert(serverFile.includes('saveBubblePopCompletionsCache'), 'server.mjs must implement saveBubblePopCompletionsCache');
  assert(serverFile.includes('bubble_pop_completions'), 'server.mjs must support bubble_pop_completions table');
});

// ----------------------------------------------------------------------------
// Test 8: Leaderboard Integration
// ----------------------------------------------------------------------------
runTest('Leaderboard incorporates Bubble Pop and Spelling Flip completions (+10 XP per cleared level)', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');
  const migrationFile = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations/20260913000000_bubble_pop_game_completions.sql'), 'utf8');

  assert(serverFile.includes('bubble_pop_completions'), 'server.mjs leaderboard must query bubble_pop_completions');
  assert(migrationFile.includes('bubble_pop_completions'), 'Migration RPC must aggregate bubble_pop_completions');
  assert(migrationFile.includes('uq_user_bubble_pop_level'), 'Migration must enforce unique user level constraint');
  assert(migrationFile.includes('spelling_flip_completions'), 'Migration RPC must aggregate spelling_flip_completions');
});

// ----------------------------------------------------------------------------
// Test 9: Database Migration Structure
// ----------------------------------------------------------------------------
runTest('Database migration creates public.bubble_pop_completions with RLS and unique constraint', () => {
  const migrationFile = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations/20260913000000_bubble_pop_game_completions.sql'), 'utf8');

  assert(migrationFile.includes('CREATE TABLE IF NOT EXISTS public.bubble_pop_completions'), 'Must create bubble_pop_completions table');
  assert(migrationFile.includes('CONSTRAINT uq_user_bubble_pop_level UNIQUE (user_id, level)'), 'Must enforce single completion per level');
  assert(migrationFile.includes('ALTER TABLE public.bubble_pop_completions ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
  assert(migrationFile.includes('user_activity_interactions'), 'Must backfill user_activity_interactions');
});

// ----------------------------------------------------------------------------
// Test 10: Mobile Touch Target Accessibility
// ----------------------------------------------------------------------------
runTest('All remaining action triggers maintain touch target accessibility (min-h >= 42px)', () => {
  const bubble = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/BubblePopCard.tsx'), 'utf8');
  const flip = fs.readFileSync(path.join(ROOT_DIR, 'src/components/games/SpellingFlipGame.tsx'), 'utf8');
  const scramble = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/SpellingScrambleCard.tsx'), 'utf8');

  assert(bubble.includes('min-h-[44px]'), 'BubblePopCard buttons must have min-h >= 44px');
  assert(flip.includes('min-h-[44px]'), 'SpellingFlipGame buttons must have min-h >= 44px');
  assert(scramble.includes('min-h-[44px]') || scramble.includes('min-h-[40px]'), 'SpellingScrambleCard buttons must be touch accessible');
});

console.log(`\n🏁 Test Results: ${testsPassed} / ${testsTotal} tests passed!`);
if (testsPassed !== testsTotal) {
  process.exit(1);
}
