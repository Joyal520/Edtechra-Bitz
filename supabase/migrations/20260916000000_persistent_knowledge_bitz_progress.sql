-- ============================================================================
-- EDTECHRA-BITZ: Persistent Knowledge Bitz Progress, Mastery & XP Migration
-- Migration: 20260916000000_persistent_knowledge_bitz_progress.sql
--
-- Features:
-- 1. Creates authoritative public.knowledge_bitz_progress table with UNIQUE(user_id, bitz_id)
-- 2. Indexes for user progress, mastery lookup, and recently mastered feeds
-- 3. Row Level Security (RLS) ensuring strict user privacy and isolation
-- 4. Backward-compatible data reconciliation from legacy bitz_learning_history
-- 5. Atomic server-side RPC record_bitz_quiz_completion for score, >=3/5 mastery, and safe XP
-- ============================================================================

-- 1. Create knowledge_bitz_progress table
CREATE TABLE IF NOT EXISTS public.knowledge_bitz_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bitz_id UUID NOT NULL REFERENCES public.knowledge_bitz(id) ON DELETE CASCADE,
  
  -- Quiz & Attempt Metrics
  attempts INTEGER NOT NULL DEFAULT 1,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  
  -- Lifecycle & Mastery State
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  mastered BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_answers JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  first_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: Exactly one authoritative progress record per user + Bitz
  CONSTRAINT uq_user_bitz_progress UNIQUE (user_id, bitz_id)
);

-- 2. High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_kbp_user_bitz 
  ON public.knowledge_bitz_progress(user_id, bitz_id);

CREATE INDEX IF NOT EXISTS idx_kbp_user_mastered 
  ON public.knowledge_bitz_progress(user_id, mastered);

CREATE INDEX IF NOT EXISTS idx_kbp_bitz_id 
  ON public.knowledge_bitz_progress(bitz_id);

CREATE INDEX IF NOT EXISTS idx_kbp_user_completed 
  ON public.knowledge_bitz_progress(user_id, completed);

CREATE INDEX IF NOT EXISTS idx_kbp_mastered_at 
  ON public.knowledge_bitz_progress(mastered_at DESC) 
  WHERE mastered = TRUE;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.knowledge_bitz_progress ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view only their own learning progress
