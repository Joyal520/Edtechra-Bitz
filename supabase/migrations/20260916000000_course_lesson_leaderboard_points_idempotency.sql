-- ============================================================================
-- EDTECHRA-BITZ: Course Studio Lesson Completion Leaderboard Points Idempotency
-- Ensures each lesson / activity reward (source_id) can only be awarded once
-- per (classroom_id, student_id, source_type, source_id) at the database level.
-- ============================================================================

-- 1. Safely remove any historical duplicate point rows with identical
--    (classroom_id, student_id, source_type, source_id), keeping the earliest row.
DELETE FROM public.classroom_points a
USING public.classroom_points b
WHERE a.source_id IS NOT NULL
  AND b.source_id IS NOT NULL
  AND a.classroom_id = b.classroom_id
  AND a.student_id = b.student_id
  AND a.source_type = b.source_type
  AND a.source_id = b.source_id
  AND (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id > b.id));

-- 2. Enforce strict database-level idempotency across all source types with a source_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_classroom_points_source_idempotency
  ON public.classroom_points (classroom_id, student_id, source_type, source_id)
  WHERE source_id IS NOT NULL;
