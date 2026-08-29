-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: COURSE COVER ASPECT RATIO (1:1 & 16:9)
-- Adds cover_aspect_ratio column to courses table.
-- ============================================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cover_aspect_ratio TEXT NOT NULL DEFAULT '16:9';

COMMENT ON COLUMN public.courses.cover_aspect_ratio IS 'Aspect ratio for course card cover page (1:1 square or 16:9 landscape banner)';
