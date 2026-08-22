-- ============================================================================
-- EDTECHRA-BITZ: Safe User Activity Deduplication & Interaction History System
-- ============================================================================

-- 1. Unified User Activity Interactions Table
CREATE TABLE IF NOT EXISTS public.user_activity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'quiz', 'spelling_scramble', 'youtube_short', 'poll', 'reorder', 'reading', 'lesson', 'game', 'flashcard'
  interaction_type TEXT NOT NULL, -- 'completed', 'watched', 'voted', 'answered', 'played', 'opened'
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_activity_interaction UNIQUE (user_id, activity_id)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_interactions_lookup 
  ON public.user_activity_interactions(user_id, activity_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_interactions_user_type 
  ON public.user_activity_interactions(user_id, activity_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_interactions_completed_at 
  ON public.user_activity_interactions(completed_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.user_activity_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own activity interactions" ON public.user_activity_interactions;
CREATE POLICY "Users can read own activity interactions"
  ON public.user_activity_interactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own activity interactions" ON public.user_activity_interactions;
CREATE POLICY "Users can insert own activity interactions"
  ON public.user_activity_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.user_activity_interactions TO anon, authenticated, service_role;

-- 4. Safe Backfill of Historical Interactions (Idempotent)
-- Backfill Quiz Bits completions
INSERT INTO public.user_activity_interactions (user_id, activity_id, activity_type, interaction_type, completed_at)
SELECT DISTINCT user_id, quiz_id::text, 'quiz', 'completed', created_at
FROM public.quiz_attempts
WHERE is_correct = true
ON CONFLICT (user_id, activity_id) DO NOTHING;

-- Backfill Sentence Reorder completions
INSERT INTO public.user_activity_interactions (user_id, activity_id, activity_type, interaction_type, completed_at)
SELECT DISTINCT user_id, activity_id::text, 'reorder', 'completed', completed_at
FROM public.reorder_completions
WHERE is_correct = true
ON CONFLICT (user_id, activity_id) DO NOTHING;

-- Backfill Spelling Scramble completions
INSERT INTO public.user_activity_interactions (user_id, activity_id, activity_type, interaction_type, completed_at)
SELECT DISTINCT user_id, scramble_id, 'spelling_scramble', 'completed', completed_at
FROM public.spelling_scramble_completions
WHERE is_correct = true
ON CONFLICT (user_id, activity_id) DO NOTHING;

-- Backfill 1-Minute Reading completions
INSERT INTO public.user_activity_interactions (user_id, activity_id, activity_type, interaction_type, completed_at)
SELECT DISTINCT user_id, reading_id::text, 'reading', 'completed', completed_at
FROM public.reading_completions
ON CONFLICT (user_id, activity_id) DO NOTHING;

-- 5. Safe Database RPC Helper for Idempotent Interaction Recording
CREATE OR REPLACE FUNCTION public.record_activity_interaction(
  p_activity_id TEXT,
  p_activity_type TEXT,
  p_interaction_type TEXT DEFAULT 'completed'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
  END IF;

  INSERT INTO public.user_activity_interactions (user_id, activity_id, activity_type, interaction_type, completed_at)
  VALUES (v_user_id, p_activity_id, p_activity_type, p_interaction_type, NOW())
  ON CONFLICT (user_id, activity_id) DO UPDATE
  SET
    interaction_type = EXCLUDED.interaction_type,
    completed_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'userId', v_user_id,
    'activityId', p_activity_id,
    'activityType', p_activity_type,
    'interactionType', p_interaction_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.record_activity_interaction TO authenticated, service_role;
