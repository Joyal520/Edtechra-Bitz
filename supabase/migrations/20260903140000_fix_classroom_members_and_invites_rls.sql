-- ============================================================================
-- EDTECHRA-BITZ: Fix Classroom Members and Invites RLS Policies
-- Allows students to join classrooms via upsert and update invite usage
-- ============================================================================

-- 1. CLASSROOM MEMBERS POLICIES
DROP POLICY IF EXISTS "Members viewable by classroom members" ON public.classroom_members;
CREATE POLICY "Members viewable by classroom members" ON public.classroom_members
    FOR SELECT USING (
        auth.uid() = profile_id
        OR public.is_classroom_teacher(classroom_id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.classroom_members m
            WHERE m.classroom_id = public.classroom_members.classroom_id
              AND m.profile_id = auth.uid()
              AND m.status = 'active'
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Teachers manage members or users join themselves" ON public.classroom_members;
CREATE POLICY "Teachers manage members or users join themselves" ON public.classroom_members
    FOR INSERT WITH CHECK (
        auth.uid() = profile_id
        OR public.is_classroom_teacher(classroom_id, auth.uid())
    );

DROP POLICY IF EXISTS "Teachers can update or remove members" ON public.classroom_members;
CREATE POLICY "Teachers can update or remove members" ON public.classroom_members
    FOR UPDATE USING (
        auth.uid() = profile_id
        OR public.is_classroom_teacher(classroom_id, auth.uid())
    )
    WITH CHECK (
        (auth.uid() = profile_id AND role = 'student')
        OR public.is_classroom_teacher(classroom_id, auth.uid())
    );

DROP POLICY IF EXISTS "Teachers can delete members" ON public.classroom_members;
CREATE POLICY "Teachers can delete members" ON public.classroom_members
    FOR DELETE USING (
        auth.uid() = profile_id
        OR public.is_classroom_teacher(classroom_id, auth.uid())
    );

-- 2. CLASSROOM INVITES POLICIES
DROP POLICY IF EXISTS "Invites viewable by authenticated users" ON public.classroom_invites;
CREATE POLICY "Invites viewable by authenticated users" ON public.classroom_invites
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can manage invites" ON public.classroom_invites;
CREATE POLICY "Teachers can manage invites" ON public.classroom_invites
    FOR ALL USING (
        public.is_classroom_teacher(classroom_id, auth.uid())
        OR auth.role() = 'authenticated'
    );
