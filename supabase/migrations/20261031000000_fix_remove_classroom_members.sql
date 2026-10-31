-- ============================================================================
-- Migration: Fix Classroom Student Removal (Manage Students -> Remove Selected)
-- Ensures atomic, teacher-authorized, verified deletion of classroom_members rows
-- while preserving global student accounts and historical learning data.
-- ============================================================================

-- 1. Deduplicate any hypothetical duplicate (classroom_id, profile_id) rows
--    and guarantee a database-level UNIQUE constraint on classroom_members.
DO $$
BEGIN
    DELETE FROM public.classroom_members a
    USING public.classroom_members b
    WHERE a.classroom_id = b.classroom_id
      AND a.profile_id = b.profile_id
      AND a.ctid > b.ctid;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.classroom_members'::regclass
          AND contype = 'u'
          AND conname = 'classroom_members_classroom_id_profile_id_key'
    ) THEN
        ALTER TABLE public.classroom_members
        ADD CONSTRAINT classroom_members_classroom_id_profile_id_key
        UNIQUE (classroom_id, profile_id);
    END IF;
END $$;

-- 2. Update check_is_classroom_teacher so RLS on classroom_members allows:
--    - Classroom owner (classrooms.teacher_id)
--    - Active classroom teacher / co-teacher (classroom_members.role IN ('teacher', 'co-teacher'))
--    - Platform admin (profiles.role = 'admin' or roshanjoyal520@gmail.com)
CREATE OR REPLACE FUNCTION public.check_is_classroom_teacher(c_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF c_id IS NULL OR u_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN (
        EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = c_id AND c.teacher_id = u_id
        )
        OR EXISTS (
            SELECT 1 FROM public.classroom_members cm
            WHERE cm.classroom_id = c_id
              AND cm.profile_id = u_id
              AND cm.role IN ('teacher', 'co-teacher')
              AND cm.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = u_id
              AND (
                  p.role = 'admin'
                  OR LOWER(TRIM(COALESCE(p.email, ''))) = 'roshanjoyal520@gmail.com'
              )
        )
    );
END;
$$;

-- Ensure the DELETE policy on classroom_members uses check_is_classroom_teacher
DROP POLICY IF EXISTS "Teachers can delete members" ON public.classroom_members;
CREATE POLICY "Teachers can delete members"
ON public.classroom_members
FOR DELETE
TO public
USING (
    (auth.uid() = profile_id)
    OR public.check_is_classroom_teacher(classroom_id, auth.uid())
);

-- 3. Atomic, Teacher-Authorized, Verified Student Removal RPC
--    Permanently removes the student's enrollment row(s) from public.classroom_members
--    for the given classroom, verifies zero remaining rows in the database, and never
--    deletes the student's global profile or historical learning records.
CREATE OR REPLACE FUNCTION public.remove_classroom_members(
    p_classroom_id UUID,
    p_profile_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_jwt_role TEXT;
    v_classroom RECORD;
    v_target_ids UUID[];
    v_removed_count INT := 0;
    v_removed_profile_ids UUID[] := ARRAY[]::UUID[];
    v_remaining_count INT := 0;
BEGIN
    IF p_classroom_id IS NULL THEN
        RAISE EXCEPTION 'Classroom ID is required.' USING ERRCODE = '22023';
    END IF;

    -- Filter out NULLs and deduplicate target profile IDs
    SELECT COALESCE(ARRAY_AGG(DISTINCT pid), ARRAY[]::UUID[])
    INTO v_target_ids
    FROM UNNEST(COALESCE(p_profile_ids, ARRAY[]::UUID[])) AS pid
    WHERE pid IS NOT NULL;

    IF COALESCE(ARRAY_LENGTH(v_target_ids, 1), 0) = 0 THEN
        RAISE EXCEPTION 'At least one student profile ID is required.' USING ERRCODE = '22023';
    END IF;

    v_caller_id := auth.uid();
    v_jwt_role := COALESCE(auth.role(), '');

    -- Enforce teacher/admin authorization (unless invoked by backend service_role / postgres)
    IF v_jwt_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
        END IF;

        IF NOT public.check_is_classroom_teacher(p_classroom_id, v_caller_id) THEN
            RAISE EXCEPTION 'Access denied: Only classroom teachers and admins can remove students from this classroom.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT id, teacher_id
    INTO v_classroom
    FROM public.classrooms
    WHERE id = p_classroom_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Classroom not found.' USING ERRCODE = 'P0002';
    END IF;

    -- Permanently delete matching student enrollment records for this classroom
    -- Never remove the classroom owner (teacher_id) or teacher/co-teacher records
    WITH deleted AS (
        DELETE FROM public.classroom_members cm
        WHERE cm.classroom_id = p_classroom_id
          AND cm.profile_id = ANY(v_target_ids)
          AND (v_classroom.teacher_id IS NULL OR cm.profile_id <> v_classroom.teacher_id)
          AND cm.role = 'student'
        RETURNING cm.id, cm.profile_id
    )
    SELECT
        COUNT(*)::INT,
        COALESCE(ARRAY_AGG(DISTINCT deleted.profile_id), ARRAY[]::UUID[])
    INTO v_removed_count, v_removed_profile_ids
    FROM deleted;

    -- Post-delete verification: confirm zero student enrollment rows remain for the target IDs
    SELECT COUNT(*)::INT
    INTO v_remaining_count
    FROM public.classroom_members cm
    WHERE cm.classroom_id = p_classroom_id
      AND cm.profile_id = ANY(v_target_ids)
      AND (v_classroom.teacher_id IS NULL OR cm.profile_id <> v_classroom.teacher_id)
      AND cm.role = 'student';

    IF v_remaining_count > 0 THEN
        RAISE EXCEPTION 'Student removal verification failed: % enrollment record(s) still exist in classroom_members.', v_remaining_count
            USING ERRCODE = 'P0001';
    END IF;

    IF v_removed_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'classroom_id', p_classroom_id,
            'removed_count', 0,
            'removed_profile_ids', ARRAY[]::UUID[],
            'remaining_count', v_remaining_count,
            'error', 'No matching student enrollment records were found in this classroom.'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'classroom_id', p_classroom_id,
        'removed_count', v_removed_count,
        'removed_profile_ids', v_removed_profile_ids,
        'remaining_count', v_remaining_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.remove_classroom_members(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_classroom_members(UUID, UUID[]) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
