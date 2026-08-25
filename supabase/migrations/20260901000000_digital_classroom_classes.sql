-- ============================================================================
-- EDTECHRA-BITZ: Native Digital Classroom ("Classes") Database Migration
-- ============================================================================

-- 1. Safely update profiles role check constraint to include 'teacher'
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('student', 'teacher', 'admin'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Classrooms Table
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    theme TEXT DEFAULT 'theme-blue',
    description TEXT DEFAULT '',
    banner_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON public.classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_is_archived ON public.classrooms(is_archived);
CREATE INDEX IF NOT EXISTS idx_classrooms_created_at ON public.classrooms(created_at DESC);

-- 3. Classroom Members (Roster)
CREATE TABLE IF NOT EXISTS public.classroom_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'co-teacher', 'student')),
    display_name TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed', 'blocked')),
    UNIQUE (classroom_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom_id ON public.classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_profile_id ON public.classroom_members(profile_id);

-- 4. Classroom Invites (Shareable Links & 6-character short codes)
CREATE TABLE IF NOT EXISTS public.classroom_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    max_uses INTEGER DEFAULT 0, -- 0 = unlimited
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_invites_classroom_id ON public.classroom_invites(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_invites_code ON public.classroom_invites(invite_code);

-- 5. Classroom Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT DEFAULT '',
    assignment_type TEXT NOT NULL DEFAULT 'task' CHECK (assignment_type IN ('task', 'quiz', 'exam', 'competition', 'activity_spree')),
    points INTEGER NOT NULL DEFAULT 100,
    due_date TIMESTAMPTZ,
    attachment_urls JSONB DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed', 'deleted')),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_classroom_id ON public.assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);

-- 6. Assignment Submissions (Student Work)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned', 'resubmitted')),
    text_response TEXT DEFAULT '',
    file_urls JSONB DEFAULT '[]'::jsonb,
    points_awarded INTEGER,
    teacher_feedback TEXT,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_classroom_id ON public.assignment_submissions(classroom_id);

-- 7. Classroom Points Ledger (Gamification & Leaderboards)
CREATE TABLE IF NOT EXISTS public.classroom_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'assignment' CHECK (source_type IN ('assignment', 'quiz', 'exam', 'spree', 'activity', 'manual', 'bonus')),
    source_id UUID,
    awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_points_classroom_student ON public.classroom_points(classroom_id, student_id);
CREATE INDEX IF NOT EXISTS idx_classroom_points_created_at ON public.classroom_points(created_at DESC);

-- 8. Classroom Messages / Announcements Stream
CREATE TABLE IF NOT EXISTS public.classroom_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_messages_classroom_id ON public.classroom_messages(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_created_at ON public.classroom_messages(created_at DESC);

-- 9. Content Buckets & Items (Teaching Resources & Collections)
CREATE TABLE IF NOT EXISTS public.content_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_buckets_classroom_id ON public.content_buckets(classroom_id);

CREATE TABLE IF NOT EXISTS public.bucket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES public.content_buckets(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'lesson' CHECK (item_type IN ('lesson', 'worksheet', 'video', 'reading', 'quiz', 'document', 'link')),
    content_id TEXT, -- References EdTechra bit/reading/short or custom URL
    content_url TEXT,
    thumbnail_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bucket_items_bucket_id ON public.bucket_items(bucket_id);
CREATE INDEX IF NOT EXISTS idx_bucket_items_classroom_id ON public.bucket_items(classroom_id);

-- 10. Learning Spree Item Progress
CREATE TABLE IF NOT EXISTS public.learning_spree_item_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
    score INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, student_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_spree_progress_student ON public.learning_spree_item_progress(classroom_id, student_id);

-- 11. Classroom Exams & Exam Results
CREATE TABLE IF NOT EXISTS public.classroom_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    instructions TEXT DEFAULT '',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    total_marks INTEGER NOT NULL DEFAULT 100,
    pass_marks INTEGER NOT NULL DEFAULT 40,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'scheduled', 'published', 'active', 'closed')),
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_exams_classroom_id ON public.classroom_exams(classroom_id);

CREATE TABLE IF NOT EXISTS public.classroom_exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.classroom_exams(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total_marks INTEGER NOT NULL DEFAULT 100,
    percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    answers JSONB DEFAULT '{}'::jsonb,
    feedback TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_exam ON public.classroom_exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_classroom_exam_results_student ON public.classroom_exam_results(student_id);

-- 12. AI Feedback & OCR Evaluation Logs
CREATE TABLE IF NOT EXISTS public.ai_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL DEFAULT 'classroom_summary' CHECK (report_type IN ('classroom_summary', 'ocr_grading', 'student_analytics')),
    input_summary JSONB DEFAULT '{}'::jsonb,
    output_text TEXT NOT NULL,
    model TEXT DEFAULT 'gemini-1.5-pro',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_logs_classroom_id ON public.ai_feedback_logs(classroom_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_spree_item_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS checks
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(c_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.classrooms WHERE id = c_id AND teacher_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.classroom_members WHERE classroom_id = c_id AND profile_id = u_id AND role IN ('teacher', 'co-teacher')
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_classroom_member(c_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.classrooms WHERE id = c_id AND teacher_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.classroom_members WHERE classroom_id = c_id AND profile_id = u_id AND status = 'active'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CLASSROOMS POLICIES
DROP POLICY IF EXISTS "Classrooms viewable by members and teachers" ON public.classrooms;
CREATE POLICY "Classrooms viewable by members and teachers" ON public.classrooms
    FOR SELECT USING (public.is_classroom_member(id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can create classrooms" ON public.classrooms;
CREATE POLICY "Teachers can create classrooms" ON public.classrooms
    FOR INSERT WITH CHECK (auth.uid() = teacher_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')));

DROP POLICY IF EXISTS "Teachers can update their own classrooms" ON public.classrooms;
CREATE POLICY "Teachers can update their own classrooms" ON public.classrooms
    FOR UPDATE USING (public.is_classroom_teacher(id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can delete their own classrooms" ON public.classrooms;
CREATE POLICY "Teachers can delete their own classrooms" ON public.classrooms
    FOR DELETE USING (public.is_classroom_teacher(id, auth.uid()));

-- CLASSROOM MEMBERS POLICIES
DROP POLICY IF EXISTS "Members viewable by classroom members" ON public.classroom_members;
CREATE POLICY "Members viewable by classroom members" ON public.classroom_members
    FOR SELECT USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers manage members or users join themselves" ON public.classroom_members;
CREATE POLICY "Teachers manage members or users join themselves" ON public.classroom_members
    FOR INSERT WITH CHECK (
        public.is_classroom_teacher(classroom_id, auth.uid()) OR auth.uid() = profile_id
    );

DROP POLICY IF EXISTS "Teachers can update or remove members" ON public.classroom_members;
CREATE POLICY "Teachers can update or remove members" ON public.classroom_members
    FOR UPDATE USING (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can delete members" ON public.classroom_members;
CREATE POLICY "Teachers can delete members" ON public.classroom_members
    FOR DELETE USING (public.is_classroom_teacher(classroom_id, auth.uid()) OR auth.uid() = profile_id);

-- CLASSROOM INVITES POLICIES
DROP POLICY IF EXISTS "Invites viewable by authenticated users" ON public.classroom_invites;
CREATE POLICY "Invites viewable by authenticated users" ON public.classroom_invites
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can manage invites" ON public.classroom_invites;
CREATE POLICY "Teachers can manage invites" ON public.classroom_invites
    FOR ALL USING (public.is_classroom_teacher(classroom_id, auth.uid()));

-- ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Assignments viewable by classroom members" ON public.assignments;
CREATE POLICY "Assignments viewable by classroom members" ON public.assignments
    FOR SELECT USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can manage assignments" ON public.assignments;
CREATE POLICY "Teachers can manage assignments" ON public.assignments
    FOR ALL USING (public.is_classroom_teacher(classroom_id, auth.uid()));

-- ASSIGNMENT SUBMISSIONS POLICIES
DROP POLICY IF EXISTS "Submissions viewable by student or teacher" ON public.assignment_submissions;
CREATE POLICY "Submissions viewable by student or teacher" ON public.assignment_submissions
    FOR SELECT USING (auth.uid() = student_id OR public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Students can insert their own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can insert their own submissions" ON public.assignment_submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id AND public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Students or teachers can update submissions" ON public.assignment_submissions;
CREATE POLICY "Students or teachers can update submissions" ON public.assignment_submissions
    FOR UPDATE USING (auth.uid() = student_id OR public.is_classroom_teacher(classroom_id, auth.uid()));

-- CLASSROOM POINTS POLICIES
DROP POLICY IF EXISTS "Points viewable by classroom members" ON public.classroom_points;
CREATE POLICY "Points viewable by classroom members" ON public.classroom_points
    FOR SELECT USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can insert points" ON public.classroom_points;
CREATE POLICY "Teachers can insert points" ON public.classroom_points
    FOR INSERT WITH CHECK (public.is_classroom_teacher(classroom_id, auth.uid()) OR auth.uid() = student_id);

-- CLASSROOM MESSAGES POLICIES
DROP POLICY IF EXISTS "Messages viewable by classroom members" ON public.classroom_messages;
CREATE POLICY "Messages viewable by classroom members" ON public.classroom_messages
    FOR SELECT USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can manage classroom messages" ON public.classroom_messages;
CREATE POLICY "Teachers can manage classroom messages" ON public.classroom_messages
    FOR ALL USING (public.is_classroom_teacher(classroom_id, auth.uid()));

-- CONTENT BUCKETS & ITEMS POLICIES
DROP POLICY IF EXISTS "Buckets viewable by classroom members" ON public.content_buckets;
CREATE POLICY "Buckets viewable by classroom members" ON public.content_buckets
    FOR SELECT USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can manage content buckets" ON public.content_buckets;
CREATE POLICY "Teachers can manage content buckets" ON public.content_buckets
    FOR ALL USING (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Bucket items viewable by classroom members" ON public.bucket_items;
CREATE POLICY "Bucket items viewable by classroom members" ON public.bucket_items
    FOR SELECT USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can manage bucket items" ON public.bucket_items;
CREATE POLICY "Teachers can manage bucket items" ON public.bucket_items
    FOR ALL USING (public.is_classroom_teacher(classroom_id, auth.uid()));

-- EXAMS POLICIES
DROP POLICY IF EXISTS "Exams viewable by classroom members" ON public.classroom_exams;
CREATE POLICY "Exams viewable by classroom members" ON public.classroom_exams
    FOR SELECT USING (public.is_classroom_member(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can manage exams" ON public.classroom_exams;
CREATE POLICY "Teachers can manage exams" ON public.classroom_exams
    FOR ALL USING (public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Exam results viewable by student or teacher" ON public.classroom_exam_results;
CREATE POLICY "Exam results viewable by student or teacher" ON public.classroom_exam_results
    FOR SELECT USING (auth.uid() = student_id OR public.is_classroom_teacher(classroom_id, auth.uid()));

DROP POLICY IF EXISTS "Students can submit exam results" ON public.classroom_exam_results;
CREATE POLICY "Students can submit exam results" ON public.classroom_exam_results
    FOR INSERT WITH CHECK (auth.uid() = student_id AND public.is_classroom_member(classroom_id, auth.uid()));
