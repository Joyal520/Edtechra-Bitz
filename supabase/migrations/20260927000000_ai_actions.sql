-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: AI ACTION EXECUTION BUS (PHASE 2B)
-- Defines public.ai_actions table, state machine, idempotency index, and RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teaching_plan_id UUID REFERENCES public.ai_teaching_plans(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'create_diagnostic_exam',
        'create_learning_resource',
        'post_announcement',
        'create_live_quiz',
        'schedule_live_quiz'
    )),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_payload JSONB DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'running',
        'completed',
        'failed',
        'cancelled'
    )),
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    scheduled_for TIMESTAMPTZ DEFAULT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    executed_at TIMESTAMPTZ DEFAULT NULL
);

-- Optimization & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_ai_actions_classroom ON public.ai_actions(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_plan ON public.ai_actions(teaching_plan_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_scheduler ON public.ai_actions(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_ai_actions_teacher ON public.ai_actions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_type ON public.ai_actions(action_type);

-- Enable Row Level Security
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

-- 1. Teachers can view actions for their classrooms
DROP POLICY IF EXISTS "Teachers can view actions for their classrooms" ON public.ai_actions;
CREATE POLICY "Teachers can view actions for their classrooms"
    ON public.ai_actions
    FOR SELECT
    USING (
        teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = ai_actions.classroom_id
            AND c.teacher_id = auth.uid()
        )
    );

-- 2. Teachers can insert actions for their classrooms
DROP POLICY IF EXISTS "Teachers can insert actions for their classrooms" ON public.ai_actions;
CREATE POLICY "Teachers can insert actions for their classrooms"
    ON public.ai_actions
    FOR INSERT
    WITH CHECK (
        teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = ai_actions.classroom_id
            AND c.teacher_id = auth.uid()
        )
    );

-- 3. Teachers can update actions for their classrooms
DROP POLICY IF EXISTS "Teachers can update actions for their classrooms" ON public.ai_actions;
CREATE POLICY "Teachers can update actions for their classrooms"
    ON public.ai_actions
    FOR UPDATE
    USING (
        teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = ai_actions.classroom_id
            AND c.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = ai_actions.classroom_id
            AND c.teacher_id = auth.uid()
        )
    );

-- 4. Teachers can delete actions for their classrooms
DROP POLICY IF EXISTS "Teachers can delete actions for their classrooms" ON public.ai_actions;
CREATE POLICY "Teachers can delete actions for their classrooms"
    ON public.ai_actions
    FOR DELETE
    USING (
        teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = ai_actions.classroom_id
            AND c.teacher_id = auth.uid()
        )
    );
