-- ============================================================================
-- EDTECHRA-BITZ: Live Quiz authoritative server state machine (v3)
-- ----------------------------------------------------------------------------
-- Fixes (see forensic audit):
--   * ONE server clock (now()) decides on-time vs late; clients only display.
--   * Atomic, idempotent submit: validate -> grade -> persist -> score -> check
--     all answered -> advance/finish, in a single transaction under a row lock.
--   * Compare-and-swap advance (expected index) so concurrent submitters or
--     syncs produce exactly ONE transition. No teacher browser required:
--     any participant's state sync lazily applies expiry (works on Vercel).
--   * Eligible participants = recently seen (heartbeat) or already answered,
--     so a left/stale student never blocks "all answered".
--   * Uses the 100-point rule: ROUND(100 / total_questions) per correct answer.
-- Idempotent: safe to run more than once.
-- ============================================================================

-- 0. Columns -----------------------------------------------------------------
ALTER TABLE public.live_quiz_sessions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.live_quiz_participants
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- One answer per session+question+student (already present in base schema;
-- re-assert defensively).
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_quiz_answers_session_q_student
    ON public.live_quiz_answers (session_id, question_index, student_id);

-- Answers may ONLY be written by the SECURITY DEFINER RPC. The old direct-INSERT policy
-- let the client write ungraded (is_correct=false) rows (root cause of "correct marked
-- incorrect") and would also let a client forge is_correct/points.
DROP POLICY IF EXISTS "Students can submit own answers" ON public.live_quiz_answers;

-- 1. Internal helpers (not exposed to clients) -------------------------------
CREATE OR REPLACE FUNCTION public.lq_question_duration_ms(p_session_id UUID, p_index INTEGER)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT GREATEST(1000, COALESCE(q.duration_sec, s.question_duration_sec, 20) * 1000)::BIGINT
    FROM public.live_quiz_sessions s
    LEFT JOIN public.live_quiz_questions q
        ON q.quiz_id = s.quiz_id AND q.question_index = p_index
    WHERE s.id = p_session_id;
$$;

CREATE OR REPLACE FUNCTION public.lq_eligible_counts(p_session_id UUID, p_index INTEGER)
RETURNS TABLE (eligible_count INTEGER, answered_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH ans AS (
        SELECT student_id FROM public.live_quiz_answers
        WHERE session_id = p_session_id AND question_index = p_index
    ),
    elig AS (
        SELECT p.student_id
        FROM public.live_quiz_participants p
        WHERE p.session_id = p_session_id
          AND (p.last_seen_at > now() - interval '30 seconds'
               OR p.student_id IN (SELECT student_id FROM ans))
    )
    SELECT
        (SELECT count(*) FROM elig)::INTEGER,
        (SELECT count(*) FROM elig WHERE student_id IN (SELECT student_id FROM ans))::INTEGER;
$$;

-- Core compare-and-swap transition. Caller MUST be a SECURITY DEFINER function.
-- Transition only if session is in_progress AND current index == expected AND
-- (force OR all eligible answered OR now >= deadline + reveal window).
CREATE OR REPLACE FUNCTION public.lq_try_advance(
    p_session_id UUID,
    p_expected_index INTEGER,
    p_force BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_reveal_ms CONSTANT BIGINT := 3500;
    v_start_ms BIGINT;
    v_dur_ms BIGINT;
    v_total INTEGER;
    v_elig INTEGER;
    v_ans INTEGER;
    v_all BOOLEAN;
    v_expired BOOLEAN;
    v_next INTEGER;
BEGIN
    SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('advanced', false, 'finished', false, 'reason', 'not_found');
    END IF;
    IF v_session.status <> 'in_progress' OR v_session.current_question_index <> p_expected_index THEN
        RETURN jsonb_build_object('advanced', false, 'finished', v_session.status = 'finished',
                                  'reason', 'stale', 'current_question_index', v_session.current_question_index);
    END IF;

    SELECT count(*) INTO v_total FROM public.live_quiz_questions WHERE quiz_id = v_session.quiz_id;
    v_dur_ms := public.lq_question_duration_ms(p_session_id, p_expected_index);
    v_start_ms := COALESCE(
        v_session.question_start_ms,
        (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_session.created_at)) * 1000)::BIGINT
    );
    SELECT e.eligible_count, e.answered_count INTO v_elig, v_ans
    FROM public.lq_eligible_counts(p_session_id, p_expected_index) e;

    v_all := v_elig > 0 AND v_ans >= v_elig;
    v_expired := v_now_ms >= (v_start_ms + v_dur_ms + v_reveal_ms);

    IF NOT (p_force OR v_all OR v_expired) THEN
        RETURN jsonb_build_object('advanced', false, 'finished', false, 'reason', 'not_ready');
    END IF;

    IF v_total > 0 AND (p_expected_index + 1) >= v_total THEN
        UPDATE public.live_quiz_sessions
        SET status = 'finished', ended_at = COALESCE(ended_at, now()), updated_at = now()
        WHERE id = p_session_id;
        RETURN jsonb_build_object('advanced', false, 'finished', true, 'reason',
                                  CASE WHEN p_force THEN 'forced' WHEN v_all THEN 'all_answered' ELSE 'expired' END);
    END IF;

    v_next := p_expected_index + 1;
    UPDATE public.live_quiz_sessions
    SET current_question_index = v_next,
        question_start_ms = v_now_ms,
        question_duration_sec = (public.lq_question_duration_ms(p_session_id, v_next) / 1000)::INTEGER,
        correct_answer_index = NULL,
        status = 'in_progress',
        updated_at = now()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('advanced', true, 'finished', false, 'next_question_index', v_next,
                              'reason', CASE WHEN p_force THEN 'forced' WHEN v_all THEN 'all_answered' ELSE 'expired' END);
END;
$$;

REVOKE ALL ON FUNCTION public.lq_question_duration_ms(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lq_eligible_counts(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lq_try_advance(UUID, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- 2. submit_live_quiz_answer (authoritative, atomic, idempotent) -------------
DROP FUNCTION IF EXISTS public.submit_live_quiz_answer(UUID, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.submit_live_quiz_answer(
    p_session_id UUID,
    p_question_index INTEGER,
    p_selected_option_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_question RECORD;
    v_existing RECORD;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_grace_ms CONSTANT BIGINT := 1500;
    v_start_ms BIGINT;
    v_dur_ms BIGINT;
    v_total INTEGER;
    v_option_count INTEGER;
    v_is_correct BOOLEAN;
    v_points INTEGER := 0;
    v_score INTEGER;
    v_adv JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.live_quiz_participants
                   WHERE session_id = p_session_id AND student_id = v_user_id) THEN
        RAISE EXCEPTION 'User is not a participant in this live quiz session.';
    END IF;

    -- Lock: serialises every submit / advance for this session.
    SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    UPDATE public.live_quiz_participants SET last_seen_at = now()
    WHERE session_id = p_session_id AND student_id = v_user_id;

    -- Idempotency: an existing answer is returned unchanged (never regraded/overwritten).
    SELECT * INTO v_existing FROM public.live_quiz_answers
    WHERE session_id = p_session_id AND question_index = p_question_index AND student_id = v_user_id;
    IF FOUND THEN
        SELECT score INTO v_score FROM public.live_quiz_participants
        WHERE session_id = p_session_id AND student_id = v_user_id;
        RETURN jsonb_build_object(
            'ok', true, 'duplicate', true, 'code', 'DUPLICATE',
            'is_correct', v_existing.is_correct, 'points_awarded', v_existing.points_awarded,
            'current_score', COALESCE(v_score, 0),
            'current_question_index', v_session.current_question_index,
            'server_now_ms', v_now_ms);
    END IF;

    IF v_session.status <> 'in_progress' THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_ACTIVE', 'status', v_session.status,
                                  'current_question_index', v_session.current_question_index,
                                  'server_now_ms', v_now_ms);
    END IF;

    IF v_session.current_question_index <> p_question_index THEN
        RETURN jsonb_build_object('ok', false, 'code', 'QUESTION_MISMATCH',
                                  'current_question_index', v_session.current_question_index,
                                  'server_now_ms', v_now_ms);
    END IF;

    v_dur_ms := public.lq_question_duration_ms(p_session_id, p_question_index);
    v_start_ms := COALESCE(
        v_session.question_start_ms,
        (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_session.created_at)) * 1000)::BIGINT
    );

    -- SERVER decides on-time vs late.
    IF v_now_ms > (v_start_ms + v_dur_ms + v_grace_ms) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'LATE',
                                  'current_question_index', v_session.current_question_index,
                                  'server_now_ms', v_now_ms, 'deadline_ms', v_start_ms + v_dur_ms);
    END IF;

    SELECT * INTO v_question FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id AND question_index = p_question_index;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question definition not found.';
    END IF;

    v_option_count := jsonb_array_length(v_question.options);
    IF p_selected_option_index < 0 OR p_selected_option_index >= v_option_count THEN
        RAISE EXCEPTION 'Invalid selected option index: %', p_selected_option_index;
    END IF;

    SELECT count(*) INTO v_total FROM public.live_quiz_questions WHERE quiz_id = v_session.quiz_id;
    IF v_total <= 0 THEN v_total := 10; END IF;

    v_is_correct := (v_question.correct_index = p_selected_option_index);
    IF v_is_correct THEN
        v_points := ROUND(100.0 / v_total);
    END IF;

    INSERT INTO public.live_quiz_answers (
        session_id, question_index, student_id, selected_option_index,
        is_correct, points_awarded, server_submit_ms, submitted_at
    ) VALUES (
        p_session_id, p_question_index, v_user_id, p_selected_option_index,
        v_is_correct, v_points, v_now_ms, now()
    );

    UPDATE public.live_quiz_participants
    SET score = score + v_points, last_earned_points = v_points
    WHERE session_id = p_session_id AND student_id = v_user_id
    RETURNING score INTO v_score;

    -- Atomic compare-and-swap transition (no-op unless everyone eligible answered).
    v_adv := public.lq_try_advance(p_session_id, p_question_index, FALSE);

    RETURN jsonb_build_object(
        'ok', true, 'duplicate', false, 'code', 'OK',
        'is_correct', v_is_correct,
        'points_awarded', v_points,
        'current_score', v_score,
        'all_answered', COALESCE((v_adv->>'reason') = 'all_answered', false),
        'advanced', COALESCE((v_adv->>'advanced')::BOOLEAN, false),
        'is_finished', COALESCE((v_adv->>'finished')::BOOLEAN, false),
        'next_question_index', COALESCE((v_adv->>'next_question_index')::INTEGER, p_question_index),
        'server_now_ms', v_now_ms
    );
END;
$$;

-- 3. get_live_quiz_state: heartbeat + lazy expiry + authoritative snapshot ----
CREATE OR REPLACE FUNCTION public.get_live_quiz_state(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_is_host BOOLEAN;
    v_is_participant BOOLEAN;
    v_now_ms BIGINT;
    v_start_ms BIGINT;
    v_dur_ms BIGINT;
    v_total INTEGER;
    v_elig INTEGER := 0;
    v_ans INTEGER := 0;
    v_phase TEXT;
    v_correct INTEGER;
    v_my RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    v_is_host := (v_session.teacher_id = v_user_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin');
    v_is_participant := EXISTS (SELECT 1 FROM public.live_quiz_participants
                                WHERE session_id = p_session_id AND student_id = v_user_id);
    IF NOT (v_is_host OR v_is_participant) THEN
        RAISE EXCEPTION 'Not allowed to view this live quiz session.';
    END IF;

    IF v_is_participant THEN
        UPDATE public.live_quiz_participants SET last_seen_at = now()
        WHERE session_id = p_session_id AND student_id = v_user_id;
    END IF;

    -- Lazy server-side expiry / all-answered catch-up (CAS, at most one step per call).
    IF v_session.status = 'in_progress' THEN
        PERFORM public.lq_try_advance(p_session_id, v_session.current_question_index, FALSE);
        SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id;
    END IF;

    v_now_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    SELECT count(*) INTO v_total FROM public.live_quiz_questions WHERE quiz_id = v_session.quiz_id;
    v_dur_ms := public.lq_question_duration_ms(p_session_id, v_session.current_question_index);
    v_start_ms := COALESCE(
        v_session.question_start_ms,
        (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_session.created_at)) * 1000)::BIGINT
    );

    IF v_session.status = 'in_progress' THEN
        v_phase := CASE WHEN v_now_ms >= v_start_ms + v_dur_ms THEN 'reveal' ELSE 'active' END;
        SELECT e.eligible_count, e.answered_count INTO v_elig, v_ans
        FROM public.lq_eligible_counts(p_session_id, v_session.current_question_index) e;
        IF v_phase = 'reveal' THEN
            SELECT correct_index INTO v_correct FROM public.live_quiz_questions
            WHERE quiz_id = v_session.quiz_id AND question_index = v_session.current_question_index;
        END IF;
    ELSE
        v_phase := v_session.status;
    END IF;

    SELECT selected_option_index, is_correct, points_awarded INTO v_my
    FROM public.live_quiz_answers
    WHERE session_id = p_session_id AND student_id = v_user_id
      AND question_index = v_session.current_question_index;

    RETURN jsonb_build_object(
        'server_now_ms', v_now_ms,
        'status', v_session.status,
        'phase', v_phase,
        'current_question_index', v_session.current_question_index,
        'question_start_ms', v_start_ms,
        'question_duration_sec', (v_dur_ms / 1000),
        'deadline_ms', v_start_ms + v_dur_ms,
        'total_questions', v_total,
        'eligible_count', v_elig,
        'answered_count', v_ans,
        'correct_index', v_correct,
        'my_answer', CASE WHEN v_my.selected_option_index IS NULL THEN NULL
                          ELSE jsonb_build_object('selected_option_index', v_my.selected_option_index,
                                                  'is_correct', v_my.is_correct,
                                                  'points_awarded', v_my.points_awarded) END
    );
END;
$$;

-- 4. advance_live_quiz_question: host skip (forced) or lazy CAS for others -----
CREATE OR REPLACE FUNCTION public.advance_live_quiz_question(
    p_session_id UUID,
    p_expected_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_live_quiz_state(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advance_live_quiz_question(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_quiz_state(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_live_quiz_question(UUID, INTEGER) TO authenticated;

-- 5. Realtime publication (idempotent) ----------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['live_quiz_sessions', 'live_quiz_answers', 'live_quiz_participants'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- Marker so clients can detect that v3 is installed.
CREATE OR REPLACE FUNCTION public.live_quiz_engine_version()
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$ SELECT 3; $$;
GRANT EXECUTE ON FUNCTION public.live_quiz_engine_version() TO authenticated, anon;
