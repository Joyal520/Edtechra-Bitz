-- =============================================================================
-- Migration: 20261027000000_deadline_batch_diagnostic_system.sql
-- Purpose:
--   1. Add deadline & batch analysis lifecycle columns to classroom activity
--      tables (assignments, classroom_exams, live_quiz_sessions, ai_challenges,
--      ocr_evaluations).
--   2. Create `ai_analysis_batches` table for idempotent, deadline-based batch
--      AI analysis with deduplication, retry policy, and cost tracking.
--   3. Extend `ai_classroom_insights` with batch tracking, source activity/evidence
--      IDs, processing status, version history, and widened provider check.
-- =============================================================================

-- 1. Activity Tables: Deadline & Analysis Lifecycle Columns
ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analysis_batch_id UUID NULL;

ALTER TABLE IF EXISTS public.classroom_exams
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analysis_batch_id UUID NULL;

ALTER TABLE IF EXISTS public.live_quiz_sessions
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analysis_batch_id UUID NULL;

ALTER TABLE IF EXISTS public.ai_challenges
  ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analysis_batch_id UUID NULL;

ALTER TABLE IF EXISTS public.ocr_evaluations
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'closed_pending_analysis',
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS analysis_batch_id UUID NULL;

-- Helpful indexes for deadline & batch workers
CREATE INDEX IF NOT EXISTS idx_assignments_deadline_analysis
  ON public.assignments (classroom_id, analysis_status, due_date);

CREATE INDEX IF NOT EXISTS idx_classroom_exams_deadline_analysis
  ON public.classroom_exams (classroom_id, analysis_status, ends_at);

CREATE INDEX IF NOT EXISTS idx_live_quiz_sessions_deadline_analysis
  ON public.live_quiz_sessions (classroom_id, analysis_status, status, deadline_at);

CREATE INDEX IF NOT EXISTS idx_ai_challenges_deadline_analysis
  ON public.ai_challenges (classroom_id, analysis_status, deadline_at);

-- 2. Batch Analysis Queue & Audit Table (`public.ai_analysis_batches`)
CREATE TABLE IF NOT EXISTS public.ai_analysis_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  course_id UUID NULL,
  batch_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'closed_pending_analysis'
    CHECK (status IN ('open', 'closed_pending_analysis', 'processing', 'completed', 'failed')),
  trigger_reason TEXT NOT NULL DEFAULT 'deadline_reached',
  activity_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  diagnosis_output_json JSONB NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  ai_provider TEXT NULL,
  ai_model TEXT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_analysis_batches_classroom_key UNIQUE (classroom_id, batch_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_batches_classroom_status
  ON public.ai_analysis_batches (classroom_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_batches_retry
  ON public.ai_analysis_batches (status, next_retry_at)
  WHERE status = 'failed';

ALTER TABLE public.ai_analysis_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view analysis batches for own classrooms" ON public.ai_analysis_batches;
CREATE POLICY "Teachers can view analysis batches for own classrooms"
  ON public.ai_analysis_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = ai_analysis_batches.classroom_id
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can manage analysis batches for own classrooms" ON public.ai_analysis_batches;
CREATE POLICY "Teachers can manage analysis batches for own classrooms"
  ON public.ai_analysis_batches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = ai_analysis_batches.classroom_id
        AND c.teacher_id = auth.uid()
    )
  );

-- 3. Extend `public.ai_classroom_insights` for Batch Tracking & Version History
ALTER TABLE IF EXISTS public.ai_classroom_insights
  ADD COLUMN IF NOT EXISTS batch_id UUID NULL REFERENCES public.ai_analysis_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS source_activity_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS diagnosis_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_versions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_model TEXT NULL;

-- Drop overly restrictive ai_provider check constraint if present so deterministic_analytics / gemini / openai all succeed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_classroom_insights_ai_provider_check'
  ) THEN
    ALTER TABLE public.ai_classroom_insights
      DROP CONSTRAINT ai_classroom_insights_ai_provider_check;
  END IF;
END $$;
