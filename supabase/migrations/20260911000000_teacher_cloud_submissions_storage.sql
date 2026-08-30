-- ============================================================================
-- EDTECHRA-BITZ: Teacher Cloud Materials & Submissions Table Migration
-- Run this in your Supabase SQL Editor to enable Teacher Cloud Materials Storage
-- ============================================================================

-- 1. Create public.submissions table if it does not already exist
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    owner_role TEXT NOT NULL DEFAULT 'teacher' CHECK (owner_role IN ('student', 'teacher', 'admin')),
    resource_purpose TEXT NOT NULL DEFAULT 'teaching_resource' CHECK (resource_purpose IN ('creative_work', 'teaching_resource')),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    resource_type TEXT DEFAULT 'General',
    content_type TEXT DEFAULT 'application/pdf',
    mime_type TEXT DEFAULT 'application/pdf',
    file_url TEXT NOT NULL,
    file_path TEXT,
    file_size BIGINT NOT NULL DEFAULT 0,
    storage_provider TEXT DEFAULT 'r2',
    upload_context TEXT DEFAULT 'global' CHECK (upload_context IN ('global', 'classroom')),
    source TEXT DEFAULT 'digital_classroom' CHECK (source IN ('dashboard', 'digital_classroom', 'creator_hub')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    status TEXT NOT NULL DEFAULT 'published',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Safely add any missing columns in case the table already existed with older schema
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS owner_role TEXT NOT NULL DEFAULT 'teacher';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS resource_purpose TEXT NOT NULL DEFAULT 'teaching_resource';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'General';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'application/pdf';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'application/pdf';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS file_size BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'r2';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS upload_context TEXT DEFAULT 'global';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'digital_classroom';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Indexes for fast 500 MB quota calculation and search
CREATE INDEX IF NOT EXISTS idx_submissions_teacher_lookup 
    ON public.submissions (author_id, teacher_id, resource_purpose, is_deleted);

CREATE INDEX IF NOT EXISTS idx_submissions_created_desc 
    ON public.submissions (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 5. Strict Teacher Isolation RLS Policies
DROP POLICY IF EXISTS "Teacher cloud materials select policy" ON public.submissions;
CREATE POLICY "Teacher cloud materials select policy" ON public.submissions
    FOR SELECT
    USING (
        auth.uid() = author_id 
        OR auth.uid() = teacher_id 
        OR auth.uid() = owner_id 
        OR visibility = 'public'
    );

DROP POLICY IF EXISTS "Teacher cloud materials insert policy" ON public.submissions;
CREATE POLICY "Teacher cloud materials insert policy" ON public.submissions
    FOR INSERT
    WITH CHECK (
        auth.uid() = author_id 
        OR auth.uid() = teacher_id 
        OR auth.uid() = owner_id
    );

DROP POLICY IF EXISTS "Teacher cloud materials update policy" ON public.submissions;
CREATE POLICY "Teacher cloud materials update policy" ON public.submissions
    FOR UPDATE
    USING (
        auth.uid() = author_id 
        OR auth.uid() = teacher_id 
        OR auth.uid() = owner_id
    );

DROP POLICY IF EXISTS "Teacher cloud materials delete policy" ON public.submissions;
CREATE POLICY "Teacher cloud materials delete policy" ON public.submissions
    FOR DELETE
    USING (
        auth.uid() = author_id 
        OR auth.uid() = teacher_id 
        OR auth.uid() = owner_id
    );
