-- =============================================================================
-- FIX: lq_try_advance must accept status 'reveal' in addition to 'in_progress'
-- =============================================================================
-- ROOT CAUSE: The host calls revealAnswer() which sets status = 'reveal',
-- then after 3.5s calls advanceQuestion() → lq_try_advance.
-- The original guard `v_session.status <> 'in_progress'` rejects the advance
-- because status is 'reveal', so the DB current_question_index never updates,
-- no postgres_changes event fires, and students remain stuck on Question 1.
-- =============================================================================

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

    -- FIX: Accept both 'in_progress' AND 'reveal' statuses.
    -- The reveal phase is a normal part of the quiz lifecycle where the host
    -- shows the correct answer before advancing to the next question.
    IF v_session.status NOT IN ('in_progress', 'reveal')
       OR v_session.current_question_index <> p_expected_index THEN
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

    -- When status is 'reveal', the host has already shown the answer.
    -- Treat reveal as equivalent to force for advancement purposes,
    -- since the reveal phase means the question is already complete.
    IF NOT (p_force OR v_all OR v_expired OR v_session.status = 'reveal') THEN
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
