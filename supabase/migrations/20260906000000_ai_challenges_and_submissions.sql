-- ============================================================================
-- EDTECHRA-BITZ: AI Challenge Competition & Asynchronous Assessment Schema
-- ============================================================================

-- 1. Create ai_challenges table
CREATE TABLE IF NOT EXISTS public.ai_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT NOT NULL,
    reference_file_key TEXT NULL,
    reference_file_name TEXT NULL,
    category TEXT NOT NULL DEFAULT 'Creative Writing',
    max_marks INTEGER NOT NULL DEFAULT 100 CHECK (max_marks > 0),
    allow_text_submission BOOLEAN NOT NULL DEFAULT TRUE,
    allow_file_upload BOOLEAN NOT NULL DEFAULT TRUE,
    required_word_count INTEGER NULL,
    word_count_rule TEXT NULL DEFAULT 'approximate',
    evaluation_spec_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'open', 'closed', 'processing', 'completed', 'archived')),
    deadline_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure at least one submission method is enabled
DO $$
BEGIN
    ALTER TABLE public.ai_challenges DROP CONSTRAINT IF EXISTS ai_challenges_submission_method_check;
    ALTER TABLE public.ai_challenges ADD CONSTRAINT ai_challenges_submission_method_check
        CHECK (allow_text_submission = TRUE OR allow_file_upload = TRUE);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Create ai_challenge_submissions table
CREATE TABLE IF NOT EXISTS public.ai_challenge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.ai_challenges(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('text', 'file')),
    content_text TEXT NULL,
    file_key TEXT NULL,
    file_name TEXT NULL,
    file_type TEXT NULL,
    file_size INTEGER NULL,
    word_count INTEGER NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('draft', 'submitted', 'queued', 'processing', 'completed', 'failed', 'teacher_review')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    queued_at TIMESTAMPTZ DEFAULT now(),
    processing_started_at TIMESTAMPTZ NULL,
    processed_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NULL,
    file_deleted_at TIMESTAMPTZ NULL,
    ai_score NUMERIC(5,2) NULL,
    final_score NUMERIC(5,2) NULL,
    percentage NUMERIC(5,2) NULL,
    criteria_json JSONB NULL,
    ai_feedback TEXT NULL,
    ai_original_score NUMERIC(5,2) NULL,
    teacher_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
    teacher_adjustment_reason TEXT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ai_challenge_submissions_unique_student UNIQUE (challenge_id, student_id)
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ai_challenges_classroom_id ON public.ai_challenges(classroom_id);
CREATE INDEX IF NOT EXISTS idx_ai_challenges_created_by ON public.ai_challenges(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_challenges_status ON public.ai_challenges(status);
CREATE INDEX IF NOT EXISTS idx_ai_challenges_created_at ON public.ai_challenges(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_challenge_sub_challenge_id ON public.ai_challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_ai_challenge_sub_student_id ON public.ai_challenge_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_challenge_sub_status ON public.ai_challenge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_ai_challenge_sub_final_score ON public.ai_challenge_submissions(challenge_id, final_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ai_challenge_sub_expires_at ON public.ai_challenge_submissions(expires_at) WHERE file_deleted_at IS NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.ai_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_challenge_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for ai_challenges
DO $$
BEGIN
    DROP POLICY IF EXISTS "Challenges viewable by classroom members" ON public.ai_challenges;
    CREATE POLICY "Challenges viewable by classroom members" ON public.ai_challenges
        FOR SELECT USING (
            auth.uid() = created_by OR
            EXISTS (
                SELECT 1 FROM public.classroom_students cs
                WHERE cs.classroom_id = ai_challenges.classroom_id AND cs.student_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM public.classrooms c
                WHERE c.id = ai_challenges.classroom_id AND c.teacher_id = auth.uid()
            ) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );

    DROP POLICY IF EXISTS "Teachers can insert challenges" ON public.ai_challenges;
    CREATE POLICY "Teachers can insert challenges" ON public.ai_challenges
        FOR INSERT WITH CHECK (
            auth.uid() = created_by OR
            EXISTS (
                SELECT 1 FROM public.classrooms c
                WHERE c.id = ai_challenges.classroom_id AND c.teacher_id = auth.uid()
            ) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
        );

    DROP POLICY IF EXISTS "Teachers can update their challenges" ON public.ai_challenges;
    CREATE POLICY "Teachers can update their challenges" ON public.ai_challenges
        FOR UPDATE USING (
            auth.uid() = created_by OR
            EXISTS (
                SELECT 1 FROM public.classrooms c
                WHERE c.id = ai_challenges.classroom_id AND c.teacher_id = auth.uid()
            ) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );

    DROP POLICY IF EXISTS "Teachers can delete their challenges" ON public.ai_challenges;
    CREATE POLICY "Teachers can delete their challenges" ON public.ai_challenges
        FOR DELETE USING (
            auth.uid() = created_by OR
            EXISTS (
                SELECT 1 FROM public.classrooms c
                WHERE c.id = ai_challenges.classroom_id AND c.teacher_id = auth.uid()
            ) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 6. RLS Policies for ai_challenge_submissions
DO $$
BEGIN
    DROP POLICY IF EXISTS "Submissions viewable by owner student or teacher" ON public.ai_challenge_submissions;
    CREATE POLICY "Submissions viewable by owner student or teacher" ON public.ai_challenge_submissions
        FOR SELECT USING (
            auth.uid() = student_id OR
            EXISTS (
                SELECT 1 FROM public.ai_challenges ac
                JOIN public.classrooms c ON c.id = ac.classroom_id
                WHERE ac.id = ai_challenge_submissions.challenge_id AND (ac.created_by = auth.uid() OR c.teacher_id = auth.uid())
            ) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );

    DROP POLICY IF EXISTS "Students can insert their own submissions" ON public.ai_challenge_submissions;
    CREATE POLICY "Students can insert their own submissions" ON public.ai_challenge_submissions
        FOR INSERT WITH CHECK (
            auth.uid() = student_id OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
        );

    DROP POLICY IF EXISTS "Students or teachers can update submissions" ON public.ai_challenge_submissions;
    CREATE POLICY "Students or teachers can update submissions" ON public.ai_challenge_submissions
        FOR UPDATE USING (
            auth.uid() = student_id OR
            EXISTS (
                SELECT 1 FROM public.ai_challenges ac
                JOIN public.classrooms c ON c.id = ac.classroom_id
                WHERE ac.id = ai_challenge_submissions.challenge_id AND (ac.created_by = auth.uid() OR c.teacher_id = auth.uid())
            ) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
