-- ============================================================================
-- MIGRATION: ADD CLOZE_PASSAGE AND ESSAY QUESTION TYPES
-- Expands course_questions question_type check constraint with new types
-- ============================================================================

DO $$
BEGIN
    -- 1. Update question_type check constraint on course_questions table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'course_questions'
    ) THEN
        ALTER TABLE public.course_questions DROP CONSTRAINT IF EXISTS course_questions_question_type_check;
        ALTER TABLE public.course_questions ADD CONSTRAINT course_questions_question_type_check 
            CHECK (question_type IN (
                'multiple_choice', 
                'true_false', 
                'fill_blank', 
                'matching', 
                'sentence_builder', 
                'ordering', 
                'short_answer', 
                'cloze_passage', 
                'essay'
            ));
    END IF;
END $$;
