-- ============================================================================
-- EDTECHRA-BITZ: Safe Article AI Image Generation Schema Enhancement
-- ============================================================================

-- Add AI image generation tracking columns to readings table safely & idempotently
ALTER TABLE public.readings 
  ADD COLUMN IF NOT EXISTS image_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS image_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_error TEXT,
  ADD COLUMN IF NOT EXISTS image_provider TEXT DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS image_model TEXT,
  ADD COLUMN IF NOT EXISTS image_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS image_generation_attempts INTEGER DEFAULT 0;

-- Create index for filtering by image status
CREATE INDEX IF NOT EXISTS idx_readings_image_status ON public.readings(image_status);

-- Update existing readings: if cover_image_url is present, set image_status = 'none' (or 'generated' if R2 ai-cover), else 'none'
UPDATE public.readings
SET image_status = 'none'
WHERE image_status IS NULL;
