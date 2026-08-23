-- ============================================================================
-- EDTECHRA-BITZ: Spelling Flip Card Schema Migration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spelling_flip_cards (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('easy', 'intermediate', 'hard')),
    category TEXT DEFAULT 'General',
    memorize_seconds INTEGER NOT NULL DEFAULT 30,
    xp INTEGER NOT NULL DEFAULT 10,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast feed queries filtered by published status and level
CREATE INDEX IF NOT EXISTS idx_spelling_flip_cards_published_level 
ON public.spelling_flip_cards (is_published, level, created_at DESC);

-- Completions table for tracking student attempts
CREATE TABLE IF NOT EXISTS public.spelling_flip_completions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES public.spelling_flip_cards(id) ON DELETE CASCADE,
    user_word TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    time_taken_seconds NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spelling_flip_completions_user_card 
ON public.spelling_flip_completions (user_id, card_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.spelling_flip_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spelling_flip_completions ENABLE ROW LEVEL SECURITY;

-- Read policies: Published cards viewable by all authenticated & anonymous users
CREATE POLICY "Allow public read access for published spelling flip cards"
ON public.spelling_flip_cards FOR SELECT
USING (is_published = true);

-- Completions: Users can view and insert their own completions
CREATE POLICY "Allow users to view own spelling flip completions"
ON public.spelling_flip_completions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert own spelling flip completions"
ON public.spelling_flip_completions FOR INSERT
WITH CHECK (auth.uid() = user_id);
