-- ============================================================================
-- EDTECHRA-BITZ: AI Content Moderation Migration
-- ============================================================================

-- 1. Add moderation metadata columns to student_posts
ALTER TABLE public.student_posts
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- 2. Update status constraint to include 'review'
ALTER TABLE public.student_posts
DROP CONSTRAINT IF EXISTS student_posts_status_check;

ALTER TABLE public.student_posts
ADD CONSTRAINT student_posts_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'review'));

-- 3. Performance indexes for moderated feed and review queue
CREATE INDEX IF NOT EXISTS idx_student_posts_status_created ON public.student_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_posts_moderation ON public.student_posts(moderation_status);

-- 4. Update Row Level Security (RLS) policies
DROP POLICY IF EXISTS "Public read approved student_posts" ON public.student_posts;
CREATE POLICY "Public read approved student_posts"
  ON public.student_posts FOR SELECT
  USING (
    status = 'approved' 
    OR auth.uid() = user_id 
    OR public.is_admin()
  );
