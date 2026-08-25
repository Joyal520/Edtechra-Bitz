-- ============================================================================
-- EDTECHRA-BITZ: Break Cross-Table RLS Recursion via Security Definer Helpers
-- ============================================================================

-- 1. Helper: Check if user is teacher of a classroom (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_is_classroom_teacher(c_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classrooms WHERE id = c_id AND teacher_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'admin'
    );
$$;

-- 2. Helper: Check if user is enrolled member of a classroom (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_is_classroom_member(c_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classrooms WHERE id = c_id AND teacher_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM public.classroom_members WHERE classroom_id = c_id AND profile_id = u_id AND status = 'active'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'admin'
    );
$$;

-- 3. Classrooms Policies using non-recursive security definer checks
DROP POLICY IF EXISTS "Classrooms viewable by members and teachers" ON public.classrooms;
CREATE POLICY "Classrooms viewable by members and teachers" ON public.classrooms
    FOR SELECT USING (
        teacher_id = auth.uid()
        OR public.check_is_classroom_member(id, auth.uid())
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

-- 4. Classroom Members Policies using non-recursive security definer checks
DROP POLICY IF EXISTS "Members viewable by classroom members" ON public.classroom_members;
CREATE POLICY "Members viewable by classroom members" ON public.classroom_members
    FOR SELECT USING (
        auth.uid() = profile_id
        OR public.check_is_classroom_teacher(classroom_id, auth.uid())
        OR public.check_is_classroom_member(classroom_id, auth.uid())
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Teachers manage members or users join themselves" ON public.classroom_members;
CREATE POLICY "Teachers manage members or users join themselves" ON public.classroom_members
    FOR INSERT WITH CHECK (
        auth.uid() = profile_id
        OR public.check_is_classroom_teacher(classroom_id, auth.uid())
    );

DROP POLICY IF EXISTS "Teachers can update or remove members" ON public.classroom_members;
CREATE POLICY "Teachers can update or remove members" ON public.classroom_members
    FOR UPDATE USING (
        auth.uid() = profile_id
        OR public.check_is_classroom_teacher(classroom_id, auth.uid())
    )
    WITH CHECK (
        (auth.uid() = profile_id AND role = 'student')
        OR public.check_is_classroom_teacher(classroom_id, auth.uid())
    );

DROP POLICY IF EXISTS "Teachers can delete members" ON public.classroom_members;
CREATE POLICY "Teachers can delete members" ON public.classroom_members
    FOR DELETE USING (
        auth.uid() = profile_id
        OR public.check_is_classroom_teacher(classroom_id, auth.uid())
    );
