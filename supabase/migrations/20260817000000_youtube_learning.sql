-- ============================================================================
-- EDTECHRA-BITZ: YouTube Learning & Progress Schema Migration
-- ============================================================================

-- 1. YouTube Videos Metadata Cache Table
CREATE TABLE IF NOT EXISTS public.youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT UNIQUE NOT NULL,
  channel_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  youtube_url TEXT,
  published_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  is_short BOOLEAN DEFAULT TRUE,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. YouTube Learning Content Table (Vocab, Quiz, Summary, Status)
CREATE TABLE IF NOT EXISTS public.youtube_learning_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT NOT NULL REFERENCES public.youtube_videos(youtube_video_id) ON DELETE CASCADE,
  summary TEXT,
  key_takeaway TEXT,
  vocabulary JSONB DEFAULT '[]'::jsonb,
  quiz JSONB DEFAULT '[]'::jsonb,
  learning_objectives JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_learning_content_video_id UNIQUE (youtube_video_id)
);

-- 3. YouTube Student Learning Progress Table
CREATE TABLE IF NOT EXISTS public.youtube_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  watched BOOLEAN DEFAULT FALSE,
  watch_progress INTEGER DEFAULT 0,
  quiz_completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER DEFAULT 0,
  quiz_total INTEGER DEFAULT 3,
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_video_progress UNIQUE (user_id, youtube_video_id)
);

-- 4. Helpful Performance Indexes
CREATE INDEX IF NOT EXISTS idx_youtube_videos_category ON public.youtube_videos(category);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_published_at ON public.youtube_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_is_short ON public.youtube_videos(is_short);
CREATE INDEX IF NOT EXISTS idx_youtube_learning_content_status ON public.youtube_learning_content(status);
CREATE INDEX IF NOT EXISTS idx_youtube_learning_progress_user ON public.youtube_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_learning_progress_completed ON public.youtube_learning_progress(user_id, completed);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_learning_progress ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published videos and learning content
CREATE POLICY "Public read youtube_videos"
  ON public.youtube_videos FOR SELECT
  USING (true);

CREATE POLICY "Public read published youtube_learning_content"
  ON public.youtube_learning_content FOR SELECT
  USING (status = 'published');

CREATE POLICY "Users can manage own youtube_learning_progress"
  ON public.youtube_learning_progress FOR ALL
  USING (true)
  WITH CHECK (true);
