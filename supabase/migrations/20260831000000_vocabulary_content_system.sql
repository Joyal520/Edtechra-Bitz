-- ============================================================================
-- EDTECHRA-BITZ: Unified Vocabulary Content System Migration
-- Supports 4 Content Types: 'word', 'collocation', 'phrasal_verb', 'idiom'
-- Non-destructive schema extension with backfill and import audit table
-- ============================================================================

-- 1. Extend words_of_the_day table non-destructively
ALTER TABLE public.words_of_the_day
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'word',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS definition TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS phonetic TEXT,
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'manually_approved',
  ADD COLUMN IF NOT EXISTS validation_provider TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS validation_message TEXT,
  ADD COLUMN IF NOT EXISTS validation_score NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS validation_warnings JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 2. Backfill existing records
UPDATE public.words_of_the_day
SET
  content_type = 'word'
WHERE content_type IS NULL;

UPDATE public.words_of_the_day
SET
  title = word
WHERE title IS NULL OR title = '';

UPDATE public.words_of_the_day
SET
  definition = meaning
WHERE definition IS NULL OR definition = '';

UPDATE public.words_of_the_day
SET
  validation_status = 'manually_approved',
  validation_provider = 'manual'
WHERE validation_status IS NULL;

-- 3. Add check constraint for valid content_types if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_vocabulary_content_type'
  ) THEN
    ALTER TABLE public.words_of_the_day
      ADD CONSTRAINT check_vocabulary_content_type
      CHECK (content_type IN ('word', 'collocation', 'phrasal_verb', 'idiom'));
  END IF;
END $$;

-- 4. Create Indexes for performant filtering, scheduling, and validation queries
CREATE INDEX IF NOT EXISTS idx_vocabulary_content_type ON public.words_of_the_day(content_type);
CREATE INDEX IF NOT EXISTS idx_vocabulary_scheduled_at ON public.words_of_the_day(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_vocabulary_validation_status ON public.words_of_the_day(validation_status);
CREATE INDEX IF NOT EXISTS idx_vocabulary_title ON public.words_of_the_day(title);

-- 5. Create vocabulary_import_batches table for audit history
CREATE TABLE IF NOT EXISTS public.vocabulary_import_batches (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT,
  content_type TEXT NOT NULL DEFAULT 'mixed',
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  gemini_validated_count INTEGER NOT NULL DEFAULT 0,
  fallback_validated_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_import_batches_created ON public.vocabulary_import_batches(created_at DESC);

-- 6. Enable RLS on import batches
ALTER TABLE public.vocabulary_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage vocabulary import batches" ON public.vocabulary_import_batches;
CREATE POLICY "Admins can manage vocabulary import batches"
  ON public.vocabulary_import_batches
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
