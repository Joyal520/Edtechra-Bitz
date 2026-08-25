-- ============================================================================
-- EDTECHRA-BITZ: Eliminate RLS Recursion on classroom_members Table
-- ============================================================================

DROP POLICY IF EXISTS "Members viewable by classroom members" ON public.classroom_members;
CREATE POLICY "Members viewable by classroom members" ON public.classroom_members
    FOR SELECT USING (
        auth.uid() = profile_id
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = classroom_id AND c.teacher_id = auth.uid()
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Teachers manage members or users join themselves" ON public.classroom_members;
CREATE POLICY "Teachers manage members or users join themselves" ON public.classroom_members
    FOR INSERT WITH CHECK (
        auth.uid() = profile_id
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = classroom_id AND c.teacher_id = auth.uid()
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Teachers can update or remove members" ON public.classroom_members;
CREATE POLICY "Teachers can update or remove members" ON public.classroom_members
    FOR UPDATE USING (
        auth.uid() = profile_id
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = classroom_id AND c.teacher_id = auth.uid()
        )
        OR public.is_admin()
    )
    WITH CHECK (
        (auth.uid() = profile_id AND role = 'student')
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = classroom_id AND c.teacher_id = auth.uid()
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Teachers can delete members" ON public.classroom_members;
CREATE POLICY "Teachers can delete members" ON public.classroom_members
    FOR DELETE USING (
        auth.uid() = profile_id
        OR EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = classroom_id AND c.teacher_id = auth.uid()
        )
        OR public.is_admin()
    );
