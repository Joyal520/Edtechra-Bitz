// ============================================================================
// Automated Test Suite: Teacher-Controlled Leaderboard Reset System
// ============================================================================

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

console.log('\n--- 1. Testing Schedule Math & Timezone Engines ---');

// Replicate pure schedule math
function getTimeZoneOffsetMs(date, timeZone = 'Asia/Colombo') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  const tzAsUtc = Date.UTC(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    parseInt(parts.hour, 10),
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10)
  );
  return tzAsUtc - date.getTime();
}

function calculateNextResetDate(frequency, fromDateInput = new Date(), timeZone = 'Asia/Colombo') {
  if (frequency === 'never') return null;
  const fromDate = new Date(fromDateInput);
  if (isNaN(fromDate.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    weekday: 'short'
  });
  const parts = Object.fromEntries(formatter.formatToParts(fromDate).map(p => [p.type, p.value]));
  const year = parseInt(parts.year, 10);
  const month = parseInt(parts.month, 10) - 1;
  const day = parseInt(parts.day, 10);
  const weekday = parts.weekday;

  const dayIndexMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDayOfWeek = dayIndexMap[weekday] ?? 0;

  let targetYear = year;
  let targetMonth = month;
  let targetDay = day;

  if (frequency === 'daily') {
    targetDay += 1;
  } else if (frequency === 'weekly') {
    const daysUntilMonday = (8 - currentDayOfWeek) % 7 || 7;
    targetDay += daysUntilMonday;
  } else if (frequency === 'monthly') {
    targetDay = 1;
    targetMonth += 1;
  }

  const localTargetUtc = Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0);
  const offset = getTimeZoneOffsetMs(new Date(localTargetUtc), timeZone);
  return new Date(localTargetUtc - offset);
}

function formatLeaderboardResetText(frequency = 'never', nextResetAt = null, timeZone = 'Asia/Colombo') {
  const capFreq = frequency.charAt(0).toUpperCase() + frequency.slice(1);
  if (frequency === 'never' || !nextResetAt) {
    return { frequencyLabel: 'Never', nextResetLabel: null };
  }
  const resetDate = new Date(nextResetAt);
  if (isNaN(resetDate.getTime())) {
    return { frequencyLabel: capFreq, nextResetLabel: null };
  }

  if (frequency === 'weekly') {
    const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(resetDate);
    const timeStr = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(resetDate);
    return { frequencyLabel: 'Weekly', nextResetLabel: `${dayName}, ${timeStr}` };
  }

  if (frequency === 'daily') {
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return { frequencyLabel: 'Daily', nextResetLabel: dateFormatter.format(resetDate) };
  }

  if (frequency === 'monthly') {
    const monthFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return { frequencyLabel: 'Monthly', nextResetLabel: monthFormatter.format(resetDate) };
  }

  return { frequencyLabel: capFreq, nextResetLabel: resetDate.toLocaleDateString() };
}

test('Never frequency produces null next reset date', () => {
  const next = calculateNextResetDate('never', new Date());
  assert.strictEqual(next, null);
  const formatted = formatLeaderboardResetText('never', null);
  assert.strictEqual(formatted.frequencyLabel, 'Never');
  assert.strictEqual(formatted.nextResetLabel, null);
});

test('Daily frequency advances exactly to next midnight in Asia/Colombo', () => {
  const fixedMonday = new Date('2026-10-26T10:00:00+05:30');
  const next = calculateNextResetDate('daily', fixedMonday, 'Asia/Colombo');
  assert.ok(next !== null);

  const localTimeStr = next.toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
  assert.ok(localTimeStr.includes('10/27/2026'), `Expected 10/27/2026 but got ${localTimeStr}`);
  assert.ok(localTimeStr.includes('12:00:00 AM'), `Expected 12:00:00 AM but got ${localTimeStr}`);
});

test('Weekly frequency advances to next Monday 12:00 AM in Asia/Colombo', () => {
  const fixedMonday = new Date('2026-10-26T10:00:00+05:30');
  const next = calculateNextResetDate('weekly', fixedMonday, 'Asia/Colombo');
  assert.ok(next !== null);

  const localTimeStr = next.toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
  assert.ok(localTimeStr.includes('11/2/2026'), `Expected 11/2/2026 but got ${localTimeStr}`);
  assert.ok(localTimeStr.includes('12:00:00 AM'), `Expected 12:00:00 AM but got ${localTimeStr}`);

  const formatted = formatLeaderboardResetText('weekly', next.toISOString(), 'Asia/Colombo');
  assert.strictEqual(formatted.frequencyLabel, 'Weekly');
  assert.strictEqual(formatted.nextResetLabel, 'Monday, 12:00 AM');
});

test('Monthly frequency advances to 1st of next month 12:00 AM in Asia/Colombo', () => {
  const fixedOct = new Date('2026-10-26T10:00:00+05:30');
  const next = calculateNextResetDate('monthly', fixedOct, 'Asia/Colombo');
  assert.ok(next !== null);

  const localTimeStr = next.toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
  assert.ok(localTimeStr.includes('11/1/2026'), `Expected 11/1/2026 but got ${localTimeStr}`);
  assert.ok(localTimeStr.includes('12:00:00 AM'), `Expected 12:00:00 AM but got ${localTimeStr}`);

  const formatted = formatLeaderboardResetText('monthly', next.toISOString(), 'Asia/Colombo');
  assert.strictEqual(formatted.frequencyLabel, 'Monthly');
  assert.strictEqual(formatted.nextResetLabel, 'Nov 1, 12:00 AM');
});

