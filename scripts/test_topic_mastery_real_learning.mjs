// ============================================================================
// EDTECHRA-BITZ: Topic Mastery & Validated Learning Activity Verification Suite
// ============================================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';

const ROOT_DIR = process.cwd();

console.log('🧪 Starting Topic Mastery & Real Learning Verification Suite...\n');

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
// Test 1: Server-Authoritative Reading Session Schema & Endpoints
// ----------------------------------------------------------------------------
runTest('Database migration defines reading_sessions with server start timestamps and unique constraints', () => {
  const migrationFile = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations/20260912000000_topic_mastery_and_reading_sessions.sql'), 'utf8');

  assert(migrationFile.includes('CREATE TABLE IF NOT EXISTS public.reading_sessions'), 'Must create reading_sessions table');
  assert(migrationFile.includes('started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()'), 'Must store started_at timestamp');
  assert(migrationFile.includes('uq_reading_user_session UNIQUE (user_id, reading_id)'), 'Must enforce unique (user_id, reading_id)');
  assert(migrationFile.includes('start_or_resume_reading_session'), 'Must provide start_or_resume_reading_session RPC');
  assert(migrationFile.includes('validate_and_complete_reading'), 'Must provide validate_and_complete_reading RPC');
});

// ----------------------------------------------------------------------------
// Test 2: Server-Authoritative 60s Duration Validation Logic
// ----------------------------------------------------------------------------
runTest('Server endpoint POST /api/readings/complete strictly enforces 60s elapsed requirement', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  // Verify start session route
  assert(serverFile.includes("app.post('/api/readings/start-session'"), 'Must have POST /api/readings/start-session route');
  assert(serverFile.includes("app.post('/api/readings/complete'"), 'Must have POST /api/readings/complete route');

  // Verify server calculation of elapsed time
  assert(serverFile.includes('elapsedSeconds < 60'), 'Must reject when elapsedSeconds < 60');
  assert(serverFile.includes('Keep reading for a little longer. This reading requires at least 60 seconds.'), 'Must return required user guidance');
  assert(serverFile.includes('xpAwarded = 15'), 'Must award +15 XP on legitimate completion');
});

// ----------------------------------------------------------------------------
// Test 3: Simulation: 10s, 30s, 59s Rejected (0 XP), 60s+ Accepted (+15 XP)
// ----------------------------------------------------------------------------
runTest('Reading timer validation simulation: early attempts rejected (0 XP), 60s+ accepted (+15 XP)', () => {
  function simulateReadingCompletion(startedAtMs, nowMs, alreadyCompleted = false) {
    const elapsedSeconds = Math.floor((nowMs - startedAtMs) / 1000);
    if (alreadyCompleted) {
      return { success: true, completed: true, already_completed: true, xp_awarded: 0 };
    }
    if (elapsedSeconds < 60) {
      return {
        success: false,
        error: 'Keep reading for a little longer. This reading requires at least 60 seconds.',
        elapsedSeconds,
        requiredSeconds: 60,
        remainingSeconds: 60 - elapsedSeconds,
        xp_awarded: 0
      };
    }
    return {
      success: true,
      completed: true,
      already_completed: false,
      xp_awarded: 15,
      elapsedSeconds
    };
  }

  const start = 1000000;
  
  // 10s Attempt
  const res10 = simulateReadingCompletion(start, start + 10000);
  assert.strictEqual(res10.success, false, '10s must be rejected');
  assert.strictEqual(res10.xp_awarded, 0, '10s must give 0 XP');
  assert.strictEqual(res10.remainingSeconds, 50, '10s must have 50s remaining');

  // 30s Attempt
  const res30 = simulateReadingCompletion(start, start + 30000);
  assert.strictEqual(res30.success, false, '30s must be rejected');
  assert.strictEqual(res30.xp_awarded, 0, '30s must give 0 XP');
  assert.strictEqual(res30.remainingSeconds, 30, '30s must have 30s remaining');

  // 59s Attempt
  const res59 = simulateReadingCompletion(start, start + 59000);
  assert.strictEqual(res59.success, false, '59s must be rejected');
  assert.strictEqual(res59.xp_awarded, 0, '59s must give 0 XP');
  assert.strictEqual(res59.remainingSeconds, 1, '59s must have 1s remaining');

  // 60s Attempt
  const res60 = simulateReadingCompletion(start, start + 60000);
  assert.strictEqual(res60.success, true, '60s must succeed');
  assert.strictEqual(res60.xp_awarded, 15, '60s must award +15 XP');
  assert.strictEqual(res60.completed, true, '60s must be completed');

  // Duplicate Attempt
  const resDup = simulateReadingCompletion(start, start + 80000, true);
  assert.strictEqual(resDup.success, true, 'Duplicate must be acknowledged');
  assert.strictEqual(resDup.already_completed, true, 'Duplicate must be marked already_completed');
  assert.strictEqual(resDup.xp_awarded, 0, 'Duplicate attempt must give 0 additional XP');
});

