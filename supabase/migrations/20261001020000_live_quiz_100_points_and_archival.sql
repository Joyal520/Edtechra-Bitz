-- ============================================================================
-- EDTECHRA-BITZ: Live Quiz 100-Point System, Archival Soft-Delete & Ownership
-- ============================================================================

-- 1. Safely add is_archived column to public.live_quizzes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'live_quizzes' AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE public.live_quizzes ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_live_quizzes_is_archived ON public.live_quizzes(is_archived);

-- 2. Update partial unique index on owner + title to exclude archived quizzes
DROP INDEX IF EXISTS public.idx_live_quizzes_owner_norm_title;

CREATE UNIQUE INDEX idx_live_quizzes_owner_norm_title 
ON public.live_quizzes (created_by, lower(trim(regexp_replace(title, '\s+', ' ', 'g')))) 
WHERE created_by IS NOT NULL AND is_archived = false;

-- 3. Update submit_live_quiz_answer RPC for authoritative 100-point scoring
-- Points per question = ROUND(100.0 / total_questions)
-- (5 Qs = 20 pts, 10 Qs = 10 pts, 20 Qs = 5 pts, 25 Qs = 4 pts)
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
    v_option_count INTEGER;
    v_is_correct BOOLEAN := FALSE;
    v_points INTEGER := 0;
    v_total_questions INTEGER := 0;
    v_server_now_ms BIGINT := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
    v_existing_score INTEGER := 0;
    v_participant_count INTEGER := 0;
    v_answered_count INTEGER := 0;
    v_all_answered BOOLEAN := FALSE;
    v_advanced BOOLEAN := FALSE;
    v_is_finished BOOLEAN := FALSE;
    v_next_q_index INTEGER := p_question_index;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Explicit check: User must be a registered participant of this session
    IF NOT EXISTS (
        SELECT 1 FROM public.live_quiz_participants
        WHERE session_id = p_session_id AND student_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'User is not an active participant in this live quiz session.';
    END IF;

    -- 2. Lock & validate active session state
    SELECT * INTO v_session
    FROM public.live_quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    IF v_session.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Question is not currently active for submissions.';
    END IF;

    IF v_session.current_question_index <> p_question_index THEN
        RAISE EXCEPTION 'Question index mismatch.';
    END IF;

    -- 3. Check for duplicate answer
    IF EXISTS (
        SELECT 1 FROM public.live_quiz_answers
        WHERE session_id = p_session_id 
          AND question_index = p_question_index 
          AND student_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Answer already submitted for this question.';
    END IF;

    -- 4. Fetch authoritative question key from protected table
    SELECT * INTO v_question
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id AND question_index = p_question_index;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Question definition not found.';
    END IF;

    -- 5. Option range validation against available choices
    v_option_count := jsonb_array_length(v_question.options);
    IF p_selected_option_index < 0 OR p_selected_option_index >= v_option_count THEN
        RAISE EXCEPTION 'Invalid selected option index: % (options range: 0 to %)', p_selected_option_index, (v_option_count - 1);
    END IF;

    -- 6. Total question count for 100-point system calculation
    SELECT count(*) INTO v_total_questions
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    IF v_total_questions <= 0 THEN
        v_total_questions := 10;
    END IF;

    -- 7. Authoritative correctness & 100-point integer distribution
    IF v_question.correct_index = p_selected_option_index THEN
        v_is_correct := TRUE;
        v_points := ROUND(100.0 / v_total_questions);
    ELSE
        v_is_correct := FALSE;
        v_points := 0;
    END IF;

    -- 8. Atomically insert answer log
    INSERT INTO public.live_quiz_answers (
        session_id,
        question_index,
        student_id,
        selected_option_index,
        is_correct,
        points_awarded,
        server_submit_ms,
        submitted_at
    ) VALUES (
        p_session_id,
        p_question_index,
        v_user_id,
        p_selected_option_index,
        v_is_correct,
        v_points,
        v_server_now_ms,
        now()
    );

    -- 9. Atomically increment participant score
    UPDATE public.live_quiz_participants
    SET 
        score = score + v_points,
        last_earned_points = v_points
    WHERE session_id = p_session_id AND student_id = v_user_id
    RETURNING score INTO v_existing_score;

    -- 10. Server-Side Auto-Advance Check: If all eligible participants have answered, atomically advance!
    SELECT count(*) INTO v_participant_count
    FROM public.live_quiz_participants
    WHERE session_id = p_session_id;

    SELECT count(*) INTO v_answered_count
    FROM public.live_quiz_answers
    WHERE session_id = p_session_id AND question_index = p_question_index;

    IF v_participant_count > 0 AND v_answered_count >= v_participant_count THEN
        v_all_answered := TRUE;

        IF (p_question_index + 1) >= v_total_questions THEN
            -- Final question completed: Atomically finalize session
            v_is_finished := TRUE;
            UPDATE public.live_quiz_sessions
            SET 
                status = 'finished',
                ended_at = now(),
                updated_at = now()
            WHERE id = p_session_id;
        ELSE
            -- Atomically advance session to next question without waiting for timer
            v_advanced := TRUE;
            v_next_q_index := p_question_index + 1;
            UPDATE public.live_quiz_sessions
            SET 
                current_question_index = v_next_q_index,
                question_start_ms = v_server_now_ms,
                status = 'in_progress',
                correct_answer_index = NULL,
                updated_at = now()
            WHERE id = p_session_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'is_correct', v_is_correct,
        'points_awarded', v_points,
        'current_score', v_existing_score,
        'all_answered', v_all_answered,
        'advanced', v_advanced,
        'next_question_index', v_next_q_index,
        'is_finished', v_is_finished
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER) TO authenticated;
