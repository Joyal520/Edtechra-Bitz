-- ============================================================================
-- EDTECHRA-BITZ: Personal Teacher Game Library
-- Stores reusable multi-level educational game templates per teacher.
-- Classroom assignments store independent snapshots so editing or deleting
-- a saved library game never alters historical assignments or student scores.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_game_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL CHECK (game_id IN (
        'liquid-sentences',
        'save-the-balloon',
        'memory-match',
        'classroom-jigsaw',
        'lumina-words'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    thumbnail_url TEXT NOT NULL,
    unlock_mode TEXT NOT NULL DEFAULT 'sequential' CHECK (unlock_mode IN (
        'sequential',
        'scheduled',
        'daily_limit'
    )),
    daily_limit INTEGER NOT NULL DEFAULT 1,
    levels JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_game_library_teacher_updated
    ON public.teacher_game_library(teacher_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_game_library_game_id
    ON public.teacher_game_library(game_id);

ALTER TABLE public.teacher_game_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own saved games" ON public.teacher_game_library;
CREATE POLICY "Teachers can view own saved games"
    ON public.teacher_game_library
    FOR SELECT
    TO authenticated
    USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can insert own saved games" ON public.teacher_game_library;
CREATE POLICY "Teachers can insert own saved games"
    ON public.teacher_game_library
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can update own saved games" ON public.teacher_game_library;
CREATE POLICY "Teachers can update own saved games"
    ON public.teacher_game_library
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can delete own saved games" ON public.teacher_game_library;
CREATE POLICY "Teachers can delete own saved games"
    ON public.teacher_game_library
    FOR DELETE
    TO authenticated
    USING (auth.uid() = teacher_id);
