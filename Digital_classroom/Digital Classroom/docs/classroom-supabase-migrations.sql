-- Suggested Digital Classroom schema for the existing Edtechra Supabase project.
-- This file is intentionally not applied automatically.
-- IMPORTANT:
-- 1. Reuse the existing public.profiles table where profiles.id = auth.users.id.
-- 2. Do not create a second public.submissions table. Edtechra already uses that name.
--    Use public.assignment_submissions for classroom work instead.

-- Teacher resource metadata lives on the existing Creator Hub submissions table.
-- Private resources remain discoverable only through teacher-scoped resource queries;
-- public resources can continue through the existing moderation status flow.
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS owner_role TEXT NOT NULL DEFAULT 'student' CHECK (owner_role IN ('student', 'teacher', 'admin'));
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS resource_purpose TEXT NOT NULL DEFAULT 'creative_work' CHECK (resource_purpose IN ('creative_work', 'teaching_resource'));
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public'));
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS upload_context TEXT NOT NULL DEFAULT 'global' CHECK (upload_context IN ('global', 'classroom'));
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'dashboard' CHECK (source IN ('dashboard', 'digital_classroom'));
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS classroom_id UUID;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.submissions
SET owner_id = COALESCE(owner_id, author_id),
    owner_role = COALESCE(owner_role, 'student'),
    resource_purpose = COALESCE(resource_purpose, 'creative_work'),
    resource_type = COALESCE(resource_type, category, content_type),
    visibility = COALESCE(visibility, 'public'),
    upload_context = COALESCE(upload_context, 'global'),
    source = COALESCE(source, 'dashboard')
WHERE owner_id IS NULL
   OR resource_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_teacher_resources
    ON public.submissions (owner_id, teacher_id, owner_role, resource_purpose, upload_context, source, classroom_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_public_discovery
    ON public.submissions (status, visibility, resource_purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'classrooms'
          AND column_name = 'name'
    ) THEN
        EXECUTE $sql$
            UPDATE public.classrooms
            SET title = COALESCE(title, name)
            WHERE title IS NULL
        $sql$;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.classroom_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student')),
    display_name TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (classroom_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.classroom_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_token TEXT NOT NULL UNIQUE,
    share_url TEXT,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT DEFAULT '',
    due_date DATE,
    points INTEGER NOT NULL DEFAULT 0,
    assignment_type TEXT NOT NULL DEFAULT 'assignment',
    resource_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    unlock_mode TEXT NOT NULL DEFAULT 'open_access',
    start_date DATE,
    timezone TEXT NOT NULL DEFAULT 'Asia/Colombo',
    status TEXT NOT NULL DEFAULT 'published',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'submitted',
    note TEXT DEFAULT '',
    points_awarded INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, student_id)
);

ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'assignment';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS resource_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS unlock_mode TEXT NOT NULL DEFAULT 'open_access';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Colombo';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_assignments_active_classroom
    ON public.assignments (classroom_id, is_deleted, created_at DESC);

CREATE TABLE IF NOT EXISTS public.learning_spree_item_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    spree_item_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'opened', 'completed')),
    opened_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, spree_item_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.content_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Classroom Content',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bucket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id UUID NOT NULL REFERENCES public.content_buckets(id) ON DELETE CASCADE,
    content_id TEXT NOT NULL,
    title TEXT NOT NULL,
    item_type TEXT,
    subject TEXT,
    grade_level TEXT,
    minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bucket_id, content_id)
);

CREATE TABLE IF NOT EXISTS public.classroom_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_submission_id UUID REFERENCES public.assignment_submissions(id) ON DELETE SET NULL,
    points INTEGER NOT NULL DEFAULT 0,
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month')
);

CREATE INDEX IF NOT EXISTS idx_classroom_messages_classroom_id
    ON public.classroom_messages (classroom_id);

