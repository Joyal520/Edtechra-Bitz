-- ============================================================================
-- EDTECHRA-BITZ: Knowledge Bitz 3-Question Reading Sections Migration
-- Migration: 20260917000000_knowledge_bitz_reading_sections.sql
--
-- Safely adds:
-- 1. reading_sections (JSONB array of exactly 3 Q&A objects)
-- 2. subtitle (TEXT optional curiosity subheadline)
-- 3. key_takeaway (TEXT optional concise summary)
-- Preserves existing reading_text and backwards compatibility for all records.
-- ============================================================================

ALTER TABLE public.knowledge_bitz ADD COLUMN IF NOT EXISTS reading_sections JSONB DEFAULT NULL;
ALTER TABLE public.knowledge_bitz ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT NULL;
ALTER TABLE public.knowledge_bitz ADD COLUMN IF NOT EXISTS key_takeaway TEXT DEFAULT NULL;

COMMENT ON COLUMN public.knowledge_bitz.reading_sections IS 'Array of 3 Question+Answer learning sections [{number: 1, question: "...", answer: "..."}]';
COMMENT ON COLUMN public.knowledge_bitz.subtitle IS 'Optional secondary title / hook (e.g. Why we value our own things more)';
COMMENT ON COLUMN public.knowledge_bitz.key_takeaway IS 'Core educational takeaway derived or written for the Bitz';
