-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: EXPAND SUBMISSION STATUSES & PERSISTENCE
-- Allows 'evaluating', 'evaluation_failed', 'processing', 'completed' in assignment_submissions
-- ============================================================================

DO $$
BEGIN
    -- Safely update status check constraint on assignment_submissions
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

    -- Ensure question_answers exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'question_answers'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN question_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- Ensure ocr_evaluation_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'ocr_evaluation_id'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN ocr_evaluation_id UUID REFERENCES public.ocr_evaluations(id) ON DELETE SET NULL;
    END IF;

    -- Ensure ai_score exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'ai_score'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN ai_score NUMERIC(5,2) NULL;
    END IF;

    -- Ensure final_score exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'final_score'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN final_score NUMERIC(5,2) NULL;
    END IF;

    -- Ensure percentage exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'percentage'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN percentage NUMERIC(5,2) NULL;
    END IF;

    -- Ensure is_ai_graded exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'is_ai_graded'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN is_ai_graded BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_task_student ON public.assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_assignment_student ON public.ocr_evaluations(assignment_id, student_id);
