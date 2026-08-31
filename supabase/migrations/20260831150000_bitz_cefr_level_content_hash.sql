-- ============================================================================
-- EDTECHRA-BITZ: Add CEFR English Level + Content Deduplication Hash
-- Migration: 20260831150000_bitz_cefr_level_content_hash.sql
--
-- Adds:
-- 1. cefr_level column (A1/A2/B1/B2/C1/C2) with default B1
-- 2. content_hash column for import deduplication
-- ============================================================================

-- 1. Add CEFR English Level column
ALTER TABLE public.knowledge_bitz
  ADD COLUMN IF NOT EXISTS cefr_level TEXT NOT NULL DEFAULT 'B1'
    CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

-- 2. Add Content Hash column for deduplication
ALTER TABLE public.knowledge_bitz
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 3. Unique partial index on content_hash (prevents duplicate imports)
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_bitz_content_hash
  ON public.knowledge_bitz(content_hash)
  WHERE content_hash IS NOT NULL;

-- 4. Index on cefr_level for filtered queries
CREATE INDEX IF NOT EXISTS idx_knowledge_bitz_cefr_level
  ON public.knowledge_bitz(cefr_level);
