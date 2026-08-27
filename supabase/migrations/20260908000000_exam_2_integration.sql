-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: EXAM 2.0 SAFE INTEGRATION MIGRATION
-- Adds support for Exam 2.0 full-stack capabilities, Cloudflare R2 storage
-- references, AI evaluation report tracking, teacher isolation, and RLS.
-- ============================================================================

-- 1. Safely extend public.classroom_exams with Exam 2.0 columns
ALTER TABLE public.classroom_exams
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'Unit Test',
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Mixed',
  ADD COLUMN IF NOT EXISTS grading_mode TEXT DEFAULT 'Hybrid Grading',
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS show_marks_immediately BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_correct_answers BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS exam_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'exam2',
  ADD COLUMN IF NOT EXISTS r2_file_key TEXT,
  ADD COLUMN IF NOT EXISTS r2_storage_provider TEXT DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill teacher_id from created_by where missing
UPDATE public.classroom_exams
SET teacher_id = created_by
WHERE teacher_id IS NULL AND created_by IS NOT NULL;

-- 2. Safely extend public.classroom_exam_results with Exam 2.0 result & R2 report columns
ALTER TABLE public.classroom_exam_results
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_score NUMERIC NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS breakdown_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feedback_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS teacher_feedback TEXT,
  ADD COLUMN IF NOT EXISTS time_taken_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS report_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'cloudflare_r2',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_classroom_exams_teacher_id ON public.classroom_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_status ON public.classroom_exams(status);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_r2_key ON public.classroom_exams(r2_file_key);
CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_report_r2 ON public.classroom_exam_results(report_r2_key);

-- 4. Create compatibility views for public.exams and public.exam_results if tables don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exams') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.exams AS
      SELECT
        id,
        classroom_id,
        COALESCE(teacher_id, created_by) AS teacher_id,
        title,
        description,
        exam_type,
        difficulty,
        duration_minutes,
        total_marks,
        status,
        starts_at,
        ends_at,
        max_attempts,
        show_marks_immediately,
        show_correct_answers,
        allow_late_submission,
        password,
        exam_config_json,
        COALESCE(NULLIF(questions_json, ''[]''::jsonb), questions) AS questions_json,
        source,
        r2_file_key,
        created_at,
        updated_at,
        published_at
      FROM public.classroom_exams;
    ';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exam_results') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW public.exam_results AS
      SELECT
        id,
        exam_id,
        classroom_id,
        student_id,
        attempt_number,
        answers AS answers_json,
        score,
        total_marks AS max_score,
        percentage,
        grade,
        status,
        breakdown_json,
        feedback_json,
        teacher_feedback,
        report_r2_key,
        report_status,
        started_at,
        submitted_at,
        reviewed_at,
        created_at,
        updated_at
      FROM public.classroom_exam_results;
    ';
  END IF;
END $$;

-- 5. Row Level Security Policies
ALTER TABLE public.classroom_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_exam_results ENABLE ROW LEVEL SECURITY;

-- Ensure teacher ownership policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'classroom_exams' AND policyname = 'Teachers manage their own exams'
  ) THEN
    CREATE POLICY "Teachers manage their own exams"
      ON public.classroom_exams
      FOR ALL
      USING (
        created_by = auth.uid()
        OR teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.classrooms c
          WHERE c.id = classroom_exams.classroom_id AND c.teacher_id = auth.uid()
        )
      )
      WITH CHECK (
        created_by = auth.uid()
        OR teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.classrooms c
          WHERE c.id = classroom_exams.classroom_id AND c.teacher_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Ensure students read published classroom exams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'classroom_exams' AND policyname = 'Students read published classroom exams'
  ) THEN
    CREATE POLICY "Students read published classroom exams"
      ON public.classroom_exams
      FOR SELECT
      USING (
        status IN ('published', 'scheduled', 'active', 'closed')
        AND EXISTS (
          SELECT 1 FROM public.classroom_members cm
          WHERE cm.classroom_id = classroom_exams.classroom_id
            AND cm.profile_id = auth.uid()
            AND cm.role = 'student'
        )
      );
  END IF;
END $$;
