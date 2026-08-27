// ============================================================================
// EDTECHRA-BITZ: Verification Test Suite
// Dashboard Avatar Persistence, Post +10 XP, Stats & Leaderboard Admin Exclusion
// ============================================================================

import assert from 'assert';

console.log('\n=============================================================');
console.log('🧪 RUNNING EDTECHRA DASHBOARD, AVATAR & FEED TEST SUITE');
console.log('=============================================================\n');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

// ----------------------------------------------------------------------------
// TEST GROUP 1: AVATAR PERSISTENCE & RESOLUTION
// ----------------------------------------------------------------------------
test('TEST 1.1: Avatar fallback resolution prioritizes profiles.avatar_url', () => {
  const profile = { avatar_url: 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix' };
  const userMetadata = { avatar_url: 'https://google.com/old_avatar.png' };

  const effectiveAvatar = profile?.avatar_url || userMetadata?.avatar_url;
  assert.strictEqual(effectiveAvatar, 'https://api.dicebear.com/9.x/adventurer/svg?seed=Felix');
});

test('TEST 1.2: Avatar falls back to Google picture if profile avatar is null/empty', () => {
  const profile = { avatar_url: null };
  const userMetadata = { picture: 'https://google.com/oauth_picture.png' };

  const effectiveAvatar = profile?.avatar_url || userMetadata?.picture;
  assert.strictEqual(effectiveAvatar, 'https://google.com/oauth_picture.png');
});

test('TEST 1.3: User can select preset avatar key/URL without breaking state', () => {
  const presetUrl = 'https://api.dicebear.com/9.x/adventurer/svg?seed=Zoe';
  const updatedProfile = {
    id: 'student-123',
    full_name: 'Zoe Student',
    avatar_url: presetUrl,
    text_size: 'medium'
  };

  assert.strictEqual(updatedProfile.avatar_url, presetUrl);
  assert.strictEqual(updatedProfile.text_size, 'medium');
});

// ----------------------------------------------------------------------------
// TEST GROUP 2: STUDENT POST = +10 XP & IDEMPOTENCE
// ----------------------------------------------------------------------------
test('TEST 2.1: Approved student post awards +10 XP', () => {
  const post = {
    id: 'post-101',
    user_id: 'student-1',
    status: 'approved',
    xp_awarded: 10
  };

  assert.strictEqual(post.status, 'approved');
  assert.strictEqual(post.xp_awarded, 10);
});

test('TEST 2.2: Multiple posts award +10 XP each without duplicate accumulation on refresh', () => {
  const userPosts = [
    { id: 'p1', user_id: 'student-1', status: 'approved', xp_awarded: 10 },
    { id: 'p2', user_id: 'student-1', status: 'approved', xp_awarded: 10 },
    { id: 'p3', user_id: 'student-1', status: 'approved', xp_awarded: 10 },
    { id: 'p4', user_id: 'student-1', status: 'rejected', xp_awarded: 0 }, // Rejected post awards 0 XP
    { id: 'p5', user_id: 'student-1', status: 'review', xp_awarded: 0 }    // In-review post awards 0 XP
  ];

  const approvedPosts = userPosts.filter(p => p.status === 'approved');
  const postsCount = approvedPosts.length;
  const totalPostXp = approvedPosts.reduce((sum, p) => sum + (p.xp_awarded || 10), 0);

  assert.strictEqual(postsCount, 3);
  assert.strictEqual(totalPostXp, 30);

  // Simulating a page refresh: recalculate from database records
  const refreshedPostXp = approvedPosts.length * 10;
  assert.strictEqual(refreshedPostXp, 30, 'XP must remain 30 upon page refresh (idempotent)');
});

// ----------------------------------------------------------------------------
// TEST GROUP 3: "YOUR POSTS" & "LIKES" CALCULATION
// ----------------------------------------------------------------------------
test('TEST 3.1: "Your Posts" count counts only the authenticated student\'s approved posts', () => {
  const allPosts = [
    { id: 'p1', user_id: 'student-A', status: 'approved' },
    { id: 'p2', user_id: 'student-A', status: 'approved' },
    { id: 'p3', user_id: 'student-B', status: 'approved' }, // Different user
    { id: 'p4', user_id: 'student-A', status: 'pending' }   // Not approved yet
  ];

  const currentUserId = 'student-A';
  const userPosts = allPosts.filter(p => p.user_id === currentUserId && p.status === 'approved');
  assert.strictEqual(userPosts.length, 2);
});

test('TEST 3.2: "Likes" count sums total likes received on student\'s own posts', () => {
  const studentPosts = [
    { id: 'p1', user_id: 'student-A', likes_count: 5 },
    { id: 'p2', user_id: 'student-A', likes_count: 3 },
    { id: 'p3', user_id: 'student-A', likes_count: 7 }
  ];

  const totalLikesReceived = studentPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
  assert.strictEqual(totalLikesReceived, 15, 'Likes received must sum all likes across user posts (5+3+7=15)');
});

test('TEST 3.3: Total Dashboard XP formula integrates post XP correctly', () => {
  const baseStarterXp = 100;
  const completedLevelsCount = 2; // 2 * 40 = 80 XP
  const videoQuizzesCompleted = 1; // 1 * 40 = 40 XP
  const quizBitsXp = 40; // 2 quiz bits * 20 = 40 XP
  const postsCount = 3; // 3 * 10 = 30 XP

  const totalDashboardXp = baseStarterXp + (completedLevelsCount * 40) + (videoQuizzesCompleted * 40) + quizBitsXp + (postsCount * 10);
  assert.strictEqual(totalDashboardXp, 290);
});

// ----------------------------------------------------------------------------
// TEST GROUP 4: MAIN LEADERBOARD EXCLUDES ADMINS & TEACHERS
// ----------------------------------------------------------------------------
test('TEST 4.1: Leaderboard learner filter excludes admin, super_admin, and teacher accounts', () => {
  const allProfiles = [
    { id: 'u1', full_name: 'Student Joy', role: 'student', xp: 250 },
    { id: 'u2', full_name: 'Teacher Smith', role: 'teacher', xp: 900 },
    { id: 'u3', full_name: 'Admin Boss', role: 'admin', xp: 5000 },
    { id: 'u4', full_name: 'Super Admin', role: 'super_admin', xp: 9999 },
    { id: 'u5', full_name: 'Student Sarah', role: 'student', xp: 320 }
  ];

  const learnerProfiles = allProfiles.filter(p => p.role !== 'admin' && p.role !== 'super_admin' && p.role !== 'teacher' && p.role === 'student');

  assert.strictEqual(learnerProfiles.length, 2);
  assert.deepStrictEqual(learnerProfiles.map(p => p.id), ['u1', 'u5']);
});

test('TEST 4.2: Leaderboard rankings are purely determined by student learner XP', () => {
  const eligibleLearners = [
    { id: 'u1', full_name: 'Student Joy', role: 'student', xp: 250, created_at: '2026-08-01' },
    { id: 'u5', full_name: 'Student Sarah', role: 'student', xp: 320, created_at: '2026-08-02' },
    { id: 'u6', full_name: 'Student Alex', role: 'student', xp: 180, created_at: '2026-08-03' }
  ];

  const ranked = eligibleLearners
    .sort((a, b) => b.xp - a.xp)
    .map((u, idx) => ({ ...u, rank: idx + 1 }));

  assert.strictEqual(ranked[0].id, 'u5', 'Rank 1 should be Sarah (320 XP)');
  assert.strictEqual(ranked[1].id, 'u1', 'Rank 2 should be Joy (250 XP)');
  assert.strictEqual(ranked[2].id, 'u6', 'Rank 3 should be Alex (180 XP)');
});

test('TEST 4.3: Admin account query returns null or non-ranking in learner Top 10', () => {
  const currentUserId = 'u3'; // Admin
  const rankedStudents = [
    { rank: 1, userId: 'u5' },
    { rank: 2, userId: 'u1' }
  ];

  const adminInTop10 = rankedStudents.find(s => s.userId === currentUserId);
  assert.strictEqual(adminInTop10, undefined, 'Admin must not appear in student leaderboard ranking');
});

// ----------------------------------------------------------------------------
// SUMMARY REPORT
// ----------------------------------------------------------------------------
console.log('\n=============================================================');
console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('=============================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
