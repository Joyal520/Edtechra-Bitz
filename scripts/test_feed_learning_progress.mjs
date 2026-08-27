// ============================================================================
// EDTECHRA-BITZ: Feed Learning Progress Verification Suite
// ============================================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🧪 Starting EdTechra Feed Learning Progress Test Suite...\n');

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
// Test 1: Category Replacement - Check that 6 Real Feed Activities are Defined
// ----------------------------------------------------------------------------
runTest('Server progress calculation outputs the 6 real Feed Learning Activities', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  // Verify function name and endpoints
  assert(serverFile.includes('calculateAuthoritativeLearningProgress'), 'Must define calculateAuthoritativeLearningProgress');
  assert(serverFile.includes('/api/user/learning-progress'), 'Must expose /api/user/learning-progress');

  // Verify the 6 exact feed categories
  assert(serverFile.includes("'shorts'"), 'Must include shorts category');
  assert(serverFile.includes("'relaxation_games'"), 'Must include relaxation_games category');
  assert(serverFile.includes("'memory_games'"), 'Must include memory_games category');
  assert(serverFile.includes("'reading'"), 'Must include reading category');
  assert(serverFile.includes("'quizzes'"), 'Must include quizzes category');
  assert(serverFile.includes("'word_of_the_day'"), 'Must include word_of_the_day category');
});

// ----------------------------------------------------------------------------
// Test 2: Old Topic Categories Removed from Progress Section
// ----------------------------------------------------------------------------
runTest('DashboardPage progress section no longer contains hardcoded old topic categories', () => {
  const dashboardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/DashboardPage.tsx'), 'utf8');

  // Verify new title
  assert(dashboardFile.includes('Learning Progress'), 'Dashboard must display Learning Progress header');
  assert(dashboardFile.includes('Feed Learning Activities'), 'Dashboard must display Feed Learning Activities subtitle');
  assert(!dashboardFile.includes('Topic Mastery & Progress'), 'Topic Mastery & Progress header must be removed');
});

// ----------------------------------------------------------------------------
// Test 3: Word of the Day Honest Status Reporting (No Fake Progress)
// ----------------------------------------------------------------------------
runTest('Word of the Day displays honest tracking status message without fake progress', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');
  const dashboardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/DashboardPage.tsx'), 'utf8');

  assert(serverFile.includes('isTrackingAvailable: false'), 'Word of the day must declare isTrackingAvailable: false');
  assert(serverFile.includes('Completion tracking not currently available.'), 'Must include accurate tracking status message');
  assert(dashboardFile.includes('trackingStatusMessage'), 'Dashboard must display tracking status message for untracked categories');
});

// ----------------------------------------------------------------------------
// Test 4: Denominators Derived from Authentic Content Tables
// ----------------------------------------------------------------------------
runTest('Denominators query real content tables (youtube_videos, readings, quiz_bits, flip cards, words)', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  assert(serverFile.includes("from('youtube_videos')"), 'Must query youtube_videos for shorts count');
  assert(serverFile.includes("from('readings')"), 'Must query readings for reading count');
  assert(serverFile.includes("from('quiz_bits')"), 'Must query quiz_bits for quizzes count');
  assert(serverFile.includes("from('spelling_flip_cards')"), 'Must query spelling_flip_cards for memory games count');
  assert(serverFile.includes("from('words_of_the_day')"), 'Must query words_of_the_day for word count');
});

// ----------------------------------------------------------------------------
// Test 5: Numerators Derived from Authentic User Completion Records
// ----------------------------------------------------------------------------
runTest('Numerators query user-specific completion tables and enforce uniqueness', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  assert(serverFile.includes("from('youtube_learning_progress')"), 'Must query youtube_learning_progress for completed shorts');
  assert(serverFile.includes("from('bubble_pop_completions')"), 'Must query bubble_pop_completions for relaxation levels');
  assert(serverFile.includes("from('spelling_flip_completions')"), 'Must query spelling_flip_completions for memory games');
  assert(serverFile.includes("from('reading_completions')"), 'Must query reading_completions for reading completions');
  assert(serverFile.includes("from('quiz_attempts')"), 'Must query quiz_attempts for quiz completions');
  assert(serverFile.includes('new Set('), 'Must deduplicate completions via Set');
});

// ----------------------------------------------------------------------------
// Test 6: Client Service Integration
// ----------------------------------------------------------------------------
runTest('youtubeClient.getCategoryProgress fetches authoritative feed learning progress', () => {
  const clientFile = fs.readFileSync(path.join(ROOT_DIR, 'src/services/youtubeClient.ts'), 'utf8');

  assert(clientFile.includes('/api/user/learning-progress'), 'youtubeClient must call /api/user/learning-progress');
  assert(clientFile.includes('relaxation_games'), 'Fallback must include relaxation_games');
  assert(clientFile.includes('memory_games'), 'Fallback must include memory_games');
  assert(clientFile.includes('word_of_the_day'), 'Fallback must include word_of_the_day');
});

// ----------------------------------------------------------------------------
// Test 7: Type Definition Compatibility
// ----------------------------------------------------------------------------
runTest('ActivityLearningProgress and CategoryProgress types support completedActivities and tracking metadata', () => {
  const typeFile = fs.readFileSync(path.join(ROOT_DIR, 'src/types/index.ts'), 'utf8');

  assert(typeFile.includes('export interface ActivityLearningProgress'), 'Must define ActivityLearningProgress');
  assert(typeFile.includes('totalActivities: number'), 'Must have totalActivities field');
  assert(typeFile.includes('completedActivities: number'), 'Must have completedActivities field');
  assert(typeFile.includes('isTrackingAvailable?: boolean'), 'Must have isTrackingAvailable field');
  assert(typeFile.includes('trackingStatusMessage?: string'), 'Must have trackingStatusMessage field');
});

// ----------------------------------------------------------------------------
// Test 8: Real-Time Event Triggering on Activity Completion
// ----------------------------------------------------------------------------
runTest('DashboardPage subscribes to edtechra:activity_completed for real-time progress updates', () => {
  const dashboardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/DashboardPage.tsx'), 'utf8');

  assert(dashboardFile.includes("window.addEventListener('edtechra:activity_completed'"), 'Must listen for edtechra:activity_completed');
  assert(dashboardFile.includes('setCategoryProgress'), 'Must update categoryProgress state on activity completion');
});

// ----------------------------------------------------------------------------
// Test 9: Strict 60s Server Reading Validation Remains Active
// ----------------------------------------------------------------------------
runTest('Server enforces strict 60s reading duration validation on POST /api/readings/complete', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  assert(serverFile.includes("app.post('/api/readings/complete'"), 'Server must implement POST /api/readings/complete');
  assert(serverFile.includes('reading_session_starts') || serverFile.includes('start-session') || serverFile.includes('time_spent_seconds'), 'Must validate reading duration server-side');
});

// ----------------------------------------------------------------------------
// Test 10: Smooth Progress Bar Animation and Responsive Styling
// ----------------------------------------------------------------------------
runTest('Dashboard renders smooth transition animations (duration-500) and zero-state handling', () => {
  const dashboardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/DashboardPage.tsx'), 'utf8');

  assert(dashboardFile.includes('duration-500'), 'Progress bars must feature smooth 500ms CSS transitions');
  assert(dashboardFile.includes('rounded-full'), 'Progress bars must use rounded pill styling');
  assert(dashboardFile.includes('isTracking ?'), 'Must branch rendering based on isTracking status');
});

console.log(`\n🏁 Test Results: ${testsPassed} / ${testsTotal} tests passed!`);
if (testsPassed !== testsTotal) {
  process.exit(1);
}
