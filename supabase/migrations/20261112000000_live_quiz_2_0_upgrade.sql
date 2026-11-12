-- ============================================================================
-- MIGRATION: EDTECHRA LIVE QUIZ 2.0 UPGRADE
-- 1. Safe non-destructive schema extensions for AI Quiz Builder, Speed Bonus,
--    and Response Time tracking.
-- 2. Accurate real-time student participation & unique answer counting.
-- 3. Authoritative server-side Speed Bonus scoring (500 base + up to 500 speed bonus).
-- 4. Atomic, complete Final Leaderboard generation (all participants, deterministic
--    tie-breaking, zero-point student inclusion, and classroom_points sync).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SAFE NON-DESTRUCTIVE COLUMN ADDITIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.live_quizzes
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS points_per_question INTEGER NOT NULL DEFAULT 1000;

ALTER TABLE public.live_quiz_questions
    ADD COLUMN IF NOT EXISTS hint TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 1000;

ALTER TABLE public.live_quiz_answers
    ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.live_quiz_questions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS response_time_ms BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS base_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS speed_bonus INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.live_quiz_results
    ADD COLUMN IF NOT EXISTS avg_response_time_ms BIGINT NOT NULL DEFAULT 0;

-- Index for fast per-question unique student answer lookups
CREATE INDEX IF NOT EXISTS idx_live_quiz_answers_session_question_student
    ON public.live_quiz_answers(session_id, question_index, student_id);