CREATE INDEX IF NOT EXISTS idx_classroom_messages_visible
    ON public.classroom_messages (classroom_id, is_deleted, expires_at, created_at DESC);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_spree_item_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classrooms'
          AND policyname = 'Teachers manage own classrooms'
    ) THEN
        CREATE POLICY "Teachers manage own classrooms"
            ON public.classrooms
            FOR ALL
            TO authenticated
            USING (teacher_id = auth.uid())
            WITH CHECK (teacher_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'learning_spree_item_progress'
          AND policyname = 'Students manage their own learning spree progress'
    ) THEN
        CREATE POLICY "Students manage their own learning spree progress"
            ON public.learning_spree_item_progress
            FOR ALL
            TO authenticated
            USING (student_id = auth.uid())
            WITH CHECK (
                student_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.classroom_members
                    WHERE classroom_members.classroom_id = learning_spree_item_progress.classroom_id
                      AND classroom_members.profile_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'learning_spree_item_progress'
          AND policyname = 'Teachers view learning spree progress for owned classrooms'
    ) THEN
        CREATE POLICY "Teachers view learning spree progress for owned classrooms"
            ON public.learning_spree_item_progress
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = learning_spree_item_progress.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classrooms'
          AND policyname = 'Members view joined classrooms'
    ) THEN
        CREATE POLICY "Members view joined classrooms"
            ON public.classrooms
            FOR SELECT
            TO authenticated
            USING (
                teacher_id = auth.uid()
                OR EXISTS (
                    SELECT 1
                    FROM public.classroom_members
                    WHERE classroom_members.classroom_id = classrooms.id
                      AND classroom_members.profile_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_members'
          AND policyname = 'Teachers manage classroom members'
    ) THEN
        CREATE POLICY "Teachers manage classroom members"
            ON public.classroom_members
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_members.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_members.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_members'
          AND policyname = 'Members view their own classroom membership'
    ) THEN
        CREATE POLICY "Members view their own classroom membership"
            ON public.classroom_members
            FOR SELECT
            TO authenticated
            USING (profile_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_invites'
          AND policyname = 'Teachers manage classroom invites'
    ) THEN
        CREATE POLICY "Teachers manage classroom invites"
            ON public.classroom_invites
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_invites.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_invites.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'assignments'
          AND policyname = 'Teachers manage classroom assignments'
    ) THEN
        CREATE POLICY "Teachers manage classroom assignments"
            ON public.assignments
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = assignments.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = assignments.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'assignments'
          AND policyname = 'Members view assignments for joined classrooms'
    ) THEN
        CREATE POLICY "Members view assignments for joined classrooms"
            ON public.assignments
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classroom_members
                    WHERE classroom_members.classroom_id = assignments.classroom_id
                      AND classroom_members.profile_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_messages'
          AND policyname = 'Teachers create messages for owned classrooms'
    ) THEN
        CREATE POLICY "Teachers create messages for owned classrooms"
            ON public.classroom_messages
            FOR INSERT
            TO authenticated
            WITH CHECK (
                teacher_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_messages.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_messages'
          AND policyname = 'Teachers update messages for owned classrooms'
    ) THEN
        CREATE POLICY "Teachers update messages for owned classrooms"
            ON public.classroom_messages
            FOR UPDATE
            TO authenticated
            USING (
                teacher_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_messages.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                teacher_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_messages.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_messages'
          AND policyname = 'Teachers read messages for owned classrooms'
    ) THEN
        CREATE POLICY "Teachers read messages for owned classrooms"
            ON public.classroom_messages
            FOR SELECT
            TO authenticated
            USING (
                teacher_id = auth.uid()
                AND EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_messages.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_messages'
          AND policyname = 'Members read active classroom messages'
    ) THEN
        CREATE POLICY "Members read active classroom messages"
            ON public.classroom_messages
            FOR SELECT
            TO authenticated
            USING (
                is_deleted = false
                AND expires_at > now()
                AND (
                    EXISTS (
                        SELECT 1
                        FROM public.classrooms
                        WHERE classrooms.id = classroom_messages.classroom_id
                          AND classrooms.teacher_id = auth.uid()
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM public.classroom_members
                        WHERE classroom_members.classroom_id = classroom_messages.classroom_id
                          AND classroom_members.profile_id = auth.uid()
                    )
                )
            );
    END IF;
END $$;

-- Optional cleanup command. Schedule it with pg_cron only if your Supabase project
-- already has scheduled jobs enabled. The app hides expired rows through expires_at
-- filtering even without this cleanup.
-- UPDATE public.classroom_messages
-- SET is_deleted = true, deleted_at = now(), updated_at = now()
-- WHERE is_deleted = false AND expires_at <= now();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'assignment_submissions'
          AND policyname = 'Students manage their own assignment submissions'
    ) THEN
        CREATE POLICY "Students manage their own assignment submissions"
            ON public.assignment_submissions
            FOR ALL
            TO authenticated
            USING (student_id = auth.uid())
            WITH CHECK (student_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'assignment_submissions'
          AND policyname = 'Teachers view submissions for owned classrooms'
    ) THEN
        CREATE POLICY "Teachers view submissions for owned classrooms"
            ON public.assignment_submissions
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = assignment_submissions.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'content_buckets'
          AND policyname = 'Teachers manage classroom content buckets'
    ) THEN
        CREATE POLICY "Teachers manage classroom content buckets"
            ON public.content_buckets
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = content_buckets.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = content_buckets.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bucket_items'
          AND policyname = 'Teachers manage classroom bucket items'
    ) THEN
        CREATE POLICY "Teachers manage classroom bucket items"
            ON public.bucket_items
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.content_buckets
                    JOIN public.classrooms ON classrooms.id = content_buckets.classroom_id
                    WHERE content_buckets.id = bucket_items.bucket_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.content_buckets
                    JOIN public.classrooms ON classrooms.id = content_buckets.classroom_id
                    WHERE content_buckets.id = bucket_items.bucket_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bucket_items'
          AND policyname = 'Members view classroom bucket items'
    ) THEN
        CREATE POLICY "Members view classroom bucket items"
            ON public.bucket_items
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.content_buckets
                    JOIN public.classroom_members
                      ON classroom_members.classroom_id = content_buckets.classroom_id
                    WHERE content_buckets.id = bucket_items.bucket_id
                      AND classroom_members.profile_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_points'
          AND policyname = 'Teachers manage classroom points'
    ) THEN
        CREATE POLICY "Teachers manage classroom points"
            ON public.classroom_points
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_points.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = classroom_points.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'classroom_points'
          AND policyname = 'Students view own classroom points'
    ) THEN
        CREATE POLICY "Students view own classroom points"
            ON public.classroom_points
            FOR SELECT
            TO authenticated
            USING (profile_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ai_feedback_logs'
          AND policyname = 'Teachers manage classroom ai feedback logs'
    ) THEN
        CREATE POLICY "Teachers manage classroom ai feedback logs"
            ON public.ai_feedback_logs
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = ai_feedback_logs.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1
                    FROM public.classrooms
                    WHERE classrooms.id = ai_feedback_logs.classroom_id
                      AND classrooms.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;
