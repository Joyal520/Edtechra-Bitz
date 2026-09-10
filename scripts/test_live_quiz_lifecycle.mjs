// ============================================================================
// AUTOMATED TEST SUITE: LIVE QUIZ LIFECYCLE & SCHEDULED STATE MACHINE
// ============================================================================

import assert from 'assert';

function getEffectiveSessionState(session) {
  if (!session) return 'draft';
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'finished' || session.status === 'completed') return 'completed';
  if (session.status === 'draft') return 'draft';

  const scheduledTime = session.scheduled_start_at || session.started_at;
  const nowMs = Date.now();

  // If explicitly scheduled or has a future start timestamp
  if (session.status === 'scheduled') {
    if (scheduledTime && new Date(scheduledTime).getTime() <= nowMs) {
      return 'live';
    }
    return 'scheduled';
  }

  if (session.status === 'lobby' && scheduledTime) {
    const scheduledMs = new Date(scheduledTime).getTime();
    if (scheduledMs > nowMs + 2000) {
      return 'scheduled';
    }
  }

  if (session.status === 'lobby' || session.status === 'in_progress' || session.status === 'reveal') {
    return 'live';
  }

  return 'draft';
}

console.log('--- STARTING LIVE QUIZ STATE MACHINE TESTS ---');

// TEST 1: Null or undefined session (Draft)
console.log('Test 1: Null/undefined session -> draft');
assert.strictEqual(getEffectiveSessionState(null), 'draft');
assert.strictEqual(getEffectiveSessionState(undefined), 'draft');
console.log('✓ PASS: Empty session returns draft');

// TEST 2: Authoring/Bank Quiz without session (Draft)
console.log('Test 2: Quiz created in bank only (no session) -> draft');
const draftSession = { status: 'draft' };
assert.strictEqual(getEffectiveSessionState(draftSession), 'draft');
console.log('✓ PASS: Explicit draft session returns draft');

// TEST 3: Scheduled Session (Future timestamp)
console.log('Test 3: Scheduled session with future timestamp -> scheduled');
const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const scheduledSession = {
  status: 'scheduled',
  scheduled_start_at: futureTime
};
assert.strictEqual(getEffectiveSessionState(scheduledSession), 'scheduled');
console.log('✓ PASS: Future scheduled session returns scheduled');

// TEST 4: Scheduled Session Fallback (status: 'lobby' with future started_at on unmigrated DB)
console.log('Test 4: Backward-compatible fallback (status: lobby, future started_at) -> scheduled');
const fallbackScheduledSession = {
  status: 'lobby',
  started_at: futureTime
};
assert.strictEqual(getEffectiveSessionState(fallbackScheduledSession), 'scheduled');
console.log('✓ PASS: Unmigrated DB fallback correctly detected as scheduled');

// TEST 5: Scheduled Session that has arrived (Past timestamp) -> auto transitions to live
console.log('Test 5: Scheduled session whose time has arrived -> live');
const pastTime = new Date(Date.now() - 5000).toISOString();
const arrivedScheduledSession = {
  status: 'scheduled',
  scheduled_start_at: pastTime
};
assert.strictEqual(getEffectiveSessionState(arrivedScheduledSession), 'live');
console.log('✓ PASS: Arrived scheduled session auto-transitions to live');

// TEST 6: Immediate Launch (status: 'lobby' with current started_at) -> live
console.log('Test 6: Immediate launch session -> live');
const immediateLiveSession = {
  status: 'lobby',
  started_at: new Date().toISOString()
};
assert.strictEqual(getEffectiveSessionState(immediateLiveSession), 'live');
console.log('✓ PASS: Immediate launch returns live');

// TEST 7: In-progress gameplay -> live
console.log('Test 7: In-progress session -> live');
const inProgressSession = {
  status: 'in_progress',
  current_question_index: 1
};
assert.strictEqual(getEffectiveSessionState(inProgressSession), 'live');
console.log('✓ PASS: In-progress session returns live');

// TEST 8: Reveal phase -> live
console.log('Test 8: Reveal phase -> live');
const revealSession = {
  status: 'reveal',
  current_question_index: 1
};
assert.strictEqual(getEffectiveSessionState(revealSession), 'live');
console.log('✓ PASS: Reveal phase returns live');

// TEST 9: Finished / Completed Quiz -> completed
console.log('Test 9: Finished/completed session -> completed');
const finishedSession = { status: 'finished' };
const completedSession = { status: 'completed' };
assert.strictEqual(getEffectiveSessionState(finishedSession), 'completed');
assert.strictEqual(getEffectiveSessionState(completedSession), 'completed');
console.log('✓ PASS: Finished/completed session returns completed');

// TEST 10: Cancelled Session -> cancelled
console.log('Test 10: Cancelled session -> cancelled');
const cancelledSession = { status: 'cancelled' };
assert.strictEqual(getEffectiveSessionState(cancelledSession), 'cancelled');
console.log('✓ PASS: Cancelled session returns cancelled');

// TEST 11: Classroom Banner Display Decision Matrix
console.log('Test 11: Contextual Classroom Banner visibility rules');
function shouldShowClassroomBanner(session) {
  const state = getEffectiveSessionState(session);
  return state === 'live' || state === 'scheduled';
}

function getBannerType(session) {
  const state = getEffectiveSessionState(session);
  if (state === 'scheduled') return 'STARTING_SOON';
  if (state === 'live') return 'LIVE_NOW';
  return 'HIDDEN';
}

assert.strictEqual(shouldShowClassroomBanner(null), false);
assert.strictEqual(getBannerType(null), 'HIDDEN');

assert.strictEqual(shouldShowClassroomBanner(draftSession), false);
assert.strictEqual(getBannerType(draftSession), 'HIDDEN');

assert.strictEqual(shouldShowClassroomBanner(scheduledSession), true);
assert.strictEqual(getBannerType(scheduledSession), 'STARTING_SOON');

assert.strictEqual(shouldShowClassroomBanner(immediateLiveSession), true);
assert.strictEqual(getBannerType(immediateLiveSession), 'LIVE_NOW');

assert.strictEqual(shouldShowClassroomBanner(finishedSession), false);
assert.strictEqual(getBannerType(finishedSession), 'HIDDEN');

assert.strictEqual(shouldShowClassroomBanner(cancelledSession), false);
assert.strictEqual(getBannerType(cancelledSession), 'HIDDEN');

console.log('✓ PASS: Banner is only visible for SCHEDULED and LIVE, never for DRAFT or COMPLETED');

console.log('\n=============================================');
console.log('ALL 11 UNIT & LIFECYCLE TESTS PASSED PERFECTLY!');
console.log('=============================================\n');
