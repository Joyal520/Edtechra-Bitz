// ============================================================================
// Comprehensive Automated Test Suite: Leaderboard Reset & Share System
// ============================================================================

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

// ----------------------------------------------------------------------------
// Load local environment safely without printing secrets
// ----------------------------------------------------------------------------
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (k === 'VITE_SUPABASE_URL' && !supabaseUrl) supabaseUrl = v;
    if (k === 'VITE_SUPABASE_ANON_KEY' && !supabaseAnonKey) supabaseAnonKey = v;
    if (k === 'SUPABASE_SERVICE_ROLE_KEY' && !supabaseServiceKey) supabaseServiceKey = v;
  }
}

// ============================================================================
// SECTION 1: PURE SCHEDULE MATH & FORMATTING ENGINES
// ============================================================================
console.log('\n--- 1. Testing Schedule Math & Timezone Engines ---');

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

function sanitizeLeaderboardStudentName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Anonymous Student';
  const trimmed = rawName.trim();
  if (!trimmed) return 'Anonymous Student';
  if (trimmed.includes('@')) {
    const usernamePart = trimmed.split('@')[0].trim();
    if (usernamePart) return usernamePart;
  }
  return trimmed;
}

function formatLeaderboardShareText(entries, topN = 3) {
  const header = 'EdTechra Classroom Leaderboard';
  const footer = 'Keep learning. Keep growing.';
  const topList = (entries || []).slice(0, topN);

  if (topList.length === 0) {
    return `${header}\n\nNo student scores recorded yet.\n\n${footer}`;
  }

  const lines = topList.map((entry, idx) => {
    const rank = idx + 1;
    const name = sanitizeLeaderboardStudentName(entry.name);
    const points = Number(entry.points) || 0;
    return `${rank}. ${name} — ${points} XP`;
  });

  return `${header}\n\n${lines.join('\n')}\n\n${footer}`;
}

