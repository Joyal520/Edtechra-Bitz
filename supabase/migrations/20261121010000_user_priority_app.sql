-- ============================================================================
-- EDTECHRA LIBRARY: USER PRIORITY APP PREFERENCE
-- Stores each authenticated user's personal Priority App preference privately.
-- Kept separate from public.profiles (which has public SELECT) for privacy.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_priority_apps (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    priority_app_id UUID REFERENCES public.library_resources(id) ON DELETE SET NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_priority_apps_app_id
    ON public.user_priority_apps(priority_app_id);

ALTER TABLE public.user_priority_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own priority app preference" ON public.user_priority_apps;
CREATE POLICY "Users can view own priority app preference"
    ON public.user_priority_apps
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own priority app preference" ON public.user_priority_apps;
CREATE POLICY "Users can insert own priority app preference"
    ON public.user_priority_apps
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own priority app preference" ON public.user_priority_apps;
CREATE POLICY "Users can update own priority app preference"
    ON public.user_priority_apps
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own priority app preference" ON public.user_priority_apps;
CREATE POLICY "Users can delete own priority app preference"
    ON public.user_priority_apps
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
