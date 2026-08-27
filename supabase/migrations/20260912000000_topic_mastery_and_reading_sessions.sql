-- ============================================================================
-- EDTECHRA-BITZ: Topic Mastery & Server-Authoritative Reading Sessions Migration
-- ============================================================================

-- 1. Reading Sessions Table (Server-side authoritative start and elapsed tracking)
CREATE TABLE IF NOT EXISTS public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_id UUID NOT NULL REFERENCES public.readings(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reading_user_session UNIQUE (user_id, reading_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_reading 
  ON public.reading_sessions(user_id, reading_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_started_at 
  ON public.reading_sessions(started_at);

-- 2. Update reading_completions with idempotency, xp_awarded and time_spent_seconds
ALTER TABLE public.reading_completions 
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 60;

-- Ensure unique constraint on reading_completions (reading_id, user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_reading_user_completion'
  ) THEN
    ALTER TABLE public.reading_completions 
      ADD CONSTRAINT uq_reading_user_completion UNIQUE (reading_id, user_id);
  END IF;
END $$;

-- 3. Enable RLS on reading_sessions
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reading sessions" ON public.reading_sessions;
CREATE POLICY "Users can view own reading sessions"
  ON public.reading_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert/update own reading sessions" ON public.reading_sessions;
CREATE POLICY "Users can insert/update own reading sessions"
  ON public.reading_sessions FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

GRANT ALL ON public.reading_sessions TO anon, authenticated, service_role;

-- 4. Server-Side RPC: Start or Retrieve Active Reading Session
CREATE OR REPLACE FUNCTION public.start_or_resume_reading_session(
  p_reading_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID;
  v_session RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_elapsed_seconds INT := 0;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
  END IF;

  -- Check existing session
  SELECT * INTO v_session
  FROM public.reading_sessions
  WHERE user_id = v_uid AND reading_id = p_reading_id;

  IF FOUND THEN
    -- If session exists and not completed, compute elapsed seconds
    IF v_session.completed_at IS NULL THEN
      v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_session.started_at))::INT);
      UPDATE public.reading_sessions
      SET last_active_at = v_now
      WHERE id = v_session.id;

      RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session.id,
        'reading_id', p_reading_id,
        'started_at', v_session.started_at,
        'elapsed_seconds', v_elapsed_seconds,
        'required_seconds', 60,
        'is_resumed', true
      );
    ELSE
      -- Already completed session
      RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session.id,
        'reading_id', p_reading_id,
        'started_at', v_session.started_at,
        'completed_at', v_session.completed_at,
        'elapsed_seconds', 60,
        'required_seconds', 60,
        'is_completed', true
      );
    END IF;
  ELSE
    -- Create fresh session
    INSERT INTO public.reading_sessions (user_id, reading_id, started_at, last_active_at)
    VALUES (v_uid, p_reading_id, v_now, v_now)
    RETURNING * INTO v_session;

    RETURN jsonb_build_object(
      'success', true,
      'session_id', v_session.id,
      'reading_id', p_reading_id,
      'started_at', v_session.started_at,
      'elapsed_seconds', 0,
      'required_seconds', 60,
      'is_resumed', false
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Server-Side RPC: Validate 60s Minimum Duration and Complete Reading
CREATE OR REPLACE FUNCTION public.validate_and_complete_reading(
  p_reading_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID;
  v_session RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_elapsed_seconds INT := 0;
  v_already_completed BOOLEAN := false;
  v_xp_awarded INT := 0;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
  END IF;

  -- 1. Check if already completed in reading_completions
  SELECT EXISTS (
    SELECT 1 FROM public.reading_completions 
    WHERE reading_id = p_reading_id AND user_id = v_uid
  ) INTO v_already_completed;

  IF v_already_completed THEN
    RETURN jsonb_build_object(
      'success', true,
      'completed', true,
      'already_completed', true,
      'xp_awarded', 0,
      'message', 'Reading was already completed previously.'
    );
  END IF;

  -- 2. Check session timestamp on server
  SELECT * INTO v_session
  FROM public.reading_sessions
  WHERE user_id = v_uid AND reading_id = p_reading_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reading session not found. Please start reading before submitting completion.',
      'elapsedSeconds', 0,
      'requiredSeconds', 60,
      'remainingSeconds', 60
    );
  END IF;

  v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_session.started_at))::INT);

  -- 3. Strict 60s Server-Side Validation
  IF v_elapsed_seconds < 60 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Keep reading for a little longer. This reading requires at least 60 seconds.',
      'elapsedSeconds', v_elapsed_seconds,
      'requiredSeconds', 60,
      'remainingSeconds', (60 - v_elapsed_seconds)
    );
  END IF;

  -- 4. Valid Completion: Record completion and mark session
  v_xp_awarded := 15;

  INSERT INTO public.reading_completions (reading_id, user_id, completed_at, xp_awarded, time_spent_seconds)
  VALUES (p_reading_id, v_uid, v_now, v_xp_awarded, v_elapsed_seconds)
  ON CONFLICT (reading_id, user_id) DO NOTHING;

  UPDATE public.reading_sessions
  SET completed_at = v_now, last_active_at = v_now
  WHERE id = v_session.id;

  -- 5. Record to unified activity interactions for feed deduplication
  INSERT INTO public.user_activity_interactions (user_id, activity_id, activity_type, interaction_type, completed_at)
  VALUES (v_uid, p_reading_id::text, 'reading', 'completed', v_now)
  ON CONFLICT (user_id, activity_id) DO UPDATE 
  SET interaction_type = 'completed', completed_at = v_now;

  -- 6. Award XP to profile
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + v_xp_awarded, updated_at = v_now
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'completed', true,
    'already_completed', false,
    'xp_awarded', v_xp_awarded,
    'time_spent_seconds', v_elapsed_seconds,
    'reading_id', p_reading_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.start_or_resume_reading_session(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_and_complete_reading(UUID, UUID) TO anon, authenticated, service_role;