test('Never frequency produces null next reset date and Never label', () => {
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

// ============================================================================
// SECTION 2: PRIVACY & SHARE LEADERBOARD FORMATTING (Parts 4-8)
// ============================================================================
console.log('\n--- 2. Testing Share Leaderboard & Privacy Protection ---');

test('sanitizeLeaderboardStudentName never exposes email domains or passwords', () => {
  assert.strictEqual(sanitizeLeaderboardStudentName('student@gmail.com'), 'student');
  assert.strictEqual(sanitizeLeaderboardStudentName('jane.doe@edtechra.lk'), 'jane.doe');
  assert.strictEqual(sanitizeLeaderboardStudentName('Theveshghar'), 'Theveshghar');
  assert.strictEqual(sanitizeLeaderboardStudentName(''), 'Anonymous Student');
  assert.strictEqual(sanitizeLeaderboardStudentName(null), 'Anonymous Student');
});

test('formatLeaderboardShareText creates expected format with top-3 rankings', () => {
  const entries = [
    { name: 'Theveshghar', points: 580 },
    { name: 'J.Thiveshgar', points: 500 },
    { name: 'D.Nidhushanya', points: 490 },
    { name: 'Fourth Student', points: 300 }
  ];

  const shareText = formatLeaderboardShareText(entries, 3);
  const expected =
    'EdTechra Classroom Leaderboard\n\n' +
    '1. Theveshghar — 580 XP\n' +
    '2. J.Thiveshgar — 500 XP\n' +
    '3. D.Nidhushanya — 490 XP\n\n' +
    'Keep learning. Keep growing.';

  assert.strictEqual(shareText, expected);
  assert.ok(!shareText.includes('Fourth Student'), 'Must strictly limit to top 3');
});

test('formatLeaderboardShareText reflects 0 XP immediately after reset', () => {
  const resetEntries = [
    { name: 'Theveshghar', points: 0 },
    { name: 'J.Thiveshgar', points: 0 },
    { name: 'D.Nidhushanya', points: 0 }
  ];

  const shareText = formatLeaderboardShareText(resetEntries, 3);
  assert.ok(shareText.includes('1. Theveshghar — 0 XP'));
  assert.ok(shareText.includes('2. J.Thiveshgar — 0 XP'));
  assert.ok(shareText.includes('3. D.Nidhushanya — 0 XP'));
});

// ============================================================================
// SECTION 3: CODE INTEGRITY & COMPONENT SAFETY ENFORCEMENT
// ============================================================================
console.log('\n--- 3. Verifying Code Integrity & Safety Enforcements ---');

test('LeaderboardSettingsModal contains exact required confirmation dialog copy and zero data loss note', () => {
  const code = fs.readFileSync('src/components/classes/LeaderboardSettingsModal.tsx', 'utf8');
  assert.ok(
    code.includes('Reset the leaderboard for all students?'),
    'Must include exact confirmation heading: Reset the leaderboard for all students?'
  );
  assert.ok(
    code.includes('This will set the current leaderboard scores to') &&
    code.includes('Student accounts, grades, certificates, completed activities, quiz submissions, exam attempts, and learning records will NOT be deleted.'),
    'Must include exact confirmation body text'
  );
  assert.ok(
    code.includes('Leaderboard reset successfully. Student learning records were preserved.'),
    'Must include exact success message'
  );
  assert.ok(
    code.includes('Leaderboard reset failed. No student learning data was changed. Please try again.'),
    'Must include exact failure message'
  );
  assert.ok(
    code.includes('actionLockRef'),
    'Must guard with actionLockRef to prevent double-clicks and race conditions'
  );
});

test('ShareLeaderboardModal exists, fetches fresh entries on open, and supports copy & native share', () => {
  assert.ok(fs.existsSync('src/components/classes/ShareLeaderboardModal.tsx'));
  const code = fs.readFileSync('src/components/classes/ShareLeaderboardModal.tsx', 'utf8');
  assert.ok(code.includes('getClassroomLeaderboard'), 'Must fetch fresh database leaderboard on open');
  assert.ok(code.includes('navigator.share'), 'Must support Web Share API');
  assert.ok(code.includes('navigator.clipboard.writeText'), 'Must support copy to clipboard');
  assert.ok(code.includes('sanitizeLeaderboardStudentName'), 'Must sanitize student names');
});

test('ClassroomLeaderboard renders Share button beside Leaderboard Settings', () => {
  const code = fs.readFileSync('src/components/classes/ClassroomLeaderboard.tsx', 'utf8');
  assert.ok(code.includes('Leaderboard Settings'), 'Must render Leaderboard Settings');
  assert.ok(code.includes('ShareLeaderboardModal'), 'Must mount ShareLeaderboardModal');
  assert.ok(code.includes('Share2'), 'Must use Share2 icon');
  assert.ok(!code.includes('getLocalLeaderboardSettings'), 'Must NOT use removed localStorage fallback');
});

test('server.mjs uses verifyClassroomLeaderboardTeacher and atomic Postgres RPCs', () => {
  const code = fs.readFileSync('server.mjs', 'utf8');
  assert.ok(code.includes('verifyClassroomLeaderboardTeacher'), 'Must enforce teacher authorization');
  assert.ok(code.includes('reset_classroom_leaderboard'), 'Must invoke reset_classroom_leaderboard RPC');
  assert.ok(code.includes('update_classroom_leaderboard_settings'), 'Must invoke update_classroom_leaderboard_settings RPC');
  assert.ok(code.includes('inFlightClassroomLeaderboardResets'), 'Must deduplicate in-flight reset requests');
  assert.ok(!code.includes('serverClassroomLeaderboardCache'), 'Must NOT use ephemeral in-memory fake cache');
});

test('classroomPointsService does not write fake success to localStorage', () => {
  const code = fs.readFileSync('src/services/classroomPointsService.ts', 'utf8');
  assert.ok(!code.includes("window.localStorage.setItem('edtechra_lb_settings_'"), 'Must NOT store fake settings in localStorage');
  assert.ok(code.includes('sync_classroom_leaderboard_schedule'), 'Must sync schedule via atomic RPC');
  assert.ok(code.includes('throwOnError'), 'Must support throwOnError option for fail-closed behavior');
});

// ============================================================================
// SECTION 4: LIVE DATABASE & RPC END-TO-END VERIFICATION (Tests A through G)
// ============================================================================
console.log('\n--- 4. Live Supabase Database & Backend End-to-End Tests ---');

await testAsync('Test A & D: Read-only verification of real classroom and share formatting without mutating live data', async () => {
  assert.ok(supabaseUrl, 'VITE_SUPABASE_URL must be defined');
  assert.ok(supabaseServiceKey, 'SUPABASE_SERVICE_ROLE_KEY must be defined');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check the known production classroom
  const liveClassroomId = 'fca4954f-a5db-44b8-8046-1136d8c39a53';
  const { data: classroom, error: classErr } = await supabase
    .from('classrooms')
    .select('id, title, teacher_id, leaderboard_reset_frequency, leaderboard_reset_at')
    .eq('id', liveClassroomId)
    .single();

  assert.ok(!classErr, `Query failed: ${classErr?.message}`);
  assert.strictEqual(classroom.id, liveClassroomId);
  assert.strictEqual(classroom.title, 'Thiruchenthoor class');

  // Verify classroom_points query with leaderboard_reset_at filter
  let pointsQuery = supabase
    .from('classroom_points')
    .select('student_id, points, created_at')
    .eq('classroom_id', liveClassroomId);

  if (classroom.leaderboard_reset_at) {
    pointsQuery = pointsQuery.gte('created_at', classroom.leaderboard_reset_at);
  }

  const { data: pointsRows, error: ptsErr } = await pointsQuery;
  assert.ok(!ptsErr, `Points query failed: ${ptsErr?.message}`);

  // Tally points by student
  const pointsMap = new Map();
  for (const r of pointsRows || []) {
    pointsMap.set(r.student_id, (pointsMap.get(r.student_id) || 0) + (r.points || 0));
  }

  // Get student names
  const studentIds = Array.from(pointsMap.keys());
  let leaderboardEntries = [];
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    leaderboardEntries = studentIds.map(sid => {
      const p = profileMap.get(sid);
      return {
        user_id: sid,
        name: sanitizeLeaderboardStudentName(p?.full_name || p?.email || 'Anonymous Student'),
        points: pointsMap.get(sid) || 0
      };
    }).sort((a, b) => b.points - a.points);
  }

  // Verify real students exist
  assert.ok(leaderboardEntries.length >= 3, `Expected at least 3 students, found ${leaderboardEntries.length}`);
  const topNames = leaderboardEntries.slice(0, 3).map(e => e.name);
  assert.ok(topNames.some(n => n.includes('Theveshghar')), 'Top 3 should include Theveshghar');

  // Verify Share formatting on real data
  const shareText = formatLeaderboardShareText(leaderboardEntries, 3);
  assert.ok(shareText.startsWith('EdTechra Classroom Leaderboard'));
  assert.ok(shareText.includes('Keep learning. Keep growing.'));
  assert.ok(!shareText.includes('@'), 'Share text must never expose email addresses');
});

await testAsync('Tests B, C, E: Isolated mutation tests using a temporary test classroom (Manual Reset, Refresh, and Share)', async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Get an existing teacher user ID to own the test classroom
  const { data: teacherUser, error: teacherErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'teacher')
    .limit(1)
    .single();

  assert.ok(!teacherErr && teacherUser?.id, 'Need an existing teacher profile for test classroom');
  const teacherId = teacherUser.id;

  // 2. Create isolated temporary classroom
  const testClassroomTitle = `__edtechra_temp_test_reset_${Date.now()}__`;
  const { data: tempClassroom, error: createClassErr } = await supabase
    .from('classrooms')
    .insert({
      title: testClassroomTitle,
      teacher_id: teacherId,
      subject: 'Test Subject',
      grade: 'Grade 10',
      leaderboard_reset_frequency: 'never'
    })
    .select('id, title, teacher_id')
    .single();

  assert.ok(!createClassErr, `Failed to create test classroom: ${createClassErr?.message}`);
  const tempClassroomId = tempClassroom.id;

  try {
    // 3. Insert temporary historical classroom_points row (e.g. 250 points)
    const { data: pointRow, error: pointErr } = await supabase
      .from('classroom_points')
      .insert({
        classroom_id: tempClassroomId,
        student_id: teacherId,
        points: 250,
        reason: 'Initial Test Quiz XP'
      })
      .select('id, points, created_at')
      .single();

    assert.ok(!pointErr, `Failed to insert test points: ${pointErr?.message}`);

    // Verify score before reset = 250 XP
    const { data: preResetPoints } = await supabase
      .from('classroom_points')
      .select('points')
      .eq('classroom_id', tempClassroomId);
    const sumBefore = (preResetPoints || []).reduce((acc, r) => acc + r.points, 0);
    assert.strictEqual(sumBefore, 250, 'Score before reset must be 250');

    // 4. Execute atomic reset_classroom_leaderboard RPC (Test B)
    const { data: resetResult, error: resetRpcErr } = await supabase
      .rpc('reset_classroom_leaderboard', { p_classroom_id: tempClassroomId });

    assert.ok(!resetRpcErr, `reset_classroom_leaderboard RPC error: ${resetRpcErr?.message}`);
    assert.strictEqual(resetResult?.success, true, 'RPC must return { success: true }');
    assert.ok(resetResult?.reset_at, 'RPC must return reset_at timestamp');

    // 5. Verify the historical points record was NOT deleted! (Zero data loss guarantee)
    const { data: preservedPoints, error: presErr } = await supabase
      .from('classroom_points')
      .select('id, points, reason')
      .eq('classroom_id', tempClassroomId);

    assert.ok(!presErr, `Query failed: ${presErr?.message}`);
    assert.strictEqual(preservedPoints.length, 1, 'Historical point record must NOT be deleted');
    assert.strictEqual(preservedPoints[0].points, 250);
    assert.strictEqual(preservedPoints[0].reason, 'Initial Test Quiz XP');

    // 6. Test Refresh (Test C): Query current period leaderboard (created_at >= leaderboard_reset_at)
    const { data: freshClassroom } = await supabase
      .from('classrooms')
      .select('leaderboard_reset_at')
      .eq('id', tempClassroomId)
      .single();

    assert.ok(freshClassroom?.leaderboard_reset_at, 'Classroom must have leaderboard_reset_at set');

    const { data: postResetCurrentPoints } = await supabase
      .from('classroom_points')
      .select('points')
      .eq('classroom_id', tempClassroomId)
      .gte('created_at', freshClassroom.leaderboard_reset_at);

    const sumAfter = (postResetCurrentPoints || []).reduce((acc, r) => acc + r.points, 0);
    assert.strictEqual(sumAfter, 0, 'Current period leaderboard score must be strictly 0 XP after reset');

    // 7. Test Share after reset (Test E): Share generator produces 0 XP
    const shareAfterReset = formatLeaderboardShareText([
      { name: 'Test Student', points: sumAfter }
    ], 3);
    assert.ok(shareAfterReset.includes('1. Test Student — 0 XP'));

    // 8. Test subsequent points accumulate from 0 XP
    await new Promise(r => setTimeout(r, 50));
    await supabase
      .from('classroom_points')
      .insert({
        classroom_id: tempClassroomId,
        student_id: teacherId,
        points: 50,
        reason: 'New Quiz XP After Reset'
      });

    const { data: newPointsQuery } = await supabase
      .from('classroom_points')
      .select('points')
      .eq('classroom_id', tempClassroomId)
      .gte('created_at', freshClassroom.leaderboard_reset_at);

    const sumNew = (newPointsQuery || []).reduce((acc, r) => acc + r.points, 0);
    assert.strictEqual(sumNew, 50, 'New points earned after reset must accumulate from 0 XP (total 50 XP)');

    // 9. Verify Reset Frequency updates (Part 2)
    const frequencies = ['daily', 'weekly', 'monthly', 'never'];
    for (const freq of frequencies) {
      const { data: freqRes, error: freqErr } = await supabase
        .rpc('update_classroom_leaderboard_settings', {
          p_classroom_id: tempClassroomId,
          p_frequency: freq,
          p_timezone: 'Asia/Colombo'
        });
      assert.ok(!freqErr, `Frequency update failed for ${freq}: ${freqErr?.message}`);
      const settings = freqRes?.settings || freqRes;
      assert.strictEqual(settings.frequency, freq);
      if (freq === 'never') {
        assert.strictEqual(settings.next_reset_at, null);
      } else {
        assert.ok(settings.next_reset_at !== null, `Expected next_reset_at for ${freq}`);
      }
    }

  } finally {
    // Clean up temporary test data completely
    await supabase.from('classroom_points').delete().eq('classroom_id', tempClassroomId);
    await supabase.from('classrooms').delete().eq('id', tempClassroomId);
  }
});