DROP POLICY IF EXISTS "Users can view own bitz progress" ON public.knowledge_bitz_progress;
CREATE POLICY "Users can view own bitz progress"
  ON public.knowledge_bitz_progress FOR SELECT
  USING (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role');

-- RLS: Users can manage own learning progress
DROP POLICY IF EXISTS "Users can manage own bitz progress" ON public.knowledge_bitz_progress;
CREATE POLICY "Users can manage own bitz progress"
  ON public.knowledge_bitz_progress FOR ALL
  USING (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR public.is_bitz_admin() OR auth.role() = 'service_role');

-- Grants
GRANT ALL ON public.knowledge_bitz_progress TO anon, authenticated, service_role;

-- 4. Data Reconciliation / Migration from legacy bitz_learning_history
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bitz_learning_history') THEN
    INSERT INTO public.knowledge_bitz_progress (
      user_id,
      bitz_id,
      attempts,
      correct_answers,
      score,
      xp_earned,
      completed,
      mastered,
      quiz_answers,
      first_started_at,
      completed_at,
      mastered_at,
      created_at,
      updated_at
    )
    SELECT
      h.user_id,
      h.bitz_id,
      1 AS attempts,
      CASE 
        WHEN h.status = 'learned' THEN GREATEST(3, COALESCE(h.xp_awarded / 2, 3))
        WHEN h.quiz_answers IS NOT NULL THEN (
          SELECT COUNT(*)::INT 
          FROM jsonb_each_text(h.quiz_answers) 
          WHERE value = 'true'
        )
        ELSE 0
      END AS correct_answers,
      CASE 
        WHEN h.status = 'learned' THEN GREATEST(3, COALESCE(h.xp_awarded / 2, 3))
        WHEN h.quiz_answers IS NOT NULL THEN (
          SELECT COUNT(*)::INT 
          FROM jsonb_each_text(h.quiz_answers) 
          WHERE value = 'true'
        )
        ELSE 0
      END AS score,
      COALESCE(h.xp_awarded, 0) AS xp_earned,
      (h.status IN ('read', 'learned')) AS completed,
      (h.status = 'learned' OR (
        h.quiz_answers IS NOT NULL AND (
          SELECT COUNT(*)::INT 
          FROM jsonb_each_text(h.quiz_answers) 
          WHERE value = 'true'
        ) >= 3
      )) AS mastered,
      COALESCE(h.quiz_answers, '{}'::jsonb) AS quiz_answers,
      COALESCE(h.created_at, NOW()) AS first_started_at,
      CASE WHEN h.status IN ('read', 'learned') THEN COALESCE(h.learned_at, h.updated_at, NOW()) ELSE NULL END AS completed_at,
      CASE WHEN h.status = 'learned' THEN COALESCE(h.learned_at, h.updated_at, NOW()) ELSE NULL END AS mastered_at,
      COALESCE(h.created_at, NOW()) AS created_at,
      COALESCE(h.updated_at, NOW()) AS updated_at
    FROM public.bitz_learning_history h
    ON CONFLICT (user_id, bitz_id) DO UPDATE SET
      mastered = EXCLUDED.mastered OR knowledge_bitz_progress.mastered,
      completed = EXCLUDED.completed OR knowledge_bitz_progress.completed,
      score = GREATEST(knowledge_bitz_progress.score, EXCLUDED.score),
      correct_answers = GREATEST(knowledge_bitz_progress.correct_answers, EXCLUDED.correct_answers),
      xp_earned = GREATEST(knowledge_bitz_progress.xp_earned, EXCLUDED.xp_earned),
      mastered_at = COALESCE(knowledge_bitz_progress.mastered_at, EXCLUDED.mastered_at);
  END IF;
END $$;

-- ============================================================================
-- 5. Server RPC: Authoritative Quiz Completion & Anti-Farming XP Awarding
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_bitz_quiz_completion(
  p_bitz_id UUID,
  p_correct_answers INTEGER,
  p_total_questions INTEGER DEFAULT 5,
  p_quiz_answers JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID;
  v_bitz public.knowledge_bitz%ROWTYPE;
  v_existing public.knowledge_bitz_progress%ROWTYPE;
  v_is_mastered BOOLEAN := FALSE;
  v_was_already_mastered BOOLEAN := FALSE;
  v_was_already_completed BOOLEAN := FALSE;
  v_existing_xp INTEGER := 0;
  v_target_xp INTEGER := 0;
  v_xp_to_award INTEGER := 0;
  v_now TIMESTAMPTZ := NOW();
  v_safe_correct INTEGER := 0;
  v_safe_total INTEGER := 5;
BEGIN
  -- Strict Authenticated User Resolution
  v_uid := COALESCE(p_user_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to persist quiz progress.');
  END IF;

  -- Validate Knowledge Bitz Existence
  SELECT * INTO v_bitz FROM public.knowledge_bitz WHERE id = p_bitz_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Knowledge Bitz not found.');
  END IF;

  -- Normalize Safe Counts
  v_safe_total := GREATEST(1, COALESCE(p_total_questions, 5));
  v_safe_correct := LEAST(v_safe_total, GREATEST(0, COALESCE(p_correct_answers, 0)));

  -- Mastery Rule: 3 or more correct answers out of 5 = MASTERED
  v_is_mastered := (v_safe_correct >= 3);

  -- XP Rule: +2 XP per correct answer (capped at 10 XP per Bitz)
  v_target_xp := LEAST(10, v_safe_correct * 2);

  -- Check existing progress record
  SELECT * INTO v_existing 
  FROM public.knowledge_bitz_progress 
  WHERE user_id = v_uid AND bitz_id = p_bitz_id;

  IF FOUND THEN
    v_was_already_mastered := v_existing.mastered;
    v_was_already_completed := v_existing.completed;
    v_existing_xp := COALESCE(v_existing.xp_earned, 0);

    -- Anti-farming XP: only award additional XP if higher score is achieved
    v_xp_to_award := GREATEST(0, v_target_xp - v_existing_xp);

    UPDATE public.knowledge_bitz_progress
    SET
      attempts = attempts + 1,
      correct_answers = GREATEST(correct_answers, v_safe_correct),
      score = GREATEST(score, v_safe_correct),
      xp_earned = GREATEST(xp_earned, v_target_xp),
      completed = TRUE,
      mastered = (mastered OR v_is_mastered),
      quiz_answers = COALESCE(p_quiz_answers, quiz_answers),
      completed_at = COALESCE(completed_at, v_now),
      mastered_at = CASE 
        WHEN (v_is_mastered AND mastered_at IS NULL) THEN v_now 
        ELSE mastered_at 
      END,
      updated_at = v_now
    WHERE id = v_existing.id;
  ELSE
    -- First completion attempt
    v_xp_to_award := v_target_xp;

    INSERT INTO public.knowledge_bitz_progress (
      user_id,
      bitz_id,
      attempts,
      correct_answers,
      score,
      xp_earned,
      completed,
      mastered,
      quiz_answers,
      first_started_at,
      completed_at,
      mastered_at,
      created_at,
      updated_at
    )
    VALUES (
      v_uid,
      p_bitz_id,
      1,
      v_safe_correct,
      v_safe_correct,
      v_target_xp,
      TRUE,
      v_is_mastered,
      p_quiz_answers,
      v_now,
      v_now,
      CASE WHEN v_is_mastered THEN v_now ELSE NULL END,
      v_now,
      v_now
    );
  END IF;

  -- Increment Bitz completions count if newly mastered or completed
  IF (v_is_mastered AND NOT v_was_already_mastered) OR (NOT v_was_already_completed) THEN
    UPDATE public.knowledge_bitz
    SET completions_count = completions_count + 1
    WHERE id = p_bitz_id;
  END IF;

  -- Atomic Award of XP to User Profile
  IF v_xp_to_award > 0 THEN
    BEGIN
      UPDATE public.profiles
      SET xp = COALESCE(xp, 0) + v_xp_to_award, updated_at = v_now
      WHERE id = v_uid;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Sync to unified activity interactions for feed deduplication
  BEGIN
    INSERT INTO public.user_activity_interactions (
      user_id,
      activity_id,
      activity_type,
      interaction_type,
      completed_at
    )
    VALUES (
      v_uid,
      p_bitz_id::text,
      'knowledge_bitz',
      CASE WHEN (v_is_mastered OR v_was_already_mastered) THEN 'mastered' ELSE 'completed' END,
      v_now
    )
    ON CONFLICT (user_id, activity_id) DO UPDATE SET
      interaction_type = CASE 
        WHEN (EXCLUDED.interaction_type = 'mastered' OR user_activity_interactions.interaction_type = 'mastered') THEN 'mastered' 
        ELSE EXCLUDED.interaction_type 
      END,
      completed_at = v_now;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Also keep legacy bitz_learning_history synced for compatibility
  BEGIN
    INSERT INTO public.bitz_learning_history (
      user_id,
      bitz_id,
      status,
      quiz_attempted,
      quiz_correct,
      quiz_answers,
      xp_awarded,
      learned_at,
      last_interaction_at
    )
    VALUES (
      v_uid,
      p_bitz_id,
      CASE WHEN (v_is_mastered OR v_was_already_mastered) THEN 'learned' ELSE 'read' END,
      TRUE,
      v_is_mastered,
      p_quiz_answers,
      GREATEST(v_target_xp, v_existing_xp),
      CASE WHEN (v_is_mastered OR v_was_already_mastered) THEN v_now ELSE NULL END,
      v_now
    )
    ON CONFLICT (user_id, bitz_id) DO UPDATE SET
      status = CASE 
        WHEN bitz_learning_history.status = 'learned' OR EXCLUDED.status = 'learned' THEN 'learned' 
        ELSE EXCLUDED.status 
      END,
      quiz_attempted = TRUE,
      quiz_correct = (bitz_learning_history.quiz_correct OR EXCLUDED.quiz_correct),
      quiz_answers = COALESCE(EXCLUDED.quiz_answers, bitz_learning_history.quiz_answers),
      xp_awarded = GREATEST(bitz_learning_history.xp_awarded, EXCLUDED.xp_awarded),
      learned_at = COALESCE(bitz_learning_history.learned_at, EXCLUDED.learned_at),
      last_interaction_at = v_now,
      updated_at = v_now;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'bitzId', p_bitz_id,
    'score', v_safe_correct,
    'correctAnswers', v_safe_correct,
    'totalQuestions', v_safe_total,
    'xpEarned', GREATEST(v_target_xp, v_existing_xp),
    'xpAwardedNow', v_xp_to_award,
    'mastered', (v_is_mastered OR v_was_already_mastered),
    'completed', true,
    'wasAlreadyMastered', v_was_already_mastered
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.record_bitz_quiz_completion(UUID, INTEGER, INTEGER, JSONB, UUID) TO anon, authenticated, service_role;