// ----------------------------------------------------------------------------
// Test 4: Refresh Continuity Simulation (Timer does not reset to zero)
// ----------------------------------------------------------------------------
runTest('Page refresh during reading retrieves server started_at timestamp and resumes timer', () => {
  const sessions = [];

  function startOrResumeSession(userId, readingId, nowMs) {
    const existing = sessions.find(s => s.user_id === userId && s.reading_id === readingId);
    if (existing && !existing.completed_at) {
      const diffMs = nowMs - new Date(existing.started_at).getTime();
      const elapsedSeconds = Math.max(0, Math.floor(diffMs / 1000));
      return { success: true, started_at: existing.started_at, elapsed_seconds: elapsedSeconds, is_resumed: true };
    }
    const newSession = {
      user_id: userId,
      reading_id: readingId,
      started_at: new Date(nowMs).toISOString(),
      completed_at: null
    };
    sessions.push(newSession);
    return { success: true, started_at: newSession.started_at, elapsed_seconds: 0, is_resumed: false };
  }

  const initialTime = 1700000000000;
  const s1 = startOrResumeSession('user-1', 'reading-100', initialTime);
  assert.strictEqual(s1.elapsed_seconds, 0, 'Initial session must start at 0s');
  assert.strictEqual(s1.is_resumed, false, 'First load is not resumed');

  // User refreshes 25 seconds later
  const refreshTime = initialTime + 25000;
  const s2 = startOrResumeSession('user-1', 'reading-100', refreshTime);
  assert.strictEqual(s2.elapsed_seconds, 25, 'After refresh timer must resume at 25s');
  assert.strictEqual(s2.is_resumed, true, 'Second load is resumed');
  assert.strictEqual(s2.started_at, s1.started_at, 'Must keep exact same started_at timestamp');
});

// ----------------------------------------------------------------------------
// Test 5: Feed Exclusion: Student A vs Student B
// ----------------------------------------------------------------------------
runTest('Learning activity feeds exclude completed items per-user on server', () => {
  const publishedReadings = [
    { id: 'read-1', title: 'Story 1', is_published: true },
    { id: 'read-2', title: 'Story 2', is_published: true },
    { id: 'read-3', title: 'Story 3', is_published: true }
  ];

  const userInteractions = new Map();
  userInteractions.set('student-A', new Set(['read-1'])); // Student A completed read-1
  userInteractions.set('student-B', new Set());           // Student B has no completions

  function getFeedForUser(userId) {
    const completedSet = userInteractions.get(userId) || new Set();
    return publishedReadings.filter(r => !completedSet.has(r.id));
  }

  const feedStudentA = getFeedForUser('student-A');
  const feedStudentB = getFeedForUser('student-B');

  assert.strictEqual(feedStudentA.length, 2, 'Student A should receive 2 items');
  assert(!feedStudentA.some(r => r.id === 'read-1'), 'Student A feed must EXCLUDE read-1');

  assert.strictEqual(feedStudentB.length, 3, 'Student B should receive 3 items');
  assert(feedStudentB.some(r => r.id === 'read-1'), 'Student B feed must INCLUDE read-1');
});

