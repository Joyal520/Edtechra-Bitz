-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: EXPAND SUBMISSION STATUSES & PERSISTENCE
-- Allows 'evaluating', 'evaluation_failed', 'processing', 'completed' in assignment_submissions
-- ============================================================================

DO $$
BEGIN
    -- 1. Safely update status check constraint on assignment_submissions
    ALTER TABLE public.assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_status_check;
    ALTER TABLE public.assignment_submissions ADD CONSTRAINT assignment_submissions_status_check
        CHECK (status IN (
            'draft',
            'submitted',
            'evaluating',
            'evaluation_failed',
            'processing',
            'graded',
            'completed',
            'returned',
            'resubmitted'
        ));

    -- 2. Ensure question_answers exists on assignment_submissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'question_answers'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN question_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- 3. Ensure assignment_id exists on ocr_evaluations (if table exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ocr_evaluations'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'ocr_evaluations' AND column_name = 'assignment_id'
        ) THEN
            ALTER TABLE public.ocr_evaluations ADD COLUMN assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- 4. Ensure ocr_evaluation_id exists on assignment_submissions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'ocr_evaluation_id'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN ocr_evaluation_id UUID REFERENCES public.ocr_evaluations(id) ON DELETE SET NULL;
    END IF;

    -- 5. Ensure ai_score exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'ai_score'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN ai_score NUMERIC(5,2) NULL;
    END IF;

    -- 6. Ensure final_score exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'final_score'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN final_score NUMERIC(5,2) NULL;
    END IF;

    -- 7. Ensure percentage exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'percentage'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN percentage NUMERIC(5,2) NULL;
    END IF;

    -- 8. Ensure is_ai_graded exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'is_ai_graded'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN is_ai_graded BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 9. Optimize lookup indexes
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_task_student ON public.assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions(status);
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ocr_evaluations' AND column_name = 'assignment_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_assignment_student ON public.ocr_evaluations(assignment_id, student_id);
    END IF;
END $$;
