-- ============================================================================
-- EDTECHRA-BITZ: Update protect_profile_role() Trigger
-- Allows legitimate self-onboarding to 'student' or 'teacher' while strictly
-- preventing unauthorized escalation to 'admin'
-- ============================================================================

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
