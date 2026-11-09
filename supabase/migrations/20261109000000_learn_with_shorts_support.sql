-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: LEARN WITH SHORTS (9:16) MICROLEARNING SUPPORT
-- Non-destructive, additive migration:
--   1. Expands course_blocks_block_type_check constraint (if present) to include
--      'learn_with_shorts' and all Course Studio block types.
--   2. Adds composite index on course_blocks(course_id, episode_id, block_type)
--      for fast microlearning block resolution.
--   3. Preserves 100% of existing courses, lessons, questions, and student progress.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_blocks_block_type_check'
  ) THEN
    ALTER TABLE public.course_blocks
      DROP CONSTRAINT course_blocks_block_type_check;

    ALTER TABLE public.course_blocks
      ADD CONSTRAINT course_blocks_block_type_check CHECK (
        block_type IN (
          'text',
          'heading',
          'text_image',
          'text_video',
          'image',
          'video',
          'youtube_video',
          'youtube_short',
          'learn_with_shorts',
          'question_set',
          'audio',
          'callout',
          'code',
          'quote',
          'list',
          'divider',
          'interactive_question',
          'objective',
          'illustration',
          'vocabulary_cards',
          'labelled_diagram',
          'icon_cards',
          'comparison',
          'did_you_know',
          'interactive_activity',
          'key_takeaway',
          'course_completion'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_blocks_course_episode_type
  ON public.course_blocks(course_id, episode_id, block_type);
