-- ============================================================================
-- EDTECHRA-BITZ: EXPAND LIBRARY RESOURCES FOR GAMES & TRAINING
-- Adds support for 'game' and 'training' resource types alongside
-- 'pdf', 'pptx', and 'web_blog', plus training metadata columns.
-- Preserves complete backward compatibility with all existing library resources.
-- ============================================================================

DO $$
BEGIN
    -- 1. Drop existing check constraint if it exists
    ALTER TABLE public.library_resources DROP CONSTRAINT IF EXISTS library_resources_file_type_check;

    -- 2. Add expanded check constraint supporting pdf, pptx, web_blog, game, training
    ALTER TABLE public.library_resources ADD CONSTRAINT library_resources_file_type_check
        CHECK (file_type IN ('pdf', 'pptx', 'web_blog', 'game', 'training'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating library_resources_file_type_check constraint: %', SQLERRM;
END $$;

-- 3. Add optional columns for Training & Games metadata
ALTER TABLE public.library_resources
    ADD COLUMN IF NOT EXISTS instructor TEXT,
    ADD COLUMN IF NOT EXISTS difficulty TEXT,
    ADD COLUMN IF NOT EXISTS duration TEXT,
    ADD COLUMN IF NOT EXISTS training_format TEXT;

-- 4. Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_library_resources_difficulty ON public.library_resources(difficulty);
CREATE INDEX IF NOT EXISTS idx_library_resources_training_format ON public.library_resources(training_format);
