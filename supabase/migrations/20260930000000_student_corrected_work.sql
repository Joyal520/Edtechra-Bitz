-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: STUDENT CORRECTED WORK & R2 METADATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_corrected_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    submission_id TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('writing_task', 'ocr_handwritten', 'assignment', 'challenge')),
    title TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'document' CHECK (file_type IN ('document', 'image', 'pdf')),
    original_r2_key TEXT,
    original_file_url TEXT,
    corrected_r2_key TEXT,
    corrected_file_url TEXT,
    score NUMERIC(6, 2),
    max_score NUMERIC(6, 2) DEFAULT 100,
    percentage NUMERIC(5, 2),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('submitted', 'processing', 'completed', 'graded')),
    feedback_text TEXT,
    feedback_metadata JSONB DEFAULT '{}'::jsonb,
    ai_evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_student_corrected_work_student ON public.student_corrected_work(student_id);
CREATE INDEX IF NOT EXISTS idx_student_corrected_work_classroom ON public.student_corrected_work(classroom_id);
CREATE INDEX IF NOT EXISTS idx_student_corrected_work_created ON public.student_corrected_work(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_corrected_work ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Students can only SELECT their own records
DROP POLICY IF EXISTS "Students can view their own corrected work" ON public.student_corrected_work;
CREATE POLICY "Students can view their own corrected work" ON public.student_corrected_work
    FOR SELECT
    USING (
        auth.uid() = student_id
        OR (classroom_id IS NOT NULL AND public.is_classroom_teacher(classroom_id, auth.uid()))
    );

DROP POLICY IF EXISTS "Students can insert their own work" ON public.student_corrected_work;
CREATE POLICY "Students can insert their own work" ON public.student_corrected_work
    FOR INSERT
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers and students can update their corrected work" ON public.student_corrected_work;
CREATE POLICY "Teachers and students can update their corrected work" ON public.student_corrected_work
    FOR UPDATE
    USING (
        auth.uid() = student_id
        OR (classroom_id IS NOT NULL AND public.is_classroom_teacher(classroom_id, auth.uid()))
    );

GRANT SELECT, INSERT, UPDATE ON public.student_corrected_work TO authenticated, service_role;
