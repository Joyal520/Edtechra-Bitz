-- ============================================================================
-- EDTECHRA COURSE STUDIO: GAMES & COMPETITIONS INTEGRATION
-- Adds course_games, course_game_questions, course_game_assignments, and
-- course_game_attempts while reusing courses, classrooms, assignments,
-- live_quiz_sessions, and classroom_points.
-- ============================================================================

-- 1. COURSE GAMES & COMPETITIONS CONFIGURATION
CREATE TABLE IF NOT EXISTS public.course_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'learning_game' CHECK (mode IN ('learning_game', 'competition')),
    competition_format TEXT NOT NULL DEFAULT 'individual' CHECK (competition_format IN ('individual', 'team', 'live_quiz')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic TEXT NOT NULL DEFAULT '',
    target_level TEXT NOT NULL DEFAULT 'All Grades',
    source_materials JSONB NOT NULL DEFAULT '[]'::jsonb,
    scoring_config JSONB NOT NULL DEFAULT '{
        "points_per_question": 10,
        "bonus_points": 0,
        "time_based_scoring": false,
        "difficulty_based_scoring": false,
        "negative_marking": false,
        "negative_points": 2,
        "total_points": 0
    }'::jsonb,
    settings JSONB NOT NULL DEFAULT '{
        "time_limit_sec": 0,
        "max_attempts": 3,
        "show_explanations": true,
        "immediate_feedback": true,
        "shuffle_questions": false,
        "public_leaderboard": true,
        "visibility": "classroom",
        "team_names": ["Team Alpha", "Team Beta"]
    }'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    total_questions INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_games_teacher ON public.course_games(teacher_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_games_course ON public.course_games(course_id);
CREATE INDEX IF NOT EXISTS idx_course_games_status ON public.course_games(status);

-- 2. COURSE GAME QUESTIONS
CREATE TABLE IF NOT EXISTS public.course_game_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.course_games(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN (
        'multiple_choice',
        'true_false',
        'fill_blank',
        'matching',
        'word_arrangement',
        'image_based',
        'short_answer',
        'correct_mistake'
    )),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer JSONB NOT NULL DEFAULT '""'::jsonb,
    explanation TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 10,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    image_url TEXT,
    source_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_game_questions_game ON public.course_game_questions(game_id, order_index ASC);

-- 3. CLASSROOM GAME ASSIGNMENTS (Bridges Course Games -> Classrooms & Assignments)
CREATE TABLE IF NOT EXISTS public.course_game_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.course_games(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    time_limit_sec INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    visibility TEXT NOT NULL DEFAULT 'classroom' CHECK (visibility IN ('classroom', 'selected_students', 'public')),
    public_leaderboard BOOLEAN NOT NULL DEFAULT true,
    live_quiz_id UUID REFERENCES public.live_quizzes(id) ON DELETE SET NULL,
    live_session_id UUID REFERENCES public.live_quiz_sessions(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_game_assignments_game ON public.course_game_assignments(game_id);
CREATE INDEX IF NOT EXISTS idx_course_game_assignments_classroom ON public.course_game_assignments(classroom_id, is_published);
CREATE INDEX IF NOT EXISTS idx_course_game_assignments_assignment ON public.course_game_assignments(assignment_id);

-- 4. STUDENT GAME ATTEMPTS & RESULTS
CREATE TABLE IF NOT EXISTS public.course_game_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.course_games(id) ON DELETE CASCADE,
    game_assignment_id UUID NOT NULL REFERENCES public.course_game_assignments(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    team_name TEXT,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    accuracy_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
    time_taken_sec INTEGER NOT NULL DEFAULT 0,
    badges_earned JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (game_assignment_id, student_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_course_game_attempts_assignment ON public.course_game_attempts(game_assignment_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_course_game_attempts_student ON public.course_game_attempts(student_id, game_assignment_id);
CREATE INDEX IF NOT EXISTS idx_course_game_attempts_game ON public.course_game_attempts(game_id);

-- 5. ENABLE ROW-LEVEL SECURITY
ALTER TABLE public.course_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_game_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_game_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_game_attempts ENABLE ROW LEVEL SECURITY;

-- RLS: course_games
DROP POLICY IF EXISTS "Teachers manage own course games" ON public.course_games;
CREATE POLICY "Teachers manage own course games"
    ON public.course_games FOR ALL TO authenticated
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students view assigned published course games" ON public.course_games;
CREATE POLICY "Students view assigned published course games"
    ON public.course_games FOR SELECT TO authenticated
    USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 FROM public.course_game_assignments cga
            JOIN public.classroom_members cm ON cm.classroom_id = cga.classroom_id
            WHERE cga.game_id = course_games.id
              AND cga.is_published = true
              AND cm.profile_id = auth.uid()
        )
    );

-- RLS: course_game_questions (ONLY teachers own questions; students receive sanitized questions via backend API so correct_answer is never leaked)
DROP POLICY IF EXISTS "Teachers manage own course game questions" ON public.course_game_questions;
CREATE POLICY "Teachers manage own course game questions"
    ON public.course_game_questions FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.course_games cg
            WHERE cg.id = course_game_questions.game_id
              AND cg.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.course_games cg
            WHERE cg.id = course_game_questions.game_id
              AND cg.teacher_id = auth.uid()
        )
    );

-- RLS: course_game_assignments
DROP POLICY IF EXISTS "Teachers manage classroom game assignments" ON public.course_game_assignments;
CREATE POLICY "Teachers manage classroom game assignments"
    ON public.course_game_assignments FOR ALL TO authenticated
    USING (
        auth.uid() = assigned_by
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = course_game_assignments.classroom_id
              AND c.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = assigned_by
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = course_game_assignments.classroom_id
              AND c.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Classroom members view published game assignments" ON public.course_game_assignments;
CREATE POLICY "Classroom members view published game assignments"
    ON public.course_game_assignments FOR SELECT TO authenticated
    USING (
        is_published = true
        AND EXISTS (
            SELECT 1 FROM public.classroom_members cm
            WHERE cm.classroom_id = course_game_assignments.classroom_id
              AND cm.profile_id = auth.uid()
        )
    );

-- RLS: course_game_attempts
DROP POLICY IF EXISTS "Students view and create own game attempts" ON public.course_game_attempts;
CREATE POLICY "Students view and create own game attempts"
    ON public.course_game_attempts FOR ALL TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers view classroom game attempts" ON public.course_game_attempts;
CREATE POLICY "Teachers view classroom game attempts"
    ON public.course_game_attempts FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = course_game_attempts.classroom_id
              AND c.teacher_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.course_games cg
            WHERE cg.id = course_game_attempts.game_id
              AND cg.teacher_id = auth.uid()
        )
    );
