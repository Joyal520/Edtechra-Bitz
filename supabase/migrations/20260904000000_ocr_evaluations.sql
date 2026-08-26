-- ============================================================================
-- EDTECHRA-BITZ: AI OCR Worksheet Evaluations Table & RLS Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ocr_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'Paragraph Writing',
        'Essay Writing',
        'Story Writing',
        'Letter Writing',
        'Handwritten Neatness',
        'Other'
    )),
    title TEXT DEFAULT '',
    max_marks INTEGER NOT NULL DEFAULT 100 CHECK (max_marks > 0),
    score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    ai_original_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    final_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    performance TEXT NOT NULL DEFAULT 'Good',
    breakdown_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    feedback TEXT NOT NULL DEFAULT '',
    ai_original_feedback TEXT NOT NULL DEFAULT '',
    is_teacher_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    error_message TEXT,
    temporary_file_key TEXT,
    report_file_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_student_id ON public.ocr_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_class_id ON public.ocr_evaluations(class_id);
CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_teacher_id ON public.ocr_evaluations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_status ON public.ocr_evaluations(status);
CREATE INDEX IF NOT EXISTS idx_ocr_evaluations_created_at ON public.ocr_evaluations(created_at DESC);

-- Enable RLS
ALTER TABLE public.ocr_evaluations ENABLE ROW LEVEL SECURITY;

-- Helper RLS Check (reuse existing helper functions if present)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Teachers can manage classroom evaluations" ON public.ocr_evaluations;
    CREATE POLICY "Teachers can manage classroom evaluations" ON public.ocr_evaluations
        FOR ALL USING (
            public.is_classroom_teacher(class_id, auth.uid()) OR auth.uid() = teacher_id
        );

    DROP POLICY IF EXISTS "Students can view their own completed evaluations" ON public.ocr_evaluations;
    CREATE POLICY "Students can view their own completed evaluations" ON public.ocr_evaluations
        FOR SELECT USING (
            auth.uid() = student_id AND status = 'completed'
        );
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
