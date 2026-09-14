-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: AI TEACHING PLANNER (PHASE 2A)
-- Creates ai_teaching_plans table with strict teacher RLS policies and indexes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_teaching_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    learning_goal TEXT,
    duration_days INTEGER NOT NULL DEFAULT 5,
    lesson_duration_minutes INTEGER DEFAULT 45,
    teacher_notes TEXT,
    plan_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    classroom_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_teaching_plans_class_created 
    ON public.ai_teaching_plans(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_teaching_plans_teacher 
    ON public.ai_teaching_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_teaching_plans_status 
    ON public.ai_teaching_plans(classroom_id, status);

-- Enable RLS on ai_teaching_plans
ALTER TABLE public.ai_teaching_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Teachers can view their classroom teaching plans" ON public.ai_teaching_plans;
    CREATE POLICY "Teachers can view their classroom teaching plans"
        ON public.ai_teaching_plans
        FOR SELECT
        USING (
            teacher_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_teaching_plans.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Teachers can insert their classroom teaching plans" ON public.ai_teaching_plans;
    CREATE POLICY "Teachers can insert their classroom teaching plans"
        ON public.ai_teaching_plans
        FOR INSERT
        WITH CHECK (
            teacher_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_teaching_plans.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Teachers can update their classroom teaching plans" ON public.ai_teaching_plans;
    CREATE POLICY "Teachers can update their classroom teaching plans"
        ON public.ai_teaching_plans
        FOR UPDATE
        USING (
            teacher_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_teaching_plans.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Teachers can delete their classroom teaching plans" ON public.ai_teaching_plans;
    CREATE POLICY "Teachers can delete their classroom teaching plans"
        ON public.ai_teaching_plans
        FOR DELETE
        USING (
            teacher_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_teaching_plans.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