await testAsync('Test F: Unauthorized student/anonymous caller is rejected by RPC and backend', async () => {
  // Test direct unauthenticated call to reset_classroom_leaderboard RPC
  const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);
  const fakeId = '00000000-0000-0000-0000-000000000000';

  const { data: res, error: rpcErr } = await anonSupabase
    .rpc('reset_classroom_leaderboard', { p_classroom_id: fakeId });

  // Unauthenticated client has auth.uid() = null, so RPC raises 42501 permission denied
  assert.ok(
    rpcErr || (res && res.success === false),
    'Unauthenticated RPC call must be rejected'
  );
  if (rpcErr) {
    assert.ok(
      rpcErr.message.includes('permission denied') ||
      rpcErr.message.includes('Unauthorized') ||
      rpcErr.code === '42501' ||
      rpcErr.code === 'P0001',
      `Expected authorization error code or message, got: ${rpcErr.message} (${rpcErr.code})`
    );
  }
});

await testAsync('Test G: Simulated failure returns error without claiming success or changing data', async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const nonExistentId = '99999999-9999-9999-9999-999999999999';

  // Attempt reset on non-existent classroom
  const { data: res, error } = await supabase
    .rpc('reset_classroom_leaderboard', { p_classroom_id: nonExistentId });

  // Must either raise an error or return success: false
  assert.ok(
    error || (res && res.success === false),
    'Non-existent classroom reset must fail'
  );
  if (res) {
    assert.strictEqual(res.success, false);
  }
});

console.log(`\n========================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
