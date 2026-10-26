-- ============================================================================
-- Migration: Add Teacher-Controlled Leaderboard Reset fields to classrooms
-- ============================================================================

DO $$
BEGIN
    -- 1. Add leaderboard_reset_frequency
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'classrooms' 
        AND column_name = 'leaderboard_reset_frequency'
    ) THEN
        ALTER TABLE public.classrooms 
        ADD COLUMN leaderboard_reset_frequency TEXT NOT NULL DEFAULT 'never';
        
        ALTER TABLE public.classrooms
        ADD CONSTRAINT classrooms_leaderboard_reset_frequency_check
        CHECK (leaderboard_reset_frequency IN ('never', 'daily', 'weekly', 'monthly'));
    END IF;

    -- 2. Add leaderboard_reset_at (timestamp when current leaderboard period started)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'classrooms' 
        AND column_name = 'leaderboard_reset_at'
    ) THEN
        ALTER TABLE public.classrooms 
        ADD COLUMN leaderboard_reset_at TIMESTAMPTZ;
    END IF;

    -- 3. Add leaderboard_next_reset_at (timestamp when next scheduled reset will occur)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'classrooms' 
        AND column_name = 'leaderboard_next_reset_at'
    ) THEN
        ALTER TABLE public.classrooms 
        ADD COLUMN leaderboard_next_reset_at TIMESTAMPTZ;
    END IF;

    -- 4. Add leaderboard_timezone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'classrooms' 
        AND column_name = 'leaderboard_timezone'
    ) THEN
        ALTER TABLE public.classrooms 
        ADD COLUMN leaderboard_timezone TEXT DEFAULT 'Asia/Colombo';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classrooms_leaderboard_next_reset_at 
ON public.classrooms(leaderboard_next_reset_at) 
WHERE leaderboard_reset_frequency <> 'never';
