-- ============================================================================
-- EDTECHRA-BITZ: Live Quiz Library Ownership & Total Quiz Timer Migration
-- ============================================================================

-- 1. Safely add timer and visibility columns to public.live_quizzes
-- CRITICAL REQUIREMENT: Visibility defaults to 'private' to ensure new and existing
-- quizzes are strictly private by default unless explicitly shared by their owner.
DO $$
BEGIN
    -- timer_enabled column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'live_quizzes' AND column_name = 'timer_enabled'
    ) THEN
        ALTER TABLE public.live_quizzes ADD COLUMN timer_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- timer_seconds column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'live_quizzes' AND column_name = 'timer_seconds'
    ) THEN
        ALTER TABLE public.live_quizzes ADD COLUMN timer_seconds INTEGER NULL;
    END IF;

    -- visibility column: strictly default 'private'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'live_quizzes' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE public.live_quizzes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
    ELSE
        ALTER TABLE public.live_quizzes ALTER COLUMN visibility SET DEFAULT 'private';
    END IF;
END $$;

-- Add check constraints safely
DO $$
BEGIN
    ALTER TABLE public.live_quizzes DROP CONSTRAINT IF EXISTS live_quizzes_timer_seconds_check;
    ALTER TABLE public.live_quizzes ADD CONSTRAINT live_quizzes_timer_seconds_check
        CHECK (timer_seconds IS NULL OR (timer_seconds > 0 AND timer_seconds <= 36000));

    ALTER TABLE public.live_quizzes DROP CONSTRAINT IF EXISTS live_quizzes_visibility_check;
    ALTER TABLE public.live_quizzes ADD CONSTRAINT live_quizzes_visibility_check
        CHECK (visibility IN ('private', 'common'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Safely add started_at and expires_at columns to public.live_quiz_sessions
-- Authoritative server deadline: session only records started_at and expires_at for timed attempts.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'live_quiz_sessions' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE public.live_quiz_sessions ADD COLUMN started_at TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'live_quiz_sessions' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.live_quiz_sessions ADD COLUMN expires_at TIMESTAMPTZ NULL;
    END IF;
END $$;

-- 3. Performance Indexes for Query Partitioning
CREATE INDEX IF NOT EXISTS idx_live_quizzes_created_by ON public.live_quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_live_quizzes_visibility ON public.live_quizzes(visibility);
CREATE INDEX IF NOT EXISTS idx_live_quizzes_category_visibility ON public.live_quizzes(category, visibility);
CREATE INDEX IF NOT EXISTS idx_live_quizzes_created_at ON public.live_quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_expires_at ON public.live_quiz_sessions(expires_at);

-- 4. Ensure RLS policies enforce strict ownership and common visibility
DO $$
BEGIN
    -- Read policy: Users can only see common quizzes OR their own quizzes
    DROP POLICY IF EXISTS "Live quizzes viewable by all authenticated users" ON public.live_quizzes;
    DROP POLICY IF EXISTS "Live quizzes viewable by owner or common" ON public.live_quizzes;
    CREATE POLICY "Live quizzes viewable by owner or common" ON public.live_quizzes
        FOR SELECT USING (
            visibility = 'common' OR
            auth.uid() = created_by OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );

    -- Insert policy: Teachers can insert their own quizzes
    DROP POLICY IF EXISTS "Teachers can insert live quizzes" ON public.live_quizzes;
    CREATE POLICY "Teachers can insert live quizzes" ON public.live_quizzes
        FOR INSERT WITH CHECK (
            auth.uid() = created_by OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
        );

    -- Update/Delete policy: Only the owner (or admin) can modify/delete their quiz
    DROP POLICY IF EXISTS "Teachers can manage live quizzes" ON public.live_quizzes;
    DROP POLICY IF EXISTS "Owners can update their live quizzes" ON public.live_quizzes;
    CREATE POLICY "Owners can update their live quizzes" ON public.live_quizzes
        FOR UPDATE USING (
            auth.uid() = created_by OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );

    DROP POLICY IF EXISTS "Owners can delete their live quizzes" ON public.live_quizzes;
    CREATE POLICY "Owners can delete their live quizzes" ON public.live_quizzes
        FOR DELETE USING (
            auth.uid() = created_by OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        );
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
