-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: FIX EXAM ACCESS & LIBRARY RLS
-- Fixes published exam blank screen by ensuring classroom members can read published exams
-- without cross-table RLS recursion or strict role constraint failures.
-- ============================================================================

-- 1. Update Student Exam Read Policy using security definer helper
DROP POLICY IF EXISTS "Students read published classroom exams" ON public.classroom_exams;
DROP POLICY IF EXISTS "Exams viewable by classroom members" ON public.classroom_exams;

CREATE POLICY "Students read published classroom exams"
  ON public.classroom_exams
  FOR SELECT
  USING (
    status IN ('published', 'scheduled', 'active', 'closed')
    AND (
      public.check_is_classroom_member(classroom_id, auth.uid())
      OR public.check_is_classroom_teacher(classroom_id, auth.uid())
      OR public.is_admin()
    )
  );

-- 2. Ensure survey_settings, theme_config, and brand_kit have safe default jsonb for all rows
UPDATE public.classroom_exams
SET survey_settings = '{}'::jsonb
WHERE survey_settings IS NULL;

UPDATE public.classroom_exams
SET theme_config = '{}'::jsonb
WHERE theme_config IS NULL;

UPDATE public.classroom_exams
SET brand_kit = '{}'::jsonb
WHERE brand_kit IS NULL;
