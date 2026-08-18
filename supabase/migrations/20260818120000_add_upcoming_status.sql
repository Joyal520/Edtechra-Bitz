-- ============================================================================
-- EDTECHRA-BITZ: Migration - Add 'upcoming' status to YouTube learning content
-- ============================================================================

-- 1. Update check constraint on public.youtube_learning_content to include 'upcoming'
ALTER TABLE public.youtube_learning_content
DROP CONSTRAINT IF EXISTS youtube_learning_content_status_check;

ALTER TABLE public.youtube_learning_content
ADD CONSTRAINT youtube_learning_content_status_check
CHECK (status IN ('draft', 'published', 'archived', 'upcoming'));

-- 2. Add status column to public.youtube_videos with default 'published'
ALTER TABLE public.youtube_videos
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- 3. Update public read policy on youtube_learning_content to allow reading upcoming bitz
DROP POLICY IF EXISTS "Public read published youtube_learning_content" ON public.youtube_learning_content;
CREATE POLICY "Public read published youtube_learning_content"
  ON public.youtube_learning_content FOR SELECT
  USING (status IN ('published', 'upcoming') OR public.is_admin());
