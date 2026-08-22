-- ============================================================================
-- EDTECHRA-BITZ: Spelling Scramble Activities & Completion Persistence Migration
-- ============================================================================

-- 1. Main spelling_scrambles metadata table
CREATE TABLE IF NOT EXISTS public.spelling_scrambles (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  scrambled_letters JSONB NOT NULL DEFAULT '[]'::jsonb,
  clue TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Vocabulary',
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  xp INTEGER NOT NULL DEFAULT 10,
  timer_seconds INTEGER NOT NULL DEFAULT 30,
  r2_content_key TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  import_batch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for high performance feed and admin queries
CREATE INDEX IF NOT EXISTS idx_spelling_scrambles_published ON public.spelling_scrambles(is_published);
CREATE INDEX IF NOT EXISTS idx_spelling_scrambles_difficulty ON public.spelling_scrambles(difficulty);
CREATE INDEX IF NOT EXISTS idx_spelling_scrambles_category ON public.spelling_scrambles(category);
CREATE INDEX IF NOT EXISTS idx_spelling_scrambles_created_at ON public.spelling_scrambles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spelling_scrambles_batch ON public.spelling_scrambles(import_batch_id);

-- 3. Student completions table (guarantees XP awarded once per activity)
CREATE TABLE IF NOT EXISTS public.spelling_scramble_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scramble_id TEXT NOT NULL REFERENCES public.spelling_scrambles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL DEFAULT true,
  time_taken_seconds INTEGER,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scramble_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_scramble_completions_user ON public.spelling_scramble_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_scramble_completions_scramble ON public.spelling_scramble_completions(scramble_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.spelling_scrambles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spelling_scramble_completions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for spelling_scrambles
-- Public read for published scrambles
CREATE POLICY "Public can view published spelling scrambles"
  ON public.spelling_scrambles
  FOR SELECT
  USING (is_published = true);

-- Admins can view all, insert, update, and delete
CREATE POLICY "Admins can manage all spelling scrambles"
  ON public.spelling_scrambles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- 6. RLS Policies for spelling_scramble_completions
-- Users can view their own completions
CREATE POLICY "Users can view their own scramble completions"
  ON public.spelling_scramble_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can record their scramble completions"
  ON public.spelling_scramble_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