-- Ensure live_quiz_results is in supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'live_quiz_results'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_quiz_results;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. RLS POLICIES FOR SESSION LEADERBOARD VISIBILITY & ANSWER UPDATES
-- Allow all authenticated session participants and teachers to read session
-- leaderboard results so both Host and Student podiums display full rankings.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Results viewable by student or teacher" ON public.live_quiz_results;
CREATE POLICY "Results viewable by student or teacher" ON public.live_quiz_results
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            auth.uid() = student_id OR
            auth.uid() = teacher_id OR
            EXISTS (SELECT 1 FROM public.live_quiz_sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.live_quiz_participants p WHERE p.session_id = live_quiz_results.session_id AND p.student_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_id AND c.teacher_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Students can update own answer during active question" ON public.live_quiz_answers;
CREATE POLICY "Students can update own answer during active question" ON public.live_quiz_answers
    FOR UPDATE USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- ----------------------------------------------------------------------------
-- 3. STUDENT QUESTION FETCHER (INCLUDES HINT & QUESTION TYPE, HIDES ANSWERS)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_live_quiz_questions_for_student(UUID);

CREATE OR REPLACE FUNCTION public.get_live_quiz_questions_for_student(p_quiz_id UUID)
RETURNS TABLE (
    id UUID,
    quiz_id UUID,
    question_index INTEGER,
    question_text TEXT,
    options JSONB,
    duration_sec INTEGER,
    hint TEXT,
    question_type TEXT,
    points INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        q.id,
        q.quiz_id,
        q.question_index,
        q.question_text,
        q.options,
        q.duration_sec,
        COALESCE(q.hint, '') AS hint,
        COALESCE(q.question_type, 'multiple_choice') AS question_type,
        COALESCE(q.points, 1000) AS points
    FROM public.live_quiz_questions q
    WHERE q.quiz_id = p_quiz_id
    ORDER BY q.question_index ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_quiz_questions_for_student(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. ACCURATE PARTICIPANT & UNIQUE ANSWER COUNTER HELPER
-- Counts all joined students in the session (excluding the teacher host)
-- and unique students who have submitted an answer for p_index.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lq_eligible_counts(p_session_id UUID, p_index INTEGER)
RETURNS TABLE(eligible_count INTEGER, answered_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH s AS (
        SELECT teacher_id FROM public.live_quiz_sessions WHERE id = p_session_id
    ),
    elig AS (
        SELECT COUNT(DISTINCT p.student_id)::INTEGER AS c
        FROM public.live_quiz_participants p, s
        WHERE p.session_id = p_session_id
          AND p.student_id <> s.teacher_id
    ),
    ans AS (
        SELECT COUNT(DISTINCT a.student_id)::INTEGER AS c
        FROM public.live_quiz_answers a, s
        WHERE a.session_id = p_session_id
          AND a.question_index = p_index
          AND a.student_id <> s.teacher_id
    )
    SELECT COALESCE(elig.c, 0), COALESCE(ans.c, 0) FROM elig, ans;
$$;

GRANT EXECUTE ON FUNCTION public.lq_eligible_counts(UUID, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. COMPLETE, IDEMPOTENT FINAL LEADERBOARD & RESULTS GENERATOR
-- Computes rankings for EVERY participant (including 0-point students),
-- calculates avg_response_time_ms, resolves ties deterministically,
-- populates live_quiz_results BEFORE returning, and awards classroom_points.
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
            question_start_ms = NULL
        WHERE id = p_session_id;
    END IF;

    -- Fetch total questions and track_quiz flag
    SELECT GREATEST(1, COUNT(*)::INTEGER) INTO v_total_questions
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    SELECT COALESCE(track_quiz, TRUE) INTO v_track_quiz
    FROM public.live_quizzes
    WHERE id = v_session.quiz_id;

    -- First synchronize each participant's score in live_quiz_participants
    -- with their authoritative sum of points_awarded in live_quiz_answers
    UPDATE public.live_quiz_participants p
    SET score = GREATEST(
        COALESCE(p.score, 0),
        COALESCE((
            SELECT SUM(a.points_awarded)::INTEGER
            FROM public.live_quiz_answers a
            WHERE a.session_id = p_session_id
              AND a.student_id = p.student_id
        ), 0)
    )
    WHERE p.session_id = p_session_id
      AND p.student_id <> v_session.teacher_id;

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
          AND p.student_id <> v_session.teacher_id
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
                    'full_name', COALESCE(pr.full_name, p.display_name, pr.email, 'Student'),
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
-- 6. ATOMIC COMPARE-AND-SWAP QUESTION ADVANCER
-- Automatically populates final results when advancing past the last question.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lq_try_advance(
    p_session_id UUID,
    p_expected_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total INTEGER;
    v_next INTEGER;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_updated_id UUID;
    v_new_status TEXT;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.live_quiz_questions q
    JOIN public.live_quiz_sessions s ON s.quiz_id = q.quiz_id
    WHERE s.id = p_session_id;

    IF COALESCE(v_total, 0) <= 0 THEN
        RETURN jsonb_build_object('advanced', false, 'reason', 'no_questions');
    END IF;

    v_next := p_expected_index + 1;

    IF v_next >= v_total THEN
        UPDATE public.live_quiz_sessions
        SET status = 'finished',
            ended_at = now(),
            question_start_ms = NULL
        WHERE id = p_session_id
          AND status IN ('in_progress', 'reveal')
          AND current_question_index = p_expected_index
        RETURNING id, status INTO v_updated_id, v_new_status;

        IF v_updated_id IS NOT NULL THEN
            -- Immediately generate complete final leaderboard in the same transaction
            PERFORM public.finish_and_award_live_quiz(p_session_id);
        END IF;
    ELSE
        UPDATE public.live_quiz_sessions
        SET status = 'in_progress',
            current_question_index = v_next,
            question_start_ms = v_now_ms
        WHERE id = p_session_id
          AND status IN ('in_progress', 'reveal')
          AND current_question_index = p_expected_index
        RETURNING id, status INTO v_updated_id, v_new_status;
    END IF;

    IF v_updated_id IS NULL THEN
        RETURN jsonb_build_object('advanced', false, 'reason', 'already_advanced');
    END IF;

    RETURN jsonb_build_object(
        'advanced', true,
        'status', v_new_status,
        'current_question_index', CASE WHEN v_new_status = 'finished' THEN p_expected_index ELSE v_next END,
        'question_start_ms', CASE WHEN v_new_status = 'finished' THEN NULL ELSE v_now_ms END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.lq_try_advance(UUID, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. AUTHORITATIVE ANSWER SUBMISSION WITH SPEED BONUS SCORING (PART 4)
-- Formula:
--   basePoints = 500
--   maximumSpeedBonus = 500
--   remainingTime = max(0, questionDuration - responseTime)
--   speedBonus = round(maximumSpeedBonus * remainingTime / questionDuration)
--   totalPoints = correctAnswer ? basePoints + speedBonus : 0
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
    v_now TIMESTAMPTZ := clock_timestamp();
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM v_now) * 1000)::BIGINT;
    v_dur_ms BIGINT;
    v_start_ms BIGINT;
    v_grace_ms BIGINT := 1500; -- 1.5s network transport grace
    v_response_time_ms BIGINT := 0;
    v_remaining_ms BIGINT := 0;
    v_base_points INTEGER := 0;
    v_speed_bonus INTEGER := 0;
    v_is_correct BOOLEAN := FALSE;
    v_points INTEGER := 0;
    v_score_delta INTEGER := 0;
    v_answer_id UUID;
    v_eligible INTEGER := 0;
    v_answered INTEGER := 0;
    v_advance JSONB := '{"advanced": false}'::jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_selected_option_index < 0 OR p_selected_option_index > 3 THEN
        RAISE EXCEPTION 'selected_option_index must be 0..3';
    END IF;

    SELECT * INTO v_session
    FROM public.live_quiz_sessions
    WHERE id = p_session_id;

    IF v_session.id IS NULL THEN
        RAISE EXCEPTION 'Live quiz session not found';
    END IF;

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

        RETURN jsonb_build_object(
            'ok', true,
            'code', 'DUPLICATE',
            'answer_id', v_existing.id,
            'is_correct', v_existing.is_correct,
            'points_awarded', v_existing.points_awarded,
            'base_points', COALESCE(v_existing.base_points, CASE WHEN v_existing.is_correct THEN 500 ELSE 0 END),
            'speed_bonus', COALESCE(v_existing.speed_bonus, GREATEST(0, v_existing.points_awarded - 500)),
            'response_time_ms', COALESCE(v_existing.response_time_ms, 0),
            'correct_index', (
                SELECT q.correct_index FROM public.live_quiz_questions q
                WHERE q.quiz_id = v_session.quiz_id AND q.question_index = p_question_index
            ),
            'duplicate', true,
            'eligible_count', v_eligible,
            'answered_count', v_answered,
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
            'is_correct', false,
            'points_awarded', 0,
            'base_points', 0,
            'speed_bonus', 0
        );
    END IF;

    IF v_session.current_question_index <> p_question_index THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'QUESTION_MISMATCH',
            'current_question_index', v_session.current_question_index,
            'is_correct', false,
            'points_awarded', 0,
            'base_points', 0,
            'speed_bonus', 0
        );
    END IF;

    -- Compute authoritative server deadline and response time
    v_dur_ms := GREATEST(1000, public.lq_question_duration_ms(p_session_id, p_question_index));
    v_start_ms := COALESCE(
        v_session.question_start_ms,
        (EXTRACT(EPOCH FROM COALESCE(v_session.started_at, v_now)) * 1000)::BIGINT
    );

    -- Enforce server deadline: reject expired submissions and advance question
    IF v_now_ms > (v_start_ms + v_dur_ms + v_grace_ms) THEN
        v_advance := public.lq_try_advance(p_session_id, p_question_index);
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'LATE',
            'is_correct', false,
            'points_awarded', 0,
            'base_points', 0,
            'speed_bonus', 0,
            'response_time_ms', GREATEST(0, v_now_ms - v_start_ms),
            'advance', v_advance
        );
    END IF;

    -- Fetch authoritative question record
    SELECT * INTO v_question
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id
      AND question_index = p_question_index;

    IF v_question.id IS NULL THEN
        RAISE EXCEPTION 'Question not found for quiz % at index %', v_session.quiz_id, p_question_index;
    END IF;

    -- Prevent negative response times
    v_response_time_ms := GREATEST(0, v_now_ms - v_start_ms);
    v_remaining_ms := GREATEST(0, v_dur_ms - v_response_time_ms);

    -- Grade answer and calculate Speed Bonus (Base: 500, Max Speed Bonus: 500)
    v_is_correct := (p_selected_option_index = v_question.correct_index);

    IF v_is_correct THEN
        v_base_points := 500;
        v_speed_bonus := ROUND((500.0 * v_remaining_ms::NUMERIC) / v_dur_ms::NUMERIC)::INTEGER;
        v_speed_bonus := GREATEST(0, LEAST(500, v_speed_bonus));
        v_points := v_base_points + v_speed_bonus;
    ELSE
        v_base_points := 0;
        v_speed_bonus := 0;
        v_points := 0;
    END IF;

    -- Ensure student participant record exists and update last_seen_at
    INSERT INTO public.live_quiz_participants (session_id, student_id, score, last_earned_points, last_seen_at)
    VALUES (p_session_id, v_user_id, 0, 0, v_now)
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET last_seen_at = v_now;

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
          AND student_id = v_user_id;

        SELECT eligible_count, answered_count INTO v_eligible, v_answered
        FROM public.lq_eligible_counts(p_session_id, p_question_index);

        RETURN jsonb_build_object(
            'ok', true,
            'code', 'CHANGED',
            'answer_id', v_answer_id,
            'is_correct', v_is_correct,
            'points_awarded', v_points,
            'base_points', v_base_points,
            'speed_bonus', v_speed_bonus,
            'response_time_ms', v_response_time_ms,
            'correct_index', v_question.correct_index,
            'duplicate', false,
            'changed', true,
            'eligible_count', v_eligible,
            'answered_count', v_answered,
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

        RETURN jsonb_build_object(
            'ok', true,
            'code', 'DUPLICATE',
            'answer_id', v_existing.id,
            'is_correct', v_existing.is_correct,
            'points_awarded', v_existing.points_awarded,
            'base_points', COALESCE(v_existing.base_points, 0),
            'speed_bonus', COALESCE(v_existing.speed_bonus, 0),
            'response_time_ms', COALESCE(v_existing.response_time_ms, 0),
            'correct_index', v_question.correct_index,
            'duplicate', true,
            'eligible_count', v_eligible,
            'answered_count', v_answered,
            'advance', '{"advanced": false}'::jsonb
        );
    END IF;

    -- Award points to participant
    UPDATE public.live_quiz_participants
    SET score = score + v_points,
        last_earned_points = v_points,
        last_seen_at = v_now
    WHERE session_id = p_session_id
      AND student_id = v_user_id;

    -- Check if all joined students have answered the current question
    SELECT eligible_count, answered_count INTO v_eligible, v_answered
    FROM public.lq_eligible_counts(p_session_id, p_question_index);

    IF v_eligible > 0 AND v_answered >= v_eligible THEN
        v_advance := public.lq_try_advance(p_session_id, p_question_index);
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'code', 'ACCEPTED',
        'answer_id', v_answer_id,
        'is_correct', v_is_correct,
        'points_awarded', v_points,
        'base_points', v_base_points,
        'speed_bonus', v_speed_bonus,
        'response_time_ms', v_response_time_ms,
        'correct_index', v_question.correct_index,
        'duplicate', false,
        'eligible_count', v_eligible,
        'answered_count', v_answered,
        'advance', v_advance
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. AUTHORITATIVE SESSION STATE POLL / SYNC RPC
-- Returns server time, deadline, unique student participation counts,
-- and current question option distribution.
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
    v_total INTEGER;
    v_eligible INTEGER := 0;
    v_answered INTEGER := 0;
    v_my_answer RECORD;
    v_distribution JSONB := '{"0": 0, "1": 0, "2": 0, "3": 0}'::jsonb;
BEGIN
    SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id;
    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;

    IF v_user_id IS NOT NULL AND v_user_id <> v_session.teacher_id THEN
        UPDATE public.live_quiz_participants
        SET last_seen_at = clock_timestamp()
        WHERE session_id = p_session_id AND student_id = v_user_id;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_total
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    v_dur_ms := public.lq_question_duration_ms(p_session_id, v_session.current_question_index);
    v_start_ms := COALESCE(v_session.question_start_ms, v_now_ms);
    v_deadline_ms := v_start_ms + v_dur_ms;

    -- Opportunistic server-side advance if current question expired
    IF v_session.status = 'in_progress' AND v_session.question_start_ms IS NOT NULL AND v_now_ms >= v_deadline_ms THEN
        PERFORM public.lq_try_advance(p_session_id, v_session.current_question_index);
        SELECT * INTO v_session FROM public.live_quiz_sessions WHERE id = p_session_id;
        v_dur_ms := public.lq_question_duration_ms(p_session_id, v_session.current_question_index);
        v_start_ms := COALESCE(v_session.question_start_ms, v_now_ms);
        v_deadline_ms := v_start_ms + v_dur_ms;
    END IF;

    SELECT eligible_count, answered_count INTO v_eligible, v_answered
    FROM public.lq_eligible_counts(p_session_id, v_session.current_question_index);

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
      AND student_id <> v_session.teacher_id;

    IF v_user_id IS NOT NULL THEN
        SELECT selected_option_index, is_correct, points_awarded, base_points, speed_bonus, response_time_ms
        INTO v_my_answer
        FROM public.live_quiz_answers
        WHERE session_id = p_session_id
          AND question_index = v_session.current_question_index
          AND student_id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'session_id', v_session.id,
        'quiz_id', v_session.quiz_id,
        'status', v_session.status,
        'current_question_index', v_session.current_question_index,
        'total_questions', COALESCE(v_total, 0),
        'question_start_ms', v_start_ms,
        'question_duration_ms', v_dur_ms,
        'deadline_ms', v_deadline_ms,
        'server_now_ms', v_now_ms,
        'remaining_ms', GREATEST(0, v_deadline_ms - v_now_ms),
        'total_participants', v_eligible,
        'eligible_count', v_eligible,
        'answered_count', v_answered,
        'answer_distribution', COALESCE(v_distribution, '{"0": 0, "1": 0, "2": 0, "3": 0}'::jsonb),
        'my_answer', CASE WHEN v_my_answer.selected_option_index IS NULL THEN NULL ELSE jsonb_build_object(
            'selected_option_index', v_my_answer.selected_option_index,
            'is_correct', v_my_answer.is_correct,
            'points_awarded', v_my_answer.points_awarded,
            'base_points', COALESCE(v_my_answer.base_points, 0),
            'speed_bonus', COALESCE(v_my_answer.speed_bonus, 0),
            'response_time_ms', COALESCE(v_my_answer.response_time_ms, 0)
        ) END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_quiz_state(UUID) TO authenticated;

COMMIT;
