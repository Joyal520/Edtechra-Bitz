-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO ENGINE-LEVEL INTEGRITY UPGRADE
-- Non-destructive, additive migration for:
--   1. Video Completion Enforcement (90% segment-tracked playback & persistence)
--   2. Typing-Only Writing Assessments & Telemetry
--   3. AI Content Assessment, Provider Failover & Teacher Review Workflow
-- Preserves 100% of existing courses, student progress, and historical attempts.
-- ============================================================================

-- 1. Extend course_episode_progress with verified video completion columns
ALTER TABLE public.course_episode_progress
  ADD COLUMN IF NOT EXISTS video_watched_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_watched_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_completed_at TIMESTAMPTZ;

-- 2. Create course_video_progress table for granular per-video segment tracking
CREATE TABLE IF NOT EXISTS public.course_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES public.course_episodes(id) ON DELETE CASCADE,
  video_key TEXT NOT NULL DEFAULT 'default',
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  watched_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  watched_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_allowed_position NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, episode_id, video_key)
);

CREATE INDEX IF NOT EXISTS idx_course_video_progress_student_episode
  ON public.course_video_progress(student_id, episode_id);

CREATE INDEX IF NOT EXISTS idx_course_video_progress_course_episode
  ON public.course_video_progress(course_id, episode_id);

-- 3. Extend course_question_attempts with writing submission, AI detection,
--    provider metadata, evaluation timestamps, and teacher review columns
ALTER TABLE public.course_question_attempts
  ADD COLUMN IF NOT EXISTS word_count INTEGER,
  ADD COLUMN IF NOT EXISTS submission_status TEXT NOT NULL DEFAULT 'evaluated',
  ADD COLUMN IF NOT EXISTS ai_likelihood_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ai_confidence TEXT,
  ADD COLUMN IF NOT EXISTS assessment_status TEXT,
  ADD COLUMN IF NOT EXISTS ai_explanation TEXT,
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_feedback JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS typing_telemetry JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS teacher_review_status TEXT,
  ADD COLUMN IF NOT EXISTS teacher_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS teacher_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS teacher_review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_course_question_attempts_flagged_review
  ON public.course_question_attempts(course_id, flagged_for_review)
  WHERE flagged_for_review = TRUE;

-- 4. Row-Level Security (RLS) Policies for course_video_progress
ALTER TABLE public.course_video_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own video progress" ON public.course_video_progress;
CREATE POLICY "Students can read own video progress"
  ON public.course_video_progress
  FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read course video progress" ON public.course_video_progress;
CREATE POLICY "Teachers can read course video progress"
  ON public.course_video_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_video_progress.course_id
        AND c.teacher_id = auth.uid()
    )
  );
