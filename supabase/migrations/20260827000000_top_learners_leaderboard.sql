-- ============================================================================
-- EDTECHRA-BITZ: Safe Top 10 Learners Leaderboard & Time-Period Resets Migration
-- ============================================================================

-- 1. Leaderboard Resets Table (Safe Period Boundary Tracking without Data Deletion)
CREATE TABLE IF NOT EXISTS public.leaderboard_resets (
  period_type TEXT PRIMARY KEY CHECK (period_type IN ('today', 'week', 'month')),
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial reset timestamps with current calendar period starts
INSERT INTO public.leaderboard_resets (period_type, reset_at, updated_at)
VALUES
  ('today', CURRENT_DATE::TIMESTAMPTZ, NOW()),
  ('week', DATE_TRUNC('week', NOW()), NOW()),
  ('month', DATE_TRUNC('month', NOW()), NOW())
ON CONFLICT (period_type) DO NOTHING;

-- Enable RLS
ALTER TABLE public.leaderboard_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read leaderboard_resets" ON public.leaderboard_resets;
CREATE POLICY "Public read leaderboard_resets"
  ON public.leaderboard_resets FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage leaderboard_resets" ON public.leaderboard_resets;
CREATE POLICY "Admins manage leaderboard_resets"
  ON public.leaderboard_resets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT ALL ON public.leaderboard_resets TO anon, authenticated, service_role;

-- ============================================================================
-- 2. Leaderboard Aggregation RPC Function (Computes Dynamic XP by Period)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_top_learners(
  p_period TEXT DEFAULT 'week',
  p_current_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_today_reset TIMESTAMPTZ;
  v_week_reset TIMESTAMPTZ;
  v_month_reset TIMESTAMPTZ;
  v_top10 JSONB;
  v_current_user_data JSONB;
  v_result JSONB;
BEGIN
  -- 1. Determine period time boundary
  SELECT reset_at INTO v_today_reset FROM public.leaderboard_resets WHERE period_type = 'today';
  SELECT reset_at INTO v_week_reset FROM public.leaderboard_resets WHERE period_type = 'week';
  SELECT reset_at INTO v_month_reset FROM public.leaderboard_resets WHERE period_type = 'month';

  IF p_period = 'today' THEN
    v_start_time := GREATEST(CURRENT_DATE::TIMESTAMPTZ, COALESCE(v_today_reset, CURRENT_DATE::TIMESTAMPTZ));
  ELSIF p_period = 'week' THEN
    v_start_time := GREATEST(DATE_TRUNC('week', NOW()), COALESCE(v_week_reset, DATE_TRUNC('week', NOW())));
  ELSIF p_period = 'month' THEN
    v_start_time := GREATEST(DATE_TRUNC('month', NOW()), COALESCE(v_month_reset, DATE_TRUNC('month', NOW())));
  ELSE
    -- All-time (unbounded)
    v_start_time := '1970-01-01'::TIMESTAMPTZ;
  END IF;

  -- 2. CTE calculating total XP across all activities for all active users
  WITH user_xp_events AS (
    -- Quiz Bits
    SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS xp
    FROM public.quiz_attempts
    WHERE is_correct = true AND created_at >= v_start_time
    GROUP BY user_id

    UNION ALL

    -- Sentence Reorder
    SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS xp
    FROM public.reorder_completions
    WHERE is_correct = true AND completed_at >= v_start_time
    GROUP BY user_id

    UNION ALL

    -- Spelling Scramble
    SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS xp
    FROM public.spelling_scramble_completions
    WHERE is_correct = true AND completed_at >= v_start_time
    GROUP BY user_id

    UNION ALL

    -- 1-Minute Readings (15 XP per reading)
    SELECT user_id, COALESCE(COUNT(*) * 15, 0) AS xp
    FROM public.reading_completions
    WHERE completed_at >= v_start_time
    GROUP BY user_id

    UNION ALL

    -- Video Lessons (40 XP per completed lesson)
    SELECT user_id, COALESCE(COUNT(*) * 40, 0) AS xp
    FROM public.youtube_learning_progress
    WHERE completed = true AND (last_watched_at >= v_start_time OR updated_at >= v_start_time)
    GROUP BY user_id

    UNION ALL

    -- All-Time Starter Bonus (100 XP for every registered profile)
    SELECT id AS user_id, CASE WHEN p_period = 'all_time' THEN 100 ELSE 0 END AS xp
    FROM public.profiles
  ),
  aggregated_user_xp AS (
    SELECT
      p.id AS user_id,
      COALESCE(NULLIF(TRIM(p.full_name), ''), split_part(p.email, '@', 1), 'Learner') AS display_name,
      p.avatar_url,
      p.role,
      p.created_at,
      COALESCE(SUM(uxe.xp), CASE WHEN p_period = 'all_time' THEN 100 ELSE 0 END) AS total_xp
    FROM public.profiles p
    LEFT JOIN user_xp_events uxe ON uxe.user_id = p.id
    GROUP BY p.id, p.full_name, p.email, p.avatar_url, p.role, p.created_at
  ),
  ranked_users AS (
    SELECT
      user_id,
      display_name,
      avatar_url,
      role,
      total_xp,
      -- Compute dynamic level based on total all-time XP or period XP
      GREATEST(1, LEAST(20, 1 + FLOOR(total_xp / 100)::INTEGER)) AS level,
      ROW_NUMBER() OVER (ORDER BY total_xp DESC, created_at ASC) AS rank
    FROM aggregated_user_xp
    WHERE total_xp > 0 OR p_period = 'all_time'
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'rank', rank,
          'userId', user_id,
          'displayName', display_name,
          'avatarUrl', avatar_url,
          'xp', total_xp,
          'level', level
        )
      ) FILTER (WHERE rank <= 10),
      '[]'::jsonb
    ) INTO v_top10
  FROM ranked_users;

  -- 3. Retrieve current user ranking if authenticated
  IF p_current_user_id IS NOT NULL THEN
    WITH user_xp_events AS (
      SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS xp
      FROM public.quiz_attempts
      WHERE is_correct = true AND created_at >= v_start_time
      GROUP BY user_id
      UNION ALL
      SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS xp
      FROM public.reorder_completions
      WHERE is_correct = true AND completed_at >= v_start_time
      GROUP BY user_id
      UNION ALL
      SELECT user_id, COALESCE(SUM(xp_awarded), 0) AS xp
      FROM public.spelling_scramble_completions
      WHERE is_correct = true AND completed_at >= v_start_time
      GROUP BY user_id
      UNION ALL
      SELECT user_id, COALESCE(COUNT(*) * 15, 0) AS xp
      FROM public.reading_completions
      WHERE completed_at >= v_start_time
      GROUP BY user_id
      UNION ALL
      SELECT user_id, COALESCE(COUNT(*) * 40, 0) AS xp
      FROM public.youtube_learning_progress
      WHERE completed = true AND (last_watched_at >= v_start_time OR updated_at >= v_start_time)
      GROUP BY user_id
      UNION ALL
      SELECT id AS user_id, CASE WHEN p_period = 'all_time' THEN 100 ELSE 0 END AS xp
      FROM public.profiles
    ),
    aggregated_user_xp AS (
      SELECT
        p.id AS user_id,
        COALESCE(NULLIF(TRIM(p.full_name), ''), split_part(p.email, '@', 1), 'Learner') AS display_name,
        p.avatar_url,
        COALESCE(SUM(uxe.xp), CASE WHEN p_period = 'all_time' THEN 100 ELSE 0 END) AS total_xp,
        p.created_at
      FROM public.profiles p
      LEFT JOIN user_xp_events uxe ON uxe.user_id = p.id
      GROUP BY p.id, p.full_name, p.email, p.avatar_url, p.created_at
    ),
    ranked_users AS (
      SELECT
        user_id,
        display_name,
        avatar_url,
        total_xp,
        GREATEST(1, LEAST(20, 1 + FLOOR(total_xp / 100)::INTEGER)) AS level,
        ROW_NUMBER() OVER (ORDER BY total_xp DESC, created_at ASC) AS rank
      FROM aggregated_user_xp
    )
    SELECT
      jsonb_build_object(
        'rank', rank,
        'userId', user_id,
        'displayName', display_name,
        'avatarUrl', avatar_url,
        'xp', total_xp,
        'level', level,
        'isInTop10', (rank <= 10)
      ) INTO v_current_user_data
    FROM ranked_users
    WHERE user_id = p_current_user_id;
  END IF;

  v_result := jsonb_build_object(
    'period', p_period,
    'top10', COALESCE(v_top10, '[]'::jsonb),
    'currentUser', v_current_user_data,
    'lastUpdated', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Leaderboard Period Reset RPC (Admin Authorization Enforced)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_leaderboard_period(
  p_period TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Strict server-side authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrator privilege required to reset leaderboard.';
  END IF;

  IF p_period NOT IN ('today', 'week', 'month') THEN
    RAISE EXCEPTION 'Invalid period: must be today, week, or month.';
  END IF;

  INSERT INTO public.leaderboard_resets (period_type, reset_at, reset_by, updated_at)
  VALUES (p_period, NOW(), auth.uid(), NOW())
  ON CONFLICT (period_type) DO UPDATE
  SET
    reset_at = NOW(),
    reset_by = auth.uid(),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'period', p_period,
    'reset_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_top_learners TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_leaderboard_period TO authenticated, service_role;
