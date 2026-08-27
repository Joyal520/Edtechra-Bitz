-- ============================================================================
-- EDTECHRA-BITZ: Dashboard Avatar Persistence, Post XP & Admin Leaderboard Exclusion
-- ============================================================================

-- 1. Profiles Table RLS & Role Protection Fix
-- Ensure avatar_url and text_size exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS text_size TEXT DEFAULT 'medium';

-- Add INSERT policy for profiles so authenticated users can create/upsert their profile row
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Ensure UPDATE policy covers avatar_url and text_size
DROP POLICY IF EXISTS "Users can update own profile or admin update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admin update all"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Ensure SELECT policy allows public/learner profile view for avatars and leaderboards
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Fix trigger: use IS DISTINCT FROM to prevent NULL comparison failures
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles.';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();


-- ============================================================================
-- 2. Student Posts Table: Add xp_awarded column
-- ============================================================================
ALTER TABLE public.student_posts
  ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 10;

CREATE INDEX IF NOT EXISTS idx_student_posts_user_status ON public.student_posts(user_id, status);


-- ============================================================================
-- 3. Leaderboard RPC: Strictly Exclude Admins & Include Student Posts XP (+10 XP)
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

  -- 2. CTE calculating total XP across all activities for eligible student learners ONLY
  WITH user_xp_events AS (
    -- Quiz Bits (20 XP per correct attempt)
    SELECT qa.user_id, COALESCE(SUM(qa.xp_awarded), 0) AS xp
    FROM public.quiz_attempts qa
    INNER JOIN public.profiles p ON p.id = qa.user_id
    WHERE qa.is_correct = true 
      AND qa.created_at >= v_start_time
      AND p.role = 'student'
    GROUP BY qa.user_id

    UNION ALL

    -- Sentence Reorder (20 XP per correct attempt)
    SELECT rc.user_id, COALESCE(SUM(rc.xp_awarded), 0) AS xp
    FROM public.reorder_completions rc
    INNER JOIN public.profiles p ON p.id = rc.user_id
    WHERE rc.is_correct = true 
      AND rc.completed_at >= v_start_time
      AND p.role = 'student'
    GROUP BY rc.user_id

    UNION ALL

    -- Spelling Scramble (20 XP per correct attempt)
    SELECT sc.user_id, COALESCE(SUM(sc.xp_awarded), 0) AS xp
    FROM public.spelling_scramble_completions sc
    INNER JOIN public.profiles p ON p.id = sc.user_id
    WHERE sc.is_correct = true 
      AND sc.completed_at >= v_start_time
      AND p.role = 'student'
    GROUP BY sc.user_id

    UNION ALL

    -- 1-Minute Readings (15 XP per reading)
    SELECT rd.user_id, COALESCE(COUNT(*) * 15, 0) AS xp
    FROM public.reading_completions rd
    INNER JOIN public.profiles p ON p.id = rd.user_id
    WHERE rd.completed_at >= v_start_time
      AND p.role = 'student'
    GROUP BY rd.user_id

    UNION ALL

    -- Video Lessons (40 XP per completed lesson)
    SELECT ylp.user_id, COALESCE(COUNT(*) * 40, 0) AS xp
    FROM public.youtube_learning_progress ylp
    INNER JOIN public.profiles p ON p.id = ylp.user_id
    WHERE ylp.completed = true 
      AND (ylp.last_watched_at >= v_start_time OR ylp.updated_at >= v_start_time)
      AND p.role = 'student'
    GROUP BY ylp.user_id

    UNION ALL

    -- Student Feed Posts (+10 XP per approved post)
    SELECT sp.user_id, COALESCE(COUNT(*) * 10, 0) AS xp
    FROM public.student_posts sp
    INNER JOIN public.profiles p ON p.id = sp.user_id
    WHERE sp.status = 'approved' 
      AND sp.created_at >= v_start_time
      AND p.role = 'student'
    GROUP BY sp.user_id

    UNION ALL

    -- All-Time Starter Bonus (100 XP for every registered student profile)
    SELECT id AS user_id, CASE WHEN p_period = 'all_time' THEN 100 ELSE 0 END AS xp
    FROM public.profiles
    WHERE role = 'student'
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
    WHERE p.role = 'student' -- Strictly student accounts; excludes admins and teachers
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

  -- 3. Retrieve current user ranking if authenticated AND user is a student
  IF p_current_user_id IS NOT NULL THEN
    WITH user_xp_events AS (
      SELECT qa.user_id, COALESCE(SUM(qa.xp_awarded), 0) AS xp
      FROM public.quiz_attempts qa
      INNER JOIN public.profiles p ON p.id = qa.user_id
      WHERE qa.is_correct = true AND qa.created_at >= v_start_time AND p.role = 'student'
      GROUP BY qa.user_id

      UNION ALL

      SELECT rc.user_id, COALESCE(SUM(rc.xp_awarded), 0) AS xp
      FROM public.reorder_completions rc
      INNER JOIN public.profiles p ON p.id = rc.user_id
      WHERE rc.is_correct = true AND rc.completed_at >= v_start_time AND p.role = 'student'
      GROUP BY rc.user_id

      UNION ALL

      SELECT sc.user_id, COALESCE(SUM(sc.xp_awarded), 0) AS xp
      FROM public.spelling_scramble_completions sc
      INNER JOIN public.profiles p ON p.id = sc.user_id
      WHERE sc.is_correct = true AND sc.completed_at >= v_start_time AND p.role = 'student'
      GROUP BY sc.user_id

      UNION ALL

      SELECT rd.user_id, COALESCE(COUNT(*) * 15, 0) AS xp
      FROM public.reading_completions rd
      INNER JOIN public.profiles p ON p.id = rd.user_id
      WHERE rd.completed_at >= v_start_time AND p.role = 'student'
      GROUP BY rd.user_id

      UNION ALL

      SELECT ylp.user_id, COALESCE(COUNT(*) * 40, 0) AS xp
      FROM public.youtube_learning_progress ylp
      INNER JOIN public.profiles p ON p.id = ylp.user_id
      WHERE ylp.completed = true AND (ylp.last_watched_at >= v_start_time OR ylp.updated_at >= v_start_time) AND p.role = 'student'
      GROUP BY ylp.user_id

      UNION ALL

      SELECT sp.user_id, COALESCE(COUNT(*) * 10, 0) AS xp
      FROM public.student_posts sp
      INNER JOIN public.profiles p ON p.id = sp.user_id
      WHERE sp.status = 'approved' AND sp.created_at >= v_start_time AND p.role = 'student'
      GROUP BY sp.user_id

      UNION ALL

      SELECT id AS user_id, CASE WHEN p_period = 'all_time' THEN 100 ELSE 0 END AS xp
      FROM public.profiles
      WHERE role = 'student'
    ),
    aggregated_user_xp AS (
      SELECT
        p.id AS user_id,
        COALESCE(NULLIF(TRIM(p.full_name), ''), split_part(p.email, '@', 1), 'Learner') AS display_name,
        p.avatar_url,
        p.role,
        COALESCE(SUM(uxe.xp), CASE WHEN p_period = 'all_time' THEN 100 ELSE 0 END) AS total_xp,
        p.created_at
      FROM public.profiles p
      LEFT JOIN user_xp_events uxe ON uxe.user_id = p.id
      WHERE p.role = 'student'
      GROUP BY p.id, p.full_name, p.email, p.avatar_url, p.role, p.created_at
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

GRANT EXECUTE ON FUNCTION public.get_top_learners TO anon, authenticated, service_role;
