-- ============================================================================
-- EDTECHRA-BITZ: One-Minute Readings & AI-Prompt Polls Migration
-- ============================================================================

-- 1. One-Minute Readings Table
CREATE TABLE IF NOT EXISTS public.readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT DEFAULT 'General',
  level TEXT DEFAULT 'A2',
  reading_time INTEGER DEFAULT 1,
  paragraphs JSONB NOT NULL,
  vocabulary JSONB DEFAULT '[]'::jsonb,
  questions JSONB DEFAULT '[]'::jsonb,
  cover_image_url TEXT,
  cover_image_object_key TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Reading Completions Table (Track students who completed a reading)
CREATE TABLE IF NOT EXISTS public.reading_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id UUID NOT NULL REFERENCES public.readings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_reading_user_completion UNIQUE (reading_id, user_id)
);

-- 3. Polls Table
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  category TEXT DEFAULT 'General',
  allow_multiple BOOLEAN DEFAULT FALSE,
  show_results_after_vote BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  total_votes INTEGER DEFAULT 0,
  prompt TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Poll Votes Table
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  selected_options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_poll_user_vote UNIQUE (poll_id, user_id)
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_readings_published ON public.readings(is_published);
CREATE INDEX IF NOT EXISTS idx_readings_category ON public.readings(category);
CREATE INDEX IF NOT EXISTS idx_readings_created_at ON public.readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_completions_user ON public.reading_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_completions_reading ON public.reading_completions(reading_id);

CREATE INDEX IF NOT EXISTS idx_polls_published ON public.polls(is_published);
CREATE INDEX IF NOT EXISTS idx_polls_category ON public.polls(category);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_user ON public.poll_votes(poll_id, user_id);

-- 6. Row Level Security (RLS)
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Readings Policies
DROP POLICY IF EXISTS "Public read published readings" ON public.readings;
CREATE POLICY "Public read published readings"
  ON public.readings FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage readings" ON public.readings;
CREATE POLICY "Admins manage readings"
  ON public.readings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reading Completions Policies
DROP POLICY IF EXISTS "Users view own reading_completions" ON public.reading_completions;
CREATE POLICY "Users view own reading_completions"
  ON public.reading_completions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own reading_completions" ON public.reading_completions;
CREATE POLICY "Users insert own reading_completions"
  ON public.reading_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Polls Policies
DROP POLICY IF EXISTS "Public read published polls" ON public.polls;
CREATE POLICY "Public read published polls"
  ON public.polls FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage polls" ON public.polls;
CREATE POLICY "Admins manage polls"
  ON public.polls FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Poll Votes Policies
DROP POLICY IF EXISTS "Public read poll_votes" ON public.poll_votes;
CREATE POLICY "Public read poll_votes"
  ON public.poll_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users insert own poll_votes" ON public.poll_votes;
CREATE POLICY "Users insert own poll_votes"
  ON public.poll_votes FOR INSERT
  WITH CHECK (true);

-- 7. Permissions Grant
GRANT ALL ON public.readings TO anon, authenticated, service_role;
GRANT ALL ON public.reading_completions TO anon, authenticated, service_role;
GRANT ALL ON public.polls TO anon, authenticated, service_role;
GRANT ALL ON public.poll_votes TO anon, authenticated, service_role;
