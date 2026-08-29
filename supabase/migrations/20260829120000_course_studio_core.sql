-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO CORE ARCHITECTURE (MIGRATION)
-- Centralized Teacher-Owned Courses, Multi-Classroom Delivery, and Student Tracking
-- ============================================================================

-- 1. COURSES TABLE (Owned by Teacher)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    short_description TEXT DEFAULT '',
    subject TEXT NOT NULL DEFAULT 'General',
    grade_level TEXT DEFAULT 'All Grades',
    cover_image_url TEXT,
    cover_image_key TEXT,
    course_type TEXT NOT NULL DEFAULT 'full' CHECK (course_type IN ('full', 'quick')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    estimated_hours NUMERIC(4, 1) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. COURSE UNITS TABLE
CREATE TABLE IF NOT EXISTS public.course_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. COURSE EPISODES TABLE (Day / Lesson)
CREATE TABLE IF NOT EXISTS public.course_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.course_units(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    episode_type TEXT NOT NULL DEFAULT 'lesson' CHECK (episode_type IN ('lesson', 'practice', 'assessment', 'revision')),
    order_index INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. COURSE CONTENT BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.course_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.course_episodes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'youtube_video', 'youtube_short', 'question_set', 'audio', 'callout', 'code', 'quote')),
    order_index INTEGER NOT NULL DEFAULT 0,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COURSE QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.course_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.course_episodes(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    block_id UUID REFERENCES public.course_blocks(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'matching', 'sentence_builder', 'ordering', 'short_answer')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    skill TEXT DEFAULT 'Grammar',
    concept TEXT DEFAULT 'General',
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points INTEGER NOT NULL DEFAULT 10,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. COURSE MEDIA TABLE
CREATE TABLE IF NOT EXISTS public.course_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    original_size INTEGER,
    optimized_size INTEGER,
    storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
    storage_key TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. COURSE CLASSROOM ASSIGNMENTS TABLE (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS public.course_classroom_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ DEFAULT now(),
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'completed')),
    settings JSONB NOT NULL DEFAULT '{"sequential_unlock": false, "allow_retries": true, "track_mastery": true, "award_points": true}'::jsonb,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(course_id, classroom_id)
);

-- 8. COURSE ENROLLMENTS TABLE (Student enrollment per assignment)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    classroom_assignment_id UUID NOT NULL REFERENCES public.course_classroom_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed')),
    progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    mastery_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    accuracy_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    current_episode_id UUID REFERENCES public.course_episodes(id) ON DELETE SET NULL,
    completed_episodes_count INTEGER NOT NULL DEFAULT 0,
    total_episodes_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(classroom_assignment_id, student_id)
);

-- 9. COURSE EPISODE PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.course_episode_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES public.course_episodes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score NUMERIC(6, 2) DEFAULT 0,
    max_score NUMERIC(6, 2) DEFAULT 0,
    percentage NUMERIC(5, 2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(enrollment_id, episode_id)
);

