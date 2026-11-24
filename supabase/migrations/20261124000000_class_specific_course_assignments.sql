-- Migration: Class-Specific Course Assignment Settings
-- Ensures every course-to-classroom assignment stores and enforces completely
-- independent availability dates, deadlines, daily lesson unlock settings,
-- unlock configuration, and restrictions without sharing global course state.

-- 1. Add first-class independent columns to public.course_classroom_assignments
ALTER TABLE public.course_classroom_assignments
  ADD COLUMN IF NOT EXISTS daily_unlock_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Non-destructive backfill for existing assignment rows
UPDATE public.course_classroom_assignments AS cca
SET
  created_at = COALESCE(cca.assigned_at, cca.created_at, now()),
  daily_unlock_enabled = COALESCE(
    CASE
      WHEN NULLIF(cca.settings->>'daily_release_enabled', '') IS NOT NULL
        THEN (cca.settings->>'daily_release_enabled')::boolean
      ELSE NULL
    END,
    NULLIF(to_jsonb(c)->>'daily_release_enabled', '')::boolean,
    cca.daily_unlock_enabled,
    false
  ),
  unlock_configuration = jsonb_strip_nulls(
    jsonb_build_object(
      'unlock_frequency_days',
      GREATEST(
        1,
        COALESCE(
          NULLIF(cca.settings->>'daily_release_interval_days', '')::integer,
          NULLIF(cca.settings->>'unlock_frequency_days', '')::integer,
          NULLIF(to_jsonb(c)->>'daily_release_interval_days', '')::integer,
          1
        )
      ),
      'unlock_lessons_per_release',
      GREATEST(
        1,
        COALESCE(
          NULLIF(cca.settings->>'unlock_lessons_per_release', '')::integer,
          1
        )
      ),
      'unlock_start_date',
      COALESCE(
        NULLIF(cca.settings->>'unlock_start_date', ''),
        NULLIF(cca.settings->>'course_start_date', ''),
        to_char(cca.start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
        NULLIF(to_jsonb(c)->>'course_start_date', '')
      ),
      'course_timezone',
      COALESCE(
        NULLIF(cca.settings->>'course_timezone', ''),
        NULLIF(to_jsonb(c)->>'course_timezone', ''),
        'Asia/Colombo'
      )
    )
  ) || COALESCE(cca.unlock_configuration, '{}'::jsonb),
  settings = COALESCE(cca.settings, '{}'::jsonb) || jsonb_strip_nulls(
    jsonb_build_object(
      'daily_release_enabled',
      COALESCE(
        CASE
          WHEN NULLIF(cca.settings->>'daily_release_enabled', '') IS NOT NULL
            THEN (cca.settings->>'daily_release_enabled')::boolean
          ELSE NULL
        END,
        NULLIF(to_jsonb(c)->>'daily_release_enabled', '')::boolean,
        false
      ),
      'daily_release_interval_days',
      GREATEST(
        1,
        COALESCE(
          NULLIF(cca.settings->>'daily_release_interval_days', '')::integer,
          NULLIF(to_jsonb(c)->>'daily_release_interval_days', '')::integer,
          1
        )
      ),
      'unlock_lessons_per_release',
      GREATEST(
        1,
        COALESCE(
          NULLIF(cca.settings->>'unlock_lessons_per_release', '')::integer,
          1
        )
      ),
      'unlock_start_date',
      COALESCE(
        NULLIF(cca.settings->>'unlock_start_date', ''),
        NULLIF(cca.settings->>'course_start_date', ''),
        to_char(cca.start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
        NULLIF(to_jsonb(c)->>'course_start_date', '')
      ),
      'course_start_date',
      COALESCE(
        NULLIF(cca.settings->>'course_start_date', ''),
        NULLIF(cca.settings->>'unlock_start_date', ''),
        to_char(cca.start_date AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
        NULLIF(to_jsonb(c)->>'course_start_date', '')
      ),
      'course_timezone',
      COALESCE(
        NULLIF(cca.settings->>'course_timezone', ''),
        NULLIF(to_jsonb(c)->>'course_timezone', ''),
        'Asia/Colombo'
      )
    )
  )
FROM public.courses AS c
WHERE c.id = cca.course_id;

-- 3. Helpful composite index for fast independent assignment lookups
CREATE INDEX IF NOT EXISTS idx_course_assignments_course_classroom_status
  ON public.course_classroom_assignments (course_id, classroom_id, status);

COMMENT ON COLUMN public.course_classroom_assignments.daily_unlock_enabled IS
  'Per-class toggle for Daily Lesson Unlock schedule.';
COMMENT ON COLUMN public.course_classroom_assignments.unlock_configuration IS
  'Per-class lesson unlock configuration (unlock_frequency_days, unlock_lessons_per_release, unlock_start_date, course_timezone).';
