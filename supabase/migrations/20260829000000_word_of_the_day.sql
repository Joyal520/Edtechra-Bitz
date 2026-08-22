-- ============================================================================
-- EDTECHRA-BITZ: Word of the Day & Saved Words Persistence Migration
-- ============================================================================

-- 1. Main words_of_the_day table
CREATE TABLE IF NOT EXISTS public.words_of_the_day (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  word_normalized TEXT NOT NULL,
  pronunciation TEXT,
  part_of_speech TEXT,
  meaning TEXT NOT NULL,
  example TEXT NOT NULL,
  image_url TEXT DEFAULT '/assets/ChatGPT Image Aug 22, 2026, 05_39_51 PM.png',
  status TEXT NOT NULL DEFAULT 'published', -- 'draft' | 'published' | 'archived'
  likes_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  import_batch_id TEXT,
  r2_content_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast feed queries and duplicate detection
CREATE INDEX IF NOT EXISTS idx_words_of_the_day_status ON public.words_of_the_day(status);
CREATE INDEX IF NOT EXISTS idx_words_of_the_day_normalized ON public.words_of_the_day(word_normalized);
CREATE INDEX IF NOT EXISTS idx_words_of_the_day_published_at ON public.words_of_the_day(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_words_of_the_day_created_at ON public.words_of_the_day(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_words_of_the_day_batch ON public.words_of_the_day(import_batch_id);

-- 3. Student saved words ("Add to My Words") table
CREATE TABLE IF NOT EXISTS public.user_saved_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id TEXT NOT NULL REFERENCES public.words_of_the_day(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(word_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_words_user ON public.user_saved_words(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_words_word ON public.user_saved_words(word_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.words_of_the_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_words ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for words_of_the_day
-- Public / all users can view published words
CREATE POLICY "Public can view published words of the day"
  ON public.words_of_the_day
  FOR SELECT
  USING (status = 'published');

-- Admins can view all, insert, update, and delete
CREATE POLICY "Admins can manage all words of the day"
  ON public.words_of_the_day
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_admin = true)
    )
  );

-- 6. RLS Policies for user_saved_words
-- Users can view their own saved words
CREATE POLICY "Users can view their own saved words"
  ON public.user_saved_words
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can save words
CREATE POLICY "Users can save words"
  ON public.user_saved_words
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove saved words
CREATE POLICY "Users can remove their saved words"
  ON public.user_saved_words
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
