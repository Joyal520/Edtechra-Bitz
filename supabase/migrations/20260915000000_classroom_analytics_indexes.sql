-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: PHASE 2 — ANALYTICS PERFORMANCE INDEXES
-- Optimizes classroom-scoped time-series queries for analytics engine.
-- ============================================================================

-- 1. Classroom Membership Index for Fast Student Filtering & Teacher Exclusion
CREATE INDEX IF NOT EXISTS idx_classroom_members_class_role_status
  ON public.classroom_members(classroom_id, role, status);

-- 2. Performance Indexes for Classroom-Scoped Time Series
CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_class_time
  ON public.classroom_exam_results(classroom_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_quiz_results_class_time
  ON public.live_quiz_results(classroom_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_class_time
  ON public.ocr_evaluations(class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_class_time
  ON public.assignment_submissions(classroom_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_challenge_submissions_class_time
  ON public.ai_challenge_submissions(student_id, submitted_at DESC);
