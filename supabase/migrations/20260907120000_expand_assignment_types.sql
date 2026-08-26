-- Expand assignments_assignment_type_check to include 5 categories
DO $$
BEGIN
    ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
    ALTER TABLE public.assignments ADD CONSTRAINT assignments_assignment_type_check
        CHECK (assignment_type IN ('task', 'quiz', 'exam', 'competition', 'activity_spree', 'assignment', 'lesson', 'practice', 'activity', 'resource'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
