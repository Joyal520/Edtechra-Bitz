-- ============================================================================
-- Migration: Fix Classroom Leaderboard Reset Columns & Atomic Teacher-Authorized RPCs
-- Non-destructive period-based leaderboard reset (zero historical data deletion)
-- ============================================================================

-- 1. Ensure leaderboard schedule & reset period columns exist on public.classrooms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'classrooms'
          AND column_name = 'leaderboard_reset_frequency'
    ) THEN
        ALTER TABLE public.classrooms
        ADD COLUMN leaderboard_reset_frequency TEXT NOT NULL DEFAULT 'never';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'classrooms_leaderboard_reset_frequency_check'
    ) THEN
        ALTER TABLE public.classrooms
        ADD CONSTRAINT classrooms_leaderboard_reset_frequency_check
        CHECK (leaderboard_reset_frequency IN ('never', 'daily', 'weekly', 'monthly'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'classrooms'
          AND column_name = 'leaderboard_reset_at'
    ) THEN
        ALTER TABLE public.classrooms
        ADD COLUMN leaderboard_reset_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'classrooms'
          AND column_name = 'leaderboard_next_reset_at'
    ) THEN
        ALTER TABLE public.classrooms
        ADD COLUMN leaderboard_next_reset_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'classrooms'
          AND column_name = 'leaderboard_timezone'
    ) THEN
        ALTER TABLE public.classrooms
        ADD COLUMN leaderboard_timezone TEXT DEFAULT 'Asia/Colombo';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classrooms_leaderboard_next_reset_at
ON public.classrooms(leaderboard_next_reset_at)
WHERE leaderboard_reset_frequency <> 'never';

-- 2. Helper: Compute next scheduled midnight reset timestamp in classroom timezone
CREATE OR REPLACE FUNCTION public.calculate_next_leaderboard_reset(
    p_frequency TEXT,
    p_from TIMESTAMPTZ DEFAULT clock_timestamp(),
    p_timezone TEXT DEFAULT 'Asia/Colombo'
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tz TEXT;
    v_base TIMESTAMPTZ;
    v_local TIMESTAMP WITHOUT TIME ZONE;
BEGIN
    IF p_frequency IS NULL OR p_frequency = 'never' THEN
        RETURN NULL;
    END IF;

    IF p_frequency NOT IN ('daily', 'weekly', 'monthly') THEN
        RAISE EXCEPTION 'Invalid leaderboard reset frequency: %', p_frequency
            USING ERRCODE = '22023';
    END IF;

    v_base := COALESCE(p_from, clock_timestamp());
    v_tz := COALESCE(NULLIF(TRIM(p_timezone), ''), 'Asia/Colombo');

    BEGIN
        PERFORM v_base AT TIME ZONE v_tz;
    EXCEPTION WHEN OTHERS THEN
        v_tz := 'Asia/Colombo';
    END;

    v_local := v_base AT TIME ZONE v_tz;

    IF p_frequency = 'daily' THEN
        RETURN (date_trunc('day', v_local) + interval '1 day') AT TIME ZONE v_tz;
    ELSIF p_frequency = 'weekly' THEN
        -- PostgreSQL ISO week starts on Monday 00:00:00
        RETURN (date_trunc('week', v_local) + interval '7 days') AT TIME ZONE v_tz;
    ELSIF p_frequency = 'monthly' THEN
        RETURN (date_trunc('month', v_local) + interval '1 month') AT TIME ZONE v_tz;
    END IF;

    RETURN NULL;
END;
$$;

-- 3. Atomic, Teacher-Authorized Manual Leaderboard Reset RPC
--    Never deletes student accounts, grades, submissions, exams, certificates, or points rows.
CREATE OR REPLACE FUNCTION public.reset_classroom_leaderboard(
    p_classroom_id UUID
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
    v_freq TEXT;
    v_tz TEXT;
    v_clock TIMESTAMPTZ;
    v_max_point_created TIMESTAMPTZ;
    v_reset_at TIMESTAMPTZ;
    v_next_reset_at TIMESTAMPTZ;
BEGIN
    IF p_classroom_id IS NULL THEN
        RAISE EXCEPTION 'Classroom ID is required.' USING ERRCODE = '22023';
    END IF;

    v_caller_id := auth.uid();
    v_jwt_role := COALESCE(auth.role(), '');

    IF v_jwt_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
        END IF;

        IF NOT (
            EXISTS (
                SELECT 1 FROM public.classrooms c
                WHERE c.id = p_classroom_id AND c.teacher_id = v_caller_id
            )
            OR EXISTS (
                SELECT 1 FROM public.classroom_members cm
                WHERE cm.classroom_id = p_classroom_id
                  AND cm.profile_id = v_caller_id
                  AND cm.role IN ('teacher', 'co-teacher')
                  AND cm.status = 'active'
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = v_caller_id AND p.role = 'admin'
            )
        ) THEN
            RAISE EXCEPTION 'Access denied: Only classroom teachers and admins can reset the leaderboard.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Lock classroom row atomically to prevent concurrent reset race conditions
    SELECT
        id,
        leaderboard_reset_frequency,
        leaderboard_reset_at,
        leaderboard_next_reset_at,
        leaderboard_timezone
    INTO v_classroom
    FROM public.classrooms
    WHERE id = p_classroom_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Classroom not found.' USING ERRCODE = 'P0002';
    END IF;

    v_freq := COALESCE(v_classroom.leaderboard_reset_frequency, 'never');
    v_tz := COALESCE(NULLIF(TRIM(v_classroom.leaderboard_timezone), ''), 'Asia/Colombo');
    v_clock := clock_timestamp();

    SELECT MAX(created_at)
    INTO v_max_point_created
    FROM public.classroom_points
    WHERE classroom_id = p_classroom_id;

    -- Idempotency / concurrent teacher protection:
    -- If another request just reset this classroom within the last 3 seconds and no new points exist since then,
    -- preserve the atomic reset state cleanly.
    IF v_classroom.leaderboard_reset_at IS NOT NULL
       AND (v_clock - v_classroom.leaderboard_reset_at) >= interval '0 seconds'
       AND (v_clock - v_classroom.leaderboard_reset_at) < interval '3 seconds'
       AND (v_max_point_created IS NULL OR v_max_point_created < v_classroom.leaderboard_reset_at)
    THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_reset', true,
            'classroom_id', p_classroom_id,
            'frequency', v_freq,
            'reset_at', v_classroom.leaderboard_reset_at,
            'next_reset_at', v_classroom.leaderboard_next_reset_at,
            'timezone', v_tz
        );
    END IF;

    -- Guarantee every existing classroom_points row falls strictly before v_reset_at
    v_reset_at := GREATEST(
        v_clock,
        COALESCE(v_max_point_created + interval '1 microsecond', v_clock)
    );
    v_next_reset_at := public.calculate_next_leaderboard_reset(v_freq, v_reset_at, v_tz);

    UPDATE public.classrooms
    SET
        leaderboard_reset_at = v_reset_at,
        leaderboard_next_reset_at = v_next_reset_at,
        updated_at = v_clock
    WHERE id = p_classroom_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_reset', false,
        'classroom_id', p_classroom_id,
        'frequency', v_freq,
        'reset_at', v_reset_at,
        'next_reset_at', v_next_reset_at,
        'timezone', v_tz
    );
