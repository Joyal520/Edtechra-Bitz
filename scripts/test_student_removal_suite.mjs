// ============================================================================
// Comprehensive Automated Test Suite: Student Removal (Manage Students -> Remove Selected)
// Verifies 17-Step Regression Sequence on Live Supabase Database
// ============================================================================

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

let passed = 0;
let failed = 0;

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

// Load env
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
    if (k === 'VITE_SUPABASE_URL') supabaseUrl = v;
    if (k === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = v;
    if (k === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = v;
  }
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runStudentRemovalSuite() {
  console.log('\n=== RUNNING CLASSROOM STUDENT REMOVAL VERIFICATION SUITE ===\n');

  // Find an existing teacher or use admin profile
  const { data: teacherProfiles } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'teacher')
    .limit(1);

  const teacherId = teacherProfiles?.[0]?.id || '548eea36-a825-4c69-9ca3-89fc06218c39';

  // Find or create test student
  const { data: studentProfiles } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'student')
    .limit(2);

  let studentA = studentProfiles?.[0];
  let studentB = studentProfiles?.[1];

  assert(studentA, 'At least one student profile is required in the database.');

  let testClassroomId = null;

  try {
    // ------------------------------------------------------------------------
    // STEP 1: Create a dedicated isolated test classroom
    // ------------------------------------------------------------------------
    await testAsync('Step 1: Create isolated test classroom for student removal verification', async () => {
      const { data: newClass, error } = await adminClient
        .from('classrooms')
        .insert({
          title: `[TEST] Student Removal E2E ${Date.now()}`,
          subject: 'Quality Assurance',
          grade: 'Grade 12',
          teacher_id: teacherId,
          theme: 'theme-sky',
          description: 'Automated test classroom for student removal persistence'
        })
        .select()
        .single();

      assert(!error, `Failed to create test classroom: ${error?.message}`);
      assert(newClass && newClass.id, 'Created classroom must have valid ID');
      testClassroomId = newClass.id;
    });

    // ------------------------------------------------------------------------
    // STEP 2: Enroll Student A and Student B into the classroom
    // ------------------------------------------------------------------------
    await testAsync('Step 2: Enroll Student A and Student B into the test classroom', async () => {
      const enrollments = [
        {
          classroom_id: testClassroomId,
          profile_id: studentA.id,
          role: 'student',
          status: 'active'
        }
      ];
      if (studentB) {
        enrollments.push({
          classroom_id: testClassroomId,
          profile_id: studentB.id,
          role: 'student',
          status: 'active'
        });
      }

      const { data, error } = await adminClient
        .from('classroom_members')
        .upsert(enrollments, { onConflict: 'classroom_id,profile_id' })
        .select();

      assert(!error, `Failed to enroll students: ${error?.message}`);
      assert(data && data.length >= 1, 'Enrolled students should be returned');
    });

    // ------------------------------------------------------------------------
    // STEP 3: Add historical learning data (quiz point) for Student A to ensure safe preservation
    // ------------------------------------------------------------------------
    let testPointId = null;
    await testAsync('Step 3: Insert historical XP point for Student A (safety rule)', async () => {
      const { data: point, error } = await adminClient
        .from('classroom_points')
        .insert({
          classroom_id: testClassroomId,
          student_id: studentA.id,
          points: 50,
          reason: 'Initial assignment completion'
        })
        .select()
        .single();

      assert(!error, `Failed to insert test XP: ${error?.message}`);
      assert(point && point.id, 'XP point record should have an ID');
      testPointId = point.id;
    });

    // ------------------------------------------------------------------------
    // STEP 4: Confirm Student A appears in enrolled members query
    // ------------------------------------------------------------------------
    await testAsync('Step 4: Confirm Student A appears in classroom_members query', async () => {
      const { data: members, error } = await adminClient
        .from('classroom_members')
        .select('profile_id, status, role')
        .eq('classroom_id', testClassroomId)
        .eq('status', 'active');

      assert(!error, `Query failed: ${error?.message}`);
      const foundA = members.some(m => m.profile_id === studentA.id);
      assert(foundA, 'Student A must be present in active classroom members');
    });

    // ------------------------------------------------------------------------
    // STEP 5: Call remove_classroom_members RPC to remove Student A
    // ------------------------------------------------------------------------
    await testAsync('Step 5: Execute remove_classroom_members RPC to remove Student A', async () => {
      const { data: rpcRes, error } = await adminClient.rpc('remove_classroom_members', {
        p_classroom_id: testClassroomId,
        p_profile_ids: [studentA.id]
      });

      assert(!error, `remove_classroom_members RPC returned error: ${error?.message}`);
      assert(rpcRes?.success === true, `Expected success: true, got ${JSON.stringify(rpcRes)}`);
      assert(rpcRes?.removed_count === 1, `Expected removed_count: 1, got ${rpcRes?.removed_count}`);
      assert(rpcRes?.remaining_count === 0, `Expected remaining_count: 0, got ${rpcRes?.remaining_count}`);
    });

    // ------------------------------------------------------------------------
    // STEP 6: Fresh database query: verify ZERO records exist in classroom_members for Student A
    // ------------------------------------------------------------------------
    await testAsync('Step 6: Query classroom_members directly: verify ZERO records remain for Student A', async () => {
      const { data: remaining, error } = await adminClient
        .from('classroom_members')
        .select('id, profile_id, role, status')
        .eq('classroom_id', testClassroomId)
        .eq('profile_id', studentA.id);

      assert(!error, `Direct query failed: ${error?.message}`);
      assert.strictEqual(remaining.length, 0, `Expected 0 records for Student A, found ${remaining.length}`);
    });

    // ------------------------------------------------------------------------
    // STEP 7: Simulate close and reopen Manage Students modal (fresh query)
    // ------------------------------------------------------------------------
    await testAsync('Step 7: Simulate close & reopen Manage Students modal: Student A remains absent', async () => {
      const { data: freshList, error } = await adminClient
        .from('classroom_members')
        .select('*, profile:profiles!profile_id(id, email, full_name)')
        .eq('classroom_id', testClassroomId)
        .eq('status', 'active');

      assert(!error, `Failed to fetch members: ${error?.message}`);
      const present = freshList.some(m => m.profile_id === studentA.id);
      assert(!present, 'Student A must NOT appear after reopening Manage Students modal');
    });

    // ------------------------------------------------------------------------
    // STEP 8: Simulate page refresh / classroom stats calculation
    // ------------------------------------------------------------------------
    await testAsync('Step 8: Simulate page refresh & verify student_count excludes Student A', async () => {
      const { count, error } = await adminClient
        .from('classroom_members')
        .select('id', { count: 'exact' })
        .eq('classroom_id', testClassroomId)
        .eq('status', 'active')
        .eq('role', 'student');

      assert(!error, `Failed to get student count: ${error?.message}`);
      const expectedCount = studentB ? 1 : 0;
      assert.strictEqual(count, expectedCount, `Expected student_count: ${expectedCount}, got ${count}`);
    });

    // ------------------------------------------------------------------------
    // STEP 9: Verify Historical Learning Data (XP point) is PRESERVED (Safety Rule)
    // ------------------------------------------------------------------------
    await testAsync('Step 9: Verify historical XP point for Student A is safely PRESERVED', async () => {
      const { data: pointRow, error } = await adminClient
        .from('classroom_points')
        .select('id, student_id, points')
        .eq('id', testPointId)
        .maybeSingle();

      assert(!error, `Failed to query historical points: ${error?.message}`);
      assert(pointRow, 'Historical classroom_points row must NOT be deleted');
      assert.strictEqual(pointRow.student_id, studentA.id, 'Student ID on historical points must remain intact');
    });

    // ------------------------------------------------------------------------
    // STEP 10: Verify Student A Global Profile is PRESERVED (Safety Rule)
    // ------------------------------------------------------------------------
    await testAsync('Step 10: Verify Student A global account (profiles) is safely PRESERVED', async () => {
      const { data: studentProf, error } = await adminClient
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', studentA.id)
        .maybeSingle();

      assert(!error, `Failed to query profile: ${error?.message}`);
      assert(studentProf, 'Global profile must NOT be deleted');
    });

    // ------------------------------------------------------------------------
    // STEP 11: Security check: Unauthorized student CANNOT call remove_classroom_members RPC
    // ------------------------------------------------------------------------
    await testAsync('Step 11: Security verification: anonymous/unauthorized caller is REJECTED', async () => {
      const { data, error } = await anonClient.rpc('remove_classroom_members', {
        p_classroom_id: testClassroomId,
        p_profile_ids: [studentA.id]
      });

      assert(error, 'Unauthorized caller must receive an error');
      assert(
        error.message.includes('Authentication required') ||
        error.message.includes('Access denied') ||
        error.code === '42501' ||
        error.code === 'P0001',
        `Expected auth error, got: ${error.message}`
      );
    });

    // ------------------------------------------------------------------------
    // STEP 12: Idempotent / Empty removal check: Removing already removed student returns 0 / false
    // ------------------------------------------------------------------------
    await testAsync('Step 12: Removing already-removed student returns clean failure without crash', async () => {
      const { data: resAgain, error } = await adminClient.rpc('remove_classroom_members', {
        p_classroom_id: testClassroomId,
        p_profile_ids: [studentA.id]
      });

      assert(!error, `Expected clean response, got error: ${error?.message}`);
      assert.strictEqual(resAgain.success, false, 'Expected success: false when 0 rows match');
      assert.strictEqual(resAgain.removed_count, 0, 'Expected removed_count: 0');
    });

    // ------------------------------------------------------------------------
    // STEP 13: Protection check: Cannot remove classroom owner (teacher_id)
    // ------------------------------------------------------------------------
    await testAsync('Step 13: Safety check: Classroom owner (teacher_id) CANNOT be removed as student', async () => {
      const { data: teacherRemoveRes, error } = await adminClient.rpc('remove_classroom_members', {
        p_classroom_id: testClassroomId,
        p_profile_ids: [teacherId]
      });

      assert(!error, `RPC failed: ${error?.message}`);
      assert.strictEqual(teacherRemoveRes.removed_count, 0, 'Teacher ID must not be deleted');
    });

    // ------------------------------------------------------------------------
    // STEP 14: Batch removal test: Enroll Student A and Student B, then remove both simultaneously
    // ------------------------------------------------------------------------
    if (studentB) {
      await testAsync('Step 14: Batch removal: Remove multiple selected students atomically', async () => {
        // Clean slate and insert both students to test multi-student batch removal
        await adminClient.from('classroom_members').delete().eq('classroom_id', testClassroomId);
        const { error: enrollErr } = await adminClient.from('classroom_members').insert([
          { classroom_id: testClassroomId, profile_id: studentA.id, role: 'student', status: 'active' },
          { classroom_id: testClassroomId, profile_id: studentB.id, role: 'student', status: 'active' }
        ]);
        assert(!enrollErr, `Failed to enroll students for batch test: ${enrollErr?.message}`);

        const { data: batchRes, error } = await adminClient.rpc('remove_classroom_members', {
          p_classroom_id: testClassroomId,
          p_profile_ids: [studentA.id, studentB.id]
        });

        assert(!error, `Batch remove RPC failed: ${error?.message}`);
        assert.strictEqual(batchRes.success, true, 'Batch removal should succeed');
        assert.strictEqual(batchRes.removed_count, 2, 'Expected 2 students removed');

        const { data: zeroRemaining } = await adminClient
          .from('classroom_members')
          .select('id')
          .eq('classroom_id', testClassroomId)
          .in('profile_id', [studentA.id, studentB.id]);

        assert.strictEqual(zeroRemaining.length, 0, 'Both students must have 0 records remaining in DB');
      });
    }

    // ------------------------------------------------------------------------
    // STEP 15: Re-enrollment workflow: Student A can successfully re-join after removal
    // ------------------------------------------------------------------------
    await testAsync('Step 15: Re-enrollment workflow: Student A can re-enroll and appear active', async () => {
      const { data: reEnrolled, error } = await adminClient
        .from('classroom_members')
        .insert({
          classroom_id: testClassroomId,
          profile_id: studentA.id,
          role: 'student',
          status: 'active'
        })
        .select()
        .single();

      assert(!error, `Re-enrollment failed: ${error?.message}`);
      assert(reEnrolled && reEnrolled.profile_id === studentA.id, 'Re-enrolled row must exist');
    });

    // ------------------------------------------------------------------------
    // STEP 16: Unique constraint check: Duplicate enrollment for same student in same classroom is prevented
    // ------------------------------------------------------------------------
    await testAsync('Step 16: Database UNIQUE constraint prevents duplicate enrollments for same student', async () => {
      const { error: dupError } = await adminClient
        .from('classroom_members')
        .insert({
          classroom_id: testClassroomId,
          profile_id: studentA.id,
          role: 'student',
          status: 'active'
        });

      assert(dupError, 'Duplicate enrollment insert must be rejected by UNIQUE constraint');
      assert(
        dupError.code === '23505' || dupError.message.includes('unique') || dupError.message.includes('key'),
        `Expected unique violation (23505), got: ${dupError.code} - ${dupError.message}`
      );
    });

    // ------------------------------------------------------------------------
    // STEP 17: Remove Student A again: Verify removal persists permanently
    // ------------------------------------------------------------------------
    await testAsync('Step 17: Remove Student A again: verify permanent removal persists', async () => {
      const { data: finalRes, error } = await adminClient.rpc('remove_classroom_members', {
        p_classroom_id: testClassroomId,
        p_profile_ids: [studentA.id]
      });

      assert(!error, `Final remove failed: ${error?.message}`);
      assert.strictEqual(finalRes.success, true, 'Removal must succeed');

      const { data: finalCheck } = await adminClient
        .from('classroom_members')
        .select('id')
        .eq('classroom_id', testClassroomId)
        .eq('profile_id', studentA.id);

      assert.strictEqual(finalCheck.length, 0, 'Zero records must remain in classroom_members');
    });

  } finally {
    // Clean up temporary test classroom
    if (testClassroomId) {
      console.log(`\n  Cleaning up temporary test classroom ${testClassroomId}...`);
      await adminClient.from('classroom_points').delete().eq('classroom_id', testClassroomId);
      await adminClient.from('classroom_members').delete().eq('classroom_id', testClassroomId);
      await adminClient.from('classrooms').delete().eq('id', testClassroomId);
    }
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentRemovalSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
