-- ============================================================================
-- EDTECHRA-BITZ: Live Quiz Realtime & Adversarial-Hardened Database Migration
-- ============================================================================

-- 1. Ensure classroom_points constraint accepts 'live_quiz'
DO $$
BEGIN
    ALTER TABLE public.classroom_points DROP CONSTRAINT IF EXISTS classroom_points_source_type_check;
    ALTER TABLE public.classroom_points ADD CONSTRAINT classroom_points_source_type_check 
        CHECK (source_type IN ('assignment', 'quiz', 'exam', 'spree', 'activity', 'manual', 'bonus', 'live_quiz'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Prevent arbitrary direct points insertion by students
DROP POLICY IF EXISTS "Teachers can insert points" ON public.classroom_points;
CREATE POLICY "Teachers can insert points" ON public.classroom_points
    FOR INSERT WITH CHECK (
        public.is_classroom_teacher(classroom_id, auth.uid()) OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- Strict Idempotency unique index for Live Quiz points
CREATE UNIQUE INDEX IF NOT EXISTS idx_classroom_points_live_quiz_idempotency
    ON public.classroom_points (classroom_id, student_id, source_type, source_id)
    WHERE source_type = 'live_quiz' AND source_id IS NOT NULL;

-- 3. Live Quizzes (Catalog & Metadata)
CREATE TABLE IF NOT EXISTS public.live_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General',
    difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    accent_color TEXT DEFAULT '#026fc3',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_quizzes_classroom ON public.live_quizzes(classroom_id);
CREATE INDEX IF NOT EXISTS idx_live_quizzes_category ON public.live_quizzes(category);
CREATE INDEX IF NOT EXISTS idx_live_quizzes_public ON public.live_quizzes(is_public);

-- 4. Live Quiz Questions (Normalized & Protected Answer Keys)
CREATE TABLE IF NOT EXISTS public.live_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.live_quizzes(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index INTEGER NOT NULL, -- PROTECTED: Never directly selectable by students
    duration_sec INTEGER NOT NULL DEFAULT 20,
    explanation TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (quiz_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_live_quiz_questions_quiz ON public.live_quiz_questions(quiz_id);

-- 5. Live Quiz Sessions (Multiplayer Game States)
CREATE TABLE IF NOT EXISTS public.live_quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.live_quizzes(id) ON DELETE SET NULL,
    pin TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'in_progress', 'reveal', 'finished', 'cancelled')),
    current_question_index INTEGER NOT NULL DEFAULT 0,
    question_start_ms BIGINT,
    question_duration_sec INTEGER NOT NULL DEFAULT 20,
    correct_answer_index INTEGER, -- Only populated during 'reveal' or 'finished' phases
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_pin ON public.live_quiz_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_classroom ON public.live_quiz_sessions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_status ON public.live_quiz_sessions(status);

-- 6. Live Quiz Participants
CREATE TABLE IF NOT EXISTS public.live_quiz_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.live_quiz_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    last_earned_points INTEGER NOT NULL DEFAULT 0,
    final_rank INTEGER,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_quiz_participants_session ON public.live_quiz_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_quiz_participants_student ON public.live_quiz_participants(student_id);

-- 7. Live Quiz Answers (Audit log)
CREATE TABLE IF NOT EXISTS public.live_quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.live_quiz_sessions(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    server_submit_ms BIGINT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, question_index, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_quiz_answers_session_q ON public.live_quiz_answers(session_id, question_index);
CREATE INDEX IF NOT EXISTS idx_live_quiz_answers_student ON public.live_quiz_answers(student_id);

-- 8. Live Quiz Final Results
CREATE TABLE IF NOT EXISTS public.live_quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.live_quiz_sessions(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.live_quizzes(id) ON DELETE SET NULL,
    score INTEGER NOT NULL DEFAULT 0,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    accuracy_percentage INTEGER NOT NULL DEFAULT 0,
    final_rank INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_quiz_results_classroom ON public.live_quiz_results(classroom_id);
CREATE INDEX IF NOT EXISTS idx_live_quiz_results_student ON public.live_quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_live_quiz_results_session ON public.live_quiz_results(session_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.live_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_quiz_results ENABLE ROW LEVEL SECURITY;

-- LIVE QUIZZES POLICIES
DROP POLICY IF EXISTS "Live quizzes viewable by all authenticated users" ON public.live_quizzes;
CREATE POLICY "Live quizzes viewable by all authenticated users" ON public.live_quizzes
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can manage live quizzes" ON public.live_quizzes;
CREATE POLICY "Teachers can manage live quizzes" ON public.live_quizzes
    FOR ALL USING (
        auth.uid() = created_by OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- LIVE QUIZ QUESTIONS POLICIES
-- Only teachers and creators can directly query live_quiz_questions with correct_index
DROP POLICY IF EXISTS "Teachers can view full live quiz questions" ON public.live_quiz_questions;
CREATE POLICY "Teachers can view full live quiz questions" ON public.live_quiz_questions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.live_quizzes WHERE id = quiz_id AND (created_by = auth.uid() OR is_public = true)) AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

DROP POLICY IF EXISTS "Teachers can manage live quiz questions" ON public.live_quiz_questions;
CREATE POLICY "Teachers can manage live quiz questions" ON public.live_quiz_questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.live_quizzes WHERE id = quiz_id AND created_by = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- LIVE QUIZ SESSIONS POLICIES
DROP POLICY IF EXISTS "Sessions viewable by all authenticated users" ON public.live_quiz_sessions;
CREATE POLICY "Sessions viewable by all authenticated users" ON public.live_quiz_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can manage their own live quiz sessions" ON public.live_quiz_sessions;
CREATE POLICY "Teachers can manage their own live quiz sessions" ON public.live_quiz_sessions
    FOR ALL USING (
        auth.uid() = teacher_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- LIVE QUIZ PARTICIPANTS POLICIES
DROP POLICY IF EXISTS "Participants viewable by session members" ON public.live_quiz_participants;
CREATE POLICY "Participants viewable by session members" ON public.live_quiz_participants
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Students can insert their own participant row" ON public.live_quiz_participants;
CREATE POLICY "Students can insert their own participant row" ON public.live_quiz_participants
    FOR INSERT WITH CHECK (
        auth.uid() = student_id AND
        EXISTS (SELECT 1 FROM public.live_quiz_sessions WHERE id = session_id AND status IN ('lobby', 'in_progress'))
    );

DROP POLICY IF EXISTS "Participants can be updated by self or host teacher" ON public.live_quiz_participants;
CREATE POLICY "Participants can be updated by self or host teacher" ON public.live_quiz_participants
    FOR UPDATE USING (
        auth.uid() = student_id OR
        EXISTS (SELECT 1 FROM public.live_quiz_sessions WHERE id = session_id AND teacher_id = auth.uid())
    );

-- LIVE QUIZ ANSWERS POLICIES
DROP POLICY IF EXISTS "Students can submit own answers" ON public.live_quiz_answers;
CREATE POLICY "Students can submit own answers" ON public.live_quiz_answers
    FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Answers viewable by student or teacher" ON public.live_quiz_answers;
CREATE POLICY "Answers viewable by student or teacher" ON public.live_quiz_answers
    FOR SELECT USING (
        auth.uid() = student_id OR
        EXISTS (SELECT 1 FROM public.live_quiz_sessions WHERE id = session_id AND teacher_id = auth.uid())
    );

-- LIVE QUIZ RESULTS POLICIES
DROP POLICY IF EXISTS "Results viewable by student or teacher" ON public.live_quiz_results;
CREATE POLICY "Results viewable by student or teacher" ON public.live_quiz_results
    FOR SELECT USING (
        auth.uid() = student_id OR
        auth.uid() = teacher_id OR
        EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_id AND teacher_id = auth.uid())
    );

DROP POLICY IF EXISTS "Teachers or system can insert results" ON public.live_quiz_results;
CREATE POLICY "Teachers or system can insert results" ON public.live_quiz_results
    FOR INSERT WITH CHECK (
        auth.uid() = teacher_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
    );

-- ============================================================================
-- SECURE SERVER-SIDE STORED PROCEDURES (SECURITY DEFINER)
-- ============================================================================

-- 1. Student-Safe Question Retrieval (Stripped of correct_index and explanation)
CREATE OR REPLACE FUNCTION public.get_live_quiz_questions_for_student(p_quiz_id UUID)
RETURNS TABLE (
    id UUID,
    question_index INTEGER,
    question_text TEXT,
    options JSONB,
    duration_sec INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        q.id,
        q.question_index,
        q.question_text,
        q.options,
        q.duration_sec
    FROM public.live_quiz_questions q
    WHERE q.quiz_id = p_quiz_id
    ORDER BY q.question_index ASC;
$$;

-- 2. Server-Authoritative Answer Submission & Speed-Bonus Calculation
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
    v_speed_bonus INTEGER := 0;
    v_server_now_ms BIGINT := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
    v_elapsed_ms BIGINT;
    v_duration_ms BIGINT;
    v_remaining_ms BIGINT;
    v_existing_score INTEGER := 0;
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

    -- 6. Authoritative correctness & speed bonus calculation
    IF v_question.correct_index = p_selected_option_index THEN
        v_is_correct := TRUE;
        
        v_duration_ms := GREATEST(1000, (COALESCE(v_session.question_duration_sec, 20) * 1000)::BIGINT);
        v_elapsed_ms := GREATEST(0, v_server_now_ms - COALESCE(v_session.question_start_ms, v_server_now_ms));
        v_remaining_ms := GREATEST(0, v_duration_ms - v_elapsed_ms);
        
        v_speed_bonus := ROUND((500.0 * v_remaining_ms) / v_duration_ms);
        v_points := 500 + v_speed_bonus;
    ELSE
        v_is_correct := FALSE;
        v_points := 0;
    END IF;

    -- 7. Atomically insert answer log
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

    -- 8. Atomically increment participant score
    UPDATE public.live_quiz_participants
    SET 
        score = score + v_points,
        last_earned_points = v_points
    WHERE session_id = p_session_id AND student_id = v_user_id
    RETURNING score INTO v_existing_score;

    RETURN jsonb_build_object(
        'is_correct', v_is_correct,
        'points_awarded', v_points,
        'current_score', COALESCE(v_existing_score, v_points)
    );
END;
$$;

-- 3. Finish and Idempotently Award Points to Classroom Leaderboard
CREATE OR REPLACE FUNCTION public.finish_and_award_live_quiz(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_session RECORD;
    v_part RECORD;
    v_rank INTEGER := 0;
    v_total_questions INTEGER := 1;
    v_correct_count INTEGER;
    v_wrong_count INTEGER;
    v_accuracy INTEGER;
    v_result_id UUID;
    v_results JSONB := '[]'::jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Validate session & caller permissions with row locking
    SELECT * INTO v_session
    FROM public.live_quiz_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    IF v_session.teacher_id <> v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = v_user_id AND role IN ('teacher', 'admin')
    ) THEN
        RAISE EXCEPTION 'Permission denied. Only the host teacher can finalize the quiz.';
    END IF;

    -- If already finished, return existing results without double-awarding points
    IF v_session.status = 'finished' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'student_id', r.student_id,
                'score', r.score,
                'rank', r.final_rank,
                'accuracy', r.accuracy_percentage,
                'correct_count', r.correct_count
            )
        ) INTO v_results
        FROM public.live_quiz_results r
        WHERE r.session_id = p_session_id;

        RETURN COALESCE(v_results, '[]'::jsonb);
    END IF;

    -- 2. Count total questions
    SELECT COUNT(*) INTO v_total_questions
    FROM public.live_quiz_questions
    WHERE quiz_id = v_session.quiz_id;

    v_total_questions := GREATEST(1, v_total_questions);

    -- 3. Process participants in order of score DESC
    FOR v_part IN
        SELECT * FROM public.live_quiz_participants
        WHERE session_id = p_session_id
        ORDER BY score DESC, joined_at ASC
    LOOP
        v_rank := v_rank + 1;

        -- Count student's correct answers
        SELECT 
            COUNT(*) FILTER (WHERE is_correct = TRUE),
            COUNT(*) FILTER (WHERE is_correct = FALSE)
        INTO v_correct_count, v_wrong_count
        FROM public.live_quiz_answers
        WHERE session_id = p_session_id AND student_id = v_part.student_id;

        v_accuracy := ROUND((COALESCE(v_correct_count, 0)::NUMERIC / v_total_questions::NUMERIC) * 100);

        -- Upsert Live Quiz Result
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
            final_rank,
            created_at
        ) VALUES (
            p_session_id,
            v_session.classroom_id,
            v_session.teacher_id,
            v_part.student_id,
            v_session.quiz_id,
            v_part.score,
            v_part.score,
            COALESCE(v_correct_count, 0),
            GREATEST(0, v_total_questions - COALESCE(v_correct_count, 0)),
            v_total_questions,
            v_accuracy,
            v_rank,
            now()
        )
        ON CONFLICT (session_id, student_id) DO UPDATE SET
            score = EXCLUDED.score,
            points_awarded = EXCLUDED.points_awarded,
            correct_count = EXCLUDED.correct_count,
            wrong_count = EXCLUDED.wrong_count,
            accuracy_percentage = EXCLUDED.accuracy_percentage,
            final_rank = EXCLUDED.final_rank
        RETURNING id INTO v_result_id;

        -- Update participant rank
        UPDATE public.live_quiz_participants
        SET final_rank = v_rank
        WHERE session_id = p_session_id AND student_id = v_part.student_id;

        -- Idempotently award points to classroom_points ledger
        IF v_part.score > 0 AND v_session.classroom_id IS NOT NULL THEN
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
                v_part.student_id,
                v_part.score,
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

        v_results := v_results || jsonb_build_object(
            'student_id', v_part.student_id,
            'name', v_part.display_name,
            'score', v_part.score,
            'rank', v_rank,
            'accuracy', v_accuracy,
            'correct_count', COALESCE(v_correct_count, 0)
        );
    END LOOP;

    -- 4. Mark session finished
    UPDATE public.live_quiz_sessions
    SET 
        status = 'finished',
        ended_at = now()
    WHERE id = p_session_id;

    RETURN v_results;
END;
$$;

-- 4. Function Execution Permissions Hardening
REVOKE ALL ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_live_quiz_answer(UUID, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.finish_and_award_live_quiz(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_and_award_live_quiz(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_live_quiz_questions_for_student(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_live_quiz_questions_for_student(UUID) TO authenticated;
