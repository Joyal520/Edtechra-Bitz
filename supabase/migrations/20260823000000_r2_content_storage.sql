-- ============================================================================
-- EDTECHRA-BITZ: Cloudflare R2 Content Storage & Media Schema Migration
-- ============================================================================

-- 1. Add R2 Content Pointers to One-Minute Readings
ALTER TABLE public.readings
  ADD COLUMN IF NOT EXISTS r2_content_key TEXT;

CREATE INDEX IF NOT EXISTS idx_readings_r2_content_key
  ON public.readings(r2_content_key);

-- 2. Add R2 Content Pointers and Media Columns to Quiz Bits
ALTER TABLE public.quiz_bits
  ADD COLUMN IF NOT EXISTS r2_content_key TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_object_key TEXT;

CREATE INDEX IF NOT EXISTS idx_quiz_bits_r2_content_key
  ON public.quiz_bits(r2_content_key);

-- 3. Add R2 Content Pointers and Media Columns to Polls
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS r2_content_key TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_object_key TEXT;

CREATE INDEX IF NOT EXISTS idx_polls_r2_content_key
  ON public.polls(r2_content_key);
