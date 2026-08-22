-- ============================================================================
-- EDTECHRA-BITZ: User Preferences & Accessibility Settings Migration
-- ============================================================================

-- Add text_size column to public.profiles if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS text_size TEXT DEFAULT 'medium'
  CHECK (text_size IN ('small', 'medium', 'large', 'extra-large'));

-- Index for text_size query
CREATE INDEX IF NOT EXISTS idx_profiles_text_size ON public.profiles(text_size);

-- Ensure RLS allows users to update their own profile fields
DROP POLICY IF EXISTS "Users can update own profile or admin update all" ON public.profiles;
CREATE POLICY "Users can update own profile or admin update all"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());
