-- ============================================================================
-- EDTECHRA-BITZ: Authentication, Profiles, Admin & Learning Progress Migration
-- ============================================================================

-- 1. Profiles Table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance on role, email, created_at
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- 2. YouTube Tables (Ensuring existence with idempotent guards)
CREATE TABLE IF NOT EXISTS public.youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT UNIQUE NOT NULL,
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  youtube_url TEXT,
  published_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  is_short BOOLEAN DEFAULT TRUE,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.youtube_learning_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT NOT NULL REFERENCES public.youtube_videos(youtube_video_id) ON DELETE CASCADE,
  summary TEXT,
  key_takeaway TEXT,
  vocabulary JSONB DEFAULT '[]'::jsonb,
  quiz JSONB DEFAULT '[]'::jsonb,
  learning_objectives JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_learning_content_video_id UNIQUE (youtube_video_id)
);

CREATE TABLE IF NOT EXISTS public.youtube_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  watched BOOLEAN DEFAULT FALSE,
  watch_progress INTEGER DEFAULT 0,
  quiz_completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER DEFAULT 0,
  quiz_total INTEGER DEFAULT 3,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_video_progress UNIQUE (user_id, youtube_video_id)
);

CREATE INDEX IF NOT EXISTS idx_youtube_learning_progress_user ON public.youtube_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_learning_progress_completed ON public.youtube_learning_progress(user_id, completed);

-- ============================================================================
-- 3. Security Helper Functions
-- ============================================================================

-- Check if current authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Prevent regular students from escalating role to admin
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
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

-- Trigger: Automatically create or update profile upon user creation (Email or Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'student';
  user_email TEXT;
  user_name TEXT;
  user_avatar TEXT;
BEGIN
  -- Extract email safely
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  
  -- Strict initial admin assignment check for roshanjoyal520@gmail.com
  IF LOWER(TRIM(user_email)) = 'roshanjoyal520@gmail.com' THEN
    assigned_role := 'admin';
  END IF;

  -- Extract display name if available
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );

  -- Extract avatar if available
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    ''
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    user_name,
    user_avatar,
    assigned_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    avatar_url = CASE WHEN profiles.avatar_url IS NULL OR profiles.avatar_url = '' THEN EXCLUDED.avatar_url ELSE profiles.avatar_url END,
    role = CASE WHEN LOWER(TRIM(EXCLUDED.email)) = 'roshanjoyal520@gmail.com' THEN 'admin' ELSE profiles.role END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. Admin PostgreSQL RPC Functions (Strict Server-Side Authorization)
-- ============================================================================

-- Function 1: Get Admin Dashboard Statistics
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_users_count BIGINT;
  total_students_count BIGINT;
  total_admins_count BIGINT;
  new_today_count BIGINT;
  new_week_count BIGINT;
  new_month_count BIGINT;
BEGIN
  -- Strict server-side authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrator privilege required';
  END IF;

  SELECT COUNT(*) INTO total_users_count FROM public.profiles;
  SELECT COUNT(*) INTO total_students_count FROM public.profiles WHERE role = 'student';
  SELECT COUNT(*) INTO total_admins_count FROM public.profiles WHERE role = 'admin';
  SELECT COUNT(*) INTO new_today_count FROM public.profiles WHERE created_at >= CURRENT_DATE;
  SELECT COUNT(*) INTO new_week_count FROM public.profiles WHERE created_at >= (NOW() - INTERVAL '7 days');
  SELECT COUNT(*) INTO new_month_count FROM public.profiles WHERE created_at >= (NOW() - INTERVAL '30 days');

  result := jsonb_build_object(
    'totalUsers', total_users_count,
    'totalStudents', total_students_count,
    'totalAdmins', total_admins_count,
    'newUsersToday', new_today_count,
    'newUsersThisWeek', new_week_count,
    'newUsersThisMonth', new_month_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get Admin Users List (Searchable, Filterable, Sorted)
CREATE OR REPLACE FUNCTION public.get_admin_users(
  p_search TEXT DEFAULT '',
  p_role TEXT DEFAULT 'all',
  p_sort TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Strict server-side authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Administrator privilege required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.role,
    p.created_at,
    u.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE 
    (p_role = 'all' OR p.role = p_role)
    AND (
      p_search = '' 
      OR p.email ILIKE '%' || p_search || '%' 
      OR p.full_name ILIKE '%' || p_search || '%'
    )
  ORDER BY 
    CASE WHEN p_sort = 'asc' THEN p.created_at END ASC,
    CASE WHEN p_sort = 'desc' OR p_sort IS NULL THEN p.created_at END DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_learning_progress ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile or admin view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admin view all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile or admin update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admin update all"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- YouTube Videos & Content Policies
DROP POLICY IF EXISTS "Public read youtube_videos" ON public.youtube_videos;
CREATE POLICY "Public read youtube_videos"
  ON public.youtube_videos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin modify youtube_videos" ON public.youtube_videos;
CREATE POLICY "Admin modify youtube_videos"
  ON public.youtube_videos FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read published youtube_learning_content" ON public.youtube_learning_content;
CREATE POLICY "Public read published youtube_learning_content"
  ON public.youtube_learning_content FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admin modify youtube_learning_content" ON public.youtube_learning_content;
CREATE POLICY "Admin modify youtube_learning_content"
  ON public.youtube_learning_content FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- YouTube Learning Progress Policies
DROP POLICY IF EXISTS "Users manage own learning progress" ON public.youtube_learning_progress;
CREATE POLICY "Users manage own learning progress"
  ON public.youtube_learning_progress FOR ALL
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
