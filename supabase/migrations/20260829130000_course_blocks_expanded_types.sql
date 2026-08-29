-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: EXPAND COURSE BLOCKS CHECK CONSTRAINT
-- Adds support for 'text_image', 'text_video', 'video' alongside existing types.
-- Preserves complete backward compatibility with all existing course blocks.
-- ============================================================================

DO $$
BEGIN
    -- 1. Drop the existing course_blocks_block_type_check constraint if it exists
    ALTER TABLE public.course_blocks DROP CONSTRAINT IF EXISTS course_blocks_block_type_check;

    -- 2. Re-create constraint supporting all core, rich media, and editorial block types
    ALTER TABLE public.course_blocks ADD CONSTRAINT course_blocks_block_type_check
        CHECK (block_type IN (
            'text',
            'text_image',
            'text_video',
            'image',
            'video',
            'youtube_video',
            'youtube_short',
            'question_set',
            'audio',
            'callout',
            'code',
            'quote'
        ));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating course_blocks_block_type_check constraint: %', SQLERRM;
END $$;
