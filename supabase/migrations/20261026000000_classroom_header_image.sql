-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: SEPARATE CLASSROOM CARD FROM CLASSROOM HEADER
-- Migration: Add dedicated classroom_header_image column to classrooms table
-- ============================================================================

-- 1. Add dedicated classroom_header_image column (independent from banner_url)
ALTER TABLE public.classrooms
ADD COLUMN IF NOT EXISTS classroom_header_image TEXT;

-- 2. Comment explaining separation of concerns
COMMENT ON COLUMN public.classrooms.classroom_header_image IS 'Dedicated full-bleed cover image for classroom detail header. Independent from card thumbnail (banner_url). Falls back to /images/classroom/edtechra-default-classroom-header.png when null.';

-- 3. Ensure any existing classrooms retain their existing card image (banner_url)
-- Existing classrooms safely retain their current appearance.
