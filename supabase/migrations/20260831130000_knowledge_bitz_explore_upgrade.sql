-- ============================================================================
-- EDTECHRA-BITZ: Complete Knowledge Bitz Discovery & Learning System Migration
-- Migration: 20260831130000_knowledge_bitz_explore_upgrade.sql
--
-- Includes:
-- 1. knowledge_bitz (Atomic 15-60s learning cards with reading, image, quiz)
-- 2. user_topic_preferences (Persistent multi-device topic customization)
-- 3. user_bookmarks (Universal "My Saved Knowledge" pocket)
-- 4. bitz_likes (Per-user persistent likes)
-- 5. bitz_learning_history (Strict unseen -> seen -> opened -> read -> learned tracking)
-- 6. Server RPCs for personalized feed delivery and safe XP awarding
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: Safe Admin check function
CREATE OR REPLACE FUNCTION public.is_bitz_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF (auth.jwt() ->> 'email') = 'roshanjoyal520@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- 1. Knowledge Bitz Sequence & Table
CREATE SEQUENCE IF NOT EXISTS public.seq_knowledge_bitz_code START 1;

CREATE TABLE IF NOT EXISTS public.knowledge_bitz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitz_code TEXT UNIQUE,
  title TEXT NOT NULL,
  short_fact TEXT NOT NULL,
  reading_text TEXT NOT NULL,
  topic_id TEXT NOT NULL DEFAULT 'science',
  category TEXT NOT NULL DEFAULT 'Science & Nature',
  sub_topic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  reading_time_sec INTEGER NOT NULL DEFAULT 30,
  
  -- Media & Storage
  visual_url TEXT,
  visual_object_key TEXT,
  visual_status TEXT NOT NULL DEFAULT 'missing' CHECK (visual_status IN ('missing', 'generating', 'ready', 'failed')),
  audio_url TEXT,
  
  -- Interactive & Quiz
  quiz JSONB DEFAULT NULL,
  vocabulary JSONB DEFAULT '[]'::jsonb,
  source_citation TEXT,
  
  -- Gamification & Metrics
  xp_value INTEGER NOT NULL DEFAULT 10,
  likes_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  completions_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status & Moderation (Defaults strictly to 'draft')
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-generate bitz_code (e.g. B000001, B000002) if not set
CREATE OR REPLACE FUNCTION public.set_knowledge_bitz_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bitz_code IS NULL OR NEW.bitz_code = '' THEN
    NEW.bitz_code := 'B' || LPAD(nextval('public.seq_knowledge_bitz_code')::TEXT, 6, '0');
  END IF;
  
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_knowledge_bitz_code ON public.knowledge_bitz;
CREATE TRIGGER trg_set_knowledge_bitz_code
  BEFORE INSERT OR UPDATE ON public.knowledge_bitz
  FOR EACH ROW
  EXECUTE FUNCTION public.set_knowledge_bitz_code();

