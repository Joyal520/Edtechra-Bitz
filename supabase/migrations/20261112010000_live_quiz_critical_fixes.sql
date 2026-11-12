-- ============================================================================
-- MIGRATION: EDTECHRA LIVE QUIZ CRITICAL FIXES (ANSWER SUBMISSION & STATE SYNC)
-- 1. Fixes SQLSTATE 23502 (display_name NOT NULL violation in live_quiz_participants)
--    during submit_live_quiz_answer that blocked 100% of student submissions.
-- 2. Fixes SQLSTATE 42725 / PGRST203 function overloading ambiguity on lq_try_advance
--    by dropping both 2-arg and 3-arg signatures and defining one canonical function.
-- 3. Adds missing columns on live_quizzes (track_quiz, cover_image, cover_image_url)
--    fixing SQLSTATE 42703 in finish_and_award_live_quiz.
-- 4. Fixes SQLSTATE 55000 (unassigned RECORD v_my_answer) in get_live_quiz_state
--    and restores phase, question_duration_sec, and reveal-only correct_index.
-- 5. Ensures correct_index is NEVER exposed to students while a question is active.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SCHEMA SAFEGUARDS & MISSING COLUMNS
-- ----------------------------------------------------------------------------
ALTER TABLE public.live_quizzes
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS points_per_question INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS track_quiz BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cover_image TEXT,
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

ALTER TABLE public.live_quiz_participants
    ALTER COLUMN display_name SET DEFAULT 'Student';

ALTER TABLE public.live_quiz_questions
    ADD COLUMN IF NOT EXISTS hint TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS learning_objective TEXT DEFAULT '';

ALTER TABLE public.live_quiz_answers
    ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.live_quiz_questions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS response_time_ms BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS base_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS speed_bonus INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.live_quiz_results
    ADD COLUMN IF NOT EXISTS avg_response_time_ms BIGINT NOT NULL DEFAULT 0;