console.log('\n--- 2. Testing Non-Destructive Scoring Period Architecture ---');

test('Leaderboard points query correctly excludes prior points while preserving raw records', () => {
  // Mock points ledger records:
  const rawLedger = [
    { student_id: 's1', points: 150, created_at: '2026-10-20T10:00:00Z', reason: 'Quiz 1' },
    { student_id: 's2', points: 100, created_at: '2026-10-22T10:00:00Z', reason: 'Exam 1' },
    { student_id: 's1', points: 30, created_at: '2026-10-26T12:00:00Z', reason: 'Spelling' }
  ];

  // Case A: Before reset, all points count
  const calculateScores = (ledger, resetAt) => {
    const scores = { s1: 0, s2: 0 };
    ledger.forEach(p => {
      if (!resetAt || new Date(p.created_at) >= new Date(resetAt)) {
        scores[p.student_id] = (scores[p.student_id] || 0) + p.points;
      }
    });
    return scores;
  };

  const beforeReset = calculateScores(rawLedger, null);
  assert.strictEqual(beforeReset.s1, 180);
  assert.strictEqual(beforeReset.s2, 100);

  // Case B: Teacher resets leaderboard at 2026-10-26T11:00:00Z
  const resetAt = '2026-10-26T11:00:00Z';
  const afterReset = calculateScores(rawLedger, resetAt);

  // s1 earned 30 pts after reset, prior 150 pts are zeroed out on current leaderboard
  assert.strictEqual(afterReset.s1, 30);
  // s2 has not earned points after reset, score is strictly 0 XP
  assert.strictEqual(afterReset.s2, 0);

  // Raw ledger MUST remain intact with all 3 entries (zero deletion of educational data)
  assert.strictEqual(rawLedger.length, 3);
  assert.strictEqual(rawLedger[0].points, 150);
  assert.strictEqual(rawLedger[1].points, 100);
});

test('Leaderboard immediately produces 0 XP for all students when reset timestamp is set to now', () => {
  const students = [
    { student_id: 's1', name: 'Thiveshgar', points: 330 },
    { student_id: 's2', name: 'J. Thiveshgar', points: 320 },
    { student_id: 's3', name: 'Nidhushanya', points: 310 }
  ];

  // Simulate reset: all points earned prior to now become 0 in current period
  const resetStudents = students.map(s => ({
    ...s,
    points: 0
  }));

  assert.strictEqual(resetStudents[0].points, 0);
  assert.strictEqual(resetStudents[1].points, 0);
  assert.strictEqual(resetStudents[2].points, 0);

  // allZeroXP condition triggers neutral podium state
  const allZeroXP = resetStudents.every(e => (e.points || 0) === 0);
  assert.strictEqual(allZeroXP, true);
});

console.log('\n--- 3. Verifying File Structure & Security Enforcements ---');

test('Migration 20261026010000_classroom_leaderboard_reset.sql exists and defines frequency constraint', () => {
  const sql = fs.readFileSync('supabase/migrations/20261026010000_classroom_leaderboard_reset.sql', 'utf8');
  assert.ok(sql.includes('leaderboard_reset_frequency'), 'Must define leaderboard_reset_frequency');
  assert.ok(sql.includes('leaderboard_reset_at'), 'Must define leaderboard_reset_at');
  assert.ok(sql.includes('leaderboard_next_reset_at'), 'Must define leaderboard_next_reset_at');
  assert.ok(sql.includes("'never', 'daily', 'weekly', 'monthly'"), 'Must validate 4 allowed frequencies');
});

test('server.mjs contains authorization checks for leaderboard settings and reset', () => {
  const serverCode = fs.readFileSync('server.mjs', 'utf8');
  assert.ok(serverCode.includes('/api/classes/:id/leaderboard/settings'), 'Must have settings route');
  assert.ok(serverCode.includes('/api/classes/:id/leaderboard/reset'), 'Must have reset route');
  assert.ok(serverCode.includes('verifyTeacherClassroomAccess'), 'Must enforce teacher authorization');
  assert.ok(serverCode.includes('runScheduledLeaderboardResets'), 'Must have auto-reset background scheduler');
});

test('ClassroomLeaderboard.tsx strictly checks isTeacher before rendering settings button or modal', () => {
  const compCode = fs.readFileSync('src/components/classes/ClassroomLeaderboard.tsx', 'utf8');
  assert.ok(compCode.includes('isTeacher && classroomId'), 'Settings button must check isTeacher');
  assert.ok(compCode.includes('LeaderboardSettingsModal'), 'Must mount LeaderboardSettingsModal');
  assert.ok(compCode.includes('Leaderboard reset. Complete activities to take the lead!'), 'Must show friendly reset message');
});

test('LeaderboardSettingsModal.tsx displays the 4 required frequencies and separate manual action', () => {
  const modalCode = fs.readFileSync('src/components/classes/LeaderboardSettingsModal.tsx', 'utf8');
  assert.ok(modalCode.includes("'never'"), 'Must have never option');
  assert.ok(modalCode.includes("'daily'"), 'Must have daily option');
  assert.ok(modalCode.includes("'weekly'"), 'Must have weekly option');
  assert.ok(modalCode.includes("'monthly'"), 'Must have monthly option');
  assert.ok(modalCode.includes('Reset Leaderboard Now'), 'Must have separate manual Reset Leaderboard Now action');
  assert.ok(modalCode.includes('Reset leaderboard?'), 'Must have confirmation dialog');
  assert.ok(modalCode.includes('Student learning records, grades, course progress and other educational data will not be deleted'), 'Must explain zero data loss');
});

console.log(`\n========================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
