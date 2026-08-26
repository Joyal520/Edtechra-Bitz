-- ============================================================================
-- EDTECHRA-BITZ: Assign Your Students Platform — 5 Categories & Hybrid Grading
-- ============================================================================

-- 1. Safely extend public.assignments table
DO $$
BEGIN
    -- category column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.assignments ADD COLUMN category TEXT NOT NULL DEFAULT 'assignment';
    END IF;

    -- subtitle column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'subtitle'
    ) THEN
        ALTER TABLE public.assignments ADD COLUMN subtitle TEXT NULL;
    END IF;

    -- content_blocks column (sections, explanation, media, text, examples, vocabulary)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'content_blocks'
    ) THEN
        ALTER TABLE public.assignments ADD COLUMN content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- questions column (structured questions with deterministic & AI rubrics)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'questions'
    ) THEN
        ALTER TABLE public.assignments ADD COLUMN questions JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- settings column (immediate feedback, show correct answers, allow retry, AI feedback)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'settings'
    ) THEN
        ALTER TABLE public.assignments ADD COLUMN settings JSONB NOT NULL DEFAULT '{"show_result_immediately": true, "show_correct_answers": true, "allow_retry": false, "enable_ai_feedback": true}'::jsonb;
    END IF;

    -- version column (protect historical attempts against future question edits)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'version'
    ) THEN
        ALTER TABLE public.assignments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Check constraint for 5 task categories
DO $$
BEGIN
    ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_category_check;
    ALTER TABLE public.assignments ADD CONSTRAINT assignments_category_check
        CHECK (category IN ('assignment', 'lesson', 'practice', 'activity', 'resource'));

    ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
    ALTER TABLE public.assignments ADD CONSTRAINT assignments_assignment_type_check
        CHECK (assignment_type IN ('task', 'quiz', 'exam', 'competition', 'activity_spree', 'assignment', 'lesson', 'practice', 'activity', 'resource'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Safely extend public.assignment_submissions table for Hybrid Auto-Grading
DO $$
BEGIN
    -- question_answers column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'question_answers'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN question_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- ai_score column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'ai_score'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN ai_score NUMERIC(5,2) NULL;
    END IF;

    -- final_score column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'final_score'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN final_score NUMERIC(5,2) NULL;
    END IF;

    -- percentage column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'percentage'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN percentage NUMERIC(5,2) NULL;
    END IF;

    -- is_ai_graded column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'is_ai_graded'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN is_ai_graded BOOLEAN DEFAULT FALSE;
    END IF;

    -- teacher_adjusted column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'teacher_adjusted'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN teacher_adjusted BOOLEAN DEFAULT FALSE;
    END IF;

    -- teacher_adjustment_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'teacher_adjustment_reason'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN teacher_adjustment_reason TEXT NULL;
    END IF;

    -- task_version column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'task_version'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN task_version INTEGER DEFAULT 1;
    END IF;

    -- completed_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'assignment_submissions' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.assignment_submissions ADD COLUMN completed_at TIMESTAMPTZ NULL;
    END IF;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_classroom_category ON public.assignments(classroom_id, category);
CREATE INDEX IF NOT EXISTS idx_assignments_classroom_status ON public.assignments(classroom_id, status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_completed_at ON public.assignment_submissions(completed_at);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_final_score ON public.assignment_submissions(assignment_id, final_score DESC);
