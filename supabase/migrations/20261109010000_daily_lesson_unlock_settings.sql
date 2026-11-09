-- Migration: Add daily_release_interval_days to courses for Daily Lesson Unlock
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS daily_release_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS course_timezone TEXT DEFAULT 'Asia/Colombo',
  ADD COLUMN IF NOT EXISTS course_start_date DATE,
  ADD COLUMN IF NOT EXISTS daily_release_interval_days INTEGER DEFAULT 1;
