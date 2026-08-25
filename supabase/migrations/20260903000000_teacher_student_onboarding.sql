-- ============================================================================
-- EDTECHRA-BITZ: Teacher & Student Onboarding & Role Handling Migration
-- ============================================================================

-- 1. Ensure profiles check constraint accepts 'student', 'teacher', 'admin'
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('student', 'teacher', 'admin'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Update handle_new_user() trigger function to respect signup role metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_role TEXT;
  assigned_role TEXT := 'student';
  user_email TEXT;
  user_name TEXT;
  user_avatar TEXT;
BEGIN
  -- Extract email safely
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '');
  
  -- Extract requested role from auth metadata
  requested_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'student')));
  
  -- Public signup is strictly limited to 'student' or 'teacher' (never 'admin')
  IF requested_role = 'teacher' THEN
    assigned_role := 'teacher';
  ELSE
    assigned_role := 'student';
  END IF;

  -- Protected initial admin assignment strictly for roshanjoyal520@gmail.com
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
    -- Preserve existing role unless admin email override
    role = CASE 
      WHEN LOWER(TRIM(EXCLUDED.email)) = 'roshanjoyal520@gmail.com' THEN 'admin' 
      ELSE profiles.role 
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- 3. Stored Procedure for First-Time User Onboarding (e.g. Google OAuth role selection)
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
  p_full_name TEXT,
  p_role TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_sanitized_role TEXT;
  v_updated_profile public.profiles;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Sanitize role: only allow 'student' or 'teacher'
  IF LOWER(TRIM(p_role)) = 'teacher' THEN
    v_sanitized_role := 'teacher';
  ELSE
    v_sanitized_role := 'student';
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
    -- Preserve admin role if already admin, otherwise apply chosen role
    role = CASE 
      WHEN role = 'admin' THEN 'admin'
      ELSE v_sanitized_role
    END,
    updated_at = NOW()
  WHERE id = v_user_id
  RETURNING * INTO v_updated_profile;

  RETURN v_updated_profile;
END;
$$;

-- 4. Admin-only RPC to promote or adjust roles safely
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target_email TEXT;
  v_sanitized_role TEXT;
  v_updated_profile public.profiles;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles.';
  END IF;

  IF LOWER(TRIM(p_new_role)) NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Invalid role. Allowed values: student, teacher, admin.';
  END IF;

  v_sanitized_role := LOWER(TRIM(p_new_role));

  UPDATE public.profiles
  SET
    role = v_sanitized_role,
    updated_at = NOW()
  WHERE id = p_target_user_id
  RETURNING * INTO v_updated_profile;

  RETURN v_updated_profile;
END;
$$;

-- 5. Set Execution Permissions
REVOKE ALL ON FUNCTION public.complete_user_onboarding(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_user_onboarding(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

-- 6. Update protect_profile_role() trigger to allow legitimate teacher/student selection while strictly protecting admin escalation
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strictly prevent non-administrators from assigning the admin role
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role <> 'admin') THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can assign the admin role.';
    END IF;
  END IF;

  -- Ensure role is always valid
  IF NEW.role NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified: %', NEW.role;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

