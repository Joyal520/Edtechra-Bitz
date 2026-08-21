-- ============================================================================
-- EDTECHRA-BITZ: Interactive Quiz Bits & Attempts System Migration
-- ============================================================================

-- 1. Quiz Bits Table
CREATE TABLE IF NOT EXISTS public.quiz_bits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  difficulty TEXT DEFAULT 'Easy',
  xp INTEGER DEFAULT 10,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  import_batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quiz Attempts Table (allows retry after wrong answers; XP awarded once upon first correct answer)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quiz_bits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_bits_published ON public.quiz_bits(is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_bits_category ON public.quiz_bits(category);
CREATE INDEX IF NOT EXISTS idx_quiz_bits_created_at ON public.quiz_bits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_bits_batch ON public.quiz_bits(import_batch_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON public.quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_correct ON public.quiz_attempts(user_id, is_correct);

-- 4. Row Level Security (RLS)
ALTER TABLE public.quiz_bits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quiz Bits Policies
DROP POLICY IF EXISTS "Public read published quiz_bits" ON public.quiz_bits;
CREATE POLICY "Public read published quiz_bits"
  ON public.quiz_bits FOR SELECT
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage quiz_bits" ON public.quiz_bits;
CREATE POLICY "Admins manage quiz_bits"
  ON public.quiz_bits FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Quiz Attempts Policies
DROP POLICY IF EXISTS "Users view own quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "Users view own quiz_attempts"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users insert own quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "Authenticated users insert own quiz_attempts"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Permissions Grant
GRANT ALL ON public.quiz_bits TO anon, authenticated, service_role;
GRANT ALL ON public.quiz_attempts TO anon, authenticated, service_role;
