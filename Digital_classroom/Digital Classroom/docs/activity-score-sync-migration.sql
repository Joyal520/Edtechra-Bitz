CREATE TABLE IF NOT EXISTS public.activity_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_slug TEXT NOT NULL,
    day_number INT NOT NULL,
    unit_number INT,
    reading_score INT DEFAULT 0,
    listening_score INT DEFAULT 0,
    vocabulary_score INT DEFAULT 0,
    day_score INT NOT NULL DEFAULT 0,
    unit_score INT NOT NULL DEFAULT 0,
    total_score_so_far INT DEFAULT 0,
    max_score INT DEFAULT 100,
    total_days INT DEFAULT 7,
    completed_days JSONB DEFAULT '[]'::jsonb,
    answers JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (assignment_id, student_id, activity_slug, day_number)
);

ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS activity_slug TEXT NOT NULL DEFAULT 'deep-ocean-7-day';
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS day_number INT NOT NULL DEFAULT 1;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS unit_number INT;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS reading_score INT DEFAULT 0;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS listening_score INT DEFAULT 0;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS vocabulary_score INT DEFAULT 0;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS day_score INT NOT NULL DEFAULT 0;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS unit_score INT NOT NULL DEFAULT 0;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS total_score_so_far INT DEFAULT 0;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS max_score INT DEFAULT 100;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS total_days INT DEFAULT 7;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS completed_days JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.activity_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'activity_submissions_assignment_student_activity_day_key'
    ) THEN
        ALTER TABLE public.activity_submissions
            ADD CONSTRAINT activity_submissions_assignment_student_activity_day_key
            UNIQUE (assignment_id, student_id, activity_slug, day_number);
    END IF;
END $$;

ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS score INT NOT NULL DEFAULT 0;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS progress_percent INT NOT NULL DEFAULT 0;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS completed_days JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_activity_submissions_assignment_student
    ON public.activity_submissions (assignment_id, student_id, activity_slug);

CREATE INDEX IF NOT EXISTS idx_classroom_points_assignment_submission
    ON public.classroom_points (assignment_submission_id);

ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'activity_submissions'
          AND policyname = 'Students view own activity submissions'
    ) THEN
        CREATE POLICY "Students view own activity submissions"
            ON public.activity_submissions
            FOR SELECT
            USING (auth.uid() = student_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'activity_submissions'
          AND policyname = 'Teachers view classroom activity submissions'
    ) THEN
        CREATE POLICY "Teachers view classroom activity submissions"
            ON public.activity_submissions
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = activity_submissions.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;
