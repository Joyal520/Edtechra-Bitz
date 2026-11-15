-- ============================================================================
-- Classroom Jigsaw: Image-Based Interactive Questions & Student Progress State
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.jigsaw_assignment_question_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL,
  questions_enabled BOOLEAN NOT NULL DEFAULT false,
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  sealed_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, level_id)
);

CREATE TABLE IF NOT EXISTS public.jigsaw_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL,
  puzzle_completed BOOLEAN NOT NULL DEFAULT false,
  puzzle_completed_at TIMESTAMPTZ,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  puzzle_points INTEGER NOT NULL DEFAULT 0,
  question_points INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id, level_id)
);

ALTER TABLE public.jigsaw_assignment_question_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jigsaw_student_progress ENABLE ROW LEVEL SECURITY;

-- Strict teacher-only access to answer keys: students never have direct SELECT access.
DROP POLICY IF EXISTS jigsaw_question_keys_teacher_all ON public.jigsaw_assignment_question_keys;
CREATE POLICY jigsaw_question_keys_teacher_all
  ON public.jigsaw_assignment_question_keys
  FOR ALL
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS jigsaw_student_progress_own_read ON public.jigsaw_student_progress;
CREATE POLICY jigsaw_student_progress_own_read
  ON public.jigsaw_student_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = jigsaw_student_progress.classroom_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_jigsaw_keys_assignment_level
  ON public.jigsaw_assignment_question_keys (assignment_id, level_id);

CREATE INDEX IF NOT EXISTS idx_jigsaw_progress_lookup
  ON public.jigsaw_student_progress (assignment_id, student_id, level_id);
