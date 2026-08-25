-- ============================================================================
-- EDTECHRA-BITZ: Teacher Role Integrity & Leaderboard Fix
-- Guarantees classroom owners are always categorized as 'teacher' and cannot
-- be demoted to student or included in student rankings.
-- ============================================================================

-- 1. Trigger function: Ensure classroom owner is always 'teacher' in classroom_members
CREATE OR REPLACE FUNCTION public.ensure_classroom_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_id UUID;
BEGIN
  -- Look up classroom owner
  SELECT teacher_id INTO v_teacher_id
  FROM public.classrooms
  WHERE id = NEW.classroom_id;

  -- If member is classroom owner, strictly enforce teacher role
  IF v_teacher_id IS NOT NULL AND NEW.profile_id = v_teacher_id THEN
    NEW.role := 'teacher';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_classroom_member_role ON public.classroom_members;
CREATE TRIGGER trg_ensure_classroom_member_role
  BEFORE INSERT OR UPDATE ON public.classroom_members
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_classroom_member_role();

-- 2. Repair any existing records where classroom owner was recorded as student
UPDATE public.classroom_members cm
SET role = 'teacher'
FROM public.classrooms c
WHERE cm.classroom_id = c.id
  AND cm.profile_id = c.teacher_id
  AND cm.role <> 'teacher';

-- 3. Authoritative role resolution helper function
CREATE OR REPLACE FUNCTION public.get_classroom_user_role(c_id UUID, u_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_owner BOOLEAN := FALSE;
  v_member_role TEXT;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF u_id IS NULL OR c_id IS NULL THEN
    RETURN 'none';
  END IF;

  -- 1. Check if classroom owner
  SELECT (teacher_id = u_id) INTO v_is_owner
  FROM public.classrooms
  WHERE id = c_id;

  IF v_is_owner = TRUE THEN
    RETURN 'teacher';
  END IF;

  -- 2. Check admin
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = u_id;

  IF v_is_admin = TRUE THEN
    RETURN 'teacher';
  END IF;

  -- 3. Check membership role
  SELECT role INTO v_member_role
  FROM public.classroom_members
  WHERE classroom_id = c_id AND profile_id = u_id AND status = 'active';

  IF v_member_role IN ('teacher', 'co-teacher') THEN
    RETURN 'teacher';
  ELSIF v_member_role = 'student' THEN
    RETURN 'student';
  END IF;

  RETURN 'none';
END;
$$;
