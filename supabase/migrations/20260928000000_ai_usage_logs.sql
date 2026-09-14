-- ============================================================================
-- EDTECHRA AI USAGE LOGS MIGRATION
-- Stores audit trail and token consumption records for Gemini & GPT-5 Nano
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT true,
    fallback_used BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit & Query Indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON public.ai_usage_logs(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_task_type ON public.ai_usage_logs(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins & Teachers can view AI usage logs
DROP POLICY IF EXISTS "Authenticated users can read AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Authenticated users can read AI usage logs"
    ON public.ai_usage_logs
    FOR SELECT
    USING (auth.role() = 'authenticated');
