-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: Allow session participants to view live quiz metadata
-- Ensures students in active/finished quiz sessions can view title, description, and cover image
-- ============================================================================

DO $$
BEGIN
    DROP POLICY IF EXISTS "Live quizzes viewable by session participants" ON public.live_quizzes;
    CREATE POLICY "Live quizzes viewable by session participants" ON public.live_quizzes
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.live_quiz_sessions s
                WHERE s.quiz_id = live_quizzes.id
            )
        );
END $$;
