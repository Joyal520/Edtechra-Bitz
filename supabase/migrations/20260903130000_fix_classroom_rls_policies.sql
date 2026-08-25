-- ============================================================================
-- EDTECHRA-BITZ: Fix Classroom RLS Policies and Helper Functions
-- Resolves circular RLS dependency preventing returning SELECT on INSERT
-- ============================================================================

-- 1. Helper Functions with explicit search_path
CREATE OR REPLACE FUNCTION public.is_classroom_teacher(c_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.classrooms WHERE id = c_id AND teacher_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.classroom_members WHERE classroom_id = c_id AND profile_id = u_id AND role IN ('teacher', 'co-teacher')
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_member(c_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.classrooms WHERE id = c_id AND teacher_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.classroom_members WHERE classroom_id = c_id AND profile_id = u_id AND status = 'active'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'admin'
    );
END;
$$;

-- 2. CLASSROOMS POLICIES
DROP POLICY IF EXISTS "Classrooms viewable by members and teachers" ON public.classrooms;
CREATE POLICY "Classrooms viewable by members and teachers" ON public.classrooms
    FOR SELECT USING (
        teacher_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.classroom_members 
            WHERE classroom_id = public.classrooms.id 
              AND profile_id = auth.uid() 
              AND status = 'active'
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Teachers can create classrooms" ON public.classrooms;
CREATE POLICY "Teachers can create classrooms" ON public.classrooms
    FOR INSERT WITH CHECK (
        auth.uid() = teacher_id
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('teacher', 'admin')
            )
        )
    );

DROP POLICY IF EXISTS "Teachers can update their own classrooms" ON public.classrooms;
CREATE POLICY "Teachers can update their own classrooms" ON public.classrooms
    FOR UPDATE USING (
        teacher_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Teachers can delete their own classrooms" ON public.classrooms;
CREATE POLICY "Teachers can delete their own classrooms" ON public.classrooms
    FOR DELETE USING (
        teacher_id = auth.uid()
        OR public.is_admin()
    );
