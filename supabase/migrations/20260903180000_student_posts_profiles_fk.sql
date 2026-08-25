-- ============================================================================
-- EDTECHRA-BITZ: Student Posts Profiles Foreign Key Relationship
-- Allows PostgREST to join student_posts with public.profiles
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'student_posts_user_id_profiles_fk' 
      AND table_name = 'student_posts'
  ) THEN
    ALTER TABLE public.student_posts
    ADD CONSTRAINT student_posts_user_id_profiles_fk
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