END;
$$;

-- 4. Atomic, Teacher-Authorized Leaderboard Frequency Settings RPC
CREATE OR REPLACE FUNCTION public.update_classroom_leaderboard_settings(
    p_classroom_id UUID,
    p_frequency TEXT,
    p_timezone TEXT DEFAULT 'Asia/Colombo'
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
    v_tz TEXT;
    v_clock TIMESTAMPTZ;
    v_next_reset_at TIMESTAMPTZ;
BEGIN
    IF p_classroom_id IS NULL THEN
        RAISE EXCEPTION 'Classroom ID is required.' USING ERRCODE = '22023';
    END IF;

    IF p_frequency IS NULL OR p_frequency NOT IN ('never', 'daily', 'weekly', 'monthly') THEN
        RAISE EXCEPTION 'Invalid frequency. Allowed options: never, daily, weekly, monthly.'
            USING ERRCODE = '22023';
    END IF;

    v_caller_id := auth.uid();
    v_jwt_role := COALESCE(auth.role(), '');

    IF v_jwt_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        IF v_caller_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
        END IF;

        IF NOT (
            EXISTS (
                SELECT 1 FROM public.classrooms c
                WHERE c.id = p_classroom_id AND c.teacher_id = v_caller_id
            )
            OR EXISTS (
                SELECT 1 FROM public.classroom_members cm
                WHERE cm.classroom_id = p_classroom_id
                  AND cm.profile_id = v_caller_id
                  AND cm.role IN ('teacher', 'co-teacher')
                  AND cm.status = 'active'
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = v_caller_id AND p.role = 'admin'
            )
        ) THEN
            RAISE EXCEPTION 'Access denied: Only classroom teachers and admins can modify leaderboard settings.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT
        id,
        leaderboard_reset_at,
        leaderboard_timezone
    INTO v_classroom
    FROM public.classrooms
    WHERE id = p_classroom_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Classroom not found.' USING ERRCODE = 'P0002';
    END IF;

    v_tz := COALESCE(NULLIF(TRIM(p_timezone), ''), NULLIF(TRIM(v_classroom.leaderboard_timezone), ''), 'Asia/Colombo');
    BEGIN
        PERFORM clock_timestamp() AT TIME ZONE v_tz;
    EXCEPTION WHEN OTHERS THEN
        v_tz := 'Asia/Colombo';
    END;

    v_clock := clock_timestamp();
    v_next_reset_at := public.calculate_next_leaderboard_reset(p_frequency, v_clock, v_tz);

    UPDATE public.classrooms
    SET
        leaderboard_reset_frequency = p_frequency,
        leaderboard_next_reset_at = v_next_reset_at,
        leaderboard_timezone = v_tz,
        updated_at = v_clock
    WHERE id = p_classroom_id;

    RETURN jsonb_build_object(
        'success', true,
        'settings', jsonb_build_object(
            'frequency', p_frequency,
            'reset_at', v_classroom.leaderboard_reset_at,
            'next_reset_at', v_next_reset_at,
            'timezone', v_tz
        )
    );
END;
$$;

-- 5. Safe Scheduled Auto-Reset Sync RPC
--    Advances due scheduled resets atomically without deleting any historical student data.
CREATE OR REPLACE FUNCTION public.sync_classroom_leaderboard_schedule(
    p_classroom_id UUID
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
    v_clock TIMESTAMPTZ;
    v_tz TEXT;
    v_max_point_created TIMESTAMPTZ;
    v_effective_reset TIMESTAMPTZ;
    v_candidate_next TIMESTAMPTZ;
    v_guard INTEGER := 0;
BEGIN
    IF p_classroom_id IS NULL THEN
        RAISE EXCEPTION 'Classroom ID is required.' USING ERRCODE = '22023';
    END IF;

    v_caller_id := auth.uid();
    v_jwt_role := COALESCE(auth.role(), '');

    IF v_jwt_role <> 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        IF v_caller_id IS NULL OR NOT public.check_is_classroom_member(p_classroom_id, v_caller_id) THEN
            RAISE EXCEPTION 'Access denied: Classroom membership required.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT
        id,
        teacher_id,
        leaderboard_reset_frequency,
        leaderboard_reset_at,
        leaderboard_next_reset_at,
        leaderboard_timezone
    INTO v_classroom
    FROM public.classrooms
    WHERE id = p_classroom_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Classroom not found.' USING ERRCODE = 'P0002';
    END IF;

    v_clock := clock_timestamp();
    v_tz := COALESCE(NULLIF(TRIM(v_classroom.leaderboard_timezone), ''), 'Asia/Colombo');

    -- Only lock & update when a scheduled reset is actually due
    IF COALESCE(v_classroom.leaderboard_reset_frequency, 'never') <> 'never'
       AND v_classroom.leaderboard_next_reset_at IS NOT NULL
       AND v_classroom.leaderboard_next_reset_at <= v_clock
    THEN
        SELECT
            id,
            teacher_id,
            leaderboard_reset_frequency,
            leaderboard_reset_at,
            leaderboard_next_reset_at,
            leaderboard_timezone
        INTO v_classroom
        FROM public.classrooms
        WHERE id = p_classroom_id
        FOR UPDATE;

        IF COALESCE(v_classroom.leaderboard_reset_frequency, 'never') <> 'never'
           AND v_classroom.leaderboard_next_reset_at IS NOT NULL
           AND v_classroom.leaderboard_next_reset_at <= v_clock
        THEN
            SELECT MAX(created_at)
            INTO v_max_point_created
            FROM public.classroom_points
            WHERE classroom_id = p_classroom_id;

            v_effective_reset := GREATEST(
                v_classroom.leaderboard_next_reset_at,
                v_clock,
                COALESCE(v_max_point_created + interval '1 microsecond', v_clock)
            );
            v_candidate_next := public.calculate_next_leaderboard_reset(
                v_classroom.leaderboard_reset_frequency,
                v_effective_reset,
                v_tz
            );

            -- Advance across multiple elapsed cycles if classroom was idle across multiple periods
            WHILE v_candidate_next IS NOT NULL AND v_candidate_next <= v_clock AND v_guard < 400 LOOP
                v_effective_reset := v_candidate_next;
                v_candidate_next := public.calculate_next_leaderboard_reset(
                    v_classroom.leaderboard_reset_frequency,
                    v_effective_reset,
                    v_tz
                );
                v_guard := v_guard + 1;
            END LOOP;

            IF v_candidate_next IS NULL OR v_candidate_next <= v_clock THEN
                v_candidate_next := public.calculate_next_leaderboard_reset(
                    v_classroom.leaderboard_reset_frequency,
                    v_clock,
                    v_tz
                );
            END IF;

            UPDATE public.classrooms
            SET
                leaderboard_reset_at = v_effective_reset,
                leaderboard_next_reset_at = v_candidate_next,
                updated_at = v_clock
            WHERE id = p_classroom_id;

            RETURN jsonb_build_object(
                'success', true,
                'auto_reset_applied', true,
                'teacher_id', v_classroom.teacher_id,
                'frequency', v_classroom.leaderboard_reset_frequency,
                'reset_at', v_effective_reset,
                'next_reset_at', v_candidate_next,
                'timezone', v_tz
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'auto_reset_applied', false,
        'teacher_id', v_classroom.teacher_id,
        'frequency', COALESCE(v_classroom.leaderboard_reset_frequency, 'never'),
        'reset_at', v_classroom.leaderboard_reset_at,
        'next_reset_at', v_classroom.leaderboard_next_reset_at,
        'timezone', v_tz
    );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_next_leaderboard_reset(TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_classroom_leaderboard(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_classroom_leaderboard_settings(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_classroom_leaderboard_schedule(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.calculate_next_leaderboard_reset(TEXT, TIMESTAMPTZ, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_classroom_leaderboard(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_classroom_leaderboard_settings(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_classroom_leaderboard_schedule(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
