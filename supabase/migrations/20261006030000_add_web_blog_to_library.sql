-- ============================================================================
-- EDTECHRA-BITZ: EXPAND LIBRARY RESOURCES CHECK CONSTRAINT FOR WEB / BLOGS
-- Adds support for 'web_blog' in addition to 'pdf' and 'pptx'.
-- Preserves complete backward compatibility with all existing library resources.
-- ============================================================================

DO $$
BEGIN
    -- 1. Drop existing check constraint if it exists
    ALTER TABLE public.library_resources DROP CONSTRAINT IF EXISTS library_resources_file_type_check;

    -- 2. Add expanded check constraint supporting web_blog
    ALTER TABLE public.library_resources ADD CONSTRAINT library_resources_file_type_check
        CHECK (file_type IN ('pdf', 'pptx', 'web_blog'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating library_resources_file_type_check constraint: %', SQLERRM;
END $$;