-- Indexes for high-performance feed discovery
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_status_pub ON public.knowledge_bitz(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_topic_status ON public.knowledge_bitz(topic_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_category ON public.knowledge_bitz(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_visual_status ON public.knowledge_bitz(visual_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_created_at ON public.knowledge_bitz(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_likes ON public.knowledge_bitz(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_saves ON public.knowledge_bitz(saves_count DESC);

-- 2. User Topic Preferences Table
CREATE TABLE IF NOT EXISTS public.user_topic_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_topics TEXT[] NOT NULL DEFAULT '{}',
  all_selected BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_topic_preferences_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_topic_preferences_user ON public.user_topic_preferences(user_id);

-- 3. Universal User Bookmarks / Saved Knowledge Table
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bitz_id UUID NOT NULL REFERENCES public.knowledge_bitz(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_bookmarks_user_bitz UNIQUE (user_id, bitz_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_created ON public.user_bookmarks(created_at DESC);

-- 4. Bitz Likes Table
CREATE TABLE IF NOT EXISTS public.bitz_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitz_id UUID NOT NULL REFERENCES public.knowledge_bitz(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bitz_user_like UNIQUE (bitz_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bitz_likes_bitz ON public.bitz_likes(bitz_id);
CREATE INDEX IF NOT EXISTS idx_bitz_likes_user ON public.bitz_likes(user_id);

-- 5. Bitz Learning History Table
CREATE TABLE IF NOT EXISTS public.bitz_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bitz_id UUID NOT NULL REFERENCES public.knowledge_bitz(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'seen' CHECK (status IN ('seen', 'opened', 'read', 'learned')),
  quiz_attempted BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_correct BOOLEAN DEFAULT FALSE,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  learned_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_bitz_learning UNIQUE (user_id, bitz_id)
);

CREATE INDEX IF NOT EXISTS idx_bitz_learning_history_user ON public.bitz_learning_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bitz_learning_history_status ON public.bitz_learning_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bitz_learning_history_bitz ON public.bitz_learning_history(bitz_id);

-- 6. Row Level Security (RLS)
ALTER TABLE public.knowledge_bitz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitz_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitz_learning_history ENABLE ROW LEVEL SECURITY;

-- Knowledge Bitz Policies
DROP POLICY IF EXISTS "Public read published knowledge_bitz" ON public.knowledge_bitz;
CREATE POLICY "Public read published knowledge_bitz"
  ON public.knowledge_bitz FOR SELECT
  USING (status = 'published' OR public.is_bitz_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins insert knowledge_bitz" ON public.knowledge_bitz;
CREATE POLICY "Admins insert knowledge_bitz"
  ON public.knowledge_bitz FOR INSERT
  WITH CHECK (public.is_bitz_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins update knowledge_bitz" ON public.knowledge_bitz;
CREATE POLICY "Admins update knowledge_bitz"
  ON public.knowledge_bitz FOR UPDATE
  USING (public.is_bitz_admin() OR auth.role() = 'service_role')
  WITH CHECK (public.is_bitz_admin() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins delete knowledge_bitz" ON public.knowledge_bitz;
CREATE POLICY "Admins delete knowledge_bitz"
  ON public.knowledge_bitz FOR DELETE
  USING (public.is_bitz_admin() OR auth.role() = 'service_role');

-- User Topic Preferences Policies
DROP POLICY IF EXISTS "Users manage own topic preferences" ON public.user_topic_preferences;
CREATE POLICY "Users manage own topic preferences"
  ON public.user_topic_preferences FOR ALL
  USING (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role');

-- User Bookmarks Policies
DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.user_bookmarks;
CREATE POLICY "Users manage own bookmarks"
  ON public.user_bookmarks FOR ALL
  USING (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role');

-- Bitz Likes Policies
DROP POLICY IF EXISTS "Public read bitz_likes" ON public.bitz_likes;
CREATE POLICY "Public read bitz_likes"
  ON public.bitz_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users manage own bitz_likes" ON public.bitz_likes;
CREATE POLICY "Users manage own bitz_likes"
  ON public.bitz_likes FOR ALL
  USING (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role');

-- Bitz Learning History Policies
DROP POLICY IF EXISTS "Users manage own learning history" ON public.bitz_learning_history;
CREATE POLICY "Users manage own learning history"
  ON public.bitz_learning_history FOR ALL
  USING (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role');

-- Grants
GRANT ALL ON public.knowledge_bitz TO anon, authenticated, service_role;
GRANT ALL ON public.user_topic_preferences TO anon, authenticated, service_role;
GRANT ALL ON public.user_bookmarks TO anon, authenticated, service_role;
GRANT ALL ON public.bitz_likes TO anon, authenticated, service_role;
GRANT ALL ON public.bitz_learning_history TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.seq_knowledge_bitz_code TO anon, authenticated, service_role;

-- ============================================================================
-- 7. High-Performance Server RPC: Record Learning State & Safe Anti-Farming XP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_bitz_learning_state(
  p_bitz_id UUID,
  p_new_status TEXT, -- 'seen', 'opened', 'read', 'learned'
  p_selected_quiz_option TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_bitz public.knowledge_bitz%ROWTYPE;
  v_current_history public.bitz_learning_history%ROWTYPE;
  v_xp_to_award INTEGER := 0;
  v_is_correct BOOLEAN := NULL;
  v_quiz_attempted BOOLEAN := FALSE;
  v_already_learned BOOLEAN := FALSE;
  v_correct_answer TEXT;
BEGIN
  -- Strict authenticated user check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: User authentication required');
  END IF;

  SELECT * INTO v_bitz FROM public.knowledge_bitz WHERE id = p_bitz_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Knowledge Bitz not found');
  END IF;

  SELECT * INTO v_current_history 
  FROM public.bitz_learning_history 
  WHERE user_id = v_user_id AND bitz_id = p_bitz_id;

  IF FOUND AND v_current_history.status = 'learned' THEN
    v_already_learned := TRUE;
  END IF;

  -- Quiz validation if selected against database record
  IF p_selected_quiz_option IS NOT NULL AND v_bitz.quiz IS NOT NULL THEN
    v_quiz_attempted := TRUE;
    v_correct_answer := TRIM(COALESCE(v_bitz.quiz->>'correct_answer', v_bitz.quiz->>'correctAnswer', ''));
    IF LOWER(TRIM(p_selected_quiz_option)) = LOWER(v_correct_answer) THEN
      v_is_correct := TRUE;
      IF NOT v_already_learned THEN
        v_xp_to_award := COALESCE(v_bitz.xp_value, 10);
        p_new_status := 'learned';
      END IF;
    ELSE
      v_is_correct := FALSE;
    END IF;
  ELSIF p_new_status = 'learned' AND NOT v_already_learned THEN
    v_xp_to_award := COALESCE(v_bitz.xp_value, 10);
  END IF;

  -- Upsert learning history (status cannot be reversed from 'learned')
  INSERT INTO public.bitz_learning_history (
    user_id,
    bitz_id,
    status,
    quiz_attempted,
    quiz_correct,
    xp_awarded,
    learned_at,
    last_interaction_at
  )
  VALUES (
    v_user_id,
    p_bitz_id,
    p_new_status,
    v_quiz_attempted,
    v_is_correct,
    v_xp_to_award,
    CASE WHEN p_new_status = 'learned' THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, bitz_id) DO UPDATE SET
    status = CASE 
      WHEN bitz_learning_history.status = 'learned' THEN 'learned'
      ELSE EXCLUDED.status
    END,
    quiz_attempted = bitz_learning_history.quiz_attempted OR EXCLUDED.quiz_attempted,
    quiz_correct = CASE 
      WHEN EXCLUDED.quiz_attempted THEN EXCLUDED.quiz_correct
      ELSE bitz_learning_history.quiz_correct
    END,
    xp_awarded = bitz_learning_history.xp_awarded + EXCLUDED.xp_awarded,
    learned_at = COALESCE(bitz_learning_history.learned_at, EXCLUDED.learned_at),
    last_interaction_at = NOW(),
    updated_at = NOW();

  -- Award XP strictly ONCE per Bitz, updating only the authenticated user's profile
  IF p_new_status = 'learned' AND NOT v_already_learned THEN
    UPDATE public.knowledge_bitz
    SET completions_count = completions_count + 1
    WHERE id = p_bitz_id;

    BEGIN
      UPDATE public.profiles
      SET xp = COALESCE(xp, 0) + v_xp_to_award
      WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', p_new_status,
    'isCorrect', v_is_correct,
    'xpAwarded', v_xp_to_award,
    'alreadyLearned', v_already_learned
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
