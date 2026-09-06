-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: EXAM PLATFORM REBUILD MIGRATION
-- Supports: multi-attempts, session autosave, server-authoritative timer,
-- subjective question grading status, and exam delivery configurations.
-- ============================================================================

-- 1. Safely enhance public.classroom_exams
ALTER TABLE public.classroom_exams
  ADD COLUMN IF NOT EXISTS score_policy TEXT DEFAULT 'highest' CHECK (score_policy IN ('highest', 'latest', 'average')),
  ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pass_percentage NUMERIC NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS pedagogical_config JSONB DEFAULT '{}'::jsonb;

-- 2. Safely upgrade public.classroom_exam_results for multi-attempts and session persistence
-- Drop old single unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'classroom_exam_results_exam_id_student_id_key'
      AND table_name = 'classroom_exam_results'
  ) THEN
    ALTER TABLE public.classroom_exam_results
      DROP CONSTRAINT classroom_exam_results_exam_id_student_id_key;
  END IF;
END $$;

-- Add new columns for session autosave and grading
ALTER TABLE public.classroom_exam_results
  ADD COLUMN IF NOT EXISTS session_answers JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS bookmarked_question_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grading_status TEXT DEFAULT 'auto_graded' CHECK (grading_status IN ('auto_graded', 'pending_review', 'reviewed')),
  ADD COLUMN IF NOT EXISTS subjective_scores JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subjective_feedbacks JSONB DEFAULT '{}'::jsonb;

-- Add new composite unique constraint for multi-attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'classroom_exam_results_exam_student_attempt_key'
      AND table_name = 'classroom_exam_results'
  ) THEN
    ALTER TABLE public.classroom_exam_results
      ADD CONSTRAINT classroom_exam_results_exam_student_attempt_key
      UNIQUE (exam_id, student_id, attempt_number);
  END IF;
END $$;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_grading_status
  ON public.classroom_exam_results(exam_id, grading_status);

CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_student_active
  ON public.classroom_exam_results(exam_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_expires_at
  ON public.classroom_exam_results(expires_at)
  WHERE status = 'in_progress';

-- 4. Safe RLS update for students updating in-progress attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'classroom_exam_results' AND policyname = 'Students can update their own in_progress exam attempt'
  ) THEN
    CREATE POLICY "Students can update their own in_progress exam attempt"
      ON public.classroom_exam_results
      FOR UPDATE
      USING (
        student_id = auth.uid()
        AND status = 'in_progress'
      )
      WITH CHECK (
        student_id = auth.uid()
      );
  END IF;
END $$;
