-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: AI TEACHING INTELLIGENCE & 30-DAY REPORTS
-- Creates lightweight caching tables for AI insights and 30-Day performance reports
-- with strict teacher isolation RLS policies.
-- ============================================================================

-- 1. AI Classroom Insights Cache Table
CREATE TABLE IF NOT EXISTS public.ai_classroom_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    data_hash TEXT NOT NULL,
    metrics_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    intelligence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_provider TEXT NOT NULL DEFAULT 'gemini' CHECK (ai_provider IN ('gemini', 'openai_fallback', 'deterministic_cache', 'cached')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_classroom_insights_class_created 
    ON public.ai_classroom_insights(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_classroom_insights_teacher 
    ON public.ai_classroom_insights(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_classroom_insights_hash 
    ON public.ai_classroom_insights(classroom_id, data_hash);

-- Enable RLS on ai_classroom_insights
ALTER TABLE public.ai_classroom_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Teachers can view their classroom insights" ON public.ai_classroom_insights;
    CREATE POLICY "Teachers can view their classroom insights"
        ON public.ai_classroom_insights
        FOR SELECT
        USING (
            teacher_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_classroom_insights.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Teachers can insert their classroom insights" ON public.ai_classroom_insights;
    CREATE POLICY "Teachers can insert their classroom insights"
        ON public.ai_classroom_insights
        FOR INSERT
        WITH CHECK (
            teacher_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_classroom_insights.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Teachers can update their classroom insights" ON public.ai_classroom_insights;
    CREATE POLICY "Teachers can update their classroom insights"
        ON public.ai_classroom_insights
        FOR UPDATE
        USING (teacher_id = auth.uid());

    DROP POLICY IF EXISTS "Teachers can delete their classroom insights" ON public.ai_classroom_insights;
    CREATE POLICY "Teachers can delete their classroom insights"
        ON public.ai_classroom_insights
        FOR DELETE
        USING (teacher_id = auth.uid());
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. AI Classroom 30-Day Performance Reports Table
CREATE TABLE IF NOT EXISTS public.ai_classroom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_period TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL DEFAULT '30-Day Classroom Performance Report',
    metrics_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    report_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_provider TEXT NOT NULL DEFAULT 'cloudflare_r2',
    storage_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    ai_provider TEXT NOT NULL DEFAULT 'gemini',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_classroom_reports_class_created 
    ON public.ai_classroom_reports(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_classroom_reports_teacher 
    ON public.ai_classroom_reports(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_classroom_reports_period 
    ON public.ai_classroom_reports(classroom_id, report_period);

-- Enable RLS on ai_classroom_reports
ALTER TABLE public.ai_classroom_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Teachers can view their classroom reports" ON public.ai_classroom_reports;
    CREATE POLICY "Teachers can view their classroom reports"
        ON public.ai_classroom_reports
        FOR SELECT
        USING (
            teacher_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_classroom_reports.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Teachers can insert their classroom reports" ON public.ai_classroom_reports;
    CREATE POLICY "Teachers can insert their classroom reports"
        ON public.ai_classroom_reports
        FOR INSERT
        WITH CHECK (
            teacher_id = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.classrooms c 
                WHERE c.id = ai_classroom_reports.classroom_id 
                AND c.teacher_id = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Teachers can delete their classroom reports" ON public.ai_classroom_reports;
    CREATE POLICY "Teachers can delete their classroom reports"
        ON public.ai_classroom_reports
        FOR DELETE
        USING (teacher_id = auth.uid());
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
