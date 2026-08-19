-- ============================================================================
-- EDTECHRA-BITZ: Student Posts, Media Storage (Cloudflare R2) & Feed Migration
-- ============================================================================

-- 1. Student Posts Table
CREATE TABLE IF NOT EXISTS public.student_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_object_key TEXT NOT NULL,
  storage_provider TEXT DEFAULT 'r2',
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  image_width INTEGER,
  image_height INTEGER,
  image_size_bytes BIGINT,
  image_format TEXT DEFAULT 'webp',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Post Likes Table (Per-user persistent likes)
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.student_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_post_user_like UNIQUE (post_id, user_id)
);

-- 3. Post Saves / Bookmarks Table
CREATE TABLE IF NOT EXISTS public.post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.student_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_post_user_save UNIQUE (post_id, user_id)
);

-- 4. High-Performance Feed Indexes
CREATE INDEX IF NOT EXISTS idx_student_posts_created_at ON public.student_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_posts_user_id ON public.student_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_student_posts_status ON public.student_posts(status);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_user_id ON public.post_saves(user_id);

-- 5. Row Level Security (RLS)
ALTER TABLE public.student_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

-- Student Posts Policies
DROP POLICY IF EXISTS "Public read approved student_posts" ON public.student_posts;
CREATE POLICY "Public read approved student_posts"
  ON public.student_posts FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create student_posts" ON public.student_posts;
CREATE POLICY "Authenticated users can create student_posts"
  ON public.student_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own student_posts or admin" ON public.student_posts;
CREATE POLICY "Users can update own student_posts or admin"
  ON public.student_posts FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own student_posts or admin" ON public.student_posts;
CREATE POLICY "Users can delete own student_posts or admin"
  ON public.student_posts FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- Post Likes Policies
DROP POLICY IF EXISTS "Public read post_likes" ON public.post_likes;
CREATE POLICY "Public read post_likes"
  ON public.post_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own post_likes" ON public.post_likes;
CREATE POLICY "Users can insert own post_likes"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own post_likes" ON public.post_likes;
CREATE POLICY "Users can delete own post_likes"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Post Saves Policies
DROP POLICY IF EXISTS "Users view own post_saves" ON public.post_saves;
CREATE POLICY "Users view own post_saves"
  ON public.post_saves FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own post_saves" ON public.post_saves;
CREATE POLICY "Users insert own post_saves"
  ON public.post_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own post_saves" ON public.post_saves;
CREATE POLICY "Users delete own post_saves"
  ON public.post_saves FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Permissions Grant
GRANT ALL ON public.student_posts TO anon, authenticated, service_role;
GRANT ALL ON public.post_likes TO anon, authenticated, service_role;
GRANT ALL ON public.post_saves TO anon, authenticated, service_role;