-- Ensure unique constraint on (session_id, question_index, student_id) exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.live_quiz_answers'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) LIKE '%session_id, question_index, student_id%'
    ) THEN
        ALTER TABLE public.live_quiz_answers
            ADD CONSTRAINT live_quiz_answers_session_question_student_key
            UNIQUE (session_id, question_index, student_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. COMPLETE, IDEMPOTENT FINAL LEADERBOARD & RESULTS GENERATOR
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finish_and_award_live_quiz(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_total_questions INTEGER := 1;
    v_track_quiz BOOLEAN := TRUE;
    v_participant RECORD;
    v_rank INTEGER := 0;
    v_accuracy INTEGER := 0;
    v_result_id UUID;
    v_results JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_session
    FROM public.live_quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'Live quiz session not found';
    END IF;

    -- Mark session finished if not already finished
    IF v_session.status <> 'finished' THEN
        UPDATE public.live_quiz_sessions
        SET status = 'finished',
            ended_at = COALESCE(ended_at, now()),
            question_start_ms = NULL,
            updated_at = now()
        WHERE id = p_session_id;
    END IF;

    -- Fetch total questions and track_quiz flag
    SELECT GREATEST(1, COUNT(*)::INTEGER) INTO v_total_questions
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    SELECT COALESCE(track_quiz, TRUE) INTO v_track_quiz
    FROM public.live_quizzes
    WHERE id = v_session.quiz_id;

    -- Synchronize each participant's score in live_quiz_participants
    -- with their authoritative sum of points_awarded in live_quiz_answers
    UPDATE public.live_quiz_participants p
    SET score = COALESCE((
            SELECT SUM(a.points_awarded)::INTEGER
            FROM public.live_quiz_answers a
            WHERE a.session_id = p_session_id
              AND a.student_id = p.student_id
        ), COALESCE(p.score, 0))
    WHERE p.session_id = p_session_id
      AND (v_session.teacher_id IS NULL OR p.student_id <> v_session.teacher_id);

    -- Also ensure any student who submitted answers in live_quiz_answers
    -- has a participant row (defensive backstop)
    INSERT INTO public.live_quiz_participants (session_id, student_id, display_name, avatar_url, score, last_earned_points, last_seen_at)
    SELECT DISTINCT
        a.session_id,
        a.student_id,
        COALESCE(NULLIF(TRIM(pr.full_name), ''), NULLIF(SPLIT_PART(pr.email, '@', 1), ''), 'Student'),
        pr.avatar_url,
        0,
        0,
        now()
    FROM public.live_quiz_answers a
    LEFT JOIN public.profiles pr ON pr.id = a.student_id
    WHERE a.session_id = p_session_id
      AND (v_session.teacher_id IS NULL OR a.student_id <> v_session.teacher_id)
    ON CONFLICT (session_id, student_id) DO NOTHING;

    -- Iterate over ALL student participants in deterministic ranking order:
    -- 1. total_score DESC
    -- 2. correct_count DESC
    -- 3. avg_response_time_ms ASC (faster average wins ties; 0/no-answers sorted last)
    -- 4. joined_at ASC
    -- 5. student_id ASC
    FOR v_participant IN
        SELECT
            p.student_id,
            p.display_name,
            p.avatar_url,
            p.joined_at,
            GREATEST(
                COALESCE(p.score, 0),
                COALESCE(SUM(a.points_awarded), 0)::INTEGER
            ) AS total_score,
            COUNT(a.id) FILTER (WHERE a.is_correct = TRUE)::INTEGER AS correct_count,
            COALESCE(
                ROUND(AVG(NULLIF(a.response_time_ms, 0)))::BIGINT,
                0
            ) AS avg_response_time_ms
        FROM public.live_quiz_participants p
        LEFT JOIN public.live_quiz_answers a
            ON a.session_id = p.session_id
           AND a.student_id = p.student_id
        WHERE p.session_id = p_session_id
          AND (v_session.teacher_id IS NULL OR p.student_id <> v_session.teacher_id)
        GROUP BY p.student_id, p.display_name, p.avatar_url, p.joined_at, p.score
        ORDER BY
            GREATEST(COALESCE(p.score, 0), COALESCE(SUM(a.points_awarded), 0)::INTEGER) DESC,
            COUNT(a.id) FILTER (WHERE a.is_correct = TRUE) DESC,
            COALESCE(ROUND(AVG(NULLIF(a.response_time_ms, 0)))::BIGINT, 999999999) ASC,
            p.joined_at ASC,
            p.student_id ASC
    LOOP
        v_rank := v_rank + 1;
        v_accuracy := ROUND((COALESCE(v_participant.correct_count, 0)::NUMERIC / v_total_questions::NUMERIC) * 100)::INTEGER;

        INSERT INTO public.live_quiz_results (
            session_id,
            classroom_id,
            teacher_id,
            student_id,
            quiz_id,
            score,
            points_awarded,
            correct_count,
            wrong_count,
            total_questions,
            accuracy_percentage,
            avg_response_time_ms,
            final_rank,
            created_at
        ) VALUES (
            p_session_id,
            v_session.classroom_id,
            v_session.teacher_id,
            v_participant.student_id,
            v_session.quiz_id,
            v_participant.total_score,
            v_participant.total_score,
            COALESCE(v_participant.correct_count, 0),
            GREATEST(0, v_total_questions - COALESCE(v_participant.correct_count, 0)),
            v_total_questions,
            v_accuracy,
            COALESCE(v_participant.avg_response_time_ms, 0),
            v_rank,
            now()
        )
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET
            score = EXCLUDED.score,
            points_awarded = EXCLUDED.points_awarded,
            correct_count = EXCLUDED.correct_count,
            wrong_count = EXCLUDED.wrong_count,
            total_questions = EXCLUDED.total_questions,
            accuracy_percentage = EXCLUDED.accuracy_percentage,
            avg_response_time_ms = EXCLUDED.avg_response_time_ms,
            final_rank = EXCLUDED.final_rank
        RETURNING id INTO v_result_id;

        -- Update participant final_rank
        UPDATE public.live_quiz_participants
        SET final_rank = v_rank,
            score = v_participant.total_score
        WHERE session_id = p_session_id
          AND student_id = v_participant.student_id;

        -- Award classroom points idempotently when tracking is enabled
        IF v_track_quiz = TRUE AND v_participant.total_score > 0 AND v_session.classroom_id IS NOT NULL THEN
            INSERT INTO public.classroom_points (
                classroom_id,
                student_id,
                points,
                reason,
                source_type,
                source_id,
                awarded_by,
                created_at
            ) VALUES (
                v_session.classroom_id,
                v_participant.student_id,
                v_participant.total_score,
                'Live Quiz Game (Rank #' || v_rank || ')',
                'live_quiz',
                v_result_id,
                v_session.teacher_id,
                now()
            )
            ON CONFLICT (classroom_id, student_id, source_type, source_id)
            WHERE source_type = 'live_quiz' AND source_id IS NOT NULL
            DO NOTHING;
        END IF;
    END LOOP;

    -- Return complete ordered leaderboard with joined profile details
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'session_id', r.session_id,
                'quiz_id', r.quiz_id,
                'classroom_id', r.classroom_id,
                'teacher_id', r.teacher_id,
                'student_id', r.student_id,
                'score', r.score,
                'points_awarded', r.points_awarded,
                'correct_count', r.correct_count,
                'wrong_count', r.wrong_count,
                'total_questions', r.total_questions,
                'accuracy_percentage', r.accuracy_percentage,
                'avg_response_time_ms', COALESCE(r.avg_response_time_ms, 0),
                'final_rank', r.final_rank,
                'created_at', r.created_at,
                'student', jsonb_build_object(
                    'id', r.student_id,
                    'full_name', COALESCE(NULLIF(TRIM(pr.full_name), ''), NULLIF(TRIM(p.display_name), ''), pr.email, 'Student'),
                    'avatar_url', COALESCE(pr.avatar_url, p.avatar_url),
                    'email', pr.email
                )
            )
            ORDER BY r.final_rank ASC, r.score DESC, r.student_id ASC
        ),
        '[]'::jsonb
    )
    INTO v_results
    FROM public.live_quiz_results r
    LEFT JOIN public.profiles pr ON pr.id = r.student_id
    LEFT JOIN public.live_quiz_participants p
        ON p.session_id = r.session_id AND p.student_id = r.student_id
    WHERE r.session_id = p_session_id
      AND (v_session.teacher_id IS NULL OR r.student_id <> v_session.teacher_id);

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finish_and_award_live_quiz(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. UNIFIED ATOMIC COMPARE-AND-SWAP QUESTION ADVANCER (NO OVERLOAD AMBIGUITY)
-- Drop both 2-argument and 3-argument overloads and create one canonical
-- function with p_force DEFAULT FALSE.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.lq_try_advance(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.lq_try_advance(UUID, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.lq_try_advance(
    p_session_id UUID,
    p_expected_index INTEGER,
    p_force BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_reveal_ms CONSTANT BIGINT := 3500;
    v_start_ms BIGINT;
    v_dur_ms BIGINT;
    v_total INTEGER := 0;
    v_elig INTEGER := 0;
    v_ans INTEGER := 0;
    v_all BOOLEAN := FALSE;
    v_expired BOOLEAN := FALSE;
    v_next INTEGER;
    v_reason TEXT;
BEGIN
    SELECT * INTO v_session
    FROM public.live_quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND OR v_session.id IS NULL THEN
        RETURN jsonb_build_object('advanced', false, 'finished', false, 'reason', 'not_found');
    END IF;

    IF v_session.status NOT IN ('in_progress', 'reveal')
       OR v_session.current_question_index <> p_expected_index THEN
        RETURN jsonb_build_object(
            'advanced', false,
            'finished', (v_session.status = 'finished'),
            'status', v_session.status,
            'reason', 'already_advanced',
            'current_question_index', v_session.current_question_index
        );
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    IF COALESCE(v_total, 0) <= 0 THEN
        RETURN jsonb_build_object('advanced', false, 'finished', false, 'reason', 'no_questions');
    END IF;

    v_dur_ms := public.lq_question_duration_ms(p_session_id, p_expected_index);
    v_start_ms := COALESCE(
        v_session.question_start_ms,
        (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_session.created_at)) * 1000)::BIGINT
    );

    SELECT e.eligible_count, e.answered_count INTO v_elig, v_ans
    FROM public.lq_eligible_counts(p_session_id, p_expected_index) e;

    v_all := (v_elig > 0 AND v_ans >= v_elig);
    v_expired := (v_now_ms >= (v_start_ms + v_dur_ms + v_reveal_ms));

    IF NOT (COALESCE(p_force, FALSE) OR v_all OR v_expired OR v_session.status = 'reveal') THEN
        RETURN jsonb_build_object(
            'advanced', false,
            'finished', false,
            'status', v_session.status,
            'current_question_index', v_session.current_question_index,
            'reason', 'not_ready'
        );
    END IF;

    v_reason := CASE
        WHEN COALESCE(p_force, FALSE) THEN 'forced'
        WHEN v_session.status = 'reveal' THEN 'reveal_complete'
        WHEN v_all THEN 'all_answered'
        ELSE 'expired'
    END;

    v_next := p_expected_index + 1;

    IF v_next >= v_total THEN
        UPDATE public.live_quiz_sessions
        SET status = 'finished',
            ended_at = COALESCE(ended_at, now()),
            question_start_ms = NULL,
            updated_at = now()
        WHERE id = p_session_id;

        -- Populate final leaderboard results atomically
        PERFORM public.finish_and_award_live_quiz(p_session_id);

        RETURN jsonb_build_object(
            'advanced', true,
            'finished', true,
            'status', 'finished',
            'current_question_index', p_expected_index,
            'next_question_index', p_expected_index,
            'question_start_ms', NULL,
            'reason', v_reason
        );
    END IF;

    UPDATE public.live_quiz_sessions
    SET current_question_index = v_next,
        question_start_ms = v_now_ms,
        question_duration_sec = GREATEST(5, (public.lq_question_duration_ms(p_session_id, v_next) / 1000)::INTEGER),
        correct_answer_index = NULL,
        status = 'in_progress',
        updated_at = now()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'advanced', true,
        'finished', false,
        'status', 'in_progress',
        'current_question_index', v_next,
        'next_question_index', v_next,
        'question_start_ms', v_now_ms,
        'reason', v_reason
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lq_try_advance(UUID, INTEGER, BOOLEAN) TO authenticated;

-- Ensure advance_live_quiz_question delegates cleanly to the unified lq_try_advance
CREATE OR REPLACE FUNCTION public.advance_live_quiz_question(
    p_session_id UUID,
    p_expected_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_teacher UUID;
    v_is_host BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;
    SELECT teacher_id INTO v_teacher FROM public.live_quiz_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;
    v_is_host := (v_teacher = v_user_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin');
    IF NOT (v_is_host OR EXISTS (SELECT 1 FROM public.live_quiz_participants
                                 WHERE session_id = p_session_id AND student_id = v_user_id)) THEN
        RAISE EXCEPTION 'Not allowed.';
    END IF;
    RETURN public.lq_try_advance(p_session_id, p_expected_index, v_is_host);
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_live_quiz_question(UUID, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. AUTHORITATIVE STUDENT ANSWER SUBMISSION RPC (FIXED & HARDENED)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_live_quiz_answer(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.submit_live_quiz_answer(UUID, INTEGER, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.submit_live_quiz_answer(
    p_session_id UUID,
    p_question_index INTEGER,
    p_selected_option_index INTEGER,
    p_allow_change BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_question RECORD;
    v_existing RECORD;
    v_display_name TEXT := 'Student';
    v_avatar_url TEXT := NULL;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM v_now) * 1000)::BIGINT;
    v_dur_ms BIGINT;
    v_start_ms BIGINT;
    v_grace_ms BIGINT := 2000; -- 2.0s network transport grace
    v_response_time_ms BIGINT := 0;
    v_remaining_ms BIGINT := 0;
    v_total_questions INTEGER := 10;
    v_option_count INTEGER := 4;
    v_base_points INTEGER := 0;
    v_max_bonus INTEGER := 0;
    v_speed_bonus INTEGER := 0;
    v_is_correct BOOLEAN := FALSE;
    v_points INTEGER := 0;
    v_score_delta INTEGER := 0;
    v_current_score INTEGER := 0;
    v_answer_id UUID;
    v_eligible INTEGER := 0;
    v_answered INTEGER := 0;
    v_all_answered BOOLEAN := FALSE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'SESSION_EXPIRED',
            'message', 'Authentication session expired. Please sign in again.'
        );
    END IF;

    -- Serialize concurrent submissions on the same session
    SELECT * INTO v_session
    FROM public.live_quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND OR v_session.id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'SESSION_NOT_FOUND',
            'message', 'Live quiz session was not found.'
        );
    END IF;

    -- Resolve student display_name and avatar_url from profiles for safe participant upsert
    SELECT
        COALESCE(NULLIF(TRIM(pr.full_name), ''), NULLIF(SPLIT_PART(pr.email, '@', 1), ''), 'Student'),
        pr.avatar_url
    INTO v_display_name, v_avatar_url
    FROM public.profiles pr
    WHERE pr.id = v_user_id;

    v_display_name := COALESCE(NULLIF(TRIM(v_display_name), ''), 'Student');

    -- Ensure student participant record exists with non-null display_name and update last_seen_at
    INSERT INTO public.live_quiz_participants (
        session_id,
        student_id,
        display_name,
        avatar_url,
        score,
        last_earned_points,
        last_seen_at
    )
    VALUES (
        p_session_id,
        v_user_id,
        v_display_name,
        v_avatar_url,
        0,
        0,
        v_now
    )
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET
        last_seen_at = v_now,
        display_name = COALESCE(NULLIF(TRIM(public.live_quiz_participants.display_name), ''), EXCLUDED.display_name);

    -- Check for existing answer by this student for this question
    SELECT * INTO v_existing
    FROM public.live_quiz_answers
    WHERE session_id = p_session_id
      AND question_index = p_question_index
      AND student_id = v_user_id;

    -- If already answered and not explicitly changing answer (or same option),
    -- return idempotent duplicate response without awarding points twice or creating a new record
    IF v_existing.id IS NOT NULL AND (NOT COALESCE(p_allow_change, FALSE) OR v_existing.selected_option_index = p_selected_option_index) THEN
        SELECT eligible_count, answered_count INTO v_eligible, v_answered
        FROM public.lq_eligible_counts(p_session_id, p_question_index);

        SELECT COALESCE(score, 0) INTO v_current_score
        FROM public.live_quiz_participants
        WHERE session_id = p_session_id AND student_id = v_user_id;

        RETURN jsonb_build_object(
            'ok', true,
            'code', 'DUPLICATE',
            'answer_id', v_existing.id,
            'selected_option_index', v_existing.selected_option_index,
            'is_correct', v_existing.is_correct,
            'points_awarded', v_existing.points_awarded,
            'base_points', COALESCE(v_existing.base_points, CASE WHEN v_existing.is_correct THEN v_existing.points_awarded ELSE 0 END),
            'speed_bonus', COALESCE(v_existing.speed_bonus, 0),
            'response_time_ms', COALESCE(v_existing.response_time_ms, 0),
            'current_score', v_current_score,
            'correct_index', NULL,
            'duplicate', true,
            'changed', false,
            'eligible_count', v_eligible,
            'answered_count', v_answered,
            'all_answered', (v_eligible > 0 AND v_answered >= v_eligible),
            'current_question_index', v_session.current_question_index,
            'server_now_ms', v_now_ms,
            'advance', '{"advanced": false}'::jsonb
        );
    END IF;

    -- Reject if session is not in_progress or question index does not match active question
    IF v_session.status <> 'in_progress' THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'SESSION_NOT_ACTIVE',
            'status', v_session.status,
            'current_question_index', v_session.current_question_index,
            'message', CASE
                WHEN v_session.status = 'reveal' THEN 'This question is already closed.'
                WHEN v_session.status = 'finished' THEN 'This quiz has already ended.'
                ELSE 'This question is not currently active.'
            END,
            'is_correct', false,
            'points_awarded', 0,
            'base_points', 0,
            'speed_bonus', 0,
            'server_now_ms', v_now_ms
        );
    END IF;

    IF v_session.current_question_index <> p_question_index THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'QUESTION_MISMATCH',
            'current_question_index', v_session.current_question_index,
            'message', 'This question has already closed and moved to the next question.',
            'is_correct', false,
            'points_awarded', 0,
            'base_points', 0,
            'speed_bonus', 0,
            'server_now_ms', v_now_ms
        );
    END IF;

    -- Compute authoritative server deadline and response time
    v_dur_ms := GREATEST(1000, public.lq_question_duration_ms(p_session_id, p_question_index));
    v_start_ms := COALESCE(
        v_session.question_start_ms,
        (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_now)) * 1000)::BIGINT
    );

    -- Enforce server deadline: reject expired submissions
    IF v_now_ms > (v_start_ms + v_dur_ms + v_grace_ms) THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'LATE',
            'message', 'Time is up! This question is already closed.',
            'is_correct', false,
            'points_awarded', 0,
            'base_points', 0,
            'speed_bonus', 0,
            'response_time_ms', GREATEST(0, v_now_ms - v_start_ms),
            'current_question_index', v_session.current_question_index,
            'server_now_ms', v_now_ms,
            'deadline_ms', v_start_ms + v_dur_ms
        );
    END IF;

    -- Fetch authoritative question record
    SELECT * INTO v_question
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id
      AND question_index = p_question_index;

    IF NOT FOUND OR v_question.id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'QUESTION_NOT_FOUND',
            'message', 'Question definition was not found for this quiz.'
        );
    END IF;

    v_option_count := GREATEST(2, COALESCE(jsonb_array_length(v_question.options), 4));
    IF p_selected_option_index IS NULL OR p_selected_option_index < 0 OR p_selected_option_index >= v_option_count THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'INVALID_OPTION',
            'message', 'Selected answer option is invalid.'
        );
    END IF;

    -- Fetch total question count for this quiz so a full quiz plays for 100 base points
    SELECT GREATEST(1, COUNT(*)::INTEGER) INTO v_total_questions
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    -- Prevent negative response times
    v_response_time_ms := GREATEST(0, v_now_ms - v_start_ms);
    v_remaining_ms := GREATEST(0, v_dur_ms - v_response_time_ms);

    -- Grade answer and calculate 100-Point Quiz Base + Speed Bonus
    v_is_correct := (p_selected_option_index = v_question.correct_index);

    IF v_is_correct THEN
        v_base_points := GREATEST(1, ROUND(100.0 / v_total_questions))::INTEGER;
        v_max_bonus := GREATEST(1, ROUND(v_base_points::NUMERIC / 2.0))::INTEGER;
        v_speed_bonus := ROUND((v_max_bonus::NUMERIC * v_remaining_ms::NUMERIC) / v_dur_ms::NUMERIC)::INTEGER;
        v_speed_bonus := GREATEST(0, LEAST(v_max_bonus, v_speed_bonus));
        v_points := v_base_points + v_speed_bonus;
    ELSE
        v_base_points := 0;
        v_speed_bonus := 0;
        v_points := 0;
    END IF;

    -- If student is changing an existing answer on the active question, update in-place
    -- so no duplicate answer row is created and answered_count does not increase
    IF v_existing.id IS NOT NULL AND COALESCE(p_allow_change, FALSE) THEN
        v_score_delta := v_points - COALESCE(v_existing.points_awarded, 0);

        UPDATE public.live_quiz_answers
        SET selected_option_index = p_selected_option_index,
            is_correct = v_is_correct,
            points_awarded = v_points,
            base_points = v_base_points,
            speed_bonus = v_speed_bonus,
            response_time_ms = v_response_time_ms,
            submitted_at = v_now,
            server_submit_ms = v_now_ms
        WHERE id = v_existing.id
        RETURNING id INTO v_answer_id;

        UPDATE public.live_quiz_participants
        SET score = GREATEST(0, score + v_score_delta),
            last_earned_points = v_points,
            last_seen_at = v_now
        WHERE session_id = p_session_id
          AND student_id = v_user_id
        RETURNING score INTO v_current_score;

        SELECT eligible_count, answered_count INTO v_eligible, v_answered
        FROM public.lq_eligible_counts(p_session_id, p_question_index);

        v_all_answered := (v_eligible > 0 AND v_answered >= v_eligible);

        RETURN jsonb_build_object(
            'ok', true,
            'code', 'CHANGED',
            'answer_id', v_answer_id,
            'selected_option_index', p_selected_option_index,
            'is_correct', v_is_correct,
            'points_awarded', v_points,
            'base_points', v_base_points,
            'speed_bonus', v_speed_bonus,
            'response_time_ms', v_response_time_ms,
            'current_score', COALESCE(v_current_score, v_points),
            'correct_index', NULL,
            'duplicate', false,
            'changed', true,
            'eligible_count', v_eligible,
            'answered_count', v_answered,
            'all_answered', v_all_answered,
            'current_question_index', v_session.current_question_index,
            'server_now_ms', v_now_ms,
            'advance', '{"advanced": false}'::jsonb
        );
    END IF;

    -- Insert new answer atomically
    INSERT INTO public.live_quiz_answers (
        session_id,
        question_id,
        question_index,
        student_id,
        selected_option_index,
        is_correct,
        points_awarded,
        base_points,
        speed_bonus,
        response_time_ms,
        submitted_at,
        server_submit_ms
    ) VALUES (
        p_session_id,
        v_question.id,
        p_question_index,
        v_user_id,
        p_selected_option_index,
        v_is_correct,
        v_points,
        v_base_points,
        v_speed_bonus,
        v_response_time_ms,
        v_now,
        v_now_ms
    )
    ON CONFLICT (session_id, question_index, student_id) DO NOTHING
    RETURNING id INTO v_answer_id;

    -- Race condition guard if concurrent request inserted first
    IF v_answer_id IS NULL THEN
        SELECT * INTO v_existing
        FROM public.live_quiz_answers
        WHERE session_id = p_session_id
          AND question_index = p_question_index
          AND student_id = v_user_id;

        SELECT eligible_count, answered_count INTO v_eligible, v_answered
        FROM public.lq_eligible_counts(p_session_id, p_question_index);

        SELECT COALESCE(score, 0) INTO v_current_score
        FROM public.live_quiz_participants
        WHERE session_id = p_session_id AND student_id = v_user_id;

        RETURN jsonb_build_object(
            'ok', true,
            'code', 'DUPLICATE',
            'answer_id', v_existing.id,
            'selected_option_index', v_existing.selected_option_index,
            'is_correct', v_existing.is_correct,
            'points_awarded', v_existing.points_awarded,
            'base_points', COALESCE(v_existing.base_points, 0),
            'speed_bonus', COALESCE(v_existing.speed_bonus, 0),
            'response_time_ms', COALESCE(v_existing.response_time_ms, 0),
            'current_score', v_current_score,
            'correct_index', NULL,
            'duplicate', true,
            'changed', false,
            'eligible_count', v_eligible,
            'answered_count', v_answered,
            'all_answered', (v_eligible > 0 AND v_answered >= v_eligible),
            'current_question_index', v_session.current_question_index,
            'server_now_ms', v_now_ms,
            'advance', '{"advanced": false}'::jsonb
        );
    END IF;

    -- Award points to participant
    UPDATE public.live_quiz_participants
    SET score = score + v_points,
        last_earned_points = v_points,
        last_seen_at = v_now
    WHERE session_id = p_session_id
      AND student_id = v_user_id
    RETURNING score INTO v_current_score;

    -- Check unique student participation counts for this question
    SELECT eligible_count, answered_count INTO v_eligible, v_answered
    FROM public.lq_eligible_counts(p_session_id, p_question_index);

    v_all_answered := (v_eligible > 0 AND v_answered >= v_eligible);

    -- Note: We do NOT call lq_try_advance synchronously here because:
    -- 1. The student must receive confirmation for the current question first.
    -- 2. The teacher host must see Answered: N/N update in real time and trigger
    --    the reveal phase before advancing to the next question.
    RETURN jsonb_build_object(
        'ok', true,
        'code', 'ACCEPTED',
        'answer_id', v_answer_id,
        'selected_option_index', p_selected_option_index,
        'is_correct', v_is_correct,
        'points_awarded', v_points,
        'base_points', v_base_points,
        'speed_bonus', v_speed_bonus,
        'response_time_ms', v_response_time_ms,
        'current_score', COALESCE(v_current_score, v_points),
        'correct_index', NULL,
        'duplicate', false,
        'changed', false,
        'eligible_count', v_eligible,
        'answered_count', v_answered,
        'all_answered', v_all_answered,
        'current_question_index', v_session.current_question_index,
        'server_now_ms', v_now_ms,
        'advance', '{"advanced": false}'::jsonb
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. AUTHORITATIVE SESSION STATE POLL / SYNC RPC (FIXED & HARDENED)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_live_quiz_state(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_dur_ms BIGINT;
    v_start_ms BIGINT;
    v_deadline_ms BIGINT;
    v_total INTEGER := 0;
    v_eligible INTEGER := 0;
    v_answered INTEGER := 0;
    v_phase TEXT := 'active';
    v_correct_index INTEGER := NULL;
    v_my_selected_option INTEGER := NULL;
    v_my_is_correct BOOLEAN := NULL;
    v_my_points INTEGER := NULL;
    v_my_base_points INTEGER := NULL;
    v_my_speed_bonus INTEGER := NULL;
    v_my_response_time_ms BIGINT := NULL;
    v_distribution JSONB := '{"0": 0, "1": 0, "2": 0, "3": 0}'::jsonb;
BEGIN
    SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id;
    IF NOT FOUND OR v_session.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;

    IF v_user_id IS NOT NULL AND (v_session.teacher_id IS NULL OR v_user_id <> v_session.teacher_id) THEN
        UPDATE public.live_quiz_participants
        SET last_seen_at = clock_timestamp()
        WHERE session_id = p_session_id AND student_id = v_user_id;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    v_dur_ms := public.lq_question_duration_ms(p_session_id, v_session.current_question_index);
    v_start_ms := COALESCE(
        v_session.question_start_ms,
        (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_session.created_at)) * 1000)::BIGINT
    );
    v_deadline_ms := v_start_ms + v_dur_ms;

    -- Opportunistic server-side advance ONLY after question deadline + 3.5s reveal window
    IF v_session.status = 'in_progress' AND v_session.question_start_ms IS NOT NULL AND v_now_ms >= (v_deadline_ms + 3500) THEN
        PERFORM public.lq_try_advance(p_session_id, v_session.current_question_index, FALSE);
        SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id;
        v_dur_ms := public.lq_question_duration_ms(p_session_id, v_session.current_question_index);
        v_start_ms := COALESCE(
            v_session.question_start_ms,
            (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_session.created_at)) * 1000)::BIGINT
        );
        v_deadline_ms := v_start_ms + v_dur_ms;
    END IF;

    SELECT eligible_count, answered_count INTO v_eligible, v_answered
    FROM public.lq_eligible_counts(p_session_id, v_session.current_question_index);

    -- Determine phase and only expose correct_index when the question is closed (reveal or finished)
    IF v_session.status = 'in_progress' THEN
        IF v_now_ms >= v_deadline_ms THEN
            v_phase := 'reveal';
        ELSE
            v_phase := 'active';
        END IF;
    ELSE
        v_phase := v_session.status;
    END IF;

    IF v_phase IN ('reveal', 'finished') OR v_session.status IN ('reveal', 'finished') THEN
        SELECT q.correct_index INTO v_correct_index
        FROM public.live_quiz_questions q
        WHERE q.quiz_id = v_session.quiz_id
          AND q.question_index = v_session.current_question_index;
    END IF;

    -- Compute per-option unique student distribution for current_question_index
    SELECT jsonb_build_object(
        '0', COUNT(DISTINCT student_id) FILTER (WHERE selected_option_index = 0),
        '1', COUNT(DISTINCT student_id) FILTER (WHERE selected_option_index = 1),
        '2', COUNT(DISTINCT student_id) FILTER (WHERE selected_option_index = 2),
        '3', COUNT(DISTINCT student_id) FILTER (WHERE selected_option_index = 3)
    )
    INTO v_distribution
    FROM public.live_quiz_answers
    WHERE session_id = p_session_id
      AND question_index = v_session.current_question_index
      AND (v_session.teacher_id IS NULL OR student_id <> v_session.teacher_id);

    IF v_user_id IS NOT NULL THEN
        SELECT
            a.selected_option_index,
            a.is_correct,
            a.points_awarded,
            a.base_points,
            a.speed_bonus,
            a.response_time_ms
        INTO
            v_my_selected_option,
            v_my_is_correct,
            v_my_points,
            v_my_base_points,
            v_my_speed_bonus,
            v_my_response_time_ms
        FROM public.live_quiz_answers a
        WHERE a.session_id = p_session_id
          AND a.question_index = v_session.current_question_index
          AND a.student_id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'session_id', v_session.id,
        'quiz_id', v_session.quiz_id,
        'status', v_session.status,
        'phase', v_phase,
        'current_question_index', v_session.current_question_index,
        'total_questions', COALESCE(v_total, 0),
        'question_start_ms', v_start_ms,
        'question_duration_ms', v_dur_ms,
        'question_duration_sec', GREATEST(5, (v_dur_ms / 1000)::INTEGER),
        'deadline_ms', v_deadline_ms,
        'server_now_ms', v_now_ms,
        'remaining_ms', GREATEST(0, v_deadline_ms - v_now_ms),
        'total_participants', v_eligible,
        'eligible_count', v_eligible,
        'answered_count', v_answered,
        'correct_index', v_correct_index,
        'answer_distribution', COALESCE(v_distribution, '{"0": 0, "1": 0, "2": 0, "3": 0}'::jsonb),
        'my_answer', CASE WHEN v_my_selected_option IS NULL THEN NULL ELSE jsonb_build_object(
            'selected_option_index', v_my_selected_option,
            'is_correct', v_my_is_correct,
            'points_awarded', v_my_points,
            'base_points', COALESCE(v_my_base_points, 0),
            'speed_bonus', COALESCE(v_my_speed_bonus, 0),
            'response_time_ms', COALESCE(v_my_response_time_ms, 0)
        ) END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_quiz_state(UUID) TO authenticated;

COMMIT;
