-- ============================================================================
-- EDTECHRA-BITZ: Live Quiz Lifecycle & Scheduled Quiz State Support
-- ============================================================================

-- 1. Safely update live_quiz_sessions status constraint to include 'scheduled', 'completed', and 'draft'
DO $$
BEGIN
    ALTER TABLE public.live_quiz_sessions DROP CONSTRAINT IF EXISTS live_quiz_sessions_status_check;
    ALTER TABLE public.live_quiz_sessions ADD CONSTRAINT live_quiz_sessions_status_check 
        CHECK (status IN ('scheduled', 'lobby', 'in_progress', 'reveal', 'finished', 'completed', 'cancelled', 'draft'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Safely add scheduled_start_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'live_quiz_sessions' 
        AND column_name = 'scheduled_start_at'
    ) THEN
        ALTER TABLE public.live_quiz_sessions ADD COLUMN scheduled_start_at TIMESTAMPTZ NULL;
    END IF;
END $$;

-- 3. Index for quick query of scheduled sessions
CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_scheduled_start 
    ON public.live_quiz_sessions(scheduled_start_at)
    WHERE scheduled_start_at IS NOT NULL;
