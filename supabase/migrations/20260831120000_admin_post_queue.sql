-- ============================================================================
-- EDTECHRA-BITZ: Admin Post Publishing Queue Table & RLS Policies
-- Enables asynchronous, sequential one-by-one publishing of admin-approved media
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_post_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL,
  batch_name TEXT,
  caption TEXT,
  image_url TEXT NOT NULL,
  image_object_key TEXT NOT NULL,
  storage_provider TEXT DEFAULT 'r2',
  image_width INTEGER,
  image_height INTEGER,
  image_size_bytes BIGINT,
  image_format TEXT DEFAULT 'webp',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  validation_status TEXT DEFAULT 'manually_approved',
  validation_provider TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'published', 'failed', 'paused', 'cancelled')),
  queue_position INTEGER NOT NULL DEFAULT 1,
  interval_minutes INTEGER NOT NULL DEFAULT 360,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  feed_post_id UUID REFERENCES public.student_posts(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance indexes for queue queries and scheduler polling
CREATE INDEX IF NOT EXISTS idx_admin_post_queue_status_sched ON public.admin_post_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_admin_post_queue_batch ON public.admin_post_queue(batch_id, queue_position);
CREATE INDEX IF NOT EXISTS idx_admin_post_queue_uploaded_by ON public.admin_post_queue(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_admin_post_queue_feed_post ON public.admin_post_queue(feed_post_id);

-- Row Level Security (RLS)
ALTER TABLE public.admin_post_queue ENABLE ROW LEVEL SECURITY;

-- Helper admin check function if not exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin-only RLS policies
DROP POLICY IF EXISTS "Admins can view admin_post_queue" ON public.admin_post_queue;
CREATE POLICY "Admins can view admin_post_queue"
  ON public.admin_post_queue FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert admin_post_queue" ON public.admin_post_queue;
CREATE POLICY "Admins can insert admin_post_queue"
  ON public.admin_post_queue FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update admin_post_queue" ON public.admin_post_queue;
CREATE POLICY "Admins can update admin_post_queue"
  ON public.admin_post_queue FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete admin_post_queue" ON public.admin_post_queue;
CREATE POLICY "Admins can delete admin_post_queue"
  ON public.admin_post_queue FOR DELETE
  USING (public.is_admin());
