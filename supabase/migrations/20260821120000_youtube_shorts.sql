-- ============================================================================
-- EDTECHRA-BITZ: YouTube Shorts Feed Integration & Library Migration
-- ============================================================================

-- 1. YouTube Shorts Table
CREATE TABLE IF NOT EXISTS public.youtube_shorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT UNIQUE NOT NULL,
  youtube_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'General',
  duration INTEGER DEFAULT 30,
  is_published BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  linked_quiz_id UUID REFERENCES public.quiz_bits(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_youtube_shorts_video_id ON public.youtube_shorts(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_shorts_published_category ON public.youtube_shorts(is_published, category);
CREATE INDEX IF NOT EXISTS idx_youtube_shorts_created_at ON public.youtube_shorts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_shorts_linked_quiz ON public.youtube_shorts(linked_quiz_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.youtube_shorts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published shorts
DROP POLICY IF EXISTS "Public read published youtube_shorts" ON public.youtube_shorts;
CREATE POLICY "Public read published youtube_shorts"
  ON public.youtube_shorts FOR SELECT
  USING (is_published = true OR public.is_admin());

-- Allow admins full insert/update/delete access
DROP POLICY IF EXISTS "Admins manage youtube_shorts" ON public.youtube_shorts;
CREATE POLICY "Admins manage youtube_shorts"
  ON public.youtube_shorts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Permissions Grant
GRANT ALL ON public.youtube_shorts TO anon, authenticated, service_role;
