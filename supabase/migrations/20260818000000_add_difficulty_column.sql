-- ============================================================================
-- EDTECHRA-BITZ: Migration - Add difficulty column & indexes to youtube_videos
-- ============================================================================

-- 1. Add difficulty column to youtube_videos if not exists
ALTER TABLE public.youtube_videos
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Beginner';

-- 2. Performance indexes for category, difficulty, and published_at
CREATE INDEX IF NOT EXISTS idx_youtube_videos_vid ON public.youtube_videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_category ON public.youtube_videos(category);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_difficulty ON public.youtube_videos(difficulty);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_published_at ON public.youtube_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_learning_content_vid ON public.youtube_learning_content(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_learning_content_status ON public.youtube_learning_content(status);
