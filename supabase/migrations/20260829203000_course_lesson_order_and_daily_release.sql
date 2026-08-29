-- ============================================================================
-- EDTECHRA DIGITAL CLASSROOM: LESSON ORDER & DAILY RELEASE PROGRESSION
-- Adds position, daily release settings, course timezone, and lesson status.
-- ============================================================================

-- 1. Extend courses table with daily release settings and timezone
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS daily_release_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS course_timezone TEXT NOT NULL DEFAULT 'Asia/Colombo',
  ADD COLUMN IF NOT EXISTS course_start_date TIMESTAMPTZ DEFAULT NOW();

-- 2. Extend course_episodes table with position and manual unlock overrides
ALTER TABLE public.course_episodes
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_release_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS release_day INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_manually_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure position matches order_index if unset
UPDATE public.course_episodes
SET position = order_index + 1,
    release_day = order_index + 1
WHERE position = 0 OR position IS NULL;

-- 3. Extend course_episode_progress table with unlocked_at and status check
ALTER TABLE public.course_episode_progress
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index on position and release_day for fast roadmap calculations
CREATE INDEX IF NOT EXISTS idx_course_episodes_course_unit_pos
  ON public.course_episodes(course_id, unit_id, position);
