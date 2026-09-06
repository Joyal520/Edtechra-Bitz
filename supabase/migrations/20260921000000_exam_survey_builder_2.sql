-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: EXAM & SURVEY BUILDER 2.0 MIGRATION
-- Supports: Dual Exam/Survey mode, Canva-style visual themes, brand kits,
-- conditional branching logic, survey responses, and teacher Question Bank.
-- ============================================================================

-- 1. Safely extend public.classroom_exams
ALTER TABLE public.classroom_exams
  ADD COLUMN IF NOT EXISTS assessment_type TEXT NOT NULL DEFAULT 'exam' CHECK (assessment_type IN ('exam', 'survey')),
  ADD COLUMN IF NOT EXISTS theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_kit JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS branching_logic JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS survey_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Safely extend public.classroom_exam_results for survey responses
ALTER TABLE public.classroom_exam_results
  ADD COLUMN IF NOT EXISTS is_survey_response BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS survey_response JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Create reusable Question Bank table
CREATE TABLE IF NOT EXISTS public.assessment_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject TEXT,
  grade TEXT,
  difficulty TEXT DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_teacher ON public.assessment_question_bank(teacher_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_type ON public.assessment_question_bank(question_type);
CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON public.assessment_question_bank(subject);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_type ON public.classroom_exams(assessment_type);

-- 4. Enable RLS on Question Bank
ALTER TABLE public.assessment_question_bank ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'assessment_question_bank' AND policyname = 'Teachers can manage their own question bank'
  ) THEN
    CREATE POLICY "Teachers can manage their own question bank"
      ON public.assessment_question_bank
      FOR ALL
      USING (teacher_id = auth.uid())
      WITH CHECK (teacher_id = auth.uid());
  END IF;
END $$;
