-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: EXAM REPUBLISHING, TEMPLATES & VERSIONING
-- Adds support for reusable exam templates, multi-class republishing,
-- version-safe editing, and class-isolated attempt tracking.
-- ============================================================================

-- 1. Safely add parent_exam_id, is_template, and version to public.classroom_exams
ALTER TABLE public.classroom_exams
  ADD COLUMN IF NOT EXISTS parent_exam_id UUID REFERENCES public.classroom_exams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 2. Allow classroom_id to be NULL for standalone master exam templates if needed
ALTER TABLE public.classroom_exams
  ALTER COLUMN classroom_id DROP NOT NULL;

-- 3. Create Performance Indexes for parent_exam_id and templates
CREATE INDEX IF NOT EXISTS idx_classroom_exams_parent_id ON public.classroom_exams(parent_exam_id);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_is_template ON public.classroom_exams(is_template);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_version ON public.classroom_exams(version);

-- 4. Update compatibility view public.exams
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'exams') THEN
    CREATE OR REPLACE VIEW public.exams AS
    SELECT
      id,
      classroom_id,
      parent_exam_id,
      is_template,
      version,
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
      COALESCE(NULLIF(questions_json, '[]'::jsonb), questions) AS questions_json,
      source,
      r2_file_key,
      created_at,
      updated_at,
      published_at
    FROM public.classroom_exams;
  END IF;
END $$;
