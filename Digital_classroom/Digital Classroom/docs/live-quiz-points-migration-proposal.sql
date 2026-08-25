-- Proposal only. Do not apply automatically.
-- Long-term Live Quiz -> Digital Classroom point sync hardening.

CREATE TABLE IF NOT EXISTS public.live_quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    live_quiz_session_id TEXT NOT NULL,
    quiz_id TEXT,
    source TEXT NOT NULL DEFAULT 'edtechra-live-quiz',
    student_name TEXT DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    accuracy INTEGER NOT NULL DEFAULT 0,
    final_rank INTEGER,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (classroom_id, profile_id, live_quiz_session_id)
);

ALTER TABLE public.classroom_points
    ADD COLUMN IF NOT EXISTS source_type TEXT,
    ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.live_quiz_results(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_classroom_points_live_quiz_once
    ON public.classroom_points (classroom_id, profile_id, source_type, source_id)
    WHERE source_type = 'live_quiz' AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_quiz_results_classroom_session
    ON public.live_quiz_results (classroom_id, live_quiz_session_id);

ALTER TABLE public.live_quiz_results ENABLE ROW LEVEL SECURITY;

-- Suggested policies:
-- 1. Teachers can read/manage results for classrooms they own.
-- 2. Students can read their own result rows.
-- 3. Inserts should go through trusted server APIs using the service role.
