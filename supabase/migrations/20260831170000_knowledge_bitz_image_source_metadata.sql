-- ============================================================================
-- EDTECHRA-BITZ: Add Pixabay & Image Source Metadata Columns
-- Migration: 20260831170000_knowledge_bitz_image_source_metadata.sql
--
-- Adds:
-- 1. image_source (TEXT DEFAULT 'none' CHECK ('none', 'admin', 'manual', 'pixabay', 'gemini', 'pexels', 'unsplash', 'openverse'))
-- 2. image_source_id (TEXT DEFAULT NULL) - Pixabay/Source photo ID
-- 3. image_source_url (TEXT DEFAULT NULL) - Pixabay photo page URL
-- ============================================================================

-- 1. Add image_source column
ALTER TABLE public.knowledge_bitz
  ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'none';

-- 2. Add image_source_id column for source tracking
ALTER TABLE public.knowledge_bitz
  ADD COLUMN IF NOT EXISTS image_source_id TEXT DEFAULT NULL;

-- 3. Add image_source_url column for citation and attribution
ALTER TABLE public.knowledge_bitz
  ADD COLUMN IF NOT EXISTS image_source_url TEXT DEFAULT NULL;

-- 4. Create index on image_source for admin filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_image_source
  ON public.knowledge_bitz(image_source);