-- 10. COURSE QUESTION ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.course_question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES public.course_episodes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.course_questions(id) ON DELETE CASCADE,
    student_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    skill TEXT,
    concept TEXT,
    difficulty TEXT,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. COURSE LEARNING EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.course_learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES public.course_episodes(id) ON DELETE SET NULL,
    question_id UUID REFERENCES public.course_questions(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_courses_teacher_status ON public.courses(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_course_units_course_order ON public.course_units(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_episodes_unit_order ON public.course_episodes(unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_episodes_course ON public.course_episodes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_blocks_episode_order ON public.course_blocks(episode_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_questions_episode_order ON public.course_questions(episode_id, order_index);
CREATE INDEX IF NOT EXISTS idx_cca_course_classroom ON public.course_classroom_assignments(course_id, classroom_id);
CREATE INDEX IF NOT EXISTS idx_cca_classroom_status ON public.course_classroom_assignments(classroom_id, status);
CREATE INDEX IF NOT EXISTS idx_ce_assignment_student ON public.course_enrollments(classroom_assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_ce_student_course ON public.course_enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_cep_enrollment_episode ON public.course_episode_progress(enrollment_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_cqa_student_concept ON public.course_question_attempts(student_id, concept);
CREATE INDEX IF NOT EXISTS idx_cqa_course_episode ON public.course_question_attempts(course_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_cle_course_student ON public.course_learning_events(course_id, student_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_episode_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_learning_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- COURSES
    DROP POLICY IF EXISTS "Teachers can manage their own courses" ON public.courses;
    CREATE POLICY "Teachers can manage their own courses" ON public.courses
        FOR ALL USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

    DROP POLICY IF EXISTS "Students can view assigned published courses" ON public.courses;
    CREATE POLICY "Students can view assigned published courses" ON public.courses
        FOR SELECT USING (
            status = 'published' AND EXISTS (
                SELECT 1 FROM public.course_classroom_assignments cca
                JOIN public.classroom_members cm ON cm.classroom_id = cca.classroom_id
                WHERE cca.course_id = courses.id AND cm.profile_id = auth.uid() AND cm.status = 'active'
            )
        );

    -- UNITS, EPISODES, BLOCKS, QUESTIONS (Cascade read for assigned students)
    DROP POLICY IF EXISTS "Teachers can manage course content" ON public.course_units;
    CREATE POLICY "Teachers can manage course content" ON public.course_units
        FOR ALL USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_units.course_id AND (c.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

    DROP POLICY IF EXISTS "Students can view units of assigned courses" ON public.course_units;
    CREATE POLICY "Students can view units of assigned courses" ON public.course_units
        FOR SELECT USING (EXISTS (SELECT 1 FROM public.course_classroom_assignments cca JOIN public.classroom_members cm ON cm.classroom_id = cca.classroom_id WHERE cca.course_id = course_units.course_id AND cm.profile_id = auth.uid() AND cm.status = 'active'));

    DROP POLICY IF EXISTS "Teachers can manage course episodes" ON public.course_episodes;
    CREATE POLICY "Teachers can manage course episodes" ON public.course_episodes
        FOR ALL USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_episodes.course_id AND (c.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

    DROP POLICY IF EXISTS "Students can view episodes of assigned courses" ON public.course_episodes;
    CREATE POLICY "Students can view episodes of assigned courses" ON public.course_episodes
        FOR SELECT USING (EXISTS (SELECT 1 FROM public.course_classroom_assignments cca JOIN public.classroom_members cm ON cm.classroom_id = cca.classroom_id WHERE cca.course_id = course_episodes.course_id AND cm.profile_id = auth.uid() AND cm.status = 'active'));

    DROP POLICY IF EXISTS "Teachers can manage course blocks" ON public.course_blocks;
    CREATE POLICY "Teachers can manage course blocks" ON public.course_blocks
        FOR ALL USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_blocks.course_id AND (c.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

    DROP POLICY IF EXISTS "Students can view blocks of assigned courses" ON public.course_blocks;
    CREATE POLICY "Students can view blocks of assigned courses" ON public.course_blocks
        FOR SELECT USING (EXISTS (SELECT 1 FROM public.course_classroom_assignments cca JOIN public.classroom_members cm ON cm.classroom_id = cca.classroom_id WHERE cca.course_id = course_blocks.course_id AND cm.profile_id = auth.uid() AND cm.status = 'active'));

    DROP POLICY IF EXISTS "Teachers can manage course questions" ON public.course_questions;
    CREATE POLICY "Teachers can manage course questions" ON public.course_questions
        FOR ALL USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_questions.course_id AND (c.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

    DROP POLICY IF EXISTS "Students can view questions of assigned courses" ON public.course_questions;
    CREATE POLICY "Students can view questions of assigned courses" ON public.course_questions
        FOR SELECT USING (EXISTS (SELECT 1 FROM public.course_classroom_assignments cca JOIN public.classroom_members cm ON cm.classroom_id = cca.classroom_id WHERE cca.course_id = course_questions.course_id AND cm.profile_id = auth.uid() AND cm.status = 'active'));

    -- CLASSROOM ASSIGNMENTS
    DROP POLICY IF EXISTS "Teachers can manage assignments" ON public.course_classroom_assignments;
    CREATE POLICY "Teachers can manage assignments" ON public.course_classroom_assignments
        FOR ALL USING (assigned_by = auth.uid() OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = course_classroom_assignments.classroom_id AND c.teacher_id = auth.uid()));

    DROP POLICY IF EXISTS "Students can view their classroom course assignments" ON public.course_classroom_assignments;
    CREATE POLICY "Students can view their classroom course assignments" ON public.course_classroom_assignments
        FOR SELECT USING (EXISTS (SELECT 1 FROM public.classroom_members cm WHERE cm.classroom_id = course_classroom_assignments.classroom_id AND cm.profile_id = auth.uid() AND cm.status = 'active'));

    -- ENROLLMENTS & PROGRESS (Students read/write their own, Teachers view their classrooms)
    DROP POLICY IF EXISTS "Users can view and manage their own enrollments" ON public.course_enrollments;
    CREATE POLICY "Users can view and manage their own enrollments" ON public.course_enrollments
        FOR ALL USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = course_enrollments.classroom_id AND c.teacher_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can manage their episode progress" ON public.course_episode_progress;
    CREATE POLICY "Users can manage their episode progress" ON public.course_episode_progress
        FOR ALL USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = course_episode_progress.classroom_id AND c.teacher_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can manage their question attempts" ON public.course_question_attempts;
    CREATE POLICY "Users can manage their question attempts" ON public.course_question_attempts
        FOR ALL USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = course_question_attempts.classroom_id AND c.teacher_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can manage their learning events" ON public.course_learning_events;
    CREATE POLICY "Users can manage their learning events" ON public.course_learning_events
        FOR ALL USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_learning_events.course_id AND c.teacher_id = auth.uid()));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

GRANT ALL ON public.courses, public.course_units, public.course_episodes, public.course_blocks, public.course_questions, public.course_media, public.course_classroom_assignments, public.course_enrollments, public.course_episode_progress, public.course_question_attempts, public.course_learning_events TO authenticated, service_role;
