-- ============================================================================
-- EDTECHRA-BITZ: Central Educational Resource Library & Realtime Presentation Control
-- ============================================================================

-- 1. Create public.library_resources table
CREATE TABLE IF NOT EXISTS public.library_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    subject TEXT NOT NULL DEFAULT 'General',
    category TEXT NOT NULL DEFAULT 'General',
    grade_level TEXT NOT NULL DEFAULT 'All Grades',
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'pptx')),
    file_url TEXT NOT NULL,
    file_key TEXT,
    file_size BIGINT DEFAULT 0,
    cover_image_url TEXT,
    cover_image_key TEXT,
    author TEXT,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_slides INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes for fast filtering and searching
CREATE INDEX IF NOT EXISTS idx_library_resources_published ON public.library_resources(published);
CREATE INDEX IF NOT EXISTS idx_library_resources_file_type ON public.library_resources(file_type);
CREATE INDEX IF NOT EXISTS idx_library_resources_subject ON public.library_resources(subject);
CREATE INDEX IF NOT EXISTS idx_library_resources_category ON public.library_resources(category);
CREATE INDEX IF NOT EXISTS idx_library_resources_grade_level ON public.library_resources(grade_level);
CREATE INDEX IF NOT EXISTS idx_library_resources_created_at ON public.library_resources(created_at DESC);

-- 2. Create public.presentation_sessions table
CREATE TABLE IF NOT EXISTS public.presentation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_code TEXT NOT NULL,
    current_slide INTEGER NOT NULL DEFAULT 1,
    total_slides INTEGER NOT NULL DEFAULT 1,
    controller_connected BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours')
);

CREATE INDEX IF NOT EXISTS idx_presentation_sessions_code ON public.presentation_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_host ON public.presentation_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_status ON public.presentation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_expires_at ON public.presentation_sessions(expires_at);

-- 3. Enable RLS
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for library_resources
DROP POLICY IF EXISTS "Published library resources are viewable by authenticated users" ON public.library_resources;
CREATE POLICY "Published library resources are viewable by authenticated users"
ON public.library_resources FOR SELECT
USING (
    published = TRUE
    OR auth.uid() = uploaded_by
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'roshanjoyal520@gmail.com'
);

DROP POLICY IF EXISTS "Admins can insert library resources" ON public.library_resources;
CREATE POLICY "Admins can insert library resources"
ON public.library_resources FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'roshanjoyal520@gmail.com'
);

DROP POLICY IF EXISTS "Admins can update library resources" ON public.library_resources;
CREATE POLICY "Admins can update library resources"
ON public.library_resources FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'roshanjoyal520@gmail.com'
);

DROP POLICY IF EXISTS "Admins can delete library resources" ON public.library_resources;
CREATE POLICY "Admins can delete library resources"
ON public.library_resources FOR DELETE
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'roshanjoyal520@gmail.com'
);

-- 5. RLS Policies for presentation_sessions
DROP POLICY IF EXISTS "Users can view presentation sessions" ON public.presentation_sessions;
CREATE POLICY "Users can view presentation sessions"
ON public.presentation_sessions FOR SELECT
USING (
    auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can create presentation sessions" ON public.presentation_sessions;
CREATE POLICY "Users can create presentation sessions"
ON public.presentation_sessions FOR INSERT
WITH CHECK (
    auth.uid() = host_user_id
);

DROP POLICY IF EXISTS "Host and connected controllers can update presentation session" ON public.presentation_sessions;
CREATE POLICY "Host and connected controllers can update presentation session"
ON public.presentation_sessions FOR UPDATE
USING (
    auth.uid() IS NOT NULL
    AND status = 'active'
    AND expires_at > now()
);

DROP POLICY IF EXISTS "Host can delete presentation session" ON public.presentation_sessions;
CREATE POLICY "Host can delete presentation session"
ON public.presentation_sessions FOR DELETE
USING (
    auth.uid() = host_user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Add presentation_sessions to realtime publication safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'presentation_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_sessions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