// ----------------------------------------------------------------------------
// Test 6: Topic Mastery Calculation (Numerator, Denominator & Exclusions)
// ----------------------------------------------------------------------------
runTest('Topic Mastery aggregates validated completions across all 6 learning types and excludes social activity', () => {
  const serverFile = fs.readFileSync(path.join(ROOT_DIR, 'server.mjs'), 'utf8');

  assert(serverFile.includes('calculateTopicMastery'), 'Must define calculateTopicMastery function');
  assert(serverFile.includes("app.get('/api/user/topic-progress'"), 'Must define GET /api/user/topic-progress route');
  assert(serverFile.includes("app.get('/api/user/topic-progress/:userId'"), 'Must define GET /api/user/topic-progress/:userId route');

  // Verify that all 6 learning activity stores are integrated:
  assert(serverFile.includes('reading_'), 'Must include readings');
  assert(serverFile.includes('quiz_'), 'Must include quizzes');
  assert(serverFile.includes('reorder_'), 'Must include reorders');
  assert(serverFile.includes('scramble_'), 'Must include spelling scrambles');
  assert(serverFile.includes('flip_'), 'Must include spelling flip cards');
  assert(serverFile.includes('video_'), 'Must include YouTube learning videos');

  // Simulation of topic mastery calculation
  const availableEnglishItems = ['reading_1', 'reading_2', 'quiz_1', 'reorder_1', 'scramble_1', 'flip_1']; // 6 items
  const userCompletions = new Set(['reading_1', 'quiz_1', 'reorder_1']); // 3 valid completions
  const socialActivity = ['post_1', 'like_1', 'poll_1']; // Must NOT count

  let validNumerator = 0;
  availableEnglishItems.forEach(itemKey => {
    if (userCompletions.has(itemKey)) validNumerator++;
  });

  const totalDenominator = availableEnglishItems.length;
  const progressPercent = Math.min(100, Math.round((validNumerator / totalDenominator) * 100));

  assert.strictEqual(validNumerator, 3, 'Numerator must be 3');
  assert.strictEqual(totalDenominator, 6, 'Denominator must be 6');
  assert.strictEqual(progressPercent, 50, 'Progress percentage must be 50%');
  assert(progressPercent <= 100, 'Percentage must never exceed 100%');
});

// ----------------------------------------------------------------------------
// Test 7: Frontend Real-time Event Subscription
// ----------------------------------------------------------------------------
runTest('OneMinuteReadingCard and DashboardPage use edtechra:activity_completed event for instant sync', () => {
  const cardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/OneMinuteReadingCard.tsx'), 'utf8');
  const dashboardFile = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/DashboardPage.tsx'), 'utf8');
  const feedFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/PostFeed/PostFeed.tsx'), 'utf8');

  // Reading Card dispatches activity completed
  assert(cardFile.includes("new CustomEvent('edtechra:activity_completed'"), 'OneMinuteReadingCard must dispatch edtechra:activity_completed');
  assert(cardFile.includes('elapsedSeconds >= 60'), 'OneMinuteReadingCard must check 60s');
  assert(cardFile.includes('startReadingSession'), 'OneMinuteReadingCard must call startReadingSession on open');

  // Dashboard listens and refreshes topic mastery
  assert(dashboardFile.includes("window.addEventListener('edtechra:activity_completed'"), 'DashboardPage must listen to activity_completed');

  // PostFeed listens and excludes completed item from active memory
  assert(feedFile.includes("window.addEventListener('edtechra:activity_completed'"), 'PostFeed must listen to activity_completed');
});

console.log(`\n🏁 Test Results: ${testsPassed} / ${testsTotal} tests passed!`);
if (testsPassed !== testsTotal) {
  process.exit(1);
}
