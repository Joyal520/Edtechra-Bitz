-- ============================================================================
-- EDTECHRA LIVE QUIZ: SUPABASE STORAGE BUCKET & COVER PERSISTENCE (PART 15)
-- Backward-compatible migration:
--   1. Ensures public 'quiz-covers' Supabase Storage bucket exists.
--   2. Grants public read access and authenticated teacher/user upload/update/delete
--      scoped by user folder ({userId}/...).
--   3. Ensures live_quizzes.cover_image and live_quizzes.cover_image_url exist.
-- ============================================================================

ALTER TABLE public.live_quizzes
  ADD COLUMN IF NOT EXISTS cover_image TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-covers',
  'quiz-covers',
  true,
  10485760,
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access so Quiz Library cards & Preview render cover images reliably
DROP POLICY IF EXISTS "Public read access for quiz-covers" ON storage.objects;
CREATE POLICY "Public read access for quiz-covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quiz-covers');

-- Authenticated users may upload/manage their own covers under {uid}/...
DROP POLICY IF EXISTS "Authenticated users can upload quiz-covers" ON storage.objects;
CREATE POLICY "Authenticated users can upload quiz-covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can update own quiz-covers" ON storage.objects;
CREATE POLICY "Authenticated users can update own quiz-covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'quiz-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'quiz-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete own quiz-covers" ON storage.objects;
CREATE POLICY "Authenticated users can delete own quiz-covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quiz-covers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
