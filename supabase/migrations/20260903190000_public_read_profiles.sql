-- ============================================================================
-- EDTECHRA-BITZ: Public Read Profiles for Feeds and Rosters
-- Allows post authors, leaderboards, and classrooms to display user profile names/avatars
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile or admin view all" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;

CREATE POLICY "Public read profiles"
  ON public.profiles FOR SELECT
  USING (true);
