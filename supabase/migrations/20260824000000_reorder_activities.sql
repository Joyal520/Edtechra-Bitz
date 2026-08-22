-- ============================================================================
-- EDTECHRA-BITZ: Interactive Sentence Reorder Activities & Completions Migration
-- ============================================================================

-- 1. Sentence Reorder Activities Table
CREATE TABLE IF NOT EXISTS public.reorder_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentence TEXT NOT NULL,
  scrambled_words JSONB NOT NULL,
  correct_order JSONB NOT NULL,
  category TEXT DEFAULT 'Grammar',
  level TEXT DEFAULT 'A1',
  xp INTEGER DEFAULT 10,
  hint TEXT,
  explanation TEXT,
  r2_content_key TEXT,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  import_batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sentence Reorder Completions Table (Records student completions & XP awards)
CREATE TABLE IF NOT EXISTS public.reorder_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.reorder_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  user_order JSONB NOT NULL,
  xp_awarded INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_reorder_user_completion UNIQUE (activity_id, user_id)
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reorder_activities_published ON public.reorder_activities(is_published);
CREATE INDEX IF NOT EXISTS idx_reorder_activities_category ON public.reorder_activities(category);
CREATE INDEX IF NOT EXISTS idx_reorder_activities_level ON public.reorder_activities(level);
CREATE INDEX IF NOT EXISTS idx_reorder_activities_created_at ON public.reorder_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reorder_activities_r2_key ON public.reorder_activities(r2_content_key);
CREATE INDEX IF NOT EXISTS idx_reorder_activities_batch ON public.reorder_activities(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_reorder_completions_user ON public.reorder_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_reorder_completions_activity ON public.reorder_completions(activity_id);
CREATE INDEX IF NOT EXISTS idx_reorder_completions_user_activity ON public.reorder_completions(user_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_reorder_completions_user_correct ON public.reorder_completions(user_id, is_correct);

-- 4. Row Level Security (RLS)
ALTER TABLE public.reorder_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_completions ENABLE ROW LEVEL SECURITY;

-- Reorder Activities Policies
DROP POLICY IF EXISTS "Public read published reorder_activities" ON public.reorder_activities;
CREATE POLICY "Public read published reorder_activities"
  ON public.reorder_activities FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage reorder_activities" ON public.reorder_activities;
CREATE POLICY "Admins manage reorder_activities"
  ON public.reorder_activities FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Reorder Completions Policies
DROP POLICY IF EXISTS "Users view own reorder_completions" ON public.reorder_completions;
CREATE POLICY "Users view own reorder_completions"
  ON public.reorder_completions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users insert own reorder_completions" ON public.reorder_completions;
CREATE POLICY "Users insert own reorder_completions"
  ON public.reorder_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Permissions Grant
GRANT ALL ON public.reorder_activities TO anon, authenticated, service_role;
GRANT ALL ON public.reorder_completions TO anon, authenticated, service_role;
