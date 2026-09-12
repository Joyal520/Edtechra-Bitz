-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: Add cover_image to live_quizzes
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'live_quizzes' AND column_name = 'cover_image'
    ) THEN
        ALTER TABLE public.live_quizzes ADD COLUMN cover_image TEXT NULL;
    END IF;
END $$;
